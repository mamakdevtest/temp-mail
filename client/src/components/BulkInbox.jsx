import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Filter, Inbox, MailOpen, RefreshCw, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { TableSkeleton } from './Skeleton';

function formatTime(value, language) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function BulkInbox({ token, pool }) {
  const { t, language } = useLocale();
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
      if (!response.ok) throw new Error(payload.message || payload.error || t('bulkInbox.loadFailed'));
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
    try { await navigator.clipboard.writeText(otp); setCopiedOtp(otp); window.setTimeout(() => setCopiedOtp(''), 1400); } catch (_) { setError(t('bulkInbox.otpCopyFailed')); }
  };

  const statText = useMemo(() => t('bulkInbox.statText', { total: data?.summary?.total_emails || 0, otp: data?.summary?.otp_emails || 0 }), [data, t]);

  return <section className="ops-page bulk-inbox-page" aria-label="Bulk Inbox">
    <header className="bulk-inbox-header">
      <div className="bulk-inbox-title"><p className="ops-eyebrow"><Inbox size={14} /> BULK INBOX</p><h1>{headline?.prefix || 'Bulk'}<span>_*@{headline?.domain || 'domain'}</span></h1><p>{t('bulkInbox.mailboxCount', { count: headline?.address_count || 0 })} · {statText}</p></div>
      <button className="btn-secondary" onClick={() => load()} disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('bulkInbox.refresh')}</button>
    </header>

    <div className="bulk-inbox-toolbar ops-card">
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('bulkInbox.searchPlaceholder')} /></label>
      <button className={otpOnly ? 'is-active' : ''} onClick={() => setOtpOnly((current) => !current)}><Filter size={15} /> {t('bulkInbox.otpOnly')}</button>
      <span><Sparkles size={14} /> {t('bulkInbox.toolbarHint')}</span>
    </div>

    {error && <div className="ops-error bulk-inbox-error"><ShieldAlert size={16} /> {error}</div>}
    <section className="bulk-mail-table ops-card" aria-live="polite">
      <div className="bulk-mail-table-head"><span>{t('bulkInbox.colRecipient')}</span><span>{t('bulkInbox.colSenderSubject')}</span><span>OTP</span><span>{t('bulkInbox.colTime')}</span></div>
      {loading ? <TableSkeleton rows={8} cols={4} /> : emails.length ? emails.map((email) => <article key={email.id} className={`bulk-mail-row ${selected?.id === email.id ? 'is-selected' : ''}`} onClick={() => setSelected(email)}>
        <div className="bulk-mail-recipient"><code>{email.recipient_address}</code><span>#{email.id}</span></div>
        <div className="bulk-mail-summary"><strong>{email.sender || t('bulkInbox.unknownSender')}</strong><p>{email.subject || t('bulkInbox.noSubject')}</p></div>
        <div className="bulk-mail-otp">{email.otp_code ? <button onClick={(event) => { event.stopPropagation(); copyOtp(email.otp_code); }} title={t('bulkInbox.copyOtp')}><code>{email.otp_code}</code>{copiedOtp === email.otp_code ? <Check size={14} /> : <Copy size={14} />}</button> : <span>—</span>}</div>
        <time>{formatTime(email.received_at, language)}</time>
      </article>) : <div className="bulk-mail-empty"><MailOpen size={24} /><p>{otpOnly ? t('bulkInbox.noOtpMails') : t('bulkInbox.noMails')}</p></div>}
      {nextCursor && <button className="bulk-load-more" disabled={loadingMore} onClick={() => load({ cursor: nextCursor, append: true })}>{loadingMore ? t('bulkInbox.loading') : <><ChevronDown size={16} /> {t('bulkInbox.loadOlder')}</>}</button>}
    </section>
  </section>;
}
