const crypto = require('crypto');
const { getDb } = require('../db');

function getApiKeyPrincipal(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer tm_')) return null;
  try {
    const token = header.slice('Bearer '.length);
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const db = getDb();
    const key = db.get(`SELECT k.id, k.user_id, k.scopes, u.id, u.username, u.role, u.package_name, u.is_active
      FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.key_hash = ? AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > CURRENT_TIMESTAMP)`, [hash]);
    if (!key || !key.is_active) return null;
    db.run('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?', [key.id]);
    let scopes = [];
    try { scopes = JSON.parse(key.scopes || '[]'); } catch (_) { /* boş */ }
    return { id: key.user_id, username: key.username, role: key.role, package_name: key.package_name, api_key_id: key.id, api_key_scopes: scopes };
  } catch (_) { return null; }
}

function hasApiScope(req, scope) {
  return !req.apiKey || req.apiKey.api_key_scopes.includes(scope);
}

module.exports = { getApiKeyPrincipal, hasApiScope };
