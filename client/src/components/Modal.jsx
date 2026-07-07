import { useEffect, useRef } from 'react';

export default function Modal({ show, onClose, title, subtitle, children, footer, wide, size = 'md' }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, title, onClose]);

  if (!show) return null;
  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
    '3xl': 'max-w-6xl',
    full: 'max-w-[96vw]',
  }[size] || (wide ? 'max-w-xl' : 'max-w-md');
  const viewportClass = size === 'full' ? 'items-stretch p-0 sm:p-0' : 'items-start p-2 sm:p-4';
  return (
    <div
      className={`fixed inset-0 bg-brand-bg/82 backdrop-blur-xl z-50 flex justify-center overflow-y-auto ${viewportClass}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`bg-brand-surface/95 border border-brand-border/55 rounded-none ${size === 'full' ? 'sm:rounded-none shadow-none w-screen min-h-screen max-h-screen' : 'sm:rounded-[28px] shadow-panel'} w-full ${sizeClass} animate-slide-up overflow-hidden ${size === 'full' ? 'min-h-screen max-h-screen' : 'min-h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] sm:min-h-0 sm:max-h-[calc(100vh-3rem)]'} flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal'}
      >
        {title && (
          <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b border-brand-border/25 bg-brand-surface2/35 shrink-0 ${size === 'full' ? 'sticky top-0 z-10 backdrop-blur-xl' : ''}`}>
            <h3 className="font-semibold text-txt-primary text-lg tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-txt-muted mt-1">{subtitle}</p>}
          </div>
        )}
        <div ref={bodyRef} className={`p-4 sm:p-6 overflow-y-auto flex-1 ${size === 'full' ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_24%)]' : ''}`}>{children}</div>
        {footer && <div className={`px-4 sm:px-6 py-4 border-t border-brand-border/25 bg-brand-surface2/30 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 ${size === 'full' ? 'sticky bottom-0 z-10 backdrop-blur-xl' : ''}`}>{footer}</div>}
      </div>
    </div>
  );
}
