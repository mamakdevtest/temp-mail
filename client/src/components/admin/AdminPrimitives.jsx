export function AdminPanelCard({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`card p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon ? (
            <div className="w-8 h-8 rounded-xl panel-soft flex items-center justify-center shrink-0">
              <Icon size={15} className="text-accent-blue" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-txt-primary truncate">{title}</h3>
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
    <div className="card p-4 relative overflow-hidden">
      <div className={`absolute inset-x-6 bottom-0 h-[2px] rounded-full bg-gradient-to-r ${lineMap[tone] || lineMap.blue}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-txt-secondary">{title}</p>
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-txt-primary mt-1.5">{value}</p>
          <p className="text-xs text-txt-muted mt-1.5">{subtitle}</p>
        </div>
        {Icon ? (
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br ${toneMap[tone] || toneMap.blue} flex items-center justify-center shrink-0`}>
            <Icon size={19} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminEmptyState({ title, subtitle, action }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-txt-secondary">{title}</p>
      <p className="text-xs text-txt-muted mt-1">{subtitle}</p>
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
