# 🚀 Coolify ile Deployment Rehberi

Bu rehber, TempMail uygulamasını Coolify üzerinden GitHub'dan çekerek sunucunuzda nasıl çalıştıracağınızı adım adım anlatır.

---

## Ön Gereksinimler

- [x] Bir VPS (Ubuntu/Debian önerilir)
- [x] Coolify kurulu ([coolify.io](https://coolify.io))
- [x] GitHub/GitLab/Gitea repo'su (bu projeyi push etmiş olmalısınız)
- [x] Bir veya birden fazla domain (MX kaydı ayarlanabilir)

---

## Adım 1: Projeyi GitHub'a Pushlayın

```bash
cd temp-mail

# Git başlat (eğer başlatılmamışsa)
git init
git add .
git commit -m "İlk commit"

# GitHub'a pushlayın
git remote add origin https://github.com/KULLANICI_ADINIZ/temp-mail.git
git push -u origin main
```

---

## Adım 2: Coolify'da Yeni Kaynak Oluşturun

1. Coolify Dashboard'a giriş yapın
2. Sol menüden **"Projects"** → **"New Project"** seçin
3. Proje adı: `TempMail` → **"Continue"**

---

## Adım 3: Uygulama Tipi Seçin

1. **"Docker Compose"** seçeneğini seçin
2. **"Public Repository"** veya **"Private Repository"** (GitHub token ile) seçin
3. Repository URL'sini girin:
   ```
   https://github.com/KULLANICI_ADINIZ/temp-mail.git
   ```
4. Branch: `main`
5. **"Continue"** tıklayın

---

## Adım 4: Domain Yapılandırması

Coolify'da **"Domains"** bölümünde:

### Web Paneli (HTTPS)
- Domain: `tempmail.example.com`
- Coolify otomatik Let's Encrypt SSL sertifikası oluşturur
- Bu domain, API (port 3001) ve React frontend için kullanılacak

> **Not:** SMTP domaini (`mail.example.com`) ayrı olarak DNS'de ayarlanır. Coolify proxy'sinden bağımsızdır.

---

## Adım 5: Port Mapping

Coolify'da **"Port(s) Configuration"** bölümünde:

| Container Port | Host Port | Protokol | Açıklama |
|----------------|-----------|----------|----------|
| 25 | 25 | TCP | SMTP (gelen mailler) - **Exposed** |
| 3001 | — | TCP | API + Web (Coolify proxy üzerinden) |

### Coolify'da Port 25 Ayarı

Port 25'i **"Exposed"** olarak işaretleyin:

1. **"Advanced"** → **"Port Exposes"** bölümüne gidin
2. Port `25` ekleyin
3. **"Is Public"** seçeneğini işaretleyin

> **ÖNEMLİ:** Port 25 için `NET_BIND_SERVICE` capability gerekli. Coolify bunu otomatik ekler ama emin olmak için docker-compose.yml'da tanımlı.

---

## Adım 6: Environment Variables

Coolify'da **"Environment Variables"** bölümünde ekleyin:

```
ADMIN_PASSWORD=guclu_bir_sifre_secin
ADDRESS_TTL_MINUTES=60
```

### Mail Gönderme (Opsiyonel)

Eğer mail gönderme özelliği de istiyorsanız, SMTP relay bilgilerini ekleyin:

```
SMTP_RELAY_HOST=smtp.gmail.com
SMTP_RELAY_PORT=587
SMTP_RELAY_SECURE=false
SMTP_RELAY_USER=email@gmail.com
SMTP_RELAY_PASS=uygulama_sifresi
```

> **Gmail Kullanıcıları:** Normal şifreniz yerine [Uygulama Şifresi](https://myaccount.google.com/apppasswords) oluşturun.

> **SendGrid Kullanıcıları:**
> ```
> SMTP_RELAY_HOST=smtp.sendgrid.net
> SMTP_RELAY_PORT=587
> SMTP_RELAY_USER=apikey
> SMTP_RELAY_PASS=SG.xxx...
> ```

---

## Adım 7: Deploy

1. **"Deploy"** butonuna tıklayın
2. Coolify image'ı build edip container'ı başlatacak
3. Logları takip edin:
   - `📦 SQLite veritabanı başlatıldı`
   - `🚀 API sunucusu port 3001 üzerinde çalışıyor`
   - `📧 SMTP sunucusu port 25 üzerinde dinleniyor`
   - `✅ Temp Mail servisi hazır!`

Build süreci 2-5 dakika sürebilir.

---

## Adım 8: DNS Ayarları

DNS sağlayıcınızda (Cloudflare, GoDaddy, vb.) aşağıdaki kayıtları ekleyin:

### Web Paneli için
| Tip | Host | Değer | Açıklama |
|-----|------|-------|----------|
| A | tempmail | SUNUCU_IP | Web paneli |

### Mail Almak için (HER DOMAIN İÇİN)
| Tip | Host | Değer | Açıklama |
|-----|------|-------|----------|
| A | mail | SUNUCU_IP | SMTP sunucu |
| MX | @ | mail.example.com | Öncelik: 10 |
| TXT | @ | `v=spf1 ip4:SUNUCU_IP ~all` | SPF |

### Cloudflare Kullanıcıları DİKKAT
- MX ve A kayıtlarında **proxy'yi (turuncu bulut) kapatın**
- SMTP trafiği doğrudan sunucuya gitmeli

---

## Adım 9: İlk Kullanım

1. Browser'da `https://tempmail.example.com` adresine gidin
2. **⚙️ Admin** sekmesine tıklayın
3. `.env`'deki şifrenizle giriş yapın
4. **Domain ekleyin** (örn: `example.com`)
5. Ana sayfaya dönün ve adres oluşturun
6. Harici bir mail hesabından test maili gönderin
7. Mail otomatik olarak gelen kutusunda görünecek!

---

## Adım 10: Doğrulama

DNS değişikliklerinin yayılmasını bekleyin (15 dk - 48 saat), sonra test edin:

```bash
# MX kaydını kontrol edin
dig MX example.com +short
# → 10 mail.example.com.

# A kaydını kontrol edin
dig A mail.example.com +short
# → SUNUCU_IP

# SPF kaydını kontrol edin
dig TXT example.com +short
# → "v=spf1 ip4:SUNUCU_IP ~all"

# Port 25'in açık olduğunu test edin
telnet mail.example.com 25
```

---

## Sorun Giderme

### Port 25 çalışmıyor
- VPS sağlayıcınızın port 25'i açık olup olmadığını kontrol edin
- Hetzner, OVH, Contabo: Genellikle açık
- AWS, GCP, DigitalOcean: Genellikle kapalı (talep açmanız gerekir)
- Vultr: Bölgeye göre değişir

### Build hatası
- Coolify loglarını kontrol edin
- GitHub repo'sunun public olduğundan emin olun
- Dockerfile'ın doğru dizinde olduğundan emin olun

### SSL sertifikası oluşmuyor
- DNS'in sunucuya yönlendiğinden emin olun
- Coolify'da domain ayarlarını kontrol edin
- Let's Encrypt rate limit'i dolmuş olabilir (haftada 50 sertifika/domain)

### Mail gelmiyor
- MX kaydının doğru ayarlandığından emin olun
- DNS yayılımını bekleyin (24-48 saat)
- Coolify loglarında SMTP hatalarını kontrol edin

---

## Otomatik Güncelleme (GitHub Webhook)

Coolify, GitHub'dan otomatik güncelleme alabilir:

1. Coolify'da **"Webhooks"** bölümüne gidin
2. **"Deploy Webhook URL"** kopyalayın
3. GitHub repo'nuzda **Settings → Webhooks → Add webhook**
4. URL'yi yapıştırın, Content type: `application/json`, Events: `Just the push event`
5. Artık her push'ta otomatik deploy edilir!

---

## Proje Yapısı (Güncel)

```
temp-mail/
├── server/                  # Backend
│   ├── index.js             # Ana sunucu
│   ├── db.js                # SQLite (sql.js - WebAssembly)
│   ├── utils.js             # Yardımcı fonksiyonlar
│   ├── routes/
│   │   ├── addresses.js     # Adres CRUD + şifreli adresler
│   │   ├── emails.js        # Mail okuma + gönderme
│   │   └── admin.js         # Admin/domain yönetimi
│   └── services/
│       ├── smtpServer.js    # SMTP sunucusu (gelen mail)
│       └── cleanup.js       # Manuel temizlik (admin)
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.jsx          # Ana bileşen
│   │   └── components/
│   │       ├── AddressBar.jsx   # Adres + şifre + giriş
│   │       ├── Inbox.jsx        # Gelen kutusu + yenile butonu
│   │       ├── EmailView.jsx    # Mail detay + yanıtla
│   │       └── AdminPanel.jsx   # Domain yönetimi + DNS rehberi
│   └── package.json
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.yml       # Docker Compose
├── Coolify.md               # Bu dosya
└── README.md
```
