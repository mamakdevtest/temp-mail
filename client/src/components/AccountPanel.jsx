import { User, Crown, Globe, Settings, Shield, LogOut, ChevronRight, HardDrive, Zap } from 'lucide-react';

export default function AccountPanel({ username = 'Kullanıcı', plan = 'Ücretsiz', activeDomain, storageUsed = '0 MB', storageTotal = '500 MB', storagePercent = 0, emailCount = 0, onLogout, onAdmin }) {
  const initial = (username || 'K')[0].toUpperCase();

  return (
    <div className="space-y-4">
      {/* Başlık */}
      <div className="flex items-center gap-2 mb-1">
        <User size={14} className="text-txt-muted" />
        <span className="section-title">Hesap</span>
      </div>

      {/* Profil Kartı */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-txt-primary truncate">{username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span className="text-[10px] text-txt-muted">{plan}</span>
            </div>
          </div>
          <div className="text-txt-muted"><Settings size={14} /></div>
        </div>
      </div>

      {/* Plan Kartı */}
      <div className="card p-4 border-accent-purple/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-purple/15 flex items-center justify-center flex-shrink-0">
            <Crown size={14} className="text-accent-purple" />
          </div>
          <div>
            <p className="text-xs font-semibold text-accent-purple">{plan} Plan</p>
            <p className="text-[10px] text-txt-muted mt-0.5 leading-relaxed">
              Özel alan adları, daha fazla inbox, gelişmiş gizlilik ve öncelikli destek.
            </p>
          </div>
        </div>
      </div>

      {/* Kullanım Kartı */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-txt-muted uppercase tracking-wider">Kullanım</span>
          <span className="text-[10px] text-txt-muted">{storageUsed} / {storageTotal}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-1.5 bg-brand-surface2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan transition-all duration-500" style={{ width: `${storagePercent}%` }} />
            </div>
            <p className="text-[9px] text-txt-muted mt-1">Kullanılan depolama</p>
          </div>
          {/* Dairesel progress */}
          <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-brand-surface2" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${storagePercent * 1.13} 113`} />
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2F80FF" /><stop offset="100%" stopColor="#30D5FF" /></linearGradient></defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-txt-primary">{storagePercent}%</span>
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
          <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center">
            <Zap size={14} className="text-accent-green" />
          </div>
          <div>
            <p className="text-sm font-bold text-txt-primary">{emailCount}</p>
            <p className="text-[10px] text-txt-muted">Toplam alınan mail</p>
          </div>
        </div>
      </div>

      {/* Hesap İşlemleri */}
      <div className="card overflow-hidden">
        {[
          { icon: Settings, label: 'Hesap Ayarları', color: 'text-txt-secondary' },
          { icon: Globe, label: 'Domain Yönetimi', color: 'text-txt-secondary', onClick: onAdmin },
          { icon: Crown, label: 'Planı Yönet', color: 'text-accent-purple' },
          { icon: Shield, label: 'Güvenlik Merkezi', color: 'text-txt-secondary' },
        ].map((item, i) => (
          <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-brand-surface2/50 transition-colors border-b border-brand-border/20 last:border-0">
            <item.icon size={14} className={item.color} />
            <span className="flex-1 text-xs text-txt-secondary text-left">{item.label}</span>
            <ChevronRight size={12} className="text-txt-disabled" />
          </button>
        ))}
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent-red/5 transition-colors border-t border-brand-border/20">
          <LogOut size={14} className="text-accent-red" />
          <span className="flex-1 text-xs text-accent-red text-left">Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
}
