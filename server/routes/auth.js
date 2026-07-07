const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

/**
 * JWT token oluşturur
 */
function signToken(user) {
  const payload = { id: user.id, username: user.username, role: user.role };
  if (user.session_id) payload.session_id = user.session_id;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function getClientMeta(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.ip || null;
  const userAgent = req.headers['user-agent'] || '';
  const ua = userAgent.toLowerCase();
  const browser = ua.includes('chrome') ? 'Chrome' : ua.includes('firefox') ? 'Firefox' : ua.includes('safari') ? 'Safari' : ua.includes('edge') ? 'Edge' : 'Browser';
  const device = ua.includes('mobile') ? 'Mobile' : ua.includes('tablet') ? 'Tablet' : 'Desktop';
  return { ip, userAgent, browser, device };
}

function ensureUserPreferences(db, userId) {
  db.run(
    `INSERT OR IGNORE INTO user_preferences (user_id, theme, language, mail_retention_days, notify_new_mail, notify_otp, notify_expiring, notify_security, notification_sound)
     VALUES (?, 'system', 'tr', 7, 1, 1, 1, 1, 'chime')`,
    [userId]
  );
}

function getUserPackage(db, role) {
  return db.get('SELECT * FROM packages WHERE name = ?', [role === 'admin' ? 'pro' : role]) || {
    name: 'free',
    display_name: 'Ücretsiz',
    max_addresses: 3,
    max_emails: 50,
  };
}

function getUserUsage(db, userId) {
  const addressCount = db.get('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?', [userId]);
  const emailCount = db.get('SELECT COUNT(*) as c FROM emails e JOIN addresses a ON e.address_id = a.id WHERE a.user_id = ?', [userId]);
  const favoriteCount = db.get('SELECT COUNT(*) as c FROM addresses WHERE user_id = ? AND is_favorite = 1', [userId]);
  const sessionCount = db.get('SELECT COUNT(*) as c FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL', [userId]);
  return {
    address_count: addressCount?.c || 0,
    email_count: emailCount?.c || 0,
    favorite_count: favoriteCount?.c || 0,
    session_count: sessionCount?.c || 0,
  };
}

function getUserCenterPayload(db, userId) {
  const user = db.get(
    'SELECT id, username, email, role, created_at, last_login, display_name, avatar_url, language, theme, default_domain_id, username_change_count, email_change_count, pending_email, pending_email_expires_at, email_change_cooldown_until FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  ensureUserPreferences(db, userId);
  const preferences = db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId]) || {};
  const pkg = getUserPackage(db, user.role);
  const usage = getUserUsage(db, userId);
  const favoriteDomains = db.all(`
    SELECT d.id, d.domain, d.is_active, d.server_ip
    FROM favorite_domains f
    JOIN domains d ON d.id = f.domain_id
    WHERE f.user_id = ?
    ORDER BY d.domain ASC
  `, [userId]);
  const addresses = db.all(`
    SELECT a.id, a.address, a.username, a.nickname, a.note, a.is_favorite, a.is_locked, a.locked_until, a.custom_retention_days,
           a.created_at, a.last_accessed, a.expires_at, a.is_persistent, a.password_hash IS NOT NULL as has_password,
           d.domain,
           (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id) as email_count,
           (SELECT MAX(e.received_at) FROM emails e WHERE e.address_id = a.id) as last_email_at
    FROM addresses a
    JOIN domains d ON d.id = a.domain_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `, [userId]).map((addr) => ({
    ...addr,
    has_password: addr.has_password === 1,
    is_favorite: addr.is_favorite === 1,
    is_locked: addr.is_locked === 1,
  }));

  return {
    user: {
      ...user,
      display_name: user.display_name || user.username,
      theme: user.theme || preferences.theme || 'system',
      language: user.language || preferences.language || 'tr',
      username_change_count: Number(user.username_change_count || 0),
      email_change_count: Number(user.email_change_count || 0),
      pending_email: user.pending_email || null,
      pending_email_expires_at: user.pending_email_expires_at || null,
      email_change_cooldown_until: user.email_change_cooldown_until || null,
      username_locked: Number(user.username_change_count || 0) >= 1,
    },
    package: pkg,
    stats: usage,
    preferences: {
      theme: preferences.theme || user.theme || 'system',
      language: preferences.language || user.language || 'tr',
      default_domain_id: preferences.default_domain_id || user.default_domain_id || null,
      mail_retention_days: preferences.mail_retention_days || 7,
      notify_new_mail: preferences.notify_new_mail ?? 1,
      notify_otp: preferences.notify_otp ?? 1,
      notify_expiring: preferences.notify_expiring ?? 1,
      notify_security: preferences.notify_security ?? 1,
      notification_sound: preferences.notification_sound || 'chime',
    },
    favorite_domains: favoriteDomains,
    addresses,
  };
}

