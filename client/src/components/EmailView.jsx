import { useState, useRef, useEffect } from 'react';

export default function EmailView({ email, onClose, apiBase, onCompose, currentAddress }) {
  const [viewMode, setViewMode] = useState('html'); // 'html' | 'text'
  const iframeRef = useRef(null);

  // HTML içeriğini iframe'e güvenli şekilde yükle
  useEffect(() => {
    if (email?.body_html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              padding: 16px;
              margin: 0;
              word-wrap: break-word;
            }
            img { max-width: 100%; height: auto; }
            a { color: #2563eb; }
            table { max-width: 100%; }
          </style>
        </head>
        <body>${email.body_html}</body>
        </html>
      `);
      doc.close();

      // iframe yüksekliğini içeriğe göre ayarla
      const resizeIframe = () => {
        try {
          iframe.style.height = doc.documentElement.scrollHeight + 'px';
        } catch (e) {
          // cross-origin hatası olabilir, yok say
        }
      };

      iframe.onload = resizeIframe;
      setTimeout(resizeIframe, 100);
    }
  }, [email]);

  if (!email) {
    return (
      <div className="card flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-400">
          <span className="text-5xl block mb-4">✉️</span>
          <p className="text-lg font-medium">Bir mail seçin</p>
          <p className="text-sm mt-1">Sol taraftaki listeden bir mail seçerek içeriğini görüntüleyin</p>
        </div>
      </div>
    );
  }

  // Tarih formatla
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Başlık */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            ✉️ Mail Detayı
          </h2>
          <div className="flex items-center gap-2">
            {/* Yanıtla / Cevapla butonu */}
            {onCompose && (
              <button
                onClick={() => onCompose({
                  to: email.sender,
                  subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
                })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                title="Yanıtla"
              >
                ↩️ Yanıtla
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mail bilgileri */}
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 font-medium w-16">Gönderen:</span>
            <span className="text-gray-800 break-all">{email.sender}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 font-medium w-16">Konu:</span>
            <span className="text-gray-800 font-medium break-all">
              {email.subject || '(Konu yok)'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 font-medium w-16">Tarih:</span>
            <span className="text-gray-600">{formatDate(email.received_at)}</span>
          </div>
        </div>

        {/* Görüntüleme modu seçici */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('html')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'html'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            🌐 HTML
          </button>
          <button
            onClick={() => setViewMode('text')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'text'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            📝 Düz Metin
          </button>
        </div>
      </div>

      {/* Mail İçeriği */}
      <div className="max-h-[500px] overflow-y-auto">
        {viewMode === 'html' && email.body_html ? (
          <iframe
            ref={iframeRef}
            title="Mail içeriği"
            className="mail-iframe w-full"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="p-6 whitespace-pre-wrap text-sm text-gray-700 font-mono">
            {email.body_text || 'İçerik yok'}
          </div>
        )}
      </div>

      {/* Ekler */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
            📎 Ekler ({email.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <a
                key={att.id}
                href={`${apiBase}/emails/${email.id}/attachments/${att.id}`}
                className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                download={att.filename}
              >
                <span>📄</span>
                <span className="text-gray-700">{att.filename || 'Ek'}</span>
                {att.size > 0 && (
                  <span className="text-gray-400 text-xs">
                    ({(att.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
