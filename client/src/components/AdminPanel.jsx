import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminPanel({ apiBase }) {
  const [password, setPassword] = useState(() => localStorage.getItem('tempmail-admin-password') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);
  const [allAddresses, setAllAddresses] = useState([]);
  const [allEmails, setAllEmails] = useState([]);
  const [emailsPage, setEmailsPage] = useState(1);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [serverIp, setServerIp] = useState(() => localStorage.getItem('tempmail_server_ip') || '');

  // Mailbox viewer
  const [viewingMailbox, setViewingMailbox] = useState(null);
  const [mailboxEmails, setMailboxEmails] = useState([]);
  const [selectedAdminEmail, setSelectedAdminEmail] = useState(null);

  const headers = { 'x-admin-password': password };

  useEffect(() => { if (serverIp) localStorage.setItem('tempmail_server_ip', serverIp); }, [serverIp]);

  const flash = (msg, type = 'success') => { type === 'success' ? setSuccess(msg) : setError(msg); setTimeout(() => { setSuccess(null); setError(null); }, 3000); };

  const fetchDomains = useCallback(async () => {
    try { const r = await fetch(`${apiBase}/admin/domains`, { headers }); if (r.status === 401) { setIsAuthenticated(false); return; } const d = await r.json(); if (d.domains) { setDomains(d.domains); setIsAuthenticated(true); } } catch (e) { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  const fetchStats = useCallback(async () => {
    try { const r = await fetch(`${apiBase}/admin/stats`, { headers }); if (r.ok) setStats(await r.json()); } catch (e) { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  const fetchAllAddresses = useCallback(async () => {
    try { const r = await fetch(`${apiBase}/admin/addresses`, { headers }); if (r.ok) { const d = await r.json(); setAllAddresses(d.addresses || []); } } catch (e) { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  const fetchAllEmails = useCallback(async (page = 1) => {
    try { const r = await fetch(`${apiBase}/admin/emails?page=${page}&limit=50`, { headers }); if (r.ok) { const d = await r.json(); setAllEmails(d.emails || []); setEmailsTotal(d.total || 0); setEmailsPage(page); } } catch (e) { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  const openMailbox = useCallback(async (address) => {
    try {
      const r = await fetch(`${apiBase}/admin/mailbox/${encodeURIComponent(address)}`, { headers });
      if (r.ok) { const d = await r.json(); setViewingMailbox(d); setMailboxEmails(d.emails || []); setSelectedAdminEmail(null); }
    } catch (e) { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, password]);

  const openAdminEmailDetail = useCallback(async (emailId) => {
    try { const r = await fetch(`${apiBase}/emails/single/${emailId}`); if (r.ok) setSelectedAdminEmail(await r.json()); } catch (e) { /* */ }
  }, [apiBase]);

  const handleLogin = async (e) => {
    e.preventDefault(); if (!password) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${apiBase}/admin/domains`, { headers: { 'x-admin-password': password } });
      if (r.status === 401) { setError('Geçersiz şifre'); setLoading(false); return; }
      const d = await r.json();
      if (d.domains) { setDomains(d.domains); setIsAuthenticated(true); localStorage.setItem('tempmail-admin-password', password); flash('Giriş başarılı!'); }
    } catch (e) { setError('Bağlantı hatası'); } finally { setLoading(false); }
  };

  const handleLogout = () => { setIsAuthenticated(false); setPassword(''); localStorage.removeItem('tempmail-admin-password'); setStats(null); setAllEmails([]); setViewingMailbox(null); };

  const addDomain = async (e) => {
    e.preventDefault(); if (!newDomain.trim()) return; setLoading(true); setError(null);
    try { const r = await fetch(`${apiBase}/admin/domains`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ domain: newDomain.trim() }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setNewDomain(''); flash(`"${d.domain.domain}" eklendi!`); fetchDomains(); } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const toggleDomain = async (id, active) => { await fetch(`${apiBase}/admin/domains/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ is_active: !active }) }); fetchDomains(); };
  const deleteDomain = async (id, name) => { if (!confirm(`"${name}" silinecek?`)) return; await fetch(`${apiBase}/admin/domains/${id}`, { method: 'DELETE', headers }); fetchDomains(); };
  const triggerCleanup = async () => { if (!confirm('TÜM adresler ve mailler silinecek?')) return; const r = await fetch(`${apiBase}/admin/cleanup`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ type: 'all' }) }); const d = await r.json(); flash(d.message); fetchDomains(); fetchStats(); };
  const copyToClipboard = (text, label) => { navigator.clipboard.writeText(text); flash(`"${label}" kopyalandı!`); };

  useEffect(() => { if (isAuthenticated) { fetchDomains(); fetchStats(); fetchAllAddresses(); fetchAllEmails(); } }, [isAuthenticated]); // eslint-disable-line

  const fmt = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  /* Chart data */
  const domainChartData = stats?.top_domains?.slice(0, 8).map((d) => ({ name: d.domain.length > 15 ? d.domain.slice(0, 12) + '...' : d.domain, value: d.email_count })) || [];
  const otpPieData = stats ? [{ name: 'OTP', value: stats.otp_count }, { name: 'Normal', value: stats.total_emails - stats.otp_count }] : [];

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto card">
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">🔐</span>
          <h2 className="text-xl font-bold text-gray-800 dark:text-dark-100">Admin Girişi</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin şifresi" className="input-field" autoFocus />
          {error && <p className="text-red-500 dark:text-red-400 text-sm">⚠️ {error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? '⏳' : 'Giriş Yap'}</button>
        </form>
      </div>
    );
  }

  /* Mailbox viewer */
  if (viewingMailbox) {
    return (
      <div className="space-y-4">
        <div className="card flex items-center justify-between">
          <div>
            <button onClick={() => { setViewingMailbox(null); setSelectedAdminEmail(null); }} className="btn-ghost text-sm mb-2">← Admin Paneline Dön</button>
            <h2 className="text-lg font-bold text-gray-800 dark:text-dark-100">📬 {viewingMailbox.address}</h2>
            <p className="text-xs text-gray-500 dark:text-dark-400">{mailboxEmails.length} mail • Oluşturulma: {fmt(viewingMailbox.created_at)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-dark-200">Mailler ({mailboxEmails.length})</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700/50">
              {mailboxEmails.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-dark-500 text-sm">📭 Henüz mail yok</div>
              ) : mailboxEmails.map((m) => (
                <div key={m.id} onClick={() => openAdminEmailDetail(m.id)} className={`px-4 py-3 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-dark-700/30 transition-colors ${selectedAdminEmail?.id === m.id ? 'bg-primary-50/80 dark:bg-primary-900/20 border-l-3 border-primary-500' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 dark:text-dark-100 truncate text-sm">{m.sender}</p>
                      <p className="text-xs text-gray-500 dark:text-dark-400 truncate">{m.subject || '(Konu yok)'}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m.otp_code && <span className="badge-otp text-[9px]">🔑 {m.otp_code}</span>}
                      <span className="text-[10px] text-gray-400 dark:text-dark-500">{fmt(m.received_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            {selectedAdminEmail ? (
              <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50">
                  <p className="text-xs text-gray-500 dark:text-dark-400">{selectedAdminEmail.sender}</p>
                  <p className="font-medium text-gray-800 dark:text-dark-100 text-sm">{selectedAdminEmail.subject || '(Konu yok)'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-dark-500 mt-1">{fmt(selectedAdminEmail.received_at)}</p>
                  {selectedAdminEmail.otp_code && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="badge-otp">{selectedAdminEmail.otp_code}</span>
                      <button onClick={() => copyToClipboard(selectedAdminEmail.otp_code, 'OTP')} className="text-xs text-primary-600 dark:text-primary-400">📋 Kopyala</button>
                    </div>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto p-4">
                  <div className="text-sm text-gray-700 dark:text-dark-300 whitespace-pre-wrap font-mono">{selectedAdminEmail.body_text || '(HTML içerik)'}</div>
                </div>
              </div>
            ) : (
              <div className="card flex items-center justify-center min-h-[300px]">
                <div className="text-center text-gray-400 dark:text-dark-500 text-sm">
                  <span className="text-4xl block mb-2">✉️</span>
                  <p>Bir mail seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-dark-100">⚙️ Admin Paneli</h2>
          <div className="flex gap-2">
            <button onClick={triggerCleanup} className="btn-secondary text-xs">🧹 Temizle</button>
            <button onClick={handleLogout} className="btn-secondary text-xs">🚪 Çıkış</button>
          </div>
        </div>
        <div className="flex gap-1 border-t border-gray-100 dark:border-dark-700 pt-3">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'addresses', label: '📬 Adresler' },
            { id: 'domains', label: '🌐 Domainler' },
            { id: 'emails', label: '📧 Tüm Mailler' },
          ].map((t) => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'emails') fetchAllEmails(1); if (t.id === 'addresses') fetchAllAddresses(); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-700'}`}>{t.label}</button>
          ))}
        </div>
      </div>

      {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-2.5 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800 animate-slide-in">✅ {success}</div>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2.5 rounded-xl text-sm border border-red-200 dark:border-red-800 animate-slide-in">⚠️ {error}</div>}

      {/* ===== DASHBOARD ===== */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Mail', value: stats.total_emails, icon: '📧', color: 'from-blue-500 to-blue-600' },
              { label: 'Toplam Adres', value: stats.total_addresses, icon: '📬', color: 'from-emerald-500 to-emerald-600' },
              { label: 'Son 24 Saat', value: stats.recent_24h, icon: '⏰', color: 'from-amber-500 to-amber-600' },
              { label: 'OTP Algılanan', value: stats.otp_count, icon: '🔑', color: 'from-purple-500 to-purple-600' },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-4 text-white shadow-lg`}>
                <span className="text-2xl">{s.icon}</span>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar Chart - Top Domains */}
            {domainChartData.length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm mb-3">🏢 En Çok Mail Gelen Şirketler</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={domainChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie Chart - OTP vs Normal */}
            {stats.total_emails > 0 && (
              <div className="card">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm mb-3">🔑 OTP Dağılımı</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={otpPieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {otpPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* OTP List */}
          {stats.otp_emails?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm">🔑 Son OTP Kodları</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-dark-700/50">
                {stats.otp_emails.slice(0, 10).map((m) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100 truncate">{m.sender}</p>
                      <p className="text-[10px] text-gray-500 dark:text-dark-400 truncate">→ {m.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="badge-otp">{m.otp_code}</span>
                      <button onClick={() => copyToClipboard(m.otp_code, 'OTP')} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200">📋</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Emails */}
          {stats.latest_emails?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm">📬 Son Mailler</h3>
                <button onClick={() => setActiveTab('emails')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Tümü →</button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-dark-700/50 max-h-[300px] overflow-y-auto">
                {stats.latest_emails.slice(0, 10).map((m) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-700/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-800 dark:text-dark-100 truncate">{m.sender}</p>
                        {m.otp_code && <span className="badge-otp text-[9px]">🔑</span>}
                        {m.has_attachments && <span className="text-[10px] text-amber-500">📎</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-dark-400 truncate">→ {m.recipient_address}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-dark-500 flex-shrink-0">{fmt(m.received_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADDRESSES ===== */}
      {activeTab === 'addresses' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm">📬 Tüm Adresler ({allAddresses.length})</h3>
            <button onClick={fetchAllAddresses} className="text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">🔄 Yenile</button>
          </div>
          {allAddresses.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-dark-500 text-sm">📭 Henüz adres yok</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-dark-700/50 max-h-[600px] overflow-y-auto">
              {allAddresses.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-700/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-medium text-gray-800 dark:text-dark-100 text-sm">{a.address}</p>
                      {a.has_password && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0 rounded">🔒</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-dark-400 mt-0.5">
                      {a.email_count} mail • Oluşturulma: {fmt(a.created_at)}
                      {a.last_email_at && ` • Son mail: ${fmt(a.last_email_at)}`}
                    </p>
                  </div>
                  <button onClick={() => openMailbox(a.address)} className="btn-primary text-xs px-3 py-1.5">📬 Aç</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DOMAINS ===== */}
      {activeTab === 'domains' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm mb-3">🌐 Sunucu IP</h3>
            <div className="flex gap-2">
              <input type="text" value={serverIp} onChange={(e) => setServerIp(e.target.value)} placeholder="Sunucu IP" className="input-field flex-1 text-sm" />
              <button onClick={() => fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => { setServerIp(d.ip); flash('IP: ' + d.ip); }).catch(() => flash('IP algılanamadı', 'error'))} className="btn-secondary text-xs">🔍 Algıla</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm mb-3">Yeni Domain</h3>
            <form onSubmit={addDomain} className="flex gap-2">
              <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} placeholder="ornek.com" className="input-field flex-1 text-sm" />
              <button type="submit" disabled={loading || !newDomain.trim()} className="btn-primary text-sm">{loading ? '⏳' : '➕'} Ekle</button>
            </form>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50">
              <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm">Domainler ({domains.length})</h3>
            </div>
            {domains.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-500 text-sm">🌐 Henüz domain yok</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-dark-700/50">
                {domains.map((d) => (
                  <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-dark-100 text-sm">{d.domain}</p>
                      <p className="text-[10px] text-gray-500 dark:text-dark-400">{d.address_count} adres • {d.is_active ? <span className="text-green-600 dark:text-green-400">Aktif</span> : <span className="text-red-600 dark:text-red-400">Pasif</span>}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleDomain(d.id, d.is_active)} className={`px-2 py-1 rounded text-[10px] font-medium ${d.is_active ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>{d.is_active ? '⏸ Pasif' : '▶ Aktif'}</button>
                      <button onClick={() => deleteDomain(d.id, d.domain)} className="px-2 py-1 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EMAILS ===== */}
      {activeTab === 'emails' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 dark:text-dark-200 text-sm">📧 Tüm Mailler ({emailsTotal})</h3>
            <button onClick={() => fetchAllEmails(1)} className="text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">🔄 Yenile</button>
          </div>
          {allEmails.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-dark-500 text-sm">📭 Henüz mail yok</div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-dark-700/50 max-h-[600px] overflow-y-auto">
              {allEmails.map((m) => (
                <div key={m.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-700/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100 truncate">{m.sender}</p>
                      {m.otp_code && <span className="badge-otp text-[9px]">🔑 {m.otp_code}</span>}
                      {m.has_attachments && <span className="text-[10px] text-amber-500">📎</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-dark-400 truncate">→ <span className="font-mono">{m.recipient_address}</span> • {m.subject || '(Konu yok)'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-dark-500 flex-shrink-0">{fmt(m.received_at)}</span>
                </div>
              ))}
            </div>
          )}
          {emailsTotal > 50 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-700 bg-gray-50/80 dark:bg-dark-900/50 flex items-center justify-center gap-2">
              <button onClick={() => fetchAllEmails(emailsPage - 1)} disabled={emailsPage <= 1} className="btn-secondary text-xs">←</button>
              <span className="text-xs text-gray-500 dark:text-dark-400">Sayfa {emailsPage}</span>
              <button onClick={() => fetchAllEmails(emailsPage + 1)} disabled={allEmails.length < 50} className="btn-secondary text-xs">→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
