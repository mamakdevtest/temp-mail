export function AdminPanelCard({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {Icon ? (
            <div className="w-9 h-9 rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 flex items-center justify-center shrink-0">
              <Icon size={16} className="text-[rgb(var(--brand))]" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="t-card-title text-txt-primary truncate">{title}</h3>
          </div>
        </div>
        {action ? <div className="w-full sm:w-auto shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

// tone maps to the single-accent precision palette; blue/cyan collapse to brand,
// green→success, gold→warning, purple→otp, red→danger.
const STAT_TONE = {
  blue: 'text-[rgb(var(--brand))]',
  cyan: 'text-[rgb(var(--brand))]',
  green: 'text-[rgb(var(--success-fg))]',
  gold: 'text-[rgb(var(--warning-fg))]',
  purple: 'text-[rgb(var(--otp))]',
  red: 'text-[rgb(var(--danger-fg))]',
};

export function AdminStatCard({ title, value, subtitle, icon: Icon, tone = 'blue' }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-title">{title}</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-txt-primary mt-2 tabular-nums">{value}</p>
          <p className="text-xs text-txt-muted mt-2 leading-relaxed">{subtitle}</p>
        </div>
        {Icon ? <Icon size={18} className={`${STAT_TONE[tone] || STAT_TONE.blue} shrink-0`} /> : null}
      </div>
    </div>
  );
}

export function AdminEmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-dashed border-brand-border bg-brand-surface2/40 py-10 px-5 text-center">
      <p className="text-sm font-medium text-txt-secondary">{title}</p>
      <p className="text-xs text-txt-muted mt-1.5 max-w-sm mx-auto leading-relaxed">{subtitle}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminInfoRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-2 border-b border-brand-border/50 last:border-0">
      <span className="text-xs sm:text-sm text-txt-secondary">{label}</span>
      <span className={`text-xs sm:text-sm text-txt-primary sm:text-right break-words ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function AdminToolbar({ children, className = '' }) {
  return <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${className}`}>{children}</div>;
}
