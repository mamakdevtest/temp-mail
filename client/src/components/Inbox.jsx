export default function Inbox({
  emails,
  selectedEmailId,
  onSelectEmail,
  onDeleteEmail,
  hasAddress,
  onRefresh,
  refreshing,
  socketConnected,
}) {
  // Tarihi okunabilir formata çevir
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // ===== Adres yokken boş durum =====
  if (!hasAddress) {
    return (
      <div className="card flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-400 dark:text-dark-500">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-lg font-medium">Önce bir adres oluşturun</p>
          <p className="text-sm mt-1">Gelen mailler burada görünecek</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* ===== Başlık ===== */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 dark:text-dark-200 flex items-center gap-2">
          📬 Gelen Kutusu
          {emails.length > 0 && (
            <span className="badge-primary">
              {emails.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          {/* Bağlantı durumu */}
          <span className="text-xs text-gray-400 dark:text-dark-500 flex items-center gap-1">
            {socketConnected ? (
              <>
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-soft" />
                Canlı
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-dark-500 rounded-full" />
                5 sn'de bir
              </>
            )}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium
                       bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                       hover:bg-blue-200 dark:hover:bg-blue-900/50
                       transition-colors disabled:opacity-50"
            title="Şimdi yenile"
          >
            {refreshing ? (
              <span className="animate-spin text-sm">⏳</span>
            ) : (
              <span>🔄</span>
            )}
            Yenile
          </button>
        </div>
      </div>

      {/* ===== Mail Listesi ===== */}
      <div className="max-h-[500px] overflow-y-auto">
        {emails.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-500">
            <span className="text-4xl block mb-3 animate-bounce-soft">⏳</span>
            <p className="font-medium">Henüz mail yok</p>
            <p className="text-sm mt-1">Mailler otomatik olarak burada görünecek</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-dark-700">
            {emails.map((email, index) => (
              <li
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`mail-item group ${
                  selectedEmailId === email.id ? 'mail-item-selected' : ''
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 dark:text-dark-100 truncate">
                        {email.sender}
                      </p>
                      {/* Yeni mail göstergesi (Socket.io'dan gelen) */}
                      {email._isNew && (
                        <span className="badge bg-blue-500 text-white text-[10px] px-1.5 py-0">
                          YENİ
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-400 truncate mt-0.5">
                      {email.subject || '(Konu yok)'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
                    <p className="text-xs text-gray-400 dark:text-dark-500">
                      {formatDate(email.received_at)}
                    </p>
                    <div className="flex items-center gap-1">
                      {/* Ek göstergesi */}
                      {email.has_attachments === 1 && (
                        <span className="text-xs text-amber-500 dark:text-amber-400">📎</span>
                      )}
                      {/* OTP badge (Socket.io'dan gelen veride varsa) */}
                      {email.otp_code && (
                        <span className="badge-otp text-[10px] px-1.5 py-0">
                          🔑 {email.otp_code}
                        </span>
                      )}
                      {/* Sil butonu - sadece hover'da görünür */}
                      {onDeleteEmail && (
                        <button
                          onClick={(e) => onDeleteEmail(email.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity
                                     text-gray-300 dark:text-dark-600 hover:text-red-500 dark:hover:text-red-400
                                     p-1 rounded"
                          title="Maili sil"
                        >
                          🗑️
                        </button>
                      )}
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
