# 📧 TempMail - Geçici E-posta Uygulaması

Kendi domainleriniz üzerinden geçici e-posta adresleri oluşturup, gelen mailleri okuyabileceğiniz web uygulaması.

## Özellikler

- 🚀 Tek tıkla rastgele geçici e-posta adresi oluşturma
- 📬 Gelen mailleri gerçek zamanlı görüntüleme (5 sn polling)
- ✉️ HTML ve düz metin mail görüntüleme
- 📎 Ek indirme desteği
- 🌐 Birden fazla domain desteği
- ⏱️ Otomatik adres süresi doldurma (varsayılan: 1 saat)
- ⚙️ Admin paneli ile domain yönetimi
- 🧹 Otomatik temizlik servisi

## Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js + Express |
| SMTP | smtp-server + mailparser |
| Veritabanı | SQLite (sql.js - WebAssembly) |
| Frontend | React + Vite + Tailwind CSS |
| Zamanlayıcı | node-cron |

---

## Kurulum

### 1. Ön Gereksinimler

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **VPS** (Ubuntu/Debian önerilir) - port 25 açık olmalı
- **Domain** - MX kaydı ayarlanabilir

### 2. Projeyi İndirin

```bash
# Projeyi klonlayın veya dosyaları kopyalayın
cd temp-mail

# .env dosyası oluşturun
cp .env.example .env
```

### 3. .env Dosyasını Düzenleyin

```env
# API sunucu portu
API_PORT=3001

# SMTP sunucu portu (gelen mailler için)
# Port 25 için root yetkisi gerekir
SMTP_PORT=25

# Admin paneli şifresi (güçlü bir şifre seçin!)
ADMIN_PASSWORD=sifrenizi_buraya_yazin

# Geçici adres yaşam süresi (dakika)
ADDRESS_TTL_MINUTES=60

# Ortam
NODE_ENV=development
```

### 4. Bağımlılıkları Kurun

```bash
# Tüm bağımlılıkları tek komutla kurun
npm run install:all
```

veya ayrı ayrı:

```bash
# Backend bağımlılıkları
npm install

# Frontend bağımlılıkları
cd client
npm install
cd ..
```

### 5. Uygulamayı Başlatın

**Geliştirme modu** (iki terminal penceresi):

```bash
# Terminal 1 - Backend (SMTP + API)
sudo npm run server

# Terminal 2 - Frontend (React dev server)
npm run client
```

veya tek komutla (ancak SMTP port 25 için sudo gerekebilir):

```bash
sudo npm run dev
```

**Üretim modu:**

```bash
# Önce frontend'i build edin
npm run build

# Sonra production modunda başlatın
sudo NODE_ENV=production npm start
```

### 6. İlk Kullanım

1. Browser'da `http://sunucu-ip:3000` adresine gidin
2. **Admin** sekmesine tıklayın
3. `.env`'deki şifrenizle giriş yapın
4. **Domain ekleyin** (örn: `temp.ornek.com`)
5. Ana sayfaya dönün ve adres oluşturun
6. Harici bir mail hesabından test maili gönderin
7. Mail otomatik olarak gelen kutusunda görünecek!

---

## DNS Ayarları (ÇOK ÖNEMLİ)

Domaininizden mail alabilmek için MX kayıtlarını doğru ayarlamanız gerekir.

### Adım 1: MX Kaydı Oluşturun

DNS sağlayıcınızda (Cloudflare, GoDaddy, vb.) şu kaydı ekleyin:

| Tip | Host | Değer | Öncelik |
|-----|------|-------|---------|
| MX | @ | mail.ornek.com | 10 |

> **Not:** `ornek.com` yerine kendi domaininizi yazın.

### Adım 2: A Kaydı Oluşturun

MX kaydındaki hostname'i sunucunuzun IP adresine yönlendirin:

| Tip | Host | Değer |
|-----|------|-------|
| A | mail | SUNUCU_IP_ADRESI |

### Adım 3: SPF Kaydı (Önerilen)

Sahtekarlık koruması için TXT kaydı ekleyin:

