const assert = require('node:assert/strict');
const { initDatabase, getDb } = require('../server/db');
const { createApiKey } = require('../server/services/apiKeys');
const { getApiKeyPrincipal, getRawApiKey } = require('../server/middleware/apiKeyAuth');

async function run() {
  await initDatabase();
  const db = getDb();
  const admin = db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  assert.ok(admin, 'admin user is available');

  const standard = createApiKey(db, { userId: admin.id, name: 'key-system-test', scopes: ['addresses:read', 'emails:read'], rateLimitPerMinute: 77 });
  assert.match(standard.secret, /^tm_/);
  const standardPrincipal = getApiKeyPrincipal({ headers: { 'x-api-key': standard.secret } });
  assert.equal(standardPrincipal.api_key_rate_limit, 77);
  assert.deepEqual(standardPrincipal.api_key_scopes, ['addresses:read', 'emails:read']);
  assert.equal(getRawApiKey({ headers: { authorization: `Bearer ${standard.secret}` } }), standard.secret);

  const master = createApiKey(db, { userId: admin.id, name: 'master-system-test', isMaster: true });
  assert.match(master.secret, /^tm_master_/);
  const masterPrincipal = getApiKeyPrincipal({ headers: { authorization: `Bearer ${master.secret}` } });
  assert.equal(masterPrincipal.is_master_key, true);
  console.log('API key system: standard and master key checks passed');
}

run().catch((error) => { console.error(error); process.exit(1); });
