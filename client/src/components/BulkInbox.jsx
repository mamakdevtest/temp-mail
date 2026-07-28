import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Filter, MailOpen, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { Button, Input, Table, EmptyState, ErrorState, Loading, Modal } from './ui';

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
  const [limit, setLimit] = useState(25);
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
      const params = new URLSearchParams({ limit: String(limit) });
      if (query.trim()) params.set('q', query.trim());
      if (otpOnly) params.set('otp_only', '1');
      if (cursor) params.set('cursor', String(cursor));
      const response = await apiFetch(`/api/addresses/bulk/${pool.id}/emails?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || t('bulkInbox.loadFailed'));
      setData((previous) => append ? { ...payload, emails: [...(previous?.emails || []), ...(payload.emails || [])] } : payload);
    } catch (nextError) { setError(nextError.message); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }, [otpOnly, limit, pool?.id, query, token]);

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

  const columns = [
    {
      key: 'recipient', header: t('bulkInbox.colRecipient'), primary: true,
      render: (email) => (
        <span className="inline-flex items-center gap-2 min-w-0">
          <code className="t-mono text-txt-primary truncate">{email.recipient_address}</code>
          <span className="text-[11px] text-txt-muted shrink-0">#{email.id}</span>
        </span>
      ),
    },
    {
      key: 'summary', header: t('bulkInbox.colSenderSubject'),
      render: (email) => (
        <span className="block min-w-0">
          <strong className="block text-txt-primary truncate">{email.sender || t('bulkInbox.unknownSender')}</strong>
          <span className="block text-txt-muted truncate">{email.subject || t('bulkInbox.noSubject')}</span>
        </span>
      ),
    },
    {
      key: 'otp', header: 'OTP', className: 'w-px whitespace-nowrap',
      render: (email) => email.otp_code ? (
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); copyOtp(email.otp_code); }}
          title={t('bulkInbox.copyOtp')}
          className="inline-flex items-center gap-1.5 rounded-[var(--r-md)] border border-[rgb(var(--otp)/0.3)] bg-[rgb(var(--otp)/0.08)] px-2 py-1 text-[rgb(var(--otp))] transition-colors hover:bg-[rgb(var(--otp)/0.15)]"
        >
          <code className="t-mono">{email.otp_code}</code>
          {copiedOtp === email.otp_code ? <Check size={14} /> : <Copy size={14} />}
        </button>
      ) : <span className="text-txt-disabled">—</span>,
    },
    {
      key: 'time', header: t('bulkInbox.colTime'), className: 'w-px whitespace-nowrap text-txt-muted',
      render: (email) => <time>{formatTime(email.received_at, language)}</time>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-body-sm text-txt-muted">{t('bulkInbox.mailboxCount', { count: headline?.address_count || 0 })} · {statText}</p>
        <Button variant="secondary" size="sm" onClick={() => load()} disabled={loading} icon={undefined}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('bulkInbox.refresh')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('bulkInbox.searchPlaceholder')} />
        </div>
        <Button
          variant={otpOnly ? 'primary' : 'secondary'}
          onClick={() => setOtpOnly((current) => !current)}
          icon={Filter}
        >
          {t('bulkInbox.otpOnly')}
        </Button>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="input w-auto"
          aria-label="Limit"
        >
          {[5, 10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <p className="t-caption text-txt-muted">{t('bulkInbox.toolbarHint')}</p>

      {error && <ErrorState message={error} />}

      <div aria-live="polite">
        {loading ? (
          <Loading label={t('bulkInbox.loading')} />
        ) : (
          <Table
            columns={columns}
            rows={emails}
            onRowClick={setSelected}
            rowClassName={(email) => selected?.id === email.id ? 'bg-brand-surface2/60' : ''}
            empty={<EmptyState icon={MailOpen} title={otpOnly ? t('bulkInbox.noOtpMails') : t('bulkInbox.noMails')} />}
          />
        )}
        {nextCursor && (
          <Button variant="ghost" className="w-full mt-3" disabled={loadingMore} onClick={() => load({ cursor: nextCursor, append: true })}>
            {loadingMore ? t('bulkInbox.loading') : <><ChevronDown size={16} /> {t('bulkInbox.loadOlder')}</>}
          </Button>
        )}
      </div>

      {selected && (
        <Modal
          show
          onClose={() => setSelected(null)}
          title={selected.subject || t('bulkInbox.noSubject')}
          subtitle={selected.sender || t('bulkInbox.unknownSender')}
          size="2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 t-caption text-txt-muted">
              <code className="t-mono text-txt-secondary">{selected.recipient_address}</code>
              <time>· {formatTime(selected.received_at, language)}</time>
            </div>
            {selected.otp_code && (
              <div className="rounded-[var(--r-md)] border border-[rgb(var(--otp)/0.3)] bg-[rgb(var(--otp)/0.08)] px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-txt-muted">OTP</span>
                <code className="t-mono text-lg font-semibold text-[rgb(var(--otp))]">{selected.otp_code}</code>
                <button type="button" onClick={() => copyOtp(selected.otp_code)} className="ml-auto btn-ghost px-2 py-1">
                  {copiedOtp === selected.otp_code ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
            {selected.body_html ? (
              <iframe
                title="mail-html"
                sandbox=""
                srcDoc={selected.body_html}
                className="w-full min-h-[300px] rounded-[var(--r-md)] border border-brand-border bg-white"
              />
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-txt-primary t-body">{selected.body_text || t('bulkInbox.noSubject')}</pre>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
