export function AdminPanelCard({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`admin-signal-card card relative overflow-hidden p-4 sm:p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {Icon ? (
            <div className="w-10 h-10 rounded-xl border border-accent-blue/20 bg-accent-blue/10 flex items-center justify-center shrink-0">
              <Icon size={17} className="text-accent-blue" />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-txt-muted">Operasyon alanı</p>
            <h3 className="mt-0.5 text-sm font-semibold text-txt-primary truncate">{title}</h3>
          </div>
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminStatCard({ title, value, subtitle, icon: Icon, tone = 'blue' }) {
  const toneMap = {
    blue: 'from-accent-blue/20 to-accent-blue/5 text-accent-blue',
    green: 'from-accent-green/20 to-accent-green/5 text-accent-green',
    gold: 'from-accent-gold/20 to-accent-gold/5 text-accent-gold',
    purple: 'from-accent-purple/20 to-accent-purple/5 text-accent-purple',
    cyan: 'from-accent-cyan/20 to-accent-cyan/5 text-accent-cyan',
    red: 'from-accent-red/20 to-accent-red/5 text-accent-red',
  };

  const lineMap = {
    blue: 'from-accent-blue/0 via-accent-blue to-accent-blue/0',
    green: 'from-accent-green/0 via-accent-green to-accent-green/0',
    gold: 'from-accent-gold/0 via-accent-gold to-accent-gold/0',
    purple: 'from-accent-purple/0 via-accent-purple to-accent-purple/0',
    cyan: 'from-accent-cyan/0 via-accent-cyan to-accent-cyan/0',
    red: 'from-accent-red/0 via-accent-red to-accent-red/0',
  };

  return (
    <div className="admin-signal-card card relative overflow-hidden p-4 sm:p-5">
      <div className={`absolute inset-x-5 top-0 h-[2px] rounded-full bg-gradient-to-r ${lineMap[tone] || lineMap.blue}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-txt-muted">{title}</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-txt-primary mt-2 tabular-nums">{value}</p>
          <p className="text-xs text-txt-muted mt-2 leading-relaxed">{subtitle}</p>
        </div>
        {Icon ? (
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${toneMap[tone] || toneMap.blue} flex items-center justify-center shrink-0`}>
            <Icon size={19} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminEmptyState({ title, subtitle, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border/70 bg-brand-surface2/30 py-10 px-5 text-center">
      <p className="text-sm font-medium text-txt-secondary">{title}</p>
      <p className="text-xs text-txt-muted mt-1.5 max-w-sm mx-auto leading-relaxed">{subtitle}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminInfoRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-2 border-b border-brand-border/10 last:border-0">
      <span className="text-xs sm:text-sm text-txt-secondary">{label}</span>
      <span className={`text-xs sm:text-sm text-txt-primary sm:text-right break-words ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function AdminToolbar({ children, className = '' }) {
  return <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${className}`}>{children}</div>;
}
