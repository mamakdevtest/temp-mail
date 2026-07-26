const { authMiddleware } = require('../routes/auth');
const { getRawApiKey, getApiKeyPrincipal, enforceApiKeyRate } = require('./apiKeyAuth');

// Guest-public yüzeyler: kayıtsız kullanıcı temp-mail akışını buradan yürütür.
// Adres sahipliği bu katmanda değil, route içinde (user_id / adres-erişim token'ı) denetlenir.
const PUBLIC_RULES = [
  { method: 'GET', pattern: /^\/health$/ },
  // Admin paneli x-admin-password header'ıyla çalışır; parola doğrulaması adminAuth'ta.
  { method: 'ALL', pattern: /^\/admin(?:\/|$)/ },
  { method: 'POST', pattern: /^\/auth\/login$/ },
  { method: 'POST', pattern: /^\/auth\/register$/ },
  { method: 'GET', pattern: /^\/addresses\/domains$/ },
  { method: 'POST', pattern: /^\/addresses$/ },
  { method: 'POST', pattern: /^\/addresses\/random$/ },
  { method: 'POST', pattern: /^\/addresses\/check$/ },
  { method: 'POST', pattern: /^\/addresses\/login$/ },
  { method: 'POST', pattern: /^\/addresses\/set-password$/ },
  { method: 'GET', pattern: /^\/addresses\/(?!bulk(?:\/|$))[^/]+$/ }, // :address detay (erişim route içinde denetlenir)
  { method: 'GET', pattern: /^\/emails\/send\/status$/ },
  { method: 'GET', pattern: /^\/emails\/single\/\d+$/ },
  { method: 'DELETE', pattern: /^\/emails\/\d+$/ },
  { method: 'GET', pattern: /^\/emails\/\d+\/attachments\/\d+$/ },
  { method: 'GET', pattern: /^\/emails\/[^/]+$/ }, // :address ve :address/stream
];

function isPublic(req) {
  return PUBLIC_RULES.some((rule) => (rule.method === 'ALL' || rule.method === req.method) && rule.pattern.test(req.path));
}

// Public yüzeyde JWT gelirse kimliği yumuşak şekilde çöz (sahipli mailbox erişimi için);
// token yoksa ya da geçersizse istek anonim devam eder (erişim route içinde denetlenir).
function softAttachUser(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ') || header.startsWith('Bearer tm_')) return;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'tempmail-secret-key-change-in-production');
    if (decoded.session_id) {
      const { getDb } = require('../db');
      const session = getDb().get(
        'SELECT id, revoked_at FROM user_sessions WHERE session_id = ? AND user_id = ?',
        [decoded.session_id, decoded.id]
      );
      if (!session || session.revoked_at) return;
    }
    req.user = decoded;
  } catch (_) { /* anonim devam */ }
}

function requireApiAccess(req, res, next) {
  if (isPublic(req)) { softAttachUser(req); return next(); }

  const rawKey = getRawApiKey(req);
  const principal = getApiKeyPrincipal(req);
  if (principal) {
    req.user = principal;
    req.apiKey = principal;
    return enforceApiKeyRate(req, res, next);
  }
  if (rawKey) return res.status(401).json({ error: 'unauthorized', message: 'Geçersiz, pasif veya süresi dolmuş API key' });

  // Public olmayan her şey: tm_ key veya giriş yapmış oturum gerekir.
  return authMiddleware(req, res, next);
}

module.exports = { requireApiAccess, isPublic };
