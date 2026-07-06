const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { generateUsername, formatTimeRemaining } = require('../utils');

// Adres geçerlilik süresi (dakika) - .env'den okunur veya varsayılan 60 dk
const ADDRESS_TTL_MINUTES = parseInt(process.env.ADDRESS_TTL_MINUTES || '60', 10);

/**
 * GET /api/addresses/random
 * Rastgele bir geçici adres oluşturur
 */
router.get('/random', (req, res) => {
  try {
    const db = getDb();

    // Aktif domainleri al
    const domains = db.all('SELECT * FROM domains WHERE is_active = 1');

    if (domains.length === 0) {
      return res.status(400).json({
        error: 'Henüz aktif domain yok. Admin panelinden domain ekleyin.',
      });
    }

    // Rastgele bir domain seç
    const domain = domains[Math.floor(Math.random() * domains.length)];

    // Benzersiz kullanıcı adı oluştur (çakışma olursa yeniden dene)
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

    // Adresi veritabanına kaydet
    const expiresAt = new Date(Date.now() + ADDRESS_TTL_MINUTES * 60 * 1000).toISOString();

    db.run(
      'INSERT INTO addresses (address, username, domain_id, expires_at) VALUES (?, ?, ?, ?)',
      [address, username, domain.id, expiresAt]
    );

    res.json({
      address,
      username,
      domain: domain.domain,
      expires_at: expiresAt,
      ttl_minutes: ADDRESS_TTL_MINUTES,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(500).json({ error: 'Adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses
 * Özel username ve domain ile adres oluşturur
 * Body: { username: string, domain: string }
 */
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { username, domain: domainName } = req.body;

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
      return res.status(409).json({ error: 'Bu adres zaten kullanılıyor' });
    }

    const expiresAt = new Date(Date.now() + ADDRESS_TTL_MINUTES * 60 * 1000).toISOString();

    db.run(
      'INSERT INTO addresses (address, username, domain_id, expires_at) VALUES (?, ?, ?, ?)',
      [address, username.toLowerCase(), domain.id, expiresAt]
    );

    res.json({
      address,
      username: username.toLowerCase(),
      domain: domain.domain,
      expires_at: expiresAt,
      ttl_minutes: ADDRESS_TTL_MINUTES,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(500).json({ error: 'Adres oluşturulamadı' });
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
      emails,
    });
  } catch (err) {
    console.error('Adres sorgulama hatası:', err);
    res.status(500).json({ error: 'Adres sorgulanamadı' });
  }
});

module.exports = router;
