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
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
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
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          ✅ {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Sunucu IP Adresi */}
      <div className="card">
        <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
          🌐 Sunucu IP Adresi
        </h3>
        <p className="text-sm text-gray-500 mb-3">
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
              // Otomatik algılama — basitçe external IP'yi çekmeyi dene
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
        <h3 className="font-semibold text-gray-700 mb-4">Yeni Domain Ekle</h3>
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
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-700">
            Domainler ({domains.length})
          </h3>
        </div>

        {domains.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <span className="text-4xl block mb-3">🌐</span>
            <p className="font-medium">Henüz domain eklenmemiş</p>
            <p className="text-sm mt-1">Yukarıdaki formu kullanarak domain ekleyin</p>
          </div>
        ) : (
          <div className="divide-y">
            {domains.map((domain) => (
              <div key={domain.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{domain.domain}</p>
                  <p className="text-sm text-gray-500">
                    {domain.address_count} adres •{' '}
                    {domain.is_active ? (
                      <span className="text-green-600">Aktif</span>
                    ) : (
                      <span className="text-red-600">Pasif</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDomain(domain.id, domain.is_active)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      domain.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {domain.is_active ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                  </button>
                  <button
                    onClick={() => deleteDomain(domain.id, domain.domain)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    🗑 Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== DNS KURULUM REHBERİ (İnteraktif) ===== */}
      {domains.length > 0 && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-lg">
            📘 DNS Kurulum Rehberi
          </h3>
          <p className="text-sm text-blue-600 mb-6">
            Aşağıdaki DNS kayıtlarını domain sağlayıcınızda (Cloudflare, GoDaddy, vb.) oluşturun.
            Her domain için ayrı ayrı ayarlayın.
          </p>

          {!serverIp && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-700">
              ⚠️ Lütfen yukarıdaki <strong>Sunucu IP Adresi</strong> alanını doldurun. IP girmeden DNS kayıtları doğru oluşturulamaz.
            </div>
          )}

          <div className="space-y-6">
            {domains.map((domain) => {
              const records = getDnsRecords(domain.domain);
              return (
                <div key={domain.id} className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                  {/* Domain başlığı */}
                  <div className="px-5 py-3 bg-blue-600 text-white flex items-center justify-between">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      🌐 {domain.domain}
                    </h4>
                    <button
                      onClick={() => {
                        // Tüm kayıtları tek seferde kopyala
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
                        <tr className="bg-gray-50 text-left">
                          <th className="px-5 py-2.5 font-semibold text-gray-600 w-20">Tip</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 w-32">Host</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600">Değer</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 w-24">Öncelik</th>
                          <th className="px-5 py-2.5 font-semibold text-gray-600 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {/* MX Kaydı */}
                        <tr className="hover:bg-blue-50/50">
                          <td className="px-5 py-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">MX</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.mx.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.mx.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-600">{records.mx.priority}</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => copyToClipboard(formatDnsLine(records.mx), 'MX kaydı')}
                              className="text-blue-500 hover:text-blue-700 text-lg"
                              title="Kopyala"
                            >
                              📋
                            </button>
                          </td>
                        </tr>

                        {/* A Kaydı */}
                        <tr className="hover:bg-blue-50/50">
                          <td className="px-5 py-3">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">A</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.a.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.a.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400">—</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => copyToClipboard(formatDnsLine(records.a), 'A kaydı')}
                              className="text-blue-500 hover:text-blue-700 text-lg"
                              title="Kopyala"
                            >
                              📋
                            </button>
                          </td>
                        </tr>

                        {/* SPF Kaydı */}
                        <tr className="hover:bg-blue-50/50">
                          <td className="px-5 py-3">
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">TXT</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.spf.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800 break-all">{records.spf.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400">—</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => copyToClipboard(records.spf.value, 'SPF kaydı')}
                              className="text-blue-500 hover:text-blue-700 text-lg"
                              title="Kopyala"
                            >
                              📋
                            </button>
                          </td>
                        </tr>

                        {/* PTR Kaydı */}
                        <tr className="hover:bg-blue-50/50">
                          <td className="px-5 py-3">
                            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">PTR</span>
                          </td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.ptr.host}</td>
                          <td className="px-5 py-3 font-mono text-gray-800">{records.ptr.value}</td>
                          <td className="px-5 py-3 font-mono text-gray-400">—</td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => copyToClipboard(formatDnsLine(records.ptr), 'PTR kaydı')}
                              className="text-blue-500 hover:text-blue-700 text-lg"
                              title="Kopyala"
                            >
                              📋
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Doğrulama Komutları */}
                  <div className="px-5 py-4 bg-gray-50 border-t">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                      Doğrulama Komutları (DNS yayılımından sonra çalıştırın)
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-800 text-green-400 px-3 py-1.5 rounded text-xs font-mono">
                          dig MX {domain.domain} +short
                        </code>
                        <button
                          onClick={() => copyToClipboard(`dig MX ${domain.domain} +short`, 'MX doğrulama')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Kopyala"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-800 text-green-400 px-3 py-1.5 rounded text-xs font-mono">
                          dig A mail.{domain.domain} +short
                        </code>
                        <button
                          onClick={() => copyToClipboard(`dig A mail.${domain.domain} +short`, 'A doğrulama')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Kopyala"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-800 text-green-400 px-3 py-1.5 rounded text-xs font-mono">
                          dig TXT {domain.domain} +short
                        </code>
                        <button
                          onClick={() => copyToClipboard(`dig TXT ${domain.domain} +short`, 'TXT doğrulama')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Kopyala"
                        >
                          📋
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-800 text-green-400 px-3 py-1.5 rounded text-xs font-mono">
                          telnet mail.{domain.domain} 25
                        </code>
                        <button
                          onClick={() => copyToClipboard(`telnet mail.${domain.domain} 25`, 'SMTP test')}
                          className="text-gray-400 hover:text-gray-600"
                          title="Kopyala"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Genel Notlar */}
          <div className="mt-6 bg-white rounded-lg p-4 border border-blue-100 text-sm text-blue-700 space-y-2">
            <p className="font-semibold">📌 Önemli Notlar:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
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
