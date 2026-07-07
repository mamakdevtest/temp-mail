import { lazy, Suspense, startTransition, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Globe, Send, X, KeyRound, Lock, ChevronDown, User, Crown, Shield, Sparkles } from 'lucide-react';
import useAuth from './hooks/useAuth';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AccountPanel from './components/AccountPanel';
import Modal from './components/Modal';
import { playNotificationSound, NOTIFICATION_SOUNDS } from './utils/notificationSound';

const AuthPage = lazy(() => import('./components/AuthPage'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

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
  const [notificationSound, setNotificationSound] = useState(() => {
    const saved = localStorage.getItem('tm-notification-sound');
    return NOTIFICATION_SOUNDS.some((sound) => sound.id === saved) ? saved : DEFAULT_NOTIFICATION_SOUND;
  });
  const { init: initBeep, play: playBeep, preview: previewBeep } = useBeep(notificationSound);
  const [page, setPage] = useState('inbox');
  const [addr, setAddr] = useState(null);
  const [domains, setDomains] = useState([]);
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

  const userMenuRef = useRef(null);
  const sockRef = useRef(null);
  const notifTimer = useRef(null);
  const pollTimerRef = useRef(null);
  const pollDelayRef = useRef(5000);
  const restoredRef = useRef(false);

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
      s.on('new-email', (d) => {
        setEmails((p) => (p.some((e) => e.id === d.id) ? p : [d, ...p]));
        toast(`Yeni mail: ${d.sender}`, 'info');
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
      const r = await fetch(`${API}/addresses/${saved.address}`);
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
  }, []);

  const loadDomains = useCallback(async () => {
    try {
      const r = await fetch(`${API}/addresses/domains`);
      if (r.ok) {
        const d = await r.json();
        if (d.domains) setDomains(d.domains);
      }
    } catch (e) {
      /* */
    }
  }, []);

  const genRandom = useCallback(async (password) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const body = {};
      if (password) body.password = password;
      const r = await fetch(`${API}/addresses/random`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Adres oluşturulamadı');
      setAddr(d);
      setEmails([]);
      toast(d.has_password ? 'Şifreli adres oluşturuldu' : 'Yeni adres hazır', 'success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const openAddr = useCallback(async (username, domain, password, subdomain = null) => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const body = { username, domain };
      if (password) body.password = password;
      if (subdomain) body.subdomain = subdomain;
      const r = await fetch(`${API}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
      setAddr(d);
      setEmails(d.emails || []);
      toast(d.returned ? 'Adres açıldı' : 'Yeni adres hazır', 'success');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const pwSubmit = useCallback(async () => {
    if (!pwInput) return;
    setLoading(true);
    setPwErr('');
    try {
      const r = await fetch(`${API}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwModal.username, domain: pwModal.domain, password: pwInput }),
      });
      const d = await r.json();
      if (!r.ok) {
        setPwErr(d.error || 'Yanlış şifre');
        setLoading(false);
        return;
      }
      setAddr(d);
      setEmails(d.emails || []);
      setPwModal({ show: false, username: '', domain: '' });
      toast('Adres erişimi açıldı', 'success');
    } catch (e) {
      setPwErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [pwInput, pwModal, toast]);

  const doSetPw = useCallback(async () => {
    if (!spwVal || !addr) return;
    try {
      const r = await fetch(`${API}/addresses/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      toast('Şifre ayarlandı', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [spwVal, addr, toast]);

  const doRequestPro = useCallback(async () => {
    try {
      await auth.requestPro(proReqMsg);
      setProReqShow(false);
      setProReqMsg('');
      toast('Pro isteği gönderildi', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }, [auth, proReqMsg, toast]);

  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try {
      const r = await fetch(`${API}/emails/${addr.address}`);
      if (r.ok) {
        const d = await r.json();
        if (d.emails) setEmails(d.emails);
        pollDelayRef.current = 5000;
      } else {
        pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000);
      }
    } catch (e) {
      pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000);
    }
  }, [addr]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadEmails();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadEmails]);

  const loadDetail = useCallback(async (id) => {
    try {
      const r = await fetch(`${API}/emails/single/${id}`);
      if (r.ok) setSelected(await r.json());
    } catch (e) {
      /* */
    }
  }, []);

  const delEmail = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Silsin mi?')) return;
    try {
      const r = await fetch(`${API}/emails/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setEmails((p) => p.filter((x) => x.id !== id));
        if (selected?.id === id) setSelected(null);
        toast('Silindi', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }, [selected, toast]);

  const sendMail = useCallback(async () => {
    if (!compose.to || !compose.subject || !compose.body || !addr) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: addr.address, ...compose }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setCompose({ open: false, to: '', subject: '', body: '' });
      toast('Gönderildi', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  }, [compose, addr, toast]);

  const copyAddr = () => {
    if (!addr) return;
    navigator.clipboard.writeText(addr.address).then(
      () => toast('Kopyalandı', 'success'),
      () => toast('Kopyalama başarısız oldu', 'error')
    );
  };

  const copyOtp = useCallback((o) => {
    navigator.clipboard.writeText(o).then(
      () => toast(`OTP: ${o}`, 'success'),
      () => toast('OTP kopyalanamadı', 'error')
    );
  }, [toast]);

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
          <p className="text-xs text-txt-muted">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const activeDomain = addr?.address?.split('@')[1] || (domains[0]?.domain || '');

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-accent-purple/10 blur-[120px]" />
        <div className="absolute top-32 right-0 h-80 w-80 rounded-full bg-accent-cyan/8 blur-[140px]" />
        <div className="absolute bottom-20 left-0 h-72 w-72 rounded-full bg-accent-blue/8 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-brand-border/40 bg-brand-bg/75 backdrop-blur-2xl">
        <div className="max-w-[1680px] mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl panel-soft flex items-center justify-center shadow-glow-cyan">
              <Mail size={20} className="text-accent-cyan" />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight text-txt-primary">MS Temp Mail</p>
              <p className="text-[11px] text-txt-muted">Mamak Studio temporary mail workspace</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => startTransition(() => setPage('inbox'))} className={`nav-pill ${page === 'inbox' ? 'nav-pill-active' : ''}`}><InboxIcon size={16} /> Inbox <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" /></button>
            <button onClick={() => startTransition(() => setPage('domains'))} className={`nav-pill ${page === 'domains' ? 'nav-pill-active' : ''}`}><Globe size={16} /> Domains</button>
            {auth.isAdmin && <button onClick={() => startTransition(() => setPage('admin'))} className={`nav-pill ${page === 'admin' ? 'nav-pill-active' : ''}`}><Shield size={16} /> Admin</button>}
          </div>

          <div className="flex items-center gap-3">
            {auth.isGuest ? (
              <>
                <button onClick={() => openAuth('login')} className="btn-secondary px-4 py-2.5 text-xs">Giriş Yap</button>
                <button onClick={() => openAuth('register')} className="btn-primary px-4 py-2.5 text-xs">Kayıt Ol</button>
              </>
            ) : (
              <div className="relative flex items-center gap-4 pl-4 border-l border-brand-border/45" ref={userMenuRef}>
                <button onClick={() => setShowUserMenu((v) => !v)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-brand-surface2/60 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-purple flex items-center justify-center text-white font-semibold shadow-glow-blue">
                    {(auth.user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-txt-primary leading-none">{auth.user?.display_name || auth.user?.username}</p>
                    <p className="text-[11px] text-txt-secondary mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-green" />
                      {auth.isAdmin ? 'Admin Kullanıcı' : auth.isPro ? 'Pro Kullanıcı' : 'Free Kullanıcı'}
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
                    {auth.isAdmin && <button onClick={() => { setShowUserMenu(false); startTransition(() => setPage('admin')); }} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-txt-secondary hover:bg-brand-surface2 transition-colors"><Settings size={14} /> Admin Paneli</button>}
                    {auth.isFree && <button onClick={() => { setShowUserMenu(false); setProReqShow(true); }} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-accent-purple hover:bg-accent-purple/5 transition-colors"><Crown size={14} /> Pro'ya Geç</button>}
                    <button onClick={() => auth.logout()} className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-sm text-accent-red hover:bg-accent-red/5 transition-colors"><X size={14} /> Çıkış Yap</button>
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
        title="Şifre Gerekli"
        subtitle={`${pwModal.username}@${pwModal.domain} şifre korumalı`}
        footer={<><button onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} className="btn-secondary">İptal</button><button onClick={pwSubmit} disabled={!pwInput || loading} className="btn-primary"><KeyRound size={12} /> Giriş</button></>}
      >
        <input type="password" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pwSubmit()} placeholder="Şifre" className="input" autoFocus />
        {pwErr && <p className="text-accent-red text-xs mt-2">{pwErr}</p>}
      </Modal>

      <Modal
        show={spwShow}
        onClose={() => { setSpwShow(false); setSpwVal(''); }}
        title="Şifre Belirle"
        subtitle="Sonraki erişimlerde şifre istenecek"
        footer={<><button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary">İptal</button><button onClick={doSetPw} disabled={!spwVal} className="btn-primary"><Lock size={12} /> Kaydet</button></>}
      >
        <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder="Şifre" className="input" autoFocus />
      </Modal>

      <Modal
        show={compose.open}
        onClose={() => setCompose({ ...compose, open: false })}
        title="Yeni Mail"
        wide
        footer={<><button onClick={() => setCompose({ ...compose, open: false })} className="btn-secondary">İptal</button><button onClick={sendMail} disabled={sending} className="btn-primary">{sending ? '⏳' : <Send size={12} />} Gönder</button></>}
      >
        <div className="space-y-3">
          <div><label className="section-title mb-1.5 block">Gönderen</label><input value={addr?.address || ''} disabled className="input opacity-50 text-xs" /></div>
          <div><label className="section-title mb-1.5 block">Alıcı</label><input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="alici@ornek.com" className="input" autoFocus /></div>
          <div><label className="section-title mb-1.5 block">Konu</label><input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Konu" className="input" /></div>
          <div><label className="section-title mb-1.5 block">İçerik</label><textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="input resize-y" /></div>
        </div>
      </Modal>

      <Modal
        show={proReqShow}
        onClose={() => { setProReqShow(false); setProReqMsg(''); }}
        title="Pro'ya Yükselt"
        subtitle="Admin onayı ile Pro kullanıcı olun"
        footer={<><button onClick={() => setProReqShow(false)} className="btn-secondary">İptal</button><button onClick={doRequestPro} className="btn-primary"><Crown size={12} /> İstek Gönder</button></>}
      >
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-accent-purple/8 border border-accent-purple/15">
            <p className="text-xs font-semibold text-accent-purple mb-2">Pro Paket Özellikleri</p>
            <ul className="text-[11px] text-txt-muted space-y-1">
              <li>• Sınırsız adres oluşturma</li>
              <li>• 5000 mail saklama</li>
              <li>• 365 gün saklama süresi</li>
              <li>• Özel domain desteği</li>
              <li>• Webhook entegrasyonu</li>
            </ul>
          </div>
          <div>
            <label className="section-title mb-1.5 block">Mesaj (opsiyonel)</label>
            <textarea value={proReqMsg} onChange={(e) => setProReqMsg(e.target.value)} placeholder="Neden Pro olmak istiyorsunuz?" rows={3} className="input resize-y" />
          </div>
        </div>
      </Modal>

      {showAuth && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-brand-bg/92 backdrop-blur-xl">
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-txt-muted">Yükleniyor...</div>}>
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

      <main className="relative z-10 max-w-[1680px] mx-auto px-5 sm:px-8 py-6 sm:py-8">
        {page === 'inbox' ? (
          <div className="space-y-6">
            <AddressBar currentAddress={addr} loading={loading} error={error} domains={domains} history={history} onGenerate={genRandom} onSubmit={openAddr} onCopy={copyAddr} onSetPassword={handleSetPassword} isPro={auth.isPro} />
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-4 2xl:col-span-4 min-h-[530px]">
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              <div className="xl:col-span-5 2xl:col-span-5 min-h-[530px]">
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={handleReply} onCopyOtp={copyOtp} />
              </div>
              <div className="xl:col-span-3 2xl:col-span-3 min-h-[530px]">
                <AccountPanel
                  auth={auth}
                  user={auth.user}
                  pkg={auth.pkg}
                  stats={auth.stats}
                  activeDomain={activeDomain}
                  emailCount={emails.length}
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
                  onAdmin={() => auth.isAdmin && setPage('admin')}
                />
              </div>
            </div>
          </div>
        ) : page === 'domains' ? (
          <div className="card p-8 sm:p-10 text-center">
            <div className="w-16 h-16 rounded-3xl panel-soft flex items-center justify-center mx-auto mb-5 animate-float-soft">
              <Globe size={28} className="text-accent-cyan" />
            </div>
            <p className="text-xl font-semibold text-txt-primary">Aktif Domainler</p>
            <p className="text-sm text-txt-muted mt-2">Şu anda kullanılabilir alan adları aşağıda listeleniyor.</p>
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
              )) : <div className="text-sm text-txt-muted col-span-full">Henüz aktif domain yok.</div>}
            </div>
          </div>
        ) : auth.isAdmin ? (
          <Suspense fallback={<div className="card p-10 text-center text-txt-muted">Admin paneli yükleniyor...</div>}>
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

      <footer className="relative z-10 px-5 sm:px-8 pb-8 pt-5 text-center">
        <p className="text-sm text-txt-muted flex items-center justify-center gap-2">
          <Sparkles size={14} className="text-accent-blue" />
          MS Temp Mail • Dev: Emir Han Mamak • Mamak Studio
        </p>
      </footer>
    </div>
  );
}
