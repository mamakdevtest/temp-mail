/*
 * Mevcut tempmail.db dosyasını değiştirmeden uyumluluğunu doğrular.
 * Kullanım: node scripts/verify-db-copy.js [sourceDb] [copyDb]
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const source = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'tempmail.db'));
const target = path.resolve(process.argv[3] || path.join(path.dirname(source), `tempmail-next-${Date.now()}.db`));

function rows(db, sql) {
  const result = db.exec(sql);
  return result[0]?.values || [];
}

async function main() {
  if (!fs.existsSync(source)) throw new Error(`Kaynak DB bulunamadı: ${source}`);
  fs.copyFileSync(source, target);
  const SQL = await initSqlJs();
  const sourceDb = new SQL.Database(fs.readFileSync(source));
  const copyDb = new SQL.Database(fs.readFileSync(target));
  const tables = rows(sourceDb, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(([name]) => name);
  const comparison = tables.map((table) => {
    const sourceCount = rows(sourceDb, `SELECT COUNT(*) FROM \"${table}\"`)[0][0];
    const copyCount = rows(copyDb, `SELECT COUNT(*) FROM \"${table}\"`)[0][0];
    return { table, source: sourceCount, copy: copyCount, equal: sourceCount === copyCount };
  });
  const attachmentBytes = rows(sourceDb, 'SELECT COALESCE(SUM(size), 0) FROM attachments')[0]?.[0] || 0;
  const integrity = rows(copyDb, 'PRAGMA integrity_check')[0]?.[0] || 'unknown';
  const report = { source, target, integrity, attachment_bytes: attachmentBytes, tables: comparison, valid: integrity === 'ok' && comparison.every((entry) => entry.equal) };
  console.log(JSON.stringify(report, null, 2));
  sourceDb.close();
  copyDb.close();
  if (!report.valid) process.exitCode = 1;
}

main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
