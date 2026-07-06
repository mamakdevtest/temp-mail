import { useState, useEffect } from 'react';

/**
 * Adres çubuğu - username doğrudan input field olarak gösterilir
 * Kullanıcı yazarak değiştirebilir, domain dropdown ile seçebilir
 */
export default function AddressBar({ currentAddress, loading, error, domains, onGenerate, onSubmit, onCopy, onSetPassword }) {
  // Mevcut adresin username ve domain'ini input olarak kullan
  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [randPw, setRandPw] = useState('');
  const [showRandPw, setShowRandPw] = useState(false);

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

  const effectiveDomain = domain || (domains.length > 0 ? domains[0].domain : '');

  // Form gönderimi: username + domain ile adres aç
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !effectiveDomain) return;
    onSubmit(username, effectiveDomain, pw || null);
  };

  // Rastgele oluştur
  const handleRandom = () => {
    onGenerate(randPw || null);
    setRandPw('');
    setShowRandPw(false);
  };

  // Username/domain değiştiyse ve mevcut adresten farklıysa, "Değiştir" butonu göster
  const isModified = currentAddress && (
    username !== currentAddress.address.split('@')[0] ||
    effectiveDomain !== currentAddress.address.split('@')[1]
  );

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
      {/* ===== ANA ADRES ALANI ===== */}
      <div className="px-5 py-6 text-center border-b border-gray-100 dark:border-dark-700">
        <p className="text-[11px] text-gray-400 dark:text-dark-500 uppercase tracking-widest font-medium mb-3">E-posta adresiniz</p>

        {/* Adres input: username @ domain */}
        <form onSubmit={handleSubmit} className="flex items-stretch justify-center max-w-lg mx-auto">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
            placeholder="kullaniciadi"
            className="flex-1 min-w-0 text-right px-3 py-2.5 text-xl sm:text-2xl font-mono font-bold text-gray-900 dark:text-dark-50 bg-transparent border-2 border-r-0 border-gray-200 dark:border-dark-600 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none tracking-tight placeholder:text-gray-300 dark:placeholder:text-dark-600"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="flex items-center px-1 text-xl sm:text-2xl font-mono font-bold text-gray-400 dark:text-dark-500 bg-transparent border-y-2 border-gray-200 dark:border-dark-600">@</span>
          <select
            value={effectiveDomain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1 min-w-0 text-left px-2 py-2.5 text-xl sm:text-2xl font-mono font-bold text-primary-600 dark:text-primary-400 bg-transparent border-2 border-l-0 border-gray-200 dark:border-dark-600 rounded-r-xl cursor-pointer focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
          >
            {domains.length === 0 && <option value="">domain yok</option>}
            {domains.map((d) => <option key={d.id} value={d.domain}>{d.domain}</option>)}
          </select>
        </form>

        {/* Hata */}
        {error && (
          <p className="text-red-500 dark:text-red-400 text-xs mt-2 animate-slide-up">⚠️ {error}</p>
        )}

        {/* Badge */}
        {currentAddress?.has_password && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700 mt-2">
            🔒 Şifreli
          </span>
        )}
      </div>

      {/* ===== BUTONLAR ===== */}
      <div className="px-5 py-3 flex items-center justify-center gap-2 flex-wrap">
        {/* Değiştir butonu (eğer username/domain değiştirildiyse) */}
        {isModified ? (
          <button
            onClick={handleSubmit}
            disabled={loading || !username || !effectiveDomain}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? '⏳' : '📩'} {loading ? 'Açılıyor...' : 'Bu Adresi Aç'}
          </button>
        ) : (
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors shadow-sm"
          >
            📋 Kopyala
          </button>
        )}

        <button
          onClick={handleRandom}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-dark-200 border border-gray-200 dark:border-dark-600 transition-colors disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} Rastgele
        </button>

        {currentAddress && !currentAddress.has_password && (
          <button
            onClick={onSetPassword}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-dark-200 border border-gray-200 dark:border-dark-600 transition-colors"
          >
            🔒 Şifre Koy
          </button>
        )}

        {/* Rastgele şifre toggle */}
        <button
          onClick={() => setShowRandPw(!showRandPw)}
          className="text-[11px] text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 ml-1"
        >
          {showRandPw ? '🔓' : '🔐'}
        </button>
      </div>

      {/* Şifre alanı (rastgele oluştururken) */}
      {showRandPw && (
        <div className="px-5 pb-3 -mt-1 max-w-xs mx-auto animate-slide-up">
          <input
            type="password"
            value={randPw}
            onChange={(e) => setRandPw(e.target.value)}
            placeholder="Rastgele oluştururken şifre koy"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-800 dark:text-dark-100 text-center focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      )}

      {/* Şifre alanı (özel adres açarken) */}
      {showPw && (
        <div className="px-5 pb-3 -mt-1 max-w-lg mx-auto animate-slide-up">
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Şifre (opsiyonel)"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-800 dark:text-dark-100 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </form>
        </div>
      )}

      {/* Loading durumu */}
      {loading && !currentAddress && (
        <div className="px-5 py-6 text-center border-t border-gray-100 dark:border-dark-700">
          <div className="flex justify-center gap-1.5">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-gray-400 dark:text-dark-500 mt-2">Adres oluşturuluyor...</p>
        </div>
      )}

      {/* Domain yok uyarısı */}
      {domains.length === 0 && !loading && (
        <div className="px-5 py-3 text-center border-t border-gray-100 dark:border-dark-700">
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg inline-block border border-amber-200 dark:border-amber-800">
            ⚠️ Henüz domain eklenmemiş. Admin panelinden domain ekleyin.
          </p>
        </div>
      )}
    </div>
  );
}