| Tip | Host | Değer |
|-----|------|-------|
| TXT | @ | `v=spf1 ip4:SUNUCU_IP_ADRESI ~all` |

### Adım 4: Reverse DNS / PTR Kaydı (Önerilen)

VPS sağlayıcınızın panelinden PTR kaydı ayarlayın:
- `SUNUCU_IP_ADRESI` → `mail.ornek.com`

Bu, mail sunucularının size güvenmesini sağlar.

### Adım 5: Doğrulama

DNS değişikliklerinin yayılmasını bekleyin (15 dk - 48 saat), sonra test edin:

```bash
# MX kaydını kontrol edin
dig MX ornek.com +short

# SPF kaydını kontrol edin
dig TXT ornek.com +short

# Port 25'in açık olduğunu test edin
telnet mail.ornek.com 25
```

---

## 🐳 Docker ile Çalıştırma

Docker ile uygulamayı tek komutla ayağa kaldırabilirsiniz:

```bash
# Image'ı build edin
docker compose build

# Çalıştırın
docker compose up -d

# Logları görüntüleyin
docker compose logs -f
```

---

## ☁️ Coolify ile Deployment

Coolify, kendi sunucunuzda çalışan açık kaynak bir PaaS platformudur. Bu uygulamayı Coolify'da kolayca deploy edebilirsiniz.

### Adım 1: Projeyi Git Repo'suna Yükleyin

Projeyi GitHub, GitLab veya Gitea gibi bir Git servisine push edin:

```bash
cd temp-mail
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/kullanici/temp-mail.git
git push -u origin main
```

### Adım 2: Coolify'da Yeni Kaynak Oluşturun

1. Coolify Dashboard'a giriş yapın
2. **"New Resource"** butonuna tıklayın
3. **"Docker Compose"** seçeneğini seçin
4. Git repo URL'nizi girin: `https://github.com/kullanici/temp-mail.git`
5. Coolify `docker-compose.yml` dosyasını otomatik algılayacak

### Adım 3: Domain Ayarı

Coolify'da **"Domains"** bölümünde:

- **Web Paneli**: `tempmail.ornek.com` → Coolify otomatik Let's Encrypt SSL sertifikası oluşturur
- Bu domain, API (port 3001) ve React frontend için kullanılacak

> **Not:** SMTP domaini (`mail.ornek.com`) ayrı olarak DNS'de ayarlanır, Coolify proxy'sinden bağımsızdır.

### Adım 4: Port Mapping

Coolify'da **"Port(s) Configuration"** bölümünde:

| Container Port | Host Port | Protokol | Açıklama |
|----------------|-----------|----------|----------|
| 25 | 25 | TCP | SMTP (gelen mailler) |
| 3001 | — | TCP | API + Web (Coolify proxy üzerinden) |

> **ÖNEMLİ:** Port 25'i **"Exposed"** olarak işaretleyin. Coolify proxy'si SMTP trafiğini desteklemez, bu port doğrudan dışarıya açık olmalı. Port 3001 için **"Automatically Set FQDN"** seçeneğini işaretleyin.

### Adım 5: Environment Variables

Coolify'da **"Environment Variables"** bölümünde:

```
ADMIN_PASSWORD=guclu_bir_sifre_secin
ADDRESS_TTL_MINUTES=60
```

### Adım 6: Deploy

1. **"Deploy"** butonuna tıklayın
2. Coolify image'ı build edip container'ı başlatacak
3. Logları takip edin: `🚀 API sunucusu port 3001` ve `📧 SMTP sunucusu port 25` mesajlarını görmelisiniz

### Adım 7: DNS Ayarları

DNS sağlayıcınızda (Cloudflare, vb.) aşağıdaki kayıtları ekleyin:

| Tip | Host | Değer | Açıklama |
|-----|------|-------|----------|
| A | tempmail | COOLIFY_SUNUCU_IP | Web paneli |
| A | mail | COOLIFY_SUNUCU_IP | SMTP sunucu |
| MX | ornek.com | mail.ornek.com | Öncelik: 10 |
| TXT | ornek.com | `v=spf1 ip4:COOLIFY_SUNUCU_IP ~all` | SPF |

