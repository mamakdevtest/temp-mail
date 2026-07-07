import { useState, useEffect, useCallback } from 'react';

const API = '/api';

const GUEST_USER = { id: null, username: 'Misafir', email: '', role: 'guest' };
const GUEST_PACKAGE = {
  name: 'guest',
  display_name: 'Hesapsız Kullanım',
  max_addresses: 3,
  max_emails: 50,
  email_retention_days: 7,
  custom_domains: 0,
  webhook_support: 0,
  priority_support: 0,
  price_monthly: 0,
  features: ['Hesapsız kullanım', 'Temel inbox', 'Giriş isteğe bağlı'],
};
const GUEST_STATS = { address_count: 0, email_count: 0 };

/**
 * Auth hook - JWT tabanlı kimlik doğrulama
 * localStorage'da token saklar
 */
export default function useAuth() {
  const initialToken = typeof window !== 'undefined' ? localStorage.getItem('tm-token') : null;
  const [user, setUser] = useState(initialToken ? null : GUEST_USER);
  const [token, setToken] = useState(initialToken);
  const [pkg, setPkg] = useState(initialToken ? null : GUEST_PACKAGE);
  const [stats, setStats] = useState(initialToken ? null : GUEST_STATS);
  const [preferences, setPreferences] = useState(initialToken ? null : {
    theme: 'system',
    language: 'tr',
    notification_sound: 'chime',
  });
  const [loading, setLoading] = useState(!!initialToken);

  const setGuestSession = useCallback(() => {
    localStorage.removeItem('tm-token');
    setToken(null);
    setUser(GUEST_USER);
    setPkg(GUEST_PACKAGE);
    setStats(GUEST_STATS);
  }, []);

  // Token varsa kullanıcı bilgisini getir
  const loadMe = useCallback(async () => {
    if (!token) {
      setGuestSession();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        setPkg(d.package);
        setStats(d.stats);
        setPreferences(d.preferences || null);
      } else {
        // Token geçersiz
        setGuestSession();
      }
    } catch (e) {
      console.warn('Auth me hatası:', e);
      setGuestSession();
    } finally {
      setLoading(false);
    }
  }, [token, setGuestSession]);

  useEffect(() => { loadMe(); }, [loadMe]);

  // Kayıt ol
  const register = async (username, email, password) => {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Kayıt başarısız');
    localStorage.setItem('tm-token', d.token);
    setToken(d.token);
    setUser(d.user);
    return d;
  };

  // Giriş yap
  const login = async (loginStr, password) => {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: loginStr, password }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Giriş başarısız');
    localStorage.setItem('tm-token', d.token);
    setToken(d.token);
    setUser(d.user);
    return d;
  };

  // Çıkış yap
  const logout = () => {
    setGuestSession();
  };

  // Pro isteği gönder
  const requestPro = async (message) => {
    if (!token) {
      throw new Error('Pro isteği göndermek için önce giriş yapın veya kayıt olun');
    }

    const r = await fetch(`${API}/auth/request-pro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'İstek gönderilemedi');
    return d;
  };

  const updateProfile = async ({ username, display_name }) => {
    if (!token) {
      throw new Error('Bu işlem için giriş yapın');
    }

    const r = await fetch(`${API}/auth/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, display_name }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Profil güncellenemedi');

    if (d.token) {
      localStorage.setItem('tm-token', d.token);
      setToken(d.token);
    }
    if (d.user) {
      setUser(d.user);
    }

    return d;
  };

  const requestEmailChange = async (email) => {
    if (!token) throw new Error('Bu işlem için giriş yapın');
    const r = await fetch(`${API}/auth/request-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'E-posta değişikliği başlatılamadı');
    if (d.user) setUser(d.user);
    return d;
  };

  const confirmEmailChange = async (code) => {
    if (!token) throw new Error('Bu işlem için giriş yapın');
    const r = await fetch(`${API}/auth/confirm-email-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'E-posta doğrulanamadı');
    if (d.token) {
      localStorage.setItem('tm-token', d.token);
      setToken(d.token);
    }
    if (d.user) setUser(d.user);
    return d;
  };

  const updatePreferences = async (payload) => {
    if (!token) throw new Error('Bu işlem için giriş yapın');
    const r = await fetch(`${API}/auth/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Tercihler güncellenemedi');
    if (d.user) setUser(d.user);
    if (d.preferences) setPreferences(d.preferences);
    if (d.token) {
      localStorage.setItem('tm-token', d.token);
      setToken(d.token);
    }
    return d;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    if (!token) throw new Error('Bu işlem için giriş yapın');
    const r = await fetch(`${API}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Şifre değiştirilemedi');
    if (d.token) {
      localStorage.setItem('tm-token', d.token);
      setToken(d.token);
    }
    await loadMe();
    return d;
  };

  const uploadAvatar = async (avatarDataUrl) => {
    if (!token) throw new Error('Bu işlem için giriş yapın');
    const r = await fetch(`${API}/auth/profile-photo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatarDataUrl }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Profil fotoğrafı yüklenemedi');
    if (d.user) setUser(d.user);
    return d;
  };

  // Yetki kontrolü
  const isGuest = user?.role === 'guest';
  const isAdmin = user?.role === 'admin';
  const isPro = user?.role === 'pro' || isAdmin;
  const isFree = user?.role === 'free';

  return {
    user,
    token,
    pkg,
    stats,
    preferences,
    loading,
    isGuest,
    isAdmin,
    isPro,
    isFree,
    register,
    login,
    logout,
    requestPro,
    updateProfile,
    requestEmailChange,
    confirmEmailChange,
    changePassword,
    updatePreferences,
    uploadAvatar,
    loadMe,
  };
}
