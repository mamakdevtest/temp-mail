import { startTransition, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Globe, Send, X, KeyRound, Lock, ChevronDown, Crown, Shield, Sparkles, Boxes, Workflow, BookOpen, Search, Command, LogOut, Plus, Moon, Sun } from 'lucide-react';
import useAuth from './hooks/useAuth';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AccountPanel from './components/AccountPanel';
import Modal from './components/Modal';
import { Drawer, CommandPalette, Avatar, EmptyState, ConfirmationDialog } from './components/ui';
import { playNotificationSound, NOTIFICATION_SOUNDS } from './utils/notificationSound';
import { apiFetch } from './utils/apiFetch';
import { addressTokenHeader, setAddressToken } from './utils/addressToken';
import { LocaleProvider, createTranslator, normalizeLanguage } from './i18n';

// ponytail: eager imports for all panels — lazy chunks kept crashing after HMR
// ("Failed to fetch dynamically imported module"). Internal tool; bundle size
// tradeoff is acceptable to eliminate this crash class entirely.
import AuthPage from './components/AuthPage';
import AdminPanel from './components/AdminPanel';
import BulkStudio from './components/BulkStudio';
import BulkInbox from './components/BulkInbox';
import AdminBulkStudio from './components/AdminBulkStudio';
import AutomationCenter from './components/AutomationCenter';
import DocumentationCenter from './components/DocumentationCenter';

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
  const [guestTheme, setGuestTheme] = useState(() => {
    try { return localStorage.getItem('tm-theme') || null; } catch (e) { return null; }
  });
  const [accent, setAccentState] = useState(() => {
    try { return localStorage.getItem('tm-accent') || 'indigo'; } catch (e) { return 'indigo'; }
  });
  const setAccent = useCallback((next) => setAccentState(next), []);
  const theme = auth.isGuest
    ? (guestTheme || 'system')
    : (auth.preferences?.theme || auth.user?.theme || 'system');
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
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const authHeaders = useMemo(() => (auth.token ? { Authorization: `Bearer ${auth.token}` } : {}), [auth.token]);

  const userMenuRef = useRef(null);
  const userMenuMobileRef = useRef(null);
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
    if (accent === 'indigo') {
      delete document.documentElement.dataset.accent;
    } else {
      document.documentElement.dataset.accent = accent;
    }
    try { localStorage.setItem('tm-accent', accent); } catch (e) { /* private mode */ }
  }, [accent]);

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

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    return () => {
      if (notifTimer.current) clearTimeout(notifTimer.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const h = (e) => {
      // Check both the trigger button ref and the portal menu (by data attribute).
      const inTrigger = (userMenuRef.current && userMenuRef.current.contains(e.target)) || (userMenuMobileRef.current && userMenuMobileRef.current.contains(e.target));
      const inMenu = e.target.closest && e.target.closest('[data-user-menu]');
      if (!inTrigger && !inMenu) setShowUserMenu(false);
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
    setSpwShow(true);
  }, [auth.isGuest, openAuth]);

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
      // Backend couldn't find the address (DB reset etc.) — still restore
      // locally so the address bar shows the last address. Don't genRandom.
      setAddr(saved);
      setEmails([]);
      return true;
    } catch (e) {
      // Network error — restore locally if we have a saved address.
      const saved = JSON.parse(localStorage.getItem('tm-last-addr') || 'null');
      if (saved?.address) { setAddr(saved); setEmails([]); return true; }
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

  const [pendingDelete, setPendingDelete] = useState(null);
  const delEmail = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setPendingDelete(id);
  }, []);

  const confirmDeleteEmail = useCallback(async () => {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
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
  }, [pendingDelete, authHeaders, addr, selected, toast, t]);

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
    // Domains are a public surface — load for everyone (guest included).
    loadDomains();
  }, [loadDomains]);

  // ponytail: keyboard shortcuts — J/K next/prev mail, Enter open, Del delete, C copy addr.
  // Only when page is inbox, no input is focused, and a command palette/modal isn't open.
  useEffect(() => {
    if (page !== 'inbox') return;
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (isTyping || cmdkOpen || showAuth || pendingDelete) return;
      const list = emails;
      if (!list.length) return;
      const idx = selected ? list.findIndex((m) => m.id === selected.id) : -1;
      const key = e.key.toLowerCase();
      if (key === 'j') {
        e.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) loadDetail(next.id);
      } else if (key === 'k') {
        e.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) loadDetail(prev.id);
      } else if (key === 'enter' && selected) {
        e.preventDefault();
        copyAddr(addr?.address);
      } else if (key === 'c' && addr?.address) {
        e.preventDefault();
        copyAddr(addr?.address);
      } else if (key === 'delete' && selected) {
        e.preventDefault();
        delEmail(selected.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, emails, selected, cmdkOpen, showAuth, pendingDelete, loadDetail, copyAddr, delEmail, addr]);

  useEffect(() => {
    // Restore last address on mount. Do NOT auto-generate random — user must
    // click "Rastgele" button to get a new address.
    if (restoredRef.current) return;
    if (domains.length === 0) return;
    (async () => {
      await restoreLastAddress();
    })();
  }, [restoreLastAddress, domains.length]);

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

  const activeDomain = addr?.address?.split('@')[1] || (domains[0]?.domain || '');

  const resolvedTheme = theme === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  const setTheme = useCallback((next) => {
    if (auth.isGuest) {
      setGuestTheme(next);
      try { localStorage.setItem('tm-theme', next); } catch (e) { /* private mode */ }
    } else {
      auth.updatePreferences?.({ theme: next }).catch(() => {});
    }
  }, [auth]);

  // Role-aware navigation model — single source of truth for rail + mobile nav.
  const navGroups = useMemo(() => {
    const groups = [
      { label: t('nav.mailbox'), items: [
        { id: 'inbox', label: t('app.inbox'), icon: InboxIcon },
        { id: 'domains', label: t('app.domains'), icon: Globe },
      ] },
    ];
    if (!auth.isGuest) groups.push({ label: t('nav.scale'), items: [
      { id: 'bulk', label: 'Bulk Studio', icon: Boxes },
      { id: 'automation', label: t('app.automationRail'), icon: Workflow },
    ] });
    groups.push({ label: t('nav.learn'), items: [
      { id: 'docs', label: t('app.docsRail'), icon: BookOpen },
      { id: 'account', label: t('app.accountRail'), icon: Settings },
    ] });
    if (auth.isAdmin) groups.push({ label: t('nav.admin'), items: [
      { id: 'admin', label: t('app.operationsRail'), icon: Shield },
      { id: 'admin-bulk', label: t('app.bulkAdminRail'), icon: Boxes },
    ] });
    return groups;
  }, [auth.isGuest, auth.isAdmin, t]);

  const pageTitle = useMemo(() => {
    for (const g of navGroups) { const it = g.items.find((i) => i.id === page); if (it) return it; }
    return { label: t('app.inbox'), icon: InboxIcon };
  }, [navGroups, page, t]);

  const commandItems = useMemo(() => {
    const nav = navGroups.flatMap((g) => g.items.map((it) => ({
      id: `go-${it.id}`, label: it.label, icon: it.icon, group: t('cmdk.navigate'),
      keywords: [it.id], run: () => navigate(it.id),
    })));
    const actions = [
      { id: 'act-new', label: t('cmdk.newAddress'), icon: Plus, group: t('cmdk.actions'), run: () => { navigate('inbox'); genRandom(); } },
      { id: 'act-copy', label: t('cmdk.copyAddress'), icon: Mail, group: t('cmdk.actions'), run: copyAddr },
      { id: 'act-dark', label: t('cmdk.themeDark'), icon: Moon, group: t('cmdk.actions'), run: () => setTheme('dark') },
      { id: 'act-light', label: t('cmdk.themeLight'), icon: Sun, group: t('cmdk.actions'), run: () => setTheme('light') },
    ];
    const dom = domains.map((d) => ({
      id: `dom-${d.id}`, label: d.domain, icon: Globe, group: t('cmdk.domains'),
      run: () => { if (addr) { const u = addr.address.split('@')[0]; openAddr(u, d.domain); } else navigate('domains'); },
    }));
    return [...nav, ...actions, ...dom];
  }, [navGroups, domains, addr, t, navigate, genRandom, copyAddr, openAddr, setTheme]);

  // User dropdown menu rendered via portal so it escapes sidebar overflow.
  const renderUserMenu = () => createPortal(
    <div data-user-menu className="fixed bottom-16 left-4 lg:left-4 w-56 card p-1.5 z-[2000] animate-slide-up shadow-lg" role="menu" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="px-2.5 py-2.5 border-b border-brand-border/50 mb-1">
        <p className="text-sm font-medium text-txt-primary truncate">{auth.user?.display_name || auth.user?.username}</p>
        <p className="text-[12px] text-txt-muted truncate">{auth.user?.email}</p>
      </div>
      <button type="button" onClick={() => { setShowUserMenu(false); openAccountSettings(); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r-md)] text-sm text-txt-secondary hover:bg-brand-surface2 transition-colors"><Settings size={15} /> {t('app.accountSettings')}</button>
      {auth.isAdmin && <button onClick={() => { setShowUserMenu(false); navigate('admin'); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r-md)] text-sm text-txt-secondary hover:bg-brand-surface2 transition-colors"><Shield size={15} /> {t('app.adminPanel')}</button>}
      {auth.isFree && <button onClick={() => { setShowUserMenu(false); setProReqShow(true); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r-md)] text-sm text-[rgb(var(--otp))] hover:bg-[rgb(var(--otp)/0.08)] transition-colors"><Crown size={15} /> {t('app.proUpgrade')}</button>}
      <button type="button" onClick={() => { setShowUserMenu(false); auth.logout(); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--r-md)] text-sm text-[rgb(var(--danger-fg))] hover:bg-[rgb(var(--danger)/0.08)] transition-colors"><LogOut size={15} /> {t('app.logout')}</button>
    </div>,
    document.body
  );

  if (auth.loading) {
    return (
      <LocaleProvider language={language}>
        <div className="min-h-screen bg-brand-bg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center mx-auto mb-3 animate-pulse-soft">
              <Mail size={20} className="text-white" />
            </div>
            <p className="text-xs text-txt-muted">{t('app.loading')}</p>
          </div>
        </div>
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider language={language}>
    <div className="app-shell min-h-screen bg-brand-bg relative flex flex-col lg:flex-row">
      {/* Desktop left sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-60 shrink-0 flex-col border-r border-brand-border/60 bg-brand-bg/85 backdrop-blur-xl z-30">
        <button
          type="button"
          onClick={() => navigate('inbox')}
          className="flex items-center gap-2.5 px-4 h-16 border-b border-brand-border/60 hover:bg-brand-surface2 transition-colors"
          aria-label={t('app.inbox')}
        >
          <div className="w-9 h-9 rounded-[var(--r-lg)] bg-[rgb(var(--brand))] flex items-center justify-center shrink-0">
            <Mail size={18} className="text-[rgb(var(--on-brand))]" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold tracking-tight text-txt-primary leading-none">MS Temp Mail</p>
            <p className="text-[10px] text-txt-muted mt-0.5">{t('app.brandSubtitle')}</p>
          </div>
        </button>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label={t('app.mobileNavAria')}>
          {navGroups.flatMap((g) => g.items).map((it) => {
            const active = page === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(it.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium transition-colors ${active ? 'bg-[rgb(var(--brand)/0.12)] text-[rgb(var(--brand))]' : 'text-txt-secondary hover:bg-brand-surface2 hover:text-txt-primary'}`}
              >
                <it.icon size={18} className={active ? 'text-[rgb(var(--brand))]' : 'text-txt-muted'} />
                {it.label}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-brand-border/60">
          <button onClick={() => setCmdkOpen(true)} className="w-full flex items-center gap-2 rounded-[var(--r-md)] border border-brand-border bg-brand-bg/60 px-3 py-2 text-txt-muted hover:text-txt-secondary transition-colors text-sm" aria-label={t('cmdk.search')}>
            <Search size={14} />
            <span className="flex-1 text-left">{t('cmdk.search')}</span>
            <kbd className="text-[10px] border border-brand-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
          <div className="mt-2">
            {auth.isGuest ? (
              <div className="flex gap-2">
                <button onClick={() => openAuth('login')} className="btn-ghost flex-1 text-sm">{t('app.signIn')}</button>
                <button onClick={() => openAuth('register')} className="btn-primary flex-1 text-sm">{t('app.signUp')}</button>
              </div>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu((v) => !v)} className="w-full flex items-center gap-2.5 rounded-[var(--r-md)] px-2 py-2 hover:bg-brand-surface2 transition-colors" aria-haspopup="menu" aria-expanded={showUserMenu}>
                  <Avatar src={auth.user?.avatar_url} fallback={(auth.user?.username || 'U')[0].toUpperCase()} size="sm" />
                  <span className="min-w-0 text-left flex-1">
                    <span className="block text-sm font-medium text-txt-primary leading-none truncate">{auth.user?.display_name || auth.user?.username}</span>
                    <span className="block text-[11px] text-txt-muted mt-1">{auth.isAdmin ? t('app.roleAdmin') : auth.isProPlus ? t('app.roleProPlus') : auth.isPro ? t('app.rolePro') : t('app.roleFree')}</span>
                  </span>
                  <ChevronDown size={14} className="text-txt-muted" />
                </button>
                {showUserMenu && renderUserMenu()}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top header (hidden on desktop — sidebar handles nav) */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-brand-border/60 bg-brand-bg/85 backdrop-blur-xl">
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Brand — click returns to inbox home */}
          <button
            type="button"
            onClick={() => navigate('inbox')}
            className="flex items-center gap-2.5 min-w-0 rounded-[var(--r-md)] px-1 py-0.5 -ml-1 hover:bg-brand-surface2 transition-colors"
            aria-label={t('app.inbox')}
          >
            <div className="w-9 h-9 rounded-[var(--r-lg)] bg-[rgb(var(--brand))] flex items-center justify-center shrink-0">
              <Mail size={18} className="text-[rgb(var(--on-brand))]" />
            </div>
            <div className="hidden sm:block min-w-0 text-left">
              <p className="text-sm font-bold tracking-tight text-txt-primary leading-none">MS Temp Mail</p>
              <p className="text-[10px] text-txt-muted mt-0.5">{t('app.brandSubtitle')}</p>
            </div>
          </button>

          {/* Center command search (desktop) */}
          <button
            type="button"
            onClick={() => setCmdkOpen(true)}
            className="hidden md:flex flex-1 max-w-md items-center gap-2 rounded-[var(--r-md)] border border-brand-border bg-brand-bg/60 px-3 py-2 text-txt-muted hover:text-txt-secondary transition-colors"
            aria-label={t('cmdk.search')}
          >
            <Search size={15} />
            <span className="text-sm flex-1 text-left">{t('cmdk.search')}</span>
            <kbd className="text-[10px] border border-brand-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>

          {/* Right cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {addr && (
              <span className="badge-green hidden sm:inline-flex">
                <span className={`w-1.5 h-1.5 rounded-full ${sockOn ? 'bg-[rgb(var(--success))]' : 'bg-txt-disabled'}`} />
                {sockOn ? t('inbox.live') : t('inbox.waiting')}
              </span>
            )}
            <button onClick={() => setCmdkOpen(true)} className="md:hidden p-2 text-txt-secondary hover:text-txt-primary" aria-label={t('cmdk.search')}><Command size={18} /></button>
            {auth.isGuest ? (
              <>
                <button onClick={() => openAuth('login')} className="btn-ghost">{t('app.signIn')}</button>
                <button onClick={() => openAuth('register')} className="btn-primary" size="sm">{t('app.signUp')}</button>
              </>
            ) : (
              <div className="relative" ref={userMenuMobileRef}>
                <button onClick={() => setShowUserMenu((v) => !v)} className="flex items-center gap-2.5 rounded-[var(--r-md)] px-1.5 py-1.5 hover:bg-brand-surface2 transition-colors" aria-haspopup="menu" aria-expanded={showUserMenu}>
                  <Avatar src={auth.user?.avatar_url} fallback={(auth.user?.username || 'U')[0].toUpperCase()} size="sm" />
                  <span className="hidden sm:block text-left">
                    <span className="block text-sm font-medium text-txt-primary leading-none">{auth.user?.display_name || auth.user?.username}</span>
                    <span className="block text-[11px] text-txt-muted mt-1">{auth.isAdmin ? t('app.roleAdmin') : auth.isProPlus ? t('app.roleProPlus') : auth.isPro ? t('app.rolePro') : t('app.roleFree')}</span>
                  </span>
                  <ChevronDown size={14} className="text-txt-muted" />
                </button>
                {showUserMenu && renderUserMenu()}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full min-w-0 px-4 sm:px-6 py-6 pb-24 lg:pb-6 lg:max-w-[1400px] lg:mx-auto">

      <Modal
        show={pwModal.show}
        onClose={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }}
        title={t('app.passwordRequiredTitle')}
        subtitle={t('app.passwordRequiredSubtitle', { address: `${pwModal.username}@${pwModal.domain}` })}
        closeLabel={t('app.close')}
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
        closeLabel={t('app.close')}
        footer={<><button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary">{t('app.cancel')}</button><button onClick={doSetPw} disabled={!spwVal} className="btn-primary"><Lock size={12} /> {t('app.save')}</button></>}
      >
        <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder={t('app.passwordPlaceholder')} className="input" autoFocus />
      </Modal>

      <Modal
        show={compose.open}
        onClose={() => setCompose({ ...compose, open: false })}
        title={t('app.composeTitle')}
        closeLabel={t('app.close')}
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
        closeLabel={t('app.close')}
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
              {/* Mobile: show Inbox OR detail (not both stacked); Desktop: split view */}
              <div className={`min-h-[380px] xl:min-h-[590px] ${selected ? 'hidden xl:block' : ''}`}>
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              <div className={`min-h-[380px] xl:min-h-[590px] ${selected ? '' : 'hidden xl:block'}`}>
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={handleReply} onCopyOtp={copyOtp} />
              </div>
            </div>
          </div>
        ) : page === 'domains' ? (
          domains.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {domains.map((d) => (
                <div key={d.id} className="card p-4">
                  <div className="flex items-center gap-2.5">
                    <Globe size={16} className="text-[rgb(var(--brand))] shrink-0" />
                    <p className="t-mono font-semibold text-txt-primary truncate">{d.domain}</p>
                  </div>
                  {d.wildcard_subdomains === 1 && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="badge-blue">{t('domains.subdomainSupported')}</span>
                      <span className="t-caption text-txt-muted">*.{d.domain}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Globe} title={t('domains.noneTitle')} description={t('app.noActiveDomains')} />
          )
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
              accent={accent}
              onAccentChange={setAccent}
              onRequestPro={handleRequestPro}
              onLogin={() => openAuth('login')}
              onRegister={() => openAuth('register')}
              onLogout={auth.logout}
              onAdmin={() => auth.isAdmin && navigate('admin')}
            />
          </div>
        ) : page === 'bulk' ? (
          <BulkStudio token={auth.token} user={auth.user} pkg={auth.pkg} domains={domains} onOpenPool={setBulkInboxPool} />
        ) : page === 'automation' ? (
          auth.isGuest ? <EmptyState icon={Workflow} title={t('app.automationGuestTitle')} description={t('app.automationGuestHint')} action={<button className="btn-primary" onClick={() => openAuth('register')}>{t('app.signUp')}</button>} /> : <AutomationCenter token={auth.token} isAdmin={auth.isAdmin} />
        ) : page === 'docs' ? (
          <DocumentationCenter />
        ) : page === 'admin-bulk' && auth.isAdmin ? (
          <AdminBulkStudio token={auth.token} user={auth.user} domains={domains} />
        ) : auth.isAdmin ? (
          <AdminPanel
            api={API}
            token={auth.token}
            notificationSound={notificationSound}
            notificationSounds={NOTIFICATION_SOUNDS}
            onNotificationSoundChange={setNotificationSound}
            onPreviewNotificationSound={handlePreviewNotificationSound}
          />
        ) : (
          <EmptyState icon={Shield} title={t('app.adminRequired')} />
        )}
          </main>

          <footer className="border-t border-brand-border/60 px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
            <p className="t-caption text-txt-muted">MS Temp Mail · Emir Han Mamak</p>
            <div className="flex items-center gap-2">
              {addr && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] ${sockOn ? 'text-[rgb(var(--success-fg))]' : 'text-txt-muted'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sockOn ? 'bg-[rgb(var(--success))]' : 'bg-txt-disabled'}`} />
                  {sockOn ? t('inbox.live') : t('inbox.waiting')}
                </span>
              )}
              {emails.length > 0 && (
                <span className="text-[10px] text-txt-muted">{emails.length} mail</span>
              )}
              {notif && (
                <span className={`text-[10px] truncate max-w-[120px] ${notif.type === 'success' ? 'text-[rgb(var(--success-fg))]' : notif.type === 'error' ? 'text-[rgb(var(--danger-fg))]' : 'text-[rgb(var(--brand))]'}`}>
                  {notif.message}
                </span>
              )}
            </div>
          </footer>

      {/* Mobile bottom tab bar (replaces left rail / mobile drawer) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-brand-border bg-brand-bg/95 backdrop-blur-xl" aria-label={t('app.mobileNavAria')}>
        <div className="grid grid-flow-col auto-cols-fr">
          {navGroups.flatMap((g) => g.items).slice(0, 5).map((it) => {
            const active = page === it.id;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => navigate(it.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${active ? 'text-[rgb(var(--brand))]' : 'text-txt-muted hover:text-txt-secondary'}`}
              >
                <it.icon size={20} className={active ? 'text-[rgb(var(--brand))]' : 'text-txt-muted'} />
                {it.label}
              </button>
            );
          })}
        </div>
      </nav>

      <ConfirmationDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteEmail}
        title={t('inbox.confirmDelete')}
        cancelLabel={t('app.cancel')}
        confirmLabel={t('app.continue')}
      />

      {/* Command palette */}
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} items={commandItems} placeholder={t('cmdk.search')} emptyLabel={t('cmdk.empty')} />

      {/* Bulk Inbox full-screen modal */}
      <Modal
        show={Boolean(bulkInboxPool)}
        onClose={() => setBulkInboxPool(null)}
        title={bulkInboxPool ? `${bulkInboxPool.prefix}_*@${bulkInboxPool.domain}` : ''}
        subtitle={t('bulkInbox.modalSubtitle')}
        size="full"
        closeLabel={t('app.close')}
      >
        {bulkInboxPool && <BulkInbox token={auth.token} pool={bulkInboxPool} />}
      </Modal>

      {/* Toast */}
      {notif && (
        <div className={`fixed top-20 right-4 z-[1100] card px-4 py-3 flex items-center gap-2.5 animate-slide-down max-w-[min(360px,calc(100vw-2rem))] ${notif.type === 'success' ? 'text-[rgb(var(--success-fg))]' : notif.type === 'error' ? 'text-[rgb(var(--danger-fg))]' : 'text-[rgb(var(--brand))]'}`} role="status" aria-live="polite">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${notif.type === 'success' ? 'bg-[rgb(var(--success))]' : notif.type === 'error' ? 'bg-[rgb(var(--danger))]' : 'bg-[rgb(var(--brand))]'}`} />
          <span className="t-body-sm text-txt-primary">{notif.message}</span>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-brand-bg/92 backdrop-blur-xl">
          <AuthPage
            defaultMode={authMode}
            onLogin={auth.login}
            onRegister={auth.register}
            onClose={() => setShowAuth(false)}
            onGuestContinue={() => setShowAuth(false)}
          />
        </div>
      )}
    </div>
    </LocaleProvider>
  );
}
