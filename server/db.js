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

  // WAL modu: eşzamanlı yazma işlemlerinde kilitlenmeyi önler
  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA busy_timeout = 5000;');

  // Tabloları oluştur

  // Kullanıcılar tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'free' CHECK(role IN ('admin','pro','free')),
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
  `);

  // Paketler tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      max_addresses INTEGER DEFAULT 3,
      max_emails INTEGER DEFAULT 50,
      email_retention_days INTEGER DEFAULT 7,
      custom_domains INTEGER DEFAULT 0,
      webhook_support INTEGER DEFAULT 0,
      priority_support INTEGER DEFAULT 0,
      price_monthly REAL DEFAULT 0,
      features TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Pro yükseltme istekleri
  db.run(`
    CREATE TABLE IF NOT EXISTS package_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      requested_package TEXT NOT NULL DEFAULT 'pro',
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      server_ip TEXT DEFAULT '',
      a_host TEXT DEFAULT 'mail',
      a_value TEXT DEFAULT '',
      mx_host TEXT DEFAULT '@',
      mx_value TEXT DEFAULT '',
      mx_priority INTEGER DEFAULT 10,
      txt_spf_host TEXT DEFAULT '@',
      txt_spf_value TEXT DEFAULT '',
      txt_verification_host TEXT DEFAULT '@',
      txt_verification_value TEXT DEFAULT '',
      dkim_host TEXT DEFAULT 'default._domainkey',
      dkim_value TEXT DEFAULT '',
      dmarc_host TEXT DEFAULT '_dmarc',
      dmarc_value TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      domain_id INTEGER NOT NULL,
      user_id INTEGER,
      password_hash TEXT,
      is_persistent INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed DATETIME,
      FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

  // Migration: Eski DB'de yeni kolonlar yoksa ekle
  const migrations = [
    'ALTER TABLE addresses ADD COLUMN password_hash TEXT',
    'ALTER TABLE addresses ADD COLUMN is_persistent INTEGER DEFAULT 0',
    'ALTER TABLE addresses ADD COLUMN last_accessed DATETIME',
    'ALTER TABLE addresses ADD COLUMN user_id INTEGER',
    "ALTER TABLE domains ADD COLUMN server_ip TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN a_host TEXT DEFAULT 'mail'",
    "ALTER TABLE domains ADD COLUMN a_value TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN mx_host TEXT DEFAULT '@'",
    "ALTER TABLE domains ADD COLUMN mx_value TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN mx_priority INTEGER DEFAULT 10",
    "ALTER TABLE domains ADD COLUMN txt_spf_host TEXT DEFAULT '@'",
    "ALTER TABLE domains ADD COLUMN txt_spf_value TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN txt_verification_host TEXT DEFAULT '@'",
    "ALTER TABLE domains ADD COLUMN txt_verification_value TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN dkim_host TEXT DEFAULT 'default._domainkey'",
    "ALTER TABLE domains ADD COLUMN dkim_value TEXT DEFAULT ''",
    "ALTER TABLE domains ADD COLUMN dmarc_host TEXT DEFAULT '_dmarc'",
    "ALTER TABLE domains ADD COLUMN dmarc_value TEXT DEFAULT ''",
  ];

  for (const sql of migrations) {
    try {
      db.run(sql);
    } catch (e) {
      if (!e.message.includes('duplicate column')) {
        console.warn('Migration uyarısı:', e.message);
      }
    }
  }

  // Mevcut adreslerin süresini uzak geleceğe taşı (süresiz yap)
  try {
    db.run("UPDATE addresses SET expires_at = '9999-12-31T23:59:59.000Z' WHERE expires_at < '9999-12-31'");
  } catch (e) { /* İlk kurulumda tablo boş olabilir */ }

  // ===== Varsayılan paketleri oluştur =====
  const bcrypt = require('bcryptjs');

  // Yardımcı: sql.js ile tek satır getir
  function rawGet(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    if (stmt.step()) { const r = stmt.getAsObject(); stmt.free(); return r; }
    stmt.free();
    return null;
  }

  const existingPkg = rawGet("SELECT COUNT(*) as c FROM packages");
  if (!existingPkg || existingPkg.c === 0) {
    db.run(`INSERT INTO packages (name, display_name, max_addresses, max_emails, email_retention_days, custom_domains, webhook_support, priority_support, price_monthly, features) VALUES
      ('free', 'Ücretsiz', 3, 50, 7, 0, 0, 0, 0, '["3 geçici adres","50 mail saklama","7 gün saklama","Temel inbox"]'),
      ('pro', 'Pro', 999, 5000, 365, 1, 1, 1, 9.99, '["Sınırsız adres","5000 mail saklama","365 gün saklama","Özel domain","Webhook desteği","Öncelikli destek","Gelişmiş gizlilik"]')
    `);
    console.log('📦 Varsayılan paketler oluşturuldu (free, pro)');
  }

  // ===== Varsayılan admin kullanıcısı oluştur =====
  const adminPw = process.env.ADMIN_PASSWORD || 'admin123';
  const existingAdmin = rawGet("SELECT id FROM users WHERE role = 'admin'");
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPw, 10);
    db.run("INSERT INTO users (username, email, password_hash, role) VALUES ('admin', 'admin@tempmail.local', ?, 'admin')", [hash]);
    console.log('👤 Admin kullanıcısı oluşturuldu (admin / ' + adminPw + ')');
  }

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
 * Wrapper nesnesi döndürür (better-sqlite3 uyumlu arayüz)
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