function createSession(db, user, req, isSuspicious = 0) {
  const { ip, userAgent } = getClientMeta(req);
  const sessionId = crypto.randomUUID();
  db.run(
    `INSERT INTO user_sessions (session_id, user_id, ip, user_agent, is_suspicious)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, user.id, ip, userAgent, isSuspicious ? 1 : 0]
  );
  return { session_id: sessionId, ip, userAgent, isSuspicious: !!isSuspicious };
}

function recordLoginEvent(db, { userId = null, login = null, success = 0, reason = null, req }) {
  const { ip, userAgent, device, browser } = getClientMeta(req);
  db.run(
    `INSERT INTO login_events (user_id, login, ip, user_agent, device, browser, success, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, login, ip, userAgent, device, browser, success ? 1 : 0, reason]
  );
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function generateEmailCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function createMailTransporter() {
  const host = process.env.SMTP_RELAY_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_RELAY_PORT || '587', 10),
    secure: process.env.SMTP_RELAY_SECURE === 'true',
    auth: {
      user: process.env.SMTP_RELAY_USER,
      pass: process.env.SMTP_RELAY_PASS,
    },
  });
}

async function sendEmailChangeVerification({ to, code, username }) {
  const transporter = createMailTransporter();
  if (!transporter || !to) return false;
  await transporter.sendMail({
    from: process.env.SMTP_RELAY_FROM || process.env.SMTP_RELAY_USER || 'no-reply@tempmail.local',
    to,
    subject: 'MS Temp Mail e-posta doğrulama kodu',
    text: `Merhaba ${username || ''}\n\nE-posta değişikliğini onaylamak için kodun: ${code}\nBu kod kısa süre içinde geçersiz olacaktır.`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">E-posta doğrulama kodu</h2>
      <p>Merhaba ${username || ''},</p>
      <p>E-posta değişikliğini onaylamak için kodun:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:14px 18px;border-radius:12px;background:#eef2ff;display:inline-block">${code}</div>
      <p style="margin-top:16px;color:#475569">Bu kod kısa süre içinde geçersiz olacaktır.</p>
    </div>`,
  });
  return true;
}

/**
 * JWT auth middleware - tüm korumalı rotalar için
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.session_id) {
      const db = getDb();
      const session = db.get(
        'SELECT id, revoked_at FROM user_sessions WHERE session_id = ? AND user_id = ?',
        [decoded.session_id, decoded.id]
      );
      if (!session || session.revoked_at) {
        return res.status(401).json({ error: 'Oturumunuz sonlandırıldı, tekrar giriş yapın' });
      }
      db.run('UPDATE user_sessions SET last_seen_at = datetime("now") WHERE session_id = ?', [decoded.session_id]);
    }
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Oturum süreniz dolmuş, tekrar giriş yapın' });
  }
}

/**
 * Admin middleware
 */
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gerekiyor' });
  }
  next();
}

/**
 * Pro veya Admin middleware
 */
function proOrAdmin(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'pro') {
    return res.status(403).json({ error: 'Bu özellik Pro kullanıcılar içindir' });
  }
  next();
}

/**
 * POST /api/auth/register
 * Yeni kullanıcı kaydı
 * Body: { username, email, password }
 */
router.post('/register', (req, res) => {
  try {
    const db = getDb();
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı, email ve şifre gerekli' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Kullanıcı adı 3-30 karakter olmalı' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir' });
    }

    // Kullanıcı adı veya email kontrolü
    const existing = db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username.toLowerCase(), email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Bu kullanıcı adı veya email zaten kayıtlı' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db.run(
      'INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
      [username.toLowerCase(), email.toLowerCase(), hash, username.toLowerCase(), 'free']
    );

    const user = db.get('SELECT id, username, email, role, created_at, display_name, avatar_url, language, theme, default_domain_id FROM users WHERE id = ?', [result.lastInsertRowid]);
    ensureUserPreferences(db, user.id);
    recordLoginEvent(db, { userId: user.id, login: user.email, success: 1, reason: 'register', req });
    const session = createSession(db, user, req, 0);
    const token = signToken({ ...user, session_id: session.session_id });

    res.json({
      message: 'Kayıt başarılı',
      token,
      session_id: session.session_id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ error: 'Kayıt yapılamadı' });
  }
});

/**
 * POST /api/auth/login
 * Kullanıcı girişi
 * Body: { login (username veya email), password }
 */
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı/email ve şifre gerekli' });
    }

    const user = db.get(
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1',
      [login.toLowerCase(), login.toLowerCase()]
    );

    if (!user) {
      recordLoginEvent(db, { login: login.toLowerCase(), success: 0, reason: 'user_not_found', req });
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      recordLoginEvent(db, { userId: user.id, login: login.toLowerCase(), success: 0, reason: 'wrong_password', req });
      return res.status(401).json({ error: 'Yanlış şifre' });
    }

    // Son giriş zamanını güncelle
    db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
    ensureUserPreferences(db, user.id);
    const lastSession = db.get('SELECT ip, user_agent FROM user_sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1', [user.id]);
    const meta = getClientMeta(req);
    const isSuspicious = lastSession && (lastSession.ip !== meta.ip || lastSession.user_agent !== meta.userAgent) ? 1 : 0;
    const session = createSession(db, user, req, isSuspicious);
    recordLoginEvent(db, {
      userId: user.id,
      login: login.toLowerCase(),
      success: 1,
      reason: isSuspicious ? 'new_ip_or_device' : 'login',
      req,
    });

    const token = signToken({ ...user, session_id: session.session_id });

    res.json({
      message: 'Giriş başarılı',
      token,
      session_id: session.session_id,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        display_name: user.display_name || user.username,
        avatar_url: user.avatar_url || '',
      },
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Giriş yapılamadı' });
  }
});

/**
 * GET /api/auth/me
 * Mevcut kullanıcı bilgisi (token ile)
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const center = getUserCenterPayload(db, req.user.id);
    const user = center?.user;
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    res.json({
      user,
      package: center.package,
      stats: center.stats,
      preferences: center.preferences,
      favorite_domains: center.favorite_domains,
      addresses: center.addresses,
    });
  } catch (err) {
    console.error('Me hatası:', err);
    res.status(500).json({ error: 'Bilgi alınamadı' });
  }
});

/**
 * PUT /api/auth/me
 * Kullanıcı profilini günceller
 * Body: { username }
 */
router.put('/me', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { username, display_name, email } = req.body;

    if (!username && typeof display_name === 'undefined' && typeof email === 'undefined') {
      return res.status(400).json({ error: 'Güncellenecek alan gerekli' });
    }

    const currentUser = db.get(
      'SELECT id, username, email, role, created_at, display_name, username_change_count, email_change_count, pending_email, pending_email_expires_at, email_change_cooldown_until FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!currentUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (typeof email !== 'undefined' && String(email || '').trim()) {
      return res.status(400).json({ error: 'E-posta değişikliği doğrulama akışı ile yapılır' });
    }

    const updates = [];
    const params = [];
    let changedUsername = false;

    if (username) {
      const normalized = username.trim().toLowerCase();
      if (normalized && normalized !== currentUser.username) {
        if (Number(currentUser.username_change_count || 0) >= 1) {
          return res.status(403).json({ error: 'Kullanıcı adı sadece bir kez değiştirilebilir' });
        }
        if (normalized.length < 3 || normalized.length > 30) {
          return res.status(400).json({ error: 'Kullanıcı adı 3-30 karakter olmalı' });
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
          return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir' });
        }
        const existing = db.get('SELECT id FROM users WHERE username = ? AND id != ?', [normalized, req.user.id]);
        if (existing) {
          return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        updates.push('username = ?');
        params.push(normalized);
        updates.push('username_change_count = COALESCE(username_change_count, 0) + 1');
        changedUsername = true;
      }
    }

    if (typeof display_name !== 'undefined') {
      const normalizedDisplay = String(display_name || '').trim();
      updates.push('display_name = ?');
      params.push(normalizedDisplay || null);
    }

    if (updates.length > 0) {
      params.push(req.user.id);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedUser = db.get(
      'SELECT id, username, email, role, created_at, display_name, avatar_url, language, theme, default_domain_id, username_change_count, email_change_count, pending_email, pending_email_expires_at, email_change_cooldown_until FROM users WHERE id = ?',
      [req.user.id]
    );
    const token = signToken({ ...updatedUser, session_id: req.user.session_id });

    res.json({
      message: changedUsername ? 'Kullanıcı adı güncellendi' : 'Profil güncellendi',
      token,
      user: {
        ...updatedUser,
        display_name: updatedUser.display_name || updatedUser.username,
        username_change_count: Number(updatedUser.username_change_count || 0),
        email_change_count: Number(updatedUser.email_change_count || 0),
        pending_email: updatedUser.pending_email || null,
        pending_email_expires_at: updatedUser.pending_email_expires_at || null,
        email_change_cooldown_until: updatedUser.email_change_cooldown_until || null,
        username_locked: Number(updatedUser.username_change_count || 0) >= 1,
      },
    });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err);
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

router.post('/request-email-change', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const nextEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!nextEmail) {
      return res.status(400).json({ error: 'Yeni e-posta gerekli' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(400).json({ error: 'Geçerli bir e-posta girin' });
    }

    const user = db.get(
      'SELECT id, username, email, pending_email, pending_email_expires_at, email_change_cooldown_until, email_change_count FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (nextEmail === String(user.email || '').toLowerCase()) {
      return res.status(400).json({ error: 'Bu e-posta zaten kullanımda' });
    }

    const conflict = db.get('SELECT id FROM users WHERE email = ? AND id != ?', [nextEmail, req.user.id]);
    if (conflict) {
      return res.status(409).json({ error: 'Bu e-posta zaten kullanımda' });
    }

    const now = String(new Date().toISOString().slice(0, 19).replace('T', ' '));
    if (user.pending_email && user.pending_email_expires_at) {
      if (String(user.pending_email_expires_at) > now) {
        return res.status(409).json({ error: 'Bekleyen bir e-posta doğrulaması var' });
      }
      db.run(
        `UPDATE users SET pending_email = NULL, pending_email_code_hash = NULL, pending_email_expires_at = NULL WHERE id = ?`,
        [req.user.id]
      );
    }

    if (user.email_change_cooldown_until && String(user.email_change_cooldown_until) > now) {
      return res.status(429).json({ error: 'E-posta değişikliği için biraz beklemeniz gerekiyor' });
    }

    const code = generateEmailCode();
    const codeHash = hashValue(code);
    db.run(
      `UPDATE users
       SET pending_email = ?, pending_email_code_hash = ?, pending_email_expires_at = datetime('now', '+10 minutes')
       WHERE id = ?`,
      [nextEmail, codeHash, req.user.id]
    );

    let emailSent = false;
    try {
      emailSent = await sendEmailChangeVerification({ to: nextEmail, code, username: user.username });
    } catch (mailErr) {
      console.warn('E-posta doğrulama gönderilemedi:', mailErr.message);
    }

    res.json({
      message: emailSent ? 'Doğrulama kodu yeni e-posta adresine gönderildi' : 'Doğrulama kodu oluşturuldu',
      email_sent: emailSent,
      pending_email: nextEmail,
      verification_code: emailSent ? undefined : code,
      expires_in_minutes: 10,
    });
  } catch (err) {
    console.error('E-posta değişikliği başlatılamadı:', err);
    res.status(500).json({ error: 'E-posta değişikliği başlatılamadı' });
  }
});

router.post('/confirm-email-change', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const code = String(req.body?.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Doğrulama kodu gerekli' });
    }

    const user = db.get(
      `SELECT id, username, email, role, display_name, avatar_url, language, theme, default_domain_id,
              pending_email, pending_email_code_hash, pending_email_expires_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user || !user.pending_email || !user.pending_email_code_hash) {
      return res.status(400).json({ error: 'Bekleyen e-posta değişikliği yok' });
    }

    if (!user.pending_email_expires_at || String(user.pending_email_expires_at) <= String(new Date().toISOString().slice(0, 19).replace('T', ' '))) {
      db.run(
        `UPDATE users SET pending_email = NULL, pending_email_code_hash = NULL, pending_email_expires_at = NULL WHERE id = ?`,
        [req.user.id]
      );
      return res.status(410).json({ error: 'Doğrulama kodunun süresi dolmuş' });
    }

    if (hashValue(code) !== user.pending_email_code_hash) {
      return res.status(401).json({ error: 'Doğrulama kodu yanlış' });
    }

    db.run(
      `UPDATE users
       SET email = ?,
           pending_email = NULL,
           pending_email_code_hash = NULL,
           pending_email_expires_at = NULL,
           email_change_count = COALESCE(email_change_count, 0) + 1,
           email_change_cooldown_until = datetime('now', '+7 days')
       WHERE id = ?`,
      [user.pending_email, req.user.id]
    );

    const updatedUser = db.get(
      'SELECT id, username, email, role, created_at, display_name, avatar_url, language, theme, default_domain_id, username_change_count, email_change_count, pending_email, pending_email_expires_at, email_change_cooldown_until FROM users WHERE id = ?',
      [req.user.id]
    );
    const token = signToken({ ...updatedUser, session_id: req.user.session_id });
    res.json({
      message: 'E-posta güncellendi',
      token,
      user: {
        ...updatedUser,
        display_name: updatedUser.display_name || updatedUser.username,
        username_change_count: Number(updatedUser.username_change_count || 0),
        email_change_count: Number(updatedUser.email_change_count || 0),
        pending_email: updatedUser.pending_email || null,
        pending_email_expires_at: updatedUser.pending_email_expires_at || null,
        email_change_cooldown_until: updatedUser.email_change_cooldown_until || null,
        username_locked: Number(updatedUser.username_change_count || 0) >= 1,
      },
    });
  } catch (err) {
    console.error('E-posta doğrulama hatası:', err);
    res.status(500).json({ error: 'E-posta doğrulanamadı' });
  }
});

