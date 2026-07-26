# MS Temp Mail API

`https://tempmail.emirhanmamak.com/api` için programatik sözleşme.

## Kimlik doğrulama

`/api/health`, kayıt ve giriş dışında veri endpoint'leri kimlik doğrulaması ister. Otomasyonlarda bir `tm_` API key kullanın:

```bash
export CUSTOM_TEMPMAIL_TOKEN='tm_...'
curl -H "X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN" \
  'https://tempmail.emirhanmamak.com/api/addresses/domains?flat=1'
```

`Authorization: Bearer tm_...` eşdeğerdir. Web paneli kendi JWT oturumuyla çalışmaya devam eder; otomasyonlar için API key zorunlu sözleşmedir. Key, kullanıcı **Otomasyon** ekranından; master key ise admin hesabındaki aynı ekrandan oluşturulur. Admin ayrıca yönetim API’siyle herhangi bir kullanıcı için standard key oluşturabilir.

- Tüm key'ler `tm_` ile başlar ve tam değeri yalnız oluşturma yanıtında verilir.
- Standard key scope’ları: `addresses:read`, `addresses:write`, `emails:read`, `emails:delete`, `bulk:write`, `webhooks:manage`.
- Admin master key (`tm_master_...`) tüm scope’lara ve admin endpoint’lerine sahiptir.
- Standard kullanıcılar en fazla 1.000 istek/dk, master key’ler en fazla 10.000 istek/dk yapılandırabilir. Her key kendi rate limitini taşır.
- Pasifleştirilmiş veya iptal edilmiş key 401 döner. Kullanım sayısı, son kullanım zamanı ve IP kaydedilir.

## Yanıt biçimi

JSON yanıtları envelope kullanır:

```json
{ "success": true, "data": { "address": "bot_0@example.com" } }
```

```json
{ "success": false, "error": "domain_not_active", "message": "Domain bulunamadı veya aktif değil" }
```

Attachment indirme ve SSE stream binary/stream olduğu için envelope dışındadır. Bot, HTTP hata kodu yanında `error` alanını kontrol etmelidir. Sık kullanılan kodlar: `unauthorized`, `forbidden`, `rate_limited`, `invalid_request`, `invalid_domain`, `domain_not_active`, `address_exists`, `password_required`, `quota_exceeded`.

## Temel otomasyon akışı

```bash
# 1. Aktif domain seç
curl -H "X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN" \
  'https://tempmail.emirhanmamak.com/api/addresses/domains?flat=1'

# 2. Adres oluştur. Aynı adres varsa mevcut mailbox döner.
curl -X POST -H "X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"gork_0","domain":"mmkgams.space"}' \
  'https://tempmail.emirhanmamak.com/api/addresses'

# 3. Yeni maili long-poll ile en fazla 25 saniye bekle.
curl -H "X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN" \
  'https://tempmail.emirhanmamak.com/api/emails/gork_0%40mmkgams.space?limit=20&after_id=0&wait=25'
```

Mail listesi envelope içindeki **düz array**’dir; ikinci bir `emails` nesnesi yoktur:

```json
{
  "success": true,
  "data": [
    {
      "id": 812,
      "sender": "noreply@example.com",
      "subject": "SpaceXAI confirmation code: BXS-AJ2",
      "received_at": "2026-07-26T14:00:00.000Z",
      "has_attachments": false,
      "otp_code": "BXS-AJ2"
    }
  ]
}
```

`after_id` yalnız yeni kayıtları getirir. `since` ISO-8601 zaman damgası, `limit` 1–100, `order=desc|asc` ve `wait=0..30` desteklenir. Varsayılan sıralama yeniler üstte (`desc`) şeklindedir. `received_at` UTC ISO-8601’dir.

## Endpoint özeti

| Method | Endpoint | Scope | Açıklama |
|---|---|---|---|
| GET | `/health` | public | Sağlık kontrolü |
| POST | `/auth/register`, `/auth/login` | public | Hesap/oturum |
| GET | `/addresses/domains?flat=1` | `addresses:read` | Basit aktif domain string array’i |
| GET | `/addresses/domains` | `addresses:read` | Panel için domain + subdomain yapısı |
| POST | `/addresses` | `addresses:write` | Adres oluştur veya mevcut adresi döndür |
| POST | `/addresses/bulk` | `bulk:write` | `prefix`, `domain`, `count` ile `prefix_0...` üret |
| GET | `/addresses/bulk` | `addresses:read` | Kullanıcının bulk havuzları |
| DELETE | `/addresses/:address/emails` | `emails:delete` | Inbox’taki tüm mailleri sil |
| DELETE | `/addresses/:address` | `addresses:write` | Adresi ve maillerini kalıcı sil |
| GET | `/emails/:address` | `emails:read` | Düz email array’i; filtre/long-poll destekli |
| GET | `/emails/:address/stream` | `emails:read` | SSE yeni mail stream’i |
| GET | `/emails/single/:id` | `emails:read` | Mail detayı |
| DELETE | `/emails/:id` | `emails:delete` | Tek mail sil |
| GET | `/automation/api-keys` | session | Kendi key’lerini listele |
| POST | `/automation/api-keys` | session | Standard key; admin için master key oluştur |
| PUT/DELETE | `/automation/api-keys/:id` | session | Aktifleştir/pasifleştir veya iptal et |
| GET/POST | `/automation/webhooks` | `webhooks:manage` veya session | Webhook yönetimi |
| GET/POST/PUT | `/admin/api-keys` | admin/master | Tüm key’leri görüntüle, kullanıcı adına oluştur veya güncelle |

Adres ve mail endpoint’leri sahiplik kontrolü yapar. Standard kullanıcı key’i yalnız kendi oluşturduğu/bağlı mailbox’ları; master key tüm mailbox’ları yönetir.

## OTP davranışı

SMTP alımında `otp_code` kalıcı yazılır. Algılayıcı subject, düz text ve HTML’i birlikte puanlar; doğrulama etiketi yakınlığını, izole kod satırını ve kaynak önceliğini dikkate alır. Şunlar desteklenir:

- `BXS-AJ2`, `ABC-123`, `IRU-VO0`
- `123456`, `8492`
- Subject veya body’de bulunan kodlar

`© 2026`, tarih/saat, sipariş, takip ve referans numaraları red sinyali olarak değerlendirilir. Eski bir mail okununca daha iyi bir kod bulunursa `otp_code` otomatik düzeltilir.

## CORS ve güvenlik

CORS `X-Api-Key` ve `Authorization` header’larını kabul eder. Production’da yalnız HTTPS kullanın, key’i loglamayın ve `CUSTOM_TEMPMAIL_TOKEN` değerini secret store/environment variable’da saklayın. Key sızarsa panelden pasifleştirin veya iptal edin; yeni key oluşturun.
