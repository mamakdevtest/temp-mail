import { useState, useEffect, useCallback } from 'react';

const API = '/api';

/**
 * Auth hook - JWT tabanlı kimlik doğrulama
 * localStorage'da token saklar
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tm-token'));
  const [pkg, setPkg] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Token varsa kullanıcı bilgisini getir
  const loadMe = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const d = await r.json();
        setUser(d.user);
        setPkg(d.package);
        setStats(d.stats);
      } else {
        // Token geçersiz
        localStorage.removeItem('tm-token');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.warn('Auth me hatası:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

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
    localStorage.removeItem('tm-token');
    setToken(null);
    setUser(null);
    setPkg(null);
    setStats(null);
  };

  // Pro isteği gönder
  const requestPro = async (message) => {
    const r = await fetch(`${API}/auth/request-pro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'İstek gönderilemedi');
    return d;
  };

  // Yetki kontrolü
  const isAdmin = user?.role === 'admin';
  const isPro = user?.role === 'pro' || isAdmin;
  const isFree = user?.role === 'free';

  return { user, token, pkg, stats, loading, isAdmin, isPro, isFree, register, login, logout, requestPro, loadMe };
}
