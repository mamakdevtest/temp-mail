import { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, Lock, Unlock, ChevronDown, Clock, KeyRound } from 'lucide-react';

export default function AddressBar({ currentAddress, loading, error, domains, history, onGenerate, onSubmit, onCopy, onSetPassword }) {
  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [randPw, setRandPw] = useState('');
  const [showRandPw, setShowRandPw] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef(null);

  // currentAddress değiştiğinde input'ları güncelle
  useEffect(() => {
    if (currentAddress?.address) {
      const [u, d] = currentAddress.address.split('@');
      setUsername(u);
      if (d) setDomain(d);
    }
  }, [currentAddress]);

  // Domain listesi yüklendiğinde ilk domain'i seç
  useEffect(() => {
    if (domains.length > 0 && !domain) {
      setDomain(domains[0].domain);
    }
  }, [domains, domain]);

  // Dışarı tıklayınca geçmiş dropdown'ını kapat
  useEffect(() => {
    const handler = (e) => { if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const effectiveDomain = domain || (domains.length > 0 ? domains[0].domain : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !effectiveDomain) return;
    onSubmit(username, effectiveDomain, pw || null);
    setShowHistory(false);
  };

  const handleRandom = () => {
    onGenerate(randPw || null);
    setRandPw('');
    setShowRandPw(false);
  };

  // Geçmişten adres seç
  const selectHistory = (entry) => {
    const [u, d] = entry.address.split('@');
    setUsername(u);
    if (d) setDomain(d);
    setPw('');
    setShowHistory(false);
    // Otomatik aç
    onSubmit(u, d, null);
  };

  const isModified = currentAddress && (
    username !== currentAddress.address.split('@')[0] ||
    effectiveDomain !== currentAddress.address.split('@')[1]
  );

  // Tarih formatla
  const fmtTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200/50 dark:border-dark-700/50 shadow-sm">
      {/* ===== ANA ADRES ALANI ===== */}
      <div className="px-5 py-5 text-center border-b border-gray-100 dark:border-dark-700">
        <p className="text-[10px] text-gray-400 dark:text-dark-500 uppercase tracking-widest font-medium mb-3">E-posta adresiniz</p>

        {/* Adres input: username @ domain - tıklanabilir olduğunu belirten animasyonlu border */}
        <form onSubmit={handleSubmit} className="flex items-stretch justify-center max-w-lg mx-auto group">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
            placeholder="kullaniciadi"
            className="flex-1 min-w-0 text-right px-3 py-2 text-lg sm:text-xl font-mono font-bold text-gray-900 dark:text-dark-50 bg-transparent border-2 border-r-0 border-gray-200 dark:border-dark-600 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none tracking-tight placeholder:text-gray-300 dark:placeholder:text-dark-600 transition-all duration-300 hover:border-primary-400 dark:hover:border-primary-500"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="flex items-center px-1 text-lg sm:text-xl font-mono font-bold text-gray-400 dark:text-dark-500 bg-transparent border-y-2 border-gray-200 dark:border-dark-600 transition-all duration-300 group-hover:border-primary-400 dark:group-hover:border-primary-500">@</span>
          <select
            value={effectiveDomain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1 min-w-0 text-left px-2 py-2 text-lg sm:text-xl font-mono font-bold text-primary-600 dark:text-primary-400 bg-transparent border-2 border-l-0 border-gray-200 dark:border-dark-600 rounded-r-xl cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none appearance-none transition-all duration-300 hover:border-primary-400 dark:hover:border-primary-500"
          >
            {domains.length === 0 && <option value="">domain yok</option>}
            {domains.map((d) => <option key={d.id} value={d.domain}>{d.domain}</option>)}
          </select>
        </form>
        {/* İpucu: tıkla ve düzenle */}
        <p className="text-[9px] text-gray-300 dark:text-dark-600 mt-2 flex items-center justify-center gap-1 animate-pulse-soft">
          <span className="inline-block w-1 h-1 rounded-full bg-primary-400 dark:bg-primary-500" />
          Düzenlemek için tıklayın
          <span className="inline-block w-1 h-1 rounded-full bg-primary-400 dark:bg-primary-500" />
        </p>

        {/* Hata */}
        {error && <p className="text-red-500 dark:text-red-400 text-xs mt-2 animate-slide-up">⚠️ {error}</p>}

        {/* Badge */}
        {currentAddress?.has_password && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 mt-2">
            <Lock size={10} /> Şifreli
          </span>
        )}
      </div>

      {/* ===== BUTONLAR ===== */}
      <div className="px-5 py-2.5 flex items-center justify-center gap-2 flex-wrap">
        {isModified ? (
          <button onClick={handleSubmit} disabled={loading || !username || !effectiveDomain} className="btn-primary text-xs disabled:opacity-50">
            {loading ? '⏳ Açılıyor...' : '📩 Bu Adresi Aç'}
          </button>
        ) : (
          <button onClick={onCopy} className="btn-primary text-xs">
            <Copy size={12} /> Kopyala
          </button>
        )}

        <button onClick={handleRandom} disabled={loading} className="btn-secondary text-xs disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Rastgele
        </button>

        {currentAddress && !currentAddress.has_password && (
          <button onClick={onSetPassword} className="btn-secondary text-xs">
            <Lock size={12} /> Şifre Koy
          </button>
        )}

        <button onClick={() => setShowRandPw(!showRandPw)} className="p-1.5 rounded-lg text-gray-400 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors" title={showRandPw ? 'Şifre gizle' : 'Şifre ile oluştur'}>
          {showRandPw ? <Unlock size={14} /> : <KeyRound size={14} />}
        </button>

        {/* Geçmiş dropdown */}
        {history && history.length > 0 && (
          <div className="relative" ref={historyRef}>
            <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary text-xs">
              <Clock size={12} /> Geçmiş <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            </button>
            {showHistory && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-dark-800 rounded-xl border border-gray-200/50 dark:border-dark-700/50 shadow-xl z-50 overflow-hidden animate-slide-up">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-dark-700">
                  <p className="text-[10px] text-gray-400 dark:text-dark-500 uppercase tracking-wider font-medium">Son Kullanılan Adresler</p>
                </div>
                <div className="max-h-[250px] overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700/50">
                  {history.map((h) => (
                    <button key={h.address} onClick={() => selectHistory(h)} className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-50/50 dark:hover:bg-dark-700/50 transition-colors text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono font-medium text-gray-800 dark:text-dark-100 truncate">{h.address}</p>
                        <p className="text-[9px] text-gray-400 dark:text-dark-500">{fmtTime(h.ts)}</p>
                      </div>
                      {h.has_password && (
                        <Lock size={10} className="text-purple-500 dark:text-purple-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Şifre alanı (rastgele oluştururken) */}
      {showRandPw && (
        <div className="px-5 pb-3 -mt-1 max-w-xs mx-auto animate-slide-up">
          <input type="password" value={randPw} onChange={(e) => setRandPw(e.target.value)} placeholder="Şifre belirleyin" className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-dark-600 rounded-xl bg-white dark:bg-dark-700 text-gray-800 dark:text-dark-100 text-center focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      )}

      {/* Şifre alanı (özel adres açarken) */}
      {showPw && (
        <div className="px-5 pb-3 -mt-1 max-w-lg mx-auto animate-slide-up">
          <form onSubmit={handleSubmit}>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Şifre (opsiyonel)" className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-dark-600 rounded-xl bg-white dark:bg-dark-700 text-gray-800 dark:text-dark-100 focus:ring-2 focus:ring-primary-500 outline-none" />
          </form>
        </div>
      )}

      {/* Loading durumu */}
      {loading && !currentAddress && (
        <div className="px-5 py-5 text-center border-t border-gray-100 dark:border-dark-700">
          <div className="flex justify-center gap-1.5">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-[10px] text-gray-400 dark:text-dark-500 mt-2">Adres oluşturuluyor...</p>
        </div>
      )}

      {/* Domain yok uyarısı */}
      {domains.length === 0 && !loading && (
        <div className="px-5 py-3 text-center border-t border-gray-100 dark:border-dark-700">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl inline-block">
            Henüz domain eklenmemiş. Admin panelinden domain ekleyin.
          </p>
        </div>
      )}
    </div>
  );
}