router.get('/sessions', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const sessions = db.all(`
      SELECT id, session_id, ip, user_agent, created_at, last_seen_at, revoked_at, is_suspicious
      FROM user_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]).map((session) => ({
      ...session,
      active: !session.revoked_at,
      is_suspicious: session.is_suspicious === 1,
      current: req.user.session_id ? session.session_id === req.user.session_id : false,
    }));
    res.json({ sessions });
  } catch (err) {
    console.error('Oturumlar alınamadı:', err);
    res.status(500).json({ error: 'Oturumlar alınamadı' });
  }
});

router.delete('/sessions/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const session = db.get('SELECT * FROM user_sessions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }
    db.run('UPDATE user_sessions SET revoked_at = datetime("now") WHERE id = ?', [session.id]);
    res.json({ message: 'Oturum kapatıldı', id: session.id });
  } catch (err) {
    console.error('Oturum kapatma hatası:', err);
    res.status(500).json({ error: 'Oturum kapatılamadı' });
  }
});

router.get('/login-history', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const history = db.all(`
      SELECT id, ip, user_agent, device, browser, success, reason, created_at
      FROM login_events
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]).map((row) => ({
      ...row,
      success: row.success === 1,
    }));
    res.json({ history });
  } catch (err) {
    console.error('Giriş geçmişi alınamadı:', err);
    res.status(500).json({ error: 'Giriş geçmişi alınamadı' });
  }
});

