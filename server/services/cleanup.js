const { getDb } = require('../db');

/**
 * Otomatik temizlik servisi
 * NOT: Adresler süresiz olduğu için otomatik temizlik devre dışıdır.
 * Sadece admin panelinden manuel tetiklenebilir.
 */
function startCleanupJob() {
  // Adresler süresiz - otomatik temizlik yok
  console.log('🧹 Temizlik servisi: Adresler süresiz, otomatik temizlik devre dışı');
}

/**
 * Manuel temizleme tetikleme (admin API için)
 * Sadece admin panelinden çağrılır
 * @param {string} type - Temizlik türü: 'all' (tüm adresler) veya 'expired' (süresi dolanlar)
 * @returns {number} - Silinen adres sayısı
 */
function manualCleanup(type = 'all') {
  const db = getDb();

  if (type === 'all') {
    // Tüm adresleri ve ilişkili mailleri sil
    const row = db.get('SELECT COUNT(*) as count FROM addresses');
    if (!row || row.count === 0) return 0;

    db.run('DELETE FROM attachments');
    db.run('DELETE FROM emails');
    const result = db.run('DELETE FROM addresses');
    return result.changes;
  }

  // Süresi dolan (gerçekte hiç olmayacak ama güvenlik için)
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
