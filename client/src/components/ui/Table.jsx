/**
 * Responsive table. Desktop = real table; below `stackAt` breakpoint each row
 * renders as a stacked card (label: value). Columns:
 *   [{ key, header, render?(row), className?, primary?(bool) }]
 * primary column becomes the card title on mobile.
 */
export function Table({ columns, rows, keyField = 'id', onRowClick, empty, stackAt = 'md', rowClassName }) {
  if (!rows?.length && empty) return empty;
  const hideBelow = { sm: 'hidden sm:table', md: 'hidden md:table', lg: 'hidden lg:table' }[stackAt] || 'hidden md:table';
  const showBelow = { sm: 'sm:hidden', md: 'md:hidden', lg: 'lg:hidden' }[stackAt] || 'md:hidden';

  return (
    <>
      {/* Desktop table */}
      <table className={`${hideBelow} w-full border-collapse`}>
        <thead>
          <tr className="border-b border-brand-border/60">
            {columns.map((c) => (
              <th key={c.key} className={`text-left section-title font-semibold py-2.5 px-3 ${c.className || ''}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-brand-border/40 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-brand-surface2/60 transition-colors' : ''} ${rowClassName?.(row) || ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`py-3 px-3 t-body-sm text-txt-secondary align-middle ${c.className || ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards */}
      <div className={`${showBelow} space-y-2.5`}>
        {rows.map((row) => (
          <div
            key={row[keyField]}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`card p-3.5 ${onRowClick ? 'cursor-pointer active:scale-[0.99] transition-transform' : ''}`}
          >
            {columns.map((c) => (
              c.primary ? (
                <div key={c.key} className="t-card-title text-txt-primary mb-2">{c.render ? c.render(row) : row[c.key]}</div>
              ) : (
                <div key={c.key} className="flex items-center justify-between gap-3 py-1 text-txt-secondary">
                  <span className="section-title">{c.header}</span>
                  <span className="t-body-sm text-right min-w-0 truncate">{c.render ? c.render(row) : row[c.key]}</span>
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
