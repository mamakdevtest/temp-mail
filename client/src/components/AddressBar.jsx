import { createPortal } from 'react-dom';
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Copy, RefreshCw, Lock, ChevronDown, Clock, Shield, Shuffle, CheckCircle2, Sparkles, Globe2, ChevronRight } from 'lucide-react';
import Modal from './Modal';
import { useLocale } from '../i18n';

export default function AddressBar({ currentAddress, loading, error, domains, history, preferredDomainId = null, onGenerate, onSubmit, onCopy, onSetPassword, isPro }) {
  const { t } = useLocale();
  const [username, setUsername] = useState('');
  const [selectedFullDomain, setSelectedFullDomain] = useState('');
  const [pw, setPw] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [showPasswordedHistory, setShowPasswordedHistory] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedDomains, setExpandedDomains] = useState({});
  const historyRef = useRef(null);
  const domainButtonRef = useRef(null);
  const domainMenuRef = useRef(null);
  const hasManualDomainSelectionRef = useRef(false);
  const [domainMenuLayout, setDomainMenuLayout] = useState(null);

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
  const passwordedHistory = useMemo(() => (Array.isArray(history) ? history.filter((item) => item.has_password) : []), [history]);

  useEffect(() => {
    if (currentAddress?.address) {
      const [u, d] = currentAddress.address.split('@');
      setUsername(u);
      if (d) {
        setSelectedFullDomain(d);
      }
      hasManualDomainSelectionRef.current = false;
    }
  }, [currentAddress]);

  useEffect(() => {
    if (currentAddress?.address || hasManualDomainSelectionRef.current || domains.length === 0) {
      return;
    }
    const preferred = preferredDomainId
      ? domains.find((d) => String(d.id) === String(preferredDomainId))
      : null;
    const nextDomain = preferred?.domain || domains[0]?.domain || '';
    if (nextDomain && nextDomain !== selectedFullDomain) {
      setSelectedFullDomain(nextDomain);
    }
  }, [currentAddress?.address, domains, preferredDomainId, selectedFullDomain]);

  useEffect(() => {
    const handler = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false);
      if (domainButtonRef.current && !domainButtonRef.current.contains(e.target) && domainMenuRef.current && !domainMenuRef.current.contains(e.target)) {
        setShowDomainMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (!showDomainMenu || !domainButtonRef.current) {
      setDomainMenuLayout(null);
      return undefined;
    }

    const updateLayout = () => {
      const rect = domainButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const desiredWidth = Math.min(460, Math.max(320, rect.width));
      const gap = 12;
      const belowTop = rect.bottom + gap;
      const belowBottomSpace = viewportHeight - belowTop - 16;
      const aboveHeight = rect.top - gap - 16;
      const shouldOpenAbove = belowBottomSpace < 320 && aboveHeight > belowBottomSpace;
      const top = shouldOpenAbove
        ? Math.max(16, rect.top - gap - 320)
        : Math.min(belowTop, Math.max(16, viewportHeight - 336));
      const left = Math.min(Math.max(16, rect.left), Math.max(16, viewportWidth - desiredWidth - 16));
      const maxHeight = shouldOpenAbove
        ? Math.max(220, Math.min(360, rect.top - gap - 24))
        : Math.max(220, Math.min(360, viewportHeight - belowTop - 24));
      setDomainMenuLayout({ top, left, width: desiredWidth, maxHeight });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);
    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('scroll', updateLayout, true);
    };
  }, [showDomainMenu, domains.length, selectedFullDomain, expandedDomains]);

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

  const requestGenerate = (type) => {
    if (loading) return;
    setConfirmAction(type);
  };

  const confirmGenerate = () => {
    if (!confirmAction) return;
    setConfirmAction(null);
    onGenerate(null);
  };

  const selectHistory = (entry) => {
    const [u, d] = entry.address.split('@');
    setUsername(u);
    if (d) setSelectedFullDomain(d);
    setPw('');
    setShowHistory(false);
    setShowPasswordedHistory(false);
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
    hasManualDomainSelectionRef.current = true;
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
    <div className="temp-address-panel card px-5 py-6 sm:px-7 sm:py-8 bg-[radial-gradient(circle_at_0%_0%,rgba(122,99,255,0.22),transparent_32%),radial-gradient(circle_at_100%_100%,rgba(52,215,255,0.12),transparent_30%)]">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          <div className="text-center space-y-2">
            <p className="section-title">{t('addressBar.title')}</p>
            <p className="text-sm text-txt-secondary">{t('addressBar.subtitle')}</p>
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
                      className="min-w-0 flex-[1_1_180px] bg-transparent text-right text-xl sm:text-[2.15rem] font-bold tracking-tight text-txt-primary outline-none placeholder:text-txt-disabled truncate"
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <span className="shrink-0 text-xl sm:text-[2.15rem] font-bold text-accent-red">@</span>
                      <div className="relative z-20 min-w-0 flex-[1_1_320px]">
                        <button
                          ref={domainButtonRef}
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

                      {showDomainMenu && domainMenuLayout && createPortal(
                        <div className="fixed inset-0 z-[1200]" onClick={() => setShowDomainMenu(false)} role="presentation">
                          <div
                            ref={domainMenuRef}
                            onClick={(e) => e.stopPropagation()}
                            className="card p-2 animate-slide-down shadow-panel"
                            style={{
                              position: 'fixed',
                              top: `${domainMenuLayout.top}px`,
                              left: `${domainMenuLayout.left}px`,
                              width: `${domainMenuLayout.width}px`,
                              maxHeight: `${domainMenuLayout.maxHeight}px`,
                            }}
                          >
                            <div className="px-3 py-2 border-b border-brand-border/20">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-txt-muted">{t('addressBar.chooseDomain')}</p>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto py-2">
                              {domains.length === 0 ? (
                                <div className="px-3 py-3 text-sm text-txt-muted">{t('addressBar.noDomain')}</div>
                              ) : domains.map((item) => {
                                const hasSubdomains = item.subdomains && item.subdomains.length > 0;
                                const isExpanded = expandedDomains[item.id];
                                const isMainSelected = selectedFullDomain === item.domain;

                                return (
                                  <div key={item.id}>
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
                                            <p className="text-[11px] text-txt-muted mt-0.5">{t('addressBar.mainDomain')}</p>
                                          </div>
                                          {isMainSelected ? <span className="badge-blue text-[9px]">{t('addressBar.selected')}</span> : null}
                                        </div>
                                      </button>
                                    </div>

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
                                                {isSubSelected ? <span className="badge-purple text-[9px]">{t('addressBar.selected')}</span> : null}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {item.wildcard_subdomains === 1 && (!item.subdomains || item.subdomains.length === 0) && (
                                      <div className="ml-6 pl-2 mt-1 mb-2">
                                        <p className="text-[10px] text-txt-muted italic">{t('addressBar.noSubdomains')}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </form>

                <button onClick={handleCopy} className={`relative z-0 h-[72px] rounded-[22px] panel-soft border-brand-border/70 flex items-center justify-center transition-all ${copied ? 'text-accent-green' : 'text-txt-secondary hover:text-txt-primary'}`}>
                  {copied ? <CheckCircle2 size={24} /> : <Copy size={22} />}
                </button>
              </div>
            </div>
          </div>

              <div className="relative z-0 flex flex-wrap items-center justify-center gap-3">
            {isModified ? (
              <button onClick={handleSubmit} disabled={loading || !username || !selectedFullDomain} className="btn-primary min-w-[160px]">
                {loading ? t('addressBar.loadingAction') : t('addressBar.openAddress')}
              </button>
            ) : (
                <button onClick={handleCopy} className={`btn-primary min-w-[160px] ${copied ? '!from-accent-green !to-accent-green !border-accent-green/30' : ''}`}>
                <Copy size={15} /> {copied ? t('addressBar.copied') : t('addressBar.copy')}
                </button>
            )}
            <button onClick={() => requestGenerate('refresh')} disabled={loading} className="btn-secondary min-w-[130px]"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('addressBar.refresh')}</button>
            <button onClick={() => requestGenerate('random')} disabled={loading} className="btn-secondary min-w-[130px]"><Shuffle size={15} /> {t('addressBar.random')}</button>
            {currentAddress && !currentAddress.has_password && (
              <button onClick={onSetPassword} className="btn-secondary min-w-[150px] relative text-accent-gold">
                <Lock size={15} className="text-accent-gold" /> {t('addressBar.protect')}
                {!isPro && <span className="badge-purple text-[8px] absolute -top-2 right-2 px-1.5 py-0.5">PRO</span>}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="inline-flex items-center gap-2 text-accent-green">
              <span className="w-2 h-2 rounded-full bg-accent-green shadow-[0_0_14px_rgba(39,213,155,0.6)]" />
              <span>{currentAddress?.has_password ? t('addressBar.activeProtected') : t('addressBar.activeReady')}</span>
            </div>
            {currentAddress?.has_password && <span className="badge-purple"><Lock size={10} /> {t('addressBar.passwordedBadge')}</span>}
            {error && <span className="text-accent-red">{error}</span>}
          </div>
        </div>

        <div className="space-y-4 xl:pt-2">
          <div className="panel-soft p-5 sm:p-6 min-h-[132px] flex items-center gap-4 border-brand-border/60">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-accent-green/20 rounded-full" />
              <div className="relative w-12 h-12 rounded-2xl bg-brand-surface2 flex items-center justify-center border border-brand-border/60">
                <Shield size={20} className="text-txt-primary" />
              </div>
            </div>
            <div>
              <p className="text-xl font-semibold text-txt-primary tracking-tight">{t('addressBar.safeTitle')}</p>
              <p className="text-sm text-txt-secondary mt-1 leading-relaxed">{t('addressBar.safeSubtitle')}</p>
            </div>
          </div>

          {history?.length > 0 && (
            <div className="relative z-[60]" ref={historyRef}>
              <button onClick={() => setShowHistory((v) => !v)} className="btn-secondary w-full justify-between">
                <span className="inline-flex items-center gap-2"><Clock size={14} /> {t('addressBar.recentUsed')}</span>
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

          <div className="panel-soft p-4 rounded-2xl border-brand-border/55">
            <button
              type="button"
              onClick={() => setShowPasswordedHistory((v) => !v)}
              aria-expanded={showPasswordedHistory}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{t('addressBar.passwordedList')}</p>
                <p className="text-[11px] text-txt-muted mt-1">{t('addressBar.recentHint')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="badge-purple text-[9px]">{passwordedHistory.length}</span>
                <ChevronDown size={14} className={`text-txt-muted transition-transform ${showPasswordedHistory ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {showPasswordedHistory ? (
              <div className="mt-3 space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {passwordedHistory.length > 0 ? passwordedHistory.map((h) => (
                  <button key={h.address} onClick={() => selectHistory(h)} className="w-full px-3 py-3 flex items-center gap-3 hover:bg-brand-surface2/70 rounded-2xl transition-colors text-left border border-transparent">
                    <div className="w-9 h-9 rounded-2xl bg-accent-purple/10 flex items-center justify-center flex-shrink-0 text-accent-purple font-mono text-xs font-bold">{h.address[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-medium text-txt-primary truncate">{h.address}</p>
                      <p className="text-[10px] text-txt-muted mt-0.5">{fmtTime(h.ts)}</p>
                    </div>
                    <Lock size={12} className="text-accent-purple flex-shrink-0" />
                  </button>
                )) : (
                  <p className="text-sm text-txt-muted">{t('addressBar.noPassworded')}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        show={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'random' ? t('addressBar.confirmRandomTitle') : t('addressBar.confirmRefreshTitle')}
        subtitle={confirmAction === 'random' ? t('addressBar.confirmRandomSubtitle') : t('addressBar.confirmRefreshSubtitle')}
        size="sm"
        footer={(
          <>
            <button type="button" onClick={() => setConfirmAction(null)} className="btn-secondary">
              {t('app.cancel')}
            </button>
            <button type="button" onClick={confirmGenerate} disabled={loading} className="btn-primary">
              {loading ? t('addressBar.loadingAction') : t('app.continue')}
            </button>
          </>
        )}
      >
        <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-4">
          <p className="text-sm text-txt-secondary leading-relaxed">
            {confirmAction === 'random' ? t('addressBar.confirmRandomSubtitle') : t('addressBar.confirmRefreshSubtitle')}
          </p>
        </div>
      </Modal>

      {domains.length === 0 && !loading && (
        <div className="mt-6 text-center">
          <p className="text-xs text-accent-red/90 bg-accent-red/5 px-4 py-3 rounded-2xl inline-flex items-center gap-2">{t('addressBar.noDomainsHint')}</p>
        </div>
      )}
    </div>
  );
}
