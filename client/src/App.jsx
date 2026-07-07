import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Sun, Moon, ArrowLeft, Send, X, KeyRound, Lock, HelpCircle, ChevronDown, User, Crown, Shield, Bell } from 'lucide-react';
import useAuth from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AccountPanel from './components/AccountPanel';
import AdminPanel from './components/AdminPanel';
import Modal from './components/Modal';

const API = '/api';

function useBeep() {
  const ctxRef = useRef(null);
  const init = useCallback(() => { try { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); if (ctxRef.current.state === 'suspended') ctxRef.current.resume(); } catch (e) { /* */ } }, []);
  const play = useCallback(() => { try { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); const c = ctxRef.current; if (c.state === 'suspended') c.resume(); const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.setValueAtTime(523, c.currentTime); o.frequency.exponentialRampToValueAtTime(784, c.currentTime + 0.1); g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4); o.start(c.currentTime); o.stop(c.currentTime + 0.4); } catch (e) { /* */ } }, []);
  return { init, play };
}

export default function App() {
  const auth = useAuth();
  const { init: initBeep, play: playBeep } = useBeep();
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
  const [sendOk, setSendOk] = useState({ configured: false });
  const [sending, setSending] = useState(false);
  const [sockOn, setSockOn] = useState(false);
  const [pwModal, setPwModal] = useState({ show: false, username: '', domain: '' });
  const [pwInput, setPwInput] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [spwShow, setSpwShow] = useState(false);
  const [spwVal, setSpwVal] = useState('');
  const [proReqShow, setProReqShow] = useState(false);
  const [proReqMsg, setProReqMsg] = useState('');
  const [history, setHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('tm-history') || '[]'); } catch (e) { return []; } });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const sockRef = useRef(null);
  const notifTimer = useRef(null);
  const pollTimerRef = useRef(null);
  const pollDelayRef = useRef(5000);
  const restoredRef = useRef(false);

  useEffect(() => { const h = () => initBeep(); document.addEventListener('click', h, { once: true }); document.addEventListener('keydown', h, { once: true }); return () => { document.removeEventListener('click', h); document.removeEventListener('keydown', h); }; }, [initBeep]);
  useEffect(() => { const h = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);

  const toast = useCallback((msg, type = 'info') => { if (notifTimer.current) clearTimeout(notifTimer.current); setNotif({ message: msg, type }); notifTimer.current = setTimeout(() => setNotif(null), 3500); }, []);

  // Socket.io
  useEffect(() => {
    if (!auth.user) return;
    try {
      const s = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
      sockRef.current = s;
      s.on('connect', () => { setSockOn(true); pollDelayRef.current = 5000; });
      s.on('disconnect', () => setSockOn(false));
      s.on('new-email', (d) => { setEmails((p) => p.some((e) => e.id === d.id) ? p : [d, ...p]); toast(`📩 Yeni mail: ${d.sender}`, 'info'); playBeep(); });
      return () => { try { s.disconnect(); } catch (e) { /* */ } };
    } catch (e) { console.warn('Socket.io:', e); }
  }, [auth.user, toast, playBeep]);

  useEffect(() => { try { if (sockRef.current && addr) sockRef.current.emit('subscribe', addr.address); } catch (e) { /* */ } }, [addr]);

  // Geçmiş
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
    } catch (e) { /* */ }
  }, [addr]);

  const restoreLastAddress = useCallback(async () => {
    if (restoredRef.current) return; restoredRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem('tm-last-addr') || 'null');
      if (!saved?.address) return false;
      const r = await fetch(`${API}/addresses/${saved.address}`);
      if (r.ok) { const d = await r.json(); setAddr(d); setEmails(d.emails || []); return true; }
    } catch (e) { /* */ }
    return false;
  }, []);

  const loadDomains = useCallback(async () => { try { const r = await fetch(`${API}/addresses/domains`); if (r.ok) { const d = await r.json(); if (d.domains) setDomains(d.domains); } } catch (e) { /* */ } }, []);
  const loadSendStatus = useCallback(async () => { try { const r = await fetch(`${API}/emails/send/status`); if (r.ok) setSendOk(await r.json()); } catch (e) { /* */ } }, []);

  const genRandom = useCallback(async (password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = {}; if (password) body.password = password;
      const r = await fetch(`${API}/addresses/random`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Adres oluşturulamadı');
      setAddr(d); setEmails([]); toast(d.has_password ? 'Şifreli adres oluşturuldu!' : 'Yeni adres!', 'success');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  const openAddr = useCallback(async (username, domain, password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = { username, domain }; if (password) body.password = password;
      const r = await fetch(`${API}/addresses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.status === 403 && d.error === 'password_required') { setPwModal({ show: true, username, domain }); setPwInput(''); setPwErr(''); setLoading(false); return; }
      if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
      setAddr(d); setEmails(d.emails || []); toast(d.returned ? 'Erişildi!' : 'Yeni adres!', 'success');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  const pwSubmit = useCallback(async () => {
    if (!pwInput) return; setLoading(true); setPwErr('');
    try {
      const r = await fetch(`${API}/addresses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: pwModal.username, domain: pwModal.domain, password: pwInput }) });
      const d = await r.json(); if (!r.ok) { setPwErr(d.error || 'Yanlış şifre'); setLoading(false); return; }
      setAddr(d); setEmails(d.emails || []); setPwModal({ show: false, username: '', domain: '' }); toast('Giriş yapıldı!', 'success');
    } catch (e) { setPwErr(e.message); } finally { setLoading(false); }
  }, [pwInput, pwModal, toast]);

  const doSetPw = useCallback(async () => {
    if (!spwVal || !addr) return;
    try {
      const r = await fetch(`${API}/addresses/set-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr.address, password: spwVal }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      setAddr((p) => ({ ...p, has_password: true }));
      setHistory((p) => { const n = p.map((h) => h.address === addr.address ? { ...h, has_password: true } : h); localStorage.setItem('tm-history', JSON.stringify(n)); return n; });
      setSpwShow(false); setSpwVal(''); toast('Şifre ayarlandı!', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }, [spwVal, addr, toast]);

  const doRequestPro = useCallback(async () => {
    try { await auth.requestPro(proReqMsg); setProReqShow(false); setProReqMsg(''); toast('Pro isteği gönderildi!', 'success'); } catch (e) { toast(e.message, 'error'); }
  }, [auth, proReqMsg, toast]);

  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try { const r = await fetch(`${API}/emails/${addr.address}`); if (r.ok) { const d = await r.json(); if (d.emails) setEmails(d.emails); pollDelayRef.current = 5000; } else { pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); } } catch (e) { pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); }
  }, [addr]);
  const refresh = useCallback(async () => { setRefreshing(true); await loadEmails(); setTimeout(() => setRefreshing(false), 500); }, [loadEmails]);
  const loadDetail = useCallback(async (id) => { try { const r = await fetch(`${API}/emails/single/${id}`); if (r.ok) setSelected(await r.json()); } catch (e) { /* */ } }, []);
  const delEmail = useCallback(async (id, e) => { if (e) e.stopPropagation(); if (!confirm('Silsin mi?')); try { const r = await fetch(`${API}/emails/${id}`, { method: 'DELETE' }); if (r.ok) { setEmails((p) => p.filter((x) => x.id !== id)); if (selected?.id === id) setSelected(null); toast('Silindi', 'success'); } } catch (e) { toast(e.message, 'error'); } }, [selected, toast]);
  const sendMail = useCallback(async () => { if (!compose.to || !compose.subject || !compose.body || !addr) return; setSending(true); try { const r = await fetch(`${API}/emails/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: addr.address, ...compose }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setCompose({ open: false, to: '', subject: '', body: '' }); toast('Gönderildi!', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setSending(false); } }, [compose, addr, toast]);
  const copyAddr = () => { if (addr) { navigator.clipboard.writeText(addr.address); toast('Kopyalandı!', 'success'); } };
  const copyOtp = useCallback((o) => { navigator.clipboard.writeText(o); toast(`OTP: ${o}`, 'success'); }, [toast]);
  const openCompose = (pre = {}) => setCompose({ open: true, to: pre.to || '', subject: pre.subject || '', body: '' });

  // Init
  useEffect(() => { if (auth.user) { loadDomains(); loadSendStatus(); restoreLastAddress(); } }, [auth.user, loadDomains, loadSendStatus, restoreLastAddress]);
  useEffect(() => { if (domains.length > 0 && !addr && !loading && restoredRef.current && auth.user) { if (!localStorage.getItem('tm-last-addr')) genRandom(); } }, [domains]); // eslint-disable-line
  useEffect(() => { if (!addr || sockOn) { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); return; } loadEmails(); const tick = () => { loadEmails(); pollTimerRef.current = setTimeout(tick, pollDelayRef.current); }; pollTimerRef.current = setTimeout(tick, pollDelayRef.current); return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }; }, [addr, sockOn, loadEmails]);

  // ===== AUTH LOADING =====
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center mx-auto mb-3 animate-pulse-soft"><Mail size={20} className="text-white" /></div>
          <p className="text-xs text-txt-muted">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // ===== AUTH SAYFASI =====
  if (!auth.user) {
    return <AuthPage onLogin={auth.login} onRegister={auth.register} />;
  }

  const activeDomain = addr?.address?.split('@')[1] || (domains[0]?.domain || '');

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {page !== 'inbox' && <button onClick={() => { setPage('inbox'); setSelected(null); }} className="p-1.5 rounded-lg text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2 transition-colors"><ArrowLeft size={16} /></button>}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('inbox')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center"><Mail size={16} className="text-white" /></div>
              <span className="text-sm font-bold"><span className="text-txt-primary">Temp</span><span className="text-accent-cyan">Mail</span></span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <button onClick={() => setPage('inbox')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${page === 'inbox' ? 'bg-accent-blue/15 text-accent-blue' : 'text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2'}`}><InboxIcon size={13} /> Inbox</button>
            {auth.isAdmin && <button onClick={() => setPage('admin')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${page === 'admin' ? 'bg-accent-blue/15 text-accent-blue' : 'text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2'}`}><Settings size={13} /> Admin</button>}
            <button className="btn-ghost"><HelpCircle size={13} /></button>
          </nav>
          <div className="flex items-center gap-2">
            {/* Pro badge */}
            {auth.isPro && <span className="badge-purple text-[9px]"><Crown size={9} /> Pro</span>}
            {/* Role badge */}
            {auth.isAdmin && <span className="badge-blue text-[9px]"><Shield size={9} /> Admin</span>}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-brand-surface2 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-[10px] font-bold">{(auth.user?.username || 'U')[0].toUpperCase()}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-medium text-txt-primary leading-none">{auth.user?.username}</p>
                  <p className="text-[9px] text-txt-muted leading-none mt-0.5 capitalize">{auth.user?.role}</p>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full ${auth.isPro ? 'bg-accent-purple' : 'bg-accent-green'}`} />
                <ChevronDown size={12} className="text-txt-muted" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 card p-1 z-50 animate-slide-down">
                  <div className="px-3 py-2 border-b border-brand-border/20 mb-1">
                    <p className="text-xs font-medium text-txt-primary">{auth.user?.username}</p>
                    <p className="text-[10px] text-txt-muted">{auth.user?.email}</p>
                  </div>
                  {auth.isAdmin && <button onClick={() => { setShowUserMenu(false); setPage('admin'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-txt-secondary hover:bg-brand-surface2 transition-colors"><Settings size={12} /> Admin Paneli</button>}
                  {auth.isFree && <button onClick={() => { setShowUserMenu(false); setProReqShow(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent-purple hover:bg-accent-purple/5 transition-colors"><Crown size={12} /> Pro Ol</button>}
                  <button onClick={() => { auth.logout(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent-red hover:bg-accent-red/5 transition-colors"><X size={12} /> Çıkış</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast */}
      {notif && <div className={`fixed top-16 right-4 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium animate-slide-down ${notif.type === 'success' ? 'bg-accent-green/20 text-accent-green border border-accent-green/20' : notif.type === 'error' ? 'bg-accent-red/20 text-accent-red border border-accent-red/20' : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/20'}`}>{notif.message}</div>}

      {/* Modals */}
      <Modal show={pwModal.show} onClose={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} title="Şifre Gerekli" subtitle={`${pwModal.username}@${pwModal.domain} şifre korumalı`}
        footer={<><button onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} className="btn-secondary">İptal</button><button onClick={pwSubmit} disabled={!pwInput || loading} className="btn-primary"><KeyRound size={12} /> Giriş</button></>}>
        <input type="password" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pwSubmit()} placeholder="Şifre" className="input" autoFocus />
        {pwErr && <p className="text-accent-red text-xs mt-2">{pwErr}</p>}
      </Modal>
      <Modal show={spwShow} onClose={() => { setSpwShow(false); setSpwVal(''); }} title="Şifre Belirle" subtitle="Sonraki erişimlerde şifre istenecek"
        footer={<><button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary">İptal</button><button onClick={doSetPw} disabled={!spwVal} className="btn-primary"><Lock size={12} /> Kaydet</button></>}>
        <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder="Şifre" className="input" autoFocus />
      </Modal>
      <Modal show={compose.open} onClose={() => setCompose({ ...compose, open: false })} title="Yeni Mail" wide
        footer={<><button onClick={() => setCompose({ ...compose, open: false })} className="btn-secondary">İptal</button><button onClick={sendMail} disabled={sending} className="btn-primary">{sending ? '⏳' : <Send size={12} />} Gönder</button></>}>
        <div className="space-y-3">
          <div><label className="section-title mb-1.5 block">Gönderen</label><input value={addr?.address || ''} disabled className="input opacity-50 text-xs" /></div>
          <div><label className="section-title mb-1.5 block">Alıcı</label><input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="alici@ornek.com" className="input" autoFocus /></div>
          <div><label className="section-title mb-1.5 block">Konu</label><input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Konu" className="input" /></div>
          <div><label className="section-title mb-1.5 block">İçerik</label><textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="input resize-y" /></div>
        </div>
      </Modal>
      {/* Pro Request Modal */}
      <Modal show={proReqShow} onClose={() => { setProReqShow(false); setProReqMsg(''); }} title="Pro'ya Yükselt" subtitle="Admin onayı ile Pro kullanıcı olun"
        footer={<><button onClick={() => setProReqShow(false)} className="btn-secondary">İptal</button><button onClick={doRequestPro} className="btn-primary"><Crown size={12} /> İstek Gönder</button></>}>
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-accent-purple/5 border border-accent-purple/15">
            <p className="text-xs font-semibold text-accent-purple mb-1">Pro Paket Özellikleri</p>
            <ul className="text-[10px] text-txt-muted space-y-0.5">
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

      {/* MAIN */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {page === 'inbox' ? (
          <div className="space-y-5">
            <AddressBar currentAddress={addr} loading={loading} error={error} domains={domains} history={history} onGenerate={genRandom} onSubmit={openAddr} onCopy={copyAddr} onSetPassword={() => auth.isPro ? setSpwShow(true) : setProReqShow(true)} isPro={auth.isPro} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4 xl:col-span-3">
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              <div className="lg:col-span-5 xl:col-span-6">
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={auth.isPro ? openCompose : () => setProReqShow(true)} onCopyOtp={copyOtp} />
              </div>
              <div className="lg:col-span-3">
                <AccountPanel user={auth.user} pkg={auth.pkg} stats={auth.stats} activeDomain={activeDomain} emailCount={emails.length} isPro={auth.isPro} isAdmin={auth.isAdmin} onRequestPro={() => setProReqShow(true)} onLogout={auth.logout} onAdmin={() => auth.isAdmin && setPage('admin')} />
              </div>
            </div>
          </div>
        ) : auth.isAdmin ? (
          <AdminPanel api={API} token={auth.token} />
        ) : (
          <div className="card p-10 text-center"><Shield size={40} className="mx-auto mb-3 text-txt-disabled" /><p className="text-sm text-txt-secondary">Admin yetkisi gerekiyor</p></div>
        )}
      </main>

      <footer className="border-t border-brand-border/10 py-6 text-center">
        <p className="text-[10px] text-txt-disabled flex items-center justify-center gap-1.5"><Lock size={10} /> TempMail ile gizliliğinizi koruyun. Geçici e-posta, daha az spam.</p>
      </footer>
    </div>
  );
}
