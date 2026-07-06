const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { getDb } = require('../db');

/**
 * SMTP relay transporter oluştur (giden mailler için)
 * Sadece SMTP_RELAY_HOST tanımlıysa çalışır
 */
function createTransporter() {
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

/**
 * GET /api/emails/:address
 * Bir adrese gelen tüm mailleri listeler (polling endpoint)
 */
router.get('/:address', (req, res) => {
  try {
    const db = getDb();
    const address = req.params.address.toLowerCase();

    const addr = db.get(
      `SELECT a.id FROM addresses a
       WHERE a.address = ? AND a.expires_at > datetime('now')`,
      [address]
    );

    if (!addr) {
      return res.status(404).json({ error: 'Adres bulunamadı veya süresi dolmuş' });
    }

    const emails = db.all(
      `SELECT id, sender, subject, received_at, has_attachments
       FROM emails WHERE address_id = ?
       ORDER BY received_at DESC`,
      [addr.id]
    );

    res.json({ address, emails });
  } catch (err) {
    console.error('Mail listeleme hatası:', err);
    res.status(500).json({ error: 'Mailler listelenemedi' });
  }
});

/**
 * POST /api/emails/send
 * Mail gönderir (SMTP relay ile)
 * Body: { from, to, subject, body }
 */
router.post('/send', async (req, res) => {
  try {
    const { from, to, subject, body } = req.body;

    if (!from || !to || !subject || !body) {
      return res.status(400).json({ error: 'Gönderen, alıcı, konu ve içerik gerekli' });
    }

    const db = getDb();

    // Gönderen adresinin veritabanında var olduğunu ve aktif olduğunu kontrol et
    const senderAddr = db.get(
      `SELECT a.id FROM addresses a
       WHERE a.address = ? AND a.expires_at > datetime('now')`,
      [from.toLowerCase()]
    );

    if (!senderAddr) {
      return res.status(403).json({ error: 'Bu adres sistemde bulunamadı veya süresi dolmuş' });
    }

    // SMTP relay transporter'ı kontrol et
    const transporter = createTransporter();

    if (!transporter) {
      return res.status(503).json({
        error: 'Mail gönderme yapılandırılmamış. SMTP_RELAY_HOST ayarlanmamış.',
      });
    }

    // Mail gönder
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });

    console.log(`📤 Mail gönderildi: ${from} → ${to} (Konu: ${subject}) [${info.messageId}]`);

    res.json({
      message: 'Mail gönderildi',
      messageId: info.messageId,
    });
  } catch (err) {
    console.error('Mail gönderme hatası:', err);
    res.status(500).json({ error: `Mail gönderilemedi: ${err.message}` });
  }
});

/**
 * GET /api/emails/send/status
 * Mail gönderme durumunu kontrol et (SMTP relay ayarlı mı?)
 */
router.get('/send/status', (req, res) => {
  const host = process.env.SMTP_RELAY_HOST;
  res.json({
    configured: !!host,
    host: host || null,
    port: process.env.SMTP_RELAY_PORT || '587',
  });
});

/**
 * GET /api/emails/single/:id
 * Tek bir mailin detayını getirir (HTML, düz metin, ekler)
 */
router.get('/single/:id', (req, res) => {
  try {
    const db = getDb();
    const emailId = req.params.id;

    const email = db.get(
      `SELECT e.*, a.address
       FROM emails e
       JOIN addresses a ON e.address_id = a.id
       WHERE e.id = ?`,
      [emailId]
    );

    if (!email) {
      return res.status(404).json({ error: 'Mail bulunamadı' });
    }

    const attachments = db.all(
      'SELECT id, filename, content_type, size FROM attachments WHERE email_id = ?',
      [emailId]
    );

    res.json({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      body_text: email.body_text,
      body_html: email.body_html,
      received_at: email.received_at,
      has_attachments: email.has_attachments === 1,
      attachments,
    });
  } catch (err) {
    console.error('Mail detay hatası:', err);
    res.status(500).json({ error: 'Mail detayı alınamadı' });
  }
});

/**
 * GET /api/emails/:emailId/attachments/:attId
 * Bir eki indirir
 */
router.get('/:emailId/attachments/:attId', (req, res) => {
  try {
    const db = getDb();
    const { emailId, attId } = req.params;

    const attachment = db.get(
      `SELECT a.*, e.subject
       FROM attachments a
       JOIN emails e ON a.email_id = e.id
       WHERE a.id = ? AND a.email_id = ?`,
      [attId, emailId]
    );

    if (!attachment) {
      return res.status(404).json({ error: 'Ek bulunamadı' });
    }

    res.set({
      'Content-Type': attachment.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attachment.filename || 'ek'}"`,
      'Content-Length': attachment.content ? attachment.content.length : 0,
    });

    res.send(attachment.content);
  } catch (err) {
    console.error('Ek indirme hatası:', err);
    res.status(500).json({ error: 'Ek indirilemedi' });
  }
});

module.exports = router;
