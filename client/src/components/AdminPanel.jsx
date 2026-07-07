import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminPanel({ api, token }) {
  const [pw, setPw] = useState(() => localStorage.getItem('tm-admin-pw') || '');
  const [auth, setAuth] = useState(!!token); // JWT varsa direkt auth
  const [domains, setDomains] = useState([]);
  const [newDom, setNewDom] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [stats, setStats] = useState(null);
  const [addrs, setAddrs] = useState([]);
  const [emails, setEmails] = useState([]);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [emailsPage, setEmailsPage] = useState(1);
  const [tab, setTab] = useState('dashboard');
  const [serverIp, setServerIp] = useState(() => localStorage.getItem('tm-server-ip') || '');

  // Mailbox viewer
  const [mbox, setMbox] = useState(null);
  const [mboxEmails, setMboxEmails] = useState([]);
  const [mboxSel, setMboxSel] = useState(null);

  // JWT token varsa onu kullan, yoksa eski şifre yöntemini
  const H = token ? { 'Authorization': `Bearer ${token}` } : { 'x-admin-password': pw };

  useEffect(() => { if (serverIp) localStorage.setItem('tm-server-ip', serverIp); }, [serverIp]);

  const flash = (msg, t = 'success') => {
    t === 'success' ? setOk(msg) : setErr(msg);
    setTimeout(() => { setOk(null); setErr(null); }, 3000);
  };

  const apiGet = useCallback(async (path) => {
    const r = await fetch(`${api}${path}`, { headers: H });
    if (r.status === 401) { setAuth(false); return null; }
    if (!r.ok) return null;
    return r.json();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, pw]);

  const apiPost = useCallback(async (path, body) => {
    const r = await fetch(`${api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...H }, body: JSON.stringify(body) });
    return r.json();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, pw]);

  const loadDomains = useCallback(async () => { const d = await apiGet('/admin/domains'); if (d?.domains) { setDomains(d.domains); setAuth(true); } }, [apiGet]);
  const loadStats = useCallback(async () => { const d = await apiGet('/admin/stats'); if (d) setStats(d); }, [apiGet]);
  const loadAddrs = useCallback(async () => { const d = await apiGet('/admin/addresses'); if (d?.addresses) setAddrs(d.addresses); }, [apiGet]);
  const loadEmails = useCallback(async (p = 1) => { const d = await apiGet(`/admin/emails?page=${p}&limit=50`); if (d) { setEmails(d.emails || []); setEmailsTotal(d.total || 0); setEmailsPage(p); } }, [apiGet]);
  const openMbox = useCallback(async (addr) => { const d = await apiGet(`/admin/mailbox/${encodeURIComponent(addr)}`); if (d) { setMbox(d); setMboxEmails(d.emails || []); setMboxSel(null); } }, [apiGet]);
  const openMboxEmail = useCallback(async (id) => { try { const r = await fetch(`${api}/emails/single/${id}`); if (r.ok) setMboxSel(await r.json()); } catch (e) { /* */ } }, [api]);

  const login = async (e) => {
    e.preventDefault(); if (!pw) return;
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${api}/admin/domains`, { headers: { 'x-admin-password': pw } });
      if (r.status === 401) { setErr('Geçersiz şifre'); setLoading(false); return; }
      const d = await r.json();
      if (d.domains) { setDomains(d.domains); setAuth(true); localStorage.setItem('tm-admin-pw', pw); flash('Giriş başarılı!'); }
    } catch (e) { setErr('Bağlantı hatası'); } finally { setLoading(false); }
  };

  const logout = () => { setAuth(false); setPw(''); localStorage.removeItem('tm-admin-pw'); setStats(null); setEmails([]); setMbox(null); };

  const addDomain = async (e) => {
    e.preventDefault(); if (!newDom.trim()) return; setLoading(true); setErr(null);
    try { const d = await apiPost('/admin/domains', { domain: newDom.trim() }); if (d.error) throw new Error(d.error); setNewDom(''); flash(`"${d.domain.domain}" eklendi!`); loadDomains(); } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const toggleDom = async (id, active) => {
    await fetch(`${api}/admin/domains/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...H }, body: JSON.stringify({ is_active: !active }) });
    loadDomains();
  };

  const delDom = async (id, name) => { if (!confirm(`"${name}" silinecek?`)) return; await fetch(`${api}/admin/domains/${id}`, { method: 'DELETE', headers: H }); loadDomains(); };

  const cleanup = async () => { if (!confirm('TÜM adresler ve mailler silinecek?')) return; const d = await apiPost('/admin/cleanup', { type: 'all' }); flash(d.message); loadDomains(); loadStats(); };

  const copy = (t, l) => { navigator.clipboard.writeText(t); flash(`"${l}" kopyalandı!`); };

  useEffect(() => { if (auth) { loadDomains(); loadStats(); loadAddrs(); loadEmails(); } }, [auth]); // eslint-disable-line

  const fmt = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const barData = stats?.top_domains?.slice(0, 8).map((d) => ({ name: d.domain.length > 12 ? d.domain.slice(0, 10) + '..' : d.domain, value: d.email_count })) || [];
  const pieData = stats ? [{ name: 'OTP', value: stats.otp_count || 0 }, { name: 'Normal', value: (stats.total_emails || 0) - (stats.otp_count || 0) }] : [];

  /* ===== LOGIN ===== */
  if (!auth) {
    return (
      <div className="max-w-sm mx-auto mt-10">
        <div className="bg-brand-surface rounded-2xl border border-brand-border/40 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-8 text-center">
            <span className="text-5xl block mb-3">🔐</span>
            <h2 className="text-xl font-bold text-white">Admin Paneli</h2>
            <p className="text-primary-200 text-xs mt-1">Yönetim arayüzüne erişim</p>
          </div>
          <form onSubmit={login} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-txt-muted mb-1.5">Şifre</label>
              <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); }} placeholder="Admin şifresi" className="w-full px-4 py-2.5 border border-brand-border/40 rounded-lg bg-brand-surface2 text-txt-primary focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm" autoFocus />
            </div>
            {err && <p className="text-red-500 text-xs flex items-center gap-1">⚠️ {err}</p>}
            <button type="submit" disabled={loading || !pw} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 shadow-sm">
              {loading ? '⏳ Giriş yapılıyor...' : '🔓 Giriş Yap'}
            </button>
            <p className="text-[10px] text-txt-disabled text-center">Varsayılan: <code className="bg-brand-surface2 px-1 rounded">admin123</code></p>
          </form>
        </div>
      </div>
    );
  }

  /* ===== MAILBOX VIEWER ===== */
  if (mbox) {
    return (
      <div className="space-y-4">
        <div className="bg-brand-surface rounded-xl border border-brand-border/40 px-5 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => { setMbox(null); setMboxSel(null); }} className="text-xs text-txt-muted hover:text-gray-700 dark:hover:text-dark-200 mb-1">← Admin Paneline Dön</button>
            <h2 className="text-base font-bold text-txt-primary font-mono">📬 {mbox.address}</h2>
            <p className="text-[10px] text-txt-muted">{mboxEmails.length} mail • {fmt(mbox.created_at)}</p>
          </div>
          <button onClick={() => copy(mbox.address, 'Adres')} className="text-xs px-3 py-1.5 rounded-md bg-brand-surface2 text-txt-secondary border border-brand-border/40">📋 Kopyala</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-brand-border/20 text-xs font-semibold text-txt-secondary">Mailler ({mboxEmails.length})</div>
            <div className="max-h-[500px] overflow-y-auto">
              {mboxEmails.length === 0 ? <div className="py-12 text-center text-txt-disabled text-xs">📭 Boş</div> : mboxEmails.map((m) => (
                <div key={m.id} onClick={() => openMboxEmail(m.id)} className={`px-4 py-2.5 cursor-pointer border-b border-brand-border/20 last:border-0 transition-colors hover:bg-brand-surface2/50 ${mboxSel?.id === m.id ? 'bg-accent-blue/10' : ''}`}>
                  <p className="text-xs font-medium text-txt-primary truncate">{m.sender}</p>
                  <p className="text-[10px] text-txt-muted truncate">{m.subject || '(Konu yok)'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {m.otp_code && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 rounded font-mono">🔑 {m.otp_code}</span>}
                    <span className="text-[9px] text-txt-disabled">{fmt(m.received_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3">
            {mboxSel ? (
              <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
                <div className="px-4 py-3 border-b border-brand-border/20">
                  <p className="text-[10px] text-txt-muted">{mboxSel.sender}</p>
                  <p className="text-sm font-medium text-txt-primary">{mboxSel.subject || '(Konu yok)'}</p>
                  <p className="text-[10px] text-txt-disabled mt-0.5">{fmt(mboxSel.received_at)}</p>
                  {mboxSel.otp_code && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-mono font-bold text-sm">{mboxSel.otp_code}</span>
                      <button onClick={() => copy(mboxSel.otp_code, 'OTP')} className="text-xs text-primary-600 dark:text-primary-400">📋 Kopyala</button>
                    </div>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto p-4">
                  <pre className="text-xs text-gray-700 dark:text-dark-300 whitespace-pre-wrap font-mono">{mboxSel.body_text || '(HTML içerik)'}</pre>
                </div>
              </div>
            ) : (
              <div className="bg-brand-surface rounded-xl border border-brand-border/40 flex items-center justify-center min-h-[300px]">
                <div className="text-center text-txt-disabled"><span className="text-3xl block mb-2">✉️</span><p className="text-xs">Bir mail seçin</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN PANEL ===== */
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="bg-brand-surface rounded-xl border border-brand-border/40 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-txt-primary">⚙️ Admin</h2>
          <div className="flex gap-2">
            <button onClick={cleanup} className="text-xs px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40">🧹 Temizle</button>
            <button onClick={logout} className="text-xs px-3 py-1.5 rounded-md bg-brand-surface2 text-txt-secondary border border-brand-border/40 hover:bg-brand-surface3">🚪 Çıkış</button>
          </div>
        </div>
        <div className="flex gap-1">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dashboard' },
            { id: 'addresses', icon: '📬', label: 'Adresler' },
            { id: 'domains', icon: '🌐', label: 'Domainler' },
            { id: 'emails', icon: '📧', label: 'Mailler' },
          ].map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'emails') loadEmails(1); if (t.id === 'addresses') loadAddrs(); }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-primary-600 text-white shadow-sm' : 'text-txt-muted hover:bg-gray-100 dark:hover:bg-dark-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flash */}
      {ok && <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-lg text-xs border border-emerald-200 dark:border-emerald-800 animate-slide-in">✅ {ok}</div>}
      {err && <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-xs border border-red-200 dark:border-red-800 animate-slide-in">⚠️ {err}</div>}

      {/* ===== DASHBOARD ===== */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Mail', value: stats.total_emails, icon: '📧', grad: 'from-blue-500 to-blue-600' },
              { label: 'Toplam Adres', value: stats.total_addresses, icon: '📬', grad: 'from-emerald-500 to-emerald-600' },
              { label: 'Son 24 Saat', value: stats.recent_24h, icon: '⏰', grad: 'from-amber-500 to-amber-600' },
              { label: 'OTP Kodları', value: stats.otp_count, icon: '🔑', grad: 'from-purple-500 to-purple-600' },
            ].map((s) => (
              <div key={s.label} className={`bg-gradient-to-br ${s.grad} rounded-xl p-4 text-white shadow-lg`}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-[10px] opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barData.length > 0 && (
              <div className="bg-brand-surface rounded-xl border border-brand-border/40 p-4">
                <h3 className="text-xs font-semibold text-txt-secondary mb-3">🏢 Şirket Bazlı Mail</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {stats.total_emails > 0 && (
              <div className="bg-brand-surface rounded-xl border border-brand-border/40 p-4">
                <h3 className="text-xs font-semibold text-txt-secondary mb-3">🔑 OTP Dağılımı</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {stats.otp_emails?.length > 0 && (
            <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-brand-border/20 text-xs font-semibold text-txt-secondary">🔑 Son OTP Kodları</div>
              <div className="divide-y divide-gray-50 dark:divide-dark-800 max-h-[250px] overflow-y-auto">
                {stats.otp_emails.slice(0, 8).map((m) => (
                  <div key={m.id} className="px-4 py-2 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-txt-primary truncate">{m.sender}</p>
                      <p className="text-[10px] text-txt-muted truncate">→ {m.address}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-mono font-bold text-xs">{m.otp_code}</span>
                      <button onClick={() => copy(m.otp_code, 'OTP')} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200 text-xs">📋</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.latest_emails?.length > 0 && (
            <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-brand-border/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-txt-secondary">📬 Son Mailler</span>
                <button onClick={() => setTab('emails')} className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline">Tümü →</button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-dark-800 max-h-[250px] overflow-y-auto">
                {stats.latest_emails.slice(0, 8).map((m) => (
                  <div key={m.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-800/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium text-txt-primary truncate">{m.sender}</p>
                        {m.otp_code && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 rounded">🔑</span>}
                        {m.has_attachments && <span className="text-[10px] text-amber-500">📎</span>}
                      </div>
                      <p className="text-[10px] text-txt-muted truncate">→ {m.recipient_address}</p>
                    </div>
                    <span className="text-[9px] text-txt-disabled flex-shrink-0">{fmt(m.received_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ADDRESSES ===== */}
      {tab === 'addresses' && (
        <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-brand-border/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-txt-secondary">📬 Adresler ({addrs.length})</span>
            <button onClick={loadAddrs} className="text-[10px] px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">🔄</button>
          </div>
          {addrs.length === 0 ? <div className="py-12 text-center text-txt-disabled text-xs">📭 Henüz adres yok</div> : (
            <div className="divide-y divide-gray-50 dark:divide-dark-800 max-h-[600px] overflow-y-auto">
              {addrs.map((a) => (
                <div key={a.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium text-txt-primary">{a.address}</span>
                      {a.has_password && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 rounded">🔒</span>}
                    </div>
                    <p className="text-[10px] text-txt-muted">{a.email_count} mail • {fmt(a.created_at)}{a.last_email_at ? ` • Son: ${fmt(a.last_email_at)}` : ''}</p>
                  </div>
                  <button onClick={() => openMbox(a.address)} className="text-xs px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white transition-colors">📬 Aç</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DOMAINS ===== */}
      {tab === 'domains' && (
        <div className="space-y-4">
          <div className="bg-brand-surface rounded-xl border border-brand-border/40 p-4">
            <h3 className="text-xs font-semibold text-txt-secondary mb-2">🌐 Sunucu IP</h3>
            <div className="flex gap-2">
              <input value={serverIp} onChange={(e) => setServerIp(e.target.value)} placeholder="IP adresi" className="flex-1 px-3 py-2 text-sm border border-brand-border/40 rounded-lg bg-brand-surface2 text-txt-primary focus:ring-2 focus:ring-primary-500 outline-none" />
              <button onClick={() => fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => { setServerIp(d.ip); flash('IP: ' + d.ip); }).catch(() => flash('Algılanamadı', 'error'))} className="text-xs px-3 py-2 rounded-lg bg-brand-surface2 text-txt-secondary border border-brand-border/40">🔍</button>
            </div>
          </div>
          <div className="bg-brand-surface rounded-xl border border-brand-border/40 p-4">
            <h3 className="text-xs font-semibold text-txt-secondary mb-2">Yeni Domain</h3>
            <form onSubmit={addDomain} className="flex gap-2">
              <input value={newDom} onChange={(e) => setNewDom(e.target.value)} placeholder="ornek.com" className="flex-1 px-3 py-2 text-sm border border-brand-border/40 rounded-lg bg-brand-surface2 text-txt-primary focus:ring-2 focus:ring-primary-500 outline-none" />
              <button type="submit" disabled={loading || !newDom.trim()} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">{loading ? '⏳' : '➕ Ekle'}</button>
            </form>
          </div>
          <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-brand-border/20 text-xs font-semibold text-txt-secondary">Domainler ({domains.length})</div>
            {domains.length === 0 ? <div className="py-12 text-center text-txt-disabled text-xs">🌐 Henüz domain yok</div> : (
              <div className="divide-y divide-gray-50 dark:divide-dark-800">
                {domains.map((d) => (
                  <div key={d.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-txt-primary">{d.domain}</p>
                      <p className="text-[10px] text-txt-muted">{d.address_count} adres • {d.is_active ? <span className="text-green-600 dark:text-green-400">Aktif</span> : <span className="text-red-600 dark:text-red-400">Pasif</span>}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleDom(d.id, d.is_active)} className={`px-2 py-1 rounded text-[10px] font-medium ${d.is_active ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>{d.is_active ? '⏸' : '▶'}</button>
                      <button onClick={() => delDom(d.id, d.domain)} className="px-2 py-1 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EMAILS ===== */}
      {tab === 'emails' && (
        <div className="bg-brand-surface rounded-xl border border-brand-border/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-brand-border/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-txt-secondary">📧 Tüm Mailler ({emailsTotal})</span>
            <button onClick={() => loadEmails(1)} className="text-[10px] px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">🔄</button>
          </div>
          {emails.length === 0 ? <div className="py-12 text-center text-txt-disabled text-xs">📭 Henüz mail yok</div> : (
            <div className="divide-y divide-gray-50 dark:divide-dark-800 max-h-[600px] overflow-y-auto">
              {emails.map((m) => (
                <div key={m.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-dark-800/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-txt-primary truncate">{m.sender}</span>
                      {m.otp_code && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 rounded font-mono">🔑 {m.otp_code}</span>}
                      {m.has_attachments && <span className="text-[10px] text-amber-500">📎</span>}
                    </div>
                    <p className="text-[10px] text-txt-muted truncate">→ <span className="font-mono">{m.recipient_address}</span> • {m.subject || '(Konu yok)'}</p>
                  </div>
                  <span className="text-[9px] text-txt-disabled flex-shrink-0">{fmt(m.received_at)}</span>
                </div>
              ))}
            </div>
          )}
          {emailsTotal > 50 && (
            <div className="px-4 py-2 border-t border-brand-border/20 flex items-center justify-center gap-2">
              <button onClick={() => loadEmails(emailsPage - 1)} disabled={emailsPage <= 1} className="text-xs px-2 py-1 rounded bg-brand-surface2 text-txt-secondary disabled:opacity-30">←</button>
              <span className="text-[10px] text-txt-muted">{emailsPage}</span>
              <button onClick={() => loadEmails(emailsPage + 1)} disabled={emails.length < 50} className="text-xs px-2 py-1 rounded bg-brand-surface2 text-txt-secondary disabled:opacity-30">→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
