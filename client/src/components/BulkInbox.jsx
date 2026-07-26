import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Filter, Inbox, MailOpen, RefreshCw, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function BulkInbox({ token, pool }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [otpOnly, setOtpOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [copiedOtp, setCopiedOtp] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async ({ cursor = null, append = false } = {}) => {
    if (!pool?.id) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (query.trim()) params.set('q', query.trim());
      if (otpOnly) params.set('otp_only', '1');
      if (cursor) params.set('cursor', String(cursor));
      const response = await apiFetch(`/api/addresses/bulk/${pool.id}/emails?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'Bulk mailleri alınamadı');
      setData((previous) => append ? { ...payload, emails: [...(previous?.emails || []), ...(payload.emails || [])] } : payload);
    } catch (nextError) { setError(nextError.message); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }, [otpOnly, pool?.id, query, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const emails = data?.emails || [];
  const headline = data?.pool || pool;
  const nextCursor = data?.pagination?.next_cursor;
  const copyOtp = async (otp) => {
    try { await navigator.clipboard.writeText(otp); setCopiedOtp(otp); window.setTimeout(() => setCopiedOtp(''), 1400); } catch (_) { setError('OTP panoya kopyalanamadı.'); }
  };

  const statText = useMemo(() => `${data?.summary?.total_emails || 0} mail · ${data?.summary?.otp_emails || 0} OTP`, [data]);

  return <section className="ops-page bulk-inbox-page" aria-label="Bulk Inbox">
    <header className="bulk-inbox-header">
      <div className="bulk-inbox-title"><p className="ops-eyebrow"><Inbox size={14} /> BULK INBOX</p><h1>{headline?.prefix || 'Bulk'}<span>_*@{headline?.domain || 'domain'}</span></h1><p>{headline?.address_count || 0} mailbox · {statText}</p></div>
      <button className="btn-secondary" onClick={() => load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Yenile</button>
    </header>

    <div className="bulk-inbox-toolbar ops-card">
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Alıcı, gönderen veya konu ara" /></label>
      <button className={otpOnly ? 'is-active' : ''} onClick={() => setOtpOnly((current) => !current)}><Filter size={15} /> Yalnız OTP</button>
      <span><Sparkles size={14} /> Her satırda alıcı adresi ve kod görünür.</span>
    </div>

    {error && <div className="ops-error bulk-inbox-error"><ShieldAlert size={16} /> {error}</div>}
    <section className="bulk-mail-table ops-card" aria-live="polite">
      <div className="bulk-mail-table-head"><span>Alıcı mailbox</span><span>Gönderen / konu</span><span>OTP</span><span>Zaman</span></div>
      {loading ? <div className="bulk-mail-empty"><RefreshCw className="animate-spin" size={22} /><p>Havuz mailleri hazırlanıyor…</p></div> : emails.length ? emails.map((email) => <article key={email.id} className={`bulk-mail-row ${selected?.id === email.id ? 'is-selected' : ''}`} onClick={() => setSelected(email)}>
        <div className="bulk-mail-recipient"><code>{email.recipient_address}</code><span>#{email.id}</span></div>
        <div className="bulk-mail-summary"><strong>{email.sender || 'Bilinmeyen gönderen'}</strong><p>{email.subject || '(Konu yok)'}</p></div>
        <div className="bulk-mail-otp">{email.otp_code ? <button onClick={(event) => { event.stopPropagation(); copyOtp(email.otp_code); }} title="OTP kopyala"><code>{email.otp_code}</code>{copiedOtp === email.otp_code ? <Check size={14} /> : <Copy size={14} />}</button> : <span>—</span>}</div>
        <time>{formatTime(email.received_at)}</time>
      </article>) : <div className="bulk-mail-empty"><MailOpen size={24} /><p>{otpOnly ? 'Bu havuzda henüz OTP içeren mail yok.' : 'Bu havuza henüz mail gelmedi.'}</p></div>}
      {nextCursor && <button className="bulk-load-more" disabled={loadingMore} onClick={() => load({ cursor: nextCursor, append: true })}>{loadingMore ? 'Yükleniyor…' : <><ChevronDown size={16} /> Daha eski mailleri yükle</>}</button>}
    </section>
  </section>;
}
