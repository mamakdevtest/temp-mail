import { useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, Download, Pause, Play, Search, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';

const COUNTS = [10, 25, 50, 100];

export default function AdminBulkStudio({ token, user, domains = [] }) {
  const { t } = useLocale();
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
    if (!normalized || !domain || !ownerId) { setMessage(t('adminBulk.selectOwnerPrefixDomain')); return; }
    setLoading(true); setMessage('');
    try {
      const response = await apiFetch('/api/addresses/bulk', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ owner_user_id: Number(ownerId), prefix: normalized, domain, count }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || t('adminBulk.generateFailed'));
      setMessage(t('adminBulk.generateSuccess', { count: data.addresses?.length || 0 }));
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
    <header className="ops-page-header"><div><p className="ops-eyebrow"><ShieldCheck size={14} /> ADMIN BULK CONTROL</p><h1>{t('adminBulk.title')}</h1><p>{t('adminBulk.subtitle')}</p></div><div className="ops-stat"><span>{t('adminBulk.activePools')}</span><strong>{pools.filter((pool) => pool.status === 'active').length}</strong></div></header>
    <div className="admin-bulk-layout">
      <article className="ops-card admin-bulk-builder"><div className="ops-card-heading"><div><span className="ops-step">NEW</span><h2>{t('adminBulk.adminGeneration')}</h2></div><UserRoundPlus size={18} /></div>
        <label className="ops-field"><span>{t('adminBulk.poolOwner')}</span><select className="input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.username} · {item.package_name} · {t('adminBulk.addressCount', { count: item.address_count })}</option>)}</select></label>
        {selectedOwner && <p className="admin-owner-note">{t('adminBulk.ownerQuotaNote', { used: selectedOwner.address_count, quota: selectedOwner.package_name === 'pro_plus' ? 50 : selectedOwner.package_name === 'pro' ? 25 : 3 })}</p>}
        <label className="ops-field"><span>Prefix</span><input className="input font-mono" value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="campaign" /></label>
        <label className="ops-field"><span>Domain</span><select className="input" value={domain} onChange={(event) => setDomain(event.target.value)}>{domains.map((item) => <option key={item.id || item.domain} value={item.domain}>{item.domain}</option>)}</select></label>
        <div className="bulk-counts">{COUNTS.map((value) => <button key={value} className={count === value ? 'is-active' : ''} onClick={() => setCount(value)}>{value}</button>)}</div>
        <button className="btn-primary w-full mt-6" disabled={loading} onClick={generate}><Boxes size={16} />{loading ? t('adminBulk.generating') : t('adminBulk.generateWithOverride')}</button>
        {message && <p className="ops-note mt-4">{message}</p>}
      </article>
      <article className="ops-card admin-bulk-guide"><span className="ops-step">CONTROL</span><h2>{t('adminBulk.guideTitle')}</h2><p>{t('adminBulk.guideBody')}</p><ul><li><b>{t('adminBulk.guideActiveLabel')}</b> {t('adminBulk.guideActive')}</li><li><b>{t('adminBulk.guidePauseLabel')}</b> {t('adminBulk.guidePause')}</li><li><b>{t('adminBulk.guideArchiveLabel')}</b> {t('adminBulk.guideArchive')}</li></ul></article>
    </div>
    <section className="ops-card bulk-operations"><div className="ops-card-heading"><div><span className="ops-step">POOLS</span><h2>{t('adminBulk.poolOperations')}</h2></div><div className="admin-bulk-filters"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('adminBulk.searchPlaceholder')} /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{t('adminBulk.allStatuses')}</option><option value="active">{t('adminBulk.statusActive')}</option><option value="paused">{t('adminBulk.statusPaused')}</option><option value="archived">{t('adminBulk.statusArchived')}</option></select></div></div>
      <div className="bulk-table">{pools.map((pool) => <article key={pool.id} className="bulk-admin-row"><div><code>{pool.prefix}_*@{pool.domain}</code><p>{pool.username} · {pool.package_name} · {t('adminBulk.addressCount', { count: pool.address_count })}</p></div><span className={`ops-status status-${pool.status}`}>{pool.status}</span><div className="bulk-admin-actions">{pool.status !== 'active' && <button className="icon-button" title={t('adminBulk.activate')} onClick={() => setPoolStatus(pool, 'active')}><Play size={15} /></button>}{pool.status === 'active' && <button className="icon-button" title={t('adminBulk.pause')} onClick={() => setPoolStatus(pool, 'paused')}><Pause size={15} /></button>}<button className="icon-button" title={t('adminBulk.archive')} onClick={() => setPoolStatus(pool, 'archived')}><Archive size={15} /></button><button className="icon-button" title={t('adminBulk.viewForCsv')} onClick={() => window.open(`/api/admin/bulk-pools/${pool.id}/addresses?limit=500`, '_blank')}><Download size={15} /></button></div></article>)}</div>
    </section>
  </section>;
}