router.put('/preferences', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const {
      theme,
      language,
      default_domain_id,
      mail_retention_days,
      notify_new_mail,
      notify_otp,
      notify_expiring,
      notify_security,
      notification_sound,
      display_name,
    } = req.body || {};

    ensureUserPreferences(db, req.user.id);

    const safeTheme = ['light', 'dark', 'system'].includes(theme) ? theme : undefined;
    const safeLanguage = ['tr', 'en'].includes(language) ? language : undefined;
    const safeDays = Number.isFinite(Number(mail_retention_days)) ? Math.max(1, Math.min(365, Number(mail_retention_days))) : undefined;
    const safeDefaultDomain = Number.isFinite(Number(default_domain_id)) ? Number(default_domain_id) : null;

    db.run(`
      UPDATE user_preferences
      SET theme = COALESCE(?, theme),
          language = COALESCE(?, language),
          default_domain_id = ?,
          mail_retention_days = COALESCE(?, mail_retention_days),
          notify_new_mail = COALESCE(?, notify_new_mail),
          notify_otp = COALESCE(?, notify_otp),
          notify_expiring = COALESCE(?, notify_expiring),
          notify_security = COALESCE(?, notify_security),
          notification_sound = COALESCE(?, notification_sound),
          updated_at = datetime('now')
      WHERE user_id = ?
    `, [
      safeTheme,
      safeLanguage,
      safeDefaultDomain,
      safeDays,
      notify_new_mail === undefined ? undefined : (notify_new_mail ? 1 : 0),
      notify_otp === undefined ? undefined : (notify_otp ? 1 : 0),
      notify_expiring === undefined ? undefined : (notify_expiring ? 1 : 0),
      notify_security === undefined ? undefined : (notify_security ? 1 : 0),
      notification_sound || undefined,
      req.user.id,
    ]);

    const userUpdates = [];
    const userParams = [];
    if (safeTheme) { userUpdates.push('theme = ?'); userParams.push(safeTheme); }
    if (safeLanguage) { userUpdates.push('language = ?'); userParams.push(safeLanguage); }
    if (safeDefaultDomain !== null && !Number.isNaN(safeDefaultDomain)) { userUpdates.push('default_domain_id = ?'); userParams.push(safeDefaultDomain); }
    if (typeof display_name !== 'undefined') {
      userUpdates.push('display_name = ?');
      userParams.push(String(display_name || '').trim() || null);
    }
    if (userUpdates.length > 0) {
      userParams.push(req.user.id);
      db.run(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    const payload = getUserCenterPayload(db, req.user.id);
    res.json({ message: 'Tercihler güncellendi', ...payload });
  } catch (err) {
    console.error('Tercih güncelleme hatası:', err);
    res.status(500).json({ error: 'Tercihler güncellenemedi' });
  }
});

