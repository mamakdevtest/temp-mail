import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';

/**
 * Command palette (⌘K). Controlled: parent owns `open`.
 * items: [{ id, label, hint?, icon?, group?, keywords?, run() }]
 * Filters by label+keywords, groups by `group`, arrow/enter navigation.
 */
export function CommandPalette({ open, onClose, items, placeholder = 'Search…', emptyLabel = 'No results' }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) =>
      it.label.toLowerCase().includes(term) ||
      it.hint?.toLowerCase().includes(term) ||
      it.keywords?.some((k) => k.toLowerCase().includes(term)),
    );
  }, [q, items]);

  useEffect(() => { setActive(0); }, [q]);

  if (!open) return null;

  const run = (it) => { onClose?.(); it.run?.(); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) run(filtered[active]); }
    else if (e.key === 'Escape') { onClose?.(); }
  };

  // group in filtered order
  const groups = [];
  filtered.forEach((it) => {
    const g = it.group || '';
    let bucket = groups.find((x) => x.name === g);
    if (!bucket) { bucket = { name: g, items: [] }; groups.push(bucket); }
    bucket.items.push(it);
  });
  let flatIndex = -1;

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-start justify-center pt-[12vh] px-4 bg-[rgb(var(--overlay)/0.6)] backdrop-blur-sm animate-fade-in" onClick={onClose} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        role="dialog"
        aria-modal="true"
        className="card w-full max-w-lg overflow-hidden animate-pop-in"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border/60">
          <Search size={17} className="text-txt-muted shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-txt-primary placeholder-txt-muted"
          />
          <kbd className="text-[10px] text-txt-muted border border-brand-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center t-body-sm text-txt-muted py-8">{emptyLabel}</p>
          ) : (
            groups.map((g) => (
              <div key={g.name || '_'} className="mb-1">
                {g.name ? <p className="section-title px-2 py-1.5">{g.name}</p> : null}
                {g.items.map((it) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => run(it)}
                      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[var(--r-md)] text-left transition-colors ${active === idx ? 'bg-[rgb(var(--brand)/0.12)]' : ''}`}
                    >
                      {Icon ? <Icon size={16} className={active === idx ? 'text-[rgb(var(--brand))]' : 'text-txt-muted'} /> : null}
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm text-txt-primary">{it.label}</span>
                        {it.hint ? <span className="block truncate text-[12px] text-txt-muted">{it.hint}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
