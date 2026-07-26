# temp-mail-ui-v3.md — MS Temp Mail UI Design Brief (v3)

> Bu doküman bir tasarımcı AI'ya girdi olarak verilir. Amaç: mevcut temp-mail
> uygulamasının **tüm sahnelerini, panellerini, modallarını, primitiflerini ve
> tasarım sistemini** eksiksiz bir şekilde tanıtmak; AI'ın bir yeniden tasarım
> (redesign) planı çıkarabilmesi için gerekli her görünür bilgiyi, etkileşimi ve
> bağlamı vermek. Kaynak: graphify bilgi grafiği (446 node, 692 edge, 23 topluluk)
> + 22 istemci kaynak dosyasının tam okunması.

---

## 0. Bu dokümanı okuyan AI'ya brief

Sen bir senior ürün tasarımcısısın. Aşağıda MS Temp Mail adlı geçici e-posta
uygulamasının **tam UI envanteri** var. Görevin:

1. Her sahneyi/paneli/modalı anlamak (ne işe yarar, ne gösterir, ne yapılabilir).
2. Kullanıcı akışlarını (guest → free → pro → admin) takip etmek.
3. Tasarım sistemini (renk, tipografi, layout, primitive, durumlar) özümsemek.
4. Bunlardan bir **redesign planı** üretmek: bilgi mimarisini koru, görsel dili
   yenile, tutarsızlıkları gider (bazı sahneler Türkçe sabit, bazıları i18n;
   bazıları Tailwind, bazıları inline style; bazıları `card`, bazıları `ops-card`).
5. Önerini sahne-bazlı, somut, uygulanabilir şekilde sun.

Okurken şu üç gerçeği hesaba kat:
- **Karanlık-öncelikli** tasarım. Light tema var ama override'larla.
- **Türkçe kaynak dili** (`tr`), `en` kısmi kaplama. Çoğu UI string'i kodda sabit.
- ** Üç kullanıcı tipi**: Guest (anonim), Free/Pro/Pro+ (kayıtlı), Admin.
  Bulk/Automation sadece üyelerde; Admin paneli sadece adminde.

---

## 1. Ürün özeti

**MS Temp Mail** — tek seferlik e-posta adresi üreten, gerçek zamanlı mail kutusu
sağlayan, OTP doğrulama kodlarını otomatik tespit eden, çoklu domain + alt domain
destekli, bulk (toplu) adres havuzları oluşturabilen, API anahtarı + webhook
otomasyonu sunan geçici e-posta servisi.

**Stack**: React + Vite + Tailwind (önyüz), Node.js + Express + smtp-server +
SQLite (sql.js WebAssembly) (arka yüz), Socket.io gerçek zamanlı, node-cron
otomatik temizlik.

**Marka**: `MS Temp Mail` · Geliştirici `Emir Han Mamak` · Stüdyo `Mamak Studio`.

**Çıkış noktaları**:
- Bir guest gelir, tek tıkla rastgele adres alır, mail bekler.
- Bir üye gelir, adres havuzu kurar, OTP'leri topluca toplar, API ile otomatize eder.
- Bir admin gelir, domain/DNS/kullanıcı/bulk havuzlarını yönetir.

---

## 2. Tasarım sistemi (global)

### 2.1 Tema & renk tokenları

Karanlık öncelikli. `:root` (dark) ve `html[data-theme="light"]` (light) iki set.
Light tema, `card`, `panel-soft`, `input`, `btn-secondary`, `nav-pill`,
`app-header`, `app-shell`, `temp-address-panel`, `account-summary-panel`,
`account-settings-shell`, `auth-screen` için kapsamlı CSS override'lara sahiptir.

| Token | Dark değeri (RGB) | Rol |
|---|---|---|
| `--brand-bg` | koyu lacivert zemin | app arka planı |
| `--brand-surface` | kart zemin | `card` |
| `--brand-surface2` | ikincil yüzey | satır/seçili |
| `--brand-surface3` | üçüncül | derin bölümler |
| `--brand-border` / `--brand-border2` | ince kenarlık | ayırıcılar |
| `--accent-blue` | 91 141 255 | birincil aksan |
| `--accent-cyan` | 76 210 235 | ikincil aksan |
| `--accent-teal` | teal | üçüncül aksan |
| `--accent-purple` | 122 99 255 | OTP / premium |
| `--accent-green` | 39 213 155 | canlı / başarı |
| `--accent-red` | 255 95 105 | hata / sil |
| `--accent-gold` | 245 200 76 | PRO / admin / DNS |
| `--txt-primary` / `secondary` / `muted` / `disabled` | — | metin katmanları |
| `--bg-top/right/bottom` | radial tints | zemin derinliği |

Grafik renkleri (AdminPanel): `#3B82FF`, `#27D59B`, `#F5C84C`, `#7A63FF`, `#34D7FF`.

### 2.2 Tipografi

- **Plus Jakarta Sans** (400–800) — birincil arayüz fontu.
- **JetBrains Mono** (500/700) — kod, mono (adres, OTP, kod blokları).
- Google Fonts `@import` ile yüklenir.

### 2.3 Bileşen sınıfları (Tailwind layer + özel CSS)

- **Buton**: `btn-primary` (mavi→mor gradient + glow), `btn-secondary`,
  `btn-ghost`, `btn-danger`.
- **Kart**: `card` — `rounded-[22px]`, backdrop-blur, shadow.
- **Panel**: `panel-soft`.
- **Giriş**: `input`.
- **Rozet**: `badge-blue/cyan/green/purple/gold/red`.
- **Başlık**: `section-title`.
- **Navigasyon**: `nav-pill` / `nav-pill-active`, `workspace-rail`,
  `mobile-workspace-nav`.
- **Operasyon sayfaları**: `ops-page`, `ops-card`, `ops-field`, `ops-stat`,
  `ops-step`, `ops-eyebrow`, `ops-empty`, `ops-loading`, `ops-error`,
  `ops-status`, `status-active/paused/archived`.
- **Bulk**: `bulk-studio`, `bulk-builder`, `bulk-preview`, `bulk-pool-list`,
  `bulk-inbox-*`, `bulk-counts`, `bulk-mail-*`.
- **Doküman**: `docs-center`, `docs-hero`, `docs-search`, `docs-layout`,
  `docs-library`, `docs-reader`, `docs-sidecards`, `docs-steps`, `docs-note`.
- **Admin**: `admin-signal-card` (üst cyan→blue aksan çizgisi `::before`),
  `admin-docs-*`.
- **Hesap**: `account-summary-panel`, `account-settings-shell`,
  `admin-owner-note`.

### 2.4 Animasyonlar & durumlar

- `animate-pulse` (iskelet), `animate-spin` (yenile ikonu), `animate-pulse-soft`
  (logo), `animate-float-soft` (domain ikonu), `animate-slide-up` (modal/OTP),
  `animate-slide-down` (toast).
