import { useState, useEffect, useCallback } from 'react';

export default function AdminPanel({ apiBase }) {
  // ===== STATE =====
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('tempmail-admin-password') || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dashboard state
  const [stats, setStats] = useState(null);
  const [allEmails, setAllEmails] = useState([]);
  const [emailsPage, setEmailsPage] = useState(1);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'domains' | 'emails'

  // DNS rehberi için sunucu IP'si
  const [serverIp, setServerIp] = useState(() => {
    return localStorage.getItem('tempmail_server_ip') || '';
  });

  useEffect(() => {
    if (serverIp) localStorage.setItem('tempmail_server_ip', serverIp);
  }, [serverIp]);

  // ===== ADMIN AUTH HEADER =====
  const adminHeaders = { 'x-admin-password': password };

  // ===== Domain listesini getir =====
  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/domains`, { headers: adminHeaders });
      if (res.status === 401) { setIsAuthenticated(false); return; }
      const data = await res.json();
      if (data.domains) { setDomains(data.domains); setIsAuthenticated(true); }
    } catch (err) {
      console.error('Domain listesi hatası:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  // ===== Dashboard istatistiklerini getir =====
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/stats`, { headers: adminHeaders });
      if (res.status === 401) return;
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('İstatistik hatası:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  // ===== Tüm mailleri getir =====
  const fetchAllEmails = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${apiBase}/admin/emails?page=${page}&limit=50`, { headers: adminHeaders });
      if (res.status === 401) return;
      const data = await res.json();
      setAllEmails(data.emails || []);
      setEmailsTotal(data.total || 0);
      setEmailsPage(page);
    } catch (err) {
      console.error('Mail listesi hatası:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  // ===== Giriş yap =====
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/admin/domains`, {
        headers: { 'x-admin-password': password },
      });

      if (res.status === 401) {
        setError('Geçersiz şifre');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains);
        setIsAuthenticated(true);
        // Şifreyi localStorage'a kaydet
        localStorage.setItem('tempmail-admin-password', password);
        setSuccess('Giriş başarılı!');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  // ===== Çıkış yap =====
  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('tempmail-admin-password');
    setStats(null);
    setAllEmails([]);
  };

  // ===== Domain ekle =====
  const addDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/admin/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Domain eklenemedi');

      setNewDomain('');
      setSuccess(`"${data.domain.domain}" eklendi!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchDomains();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Domain aktif/pasif
  const toggleDomain = async (id, currentActive) => {
    try {
      await fetch(`${apiBase}/admin/domains/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      fetchDomains();
    } catch (err) { console.error('Domain güncelleme hatası:', err); }
  };

  // Domain sil
  const deleteDomain = async (id, domainName) => {
    if (!confirm(`"${domainName}" domainini silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`${apiBase}/admin/domains/${id}`, { method: 'DELETE', headers: adminHeaders });
      fetchDomains();
    } catch (err) { console.error('Domain silme hatası:', err); }
  };

  // Manuel temizleme
  const triggerCleanup = async () => {
    if (!confirm('Tüm adresler ve mailler silinecek. Emin misiniz?')) return;
    try {
      const res = await fetch(`${apiBase}/admin/cleanup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ type: 'all' }),
      });
      const data = await res.json();
      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
      fetchDomains();
      fetchStats();
      fetchAllEmails();
    } catch (err) { console.error('Temizlik hatası:', err); }
  };

  // Panoya kopyala
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setSuccess(`"${label}" kopyalandı!`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // ===== Giriş yapıldığında verileri çek =====
  useEffect(() => {
    if (isAuthenticated) {
      fetchDomains();
      fetchStats();
      fetchAllEmails();
    }
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [isAuthenticated]);

  // Tarih formatla
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // DNS kayıtları
  const getDnsRecords = (domain) => {
    const mailHost = `mail.${domain}`;
    return {
      mx: { type: 'MX', host: '@', value: mailHost, priority: 10 },
      a: { type: 'A', host: 'mail', value: serverIp || 'SUNUCU_IP' },
      spf: { type: 'TXT', host: '@', value: `v=spf1 ip4:${serverIp || 'SUNUCU_IP'} ~all` },
      ptr: { type: 'PTR', host: serverIp || 'SUNUCU_IP', value: mailHost },
    };
  };

  const formatDnsLine = (record) => {
    if (record.type === 'MX') return `${record.type}\t${record.host}\t${record.value}\t${record.priority}`;
    return `${record.type}\t${record.host}\t${record.value}`;
  };

  // ===== GİRİŞ EKRANI =====
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto card">
        <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100 mb-6 flex items-center gap-2">
          🔐 Admin Girişi
        </h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Admin Şifresi</label>
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
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '⏳ Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    );
  }

  // ===== ADMIN PANELİ =====
  return (
    <div className="space-y-6">
      {/* Başlık + Tab Navigation */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100 flex items-center gap-2">
            ⚙️ Admin Paneli
          </h2>
          <div className="flex gap-2">
            <button onClick={triggerCleanup} className="btn-secondary text-sm">🧹 Tümünü Temizle</button>
            <button onClick={handleLogout} className="btn-secondary text-sm">🚪 Çıkış</button>
          </div>
        </div>

        {/* Tab Butonları */}
        <div className="flex gap-2 border-t border-gray-200 dark:border-dark-700 pt-4">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'domains', label: '🌐 Domainler' },
            { id: 'emails', label: '📧 Tüm Mailler' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'emails') fetchAllEmails(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 dark:bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-dark-300 hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
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

      {/* ===== DASHBOARD TAB ===== */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Toplam Mail', value: stats.total_emails, icon: '📧', color: 'blue' },
              { label: 'Toplam Adres', value: stats.total_addresses, icon: '📬', color: 'green' },
              { label: 'Son 24 Saat', value: stats.recent_24h, icon: '⏰', color: 'amber' },
              { label: 'OTP Algılanan', value: stats.otp_count, icon: '🔑', color: 'purple' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center">
                <span className="text-3xl block mb-2">{stat.icon}</span>
                <p className="text-2xl font-bold text-gray-800 dark:text-dark-100">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-dark-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* En Çok Mail Gelen Şirketler */}
          {stats.top_domains && stats.top_domains.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200">🏢 En Çok Mail Gelen Şirketler</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-700">
                {stats.top_domains.map((d, i) => (
                  <div key={d.domain} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 dark:text-dark-500 w-6">{i + 1}</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-dark-100">{d.domain}</p>
                        <p className="text-xs text-gray-500 dark:text-dark-400">
                          {d.senders.map((s) => s.sender).join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="badge-primary">{d.email_count} mail</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OTP Mailleri */}
          {stats.otp_emails && stats.otp_emails.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200">🔑 OTP / Doğrulama Kodları</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-700">
                {stats.otp_emails.map((mail) => (
                  <div key={mail.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 dark:text-dark-100 truncate">{mail.sender}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-400 truncate">
                        → {mail.address} • {mail.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge-otp">{mail.otp_code}</span>
                      <button
                        onClick={() => copyToClipboard(mail.otp_code, 'OTP')}
                        className="text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300"
                        title="Kopyala"
                      >📋</button>
                      <span className="text-xs text-gray-400 dark:text-dark-500">{formatDate(mail.received_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Son Mailler (özet) */}
          {stats.latest_emails && stats.latest_emails.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200">📬 Son Mailler</h3>
                <button onClick={() => setActiveTab('emails')} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  Tümünü Gör →
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-dark-700 max-h-[400px] overflow-y-auto">
                {stats.latest_emails.slice(0, 15).map((mail) => (
                  <div key={mail.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 dark:text-dark-100 truncate text-sm">{mail.sender}</p>
                        {mail.otp_code && <span className="badge-otp text-[10px]">🔑 {mail.otp_code}</span>}
                        {mail.has_attachments && <span className="text-xs text-amber-500">📎</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 truncate">
                        → {mail.recipient_address} • {mail.subject || '(Konu yok)'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-dark-500 flex-shrink-0 ml-2">
                      {formatDate(mail.received_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== DOMAINS TAB ===== */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          {/* Sunucu IP */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 mb-3 flex items-center gap-2">🌐 Sunucu IP Adresi</h3>
            <div className="flex gap-3">
              <input type="text" value={serverIp} onChange={(e) => setServerIp(e.target.value)} placeholder="Örn: 123.45.67.89" className="input-field flex-1" />
              <button onClick={() => {
                fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => {
                  setServerIp(data.ip);
                  setSuccess('IP algılandı: ' + data.ip);
                  setTimeout(() => setSuccess(null), 3000);
                }).catch(() => { setError('IP algılanamadı'); setTimeout(() => setError(null), 3000); });
              }} className="btn-secondary whitespace-nowrap">🔍 Otomatik Algıla</button>
            </div>
          </div>

          {/* Yeni Domain */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 mb-4">Yeni Domain Ekle</h3>
            <form onSubmit={addDomain} className="flex gap-3">
              <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ornek.com" className="input-field flex-1" />
              <button type="submit" disabled={loading || !newDomain.trim()} className="btn-primary">{loading ? '⏳' : '➕'} Ekle</button>
            </form>
          </div>

          {/* Domain Listesi */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
              <h3 className="font-semibold text-gray-700 dark:text-dark-200">Domainler ({domains.length})</h3>
            </div>
            {domains.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-500">
                <span className="text-4xl block mb-3">🌐</span>
                <p className="font-medium">Henüz domain eklenmemiş</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-dark-700">
                {domains.map((domain) => (
                  <div key={domain.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-dark-100">{domain.domain}</p>
                      <p className="text-sm text-gray-500 dark:text-dark-400">
                        {domain.address_count} adres •{' '}
                        {domain.is_active ? <span className="text-green-600 dark:text-green-400">Aktif</span> : <span className="text-red-600 dark:text-red-400">Pasif</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleDomain(domain.id, domain.is_active)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${domain.is_active ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
                        {domain.is_active ? '⏸ Pasif' : '▶ Aktif'}
                      </button>
                      <button onClick={() => deleteDomain(domain.id, domain.domain)} className="px-3 py-1.5 rounded-md text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DNS Rehberi */}
          {domains.length > 0 && (
            <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2 text-lg">📘 DNS Kurulum Rehberi</h3>
              {!serverIp && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4 text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ Sunucu IP adresini girin.
                </div>
              )}
              <div className="space-y-4">
                {domains.map((domain) => {
                  const records = getDnsRecords(domain.domain);
                  return (
                    <div key={domain.id} className="bg-white dark:bg-dark-800 rounded-xl border border-blue-100 dark:border-blue-900/50 overflow-hidden">
                      <div className="px-5 py-3 bg-blue-600 dark:bg-blue-700 text-white flex items-center justify-between">
                        <h4 className="font-bold">🌐 {domain.domain}</h4>
                        <button onClick={() => { const all = Object.values(records).map(formatDnsLine).join('\n'); copyToClipboard(all, 'DNS'); }} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-sm">📋 Tümünü Kopyala</button>
                      </div>
                      <div className="p-4 space-y-2 text-sm font-mono">
                        {Object.values(records).map((r) => (
                          <div key={r.type + r.host} className="flex items-center justify-between bg-gray-50 dark:bg-dark-900/50 rounded px-3 py-2">
                            <span className="text-gray-800 dark:text-dark-200">{r.type} {r.host} → {r.value} {r.priority ? `(pri: ${r.priority})` : ''}</span>
                            <button onClick={() => copyToClipboard(formatDnsLine(r), r.type)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400">📋</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== EMAILS TAB ===== */}
      {activeTab === 'emails' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200">📧 Tüm Mailler ({emailsTotal})</h3>
            <button onClick={() => fetchAllEmails(1)} className="btn-secondary text-sm">🔄 Yenile</button>
          </div>

          {allEmails.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-dark-500">
              <span className="text-4xl block mb-3">📭</span>
              <p className="font-medium">Henüz mail yok</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-dark-700 max-h-[600px] overflow-y-auto">
              {allEmails.map((mail) => (
                <div key={mail.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 dark:text-dark-100 text-sm truncate">{mail.sender}</p>
                        {mail.otp_code && <span className="badge-otp text-[10px]">🔑 {mail.otp_code}</span>}
                        {mail.has_attachments && <span className="text-xs text-amber-500">📎</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-dark-400 truncate mt-0.5">
                        → <span className="font-mono">{mail.recipient_address}</span> • {mail.subject || '(Konu yok)'}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-dark-500 flex-shrink-0">
                      {formatDate(mail.received_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sayfalama */}
          {emailsTotal > 50 && (
            <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 flex items-center justify-center gap-2">
              <button
                onClick={() => fetchAllEmails(emailsPage - 1)}
                disabled={emailsPage <= 1}
                className="btn-secondary text-sm"
              >← Önceki</button>
              <span className="text-sm text-gray-500 dark:text-dark-400">Sayfa {emailsPage}</span>
              <button
                onClick={() => fetchAllEmails(emailsPage + 1)}
                disabled={allEmails.length < 50}
                className="btn-secondary text-sm"
              >Sonraki →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
