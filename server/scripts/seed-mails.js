/**
 * Test mail simülasyonu — mevcut adreslere 100 sahte mail inject eder.
 * Farklı provider'lardan (google, github, microsoft vb.) gönderir, OTP'li + normal karışık.
 * Kullanım: node server/scripts/seed-mails.js [address] [count]
 *   address verilmezse ilk anonim adresi bulur. count varsayılan 100.
 *
 * Backend DB'sine direkt INSERT yapar — SMTP bypass. provider_tag otomatik üretilir.
 */
const path = require('path');
const { getDb, initDatabase } = require('../db');

const PROVIDERS = [
  { domain: 'google.com', sender: 'no-reply@accounts.google.com', subjects: ['Güvenlik uyarısı', 'Yeni giriş algılandı', 'Hesap doğrulama'] },
  { domain: 'github.com', sender: 'noreply@github.com', subjects: ['Yeni cihaz girişi', 'İki faktörlü doğrulama kodu', 'Repository daveti'] },
  { domain: 'microsoft.com', sender: 'account-security-noreply@accountprotection.microsoft.com', subjects: ['Microsoft hesap kodu', 'Olağandışı aktivite', 'Parola sıfırlama'] },
  { domain: 'facebook.com', sender: 'login@facebookmail.com', subjects: ['Facebook giriş kodu', 'Yeni cihaz algılandı', 'Güvenlik kontrolü'] },
  { domain: 'amazon.com', sender: 'no-reply@amazon.com', subjects: ['Sipariş onayı', 'Kargo güncellemesi', 'Hesap doğrulama'] },
  { domain: 'netflix.com', sender: 'info@netflix.com', subjects: ['Yeni cihazta girişi', 'Ödeme hatası', 'Yeni içerik'] },
  { domain: 'linkedin.com', sender: 'messages-noreply@linkedin.com', subjects: ['Yeni bağlantı', 'Mesajın var', 'Profil görüntülendi'] },
  { domain: 'apple.com', sender: 'no_reply@email.apple.com', subjects: ['Apple Kimliği kodu', 'Yeni cihaz girişi', 'İki adımlı doğrulama'] },
  { domain: 'spotify.com', sender: 'no-reply@spotify.com', subjects: ['Premium aktif', 'Yeni çalma listesi', 'Giriş yapıldı'] },
  { domain: 'twitter.com', sender: 'noreply@twitter.com', subjects: ['Onay kodu', 'Yeni takipçi', 'Güvenlik uyarısı'] },
];

const OTP_TEMPLATES = [
  (code) => `Doğrulama kodunuz: ${code}. Bu kodu kimseyle paylaşmayın.`,
  (code) => `Your verification code is ${code}. Do not share it.`,
  (code) => `<div><p>Güvenlik kodu: <strong>${code}</strong></p><p>Bu kod 10 dakika geçerlidir.</p></div>`,
  (code) => `Hesabınız için tek kullanımlık şifreniz: ${code}`,
  (code) => `Login code: ${code}`,
];

function randInt(n) { return Math.floor(Math.random() * n); }
function randCode() { return String(100000 + randInt(900000)); }

function extractProviderTag(sender) {
  const m = String(sender || '').match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!m) return '';
  let domain = m[1].toLowerCase();
  const IGNORED = ['login', 'support', 'reply', 'email', 'no-reply', 'noreply', 'mailer', 'mail', 'notification', 'notify', 'notifications'];
  const parts = domain.split('.');
  while (parts.length > 2 && IGNORED.includes(parts[0])) parts.shift();
  return parts.join('.');
}

async function main() {
  const targetAddress = process.argv[2];
  const count = Math.min(Number(process.argv[3]) || 100, 500);

  await initDatabase();
  const db = getDb();

  let addr;
  if (targetAddress) {
    addr = db.get('SELECT id, address FROM addresses WHERE address = ?', [String(targetAddress).toLowerCase()]);
  }
  if (!addr) {
    addr = db.get('SELECT id, address FROM addresses ORDER BY id DESC LIMIT 1');
  }
  if (!addr) {
    console.error('Hata: Hedef adres bulunamadı. Önce bir adres oluşturun.');
    process.exit(1);
  }

  console.log(`Hedef adres: ${addr.address} — ${count} mail inject ediliyor...`);

  const now = Date.now();
  const { extractOtpFromEmail } = require('../utils/otpDetection');

  for (let i = 0; i < count; i++) {
    const provider = PROVIDERS[randInt(PROVIDERS.length)];
    const isOtp = Math.random() < 0.5;
    const code = randCode();
    const subject = provider.subjects[randInt(provider.subjects.length)] + (isOtp ? ` (${code})` : '');
    const tpl = OTP_TEMPLATES[randInt(OTP_TEMPLATES.length)];
    const body = isOtp ? tpl(code) : `Bu bir test mailidir. Provider: ${provider.domain}. Konu: ${subject}`;
    const bodyHtml = body.includes('<div>') ? body : `<div><p>${body}</p></div>`;
    const receivedAt = new Date(now - (count - i) * 60000).toISOString();
    const providerTag = extractProviderTag(provider.sender);
    const otpCode = isOtp ? (extractOtpFromEmail(subject, body, bodyHtml) || code) : '';

    db.run(
      `INSERT INTO emails (address_id, sender, subject, body_text, body_html, has_attachments, otp_code, provider_tag, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [addr.id, provider.sender, subject, body, bodyHtml, 0, otpCode, providerTag, receivedAt]
    );
  }

  console.log(`✓ ${count} mail inject edildi. Provider tag'ler eklendi.`);
  console.log(`  Inbox'ı yenilemek için uygulama içinde Yenile butonuna basın.`);
  process.exit(0);
}

main().catch((e) => { console.error('Seed hatası:', e); process.exit(1); });
