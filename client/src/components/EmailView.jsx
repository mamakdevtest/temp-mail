import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';

export default function EmailView({ email, onClose, apiBase, onCompose, currentAddress, onCopyOtp }) {
  const [viewMode, setViewMode] = useState('html'); // 'html' | 'text'
  const [otpCopied, setOtpCopied] = useState(false);
  const iframeRef = useRef(null);

  // HTML içeriğini iframe'e güvenli şekilde yükle (DOMPurify ile sanitize)
  useEffect(() => {
    if (email?.body_html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;

      // XSS koruması: HTML içeriğini sanitize et
      const sanitizedHtml = DOMPurify.sanitize(email.body_html, {
        ALLOWED_TAGS: [
          'p', 'br', 'div', 'span', 'a', 'b', 'i', 'u', 'strong', 'em',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'img', 'blockquote', 'pre', 'code', 'hr',
          'style', 'font', 'center', 'small', 'sub', 'sup',
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'width', 'height',
          'style', 'class', 'id', 'align', 'valign',
          'cellpadding', 'cellspacing', 'border', 'bgcolor',
          'color', 'size', 'face', 'target',
        ],
        // javascript: protokolünü engelle
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });

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
              background: white;
            }
            img { max-width: 100%; height: auto; }
            a { color: #2563eb; }
            table { max-width: 100%; }
          </style>
        </head>
        <body>${sanitizedHtml}</body>
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

  // OTP kopyalama
  const handleCopyOtp = () => {
    if (email?.otp_code && onCopyOtp) {
      onCopyOtp(email.otp_code);
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  // ===== Mail seçilmediyse boş durum =====
  if (!email) {
    return (
      <div className="card flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-400 dark:text-dark-500">
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
      {/* ===== Başlık ===== */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700 dark:text-dark-200 flex items-center gap-2">
            ✉️ Mail Detayı
          </h2>
          <div className="flex items-center gap-2">
            {/* Yanıtla butonu */}
            {onCompose && (
              <button
                onClick={() => onCompose({
                  to: email.sender,
                  subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
                })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium
                           bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300
                           hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                title="Yanıtla"
              >
                ↩️ Yanıtla
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-dark-200 text-xl transition-colors"
              title="Kapat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mail bilgileri */}
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-dark-400 font-medium w-16">Gönderen:</span>
            <span className="text-gray-800 dark:text-dark-200 break-all">{email.sender}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-dark-400 font-medium w-16">Konu:</span>
            <span className="text-gray-800 dark:text-dark-100 font-medium break-all">
              {email.subject || '(Konu yok)'}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 dark:text-dark-400 font-medium w-16">Tarih:</span>
            <span className="text-gray-600 dark:text-dark-300">{formatDate(email.received_at)}</span>
          </div>
        </div>

        {/* ===== OTP/Doğrulama Kodu Kartı ===== */}
        {email.otp_code && (
          <div className="mt-4 animate-slide-up">
            <div className="otp-card">
              <div>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                  🔑 Doğrulama Kodu Algılandı
                </p>
                <p className="otp-code">{email.otp_code}</p>
              </div>
              <button
                onClick={handleCopyOtp}
                className={`btn-primary text-sm transition-all ${
                  otpCopied ? 'bg-green-600 dark:bg-green-500' : ''
                }`}
              >
                {otpCopied ? '✅ Kopyalandı!' : '📋 Kopyala'}
              </button>
            </div>
          </div>
        )}

        {/* Görüntüleme modu seçici */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('html')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'html'
                ? 'bg-primary-600 dark:bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-dark-300 hover:bg-gray-300 dark:hover:bg-dark-500'
            }`}
          >
            🌐 HTML
          </button>
          <button
            onClick={() => setViewMode('text')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'text'
                ? 'bg-primary-600 dark:bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-dark-300 hover:bg-gray-300 dark:hover:bg-dark-500'
            }`}
          >
            📝 Düz Metin
          </button>
        </div>
      </div>

      {/* ===== Mail İçeriği ===== */}
      <div className="max-h-[500px] overflow-y-auto">
        {viewMode === 'html' && email.body_html ? (
          <iframe
            ref={iframeRef}
            title="Mail içeriği"
            className="mail-iframe w-full"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="p-6 whitespace-pre-wrap text-sm text-gray-700 dark:text-dark-300 font-mono">
            {email.body_text || 'İçerik yok'}
          </div>
        )}
      </div>

      {/* ===== Ekler ===== */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50">
          <h3 className="font-medium text-gray-700 dark:text-dark-200 mb-3 flex items-center gap-2">
            📎 Ekler ({email.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <a
                key={att.id}
                href={`${apiBase}/emails/${email.id}/attachments/${att.id}`}
                className="flex items-center gap-2
                           bg-white dark:bg-dark-700
                           border border-gray-200 dark:border-dark-600
                           rounded-lg px-3 py-2 text-sm
                           hover:bg-gray-50 dark:hover:bg-dark-600
                           transition-colors"
                download={att.filename}
              >
                <span>📄</span>
                <span className="text-gray-700 dark:text-dark-200">{att.filename || 'Ek'}</span>
                {att.size > 0 && (
                  <span className="text-gray-400 dark:text-dark-500 text-xs">
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
