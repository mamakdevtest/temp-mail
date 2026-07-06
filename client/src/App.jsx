import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Mail, Settings, Inbox as InboxIcon, Copy, RefreshCw, Lock, Unlock, Sun, Moon, ArrowLeft, Send, X, KeyRound, ShieldCheck, Bell } from 'lucide-react';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AdminPanel from './components/AdminPanel';
import Modal from './components/Modal';

const API = '/api';

/* ===== Dark Mode ===== */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem('tm-theme');
      if (s) return s === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) { return false; }
  });
  useEffect(() => {
    try {
      dark ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
      localStorage.setItem('tm-theme', dark ? 'dark' : 'light');
    } catch (e) { /* */ }
  }, [dark]);
  return [dark, setDark];
}

/* ===== Bildirim Sesi ===== */
function useBeep() {
  const ctxRef = useRef(null);
  const init = useCallback(() => {
    try { if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)(); if (ctxRef.current.state === 'suspended') ctxRef.current.resume(); } catch (e) { console.warn('Audio init hatası:', e); }
  }, []);
  const play = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const c = ctxRef.current; if (c.state === 'suspended') c.resume();
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine'; o.frequency.setValueAtTime(523, c.currentTime); o.frequency.exponentialRampToValueAtTime(784, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.3, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);
      o.start(c.currentTime); o.stop(c.currentTime + 0.4);
    } catch (e) { console.warn('Beep hatası:', e); }
  }, []);
  return { init, play };
}

