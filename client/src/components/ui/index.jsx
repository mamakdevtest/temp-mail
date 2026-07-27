/**
 * MS Temp Mail — V2 UI primitives (token-based, precision tooling).
 * Every primitive reads design tokens (theme.css); no white-alpha glass,
 * no hardcoded hex. Dark/light adapt automatically.
 */
import { forwardRef } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';

/* ---------- Button ---------- */
const BTN_VARIANT = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};
const BTN_SIZE = {
  sm: 'text-xs px-3 py-1.5',
  md: '',
  lg: 'text-sm px-5 py-3',
};
export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading, disabled, icon: Icon, iconRight: IconRight, children, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${BTN_VARIANT[variant] || BTN_VARIANT.secondary} ${BTN_SIZE[size] || ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={15} /> : null}
    </button>
  );
});

/* ---------- IconButton ---------- */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, size = 16, label, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-[var(--r-md)] w-9 h-9 text-txt-muted hover:text-txt-primary hover:bg-brand-surface2 transition-colors active:scale-95 ${className}`}
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
});

/* ---------- Field wrapper ---------- */
export function Field({ label, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? <label htmlFor={htmlFor} className="section-title block">{label}</label> : null}
      {children}
      {error ? (
        <p className="text-[12px] text-[rgb(var(--danger-fg))]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-txt-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------- Input / Textarea ---------- */
export const Input = forwardRef(function Input({ className = '', invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`input ${invalid ? 'border-[rgb(var(--danger))] focus:border-[rgb(var(--danger))]' : ''} ${className}`}
      {...rest}
    />
  );
});
export const Textarea = forwardRef(function Textarea({ className = '', rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={`input resize-y ${className}`} {...rest} />;
});

/* ---------- Select ---------- */
export const Select = forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <div className={`relative ${className}`}>
      <select
        ref={ref}
        className="input appearance-none pr-9 cursor-pointer"
        {...rest}
      >
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted" />
    </div>
  );
});
/* Compact select used inside dense settings rows */
export function SmallSelect({ value, onChange, children, className = '' }) {
  return <Select value={value} onChange={onChange} className={className}>{children}</Select>;
}

/* ---------- Switch ---------- */
export function Switch({ checked, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
        checked
          ? 'border-[rgb(var(--brand))] bg-[rgb(var(--brand))]'
          : 'border-brand-border bg-brand-surface3'
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
export const ToggleSwitch = Switch; // legacy alias

/* ---------- Checkbox ---------- */
export function Checkbox({ checked, onChange, label, id }) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-txt-secondary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-brand-border bg-brand-surface2 accent-[rgb(var(--brand))]"
      />
      {label}
    </label>
  );
}

/* ---------- Card ---------- */
export function Card({ as: Tag = 'div', className = '', children, ...rest }) {
  return <Tag className={`card p-5 ${className}`} {...rest}>{children}</Tag>;
}

/* ---------- StatCard ---------- */
const STAT_TONE = {
  brand: 'text-[rgb(var(--brand))]',
  success: 'text-[rgb(var(--success-fg))]',
  warning: 'text-[rgb(var(--warning-fg))]',
  danger: 'text-[rgb(var(--danger-fg))]',
  otp: 'text-[rgb(var(--otp))]',
  pro: 'text-[rgb(var(--pro))]',
  info: 'text-[rgb(var(--info-fg))]',
};
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand' }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-title">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-txt-primary tabular-nums">{value}</p>
          {hint ? <p className="mt-1 text-[12px] text-txt-muted">{hint}</p> : null}
        </div>
        {Icon ? <Icon size={18} className={STAT_TONE[tone] || STAT_TONE.brand} /> : null}
      </div>
    </div>
  );
}
export const StatTile = StatCard; // legacy alias

/* ---------- Badge ---------- */
const BADGE_TONE = {
  brand: 'badge-blue', neutral: 'badge', success: 'badge-green', warning: 'badge-gold',
  danger: 'badge-red', otp: 'badge-purple', pro: 'badge-gold', info: 'badge-cyan',
};
export function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span className={`${BADGE_TONE[tone] || 'badge'} ${className}`}>
      {Icon ? <Icon size={11} /> : null}
      {children}
    </span>
  );
}

/* ---------- StatusPill (active/paused/archived) ---------- */
const STATUS_TONE = {
  active: 'success', live: 'success', paused: 'warning', archived: 'neutral', error: 'danger',
};
export function StatusPill({ status, label, className = '' }) {
  const tone = STATUS_TONE[status] || 'neutral';
  return (
    <Badge tone={tone} className={className}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone === 'success' ? 'bg-[rgb(var(--success))]' : tone === 'warning' ? 'bg-[rgb(var(--warning))]' : tone === 'danger' ? 'bg-[rgb(var(--danger))]' : 'bg-txt-muted'}`} />
      {label || status}
    </Badge>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ src, fallback, size = 'md', error, onError, alt = '' }) {
  const dim = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-16 w-16 text-lg' }[size] || 'h-12 w-12';
  return (
    <div className={`${dim} overflow-hidden rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 flex items-center justify-center shrink-0`}>
      {src && !error ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={onError} />
      ) : (
        <span className="font-semibold text-txt-primary">{fallback}</span>
      )}
    </div>
  );
}

