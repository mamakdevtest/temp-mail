const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { getDb } = require('../db');
const { manualCleanup } = require('../services/cleanup');
const { extractOtp, stripHtml } = require('../utils/otpDetection');

const JWT_SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';

function getDefaultServerIp() {
  return process.env.MAIL_SERVER_IP || process.env.PUBLIC_IP || process.env.SERVER_IP || '127.0.0.1';
}

function buildDomainDnsDefaults(domain) {
  const serverIp = getDefaultServerIp();
  return {
    server_ip: serverIp,
    a_host: 'mail',
    a_value: serverIp,
    mx_host: '@',
    mx_value: `mail.${domain}`,
    mx_priority: 10,
    txt_spf_host: '@',
    txt_spf_value: `v=spf1 mx ip4:${serverIp} ~all`,
    txt_verification_host: '@',
    txt_verification_value: `ms-temp-mail-domain=${domain.replace(/[^a-z0-9]/gi, '-')}`,
    dkim_host: 'default._domainkey',
    dkim_value: 'v=DKIM1; k=rsa; p=REPLACE_WITH_PUBLIC_KEY',
    dmarc_host: '_dmarc',
    dmarc_value: `v=DMARC1; p=none; rua=mailto:postmaster@${domain}`,
  };
}

function normalizeDomainConfig(domainName, body = {}) {
  const defaults = buildDomainDnsDefaults(domainName);
  return {
    server_ip: String(body.server_ip ?? defaults.server_ip).trim(),
    a_host: String(body.a_host ?? defaults.a_host).trim() || '@',
    a_value: String(body.a_value ?? defaults.a_value).trim(),
    mx_host: String(body.mx_host ?? defaults.mx_host).trim() || '@',
    mx_value: String(body.mx_value ?? defaults.mx_value).trim(),
    mx_priority: Number.isFinite(Number(body.mx_priority)) ? Number(body.mx_priority) : defaults.mx_priority,
    txt_spf_host: String(body.txt_spf_host ?? defaults.txt_spf_host).trim() || '@',
    txt_spf_value: String(body.txt_spf_value ?? defaults.txt_spf_value).trim(),
    txt_verification_host: String(body.txt_verification_host ?? defaults.txt_verification_host).trim() || '@',
    txt_verification_value: String(body.txt_verification_value ?? defaults.txt_verification_value).trim(),
    dkim_host: String(body.dkim_host ?? defaults.dkim_host).trim() || 'default._domainkey',
    dkim_value: String(body.dkim_value ?? defaults.dkim_value).trim(),
    dmarc_host: String(body.dmarc_host ?? defaults.dmarc_host).trim() || '_dmarc',
    dmarc_value: String(body.dmarc_value ?? defaults.dmarc_value).trim(),
  };
}

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded.role === 'admin') {
        req.user = decoded;
        return next();
      }
    } catch (e) {
      /* token geçersiz, şifre fallback'ini dene */
    }
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'] || req.query.password;
  if (providedPassword === adminPassword) {
    return next();
  }

  return res.status(401).json({ error: 'Admin yetkisi gerekiyor' });
}

router.use(adminAuth);

function enrichMailWithOtp(db, mail) {
  const fullMail = db.get('SELECT body_text, body_html FROM emails WHERE id = ?', [mail.id]);
  const text = fullMail?.body_text || stripHtml(fullMail?.body_html || '');
  const otp = extractOtp(text);
  return { ...mail, otp_code: otp, has_attachments: mail.has_attachments === 1 };
}

function getAddressRecord(db, address) {
  return db.get(`
    SELECT a.id, a.address, a.username, a.created_at, a.last_accessed, a.expires_at, a.is_persistent, a.user_id,
           a.password_hash IS NOT NULL as has_password, d.domain
    FROM addresses a
    JOIN domains d ON a.domain_id = d.id
    WHERE a.address = ?
  `, [address]);
}

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

