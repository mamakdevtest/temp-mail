const cron = require('node-cron');
const { getDb } = require('../db');

/**
 * Süresi dolan adresleri ve ilişkili mailleri temizler
 * Her 5 dakikada bir çalışır
 */
function startCleanupJob() {
  cron.schedule('*/5 * * * *', () => {
    cleanupExpiredAddresses();
  });

  console.log('🧹 Temizlik servisi başlatıldı (her 5 dakikada bir)');
}

/**
 * Süresi dolan adresleri siler
 */
function cleanupExpiredAddresses() {
  try {
    const db = getDb();

    const row = db.get(
      "SELECT COUNT(*) as count FROM addresses WHERE expires_at < datetime('now')"
    );

    if (!row || row.count === 0) return;

    const result = db.run(
      "DELETE FROM addresses WHERE expires_at < datetime('now')"
    );

    console.log(`🧹 ${result.changes} süresi dolan adres temizlendi`);
  } catch (err) {
    console.error('Temizlik hatası:', err.message);
  }
}

/**
 * Manuel temizleme tetikleme (admin API için)
 * @returns {number} - Silinen adres sayısı
 */
function manualCleanup() {
  const db = getDb();

  const row = db.get(
    "SELECT COUNT(*) as count FROM addresses WHERE expires_at < datetime('now')"
  );

  if (!row || row.count === 0) return 0;

  const result = db.run(
    "DELETE FROM addresses WHERE expires_at < datetime('now')"
  );

  return result.changes;
}

module.exports = { startCleanupJob, manualCleanup };