/* ---------- PageHeader ---------- */
export function PageHeader({ title, subtitle, icon: Icon, actions, tabs, activeTab, onTabChange, eyebrow }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          {Icon ? (
            <div className="w-11 h-11 rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-[rgb(var(--brand))]" />
            </div>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className="section-title">{eyebrow}</p> : null}
            <h1 className="t-title text-txt-primary">{title}</h1>
            {subtitle ? <p className="t-body-sm text-txt-muted mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 shrink-0">{actions}</div> : null}
      </div>
      {tabs?.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-brand-border/60 -mb-px">
          {tabs.map((item) => {
            const IconNode = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? 'border-[rgb(var(--brand))] text-txt-primary'
                    : 'border-transparent text-txt-muted hover:text-txt-secondary'
                }`}
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
export const PageHero = PageHeader; // legacy alias

/* ---------- EmptyState ---------- */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}>
      {Icon ? (
        <div className="w-12 h-12 rounded-[var(--r-lg)] bg-brand-surface2 border border-brand-border flex items-center justify-center mb-4">
          <Icon size={22} className="text-txt-muted" />
        </div>
      ) : null}
      <p className="t-section text-txt-secondary">{title}</p>
      {description ? <p className="t-body-sm text-txt-muted mt-1.5 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ---------- ErrorState (inline banner) ---------- */
export function ErrorState({ message, action, className = '' }) {
  return (
    <div className={`flex items-start gap-3 rounded-[var(--r-lg)] border border-[rgb(var(--danger)/0.25)] bg-[rgb(var(--danger)/0.08)] px-4 py-3 ${className}`}>
      <p className="t-body-sm text-[rgb(var(--danger-fg))] flex-1">{message}</p>
      {action}
    </div>
  );
}

/* ---------- Loading ---------- */
export function Loading({ label, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-txt-muted ${className}`}>
      <Loader2 size={22} className="animate-spin text-[rgb(var(--brand))]" />
      {label ? <p className="t-body-sm">{label}</p> : null}
    </div>
  );
}

/* ---------- SidebarNavButton (rail item) ---------- */
export function SidebarNavButton({ active, icon: Icon, label, subtitle, onClick, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[var(--r-md)] px-3 py-2 text-left transition-colors flex items-center gap-3 ${
        active
          ? 'bg-[rgb(var(--brand)/0.1)] text-txt-primary'
          : 'text-txt-secondary hover:bg-brand-surface2 hover:text-txt-primary'
      }`}
    >
      {Icon ? <Icon size={17} className={active ? 'text-[rgb(var(--brand))]' : 'text-txt-muted'} /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {subtitle ? <span className="block truncate text-[11px] text-txt-muted">{subtitle}</span> : null}
      </span>
      {badge}
    </button>
  );
}

/* ---------- SettingRow ---------- */
export function SettingRow({ label, description, children, stacked = false }) {
  return (
    <div className={`flex ${stacked ? 'flex-col items-stretch' : 'items-center'} justify-between gap-4 border-b border-brand-border/50 py-4 last:border-b-0`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-txt-primary">{label}</p>
        {description ? <p className="mt-1 t-body-sm text-txt-muted leading-relaxed">{description}</p> : null}
      </div>
      <div className={stacked ? '' : 'shrink-0'}>{children}</div>
    </div>
  );
}

export { Modal } from '../Modal';
export { Drawer } from './Drawer';
export { Table } from './Table';
export { CommandPalette } from './CommandPalette';
export { ToastHost, useToast } from './Toast';
