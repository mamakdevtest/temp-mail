import { useEffect, useMemo, useState } from 'react';
import { Boxes, CheckCircle2, Clipboard, Download, Inbox, Plus, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { PageHeader, Card, Field, Input, Select, Button, IconButton, EmptyState, ErrorState, StatCard } from './ui';
import { ListSkeleton } from './Skeleton';

const COUNTS = [5, 10, 25, 50, 100, 250, 500, 1000];

function downloadAddresses(addresses, prefix) {
  const blob = new Blob([addresses.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix || 'bulk-addresses'}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function BulkStudio({ token, user, pkg, domains = [], onOpenPool }) {
  const { t } = useLocale();
  const [pools, setPools] = useState([]);
  const [prefix, setPrefix] = useState('');
  const [domain, setDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [poolsLoading, setPoolsLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const isAdmin = user?.role === 'admin';
  const canUseBulk = isAdmin || (user?.role === 'pro' && ['pro', 'pro_plus'].includes(pkg?.name) && user?.bulk_access_enabled);
  const activeDomains = domains.filter((item) => item.is_active !== 0);

  useEffect(() => {
    if (!domain && activeDomains[0]?.domain) setDomain(activeDomains[0].domain);
  }, [domain, activeDomains]);
  // Reset subdomain when domain changes.
  useEffect(() => { setSubdomain(''); }, [domain]);
  const matchedDomain = activeDomains.find((d) => d.domain === domain);
  const domainSubdomains = matchedDomain?.subdomains || [];

  const loadPools = async () => {
    if (!token) return;
    setPoolsLoading(true);
    try {
      const response = await apiFetch('/api/addresses/bulk', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || t('bulk.loadPoolsFailed'));
      setPools(data.pools || []);
    } catch (nextError) { setError(nextError.message); }
    finally { setPoolsLoading(false); }
  };

  useEffect(() => { void loadPools(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchedPool = useMemo(() => pools.find((pool) => pool.prefix === prefix.toLowerCase() && pool.domain === (subdomain ? `${subdomain}.${domain}` : domain)), [pools, prefix, domain, subdomain]);
  const startIndex = Number(matchedPool?.next_index || 0);
  const normalizedPrefix = prefix.trim().toLowerCase();
  const fullDomain = subdomain ? `${subdomain}.${domain}` : domain;
  const previewStart = normalizedPrefix && domain ? `${normalizedPrefix}_${startIndex}@${fullDomain}` : 'prefix_0@domain';
  const previewEnd = normalizedPrefix && domain ? `${normalizedPrefix}_${startIndex + Math.max(1, count) - 1}@${fullDomain}` : 'prefix_n@domain';

  const createPool = async () => {
    setError('');
    setResult(null);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(normalizedPrefix)) {
      setError(t('bulk.prefixInvalid'));
      return;
    }
    if (!domain) { setError(t('bulk.selectDomain')); return; }
    setLoading(true);
    try {
      const response = await apiFetch('/api/addresses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prefix: normalizedPrefix, domain, subdomain, count }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || t('bulk.createFailed'));
      setResult(data);
      await loadPools();
    } catch (nextError) { setError(nextError.message); }
    finally { setLoading(false); }
  };

  if (!canUseBulk) {
    return (
      <section className="max-w-2xl mx-auto py-10">
        <EmptyState icon={ShieldAlert} title={t('bulk.accessDeniedTitle')} description={t('bulk.accessDeniedBody')} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={t('bulk.eyebrow')}
        icon={Boxes}
        title={t('bulk.title')}
        subtitle={t('bulk.subtitle')}
        actions={<StatCard label={t('bulk.plan')} value={isAdmin ? t('bulk.adminOverride') : (pkg?.display_name || 'Pro')} tone={isAdmin ? 'pro' : 'brand'} />}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="section-title text-[rgb(var(--brand))]">01</span>
            <h2 className="t-card-title text-txt-primary">{t('bulk.newSeries')}</h2>
          </div>
          <Field label={t('bulk.prefixLabel')} hint={t('bulk.startWith', { address: previewStart })}>
            <Input className="font-mono" value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder={t('bulk.prefixPlaceholder')} autoComplete="off" />
          </Field>
          <Field label={t('bulk.domainLabel')}>
            <Select value={domain} onChange={(event) => setDomain(event.target.value)}>
              {activeDomains.map((item) => <option key={item.id || item.domain} value={item.domain}>{item.domain}</option>)}
            </Select>
          </Field>
          {domainSubdomains.length > 0 && (
            <Field label={t('bulk.subdomainLabel') || 'Subdomain (opsiyonel)'}>
              <Select value={subdomain} onChange={(event) => setSubdomain(event.target.value)}>
                <option value="">{t('bulk.noSubdomain') || '— Yok —'}</option>
                {domainSubdomains.map((sub) => <option key={sub.id || sub.name} value={sub.name}>{sub.full_domain}</option>)}
              </Select>
            </Field>
          )}
          <Field label={t('bulk.howMany')}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCount(value)}
                  className={`px-3 py-1.5 rounded-[var(--r-md)] text-sm font-medium tabular-nums border transition-colors ${count === value ? 'border-[rgb(var(--brand))] bg-[rgb(var(--brand)/0.1)] text-[rgb(var(--brand))]' : 'border-brand-border text-txt-secondary hover:bg-brand-surface2'}`}
                >
                  {value}
                </button>
              ))}
            </div>
            <Input className="mt-2" type="number" min="1" max="1000" value={count} onChange={(event) => setCount(Math.min(1000, Math.max(1, Number(event.target.value) || 1)))} />
          </Field>
          <Button variant="primary" className="w-full" onClick={createPool} loading={loading} icon={loading ? undefined : Plus}>
            {loading ? t('bulk.preparing') : t('bulk.createAddresses')}
          </Button>
          {error && <ErrorState message={error} />}
        </Card>

        <Card as="aside" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="section-title text-[rgb(var(--brand))]">02</span>
            <h2 className="t-card-title text-txt-primary">{t('bulk.livePreview')}</h2>
          </div>
          <div className="space-y-2">
            <div className="rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 p-3">
              <p className="section-title">{t('bulk.firstAddress')}</p>
              <code className="t-mono text-txt-primary break-all">{previewStart}</code>
            </div>
            <div className="rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 p-3">
              <p className="section-title">{t('bulk.lastAddress')}</p>
              <code className="t-mono text-txt-primary break-all">{previewEnd}</code>
            </div>
          </div>
          <p className="t-body-sm text-txt-muted">{matchedPool ? t('bulk.continueFromIndex', { index: matchedPool.next_index }) : t('bulk.newPoolWillCreate', { count })}</p>
          {result && (
            <div className="flex items-center gap-3 rounded-[var(--r-lg)] border border-[rgb(var(--success)/0.25)] bg-[rgb(var(--success)/0.08)] p-3">
              <CheckCircle2 size={20} className="text-[rgb(var(--success-fg))] shrink-0" />
              <div className="min-w-0 flex-1">
                <strong className="block text-sm text-txt-primary">{t('bulk.addressesReady', { count: result.addresses?.length || 0 })}</strong>
                <p className="t-mono text-txt-muted truncate">{t('bulk.successTarget', { prefix: result.pool?.prefix, domain: result.pool?.domain })}</p>
              </div>
              <IconButton icon={Clipboard} label={t('bulk.copyAll')} onClick={() => navigator.clipboard.writeText((result.addresses || []).join('\n'))} />
              <IconButton icon={Download} label={t('bulk.downloadTxt')} onClick={() => downloadAddresses(result.addresses || [], result.pool?.prefix)} />
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="section-title text-[rgb(var(--brand))]">03</span>
            <h2 className="t-card-title text-txt-primary">{t('bulk.yourPools')}</h2>
          </div>
          <span className="t-body-sm text-txt-muted">{t('bulk.activeRecords', { count: pools.length })}</span>
        </div>
        {poolsLoading ? (
          <ListSkeleton rows={3} />
        ) : pools.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {pools.map((pool) => (
              <article key={pool.id} className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 p-3.5 flex flex-col gap-3">
                <div className="min-w-0">
                  <code className="t-mono text-txt-primary break-all">{pool.prefix}_* @{pool.domain}</code>
                  <p className="t-body-sm text-txt-muted mt-1">{t('bulk.poolMeta', { count: pool.address_count, index: pool.next_index })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="sm" icon={Inbox} onClick={() => onOpenPool?.(pool)}>{t('bulk.openMails')}</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setPrefix(pool.prefix); setDomain(pool.domain); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{t('bulk.continue')}</Button>
                  <IconButton icon={Clipboard} label={t('bulk.copy')} onClick={() => navigator.clipboard.writeText(`${pool.prefix}_*@${pool.domain}`)} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={Boxes} title={t('bulk.noPools')} />
        )}
      </Card>
    </section>
  );
}
