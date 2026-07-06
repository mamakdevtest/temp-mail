const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { getDb } = require('../db');

/**
 * SMTP sunucusunu başlatır
 * Port 25'te gelen mailleri dinler ve veritabanına kaydeder
 * Hem geçici hem kalıcı (şifreli) adresleri destekler
 *
 * @param {number} port - SMTP port numarası
 * @param {import('socket.io').Server} io - Socket.io instance (yeni mail bildirimi için)
 */
function startSmtpServer(port = 25, io = null) {
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['AUTH'],

    onData(stream, session, callback) {
      let mailData = '';

      stream.on('data', (chunk) => {
        mailData += chunk.toString();
      });

      stream.on('end', async () => {
        try {
          await processIncomingMail(mailData, session, io);
          callback();
        } catch (err) {
          console.error('Mail işleme hatası:', err.message);
          callback(new Error('Mail işlenemedi'));
        }
      });

      stream.on('error', (err) => {
        console.error('Stream hatası:', err.message);
        callback(err);
      });
    },

    // RCPT TO: hem geçici hem kalıcı adresleri kabul et
    onRcptTo(address, session, callback) {
      const recipient = address.address.toLowerCase();
      const db = getDb();

      const existing = db.get(
        `SELECT a.id FROM addresses a
         JOIN domains d ON a.domain_id = d.id
         WHERE a.address = ? AND d.is_active = 1`,
        [recipient]
      );

      if (!existing) {
        console.log(`Reddedilen adres: ${recipient} (veritabanında bulunamadı)`);
        return callback(new Error('Bu adrese mail kabul edilmiyor'));
      }

      callback();
    },

    logger: false,
    size: 10 * 1024 * 1024,
  });

  server.on('error', (err) => {
    console.error('SMTP sunucu hatası:', err.message);
  });

  server.listen(port, () => {
    console.log(`📧 SMTP sunucusu port ${port} üzerinde dinleniyor`);
  });

  return server;
}

/**
 * Gelen maili parse edip veritabanına kaydeder
 * Kayıt sonrası Socket.io ile istemcilere bildirim gönderir
 */
async function processIncomingMail(rawMail, session, io) {
  const parsed = await simpleParser(rawMail);
  const db = getDb();

  const recipients = session.envelope.rcptTo.map((r) => r.address.toLowerCase());

  for (const recipient of recipients) {
    // Adresi bul (süresiz - tüm adresler kabul edilir)
    const address = db.get(
      `SELECT a.id FROM addresses a
       JOIN domains d ON a.domain_id = d.id
       WHERE a.address = ? AND d.is_active = 1`,
      [recipient]
    );

    if (!address) continue;

    const sender = parsed.from?.text || parsed.from?.value?.[0]?.address || 'bilinmeyen';
    const subject = parsed.subject || '(Konu yok)';
    const bodyText = parsed.text || '';
    const bodyHtml = parsed.html || '';
    const hasAttachments = parsed.attachments && parsed.attachments.length > 0 ? 1 : 0;

    const result = db.run(
      `INSERT INTO emails (address_id, sender, subject, body_text, body_html, has_attachments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [address.id, sender, subject, bodyText, bodyHtml, hasAttachments]
    );

    const emailId = result.lastInsertRowid;

    // Ekleri kaydet
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        db.run(
          `INSERT INTO attachments (email_id, filename, content_type, content, size)
           VALUES (?, ?, ?, ?, ?)`,
          [emailId, att.filename || 'ek', att.contentType || 'application/octet-stream', att.content, att.size || 0]
        );
      }
    }

    // Socket.io ile istemcilere bildirim gönder
    const otpCode = extractOtp(bodyText || stripHtml(bodyHtml));

    if (io) {
      const emailPayload = {
        id: emailId,
        sender,
        subject,
        received_at: new Date().toISOString(),
        has_attachments: hasAttachments === 1,
        otp_code: otpCode,
      };
      const room = `inbox:${recipient}`;
      io.to(room).emit('new-email', emailPayload);
    }

    // Webhook tetikle (WEBHOOK_URL tanımlıysa)
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      const payload = {
        event: 'new_email',
        address: recipient,
        sender,
        subject,
        otp_code: otpCode,
        has_attachments: hasAttachments === 1,
        received_at: new Date().toISOString(),
        email_id: emailId,
      };
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((e) => console.warn('Webhook hatası:', e.message));
    }

    console.log(`📩 ${sender} → ${recipient} (Konu: ${subject})${otpCode ? ` [OTP: ${otpCode}]` : ''}`);
  }
}

/**
 * Metin içeriğinden OTP/doğrulama kodunu çıkarmaya çalışır
 * Bağlam duyarlı (context-aware) algoritma
 */
function extractOtp(text) {
  if (!text) return null;

  // 1. OTP anahtar kelimesi yakınındaki kodları ara
  const ctx = text.match(/(?:code|otp|verification|passcode|token|kod|doğrulama|verify|confirm)[\s\S]{0,30}?\b(\d{4,8})\b/i);
  if (ctx?.[1]) return ctx[1];

  // 2. Ters yön
  const rev = text.match(/\b(\d{4,8})\b[\s\S]{0,20}?(?:code|otp|verification|passcode|token|kod|doğrulama)/i);
  if (rev?.[1]) return rev[1];

  // 3. Fallback: yıl olmayan sayılar
  const all = [...text.matchAll(/\b(\d{4,8})\b/g)].map((m) => m[1]);
  if (!all.length) return null;
  const filtered = all.filter((n) => !(n.length === 4 && parseInt(n) >= 2000 && parseInt(n) <= 2099));
  return (filtered.length ? filtered : all).sort((a, b) => b.length - a.length)[0];
}

/**
 * HTML etiketlerini temizler (basit)
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { startSmtpServer, extractOtp };
