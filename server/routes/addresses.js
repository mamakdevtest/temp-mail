const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getDb } = require('../db');
const { generateUsername } = require('../utils');
const { rateLimit } = require('../middleware/apiContract');

// Süresiz adres: 9999-12-31
const NEVER_EXPIRES = '9999-12-31T23:59:59.000Z';
const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';

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

function getOptionalUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    if (decoded.session_id) {
      const db = getDb();
      const session = db.get(
        'SELECT id, revoked_at FROM user_sessions WHERE session_id = ? AND user_id = ?',
        [decoded.session_id, decoded.id]
      );
      if (!session || session.revoked_at) return null;
    }
    return decoded;
  } catch (e) {
    return null;
  }
}

function getUserPackage(db, role, packageName = null) {
  const normalizedPackage = packageName || (role === 'admin' ? 'admin' : role === 'pro' ? 'pro' : 'free');
  return db.get('SELECT * FROM packages WHERE name = ?', [normalizedPackage]) || {
    name: 'free',
    display_name: 'Ücretsiz',
    max_addresses: 3,
    max_emails: 50,
  };
}

function getAddressCount(db, userId) {
  const row = db.get('SELECT COUNT(*) as c FROM addresses WHERE user_id = ?', [userId]);
  return row?.c || 0;
}

function assertAddressQuota(db, req) {
  const user = getOptionalUser(req);
  if (!user?.id) return { user: null, pkg: null };
  const current = db.get('SELECT id, role, package_name, is_active FROM users WHERE id = ?', [user.id]);
  if (!current || current.is_active === 0) return { user: null, pkg: null };
  const pkg = getUserPackage(db, current.role, current.package_name);
  const limit = Number(pkg.max_addresses || 0);
  if (limit < 9999) {
    const count = getAddressCount(db, current.id);
    if (count >= limit) {
      const err = new Error(`${pkg.display_name || 'Bu hesap'} için adres limiti doldu. Paket yükseltin.`);
      err.status = 403;
      throw err;
    }
  }
  return { user: current, pkg };
}

/**
 * GET /api/addresses/domains
 * Aktif domainleri listeler (public - şifre gerektirmez)
 * Dropdown'da kullanıcının domain seçmesi için
 */
router.get('/domains', (req, res) => {
  try {
    const db = getDb();
    const domains = db.all('SELECT id, domain, wildcard_subdomains FROM domains WHERE is_active = 1 ORDER BY domain');

    // Her domain için subdomain'leri getir
    const domainsWithSubdomains = domains.map((domain) => {
      const subdomains = db.all(
        'SELECT id, subdomain FROM subdomains WHERE domain_id = ? AND is_active = 1 ORDER BY subdomain',
        [domain.id]
      );
      return {
        ...domain,
        subdomains: subdomains.map((s) => ({
          id: s.id,
          name: s.subdomain,
          full_domain: `${s.subdomain}.${domain.domain}`,
        })),
      };
    });

    res.json({ domains: domainsWithSubdomains });
  } catch (err) {
    console.error('Domain listeleme hatası:', err);
    res.status(err.status || 500).json({ error: err.message || 'Domainler listelenemedi' });
  }
});

/**
 * POST /api/addresses/random
 * Rastgele bir adres oluşturur (süresiz)
 * Body: { password? } - opsiyonel şifre
 */
router.post('/random', (req, res) => {
  try {
    const db = getDb();
    const { password } = req.body || {};
    const { user } = assertAddressQuota(db, req);

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

    const passwordHash = password ? hashPassword(password) : null;

    db.run(
      'INSERT INTO addresses (address, username, domain_id, user_id, password_hash, expires_at, is_persistent) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [address, username, domain.id, user?.id || null, passwordHash, NEVER_EXPIRES]
    );

    res.json({
      address,
      username,
      domain: domain.domain,
      is_persistent: true,
      has_password: !!password,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(err.status || 500).json({ error: err.message || 'Adres oluşturulamadı' });
  }
});

function requireBulkUser(db, req) {
  const tokenUser = getOptionalUser(req);
  if (!tokenUser?.id) {
    const err = new Error('Bulk adres havuzu için giriş yapın'); err.status = 401; err.code = 'unauthorized'; throw err;
  }
  const user = db.get('SELECT id, role, package_name, is_active, bulk_access_enabled FROM users WHERE id = ?', [tokenUser.id]);
  if (!user || !user.is_active) { const err = new Error('Hesap aktif değil'); err.status = 403; err.code = 'forbidden'; throw err; }
  if (!['pro', 'pro_plus'].includes(user.package_name) || user.role !== 'pro' || !user.bulk_access_enabled) {
    const err = new Error('Bu hesap için bulk adres erişimi açık değil'); err.status = 403; err.code = 'bulk_access_required'; throw err;
  }
  return { user, pkg: getUserPackage(db, user.role, user.package_name) };
}

router.get('/bulk', (req, res) => {
  try {
    const db = getDb();
    const { user } = requireBulkUser(db, req);
    const pools = db.all(`
      SELECT p.id, p.prefix, p.next_index, p.created_at, p.updated_at, d.domain,
        COUNT(a.id) AS address_count, MAX(a.created_at) AS last_generated_at
      FROM bulk_address_pools p
      JOIN domains d ON d.id = p.domain_id
      LEFT JOIN addresses a ON a.bulk_pool_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY p.updated_at DESC, p.id DESC`, [user.id]);
    res.json({ pools });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.code || 'internal_error', message: err.message || 'Bulk havuzları alınamadı' });
  }
});