router.post('/domains', (req, res) => {
  try {
    const db = getDb();
    const { domain, wildcard_subdomains } = req.body;

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

    const normalizedDomain = domain.toLowerCase();
    const dnsDefaults = normalizeDomainConfig(normalizedDomain, req.body);
    const result = db.run(`
      INSERT INTO domains (
        domain, wildcard_subdomains, server_ip, a_host, a_value, mx_host, mx_value, mx_priority,
        txt_spf_host, txt_spf_value, txt_verification_host, txt_verification_value,
        dkim_host, dkim_value, dmarc_host, dmarc_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      normalizedDomain,
      wildcard_subdomains ? 1 : 0,
      dnsDefaults.server_ip,
      dnsDefaults.a_host,
      dnsDefaults.a_value,
      dnsDefaults.mx_host,
      dnsDefaults.mx_value,
      dnsDefaults.mx_priority,
      dnsDefaults.txt_spf_host,
      dnsDefaults.txt_spf_value,
      dnsDefaults.txt_verification_host,
      dnsDefaults.txt_verification_value,
      dnsDefaults.dkim_host,
      dnsDefaults.dkim_value,
      dnsDefaults.dmarc_host,
      dnsDefaults.dmarc_value,
    ]);
    const newDomain = db.get('SELECT * FROM domains WHERE id = ?', [result.lastInsertRowid]);

    res.json({ domain: newDomain });
  } catch (err) {
    console.error('Domain ekleme hatası:', err);
    res.status(500).json({ error: 'Domain eklenemedi' });
  }
});

router.put('/domains/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { is_active, wildcard_subdomains } = req.body;

    const domain = db.get('SELECT * FROM domains WHERE id = ?', [id]);
    if (!domain) {
      return res.status(404).json({ error: 'Domain bulunamadı' });
    }

    const config = normalizeDomainConfig(domain.domain, { ...domain, ...req.body });
    db.run(`
      UPDATE domains
      SET is_active = ?, wildcard_subdomains = ?, server_ip = ?, a_host = ?, a_value = ?, mx_host = ?, mx_value = ?, mx_priority = ?,
          txt_spf_host = ?, txt_spf_value = ?, txt_verification_host = ?, txt_verification_value = ?,
          dkim_host = ?, dkim_value = ?, dmarc_host = ?, dmarc_value = ?
      WHERE id = ?
    `, [
      typeof is_active === 'undefined' ? domain.is_active : (is_active ? 1 : 0),
      typeof wildcard_subdomains === 'undefined' ? domain.wildcard_subdomains : (wildcard_subdomains ? 1 : 0),
      config.server_ip,
      config.a_host,
      config.a_value,
      config.mx_host,
      config.mx_value,
      config.mx_priority,
      config.txt_spf_host,
      config.txt_spf_value,
      config.txt_verification_host,
      config.txt_verification_value,
      config.dkim_host,
      config.dkim_value,
      config.dmarc_host,
      config.dmarc_value,
      id,
    ]);
    const updated = db.get('SELECT * FROM domains WHERE id = ?', [id]);

    res.json({ domain: updated });
  } catch (err) {
    console.error('Domain güncelleme hatası:', err);
    res.status(500).json({ error: 'Domain güncellenemedi' });
  }
});

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

// Subdomain endpoints

router.get('/domains/:id/subdomains', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const domain = db.get('SELECT * FROM domains WHERE id = ?', [id]);
    if (!domain) {
      return res.status(404).json({ error: 'Domain bulunamadı' });
    }

    const subdomains = db.all(
      'SELECT * FROM subdomains WHERE domain_id = ? ORDER BY created_at DESC',
      [id]
    );

    res.json({ domain: domain.domain, subdomains });
  } catch (err) {
    console.error('Subdomain listeleme hatası:', err);
    res.status(500).json({ error: 'Subdomainler listelenemedi' });
  }
});

router.post('/domains/:id/subdomains', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { subdomain } = req.body;

    if (!subdomain || !subdomain.trim()) {
      return res.status(400).json({ error: 'Subdomain adı gerekli' });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!cleanSubdomain || cleanSubdomain.length < 1 || cleanSubdomain.length > 63) {
      return res.status(400).json({ error: 'Geçersiz subdomain formatı (1-63 karakter, sadece harf, rakam, tire)' });
    }

    const domain = db.get('SELECT * FROM domains WHERE id = ?', [id]);
    if (!domain) {
      return res.status(404).json({ error: 'Domain bulunamadı' });
    }

    if (!domain.wildcard_subdomains) {
      return res.status(400).json({ error: 'Bu domain için subdomain desteği aktif değil' });
    }

    const existing = db.get(
      'SELECT id FROM subdomains WHERE domain_id = ? AND subdomain = ?',
      [id, cleanSubdomain]
    );
    if (existing) {
      return res.status(409).json({ error: 'Bu subdomain zaten ekli' });
    }

    const result = db.run(
      'INSERT INTO subdomains (domain_id, subdomain) VALUES (?, ?)',
      [id, cleanSubdomain]
    );

    const newSubdomain = db.get('SELECT * FROM subdomains WHERE id = ?', [result.lastInsertRowid]);

    res.json({
      subdomain: newSubdomain,
      full_domain: `${cleanSubdomain}.${domain.domain}`,
    });
  } catch (err) {
    console.error('Subdomain ekleme hatası:', err);
    res.status(500).json({ error: 'Subdomain eklenemedi' });
  }
});

router.delete('/domains/:domainId/subdomains/:subdomainId', (req, res) => {
  try {
    const db = getDb();
    const { domainId, subdomainId } = req.params;

    const subdomain = db.get(
      'SELECT * FROM subdomains WHERE id = ? AND domain_id = ?',
      [subdomainId, domainId]
    );
    if (!subdomain) {
      return res.status(404).json({ error: 'Subdomain bulunamadı' });
    }

    db.run('DELETE FROM subdomains WHERE id = ?', [subdomainId]);

    res.json({ message: 'Subdomain silindi', subdomain: subdomain.subdomain });
  } catch (err) {
    console.error('Subdomain silme hatası:', err);
    res.status(500).json({ error: 'Subdomain silinemedi' });
  }
});

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

router.get('/stats', (req, res) => {
  try {
    const db = getDb();

    const totalEmails = db.get('SELECT COUNT(*) as count FROM emails');
    const totalAddresses = db.get('SELECT COUNT(*) as count FROM addresses');
    const recentEmails = db.get(
      "SELECT COUNT(*) as count FROM emails WHERE received_at > datetime('now', '-24 hours')"
    );

    const topSenders = db.all(`
      SELECT sender, COUNT(*) as email_count, MAX(received_at) as last_received
      FROM emails
      GROUP BY sender
      ORDER BY email_count DESC
      LIMIT 20
    `);

    const senderDomains = {};
    for (const sender of topSenders) {
      const match = sender.sender.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const domain = match ? match[1].toLowerCase() : 'bilinmeyen';
      if (!senderDomains[domain]) {
        senderDomains[domain] = { domain, email_count: 0, senders: [] };
      }
      senderDomains[domain].email_count += sender.email_count;
      senderDomains[domain].senders.push({ sender: sender.sender, count: sender.email_count });
    }

    const topDomains = Object.values(senderDomains)
      .sort((a, b) => b.email_count - a.email_count)
      .slice(0, 15);

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
        otpCount += 1;
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

    const latestEmails = db.all(`
      SELECT e.id, e.sender, e.subject, e.received_at, e.has_attachments,
             a.address as recipient_address
      FROM emails e
      JOIN addresses a ON e.address_id = a.id
      ORDER BY e.received_at DESC
      LIMIT 50
    `).map((mail) => enrichMailWithOtp(db, mail));

    res.json({
      total_emails: totalEmails?.count || 0,
      total_addresses: totalAddresses?.count || 0,
      recent_24h: recentEmails?.count || 0,
      otp_count: otpCount,
      otp_emails: otpEmails,
      top_domains: topDomains,
      top_senders: topSenders.slice(0, 10),
      latest_emails: latestEmails,
    });
  } catch (err) {
    console.error('İstatistik hatası:', err);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

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
    `, [limit, offset]).map((mail) => enrichMailWithOtp(db, mail));

    res.json({
      emails,
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

router.delete('/emails/:id', (req, res) => {
  try {
    const db = getDb();
    const emailId = req.params.id;

    const email = db.get('SELECT id FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return res.status(404).json({ error: 'Mail bulunamadı' });
    }

    db.run('DELETE FROM attachments WHERE email_id = ?', [emailId]);
    db.run('DELETE FROM emails WHERE id = ?', [emailId]);

    res.json({ message: 'Mail silindi', id: parseInt(emailId, 10) });
  } catch (err) {
    console.error('Admin mail silme hatası:', err);
    res.status(500).json({ error: 'Mail silinemedi' });
  }
});

router.get('/addresses', (req, res) => {
  try {
    const db = getDb();

    const addresses = db.all(`
      SELECT a.id, a.address, a.username, a.created_at, a.last_accessed, a.expires_at, a.is_persistent, a.user_id,
             a.password_hash IS NOT NULL as has_password,
             d.domain,
             (SELECT COUNT(*) FROM emails e WHERE e.address_id = a.id) as email_count,
             (SELECT MAX(e.received_at) FROM emails e WHERE e.address_id = a.id) as last_email_at
      FROM addresses a
      JOIN domains d ON a.domain_id = d.id
      ORDER BY a.created_at DESC
    `);

    res.json({
      addresses: addresses.map((address) => ({
        ...address,
        has_password: address.has_password === 1,
        is_persistent: address.is_persistent === 1,
      })),
    });
  } catch (err) {
    console.error('Adres listeleme hatası:', err);
    res.status(500).json({ error: 'Adresler listelenemedi' });
  }
});

router.get('/addresses/:address', (req, res) => {
  try {
    const db = getDb();
    const address = decodeURIComponent(req.params.address).toLowerCase();
    const addr = getAddressRecord(db, address);

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    const emails = db.all(`
      SELECT id, sender, subject, received_at, has_attachments
      FROM emails
      WHERE address_id = ?
      ORDER BY received_at DESC
    `, [addr.id]).map((mail) => enrichMailWithOtp(db, mail));

    const otpHistory = emails
      .filter((mail) => mail.otp_code)
      .map((mail) => ({
        id: mail.id,
        sender: mail.sender,
        subject: mail.subject,
        otp_code: mail.otp_code,
        received_at: mail.received_at,
      }));

    res.json({
      address: {
        ...addr,
        has_password: addr.has_password === 1,
        is_persistent: addr.is_persistent === 1,
      },
      stats: {
        total_emails: emails.length,
        otp_count: otpHistory.length,
        attachment_count: emails.filter((mail) => mail.has_attachments).length,
        last_email_at: emails[0]?.received_at || null,
      },
      otp_history: otpHistory,
      emails,
    });
  } catch (err) {
    console.error('Adres detay hatası:', err);
    res.status(500).json({ error: 'Adres detayı alınamadı' });
  }
});

router.post('/addresses/:address/cleanup', (req, res) => {
  try {
    const db = getDb();
    const address = decodeURIComponent(req.params.address).toLowerCase();
    const addr = getAddressRecord(db, address);

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    const emailIds = db.all('SELECT id FROM emails WHERE address_id = ?', [addr.id]);
    emailIds.forEach((row) => {
      db.run('DELETE FROM attachments WHERE email_id = ?', [row.id]);
    });
    db.run('DELETE FROM emails WHERE address_id = ?', [addr.id]);

    res.json({ message: 'Adresin mail geçmişi temizlendi', deleted: emailIds.length });
  } catch (err) {
    console.error('Adres temizleme hatası:', err);
    res.status(500).json({ error: 'Adres geçmişi temizlenemedi' });
  }
});

router.delete('/addresses/:address', (req, res) => {
  try {
    const db = getDb();
    const address = decodeURIComponent(req.params.address).toLowerCase();
    const addr = getAddressRecord(db, address);

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    const emailIds = db.all('SELECT id FROM emails WHERE address_id = ?', [addr.id]);
    emailIds.forEach((row) => {
      db.run('DELETE FROM attachments WHERE email_id = ?', [row.id]);
    });
    db.run('DELETE FROM emails WHERE address_id = ?', [addr.id]);
    db.run('DELETE FROM addresses WHERE id = ?', [addr.id]);

    res.json({ message: 'Adres silindi', address: addr.address });
  } catch (err) {
    console.error('Adres silme hatası:', err);
    res.status(500).json({ error: 'Adres silinemedi' });
  }
});

router.get('/mailbox/:address', (req, res) => {
  try {
    const db = getDb();
    const address = req.params.address.toLowerCase();
    const addr = getAddressRecord(db, address);

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    const emails = db.all(`
      SELECT id, sender, subject, received_at, has_attachments
      FROM emails
      WHERE address_id = ?
      ORDER BY received_at DESC
    `, [addr.id]).map((mail) => enrichMailWithOtp(db, mail));

    res.json({
      address: addr.address,
      username: addr.username,
      domain: addr.domain,
      has_password: !!addr.has_password,
      created_at: addr.created_at,
      emails,
    });
  } catch (err) {
    console.error('Mailbox hatası:', err);
    res.status(500).json({ error: 'Mailbox alınamadı' });
  }
});

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

router.put('/users/:id/role', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { role } = req.body;

    if (!['free', 'pro', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol' });
    }

    const user = db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: `${user.username} kullanıcısının rolü ${role} olarak değiştirildi` });
  } catch (err) {
    console.error('Rol değiştirme hatası:', err);
    res.status(500).json({ error: 'Rol değiştirilemedi' });
  }
});

router.put('/users/:id/status', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { is_active } = req.body;

    db.run('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    res.json({ message: is_active ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasif edildi' });
  } catch (err) {
    console.error('Durum değiştirme hatası:', err);
    res.status(500).json({ error: 'Durum değiştirilemedi' });
  }
});

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

router.put('/package-requests/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const request = db.get('SELECT * FROM package_requests WHERE id = ?', [id]);
    if (!request) {
      return res.status(404).json({ error: 'İstek bulunamadı' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Bu istek zaten işlenmiş' });
    }

    const reviewerId = req.user?.id || null;

    db.run(
      'UPDATE package_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime("now") WHERE id = ?',
      [status, reviewerId, id]
    );

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