> **Coolify'da Port 25 Sorunu:**
> Bazı bulut sağlayıcıları (Hetzner hariç) port 25'i varsayılan olarak bloklar.
> Bu durumda VPS sağlayıcınızdan port 25 açılmasını talep edin.
> Hetzner, OVH, Contabo gibi sağlayıcılarda port 25 genellikle açıktır.

### Adım 8: Test

1. Browser'da `https://tempmail.ornek.com` adresine gidin
2. Admin panelinden domain ekleyin (`ornek.com`)
3. Rastgele adres oluşturun
4. Harici bir mail hesabından test maili gönderin
5. Mail gelen kutusunda görünmeli!

---

## Proje Yapısı

```
temp-mail/
├── server/                  # Backend
│   ├── index.js             # Ana sunucu (Express + SMTP başlatır)
│   ├── db.js                # SQLite veritabanı (sql.js - WebAssembly)
│   ├── utils.js             # Yardımcı fonksiyonlar
│   ├── routes/
│   │   ├── addresses.js     # Adres CRUD endpoint'leri
│   │   ├── emails.js        # Mail okuma endpoint'leri
│   │   └── admin.js         # Admin/domain yönetimi
│   └── services/
│       ├── smtpServer.js    # SMTP sunucusu (gelen mail yakalama)
│       └── cleanup.js       # Otomatik temizlik servisi
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx          # Ana bileşen
│   │   ├── components/
│   │   │   ├── AddressBar.jsx   # Adres gösterme + oluşturma
│   │   │   ├── Inbox.jsx        # Gelen kutusu listesi
│   │   │   ├── EmailView.jsx    # Mail detay görüntüleme
│   │   │   └── AdminPanel.jsx   # Domain yönetimi + DNS rehberi
│   │   └── main.jsx         # React giriş noktası
│   ├── index.html
│   └── package.json
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose yapılandırması
├── .dockerignore            # Docker hariç tutulanlar
├── data/                    # SQLite veritabanı dosyası (otomatik oluşur)
├── .env.example             # Yapılandırma şablonu
├── package.json             # Backend bağımlılıkları
└── README.md                # Bu dosya
```

---

## API Endpoint'leri

### Adresler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/addresses/random` | Rastgele adres oluştur |
| POST | `/api/addresses` | Özel adres oluştur `{username, domain}` |
| GET | `/api/addresses/:address` | Adres bilgisi + mailler |

### Mailler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/emails/:address` | Adrese gelen mailler |
| GET | `/api/emails/single/:id` | Mail detayı |
| GET | `/api/emails/:emailId/attachments/:attId` | Ek indirme |

### Admin (`x-admin-password` header gerekli)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/domains` | Domain listesi |
| POST | `/api/admin/domains` | Domain ekle `{domain}` |
| PUT | `/api/admin/domains/:id` | Domain güncelle `{is_active}` |
| DELETE | `/api/admin/domains/:id` | Domain sil |
| POST | `/api/admin/cleanup` | Manuel temizleme |

---

## Sorun Giderme

### SMTP port 25 çalışmıyor
- Linux'ta `sudo` ile çalıştırın
- VPS sağlayıcınızın port 25'i açık olup olmadığını kontrol edin
- AWS/GCP gibi platformlarda port 25 genellikle kapalıdır, talep açmanız gerekir
- Alternatif: `.env`'de `SMTP_PORT=1025` olarak değiştirin (test amaçlı)

### Mail gelmiyor
- MX kaydının doğru ayarlandığından emin olun (`dig MX domain.com`)
- DNS yayılımını bekleyin (24-48 saat)
- Sunucu firewall'ında port 25'in açık olduğunu kontrol edin
- SMTP sunucusunun çalıştığını kontrol edin (log mesajları)

### SQLite hatası
- `data/` klasörünün yazılabilir olduğundan emin olun
- Disk alanının yeterli olduğunu kontrol edin

---

## Lisans

MIT
