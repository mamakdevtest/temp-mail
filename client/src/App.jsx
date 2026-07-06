import { useState, useEffect, useCallback } from 'react';
import AddressBar from './components/AddressBar';
import Inbox from './components/Inbox';
import EmailView from './components/EmailView';
import AdminPanel from './components/AdminPanel';

const API_BASE = '/api';

export default function App() {
  // Aktif sayfa: 'inbox' veya 'admin'
  const [page, setPage] = useState('inbox');

  // Mevcut geçici adres
  const [currentAddress, setCurrentAddress] = useState(null);

  // Domain listesi (adres oluşturmak için)
  const [domains, setDomains] = useState([]);

  // Gelen mailler
  const [emails, setEmails] = useState([]);

  // Seçili mail (detay görüntüleme)
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Yükleme durumları
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Bildirim
  const [notification, setNotification] = useState(null);

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
  }, []);

  // ===== ÖZEL ADRES OLUŞTUR =====
  const createCustomAddress = useCallback(async (username, domain) => {
    setLoading(true);
    setError(null);
    setSelectedEmail(null);

    try {
      const res = await fetch(`${API_BASE}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, domain }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Adres oluşturulamadı');
      }

      setCurrentAddress(data);
      setEmails([]);
      showNotification('Özel adres oluşturuldu!', 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== MAİLLERİ GETİR (POLLING) =====
  const fetchEmails = useCallback(async () => {
    if (!currentAddress) return;

    try {
      const res = await fetch(`${API_BASE}/emails/${currentAddress.address}`);
      const data = await res.json();

      if (res.ok && data.emails) {
        // Yeni mail geldi mi kontrol et
        if (emails.length > 0 && data.emails.length > emails.length) {
          showNotification('Yeni mail geldi!', 'info');
        }
        setEmails(data.emails);
      }
    } catch (err) {
      console.error('Mail polling hatası:', err);
    }
  }, [currentAddress, emails.length]);

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

  // ===== BİLDİRİM GÖSTER =====
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ===== ADRESİ KOPYALA =====
  const copyAddress = () => {
    if (currentAddress) {
      navigator.clipboard.writeText(currentAddress.address);
      showNotification('Adres kopyalandı!', 'success');
    }
  };

  // ===== POLLING: Her 5 saniyede bir mailleri kontrol et =====
  useEffect(() => {
    if (!currentAddress) return;

    // İlk yüklemede mailleri getir
    fetchEmails();

    // 5 saniyede bir polling
    const interval = setInterval(fetchEmails, 5000);

    return () => clearInterval(interval);
  }, [currentAddress, fetchEmails]);

  // ===== SAYFA YÜKLENİNCE DOMAIN LİSTESİNİ AL =====
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // ===== SÜRE GÖSTERGESİ =====
  const [timeRemaining, setTimeRemaining] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Üst Bilgi Çubuğu */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📧</span>
            <h1 className="text-xl font-bold text-gray-800">TempMail</h1>
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              Geçici E-posta
            </span>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setPage('inbox')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                page === 'inbox'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📬 Gelen Kutusu
            </button>
            <button
              onClick={() => setPage('admin')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                page === 'admin'
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ⚙️ Admin
            </button>
          </nav>
        </div>
      </header>

      {/* Bildirim */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-in ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Ana İçerik */}
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
            />

            {/* İçerik: Inbox + Mail Detayı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gelen Kutusu */}
              <Inbox
                emails={emails}
                selectedEmailId={selectedEmail?.id}
                onSelectEmail={fetchEmailDetail}
                hasAddress={!!currentAddress}
              />

              {/* Mail Görüntüleme */}
              <EmailView
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                apiBase={API_BASE}
              />
            </div>
          </div>
        ) : (
          /* Admin Paneli */
          <AdminPanel apiBase={API_BASE} />
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-400 text-sm">
        TempMail - Geçici e-posta servisi
      </footer>
    </div>
  );
}
