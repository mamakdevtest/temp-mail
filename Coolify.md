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

1. **"Docker Compose"** seçeneğini seçin (Build Pack olarak)
2. **"Public Repository"** veya **"Private Repository"** (GitHub token ile) seçin
3. Repository URL'sini girin:
   ```
   https://github.com/KULLANICI_ADINIZ/temp-mail.git
   ```
4. Branch: `main`
5. **Base Directory**: `/` (kök dizin)
6. **Docker Compose Location**: `/docker-compose.yaml`

> **⚠️ ÇOK ÖNEMLİ — Dosya Adı Sorunu:**
> Coolify varsayılan olarak `docker-compose.yaml` (`.yaml` uzantılı) arar.
> Eğer dosyanız `docker-compose.yml` (`.yml` uzantılı) ise Coolify onu **bulanamaz**!
>
> - **Doğru:** `/docker-compose.yaml`
> - **Yanlış:** `/docker-compose.yml`
>
> Dosya adını GitHub'a push etmeden önce kontrol edin:
> ```bash
> # Dosya adını kontrol et
> ls docker-compose.yaml   # ✅ Olmalı
> ls docker-compose.yml    # ❌ Bu ise yeniden adlandır
>
> # Yeniden adlandırma
> git mv docker-compose.yml docker-compose.yaml
> git commit -m "docker-compose.yaml olarak yeniden adlandırıldı"
> git push
> ```

7. **"Continue"** tıklayın

---

## Adım 4: Docker Compose Ayarları

Coolify docker-compose.yaml dosyasını otomatik algılayacak. Dosya formatı:

```yaml
services:
  tempmail:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "25:25"      # SMTP - doğrudan host port 25
      - "3001"        # API/Web - Coolify proxy yönetir
    cap_add:
      - NET_BIND_SERVICE
    environment:
      - NODE_ENV=production
      - API_PORT=3001
      - SMTP_PORT=25
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}
      - ADDRESS_TTL_MINUTES=${ADDRESS_TTL_MINUTES:-60}
      - SMTP_RELAY_HOST=${SMTP_RELAY_HOST:-}
      - SMTP_RELAY_PORT=${SMTP_RELAY_PORT:-587}
      - SMTP_RELAY_SECURE=${SMTP_RELAY_SECURE:-false}
      - SMTP_RELAY_USER=${SMTP_RELAY_USER:-}
      - SMTP_RELAY_PASS=${SMTP_RELAY_PASS:-}
    volumes:
      - tempmail-data:/app/data
    healthcheck:
      test:
        - CMD-SHELL
        - "curl -f http://localhost:3001/api/health || exit 1"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  tempmail-data:
    driver: local
```

**Önemli Noktalar:**

| Port | Format | Açıklama |
|------|--------|----------|
| `25:25` | `host:container` | SMTP portu doğrudan host'a map edilir (proxy bypass) |
| `3001` | sadece container | Coolify proxy otomatik SSL/domain atar |

---

## Adım 5: Domain Yapılandırması

Coolify'da servis oluşturulduktan sonra **"Configuration"** → **"Domains"** bölümünde:

### Web Paneli (HTTPS)
1. **"Generate Domain"** tıklayın veya kendi domain'inizi girin:
   ```
   tempmail.example.com
   ```
2. Coolify otomatik Let's Encrypt SSL sertifikası oluşturur
3. Bu domain, API (port 3001) ve React frontend için kullanılacak

> **Not:** SMTP domaini (`mail.example.com`) ayrı olarak DNS'de ayarlanır. Coolify proxy'sinden bağımsızdır.

---

## Adım 6: Port 25 Ayarı (SMTP)

Port 25, docker-compose'da `"25:25"` olarak tanımlı — Coolify bunu doğrudan host port olarak açar.

Coolify'da **"Configuration"** → **"Advanced"** bölümünde:

1. **"Port Exposes"** kısmında port `25`'in listelendiğinden emin olun
2. **"Is Public"** seçili olmalı

> **ÖNEMLİ:** Port 25 için `NET_BIND_SERVICE` capability gerekli. docker-compose.yaml'da `cap_add` ile tanımlı.

---

## Adım 7: Environment Variables

Coolify'da **"Configuration"** → **"Environment Variables"** bölümünde ekleyin:

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `ADMIN_PASSWORD` | `guclu_sifreniz` | Admin paneli şifresi |
| `ADDRESS_TTL_MINUTES` | `60` | Geçici adres yaşam süresi (dk) |

### Mail Gönderme (Opsiyonel)

Eğer mail gönderme özelliği de istiyorsanız:

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `SMTP_RELAY_HOST` | `smtp.gmail.com` | SMTP sunucu |
| `SMTP_RELAY_PORT` | `587` | SMTP port |
| `SMTP_RELAY_SECURE` | `false` | SSL/TLS |
| `SMTP_RELAY_USER` | `email@gmail.com` | Kullanıcı |
| `SMTP_RELAY_PASS` | `uygulama_sifresi` | Şifre |

> **Gmail:** Normal şifreniz yerine [Uygulama Şifresi](https://myaccount.google.com/apppasswords) oluşturun.

> **SendGrid:**
> ```
> SMTP_RELAY_HOST=smtp.sendgrid.net
> SMTP_RELAY_PORT=587
> SMTP_RELAY_USER=apikey
> SMTP_RELAY_PASS=SG.xxx...
> ```

---

## Adım 8: Deploy

1. **"Deploy"** butonuna tıklayın
2. Coolify image'ı build edip container'ı başlatacak
3. Logları takip edin:
   - `📦 SQLite veritabanı başlatıldı`
   - `🚀 API sunucusu port 3001 üzerinde çalışıyor`
   - `📧 SMTP sunucusu port 25 üzerinde dinleniyor`
   - `✅ Temp Mail servisi hazır!`

Build süreci 2-5 dakika sürebilir.

---

## Adım 9: DNS Ayarları

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

## Adım 10: İlk Kullanım

1. Browser'da `https://tempmail.example.com` adresine gidin
2. **⚙️ Admin** sekmesine tıklayın
3. Environment'da belirlediğiniz şifreyle giriş yapın
4. **Domain ekleyin** (örn: `example.com`)
5. Ana sayfaya dönün ve adres oluşturun
6. Harici bir mail hesabından test maili gönderin
7. Mail otomatik olarak gelen kutusunda görünecek!

---

## Adım 11: Doğrulama

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

### "Port already in use" hatası
- Port 25 başka bir servis tarafından kullanılıyor olabilir
- `sudo lsof -i :25` ile kontrol edin
- Postfix veya başka bir mail sunucusu varsa durdurun: `sudo systemctl stop postfix`

---

## Otomatik Güncelleme (GitHub Webhook)

Coolify, GitHub'dan otomatik güncelleme alabilir:

1. Coolify'da **"Webhooks"** bölümüne gidin
2. **"Deploy Webhook URL"** kopyalayın
3. GitHub repo'nuzda **Settings → Webhooks → Add webhook**
4. URL'yi yapıştırın, Content type: `application/json`, Events: `Just the push event`
5. Artık her push'ta otomatik deploy edilir!

---

## Proje Yapısı

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
├── docker-compose.yaml       # Docker Compose (Coolify uyumlu)
├── Coolify.md               # Bu dosya
└── README.md
```
