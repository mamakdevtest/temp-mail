import { useMemo, useState } from 'react';
import { BookOpen, Boxes, Check, ChevronRight, CircleHelp, Clipboard, Cloud, Copy, Globe2, KeyRound, Mail, Play, Search, Server, ShieldCheck, TerminalSquare, Workflow } from 'lucide-react';

const articles = [
  {
    id: 'start', category: 'BAŞLANGIÇ', title: 'Hızlı başlangıç', description: 'Bir mailbox açın, doğrulama kodunu alın ve işi bitirin.', icon: Play,
    steps: [
      ['Domain seçin', 'Aktif domainlerden birini seçin veya adminin eklediği subdomaini kullanın.'],
      ['Adres oluşturun', 'Tek adres veya Bulk Studio ile prefix tabanlı havuz oluşturun.'],
      ['Maili alın', 'Inbox, SSE veya long-poll üzerinden yeni maili görün.'],
      ['OTP’yi kullanın', 'Kod subject, text ve HTML bağlamından algılanır; direkt kopyalayın.'],
    ],
    code: "POST /api/addresses\n{ \"username\": \"gork_0\", \"domain\": \"mmkgams.space\" }",
    note: 'Aynı adres tekrar istenirse sistem hata yerine mevcut mailbox bilgisini döndürür.',
  },
  {
    id: 'api', category: 'API & BOT', title: 'API key ile otomasyon', description: 'CUSTOM_TEMPMAIL_TOKEN ile güvenli, düşük trafikli bot akışı.', icon: KeyRound,
    steps: [
      ['Key oluşturun', 'Otomasyon ekranından gerekli scope’ları seçerek tm_ ile başlayan key üretin.'],
      ['Secret’i saklayın', 'Tam key yalnız oluşturulduğu anda gösterilir; bot environment değişkenine kaydedin.'],
      ['Long-poll kullanın', '2.5 sn tam polling yerine wait=25 ile mail gelene kadar bekleyin.'],
      ['Cursor saklayın', 'after_id ile yalnız yeni mailleri okuyun.'],
    ],
    code: "export CUSTOM_TEMPMAIL_TOKEN='tm_...'\ncurl -H \"X-Api-Key: $CUSTOM_TEMPMAIL_TOKEN\" \\\n  'https://tempmail.emirhanmamak.com/api/emails/gork_0%40mmkgams.space?after_id=0&wait=25'",
    note: 'Standard key yalnız sahibinin mailbox’larına erişir. Admin master key tüm operasyon endpoint’lerine erişir.',
  },
  {
    id: 'mail', category: 'MAIL OPERASYONLARI', title: 'OTP, inbox ve realtime', description: 'Mail tesliminden doğrulama koduna uzanan güvenilir akış.', icon: Mail,
    steps: [
      ['SMTP alır', 'Aktif domain ve kayıtlı alıcı doğrulanır; mail ve ekler kalıcı saklanır.'],
      ['OTP taranır', 'BXS-AJ2, ABC-123, IRU-VO0 ve klasik sayı kodları desteklenir.'],
      ['Yanlış adaylar elenir', '© 2026, tarih/saat, sipariş, takip ve referans numaraları red sinyalidir.'],
      ['Olay yayınlanır', 'Socket.io, SSE ve webhook kanallarına yeni mail/OTP olayı gider.'],
    ],
    code: "GET /api/emails/:address?limit=20&after_id=0&since=2026-07-26T00:00:00Z&wait=25\n\nGET /api/emails/:address/stream",
    note: 'Mail listesi response envelope içindeki düz array olarak döner; ikinci bir emails objesi yoktur.',
  },
  {
    id: 'bulk', category: 'BULK STUDIO', title: 'Prefix havuzları', description: 'Bir prefix ile sıralı, sahipliği belli mailbox havuzu üretin.', icon: Boxes,
    steps: [
      ['Prefix girin', 'Örn. gork seçildiğinde adresler gork_0, gork_1 şeklinde sürer.'],
      ['Domain ve adet seçin', '1–100 arası atomik üretim yapılır; çakışmalar atlanır.'],
      ['Havuzu açın', 'Bulk Inbox popup’ında tüm alıcılara gelen mail ve OTP’leri tek akışta tarayın.'],
      ['Devam edin', 'Aynı havuz sonraki boş indexten üretmeye devam eder.'],
    ],
    code: "POST /api/addresses/bulk\n{ \"prefix\": \"gork\", \"domain\": \"mmkgams.space\", \"count\": 25 }",
    note: 'Pro/Pro+ kullanıcıda admin bulk yetkisi gerekir. Admin kota override ile kullanıcı adına üretim yapabilir.',
  },
  {
    id: 'server', category: 'SUNUCU & DNS', title: 'SMTP, DNS ve deployment', description: 'Mail kabul eden sunucunun sağlıklı çalışması için operasyon kontrol listesi.', icon: Server,
    steps: [
      ['A ve MX kaydı', 'mail.domain.tld sunucu IP’sine, MX kaydı da bu hostname’e yönlenmelidir.'],
      ['Port 25 erişimi', 'SMTP için TCP 25 inbound açık olmalı; Cloudflare proxy kapalı kalmalıdır.'],
      ['Güvenlik kayıtları', 'SPF, DKIM, DMARC ve PTR teslim edilebilirliği yükseltir.'],
      ['Veriyi koruyun', 'Deploy öncesi DB kopyasıyla doğrulama yapın; migrationlar additive çalışır.'],
    ],
    code: "npm run verify:db-copy\nnpm run test:otp\nnpm run build\nNODE_ENV=production npm start",
    note: 'Coolify için port 25 doğrudan expose edilir; HTTP/HTTPS ise proxy üzerinden sunulur.',
  },
];

