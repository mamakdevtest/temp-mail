import { useState } from 'react';

/**
 * Tek satır adres input'u: [kullanıcıadı] @ [domain dropdown]
 * + Şifreli adresler için şifre akışı
 */
export default function AddressBar({
  currentAddress,
  loading,
  error,
  domains,
  onGenerate,
  onSubmit,
  onCopy,
}) {
  const [inputUsername, setInputUsername] = useState('');
  const [inputDomain, setInputDomain] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form gönderimi
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputUsername || !inputDomain) return;
    onSubmit(inputUsername, inputDomain, inputPassword || null);
  };

  // Domain listesi boşsa ilk domain'i seç
  const effectiveDomain = inputDomain || (domains.length > 0 ? domains[0].domain : '');

  return (
    <div className="card-glass">
      {/* ===== Mevcut adres gösterimi ===== */}
      {currentAddress ? (
        <div className="space-y-4">
          {/* Adres + Butonlar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-dark-400 mb-1">
                📧 E-posta adresiniz:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-mono font-bold text-primary-700 dark:text-primary-300 truncate select-all">
                  {currentAddress.address}
                </span>
                {currentAddress.has_password && (
                  <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                    🔒 Şifreli
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <button onClick={onCopy} className="btn-secondary text-sm" title="Adresi kopyala">
                📋 Kopyala
              </button>
              <button onClick={onGenerate} disabled={loading} className="btn-primary text-sm">
                {loading ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  '🔄 Yeni Adres'
                )}
              </button>
            </div>
          </div>

          {/* ===== Tek satır adres input (mevcut adres varken de görünür) ===== */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
            <p className="text-sm text-gray-500 dark:text-dark-400 mb-2">
              veya farklı bir adres girin:
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Ana satır: kullanıcıadı @ domain */}
              <div className="flex items-center gap-0">
                <input
                  type="text"
                  placeholder="kullaniciadi"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  className="input-field rounded-r-none border-r-0 flex-1 min-w-0"
                  pattern="[a-zA-Z0-9._-]+"
                  title="Sadece harf, rakam, nokta, tire ve alt çizgi"
                />
                <span className="px-2 py-2.5 bg-gray-100 dark:bg-dark-600 border-y border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 font-bold text-sm flex-shrink-0">
                  @
                </span>
                <select
                  value={inputDomain || effectiveDomain}
                  onChange={(e) => setInputDomain(e.target.value)}
                  className="input-field rounded-l-none border-l-0 flex-1 min-w-0 cursor-pointer"
                >
                  {domains.length === 0 && <option value="">Domain yok</option>}
                  {domains.map((d) => (
                    <option key={d.id} value={d.domain}>
                      {d.domain}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn-primary rounded-l-none ml-2 flex-shrink-0"
                  disabled={!inputUsername || (!inputDomain && domains.length === 0) || loading}
                >
                  {loading ? '⏳' : '📩 Aç'}
                </button>
              </div>

              {/* Şifre alanı (isteğe bağlı) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 transition-colors"
                >
                  {showPassword ? '🔓 Şifre gizle' : '🔐 Şifre ile giriş (opsiyonel)'}
                </button>
                {showPassword && (
                  <input
                    type="password"
                    placeholder="Şifre (kalıcı adres için)"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    className="input-field flex-1 text-sm"
                  />
                )}
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ===== Henüz adres yok - oluşturma ekranı ===== */
        <div className="text-center py-8 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <div className="text-6xl mb-4 animate-bounce-soft">⏳</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-100">
                Adres oluşturuluyor...
              </h2>
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          ) : (
            <>
              <div className="text-6xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-100">
                Geçici E-posta Adresiniz
              </h2>
              <p className="text-gray-500 dark:text-dark-400 max-w-md mx-auto">
                Tek kullanımlık bir e-posta adresi oluşturun. Gelen mailleri anında görün.
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm max-w-md mx-auto border border-red-200 dark:border-red-800">
                  ⚠️ {error}
                </div>
              )}

              {/* Rastgele adres butonu */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={onGenerate} disabled={loading} className="btn-primary text-lg px-8 py-3">
                  🚀 Rastgele Adres Oluştur
                </button>
              </div>

              {/* ===== Tek satır adres input ===== */}
              {domains.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-dark-700 max-w-lg mx-auto">
                  <p className="text-sm text-gray-500 dark:text-dark-400 mb-3">
                    veya özel adres girin:
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Ana satır: kullanıcıadı @ domain */}
                    <div className="flex items-center gap-0">
                      <input
                        type="text"
                        placeholder="kullaniciadi"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        className="input-field rounded-r-none border-r-0 flex-1 min-w-0"
                        pattern="[a-zA-Z0-9._-]+"
                        title="Sadece harf, rakam, nokta, tire ve alt çizgi"
                      />
                      <span className="px-2 py-2.5 bg-gray-100 dark:bg-dark-600 border-y border-gray-300 dark:border-dark-600 text-gray-500 dark:text-dark-400 font-bold text-sm flex-shrink-0">
                        @
                      </span>
                      <select
                        value={inputDomain || effectiveDomain}
                        onChange={(e) => setInputDomain(e.target.value)}
                        className="input-field rounded-l-none border-l-0 flex-1 min-w-0 cursor-pointer"
                      >
                        {domains.map((d) => (
                          <option key={d.id} value={d.domain}>
                            {d.domain}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="btn-primary rounded-l-none ml-2 flex-shrink-0"
                        disabled={!inputUsername || loading}
                      >
                        {loading ? '⏳' : '📩 Aç'}
                      </button>
                    </div>

                    {/* Şifre alanı */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-gray-400 dark:text-dark-500 hover:text-gray-600 dark:hover:text-dark-300 transition-colors"
                      >
                        {showPassword ? '🔓 Şifre gizle' : '🔐 Şifre ile giriş (opsiyonel)'}
                      </button>
                      {showPassword && (
                        <input
                          type="password"
                          placeholder="Şifre (kalıcı adres için)"
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          className="input-field flex-1 text-sm"
                        />
                      )}
                    </div>
                  </form>
                  <p className="text-xs text-gray-400 dark:text-dark-500 mt-2">
                    💡 Şifre koyarsanız adresiniz korunur. Aynı kullanıcı adını tekrar girince şifre istenir.
                  </p>
                </div>
              )}

              {domains.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg inline-block border border-amber-200 dark:border-amber-800">
                  ⚠️ Henüz domain eklenmemiş. Admin panelinden domain ekleyin.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
