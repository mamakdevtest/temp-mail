import { useEffect, useMemo, useState } from 'react';
import { Boxes, CheckCircle2, Clipboard, Download, Inbox, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const COUNTS = [5, 10, 25, 50, 100];

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
  const [pools, setPools] = useState([]);
  const [prefix, setPrefix] = useState('');
  const [domain, setDomain] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const isAdmin = user?.role === 'admin';
  const canUseBulk = isAdmin || (user?.role === 'pro' && ['pro', 'pro_plus'].includes(pkg?.name) && user?.bulk_access_enabled);
  const activeDomains = domains.filter((item) => item.is_active !== 0);

  useEffect(() => {
    if (!domain && activeDomains[0]?.domain) setDomain(activeDomains[0].domain);
  }, [domain, activeDomains]);

  const loadPools = async () => {
    if (!token) return;
    try {
      const response = await apiFetch('/api/addresses/bulk', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Havuzlar alınamadı');
      setPools(data.pools || []);
    } catch (nextError) { setError(nextError.message); }
  };

  useEffect(() => { void loadPools(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const matchedPool = useMemo(() => pools.find((pool) => pool.prefix === prefix.toLowerCase() && pool.domain === domain), [pools, prefix, domain]);
  const startIndex = Number(matchedPool?.next_index || 0);
  const normalizedPrefix = prefix.trim().toLowerCase();
  const previewStart = normalizedPrefix && domain ? `${normalizedPrefix}_${startIndex}@${domain}` : 'prefix_0@domain';
  const previewEnd = normalizedPrefix && domain ? `${normalizedPrefix}_${startIndex + Math.max(1, count) - 1}@${domain}` : 'prefix_n@domain';

  const createPool = async () => {
    setError('');
    setResult(null);
    if (!/^[a-z0-9][a-z0-9._-]{0,39}$/i.test(normalizedPrefix)) {
      setError('Prefix harf veya rakamla başlamalı; 2–40 karakter kullanabilirsiniz.');
      return;
    }
    if (!domain) { setError('Bir domain seçin.'); return; }
    setLoading(true);
    try {
      const response = await apiFetch('/api/addresses/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prefix: normalizedPrefix, domain, count }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Adresler oluşturulamadı');
      setResult(data);
      await loadPools();
    } catch (nextError) { setError(nextError.message); }
    finally { setLoading(false); }
  };

  if (!canUseBulk) {
    return <section className="ops-page ops-empty"><ShieldAlert size={30} /><h1>Bulk Studio erişimi kapalı</h1><p>Bulk adres havuzları yalnız bulk yetkisi açılmış Pro ve Pro+ hesaplarda kullanılabilir.</p></section>;
  }

  return (
    <section className="ops-page bulk-studio">
      <header className="ops-page-header">
        <div><p className="ops-eyebrow"><Boxes size={14} /> BULK STUDIO</p><h1>Adres havuzunu dakikalar değil, saniyeler içinde oluştur.</h1><p>Prefix belirleyin; sistem boş indeksleri güvenle sıraya koyar.</p></div>
        <div className="ops-stat"><span>Plan</span><strong>{isAdmin ? 'Admin override' : pkg?.display_name || 'Pro'}</strong></div>
      </header>

      <div className="bulk-layout">
        <article className="ops-card bulk-builder">
          <div className="ops-card-heading"><div><span className="ops-step">01</span><h2>Yeni adres serisi</h2></div><Sparkles size={18} /></div>
          <label className="ops-field"><span>Prefix</span><input className="input font-mono" value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="ornek" autoComplete="off" /><small>Adresler <b>{previewStart}</b> ile başlayacak.</small></label>
          <label className="ops-field"><span>Domain</span><select className="input" value={domain} onChange={(event) => setDomain(event.target.value)}>{activeDomains.map((item) => <option key={item.id || item.domain} value={item.domain}>{item.domain}</option>)}</select></label>
          <div className="ops-field"><span>Kaç adres?</span><div className="bulk-counts">{COUNTS.map((value) => <button key={value} className={count === value ? 'is-active' : ''} onClick={() => setCount(value)}>{value}</button>)}</div><input className="input mt-3" type="number" min="1" max="100" value={count} onChange={(event) => setCount(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /></div>
          <button className="btn-primary w-full mt-6" onClick={createPool} disabled={loading}>{loading ? 'Adresler hazırlanıyor…' : <><Plus size={16} /> Adresleri oluştur</>}</button>
          {error && <p className="ops-error">{error}</p>}
        </article>

        <aside className="ops-card bulk-preview">
          <div className="ops-card-heading"><div><span className="ops-step">02</span><h2>Canlı önizleme</h2></div></div>
          <div className="bulk-address-preview"><span>İlk adres</span><code>{previewStart}</code><span>Son adres</span><code>{previewEnd}</code></div>
          <p className="ops-note">{matchedPool ? `Bu havuz ${matchedPool.next_index}. indeksten devam edecek.` : 'Yeni bir prefix havuzu oluşturulacak.'}</p>
          {result && <div className="bulk-success"><CheckCircle2 size={20} /><div><strong>{result.addresses?.length || 0} adres hazır</strong><p>{result.pool?.prefix}_* @{result.pool?.domain}</p></div><button className="icon-button" title="Tümünü kopyala" onClick={() => navigator.clipboard.writeText((result.addresses || []).join('\n'))}><Clipboard size={16} /></button><button className="icon-button" title="TXT indir" onClick={() => downloadAddresses(result.addresses || [], result.pool?.prefix)}><Download size={16} /></button></div>}
        </aside>
      </div>

      <section className="ops-card bulk-pool-list"><div className="ops-card-heading"><div><span className="ops-step">03</span><h2>Havuzların</h2></div><span className="ops-muted">{pools.length} aktif kayıt</span></div>
        {pools.length ? <div className="bulk-pool-grid">{pools.map((pool) => <article key={pool.id} className="bulk-pool-item"><div><code>{pool.prefix}_* @{pool.domain}</code><p>{pool.address_count} adres · sonraki indeks {pool.next_index}</p></div><div className="bulk-pool-actions"><button className="btn-primary text-xs px-3 py-2" onClick={() => onOpenPool?.(pool)}><Inbox size={14} /> Mailleri aç</button><button className="btn-secondary text-xs" onClick={() => { setPrefix(pool.prefix); setDomain(pool.domain); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Devam et</button><button className="icon-button" title="Kopyala" onClick={() => navigator.clipboard.writeText(`${pool.prefix}_*@${pool.domain}`)}><Clipboard size={15} /></button></div></article>)}</div> : <div className="ops-empty-inline"><Boxes size={22} /><p>Henüz bir havuz oluşturmadınız.</p></div>}</section>
    </section>
  );
}
