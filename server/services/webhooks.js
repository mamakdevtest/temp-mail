const crypto = require('crypto');
const { getDb } = require('../db');

function parseJson(value, fallback = []) {
  try { return JSON.parse(value || '[]'); } catch (_) { return fallback; }
}

function sign(secret, timestamp, payload) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${JSON.stringify(payload)}`).digest('hex');
}

async function deliver(webhook, eventType, payload) {
  const db = getDb();
  const created = db.run(
    'INSERT INTO webhook_deliveries (webhook_id, event_type, payload_json, status, attempt_count) VALUES (?, ?, ?, ?, 1)',
    [webhook.id, eventType, JSON.stringify(payload), 'pending']
  );
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TempMail-Event': eventType,
        'X-TempMail-Timestamp': timestamp,
        'X-TempMail-Signature': `sha256=${sign(webhook.secret, timestamp, payload)}`,
      },
      body: JSON.stringify({ event: eventType, data: payload }),
      signal: AbortSignal.timeout(8000),
    });
    db.run(
      'UPDATE webhook_deliveries SET status = ?, http_status = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ?',
      [response.ok ? 'delivered' : 'failed', response.status, created.lastInsertRowid]
    );
  } catch (error) {
    db.run('UPDATE webhook_deliveries SET status = ?, last_error = ? WHERE id = ?', ['failed', error.message, created.lastInsertRowid]);
  }
}

function dispatchUserEvent(userId, eventType, payload) {
  const db = getDb();
  const hooks = db.all('SELECT * FROM webhooks WHERE user_id = ? AND is_active = 1', [userId]);
  hooks
    .filter((hook) => parseJson(hook.events).includes(eventType))
    .forEach((hook) => { void deliver(hook, eventType, payload); });
}

module.exports = { dispatchUserEvent };
