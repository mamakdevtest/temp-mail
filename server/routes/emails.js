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
 * Metin içeriğinden OTP/doğrulama kodunu çıkarmaya çalışır
 * Bağlam duyarlı (context-aware) algoritma kullanır
 *
 * @param {string} text - Aranacak metin
 * @returns {string|null} - Bulunan OTP kodu veya null
 */
function extractOtp(text) {
  if (!text) return null;

  // 1. Öncelik: OTP/verification anahtar kelimesi yakınındaki kodları ara
  const contextPattern = /(?:code|otp|verification|passcode|token|kod|doğrulama|verify|confirm)[\s\S]{0,30}?\b(\d{4,8})\b/i;
  const contextMatch = text.match(contextPattern);
  if (contextMatch && contextMatch[1]) {
    return contextMatch[1];
  }

  // 2. Ters yön: kod anahtar kelimeden önce gelebilir
  const reversePattern = /\b(\d{4,8})\b[\s\S]{0,20}?(?:code|otp|verification|passcode|token|kod|doğrulama)/i;
  const reverseMatch = text.match(reversePattern);
  if (reverseMatch && reverseMatch[1]) {
    return reverseMatch[1];
  }

  // 3. Fallback: yıl olmayan 4-8 haneli sayıları ara
  const allNumbers = [...text.matchAll(/\b(\d{4,8})\b/g)].map((m) => m[1]);
  if (allNumbers.length === 0) return null;

  // Yıl benzeri sayıları filtrele (2000-2099 arası)
  const filtered = allNumbers.filter((n) => {
    const num = parseInt(n, 10);
    return !(n.length === 4 && num >= 2000 && num <= 2099);
  });

  // Eğer filtrelenmiş sonuç varsa en uzununu al, yoksa ilk bulunanı
  const candidates = filtered.length > 0 ? filtered : allNumbers;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

/**
 * HTML etiketlerini temizler
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
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
       WHERE a.address = ?`,
      [from.toLowerCase()]
    );

    if (!senderAddr) {
      return res.status(403).json({ error: 'Bu adres sistemde bulunamadı' });
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
 * Tek bir mailin detayını getirir (HTML, düz metin, ekler, OTP)
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

    // OTP algılama: body_text veya body_html'den 4-8 haneli kodu tara
    const otpSource = email.body_text || stripHtml(email.body_html);
    const otp_code = extractOtp(otpSource);

    res.json({
      id: email.id,
      sender: email.sender,
      subject: email.subject,
      body_text: email.body_text,
      body_html: email.body_html,
      received_at: email.received_at,
      has_attachments: email.has_attachments === 1,
      attachments,
      otp_code,
    });
  } catch (err) {
    console.error('Mail detay hatası:', err);
    res.status(500).json({ error: 'Mail detayı alınamadı' });
  }
});

/**
 * DELETE /api/emails/:id
 * Tek bir maili siler
 */
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const emailId = req.params.id;

    // Mail var mı kontrol et
    const email = db.get('SELECT id FROM emails WHERE id = ?', [emailId]);
    if (!email) {
      return res.status(404).json({ error: 'Mail bulunamadı' });
    }

    // Önce ekleri sil, sonra maili sil
    db.run('DELETE FROM attachments WHERE email_id = ?', [emailId]);
    db.run('DELETE FROM emails WHERE id = ?', [emailId]);

    res.json({ message: 'Mail silindi', id: parseInt(emailId) });
  } catch (err) {
    console.error('Mail silme hatası:', err);
    res.status(500).json({ error: 'Mail silinemedi' });
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
module.exports.extractOtp = extractOtp;
module.exports.stripHtml = stripHtml;
