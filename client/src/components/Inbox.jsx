export default function Inbox({ emails, selectedEmailId, onSelectEmail, hasAddress }) {
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

  if (!hasAddress) {
    return (
      <div className="card flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-400">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-lg font-medium">Önce bir adres oluşturun</p>
          <p className="text-sm mt-1">Gelen mailler burada görünecek</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Başlık */}
      <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          📬 Gelen Kutusu
          {emails.length > 0 && (
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
              {emails.length}
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-400">5 sn'de bir yenilenir</span>
      </div>

      {/* Mail Listesi */}
      <div className="max-h-[500px] overflow-y-auto">
        {emails.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <span className="text-4xl block mb-3">⏳</span>
            <p className="font-medium">Henüz mail yok</p>
            <p className="text-sm mt-1">Mailler otomatik olarak burada görünecek</p>
          </div>
        ) : (
          <ul className="divide-y">
            {emails.map((email) => (
              <li
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`px-6 py-4 cursor-pointer transition-colors hover:bg-blue-50 ${
                  selectedEmailId === email.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">
                      {email.sender}
                    </p>
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {email.subject || '(Konu yok)'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">{formatDate(email.received_at)}</p>
                    {email.has_attachments === 1 && (
                      <span className="text-xs text-amber-500 mt-1 block">📎 Ek</span>
                    )}
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
