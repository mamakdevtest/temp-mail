import { User, Crown, Globe, Settings, Shield, LogOut, ChevronRight, Zap, Mail, Pencil, HardDrive } from 'lucide-react';

export default function AccountPanel({ user, pkg, stats, activeDomain, emailCount = 0, isGuest, isPro, isAdmin, onRequestPro, onLogout, onAdmin, onLogin, onRegister, onRename }) {
  const initial = (user?.username || 'M')[0].toUpperCase();
  const roleName = isGuest ? 'Hesapsız Kullanıcı' : isAdmin ? 'Admin Kullanıcı' : isPro ? 'Pro Kullanıcı' : 'Free Kullanıcı';
  const maxAddresses = pkg?.max_addresses || 3;
  const maxEmails = pkg?.max_emails || 50;
  const addrPercent = Math.min(Math.round(((stats?.address_count || 0) / maxAddresses) * 100), 100);
  const emailPercent = Math.min(Math.round((emailCount / maxEmails) * 100), 100);
  const usagePercent = Math.max(addrPercent, emailPercent);

  const usageRingStyle = {
    background: `conic-gradient(#3B82FF ${usagePercent}%, rgba(255,255,255,0.08) ${usagePercent}% 100%)`,
  };

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
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold shadow-glow-blue ${isPro || isAdmin ? 'bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple' : 'bg-gradient-to-br from-accent-blue to-accent-cyan'}`}>{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-txt-primary leading-none truncate">{isGuest ? 'Misafir' : user?.username}</p>
            <p className="text-sm text-accent-green mt-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-accent-green" /> {roleName}</p>
          </div>
          {!isGuest && (
            <button onClick={onRename} className="w-11 h-11 rounded-2xl panel-soft flex items-center justify-center text-txt-secondary hover:text-txt-primary transition-colors">
              <Pencil size={16} />
            </button>
          )}
        </div>

        <div className="mt-5 rounded-[20px] bg-accent-purple/10 border border-accent-purple/15 p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-purple/12 flex items-center justify-center flex-shrink-0">
            {isGuest ? <Zap size={16} className="text-accent-blue" /> : <Crown size={16} className="text-accent-purple" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-accent-purple">{isGuest ? 'Hesapsız Kullanım' : isPro || isAdmin ? 'Pro Plan' : 'Free Plan'}</p>
            <p className="text-xs text-txt-secondary mt-1 leading-relaxed">
              {isGuest
                ? 'Giriş yapmadan kullanabilirsiniz. Hesap açarak verilerinizi daha düzenli yönetebilirsiniz.'
                : isPro || isAdmin
                  ? 'Sınırsız e-posta adresi, özel alan adları, öncelikli destek ve daha fazlası.'
                  : `${maxAddresses} adres, ${maxEmails} mail saklama hakkı.`}
            </p>
          </div>
        </div>
      </div>

      <div className="panel-soft mt-4 p-4 rounded-[22px] border-brand-border/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl panel-soft flex items-center justify-center"><HardDrive size={16} className="text-accent-blue" /></div>
            <div>
              <p className="text-sm font-medium text-txt-primary">Kullanım</p>
              <p className="text-xs text-txt-muted mt-1">Adres ve mail kotası</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xl font-semibold text-accent-blue">{stats?.address_count || 0} / {maxAddresses === 999 ? '∞' : maxAddresses}</p>
              <p className="text-xs text-txt-muted">Adres kullanımı</p>
            </div>
            <div className="relative w-16 h-16 rounded-full p-[5px]" style={usageRingStyle}>
              <div className="w-full h-full rounded-full bg-brand-surface flex items-center justify-center text-sm font-semibold text-txt-primary">{usagePercent}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <div className="panel-soft px-4 py-4 rounded-[20px] flex items-center justify-between border-brand-border/45">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-txt-secondary" />
            <div>
              <p className="text-xs text-txt-muted">Mail Kullanımı</p>
              <p className="text-sm font-semibold text-txt-primary">{emailCount} / {maxEmails === 5000 ? '5K' : maxEmails}</p>
            </div>
          </div>
          <span className="text-xs text-txt-secondary">{emailPercent}%</span>
        </div>

        {activeDomain && (
          <div className="panel-soft px-4 py-4 rounded-[20px] flex items-center justify-between border-brand-border/45">
            <div className="flex items-center gap-3 min-w-0">
              <Globe size={16} className="text-txt-secondary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-txt-muted">Aktif Alan Adı</p>
                <p className="text-sm font-semibold font-mono text-txt-primary truncate">{activeDomain}</p>
              </div>
            </div>
            <span className="badge-green">Aktif</span>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-brand-border/45 bg-brand-surface/45">
        {[
          ...(isAdmin ? [{ icon: Settings, label: 'Admin Paneli', onClick: onAdmin, color: 'text-txt-secondary' }] : []),
          { icon: Shield, label: 'Hesap Ayarları', onClick: isGuest ? onRegister : undefined, color: 'text-txt-secondary' },
          { icon: Mail, label: 'Planı Yönet', onClick: isGuest ? onRegister : (!isPro && !isAdmin ? onRequestPro : undefined), color: isGuest || !isPro ? 'text-accent-purple' : 'text-txt-secondary' },
          { icon: Globe, label: 'Domainler', onClick: isAdmin ? onAdmin : undefined, color: 'text-txt-secondary' },
        ].map((item, i) => (
          <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-brand-surface2/55 transition-colors border-b border-brand-border/20 last:border-b-0 text-left">
            <item.icon size={15} className={item.color} />
            <span className="flex-1 text-sm text-txt-secondary">{item.label}</span>
            <ChevronRight size={14} className="text-txt-disabled" />
          </button>
        ))}
        {isGuest ? (
          <div className="grid grid-cols-2 gap-2 p-3 border-t border-brand-border/20 bg-brand-surface2/30">
            <button onClick={onLogin} className="btn-secondary text-xs py-2.5">Giriş Yap</button>
            <button onClick={onRegister} className="btn-primary text-xs py-2.5">Hesap Aç</button>
          </div>
        ) : (
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent-red/5 transition-colors border-t border-brand-border/20 text-left">
            <LogOut size={15} className="text-accent-red" />
            <span className="flex-1 text-sm text-accent-red">Çıkış Yap</span>
            <ChevronRight size={14} className="text-accent-red/70" />
          </button>
        )}
      </div>
    </div>
  );
}

