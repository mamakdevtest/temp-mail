import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Crown,
  Globe,
  HardDrive,
  History,
  KeyRound,
  Languages,
  Lock,
  Mail,
  Monitor,
  Moon,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  Sun,
  Upload,
  User,
  X,
} from 'lucide-react';
import Modal from './Modal';
import { useLocale } from '../i18n';

function buildTabs(t) {
  return [
    { id: 'genel', label: t('accountModal.tabs.general'), icon: Settings, subtitle: t('accountModal.tabsSubtitle.general') },
    { id: 'profil', label: t('accountModal.tabs.profile'), icon: User, subtitle: t('accountModal.tabsSubtitle.profile') },
    { id: 'guvenlik', label: t('accountModal.tabs.security'), icon: Shield, subtitle: t('accountModal.tabsSubtitle.security') },
    { id: 'tercihler', label: t('accountModal.tabs.preferences'), icon: Globe, subtitle: t('accountModal.tabsSubtitle.preferences') },
    { id: 'oturumlar', label: t('accountModal.tabs.sessions'), icon: History, subtitle: t('accountModal.tabsSubtitle.sessions') },
    { id: 'kullanim', label: t('accountModal.tabs.usage'), icon: Crown, subtitle: t('accountModal.tabsSubtitle.usage') },
  ];
}

