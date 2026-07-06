/**
 * Yeniden kullanılabilir modal bileşeni
 */
export default function Modal({ show, onClose, title, subtitle, children, footer, wide }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-lg' : 'max-w-sm'} border border-gray-200/50 dark:border-dark-700/50 animate-slide-up overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-700">
            <h3 className="font-bold text-gray-800 dark:text-dark-100 text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-dark-400 mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-900/50 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
