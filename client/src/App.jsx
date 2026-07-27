import { lazy, Suspense, startTransition, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Globe, Send, X, KeyRound, Lock, ChevronDown, Crown, Shield, Sparkles, Boxes, Workflow, PanelLeft, BookOpen } from 'lucide-react';
import useAuth from './hooks/useAuth';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AccountPanel from './components/AccountPanel';
import Modal from './components/Modal';
import { playNotificationSound, NOTIFICATION_SOUNDS } from './utils/notificationSound';
import { apiFetch } from './utils/apiFetch';
import { addressTokenHeader, setAddressToken } from './utils/addressToken';
import { LocaleProvider, createTranslator, normalizeLanguage } from './i18n';

const AuthPage = lazy(() => import('./components/AuthPage'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const BulkStudio = lazy(() => import('./components/BulkStudio'));
const BulkInbox = lazy(() => import('./components/BulkInbox'));
const AdminBulkStudio = lazy(() => import('./components/AdminBulkStudio'));
const AutomationCenter = lazy(() => import('./components/AutomationCenter'));
const DocumentationCenter = lazy(() => import('./components/DocumentationCenter'));

const API = '/api';
const DEFAULT_NOTIFICATION_SOUND = NOTIFICATION_SOUNDS.find((sound) => sound.id === 'chime')?.id || 'classic';

function useBeep(soundId) {
  const ctxRef = useRef(null);
  const ensureContext = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      return ctxRef.current;
    } catch (e) {
      return null;
    }
  }, []);

  const init = useCallback(() => {
    ensureContext();
  }, [ensureContext]);

  const play = useCallback(() => {
    try {
      const c = ensureContext();
      if (!c) return;
      playNotificationSound(c, soundId);
    } catch (e) {
      /* */
    }
  }, [ensureContext, soundId]);

  const preview = useCallback((previewSoundId) => {
    const c = ensureContext();
    if (!c) return;
    playNotificationSound(c, previewSoundId);
  }, [ensureContext]);

  return { init, play, preview };
}

