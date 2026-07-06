import { Mail, RefreshCw, Paperclip, KeyRound, Trash2, Inbox as InboxIcon } from 'lucide-react';
import { InboxSkeleton } from './Skeleton';

export default function Inbox({ emails, selectedId, onSelect, onDelete, hasAddr, onRefresh, refreshing, live, isLoading }) {
  const fmt = (d) => {
    const dt = new Date(d), now = new Date();
    if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (!hasAddr) {
    return (
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200/50 dark:border-dark-700/50 shadow-sm flex items-center justify-center min-h-[300px]">
        <div className="text-center text-gray-400 dark:text-dark-500">
          <InboxIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-xs font-medium">Önce bir adres oluşturun</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200/50 dark:border-dark-700/50 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
          <Mail size={12} /> Gelen Kutusu {emails.length > 0 && <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0 rounded text-[9px]">{emails.length}</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}`} title={live ? 'Canlı' : 'Polling'} />
          <button onClick={onRefresh} disabled={refreshing} className="p-1 rounded text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors disabled:opacity-50">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {isLoading ? <InboxSkeleton /> : emails.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-500">
            <Mail size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-[11px]">Henüz mail yok</p>
          </div>
        ) : (
          <ul>
            {emails.map((m) => (
              <li key={m.id} onClick={() => onSelect(m.id)} className={`group px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-dark-800/50 last:border-0 transition-all hover:bg-blue-50/40 dark:hover:bg-dark-800/40 ${selectedId === m.id ? 'bg-primary-50/60 dark:bg-primary-900/15 border-l-2 border-l-primary-500' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-dark-100 truncate">{m.sender}</p>
                    <p className="text-[10px] text-gray-500 dark:text-dark-400 truncate mt-0.5">{m.subject || '(Konu yok)'}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[9px] text-gray-400 dark:text-dark-500">{fmt(m.received_at)}</span>
                    <div className="flex items-center gap-1">
                      {m.otp_code && <KeyRound size={10} className="text-purple-500 dark:text-purple-400" />}
                      {m.has_attachments === 1 && <Paperclip size={10} className="text-amber-500" />}
                      <button onClick={(e) => onDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-dark-600 hover:text-red-500 dark:hover:text-red-400 ml-0.5"><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