router.put('/profile-photo', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { avatarDataUrl } = req.body || {};
    if (!avatarDataUrl || typeof avatarDataUrl !== 'string' || !avatarDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Geçerli bir görsel gerekli' });
    }

    const match = avatarDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Görsel formatı desteklenmiyor' });
    }

    const mime = match[1];
    const base64 = match[2];
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(base64, 'base64');
    const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
    fs.mkdirSync(avatarDir, { recursive: true });
    const fileName = `user-${req.user.id}-${Date.now()}.${ext}`;
    const filePath = path.join(avatarDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const publicPath = `/uploads/avatars/${fileName}`;

    db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [publicPath, req.user.id]);
    const payload = getUserCenterPayload(db, req.user.id);
    res.json({ message: 'Profil fotoğrafı güncellendi', avatar_url: publicPath, ...payload });
  } catch (err) {
    console.error('Avatar yükleme hatası:', err);
    res.status(500).json({ error: 'Profil fotoğrafı yüklenemedi' });
  }
});

router.post('/change-password', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
    }
    const user = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    db.run('UPDATE user_sessions SET revoked_at = datetime("now") WHERE user_id = ?', [req.user.id]);
    const session = createSession(db, user, req, 0);
    const token = signToken({ ...user, password_hash: undefined, session_id: session.session_id });
    recordLoginEvent(db, { userId: req.user.id, login: user.username, success: 1, reason: 'password_changed', req });
    res.json({ message: 'Şifre güncellendi', token, session_id: session.session_id });
  } catch (err) {
    console.error('Şifre değiştirme hatası:', err);
    res.status(500).json({ error: 'Şifre değiştirilemedi' });
  }
});