export default function App() {
  const auth = useAuth();
  const theme = auth.preferences?.theme || auth.user?.theme || 'system';
  const language = normalizeLanguage(auth.preferences?.language || auth.user?.language || 'tr');
  const t = useMemo(() => createTranslator(language), [language]);
  const [notificationSound, setNotificationSound] = useState(() => {
    const saved = localStorage.getItem('tm-notification-sound');
    return NOTIFICATION_SOUNDS.some((sound) => sound.id === saved) ? saved : DEFAULT_NOTIFICATION_SOUND;
  });
  const { init: initBeep, play: playBeep, preview: previewBeep } = useBeep(notificationSound);
  const [page, setPage] = useState(() => window.location.hash.replace('#/', '') || 'inbox');
  const [bulkInboxPool, setBulkInboxPool] = useState(null);
  const [addr, setAddr] = useState(null);
  const [domains, setDomains] = useState([]);
  const [domainsError, setDomainsError] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notif, setNotif] = useState(null);
  const [compose, setCompose] = useState({ open: false, to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [sockOn, setSockOn] = useState(false);
  const [pwModal, setPwModal] = useState({ show: false, username: '', domain: '' });
  const [pwInput, setPwInput] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [spwShow, setSpwShow] = useState(false);
  const [spwVal, setSpwVal] = useState('');
  const [proReqShow, setProReqShow] = useState(false);
  const [proReqMsg, setProReqMsg] = useState('');
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tm-history') || '[]'); } catch (e) { return []; }
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const authHeaders = useMemo(() => (auth.token ? { Authorization: `Bearer ${auth.token}` } : {}), [auth.token]);

  const userMenuRef = useRef(null);
  const accountPanelRef = useRef(null);
  const sockRef = useRef(null);
  const notifTimer = useRef(null);
  const pollTimerRef = useRef(null);
  const pollDelayRef = useRef(5000);
  const restoredRef = useRef(false);

  const navigate = useCallback((nextPage) => {
    window.history.pushState({}, '', `#/${nextPage}`);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPopState = () => setPage(window.location.hash.replace('#/', '') || 'inbox');
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => { window.removeEventListener('popstate', onPopState); window.removeEventListener('hashchange', onPopState); };
  }, []);

  // Older Bulk Inbox links now open the pool picker. Mail streams are shown in
  // a popup so the user keeps their Bulk Studio context and can close it fast.
  useEffect(() => {
    if (page === 'bulk-inbox') navigate('bulk');
  }, [navigate, page]);

  useEffect(() => {
    const resolvedTheme = theme === 'system'
      ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.lang = language;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [theme, language]);

  useEffect(() => {
    const h = () => initBeep();
    document.addEventListener('click', h, { once: true });
    document.addEventListener('keydown', h, { once: true });
    return () => {
      document.removeEventListener('click', h);
      document.removeEventListener('keydown', h);
    };
  }, [initBeep]);

  useEffect(() => {
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!auth.isGuest) setShowAuth(false);
  }, [auth.isGuest]);

  useEffect(() => {
    localStorage.setItem('tm-notification-sound', notificationSound);
  }, [notificationSound]);

  const toast = useCallback((msg, type = 'info') => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif({ message: msg, type });
    notifTimer.current = setTimeout(() => setNotif(null), 3500);
  }, []);

  const openAuth = useCallback((mode = 'login') => {
    setAuthMode(mode);
    setShowAuth(true);
    setShowUserMenu(false);
  }, []);

  const handleRequestPro = useCallback(() => {
    if (auth.isGuest) {
      openAuth('register');
      return;
    }
    setProReqShow(true);
  }, [auth.isGuest, openAuth]);

  const handleSetPassword = useCallback(() => {
    if (auth.isGuest) {
      openAuth('register');
      return;
    }
    if (auth.isPro) setSpwShow(true);
    else setProReqShow(true);
  }, [auth.isGuest, auth.isPro, openAuth]);

  const handleReply = useCallback((pre = {}) => {
    if (auth.isGuest) {
      openAuth('login');
      return;
    }
    if (auth.isPro) {
      setCompose({ open: true, to: pre.to || '', subject: pre.subject || '', body: '' });
      return;
    }
    setProReqShow(true);
  }, [auth.isGuest, auth.isPro, openAuth]);

  const handlePreviewNotificationSound = useCallback((soundId) => {
    initBeep();
    setNotificationSound(soundId);
    previewBeep(soundId);
  }, [initBeep, previewBeep]);

  const openAccountSettings = useCallback(() => {
    setPage('account');
    window.history.pushState({}, '', '#/account');
    window.setTimeout(() => accountPanelRef.current?.openSettings?.(), 0);
    setShowUserMenu(false);
  }, []);

  useEffect(() => {
    if (!auth.user) return;
    try {
      const s = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
      sockRef.current = s;
      s.on('connect', () => {
        setSockOn(true);
        pollDelayRef.current = 5000;
      });
      s.on('disconnect', () => setSockOn(false));
      s.on('new-email', (payload) => {
        const d = payload?.success ? payload.data : payload;
        if (!d?.id) return;
        setEmails((p) => (p.some((e) => e.id === d.id) ? p : [d, ...p]));
        toast(t('app.newMailToast', { sender: d.sender }), 'info');
        playBeep();
      });
      return () => { try { s.disconnect(); } catch (e) { /* */ } };
    } catch (e) {
      console.warn('Socket.io:', e);
    }
  }, [auth.user, toast, playBeep]);

  useEffect(() => {
    try {
      if (sockRef.current && addr) sockRef.current.emit('subscribe', addr.address);
    } catch (e) {
      /* */
    }
  }, [addr]);

  useEffect(() => {
    if (!addr?.address) return;
    try {
      localStorage.setItem('tm-last-addr', JSON.stringify(addr));
      setHistory((prev) => {
        const entry = { address: addr.address, has_password: !!addr.has_password, ts: Date.now() };
        const next = [entry, ...prev.filter((h) => h.address !== addr.address)].slice(0, 20);
        localStorage.setItem('tm-history', JSON.stringify(next));
        return next;
      });
    } catch (e) {
      /* */
    }
  }, [addr]);

  const restoreLastAddress = useCallback(async () => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem('tm-last-addr') || 'null');
      if (!saved?.address) return false;
      const r = await apiFetch(`${API}/addresses/${saved.address}`, { headers: { ...authHeaders, ...addressTokenHeader(saved.address) } });
      if (r.ok) {
        const d = await r.json();
        setAddr(d);
        setEmails(d.emails || []);
        return true;
      }
    } catch (e) {
      /* */
    }
    return false;
  }, [authHeaders]);

  const loadDomains = useCallback(async () => {
    try {
      const r = await apiFetch(`${API}/addresses/domains`, { headers: authHeaders });
      if (r.ok) {
        const d = await r.json();
        if (d.domains) setDomains(d.domains);
      } else {
        setDomainsError(true);
      }
    } catch (e) {
      setDomainsError(true);
    }
  }, [authHeaders]);

  const genRandom = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const body = {};
      if (password) body.password = password;
      const r = await apiFetch(`${API}/addresses/random`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('errors.addressCreateFailed'));
      if (d.address_token) setAddressToken(d.address, d.address_token);
      setAddr(d);
      setEmails([]);
      toast(d.has_password ? t('app.addressCreatedPassworded') : t('app.addressCreatedReady'), 'success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, toast, t]);

  const openAddr = useCallback(async (username, domain, password, subdomain = null) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const body = { username, domain };
      if (password) body.password = password;
      if (subdomain) body.subdomain = subdomain;
      const r = await apiFetch(`${API}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.status === 403 && d.error === 'password_required') {
        setPwModal({ show: true, username, domain });
        setPwInput('');
        setPwErr('');
        setLoading(false);
        return;
      }
      if (!r.ok) throw new Error(d.error || t('errors.actionFailed'));
      if (d.address_token) setAddressToken(d.address, d.address_token);
      setAddr(d);
      setEmails(d.emails || []);
      toast(d.returned ? t('app.addressOpened') : t('app.addressCreatedReady'), 'success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, toast, t]);

  const pwSubmit = useCallback(async () => {
    if (!pwInput) return;
    setLoading(true);
    setPwErr('');
    try {
      const r = await apiFetch(`${API}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ username: pwModal.username, domain: pwModal.domain, password: pwInput }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPwErr(d.error || t('errors.wrongPassword'));
        setLoading(false);
        return;
      }
      if (d.address_token) setAddressToken(d.address, d.address_token);
      setAddr(d);
      setEmails(d.emails || []);
      setPwModal({ show: false, username: '', domain: '' });
      toast(t('app.accessOpened'), 'success');
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, pwInput, pwModal, toast, t]);

  const doSetPw = useCallback(async () => {
    if (!spwVal || !addr) return;
    try {
      const r = await apiFetch(`${API}/addresses/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ address: addr.address, password: spwVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setAddr((p) => ({ ...p, has_password: true }));
      setHistory((p) => {
        const next = p.map((h) => (h.address === addr.address ? { ...h, has_password: true } : h));
        localStorage.setItem('tm-history', JSON.stringify(next));
        return next;
      });
      setSpwShow(false);
      setSpwVal('');
      toast(t('app.passwordSaved'), 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [spwVal, addr, toast, t]);

  const doRequestPro = useCallback(async () => {
    try {
      await auth.requestPro(proReqMsg);
      setProReqShow(false);
      setProReqMsg('');
      toast(t('app.proRequested'), 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [auth, proReqMsg, toast, t]);

  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try {
      const r = await apiFetch(`${API}/emails/${encodeURIComponent(addr.address)}?limit=100&order=desc`, { headers: { ...authHeaders, ...addressTokenHeader(addr.address) } });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) setEmails(d);
        pollDelayRef.current = 5000;
      } else {
        pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000);
      }
    } catch (e) {
      pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000);
    }
  }, [addr, authHeaders]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadEmails]);

  const loadDetail = useCallback(async (id) => {
    try {
      const r = await apiFetch(`${API}/emails/single/${id}`, { headers: { ...authHeaders, ...addressTokenHeader(addr?.address) } });
      if (r.ok) setSelected(await r.json());
    } catch (e) {
      /* */
    }
  }, [authHeaders, addr]);

  const delEmail = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Silsin mi?')) return;
    try {
      const r = await apiFetch(`${API}/emails/${id}`, { method: 'DELETE', headers: { ...authHeaders, ...addressTokenHeader(addr?.address) } });
      if (r.ok) {
        setEmails((p) => p.filter((x) => x.id !== id));
        if (selected?.id === id) setSelected(null);
        toast(t('app.deleted'), 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [selected, toast, t]);

  const sendMail = useCallback(async () => {
    if (!compose.to || !compose.subject || !compose.body || !addr) return;
    setSending(true);
    try {
      const r = await apiFetch(`${API}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ from: addr.address, ...compose }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCompose({ open: false, to: '', subject: '', body: '' });
      toast(t('app.sent'), 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  }, [compose, addr, toast, t]);

  const copyAddr = () => {
    if (!addr) return;
    navigator.clipboard.writeText(addr.address).then(
      () => toast(t('app.copySuccess'), 'success'),
      () => toast(t('app.copyFail'), 'error')
    );
  };

  const copyOtp = useCallback((o) => {
    navigator.clipboard.writeText(o).then(
      () => toast(t('app.otpCopied', { otp: o }), 'success'),
      () => toast(t('app.otpCopyFail'), 'error')
    );
  }, [toast, t]);

  useEffect(() => {
    if (auth.user) {
      loadDomains();
      restoreLastAddress();
    }
  }, [auth.user, loadDomains, restoreLastAddress]);

  useEffect(() => {
    if (domains.length > 0 && !addr && !loading && restoredRef.current && auth.user) {
      if (!localStorage.getItem('tm-last-addr')) genRandom();
    }
  }, [domains, addr, loading, auth.user, genRandom]);

  useEffect(() => {
    if (!addr || sockOn) {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      return;
    }
    loadEmails();
    const tick = () => {
      loadEmails();
      pollTimerRef.current = setTimeout(tick, pollDelayRef.current);
    };
    pollTimerRef.current = setTimeout(tick, pollDelayRef.current);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [addr, sockOn, loadEmails]);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center mx-auto mb-3 animate-pulse-soft">
            <Mail size={20} className="text-white" />
          </div>
          <p className="text-xs text-txt-muted">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  const activeDomain = addr?.address?.split('@')[1] || (domains[0]?.domain || '');

  return (
    <LocaleProvider language={language}>
    <div className="app-shell min-h-screen bg-brand-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent-purple/10 blur-[120px]" />
        <div className="absolute top-32 right-0 h-80 w-80 rounded-full bg-accent-cyan/8 blur-[140px]" />
        <div className="absolute bottom-20 left-0 h-72 w-72 rounded-full bg-accent-blue/8 blur-[140px]" />
      </div>

      <header className="app-header sticky top-0 z-50 border-b border-brand-border/40 bg-brand-bg/90 backdrop-blur-2xl">
        <div className="max-w-[1680px] mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl panel-soft flex items-center justify-center shadow-glow-cyan">
              <Mail size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight text-txt-primary">MS Temp Mail</p>
              <p className="text-[11px] text-txt-muted">{t('app.brandSubtitle')}</p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2">
            <button onClick={() => navigate('inbox')} className={`nav-pill ${page === 'inbox' ? 'nav-pill-active' : ''}`}><InboxIcon size={16} /> {t('app.inbox')}</button>
            <button onClick={() => navigate('domains')} className={`nav-pill ${page === 'domains' ? 'nav-pill-active' : ''}`}><Globe size={16} /> {t('app.domains')}</button>
            {!auth.isGuest && <button onClick={() => navigate('bulk')} className={`nav-pill ${page === 'bulk' ? 'nav-pill-active' : ''}`}><Boxes size={16} /> Bulk</button>}
            {!auth.isGuest && <button onClick={() => navigate('automation')} className={`nav-pill ${page === 'automation' ? 'nav-pill-active' : ''}`}><Workflow size={16} /> Otomasyon</button>}
            <button onClick={() => navigate('docs')} className={`nav-pill ${page === 'docs' ? 'nav-pill-active' : ''}`}><BookOpen size={16} /> {t('app.docsRail')}</button>
            {auth.isAdmin && <button onClick={() => navigate('admin')} className={`nav-pill ${page === 'admin' ? 'nav-pill-active' : ''}`}><Shield size={16} /> {t('app.admin')}</button>}
          </div>

          <div className="flex items-center gap-3">
            {auth.isGuest ? (
              <>
                <button onClick={() => openAuth('login')} className="btn-secondary px-4 py-2.5 text-xs">{t('app.signIn')}</button>
                <button onClick={() => openAuth('register')} className="btn-primary px-4 py-2.5 text-xs">{t('app.signUp')}</button>
              </>
            ) : (
              <div className="relative flex items-center gap-4 pl-4 border-l border-brand-border/45" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu((v) => !v)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-brand-surface2/60 transition-colors">
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-brand-border/30 bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold shadow-glow-blue">
                    {auth.user?.avatar_url ? (
                      <img src={auth.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (auth.user?.username || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-txt-primary leading-none">{auth.user?.display_name || auth.user?.username}</p>
                    <p className="text-[11px] text-txt-secondary mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-green" />
                      {auth.isAdmin ? t('app.roleAdmin') : auth.isProPlus ? t('app.roleProPlus') : auth.isPro ? t('app.rolePro') : t('app.roleFree')}
                    </p>
                  </div>
                  <ChevronDown size={14} className="text-txt-muted" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-3 w-60 card p-2 z-50 animate-slide-down">
                    <div className="px-3 py-3 border-b border-brand-border/30">
                      <p className="text-sm font-semibold text-txt-primary">{auth.user?.display_name || auth.user?.username}</p>
                      <p className="text-xs text-txt-muted mt-1">{auth.user?.email}</p>
                    </div>
                    <button type="button" onClick={openAccountSettings} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-txt-secondary hover:bg-brand-surface2 transition-colors">
                      <Settings size={14} /> {t('app.accountSettings')}
                    </button>
                    {auth.isAdmin && <button onClick={() => { setShowUserMenu(false); navigate('admin'); }} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-txt-secondary hover:bg-brand-surface2 transition-colors"><Settings size={14} /> {t('app.adminPanel')}</button>}
                    {auth.isFree && <button onClick={() => { setShowUserMenu(false); setProReqShow(true); }} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-accent-purple hover:bg-accent-purple/5 transition-colors"><Crown size={14} /> {t('app.proUpgrade')}</button>}
                    <button type="button" onClick={() => auth.logout()} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-accent-red hover:bg-accent-red/5 transition-colors"><X size={14} /> {t('app.logout')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {notif && (
        <div className={`fixed top-24 right-6 z-[100] px-4 py-3 rounded-2xl shadow-panel text-sm font-medium animate-slide-down ${notif.type === 'success' ? 'bg-accent-green/15 text-accent-green border border-accent-green/20' : notif.type === 'error' ? 'bg-accent-red/15 text-accent-red border border-accent-red/20' : 'bg-accent-blue/15 text-accent-blue border border-accent-blue/20'}`}>
          {notif.message}
        </div>
      )}

      <Modal
        show={pwModal.show}
        onClose={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }}
        title={t('app.passwordRequiredTitle')}
        subtitle={t('app.passwordRequiredSubtitle', { address: `${pwModal.username}@${pwModal.domain}` })}
        footer={<><button onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} className="btn-secondary">{t('app.cancel')}</button><button onClick={pwSubmit} disabled={!pwInput || loading} className="btn-primary"><KeyRound size={12} /> {t('app.signIn')}</button></>}
      >
        <input type="password" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pwSubmit()} placeholder={t('app.passwordPlaceholder')} className="input" autoFocus />
        {pwErr && <p className="text-accent-red text-xs mt-2">{pwErr}</p>}
      </Modal>

      <Modal
        show={spwShow}
        onClose={() => { setSpwShow(false); setSpwVal(''); }}
        title={t('app.setPasswordTitle')}
        subtitle={t('app.setPasswordSubtitle')}
        footer={<><button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary">{t('app.cancel')}</button><button onClick={doSetPw} disabled={!spwVal} className="btn-primary"><Lock size={12} /> {t('app.save')}</button></>}
      >
        <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder={t('app.passwordPlaceholder')} className="input" autoFocus />
      </Modal>

      <Modal
        show={compose.open}
        onClose={() => setCompose({ ...compose, open: false })}
        title={t('app.composeTitle')}
        wide
        footer={<><button onClick={() => setCompose({ ...compose, open: false })} className="btn-secondary">{t('app.cancel')}</button><button onClick={sendMail} disabled={sending} className="btn-primary">{sending ? '⏳' : <Send size={12} />} {t('app.send')}</button></>}
      >
        <div className="space-y-3">
          <div><label className="section-title mb-1.5 block">{t('app.composeFrom')}</label><input value={addr?.address || ''} disabled className="input opacity-50 text-xs" /></div>
          <div><label className="section-title mb-1.5 block">{t('app.composeTo')}</label><input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder={t('app.recipientPlaceholder')} className="input" autoFocus /></div>
          <div><label className="section-title mb-1.5 block">{t('app.composeSubject')}</label><input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder={t('app.subjectPlaceholder')} className="input" /></div>
          <div><label className="section-title mb-1.5 block">{t('app.composeBody')}</label><textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="input resize-y" /></div>
        </div>
      </Modal>

      <Modal
        show={proReqShow}
        onClose={() => { setProReqShow(false); setProReqMsg(''); }}
        title={t('app.proRequestTitle')}
        subtitle={t('app.proRequestSubtitle')}
        footer={<><button onClick={() => setProReqShow(false)} className="btn-secondary">{t('app.cancel')}</button><button onClick={doRequestPro} className="btn-primary"><Crown size={12} /> {t('app.send')}</button></>}
      >
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-accent-purple/8 border border-accent-purple/15">
            <p className="text-xs font-semibold text-accent-purple mb-2">{t('app.proFeaturesTitle')}</p>
            <ul className="text-[11px] text-txt-muted space-y-1">
              <li>• {t('app.proFeatureAddresses')}</li>
              <li>• {t('app.proFeatureMailStorage')}</li>
              <li>• {t('app.proFeatureRetention')}</li>
              <li>• {t('app.proFeatureDomains')}</li>
              <li>• {t('app.proFeatureWebhooks')}</li>
            </ul>
          </div>
          <div>
            <label className="section-title mb-1.5 block">{t('app.proMessage')}</label>
            <textarea value={proReqMsg} onChange={(e) => setProReqMsg(e.target.value)} placeholder={t('app.proMessagePlaceholder')} rows={3} className="input resize-y" />
          </div>
        </div>
      </Modal>

      {showAuth && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-brand-bg/92 backdrop-blur-xl">
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-txt-muted">{t('app.loading')}</div>}>
            <AuthPage
              defaultMode={authMode}
              onLogin={auth.login}
              onRegister={auth.register}
              onClose={() => setShowAuth(false)}
              onGuestContinue={() => setShowAuth(false)}
            />
          </Suspense>
        </div>
      )}

      <div className="workspace-frame relative z-10 max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
        <aside className="workspace-rail hidden lg:flex" aria-label={t('app.workspaceAria')}>
          <button className={page === 'inbox' ? 'is-active' : ''} onClick={() => navigate('inbox')}><InboxIcon size={18} /><span>Inbox</span></button>
          <button className={page === 'domains' ? 'is-active' : ''} onClick={() => navigate('domains')}><Globe size={18} /><span>{t('app.domainsRail')}</span></button>
          {!auth.isGuest && <button className={page === 'bulk' ? 'is-active' : ''} onClick={() => navigate('bulk')}><Boxes size={18} /><span>Bulk Studio</span></button>}
          {!auth.isGuest && <button className={page === 'automation' ? 'is-active' : ''} onClick={() => navigate('automation')}><Workflow size={18} /><span>{t('app.automationRail')}</span></button>}
          <button className={page === 'docs' ? 'is-active' : ''} onClick={() => navigate('docs')}><BookOpen size={18} /><span>{t('app.docsRail')}</span></button>
          <button className={page === 'account' ? 'is-active' : ''} onClick={() => navigate('account')}><Settings size={18} /><span>{t('app.accountRail')}</span></button>
          {auth.isAdmin && <><div className="workspace-rail-divider" /><button className={page === 'admin' ? 'is-active' : ''} onClick={() => navigate('admin')}><PanelLeft size={18} /><span>{t('app.operationsRail')}</span></button><button className={page === 'admin-bulk' ? 'is-active' : ''} onClick={() => navigate('admin-bulk')}><Shield size={18} /><span>{t('app.bulkAdminRail')}</span></button></>}
        </aside>
        <main className="app-main workspace-main">
        {page === 'inbox' ? (
          <div className="space-y-5">
            <AddressBar
              currentAddress={addr}
              loading={loading}
              error={error}
              domains={domains}
              domainsError={domainsError}
              history={history}
              preferredDomainId={auth.preferences?.default_domain_id || auth.user?.default_domain_id || null}
              onGenerate={genRandom}
              onSubmit={openAddr}
              onCopy={copyAddr}
              onSetPassword={handleSetPassword}
              isPro={auth.isPro}
            />
            <div className="inbox-workspace grid grid-cols-1 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.7fr)] gap-5">
              <div className="min-h-[430px] xl:min-h-[590px]">
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              <div className="min-h-[430px] xl:min-h-[590px]">
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={handleReply} onCopyOtp={copyOtp} />
              </div>
            </div>
          </div>
        ) : page === 'domains' ? (
          <div className="card p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-3xl panel-soft flex items-center justify-center mx-auto mb-5 animate-float-soft">
              <Globe size={28} className="text-accent-cyan" />
            </div>
            <p className="text-xl font-semibold text-txt-primary">Aktif Domainler</p>
            <p className="text-sm text-txt-muted mt-2">{t('app.domainsSubtitle')}</p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {domains.length > 0 ? domains.map((d) => (
                <div key={d.id} className="panel-soft p-4 rounded-2xl text-left">
                  <p className="text-sm font-mono font-bold text-accent-cyan truncate">{d.domain}</p>
                  {d.wildcard_subdomains === 1 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge-cyan text-[9px]">Subdomain Destekli</span>
                      <span className="text-[10px] text-txt-muted">*. {d.domain}</span>
                    </div>
                  )}
                </div>
              )) : <div className="text-sm text-txt-muted col-span-full">{t('app.noActiveDomains')}</div>}
            </div>
          </div>
        ) : page === 'account' ? (
          <div className="account-workspace">
            <AccountPanel
              ref={accountPanelRef}
              auth={auth}
              user={auth.user}
              pkg={auth.pkg}
              stats={auth.stats}
              activeDomain={activeDomain}
              emailCount={emails.length}
              history={history}
              isGuest={auth.isGuest}
              isPro={auth.isPro}
              isAdmin={auth.isAdmin}
              domains={domains}
              notificationSound={notificationSound}
              notificationSounds={NOTIFICATION_SOUNDS}
              onNotificationSoundChange={setNotificationSound}
              onPreviewNotificationSound={handlePreviewNotificationSound}
              onRequestPro={handleRequestPro}
              onLogin={() => openAuth('login')}
              onRegister={() => openAuth('register')}
              onLogout={auth.logout}
              onAdmin={() => auth.isAdmin && navigate('admin')}
            />
          </div>
        ) : page === 'bulk' ? (
          <Suspense fallback={<div className="ops-loading">{t('app.preparing', { name: 'Bulk Studio' })}</div>}><BulkStudio token={auth.token} user={auth.user} pkg={auth.pkg} domains={domains} onOpenPool={setBulkInboxPool} /></Suspense>
        ) : page === 'automation' ? (
          auth.isGuest ? <div className="ops-empty"><Workflow size={30} /><h1>{t('app.automationGuestTitle')}</h1><p>{t('app.automationGuestHint')}</p></div> : <Suspense fallback={<div className="ops-loading">{t('app.preparing', { name: t('app.automationRail') })}</div>}><AutomationCenter token={auth.token} isAdmin={auth.isAdmin} /></Suspense>
        ) : page === 'docs' ? (
          <Suspense fallback={<div className="ops-loading">{t('app.preparing', { name: t('app.docsRail') })}</div>}><DocumentationCenter /></Suspense>
        ) : page === 'admin-bulk' && auth.isAdmin ? (
          <Suspense fallback={<div className="ops-loading">{t('app.preparing', { name: t('app.bulkAdminRail') })}</div>}><AdminBulkStudio token={auth.token} user={auth.user} domains={domains} /></Suspense>
        ) : auth.isAdmin ? (
          <Suspense fallback={<div className="card p-10 text-center text-txt-muted">{t('app.preparing', { name: t('app.adminPanel') })}</div>}>
            <AdminPanel
              api={API}
              token={auth.token}
              notificationSound={notificationSound}
              notificationSounds={NOTIFICATION_SOUNDS}
              onNotificationSoundChange={setNotificationSound}
              onPreviewNotificationSound={handlePreviewNotificationSound}
            />
          </Suspense>
        ) : (
          <div className="card p-10 text-center">
            <Shield size={40} className="mx-auto mb-3 text-txt-disabled" />
            <p className="text-sm text-txt-secondary">Admin yetkisi gerekiyor</p>
          </div>
        )}
        </main>
      </div>

      <Modal
        show={Boolean(bulkInboxPool)}
        onClose={() => setBulkInboxPool(null)}
        title={bulkInboxPool ? `${bulkInboxPool.prefix}_*@${bulkInboxPool.domain}` : ''}
        subtitle={t('bulkInbox.modalSubtitle')}
        size="full"
      >
        {bulkInboxPool && <Suspense fallback={<div className="ops-loading">{t('app.preparing', { name: 'Bulk Inbox' })}</div>}><BulkInbox token={auth.token} pool={bulkInboxPool} /></Suspense>}
      </Modal>

      <nav className="mobile-workspace-nav lg:hidden" aria-label={t('app.mobileNavAria')}>
        <button className={page === 'inbox' ? 'is-active' : ''} onClick={() => navigate('inbox')}><InboxIcon size={18} /><span>Inbox</span></button>
        <button className={page === 'domains' ? 'is-active' : ''} onClick={() => navigate('domains')}><Globe size={18} /><span>Domain</span></button>
        {!auth.isGuest && <button className={page === 'bulk' ? 'is-active' : ''} onClick={() => navigate('bulk')}><Boxes size={18} /><span>Bulk</span></button>}
        {!auth.isGuest && <button className={page === 'automation' ? 'is-active' : ''} onClick={() => navigate('automation')}><Workflow size={18} /><span>{t('app.automationRail')}</span></button>}
        <button className={page === 'docs' ? 'is-active' : ''} onClick={() => navigate('docs')}><BookOpen size={18} /><span>Docs</span></button>
        <button className={page === 'account' ? 'is-active' : ''} onClick={() => navigate('account')}><Settings size={18} /><span>{t('app.accountRail')}</span></button>
      </nav>

      <footer className="relative z-10 px-5 sm:px-8 pb-8 pt-5 text-center">
        <p className="text-sm text-txt-muted flex items-center justify-center gap-2">
          <Sparkles size={14} className="text-accent-blue" />
          MS Temp Mail • Dev: Emir Han Mamak • Mamak Studio
        </p>
      </footer>
    </div>
    </LocaleProvider>
  );
}
