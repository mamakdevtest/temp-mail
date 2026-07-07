export default function Modal({ show, onClose, title, subtitle, children, footer, wide }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-brand-surface border border-brand-border/40 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-lg' : 'max-w-sm'} animate-slide-up overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="px-6 py-4 border-b border-brand-border/20">
            <h3 className="font-bold text-txt-primary text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-txt-muted mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-brand-border/20 bg-brand-surface2/50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
