const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getDb } = require('../db');
const { manualCleanup } = require('../services/cleanup');
const { extractOtp, stripHtml } = require('./emails');

const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';

/**
 * Admin auth middleware - hem JWT token hem eski şifre yöntemini destekler
 */
function adminAuth(req, res, next) {
  // 1. JWT token kontrolü
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (e) { /* token geçersiz, diğer yöntemi dene */ }
  }

  // 2. Eski şifre yöntemi (geriye uyumluluk)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'] || req.query.password;
  if (providedPassword === adminPassword) {
    return next();
  }

  return res.status(401).json({ error: 'Admin yetkisi gerekiyor' });
}

router.use(adminAuth);

/**
 * GET /api/admin/domains
 * Tüm domainleri listeler
 */
router.get('/domains', (req, res) => {
  try {
    const db = getDb();
    const domains = db.all(`
      SELECT d.*,
        (SELECT COUNT(*) FROM addresses a WHERE a.domain_id = d.id) as address_count
      FROM domains d
      ORDER BY d.created_at DESC
    `);

    res.json({ domains });
  } catch (err) {
    console.error('Domain listeleme hatası:', err);
    res.status(500).json({ error: 'Domainler listelenemedi' });
  }
});

/**
 * POST /api/admin/domains
 * Yeni domain ekler
 */
router.post('/domains', (req, res) => {
  try {
    const db = getDb();
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain adı gerekli' });
    }

    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Geçersiz domain formatı' });
    }

    const existing = db.get('SELECT id FROM domains WHERE domain = ?', [domain.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Bu domain zaten ekli' });
    }

    const result = db.run('INSERT INTO domains (domain) VALUES (?)', [domain.toLowerCase()]);
    const newDomain = db.get('SELECT * FROM domains WHERE id = ?', [result.lastInsertRowid]);

    res.json({ domain: newDomain });
  } catch (err) {
    console.error('Domain ekleme hatası:', err);
    res.status(500).json({ error: 'Domain eklenemedi' });
  }
});

/**
 * PUT /api/admin/domains/:id
 * Domain günceller (aktif/pasif)
 */
router.put('/domains/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { is_active } = req.body;

    const domain = db.get('SELECT * FROM domains WHERE id = ?', [id]);
    if (!domain) {
      return res.status(404).json({ error: 'Domain bulunamadı' });
    }

    db.run('UPDATE domains SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    const updated = db.get('SELECT * FROM domains WHERE id = ?', [id]);

    res.json({ domain: updated });
  } catch (err) {
    console.error('Domain güncelleme hatası:', err);
    res.status(500).json({ error: 'Domain güncellenemedi' });
  }
});

/**
 * DELETE /api/admin/domains/:id
 * Domain siler
 */
router.delete('/domains/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const domain = db.get('SELECT * FROM domains WHERE id = ?', [id]);
    if (!domain) {
      return res.status(404).json({ error: 'Domain bulunamadı' });
    }

    db.run('DELETE FROM domains WHERE id = ?', [id]);

    res.json({ message: 'Domain silindi', domain: domain.domain });
  } catch (err) {
    console.error('Domain silme hatası:', err);
    res.status(500).json({ error: 'Domain silinemedi' });
  }
});

/**
 * POST /api/admin/cleanup
 * Manuel temizleme tetikler
 */
router.post('/cleanup', (req, res) => {
  try {
    const { type } = req.body;
    const deleted = manualCleanup(type || 'all');
    res.json({ message: `${deleted} adres temizlendi`, deleted });
  } catch (err) {
    console.error('Manuel temizlik hatası:', err);
    res.status(500).json({ error: 'Temizlik yapılamadı' });
  }
});

/**
 * GET /api/admin/stats
 * Dashboard istatistikleri
 * - Toplam mail sayısı
 * - OTP gelen mail sayısı
 * - En çok mail gönderenler (şirketler)
 * - Toplam adres sayısı
 * - Son 24 saatte gelen mail sayısı
 */
