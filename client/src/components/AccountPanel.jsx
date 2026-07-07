import { useEffect, useMemo, useState } from 'react';
import {
  User,
  Crown,
  Globe,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
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
import Modal from './Modal';

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

function OptionBadge({ active, children, tone = 'blue', onClick }) {
  const toneClass = {
    blue: active ? 'border-accent-blue/30 bg-accent-blue/12 text-accent-blue' : 'border-brand-border/20 bg-brand-surface2/25 text-txt-secondary',
    purple: active ? 'border-accent-purple/30 bg-accent-purple/12 text-accent-purple' : 'border-brand-border/20 bg-brand-surface2/25 text-txt-secondary',
    green: active ? 'border-accent-green/30 bg-accent-green/12 text-accent-green' : 'border-brand-border/20 bg-brand-surface2/25 text-txt-secondary',
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${toneClass[tone]}`}>
      {children}
    </button>
  );
}

export default function AccountPanel({
  auth,
  api = '/api',
  token,
  user,
  pkg,
  stats,
  activeDomain,
  emailCount = 0,
  isGuest,
  isPro,
  isAdmin,
  domains = [],
  notificationSound = 'chime',
  notificationSounds = [],
  onNotificationSoundChange,
  onPreviewNotificationSound,
  onRequestPro,
  onLogout,
  onAdmin,
  onLogin,
  onRegister,
}) {
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
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }

    if (res.status === 401) {
      throw new Error('Oturum süreniz dolmuş, tekrar giriş yapın');
    }
    if (!res.ok) {
      throw new Error(data.error || data.message || 'İşlem başarısız');
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

  const openProfileEditor = () => {
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
      flash('Kullanıcı adı gerekli', 'error');
      return;
    }
    if (usernameLocked && nextUsername !== String(currentUser?.username || '').toLowerCase()) {
      flash('Kullanıcı adı sadece bir kez değiştirilebilir', 'error');
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
      flash('Profil güncellendi');
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestEmailChange = async () => {
    const nextEmail = emailDraft.trim().toLowerCase();
    if (!nextEmail) {
      flash('E-posta gerekli', 'error');
      return;
    }
    if (nextEmail === String(currentUser?.email || '').toLowerCase()) {
      flash('E-posta değişmedi', 'error');
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
      flash(result.message || 'Doğrulama kodu hazır');
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmEmailChange = async () => {
    const code = emailCode.trim();
    if (!code) {
      flash('Doğrulama kodu gerekli', 'error');
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
      flash(result.message || 'E-posta güncellendi');
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
        flash('Profil fotoğrafı güncellendi');
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
      flash('Şifre alanlarını doldurun', 'error');
      return;
    }
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      flash('Yeni şifreler eşleşmiyor', 'error');
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
      flash('Şifre değiştirildi');
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
      flash('Tercihler güncellendi');
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
      flash('Adres güncellendi');
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
      flash('Adres süresi yenilendi');
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (addr) => {
    if (!confirm(`"${addr.address}" silinsin mi?`)) return;
    setSaving(true);
    try {
      await request(`/auth/addresses/${addr.id}`, { method: 'DELETE', json: false });
      flash('Adres silindi');
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (session) => {
    if (!confirm('Bu oturum sonlandırılsın mı?')) return;
    setSaving(true);
    try {
      await request(`/auth/sessions/${session.id}`, { method: 'DELETE', json: false });
      flash('Oturum kapatıldı');
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
      flash(isFavorite ? 'Favori domain kaldırıldı' : 'Favori domain eklendi');
      await loadCenter();
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (isGuest) {
    return (
      <div className="card p-5 sm:p-6 h-full min-h-[530px] flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-2xl panel-soft flex items-center justify-center">
            <User size={15} className="text-accent-blue" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-txt-primary">Hesap</p>
            <p className="text-[11px] text-txt-muted">Profil ve plan detayları</p>
          </div>
        </div>
        <div className="panel-soft p-4 rounded-[24px] border-brand-border/55">
          <p className="text-xl font-semibold text-txt-primary">Misafir Kullanıcı</p>
          <p className="text-sm text-txt-muted mt-2 leading-relaxed">
            Giriş yapmadan kullanabilirsiniz. Hesap açtığınızda profil, güvenlik ve tercih merkezine erişirsiniz.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <button onClick={onLogin} className="btn-secondary">Giriş Yap</button>
            <button onClick={onRegister} className="btn-primary">Hesap Aç</button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'preferences', label: 'Tercihler', icon: Settings },
    { id: 'plan', label: 'Plan', icon: Crown },
  ];

  const planName = isAdmin ? 'Admin' : isPro ? 'Pro' : 'Free';
  const usagePercent = Math.min(Math.round(((currentStats?.address_count || 0) / (currentPkg?.max_addresses || 3)) * 100), 100);
  const avatarInitial = (profileDraft.display_name || profileDraft.username || currentUser?.username || 'M')[0].toUpperCase();

  return (
    <div className="card p-5 sm:p-6 h-full min-h-[530px] flex flex-col">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-2xl panel-soft flex items-center justify-center">
          <User size={15} className="text-accent-blue" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-txt-primary">Hesap</p>
          <p className="text-[11px] text-txt-muted">Profil, güvenlik, tercihler ve kullanım</p>
        </div>
        <button onClick={onLogout} className="btn-secondary text-xs px-3 py-2">
          <LogOut size={12} /> Çıkış
        </button>
      </div>

      <div className="panel-soft p-4 rounded-[24px] border-brand-border/55 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-semibold shadow-glow-blue bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple">
            {profilePhotoPreview ? (
              <img src={profilePhotoPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-txt-primary leading-none truncate">
              {profileDraft.display_name || currentUser?.display_name || currentUser?.username}
            </p>
            <p className="text-sm text-accent-green mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green" />
              {isAdmin ? 'Admin Kullanıcı' : isPro ? 'Pro Kullanıcı' : 'Free Kullanıcı'}
            </p>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs text-txt-muted">Plan</p>
            <p className="text-lg font-semibold text-txt-primary">{planName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <AdminInfoRow label="Adres" value={currentStats?.address_count || 0} />
          <AdminInfoRow label="Mail" value={currentStats?.email_count || 0} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={openProfileEditor} className="btn-primary">
            <Pencil size={12} /> Düzenle / Edit
          </button>
          <span className="text-xs text-txt-muted self-center">Sadece temel profil bilgileri popup üzerinden düzenlenir.</span>
        </div>
      </div>

      <div className="hidden flex flex-wrap gap-2 mb-4">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={tab === item.id ? 'nav-pill nav-pill-active' : 'nav-pill'}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {message && <div className="mb-3 text-sm rounded-2xl border border-accent-green/20 bg-accent-green/10 text-accent-green px-4 py-3">{message}</div>}
      {error && <div className="mb-3 text-sm rounded-2xl border border-accent-red/20 bg-accent-red/10 text-accent-red px-4 py-3">{error}</div>}

      <div className="hidden">
        {tab === 'profile' && (
          <>
            <AdminPanelCard title="Profil Alanı" icon={User}>
              <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-4">
                <div className="panel-soft p-5 rounded-3xl">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border border-brand-border/30 bg-brand-surface2/45 flex items-center justify-center">
                        {profilePhotoPreview ? (
                          <img src={profilePhotoPreview} alt="Profil fotoğrafı" className="w-full h-full object-cover" />
                        ) : (
                          <User size={34} className="text-accent-blue" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Hesap bilgileri</p>
                      <h4 className="text-2xl font-semibold text-txt-primary mt-1 truncate">
                        {currentUser?.display_name || currentUser?.username || '-'}
                      </h4>
                      <p className="text-sm text-txt-muted mt-1 break-all">{currentUser?.email || '-'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={usernameLocked ? 'badge-purple' : 'badge-green'}>
                          {usernameLocked ? 'Kullanıcı adı kilitli' : 'Kullanıcı adı değiştirilebilir'}
                        </span>
                        {emailPending ? <span className="badge-blue">E-posta doğrulaması bekliyor</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AdminInfoRow label="Kullanıcı adı" value={currentUser?.username || '-'} />
                    <AdminInfoRow label="Görünen ad" value={currentUser?.display_name || currentUser?.username || '-'} />
                    <AdminInfoRow label="E-posta" value={currentUser?.email || '-'} />
                    <AdminInfoRow label="Hesap oluşturma" value={formatAdminDate(currentUser?.created_at)} />
                    <AdminInfoRow label="Son giriş" value={formatAdminDate(currentUser?.last_login)} />
                    <AdminInfoRow label="Dil / Tema" value={`${currentPrefs?.language || currentUser?.language || 'tr'} / ${currentPrefs?.theme || currentUser?.theme || 'system'}`} />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {!isGuest ? (
                      <button onClick={openProfileEditor} className="btn-primary">
                        <Pencil size={12} /> Düzenle / Edit
                      </button>
                    ) : null}
                    <span className="text-xs text-txt-muted">
                      Tüm değişiklikler tek bir pencereden yapılır. Kullanıcı adı sadece bir kez değiştirilebilir.
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="panel-soft p-4 rounded-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Değişiklik Kuralları</p>
                    <div className="mt-3 space-y-2 text-sm text-txt-secondary">
                      <p>• Profil fotoğrafı, görünen ad ve kısa bilgileri düzenleyebilirsin.</p>
                      <p>• Kullanıcı adı bir kez değiştirilebilir ve sonrasında kilitlenir.</p>
                      <p>• E-posta değişikliği doğrulama kodu ile yapılır.</p>
                    </div>
                  </div>

                  <div className="panel-soft p-4 rounded-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Hızlı Durum</p>
                    <div className="mt-3 space-y-3">
                      <AdminInfoRow label="Kullanıcı adı hakkı" value={usernameLocked ? 'Kullanıldı' : '1 kez kullanılabilir'} />
                      <AdminInfoRow label="E-posta değişim" value={emailChangeCooldownActive ? 'Bekleme aktif' : 'Hazır'} />
                      <AdminInfoRow label="Bekleyen e-posta" value={currentUser?.pending_email || '-'} />
                    </div>
                  </div>
                </div>
              </div>
            </AdminPanelCard>
          </>
        )}

        {tab === 'security' && (
          <div className="space-y-4">
            <AdminPanelCard title="Hesap Güvenliği" icon={Shield}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="panel-soft p-4 rounded-2xl lg:col-span-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Şifre Değiştir</p>
                  <div className="space-y-3 mt-3">
                    <input
                      type="password"
                      placeholder="Mevcut şifre"
                      value={passwordDraft.currentPassword}
                      onChange={(e) => setPasswordDraft((p) => ({ ...p, currentPassword: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="password"
                      placeholder="Yeni şifre"
                      value={passwordDraft.newPassword}
                      onChange={(e) => setPasswordDraft((p) => ({ ...p, newPassword: e.target.value }))}
                      className="input"
                    />
                    <input
                      type="password"
                      placeholder="Yeni şifre tekrar"
                      value={passwordDraft.confirmPassword}
                      onChange={(e) => setPasswordDraft((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="input"
                    />
                    <button onClick={savePassword} disabled={saving} className="btn-primary w-full">
                      <Lock size={12} /> Şifreyi Güncelle
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <div className="panel-soft p-4 rounded-2xl">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <History size={15} className="text-accent-blue" />
                        <p className="text-sm font-semibold text-txt-primary">Aktif Oturumlar</p>
                      </div>
                      <button onClick={loadCenter} className="btn-secondary text-xs px-3 py-2">
                        <RefreshCw size={12} /> Yenile
                      </button>
                    </div>
                    {center.sessions.length > 0 ? (
                      <div className="space-y-2">
                        {center.sessions.map((session) => (
                          <div key={session.id} className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-txt-primary">
                                  {session.browser || 'Browser'} • {session.device || 'Desktop'}
                                </p>
                                <p className="text-xs text-txt-muted mt-1 break-all">{session.ip || '-'}</p>
                                <p className="text-xs text-txt-muted mt-1">Son aktif: {formatAdminDate(session.last_seen_at || session.created_at)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {session.current ? <span className="badge-blue">Bu oturum</span> : null}
                                {session.is_suspicious ? <span className="badge-red">Şüpheli</span> : null}
                                {!session.current ? (
                                  <button onClick={() => revokeSession(session)} className="btn-danger text-xs px-3 py-2">
                                    Kapat
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <AdminEmptyState title="Oturum yok" subtitle="Aktif girişler burada görünecek." />
                    )}
                  </div>

                  <div className="panel-soft p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={15} className="text-accent-green" />
                      <p className="text-sm font-semibold text-txt-primary">Giriş Geçmişi</p>
                    </div>
                    {center.history.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[720px]">
                          <thead className="text-left text-txt-muted">
                            <tr className="border-b border-brand-border/20">
                              <th className="py-3 font-medium">Tarih</th>
                              <th className="py-3 font-medium">IP</th>
                              <th className="py-3 font-medium">Cihaz</th>
                              <th className="py-3 font-medium">Tarayıcı</th>
                              <th className="py-3 font-medium">Durum</th>
                            </tr>
                          </thead>
                          <tbody>
                            {center.history.map((row) => (
                              <tr key={row.id} className="border-b border-brand-border/10 last:border-0">
                                <td className="py-3 text-txt-secondary">{formatAdminDate(row.created_at)}</td>
                                <td className="py-3 text-txt-secondary">{row.ip || '-'}</td>
                                <td className="py-3 text-txt-secondary">{row.device || '-'}</td>
                                <td className="py-3 text-txt-secondary">{row.browser || '-'}</td>
                                <td className="py-3">
                                  {row.success ? <span className="badge-green">Başarılı</span> : <span className="badge-red">Başarısız</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <AdminEmptyState title="Geçmiş yok" subtitle="Giriş kayıtları burada listelenecek." />
                    )}
                  </div>
                </div>
              </div>
            </AdminPanelCard>
          </div>
        )}

        {tab === 'preferences' && (
          <AdminPanelCard title="Temp Mail Tercihleri" icon={Settings}>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Tema</p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <OptionBadge tone="blue" active={prefDraft.theme === 'light'} onClick={() => setPrefDraft((p) => ({ ...p, theme: 'light' }))}>
                      <Sun size={14} /> Açık
                    </OptionBadge>
                    <OptionBadge tone="purple" active={prefDraft.theme === 'dark'} onClick={() => setPrefDraft((p) => ({ ...p, theme: 'dark' }))}>
                      <Moon size={14} /> Koyu
                    </OptionBadge>
                    <OptionBadge tone="green" active={prefDraft.theme === 'system'} onClick={() => setPrefDraft((p) => ({ ...p, theme: 'system' }))}>
                      <Monitor size={14} /> Sistem
                    </OptionBadge>
                  </div>
                </div>

                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Dil</p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <OptionBadge active={prefDraft.language === 'tr'} onClick={() => setPrefDraft((p) => ({ ...p, language: 'tr' }))}>
                      <Languages size={14} /> Türkçe
                    </OptionBadge>
                    <OptionBadge active={prefDraft.language === 'en'} onClick={() => setPrefDraft((p) => ({ ...p, language: 'en' }))}>
                      <Languages size={14} /> English
                    </OptionBadge>
                  </div>
                </div>

                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Varsayılan Domain</p>
                  <select
                    value={prefDraft.default_domain_id || ''}
                    onChange={(e) => setPrefDraft((p) => ({ ...p, default_domain_id: e.target.value }))}
                    className="input mt-3"
                  >
                    <option value="">Seçiniz</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.domain}</option>
                    ))}
                  </select>
                </div>

                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Favori Domainler</p>
                  <div className="grid grid-cols-1 gap-2 mt-3">
                    {domains.length > 0 ? domains.map((d) => {
                      const isFav = center.favorite_domains.some((x) => x.id === d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleFavoriteDomain(d.id, isFav)}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isFav ? 'border-accent-gold/20 bg-accent-gold/10 text-accent-gold' : 'border-brand-border/20 bg-brand-surface2/25 text-txt-secondary'}`}
                        >
                          <span className="min-w-0 truncate">{d.domain}</span>
                          <Star size={14} />
                        </button>
                      );
                    }) : (
                      <AdminEmptyState title="Domain yok" subtitle="Favori domain seçimi için aktif domain gerekli." />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Mail Saklama Süresi</p>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={prefDraft.mail_retention_days}
                    onChange={(e) => setPrefDraft((p) => ({ ...p, mail_retention_days: e.target.value }))}
                    className="input mt-3"
                  />
                </div>

                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Bildirim Sesi</p>
                  <div className="mt-3 space-y-2">
                    <select
                      value={prefDraft.notification_sound}
                      onChange={(e) => setPrefDraft((p) => ({ ...p, notification_sound: e.target.value }))}
                      className="input"
                    >
                      {notificationSounds.map((sound) => (
                        <option key={sound.id} value={sound.id}>{sound.name}</option>
                      ))}
                    </select>
                    <button onClick={() => onPreviewNotificationSound?.(prefDraft.notification_sound)} className="btn-primary w-full">
                      <Mail size={12} /> Önizle
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={savePreferences} disabled={saving} className="btn-primary">
                    <Save size={12} /> Kaydet
                  </button>
                </div>
              </div>
            </div>
          </AdminPanelCard>
        )}

        {tab === 'addresses' && (
          <AdminPanelCard title="Adres Yönetimi" icon={Globe}>
            {center.addresses.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {center.addresses.map((addr) => {
                  const draft = addressDrafts[addr.id] || {};
                  return (
                    <div key={addr.id} className="panel-soft p-4 rounded-2xl">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-txt-primary font-mono break-all">{addr.address}</p>
                          <p className="text-xs text-txt-muted mt-1">{addr.domain}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {draft.is_favorite ? <span className="badge-gold">Favori</span> : null}
                          {draft.is_locked ? <span className="badge-purple">Kilitli</span> : null}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <div>
                          <p className="text-xs text-txt-muted">Takma ad</p>
                          <input
                            value={draft.nickname}
                            onChange={(e) => setAddressDrafts((p) => ({ ...p, [addr.id]: { ...draft, nickname: e.target.value } }))}
                            className="input mt-2"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-txt-muted">Not</p>
                          <input
                            value={draft.note}
                            onChange={(e) => setAddressDrafts((p) => ({ ...p, [addr.id]: { ...draft, note: e.target.value } }))}
                            className="input mt-2"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div>
                          <p className="text-xs text-txt-muted">Mail sayısı</p>
                          <p className="text-sm text-txt-primary mt-1">{addr.email_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-txt-muted">Son mail</p>
                          <p className="text-sm text-txt-primary mt-1">{formatAdminDate(addr.last_email_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-txt-muted">Oluşturulma</p>
                          <p className="text-sm text-txt-primary mt-1">{formatAdminDate(addr.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-txt-muted">Saklama</p>
                          <p className="text-sm text-txt-primary mt-1">{formatRetention(addr)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setAddressDrafts((p) => ({ ...p, [addr.id]: { ...draft, is_favorite: !draft.is_favorite } }))}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          <Star size={12} /> {draft.is_favorite ? 'Favoriden çıkar' : 'Favori yap'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddressDrafts((p) => ({ ...p, [addr.id]: { ...draft, is_locked: !draft.is_locked } }))}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          <FolderLock size={12} /> {draft.is_locked ? 'Kilidi aç' : 'Kilitle'}
                        </button>
                        <button onClick={() => renewAddress(addr)} className="btn-secondary text-xs px-3 py-2">
                          <RotateCcw size={12} /> Yenile
                        </button>
                        <button onClick={() => saveAddress(addr)} className="btn-primary text-xs px-3 py-2">
                          <Save size={12} /> Kaydet
                        </button>
                        <button onClick={() => deleteAddress(addr)} className="btn-danger text-xs px-3 py-2">
                          <Trash2 size={12} /> Sil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <AdminEmptyState title="Adres yok" subtitle="Kaydedilmiş geçici adresler burada listelenecek." />
            )}
          </AdminPanelCard>
        )}

        {tab === 'notifications' && (
          <AdminPanelCard title="Bildirimler" icon={Bell}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {[
                  { key: 'notify_new_mail', label: 'Yeni mail', desc: 'Yeni bir mesaj geldiğinde bildir.' },
                  { key: 'notify_otp', label: 'OTP', desc: 'Doğrulama kodu geldiğinde özel uyarı ver.' },
                  { key: 'notify_expiring', label: 'Süresi yaklaşan adres', desc: 'Adres süresi yaklaşınca haber ver.' },
                  { key: 'notify_security', label: 'Güvenlik', desc: 'Şüpheli giriş ve güvenlik olaylarını bildir.' },
                ].map((item) => {
                  const active = !!prefDraft[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPrefDraft((p) => ({ ...p, [item.key]: !p[item.key] }))}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${active ? 'border-accent-blue/25 bg-accent-blue/10' : 'border-brand-border/20 bg-brand-surface2/25'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-txt-primary">{item.label}</p>
                          <p className="text-xs text-txt-muted mt-1">{item.desc}</p>
                        </div>
                        {active ? <Bell size={14} className="text-accent-blue" /> : <BellOff size={14} className="text-txt-muted" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                <div className="panel-soft p-4 rounded-2xl">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Bildirim Sesi</p>
                  <select
                    value={prefDraft.notification_sound}
                    onChange={(e) => setPrefDraft((p) => ({ ...p, notification_sound: e.target.value }))}
                    className="input mt-3"
                  >
                    {notificationSounds.map((sound) => (
                      <option key={sound.id} value={sound.id}>{sound.name}</option>
                    ))}
                  </select>
                  <button onClick={() => onPreviewNotificationSound?.(prefDraft.notification_sound)} className="btn-secondary w-full mt-3">
                    <Mail size={12} /> Sesi Önizle
                  </button>
                </div>
                <button onClick={savePreferences} disabled={saving} className="btn-primary w-full">
                  <Save size={12} /> Bildirimleri Kaydet
                </button>
              </div>
            </div>
          </AdminPanelCard>
        )}

        {tab === 'plan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <AdminStatCard title="Adres Limiti" value={`${currentStats?.address_count || 0}/${currentPkg?.max_addresses === 999 ? '∞' : currentPkg?.max_addresses || 3}`} subtitle="Aktif kullanım" icon={HardDrive} tone="blue" />
              <AdminStatCard title="Mail Sayısı" value={currentStats?.email_count || emailCount || 0} subtitle="Toplam gelen" icon={Mail} tone="green" />
              <AdminStatCard title="Favori Adres" value={center.addresses.filter((a) => a.is_favorite).length} subtitle="Kaydedilmiş favoriler" icon={Star} tone="gold" />
              <AdminStatCard title="Plan" value={planName} subtitle="Hesap tipi" icon={Crown} tone="purple" />
            </div>

            <AdminPanelCard title="Kullanım ve Plan" icon={Crown}>
              <div className="space-y-4">
                <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-txt-primary">{currentPkg?.display_name || planName}</p>
                      <p className="text-xs text-txt-muted mt-1">{isAdmin ? 'Admin yetkileri sınırsız görünür' : 'Limitler paket bazlı gösterilir'}</p>
                    </div>
                    {isPro ? <span className="badge-green">Aktif</span> : <span className="badge-purple">Yükseltilebilir</span>}
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-brand-surface2 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan" style={{ width: `${usagePercent}%` }} />
                  </div>
                  <p className="text-xs text-txt-muted mt-2">{usagePercent}% adres kotası kullanıldı</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AdminInfoRow label="Kullanılan domain" value={domains.length} />
                  <AdminInfoRow label="Aktif adres" value={currentStats?.address_count || 0} />
                  <AdminInfoRow label="Kullanılan mail" value={currentStats?.email_count || 0} />
                  <AdminInfoRow label="Oturum sayısı" value={center.sessions.filter((s) => !s.revoked_at).length} />
                </div>

                {!isPro && !isAdmin ? (
                  <button onClick={onRequestPro} className="btn-primary">
                    <Crown size={12} /> Limit Yükselt
                  </button>
                ) : null}
              </div>
            </AdminPanelCard>
          </div>
        )}
      </div>

      <Modal
        show={showProfileEditor}
        onClose={closeProfileEditor}
        title="Profili Düzenle"
        subtitle="Temel hesap bilgilerini buradan değiştirebilirsin."
        size="full"
        footer={(
          <>
            <button type="button" onClick={closeProfileEditor} className="btn-secondary">
              Kaydetme
            </button>
            <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary">
              <Save size={12} /> Kaydet
            </button>
          </>
        )}
        >
        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-4">
          <div className="panel-soft rounded-3xl p-4 flex flex-col items-center justify-between text-center gap-4">
            <div className="w-28 h-28 rounded-3xl overflow-hidden border border-brand-border/30 bg-brand-surface2/45 flex items-center justify-center">
              {profilePhotoPreview ? (
                <img src={profilePhotoPreview} alt="Profil fotoğrafı" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-accent-blue" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-txt-primary">{currentUser?.display_name || currentUser?.username || '-'}</p>
              <p className="text-xs text-txt-muted mt-1 break-all">{currentUser?.email || '-'}</p>
            </div>
            <label className="btn-secondary cursor-pointer w-full justify-center">
              <Pencil size={12} /> Fotoğraf Değiştir
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadAvatar(e.target.files?.[0] || null)}
              />
            </label>
            <div className="w-full space-y-2 text-left">
              <AdminInfoRow label="Hesap oluşturma" value={formatAdminDate(currentUser?.created_at)} />
              <AdminInfoRow label="Son giriş" value={formatAdminDate(currentUser?.last_login)} />
              <AdminInfoRow label="Durum" value={usernameLocked ? 'Kullanıcı adı kilitli' : 'Düzenlenebilir'} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="panel-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-txt-muted">Görünen ad</p>
                <input
                  value={profileDraft.display_name}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, display_name: e.target.value }))}
                  className="input mt-2"
                  placeholder="Görünen ad"
                />
              </div>
              <div className="panel-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-txt-muted">Kullanıcı adı</p>
                <input
                  value={profileDraft.username}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, username: e.target.value }))}
                  className="input mt-2"
                  placeholder="kullaniciadi"
                  disabled={usernameLocked}
                />
                <p className="text-[11px] text-txt-muted mt-2">
                  {usernameLocked ? 'Kullanıcı adı değişimi kullanıldı ve tekrar açılamaz.' : 'Bu alan yalnızca bir kez değiştirilebilir.'}
                </p>
              </div>
            </div>

            <div className="panel-soft rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-txt-muted">E-posta</p>
                  <p className="text-sm text-txt-secondary mt-1">Adres değişikliği doğrulama kodu ile yapılır.</p>
                </div>
                {emailPending ? <span className="badge-blue">Doğrulama Bekliyor</span> : null}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="input"
                  placeholder="eposta@ornek.com"
                />
                <button
                  type="button"
                  onClick={requestEmailChange}
                  disabled={saving || emailChangeCooldownActive || !!emailPending}
                  className="btn-secondary"
                >
                  <Mail size={12} /> Kodu Gönder
                </button>
              </div>
              <p className="text-[11px] text-txt-muted mt-2">
                {emailChangeCooldownActive ? 'E-posta değişimi için kısa bir bekleme süresi uygulanıyor.' : 'Yeni e-posta adresine kod gönderilir, sonra doğrulanır.'}
              </p>
              {emailStep === 'verify' ? (
                <div className="mt-4 rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-txt-muted">Doğrulama Kodu</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <input
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="input"
                      placeholder="Doğrulama kodu"
                    />
                    <button type="button" onClick={confirmEmailChange} disabled={saving} className="btn-primary">
                      <CheckCircle2 size={12} /> Onayla
                    </button>
                  </div>
                  {emailPending ? <p className="text-[11px] text-txt-muted mt-2">Bekleyen yeni e-posta: {emailPending}</p> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-txt-muted">Hızlı Özet</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdminInfoRow label="E-posta" value={currentUser?.email || '-'} />
                <AdminInfoRow label="Dil / Tema" value={`${currentPrefs?.language || currentUser?.language || 'tr'} / ${currentPrefs?.theme || currentUser?.theme || 'system'}`} />
              </div>
            </div>
          </div>
        </div>
        </Modal>
    </div>
  );
}
