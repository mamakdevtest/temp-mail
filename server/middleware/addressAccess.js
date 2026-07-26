const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production';
const TOKEN_TTL = '30d';

/**
 * Adres-erişim token'ı üretir (şifreli adres sahibi için).
 * Claim: { type: 'address', addr: '<full address>' }
 */
function signAddressToken(address) {
  return jwt.sign({ type: 'address', addr: String(address).toLowerCase() }, SECRET, { expiresIn: TOKEN_TTL });
}

/**
 * İstekteki X-Address-Token header'ını doğrular; geçerli adresi döndürür, yoksa null.
 */
function verifyAddressToken(req) {
  const raw = String(req.headers['x-address-token'] || '').trim();
  if (!raw) return null;
  try {
    const decoded = jwt.verify(raw, SECRET);
    if (decoded?.type !== 'address' || !decoded.addr) return null;
    return String(decoded.addr).toLowerCase();
  } catch (_) {
    return null;
  }
}

/**
 * Mail yüzeyi için erişim kontrolü.
 * Kural:
 *  - adres sahibi kullanıcı (user_id eşleşmesi) veya admin → tamam
 *  - anonim adres (user_id null):
 *      - şifresiz → açık
 *      - şifreli → geçerli adres-erişim token'ı gerekir
 *  - aksi halde reddet
 * Döndürür: true (izinli) veya false (reddedildi, yanıt yazıldı).
 */
function canAccessMailbox(req, res, mailbox) {
  const user = req.user || null;
  if (user?.role === 'admin') return true;
  // Admin şifresiyle gelen panel istekleri de tam erişim (mail detayı/ek indirme).
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const provided = req.headers['x-admin-password'] || req.query.password;
  if (provided && provided === adminPassword) return true;
  if (mailbox.user_id != null) {
    if (user?.id && mailbox.user_id === user.id) return true;
    res.status(403).json({ error: 'forbidden', message: 'Bu mailbox için erişim yetkiniz yok' });
    return false;
  }
  // Anonim adres
  if (!mailbox.password_hash) return true;
  const tokenAddr = verifyAddressToken(req);
  if (tokenAddr && mailbox.address && tokenAddr === String(mailbox.address).toLowerCase()) return true;
  res.status(401).json({ error: 'address_password_required', message: 'Bu adres şifre korumalı' });
  return false;
}

module.exports = { signAddressToken, verifyAddressToken, canAccessMailbox };
