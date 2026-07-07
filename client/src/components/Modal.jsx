import { useEffect, useRef } from 'react';

export default function Modal({ show, onClose, title, subtitle, children, footer, wide, size = 'md' }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });
  }, [show, title]);

  if (!show) return null;
  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
  }[size] || (wide ? 'max-w-xl' : 'max-w-md');
  return (
    <div className="fixed inset-0 bg-brand-bg/82 backdrop-blur-xl z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6" onClick={onClose}>
      <div
        className={`bg-brand-surface/95 border border-brand-border/55 rounded-[28px] shadow-panel w-full ${sizeClass} animate-slide-up overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-5 border-b border-brand-border/25 bg-brand-surface2/35 shrink-0">
            <h3 className="font-semibold text-txt-primary text-lg tracking-tight">{title}</h3>
            {subtitle && <p className="text-sm text-txt-muted mt-1">{subtitle}</p>}
          </div>
        )}
        <div ref={bodyRef} className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-brand-border/25 bg-brand-surface2/30 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
