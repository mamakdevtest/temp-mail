import { useState, useRef, useEffect } from 'react';
import { Mail, Reply, X, KeyRound, Copy, Check, Download, Globe, AlignLeft, Paperclip, Trash2, Shield } from 'lucide-react';
import DOMPurify from 'dompurify';
import { EmailViewSkeleton } from './Skeleton';

export default function EmailView({ email, onClose, api, onReply, onCopyOtp, isLoading }) {
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
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Inter,sans-serif;font-size:13px;line-height:1.7;color:#F0F4F8;padding:20px;margin:0;background:#0E1B30;word-wrap:break-word}img{max-width:100%;height:auto}a{color:#30D5FF}table{max-width:100%}</style></head><body>${clean}</body></html>`);
      doc.close();
      const resize = () => { try { iframe.style.height = doc.documentElement.scrollHeight + 'px'; } catch (e) { /* */ } };
      iframe.onload = resize; setTimeout(resize, 100);
    }
  }, [email]);

  const handleOtpCopy = () => { if (email?.otp_code && onCopyOtp) { onCopyOtp(email.otp_code); setOtpCopied(true); setTimeout(() => setOtpCopied(false), 2000); } };
  const fmt = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (isLoading) return <div className="card p-0 overflow-hidden h-full"><EmailViewSkeleton /></div>;

  if (!email) {
    return (
      <div className="card p-0 overflow-hidden h-full flex items-center justify-center min-h-[400px]">
        <div className="text-center px-8">
          <div className="relative mx-auto mb-5 w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-accent-cyan/5" />
            <div className="absolute inset-2 rounded-full bg-accent-cyan/8 flex items-center justify-center">
              <Mail size={28} className="text-accent-cyan/40" />
            </div>
          </div>
          <p className="text-sm font-semibold text-txt-secondary">Bir e-posta seçin</p>
          <p className="text-[11px] text-txt-muted mt-1 max-w-[200px] mx-auto">İçeriği görüntülemek için gelen kutusundan bir mesaj seçin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-brand-border/20 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-accent-blue/15 flex items-center justify-center"><Mail size={12} className="text-accent-blue" /></div>
            <span className="text-xs font-semibold text-txt-primary">E-posta Detayı</span>
          </div>
          <div className="flex items-center gap-1">
            {onReply && <button onClick={() => onReply({ to: email.sender, subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}` })} className="btn-ghost text-[10px]"><Reply size={11} /> Yanıtla</button>}
            <button className="btn-ghost text-[10px]"><Trash2 size={11} /></button>
            <button onClick={onClose} className="p-1 rounded-lg text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2 transition-colors"><X size={14} /></button>
          </div>
        </div>
        {/* Meta */}
        <div className="space-y-1 text-[11px]">
          <p><span className="text-txt-muted w-14 inline-block">Gönderen</span> <span className="text-txt-primary font-medium">{email.sender}</span></p>
          <p><span className="text-txt-muted w-14 inline-block">Konu</span> <span className="text-txt-primary font-semibold">{email.subject || '(Konu yok)'}</span></p>
          <p><span className="text-txt-muted w-14 inline-block">Tarih</span> <span className="text-txt-secondary">{fmt(email.received_at)}</span></p>
        </div>

        {/* OTP */}
        {email.otp_code && (
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border border-accent-purple/20 animate-slide-up">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-accent-purple font-medium flex items-center gap-1"><KeyRound size={10} /> Doğrulama Kodu</p>
                <p className="text-2xl font-mono font-bold tracking-[0.3em] text-accent-purple mt-1">{email.otp_code}</p>
              </div>
              <button onClick={handleOtpCopy} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${otpCopied ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30'}`}>
                {otpCopied ? <Check size={10} /> : <Copy size={10} />} {otpCopied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
          </div>
        )}

        {/* View mode */}
        <div className="flex gap-1 mt-3">
          <button onClick={() => setMode('html')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${mode === 'html' ? 'bg-accent-blue/20 text-accent-blue' : 'text-txt-muted hover:bg-brand-surface2'}`}><Globe size={10} /> HTML</button>
          <button onClick={() => setMode('text')} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${mode === 'text' ? 'bg-accent-blue/20 text-accent-blue' : 'text-txt-muted hover:bg-brand-surface2'}`}><AlignLeft size={10} /> Metin</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {mode === 'html' && email.body_html ? (
          <iframe ref={iframeRef} title="Mail" className="w-full min-h-[400px] border-none" sandbox="allow-same-origin" />
        ) : (
          <div className="p-5 whitespace-pre-wrap text-[11px] text-txt-secondary font-mono leading-relaxed">{email.body_text || 'İçerik yok'}</div>
        )}
      </div>

      {/* Attachments */}
      {email.attachments?.length > 0 && (
        <div className="px-4 py-3 border-t border-brand-border/20 flex-shrink-0">
          <p className="section-title mb-2 flex items-center gap-1"><Paperclip size={10} /> Ekler ({email.attachments.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {email.attachments.map((a) => (
              <a key={a.id} href={`${api}/emails/${email.id}/attachments/${a.id}`} download={a.filename} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] bg-brand-surface2 border border-brand-border/30 hover:bg-brand-surface3 transition-colors text-txt-secondary">
                <Download size={10} /> {a.filename || 'Ek'} {a.size > 0 && <span className="text-txt-muted">({(a.size / 1024).toFixed(1)}KB)</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