function SidebarNavButton({ active, icon: Icon, label, subtitle, onClick }) {
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

function SettingRow({ label, description, children, stacked = false }) {
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

function SmallSelect({ value, onChange, children, className = '' }) {
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

function ToggleSwitch({ checked, onClick }) {
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

function StatTile({ label, value, icon: Icon, tone = 'blue' }) {
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

function Avatar({ src, fallback, sizeClass = 'h-14 w-14', error, onError }) {
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

const textInputClass =
  'w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 transition-colors focus:border-accent-blue/40';
const actionButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors';
const primaryActionClass =
  `${actionButtonClass} bg-accent-blue text-white shadow-[0_12px_30px_rgba(36,108,255,0.26)] hover:bg-accent-blue/90 disabled:cursor-not-allowed disabled:opacity-60`;
const secondaryActionClass =
  `${actionButtonClass} border border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60`;

export default function AccountEditorModal({
  show,
  onClose,
  tab,
  setTab,
  currentUser,
  currentPkg,
  currentStats,
  currentPrefs,
  currentUserName,
  profilePhotoPreview,
  avatarInitial,
  onUploadAvatar,
  planName,
  usernameLocked,
  emailPending,
  emailChangeCooldownActive,
  profileDraft,
  setProfileDraft,
  openProfileEditor,
  saveProfile,
  savePassword,
  passwordDraft,
  setPasswordDraft,
  saving,
  loadCenter,
  center,
  revokeSession,
  formatAdminDate,
  prefDraft,
  setPrefDraft,
  domains,
  toggleFavoriteDomain,
  notificationSounds,
  onPreviewNotificationSound,
  savePreferences,
  onRequestPro,
  isAdmin,
  isPro,
  emailCount,
  currencyLabel,
  emailDraft,
  setEmailDraft,
  emailCode,
  setEmailCode,
  emailStep,
  setEmailStep,
  requestEmailChange,
  confirmEmailChange,
}) {
  const { t } = useLocale();
  const tabs = useMemo(() => buildTabs(t), [t]);
  const activeTab = tabs.find((item) => item.id === tab) || tabs[0];
  const usagePercent = useMemo(() => {
    const limit = currentPkg?.max_addresses || 3;
    return Math.min(Math.round(((currentStats?.address_count || 0) / limit) * 100), 100);
  }, [currentPkg?.max_addresses, currentStats?.address_count]);
  const activeSessions = useMemo(() => (Array.isArray(center.sessions) ? center.sessions.filter((session) => !session.revoked_at) : []), [center.sessions]);
  const recentLogins = useMemo(() => (Array.isArray(center.history) ? center.history.slice(0, 6) : []), [center.history]);
  const favoriteDomainCount = useMemo(() => (Array.isArray(center.favorite_domains) ? center.favorite_domains.length : 0), [center.favorite_domains]);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profilePhotoPreview]);

  useEffect(() => {
    if (!show) return;
    if (!tabs.some((item) => item.id === tab)) {
      setTab('genel');
    }
  }, [show, setTab, tab, tabs]);

  const displayName = currentUser?.display_name || currentUser?.username || currentUserName || '-';
  const username = currentUser?.username || currentUserName || '-';
  const email = currentUser?.email || '-';
  const statusLabel = isAdmin ? 'Admin' : isPro ? 'Pro' : 'Free';
  const statusToneClass = `${isAdmin ? 'border-accent-gold/25 bg-accent-gold/10 text-accent-gold' : isPro ? 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan' : 'border-accent-green/20 bg-accent-green/10 text-accent-green'} inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs`;

  const renderActions = () => {
    switch (activeTab.id) {
      case 'profil':
        return (
          <>
            <button type="button" onClick={() => openProfileEditor('profil')} className={secondaryActionClass}>
              <Pencil size={14} /> {t('accountModal.reset')}
            </button>
            <button type="button" onClick={saveProfile} disabled={saving} className={primaryActionClass}>
              <Save size={14} /> {t('accountModal.quickSave')}
            </button>
          </>
        );
      case 'guvenlik':
        return (
          <>
            <button type="button" onClick={loadCenter} className={secondaryActionClass}>
              <RefreshCw size={14} /> {t('accountModal.refresh')}
            </button>
            <button type="button" onClick={savePassword} disabled={saving} className={primaryActionClass}>
              <Lock size={14} /> {t('accountModal.updatePassword')}
            </button>
          </>
        );
      case 'tercihler':
        return (
          <button type="button" onClick={savePreferences} disabled={saving} className={primaryActionClass}>
            <Save size={14} /> {t('accountModal.quickSave')}
          </button>
        );
      case 'oturumlar':
        return (
          <button type="button" onClick={loadCenter} className={secondaryActionClass}>
            <RefreshCw size={14} /> {t('accountModal.refresh')}
          </button>
        );
      case 'kullanim':
        return !isPro && !isAdmin ? (
          <button type="button" onClick={onRequestPro} className={primaryActionClass}>
            <Crown size={14} /> Limit Yükselt
          </button>
        ) : null;
      default:
        return (
          <button type="button" onClick={savePreferences} disabled={saving} className={primaryActionClass}>
            <Save size={14} /> {t('accountModal.quickSave')}
          </button>
        );
    }
  };

  const renderGeneral = () => (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">{t('accountModal.tabs.general')}</p>
            <h4 className="mt-1 text-lg font-semibold text-white">{t('accountModal.generalTitle')}</h4>
            <p className="mt-1 text-sm text-white/50">{t('accountModal.generalSubtitle')}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${statusToneClass}`}>
            <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-accent-gold' : isPro ? 'bg-accent-cyan' : 'bg-accent-green'}`} />
            {statusLabel}
          </span>
        </div>

        <div className="mt-5 divide-y divide-white/8">
          <SettingRow label={t('accountModal.appearance')} description={t('accountModal.generalTitle')}>
            <SmallSelect value={prefDraft.theme || 'system'} onChange={(e) => setPrefDraft((p) => ({ ...p, theme: e.target.value }))}>
              <option value="system">{t('accountModal.themeSystem')}</option>
              <option value="light">{t('accountModal.themeLight')}</option>
              <option value="dark">{t('accountModal.themeDark')}</option>
            </SmallSelect>
          </SettingRow>
          <SettingRow label={t('accountModal.language')} description={t('accountModal.language')}>
            <SmallSelect value={prefDraft.language || 'tr'} onChange={(e) => setPrefDraft((p) => ({ ...p, language: e.target.value }))}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </SmallSelect>
          </SettingRow>
          <SettingRow label={t('accountModal.defaultDomain')} description={t('accountModal.defaultDomain')}>
            <SmallSelect value={prefDraft.default_domain_id || ''} onChange={(e) => setPrefDraft((p) => ({ ...p, default_domain_id: e.target.value }))}>
              <option value="">Seçiniz</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.domain}
                </option>
              ))}
            </SmallSelect>
          </SettingRow>
          <SettingRow label={t('accountModal.notificationSound')} description={t('accountModal.notificationSound')}>
            <div className="flex items-center gap-2">
              <SmallSelect value={prefDraft.notification_sound || 'chime'} onChange={(e) => setPrefDraft((p) => ({ ...p, notification_sound: e.target.value }))}>
                {notificationSounds.map((sound) => (
                  <option key={sound.id} value={sound.id}>
                    {sound.name}
                  </option>
                ))}
              </SmallSelect>
              <button type="button" onClick={() => onPreviewNotificationSound?.(prefDraft.notification_sound)} className={secondaryActionClass}>
                <Mail size={14} /> {t('accountModal.preview')}
              </button>
            </div>
          </SettingRow>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Adres" value={currentStats?.address_count || 0} icon={HardDrive} tone="blue" />
        <StatTile label="Mail" value={currentStats?.email_count || emailCount || 0} icon={Mail} tone="green" />
        <StatTile label="Favori domain" value={favoriteDomainCount} icon={Star} tone="gold" />
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            src={profilePhotoPreview}
            fallback={avatarInitial}
            sizeClass="h-24 w-24"
            error={avatarLoadError}
            onError={() => setAvatarLoadError(true)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{t('accountModal.profileTitle')}</p>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight text-white break-words">{displayName}</h4>
            <p className="mt-1 break-all text-sm text-white/55">@{username}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={statusToneClass}>
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
                <span className="h-2 w-2 rounded-full bg-accent-green" />
                {t('accountModal.active')}
              </span>
                {emailPending ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1.5 text-xs text-accent-blue">
                    <Clock3 size={12} /> {t('accountModal.pendingEmail')}
                  </span>
                ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-white/45">{t('accountModal.displayName')}</p>
              <input
                value={profileDraft.display_name}
                onChange={(e) => setProfileDraft((p) => ({ ...p, display_name: e.target.value }))}
                className={textInputClass}
                placeholder={t('accountModal.displayName')}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-white/45">{t('accountModal.username')}</p>
              <input
                value={profileDraft.username}
                onChange={(e) => setProfileDraft((p) => ({ ...p, username: e.target.value }))}
                className={textInputClass}
                placeholder={t('accountModal.username')}
                disabled={usernameLocked}
              />
              <p className="mt-2 text-[11px] text-white/40">
                {usernameLocked ? t('accountModal.usernameRight') : t('accountModal.quickStatus')}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{t('accountModal.email')}</p>
                <p className="mt-1 text-xs text-white/45">{emailChangeCooldownActive ? t('accountModal.emailChange') : t('accountModal.emailChange')}</p>
              </div>
              <span className="text-xs text-white/50">{emailPending || email}</span>
            </div>

            {emailStep === 'verify' ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  className={textInputClass}
                  placeholder={t('accountModal.quickStatus')}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEmailStep('edit')} className={secondaryActionClass}>
                    {t('accountModal.reset')}
                  </button>
                  <button type="button" onClick={confirmEmailChange} disabled={saving} className={primaryActionClass}>
                    <CheckCircle2 size={14} /> {t('accountModal.quickSave')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className={textInputClass}
                  placeholder={t('accountModal.email')}
                />
                <button type="button" onClick={requestEmailChange} disabled={saving} className={primaryActionClass}>
                  <Mail size={14} /> {t('accountModal.quickSave')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <label className={secondaryActionClass + ' cursor-pointer'}>
            <Upload size={14} /> {t('accountModal.profilePhoto')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onUploadAvatar?.(e.target.files?.[0] || null)}
            />
          </label>
          <button type="button" onClick={() => openProfileEditor('profil')} className={secondaryActionClass}>
            <Pencil size={14} /> {t('accountModal.reset')}
          </button>
          <button type="button" onClick={saveProfile} disabled={saving} className={primaryActionClass}>
            <Save size={14} /> {t('accountModal.profileSave')}
          </button>
        </div>
      </section>

      <aside className="space-y-3">
        <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-accent-green" />
          <p className="text-sm font-semibold text-white">{t('accountModal.quickStatus')}</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
              <span className="text-white/55">{t('accountModal.usernameRight')}</span>
              <span className="text-white">{usernameLocked ? 'Kullanıldı' : '1 kez kullanılabilir'}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
              <span className="text-white/55">{t('accountModal.emailChange')}</span>
              <span className="text-white">{emailChangeCooldownActive ? t('accountModal.emailChange') : t('accountModal.active')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5">
              <span className="text-white/55">{t('accountModal.pendingEmail')}</span>
              <span className="max-w-[170px] truncate text-white">{emailPending || '-'}</span>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">{t('accountModal.profileTitle')}</p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">{t('accountModal.tabsSubtitle.profile')}</span>
              <span className="text-white">{formatAdminDate(currentUser?.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">{t('accountModal.tabsSubtitle.sessions')}</span>
              <span className="text-white">{formatAdminDate(currentUser?.last_login)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/55">{t('accountModal.tabs.general')}</span>
              <span className="text-white">{`${currentPrefs?.theme || currentUser?.theme || 'system'} / ${currentPrefs?.language || currentUser?.language || 'tr'}`}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );

  const renderSecurity = () => (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-white">{t('accountModal.changePassword')}</p>
        </div>
        <p className="mt-1 text-sm text-white/50">{t('accountModal.changePassword')}</p>
        <div className="mt-4 space-y-3">
          <input
            type="password"
            placeholder={t('accountModal.currentPassword')}
            value={passwordDraft.currentPassword}
            onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))}
            className={textInputClass}
          />
          <input
            type="password"
            placeholder={t('accountModal.newPassword')}
            value={passwordDraft.newPassword}
            onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))}
            className={textInputClass}
          />
          <input
            type="password"
            placeholder={t('accountModal.newPasswordRepeat')}
            value={passwordDraft.confirmPassword}
            onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmPassword: e.target.value }))}
            className={textInputClass}
          />
          <button type="button" onClick={savePassword} disabled={saving} className={primaryActionClass + ' w-full'}>
            <Lock size={14} /> {t('accountModal.updatePassword')}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-accent-green" />
          <p className="text-sm font-semibold text-white">{t('accountModal.securityStatus')}</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm">
              <span className="text-white/55">{t('accountModal.usernameRight')}</span>
              <span className="text-white">{usernameLocked ? t('accountModal.locked') : t('accountModal.editable')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm">
              <span className="text-white/55">{t('accountModal.emailChange')}</span>
              <span className="text-white">{emailChangeCooldownActive ? t('accountModal.cooldownActive') : t('accountModal.ready')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm">
              <span className="text-white/55">{t('accountModal.pendingEmail')}</span>
              <span className="max-w-[200px] truncate text-white">{emailPending || '-'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">{t('accountModal.accountNote')}</p>
          <div className="mt-3 space-y-2 text-sm text-white/55">
              <p>• {t('accountModal.changePasswordNote')}</p>
            <p>• E-posta değişikliği doğrulama kodu gerektirir.</p>
              <p>• {t('accountModal.sessionsTitle')} sekmesinden girişleri kapatabilirsin.</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderPreferences = () => (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-white">Bildirim tercihleri</p>
        </div>
        <div className="mt-4 divide-y divide-white/8">
          <SettingRow label="Yeni mail bildirimi" description="Yeni mesaj geldiğinde bildirim ver.">
            <ToggleSwitch checked={!!prefDraft.notify_new_mail} onClick={() => setPrefDraft((p) => ({ ...p, notify_new_mail: p.notify_new_mail ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label={t('accountModal.otp')} description={t('accountModal.otpNotificationDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_otp} onClick={() => setPrefDraft((p) => ({ ...p, notify_otp: p.notify_otp ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label="Süresi dolan adresler" description="Kapanacak adresler için hatırlatma al.">
            <ToggleSwitch checked={!!prefDraft.notify_expiring} onClick={() => setPrefDraft((p) => ({ ...p, notify_expiring: p.notify_expiring ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label={t('accountModal.securityAlerts')} description={t('accountModal.securityAlertsDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_security} onClick={() => setPrefDraft((p) => ({ ...p, notify_security: p.notify_security ? 0 : 1 }))} />
          </SettingRow>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-accent-gold" />
            <p className="text-sm font-semibold text-white">Favori domainler</p>
          </div>
          <div className="mt-4 space-y-2">
            {domains.length > 0 ? domains.map((domain) => {
              const isFav = Array.isArray(center.favorite_domains) && center.favorite_domains.some((item) => item.id === domain.id);
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => toggleFavoriteDomain?.(domain.id, isFav)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    isFav
                      ? 'border-accent-gold/20 bg-accent-gold/10 text-accent-gold'
                      : 'border-white/8 bg-white/4 text-white/70 hover:border-white/15 hover:bg-white/6'
                  }`}
                >
                  <span className="min-w-0 truncate">{domain.domain}</span>
                  <Star size={14} />
                </button>
              );
            }) : (
              <div className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm text-white/45">
                Domain yok.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Saklama ve ses</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs text-white/45">Mail saklama süresi</p>
              <input
                type="number"
                min="1"
                max="365"
                value={prefDraft.mail_retention_days}
                onChange={(e) => setPrefDraft((p) => ({ ...p, mail_retention_days: e.target.value }))}
                className={textInputClass}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-white/45">Bildirim sesi</p>
              <div className="flex gap-2">
                <SmallSelect value={prefDraft.notification_sound || 'chime'} onChange={(e) => setPrefDraft((p) => ({ ...p, notification_sound: e.target.value }))} className="flex-1">
                  {notificationSounds.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.name}
                    </option>
                  ))}
                </SmallSelect>
                <button type="button" onClick={() => onPreviewNotificationSound?.(prefDraft.notification_sound)} className={secondaryActionClass}>
                  <Mail size={14} /> {t('accountModal.preview')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  const renderSessions = () => (
    <div className="space-y-4">
      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">{t('accountModal.sessionsTitle')}</p>
            <p className="mt-1 text-sm text-white/50">{t('accountModal.sessionsHint')}</p>
          </div>
          <button type="button" onClick={loadCenter} className={secondaryActionClass}>
            <RefreshCw size={14} /> {t('accountModal.refresh')}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {activeSessions.length > 0 ? activeSessions.map((session) => (
            <div key={session.id} className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {session.browser || 'Browser'} • {session.device || 'Desktop'}
                  </p>
                  <p className="mt-1 text-xs text-white/45 break-all">{session.ip || '-'}</p>
                  <p className="mt-1 text-xs text-white/45">
                    Son aktif: {formatAdminDate(session.last_seen_at || session.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {session.current ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1.5 text-xs text-accent-blue">
                      <CheckCircle2 size={12} /> Bu oturum
                    </span>
                  ) : null}
                  {session.is_suspicious ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-xs text-accent-red">
                      <AlertTriangle size={12} /> Şüpheli
                    </span>
                  ) : null}
                  {!session.current ? (
                    <button type="button" onClick={() => revokeSession(session)} className={secondaryActionClass}>
                      <X size={14} /> Kapat
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 text-sm text-white/45">
              {t('accountModal.noSessions')}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <History size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-white">Giriş geçmişi</p>
        </div>
        <div className="mt-4 space-y-2">
          {recentLogins.length > 0 ? recentLogins.map((row) => (
            <div key={row.id} className="rounded-[22px] border border-white/8 bg-black/18 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{formatAdminDate(row.created_at)}</p>
                  <p className="mt-1 text-xs text-white/45 break-all">
                    {row.ip || '-'} • {row.device || '-'} • {row.browser || '-'}
                  </p>
                </div>
                {row.success ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1.5 text-xs text-accent-green">
                    <CheckCircle2 size={12} /> Başarılı
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-xs text-accent-red">
                    <AlertTriangle size={12} /> Başarısız
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-5 text-sm text-white/45">
              Giriş geçmişi bulunmuyor.
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderUsage = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Adres limiti" value={`${currentStats?.address_count || 0}/${currentPkg?.max_addresses === 999 ? '∞' : currentPkg?.max_addresses || 3}`} icon={HardDrive} tone="blue" />
        <StatTile label="Mail sayısı" value={currentStats?.email_count || emailCount || 0} icon={Mail} tone="green" />
        <StatTile label="Favori adres" value={center.addresses.filter((a) => a.is_favorite).length} icon={Star} tone="gold" />
        <StatTile label={t('accountModal.sessionsTitle')} value={activeSessions.length} icon={History} tone="purple" />
      </div>

      <section className="rounded-[28px] border border-white/8 bg-white/[0.04] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">Plan</p>
            <h4 className="mt-1 text-lg font-semibold text-white">{currentPkg?.display_name || planName}</h4>
            <p className="mt-1 text-sm text-white/50">
              {isAdmin ? 'Admin yetkileri sınırsız görünür.' : 'Limitler paket bazlı gösterilir.'}
              {currencyLabel ? ` Faturalama birimi: ${currencyLabel}.` : ''}
            </p>
          </div>
          <span className={statusToneClass}>{isPro || isAdmin ? t('accountModal.active') : t('accountModal.upgradeable')}</span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan" style={{ width: `${usagePercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-white/45">{usagePercent}% adres kotası kullanıldı</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">Kullanılan domain</p>
            <p className="mt-2 text-2xl font-semibold text-white">{domains.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{t('account.address')}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{currentStats?.address_count || 0}</p>
          </div>
        </div>

        {!isPro && !isAdmin ? (
          <button type="button" onClick={onRequestPro} className={`${primaryActionClass} mt-5`}>
            <Crown size={14} /> Limit Yükselt
          </button>
        ) : null}
      </section>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab.id) {
      case 'profil':
        return renderProfile();
      case 'guvenlik':
        return renderSecurity();
      case 'tercihler':
        return renderPreferences();
      case 'oturumlar':
        return renderSessions();
      case 'kullanim':
        return renderUsage();
      default:
        return renderGeneral();
    }
  };

  return (
    <Modal show={show} onClose={onClose} compact size="3xl">
      <div className="account-settings-shell flex h-full min-h-0 flex-col overflow-hidden bg-brand-surface text-txt-primary lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-brand-border/25 bg-brand-surface2 p-4 lg:w-[285px] lg:border-b-0 lg:border-r">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:border-white/20 hover:bg-white/10"
              aria-label="Kapat"
            >
              <X size={16} />
            </button>
            <div className="min-w-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{t('accountModal.title')}</p>
              <p className="mt-1 text-sm text-white/55">{t('accountModal.subtitle')}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-white/8 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={profilePhotoPreview}
                fallback={avatarInitial}
                error={avatarLoadError}
                onError={() => setAvatarLoadError(true)}
              />
              <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">{t('accountModal.title')}</p>
                <p className="mt-1 truncate text-base font-semibold text-white">{displayName}</p>
                <p className="mt-1 truncate text-sm text-white/50">{email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={statusToneClass}>{statusLabel}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">
                <span className="h-2 w-2 rounded-full bg-accent-green" />
                {t('accountModal.active')}
              </span>
            </div>
          </div>

          <nav className="mt-4 space-y-1.5">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <SidebarNavButton
                  key={item.id}
                  active={activeTab.id === item.id}
                  icon={Icon}
                  label={item.label}
                  subtitle={item.subtitle}
                  onClick={() => setTab(item.id)}
                />
              );
            })}
          </nav>

          <div className="mt-4 rounded-[24px] border border-white/8 bg-black/20 p-4 text-xs leading-relaxed text-white/45">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/30">{t('accountModal.tipTitle')}</p>
            <p className="mt-2">
              {t('accountModal.tipBody')}
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/35">{activeTab.label}</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-white">{activeTab.label}</h3>
              <p className="mt-1 text-sm text-white/50">{activeTab.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">{renderActions()}</div>
          </div>

          <div className="min-h-0 flex-1 py-4">{renderTabContent()}</div>
        </section>
      </div>
    </Modal>
  );
}
