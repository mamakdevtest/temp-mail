const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('./auth');
const { writeAudit } = require('../services/audit');
const { getApiKeyPrincipal, hasApiScope } = require('../middleware/apiKeyAuth');
const { createApiKey, listApiKeys, VALID_SCOPES } = require('../services/apiKeys');

const router = express.Router();
router.use((req, res, next) => {
  const principal = getApiKeyPrincipal(req);
  if (principal) { req.user = principal; req.apiKey = principal; return next(); }
  return authMiddleware(req, res, next);
});

function requireAutomationScope(req, res, next) {
  if (hasApiScope(req, 'webhooks:manage')) return next();
  return res.status(403).json({ error: 'forbidden', message: 'Bu API anahtarında webhooks:manage izni yok' });
}

const EVENTS = new Set(['email.received', 'otp.detected', 'address.expiring', 'bulk.completed']);
const SCOPES = VALID_SCOPES;

function parse(value, fallback) { try { return JSON.parse(value || ''); } catch (_) { return fallback; } }
router.get('/api-keys', requireAutomationScope, (req, res) => {
  try { res.json({ keys: listApiKeys(getDb(), req.user.id) }); }
  catch (_) { res.status(500).json({ error: 'internal_error', message: 'API anahtarları alınamadı' }); }
});

router.post('/api-keys', requireAutomationScope, (req, res) => {
  try {
    if (req.apiKey) return res.status(403).json({ error: 'forbidden', message: 'API anahtarıyla yeni anahtar oluşturulamaz; hesap oturumu kullanın' });
    const db = getDb();
    const name = String(req.body?.name || '').trim().slice(0, 60);
    const scopes = Array.isArray(req.body?.scopes) ? req.body.scopes.filter((scope) => SCOPES.has(scope)) : [];
    if (!name || !scopes.length) return res.status(400).json({ error: 'invalid_request', message: 'Anahtar adı ve en az bir geçerli scope gerekli' });
    const isMaster = req.body?.key_type === 'master';
    if (isMaster && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden', message: 'Master key yalnız admin hesabında oluşturulabilir' });
    const key = createApiKey(db, { userId: req.user.id, name, scopes, rateLimitPerMinute: req.body?.rate_limit_per_minute, isMaster });
    writeAudit(req, { action: `automation.api_key.create.${key.key_type}`, entityType: 'api_key', entityId: key.id, metadata: { name, scopes: key.scopes } });
    res.status(201).json({ key: { ...key, secret: undefined }, secret: key.secret });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'API anahtarı oluşturulamadı' }); }
});

router.delete('/api-keys/:id', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const key = db.get('SELECT id, name FROM api_keys WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!key) return res.status(404).json({ error: 'not_found', message: 'API anahtarı bulunamadı' });
    db.run('UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?', [key.id]);
    writeAudit(req, { action: 'automation.api_key.revoke', entityType: 'api_key', entityId: key.id, metadata: { name: key.name } });
    res.json({ id: key.id, revoked: true });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'API anahtarı iptal edilemedi' }); }
});

router.put('/api-keys/:id', requireAutomationScope, (req, res) => {
  try {
    if (req.apiKey) return res.status(403).json({ error: 'forbidden', message: 'API anahtarıyla anahtar ayarı değiştirilemez' });
    const db = getDb();
    const key = db.get('SELECT id FROM api_keys WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!key) return res.status(404).json({ error: 'not_found', message: 'API anahtarı bulunamadı' });
    const isActive = req.body?.is_active === undefined ? null : req.body.is_active ? 1 : 0;
    const maxRate = req.user.role === 'admin' ? 10000 : 1000;
    const rate = req.body?.rate_limit_per_minute === undefined ? null : Math.min(Math.max(Number.parseInt(req.body.rate_limit_per_minute, 10) || 120, 10), maxRate);
    db.run('UPDATE api_keys SET is_active = COALESCE(?, is_active), rate_limit_per_minute = COALESCE(?, rate_limit_per_minute) WHERE id = ?', [isActive, rate, key.id]);
    res.json({ id: key.id, updated: true });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'API anahtarı güncellenemedi' }); }
});

