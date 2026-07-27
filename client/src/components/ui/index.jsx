/**
 * Paylaşılan UI primitifleri — koyu-cam yüzeyler (modal, admin, account).
 * Kullananlar: AccountEditorModal, AdminPanel (StatusPill/PageHero), gelecekteki sahneler.
 */

export function SidebarNavButton({ active, icon: Icon, label, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl px-3 py-2.5 text-left transition-colors ${
        active
          ? 'border border-white/10 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'text-white/70 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} className={active ? 'text-white' : 'text-white/55'} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          {subtitle ? <p className="mt-0.5 truncate text-[10px] text-white/40">{subtitle}</p> : null}
        </div>
      </div>
    </button>
  );
}

export function SettingRow({ label, description, children, stacked = false }) {
  return (
    <div className={`flex ${stacked ? 'items-start' : 'items-center'} justify-between gap-4 border-b border-white/8 py-4 last:border-b-0`}>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-white">{label}</p>
        {description ? <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SmallSelect({ value, onChange, children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="appearance-none rounded-2xl border border-white/10 bg-white/6 px-4 py-2.5 pr-10 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-accent-blue/40"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/45">⌄</span>
    </div>
  );
}

export function ToggleSwitch({ checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
        checked ? 'border-accent-blue/35 bg-accent-blue/80' : 'border-white/12 bg-white/10'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export function StatTile({ label, value, icon: Icon, tone = 'blue' }) {
  const toneClass = {
    blue: 'text-accent-blue',
    green: 'text-accent-green',
    gold: 'text-accent-gold',
    purple: 'text-accent-purple',
  }[tone] || 'text-white';
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
        </div>
        <Icon size={17} className={toneClass} />
      </div>
    </div>
  );
}

export function Avatar({ src, fallback, sizeClass = 'h-14 w-14', error, onError }) {
  return (
    <div className={`${sizeClass} overflow-hidden rounded-3xl border border-white/10 bg-white/8 shadow-[0_10px_30px_rgba(0,0,0,0.2)] flex items-center justify-center shrink-0`}>
      {src && !error ? (
        <img src={src} alt="Profil fotoğrafı" className="h-full w-full object-cover" onError={onError} />
      ) : (
        <span className="text-lg font-semibold text-white">{fallback}</span>
      )}
    </div>
  );
}

export function StatusPill({ label, className }) {
  return <span className={className}>{label}</span>;
}

export function PageHero({ title, subtitle, icon: Icon, actions, tabs, activeTab, onTabChange, eyebrow }) {
  return (
    <div className="admin-signal-card card relative overflow-hidden p-5 sm:p-7 bg-[radial-gradient(circle_at_top_left,rgba(91,141,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(76,210,235,0.12),transparent_28%)]">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl border border-accent-cyan/20 bg-accent-cyan/10 flex items-center justify-center shadow-glow-cyan shrink-0">
            <Icon size={30} className="text-accent-cyan" />
          </div>
          <div className="min-w-0">
            {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-txt-muted">{eyebrow}</p> : null}
            <h2 className="mt-1 text-2xl sm:text-[2rem] font-semibold tracking-tight text-txt-primary">{title}</h2>
            <p className="text-sm text-txt-secondary mt-1">{subtitle}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {tabs?.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-6">
          {tabs.map((item) => {
            const IconNode = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                className={activeTab === item.id ? 'nav-pill nav-pill-active' : 'nav-pill'}
              >
                {IconNode ? <IconNode size={15} /> : null} {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
