export default function Inbox({ emails, selectedId, onSelect, onDelete, hasAddr, onRefresh, refreshing, live }) {
  const fmt = (d) => {
    const dt = new Date(d), now = new Date();
    if (dt.toDateString() === now.toDateString()) return dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (!hasAddr) {
    return (
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 flex items-center justify-center min-h-[300px]">
        <div className="text-center text-gray-400 dark:text-dark-500">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-sm font-medium">Önce bir adres oluşturun</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-dark-700 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 dark:text-dark-300">📬 Gelen Kutusu {emails.length > 0 && `(${emails.length})`}</span>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}`} />
          <button onClick={onRefresh} disabled={refreshing} className="text-[11px] text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200 disabled:opacity-50">
            {refreshing ? '⏳' : '🔄'}
          </button>
        </div>
      </div>
      <div className="max-h-[600px] overflow-y-auto">
        {emails.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-500">
            <span className="text-3xl block mb-2">⏳</span>
            <p className="text-xs">Henüz mail yok</p>
          </div>
        ) : (
          <ul>
            {emails.map((m) => (
              <li key={m.id} onClick={() => onSelect(m.id)} className={`group px-4 py-2.5 cursor-pointer border-b border-gray-50 dark:border-dark-800 last:border-0 transition-colors hover:bg-blue-50/50 dark:hover:bg-dark-800/50 ${selectedId === m.id ? 'bg-primary-50/80 dark:bg-primary-900/20' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-dark-100 truncate">{m.sender}</p>
                    <p className="text-[11px] text-gray-500 dark:text-dark-400 truncate mt-0.5">{m.subject || '(Konu yok)'}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-gray-400 dark:text-dark-500">{fmt(m.received_at)}</span>
                    <div className="flex items-center gap-1">
                      {m.otp_code && <span className="text-[9px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1 rounded font-mono font-bold">🔑</span>}
                      {m.has_attachments === 1 && <span className="text-[10px] text-amber-500">📎</span>}
                      <button onClick={(e) => onDelete(m.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-dark-600 hover:text-red-500 text-xs ml-1">✕</button>
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
