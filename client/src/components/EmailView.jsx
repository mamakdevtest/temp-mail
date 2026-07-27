import { useState, useRef, useEffect } from 'react';
import { Mail, Reply, X, KeyRound, Copy, Check, Download, Globe, AlignLeft, Paperclip, Trash2, Sparkles } from 'lucide-react';
import DOMPurify from 'dompurify';
import { EmailViewSkeleton } from './Skeleton';
import { addressTokenHeader } from '../utils/addressToken';
import { useLocale } from '../i18n';

export default function EmailView({ email, onClose, api, onReply, onCopyOtp, isLoading }) {
  const { t, language } = useLocale();
  const [mode, setMode] = useState('html');
  const [otpCopied, setOtpCopied] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const iframeRef = useRef(null);

  const downloadAttachment = async (att) => {
    if (downloading) return;
    setDownloading(att.id);
    try {
      const r = await fetch(`${api}/emails/${email.id}/attachments/${att.id}`, { headers: addressTokenHeader(email.address) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename || 'ek';
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) { /* indirilemedi */ }
    setDownloading(null);
  };

  useEffect(() => {
    if (email?.body_html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const clean = DOMPurify.sanitize(email.body_html, {
        ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'a', 'b', 'i', 'u', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'blockquote', 'pre', 'code', 'hr', 'style', 'font', 'center', 'small', 'sub', 'sup'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class', 'id', 'align', 'valign', 'cellpadding', 'cellspacing', 'border', 'bgcolor', 'color', 'size', 'face', 'target'],
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Plus Jakarta Sans',Inter,sans-serif;font-size:13px;line-height:1.8;color:#F6FAFF;padding:20px;margin:0;background:#091326;word-wrap:break-word}img{max-width:100%;height:auto;border-radius:12px}a{color:#34D7FF}table{max-width:100%}</style></head><body>${clean}</body></html>`);
      doc.close();
      const resize = () => { try { iframe.style.height = `${doc.documentElement.scrollHeight}px`; } catch (e) { /* */ } };
      iframe.onload = resize;
      setTimeout(resize, 100);
    }
  }, [email]);

  const handleOtpCopy = () => {
    if (email?.otp_code && onCopyOtp) {
      onCopyOtp(email.otp_code);
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  const fmt = (d) => new Date(d).toLocaleString(language === 'en' ? 'en-US' : 'tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isLoading) return <div className="card p-0 overflow-hidden h-full min-h-[430px] xl:min-h-[590px]"><EmailViewSkeleton /></div>;

  if (!email) {
    return (
      <div className="card p-0 overflow-hidden h-full min-h-[430px] xl:min-h-[590px] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(91,141,255,0.1),transparent_32%)]">
        <div className="text-center px-8 relative">
          <div className="relative mx-auto mb-6 w-28 h-28">
            <div className="absolute inset-0 rounded-full border border-brand-border/40 bg-brand-surface2/35" />
            <div className="absolute inset-[18px] rounded-full bg-brand-surface2/55 border border-brand-border/30 flex items-center justify-center">
              <Mail size={30} className="text-txt-muted" />
            </div>
            <Sparkles size={14} className="absolute right-1 top-3 text-txt-disabled" />
            <Sparkles size={11} className="absolute left-0 bottom-4 text-txt-disabled" />
            <Sparkles size={9} className="absolute right-7 bottom-0 text-txt-disabled" />
          </div>
          <p className="text-[31px] font-semibold text-txt-primary tracking-tight">{t('emailView.selectMail')}</p>
          <p className="text-base text-txt-muted mt-3 max-w-[380px] mx-auto leading-relaxed">{t('emailView.selectMailHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full min-h-[430px] xl:min-h-[590px] flex flex-col">
      <div className="px-5 py-5 border-b border-brand-border/30 flex-shrink-0">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl panel-soft flex items-center justify-center">
              <Mail size={16} className="text-accent-blue" />
            </div>
            <div>
              <p className="text-sm font-semibold text-txt-primary">{t('emailView.title')}</p>
              <p className="text-[11px] text-txt-muted">{t('emailView.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onReply && <button onClick={() => onReply({ to: email.sender, subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}` })} className="btn-secondary px-3.5 py-2.5 text-xs"><Reply size={12} /> {t('emailView.reply')}</button>}
            <button className="btn-ghost text-[10px]"><Trash2 size={12} /></button>
            <button onClick={onClose} className="btn-ghost px-2.5 py-2"><X size={14} /></button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <p><span className="text-txt-muted w-16 inline-block">{t('emailView.sender')}</span> <span className="text-txt-primary font-medium">{email.sender}</span></p>
          <p><span className="text-txt-muted w-16 inline-block">{t('emailView.subject')}</span> <span className="text-txt-primary font-semibold">{email.subject || t('inbox.noSubject')}</span></p>
          <p><span className="text-txt-muted w-16 inline-block">{t('emailView.date')}</span> <span className="text-txt-secondary">{fmt(email.received_at)}</span></p>
        </div>

        {email.otp_code && (
          <div className="mt-4 p-4 rounded-[22px] bg-gradient-to-r from-accent-purple/12 to-accent-blue/10 border border-accent-purple/18 animate-slide-up">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-accent-purple font-medium flex items-center gap-1.5"><KeyRound size={11} /> {t('emailView.otpCode')}</p>
                <p className="text-3xl font-mono font-bold tracking-[0.28em] text-accent-purple mt-2">{email.otp_code}</p>
              </div>
              <button onClick={handleOtpCopy} className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold transition-all ${otpCopied ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-purple/18 text-accent-purple hover:bg-accent-purple/28'}`}>
                {otpCopied ? <Check size={12} /> : <Copy size={12} />} {otpCopied ? t('emailView.copied') : t('emailView.copy')}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={() => setMode('html')} className={`btn-secondary px-3.5 py-2 text-xs ${mode === 'html' ? '!bg-accent-blue/15 !text-accent-blue !border-accent-blue/25' : ''}`}><Globe size={12} /> HTML</button>
          <button onClick={() => setMode('text')} className={`btn-secondary px-3.5 py-2 text-xs ${mode === 'text' ? '!bg-accent-blue/15 !text-accent-blue !border-accent-blue/25' : ''}`}><AlignLeft size={12} /> {t('emailView.textMode')}</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-brand-surface/45">
        {mode === 'html' && email.body_html ? (
          <iframe ref={iframeRef} title="Mail" className="w-full min-h-[400px] border-none" sandbox="allow-same-origin" />
        ) : (
          <div className="p-6 whitespace-pre-wrap text-[13px] text-txt-secondary font-mono leading-relaxed">{email.body_text || t('emailView.noContent')}</div>
        )}
      </div>

      {email.attachments?.length > 0 && (
        <div className="px-5 py-4 border-t border-brand-border/30 flex-shrink-0">
          <p className="section-title mb-3 flex items-center gap-1.5"><Paperclip size={11} /> {t('emailView.attachments', { count: email.attachments.length })}</p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((a) => (
              <button key={a.id} onClick={() => downloadAttachment(a)} disabled={downloading === a.id} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs bg-brand-surface2 border border-brand-border/35 hover:bg-brand-surface3 transition-colors text-txt-secondary disabled:opacity-50">
                <Download size={12} /> {a.filename || 'Ek'} {a.size > 0 && <span className="text-txt-muted">({(a.size / 1024).toFixed(1)}KB)</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
