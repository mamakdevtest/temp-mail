const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');
const { getDb } = require('../db');

/**
 * SMTP sunucusunu başlatır
 * Port 25'te gelen mailleri dinler ve veritabanına kaydeder
 * Hem geçici hem kalıcı (şifreli) adresleri destekler
 */
function startSmtpServer(port = 25) {
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
          await processIncomingMail(mailData, session);
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
         WHERE a.address = ? AND d.is_active = 1
         AND (a.expires_at > datetime('now') OR a.is_persistent = 1)`,
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
 */
async function processIncomingMail(rawMail, session) {
  const parsed = await simpleParser(rawMail);
  const db = getDb();

  const recipients = session.envelope.rcptTo.map((r) => r.address.toLowerCase());

  for (const recipient of recipients) {
    // Hem geçici hem kalıcı adresleri kabul et
    const address = db.get(
      `SELECT a.id FROM addresses a
       JOIN domains d ON a.domain_id = d.id
       WHERE a.address = ? AND d.is_active = 1
       AND (a.expires_at > datetime('now') OR a.is_persistent = 1)`,
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

    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        db.run(
          `INSERT INTO attachments (email_id, filename, content_type, content, size)
           VALUES (?, ?, ?, ?, ?)`,
          [emailId, att.filename || 'ek', att.contentType || 'application/octet-stream', att.content, att.size || 0]
        );
      }
    }

    console.log(`📩 Yeni mail kaydedildi: ${sender} → ${recipient} (Konu: ${subject})`);
  }
}

module.exports = { startSmtpServer };
