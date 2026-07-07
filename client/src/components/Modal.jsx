import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ show, onClose, title, subtitle, children, footer, wide, size = 'md', compact = false }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, title, onClose]);

  if (!show) return null;
  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    full: 'max-w-none',
  }[size] || (wide ? 'max-w-xl' : 'max-w-md');
  const viewportClass = compact
    ? 'items-center justify-center p-3 sm:p-4'
    : size === 'full'
      ? 'items-stretch p-0 sm:p-0'
      : 'items-start p-2 sm:p-4';
  const cardStyle = compact ? { width: 'min(980px, calc(100vw - 1rem))', maxHeight: 'min(800px, calc(100vh - 1rem))' } : undefined;
  return createPortal(
    <div
      className={`fixed inset-0 bg-brand-bg/82 backdrop-blur-xl z-[1000] flex justify-center overflow-y-auto ${viewportClass}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={cardStyle}
        className={`bg-brand-surface/95 border border-brand-border/55 rounded-none ${compact ? 'rounded-[30px] border-white/8 bg-[#161616]/96 shadow-[0_28px_100px_rgba(0,0,0,0.58)]' : size === 'full' ? 'sm:rounded-none shadow-none w-screen min-h-screen max-h-screen' : 'sm:rounded-[28px] shadow-panel'} w-full ${compact ? 'max-w-none h-full min-h-0 max-h-none' : sizeClass} animate-slide-up overflow-hidden ${compact ? 'flex' : size === 'full' ? 'min-h-screen max-h-screen' : 'min-h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] sm:min-h-0 sm:max-h-[calc(100vh-3rem)]'} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal'}
      >
        {title && (
          <div className={`${size === 'full' ? 'px-4 sm:px-5 py-3' : 'px-4 sm:px-6 py-4 sm:py-5'} border-b border-brand-border/25 bg-brand-surface2/35 shrink-0 ${size === 'full' ? 'sticky top-0 z-10 backdrop-blur-xl' : ''}`}>
            <h3 className={`font-semibold text-txt-primary tracking-tight ${size === 'full' ? 'text-base' : 'text-lg'}`}>{title}</h3>
            {subtitle && <p className={`${size === 'full' ? 'text-xs' : 'text-sm'} text-txt-muted mt-0.5`}>{subtitle}</p>}
          </div>
        )}
        <div ref={bodyRef} className={`${compact ? 'p-0 overflow-hidden flex-1 min-h-0' : size === 'full' ? 'p-3 sm:p-4' : 'p-4 sm:p-6 overflow-y-auto flex-1'} ${size === 'full' ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_24%)]' : ''}`}>{children}</div>
        {footer && <div className={`${size === 'full' ? 'px-4 sm:px-5 py-3' : 'px-4 sm:px-6 py-4'} border-t border-brand-border/25 bg-brand-surface2/30 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 ${size === 'full' ? 'sticky bottom-0 z-10 backdrop-blur-xl' : ''}`}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
