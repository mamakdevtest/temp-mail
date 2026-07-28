import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
  '2xl': 'sm:max-w-5xl',
  '3xl': 'sm:max-w-6xl',
  full: 'sm:max-w-none',
};

/**
 * Token-based modal. Focus-trap + esc + scroll-lock + click-outside.
 * `size="full"` = edge-to-edge sheet (used by Bulk Inbox legacy path).
 */
export default function Modal({ show, onClose, title, subtitle, children, footer, wide, size = 'md', compact = false, closeLabel = 'Close' }) {
  const bodyRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const card = cardRef.current;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab' || !card) return;
      const focusable = card.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      const focusable = card?.querySelector('input,button,textarea,select,a[href]');
      focusable?.focus?.();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
    // ponytail: deps intentionally only [show] — onClose is often an inline
    // arrow in callers; including it re-runs this effect on every parent
    // render and re-focuses the first input mid-typing, dropping the caret.
  }, [show]);

  if (!show) return null;
  const full = size === 'full';
  const sizeClass = SIZE[size] || (wide ? SIZE.lg : SIZE.md);

  return createPortal(
    <div
      className={`fixed inset-0 z-[1000] flex justify-center overflow-y-auto bg-[rgb(var(--overlay)/0.6)] backdrop-blur-sm animate-fade-in ${full ? 'items-stretch p-0' : compact ? 'items-center p-3 sm:p-4' : 'items-start p-3 sm:py-8 sm:px-4'}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        className={`card w-full flex flex-col overflow-hidden animate-pop-in ${sizeClass} ${
          full
            ? 'min-h-screen max-h-screen rounded-none border-0 sm:border'
            : 'max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-4rem)]'
        }`}
      >
        {title && (
          <div className={`shrink-0 border-b border-brand-border/60 px-5 py-4 ${full ? 'sticky top-0 z-10 bg-brand-surface' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="t-card-title text-txt-primary truncate">{title}</h2>
                {subtitle && <p className="t-body-sm text-txt-muted mt-0.5">{subtitle}</p>}
              </div>
              {onClose && (
                <button type="button" onClick={onClose} aria-label={closeLabel} className="shrink-0 grid place-items-center w-9 h-9 -my-1 -mr-1 rounded-[var(--r-md)] text-txt-muted hover:text-txt-primary hover:bg-brand-surface2 transition-colors">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}
        <div ref={bodyRef} className={`flex-1 min-h-0 overflow-y-auto ${compact ? 'p-0' : 'p-5'}`}>{children}</div>
        {footer && (
          <div className={`shrink-0 border-t border-brand-border/60 px-5 py-3.5 flex flex-col-reverse sm:flex-row justify-end gap-2 ${full ? 'sticky bottom-0 z-10 bg-brand-surface' : ''}`}>{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export { Modal };
