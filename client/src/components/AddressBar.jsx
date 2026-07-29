import { createPortal } from 'react-dom';
import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { Copy, RefreshCw, Lock, ChevronDown, Clock, Shuffle, CheckCircle2, ChevronRight, Globe } from 'lucide-react';
import Modal from './Modal';
import { useLocale } from '../i18n';

export default function AddressBar({ currentAddress, loading, error, domains, domainsError = false, history, preferredDomainId = null, onGenerate, onSubmit, onCopy, onSetPassword, isPro }) {
  const { t, language } = useLocale();
  const locale = language === 'en' ? 'en-US' : 'tr-TR';
  const [username, setUsername] = useState('');
  const [selectedFullDomain, setSelectedFullDomain] = useState('');
  const [pw] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [expandedDomains, setExpandedDomains] = useState({});
  const historyRef = useRef(null);
  const domainButtonRef = useRef(null);
  const domainMenuRef = useRef(null);
  const hasManualDomainSelectionRef = useRef(false);
  const [domainMenuLayout, setDomainMenuLayout] = useState(null);

  const findDomainInfo = (fullDomain) => {
    if (!fullDomain) return null;
    for (const d of domains) {
      if (fullDomain === d.domain) return { mainDomain: d.domain, subdomain: null, domainId: d.id };
      if (d.subdomains) {
        for (const sub of d.subdomains) {
          if (fullDomain === sub.full_domain) return { mainDomain: d.domain, subdomain: sub.name, domainId: d.id, subdomainId: sub.id };
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
      if (d) setSelectedFullDomain(d);
      hasManualDomainSelectionRef.current = false;
    }
  }, [currentAddress]);

  useEffect(() => {
    if (currentAddress?.address || hasManualDomainSelectionRef.current || domains.length === 0) return;
    const preferred = preferredDomainId ? domains.find((d) => String(d.id) === String(preferredDomainId)) : null;
    const nextDomain = preferred?.domain || domains[0]?.domain || '';
    if (nextDomain && nextDomain !== selectedFullDomain) setSelectedFullDomain(nextDomain);
    // ponytail: selectedFullDomain intentionally excluded from deps — including it
    // re-triggers this effect after the set, and since domains is a new array
    // reference on some parent renders, it caused Maximum update depth exceeded.
  }, [currentAddress?.address, domains, preferredDomainId]);

  useEffect(() => {
    const handler = (e) => {
      if (historyRef.current && !historyRef.current.contains(e.target)) setShowHistory(false);
      if (domainButtonRef.current && !domainButtonRef.current.contains(e.target) && domainMenuRef.current && !domainMenuRef.current.contains(e.target)) setShowDomainMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useLayoutEffect(() => {
    if (!showDomainMenu || !domainButtonRef.current) { setDomainMenuLayout(null); return undefined; }
    const updateLayout = () => {
      const rect = domainButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const inset = vw <= 480 ? 12 : 16;
      const availableWidth = Math.max(0, vw - inset * 2);
      const width = Math.min(420, availableWidth, Math.max(260, rect.width));
      const gap = 8;
      const belowTop = rect.bottom + gap;
      const belowSpace = vh - belowTop - 16;
      const aboveHeight = rect.top - gap - 16;
      const openAbove = belowSpace < 300 && aboveHeight > belowSpace;
      const top = openAbove ? Math.max(16, rect.top - gap - 300) : Math.min(belowTop, Math.max(16, vh - 316));
      const left = Math.min(Math.max(inset, rect.left), Math.max(inset, vw - width - inset));
      const maxHeight = openAbove ? Math.max(200, Math.min(340, rect.top - gap - 24)) : Math.max(200, Math.min(340, vh - belowTop - 24));
      // ponytail: only set when a value actually changed — otherwise this
      // layout effect re-runs every render (new object ref) and hits
      // Maximum update depth exceeded when the dropdown is open.
      setDomainMenuLayout((prev) => {
        if (prev && prev.top === top && prev.left === left && prev.width === width && prev.maxHeight === maxHeight) return prev;
        return { top, left, width, maxHeight };
      });
    };
    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('scroll', updateLayout, true);
    return () => { window.removeEventListener('resize', updateLayout); window.removeEventListener('scroll', updateLayout, true); };
  }, [showDomainMenu, domains.length, selectedFullDomain, expandedDomains]);

  const currentAddrDomain = currentAddress?.address?.split('@')[1] || '';
  const isModified = currentAddress && (username !== currentAddress.address.split('@')[0] || selectedFullDomain !== currentAddrDomain);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!username || !selectedFullDomain) return;
    const info = findDomainInfo(selectedFullDomain);
    if (!info) return;
    onSubmit(username, info.mainDomain, pw || null, info.subdomain);
    setShowHistory(false);
  };

  const requestGenerate = (type) => { if (!loading) setConfirmAction(type); };
  const confirmGenerate = () => { if (!confirmAction) return; setConfirmAction(null); onGenerate(null); };

  const selectHistory = (entry) => {
    const [u, d] = entry.address.split('@');
    setUsername(u);
    if (d) setSelectedFullDomain(d);
    setShowHistory(false);
    const info = findDomainInfo(d);
    onSubmit(u, info?.mainDomain || d, null, info?.subdomain || null);
  };

  const handleCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const fmtTime = (ts) => {
    const d = new Date(ts), now = new Date(), diff = now - d;
    if (diff < 60000) return t('addressBar.justNow');
    if (diff < 3600000) return t('addressBar.minutesAgo', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('addressBar.hoursAgo', { n: Math.floor(diff / 3600000) });
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  const selectDomain = (fullDomain) => { hasManualDomainSelectionRef.current = true; setSelectedFullDomain(fullDomain); setShowDomainMenu(false); };
  const toggleExpand = (id) => setExpandedDomains((p) => ({ ...p, [id]: !p[id] }));

  useEffect(() => {
    if (selectedFullDomain && domainInfo?.subdomain) setExpandedDomains((p) => ({ ...p, [domainInfo.domainId]: true }));
  }, [selectedFullDomain, domainInfo]);

  useEffect(() => {
    if (!domains.length) return;
    setExpandedDomains((prev) => {
      const next = { ...prev };
      domains.forEach((d) => { if (d.subdomains?.length && !(d.id in next)) next[d.id] = true; });
      return next;
    });
  }, [domains]);

  return (
    <div className="space-y-4">
      {/* Signature composer */}
      <div className="card p-5 sm:p-6 animate-scale-in">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="section-title">{t('addressBar.title')}</p>
            <p className="t-body-sm text-txt-muted mt-1">{t('addressBar.subtitle')}</p>
          </div>
          {currentAddress && (
            <span className="badge-green shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--success))]" />
              {currentAddress.has_password ? t('addressBar.activeProtected') : t('addressBar.activeReady')}
            </span>
          )}
        </div>

        {/* Mono address line */}
        <form onSubmit={handleSubmit} className="rounded-[var(--r-lg)] border border-brand-border bg-brand-bg/60 overflow-hidden">
          <div className="flex flex-col items-center gap-0 px-4 py-4 sm:flex-row sm:items-center sm:gap-1 sm:px-4 sm:py-3.5 sm:flex-nowrap">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ''))}
              placeholder="username"
              className="min-w-0 w-full sm:flex-[1_1_140px] bg-transparent text-center sm:text-right font-mono text-base sm:text-xl font-semibold text-txt-primary outline-none placeholder:text-txt-disabled truncate"
              spellCheck={false}
              autoComplete="off"
              aria-label="username"
            />
            <span className="shrink-0 font-mono text-lg sm:text-2xl font-semibold text-txt-muted text-center">@</span>
            <div className="relative min-w-0 w-full sm:w-auto sm:flex-[1_1_220px] flex justify-center sm:justify-start">
              <button
                ref={domainButtonRef}
                type="button"
                onClick={() => setShowDomainMenu((v) => !v)}
                className="w-full sm:w-auto min-w-0 inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 sm:text-left hover:bg-brand-surface2 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={showDomainMenu}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-base sm:text-xl font-semibold text-[rgb(var(--brand))] text-center sm:text-left">{displayDomain || 'domain'}</span>
                <ChevronDown size={16} className={`shrink-0 text-txt-muted transition-transform ${showDomainMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDomainMenu && domainMenuLayout && createPortal(
                <div className="fixed inset-0 z-[1200]" onClick={() => setShowDomainMenu(false)} role="presentation">
                  <div
                    ref={domainMenuRef}
                    onClick={(e) => e.stopPropagation()}
                    className="card p-1.5 animate-pop-in"
                    style={{ position: 'fixed', top: `${domainMenuLayout.top}px`, left: `${domainMenuLayout.left}px`, width: `${domainMenuLayout.width}px`, maxHeight: `${domainMenuLayout.maxHeight}px` }}
                    role="listbox"
                  >
                    <p className="section-title px-2.5 py-2">{t('addressBar.chooseDomain')}</p>
                    <div className="max-h-[280px] overflow-y-auto">
                      {domains.length === 0 ? (
                        <div className="px-2.5 py-3 t-body-sm text-txt-muted">{t('addressBar.noDomain')}</div>
                      ) : domains.map((item) => {
                        const hasSubs = item.subdomains && item.subdomains.length > 0;
                        const isExpanded = expandedDomains[item.id];
                        const isMainSel = selectedFullDomain === item.domain;
                        return (
                          <div key={item.id}>
                            <div className="flex items-center gap-1">
                              {hasSubs && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-1 rounded hover:bg-brand-surface2 transition-colors" aria-label="toggle">
                                  <ChevronRight size={14} className={`text-txt-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              )}
                              <button type="button" onClick={() => selectDomain(item.domain)} className={`flex-1 rounded-[var(--r-md)] px-2.5 py-2 text-left transition-colors ${isMainSel ? 'bg-[rgb(var(--brand)/0.1)]' : 'hover:bg-brand-surface2'}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="min-w-0 t-mono font-medium text-txt-primary truncate">{item.domain}</span>
                                  {isMainSel && <CheckCircle2 size={14} className="text-[rgb(var(--brand))] shrink-0" />}
                                </div>
                              </button>
                            </div>
                            {hasSubs && isExpanded && (
                              <div className="ml-5 border-l border-brand-border pl-2 my-1 space-y-0.5">
                                {item.subdomains.map((sub) => {
                                  const isSubSel = selectedFullDomain === sub.full_domain;
                                  return (
                                    <button key={sub.id} type="button" onClick={() => selectDomain(sub.full_domain)} className={`w-full rounded-[var(--r-md)] px-2.5 py-1.5 text-left transition-colors ${isSubSel ? 'bg-[rgb(var(--otp)/0.12)]' : 'hover:bg-brand-surface2'}`}>
                                      <span className="t-mono text-txt-secondary truncate block">{sub.full_domain}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body,
              )}
            </div>
            <button type="button" onClick={handleCopy} aria-label={t('addressBar.copy')} className={`shrink-0 ml-auto grid place-items-center w-10 h-10 rounded-[var(--r-md)] transition-colors ${copied ? 'text-[rgb(var(--success-fg))]' : 'text-txt-muted hover:text-txt-primary hover:bg-brand-surface2'}`}>
              {copied ? <CheckCircle2 size={18} /> : <Copy size={17} />}
            </button>
          </div>
        </form>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 mt-4">
          {isModified ? (
            <button onClick={handleSubmit} disabled={loading || !username || !selectedFullDomain} className="btn-primary">
              {loading ? t('addressBar.loadingAction') : t('addressBar.selectAddress')}
            </button>
          ) : (
            <button onClick={handleCopy} className="btn-primary"><Copy size={15} /> {copied ? t('addressBar.copied') : t('addressBar.copy')}</button>
          )}
          <button onClick={() => requestGenerate('refresh')} disabled={loading} className="btn-secondary"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('addressBar.refresh')}</button>
          <button onClick={() => requestGenerate('random')} disabled={loading} className="btn-secondary"><Shuffle size={15} /> {t('addressBar.random')}</button>
          {currentAddress && !currentAddress.has_password && (
            <button onClick={onSetPassword} className="btn-secondary relative">
              <Lock size={15} className="text-[rgb(var(--otp))]" /> {t('addressBar.protect')}
            </button>
          )}
          {currentAddress?.has_password && <span className="badge-purple ml-1"><Lock size={11} /> {t('addressBar.passwordedBadge')}</span>}
          {error && <span className="t-body-sm text-[rgb(var(--danger-fg))] ml-1">{error}</span>}
        </div>

        {domains.length === 0 && !loading && (
          <p className="mt-3 t-body-sm text-[rgb(var(--danger-fg))]">{domainsError ? t('addressBar.domainsLoadError') : t('addressBar.noDomainsHint')}</p>
        )}
      </div>

      {/* History strip */}
      {(history?.length > 0 || passwordedHistory.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {history?.length > 0 && (
            <div className="relative flex-1 min-w-[220px]" ref={historyRef}>
              <button onClick={() => setShowHistory((v) => !v)} className="btn-secondary w-full justify-between" aria-expanded={showHistory}>
                <span className="inline-flex items-center gap-2"><Clock size={14} /> {t('addressBar.recentUsed')}</span>
                <ChevronDown size={14} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] card p-1.5 z-[80] animate-slide-down max-h-[280px] overflow-y-auto">
                  {history.map((h) => (
                    <button key={h.address} onClick={() => selectHistory(h)} className="w-full px-2.5 py-2 flex items-center gap-2.5 hover:bg-brand-surface2 rounded-[var(--r-md)] transition-colors text-left">
                      {h.has_password ? <Lock size={13} className="text-[rgb(var(--otp))] shrink-0" /> : <Globe size={13} className="text-txt-muted shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="block t-mono text-txt-primary truncate">{h.address}</span>
                        <span className="block t-caption text-txt-muted">{fmtTime(h.ts)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        show={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === 'random' ? t('addressBar.confirmRandomTitle') : t('addressBar.confirmRefreshTitle')}
        size="sm"
        closeLabel={t('app.close')}
        footer={(
          <>
            <button type="button" onClick={() => setConfirmAction(null)} className="btn-secondary">{t('app.cancel')}</button>
            <button type="button" onClick={confirmGenerate} disabled={loading} className="btn-primary">{loading ? t('addressBar.loadingAction') : t('app.continue')}</button>
          </>
        )}
      >
        <p className="t-body-sm text-txt-secondary">{confirmAction === 'random' ? t('addressBar.confirmRandomSubtitle') : t('addressBar.confirmRefreshSubtitle')}</p>
      </Modal>
    </div>
  );
}
