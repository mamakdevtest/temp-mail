const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db');
const { generateUsername, formatTimeRemaining } = require('../utils');

// Adres geçerlilik süresi (dakika) - .env'den okunur veya varsayılan 60 dk
const ADDRESS_TTL_MINUTES = parseInt(process.env.ADDRESS_TTL_MINUTES || '60', 10);

// Kalıcı adres süresi: 1 yıl (milisaniye)
const PERSISTENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Şifreyi hash'ler (SHA-256 + salt)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Şifreyi doğrular
 */
function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.createHash('sha256').update(salt + password).digest('hex');
  return hash === check;
}

/**
 * GET /api/addresses/random
 * Rastgele bir geçici adres oluşturur
 */
router.get('/random', (req, res) => {
  try {
    const db = getDb();

    const domains = db.all('SELECT * FROM domains WHERE is_active = 1');

    if (domains.length === 0) {
      return res.status(400).json({
        error: 'Henüz aktif domain yok. Admin panelinden domain ekleyin.',
      });
    }

    const domain = domains[Math.floor(Math.random() * domains.length)];

    let username;
    let address;
    let attempts = 0;

    do {
      username = generateUsername(8);
      address = `${username}@${domain.domain}`;
      attempts++;

      if (attempts > 10) {
        return res.status(500).json({ error: 'Benzersiz adres oluşturulamadı' });
      }
    } while (db.get('SELECT id FROM addresses WHERE address = ?', [address]));

    const expiresAt = new Date(Date.now() + ADDRESS_TTL_MINUTES * 60 * 1000).toISOString();

    db.run(
      'INSERT INTO addresses (address, username, domain_id, expires_at, is_persistent) VALUES (?, ?, ?, ?, 0)',
      [address, username, domain.id, expiresAt]
    );

    res.json({
      address,
      username,
      domain: domain.domain,
      expires_at: expiresAt,
      ttl_minutes: ADDRESS_TTL_MINUTES,
      is_persistent: false,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(500).json({ error: 'Adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses
 * Özel username ve domain ile adres oluşturur
 * Body: { username, domain, password? }
 * password varsa kalıcı adres oluşturulur
 */
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { username, domain: domainName, password } = req.body;

    if (!username || !domainName) {
      return res.status(400).json({ error: 'Kullanıcı adı ve domain gerekli' });
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      return res.status(400).json({
        error: 'Geçersiz kullanıcı adı. Sadece harf, rakam, nokta, tire ve alt çizgi kullanın.',
      });
    }

    const domain = db.get(
      'SELECT * FROM domains WHERE domain = ? AND is_active = 1',
      [domainName]
    );

    if (!domain) {
      return res.status(400).json({ error: 'Domain bulunamadı veya aktif değil' });
    }

    const address = `${username.toLowerCase()}@${domain.domain}`;

    const existing = db.get('SELECT id FROM addresses WHERE address = ?', [address]);
    if (existing) {
      // Eğer şifre doğruysa, mevcut adrese geri dön
      if (password) {
        const addr = db.get('SELECT * FROM addresses WHERE address = ?', [address]);
        if (addr && verifyPassword(password, addr.password_hash)) {
          // Son erişim zamanını güncelle
          const newExpiry = new Date(Date.now() + PERSISTENT_TTL_MS).toISOString();
          db.run('UPDATE addresses SET last_accessed = datetime("now"), expires_at = ? WHERE id = ?', [newExpiry, addr.id]);

          const emails = db.all(
            'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC LIMIT 50',
            [addr.id]
          );

          return res.json({
            address,
            username: addr.username,
            domain: domain.domain,
            expires_at: newExpiry,
            is_persistent: true,
            ttl_minutes: Math.floor(PERSISTENT_TTL_MS / 60000),
            emails,
            returned: true,
          });
        }
      }
      return res.status(409).json({ error: 'Bu adres zaten kullanılıyor. Şifreniz varsa girerek geri dönebilirsiniz.' });
    }

    // Şifre varsa kalıcı adres, yoksa geçici adres oluştur
    const isPersistent = !!password;
    const passwordHash = password ? hashPassword(password) : null;
    const ttlMs = isPersistent ? PERSISTENT_TTL_MS : ADDRESS_TTL_MINUTES * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    db.run(
      `INSERT INTO addresses (address, username, domain_id, password_hash, is_persistent, expires_at, last_accessed)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [address, username.toLowerCase(), domain.id, passwordHash, isPersistent ? 1 : 0, expiresAt]
    );

    res.json({
      address,
      username: username.toLowerCase(),
      domain: domain.domain,
      expires_at: expiresAt,
      is_persistent: isPersistent,
      ttl_minutes: Math.floor(ttlMs / 60000),
      password_set: isPersistent,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(500).json({ error: 'Adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses/login
 * Şifre korumalı adrese giriş yapar
 * Body: { address, password }
 */
router.post('/login', (req, res) => {
  try {
    const db = getDb();
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ error: 'Adres ve şifre gerekli' });
    }

    const addr = db.get(
      `SELECT a.*, d.domain FROM addresses a
       JOIN domains d ON a.domain_id = d.id
       WHERE a.address = ? AND a.is_persistent = 1`,
      [address.toLowerCase()]
    );

    if (!addr) {
      return res.status(404).json({ error: 'Kalıcı adres bulunamadı' });
    }

    if (!verifyPassword(password, addr.password_hash)) {
      return res.status(401).json({ error: 'Yanlış şifre' });
    }

    // Son erişim zamanını güncelle ve süreyi uzat
    const newExpiry = new Date(Date.now() + PERSISTENT_TTL_MS).toISOString();
    db.run('UPDATE addresses SET last_accessed = datetime("now"), expires_at = ? WHERE id = ?', [newExpiry, addr.id]);

    const emails = db.all(
      'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC LIMIT 50',
      [addr.id]
    );

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      expires_at: newExpiry,
      is_persistent: true,
      ttl_minutes: Math.floor(PERSISTENT_TTL_MS / 60000),
      emails,
    });
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Giriş yapılamadı' });
  }
});

/**
 * GET /api/addresses/:address
 * Adres bilgisini ve son mailleri getirir
 */
router.get('/:address', (req, res) => {
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

    if (new Date(addr.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Bu adresin süresi doldu' });
    }

    const emails = db.all(
      `SELECT id, sender, subject, received_at, has_attachments
       FROM emails WHERE address_id = ?
       ORDER BY received_at DESC LIMIT 50`,
      [addr.id]
    );

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      expires_at: addr.expires_at,
      remaining: formatTimeRemaining(addr.expires_at),
      is_persistent: addr.is_persistent === 1,
      has_password: !!addr.password_hash,
      emails,
    });
  } catch (err) {
    console.error('Adres sorgulama hatası:', err);
    res.status(500).json({ error: 'Adres sorgulanamadı' });
  }
});

module.exports = router;