router.post('/bulk', rateLimit({ max: 5, key: 'address-bulk' }), (req, res) => {
  const db = getDb();
  try {
    const { user, pkg } = requireBulkUser(db, req);
    const prefix = String(req.body?.prefix || '').trim().toLowerCase();
    const domainName = String(req.body?.domain || '').trim().toLowerCase();
    const count = Number.parseInt(req.body?.count, 10);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(prefix) || !domainName || !Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: 'invalid_request', message: 'prefix, aktif domain ve 1-100 arası count gerekli' });
    }
    const domain = db.get('SELECT id, domain FROM domains WHERE domain = ? AND is_active = 1', [domainName]);
    if (!domain) return res.status(400).json({ error: 'invalid_domain', message: 'Domain bulunamadı veya aktif değil' });
    const currentCount = getAddressCount(db, user.id);
    const remaining = Math.max(0, Number(pkg.max_addresses || 0) - currentCount);
    if (remaining < count) return res.status(403).json({ error: 'quota_exceeded', message: `Bulk işlem için ${count} adres gerekli; kullanılabilir kotanız ${remaining}` });

    let pool;
    let index;
    const addresses = [];
    db.transaction(() => {
      pool = db.get('SELECT * FROM bulk_address_pools WHERE user_id = ? AND domain_id = ? AND prefix = ?', [user.id, domain.id, prefix]);
      if (!pool) {
        const created = db.run('INSERT INTO bulk_address_pools (user_id, domain_id, prefix, next_index) VALUES (?, ?, ?, 0)', [user.id, domain.id, prefix]);
        pool = db.get('SELECT * FROM bulk_address_pools WHERE id = ?', [created.lastInsertRowid]);
      }
      index = Number(pool.next_index || 0);
      while (addresses.length < count) {
        const username = `${prefix}_${index}`;
        const address = `${username}@${domain.domain}`;
        index += 1;
        if (db.get('SELECT id FROM addresses WHERE address = ?', [address])) continue;
        db.run(`INSERT INTO addresses (address, username, domain_id, user_id, bulk_pool_id, is_persistent, expires_at, last_accessed)
          VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))`, [address, username, domain.id, user.id, pool.id, NEVER_EXPIRES]);
        addresses.push(address);
      }
      db.run('UPDATE bulk_address_pools SET next_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [index, pool.id]);
    });
    res.status(201).json({ addresses, pool: { id: pool.id, prefix, domain: domain.domain, next_index: index } });
  } catch (err) {
    console.error('Bulk adres oluşturma hatası:', err);
    res.status(err.status || 500).json({ error: err.code || 'internal_error', message: err.message || 'Bulk adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses/set-password
 * Mevcut şifresiz bir adrese şifre koyar
 * Body: { address, password }
 */
router.post('/set-password', (req, res) => {
  try {
    const db = getDb();
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ error: 'Adres ve şifre gerekli' });
    }

    const addr = db.get('SELECT * FROM addresses WHERE address = ?', [address.toLowerCase()]);
    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    if (addr.password_hash) {
      return res.status(400).json({ error: 'Bu adresin zaten şifresi var' });
    }

    const passwordHash = hashPassword(password);
    db.run('UPDATE addresses SET password_hash = ? WHERE id = ?', [passwordHash, addr.id]);

    res.json({ message: 'Şifre ayarlandı', address: addr.address, has_password: true });
  } catch (err) {
    console.error('Şifre ayarlama hatası:', err);
    res.status(err.status || 500).json({ error: err.message || 'Şifre ayarlanamadı' });
  }
});

/**
 * POST /api/addresses/check
 * Bir adresin var olup olmadığını ve şifre korumalı olup olmadığını kontrol eder
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
    res.status(err.status || 500).json({ error: err.message || 'Adres kontrol edilemedi' });
  }
});

/**
 * POST /api/addresses
 * Özel username ve domain ile adres oluşturur veya mevcut adrese erişir
 */