function CodeBlock({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1300); };
  return <div className="docs-code"><div><TerminalSquare size={14} /><span>ÖRNEK KOMUT</span><button onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Kopyalandı' : 'Kopyala'}</button></div><pre>{value}</pre></div>;
}

export default function DocumentationCenter() {
  const [activeId, setActiveId] = useState('start');
  const [query, setQuery] = useState('');
  const active = articles.find((article) => article.id === activeId) || articles[0];
  const visibleArticles = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return articles;
    return articles.filter((article) => `${article.category} ${article.title} ${article.description} ${article.steps.flat().join(' ')} ${article.code}`.toLocaleLowerCase('tr-TR').includes(needle));
  }, [query]);
  const Icon = active.icon;

  return <section className="docs-center">
    <header className="docs-hero">
      <div className="docs-hero-mark"><BookOpen size={25} /><span>MS TEMP MAIL</span></div>
      <div className="docs-hero-copy"><p>OPERATIONS HANDBOOK</p><h1>İşi yap, yolu ara.</h1><span>Mailbox, API ve sunucu operasyonları için uygulama içi rehber.</span></div>
      <div className="docs-hero-signal"><ShieldCheck size={17} /><div><strong>Canlı sözleşme</strong><small>API key · OTP · realtime</small></div></div>
    </header>

    <div className="docs-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="API key, OTP, DNS, Bulk veya endpoint ara" /><kbd>⌘ K</kbd></div>

    <div className="docs-layout">
      <aside className="docs-library" aria-label="Doküman konuları">
        <p>KONULAR</p>
        {visibleArticles.map((article) => { const ArticleIcon = article.icon; return <button key={article.id} onClick={() => setActiveId(article.id)} className={active.id === article.id ? 'is-active' : ''}><ArticleIcon size={17} /><span><small>{article.category}</small><strong>{article.title}</strong></span><ChevronRight size={15} /></button>; })}
        {!visibleArticles.length && <div className="docs-no-result"><CircleHelp size={18} />Eşleşen konu bulunamadı.</div>}
      </aside>

      <article className="docs-reader">
        <div className="docs-reader-lead"><div className="docs-reader-icon"><Icon size={23} /></div><div><p>{active.category}</p><h2>{active.title}</h2><span>{active.description}</span></div></div>
        <ol className="docs-steps">{active.steps.map(([title, text], index) => <li key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
        <CodeBlock value={active.code} />
        <div className="docs-note"><Clipboard size={17} /><p><strong>Operasyon notu</strong>{active.note}</p></div>
      </article>

      <aside className="docs-sidecards"><div><Cloud size={18} /><p>DEPLOYMENT</p><strong>Coolify hazır</strong><span>Port 25, Docker Compose ve DNS adımları sunucu rehberinde.</span></div><div><Workflow size={18} /><p>OTOMASYON</p><strong>Long-poll önerilir</strong><span>Bot trafiğini azaltmak için `wait=25` ve `after_id` kullanın.</span></div><div><Globe2 size={18} /><p>DOMAIN</p><strong>Subdomain destekli</strong><span>Admin aktif domainlere subdomain ekleyebilir.</span></div></aside>
    </div>
  </section>;
}