router.get('/favorite-domains', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const domains = db.all(`
      SELECT d.id, d.domain, d.is_active, d.server_ip
      FROM favorite_domains f
      JOIN domains d ON d.id = f.domain_id
      WHERE f.user_id = ?
      ORDER BY d.domain ASC
    `, [req.user.id]);
    res.json({ domains });
  } catch (err) {
    console.error('Favori domainler alınamadı:', err);
    res.status(500).json({ error: 'Favori domainler alınamadı' });
  }
});

router.post('/favorite-domains/:domainId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const domain = db.get('SELECT id, domain FROM domains WHERE id = ?', [req.params.domainId]);
    if (!domain) return res.status(404).json({ error: 'Domain bulunamadı' });
    db.run('INSERT OR IGNORE INTO favorite_domains (user_id, domain_id) VALUES (?, ?)', [req.user.id, domain.id]);
    const domains = db.all(`
      SELECT d.id, d.domain, d.is_active, d.server_ip
      FROM favorite_domains f
      JOIN domains d ON d.id = f.domain_id
      WHERE f.user_id = ?
      ORDER BY d.domain ASC
    `, [req.user.id]);
    res.json({ message: 'Favoriye eklendi', domains });
  } catch (err) {
    console.error('Favori domain eklenemedi:', err);
    res.status(500).json({ error: 'Favori domain eklenemedi' });
  }
});

