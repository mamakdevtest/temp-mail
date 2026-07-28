import { useState } from 'react';
import { Mail, RefreshCw, Search, Paperclip, Trash2, Inbox as InboxIcon, Copy } from 'lucide-react';
import { InboxSkeleton } from './Skeleton';
import { EmptyState } from './ui';
import { useLocale } from '../i18n';

export default function Inbox({ emails, selectedId, onSelect, onDelete, hasAddr, onRefresh, refreshing, live, isLoading }) {
  const { t, language } = useLocale();
  const [search, setSearch] = useState('');
  const locale = language === 'en' ? 'en-US' : 'tr-TR';

  const fmt = (d) => {
    const dt = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const diff = Math.floor((now - dt) / 86400000);
    if (diff === 1) return t('inbox.yesterday');
    return dt.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  const filtered = search
    ? emails.filter((m) => m.sender?.toLowerCase().includes(search.toLowerCase()) || m.subject?.toLowerCase().includes(search.toLowerCase()))
    : emails;

  if (!hasAddr) {
    return (
      <div className="card h-full flex items-center justify-center min-h-[300px] sm:min-h-[380px] xl:min-h-[590px]">
        <EmptyState icon={InboxIcon} title={t('inbox.createAddressFirst')} description={t('inbox.mailsWillAppear')} />
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full flex flex-col min-h-[300px] sm:min-h-[380px] xl:min-h-[590px]">
      <div className="px-4 py-3.5 border-b border-brand-border/60 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={15} className="text-[rgb(var(--brand))] shrink-0" />
            <p className="t-card-title text-txt-primary">{t('inbox.title')}</p>
            <span className="badge-green ml-1">
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-[rgb(var(--success))]' : 'bg-txt-disabled'}`} />
              {live ? t('inbox.live') : t('inbox.waiting')}
            </span>
          </div>
          <button onClick={onRefresh} disabled={refreshing} className="btn-ghost" aria-label={t('inbox.refresh')}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inbox.searchPlaceholder')} className="input pl-9 py-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-2">
        {isLoading ? <InboxSkeleton /> : filtered.length === 0 ? (
          <EmptyState icon={Mail} title={search ? t('inbox.noResults') : t('inbox.noMails')} description={!search ? t('inbox.noMailsHint') : undefined} />
        ) : (
          <div className="space-y-1 stagger-in">
            {filtered.map((m) => {
              const active = selectedId === m.id;
              const initial = (m.sender || '?').trim()[0]?.toUpperCase() || '?';
              return (
                <div
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className={`group relative rounded-[var(--r-md)] px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${active ? 'bg-[rgb(var(--brand)/0.08)] border-[rgb(var(--brand))]' : 'border-transparent hover:bg-brand-surface2'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[var(--r-md)] bg-brand-surface2 border border-brand-border flex items-center justify-center shrink-0 text-[11px] font-semibold text-txt-secondary">{initial}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-txt-primary truncate">{m.sender}</p>
                        {m.otp_code && <span className="badge-purple text-[9px] px-1.5 py-0">{t('inbox.otpBadge')}</span>}
                        {m.has_attachments === 1 && <Paperclip size={11} className="text-txt-muted shrink-0" />}
                      </div>
                      <p className="t-body-sm text-txt-muted truncate mt-0.5">{m.subject || t('inbox.noSubject')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="t-caption text-txt-muted">{fmt(m.received_at)}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.otp_code && (
                          <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(m.otp_code); }} className="p-1 text-[rgb(var(--otp))] hover:text-[rgb(var(--brand))]" title={t('inbox.copyOtp')}>
                            <Copy size={12} />
                          </button>
                        )}
                        <button onClick={(e) => onDelete(m.id, e)} className="p-1 text-txt-disabled hover:text-[rgb(var(--danger-fg))]" title={t('inbox.delete')}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
