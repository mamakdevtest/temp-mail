const crypto = require('crypto');
const { getDb } = require('../db');

const keyBuckets = new Map();

function getRawApiKey(req) {
  const explicit = String(req.headers['x-api-key'] || '').trim();
  if (explicit) return explicit;
  const authorization = String(req.headers.authorization || '');
  return authorization.startsWith('Bearer tm_') ? authorization.slice('Bearer '.length).trim() : '';
}

function getApiKeyPrincipal(req) {
  const token = getRawApiKey(req);
  if (!token || !token.startsWith('tm_')) return null;
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const db = getDb();
    const key = db.get(`SELECT k.id, k.user_id, k.scopes, k.key_type, k.is_active AS key_is_active,
      k.rate_limit_per_minute, u.id, u.username, u.role, u.package_name, u.is_active
      FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.key_hash = ? AND k.is_active = 1 AND k.revoked_at IS NULL AND (k.expires_at IS NULL OR k.expires_at > CURRENT_TIMESTAMP)`, [hash]);
    if (!key || !key.is_active || !key.key_is_active) return null;
    let scopes = [];
    try { scopes = JSON.parse(key.scopes || '[]'); } catch (_) { /* boş */ }
    const isMaster = key.key_type === 'master' && key.role === 'admin';
    return { id: key.user_id, username: key.username, role: key.role, package_name: key.package_name, api_key_id: key.id, api_key_scopes: scopes, api_key_rate_limit: key.rate_limit_per_minute || 120, is_master_key: isMaster };
  } catch (_) { return null; }
}

function hasApiScope(req, scope) {
  return !req.apiKey || req.apiKey.is_master_key || req.apiKey.api_key_scopes.includes('*') || req.apiKey.api_key_scopes.includes(scope);
}

function requireApiScope(scope) {
  return (req, res, next) => hasApiScope(req, scope)
    ? next()
    : res.status(403).json({ error: 'forbidden', message: `Bu API anahtarında ${scope} izni yok` });
}

function enforceApiKeyRate(req, res, next) {
  if (!req.apiKey) return next();
  const now = Date.now();
  const key = String(req.apiKey.api_key_id);
  const existing = keyBuckets.get(key);
  const state = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : existing;
  state.count += 1;
  keyBuckets.set(key, state);
  if (state.count > req.apiKey.api_key_rate_limit) {
    res.set('Retry-After', String(Math.ceil((state.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'rate_limited', message: 'API anahtarı rate limitine ulaştı' });
  }
  const db = getDb();
  db.run('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, last_used_ip = ?, usage_count = COALESCE(usage_count, 0) + 1 WHERE id = ?', [req.ip || req.socket.remoteAddress || null, req.apiKey.api_key_id]);
  return next();
}

module.exports = { getRawApiKey, getApiKeyPrincipal, hasApiScope, requireApiScope, enforceApiKeyRate };
