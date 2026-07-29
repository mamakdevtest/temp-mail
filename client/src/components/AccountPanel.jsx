import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import {
  User,
  Crown,
  Globe,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  ChevronDown,
  Zap,
  Mail,
  Pencil,
  HardDrive,
  Bell,
  BellOff,
  KeyRound,
  Clock3,
  Star,
  Upload,
  RefreshCw,
  Trash2,
  Save,
  Moon,
  Sun,
  Monitor,
  Languages,
  Lock,
  FolderLock,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CalendarRange,
} from 'lucide-react';
import { AdminPanelCard, AdminStatCard, AdminEmptyState, AdminInfoRow } from './admin/AdminPrimitives';
import { formatAdminDate, formatRetention } from './admin/adminUtils';
import AccountEditorModal from './AccountEditorModal';
import { useLocale } from '../i18n';
import { unwrapEnvelope } from '../utils/apiFetch';

function buildAddressDrafts(addresses = []) {
  return addresses.reduce((acc, addr) => {
    acc[addr.id] = {
      nickname: addr.nickname || '',
      note: addr.note || '',
      is_favorite: !!addr.is_favorite,
      is_locked: !!addr.is_locked,
      locked_until: addr.locked_until || '',
      custom_retention_days: addr.custom_retention_days || '',
    };
    return acc;
  }, {});
}

