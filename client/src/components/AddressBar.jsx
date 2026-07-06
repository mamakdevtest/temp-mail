import { useState } from 'react';

export default function AddressBar({
  currentAddress,
  timeRemaining,
  loading,
  error,
  domains,
  onGenerate,
  onCustomCreate,
  onCopy,
  onLogin,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [loginAddress, setLoginAddress] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customUsername || !customDomain) return;
    onCustomCreate(customUsername, customDomain, customPassword || null);
    setShowCustom(false);
    setCustomUsername('');
    setCustomPassword('');
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!loginAddress || !loginPassword) return;
    setLoginError('');
    onLogin(loginAddress, loginPassword);
  };

  return (
    <div className="card">
      {/* Mevcut adres gösterimi */}
      {currentAddress ? (
        <div className="space-y-4">
          {/* Adres + Butonlar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-1">
                {currentAddress.is_persistent ? '🔒 Kalıcı e-posta adresiniz:' : 'Geçici e-posta adresiniz:'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold text-primary-700 truncate select-all">
                  {currentAddress.address}
                </span>
                {currentAddress.is_persistent && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                    🔒 Kalıcı
                  </span>
                )}
                {timeRemaining && !currentAddress.is_persistent && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                      timeRemaining === 'Süresi doldu'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    ⏱ {timeRemaining}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onCopy} className="btn-secondary" title="Adresi kopyala">
                📋 Kopyala
              </button>
              <button onClick={onGenerate} disabled={loading} className="btn-primary">
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  '🔄 Yeni Adres'
                )}
              </button>
            </div>
          </div>

          {/* Özel adres oluşturma toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {showCustom ? '▼ Gizle' : '▶ Özel adres oluştur'}
            </button>

            {showCustom && (
              <form onSubmit={handleCustomSubmit} className="mt-3 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="kullaniciadi"
                    value={customUsername}
                    onChange={(e) => setCustomUsername(e.target.value)}
                    className="input-field flex-1"
                    pattern="[a-zA-Z0-9._-]+"
                    title="Sadece harf, rakam, nokta, tire ve alt çizgi"
                  />
                  <span className="hidden sm:flex items-center text-gray-500 font-bold">@</span>
                  <select
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="">Domain seçin</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.domain}>
                        {d.domain}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary" disabled={!customUsername || !customDomain}>
                    Oluştur
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Şifre (isteğe bağlı - kalıcı adres için)"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="input-field flex-1"
                  />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    💡 Şifre koyarsanız adres kalıcı olur
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Henüz adres yok - oluşturma ekranı */
        <div className="text-center py-8 space-y-4">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800">Geçici E-posta Adresiniz</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Tek kullanımlık bir e-posta adresi oluşturun. Gelen mailleri anında görün.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md mx-auto">
              ⚠️ {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={onGenerate} disabled={loading} className="btn-primary text-lg px-8 py-3">
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                '🚀 Rastgele Adres Oluştur'
              )}
            </button>
          </div>

          {domains.length > 0 && (
            <div className="pt-4 border-t max-w-md mx-auto">
              <p className="text-sm text-gray-500 mb-2">veya özel adres oluşturun:</p>
              <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="kullaniciadi"
                  value={customUsername}
                  onChange={(e) => setCustomUsername(e.target.value)}
                  className="input-field flex-1"
                />
                <span className="hidden sm:flex items-center text-gray-500">@</span>
                <select
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="input-field flex-1"
                >
                  <option value="">Domain seçin</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain}>
                      {d.domain}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" disabled={!customUsername || !customDomain}>
                  Oluştur
                </button>
              </form>
              <div className="mt-2">
                <input
                  type="password"
                  placeholder="Şifre (isteğe bağlı - kalıcı adres için)"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  💡 Şifre koyarsanız adres kalıcı olur ve aynı şifreyle geri dönebilirsiniz
                </p>
              </div>
            </div>
          )}

          {/* Giriş Yap Bölümü */}
          <div className="pt-4 border-t max-w-md mx-auto">
            <button
              onClick={() => setShowLogin(!showLogin)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {showLogin ? '▼ Gizle' : '🔐 Kalıcı adresime giriş yap'}
            </button>

            {showLogin && (
              <form onSubmit={handleLoginSubmit} className="mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="adres@domain.com"
                  value={loginAddress}
                  onChange={(e) => setLoginAddress(e.target.value)}
                  className="input-field w-full"
                />
                <input
                  type="password"
                  placeholder="Şifreniz"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="input-field w-full"
                />
                {loginError && (
                  <p className="text-red-500 text-sm">{loginError}</p>
                )}
                <button type="submit" className="btn-primary w-full" disabled={!loginAddress || !loginPassword}>
                  🔓 Giriş Yap
                </button>
              </form>
            )}
          </div>

          {domains.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg inline-block">
              ⚠️ Henüz domain eklenmemiş. Admin panelinden domain ekleyin.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
