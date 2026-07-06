import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AdminPanel from './components/AdminPanel';

const API_BASE = '/api';

/**
 * Dark mode hook'u
 * Sistem tercihini algılar, localStorage'da saklar
 */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('tempmail-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('tempmail-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Sistem tercihi değişirse dinle
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const saved = localStorage.getItem('tempmail-theme');
      if (!saved) setDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return [dark, setDark];
}

export default function App() {
  // ===== TEMA =====
  const [dark, setDark] = useDarkMode();

  // ===== STATE =====
  const [page, setPage] = useState('inbox');
  const [currentAddress, setCurrentAddress] = useState(null);
  const [domains, setDomains] = useState([]);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sendStatus, setSendStatus] = useState({ configured: false });
  const [sending, setSending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);

  // Socket.io ref (re-render'a sebep olmaz)
  const socketRef = useRef(null);
  // Bildirim kuyruğu
  const notifTimeoutRef = useRef(null);

  // ===== BİLDİRİM GÖSTERME =====
  const showNotification = useCallback((message, type = 'info') => {
    if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current);
    setNotification({ message, type });
    notifTimeoutRef.current = setTimeout(() => setNotification(null), 3500);
  }, []);

  // ===== SOCKET.IO BAĞLANTISI =====
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('🔌 Socket.io bağlandı');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('🔌 Socket.io bağlantısı kesildi');
    });

    // Yeni mail geldiğinde
    socket.on('new-email', (emailData) => {
      console.log('📩 Socket.io: yeni mail', emailData);

      // Inbox listesine ekle (duplicate kontrolü)
      setEmails((prev) => {
        if (prev.some((e) => e.id === emailData.id)) return prev;
        return [emailData, ...prev];
      });

      showNotification(`📩 Yeni mail: ${emailData.sender}`, 'info');
    });

    return () => {
      socket.disconnect();
    };
  }, [showNotification]);

  // ===== ADRES DEĞİŞTİĞİNDE SOCKET ROOM'A ABONE OL =====
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !currentAddress) return;

    socket.emit('subscribe', currentAddress.address);
    console.log(`📬 Socket.io abone olundu: ${currentAddress.address}`);
  }, [currentAddress]);

  // ===== DOMAIN LİSTESİNİ GETİR =====
  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/domains`, {
        headers: { 'x-admin-password': 'admin123' },
      });
      const data = await res.json();
      if (data.domains) {
        setDomains(data.domains.filter((d) => d.is_active));
      }
    } catch (err) {
      console.error('Domain listesi alınamadı:', err);
    }
  }, []);

  // ===== MAIL GÖNDERME DURUMUNU KONTROL ET =====
  const fetchSendStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/emails/send/status`);
      const data = await res.json();
      setSendStatus(data);
    } catch (err) {
      console.error('Mail gönderme durumu alınamadı:', err);
    }
  }, []);

  // ===== RASTGELE ADRES OLUŞTUR =====
  const generateRandomAddress = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedEmail(null);

    try {
      const res = await fetch(`${API_BASE}/addresses/random`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Adres oluşturulamadı');
      }

      setCurrentAddress(data);
      setEmails([]);
      showNotification('Yeni adres oluşturuldu!', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // ===== ÖZEL ADRES OLUŞTUR =====
  const createCustomAddress = useCallback(async (username, domain, password) => {
    setLoading(true);
    setError(null);
    setSelectedEmail(null);

    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, domain, password: password || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Adres oluşturulamadı');
      }

      setCurrentAddress(data);
      setEmails(data.emails || []);
      const msg = data.returned
        ? 'Kalıcı adrese geri dönüldü!'
        : data.is_persistent
        ? 'Kalıcı adres oluşturuldu!'
        : 'Özel adres oluşturuldu!';
      showNotification(msg, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // ===== ŞİFRE İLE GİRİŞ YAP =====
  const loginToAddress = useCallback(async (address, password) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/addresses/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Giriş yapılamadı');
      }

      setCurrentAddress(data);
      setEmails(data.emails || []);
      setSelectedEmail(null);
      showNotification('Adrese giriş yapıldı!', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // ===== MAİLLERİ GETİR (Socket.io yoksa fallback) =====
  const fetchEmails = useCallback(async () => {
    if (!currentAddress) return;

    try {
      const res = await fetch(`${API_BASE}/emails/${currentAddress.address}`);
      const data = await res.json();

      if (res.ok && data.emails) {
        setEmails(data.emails);
      }
    } catch (err) {
      console.error('Mail polling hatası:', err);
    }
  }, [currentAddress]);

  // ===== MANUEL YENİLEME =====
  const refreshEmails = useCallback(async () => {
    setRefreshing(true);
    await fetchEmails();
    setTimeout(() => setRefreshing(false), 500);
  }, [fetchEmails]);

  // ===== TEK MAIL DETAYI GETİR =====
  const fetchEmailDetail = useCallback(async (emailId) => {
    try {
      const res = await fetch(`${API_BASE}/emails/single/${emailId}`);
      const data = await res.json();

      if (res.ok) {
        setSelectedEmail(data);
      }
    } catch (err) {
      console.error('Mail detay hatası:', err);
    }
  }, []);

  // ===== TEK MAIL SİL =====
  const deleteEmail = useCallback(async (emailId, e) => {
    // Event propagation'ı durdur (mail select'i tetiklemez)
    if (e) e.stopPropagation();

    if (!confirm('Bu maili silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`${API_BASE}/emails/${emailId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Mail silinemedi');
      }

      // Listeden kaldır
      setEmails((prev) => prev.filter((e) => e.id !== emailId));

      // Eğer silinen mail seçiliyse, seçimi kaldır
      if (selectedEmail?.id === emailId) {
        setSelectedEmail(null);
      }

      showNotification('Mail silindi', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  }, [selectedEmail, showNotification]);

  // ===== MAIL GÖNDER =====
  const sendEmail = useCallback(async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) {
      showNotification('Tüm alanları doldurun', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: currentAddress.address,
          to: composeData.to,
          subject: composeData.subject,
          body: composeData.body,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Mail gönderilemedi');
      }

      setShowCompose(false);
      setComposeData({ to: '', subject: '', body: '' });
      showNotification('Mail gönderildi!', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSending(false);
    }
  }, [composeData, currentAddress, showNotification]);

  // ===== ADRESİ KOPYALA =====
  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress.address);
      showNotification('Adres kopyalandı!', 'success');
    }
  };

  // ===== OTP KOPYALA =====
  const copyOtp = useCallback((otp) => {
    navigator.clipboard.writeText(otp);
    showNotification(`OTP kodu kopyalandı: ${otp}`, 'success');
  }, [showNotification]);

  // ===== COMPOSE BAŞLAT =====
  const handleCompose = (prefill = {}) => {
    setComposeData({ to: prefill.to || '', subject: prefill.subject || '', body: '' });
    setShowCompose(true);
  };

  // ===== İLK YÜKLENMEDE: Domain listesini al =====
  useEffect(() => {
    fetchDomains();
    fetchSendStatus();
  }, [fetchDomains, fetchSendStatus]);

  // ===== İLK YÜKLENMEDE: Otomatik adres oluştur =====
  useEffect(() => {
    // Domain listesi yüklendikten sonra otomatik adres oluştur
    if (domains.length > 0 && !currentAddress && !loading) {
      generateRandomAddress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains]);

  // ===== FALLBACK POLLING: Socket.io bağlı değilse 5 sn'de bir yenile =====
  useEffect(() => {
    if (!currentAddress || socketConnected) return;

    fetchEmails();
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, [currentAddress, socketConnected, fetchEmails]);

  // ===== SÜRE GÖSTERGESİ =====
  useEffect(() => {
    if (!currentAddress?.expires_at) return;

    const interval = setInterval(() => {
      const diff = new Date(currentAddress.expires_at) - new Date();
      if (diff <= 0) {
        setTimeRemaining('Süresi doldu');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentAddress]);

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-main transition-colors duration-300">
      {/* ===== Üst Bilgi Çubuğu ===== */}
      <header className="header-glass sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce-soft">📧</span>
            <h1 className="text-xl font-bold text-gray-800 dark:text-dark-100">TempMail</h1>
            <span className="badge-primary hidden sm:inline-flex">
              Geçici E-posta
            </span>
            {/* Socket.io bağlantı durumu */}
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                socketConnected
                  ? 'bg-green-500 animate-pulse-soft'
                  : 'bg-gray-300 dark:bg-dark-500'
              }`}
              title={socketConnected ? 'Gerçek zamanlı bağlı' : 'Bağlantı bekleniyor'}
            />
          </div>

          <nav className="flex items-center gap-2">
            {currentAddress && sendStatus.configured && (
              <button
                onClick={() => handleCompose()}
                className="btn-primary text-sm"
              >
                ✏️ <span className="hidden sm:inline">Mail Gönder</span>
              </button>
            )}
            <button
              onClick={() => setPage('inbox')}
              className={`text-sm transition-colors ${
                page === 'inbox' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              📬 <span className="hidden sm:inline">Gelen Kutusu</span>
            </button>
            <button
              onClick={() => setPage('admin')}
              className={`text-sm transition-colors ${
                page === 'admin' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              ⚙️ <span className="hidden sm:inline">Admin</span>
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="btn-ghost text-lg p-2"
              title={dark ? 'Açık tema' : 'Koyu tema'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>

      {/* ===== Bildirim ===== */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-white font-medium animate-slide-in backdrop-blur-sm ${
            notification.type === 'success'
              ? 'bg-green-500/90 dark:bg-green-600/90'
              : notification.type === 'error'
              ? 'bg-red-500/90 dark:bg-red-600/90'
              : 'bg-blue-500/90 dark:bg-blue-600/90'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* ===== Mail Gönderme Modal ===== */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-dark-700 animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-dark-100 flex items-center gap-2">
                ✏️ Yeni Mail Gönder
              </h3>
              <button
                onClick={() => setShowCompose(false)}
                className="text-gray-400 dark:text-dark-400 hover:text-gray-600 dark:hover:text-dark-200 text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Gönderen</label>
                <input
                  type="text"
                  value={currentAddress?.address || ''}
                  disabled
                  className="input-field bg-gray-50 dark:bg-dark-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Alıcı</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="alici@ornek.com"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">Konu</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Mail konusu"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-1">İçerik</label>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  placeholder="Mail içeriği..."
                  rows={6}
                  className="input-field resize-y"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900/50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowCompose(false)} className="btn-secondary">
                İptal
              </button>
              <button onClick={sendEmail} disabled={sending} className="btn-primary">
                {sending ? '⏳ Gönderiliyor...' : '📤 Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Ana İçerik ===== */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {page === 'inbox' ? (
          <div className="space-y-6">
            {/* Adres Çubuğu */}
            <AddressBar
              currentAddress={currentAddress}
              timeRemaining={timeRemaining}
              loading={loading}
              error={error}
              domains={domains}
              onGenerate={generateRandomAddress}
              onCustomCreate={createCustomAddress}
              onCopy={copyAddress}
              onLogin={loginToAddress}
            />

            {/* İçerik: Inbox + Mail Detayı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gelen Kutusu */}
              <Inbox
                emails={emails}
                selectedEmailId={selectedEmail?.id}
                onSelectEmail={fetchEmailDetail}
                onDeleteEmail={deleteEmail}
                hasAddress={!!currentAddress}
                onRefresh={refreshEmails}
                refreshing={refreshing}
                socketConnected={socketConnected}
              />

              {/* Mail Görüntüleme */}
              <EmailView
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                apiBase={API_BASE}
                onCompose={handleCompose}
                currentAddress={currentAddress}
                onCopyOtp={copyOtp}
              />
            </div>
          </div>
        ) : (
          <AdminPanel apiBase={API_BASE} />
        )}
      </main>

      {/* ===== Footer ===== */}
      <footer className="text-center py-6 text-gray-400 dark:text-dark-500 text-sm">
        TempMail - Geçici e-posta servisi
      </footer>
    </div>
  );
}
