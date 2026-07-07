import { User, Crown, Globe, Settings, Shield, LogOut, ChevronRight, HardDrive, Zap, Mail } from 'lucide-react';

export default function AccountPanel({ user, pkg, stats, activeDomain, emailCount = 0, isPro, isAdmin, onRequestPro, onLogout, onAdmin }) {
  const initial = (user?.username || 'K')[0].toUpperCase();
  const roleName = isAdmin ? 'Admin' : isPro ? 'Pro' : 'Ücretsiz';
  const maxAddresses = pkg?.max_addresses || 3;
  const maxEmails = pkg?.max_emails || 50;
  const addrPercent = Math.min(Math.round(((stats?.address_count || 0) / maxAddresses) * 100), 100);
  const emailPercent = Math.min(Math.round((emailCount / maxEmails) * 100), 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1"><User size={14} className="text-txt-muted" /><span className="section-title">Hesap</span></div>

      {/* Profil */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isPro ? 'bg-gradient-to-br from-accent-purple to-accent-blue' : 'bg-gradient-to-br from-accent-blue to-accent-cyan'}`}>{initial}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-txt-primary truncate">{user?.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-accent-purple' : 'bg-accent-green'}`} />
              <span className="text-[10px] text-txt-muted">{roleName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className={`card p-4 ${isPro ? 'border-accent-purple/20' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-accent-purple/15' : 'bg-accent-blue/15'}`}>
            {isPro ? <Crown size={14} className="text-accent-purple" /> : <Zap size={14} className="text-accent-blue" />}
          </div>
          <div className="flex-1">
            <p className={`text-xs font-semibold ${isPro ? 'text-accent-purple' : 'text-accent-blue'}`}>{pkg?.display_name || roleName} Plan</p>
            <p className="text-[10px] text-txt-muted mt-0.5 leading-relaxed">
              {isPro ? 'Sınırsız adres, özel domain, webhook desteği.' : `${maxAddresses} adres, ${maxEmails} mail saklama.`}
            </p>
            {!isPro && !isAdmin && (
              <button onClick={onRequestPro} className="mt-2 text-[10px] font-semibold text-accent-purple hover:text-accent-purple/80 transition-colors flex items-center gap-1">
                <Crown size={10} /> Pro'ya Yükselt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kullanım */}
      <div className="card p-4">
        <p className="section-title mb-3">Kullanım</p>
        <div className="space-y-3">
          {/* Adres */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-txt-muted">Adresler</span>
              <span className="text-txt-secondary">{stats?.address_count || 0} / {maxAddresses === 999 ? '∞' : maxAddresses}</span>
            </div>
            <div className="h-1.5 bg-brand-surface2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan transition-all duration-500" style={{ width: `${addrPercent}%` }} />
            </div>
          </div>
          {/* Mail */}
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-txt-muted">Mailler</span>
              <span className="text-txt-secondary">{emailCount} / {maxEmails === 5000 ? '5K' : maxEmails}</span>
            </div>
            <div className="h-1.5 bg-brand-surface2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-blue transition-all duration-500" style={{ width: `${emailPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Aktif Domain */}
      {activeDomain && (
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-txt-muted" />
              <div>
                <p className="text-[10px] text-txt-muted">Aktif Alan Adı</p>
                <p className="text-sm font-semibold font-mono text-txt-primary">{activeDomain}</p>
              </div>
            </div>
            <span className="badge-green text-[9px]">Aktif</span>
          </div>
        </div>
      )}

      {/* İstatistik */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center"><Mail size={14} className="text-accent-green" /></div>
          <div>
            <p className="text-sm font-bold text-txt-primary">{emailCount}</p>
            <p className="text-[10px] text-txt-muted">Toplam mail</p>
          </div>
        </div>
      </div>

      {/* İşlemler */}
      <div className="card overflow-hidden">
        {[
          ...(isAdmin ? [{ icon: Settings, label: 'Admin Paneli', color: 'text-txt-secondary', onClick: onAdmin }] : []),
          { icon: Globe, label: 'Domain Yönetimi', color: 'text-txt-secondary', onClick: isAdmin ? onAdmin : undefined },
          ...(!isPro && !isAdmin ? [{ icon: Crown, label: 'Pro Ol', color: 'text-accent-purple', onClick: onRequestPro }] : [{ icon: Crown, label: 'Planı Yönet', color: 'text-accent-purple' }]),
          { icon: Shield, label: 'Güvenlik Merkezi', color: 'text-txt-secondary' },
        ].map((item, i) => (
          <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-surface2/50 transition-colors border-b border-brand-border/10 last:border-0">
            <item.icon size={14} className={item.color} />
            <span className="flex-1 text-xs text-txt-secondary text-left">{item.label}</span>
            <ChevronRight size={12} className="text-txt-disabled" />
          </button>
        ))}
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent-red/5 transition-colors border-t border-brand-border/10">
          <LogOut size={14} className="text-accent-red" />
          <span className="flex-1 text-xs text-accent-red text-left">Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
}
