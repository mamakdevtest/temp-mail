import { useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, Download, Pause, Play, Search, ShieldCheck, UserRoundPlus } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { ListSkeleton } from './Skeleton';
import { PageHeader, Card, Field, Input, Select, Button, IconButton, StatusPill } from './ui';

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
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setPoolsLoading(true);
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
    finally { setPoolsLoading(false); }
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

  const activeCount = pools.filter((pool) => pool.status === 'active').length;

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="ADMIN BULK CONTROL" icon={ShieldCheck} title={t('adminBulk.title')} subtitle={t('adminBulk.subtitle')} actions={(
        <div className="text-right">
          <p className="section-title">{t('adminBulk.activePools')}</p>
          <p className="text-2xl font-semibold text-txt-primary tabular-nums">{activeCount}</p>
        </div>
      )} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Builder */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="t-card-title text-txt-primary">{t('adminBulk.adminGeneration')}</h2>
            <UserRoundPlus size={16} className="text-[rgb(var(--brand))]" />
          </div>
          <div className="space-y-3">
            <Field label={t('adminBulk.poolOwner')}>
              <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                {users.map((item) => <option key={item.id} value={item.id}>{item.username} · {item.package_name} · {t('adminBulk.addressCount', { count: item.address_count })}</option>)}
              </Select>
            </Field>
            {selectedOwner && <p className="t-caption text-txt-muted">{t('adminBulk.ownerQuotaNote', { used: selectedOwner.address_count, quota: selectedOwner.package_name === 'pro_plus' ? 50 : selectedOwner.package_name === 'pro' ? 25 : 3 })}</p>}
            <Field label="Prefix"><Input className="font-mono" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="campaign" /></Field>
            <Field label="Domain">
              <Select value={domain} onChange={(e) => setDomain(e.target.value)}>
                {domains.map((item) => <option key={item.id || item.domain} value={item.domain}>{item.domain}</option>)}
              </Select>
            </Field>
            <div className="flex gap-1.5">
              {COUNTS.map((value) => (
                <button key={value} onClick={() => setCount(value)} className={`flex-1 py-2 rounded-[var(--r-md)] text-sm font-medium transition-colors border ${count === value ? 'bg-[rgb(var(--brand)/0.1)] border-[rgb(var(--brand)/0.3)] text-[rgb(var(--brand))]' : 'border-brand-border text-txt-secondary hover:bg-brand-surface2'}`}>{value}</button>
              ))}
            </div>
            <Button variant="primary" className="w-full" loading={loading} onClick={generate}><Boxes size={15} /> {loading ? t('adminBulk.generating') : t('adminBulk.generateWithOverride')}</Button>
            {message && <p className="t-body-sm text-txt-secondary">{message}</p>}
          </div>
        </Card>

        {/* Guide */}
        <Card>
          <p className="section-title">CONTROL</p>
          <h2 className="t-card-title text-txt-primary mt-1">{t('adminBulk.guideTitle')}</h2>
          <p className="t-body-sm text-txt-muted mt-2">{t('adminBulk.guideBody')}</p>
          <ul className="mt-4 space-y-2 t-body-sm text-txt-secondary">
            <li><b className="text-txt-primary">{t('adminBulk.guideActiveLabel')}</b> {t('adminBulk.guideActive')}</li>
            <li><b className="text-txt-primary">{t('adminBulk.guidePauseLabel')}</b> {t('adminBulk.guidePause')}</li>
            <li><b className="text-txt-primary">{t('adminBulk.guideArchiveLabel')}</b> {t('adminBulk.guideArchive')}</li>
          </ul>
        </Card>
      </div>

      {/* Pool operations */}
      <Card>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="t-card-title text-txt-primary">{t('adminBulk.poolOperations')}</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('adminBulk.searchPlaceholder')} className="pl-9 py-2 w-48" />
            </div>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
              <option value="all">{t('adminBulk.allStatuses')}</option>
              <option value="active">{t('adminBulk.statusActive')}</option>
              <option value="paused">{t('adminBulk.statusPaused')}</option>
              <option value="archived">{t('adminBulk.statusArchived')}</option>
            </Select>
          </div>
        </div>
        {poolsLoading ? <ListSkeleton rows={4} /> : (
          <div className="space-y-2 stagger-in">
            {pools.map((pool) => (
              <div key={pool.id} className="flex items-center gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <code className="t-mono text-txt-primary block truncate">{pool.prefix}_*@{pool.domain}</code>
                  <p className="t-caption text-txt-muted">{pool.username} · {pool.package_name} · {t('adminBulk.addressCount', { count: pool.address_count })}</p>
                </div>
                <StatusPill status={pool.status} label={pool.status} />
                <div className="flex items-center gap-1 shrink-0">
                  {pool.status !== 'active' && <IconButton icon={Play} size={15} label={t('adminBulk.activate')} onClick={() => setPoolStatus(pool, 'active')} />}
                  {pool.status === 'active' && <IconButton icon={Pause} size={15} label={t('adminBulk.pause')} onClick={() => setPoolStatus(pool, 'paused')} />}
                  <IconButton icon={Archive} size={15} label={t('adminBulk.archive')} onClick={() => setPoolStatus(pool, 'archived')} />
                  <IconButton icon={Download} size={15} label={t('adminBulk.viewForCsv')} onClick={() => window.open(`/api/admin/bulk-pools/${pool.id}/addresses?limit=500`, '_blank')} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