const AccountPanel = forwardRef(function AccountPanel({
  auth,
  api = '/api',
  token,
  user,
  pkg,
  stats,
  activeDomain,
  emailCount = 0,
  history = [],
  isGuest,
  isPro,
  isAdmin,
  domains = [],
  notificationSound = 'chime',
  notificationSounds = [],
  onNotificationSoundChange,
  onPreviewNotificationSound,
  accent = 'indigo',
  onAccentChange,
  onRequestPro,
  onLogout,
  onAdmin,
  onLogin,
  onRegister,
}, ref) {
  const { t } = useLocale();
  const authToken = auth?.token || token || null;
  const currentUser = auth?.user || user;
  const currentPkg = auth?.pkg || pkg;
  const currentStats = auth?.stats || stats;
  const currentPrefs = auth?.preferences || null;

  const [tab, setTab] = useState('profile');
  const [center, setCenter] = useState({
    sessions: [],
    history: [],
    favorite_domains: [],
    addresses: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showRecentHistory, setShowRecentHistory] = useState(false);
  const [showPasswordedHistory, setShowPasswordedHistory] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const [profileDraft, setProfileDraft] = useState({
    username: currentUser?.username || '',
    display_name: currentUser?.display_name || currentUser?.username || '',
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(currentUser?.avatar_url || '');
  const [emailDraft, setEmailDraft] = useState(currentUser?.email || '');
  const [emailCode, setEmailCode] = useState('');
  const [emailStep, setEmailStep] = useState('edit');
  const [emailPending, setEmailPending] = useState(currentUser?.pending_email || '');
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [prefDraft, setPrefDraft] = useState({
    theme: currentPrefs?.theme || currentUser?.theme || 'system',
    language: currentPrefs?.language || currentUser?.language || 'tr',
    default_domain_id: currentPrefs?.default_domain_id || currentUser?.default_domain_id || '',
    mail_retention_days: currentPrefs?.mail_retention_days || 7,
    notify_new_mail: currentPrefs?.notify_new_mail ?? 1,
    notify_otp: currentPrefs?.notify_otp ?? 1,
    notify_expiring: currentPrefs?.notify_expiring ?? 1,
    notify_security: currentPrefs?.notify_security ?? 1,
    notification_sound: currentPrefs?.notification_sound || notificationSound || 'chime',
  });
  const [addressDrafts, setAddressDrafts] = useState({});

  const authHeaders = useMemo(() => {
    if (!authToken) return {};
    return { Authorization: `Bearer ${authToken}` };
  }, [authToken]);

  const request = async (path, options = {}) => {
    const res = await fetch(`${api}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.json === false ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders,
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let data = {};
    if (text) {
      try {
        data = unwrapEnvelope(JSON.parse(text));
      } catch (e) {
        data = { message: text };
      }
    }

    if (res.status === 401) {
      throw new Error(t('errors.sessionExpired'));
    }
    if (!res.ok) {
      throw new Error(data.error || data.message || t('errors.actionFailed'));
    }
    return data;
  };

  const flash = (text, type = 'success') => {
    if (type === 'error') {
      setError(text);
      setMessage('');
    } else {
      setMessage(text);
      setError('');
    }
    window.clearTimeout(window.__tmAccountFlashTimer);
    window.__tmAccountFlashTimer = window.setTimeout(() => {
      setError('');
      setMessage('');
    }, 3500);
  };

  const loadCenter = async () => {
    if (isGuest || !authToken) return;
    setLoading(true);
    setError('');
    try {
      const [me, sessions, history] = await Promise.all([
        request('/auth/me'),
        request('/auth/sessions'),
        request('/auth/login-history'),
      ]);
      setCenter({
        sessions: sessions.sessions || [],
        history: history.history || [],
        favorite_domains: me.favorite_domains || [],
        addresses: me.addresses || [],
      });
      setPrefDraft({
        theme: me.preferences?.theme || me.user?.theme || 'system',
        language: me.preferences?.language || me.user?.language || 'tr',
        default_domain_id: me.preferences?.default_domain_id || me.user?.default_domain_id || '',
        mail_retention_days: me.preferences?.mail_retention_days || 7,
        notify_new_mail: me.preferences?.notify_new_mail ?? 1,
        notify_otp: me.preferences?.notify_otp ?? 1,
        notify_expiring: me.preferences?.notify_expiring ?? 1,
        notify_security: me.preferences?.notify_security ?? 1,
        notification_sound: me.preferences?.notification_sound || notificationSound || 'chime',
      });
      setAddressDrafts(buildAddressDrafts(me.addresses || []));
      setProfileDraft({
        username: me.user?.username || '',
        display_name: me.user?.display_name || me.user?.username || '',
      });
      setProfilePhotoPreview(me.user?.avatar_url || '');
      setEmailDraft(me.user?.email || '');
      setEmailPending(me.user?.pending_email || '');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGuest && authToken) {
      loadCenter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, isGuest]);

  useEffect(() => {
    setProfileDraft({
      username: currentUser?.username || '',
      display_name: currentUser?.display_name || currentUser?.username || '',
    });
    setProfilePhotoPreview(currentUser?.avatar_url || '');
    setAvatarLoadError(false);
    setEmailDraft(currentUser?.email || '');
    setEmailPending(currentUser?.pending_email || '');
  }, [currentUser?.username, currentUser?.display_name, currentUser?.avatar_url, currentUser?.email, currentUser?.pending_email]);

  useEffect(() => {
    setPrefDraft((prev) => ({
      ...prev,
      theme: currentPrefs?.theme || currentUser?.theme || prev.theme,
      language: currentPrefs?.language || currentUser?.language || prev.language,
      default_domain_id: currentPrefs?.default_domain_id || currentUser?.default_domain_id || prev.default_domain_id,
      notification_sound: currentPrefs?.notification_sound || prev.notification_sound,
    }));
  }, [currentPrefs, currentUser?.theme, currentUser?.language, currentUser?.default_domain_id]);

  useEffect(() => {
    setAddressDrafts(buildAddressDrafts(center.addresses));
  }, [center.addresses]);

  const usernameLocked = Number(currentUser?.username_change_count || 0) >= 1;
  const emailChangeCooldownActive = useMemo(() => {
    if (!currentUser?.email_change_cooldown_until) return false;
    const parsed = new Date(String(currentUser.email_change_cooldown_until).replace(' ', 'T') + 'Z');
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() > Date.now() : true;
  }, [currentUser?.email_change_cooldown_until]);

  const openProfileEditor = (nextTab = 'genel') => {
    setTab(nextTab);
    setProfileDraft({
      username: currentUser?.username || '',
      display_name: currentUser?.display_name || currentUser?.username || '',
    });
    setProfilePhotoPreview(currentUser?.avatar_url || '');
    setEmailDraft(currentUser?.email || '');
    setEmailCode('');
    setEmailStep(currentUser?.pending_email ? 'verify' : 'edit');
    setEmailPending(currentUser?.pending_email || '');
    setShowProfileEditor(true);
  };

  useImperativeHandle(ref, () => ({
    openSettings: () => openProfileEditor('genel'),
  }));

  const closeProfileEditor = () => {
    setShowProfileEditor(false);
    setEmailCode('');
    setEmailStep(currentUser?.pending_email ? 'verify' : 'edit');
    setEmailPending(currentUser?.pending_email || '');
  };

  const saveProfile = async () => {
    const nextUsername = profileDraft.username.trim().toLowerCase();
    const nextDisplay = profileDraft.display_name.trim();
    if (!nextUsername) {
      flash(t('account.flashUsernameRequired'), 'error');
      return;
    }
    if (usernameLocked && nextUsername !== String(currentUser?.username || '').toLowerCase()) {
      flash(t('account.flashUsernameLocked'), 'error');
      return;
    }
    setSaving(true);
    try {
      if (auth?.updateProfile) {
        await auth.updateProfile({ username: nextUsername, display_name: nextDisplay });
      } else {
        await request('/auth/me', {
          method: 'PUT',
          body: { username: nextUsername, display_name: nextDisplay },
        });
      }
      await loadCenter();
      flash(t('account.flashProfileUpdated'));
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestEmailChange = async () => {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail) {
      flash(t('account.flashEmailRequired'), 'error');
      return;
    }
    if (nextEmail === String(currentUser?.email || '').toLowerCase()) {
      flash(t('account.flashEmailUnchanged'), 'error');
      return;
    }
    setSaving(true);
    try {
      const result = auth?.requestEmailChange
        ? await auth.requestEmailChange(nextEmail)
        : await request('/auth/request-email-change', {
            method: 'POST',
            body: { email: nextEmail },
          });
      setEmailPending(result.pending_email || nextEmail);
      setEmailStep('verify');
      setEmailCode(result.email_sent ? '' : (result.verification_code || ''));
      flash(result.message || t('account.flashCodeReady'));
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmEmailChange = async () => {
    const code = emailCode.trim();
    if (!code) {
      flash(t('account.flashCodeRequired'), 'error');
      return;
    }
    setSaving(true);
    try {
      const result = auth?.confirmEmailChange
        ? await auth.confirmEmailChange(code)
        : await request('/auth/confirm-email-change', {
            method: 'POST',
            body: { code },
          });
      setEmailStep('edit');
      setEmailCode('');
      setEmailPending('');
      await loadCenter();
      flash(result.message || t('account.flashEmailUpdated'));
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setSaving(true);
        if (auth?.uploadAvatar) {
          await auth.uploadAvatar(String(reader.result));
        } else {
          await request('/auth/profile-photo', {
            method: 'PUT',
            body: { avatarDataUrl: String(reader.result) },
          });
        }
        await loadCenter();
        flash(t('account.flashAvatarUpdated'));
      } catch (e) {
        flash(e.message, 'error');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const savePassword = async () => {
    if (!passwordDraft.currentPassword || !passwordDraft.newPassword) {
      flash(t('account.flashPasswordFields'), 'error');
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      flash(t('account.flashPasswordMismatch'), 'error');
      return;
    }
    setSaving(true);
    try {
      if (auth?.changePassword) {
        await auth.changePassword({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        });
      } else {
        await request('/auth/change-password', {
          method: 'POST',
          body: {
            currentPassword: passwordDraft.currentPassword,
            newPassword: passwordDraft.newPassword,
          },
        });
      }
      setPasswordDraft({ currentPassword: '', newPassword: '', confirmPassword: '' });
      flash(t('account.flashPasswordChanged'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const payload = {
        theme: prefDraft.theme,
        language: prefDraft.language,
        default_domain_id: prefDraft.default_domain_id || null,
        mail_retention_days: prefDraft.mail_retention_days,
        notify_new_mail: !!prefDraft.notify_new_mail,
        notify_otp: !!prefDraft.notify_otp,
        notify_expiring: !!prefDraft.notify_expiring,
        notify_security: !!prefDraft.notify_security,
        notification_sound: prefDraft.notification_sound,
      };
      if (auth?.updatePreferences) {
        await auth.updatePreferences(payload);
      } else {
        await request('/auth/preferences', { method: 'PUT', body: payload });
      }
      onNotificationSoundChange?.(prefDraft.notification_sound);
      flash(t('account.flashPrefsUpdated'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (addr) => {
    const draft = addressDrafts[addr.id] || {};
    setSaving(true);
    try {
      await request(`/auth/addresses/${addr.id}`, {
        method: 'PUT',
        body: {
          nickname: draft.nickname,
          note: draft.note,
          is_favorite: !!draft.is_favorite,
          is_locked: !!draft.is_locked,
          locked_until: draft.locked_until || '',
          custom_retention_days: draft.custom_retention_days || '',
        },
      });
      flash(t('account.flashAddressUpdated'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const renewAddress = async (addr) => {
    setSaving(true);
    try {
      await request(`/auth/addresses/${addr.id}/renew`, { method: 'POST' });
      flash(t('account.flashAddressRenewed'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addr) => {
    if (!confirm(t('account.confirmDeleteAddress', { address: addr.address }))) return;
    setSaving(true);
    try {
      await request(`/auth/addresses/${addr.id}`, { method: 'DELETE', json: false });
      flash(t('account.flashAddressDeleted'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (session) => {
    if (!confirm(t('account.confirmRevokeSession'))) return;
    setSaving(true);
    try {
      await request(`/auth/sessions/${session.id}`, { method: 'DELETE', json: false });
      flash(t('account.flashSessionRevoked'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleFavoriteDomain = async (domainId, isFavorite) => {
    setSaving(true);
    try {
      await request(`/auth/favorite-domains/${domainId}`, {
        method: isFavorite ? 'DELETE' : 'POST',
        json: false,
      });
      flash(isFavorite ? t('account.flashFavRemoved') : t('account.flashFavAdded'));
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const planName = currentPkg?.display_name || (isAdmin ? 'Admin' : isPro ? 'Pro' : 'Free');
  const usagePercent = Math.min(Math.round(((currentStats?.address_count || 0) / (currentPkg?.max_addresses || 3)) * 100), 100);
  const avatarInitial = (profileDraft.display_name || profileDraft.username || currentUser?.username || 'M')[0].toUpperCase();
  const activeDomainLabel = activeDomain || domains[0]?.domain || '-';
  const recentHistory = Array.isArray(history) ? history.slice(0, 3) : [];
  const passwordedHistory = Array.isArray(history) ? history.filter((item) => item.has_password) : [];

  if (isGuest) {
    return (
      <div className="account-summary-panel card p-4 sm:p-5 h-full min-h-[430px] xl:min-h-[590px] flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-txt-primary">{t('account.title')}</p>
            <p className="text-[11px] text-txt-muted">{t('account.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onLogin} className="btn-secondary text-xs px-3 py-2">{t('app.signIn')}</button>
            <button type="button" onClick={onRegister} className="btn-primary text-xs px-3 py-2">{t('app.signUp')}</button>
          </div>
        </div>

        <div className="panel-soft p-4 rounded-2xl border-brand-border/55 space-y-4">
          <div className="flex items-center gap-3">
            <div className="keep-white-ink w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white text-xl font-semibold shadow-glow-blue bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">{t('account.accountArea')}</p>
              <p className="text-lg font-semibold tracking-tight text-txt-primary leading-tight break-words mt-1">{t('account.guestTitle')}</p>
              <p className="text-sm text-txt-muted mt-1 leading-relaxed">{t('account.guestDescription')}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="badge-green">{t('account.ready')}</span>
                <span className="badge-blue">{planName}</span>
              </div>
            </div>
            <div className="hidden sm:flex shrink-0 flex-col items-center rounded-[var(--r-xl)] border border-brand-border/20 bg-brand-surface2/25 p-3 animate-fade-in">
              <div
                className="relative h-24 w-24 rounded-full"
                style={{
                  background: `conic-gradient(rgb(var(--accent-cyan)) 0 ${usagePercent}%, rgb(var(--brand-border) / 0.24) ${usagePercent}% 100%)`,
                }}
              >
                <div className="absolute inset-3 rounded-full border border-brand-border/20 bg-brand-surface flex flex-col items-center justify-center text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-[18px] font-semibold tracking-tight text-txt-primary">{usagePercent}%</p>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-txt-muted">{t('account.usage')}</p>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-txt-muted text-center">{currentStats?.address_count || 0}/{currentPkg?.max_addresses || 3}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 stagger-in">
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.address')}</p>
              <p className="text-xl font-semibold text-txt-primary mt-1">{currentStats?.address_count || 0}</p>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.mail')}</p>
              <p className="text-xl font-semibold text-txt-primary mt-1">{currentStats?.email_count || 0}</p>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.plan')}</p>
              <p className="text-sm font-semibold text-txt-primary mt-1">{planName}</p>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.domain')}</p>
              <p className="text-sm font-semibold text-txt-primary mt-1 truncate">{activeDomainLabel}</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-brand-surface2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>

        <div className="panel-soft p-4 rounded-2xl border-brand-border/55">
          <button
            type="button"
            onClick={() => setShowRecentHistory((v) => !v)}
            aria-expanded={showRecentHistory}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{t('account.recentUsed')}</p>
              <p className="text-[11px] text-txt-muted mt-1">{t('account.recentUsedHint')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {recentHistory.length > 0 ? <span className="badge-blue text-[9px]">{recentHistory.length}</span> : null}
              <ChevronDown size={14} className={`text-txt-muted transition-transform ${showRecentHistory ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showRecentHistory ? (
            <div className="mt-3 space-y-2 animate-slide-down">
              {recentHistory.length > 0 ? recentHistory.map((item) => (
                <div key={item.address} className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-txt-primary truncate">{item.address}</p>
                    <p className="text-[10px] text-txt-muted mt-0.5">{item.has_password ? t('addressBar.passwordedBadge') : t('account.open')} • {new Date(item.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-green shrink-0" />
                </div>
              )) : (
                <p className="text-sm text-txt-muted">{t('account.noHistory')}</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="panel-soft p-4 rounded-2xl border-brand-border/55">
          <button
            type="button"
            onClick={() => setShowPasswordedHistory((v) => !v)}
            aria-expanded={showPasswordedHistory}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{t('account.passwordedList')}</p>
              <p className="text-[11px] text-txt-muted mt-1">{t('account.passwordedListHint')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {passwordedHistory.length > 0 ? <span className="badge-purple text-[9px]">{passwordedHistory.length}</span> : null}
              <ChevronDown size={14} className={`text-txt-muted transition-transform ${showPasswordedHistory ? 'rotate-180' : ''}`} />
            </div>
          </button>
          {showPasswordedHistory ? (
            <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1 animate-slide-down">
              {passwordedHistory.length > 0 ? passwordedHistory.map((item) => (
                <div key={item.address} className="rounded-2xl border border-accent-purple/15 bg-accent-purple/5 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-txt-primary truncate">{item.address}</p>
                    <p className="text-[10px] text-txt-muted mt-0.5">{new Date(item.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Lock size={12} className="text-accent-purple shrink-0" />
                </div>
              )) : (
                <p className="text-sm text-txt-muted">{t('account.noPassworded')}</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="account-summary-panel card p-4 sm:p-5 h-full min-h-[430px] xl:min-h-[590px] flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-txt-primary">{t('account.title')}</p>
          <p className="text-[11px] text-txt-muted">{t('account.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => openProfileEditor('genel')} className="btn-secondary text-xs px-3 py-2">
            <Pencil size={12} /> {t('account.settings')}
          </button>
          <button type="button" onClick={onLogout} className="btn-danger text-xs px-3 py-2">
            <LogOut size={12} />
          </button>
        </div>
      </div>

      <div className="panel-soft p-4 rounded-2xl border-brand-border/55 space-y-4">
        <div className="flex items-center gap-3">
          <div className="keep-white-ink w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center text-white text-xl font-semibold shadow-glow-blue bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple shrink-0">
            {profilePhotoPreview && !avatarLoadError ? (
              <img src={profilePhotoPreview} alt="avatar" className="w-full h-full object-cover" onError={() => setAvatarLoadError(true)} />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">{t('account.accountArea')}</p>
            <p className="text-lg font-semibold tracking-tight text-txt-primary leading-tight break-words mt-1">
              {profileDraft.display_name || currentUser?.display_name || currentUser?.username}
            </p>
            <p className="text-sm text-txt-muted mt-1 break-all">@{currentUser?.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={isAdmin ? 'badge-gold' : isPro ? 'badge-blue' : 'badge-green'}>
                {planName}
              </span>
              <span className="badge-green">{t('account.active')}</span>
            </div>
          </div>
          <div className="hidden sm:flex shrink-0 flex-col items-center rounded-[var(--r-xl)] border border-brand-border/20 bg-brand-surface2/25 p-3 animate-fade-in">
            <div
              className="relative h-24 w-24 rounded-full"
              style={{
                background: `conic-gradient(rgb(var(--accent-cyan)) 0 ${usagePercent}%, rgb(var(--brand-border) / 0.24) ${usagePercent}% 100%)`,
              }}
            >
              <div className="absolute inset-3 rounded-full border border-brand-border/20 bg-brand-surface flex flex-col items-center justify-center text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-[18px] font-semibold tracking-tight text-txt-primary">{usagePercent}%</p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-txt-muted">{t('account.usage')}</p>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-txt-muted text-center">{currentStats?.address_count || 0}/{currentPkg?.max_addresses || 3}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 stagger-in">
          <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.address')}</p>
            <p className="text-xl font-semibold text-txt-primary mt-1">{currentStats?.address_count || 0}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.mail')}</p>
            <p className="text-xl font-semibold text-txt-primary mt-1">{currentStats?.email_count || 0}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.plan')}</p>
            <p className="text-sm font-semibold text-txt-primary mt-1">{planName}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">{t('account.domain')}</p>
            <p className="text-sm font-semibold text-txt-primary mt-1 truncate">{activeDomainLabel}</p>
          </div>
        </div>

        <div className="h-2 rounded-full bg-brand-surface2 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan" style={{ width: `${usagePercent}%` }} />
        </div>
      </div>

      <div className="panel-soft p-4 rounded-2xl border-brand-border/55">
        <button
          type="button"
          onClick={() => setShowRecentHistory((v) => !v)}
          aria-expanded={showRecentHistory}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{t('account.recentUsed')}</p>
            <p className="text-[11px] text-txt-muted mt-1">{t('account.recentUsedHint')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {recentHistory.length > 0 ? <span className="badge-blue text-[9px]">{recentHistory.length}</span> : null}
            <ChevronDown size={14} className={`text-txt-muted transition-transform ${showRecentHistory ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showRecentHistory ? (
          <div className="mt-3 space-y-2 animate-slide-down">
            {recentHistory.length > 0 ? recentHistory.map((item) => (
              <div key={item.address} className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">{item.address}</p>
                  <p className="text-[10px] text-txt-muted mt-0.5">{item.has_password ? t('addressBar.passwordedBadge') : t('account.open')} • {new Date(item.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-accent-green shrink-0" />
              </div>
            )) : (
              <p className="text-sm text-txt-muted">{t('account.noHistory')}</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="panel-soft p-4 rounded-2xl border-brand-border/55">
        <button
          type="button"
          onClick={() => setShowPasswordedHistory((v) => !v)}
          aria-expanded={showPasswordedHistory}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{t('account.passwordedList')}</p>
            <p className="text-[11px] text-txt-muted mt-1">{t('account.passwordedListHint')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {passwordedHistory.length > 0 ? <span className="badge-purple text-[9px]">{passwordedHistory.length}</span> : null}
            <ChevronDown size={14} className={`text-txt-muted transition-transform ${showPasswordedHistory ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showPasswordedHistory ? (
          <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1 animate-slide-down">
            {passwordedHistory.length > 0 ? passwordedHistory.map((item) => (
              <div key={item.address} className="rounded-2xl border border-accent-purple/15 bg-accent-purple/5 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-txt-primary truncate">{item.address}</p>
                  <p className="text-[10px] text-txt-muted mt-0.5">{new Date(item.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Lock size={12} className="text-accent-purple shrink-0" />
              </div>
            )) : (
              <p className="text-sm text-txt-muted">{t('account.noPassworded')}</p>
            )}
          </div>
        ) : null}
      </div>

      {message && <div className="text-sm rounded-2xl border border-accent-green/20 bg-accent-green/10 text-accent-green px-4 py-3">{message}</div>}
      {error && <div className="text-sm rounded-2xl border border-accent-red/20 bg-accent-red/10 text-accent-red px-4 py-3">{error}</div>}

      <AccountEditorModal
        show={showProfileEditor}
        onClose={closeProfileEditor}
        tab={tab}
        setTab={setTab}
        currentUser={currentUser}
        currentPkg={currentPkg}
        currentStats={currentStats}
        currentPrefs={currentPrefs}
        currentUserName={currentUser?.username}
        profilePhotoPreview={profilePhotoPreview}
        avatarInitial={avatarInitial}
        onUploadAvatar={uploadAvatar}
        planName={planName}
        usernameLocked={usernameLocked}
        emailPending={emailPending}
        emailChangeCooldownActive={emailChangeCooldownActive}
        profileDraft={profileDraft}
        setProfileDraft={setProfileDraft}
        openProfileEditor={openProfileEditor}
        saveProfile={saveProfile}
        savePassword={savePassword}
        passwordDraft={passwordDraft}
        setPasswordDraft={setPasswordDraft}
        saving={saving}
        loadCenter={loadCenter}
        center={center}
        revokeSession={revokeSession}
        formatAdminDate={formatAdminDate}
        prefDraft={prefDraft}
        setPrefDraft={setPrefDraft}
        domains={domains}
        toggleFavoriteDomain={toggleFavoriteDomain}
        notificationSounds={notificationSounds}
        onPreviewNotificationSound={onPreviewNotificationSound}
        accent={accent}
        onAccentChange={onAccentChange}
        authToken={authToken}
        savePreferences={savePreferences}
        onRequestPro={onRequestPro}
        isAdmin={isAdmin}
        isPro={isPro}
        emailCount={emailCount}
        emailDraft={emailDraft}
        setEmailDraft={setEmailDraft}
        emailCode={emailCode}
        setEmailCode={setEmailCode}
        emailStep={emailStep}
        setEmailStep={setEmailStep}
        requestEmailChange={requestEmailChange}
        confirmEmailChange={confirmEmailChange}
      />
    </div>
  );
});

export default AccountPanel;
