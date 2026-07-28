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
  Lock,
  Mail,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Star,
  Upload,
  User,
  X,
} from 'lucide-react';
import Modal from './Modal';
import { useLocale, LANGS } from '../i18n';
import { SidebarNavButton, SettingRow, SmallSelect, ToggleSwitch, StatTile, Avatar } from './ui';

// Display name for each language code, shown in its own language.
const LANGUAGE_LABELS = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  pt: 'Português',
};

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

// token-based (theme-flips light/dark)
const textInputClass =
  'w-full rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 px-4 py-3 text-sm text-txt-primary outline-none placeholder:text-txt-muted transition-colors focus:border-[rgb(var(--brand)/0.4)]';
const actionButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] px-4 py-2.5 text-sm font-medium transition-colors';
const primaryActionClass =
  `${actionButtonClass} bg-[rgb(var(--brand))] text-[rgb(var(--on-brand))] hover:bg-[rgb(var(--brand-hover))] disabled:cursor-not-allowed disabled:opacity-60`;
const secondaryActionClass =
  `${actionButtonClass} border border-brand-border bg-brand-surface2 text-txt-secondary hover:border-brand-border2 hover:text-txt-primary disabled:cursor-not-allowed disabled:opacity-60`;

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
  accent = 'indigo',
  onAccentChange,
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
            <Crown size={14} /> {t('accountModal.upgradeLimit')}
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
      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.tabs.general')}</p>
            <h4 className="mt-1 text-lg font-semibold text-txt-primary">{t('accountModal.generalTitle')}</h4>
            <p className="mt-1 text-sm text-txt-secondary">{t('accountModal.generalSubtitle')}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${statusToneClass}`}>
            <span className={`h-2 w-2 rounded-full ${isAdmin ? 'bg-accent-gold' : isPro ? 'bg-accent-cyan' : 'bg-accent-green'}`} />
            {statusLabel}
          </span>
        </div>

        <div className="mt-5 divide-y divide-brand-border/50">
          <SettingRow label={t('accountModal.appearance')} description={t('accountModal.generalTitle')}>
            <div className="flex flex-col gap-2.5">
              <SmallSelect value={prefDraft.theme || 'system'} onChange={(e) => setPrefDraft((p) => ({ ...p, theme: e.target.value }))}>
                <option value="system">{t('accountModal.themeSystem')}</option>
                <option value="light">{t('accountModal.themeLight')}</option>
                <option value="dark">{t('accountModal.themeDark')}</option>
              </SmallSelect>
              {/* 10 Accent colors swatch picker */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--r-md)] border border-brand-border bg-brand-bg-subtle" role="radiogroup" aria-label="Accent color">
                {[
                  { id: 'indigo',  color: 'rgb(99 102 241)' },
                  { id: 'violet',  color: 'rgb(139 92 246)' },
                  { id: 'blue',    color: 'rgb(59 130 246)' },
                  { id: 'emerald', color: 'rgb(16 185 129)' },
                  { id: 'teal',    color: 'rgb(20 184 166)' },
                  { id: 'amber',   color: 'rgb(245 158 11)' },
                  { id: 'rose',    color: 'rgb(244 63 94)' },
                  { id: 'orange',  color: 'rgb(249 115 22)' },
                  { id: 'cyan',    color: 'rgb(6 182 212)' },
                  { id: 'fuchsia', color: 'rgb(217 70 239)' },
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={accent === a.id}
                    onClick={() => onAccentChange?.(a.id)}
                    className={`w-4 h-4 rounded-full transition-transform hover:scale-110 ${accent === a.id ? 'ring-2 ring-offset-1 ring-offset-brand-surface ring-[rgb(var(--brand))]' : ''}`}
                    style={{ backgroundColor: a.color }}
                  />
                ))}
              </div>
            </div>
          </SettingRow>
          <SettingRow label={t('accountModal.language')} description={t('accountModal.language')}>
            <SmallSelect value={prefDraft.language || 'tr'} onChange={(e) => setPrefDraft((p) => ({ ...p, language: e.target.value }))}>
              {LANGS.map((code) => (
                <option key={code} value={code}>{LANGUAGE_LABELS[code] || code}</option>
              ))}
            </SmallSelect>
          </SettingRow>
          <SettingRow label={t('accountModal.defaultDomain')} description={t('accountModal.defaultDomain')}>
            <SmallSelect value={prefDraft.default_domain_id || ''} onChange={(e) => setPrefDraft((p) => ({ ...p, default_domain_id: e.target.value }))}>
              <option value="">{t('accountModal.selectOption')}</option>
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
        <StatTile label={t('accountModal.statAddress')} value={currentStats?.address_count || 0} icon={HardDrive} tone="blue" />
        <StatTile label={t('accountModal.statMail')} value={currentStats?.email_count || emailCount || 0} icon={Mail} tone="green" />
        <StatTile label={t('accountModal.statFavoriteDomain')} value={favoriteDomainCount} icon={Star} tone="gold" />
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar
            src={profilePhotoPreview}
            fallback={avatarInitial}
            sizeClass="h-24 w-24"
            error={avatarLoadError}
            onError={() => setAvatarLoadError(true)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.profileTitle')}</p>
            <h4 className="mt-1 text-2xl font-semibold tracking-tight text-txt-primary break-words">{displayName}</h4>
            <p className="mt-1 break-all text-sm text-txt-secondary">@{username}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={statusToneClass}>
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface2 px-3 py-1.5 text-xs text-txt-secondary">
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
              <p className="mb-2 text-xs text-txt-muted">{t('accountModal.displayName')}</p>
              <input
                value={profileDraft.display_name}
                onChange={(e) => setProfileDraft((p) => ({ ...p, display_name: e.target.value }))}
                className={textInputClass}
                placeholder={t('accountModal.displayName')}
              />
            </div>
            <div>
              <p className="mb-2 text-xs text-txt-muted">{t('accountModal.username')}</p>
              <input
                value={profileDraft.username}
                onChange={(e) => setProfileDraft((p) => ({ ...p, username: e.target.value }))}
                className={textInputClass}
                placeholder={t('accountModal.username')}
                disabled={usernameLocked}
              />
              <p className="mt-2 text-[11px] text-txt-muted">
                {usernameLocked ? t('accountModal.usernameRight') : t('accountModal.quickStatus')}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-txt-primary">{t('accountModal.email')}</p>
                <p className="mt-1 text-xs text-txt-muted">{t('accountModal.emailChange')}</p>
              </div>
              <span className="text-xs text-txt-secondary">{emailPending || email}</span>
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
        <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-accent-green" />
          <p className="text-sm font-semibold text-txt-primary">{t('accountModal.quickStatus')}</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5">
              <span className="text-txt-secondary">{t('accountModal.usernameRight')}</span>
              <span className="text-txt-primary">{usernameLocked ? t('accountModal.used') : t('accountModal.usernameOnce')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5">
              <span className="text-txt-secondary">{t('accountModal.emailChange')}</span>
              <span className="text-txt-primary">{emailChangeCooldownActive ? t('accountModal.emailChange') : t('accountModal.active')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5">
              <span className="text-txt-secondary">{t('accountModal.pendingEmail')}</span>
              <span className="max-w-[170px] truncate text-txt-primary">{emailPending || '-'}</span>
            </div>
          </div>
        </section>

        <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.profileTitle')}</p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-txt-secondary">{t('accountModal.tabsSubtitle.profile')}</span>
              <span className="text-txt-primary">{formatAdminDate(currentUser?.created_at)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-txt-secondary">{t('accountModal.tabsSubtitle.sessions')}</span>
              <span className="text-txt-primary">{formatAdminDate(currentUser?.last_login)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-txt-secondary">{t('accountModal.tabs.general')}</span>
              <span className="text-txt-primary">{`${currentPrefs?.theme || currentUser?.theme || 'system'} / ${currentPrefs?.language || currentUser?.language || 'tr'}`}</span>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );

  const renderSecurity = () => (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <KeyRound size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-txt-primary">{t('accountModal.changePassword')}</p>
        </div>
        <p className="mt-1 text-sm text-txt-secondary">{t('accountModal.changePassword')}</p>
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
        <div className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-accent-green" />
          <p className="text-sm font-semibold text-txt-primary">{t('accountModal.securityStatus')}</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5 text-sm">
              <span className="text-txt-secondary">{t('accountModal.usernameRight')}</span>
              <span className="text-txt-primary">{usernameLocked ? t('accountModal.locked') : t('accountModal.editable')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5 text-sm">
              <span className="text-txt-secondary">{t('accountModal.emailChange')}</span>
              <span className="text-txt-primary">{emailChangeCooldownActive ? t('accountModal.cooldownActive') : t('accountModal.ready')}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-2.5 text-sm">
              <span className="text-txt-secondary">{t('accountModal.pendingEmail')}</span>
              <span className="max-w-[200px] truncate text-txt-primary">{emailPending || '-'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.accountNote')}</p>
          <div className="mt-3 space-y-2 text-sm text-txt-secondary">
              <p>• {t('accountModal.changePasswordNote')}</p>
            <p>• {t('accountModal.emailVerifyNote')}</p>
              <p>• {t('accountModal.sessionsTitle')} {t('accountModal.sessionsCloseNote')}</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderPreferences = () => (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-txt-primary">{t('accountModal.notificationPrefs')}</p>
        </div>
        <div className="mt-4 divide-y divide-brand-border/50">
          <SettingRow label={t('accountModal.newMail')} description={t('accountModal.newMailDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_new_mail} onClick={() => setPrefDraft((p) => ({ ...p, notify_new_mail: p.notify_new_mail ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label={t('accountModal.otp')} description={t('accountModal.otpNotificationDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_otp} onClick={() => setPrefDraft((p) => ({ ...p, notify_otp: p.notify_otp ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label={t('accountModal.expiring')} description={t('accountModal.expiringDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_expiring} onClick={() => setPrefDraft((p) => ({ ...p, notify_expiring: p.notify_expiring ? 0 : 1 }))} />
          </SettingRow>
          <SettingRow label={t('accountModal.securityAlerts')} description={t('accountModal.securityAlertsDesc')}>
            <ToggleSwitch checked={!!prefDraft.notify_security} onClick={() => setPrefDraft((p) => ({ ...p, notify_security: p.notify_security ? 0 : 1 }))} />
          </SettingRow>
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-accent-gold" />
            <p className="text-sm font-semibold text-txt-primary">{t('accountModal.favoriteDomains')}</p>
          </div>
          <div className="mt-4 space-y-2">
            {domains.length > 0 ? domains.map((domain) => {
              const isFav = Array.isArray(center.favorite_domains) && center.favorite_domains.some((item) => item.id === domain.id);
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => toggleFavoriteDomain?.(domain.id, isFav)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[var(--r-md)] border px-3 py-2.5 text-left text-sm transition-colors ${
                    isFav
                      ? 'border-accent-gold/20 bg-accent-gold/10 text-accent-gold'
                      : 'border-brand-border bg-brand-surface text-txt-secondary hover:border-brand-border2 hover:text-txt-primary'
                  }`}
                >
                  <span className="min-w-0 truncate">{domain.domain}</span>
                  <Star size={14} />
                </button>
              );
            }) : (
              <div className="rounded-[var(--r-md)] border border-brand-border bg-brand-surface p-4 text-sm text-txt-muted">
                {t('accountModal.noDomains')}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.retentionAndSound')}</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 text-xs text-txt-muted">{t('accountModal.mailRetention')}</p>
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
              <p className="mb-2 text-xs text-txt-muted">{t('accountModal.notificationSound')}</p>
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
      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.sessionsTitle')}</p>
            <p className="mt-1 text-sm text-txt-secondary">{t('accountModal.sessionsHint')}</p>
          </div>
          <button type="button" onClick={loadCenter} className={secondaryActionClass}>
            <RefreshCw size={14} /> {t('accountModal.refresh')}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {activeSessions.length > 0 ? activeSessions.map((session) => (
            <div key={session.id} className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary">
                    {session.browser || 'Browser'} • {session.device || 'Desktop'}
                  </p>
                  <p className="mt-1 text-xs text-txt-muted break-all">{session.ip || '-'}</p>
                  <p className="mt-1 text-xs text-txt-muted">
                    {t('accountModal.lastActive')}: {formatAdminDate(session.last_seen_at || session.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {session.current ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1.5 text-xs text-accent-blue">
                      <CheckCircle2 size={12} /> {t('accountModal.currentSession')}
                    </span>
                  ) : null}
                  {session.is_suspicious ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-xs text-accent-red">
                      <AlertTriangle size={12} /> {t('accountModal.suspicious')}
                    </span>
                  ) : null}
                  {!session.current ? (
                    <button type="button" onClick={() => revokeSession(session)} className={secondaryActionClass}>
                      <X size={14} /> {t('accountModal.close')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )) : (
            <div className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 p-5 text-sm text-txt-muted">
              {t('accountModal.noSessions')}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <History size={15} className="text-accent-blue" />
          <p className="text-sm font-semibold text-txt-primary">{t('accountModal.loginHistory')}</p>
        </div>
        <div className="mt-4 space-y-2">
          {recentLogins.length > 0 ? recentLogins.map((row) => (
            <div key={row.id} className="rounded-[var(--r-md)] border border-brand-border bg-brand-surface px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary">{formatAdminDate(row.created_at)}</p>
                  <p className="mt-1 text-xs text-txt-muted break-all">
                    {row.ip || '-'} • {row.device || '-'} • {row.browser || '-'}
                  </p>
                </div>
                {row.success ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/20 bg-accent-green/10 px-3 py-1.5 text-xs text-accent-green">
                    <CheckCircle2 size={12} /> {t('accountModal.loginSuccess')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent-red/20 bg-accent-red/10 px-3 py-1.5 text-xs text-accent-red">
                    <AlertTriangle size={12} /> {t('accountModal.loginFail')}
                  </span>
                )}
              </div>
            </div>
          )) : (
            <div className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface2 p-5 text-sm text-txt-muted">
              {t('accountModal.noLoginHistory')}
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderUsage = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('accountModal.addressLimit')} value={`${currentStats?.address_count || 0}/${currentPkg?.max_addresses === 999 ? '∞' : currentPkg?.max_addresses || 3}`} icon={HardDrive} tone="blue" />
        <StatTile label={t('accountModal.mailCount')} value={currentStats?.email_count || emailCount || 0} icon={Mail} tone="green" />
        <StatTile label={t('accountModal.favoriteAddress')} value={center.addresses.filter((a) => a.is_favorite).length} icon={Star} tone="gold" />
        <StatTile label={t('accountModal.sessionsTitle')} value={activeSessions.length} icon={History} tone="purple" />
      </div>

      <section className="rounded-[var(--r-xl)] border border-brand-border bg-brand-surface2 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.planTitle')}</p>
            <h4 className="mt-1 text-lg font-semibold text-txt-primary">{currentPkg?.display_name || planName}</h4>
            <p className="mt-1 text-sm text-txt-secondary">
              {isAdmin ? t('accountModal.adminUnlimited') : t('accountModal.packageLimits')}
              {currencyLabel ? ` ${t('accountModal.billingUnit')}: ${currencyLabel}.` : ''}
            </p>
          </div>
          <span className={statusToneClass}>{isPro || isAdmin ? t('accountModal.active') : t('accountModal.upgradeable')}</span>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-brand-surface">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan" style={{ width: `${usagePercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-txt-muted">{usagePercent}% {t('accountModal.quotaUsed')}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">{t('accountModal.usedDomain')}</p>
            <p className="mt-2 text-2xl font-semibold text-txt-primary">{domains.length}</p>
          </div>
          <div className="rounded-[var(--r-lg)] border border-brand-border bg-brand-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">{t('account.address')}</p>
            <p className="mt-2 text-2xl font-semibold text-txt-primary">{currentStats?.address_count || 0}</p>
          </div>
        </div>

        {!isPro && !isAdmin ? (
          <button type="button" onClick={onRequestPro} className={`${primaryActionClass} mt-5`}>
            <Crown size={14} /> {t('accountModal.upgradeLimit')}
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--r-md)] border border-brand-border bg-brand-surface text-txt-secondary transition-colors hover:border-brand-border2 hover:text-txt-primary"
              aria-label={t('accountModal.close')}
            >
              <X size={16} />
            </button>
            <div className="min-w-0 text-right">
              <p className="text-[10px] uppercase tracking-[0.28em] text-txt-muted">{t('accountModal.title')}</p>
              <p className="mt-1 text-sm text-txt-secondary">{t('accountModal.subtitle')}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[var(--r-xl)] border border-brand-border bg-brand-surface p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={profilePhotoPreview}
                fallback={avatarInitial}
                error={avatarLoadError}
                onError={() => setAvatarLoadError(true)}
              />
              <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.title')}</p>
                <p className="mt-1 truncate text-base font-semibold text-txt-primary">{displayName}</p>
                <p className="mt-1 truncate text-sm text-txt-secondary">{email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={statusToneClass}>{statusLabel}</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface2 px-3 py-1.5 text-xs text-txt-secondary">
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

          <div className="mt-4 rounded-[var(--r-lg)] border border-brand-border bg-brand-surface p-4 text-xs leading-relaxed text-txt-muted">
            <p className="text-[10px] uppercase tracking-[0.24em] text-txt-muted">{t('accountModal.tipTitle')}</p>
            <p className="mt-2">
              {t('accountModal.tipBody')}
            </p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-brand-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-txt-muted">{activeTab.label}</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-txt-primary">{activeTab.label}</h3>
              <p className="mt-1 text-sm text-txt-secondary">{activeTab.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">{renderActions()}</div>
          </div>

          <div className="min-h-0 flex-1 py-4"><div key={activeTab.id} className="animate-fade-in">{renderTabContent()}</div></div>
        </section>
      </div>
    </Modal>
  );
}
