import { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, Lock, ChevronDown, Clock, Shield, Shuffle, CheckCircle2, Sparkles, Globe2, ChevronRight } from 'lucide-react';

export default function AddressBar({ currentAddress, loading, error, domains, history, onGenerate, onSubmit, onCopy, onSetPassword, isPro }) {
  const [username, setUsername] = useState('');
  const [selectedFullDomain, setSelectedFullDomain] = useState('');
  const [pw, setPw] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState({});
  const historyRef = useRef(null);
  const domainRef = useRef(null);
  const dropdownRef = useRef(null);

  // Seçili domain bilgisini bul
  const findDomainInfo = (fullDomain) => {
    if (!fullDomain) return null;
    for (const d of domains) {
      if (fullDomain === d.domain) {
        return { mainDomain: d.domain, subdomain: null, domainId: d.id };
      }
      if (d.subdomains) {
        for (const sub of d.subdomains) {
          if (fullDomain === sub.full_domain) {
            return { mainDomain: d.domain, subdomain: sub.name, domainId: d.id, subdomainId: sub.id };
          }
        }
      }
    }
    return null;
  };

  const domainInfo = findDomainInfo(selectedFullDomain);
  const displayDomain = selectedFullDomain || (domains.length > 0 ? domains[0].domain : '');

  useEffect(() => {
    if (currentAddress?.address) {
      const [u, d] = currentAddress.address.split('@');
      setUsername(u);
      if (d) {
        setSelectedFullDomain(d);
      }
    }
  }, [currentAddress]);

  useEffect(() => {
    if (domains.length > 0 && !selectedFullDomain) {
      setSelectedFullDomain(domains[0].domain);
    }
  }, [domains, selectedFullDomain]);

  useEffect(() => {
    const handler = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false);
      if (domainRef.current && !domainRef.current.contains(e.target)) setShowDomainMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (showDomainMenu && dropdownRef.current) {
      dropdownRef.current.style.top = '100%';
      dropdownRef.current.style.bottom = 'auto';
      dropdownRef.current.style.marginTop = '12px';
      dropdownRef.current.style.marginBottom = '0';
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      if (rect.bottom > viewportHeight - 20) {
        dropdownRef.current.style.top = 'auto';
        dropdownRef.current.style.bottom = '100%';
        dropdownRef.current.style.marginBottom = '12px';
        dropdownRef.current.style.marginTop = '0';
      }
    }
  }, [showDomainMenu]);

  const currentAddrDomain = currentAddress?.address?.split('@')[1] || '';
  const isModified = currentAddress && (
    username !== currentAddress.address.split('@')[0] ||
    selectedFullDomain !== currentAddrDomain
  );

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!username || !selectedFullDomain) return;
    const info = findDomainInfo(selectedFullDomain);
    if (!info) return;
    onSubmit(username, info.mainDomain, pw || null, info.subdomain);
    setShowHistory(false);
  };

  const handleRandom = () => onGenerate(null);

  const selectHistory = (entry) => {
    const [u, d] = entry.address.split('@');
    setUsername(u);
    if (d) setSelectedFullDomain(d);
    setPw('');
    setShowHistory(false);
    const info = findDomainInfo(d);
    onSubmit(u, info?.mainDomain || d, null, info?.subdomain || null);
  };

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const fmtTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}s`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
  };

  const selectDomain = (fullDomain) => {
    setSelectedFullDomain(fullDomain);
    setShowDomainMenu(false);
  };

  const toggleExpand = (domainId) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId],
    }));
  };

  // Subdomain'i parent domain olarak seçen ana domaini otomatik展开 et
  useEffect(() => {
    if (selectedFullDomain && domainInfo?.subdomain) {
      setExpandedDomains(prev => ({
        ...prev,
        [domainInfo.domainId]: true,
      }));
    }
  }, [selectedFullDomain, domainInfo]);

  return (
    <div className="card px-5 py-6 sm:px-7 sm:py-8 bg-[radial-gradient(circle_at_0%_0%,rgba(122,99,255,0.22),transparent_32%),radial-gradient(circle_at_100%_100%,rgba(52,215,255,0.12),transparent_30%)]">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          <div className="text-center space-y-2">
            <p className="section-title">Geçici E-Posta Adresiniz</p>
            <p className="text-sm text-txt-secondary">Adresiniz anında aktif olur, mailler aşağıdaki gelen kutusuna düşer.</p>
          </div>

          <div className="relative z-50 max-w-[860px] mx-auto">
            <div className="panel-soft rounded-[26px] p-2 border-brand-border/70 shadow-panel">
              <div className="grid grid-cols-[1fr_72px] gap-2 items-center">
                <form onSubmit={handleSubmit} className="relative z-50 min-w-0 rounded-[22px] bg-brand-bg/70 border border-brand-border/40 px-4 py-4 sm:px-6 sm:py-5 isolate">
                  <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 flex-nowrap overflow-visible">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
                      placeholder="kullaniciadi"
                      className="min-w-0 flex-[1_1_180px] bg-transparent text-right text-xl sm:text-[2.15rem] font-bold tracking-tight text-white outline-none placeholder:text-txt-disabled truncate"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <span className="shrink-0 text-xl sm:text-[2.15rem] font-bold text-accent-red">@</span>
                    <div className="relative z-20 min-w-0 flex-[1_1_320px]" ref={domainRef}>
                      <button
                        type="button"
                        onClick={() => setShowDomainMenu((v) => !v)}
                        className="w-full min-w-0 inline-flex items-center gap-2 rounded-2xl border border-brand-border/50 bg-brand-surface2/45 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:bg-brand-surface2/65 transition-colors"
                      >
                        <Globe2 size={16} className="shrink-0 text-accent-cyan" />
                        <span className="min-w-0 flex-1 truncate text-xl sm:text-[2.15rem] font-bold tracking-tight text-accent-cyan">
                          {displayDomain || 'domain'}
                        </span>
                        <ChevronDown size={16} className={`shrink-0 text-txt-muted transition-transform ${showDomainMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showDomainMenu && (
                        <div
                          ref={dropdownRef}
                          className="absolute left-0 right-0 top-full mt-3 z-[999] card p-2 animate-slide-down shadow-panel"
                        >
                          <div className="px-3 py-2 border-b border-brand-border/20">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-txt-muted">Domain Seçin</p>
                          </div>
                          <div className="max-h-[320px] overflow-y-auto py-2">
                            {domains.length === 0 ? (
                              <div className="px-3 py-3 text-sm text-txt-muted">Henüz domain yok</div>
                            ) : domains.map((item) => {
                              const hasSubdomains = item.subdomains && item.subdomains.length > 0;
                              const isExpanded = expandedDomains[item.id];
                              const isMainSelected = selectedFullDomain === item.domain;

                              return (
                                <div key={item.id}>
                                  {/* Ana Domain */}
                                  <div className="flex items-center">
                                    {hasSubdomains && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(item.id);
                                        }}
                                        className="p-1 rounded-lg hover:bg-brand-surface2/70 transition-colors mr-1"
                                      >
                                        <ChevronRight
                                          size={14}
                                          className={`text-txt-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => selectDomain(item.domain)}
                                      className={`flex-1 rounded-xl px-3 py-2.5 text-left transition-colors ${isMainSelected ? 'bg-accent-blue/10 border border-accent-blue/20' : 'hover:bg-brand-surface2/70 border border-transparent'}`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold text-accent-cyan truncate">{item.domain}</p>
                                          <p className="text-[11px] text-txt-muted mt-0.5">Ana Domain</p>
                                        </div>
                                        {isMainSelected ? <span className="badge-blue text-[9px]">Seçili</span> : null}
                                      </div>
                                    </button>
                                  </div>

                                  {/* Subdomain'ler */}
                                  {hasSubdomains && isExpanded && (
                                    <div className="ml-6 border-l-2 border-brand-border/30 pl-2 mt-1 mb-2 space-y-1">
                                      {item.subdomains.map((sub) => {
                                        const isSubSelected = selectedFullDomain === sub.full_domain;
                                        return (
                                          <button
                                            key={sub.id}
                                            type="button"
                                            onClick={() => selectDomain(sub.full_domain)}
                                            className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${isSubSelected ? 'bg-accent-purple/10 border border-accent-purple/20' : 'hover:bg-brand-surface2/70 border border-transparent'}`}
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="min-w-0">
                                                <p className="text-sm font-medium text-txt-primary truncate">{sub.full_domain}</p>
                                                <p className="text-[10px] text-txt-muted mt-0.5">{sub.name}.{item.domain}</p>
                                              </div>
                                              {isSubSelected ? <span className="badge-purple text-[9px]">Seçili</span> : null}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Subdomain desteği var ama subdomain yok */}
                                  {item.wildcard_subdomains === 1 && (!item.subdomains || item.subdomains.length === 0) && (
                                    <div className="ml-6 pl-2 mt-1 mb-2">
                                      <p className="text-[10px] text-txt-muted italic">Henüz subdomain eklenmemiş</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </form>

                <button onClick={handleCopy} className={`relative z-0 h-[72px] rounded-[22px] panel-soft border-brand-border/70 flex items-center justify-center transition-all ${copied ? 'text-accent-green' : 'text-txt-secondary hover:text-white'}`}>
                  {copied ? <CheckCircle2 size={24} /> : <Copy size={22} />}
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-0 flex flex-wrap items-center justify-center gap-3">
            {isModified ? (
              <button onClick={handleSubmit} disabled={loading || !username || !selectedFullDomain} className="btn-primary min-w-[160px]">
                {loading ? 'Hazırlanıyor...' : 'Bu Adresi Aç'}
              </button>
            ) : (
              <button onClick={handleCopy} className={`btn-primary min-w-[160px] ${copied ? '!from-accent-green !to-accent-green !border-accent-green/30' : ''}`}>
                <Copy size={15} /> {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            )}
            <button onClick={handleRandom} disabled={loading} className="btn-secondary min-w-[130px]"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Yenile</button>
            <button onClick={handleRandom} disabled={loading} className="btn-secondary min-w-[130px]"><Shuffle size={15} /> Rastgele</button>
            {currentAddress && !currentAddress.has_password && (
              <button onClick={onSetPassword} className="btn-secondary min-w-[150px] relative text-accent-gold">
                <Lock size={15} className="text-accent-gold" /> Şifre Koru
                {!isPro && <span className="badge-purple text-[8px] absolute -top-2 right-2 px-1.5 py-0.5">PRO</span>}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="inline-flex items-center gap-2 text-accent-green">
              <span className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_14px_rgba(39,213,155,0.6)]" />
              <span>{currentAddress?.has_password ? 'Adres aktif ve şifre korumalı' : 'Adres aktif ve kullanıma hazır'}</span>
            </div>
            {currentAddress?.has_password && <span className="badge-purple"><Lock size={10} /> Şifreli</span>}
            {error && <span className="text-accent-red">{error}</span>}
          </div>
        </div>

        <div className="space-y-4 xl:pt-2">
          <div className="panel-soft p-5 sm:p-6 min-h-[132px] flex items-center gap-4 border-brand-border/60">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-accent-green/20 rounded-full" />
              <div className="relative w-12 h-12 rounded-2xl bg-brand-surface2 flex items-center justify-center border border-brand-border/60">
                <Shield size={20} className="text-white" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-white tracking-tight">Hazır ve Güvende</p>
              <p className="text-sm text-txt-secondary mt-1 leading-relaxed">E-postalarınız anonim ve şifrelenmiş olarak alınır.</p>
            </div>
          </div>

          {history?.length > 0 && (
            <div className="relative z-[60]" ref={historyRef}>
              <button onClick={() => setShowHistory((v) => !v)} className="btn-secondary w-full justify-between">
                <span className="inline-flex items-center gap-2"><Clock size={14} /> Son Kullanılanlar</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="absolute right-0 bottom-[calc(100%+8px)] w-full card p-2 z-[80] animate-slide-down shadow-panel">
                  <div className="max-h-[280px] overflow-y-auto space-y-1">
                    {history.map((h) => (
                      <button key={h.address} onClick={() => selectHistory(h)} className="w-full px-3 py-3 flex items-center gap-3 hover:bg-brand-surface2/70 rounded-2xl transition-colors text-left">
                        <div className="w-9 h-9 rounded-2xl bg-accent-blue/10 flex items-center justify-center flex-shrink-0 text-accent-blue font-mono text-xs font-bold">{h.address[0].toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-medium text-txt-primary truncate">{h.address}</p>
                          <p className="text-[10px] text-txt-muted mt-0.5">{fmtTime(h.ts)}</p>
                        </div>
                        {h.has_password ? <Lock size={12} className="text-accent-purple flex-shrink-0" /> : <Sparkles size={12} className="text-accent-cyan flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {domains.length === 0 && !loading && (
        <div className="mt-6 text-center">
          <p className="text-xs text-accent-red/90 bg-accent-red/5 px-4 py-3 rounded-2xl inline-flex items-center gap-2">Henüz domain eklenmemiş. Admin panelinden domain ekleyin.</p>
        </div>
      )}
    </div>
  );
}
