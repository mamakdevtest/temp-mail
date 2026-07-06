require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');

const app = express();
const API_PORT = parseInt(process.env.API_PORT || '3001', 10);
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Sağlık kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Üretimde React build dosyalarını sun
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

/**
 * Ana başlatma fonksiyonu (async - sql.js WebAssembly yükler)
 */
async function main() {
  // 1. Veritabanını başlat
  await initDatabase();

  // 2. API rotalarını yükle (db hazır olduktan sonra)
  const addressesRouter = require('./routes/addresses');
  const emailsRouter = require('./routes/emails');
  const adminRouter = require('./routes/admin');

  app.use('/api/addresses', addressesRouter);
  app.use('/api/emails', emailsRouter);
  app.use('/api/admin', adminRouter);

  // 3. Express API sunucusunu başlat
  app.listen(API_PORT, () => {
    console.log(`🚀 API sunucusu port ${API_PORT} üzerinde çalışıyor`);
    console.log(`   Sağlık kontrolü: http://localhost:${API_PORT}/api/health`);
  });

  // 4. SMTP sunucusunu başlat
  try {
    const { startSmtpServer } = require('./services/smtpServer');
    startSmtpServer(SMTP_PORT);
  } catch (err) {
    console.error(`⚠️  SMTP sunucu başlatılamadı (port ${SMTP_PORT}):`, err.message);
  }

  // 5. Temizlik servisini başlat
  const { startCleanupJob } = require('./services/cleanup');
  startCleanupJob();

  console.log('✅ Temp Mail servisi hazır!');
}

// Uygulamayı başlat
main().catch((err) => {
  console.error('❌ Başlatma hatası:', err);
  process.exit(1);
});