router.get('/webhooks', requireAutomationScope, (req, res) => {
  try {
    const hooks = getDb().all('SELECT id, name, url, events, is_active, created_at, updated_at FROM webhooks WHERE user_id = ? ORDER BY id DESC', [req.user.id])
      .map((hook) => ({ ...hook, events: parse(hook.events, []) }));
    res.json({ webhooks: hooks });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Webhooklar alınamadı' }); }
});

router.post('/webhooks', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const name = String(req.body?.name || '').trim().slice(0, 60);
    const url = String(req.body?.url || '').trim();
    const events = Array.isArray(req.body?.events) ? req.body.events.filter((event) => EVENTS.has(event)) : [];
    if (!name || !/^https:\/\//i.test(url) || !events.length) return res.status(400).json({ error: 'invalid_request', message: 'Ad, HTTPS URL ve en az bir olay gerekli' });
    const secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
    const created = db.run('INSERT INTO webhooks (user_id, name, url, secret, events) VALUES (?, ?, ?, ?, ?)', [req.user.id, name, url, secret, JSON.stringify(events)]);
    writeAudit(req, { action: 'automation.webhook.create', entityType: 'webhook', entityId: created.lastInsertRowid, metadata: { name, events } });
    res.status(201).json({ webhook: { id: created.lastInsertRowid, name, url, events, is_active: true }, secret });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Webhook oluşturulamadı' }); }
});

router.put('/webhooks/:id', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const hook = db.get('SELECT * FROM webhooks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!hook) return res.status(404).json({ error: 'not_found', message: 'Webhook bulunamadı' });
    const isActive = req.body?.is_active === undefined ? hook.is_active : req.body.is_active ? 1 : 0;
    db.run('UPDATE webhooks SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive, hook.id]);
    writeAudit(req, { action: `automation.webhook.${isActive ? 'enable' : 'disable'}`, entityType: 'webhook', entityId: hook.id });
    res.json({ id: hook.id, is_active: !!isActive });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Webhook güncellenemedi' }); }
});

router.delete('/webhooks/:id', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const hook = db.get('SELECT id, name FROM webhooks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!hook) return res.status(404).json({ error: 'not_found', message: 'Webhook bulunamadı' });
    db.run('DELETE FROM webhooks WHERE id = ?', [hook.id]);
    writeAudit(req, { action: 'automation.webhook.delete', entityType: 'webhook', entityId: hook.id, metadata: { name: hook.name } });
    res.json({ id: hook.id, deleted: true });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Webhook silinemedi' }); }
});

router.get('/webhooks/:id/deliveries', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const hook = db.get('SELECT id FROM webhooks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!hook) return res.status(404).json({ error: 'not_found', message: 'Webhook bulunamadı' });
    const deliveries = db.all('SELECT id, event_type, status, http_status, attempt_count, last_error, delivered_at, created_at FROM webhook_deliveries WHERE webhook_id = ? ORDER BY id DESC LIMIT 50', [hook.id]);
    res.json({ deliveries });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Teslimatlar alınamadı' }); }
});

router.get('/rules', requireAutomationScope, (req, res) => {
  try {
    const rules = getDb().all('SELECT * FROM automation_rules WHERE user_id = ? ORDER BY id DESC', [req.user.id]).map((rule) => ({
      ...rule,
      conditions: parse(rule.conditions_json, {}),
      actions: parse(rule.actions_json, []),
      is_active: !!rule.is_active,
    }));
    res.json({ rules });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Otomasyon kuralları alınamadı' }); }
});

router.post('/rules', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const eventType = String(req.body?.event_type || '');
    const conditions = req.body?.conditions && typeof req.body.conditions === 'object' ? req.body.conditions : {};
    const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
    if (!name || !EVENTS.has(eventType) || !actions.length) return res.status(400).json({ error: 'invalid_request', message: 'Ad, geçerli olay tipi ve en az bir aksiyon gerekli' });
    const created = db.run('INSERT INTO automation_rules (user_id, name, event_type, conditions_json, actions_json) VALUES (?, ?, ?, ?, ?)', [req.user.id, name, eventType, JSON.stringify(conditions), JSON.stringify(actions)]);
    writeAudit(req, { action: 'automation.rule.create', entityType: 'automation_rule', entityId: created.lastInsertRowid, metadata: { name, event_type: eventType } });
    res.status(201).json({ id: created.lastInsertRowid, name, event_type: eventType, conditions, actions, is_active: true });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Otomasyon kuralı oluşturulamadı' }); }
});

router.put('/rules/:id', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const rule = db.get('SELECT * FROM automation_rules WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rule) return res.status(404).json({ error: 'not_found', message: 'Otomasyon kuralı bulunamadı' });
    const isActive = req.body?.is_active === undefined ? rule.is_active : req.body.is_active ? 1 : 0;
    db.run('UPDATE automation_rules SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isActive, rule.id]);
    writeAudit(req, { action: `automation.rule.${isActive ? 'enable' : 'disable'}`, entityType: 'automation_rule', entityId: rule.id });
    res.json({ id: rule.id, is_active: !!isActive });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Otomasyon kuralı güncellenemedi' }); }
});

router.delete('/rules/:id', requireAutomationScope, (req, res) => {
  try {
    const db = getDb();
    const rule = db.get('SELECT id, name FROM automation_rules WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!rule) return res.status(404).json({ error: 'not_found', message: 'Otomasyon kuralı bulunamadı' });
    db.run('DELETE FROM automation_rules WHERE id = ?', [rule.id]);
    writeAudit(req, { action: 'automation.rule.delete', entityType: 'automation_rule', entityId: rule.id, metadata: { name: rule.name } });
    res.json({ id: rule.id, deleted: true });
  } catch (_) { res.status(500).json({ error: 'internal_error', message: 'Otomasyon kuralı silinemedi' }); }
});

module.exports = router;