- `prefers-reduced-motion` animasyonları kapatır.
- `:focus-visible` cyan outline. `aria-modal`, `role="dialog"`, `aria-expanded`,
  `aria-label` erişilebilirlik mevcut.

### 2.5 Duyarlı kırılımlar

480, 640, 720, 820, 1023, 1100, 1120, 1279 px. 1279 px altında `workspace-rail`
tek kolona düşer; `lg` altında mobil alt nav görünür.

### 2.6 Bildirim sesleri

6 WebAudio sentezlenmiş ses: `classic`, `soft`, `digital`, `chime` (varsayılan),
`alert`, `arcade`. AudioContext ilk kullanıcı etkileşiminde açılır (autoplay
politikası). Tercih `localStorage('tm-notification-sound')`.

### 2.7 i18n

`tr` (varsayılan/kaynak), `en` (kısmi kaplama). Anahtar grupları: `app`,
`addressBar`, `account`, `accountModal`, `auth`. **Uyarı**: Inbox, EmailView,
AuthPage ipucu satırı, Admin, Bulk, Automation, Docs sahnelerindeki birçok
string Türkçe olarak kodda sabit — i18n'e taşınmamış. Tasarımcı bunu
tutarlılık için işaretlemeli.

---

## 3. App kabuğu & navigasyon (`App.jsx`)

### 3.1 Üst seviye yönlendirme

Hash-tabanlı (`#/inbox`, `#/domains`, `#/account`, `#/bulk`, `#/automation`,
`#/docs`, `#/admin`, `#/admin-bulk`, `#/bulk-inbox`). `page` durumu
`window.location.hash`'ten okunur, `navigate(nextPage)` history'e iter. `bulk-inbox`
eski link uyumu için otomatik `bulk`'a yönlendirir (Bulk Inbox artık modal).

### 3.2 Yerleşim

- **`app-header`** (yapışkan): logo + `MS Temp Mail` + marka alt başlığı; xl-only
  nav-pills (Inbox/Domains/Bulk/Otomasyon/Dokümanlar/Admin); sağda guest için
  Sign in/Sign up ya da kullanıcı avatarı (gradyan daire veya img) + ad + rol
  etiketi + ChevronDown → kullanıcı menüsü (Hesap Ayarları, Admin Paneli, Pro'ya
  Geç, Çıkış Yap).
- **`workspace-frame`**: sol `workspace-rail` (lg+) sidebar
  (Inbox/Domainler/Bulk Studio/Otomasyon/Dokümanlar/Hesap + admin ayırıcı +
  Operasyonlar/Bulk yönetimi); sağ `app-main` içerik alanı.
- **`mobile-workspace-nav`** (lg-): alt ikon nav (Inbox/Domain/Bulk/Akış/Docs/Hesap).
- **Footer**: `MS Temp Mail • Dev: Emir Han Mamak • Mamak Studio`.
- **Toast balonu**: sağ-üst `fixed top-24 right-6`, yeşil/kırmızı/mavi.
- **Arka plan**: `app-shell` grid overlay (40×40 çizgiler) + radial gradient +
  3 bulanık renk blobu (mor/cyan/mavi).

### 3.3 Yetki geçitleri

- `auth.loading` → ortalanmış Mail ikonu + `Yükleniyor...`.
- `showAuth` → tam ekmen `AuthPage` overlay (lazy).
- Guest → Bulk/Automation nav'da gizli.
- Admin → Admin girişleri görünür.

### 3.4 Gerçek zamanlı & polling

