const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { manualCleanup } = require('../services/cleanup');

// Basit şifre koruması middleware
function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'] || req.query.password;

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Geçersiz admin şifresi' });
  }

  next();
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
    const deleted = manualCleanup();
    res.json({ message: `${deleted} adres temizlendi`, deleted });
  } catch (err) {
    console.error('Manuel temizlik hatası:', err);
    res.status(500).json({ error: 'Temizlik yapılamadı' });
  }
});

module.exports = router;