export default function App() {
  const [dark, setDark] = useDarkMode();
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

  /* Geçmiş adresler (localStorage) */
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tm-history') || '[]'); } catch (e) { return []; }
  });

  const sockRef = useRef(null);
  const notifTimer = useRef(null);
  const pollTimerRef = useRef(null);
  const pollDelayRef = useRef(5000);
  const restoredRef = useRef(false); // İlk yüklemede restore edildi mi?

  useEffect(() => {
    const h = () => initBeep();
    document.addEventListener('click', h, { once: true });
    document.addEventListener('keydown', h, { once: true });
    return () => { document.removeEventListener('click', h); document.removeEventListener('keydown', h); };
  }, [initBeep]);

  const toast = useCallback((msg, type = 'info') => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif({ message: msg, type });
    notifTimer.current = setTimeout(() => setNotif(null), 3500);
  }, []);

  /* Socket.io */
  useEffect(() => {
    try {
      const s = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
      sockRef.current = s;
      s.on('connect', () => { setSockOn(true); pollDelayRef.current = 5000; }); // Bağlanınca backoff sıfırla
      s.on('disconnect', () => setSockOn(false));
      s.on('new-email', (d) => {
        setEmails((p) => p.some((e) => e.id === d.id) ? p : [d, ...p]);
        toast(`📩 Yeni mail: ${d.sender}`, 'info');
        playBeep();
      });
      return () => { try { s.disconnect(); } catch (e) { console.warn('Socket kapatma hatası:', e); } };
    } catch (e) { console.warn('Socket.io başlatılamadı:', e); }
  }, [toast, playBeep]);

  useEffect(() => { try { if (sockRef.current && addr) sockRef.current.emit('subscribe', addr.address); } catch (e) { console.warn('Socket subscribe hatası:', e); } }, [addr]);

  /* ===== Adres değiştiğinde geçmişe kaydet ===== */
  useEffect(() => {
    if (!addr?.address) return;
    try {
      // "Son adres" olarak kaydet
      localStorage.setItem('tm-last-addr', JSON.stringify(addr));
      // Geçmiş listesine ekle (en üstte, max 20)
      setHistory((prev) => {
        const entry = { address: addr.address, has_password: !!addr.has_password, ts: Date.now() };
        const filtered = prev.filter((h) => h.address !== addr.address);
        const next = [entry, ...filtered].slice(0, 20);
        localStorage.setItem('tm-history', JSON.stringify(next));
        return next;
      });
    } catch (e) { console.warn('Geçmiş kaydetme hatası:', e); }
  }, [addr]);

  /* ===== Sayfa yüklendiğinde son adresi geri yükle ===== */
  const restoreLastAddress = useCallback(async () => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem('tm-last-addr') || 'null');
      if (!saved?.address) return false;
      // Adresi sunucudan doğrula
      const r = await fetch(`${API}/addresses/${saved.address}`);
      if (r.ok) {
        const d = await r.json();
        setAddr(d); setEmails(d.emails || []);
        return true;
      }
    } catch (e) { console.warn('Adres geri yükleme hatası:', e); }
    return false;
  }, []);

  /* API helpers */
  const loadDomains = useCallback(async () => {
    try { const r = await fetch(`${API}/addresses/domains`); if (!r.ok) { console.warn('Domain yükleme başarısız:', r.status); return; } const d = await r.json(); if (d.domains) setDomains(d.domains); } catch (e) { console.warn('Domain yükleme hatası:', e); }
  }, []);

  const loadSendStatus = useCallback(async () => {
    try { const r = await fetch(`${API}/emails/send/status`); if (r.ok) setSendOk(await r.json()); } catch (e) { console.warn('Send status hatası:', e); }
  }, []);

  const genRandom = useCallback(async (password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = {}; if (password) body.password = password;
      const r = await fetch(`${API}/addresses/random`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Adres oluşturulamadı');
      setAddr(d); setEmails([]);
      toast(d.has_password ? 'Şifreli adres oluşturuldu!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { console.error('Adres oluşturma hatası:', e); setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  const openAddr = useCallback(async (username, domain, password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = { username, domain }; if (password) body.password = password;
      const r = await fetch(`${API}/addresses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (r.status === 403 && d.error === 'password_required') { setPwModal({ show: true, username, domain }); setPwInput(''); setPwErr(''); setLoading(false); return; }
      if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
      setAddr(d); setEmails(d.emails || []);
      toast(d.returned ? 'Adrese erişildi!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { console.error('Adres açma hatası:', e); setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  const pwSubmit = useCallback(async () => {
    if (!pwInput) return;
    setLoading(true); setPwErr('');
    try {
      const r = await fetch(`${API}/addresses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: pwModal.username, domain: pwModal.domain, password: pwInput }) });
      const d = await r.json();
      if (!r.ok) { setPwErr(d.error || 'Yanlış şifre'); setLoading(false); return; }
      setAddr(d); setEmails(d.emails || []); setPwModal({ show: false, username: '', domain: '' });
      toast('Adrese giriş yapıldı!', 'success');
    } catch (e) { console.warn('Şifre giriş hatası:', e); setPwErr(e.message); } finally { setLoading(false); }
  }, [pwInput, pwModal, toast]);

  const doSetPw = useCallback(async () => {
    if (!spwVal || !addr) return;
    try {
      const r = await fetch(`${API}/addresses/set-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr.address, password: spwVal }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Şifre ayarlanamadı');
      setAddr((p) => ({ ...p, has_password: true }));
      // Geçmişteki kaydı güncelle
      setHistory((prev) => {
        const next = prev.map((h) => h.address === addr.address ? { ...h, has_password: true } : h);
        localStorage.setItem('tm-history', JSON.stringify(next));
        return next;
      });
      setSpwShow(false); setSpwVal('');
      toast('Şifre ayarlandı!', 'success');
    } catch (e) { console.warn('Şifre ayarlama hatası:', e); toast(e.message, 'error'); }
  }, [spwVal, addr, toast]);

  /* Mail işlemleri */
  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try {
      const r = await fetch(`${API}/emails/${addr.address}`);
      if (r.ok) { const d = await r.json(); if (d.emails) setEmails(d.emails); pollDelayRef.current = 5000; } // Başarılı → backoff sıfırla
      else { pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); } // Başarısız → backoff artır
    } catch (e) { console.warn('Email yükleme hatası:', e); pollDelayRef.current = Math.min(pollDelayRef.current * 2, 60000); }
  }, [addr]);

  const refresh = useCallback(async () => { setRefreshing(true); await loadEmails(); setTimeout(() => setRefreshing(false), 500); }, [loadEmails]);

  const loadDetail = useCallback(async (id) => {
    try { const r = await fetch(`${API}/emails/single/${id}`); if (r.ok) setSelected(await r.json()); } catch (e) { console.warn('Detay yükleme hatası:', e); }
  }, []);

  const delEmail = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Bu maili silmek istediğinize emin misiniz?')) return;
    try {
      const r = await fetch(`${API}/emails/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Silinemedi');
      setEmails((p) => p.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
      toast('Mail silindi', 'success');
    } catch (e) { console.warn('Silme hatası:', e); toast(e.message, 'error'); }
  }, [selected, toast]);

  const sendMail = useCallback(async () => {
    if (!compose.to || !compose.subject || !compose.body) { toast('Tüm alanları doldurun', 'error'); return; }
    if (!addr) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/emails/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: addr.address, to: compose.to, subject: compose.subject, body: compose.body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gönderilemedi');
      setCompose({ open: false, to: '', subject: '', body: '' });
      toast('Mail gönderildi!', 'success');
    } catch (e) { console.warn('Gönderme hatası:', e); toast(e.message, 'error'); } finally { setSending(false); }
  }, [compose, addr, toast]);

  const copyAddr = () => { if (addr) { navigator.clipboard.writeText(addr.address); toast('Kopyalandı!', 'success'); } };
  const copyOtp = useCallback((o) => { navigator.clipboard.writeText(o); toast(`OTP kopyalandı: ${o}`, 'success'); }, [toast]);
  const openCompose = (pre = {}) => setCompose({ open: true, to: pre.to || '', subject: pre.subject || '', body: '' });

  /* Init: domain yükle, son adresi geri yükle */
  useEffect(() => {
    loadDomains();
    loadSendStatus();
    restoreLastAddress();
  }, [loadDomains, loadSendStatus, restoreLastAddress]);

  /* Domain yüklendi + adres yok + restore edilemedi → rastgele oluştur */
  useEffect(() => {
    if (domains.length > 0 && !addr && !loading && restoredRef.current) {
      const hasSaved = localStorage.getItem('tm-last-addr');
      if (!hasSaved) genRandom();
    }
  }, [domains]); // eslint-disable-line

  /* Fallback polling - exponential backoff */
  useEffect(() => {
    if (!addr || sockOn) { if (pollTimerRef.current) clearInterval(pollTimerRef.current); return; }
    loadEmails();
    const tick = () => {
      loadEmails();
      pollTimerRef.current = setTimeout(tick, pollDelayRef.current);
    };
    pollTimerRef.current = setTimeout(tick, pollDelayRef.current);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [addr, sockOn, loadEmails]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white/80 dark:bg-dark-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {page !== 'inbox' && (
              <button onClick={() => { setPage('inbox'); setSelected(null); }} className="p-1.5 rounded-lg text-gray-400 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"><ArrowLeft size={16} /></button>
            )}
            <Mail size={20} className="text-primary-600 dark:text-primary-400" />
            <span className="font-bold text-gray-800 dark:text-dark-100 text-sm">TempMail</span>
            <span className={`w-1.5 h-1.5 rounded-full ml-1 ${sockOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}`} />
          </div>
          <nav className="flex items-center gap-0.5">
            <button onClick={() => setPage('inbox')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${page === 'inbox' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-800'}`}>
              <InboxIcon size={14} /> Inbox
            </button>
            <button onClick={() => setPage('admin')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${page === 'admin' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-800'}`}>
              <Settings size={14} /> Admin
            </button>
            <button onClick={() => setDark(!dark)} className="p-1.5 rounded-lg text-gray-400 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors ml-0.5">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Toast */}
      {notif && (
        <div className={`fixed top-3 right-3 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-white text-xs font-medium animate-slide-in backdrop-blur-sm ${notif.type === 'success' ? 'bg-emerald-500/90' : notif.type === 'error' ? 'bg-red-500/90' : 'bg-blue-500/90'}`}>
          {notif.message}
        </div>
      )}

      {/* Password Modal */}
      <Modal show={pwModal.show} onClose={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }}
        title="Şifre Gerekli" subtitle={`${pwModal.username}@${pwModal.domain} şifre korumalı`}
        footer={<><button onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} className="btn-secondary text-xs">İptal</button><button onClick={pwSubmit} disabled={!pwInput || loading} className="btn-primary text-xs"><KeyRound size={12} /> Giriş</button></>}>
        <input type="password" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pwSubmit()} placeholder="Şifre" className="input-field" autoFocus />
        {pwErr && <p className="text-red-500 text-xs mt-2">{pwErr}</p>}
      </Modal>

      {/* Set Password Modal */}
      <Modal show={spwShow} onClose={() => { setSpwShow(false); setSpwVal(''); }}
        title="Şifre Belirle" subtitle="Sonraki erişimlerde şifre istenecek"
        footer={<><button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary text-xs">İptal</button><button onClick={doSetPw} disabled={!spwVal} className="btn-primary text-xs"><Lock size={12} /> Kaydet</button></>}>
        <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder="Şifre belirleyin" className="input-field" autoFocus />
      </Modal>

      {/* Compose Modal */}
      <Modal show={compose.open} onClose={() => setCompose({ ...compose, open: false })} title="Yeni Mail" wide
        footer={<><button onClick={() => setCompose({ ...compose, open: false })} className="btn-secondary text-xs">İptal</button><button onClick={sendMail} disabled={sending} className="btn-primary text-xs">{sending ? '⏳' : <Send size={12} />} Gönder</button></>}>
        <div className="space-y-3">
          <div><label className="text-[10px] font-medium text-gray-500 dark:text-dark-400 mb-1 block uppercase tracking-wider">Gönderen</label><input value={addr?.address || ''} disabled className="input-field bg-gray-50 dark:bg-dark-900 text-xs" /></div>
          <div><label className="text-[10px] font-medium text-gray-500 dark:text-dark-400 mb-1 block uppercase tracking-wider">Alıcı</label><input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="alici@ornek.com" className="input-field text-xs" autoFocus /></div>
          <div><label className="text-[10px] font-medium text-gray-500 dark:text-dark-400 mb-1 block uppercase tracking-wider">Konu</label><input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Konu" className="input-field text-xs" /></div>
          <div><label className="text-[10px] font-medium text-gray-500 dark:text-dark-400 mb-1 block uppercase tracking-wider">İçerik</label><textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="input-field text-xs resize-y" /></div>
        </div>
      </Modal>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        {page === 'inbox' ? (
          <div className="space-y-4">
            <AddressBar currentAddress={addr} loading={loading} error={error} domains={domains} history={history} onGenerate={genRandom} onSubmit={openAddr} onCopy={copyAddr} onSetPassword={() => setSpwShow(true)} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <Inbox emails={emails} selectedId={selected?.id} onSelect={loadDetail} onDelete={delEmail} hasAddr={!!addr} onRefresh={refresh} refreshing={refreshing} live={sockOn} />
              </div>
              <div className="lg:col-span-3">
                <EmailView email={selected} onClose={() => setSelected(null)} api={API} onReply={openCompose} onCopyOtp={copyOtp} />
              </div>
            </div>
          </div>
        ) : (
          <AdminPanel api={API} />
        )}
      </main>

      <footer className="text-center py-4 text-gray-400 dark:text-dark-600 text-[10px]">TempMail</footer>
    </div>
  );
}
