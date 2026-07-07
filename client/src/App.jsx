import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Sun, Moon, ArrowLeft, Send, X, KeyRound, Lock, HelpCircle, ChevronDown, User } from 'lucide-react';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AccountPanel from './components/AccountPanel';
import AdminPanel from './components/AdminPanel';
import Modal from './components/Modal';

const API = '/api';

function useBeep() {
  const ctxRef = useRef(null);
  const init = useCallback(() => { try { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); if (ctxRef.current.state === 'suspended') ctxRef.current.resume(); } catch (e) { console.warn('Audio init:', e); } }, []);
  const play = useCallback(() => { try { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); const c = ctxRef.current; if (c.state === 'suspended') c.resume(); const o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.type = 'sine'; o.frequency.setValueAtTime(523, c.currentTime); o.frequency.exponentialRampToValueAtTime(784, c.currentTime + 0.1); g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4); o.start(c.currentTime); o.stop(c.currentTime + 0.4); } catch (e) { /* */ } }, []);
  return { init, play };
}

export default function App() {
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

  /* Socket.io */
  useEffect(() => {
    try {
      const s = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
      sockRef.current = s;
      s.on('connect', () => { setSockOn(true); pollDelayRef.current = 5000; });
      s.on('disconnect', () => setSockOn(false));
      s.on('new-email', (d) => { setEmails((p) => p.some((e) => e.id === d.id) ? p : [d, ...p]); toast(`📩 Yeni mail: ${d.sender}`, 'info'); playBeep(); });
      return () => { try { s.disconnect(); } catch (e) { console.warn('Socket kapatma:', e); } };
    } catch (e) { console.warn('Socket.io:', e); }
  }, [toast, playBeep]);

  useEffect(() => { try { if (sockRef.current && addr) sockRef.current.emit('subscribe', addr.address); } catch (e) { /* */ } }, [addr]);

  /* Geçmiş kaydet */
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
    } catch (e) { console.warn('Restore:', e); }
    return false;
  }, []);

  const loadDomains = useCallback(async () => { try { const r = await fetch(`${API}/addresses/domains`); if (r.ok) { const d = await r.json(); if (d.domains) setDomains(d.domains); } } catch (e) { console.warn('Domains:', e); } }, []);
  const loadSendStatus = useCallback(async () => { try { const r = await fetch(`${API}/emails/send/status`); if (r.ok) setSendOk(await r.json()); } catch (e) { /* */ } }, []);

  const genRandom = useCallback(async (password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = {}; if (password) body.password = password;
      const r = await fetch(`${API}/addresses/random`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Adres oluşturulamadı');
      setAddr(d); setEmails([]); toast(d.has_password ? 'Şifreli adres oluşturuldu!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { console.error('GenRandom:', e); setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  const openAddr = useCallback(async (username, domain, password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = { username, domain }; if (password) body.password = password;
      const r = await fetch(`${API}/addresses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.status === 403 && d.error === 'password_required') { setPwModal({ show: true, username, domain }); setPwInput(''); setPwErr(''); setLoading(false); return; }
      if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
      setAddr(d); setEmails(d.emails || []); toast(d.returned ? 'Adrese erişildi!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { console.error('OpenAddr:', e); setError(e.message); } finally { setLoading(false); }
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

  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try { const r = await fetch(`${API}/emails/${addr.address}`); if (r.ok) { const d = await r.json(); if (d.emails) setEmails(d.emails); pollDelayRef.current = 5000; } else { pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); } } catch (e) { pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); }
  }, [addr]);
  const refresh = useCallback(async () => { setRefreshing(true); await loadEmails(); setTimeout(() => setRefreshing(false), 500); }, [loadEmails]);
  const loadDetail = useCallback(async (id) => { try { const r = await fetch(`${API}/emails/single/${id}`); if (r.ok) setSelected(await r.json()); } catch (e) { /* */ } }, []);
  const delEmail = useCallback(async (id, e) => { if (e) e.stopPropagation(); if (!confirm('Bu maili silmek istediğinize emin misiniz?')); try { const r = await fetch(`${API}/emails/${id}`, { method: 'DELETE' }); if (r.ok) { setEmails((p) => p.filter((x) => x.id !== id)); if (selected?.id === id) setSelected(null); toast('Silindi', 'success'); } } catch (e) { toast(e.message, 'error'); } }, [selected, toast]);
  const sendMail = useCallback(async () => { if (!compose.to || !compose.subject || !compose.body || !addr) return; setSending(true); try { const r = await fetch(`${API}/emails/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: addr.address, ...compose }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setCompose({ open: false, to: '', subject: '', body: '' }); toast('Gönderildi!', 'success'); } catch (e) { toast(e.message, 'error'); } finally { setSending(false); } }, [compose, addr, toast]);
  const copyAddr = () => { if (addr) { navigator.clipboard.writeText(addr.address); toast('Kopyalandı!', 'success'); } };
  const copyOtp = useCallback((o) => { navigator.clipboard.writeText(o); toast(`OTP: ${o}`, 'success'); }, [toast]);
  const openCompose = (pre = {}) => setCompose({ open: true, to: pre.to || '', subject: pre.subject || '', body: '' });
  const logout = () => { localStorage.removeItem('tm-last-addr'); localStorage.removeItem('tm-history'); setAddr(null); setEmails([]); setHistory([]); toast('Çıkış yapıldı', 'info'); };

  useEffect(() => { loadDomains(); loadSendStatus(); restoreLastAddress(); }, [loadDomains, loadSendStatus, restoreLastAddress]);
  useEffect(() => { if (domains.length > 0 && !addr && !loading && restoredRef.current) { if (!localStorage.getItem('tm-last-addr')) genRandom(); } }, [domains]); // eslint-disable-line
  useEffect(() => { if (!addr || sockOn) { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); return; } loadEmails(); const tick = () => { loadEmails(); pollTimerRef.current = setTimeout(tick, pollDelayRef.current); }; pollTimerRef.current = setTimeout(tick, pollDelayRef.current); return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }; }, [addr, sockOn, loadEmails]);

  /* Domain bilgisi */
  const activeDomain = addr?.address?.split('@')[1] || (domains[0]?.domain || '');

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-xl border-b border-brand-border/20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Sol: Logo */}
          <div className="flex items-center gap-3">
            {page !== 'inbox' && <button onClick={() => { setPage('inbox'); setSelected(null); }} className="p-1.5 rounded-lg text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2 transition-colors"><ArrowLeft size={16} /></button>}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPage('inbox')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center"><Mail size={16} className="text-white" /></div>
              <span className="text-sm font-bold"><span className="text-txt-primary">Temp</span><span className="text-accent-cyan">Mail</span></span>
            </div>
          </div>

          {/* Orta: Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'inbox', icon: InboxIcon, label: 'Inbox' },
              { id: 'admin', icon: Settings, label: 'Admin' },
            ].map((t) => (
              <button key={t.id} onClick={() => setPage(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${page === t.id ? 'bg-accent-blue/15 text-accent-blue' : 'text-txt-muted hover:text-txt-secondary hover:bg-brand-surface2'}`}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
            <button className="btn-ghost"><HelpCircle size={13} /></button>
          </nav>

          {/* Sağ: Kullanıcı */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-brand-surface2 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-[10px] font-bold">{(addr?.username || 'U')[0].toUpperCase()}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-medium text-txt-primary leading-none">{addr?.username || 'Kullanıcı'}</p>
                  <p className="text-[9px] text-txt-muted leading-none mt-0.5">Ücretsiz</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <ChevronDown size={12} className="text-txt-muted" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 card p-1 z-50 animate-slide-down">
                  <button onClick={() => { setShowUserMenu(false); setPage('admin'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-txt-secondary hover:bg-brand-surface2 transition-colors"><Settings size={12} /> Admin</button>
                  <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent-red hover:bg-accent-red/5 transition-colors"><X size={12} /> Çıkış</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast */}
      {notif && (
        <div className={`fixed top-16 right-4 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium animate-slide-down ${notif.type === 'success' ? 'bg-accent-green/20 text-accent-green border border-accent-green/20' : notif.type === 'error' ? 'bg-accent-red/20 text-accent-red border border-accent-red/20' : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/20'}`}>
          {notif.message}
        </div>
      )}

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

      {/* ===== MAIN ===== */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
        {page === 'inbox' ? (
          <div className="space-y-5">
            <AddressBar currentAddress={addr} loading={loading} error={error} domains={domains} history={history} onGenerate={genRandom} onSubmit={openAddr} onCopy={copyAddr} onSetPassword={() => setSpwShow(true)} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Sol: Inbox */}
              <div className="lg:col-span-4 xl:col-span-3">
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              {/* Orta: Email View */}
              <div className="lg:col-span-5 xl:col-span-6">
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={openCompose} onCopyOtp={copyOtp} />
              </div>
              {/* Sağ: Hesap */}
              <div className="lg:col-span-3">
                <AccountPanel username={addr?.username || 'Kullanıcı'} plan="Ücretsiz" activeDomain={activeDomain} storageUsed={`${emails.length * 0.05} MB`} storageTotal="500 MB" storagePercent={Math.min(Math.round((emails.length / 1000) * 100), 100)} emailCount={emails.length} onLogout={logout} onAdmin={() => setPage('admin')} />
              </div>
            </div>
          </div>
        ) : (
          <AdminPanel api={API} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border/10 py-6 text-center">
        <p className="text-[10px] text-txt-disabled flex items-center justify-center gap-1.5">
          <Lock size={10} /> TempMail ile gizliliğinizi koruyun. Geçici e-posta, daha az spam.
        </p>
      </footer>
    </div>
  );
}
