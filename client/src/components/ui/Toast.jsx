import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);

const TONE = {
  success: { icon: CheckCircle2, cls: 'border-[rgb(var(--success)/0.3)] text-[rgb(var(--success-fg))]' },
  error: { icon: AlertTriangle, cls: 'border-[rgb(var(--danger)/0.3)] text-[rgb(var(--danger-fg))]' },
  info: { icon: Info, cls: 'border-[rgb(var(--brand)/0.3)] text-[rgb(var(--brand))]' },
};

/** useToast() -> (message, tone?, ms?) */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastHost');
  return ctx;
}

export function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, tone = 'info', ms = 3200) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone }]);
    if (ms > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    return id;
  }, []);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[1100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]" role="status" aria-live="polite">
          {toasts.map((t) => {
            const { icon: Icon, cls } = TONE[t.tone] || TONE.info;
            return (
              <div key={t.id} className={`card px-4 py-3 flex items-start gap-3 animate-slide-down ${cls}`}>
                <Icon size={17} className="shrink-0 mt-0.5" />
                <p className="flex-1 t-body-sm text-txt-primary">{t.message}</p>
                <button type="button" onClick={() => dismiss(t.id)} className="shrink-0 text-txt-muted hover:text-txt-primary"><X size={15} /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}
