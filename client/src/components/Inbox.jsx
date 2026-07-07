import { useState } from 'react';
import { Mail, RefreshCw, Search, Paperclip, KeyRound, Trash2, Inbox as InboxIcon, Filter, Star, Copy } from 'lucide-react';
import { InboxSkeleton } from './Skeleton';

export default function Inbox({ emails, selectedId, onSelect, onDelete, hasAddr, onRefresh, refreshing, live, isLoading }) {
  const [search, setSearch] = useState('');

  const fmt = (d) => {
    const dt = new Date(d);
    const now = new Date();
    if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const diff = Math.floor((now - dt) / 86400000);
    if (diff === 1) return 'Dün';
    return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const filtered = search
    ? emails.filter((m) => m.sender?.toLowerCase().includes(search.toLowerCase()) || m.subject?.toLowerCase().includes(search.toLowerCase()))
    : emails;

  if (!hasAddr) {
    return (
      <div className="card p-0 overflow-hidden h-full flex items-center justify-center min-h-[530px]">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-3xl panel-soft flex items-center justify-center mx-auto mb-5"><InboxIcon size={28} className="text-txt-disabled" /></div>
          <p className="text-lg font-semibold text-txt-secondary">Önce bir adres oluşturun</p>
          <p className="text-sm text-txt-muted mt-2">Gelen mailler burada görünecek.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full flex flex-col min-h-[530px]">
      <div className="px-5 py-5 border-b border-brand-border/30 flex-shrink-0">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-2xl panel-soft flex items-center justify-center">
              <Mail size={15} className="text-accent-blue" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-txt-primary">Gelen Kutusu</p>
              <p className="text-[11px] text-txt-muted">Anlık mesaj akışı</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="badge-green text-[11px] px-2.5 py-1.5">
              <span className={`w-2 h-2 rounded-full ${live ? 'bg-accent-green shadow-[0_0_12px_rgba(39,213,155,0.55)]' : 'bg-txt-disabled'}`} />
              {live ? 'Canlı' : 'Bekliyor'}
            </div>
            <button onClick={onRefresh} disabled={refreshing} className="btn-ghost px-2.5 py-2">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara..." className="input pl-11 py-3 text-sm" />
          </div>
          <button className="btn-secondary px-4 py-3 min-w-[120px]"><Filter size={14} /> Filtreler</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        {isLoading ? <InboxSkeleton /> : filtered.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center px-6">
            <Mail size={30} className="mb-3 text-txt-disabled" />
            <p className="text-sm text-txt-secondary">{search ? 'Sonuç bulunamadı' : 'Henüz mail yok'}</p>
            {!search && <p className="text-xs text-txt-muted mt-1">Yeni mesajlar anlık olarak burada görünür.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m, i) => (
              <div
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`group relative rounded-[22px] px-4 py-4 cursor-pointer transition-all duration-200 border ${selectedId === m.id ? 'bg-brand-surface2/88 border-accent-blue/35 shadow-[0_12px_24px_rgba(59,130,255,0.08)]' : 'bg-brand-surface/55 border-brand-border/25 hover:bg-brand-surface2/65 hover:border-brand-border/45'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${selectedId === m.id ? 'bg-accent-blue shadow-[0_0_12px_rgba(59,130,255,0.55)]' : i % 4 === 0 ? 'bg-accent-blue/80' : i % 4 === 1 ? 'bg-accent-purple/80' : i % 4 === 2 ? 'bg-accent-green/80' : 'bg-pink-400/80'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-txt-primary truncate">{m.sender}</p>
                      {m.otp_code && <KeyRound size={12} className="text-accent-purple flex-shrink-0" />}
                      {m.has_attachments === 1 && <Paperclip size={12} className="text-txt-muted flex-shrink-0" />}
                      {m.otp_code && <span className="badge-purple text-[10px] px-2 py-0.5">Doğrulama</span>}
                    </div>
                    <p className="text-sm text-txt-secondary truncate mt-1">{m.subject || '(Konu yok)'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-txt-muted">{fmt(m.received_at)}</span>
                    <div className="flex items-center gap-1">
                      {m.otp_code ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(m.otp_code);
                          }}
                          className="text-accent-purple hover:text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity"
                          title="OTP kopyala"
                        >
                          <Copy size={12} />
                        </button>
                      ) : null}
                      <button onClick={(e) => onDelete(m.id, e)} className="text-txt-disabled hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
                <button className="absolute right-4 bottom-4 text-txt-disabled hover:text-accent-blue"><Star size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="px-5 pb-5 pt-3 flex-shrink-0">
          <div className="panel-soft px-4 py-4 rounded-[22px] text-center border border-dashed border-brand-border/55">
            <p className="text-sm font-medium text-txt-secondary">E-postalarınız burada görünecek</p>
            <p className="text-xs text-txt-muted mt-1">Yeni e-postalar anında bu listede görüntülenir.</p>
          </div>
        </div>
      )}
    </div>
  );
}
