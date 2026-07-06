import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';

export default function EmailView({ email, onClose, api, onReply, onCopyOtp }) {
  const [mode, setMode] = useState('html');
  const [otpCopied, setOtpCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (email?.body_html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const clean = DOMPurify.sanitize(email.body_html, {
        ALLOWED_TAGS: ['p','br','div','span','a','b','i','u','strong','em','h1','h2','h3','h4','h5','h6','ul','ol','li','table','thead','tbody','tr','td','th','img','blockquote','pre','code','hr','style','font','center','small','sub','sup'],
        ALLOWED_ATTR: ['href','src','alt','title','width','height','style','class','id','align','valign','cellpadding','cellspacing','border','bgcolor','color','size','face','target'],
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#333;padding:16px;margin:0;word-wrap:break-word;background:white}img{max-width:100%;height:auto}a{color:#2563eb}table{max-width:100%}</style></head><body>${clean}</body></html>`);
      doc.close();
      const resize = () => { try { iframe.style.height = doc.documentElement.scrollHeight + 'px'; } catch (e) { /* */ } };
      iframe.onload = resize; setTimeout(resize, 100);
    }
  }, [email]);

  const handleOtpCopy = () => { if (email?.otp_code && onCopyOtp) { onCopyOtp(email.otp_code); setOtpCopied(true); setTimeout(() => setOtpCopied(false), 2000); } };
  const fmt = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!email) {
    return (
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 flex items-center justify-center min-h-[300px]">
        <div className="text-center text-gray-400 dark:text-dark-500">
          <span className="text-4xl block mb-3">✉️</span>
          <p className="text-sm font-medium">Bir mail seçin</p>
          <p className="text-[11px] mt-1">Soldaki listeden seçerek görüntüleyin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-dark-300">✉️ Mail Detayı</span>
          <div className="flex items-center gap-1">
            {onReply && (
              <button onClick={() => onReply({ to: email.sender, subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}` })} className="text-[11px] px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">↩️ Yanıtla</button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200 text-sm ml-1">✕</button>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <p><span className="text-gray-500 dark:text-dark-400 w-14 inline-block">Gönderen:</span> <span className="text-gray-800 dark:text-dark-200 break-all">{email.sender}</span></p>
          <p><span className="text-gray-500 dark:text-dark-400 w-14 inline-block">Konu:</span> <span className="text-gray-800 dark:text-dark-100 font-medium break-all">{email.subject || '(Konu yok)'}</span></p>
          <p><span className="text-gray-500 dark:text-dark-400 w-14 inline-block">Tarih:</span> <span className="text-gray-600 dark:text-dark-300">{fmt(email.received_at)}</span></p>
        </div>

        {/* OTP Card */}
        {email.otp_code && (
          <div className="mt-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex items-center justify-between gap-3 animate-slide-up">
            <div>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">🔑 Doğrulama Kodu</p>
              <p className="text-2xl font-mono font-bold tracking-[0.25em] text-purple-700 dark:text-purple-300 select-all">{email.otp_code}</p>
            </div>
            <button onClick={handleOtpCopy} className={`px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors ${otpCopied ? 'bg-green-500' : 'bg-purple-600 hover:bg-purple-700'}`}>
              {otpCopied ? '✅ Kopyalandı' : '📋 Kopyala'}
            </button>
          </div>
        )}

        {/* View mode */}
        <div className="flex gap-1 mt-3">
          <button onClick={() => setMode('html')} className={`px-2 py-1 rounded text-[11px] font-medium ${mode === 'html' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-dark-300'}`}>🌐 HTML</button>
          <button onClick={() => setMode('text')} className={`px-2 py-1 rounded text-[11px] font-medium ${mode === 'text' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-dark-300'}`}>📝 Metin</button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {mode === 'html' && email.body_html ? (
          <iframe ref={iframeRef} title="Mail" className="w-full min-h-[400px] border-none bg-white" sandbox="allow-same-origin" />
        ) : (
          <div className="p-4 whitespace-pre-wrap text-xs text-gray-700 dark:text-dark-300 font-mono">{email.body_text || 'İçerik yok'}</div>
        )}
      </div>

      {/* Attachments */}
      {email.attachments?.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-900/50">
          <p className="text-[11px] font-semibold text-gray-600 dark:text-dark-300 mb-2">📎 Ekler ({email.attachments.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {email.attachments.map((a) => (
              <a key={a.id} href={`${api}/emails/${email.id}/attachments/${a.id}`} download={a.filename} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors">
                📄 {a.filename || 'Ek'} {a.size > 0 && <span className="text-gray-400 dark:text-dark-500">({(a.size / 1024).toFixed(1)}KB)</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
