import { useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, Download, Pause, Play, Search, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const COUNTS = [10, 25, 50, 100];

export default function AdminBulkStudio({ token, user, domains = [] }) {
  const [users, setUsers] = useState([]);
  const [pools, setPools] = useState([]);
  const [ownerId, setOwnerId] = useState(String(user?.id || ''));
  const [prefix, setPrefix] = useState('');
  const [domain, setDomain] = useState('');
  const [count, setCount] = useState(25);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const [usersResponse, poolsResponse] = await Promise.all([
        apiFetch('/api/admin/users', { headers }),
        apiFetch(`/api/admin/bulk-pools?limit=100&q=${encodeURIComponent(query)}&status=${status}`, { headers }),
      ]);
      const usersData = await usersResponse.json();
      const poolsData = await poolsResponse.json();
      if (usersResponse.ok) setUsers(usersData.users || []);
      if (poolsResponse.ok) setPools(poolsData.pools || []);
    } catch (error) { setMessage(error.message); }
  };

  useEffect(() => { if (!domain && domains[0]?.domain) setDomain(domains[0].domain); }, [domain, domains]);
  useEffect(() => { void load(); }, [query, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOwner = useMemo(() => users.find((item) => String(item.id) === ownerId), [ownerId, users]);
  const generate = async () => {
    const normalized = prefix.trim().toLowerCase();
    if (!normalized || !domain || !ownerId) { setMessage('Sahip, prefix ve domain seçin.'); return; }
    setLoading(true); setMessage('');
    try {
      const response = await apiFetch('/api/addresses/bulk', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_user_id: Number(ownerId), prefix: normalized, domain, count }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Bulk üretimi başarısız');
      setMessage(`${data.addresses?.length || 0} adres üretildi. Yönetici kota override kaydı oluşturuldu.`);
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const setPoolStatus = async (pool, nextStatus) => {
    try {
      const response = await apiFetch(`/api/admin/bulk-pools/${pool.id}/status`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error);
      setPools((current) => current.map((item) => item.id === pool.id ? { ...item, status: nextStatus } : item));
    } catch (error) { setMessage(error.message); }
  };

  return <section className="ops-page admin-bulk-page">
    <header className="ops-page-header"><div><p className="ops-eyebrow"><ShieldCheck size={14} /> ADMIN BULK CONTROL</p><h1>Her havuz üzerinde tam operasyon yetkisi.</h1><p>Kullanıcı adına üretin, izin verin veya havuzu güvenli biçimde duraklatın.</p></div><div className="ops-stat"><span>Aktif havuz</span><strong>{pools.filter((pool) => pool.status === 'active').length}</strong></div></header>
    <div className="admin-bulk-layout">
      <article className="ops-card admin-bulk-builder"><div className="ops-card-heading"><div><span className="ops-step">NEW</span><h2>Yönetici üretimi</h2></div><UserRoundPlus size={18} /></div>
        <label className="ops-field"><span>Havuz sahibi</span><select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.username} · {item.package_name} · {item.address_count} adres</option>)}</select></label>
        {selectedOwner && <p className="admin-owner-note">Normal kota: {selectedOwner.address_count}/{selectedOwner.package_name === 'pro_plus' ? 50 : selectedOwner.package_name === 'pro' ? 25 : 3}. Bu işlem admin override olarak kaydedilir.</p>}
        <label className="ops-field"><span>Prefix</span><input className="input font-mono" value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="campaign" /></label>
        <label className="ops-field"><span>Domain</span><select className="input" value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item.id || item.domain} value={item.domain}>{item.domain}</option>)}</select></label>
        <div className="bulk-counts">{COUNTS.map((value) => <button key={value} className={count === value ? 'is-active' : ''} onClick={() => setCount(value)}>{value}</button>)}</div>
        <button className="btn-primary w-full mt-6" disabled={loading} onClick={generate}><Boxes size={16} />{loading ? 'Üretiliyor…' : 'Admin override ile üret'}</button>
        {message && <p className="ops-note mt-4">{message}</p>}
      </article>
      <article className="ops-card admin-bulk-guide"><span className="ops-step">CONTROL</span><h2>Net ve geri alınabilir işlem</h2><p>Arşiv mevcut mailbox’ları ve mailleri silmez. Sadece yeni üretimi kapatır.</p><ul><li><b>Aktif:</b> yeni adres üretilebilir.</li><li><b>Duraklat:</b> havuzu korur, üretimi engeller.</li><li><b>Arşivle:</b> operasyon listesinden çıkarır.</li></ul></article>
    </div>
    <section className="ops-card bulk-operations"><div className="ops-card-heading"><div><span className="ops-step">POOLS</span><h2>Havuz operasyonları</h2></div><div className="admin-bulk-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sahip, prefix, domain" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Tüm durumlar</option><option value="active">Aktif</option><option value="paused">Duraklatılmış</option><option value="archived">Arşiv</option></select></div></div>
      <div className="bulk-table">{pools.map((pool) => <article key={pool.id} className="bulk-admin-row"><div><code>{pool.prefix}_*@{pool.domain}</code><p>{pool.username} · {pool.package_name} · {pool.address_count} adres</p></div><span className={`ops-status status-${pool.status}`}>{pool.status}</span><div className="bulk-admin-actions">{pool.status !== 'active' && <button className="icon-button" title="Aktifleştir" onClick={() => setPoolStatus(pool, 'active')}><Play size={15} /></button>}{pool.status === 'active' && <button className="icon-button" title="Duraklat" onClick={() => setPoolStatus(pool, 'paused')}><Pause size={15} /></button>}<button className="icon-button" title="Arşivle" onClick={() => setPoolStatus(pool, 'archived')}><Archive size={15} /></button><button className="icon-button" title="CSV için adresleri görüntüle" onClick={() => window.open(`/api/admin/bulk-pools/${pool.id}/addresses?limit=500`, '_blank')}><Download size={15} /></button></div></article>)}</div>
    </section>
  </section>;
}
