const express = require('express');
const nodemailer = require('nodemailer');
const { getDb } = require('../db');
const { extractOtpFromEmail } = require('../utils/otpDetection');
const { emailEvents, waitForEmail } = require('../services/emailEvents');
const { rateLimit } = require('../middleware/apiContract');

const router = express.Router();

function createTransporter() {
  const host = process.env.SMTP_RELAY_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number.parseInt(process.env.SMTP_RELAY_PORT || '587', 10),
    secure: process.env.SMTP_RELAY_SECURE === 'true',
    auth: { user: process.env.SMTP_RELAY_USER, pass: process.env.SMTP_RELAY_PASS },
  });
}

function decodedAddress(value) {
  try { return decodeURIComponent(value).trim().toLowerCase(); } catch { return null; }
}

function parseListQuery(query) {
  const rawLimit = Number.parseInt(query.limit || '50', 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const order = String(query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const wait = Math.min(Math.max(Number.parseInt(query.wait || '0', 10) || 0, 0), 30);
  return { limit, order, wait, afterId: query.after_id ? Number.parseInt(query.after_id, 10) : null, since: query.since || null };
}

function listEmails(db, addressId, options) {
  const where = ['address_id = ?'];
  const params = [addressId];
  if (Number.isInteger(options.afterId) && options.afterId > 0) { where.push('id > ?'); params.push(options.afterId); }
  if (options.since && !Number.isNaN(Date.parse(options.since))) { where.push('received_at > ?'); params.push(new Date(options.since).toISOString()); }
  params.push(options.limit);
  return db.all(`SELECT id, sender, subject, body_text, body_html, received_at, has_attachments, otp_code
    FROM emails WHERE ${where.join(' AND ')} ORDER BY received_at ${options.order}, id ${options.order} LIMIT ?`, params)
    .map((mail) => ({
      id: mail.id,
      sender: mail.sender,
      subject: mail.subject,
      received_at: mail.received_at,
      has_attachments: !!mail.has_attachments,
      otp_code: mail.otp_code || extractOtpFromEmail(mail.subject, mail.body_text, mail.body_html) || '',
    }));
}

async function resolveMailbox(req, res) {
  const address = decodedAddress(req.params.address);
  if (!address) { res.status(400).json({ error: 'invalid_request', message: 'Geçersiz adres' }); return null; }
  const db = getDb();
  const mailbox = db.get('SELECT id FROM addresses WHERE address = ?', [address]);
  if (!mailbox) { res.status(404).json({ error: 'not_found', message: 'Adres bulunamadı' }); return null; }
  return { db, address, mailbox };
}

router.get('/:address/stream', rateLimit({ max: 200, key: 'email-stream' }), async (req, res) => {
  const context = await resolveMailbox(req, res);
  if (!context) return;
  res.locals.skipApiEnvelope = true;
  res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  const channel = `email:${context.address}`;
  const send = (email) => res.write(`id: ${email.id}\ndata: ${JSON.stringify({ success: true, data: email })}\n\n`);
  const lastEventId = Number.parseInt(req.get('Last-Event-ID') || '', 10);
  if (Number.isInteger(lastEventId) && lastEventId > 0) {
    const missed = context.db.all(`SELECT id, sender, subject, body_text, body_html, received_at, has_attachments, otp_code
      FROM emails WHERE address_id = ? AND id > ? ORDER BY id ASC`, [context.mailbox.id, lastEventId]);
    missed.forEach((mail) => send({
      id: mail.id,
      sender: mail.sender,
      subject: mail.subject,
      received_at: mail.received_at,
      has_attachments: !!mail.has_attachments,
      otp_code: mail.otp_code || extractOtpFromEmail(mail.subject, mail.body_text, mail.body_html) || '',
    }));
  }
  const onEmail = (email) => send(email);
  emailEvents.on(channel, onEmail);
  res.write(': connected\n\n');
  req.on('close', () => emailEvents.removeListener(channel, onEmail));
});

router.get('/:address', rateLimit({ max: 200, key: 'email-list' }), async (req, res) => {
  try {
    const context = await resolveMailbox(req, res);
    if (!context) return;
    const options = parseListQuery(req.query);
    let emails = listEmails(context.db, context.mailbox.id, options);
    if (!emails.length && options.wait > 0) {
      await waitForEmail(context.address, options.wait * 1000);
      emails = listEmails(context.db, context.mailbox.id, options);
    }
    res.json({ address: context.address, emails, pagination: { limit: options.limit, order: options.order.toLowerCase() } });
  } catch (err) {
    console.error('Mail listeleme hatası:', err);
    res.status(500).json({ error: 'internal_error', message: 'Mailler listelenemedi' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { from, to, subject, body } = req.body || {};
    if (!from || !to || !subject || !body) return res.status(400).json({ error: 'invalid_request', message: 'Gönderen, alıcı, konu ve içerik gerekli' });
    const db = getDb();
    if (!db.get('SELECT id FROM addresses WHERE address = ?', [String(from).toLowerCase()])) return res.status(403).json({ error: 'not_found', message: 'Bu adres sistemde bulunamadı' });
    const transporter = createTransporter();
    if (!transporter) return res.status(503).json({ error: 'relay_unavailable', message: 'Mail gönderme yapılandırılmamış' });
    const info = await transporter.sendMail({ from, to, subject, text: body, html: String(body).replace(/\n/g, '<br>') });
    res.json({ message: 'Mail gönderildi', messageId: info.messageId });
  } catch (err) {
    console.error('Mail gönderme hatası:', err);
    res.status(500).json({ error: 'internal_error', message: `Mail gönderilemedi: ${err.message}` });
  }
});

router.get('/send/status', (req, res) => res.json({ configured: !!process.env.SMTP_RELAY_HOST, host: process.env.SMTP_RELAY_HOST || null, port: process.env.SMTP_RELAY_PORT || '587' }));

router.get('/single/:id', rateLimit({ max: 200, key: 'email-detail' }), (req, res) => {
  try {
    const db = getDb();
    const email = db.get('SELECT e.*, a.address FROM emails e JOIN addresses a ON e.address_id = a.id WHERE e.id = ?', [req.params.id]);
    if (!email) return res.status(404).json({ error: 'not_found', message: 'Mail bulunamadı' });
    const attachments = db.all('SELECT id, filename, content_type, size FROM attachments WHERE email_id = ?', [email.id]);
    res.json({ ...email, has_attachments: !!email.has_attachments, attachments, otp_code: email.otp_code || extractOtpFromEmail(email.subject, email.body_text, email.body_html) || '' });
  } catch (err) { res.status(500).json({ error: 'internal_error', message: 'Mail detayı alınamadı' }); }
});

router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const email = db.get('SELECT id FROM emails WHERE id = ?', [req.params.id]);
    if (!email) return res.status(404).json({ error: 'not_found', message: 'Mail bulunamadı' });
    db.run('DELETE FROM attachments WHERE email_id = ?', [email.id]);
    db.run('DELETE FROM emails WHERE id = ?', [email.id]);
    res.json({ id: email.id });
  } catch (err) { res.status(500).json({ error: 'internal_error', message: 'Mail silinemedi' }); }
});

router.get('/:emailId/attachments/:attId', (req, res) => {
  try {
    const db = getDb();
    const attachment = db.get('SELECT * FROM attachments WHERE id = ? AND email_id = ?', [req.params.attId, req.params.emailId]);
    if (!attachment) return res.status(404).json({ error: 'not_found', message: 'Ek bulunamadı' });
    res.locals.skipApiEnvelope = true;
    res.set({ 'Content-Type': attachment.content_type || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${attachment.filename || 'ek'}"`, 'Content-Length': attachment.content?.length || 0 });
    res.send(attachment.content);
  } catch (err) { res.status(500).json({ error: 'internal_error', message: 'Ek indirilemedi' }); }
});

module.exports = router;
