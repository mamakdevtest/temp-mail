import { useMemo, useState } from 'react';
import {
  Crown,
  Globe,
  History,
  Languages,
  Lock,
  Mail,
  Moon,
  Monitor,
  Pencil,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Star,
  Sun,
  User,
  Bell,
  HardDrive,
} from 'lucide-react';
import Modal from './Modal';
import { AdminPanelCard, AdminStatCard, AdminEmptyState, AdminInfoRow } from './admin/AdminPrimitives';

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
  planName,
  usernameLocked,
  emailPending,
  emailChangeCooldownActive,
  profileDraft,
  setProfileDraft,
  openProfileEditor,
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
}) {
  const tabs = useMemo(() => ([
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'preferences', label: 'Tercihler', icon: Globe },
    { id: 'plan', label: 'Kullanım', icon: Crown },
  ]), []);

  const usagePercent = useMemo(() => Math.min(Math.round(((currentStats?.address_count || 0) / (currentPkg?.max_addresses || 3)) * 100), 100), [currentPkg?.max_addresses, currentStats?.address_count]);

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Hesap Ayarları"
      subtitle="Profil, güvenlik, tercihler ve kullanım burada."
      size="3xl"
      footer={(
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      )}
    >
      <div className="flex flex-wrap gap-2 mb-4">
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

      {tab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-4">
          <AdminPanelCard title="Profil Alanı" icon={User}>
            <div className="panel-soft p-5 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-24 h-24 rounded-3xl overflow-hidden border border-brand-border/30 bg-brand-surface2/45 flex items-center justify-center shrink-0">
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="Profil fotoğrafı" className="w-full h-full object-cover" />
                  ) : (
                    <User size={34} className="text-accent-blue" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Hesap bilgileri</p>
                  <h4 className="text-2xl font-semibold text-txt-primary mt-1 truncate">{currentUser?.display_name || currentUser?.username || '-'}</h4>
                  <p className="text-sm text-txt-muted mt-1 break-all">{currentUser?.email || '-'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={usernameLocked ? 'badge-purple' : 'badge-green'}>{usernameLocked ? 'Kullanıcı adı kilitli' : 'Kullanıcı adı değiştirilebilir'}</span>
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
                <button onClick={openProfileEditor} className="btn-primary">
                  <Pencil size={12} /> Profili Düzenle
                </button>
                <span className="text-xs text-txt-muted">Profil değişiklikleri ayrıca açılan küçük pencerede yapılır.</span>
              </div>
            </div>
          </AdminPanelCard>

          <div className="space-y-3">
            <div className="panel-soft p-4 rounded-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Hızlı Durum</p>
              <div className="mt-3 space-y-3">
                <AdminInfoRow label="Kullanıcı adı hakkı" value={usernameLocked ? 'Kullanıldı' : '1 kez kullanılabilir'} />
                <AdminInfoRow label="E-posta değişim" value={emailChangeCooldownActive ? 'Bekleme aktif' : 'Hazır'} />
                <AdminInfoRow label="Bekleyen e-posta" value={currentUser?.pending_email || '-'} />
              </div>
            </div>
            <div className="panel-soft p-4 rounded-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Kısa Not</p>
              <div className="mt-3 space-y-2 text-sm text-txt-secondary">
                <p>• Kullanıcı adı sadece bir kez değiştirilebilir.</p>
                <p>• E-posta değişikliği doğrulama kodu ile yapılır.</p>
                <p>• Hesap ayarlarının tamamı bu pencereden yönetilir.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
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
                          <p className="text-sm font-medium text-txt-primary">{session.browser || 'Browser'} • {session.device || 'Desktop'}</p>
                          <p className="text-xs text-txt-muted mt-1 break-all">{session.ip || '-'}</p>
                          <p className="text-xs text-txt-muted mt-1">Son aktif: {formatAdminDate(session.last_seen_at || session.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {session.current ? <span className="badge-blue">Bu oturum</span> : null}
                          {session.is_suspicious ? <span className="badge-red">Şüpheli</span> : null}
                          {!session.current ? (
                            <button onClick={() => revokeSession(session)} className="btn-danger text-xs px-3 py-2">Kapat</button>
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
                          <td className="py-3">{row.success ? <span className="badge-green">Başarılı</span> : <span className="badge-red">Başarısız</span>}</td>
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
      )}

      {tab === 'preferences' && (
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
              <select value={prefDraft.default_domain_id || ''} onChange={(e) => setPrefDraft((p) => ({ ...p, default_domain_id: e.target.value }))} className="input mt-3">
                <option value="">Seçiniz</option>
                {domains.map((d) => <option key={d.id} value={d.id}>{d.domain}</option>)}
              </select>
            </div>

            <div className="panel-soft p-4 rounded-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Favori Domainler</p>
              <div className="grid grid-cols-1 gap-2 mt-3">
                {domains.length > 0 ? domains.map((d) => {
                  const isFav = center.favorite_domains.some((x) => x.id === d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleFavoriteDomain(d.id, isFav)} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isFav ? 'border-accent-gold/20 bg-accent-gold/10 text-accent-gold' : 'border-brand-border/20 bg-brand-surface2/25 text-txt-secondary'}`}>
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
                <select value={prefDraft.notification_sound} onChange={(e) => setPrefDraft((p) => ({ ...p, notification_sound: e.target.value }))} className="input">
                  {notificationSounds.map((sound) => <option key={sound.id} value={sound.id}>{sound.name}</option>)}
                </select>
                <button onClick={() => onPreviewNotificationSound?.(prefDraft.notification_sound)} className="btn-secondary w-full">
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
    </Modal>
  );
}
