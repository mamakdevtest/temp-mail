import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AdminPanel from './components/AdminPanel';

const API = '/api';

/* ===== Dark Mode Hook ===== */
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
      const r = document.documentElement;
      dark ? r.classList.add('dark') : r.classList.remove('dark');
      localStorage.setItem('tm-theme', dark ? 'dark' : 'light');
    } catch (e) { /* */ }
  }, [dark]);
  return [dark, setDark];
}

/* ===== Bildirim Sesi ===== */
function useBeep() {
  const ctxRef = useRef(null);
  const init = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    } catch (e) { /* */ }
  }, []);
  const play = useCallback(() => {
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const c = ctxRef.current;
      if (c.state === 'suspended') c.resume();
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(523, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(784, c.currentTime + 0.1);
      g.gain.setValueAtTime(0.3, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);
      o.start(c.currentTime); o.stop(c.currentTime + 0.4);
    } catch (e) { /* */ }
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

  const sockRef = useRef(null);
  const notifTimer = useRef(null);

  /* Init beep */
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

  /* Socket.io - güvenli bağlantı */
  useEffect(() => {
    try {
      const s = io({ transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
      sockRef.current = s;
      s.on('connect', () => setSockOn(true));
      s.on('disconnect', () => setSockOn(false));
      s.on('new-email', (d) => {
        setEmails((p) => p.some((e) => e.id === d.id) ? p : [d, ...p]);
        toast(`📩 Yeni mail: ${d.sender}`, 'info');
        playBeep();
      });
      return () => { try { s.disconnect(); } catch (e) { /* */ } };
    } catch (e) { console.warn('Socket.io başlatılamadı:', e); }
  }, [toast, playBeep]);

  useEffect(() => { try { if (sockRef.current && addr) sockRef.current.emit('subscribe', addr.address); } catch (e) { /* */ } }, [addr]);

  /* Domain listesi */
  const loadDomains = useCallback(async () => {
    try {
      const r = await fetch(`${API}/addresses/domains`);
      if (!r.ok) return;
      const d = await r.json();
      if (d.domains) setDomains(d.domains);
    } catch (e) { console.warn('Domain yüklenemedi:', e); }
  }, []);

  const loadSendStatus = useCallback(async () => {
    try { const r = await fetch(`${API}/emails/send/status`); if (r.ok) setSendOk(await r.json()); } catch (e) { /* */ }
  }, []);

  /* Rastgele adres oluştur */
  const genRandom = useCallback(async (password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = {};
      if (password) body.password = password;
      const r = await fetch(`${API}/addresses/random`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Adres oluşturulamadı');
      setAddr(d); setEmails([]);
      toast(d.has_password ? 'Şifreli adres oluşturuldu!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  /* Özel adres aç */
  const openAddr = useCallback(async (username, domain, password) => {
    setLoading(true); setError(null); setSelected(null);
    try {
      const body = { username, domain };
      if (password) body.password = password;
      const r = await fetch(`${API}/addresses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.status === 403 && d.error === 'password_required') {
        setPwModal({ show: true, username, domain }); setPwInput(''); setPwErr('');
        setLoading(false); return;
      }
      if (!r.ok) throw new Error(d.error || 'İşlem başarısız');
      setAddr(d); setEmails(d.emails || []);
      toast(d.returned ? 'Adrese erişildi!' : 'Yeni adres oluşturuldu!', 'success');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [toast]);

  /* Şifre modalı gönderimi */
  const pwSubmit = useCallback(async () => {
    if (!pwInput) return;
    setLoading(true); setPwErr('');
    try {
      const r = await fetch(`${API}/addresses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pwModal.username, domain: pwModal.domain, password: pwInput }),
      });
      const d = await r.json();
      if (!r.ok) { setPwErr(d.error || 'Yanlış şifre'); setLoading(false); return; }
      setAddr(d); setEmails(d.emails || []); setPwModal({ show: false, username: '', domain: '' });
      toast('Adrese giriş yapıldı!', 'success');
    } catch (e) { setPwErr(e.message); } finally { setLoading(false); }
  }, [pwInput, pwModal, toast]);

  /* Mevcut adrese şifre koy */
  const doSetPw = useCallback(async () => {
    if (!spwVal || !addr) return;
    try {
      const r = await fetch(`${API}/addresses/set-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr.address, password: spwVal }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Şifre ayarlanamadı');
      setAddr((p) => ({ ...p, has_password: true }));
      setSpwShow(false); setSpwVal('');
      toast('Şifre ayarlandı!', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }, [spwVal, addr, toast]);

  /* Mail işlemleri */
  const loadEmails = useCallback(async () => {
    if (!addr) return;
    try {
      const r = await fetch(`${API}/emails/${addr.address}`);
      if (r.ok) { const d = await r.json(); if (d.emails) setEmails(d.emails); }
    } catch (e) { /* */ }
  }, [addr]);

  const refresh = useCallback(async () => { setRefreshing(true); await loadEmails(); setTimeout(() => setRefreshing(false), 500); }, [loadEmails]);

  const loadDetail = useCallback(async (id) => {
    try { const r = await fetch(`${API}/emails/single/${id}`); if (r.ok) setSelected(await r.json()); } catch (e) { /* */ }
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
    } catch (e) { toast(e.message, 'error'); }
  }, [selected, toast]);

  const sendMail = useCallback(async () => {
    if (!compose.to || !compose.subject || !compose.body) { toast('Tüm alanları doldurun', 'error'); return; }
    if (!addr) return;
    setSending(true);
    try {
      const r = await fetch(`${API}/emails/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: addr.address, to: compose.to, subject: compose.subject, body: compose.body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Gönderilemedi');
      setCompose({ open: false, to: '', subject: '', body: '' });
      toast('Mail gönderildi!', 'success');
    } catch (e) { toast(e.message, 'error'); } finally { setSending(false); }
  }, [compose, addr, toast]);

  const copyAddr = () => { if (addr) { navigator.clipboard.writeText(addr.address); toast('Kopyalandı!', 'success'); } };
  const copyOtp = useCallback((o) => { navigator.clipboard.writeText(o); toast(`OTP kopyalandı: ${o}`, 'success'); }, [toast]);
  const openCompose = (pre = {}) => setCompose({ open: true, to: pre.to || '', subject: pre.subject || '', body: '' });

  /* İlk yükleme */
  useEffect(() => { loadDomains(); loadSendStatus(); }, [loadDomains, loadSendStatus]);

  /* Domain yüklendiğinde otomatik adres oluştur */
  useEffect(() => {
    if (domains.length > 0 && !addr && !loading) {
      genRandom();
    }
  }, [domains]); // eslint-disable-line

  /* Fallback polling */
  useEffect(() => {
    if (!addr || sockOn) return;
    loadEmails();
    const i = setInterval(loadEmails, 5000);
    return () => clearInterval(i);
  }, [addr, sockOn, loadEmails]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {page !== 'inbox' && (
              <button onClick={() => { setPage('inbox'); setSelected(null); }} className="text-gray-500 dark:text-dark-400 hover:text-gray-700 dark:hover:text-dark-200 mr-1 text-sm">←</button>
            )}
            <span className="text-xl">📧</span>
            <span className="font-bold text-gray-800 dark:text-dark-100 text-base">TempMail</span>
            <span className={`w-1.5 h-1.5 rounded-full ml-1 ${sockOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-dark-600'}`} title={sockOn ? 'Canlı' : 'Bağlanıyor'} />
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => setPage('inbox')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${page === 'inbox' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-800'}`}>📬 Inbox</button>
            <button onClick={() => setPage('admin')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${page === 'admin' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-800'}`}>⚙️ Admin</button>
            <button onClick={() => setDark(!dark)} className="ml-1 p-1.5 rounded-md text-gray-500 dark:text-dark-400 hover:bg-gray-100 dark:hover:bg-dark-800" title={dark ? 'Açık tema' : 'Koyu tema'}>{dark ? '☀️' : '🌙'}</button>
          </nav>
        </div>
      </header>

      {/* Toast */}
      {notif && (
        <div className={`fixed top-3 right-3 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-white text-sm font-medium animate-slide-in ${notif.type === 'success' ? 'bg-emerald-500' : notif.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
          {notif.message}
        </div>
      )}

      {/* Password Modal */}
      {pwModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }}>
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-dark-700 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-700">
              <h3 className="font-bold text-gray-800 dark:text-dark-100">🔐 Şifre Gerekli</h3>
              <p className="text-xs text-gray-500 dark:text-dark-400 mt-1"><span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{pwModal.username}@{pwModal.domain}</span> şifre korumalı</p>
            </div>
            <div className="p-5 space-y-3">
              <input type="password" value={pwInput} onChange={(e) => { setPwInput(e.target.value); setPwErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pwSubmit()} placeholder="Şifre" className="input-field" autoFocus />
              {pwErr && <p className="text-red-500 text-xs">{pwErr}</p>}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-700 flex justify-end gap-2">
              <button onClick={() => { setPwModal({ show: false, username: '', domain: '' }); setLoading(false); }} className="btn-secondary text-sm">İptal</button>
              <button onClick={pwSubmit} disabled={!pwInput || loading} className="btn-primary text-sm">{loading ? '⏳' : '🔓 Giriş'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {spwShow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSpwShow(false); setSpwVal(''); }}>
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-dark-700 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-700">
              <h3 className="font-bold text-gray-800 dark:text-dark-100">🔒 Şifre Belirle</h3>
              <p className="text-xs text-gray-500 dark:text-dark-400 mt-1">Sonraki erişimlerde şifre istenecek</p>
            </div>
            <div className="p-5">
              <input type="password" value={spwVal} onChange={(e) => setSpwVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSetPw()} placeholder="Şifre belirleyin" className="input-field" autoFocus />
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-700 flex justify-end gap-2">
              <button onClick={() => { setSpwShow(false); setSpwVal(''); }} className="btn-secondary text-sm">İptal</button>
              <button onClick={doSetPw} disabled={!spwVal} className="btn-primary text-sm">🔒 Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {compose.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCompose({ ...compose, open: false })}>
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-dark-700 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-dark-100">✏️ Yeni Mail</h3>
              <button onClick={() => setCompose({ ...compose, open: false })} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-medium text-gray-500 dark:text-dark-400 mb-1 block">Gönderen</label><input value={addr?.address || ''} disabled className="input-field bg-gray-50 dark:bg-dark-900 text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-dark-400 mb-1 block">Alıcı</label><input value={compose.to} onChange={(e) => setCompose({ ...compose, to: e.target.value })} placeholder="alici@ornek.com" className="input-field text-sm" autoFocus /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-dark-400 mb-1 block">Konu</label><input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Konu" className="input-field text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-500 dark:text-dark-400 mb-1 block">İçerik</label><textarea value={compose.body} onChange={(e) => setCompose({ ...compose, body: e.target.value })} rows={4} className="input-field text-sm resize-y" /></div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-700 flex justify-end gap-2">
              <button onClick={() => setCompose({ ...compose, open: false })} className="btn-secondary text-sm">İptal</button>
              <button onClick={sendMail} disabled={sending} className="btn-primary text-sm">{sending ? '⏳' : '📤 Gönder'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {page === 'inbox' ? (
          <div className="space-y-5">
            <AddressBar
              currentAddress={addr} loading={loading} error={error} domains={domains}
              onGenerate={genRandom} onSubmit={openAddr} onCopy={copyAddr} onSetPassword={() => setSpwShow(true)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
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

      <footer className="text-center py-4 text-gray-400 dark:text-dark-600 text-[11px]">TempMail</footer>
    </div>
  );
}
