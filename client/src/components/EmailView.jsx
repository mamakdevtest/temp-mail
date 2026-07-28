import { useState, useRef, useEffect } from 'react';
import { Mail, Reply, X, KeyRound, Copy, Check, Download, Globe, AlignLeft, Paperclip } from 'lucide-react';
import DOMPurify from 'dompurify';
import { EmailViewSkeleton } from './Skeleton';
import { EmptyState } from './ui';
import { addressTokenHeader } from '../utils/addressToken';
import { useLocale } from '../i18n';
import { Tabs } from './ui';

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
      a.download = att.filename || 'attachment';
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) { /* download failed */ }
    setDownloading(null);
  };

  useEffect(() => {
    if (mode === 'html' && email?.body_html && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const clean = DOMPurify.sanitize(email.body_html, {
        ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'a', 'b', 'i', 'u', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img', 'blockquote', 'pre', 'code', 'hr', 'style', 'font', 'center', 'small', 'sub', 'sup'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class', 'id', 'align', 'valign', 'cellpadding', 'cellspacing', 'border', 'bgcolor', 'color', 'size', 'face', 'target'],
        ALLOW_UNKNOWN_PROTOCOLS: false,
      });
      // Read live theme tokens so the mail body matches light/dark.
      const cs = getComputedStyle(document.documentElement);
      const rgb = (v) => `rgb(${cs.getPropertyValue(v).trim()})`;
      const bg = rgb('--surface'), fg = rgb('--text'), link = rgb('--brand');
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.7;color:${fg};padding:20px;margin:0;background:${bg};word-wrap:break-word}img{max-width:100%;height:auto;border-radius:8px}a{color:${link}}table{max-width:100%}</style></head><body>${clean}</body></html>`);
      doc.close();
      const resize = () => { try { iframe.style.height = `${doc.documentElement.scrollHeight}px`; } catch (e) { /* */ } };
      iframe.onload = resize;
      setTimeout(resize, 100);
    }
  }, [email, mode]);

  const handleOtpCopy = () => {
    if (email?.otp_code && onCopyOtp) {
      onCopyOtp(email.otp_code);
      setOtpCopied(true);
      setTimeout(() => setOtpCopied(false), 2000);
    }
  };

  const fmt = (d) => new Date(d).toLocaleString(language === 'en' ? 'en-US' : 'tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (isLoading) return <div className="card p-0 overflow-hidden h-full min-h-[380px] xl:min-h-[590px]"><EmailViewSkeleton /></div>;

  if (!email) {
    return (
      <div className="card h-full min-h-[380px] xl:min-h-[590px] flex items-center justify-center">
        <EmptyState icon={Mail} title={t('emailView.selectMail')} description={t('emailView.selectMailHint')} />
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full min-h-[380px] xl:min-h-[590px] flex flex-col">
      <div className="px-4 py-3.5 border-b border-brand-border/60 flex-shrink-0 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-txt-primary truncate">{email.subject || t('inbox.noSubject')}</p>
            <p className="t-body-sm text-txt-muted truncate mt-0.5">{email.sender} · {fmt(email.received_at)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onReply && <button onClick={() => onReply({ to: email.sender, subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}` })} className="btn-secondary"><Reply size={13} /> {t('emailView.reply')}</button>}
            <button onClick={onClose} className="btn-ghost" aria-label={t('app.close')}><X size={15} /></button>
          </div>
        </div>

        {email.otp_code && (
          <div className="p-3.5 rounded-[var(--r-lg)] bg-[rgb(var(--otp)/0.1)] border border-[rgb(var(--otp)/0.25)] flex items-center justify-between gap-3 animate-pop-in">
            <div className="min-w-0">
              <p className="t-caption text-[rgb(var(--otp))] font-medium flex items-center gap-1.5"><KeyRound size={11} /> {t('emailView.otpCode')}</p>
              <p className="text-2xl font-mono font-bold tracking-[0.24em] text-[rgb(var(--otp))] mt-1">{email.otp_code}</p>
            </div>
            <button onClick={handleOtpCopy} className={`btn-secondary shrink-0 ${otpCopied ? '!text-[rgb(var(--success-fg))]' : ''}`}>
              {otpCopied ? <Check size={13} /> : <Copy size={13} />} {otpCopied ? t('emailView.copied') : t('emailView.copy')}
            </button>
          </div>
        )}

        <Tabs
          variant="pills"
          items={[
            { id: 'html', label: 'HTML', icon: Globe },
            { id: 'text', label: t('emailView.textMode'), icon: AlignLeft },
          ]}
          activeTab={mode}
          onTabChange={setMode}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {mode === 'html' && email.body_html ? (
          <iframe ref={iframeRef} title="Mail" className="w-full min-h-[400px] border-none" sandbox="allow-same-origin" />
        ) : (
          <div className="p-5 whitespace-pre-wrap text-[13px] text-txt-secondary font-mono leading-relaxed">{email.body_text || t('emailView.noContent')}</div>
        )}
      </div>

      {email.attachments?.length > 0 && (
        <div className="px-4 py-3 border-t border-brand-border/60 flex-shrink-0">
          <p className="section-title mb-2 flex items-center gap-1.5"><Paperclip size={11} /> {t('emailView.attachments', { count: email.attachments.length })}</p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((a) => (
              <button key={a.id} onClick={() => downloadAttachment(a)} disabled={downloading === a.id} className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--r-md)] text-xs bg-brand-surface2 border border-brand-border hover:bg-brand-surface3 transition-colors text-txt-secondary disabled:opacity-50">
                <Download size={12} /> {a.filename || 'attachment'} {a.size > 0 && <span className="text-txt-muted">({(a.size / 1024).toFixed(1)}KB)</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