router.delete('/favorite-domains/:domainId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    db.run('DELETE FROM favorite_domains WHERE user_id = ? AND domain_id = ?', [req.user.id, req.params.domainId]);
    res.json({ message: 'Favoriden çıkarıldı' });
  } catch (err) {
    console.error('Favori domain silinemedi:', err);
    res.status(500).json({ error: 'Favori domain silinemedi' });
  }
});

router.get('/addresses', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const addresses = db.all(`
      SELECT a.id, a.address, a.username, a.nickname, a.note, a.is_favorite, a.is_locked, a.locked_until, a.custom_retention_days,
             a.created_at, a.last_accessed, a.expires_at, a.is_persistent, a.password_hash IS NOT NULL as has_password,
             d.domain,
             (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id) as email_count,
             (SELECT MAX(e.received_at) FROM emails e WHERE e.address_id = a.id) as last_email_at
      FROM addresses a
      JOIN domains d ON d.id = a.domain_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `, [req.user.id]).map((addr) => ({
      ...addr,
      has_password: addr.has_password === 1,
      is_favorite: addr.is_favorite === 1,
      is_locked: addr.is_locked === 1,
    }));
    res.json({ addresses });
  } catch (err) {
    console.error('Kullanıcı adresleri alınamadı:', err);
    res.status(500).json({ error: 'Adresler alınamadı' });
  }
});