router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    // Toplam mail sayısı
    const totalEmails = db.get('SELECT COUNT(*) as count FROM emails');

    // Toplam adres sayısı
    const totalAddresses = db.get('SELECT COUNT(*) as count FROM addresses');

    // Son 24 saatte gelen mail sayısı
    const recentEmails = db.get(
      "SELECT COUNT(*) as count FROM emails WHERE received_at > datetime('now', '-24 hours')"
    );

    // En çok mail gönderenler (gönderen email adresinden domain çıkar)
    const topSenders = db.all(`
      SELECT
        sender,
        COUNT(*) as email_count,
        MAX(received_at) as last_received
      FROM emails
      GROUP BY sender
      ORDER BY email_count DESC
      LIMIT 20
    `);

    // Gönderen domainlerine göre grupla (şirket tespiti)
    const senderDomains = {};
    for (const s of topSenders) {
      const match = s.sender.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const domain = match ? match[1].toLowerCase() : 'bilinmeyen';
      if (!senderDomains[domain]) {
        senderDomains[domain] = { domain, email_count: 0, senders: [] };
      }
      senderDomains[domain].email_count += s.email_count;
      senderDomains[domain].senders.push({ sender: s.sender, count: s.email_count });
    }

    // Domain bazlı sırala
    const topDomains = Object.values(senderDomains)
      .sort((a, b) => b.email_count - a.email_count)
      .slice(0, 15);

    // OTP tespiti: son 100 mailde OTP var mı?
    const recentMailBodies = db.all(`
      SELECT e.id, e.body_text, e.body_html, e.sender, e.subject, e.received_at, a.address
      FROM emails e
      JOIN addresses a ON e.address_id = a.id
      ORDER BY e.received_at DESC
      LIMIT 100
    `);

    let otpCount = 0;
    const otpEmails = [];
    for (const mail of recentMailBodies) {
      const text = mail.body_text || stripHtml(mail.body_html || '');
      const otp = extractOtp(text);
      if (otp) {
        otpCount++;
        otpEmails.push({
          id: mail.id,
          sender: mail.sender,
          subject: mail.subject,
          address: mail.address,
          otp_code: otp,
          received_at: mail.received_at,
        });
      }
    }

    // Son mailler (tüm adreslerden, detaylı)
    const latestEmails = db.all(`
      SELECT e.id, e.sender, e.subject, e.received_at, e.has_attachments,
             a.address as recipient_address
      FROM emails e
      JOIN addresses a ON e.address_id = a.id
      ORDER BY e.received_at DESC
      LIMIT 50
    `);

    // Her mail için OTP kontrolü
    const latestWithOtp = latestEmails.map((mail) => {
      const fullMail = db.get('SELECT body_text, body_html FROM emails WHERE id = ?', [mail.id]);
      const text = fullMail?.body_text || stripHtml(fullMail?.body_html || '');
      const otp = extractOtp(text);
      return { ...mail, otp_code: otp, has_attachments: mail.has_attachments === 1 };
    });

    res.json({
      total_emails: totalEmails?.count || 0,
      total_addresses: totalAddresses?.count || 0,
      recent_24h: recentEmails?.count || 0,
      otp_count: otpCount,
      otp_emails: otpEmails,
      top_domains: topDomains,
      top_senders: topSenders.slice(0, 10),
      latest_emails: latestWithOtp,
    });
  } catch (err) {
    console.error('İstatistik hatası:', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

/**
 * GET /api/admin/emails
 * Tüm mailleri listele (sayfalı)
 * Query params: page (default 1), limit (default 50)
 */
router.get('/emails', (req, res) => {
  try {
    const db = getDb();
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const offset = (page - 1) * limit;

    const total = db.get('SELECT COUNT(*) as count FROM emails');

    const emails = db.all(`
      SELECT e.id, e.sender, e.subject, e.received_at, e.has_attachments,
             a.address as recipient_address
      FROM emails e
      JOIN addresses a ON e.address_id = a.id
      ORDER BY e.received_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const emailsWithOtp = emails.map((mail) => {
      const fullMail = db.get('SELECT body_text, body_html FROM emails WHERE id = ?', [mail.id]);
      const text = fullMail?.body_text || stripHtml(fullMail?.body_html || '');
      const otp = extractOtp(text);
      return { ...mail, otp_code: otp, has_attachments: mail.has_attachments === 1 };
    });

    res.json({
      emails: emailsWithOtp,
      total: total?.count || 0,
      page,
      limit,
      total_pages: Math.ceil((total?.count || 0) / limit),
    });
  } catch (err) {
    console.error('Admin mail listeleme hatası:', err);
    res.status(500).json({ error: 'Mailler listelenemedi' });
  }
});

/**
 * GET /api/admin/addresses
 * Tüm adresleri listeler (email sayısıyla birlikte)
 * Admin panelinden mailbox erişimi için
 */
router.get('/addresses', (req, res) => {
  try {
    const db = getDb();

    const addresses = db.all(`
      SELECT a.id, a.address, a.username, a.created_at, a.last_accessed,
             a.password_hash IS NOT NULL as has_password,
             d.domain,
             (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id) as email_count,
             (SELECT MAX(e.received_at) FROM emails e WHERE e.address_id = a.id) as last_email_at
      FROM addresses a
      JOIN domains d ON a.domain_id = d.id
      ORDER BY a.created_at DESC
    `);

    res.json({
      addresses: addresses.map((a) => ({
        ...a,
        has_password: a.has_password === 1,
      })),
    });
  } catch (err) {
    console.error('Adres listeleme hatası:', err);
    res.status(500).json({ error: 'Adresler listelenemedi' });
  }
});

/**
 * GET /api/admin/mailbox/:address
 * Belirli bir adresin maillerini getirir (admin erişimi - şifre gerektirmez)
 */
router.get('/mailbox/:address', (req, res) => {
  try {
    const db = getDb();
    const address = req.params.address.toLowerCase();

    const addr = db.get(
      `SELECT a.*, d.domain FROM addresses a
       JOIN domains d ON a.domain_id = d.id
       WHERE a.address = ?`,
      [address]
    );

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    const emails = db.all(
      `SELECT id, sender, subject, received_at, has_attachments
       FROM emails WHERE address_id = ?
       ORDER BY received_at DESC`,
      [addr.id]
    );

    // OTP algılama
    const emailsWithOtp = emails.map((mail) => {
      const fullMail = db.get('SELECT body_text, body_html FROM emails WHERE id = ?', [mail.id]);
      const text = fullMail?.body_text || stripHtml(fullMail?.body_html || '');
      const otp = extractOtp(text);
      return { ...mail, otp_code: otp, has_attachments: mail.has_attachments === 1 };
    });

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      has_password: !!addr.password_hash,
      created_at: addr.created_at,
      emails: emailsWithOtp,
    });
  } catch (err) {
    console.error('Mailbox hatası:', err);
    res.status(500).json({ error: 'Mailbox alınamadı' });
  }
});

/**
 * GET /api/admin/users
 * Tüm kullanıcıları listeler
 */
router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.all(`
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.created_at, u.last_login,
        (SELECT COUNT(*) FROM addresses a WHERE a.user_id = u.id) as address_count,
        (SELECT COUNT(*) FROM emails e JOIN addresses a ON e.address_id = a.id WHERE a.user_id = u.id) as email_count
      FROM users u ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (err) {
    console.error('Kullanıcı listeleme hatası:', err);
    res.status(500).json({ error: 'Kullanıcılar listelenemedi' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Kullanıcı rolünü değiştirir
 * Body: { role: 'free' | 'pro' | 'admin' }
 */
router.put('/users/:id/role', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { role } = req.body;

    if (!['free', 'pro', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol' });
    }

    const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: `${user.username} kullanıcısının rolü ${role} olarak değiştirildi` });
  } catch (err) {
    console.error('Rol değiştirme hatası:', err);
    res.status(500).json({ error: 'Rol değiştirilemedi' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Kullanıcıyı aktif/pasif yapar
 */
router.put('/users/:id/status', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { is_active } = req.body;

    db.run('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    res.json({ message: is_active ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasif edildi' });
  } catch (err) {
    res.status(500).json({ error: 'Durum değiştirilemedi' });
  }
});

/**
 * GET /api/admin/package-requests
 * Tüm pro yükseltme isteklerini listeler
 */
router.get('/package-requests', (req, res) => {
  try {
    const db = getDb();
    const requests = db.all(`
      SELECT pr.*, u.username, u.email, u.role
      FROM package_requests pr
      JOIN users u ON pr.user_id = u.id
      ORDER BY pr.created_at DESC
    `);
    res.json({ requests });
  } catch (err) {
    console.error('İstek listeleme hatası:', err);
    res.status(500).json({ error: 'İstekler listelenemedi' });
  }
});

/**
 * PUT /api/admin/package-requests/:id
 * Pro yükseltme isteğini onayla veya reddet
 * Body: { status: 'approved' | 'rejected' }
 */
router.put('/package-requests/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const request = db.get('SELECT * FROM package_requests WHERE id = ?', [id]);
    if (!request) return res.status(404).json({ error: 'İstek bulunamadı' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Bu istek zaten işlenmiş' });

    const reviewerId = req.user?.id || null;

    db.run('UPDATE package_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime("now") WHERE id = ?', [status, reviewerId, id]);

    if (status === 'approved') {
      db.run('UPDATE users SET role = ? WHERE id = ?', ['pro', request.user_id]);
    }

    const user = db.get('SELECT username FROM users WHERE id = ?', [request.user_id]);
    res.json({ message: status === 'approved' ? `${user?.username} Pro kullanıcı yapıldı` : 'İstek reddedildi' });
  } catch (err) {
    console.error('İstek işleme hatası:', err);
    res.status(500).json({ error: 'İstek işlenemedi' });
  }
});

module.exports = router;
