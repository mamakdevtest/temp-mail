const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// SQLite veritabanı dosyası yolu
const DB_PATH = path.join(__dirname, '..', 'data', 'tempmail.db');

// data klasörünü oluştur (yoksa)
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

/**
 * Veritabanını başlatır (async - sql.js WebAssembly yükler)
 * Uygulama başlamadan önce çağrılmalı
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // Eğer dosya varsa yükle, yoksa yeni oluştur
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Yabancı anahtar desteğini aktifleştir
  db.run('PRAGMA foreign_keys = ON;');

  // Tabloları oluştur
  db.run(`
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      domain_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      subject TEXT,
      body_text TEXT,
      body_html TEXT,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      has_attachments INTEGER DEFAULT 0,
      FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_id INTEGER NOT NULL,
      filename TEXT,
      content_type TEXT,
      content BLOB,
      size INTEGER,
      FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
    );
  `);

  // İndeksler
  db.run('CREATE INDEX IF NOT EXISTS idx_addresses_address ON addresses(address);');
  db.run('CREATE INDEX IF NOT EXISTS idx_addresses_expires ON addresses(expires_at);');
  db.run('CREATE INDEX IF NOT EXISTS idx_emails_address_id ON emails(address_id);');
  db.run('CREATE INDEX IF NOT EXISTS idx_attachments_email_id ON attachments(email_id);');

  // İlk kaydetme
  saveDatabase();

  console.log('📦 SQLite veritabanı başlatıldı');
  return getDb();
}

/**
 * Veritabanını diske kaydeder
 */
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Wrapper: Tek satır döndürür (better-sqlite3 .get() uyumlu)
 * @param {string} sql - SQL sorgusu
 * @param {Array} params - Parametreler
 * @returns {Object|null} - İlk satır veya null
 */
function get(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

/**
 * Wrapper: Tüm satırları döndürür (better-sqlite3 .all() uyumlu)
 * @param {string} sql - SQL sorgusu
 * @param {Array} params - Parametreler
 * @returns {Array} - Satır dizisi
 */
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Wrapper: INSERT/UPDATE/DELETE çalıştırır (better-sqlite3 .run() uyumlu)
 * @param {string} sql - SQL sorgusu
 * @param {Array} params - Parametreler
 * @returns {{ changes: number, lastInsertRowid: number }}
 */
function run(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const lastId = get('SELECT last_insert_rowid() as id');
  saveDatabase(); // Değişiklikten sonra diske yaz
  return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
}

/**
 * Wrapper: Birden fazla SQL çalıştırır
 * @param {string} sql - SQL sorguları
 */
function exec(sql) {
  db.run(sql);
  saveDatabase();
}

/**
 * Wrapper nesneyi döndürür (better-sqlite3 uyumlu arayüz)
 */
function getDb() {
  return {
    get,
    all,
    run,
    exec,
    saveDatabase,
  };
}

module.exports = { initDatabase, getDb, saveDatabase };