router.put('/addresses/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const addr = db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Adres bulunamadı' });

    const updates = [];
    const params = [];
    ['nickname', 'note', 'locked_until'].forEach((key) => {
      if (typeof req.body[key] !== 'undefined') {
        updates.push(`${key} = ?`);
        params.push(String(req.body[key] || '').trim() || null);
      }
    });
    if (typeof req.body.is_favorite !== 'undefined') {
      updates.push('is_favorite = ?');
      params.push(req.body.is_favorite ? 1 : 0);
    }
    if (typeof req.body.is_locked !== 'undefined') {
      updates.push('is_locked = ?');
      params.push(req.body.is_locked ? 1 : 0);
    }
    if (typeof req.body.custom_retention_days !== 'undefined') {
      const days = Number(req.body.custom_retention_days);
      updates.push('custom_retention_days = ?');
      params.push(Number.isFinite(days) ? Math.max(1, Math.min(365, days)) : null);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Güncellenecek alan yok' });
    }
    params.push(addr.id);
    db.run(`UPDATE addresses SET ${updates.join(', ')} WHERE id = ?`, params);
    const updated = db.get(`
      SELECT a.id, a.address, a.username, a.nickname, a.note, a.is_favorite, a.is_locked, a.locked_until, a.custom_retention_days,
             a.created_at, a.last_accessed, a.expires_at, a.is_persistent, a.password_hash IS NOT NULL as has_password,
             d.domain
      FROM addresses a
      JOIN domains d ON d.id = a.domain_id
      WHERE a.id = ?
    `, [addr.id]);
    res.json({ message: 'Adres güncellendi', address: {
      ...updated,
      has_password: updated.has_password === 1,
      is_favorite: updated.is_favorite === 1,
      is_locked: updated.is_locked === 1,
    } });
  } catch (err) {
    console.error('Adres güncelleme hatası:', err);
    res.status(500).json({ error: 'Adres güncellenemedi' });
  }
});

router.post('/addresses/:id/renew', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const addr = db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Adres bulunamadı' });
    const days = Number(addr.custom_retention_days || 7);
    db.run(
      `UPDATE addresses
       SET expires_at = datetime(COALESCE(expires_at, datetime('now')), '+' || ? || ' day'),
           last_accessed = datetime('now')
       WHERE id = ?`,
      [days, addr.id]
    );
    res.json({ message: 'Adres süresi yenilendi' });
  } catch (err) {
    console.error('Adres yenileme hatası:', err);
    res.status(500).json({ error: 'Adres yenilenemedi' });
  }
});

router.delete('/addresses/:id', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const addr = db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!addr) return res.status(404).json({ error: 'Adres bulunamadı' });
    db.run('DELETE FROM addresses WHERE id = ?', [addr.id]);
    res.json({ message: 'Adres silindi' });
  } catch (err) {
    console.error('Adres silme hatası:', err);
    res.status(500).json({ error: 'Adres silinemedi' });
  }
});

/**
 * GET /api/auth/packages
 * Tüm paketleri listeler (public)
 */
router.get('/packages', (req, res) => {
  try {
    const db = getDb();
    const packages = db.all('SELECT * FROM packages ORDER BY price_monthly ASC');
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: 'Paketler alınamadı' });
  }
});

/**
 * POST /api/auth/request-pro
 * Pro yükseltme isteği gönderir
 * Body: { message? }
 */
router.post('/request-pro', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const { message } = req.body;

    // Zaten pro mu?
    const user = db.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (user?.role === 'pro') return res.status(400).json({ error: 'Zaten Pro kullanıcısınız' });
    if (user?.role === 'admin') return res.status(400).json({ error: 'Admin kullanıcıları Pro isteği gönderemez' });

    // Bekleyen istek var mı?
    const pending = db.get('SELECT id FROM package_requests WHERE user_id = ? AND status = "pending"', [req.user.id]);
    if (pending) return res.status(400).json({ error: 'Zaten bekleyen bir Pro isteğiniz var' });

    db.run('INSERT INTO package_requests (user_id, message) VALUES (?, ?)', [req.user.id, message || '']);

    res.json({ message: 'Pro yükseltme isteğiniz gönderildi. Admin onayı bekleniyor.' });
  } catch (err) {
    console.error('Pro istek hatası:', err);
    res.status(500).json({ error: 'İstek gönderilemedi' });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.adminOnly = adminOnly;
module.exports.proOrAdmin = proOrAdmin;
module.exports.signToken = signToken;
