# MS Temp Mail Sunucu Operasyon Rehberi

## Başlatma ve veri güvenliği

Veritabanı `data/tempmail.db` dosyasıdır ve `sql.js` ile çalışır. Şema güncellemeleri additive migration’dır; mevcut kullanıcı, adres, mail ve attachment verisi silinmez.

```bash
npm run verify:db-copy  # canlı DB’ye dokunmadan kopya doğrulaması
npm run test:otp
npm run build
NODE_ENV=production npm start
```

Yedek için servis durdurulmadan önce DB dosyasının binary kopyasını alın. `TEMPMAIL_DB_PATH` ile doğrulama/kopya DB’si kullanılabilir.

## Gerekli ortam değişkenleri

```env
API_PORT=3001
SMTP_PORT=25
JWT_SECRET=uzun-rastgele-bir-deger
ADMIN_PASSWORD=guclu-bir-parola
MAIL_SERVER_IP=SUNUCU_IP
SMTP_RELAY_HOST=
SMTP_RELAY_PORT=587
SMTP_RELAY_SECURE=false
SMTP_RELAY_USER=
SMTP_RELAY_PASS=
```

`JWT_SECRET` ve `ADMIN_PASSWORD` varsayılan değerlerle production’a çıkılmamalıdır. API key’ler DB’de yalnız SHA-256 hash olarak tutulur.

## SMTP ve DNS kontrolü

Her mail domain için MX kaydı `mail.<domain>` hedefini, A kaydı bu hostname’i sunucu IP’sini göstermelidir. SPF, DKIM, DMARC ve PTR teslim edilebilirliği artırır. Port 25 TCP inbound açık olmalıdır.

Sağlık kontrolü:

```bash
curl https://tempmail.emirhanmamak.com/api/health
```

## API key yaşam döngüsü

1. Kullanıcı **Otomasyon** ekranında isim, scope ve rate limitiyle key oluşturur.
2. Key yalnız o anda gösterilir; bot ortamına `CUSTOM_TEMPMAIL_TOKEN` olarak kaydedilir.
3. Kullanım sayacı/son kullanım bilgisi panelde takip edilir.
4. Şüpheli key pasifleştirilir veya iptal edilir.
5. Admin, kendi hesabında master key oluşturabilir; bu key yalnız güvenli sunucu otomasyonlarında kullanılmalıdır.

## Olaylar ve gözlemleme

SMTP yeni maili DB’ye kaydeder, Socket.io ve SSE’ye yayınlar; adres sahibi için `email.received` olayı gönderilir. OTP bulunursa ek olarak `otp.detected` webhooks olayı gönderilir. Webhook teslimat kayıtları DB’de tutulur.

Botlar mümkünse 2.5 saniyelik kısa polling yerine `wait=25` long-poll veya SSE kullanmalıdır. Bu, trafik ve timeout olasılığını düşürür.

API ayrıntıları ve curl örnekleri için [API.md](API.md) belgesine bakın.
