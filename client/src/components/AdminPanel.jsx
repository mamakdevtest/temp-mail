import { useState, useEffect, useCallback } from 'react';

export default function AdminPanel({ apiBase }) {
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // DNS rehberi için sunucu IP'si (localStorage'da saklanır)
  const [serverIp, setServerIp] = useState(() => {
    return localStorage.getItem('tempmail_server_ip') || '';
  });

  // IP değişince localStorage'a kaydet
  useEffect(() => {
    if (serverIp) {
      localStorage.setItem('tempmail_server_ip', serverIp);
    }
  }, [serverIp]);

  // Domain listesini getir
  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/domains`, {
        headers: { 'x-admin-password': password },
      });

      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Domain listesi hatası:', err);
    }
  }, [apiBase, password]);

  // Domain ekle
  const addDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/admin/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Domain eklenemedi');
      }

      setNewDomain('');
      setSuccess(`"${data.domain.domain}" başarıyla eklendi!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchDomains();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Domain aktif/pasif değiştir
  const toggleDomain = async (id, currentActive) => {
    try {
      await fetch(`${apiBase}/admin/domains/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchDomains();
    } catch (err) {
      console.error('Domain güncelleme hatası:', err);
    }
  };

  // Domain sil
  const deleteDomain = async (id, domainName) => {
    if (!confirm(`"${domainName}" domainini silmek istediğinize emin misiniz?\nBu işlem geri alınamaz ve tüm ilişkili adresler ve mailler silinecek.`)) {
      return;
    }

    try {
      await fetch(`${apiBase}/admin/domains/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      fetchDomains();
    } catch (err) {
      console.error('Domain silme hatası:', err);
    }
  };

  // Manuel temizleme
  const triggerCleanup = async () => {
    try {
      const res = await fetch(`${apiBase}/admin/cleanup`, {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
      fetchDomains();
    } catch (err) {
      console.error('Temizlik hatası:', err);
    }
  };

  // Panoya kopyala
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setSuccess(`"${label}" kopyalandı!`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // Giriş yapılmışsa domain listesini getir
  useEffect(() => {
    if (isAuthenticated) {
      fetchDomains();
    }
  }, [isAuthenticated, fetchDomains]);

  // DNS kayıtları oluşturucu
  const getDnsRecords = (domain) => {
    const mailHost = `mail.${domain}`;
    return {
      mx: { type: 'MX', host: '@', value: mailHost, priority: 10, desc: 'Gelen mailleri sunucunuza yönlendirir' },
      a: { type: 'A', host: 'mail', value: serverIp || 'SUNUCU_IP', desc: 'Mail sunucu hostname → IP' },
      spf: { type: 'TXT', host: '@', value: `v=spf1 ip4:${serverIp || 'SUNUCU_IP'} ~all`, desc: 'Sahtekarlık koruması' },
      ptr: { type: 'PTR', host: serverIp || 'SUNUCU_IP', value: mailHost, desc: 'Reverse DNS (VPS panelinden ayarlanır)' },
    };
  };

  // DNS satırı kopyalama formatı
  const formatDnsLine = (record) => {
    if (record.type === 'MX') {
      return `${record.type}\t${record.host}\t${record.value}\t${record.priority}`;
    }
    return `${record.type}\t${record.host}\t${record.value}`;
  };

  // ===== GİRİŞ EKRANI =====
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto card">
        <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100 mb-6 flex items-center gap-2">
          🔐 Admin Girişi
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchDomains();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">
              Admin Şifresi
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=".env dosyasındaki ADMIN_PASSWORD"
              className="input-field"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full">
            Giriş Yap
          </button>
        </form>
      </div>
    );
  }

  // ===== ADMIN PANELİ =====
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100 flex items-center gap-2">
            ⚙️ Domain Yönetimi
          </h2>
          <div className="flex gap-2">
            <button onClick={triggerCleanup} className="btn-secondary text-sm">
              🧹 Temizle
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="btn-secondary text-sm"
            >
              🚪 Çıkış
            </button>
          </div>
        </div>
      </div>

      {/* Bildirimler */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm border border-green-200 dark:border-green-800 animate-slide-in">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm border border-red-200 dark:border-red-800 animate-slide-in">
          ⚠️ {error}
        </div>
      )}

      {/* Sunucu IP Adresi */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 dark:text-dark-200 mb-3 flex items-center gap-2">
          🌐 Sunucu IP Adresi
        </h3>
        <p className="text-sm text-gray-500 dark:text-dark-400 mb-3">
          DNS kayıtlarını oluşturmak için sunucunuzun IP adresini girin. Bu adres tüm domain'ler için kullanılacak.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={serverIp}
            onChange={(e) => setServerIp(e.target.value)}
            placeholder="Örn: 123.45.67.89"
            className="input-field flex-1"
          />
          <button
            onClick={() => {
              fetch('https://api.ipify.org?format=json')
                .then(r => r.json())
                .then(data => {
                  setServerIp(data.ip);
                  setSuccess('IP adresi otomatik algılandı: ' + data.ip);
                  setTimeout(() => setSuccess(null), 3000);
                })
                .catch(() => {
                  setError('IP adresi otomatik algılanamadı, lütfen manuel girin');
                  setTimeout(() => setError(null), 3000);
                });
            }}
            className="btn-secondary whitespace-nowrap"
            title="IP adresini otomatik algıla"
          >
            🔍 Otomatik Algıla
          </button>
        </div>
      </div>

      {/* Yeni Domain Ekleme */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 dark:text-dark-200 mb-4">Yeni Domain Ekle</h3>
        <form onSubmit={addDomain} className="flex gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="ornek.com"
            className="input-field flex-1"
          />
          <button type="submit" disabled={loading || !newDomain.trim()} className="btn-primary">
            {loading ? '⏳' : '➕'} Ekle
          </button>
        </form>
      </div>

      {/* Domain Listesi */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
          <h3 className="font-semibold text-gray-700 dark:text-dark-200">
            Domainler ({domains.length})
          </h3>
        </div>

        {domains.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-dark-500">
            <span className="text-4xl block mb-3">🌐</span>
            <p className="font-medium">Henüz domain eklenmemiş</p>
            <p className="text-sm mt-1">Yukarıdaki formu kullanarak domain ekleyin</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {domains.map((domain) => (
              <div key={domain.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-dark-100">{domain.domain}</p>
                  <p className="text-sm text-gray-500 dark:text-dark-400">
                    {domain.address_count} adres •{' '}
                    {domain.is_active ? (
                      <span className="text-green-600 dark:text-green-400">Aktif</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">Pasif</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDomain(domain.id, domain.is_active)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      domain.is_active
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}
                  >
                    {domain.is_active ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                  </button>
                  <button
                    onClick={() => deleteDomain(domain.id, domain.domain)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium
                               bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300
                               hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    🗑 Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== DNS KURULUM REHBERİ ===== */}
      {domains.length > 0 && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2 text-lg">
            📘 DNS Kurulum Rehberi
          </h3>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-6">
            Aşağıdaki DNS kayıtlarını domain sağlayıcınızda (Cloudflare, GoDaddy, vb.) oluşturun.
            Her domain için ayrı ayrı ayarlayın.
          </p>

          {!serverIp && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 text-sm text-amber-700 dark:text-amber-300">
              ⚠️ Lütfen yukarıdaki <strong>Sunucu IP Adresi</strong> alanını doldurun. IP girmeden DNS kayıtları doğru oluşturulamaz.
            </div>
          )}

          <div className="space-y-6">
            {domains.map((domain) => {
              const records = getDnsRecords(domain.domain);
              return (
                <div key={domain.id} className="bg-white dark:bg-dark-800 rounded-xl border border-blue-100 dark:border-blue-900/50 overflow-hidden">
                  {/* Domain başlığı */}
                  <div className="px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white flex items-center justify-between">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      🌐 {domain.domain}
                    </h4>
                    <button
                      onClick={() => {
                        const all = Object.values(records).map(formatDnsLine).join('\n');
                        copyToClipboard(all, `${domain.domain} DNS kayıtları`);
                      }}
                      className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      📋 Tümünü Kopyala
                    </button>
                  </div>

                  {/* DNS Kayıtları Tablosu */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-dark-900/50 text-left">
                          <th className="px-5 py-2.5 font-semibold text-gray-600 dark:text-dark-300 w-20">Tip</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 dark:text-dark-300 w-32">Host</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 dark:text-dark-300">Değer</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 dark:text-dark-300 w-24">Öncelik</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 dark:text-dark-300 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                        {/* MX Kaydı */}
                        <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                          <td className="px-5 py-3">
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold">MX</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.mx.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.mx.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-600 dark:text-dark-400">{records.mx.priority}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => copyToClipboard(formatDnsLine(records.mx), 'MX kaydı')} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-lg" title="Kopyala">📋</button>
                          </td>
                        </tr>

                        {/* A Kaydı */}
                        <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                          <td className="px-5 py-3">
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-bold">A</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.a.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.a.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400 dark:text-dark-500">—</td>
                          <td className="px-5 py-3">
                            <button onClick={() => copyToClipboard(formatDnsLine(records.a), 'A kaydı')} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-lg" title="Kopyala">📋</button>
                          </td>
                        </tr>

                        {/* SPF Kaydı */}
                        <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                          <td className="px-5 py-3">
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">TXT</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.spf.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200 break-all">{records.spf.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400 dark:text-dark-500">—</td>
                          <td className="px-5 py-3">
                            <button onClick={() => copyToClipboard(records.spf.value, 'SPF kaydı')} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-lg" title="Kopyala">📋</button>
                          </td>
                        </tr>

                        {/* PTR Kaydı */}
                        <tr className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                          <td className="px-5 py-3">
                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-bold">PTR</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.ptr.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800 dark:text-dark-200">{records.ptr.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400 dark:text-dark-500">—</td>
                          <td className="px-5 py-3">
                            <button onClick={() => copyToClipboard(formatDnsLine(records.ptr), 'PTR kaydı')} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-lg" title="Kopyala">📋</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Doğrulama Komutları */}
                  <div className="px-5 py-4 bg-gray-50 dark:bg-dark-900/50 border-t border-gray-200 dark:border-dark-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-dark-400 mb-2 uppercase tracking-wide">
                      Doğrulama Komutları (DNS yayılımından sonra çalıştırın)
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { cmd: `dig MX ${domain.domain} +short`, label: 'MX doğrulama' },
                        { cmd: `dig A mail.${domain.domain} +short`, label: 'A doğrulama' },
                        { cmd: `dig TXT ${domain.domain} +short`, label: 'TXT doğrulama' },
                        { cmd: `telnet mail.${domain.domain} 25`, label: 'SMTP test' },
                      ].map((item) => (
                        <div key={item.cmd} className="flex items-center gap-2">
                          <code className="flex-1 bg-gray-800 dark:bg-dark-950 text-green-400 px-3 py-1.5 rounded text-xs font-mono">
                            {item.cmd}
                          </code>
                          <button onClick={() => copyToClipboard(item.cmd, item.label)} className="text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300" title="Kopyala">📋</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Genel Notlar */}
          <div className="mt-6 bg-white dark:bg-dark-800 rounded-lg p-4 border border-blue-100 dark:border-blue-900/50 text-sm text-blue-700 dark:text-blue-300 space-y-2">
            <p className="font-semibold">📌 Önemli Notlar:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li><strong>MX ve A kayıtları zorunludur.</strong> Bunlar olmadan mail alamazsınız.</li>
              <li><strong>SPF kaydı önerilir.</strong> Gönderdiğiniz maillerin spam'e düşmesini engeller.</li>
              <li><strong>PTR kaydı</strong> VPS sağlayıcınızın panelinden ayarlanır (IP → hostname).</li>
              <li>DNS değişikliklerinin yayılması <strong>15 dakika ile 48 saat</strong> sürebilir.</li>
              <li>Cloudflare kullanıyorsanız, MX ve A kayıtlarında <strong>proxy'yi (turuncu bulut) kapatın</strong>.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
