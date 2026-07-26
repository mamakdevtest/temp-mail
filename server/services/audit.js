const { getDb } = require('../db');

function writeAudit(req, { action, entityType, entityId = null, actorUserId = null, metadata = {} }) {
  try {
    const db = getDb();
    db.run(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata_json, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actorUserId ?? req?.user?.id ?? null,
        action,
        entityType,
        entityId === null ? null : String(entityId),
        JSON.stringify(metadata),
        req?.ip || req?.socket?.remoteAddress || null,
      ]
    );
  } catch (error) {
    // Audit kaydı operasyonu kesintiye uğratmamalıdır.
    console.warn('Audit kaydı yazılamadı:', error.message);
  }
}

module.exports = { writeAudit };
