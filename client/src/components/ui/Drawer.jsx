import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Right-side sheet. Used for Bulk Inbox and other contextual detail views.
 * side: 'right' | 'left'
 */
export function Drawer({ show, onClose, title, subtitle, children, footer, side = 'right', width = 'max-w-xl', closeLabel = 'Close' }) {
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [show, onClose]);

  if (!show) return null;
  const isRight = side === 'right';
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex bg-[rgb(var(--overlay)/0.6)] backdrop-blur-sm animate-fade-in" style={{ justifyContent: isRight ? 'flex-end' : 'flex-start' }} onClick={onClose} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        className={`h-full w-full ${width} flex flex-col bg-brand-surface border-brand-border ${isRight ? 'border-l' : 'border-r'}`}
        style={{ animation: 'drawerIn var(--dur-3) var(--ease)' }}
      >
        <div className="shrink-0 border-b border-brand-border/60 px-5 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h2 className="t-card-title text-txt-primary truncate">{title}</h2> : null}
            {subtitle ? <p className="t-body-sm text-txt-muted mt-0.5">{subtitle}</p> : null}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label={closeLabel} className="shrink-0 grid place-items-center w-9 h-9 -my-1 -mr-1 rounded-[var(--r-md)] text-txt-muted hover:text-txt-primary hover:bg-brand-surface2 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="shrink-0 border-t border-brand-border/60 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
