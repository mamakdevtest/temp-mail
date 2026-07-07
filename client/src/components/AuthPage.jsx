import { useState } from 'react';
import { Mail, User, Lock, ArrowRight, Shield, Zap, Eye, EyeOff } from 'lucide-react';

export default function AuthPage({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center mx-auto mb-4 shadow-glow-blue">
            <Mail size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold"><span className="text-txt-primary">Temp</span><span className="text-accent-cyan">Mail</span></h1>
          <p className="text-xs text-txt-muted mt-1">Geçici e-posta, daha az spam.</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tab */}
          <div className="flex gap-1 mb-6 p-1 bg-brand-surface2 rounded-xl">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'login' ? 'bg-accent-blue text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
              Giriş Yap
            </button>
            <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${mode === 'register' ? 'bg-accent-blue text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'}`}>
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="section-title mb-1.5 block">Kullanıcı Adı</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullaniciadi" className="input pl-9" autoFocus required />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="section-title mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@email.com" className="input pl-9" required />
                </div>
              </div>
            )}

            <div>
              <label className="section-title mb-1.5 block">Şifre</label>
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
              {loading ? '⏳ İşleniyor...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-[10px] text-txt-disabled text-center mt-4">
              Admin: <code className="bg-brand-surface2 px-1 rounded">admin</code> / <code className="bg-brand-surface2 px-1 rounded">admin123</code>
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: Shield, label: 'Gizlilik Odaklı' },
            { icon: Zap, label: 'Anlık Inbox' },
            { icon: Lock, label: 'Şifre Koruması' },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <f.icon size={16} className="mx-auto mb-1 text-accent-cyan/50" />
              <p className="text-[9px] text-txt-muted">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
