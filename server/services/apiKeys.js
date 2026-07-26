const crypto = require('crypto');

const VALID_SCOPES = new Set(['addresses:read', 'addresses:write', 'emails:read', 'emails:delete', 'bulk:write', 'webhooks:manage']);

function parseScopes(value) {
  try { return JSON.parse(value || '[]'); } catch (_) { return []; }
}

function normalizeScopes(scopes, isMaster = false) {
  if (isMaster) return ['*'];
  return [...new Set((Array.isArray(scopes) ? scopes : []).filter((scope) => VALID_SCOPES.has(scope)))];
}

function createApiKey(db, { userId, name, scopes, rateLimitPerMinute = 120, isMaster = false }) {
  const token = `tm_${isMaster ? 'master_' : ''}${crypto.randomBytes(24).toString('base64url')}`;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const keyPrefix = token.slice(0, Math.min(14, token.length));
  const normalizedScopes = normalizeScopes(scopes, isMaster);
  const normalizedRate = Math.min(Math.max(Number.parseInt(rateLimitPerMinute, 10) || 120, 10), isMaster ? 10000 : 1000);
  const created = db.run(`INSERT INTO api_keys (user_id, name, key_prefix, key_hash, scopes, key_type, is_active, rate_limit_per_minute)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)`, [userId, name, keyPrefix, hash, JSON.stringify(normalizedScopes), isMaster ? 'master' : 'standard', normalizedRate]);
  return {
    id: created.lastInsertRowid,
    name,
    key_prefix: keyPrefix,
    scopes: normalizedScopes,
    key_type: isMaster ? 'master' : 'standard',
    is_active: true,
    rate_limit_per_minute: normalizedRate,
    secret: token,
  };
}

function listApiKeys(db, userId = null) {
  const where = userId ? 'WHERE k.user_id = ?' : '';
  const params = userId ? [userId] : [];
  return db.all(`SELECT k.id, k.user_id, k.name, k.key_prefix, k.scopes, k.key_type, k.is_active,
      k.rate_limit_per_minute, k.usage_count, k.last_used_at, k.last_used_ip, k.expires_at, k.revoked_at, k.created_at,
      u.username AS owner_username
    FROM api_keys k JOIN users u ON u.id = k.user_id ${where} ORDER BY k.id DESC`, params)
    .map((key) => ({ ...key, scopes: parseScopes(key.scopes), is_active: !!key.is_active }));
}

module.exports = { VALID_SCOPES, normalizeScopes, createApiKey, listApiKeys };
