const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { getDb } = require('../db');
const { generateUsername } = require('../utils');

// Süresiz adres: 9999-12-31
const NEVER_EXPIRES = '9999-12-31T23:59:59.000Z';

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
 * Rastgele bir adres oluşturur (süresiz)
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

    db.run(
      'INSERT INTO addresses (address, username, domain_id, expires_at, is_persistent) VALUES (?, ?, ?, ?, 1)',
      [address, username, domain.id, NEVER_EXPIRES]
    );

    res.json({
      address,
      username,
      domain: domain.domain,
      is_persistent: true,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(500).json({ error: 'Adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses/check
 * Bir adresin var olup olmadığını ve şifre korumalı olup olmadığını kontrol eder
 * Body: { username, domain }
 * Returns: { exists: bool, has_password: bool, address: string }
 */
router.post('/check', (req, res) => {
  try {
    const db = getDb();
    const { username, domain: domainName } = req.body;

    if (!username || !domainName) {
      return res.status(400).json({ error: 'Kullanıcı adı ve domain gerekli' });
    }

    const address = `${username.toLowerCase()}@${domainName.toLowerCase()}`;

    const addr = db.get(
      `SELECT a.*, d.domain FROM addresses a
       JOIN domains d ON a.domain_id = d.id
       WHERE a.address = ?`,
      [address]
    );

    if (!addr) {
      return res.json({ exists: false, has_password: false, address });
    }

    return res.json({
      exists: true,
      has_password: !!addr.password_hash,
      address,
    });
  } catch (err) {
    console.error('Adres kontrol hatası:', err);
    res.status(500).json({ error: 'Adres kontrol edilemedi' });
  }
});

/**
 * POST /api/addresses
 * Özel username ve domain ile adres oluşturur veya mevcut adrese erişir
 * Body: { username, domain, password? }
 *
 * Akış:
 * 1. Adres yoksa → yeni oluştur (şifreli veya şifresiz)
 * 2. Adres var + şifresiz → direkt mailleri göster
 * 3. Adres var + şifreli + şifre verilmiş → şifre doğrula, mailleri göster
 * 4. Adres var + şifreli + şifre verilmemiş → 403, şifre gerektiğini bildir
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
      [domainName.toLowerCase()]
    );

    if (!domain) {
      return res.status(400).json({ error: 'Domain bulunamadı veya aktif değil' });
    }

    const address = `${username.toLowerCase()}@${domain.domain}`;

    // Mevcut adres var mı?
    const existing = db.get('SELECT * FROM addresses WHERE address = ?', [address]);

    if (existing) {
      // Adres var + şifreli
      if (existing.password_hash) {
        // Şifre verilmemiş → şifre gerektiğini bildir
        if (!password) {
          return res.status(403).json({
            error: 'password_required',
            message: 'Bu adres şifre korumalı. Lütfen şifrenizi girin.',
            has_password: true,
            address,
          });
        }

        // Şifre verilmiş → doğrula
        if (!verifyPassword(password, existing.password_hash)) {
          return res.status(401).json({ error: 'Yanlış şifre' });
        }

        // Şifre doğru → son erişimi güncelle ve mailleri getir
        db.run('UPDATE addresses SET last_accessed = datetime("now") WHERE id = ?', [existing.id]);

        const emails = db.all(
          'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC',
          [existing.id]
        );

        return res.json({
          address,
          username: existing.username,
          domain: domain.domain,
          is_persistent: true,
          has_password: true,
          emails,
          returned: true,
        });
      }

      // Adres var + şifresiz → direkt mailleri göster
      const emails = db.all(
        'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC',
        [existing.id]
      );

      db.run('UPDATE addresses SET last_accessed = datetime("now") WHERE id = ?', [existing.id]);

      return res.json({
        address,
        username: existing.username,
        domain: domain.domain,
        is_persistent: true,
        has_password: false,
        emails,
        returned: true,
      });
    }

    // Yeni adres oluştur (süresiz)
    const passwordHash = password ? hashPassword(password) : null;

    db.run(
      `INSERT INTO addresses (address, username, domain_id, password_hash, is_persistent, expires_at, last_accessed)
       VALUES (?, ?, ?, ?, 1, ?, datetime('now'))`,
      [address, username.toLowerCase(), domain.id, passwordHash, NEVER_EXPIRES]
    );

    res.json({
      address,
      username: username.toLowerCase(),
      domain: domain.domain,
      is_persistent: true,
      has_password: !!password,
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
       WHERE a.address = ?`,
      [address.toLowerCase()]
    );

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    if (!addr.password_hash) {
      return res.status(400).json({ error: 'Bu adres şifre korumalı değil' });
    }

    if (!verifyPassword(password, addr.password_hash)) {
      return res.status(401).json({ error: 'Yanlış şifre' });
    }

    // Son erişim zamanını güncelle
    db.run('UPDATE addresses SET last_accessed = datetime("now") WHERE id = ?', [addr.id]);

    const emails = db.all(
      'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC',
      [addr.id]
    );

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      is_persistent: true,
      has_password: true,
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

    const emails = db.all(
      `SELECT id, sender, subject, received_at, has_attachments
       FROM emails WHERE address_id = ?
       ORDER BY received_at DESC`,
      [addr.id]
    );

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      is_persistent: true,
      has_password: !!addr.password_hash,
      emails,
    });
  } catch (err) {
    console.error('Adres sorgulama hatası:', err);
    res.status(500).json({ error: 'Adres sorgulanamadı' });
  }
});

module.exports = router;