Socket.io (`transports: websocket+polling`), `subscribe` mevcut adrese. Yeni
mailde `new-email` → toast + beep. Socket yoksa adaptif polling (5s başlangıç,
60s'e kadar katlanır).

### 3.5 Adres yaşam döngüsü

`auth.user` gelince domainler yüklenir, `localStorage('tm-last-addr')`'den son
adres geri yüklenir; yoksa ve domain varsa rastgele üretilir. Adres `tm-last-addr`
ve `tm-history` (max 20) olarak saklanır.

### 3.6 Modal'lar (kabuk seviyesi)

- **Password Required** — şifre korumalı adres açma girişimi.
- **Set Password** — Pro-only, mevcut adrese şifre koyma.
- **Compose / New Mail** (`wide`) — Pro-only yanıt formu.
- **Pro Request** — Free kullanıcının Pro talebi.
- **Bulk Inbox** (`size="full"`) — Havuz mail akışı popup.

---

## 4. Sahne envanteri (kullanıcı akış sırasına göre)

### 4.1 Loading
Ortalanmış Mail ikonu + `Yükleniyor...`. `/api/auth/me` çözülürken.

### 4.2 Auth overlay (`AuthPage.jsx`)
**Tip**: sahne (tam ekmen overlay, `fixed inset-0 z-[200]`).
**Amaç**: Guest'i giriş/kayıt kartına alır. Üç kullanıcı tipi kartı (Guest/Free/Pro).
**Görünür**:
- Ortalanmış `max-w-md` kolon. Logo tile (Mail ikonu, `Temp`+`Mail` cyan).
- Sekme: `Giriş Yap` / `Kayıt Ol`.
- Form: username (User ikonu), email (Mail, sadece kayıt), password (Lock +
  Eye/EyeOff), hata rozeti, `btn-primary` + ArrowRight, `Hesapsız devam et`.
- Giriş ipucu: `Admin: admin / admin123` (sabit).
- 3 kullanıcı tipi kartı `grid-cols-3` (User/Shield/Crown; yeşil/mavi/mor).
**Durum**: `mode`, `username`, `email`, `password`, `showPw`, `loading`, `error`.
**Etkileşim**: sekme, şifre göster/gizle, submit, guest devam, kapat (X).
**Tasarım notu**: `auth-screen` arka plan + diyagonal çizgi `::before`.
`admin-signal-card` gövde. Cyan→blue gradient logo. i18n `auth.*`.

### 4.3 Inbox (`#/inbox`, varsayılan)
**Tip**: ana çalışma sahnesi. Üç parçadan oluşur:

#### 4.3.1 AddressBar (`AddressBar.jsx`) — üst panel
**Amaç**: Geçici e-posta adresi besteci. Username + `@` + domain (portal-render,
alt domain ağacı) + Copy/Refresh/Random/Protect, durum rozetleri, geçmiş.
**Görünür**:
- `temp-address-panel card` radial gradient.
- 2 kolon (`xl:grid-cols-[1fr_260px]`).
- Sol: başlık `Geçici E-Posta Adresiniz` + alt başlık; adres form paneli
  (`panel-soft rounded-[26px]`): username (sağ hizalı, `text-[2.15rem]`), kırmızı
  `@`, domain düğmesi (`Globe2` + cyan domain + `ChevronDown`) → `createPortal`
  dropdown (ana domainler + açılır alt domain ağaçları); 72px Copy tile butonu.
- Eylem satırı: Copy/Open (`isModified`'a bağlı), Refresh (RefreshCw, yüklenirken
  döner), Random (Shuffle), Protect (Lock, `accent-gold`, PRO değilse `PRO` rozeti).
- Durum satırı: yeşil nokta + `Adres aktif ve kullanıma hazır` / `şifre korumalı`,
  şifreli rozet, hata metni.
- Sağ: `Hazır ve Güvende` güvenlik paneli (Shield); geçmiş dropdown (Clock, avatar
  tile + adres + zaman + Lock/Sparkles); şifreli geçmiş açılır (mor tema).
- Onay `Modal` (refresh/random).
**Durum**: `username`, `selectedFullDomain`, `pw`, `showHistory`, `copied`,
`showDomainMenu`, `showPasswordedHistory`, `confirmAction`, `expandedDomains`,
`domainMenuLayout`.
**Etkileşim**: username yaz (sanitize `[^a-zA-Z0-9._-]`), domain menü aç,
alt domain ağacı genişlet/daralt, seç, kopyala, yenile (onay), rastgele (onay),
protect (PRO geçidi), değiştirilmiş adresi aç, geçmişten seç.
**Tasarım notu**: Domain dropdown `useLayoutEffect` ile portal konumu hesaplar
(alt boşluk <320px ise yukarı çevir, viewport'a sıkıştır, 460px max genişlik,
360px max yükseklik). `hasManualDomainSelectionRef` kullanıcı seçimini korur.
Zaman biçimlendirici (`az önce`, `X dk`, `Xs`, tarih). i18n `addressBar.*`.

#### 4.3.2 Inbox (`Inbox.jsx`) — sol panel
**Amaç**: Mevcut adres için canlı mail listesi. Gerçek zamanlı durum rozeti,
arama, filtre, her satırda gönderen/konu/OTP/ek rozetleri/zaman, hover'da OTP
kopyala + sil.
**Görünür**:
- `card` başlık: Mail tile, `Gelen Kutusu` / `Anlık mesaj akışı`, `badge-green`
  canlı (nabız yeşil nokta), Refresh düğmesi (RefreshCw döner).
- Arama (Search) + `Filtreler` ikincil.
- Kaydırılabilir satırlar: döngüsel renkli nokta (i%4), gönderen + OTP `KeyRound`
  + `Paperclip` + `Doğrulama` mor rozet, konu, zaman, hover Copy/Trash2, sağ-alt
  Star.
- Boş durum: InboxIcon + `Önce bir adres oluşturun` / `Henüz mail yok`. Alt ipucu.
**Durum**: `search`.
**Etkileşim**: arama (gönderen/konu), satır tık seç, OTP kopyala, sil (confirm),
yenile.
**Tasarım notu**: `min-h-[430px] xl:min-h-[590px]`. `bg-brand-surface/55` satır,
seçili `bg-brand-surface2/88 border-accent-blue/35` mavi glow. Türkçe sabit.

#### 4.3.3 EmailView (`EmailView.jsx`) — sağ panel
**Amaç**: Tek mail detayı. Gönderen/konu/tarih, büyük OTP blok, HTML/Metin
değiş, sanitiz edilmiş HTML iframe, ek indirme, Yanıtla/Kapat.
**Görünür**:
- `card`. Boş: katmanlı dairesel dekor + Mail + Sparkles, `Bir e-posta seçin`.
- Yüklü: başlık (Mail tile, `E-posta Detayı` / `Mesaj içeriği ve ekler`,
  `Yanıtla` ikincil, ghost Trash2, Kapat X), meta satırları (`Gönderen`/`Konu`/`Tarih`).
- OTP blok (`email.otp_code` varsa): mor-gradient panel, `KeyRound`,
  `Doğrulama Kodu`, büyük mono `tracking-[0.28em]` kod, Copy/Kopyalandı.
- HTML/Metin değiş (`Globe`/`AlignLeft`).
- Gövde: HTML → `<iframe>` (DOMPurify sanitiz, sandbox, auto-resize), Metin → `<pre>`.
- Ekler: Download ikonları + boyut.
**Durum**: `mode` (html/text), `otpCopied`, `iframeRef`.
**Etkileşim**: HTML/Text değiş, OTP kopyala, yanıtla, kapat, ek indir.
**Tasarım notu**: DOMPurify whitelist. iframe `Plus Jakarta Sans`, `#091326` bg,
`#34D7FF` linkler. `animate-slide-up` OTP. Türkçe sabit.

### 4.4 Domains (`#/domains`)
Statik kart: aktif domainlerin grid'i, wildcard rozetleri.

### 4.5 Account (`#/account`)
#### 4.5.1 AccountPanel (`AccountPanel.jsx`)
**Amaç**: Üye (veya guest) hesap özeti. Avatar, plan rozeti, kullanım halkası
(conic-gradient), istatistik kutuları, geçmiş/şifreli geçmiş açılır, `AccountEditorModal` açar. Guest varyantı Sign in/Sign up CTA.
**Görünür**:
- `account-summary-panel card`. Başlık + `Ayarlar` (Pencil) + `Çıkış` (LogOut,
  btn-danger) — üyelerde; guest'te Sign in/Sign up.
- Profil paneli: avatar (gradyan daire veya img), hesap alan etiketi, görünen
  ad, `@username`, plan rozeti (`badge-gold` admin / `badge-blue` pro /
  `badge-green` free) + `Aktif`, kullanım halkası (conic-gradient 24×24 + yüzde).
- İstatistik grid (Adres/Mail/Plan/Domain). Kullanım barı
  (`from-accent-blue to-accent-cyan`).
- 2 açılır panel: `Son Kullanılanlar` (badge-blue sayı) + `Tüm Şifreli
  E-Postalar` (badge-purple, Lock).
- Başarı/hata flash banner.
- Gizli sekme blok (`display:none`, eski — modal tarafından değiştirildi).
- `AccountEditorModal` mounted.
**Durum**: `tab`, `center` (sessions/history/favorite_domains/addresses),
`loading`, `saving`, `error`, `message`, `showProfileEditor`,
`showRecentHistory`, `showPasswordedHistory`, `avatarLoadError`, `profileDraft`,
`profilePhotoPreview`, `emailDraft`, `emailCode`, `emailStep`, `emailPending`,
`passwordDraft`, `prefDraft`, `addressDrafts`.
**Etkileşim**: Ayar aç (`useImperativeHandle` `openSettings`), çıkış, açılır
değiş, flash 3.5s auto-clear. Modal içinde: profil kaydet, email değiş talep/
  onay, avatar yükle, şifre değiş, tercih kaydet, adres kaydet/yenile/sil,
  oturum kapat, favori domain değiş, ses önizle.
**API**: `/api/auth/me`, `/api/auth/sessions`, `/api/auth/login-history`,
  `/api/auth/me` (PUT), `/api/auth/request-email-change`,
  `/api/auth/confirm-email-change`, `/api/auth/change-password`,
  `/api/auth/profile-photo`, `/api/auth/preferences`, `/api/auth/addresses/:id`
  (PUT/renew/DELETE), `/api/auth/sessions/:id` (DELETE),
  `/api/auth/favorite-domains/:id` (POST/DELETE).
**Tasarım notu**: `forwardRef` + `useImperativeHandle`. `keep-white-ink` light
modda avatar metin çevirmeyi kapatır. Conic-gradient halka. Türkçe. adminUtils.

#### 4.5.2 AccountEditorModal (`AccountEditorModal.jsx`)
**Tip**: modal (`compact size="3xl"`).
**Amaç**: Tam hesap düzenleme. 2 kolon: sol sidebar nav (6 sekme) + sağ içerik.
**Görünür**:
- `account-settings-shell` flex row. Sidebar (`aside lg:w-[285px]`): kapat X,
  başlık, avatar kartı + durum rozetleri, 6 düğmeli nav (Genel/Profil/Güvenlik/
  Tercihler/Oturumlar/Kullanım), ipucu kutusu.
- İçerik sekme başlığı + `renderTabContent()`:
  - **Genel**: durum rozeti, `SettingRow` list (Tema select, Dil select, Varsayılan
    domain select, Bildirim sesi select + önizle), 3 `StatTile` (Adres/Mail/Favori).
  - **Profil**: avatar + görünen ad + `@username`, durum/bekleyen rozet, display
    name + username input (kilitli ise disabled), email değiş kartı (edit/verify
    adım + kod), yükle/sıfırla/kaydet. Yan: hızlı durum, profil meta.
  - **Güvenlik**: şifre değiş (mevcut/yeni/tekrar), güvenlik durumu satırları,
    hesap notu. Yan: güvenlik durumu, hesap notu listesi.
  - **Tercihler**: `ToggleSwitch` (notify_new_mail/notify_otp/notify_expiring/
    notify_security), favori domain toggle listesi (Star), mail retention sayı,
    bildirim sesi select + önizle, kaydet.
  - **Oturumlar**: aktif oturum listesi (browser/device, IP, son görülme,
    `Bu oturum`/`Şüpheli` rozet, `Kapat`), giriş geçmişi (tarih/ip/device/browser,
    Başarılı/Başarısız rozet).
  - **Kullanım**: 4 StatTile, plan kartı + kullanım barı, domain/adres sayı,
    `Limit Yükselt` (pro değilse).
**Tasarım notu**: Modal içinde karanlık cam — `border-white/8`, `bg-white/[0.04]`,
`text-white` (light override'lar remap eder). i18n `accountModal.*`.

### 4.6 Bulk Studio (`#/bulk`, üyeler)
**Tip**: sahne. **Amaç**: Pro/Pro+ (`bulk_access_enabled`) bulk adres havuzu
kurucu. Prefix + domain + count → atomik üretim. İlk/son adres canlı önizleme.
Havuz listesi + "Mailleri aç" (BulkInbox modal) + "Devam et".
**Görünür**:
- `ops-page bulk-studio`. `ops-page-header` (`BULK STUDIO`, `Plan` stat).
- `bulk-layout` grid:
  - Sol `bulk-builder` (`01` adım, `Yeni adres serisi`, Sparkles, prefix input +
    canlı ilk adres önizleme, domain select, `Kaç adres?` `bulk-counts`
    5/10/25/50/100 + sayı (1-100), `Adresleri oluştur`, hata).
  - Sağ `bulk-preview` (`02` adım, `Canlı önizleme`, ilk/son adres kod blokları,
    `next_index` notu, başarı paneli copy/download).
- `bulk-pool-list` (`03` adım, `Havuzların`, sayı, havuz grid: `prefix_*@domain`,
  adres sayı + next index, `Mailleri aç` birincil, `Devam et` ikincil, copy icon).
- Boş: `Henüz bir havuz oluşturmadınız.` Erişim reddedildi: `Bulk Studio erişimi kapalı`.
**Durum**: `pools`, `prefix`, `domain`, `count`, `loading`, `error`, `result`.
**Etkileşim**: prefix yaz (`^[a-z0-9][a-z0-9._-]{0,39}$`), domain seç, count seç,
havuz oluştur, havuz inbox aç (`onOpenPool`), devam et (formu doldur), kopyala,
TXT indir.
**API**: `/api/addresses/bulk` (GET/POST).
**Tasarım notu**: `COUNTS=[5,10,25,50,100]`.
`canUseBulk = isAdmin || (role==='pro' && ['pro','pro_plus'].includes(pkg.name) && user.bulk_access_enabled)`.

### 4.7 BulkInbox (`Modal size="full"`)
**Tip**: popup (Modal içinde). **Amaç**: Bir prefix havuzunun tüm mailbox'larında
tek akışta mail. Arama, OTP-only filtre, alıcı/gönderen/OTP/zaman tablosu, satır
OTP kopyala, load-more cursor sayfalama.
**Görünür**:
- `ops-page bulk-inbox-page`. Başlık (`BULK INBOX`, `prefix_*@domain` mono span,
  mailbox + mail/OTP sayı, `Yenile`).
- Araç çubuğu (Search + `Yalnız OTP` toggle + ipucu Sparkles). Hata banner.
- `bulk-mail-table` 4 kolon (Alıcı mailbox / Gönderen+konu / OTP / Zaman):
  `bulk-mail-recipient` (mono + `#id`), `bulk-mail-summary`, `bulk-mail-otp`
  (gold kenar kod butonu Copy/Check veya `—`), `<time>`.
- Boş: RefreshCw spin veya MailOpen. `bulk-load-more` (`nextCursor` varsa).
**Durum**: `data`, `query`, `otpOnly`, `loading`, `loadingMore`, `error`,
`copiedOtp`, `selected`.
**Etkileşim**: arama (debounced 220ms), OTP-only, yenile, OTP kopyala, satır seç,
daha fazla.
**API**: `/api/addresses/bulk/:poolId/emails?limit=100&q=&otp_only=&cursor=`.
**Tasarım notu**: `Intl.DateTimeFormat('tr-TR')`. `copiedOtp` 1.4s. 820px'de
2-kolon, 480px'de head gizli.

### 4.8 Automation Center (`#/automation`, üyeler)
**Tip**: sahne. **Amaç**: API anahtarı + webhook yönetimi. Anahtar: scope + rate
limit + master (admin). Webhook: olay aboneliği. Aç/kapat/iptal. Tek seferlik
secret banner.
**Görünür**:
- `ops-page automation-page`. `ops-page-header` (`AUTOMATION CENTER`).
- `ops-secret` altın banner (yeni secret varsa: etiket + kod + Kopyala). Hata.
- `automation-grid` 2 kolon:
  - Sol `ops-card` (`API` adım, `API anahtarı`, KeyRound, isim, rate limit sayı,
    master checkbox (admin), `İzinler` `choice-grid` SCOPE_OPTIONS, `Anahtar oluştur`,
    anahtar listesi: isim/MASTER, `key_prefix••••`, durum/rate/kullanım, son
    kullanım, Power toggle + Trash2).
  - Sağ `ops-card` (`WEBHOOK` adım, `Bildirim hedefi`, Webhook, isim, HTTPS URL
    mono, `Olaylar` `choice-grid` EVENT_OPTIONS, `Webhook ekle`, hook listesi:
    isim/url/olaylar + Power toggle).
**Durum**: `keys`, `hooks`, `keyName`, `keyScopes`, `keyRateLimit`, `masterKey`,
`hookName`, `hookUrl`, `hookEvents`, `secret`, `message`.
**Etkileşim**: anahtar oluştur (scope toggle, rate, master), webhook oluştur
(olay toggle), secret kopyala, anahtar aç/kapat/iptal, hook toggle.
**API**: `/api/automation/api-keys` (GET/POST/DELETE/PUT),
  `/api/automation/webhooks` (GET/POST/PUT).
**Tasarım notu**: `EVENT_OPTIONS=['email.received','otp.detected','address.expiring','bulk.completed']`.
`SCOPE_OPTIONS=['addresses:read','addresses:write','emails:read','emails:delete','bulk:write','webhooks:manage']`.
Master → tüm scope zorunlu + disabled. Varsayılan `keyRateLimit=120`,
`keyScopes=['addresses:read','emails:read']`, `hookEvents=['email.received']`.
Guest → `ops-empty` "Otomasyon için giriş yapın".

### 4.9 Documentation Center (`#/docs`)
**Tip**: sahne. **Amaç**: App içi operasyon el kitabı. 5 makale (start, api,
mail, bulk, server). 3 panelli yerleşim: konu kütüphanesi, okuyucu kolon
(numaralı adımlar + kod blok + not), yan kartlar.
**Görünür**:
- `docs-center`. `docs-hero` (mark tile `MS TEMP MAIL`, `OPERATIONS HANDBOOK`,
  `İşi yap, yolu ara.`, `docs-hero-signal` yeşil "Canlı sözleşme").
- `docs-search` (Search + input + `⌘ K` kbd).
- `docs-layout` 3 kolon: `docs-library` (konu butonları: ikon + kategori + başlık
  + ChevronRight, aktif cyan inset shadow), `docs-reader` (ikon tile + kategori +
  başlık + açıklama; `docs-steps` sıralı liste mono `01`/`02` + h3 + p;
  `CodeBlock` TerminalSquare header + copy + pre; `docs-note` altın Clipboard),
  `docs-sidecards` (Cloud/Workflow/Globe2 ipuçları).
**Durum**: `activeId`, `query`. Makaleler sabit `const` array.
**Etkileşim**: arama (kategori/başlık/açıklama/adım/kod), makale seç, kod kopyala.
**Tasarım notu**: Makaleler: Hızlı başlangıç / API key / OTP+realtime / Bulk
Studio / SMTP+DNS+deployment. Her biri 4 adım + kod + not. `CodeBlock` 1.3s
kopya. 1100px'de sidecards gizli, 720px'de library yatay kayar.

### 4.10 Admin (`#/admin`, admin)
#### 4.10.1 AdminPanel (`AdminPanel.jsx`)
**Tip**: sahne (admin operasyon merkezi). **Amaç**: Tam admin kontrol. Admin
JWT veya `x-admin-password` geçidi. Sekmeli: Dashboard, Adresler, Domainler,
Mailler, Kullanıcılar, Bulk Havuzları, İstekler, Ayarlar. + Adres detay alt
görünüm + DNS Docs modal.
**Giriş geçidi** (`!auth`): ortalanmış kart, Shield, `Admin Paneli`, şifre input
(`admin123` placeholder), `Giriş Yap`, ipucu.
**Adres detay alt görünüm**: geri butonu, büyük mono adres + durum pill, 6
`AdminStatCard` (Durum/Domain/Toplam Mail/OTP/Son Aktivite/Saklama), 3 kolon:
Genel Bilgiler (`AdminInfoRow`), İstatistikler (2×2), Güvenlik ve İşlemler
(copy/cleanup/delete). İkinci grid: OTP Geçmişi (mor rozet listesi) + Gelen
Mailler (tablo + detay `body_text` pre + ek linkleri).
**Ana görünüm**: `AdminHero` (ikon, `Admin Paneli`, alt başlık, eylemler
`Yeni Domain Ekle`/`Temizle`/`Dışa Aktar`, sekme pilleri). Flash banner. Sekmeler:
- **dashboard**: 5 `AdminStatCard` (Toplam Mail/Toplam Adres/Son 24 Saat/OTP
  Kodları/Aktif Domain); Mail Trafiği `AreaChart` (incoming/otp/attachments,
  gradient fill), Sistem Durumu, Son Aktiviteler timeline; Domain Yönetimi tablo
  (top 5), Güvenlik ve Temizlik özet; Son Mailler tablo + Mail Dağılımı
  `PieChart` + legend.
- **addresses**: 4 stat kart, `AdminToolbar` (arama + durum/domain/sıra select +
  clear), adres tablosu (E-posta/Durum/Oluşturulma/Son Aktivite/Mail Sayısı/
  Domain/Saklama/İşlem: Eye/Copy/ListRestart/Trash2), sayfalama.
- **domains**: `AdminToolbar` (Yeni Domain Ekle toggle, Refresh, sayı), inline
  ekle formu (domain + wildcard toggle), domain kartları: domain + Aktif/Pasif +
  Wildcard rozet, Düzenle/Domain Docs/Aktifleştir-Pasifleştir/Genişlet-Daralt/Sil;
  5 kolon stat (Sunucu IP/MX/Oluşturulma/Wildcard/Toplam Adres); açılır Alt
  Domainler (ekle input + alt domain kartları: Globe, `demo@sub`, aktif sayı,
  Copy/Sil).
- **emails**: 8/4 grid — tüm mailler tablosu (Gönderen/Alıcı/Konu/Tarih/Etiket/
  İşlem, OTP/Ekli/Normal rozet, Eye/ExternalLink/Trash2) + sayfalama; Mail Detayı
  panel (`pre` body + OTP copy + ekler).
- **users**: kullanıcı tablosu (Kullanıcı/Rol/Adres/Mail/Bulk/Son giriş/Durum/
  İşlem), rol select (free/pro/admin), paket select (free/pro/pro_plus), pro
  için Bulk Aç/Kapat, Pasifleştir/Aktifleştir.
- **bulk**: 3 stat kart (Aktif Havuz/Üretilen Adres/Yetkili Kullanıcı), arama,
  bulk havuz tablosu (Sahip/Paket/Havuz/Adres/Son üretim/Yetki).
- **requests**: Pro istek kartları (username, durum rozeti, email, mesaj, tarih,
  Onayla/Reddet).
- **settings**: 3 kolon — Genel Ayarlar (sayı + `Tüm Veriyi Yenile`), Bildirim
  Sesi (select + önizle + açıklama), Operasyon Özeti (sayı + `Admin Oturumunu
  Kapat`).
**DNS Docs Modal** (`size="3xl"`): başlık `DNS Kayıt Kurulumu`, domain kartı +
kopya, kayıt tipi rozetleri (A/MX/SPF/DKIM/DMARC), Sunucu IP input + kopya, DNS
kayıtları grid (6 kart: A/MX/SPF/Verification/DKIM/DMARC, alanlar + Kopyala,
ton-kodlu kabuk), Wildcard Subdomain DNS tablosu (A/TXT/MX + kopya)
(`wildcard_subdomains===1` ise), 3 bilgi kartı (Nasıl Kullanılır/Yayılma
Süresi/Doğrulama), alt bilgi Kapat/Doğrulamayı Yenile/Tüm Değerleri Kopyala.
**Domain Edit Modal**: domain adı, Sunucu IP input + kopya, wildcard toggle, not.
**Durum**: çok (pw, auth, loading, err, ok, tab, domains, stats, addrs, emails,
emailsTotal, emailsPage, users, requests, bulkPools, bulkQuery, showDomainForm,
newDom, newDomWildcard, docsDomain, docsIp, docsRefreshing, editingDomain,
editDomainIp, editDomainWildcard, domainSubdomains, subdomainDrafts,
addingSubdomainTo, loadingSubdomains, expandedDomains, selectedAddress,
selectedAddressDetail, selectedAddressMail, selectedGlobalMail, addressQuery,
addressDomainFilter, addressStatusFilter, addressSort, addressPage).
**API**: `/api/admin/stats`, `/api/admin/domains`, `/api/admin/addresses`,
  `/api/admin/addresses/:address`, `/api/admin/addresses/:address/cleanup`,
  `/api/admin/emails`, `/api/admin/emails/:id`, `/api/admin/users`,
  `/api/admin/users/:id/{role,package,status,bulk-access}`,
  `/api/admin/package-requests`, `/api/admin/bulk-pools`,
  `/api/admin/bulk-pools/:id/{status,addresses}`, `/api/admin/cleanup`,
  `/api/admin/domains/:id`, `/api/admin/domains/:id/subdomains`,
  `/api/emails/single/:id`, `/api/emails/:id/attachments/:attId`.
**Tasarım notu**: `CHART_COLORS=[#3B82FF,#27D59B,#F5C84C,#7A63FF,#34D7FF]`.
`ADDRESS_PAGE_SIZE=10`. `admin-signal-card` üst aksan. Recharts tooltip `#0A1329`.
`sanitizeIpInput` (`[0-9.]`). 8 sekme. Admin şifre `localStorage('tm-admin-pw')`.

#### 4.10.2 AdminBulkStudio (`#/admin-bulk`, admin)
**Tip**: sahne. **Amaç**: Admin-only bulk üretim + sahip override. Admin kullanıcı
seçer, prefix + domain + count ile onun adına üretir (kota override). Tüm havuzlar
+ durum kontrolleri (aktif/pause/archive) + CSV dışa aktarma.
**Görünür**:
- `ops-page admin-bulk-page`. `ops-page-header` (`ADMIN BULK CONTROL`, `Aktif
  havuz` stat).
- `admin-bulk-layout` grid: sol `admin-bulk-builder` (`NEW` adım, `Yönetici
  üretimi`, UserRoundPlus, sahip select `username · package · count`, sahip kota
  notu altın, prefix, domain, `bulk-counts` 10/25/50/100, `Admin override ile üret`,
  mesaj), sağ `admin-bulk-guide` (`CONTROL` adım, açıklama listesi + kalın durum
  adları).
- `bulk-operations` kart `POOLS`, arama + durum filtre, havuz satırları
  (`prefix_*@domain`, sahip, durum pill, Play/Pause/Archive/Download).
**Durum**: `users`, `pools`, `ownerId`, `prefix`, `domain`, `count`, `query`,
`status`, `loading`, `message`.
**Etkileşim**: sahip seç, prefix, domain, count, üret, ara, filtrele,
aktif/pause/archive, CSV aç (`/api/admin/bulk-pools/:id/addresses?limit=500`).
**Tasarım notu**: `COUNTS=[10,25,50,100]`. `admin-owner-note` altın sol kenar.

---

## 5. Modal envanteri

| Modal | Tetikleyici | Boyut | İçerik |
|---|---|---|---|
| Password Required | Şifreli adres açma | sm | input + İptal/Giriş |
| Set Password | Protect (Pro) | sm | input + İptal/Kaydet |
| Compose / New Mail | Yanıtla (Pro) | wide | From/To/Subject/Body + İptal/Gönder |
| Pro Request | Pro'ya Geç | md | özellik listesi + mesaj + İptal/Gönder |
| Bulk Inbox | BulkStudio `Mailleri aç` | full | `BulkInbox` sahnesi |
| Confirm Refresh/Random | AddressBar | sm | onay + İptal/Devam |
| Account Editor | AccountPanel Ayarlar | compact 3xl | 6-sekme sidebar |
| DNS Docs | AdminPanel Domain Docs | 3xl | 6 kayıt kartı + wildcard tablo |
| Domain Edit | AdminPanel Düzenle | sm | IP + wildcard + not |
| Error Fallback | render crash | — | `Sayfayı Yenile` |

---

## 6. Tasarım sistemi primitifleri

- **Modal** (`Modal.jsx`) — portal, boyut sm/md/lg/xl/2xl/3xl/full, compact,
  ESC + scroll lock.
- **Skeleton** (`Skeleton.jsx`) — `SkeletonLine`, `InboxSkeleton`,
  `EmailViewSkeleton`.
- **AdminPanelCard** (`AdminPrimitives.jsx`) — başlıklı kart + ikon + aksiyon,
  `admin-signal-card` aksan.
- **AdminStatCard** — tonlu stat tile + üst aksan çizgisi.
- **AdminEmptyState** — kesik kenar boş durum.
- **AdminInfoRow** — etiket/değer satırı.
- **AdminToolbar** — filtre çubuğu wrapper.
- **StatusPill** (AdminPanel lokal) — durum rozeti sarmalayıcı.
- **AdminHero** (AdminPanel lokal) — sayfa başlığı + ikon + sekme pilleri.
- **OptionBadge** (AccountPanel lokal) — toggle, mavi/mor/yeşil.
- **SidebarNavButton / SettingRow / SmallSelect / ToggleSwitch / StatTile /
  Avatar** (AccountEditorModal lokal) — modal-içi primitifler.
- **CodeBlock** (DocumentationCenter lokal) — kod snippet + kopya.

---

## 7. Kullanıcı tipleri & yetki matrisi

| Özellik | Guest | Free | Pro | Pro+ | Admin |
|---|---|---|---|---|---|
| Rastgele/adres üret | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inbox/EmailView | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adres şifrele (Protect) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Compose/yanıtla | ✗ | ✗ | ✓ | ✓ | ✓ |
| Bulk Studio | ✗ | ✗ | ✓ (bulk_access) | ✓ | ✓ |
| Automation (API/webhook) | ✗ | ✓ | ✓ | ✓ | ✓ |
| Account Editor | sınırlı | ✓ | ✓ | ✓ | ✓ |
| Admin Panel | ✗ | ✗ | ✗ | ✗ | ✓ |
| Admin Bulk | ✗ | ✗ | ✗ | ✗ | ✓ |
| Pro Request | ✓ (Free) | — | — | — | — |

**Paket kotaları** (guest): 3 adres, 50 mail, 7 gün saklama. Free/Pro/Pro+
artan. `GUEST_USER`, `GUEST_PACKAGE`, `GUEST_STATS` fallback.

---

## 8. API yüzeyi (UI'nin çağırdığı)

- **Auth**: `/api/auth/{register,login,me,request-pro,request-email-change,
  confirm-email-change,preferences,change-password,profile-photo,sessions,
  login-history,favorite-domains,addresses,addresses/:id,renew}`.
- **Addresses**: `/api/addresses/{domains,random,set-password,check,:address,login,
  bulk,bulk/:id/emails,bulk/:poolId}`.
- **Emails**: `/api/emails/{:address,single/:id,:id,send,send/status,
  :id/attachments/:attId}`.
- **Admin**: `/api/admin/{stats,domains,domains/:id,domains/:id/subdomains,
  addresses,addresses/:address,addresses/:address/cleanup,emails,emails/:id,
  users,users/:id/{role,package,status,bulk-access},package-requests,
  package-requests/:id,bulk-pools,bulk-pools/:id/{status,addresses},cleanup}`.
- **Automation**: `/api/automation/{api-keys,api-keys/:id,webhooks,webhooks/:id}`.
- **Health**: `/api/health`.
- **Auth yöntemi**: JWT Bearer; admin alternatif `x-admin-password`.
- **Socket.io**: `subscribe` / `new-email`.

---

## 9. UI/UX notları (dokümanlardan)

- Marka `MS Temp Mail`, stüdyo `Mamak Studio`, dev `Emir Han Mamak`.
- Adres satırı görsel bölme: username beyaz, `@` kırmızı, domain mavi.
- Domain seçici: native `<select>` → zengin portal dropdown + alt domain ağacı.
- Geçmiş dropdown: adres kartı tarafından kırpılmaz (portal + layout-aware).
- Hesap yeniden adlandırma: `/api/auth/me` PUT → yeni JWT.
- Admin panel markası `MS Temp Mail` olarak güncellendi.
- Doküman merkezi: app içi `Dokümanlar` hub.
- Domain DNS: `server_ip`, A, MX, SPF TXT, verification TXT, DKIM TXT, DMARC TXT.
  Admin `DNS Ayarları` (edit) + `Domain Docs` (kopyalanabilir kurulum).
  Varsayılanlar `MAIL_SERVER_IP`'ten.
- README özellik listesi: tek tık rastgele adres, gerçek zamanlı mail (Socket.io +
  adaptif polling), HTML+text görünüm, ek indir, çoklu domain, 1 saat varsayılan
  TTL (paket-bazlı saklama), admin panel, otomatik temizlik.
- Deployment: Docker + Coolify; port 25 doğrudan açılmalı (Coolify proxy SMTP
  yapamaz); HTTP/HTTPS proxy.

---

## 10. Bilgi grafiği içgörüleri (tasarım için)

- **God node** `getDb()` (30 kenar) — tüm route'lar tek SQLite erişim noktasından
  geçer. UI'da veri tutarlılığı kritik; her sahne `apiFetch` envelope'unu açar.
- **God node** `apiFetch()` (13 kenar) — merkezi fetch + envelope çözüm. Yeniden
  tasarımda yükleme/hata durumları burada merkezileştirilmeli.
- **Topluluk**: React App Shell (63 node, cohesion 0.05 — zayıf iç bağ). En büyük
  ama en gevşek topluluk. Tasarımcı burayı modüllere ayırmayı düşünmeli.
- **Topluluk**: Admin UI Components (cohesion 0.19) — en sıkı. Admin primitifleri
  tutarlı; örnek alınmalı.
- **Surprising**: `apidoc.md` ↔ `docs/API.md` paralel API tanımları; `README.md`
  ↔ `Coolify.md` paralel domain açıklamaları. UI'da tek kaynak olmalı.
- **AMBIGUOUS kenar**: `Package Quota System` ↔ `Mailbox Ownership Check` —
  ilişki belirsiz. Tasarımcı kota + sahiplilik UI'ını netleştirmeli.
- **168 izole node** — `package.json` bağımlılık adları, `statusline.sh`, config
  dosyaları. UI'ı etkilemez ama "knowledge gap"; tasarımı bozmaz.

---

## 11. Tasarımcı AI'ya görev — v3 redesign planı

Yukarıdaki envanter mevcut gerçeği anlatır. Senin görevin **bunu değerlendirip
v3 planı üretmek**. Her bölümde önce **düşünceni yaz** (neden böyle olmalı,
kullanıcı ne hisseder, hangi trade-off'u seçiyorsun), sonra **somut yönü** ver.
Sadece listeleme — envanter zaten yukarıda. Akıl yürüt.

### A. Genel tasarım yönü

- Bir temp-mail aracının duygusal tonu ne olmalı? (hızlı, tek kullanımlık,
  özel, hafif yeraltı? yoksa temiz, güvenilir, profesyonel?)
- v3 karanlık-öncelikli cam + gradient kimliği korusun mu, yoksa pivot mu?
  İki tarafı da kısaca savun, birini seç, bağlan.
- MS Temp Mail'i "bir başka cam dashboard"dan ayıran tek görsel imza ne?

### B. Sahne-bazlı redesign

8 sahne + auth overlay + loading + error fallback için tek tek:

- Kullanıcının buradaki tek işi ne? Mevcut yerleşim buna hizmet ediyor mu?
- Yerleşim önerisi (bölgeler, grid, hiyerarşi) — uzamsal tarif et.
- Ne büyür, ne küçülür, ne kalkar.
- Kilit durumlar: boş, yükleniyor, hata, gerçek-zamanlı-aktif.
- Bu sahneyi "özenli" hissettiren tek detay.

Özellikle dikkat:

1. **Inbox sahnesi** — kullanımın %80'i. Adres çubuğu + liste + detay klasik
   üç-panel mail problemi. Adresin kendisi (ürünün çekirdek artefaktı) nasıl
   kahraman olur? OTP kodu (kullanıcının asıl geldiği şey) bağırmadan nasıl
   öne çıkar?
2. **Auth overlay** — 3 katman kartı + giriş/kayıt sekmesi. Dönüşüm yüzeyi.
   Guest→Free→Pro 3 saniyede nasıl okunur?
3. **Admin sahnesi** — 8 sekme çok. Farklı bir navigasyon örüntüsü mü (bölümler,
   breadcrumb, komut paleti)? Dashboard'daki AreaChart + PieChart alanını
   hak ediyor mu?
4. **Bulk Studio → Bulk Inbox akışı** — kurucu → tam-modal akış. Uzun bir mail
   akışı için modal doğru kap mı?

### C. Navigasyon & kabuk

- Bugün 3 paralel nav sistemi var (header pills, sol rail, mobil alt). Yedekli
  mi, katmanlı mı? v3 nav modelini masaüstü ve mobil için öner.
- Mevcut adres kabukta nerede yaşamalı? Her yerde görünür mü, sahneye özgü mü?
- Kullanıcı menüsü, toastlar, bildirim sesi kontrolü — nereye oturur?

### D. Modal sistemi

- 9 modal, 3 farklı boyut deyimi. Tutarlı bir sistem öner: hangi yüzeyler modal,
  hangileri drawer, hangileri satır-içi genişleme, hangileri ayrı sahne olmalı.
- Account Editor 6 sekmeli bir modal — ayarlar sayfası mı aslında?
- DNS Docs kopyalanabilir kayıtlarla içerik-ağır — modal, slide-over, yoksa
  ayrı admin alt sayfası mı?

### E. Tasarım sistemi v3

- Token evrimi: 6 vurgu rengi de yerini hak ediyor mu? Semantik roller
  (success/warning/info/danger) ile dekoratif vurgular ayrılmalı mı?
- Tip skalası: Plus Jakarta Sans her yerde mi, yoksa adres kahramanı için
  bir display yüzü mü?
- Boşluk/yarıçap: 22px kart, 24px tile, 26px panel — tek skalaya indir.
- Yükseklik modeli: cam blur vs. opak yüzey vs. kenarlık — tek kural seç.
- Dark/light: çift tema kalsın mı? İki temada aynı hiyerarşi mi, farklı ruh mu?
- İkonografi: lucide-react bugün her yerde — koru, yoksa OTP/adres/domain için
  özel işaret mi?

### F. Mikro-etkileşim & hareket

- Yeni mail varışı: bugün toast + beep + liste başına ekleme. İdeal varış
  koreografisi (ses, hareket, OTP yüzeye çıkarma) — canlı ama gürültülü değil.
- Panoya kopyalama anları (adres, OTP, DNS kayıtları, API secret) — uygulamanın
  en sık eylemi. Geri bildirim örüntüsünü bir kez tasarla, her yere uygula.
- Gerçek zamanlı durum (Canlı/Bekliyor) — socket durumu ne kadar görünür olmalı?
- Skeleton, spinner, ilerleme — tek yükleme dili.

### G. i18n & içerik

- Türkçe varsayılan, kısmi İngilizce. v3 stratejisi: tam çift-locale mi, yoksa
  Türkçe-öncelikli + İngilizce katmanlı mı? TR/EN metin uzunluğu yerleşimi
  nasıl etkiler?
- Ses tonu: oyuncu, klinik, hacker? Seçtiğin tonda 3 örnek string yaz.

### H. Önceliklendirme

- Sahibi planından sadece 3 şey inşa edebilirse hangi 3, neden? Etki/efort
  oranına göre sırala.

### Kurallar

- Tasarımcı gibi düşün, geliştirici gibi değil: kullanıcı hedefi, hiyerarşi,
  his, akış.
- Görüş belirt. "Duruma göre değişir" plan değildir — yön seç, bağlan.
- Envantere isimle referans ver (AddressBar, BulkInbox, ops-page,
  admin-signal-card vb.) — sahip planı koda eşleyebilsin.
- Türkçe UI stringleri Türkçe kalır; G bölümünde aksini savunmadıkça.
- Kod yok. Yerleşimler sözle; gerekiyorsa ASCII tel kafes.

---

## 12. Ek bağlam: dosya → sahne eşlemi

| Dosya | Sahne/Primitif |
|---|---|
| `client/src/main.jsx` | ErrorBoundary + root |
| `client/src/App.jsx` | App kabuğu + navigasyon + 5 modal |
| `client/src/index.css` | Tasarım sistemi |
| `client/src/i18n.js` | i18n sağlayıcı |
| `client/src/hooks/useAuth.js` | Yetki durumu |
| `client/src/utils/apiFetch.js` | Fetch wrapper |
| `client/src/utils/notificationSound.js` | WebAudio sesler |
| `client/src/components/AuthPage.jsx` | Auth overlay |
| `client/src/components/AddressBar.jsx` | Adres besteci |
| `client/src/components/Inbox.jsx` | Mail listesi |
| `client/src/components/EmailView.jsx` | Mail detay |
| `client/src/components/AccountPanel.jsx` | Hesap özeti |
| `client/src/components/AccountEditorModal.jsx` | Hesap düzenleme modal |
| `client/src/components/AdminPanel.jsx` | Admin operasyon merkezi |
| `client/src/components/AdminBulkStudio.jsx` | Admin bulk |
| `client/src/components/BulkStudio.jsx` | Kullanıcı bulk |
| `client/src/components/BulkInbox.jsx` | Bulk inbox popup |
| `client/src/components/AutomationCenter.jsx` | API key + webhook |
| `client/src/components/DocumentationCenter.jsx` | Operasyon el kitabı |
| `client/src/components/Modal.jsx` | Modal primitif |
| `client/src/components/Skeleton.jsx` | İskelet primitif |
| `client/src/components/admin/AdminPrimitives.jsx` | Admin kartlar |
| `client/src/components/admin/adminUtils.js` | Format/sıralama yardımcı |

---

*Bu doküman graphify bilgi grafiği + tam kaynak okuması ile üretildi.
Tasarımcı AI: yukarıdaki her bölümü kullanarak bir v3 redesign planı üret.*