router.post('/', rateLimit({ max: 30, key: 'address-create' }), (req, res) => {
  try {
    const db = getDb();
    const { username, domain: domainName, subdomain, password } = req.body;
    const authUser = getOptionalUser(req);
    const currentUser = authUser?.id ? db.get('SELECT id, role, package_name, is_active FROM users WHERE id = ?', [authUser.id]) : null;

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

    // Subdomain kontrolü
    let fullDomain = domain.domain;
    if (subdomain && subdomain.trim()) {
      const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-zA-Z0-9-]/g, '');
      if (!cleanSubdomain) {
        return res.status(400).json({ error: 'Geçersiz subdomain formatı' });
      }
      if (!domain.wildcard_subdomains) {
        return res.status(400).json({ error: 'Bu domain için subdomain desteği aktif değil' });
      }
      // Subdomain'in veritabanında kayıtlı olduğunu kontrol et
      const existingSubdomain = db.get(
        'SELECT id FROM subdomains WHERE domain_id = ? AND subdomain = ? AND is_active = 1',
        [domain.id, cleanSubdomain]
      );
      if (!existingSubdomain) {
        return res.status(400).json({ error: 'Bu subdomain bulunamadı veya aktif değil' });
      }
      fullDomain = `${cleanSubdomain}.${domain.domain}`;
    }

    const address = `${username.toLowerCase()}@${fullDomain}`;

    // Mevcut adres var mı?
    const existing = db.get('SELECT * FROM addresses WHERE address = ?', [address]);

    if (existing) {
      // Adres var + şifreli
      if (existing.password_hash) {
        if (!password) {
          return res.status(403).json({
            error: 'password_required',
            message: 'Bu adres şifre korumalı. Lütfen şifrenizi girin.',
            has_password: true,
            address,
          });
        }

        if (!verifyPassword(password, existing.password_hash)) {
          return res.status(401).json({ error: 'Yanlış şifre' });
        }

        db.run('UPDATE addresses SET last_accessed = datetime("now") WHERE id = ?', [existing.id]);
        if (currentUser?.id && !existing.user_id) {
          const pkg = getUserPackage(db, currentUser.role, currentUser.package_name);
          const limit = Number(pkg.max_addresses || 0);
          if (limit < 9999) {
            const count = getAddressCount(db, currentUser.id);
            if (count >= limit) {
              return res.status(403).json({ error: `${pkg.display_name || 'Bu hesap'} için adres limiti doldu. Paket yükseltin.` });
            }
          }
          db.run('UPDATE addresses SET user_id = COALESCE(user_id, ?) WHERE id = ?', [currentUser.id, existing.id]);
        }

        const emails = db.all(
          'SELECT id, sender, subject, received_at, has_attachments FROM emails WHERE address_id = ? ORDER BY received_at DESC',
          [existing.id]
        );

        return res.json({
          address,
          username: existing.username,
          domain: fullDomain,
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
      if (currentUser?.id && !existing.user_id) {
        const pkg = getUserPackage(db, currentUser.role, currentUser.package_name);
        const limit = Number(pkg.max_addresses || 0);
        if (limit < 9999) {
          const count = getAddressCount(db, currentUser.id);
          if (count >= limit) {
            return res.status(403).json({ error: `${pkg.display_name || 'Bu hesap'} için adres limiti doldu. Paket yükseltin.` });
          }
        }
        db.run('UPDATE addresses SET user_id = COALESCE(user_id, ?) WHERE id = ?', [currentUser.id, existing.id]);
      }

      return res.json({
        address,
        username: existing.username,
        domain: fullDomain,
        is_persistent: true,
        has_password: false,
        emails,
        returned: true,
      });
    }

    // Yeni adres oluştur (süresiz)
    const quotaInfo = assertAddressQuota(db, req);
    const passwordHash = password ? hashPassword(password) : null;

    db.run(
      `INSERT INTO addresses (address, username, domain_id, user_id, password_hash, is_persistent, expires_at, last_accessed)
       VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'))`,
      [address, username.toLowerCase(), domain.id, quotaInfo.user?.id || null, passwordHash, NEVER_EXPIRES]
    );

    res.json({
      address,
      username: username.toLowerCase(),
      domain: fullDomain,
      is_persistent: true,
      has_password: !!password,
    });
  } catch (err) {
    console.error('Adres oluşturma hatası:', err);
    res.status(err.status || 500).json({ error: err.message || 'Adres oluşturulamadı' });
  }
});

/**
 * POST /api/addresses/login
 * Şifre korumalı adrese giriş yapar
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
    res.status(err.status || 500).json({ error: err.message || 'Giriş yapılamadı' });
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
    res.status(err.status || 500).json({ error: err.message || 'Adres sorgulanamadı' });
  }
});

module.exports = router;
