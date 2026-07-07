import { useState, useEffect } from 'react';
import { Mail, User, Lock, ArrowRight, Shield, Crown, Eye, EyeOff, X } from 'lucide-react';
import { useLocale } from '../i18n';

export default function AuthPage({ onLogin, onRegister, onClose, onGuestContinue, defaultMode = 'login' }) {
  const { t } = useLocale();
  const [mode, setMode] = useState(defaultMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(defaultMode);
    setUsername('');
    setEmail('');
    setPassword('');
    setShowPw(false);
    setError('');
    setLoading(false);
  }, [defaultMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(username, password);
      } else {
        await onRegister(username, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const userTypes = [
    { icon: User, title: t('auth.guestMode'), text: t('auth.guestModeDesc'), tone: 'text-accent-green', bg: 'bg-accent-green/10' },
    { icon: Shield, title: t('auth.freePlan'), text: t('auth.freePlanDesc'), tone: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { icon: Crown, title: t('auth.proPlan'), text: t('auth.proPlanDesc'), tone: 'text-accent-purple', bg: 'bg-accent-purple/10' },
  ];

  return (
    <div className="auth-screen min-h-screen bg-brand-bg flex items-center justify-center p-4 relative">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-brand-surface2 border border-brand-border/30 text-txt-muted hover:text-txt-secondary hover:bg-brand-surface3 transition-colors flex items-center justify-center"
          aria-label="Kapat"
        >
          <X size={14} />
        </button>
      )}

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
            <Mail size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold"><span className="text-txt-primary">Temp</span><span className="text-accent-cyan">Mail</span></h1>
          <p className="text-xs text-txt-muted mt-1">{t('auth.title')}</p>
          <p className="text-[10px] text-txt-disabled mt-1">{t('auth.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tab */}
          <div className="flex gap-1 mb-6 p-1 bg-brand-surface2 rounded-xl">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'login' ? 'bg-accent-blue text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
              {t('auth.login')}
            </button>
            <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'register' ? 'bg-accent-blue text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
              {t('auth.register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="section-title mb-1.5 block">{t('auth.username')}</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi" className="input pl-9" autoFocus required />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="section-title mb-1.5 block">{t('auth.email')}</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" className="input pl-9" required />
                </div>
              </div>
            )}

            <div>
              <label className="section-title mb-1.5 block">{t('auth.password')}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="input pl-9 pr-9" required minLength={6} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && <p className="text-accent-red text-xs bg-accent-red/5 px-3 py-2 rounded-xl">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-sm">
              {loading ? '⏳ İşleniyor...' : mode === 'login' ? t('auth.login') : t('auth.register')}
              {!loading && <ArrowRight size={14} />}
            </button>

            {onGuestContinue && (
              <button type="button" onClick={onGuestContinue} className="btn-secondary w-full justify-center py-2.5 text-sm">
                {t('auth.guestContinue')}
              </button>
            )}
          </form>

          {mode === 'login' && (
            <p className="text-[10px] text-txt-disabled text-center mt-4">
              Admin: <code className="bg-brand-surface2 px-1 rounded">admin</code> / <code className="bg-brand-surface2 px-1 rounded">admin123</code>
            </p>
          )}
        </div>

        {/* User types */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {userTypes.map((item) => (
            <div key={item.title} className="text-center card p-3">
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mx-auto mb-2`}>
                <item.icon size={14} className={item.tone} />
              </div>
              <p className="text-[10px] font-semibold text-txt-primary">{item.title}</p>
              <p className="text-[9px] text-txt-muted mt-0.5 leading-tight">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
