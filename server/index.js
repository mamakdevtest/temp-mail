require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { initDatabase } = require('./db');

const app = express();
const API_PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io instance'ı (global - SMTP servisi de kullanacak)
let io = null;

/**
 * Socket.io instance'ını döndürür (diğer modüller erişebilir)
 */
function getIo() {
  return io;
}

/**
 * Ana başlatma fonksiyonu (async - sql.js WebAssembly yükler)
 */
async function main() {
  // 1. Veritabanını başlat
  await initDatabase();

  // 2. API rotalarını YÜKLE (static'ten ÖNCE olmalı!)
  const authRouter = require('./routes/auth');
  const addressesRouter = require('./routes/addresses');
  const emailsRouter = require('./routes/emails');
  const adminRouter = require('./routes/admin');

  app.use('/api/auth', authRouter);
  app.use('/api/addresses', addressesRouter);
  app.use('/api/emails', emailsRouter);
  app.use('/api/admin', adminRouter);

  // Sağlık kontrolü
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'API endpoint bulunamadı',
      path: req.originalUrl,
      method: req.method,
    });
  });

  app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Geçersiz JSON body gönderildi' });
    }
    if (req.originalUrl?.startsWith('/api/')) {
      console.error('API hatası:', err);
      return res.status(err?.status || 500).json({ error: err?.message || 'Sunucu hatası oluştu' });
    }
    return next(err);
  });

  // 3. Production'da React frontend dosyalarını sun (API rotalarından SONRA)
  if (process.env.NODE_ENV === 'production') {
    const clientBuild = path.join(__dirname, '..', 'client', 'dist');
    app.use(express.static(clientBuild));
    // Wildcard: tüm GET isteklerini index.html'e yönlendir (SPA fallback)
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
    console.log(`🌐 Frontend: ${clientBuild}`);
  }

  // 4. HTTP sunucusu oluştur (Socket.io ile birlikte)
  const server = http.createServer(app);

  // Socket.io başlat
  io = new SocketServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? false : '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Yeni socket bağlantısı: ${socket.id}`);

    // İstemci belirli bir adresin maillerini dinlemek istiyor
    socket.on('subscribe', (address) => {
      const room = `inbox:${address.toLowerCase()}`;
      socket.join(room);
      console.log(`📬 Socket ${socket.id} odaya katıldı: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket bağlantısı kesildi: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.io başlatıldı');

  // 5. Express API sunucusunu başlat
  server.on('error', (err) => {
    console.error(`❌ API sunucusu başlatılamadı (${API_PORT}):`, err.message);
    process.exit(1);
  });

  server.listen(API_PORT, () => {
    console.log(`🚀 API sunucusu port ${API_PORT} üzerinde çalışıyor`);
    console.log(`   Sağlık kontrolü: http://localhost:${API_PORT}/api/health`);
  });

  // 6. SMTP sunucusunu başlat (Socket.io instance'ını geç)
  try {
    const { startSmtpServer } = require('./services/smtpServer');
    startSmtpServer(SMTP_PORT, io);
  } catch (err) {
    console.error(`⚠️  SMTP sunucu başlatılamadı (port ${SMTP_PORT}):`, err.message);
  }

  // 7. Mail gönderme durumunu göster
  const relayHost = process.env.SMTP_RELAY_HOST;
  if (relayHost) {
    console.log(`📤 Mail gönderme aktif: ${relayHost}:${process.env.SMTP_RELAY_PORT || '587'}`);
  } else {
    console.log('📤 Mail gönderme devre dışı (SMTP_RELAY_HOST ayarlanmamış)');
  }

  console.log('✅ Temp Mail servisi hazır!');
}

// Sadece doğrudan çalıştırıldığında başlat; test/import senaryolarında port açma.
if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Başlatma hatası:', err);
    process.exit(1);
  });
}

module.exports = { getIo, main, app };
