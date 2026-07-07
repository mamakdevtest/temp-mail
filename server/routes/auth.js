const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getDb } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

/**
 * JWT token oluşturur
 */
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username.toLowerCase(), email.toLowerCase(), hash, 'free']
    );

    const user = db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    const token = signToken(user);

    res.json({
      message: 'Kayıt başarılı',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
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
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Yanlış şifre' });
    }

    // Son giriş zamanını güncelle
    db.run('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);

    const token = signToken(user);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
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
    const user = db.get('SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    // Paket bilgisi
    const pkg = db.get('SELECT * FROM packages WHERE name = ?', [user.role === 'admin' ? 'pro' : user.role]);

    // Kullanıcının adres sayısı
    const addrCount = db.get('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?', [user.id]);
    const emailCount = db.get('SELECT COUNT(*) as c FROM emails e JOIN addresses a ON e.address_id = a.id WHERE a.user_id = ?', [user.id]);

    res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role, created_at: user.created_at },
      package: pkg || { name: 'free', display_name: 'Ücretsiz', max_addresses: 3, max_emails: 50 },
      stats: { address_count: addrCount?.c || 0, email_count: emailCount?.c || 0 },
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
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Kullanıcı adı gerekli' });
    }

    const normalized = username.trim().toLowerCase();

    if (normalized.length < 3 || normalized.length > 30) {
      return res.status(400).json({ error: 'Kullanıcı adı 3-30 karakter olmalı' });
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
      return res.status(400).json({ error: 'Kullanıcı adı sadece harf, rakam, nokta, tire ve alt çizgi içerebilir' });
    }

    const currentUser = db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!currentUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const existing = db.get('SELECT id FROM users WHERE username = ? AND id != ?', [normalized, req.user.id]);
    if (existing) {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    db.run('UPDATE users SET username = ? WHERE id = ?', [normalized, req.user.id]);

    const updatedUser = db.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    const token = signToken(updatedUser);

    res.json({
      message: 'Kullanıcı adı güncellendi',
      token,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err);
    res.status(500).json({ error: 'Profil güncellenemedi' });
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
