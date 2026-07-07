import { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, Lock, Unlock, ChevronDown, Clock, KeyRound, Shield, Shuffle, CheckCircle2 } from 'lucide-react';

export default function AddressBar({ currentAddress, loading, error, domains, history, onGenerate, onSubmit, onCopy, onSetPassword }) {
  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [randPw, setRandPw] = useState('');
  const [showRandPw, setShowRandPw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const historyRef = useRef(null);

  useEffect(() => {
    if (currentAddress?.address) {
      const [u, d] = currentAddress.address.split('@');
      setUsername(u);
      if (d) setDomain(d);
    }
  }, [currentAddress]);

  useEffect(() => {
    if (domains.length > 0 && !domain) setDomain(domains[0].domain);
  }, [domains, domain]);

  useEffect(() => {
    const handler = (e) => { if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const effectiveDomain = domain || (domains.length > 0 ? domains[0].domain : '');
  const handleSubmit = (e) => { e.preventDefault(); if (!username || !effectiveDomain) return; onSubmit(username, effectiveDomain, pw || null); setShowHistory(false); };
  const handleRandom = () => { onGenerate(randPw || null); setRandPw(''); setShowRandPw(false); };
  const selectHistory = (entry) => { const [u, d] = entry.address.split('@'); setUsername(u); if (d) setDomain(d); setPw(''); setShowHistory(false); onSubmit(u, d, null); };
  const handleCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const isModified = currentAddress && (username !== currentAddress.address.split('@')[0] || effectiveDomain !== currentAddress.address.split('@')[1]);
  const fmtTime = (ts) => { const d = new Date(ts), now = new Date(), diff = now - d; if (diff < 60000) return 'az önce'; if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}s`; return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }); };

  return (
    <div className="card overflow-hidden">
      {/* Hero */}
      <div className="px-6 py-6 border-b border-brand-border/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Sol: Email adresi */}
          <div className="flex-1 min-w-0">
            <p className="section-title mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              GEÇİCİ E-POSTA ADRESİNİZ
            </p>

            {/* Email input */}
            <form onSubmit={handleSubmit} className="flex items-stretch max-w-xl group">
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))} placeholder="kullaniciadi"
                className="flex-1 min-w-0 text-right px-4 py-3 text-xl sm:text-2xl font-mono font-bold text-txt-primary bg-brand-surface2 border-2 border-r-0 border-brand-border/40 rounded-l-2xl focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue/50 outline-none transition-all duration-300 hover:border-brand-border2 placeholder:text-txt-disabled" spellCheck={false} autoComplete="off" />
              <span className="flex items-center px-2 text-xl sm:text-2xl font-mono font-bold text-accent-cyan bg-brand-surface2 border-y-2 border-brand-border/40">@</span>
              <select value={effectiveDomain} onChange={(e) => setDomain(e.target.value)}
                className="flex-1 min-w-0 text-left px-3 py-3 text-xl sm:text-2xl font-mono font-bold text-accent-cyan bg-brand-surface2 border-2 border-l-0 border-brand-border/40 rounded-r-2xl cursor-pointer focus:ring-2 focus:ring-accent-blue/30 outline-none appearance-none transition-all duration-300 hover:border-brand-border2">
                {domains.length === 0 && <option value="">domain yok</option>}
                {domains.map((d) => <option key={d.id} value={d.domain}>{d.domain}</option>)}
              </select>
            </form>

            {/* Durum */}
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-accent-green" />
                <span className="text-[10px] text-accent-green">Adresiniz aktif ve kullanıma hazır</span>
              </div>
              {currentAddress?.has_password && <span className="badge-purple text-[9px]"><Lock size={9} /> Şifreli</span>}
            </div>
            {error && <p className="text-accent-red text-[11px] mt-2">{error}</p>}
          </div>

          {/* Sağ: Güvenlik kutusu */}
          <div className="w-full lg:w-64 flex-shrink-0 p-4 rounded-xl bg-gradient-to-br from-accent-cyan/5 to-accent-teal/5 border border-accent-cyan/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-accent-cyan" />
              <span className="text-xs font-semibold text-accent-cyan">Güvenli ve Anonim</span>
            </div>
            <p className="text-[10px] text-txt-muted leading-relaxed">E-postalarınız gizlilik odaklı şekilde alınır ve oturumunuz korunur.</p>
          </div>
        </div>
      </div>

      {/* Aksiyonlar */}
      <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
        {isModified ? (
          <button onClick={handleSubmit} disabled={loading || !username || !effectiveDomain} className="btn-primary">{loading ? '⏳' : '📩'} Bu Adresi Aç</button>
        ) : (
          <button onClick={handleCopy} className={`btn-primary ${copied ? '!bg-accent-green/20 !text-accent-green' : ''}`}>
            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />} {copied ? 'Kopyalandı' : 'Kopyala'}
          </button>
        )}
        <button onClick={handleRandom} disabled={loading} className="btn-secondary"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Yenile</button>
        <button onClick={handleRandom} disabled={loading} className="btn-secondary"><Shuffle size={12} /> Rastgele</button>
        {currentAddress && !currentAddress.has_password && (
          <button onClick={onSetPassword} className="btn-secondary relative">
            <Lock size={12} /> Şifre Koru
            <span className="badge-purple text-[7px] absolute -top-1.5 -right-1.5 px-1 py-0">PRO</span>
          </button>
        )}

        {/* Geçmiş */}
        {history?.length > 0 && (
          <div className="relative ml-auto" ref={historyRef}>
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary">
              <Clock size={12} /> Geçmiş <ChevronDown size={12} className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="absolute right-0 top-full mt-1 w-80 card p-0 z-50 animate-slide-down shadow-lg">
                <div className="px-3 py-2 border-b border-brand-border/20"><span className="section-title">Son Kullanılan Adresler</span></div>
                <div className="max-h-[280px] overflow-y-auto">
                  {history.map((h) => (
                    <button key={h.address} onClick={() => selectHistory(h)} className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-brand-surface2/50 transition-colors text-left border-b border-brand-border/10 last:border-0">
                      <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0 text-accent-blue font-mono text-[10px] font-bold">{h.address[0].toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono font-medium text-txt-primary truncate">{h.address}</p>
                        <p className="text-[9px] text-txt-muted">{fmtTime(h.ts)}</p>
                      </div>
                      {h.has_password && <Lock size={10} className="text-accent-purple flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Şifre alanı */}
      {showRandPw && (
        <div className="px-6 pb-3 -mt-1 max-w-xs animate-slide-up">
          <input type="password" value={randPw} onChange={(e) => setRandPw(e.target.value)} placeholder="Şifre belirleyin" className="input text-center text-xs" />
        </div>
      )}
      {showPw && (
        <div className="px-6 pb-3 -mt-1 max-w-lg animate-slide-up">
          <form onSubmit={handleSubmit}><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Şifre (opsiyonel)" className="input text-xs" /></form>
        </div>
      )}

      {/* Loading */}
      {loading && !currentAddress && (
        <div className="px-6 py-5 text-center border-t border-brand-border/20">
          <div className="flex justify-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-[10px] text-txt-muted mt-2">Adres oluşturuluyor...</p>
        </div>
      )}

      {domains.length === 0 && !loading && (
        <div className="px-6 py-3 text-center border-t border-brand-border/20">
          <p className="text-[10px] text-accent-red/80 bg-accent-red/5 px-3 py-2 rounded-xl inline-block">Henüz domain eklenmemiş. Admin panelinden domain ekleyin.</p>
        </div>
      )}
    </div>
  );
}
