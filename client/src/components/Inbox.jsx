import { useState } from 'react';
import { Mail, RefreshCw, Search, Star, Paperclip, KeyRound, Trash2, Inbox as InboxIcon, Filter } from 'lucide-react';
import { InboxSkeleton } from './Skeleton';

export default function Inbox({ emails, selectedId, onSelect, onDelete, hasAddr, onRefresh, refreshing, live, isLoading }) {
  const [search, setSearch] = useState('');

  const fmt = (d) => {
    const dt = new Date(d), now = new Date();
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
      <div className="card p-0 overflow-hidden h-full flex items-center justify-center min-h-[400px]">
        <div className="text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-surface2 flex items-center justify-center mx-auto mb-4"><InboxIcon size={24} className="text-txt-disabled" /></div>
          <p className="text-sm font-medium text-txt-secondary">Önce bir adres oluşturun</p>
          <p className="text-[11px] text-txt-muted mt-1">Gelen mailler burada görünecek</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-brand-border/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-accent-blue" />
            <span className="text-xs font-semibold text-txt-primary">Gelen Kutusu</span>
            {emails.length > 0 && <span className="badge-blue text-[9px]">{emails.length}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-accent-green animate-pulse-soft' : 'bg-txt-disabled'}`} />
            <span className="text-[9px] text-txt-muted">{live ? 'Canlı' : 'Bekliyor'}</span>
            <button onClick={onRefresh} disabled={refreshing} className="p-1 rounded-lg text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2 transition-colors ml-1">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="E-postalarda ara..." className="w-full pl-8 pr-3 py-2 rounded-xl text-[11px] bg-brand-surface2 border border-brand-border/30 text-txt-primary placeholder-txt-muted focus:ring-1 focus:ring-accent-blue/30 outline-none" />
          </div>
          <button className="p-2 rounded-xl bg-brand-surface2 border border-brand-border/30 text-txt-muted hover:text-txt-secondary transition-colors"><Filter size={12} /></button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? <InboxSkeleton /> : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Mail size={28} className="mx-auto mb-2 text-txt-disabled" />
            <p className="text-[11px] text-txt-muted">{search ? 'Sonuç bulunamadı' : 'Henüz mail yok'}</p>
            {!search && <p className="text-[9px] text-txt-disabled mt-1">Gelen mesajlar anlık olarak güncellenir</p>}
          </div>
        ) : (
          <div>
            {filtered.map((m) => (
              <div key={m.id} onClick={() => onSelect(m.id)} className={`group px-4 py-3 cursor-pointer transition-all duration-150 border-b border-brand-border/10 last:border-0 ${selectedId === m.id ? 'bg-accent-blue/8 border-l-2 border-l-accent-blue' : 'hover:bg-brand-surface2/30'}`}>
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${selectedId === m.id ? 'bg-accent-blue' : 'bg-brand-border2'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-semibold text-txt-primary truncate">{m.sender}</p>
                      {m.otp_code && <KeyRound size={10} className="text-accent-purple flex-shrink-0" />}
                      {m.has_attachments === 1 && <Paperclip size={10} className="text-txt-muted flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-txt-muted truncate mt-0.5">{m.subject || '(Konu yok)'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[9px] text-txt-disabled">{fmt(m.received_at)}</span>
                    <button onClick={(e) => onDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity text-txt-disabled hover:text-accent-red"><Trash2 size={10} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-4 py-2 border-t border-brand-border/20 flex-shrink-0">
          <p className="text-[9px] text-txt-disabled text-center">Yeni e-postalar burada görünür</p>
        </div>
      )}
    </div>
  );
}
