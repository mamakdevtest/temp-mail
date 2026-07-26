import { useEffect, useState } from 'react';
import { BellRing, KeyRound, Plus, Power, Trash2, Webhook } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

const EVENT_OPTIONS = ['email.received', 'otp.detected', 'address.expiring', 'bulk.completed'];
const SCOPE_OPTIONS = ['addresses:read', 'addresses:write', 'emails:read', 'emails:delete', 'bulk:write', 'webhooks:manage'];

export default function AutomationCenter({ token, isAdmin = false }) {
  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState(['addresses:read', 'emails:read']);
  const [keyRateLimit, setKeyRateLimit] = useState(120);
  const [masterKey, setMasterKey] = useState(false);
  const [hookName, setHookName] = useState('');
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState(['email.received']);
  const [secret, setSecret] = useState('');
  const [message, setMessage] = useState('');
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const [keyResponse, hookResponse] = await Promise.all([apiFetch('/api/automation/api-keys', { headers }), apiFetch('/api/automation/webhooks', { headers })]);
      const keyData = await keyResponse.json(); const hookData = await hookResponse.json();
      if (keyResponse.ok) setKeys(keyData.keys || []);
      if (hookResponse.ok) setHooks(hookData.webhooks || []);
    } catch (error) { setMessage(error.message); }
  };
  useEffect(() => { void load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (values, setter, value) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  const createKey = async () => {
    try {
      const response = await apiFetch('/api/automation/api-keys', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: keyName, scopes: keyScopes, rate_limit_per_minute: keyRateLimit, key_type: masterKey ? 'master' : 'standard' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || data.error);
      setSecret(data.secret); setKeyName(''); setMasterKey(false); await load();
    } catch (error) { setMessage(error.message); }
  };
  const createHook = async () => {
    try {
      const response = await apiFetch('/api/automation/webhooks', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: hookName, url: hookUrl, events: hookEvents }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || data.error);
      setSecret(data.secret); setHookName(''); setHookUrl(''); await load();
    } catch (error) { setMessage(error.message); }
  };
  const revoke = async (id) => { await apiFetch(`/api/automation/api-keys/${id}`, { method: 'DELETE', headers }); await load(); };
  const toggleKey = async (key) => { await apiFetch(`/api/automation/api-keys/${key.id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !key.is_active }) }); await load(); };
  const toggleHook = async (hook) => { await apiFetch(`/api/automation/webhooks/${hook.id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !hook.is_active }) }); await load(); };

  return <section className="ops-page automation-page"><header className="ops-page-header"><div><p className="ops-eyebrow"><BellRing size={14} /> AUTOMATION CENTER</p><h1>İnbox’ını ürünlerine bağla.</h1><p>API anahtarları ve webhook’lar hesap bazlıdır; sırları yalnız bir kez gösteririz.</p></div></header>
    {secret && <div className="ops-secret"><strong>Yeni sır — şimdi kopyalayın</strong><code>{secret}</code><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(secret)}>Kopyala</button></div>}
    {message && <p className="ops-error">{message}</p>}
    <div className="automation-grid"><article className="ops-card"><div className="ops-card-heading"><div><span className="ops-step">API</span><h2>API anahtarı</h2></div><KeyRound size={18} /></div><label className="ops-field"><span>Ad</span><input className="input" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="CUSTOM_TEMPMAIL_TOKEN" /></label><label className="ops-field"><span>İstek limiti / dk</span><input className="input" type="number" min="10" max={isAdmin ? 10000 : 1000} value={keyRateLimit} onChange={(event) => setKeyRateLimit(event.target.value)} /></label>{isAdmin && <label className="choice-grid mb-4"><span><input type="checkbox" checked={masterKey} onChange={(event) => setMasterKey(event.target.checked)} /> Master key — tüm admin işlemleri</span></label>}<div className="ops-field"><span>İzinler</span><div className="choice-grid">{SCOPE_OPTIONS.map((scope) => <label key={scope}><input type="checkbox" checked={masterKey || keyScopes.includes(scope)} disabled={masterKey} onChange={() => toggle(keyScopes, setKeyScopes, scope)} />{scope}</label>)}</div></div><button className="btn-primary w-full" onClick={createKey}><Plus size={16} /> Anahtar oluştur</button><div className="automation-list">{keys.map((key) => <article key={key.id}><div><strong>{key.name} {key.key_type === 'master' ? '· MASTER' : ''}</strong><code>{key.key_prefix}••••</code><small>{key.is_active ? 'Aktif' : 'Pasif'} · {key.rate_limit_per_minute}/dk · {key.usage_count || 0} kullanım</small><small>{key.last_used_at ? `Son kullanım: ${new Date(key.last_used_at).toLocaleString('tr-TR')}` : 'Henüz kullanılmadı'}</small></div><div className="bulk-pool-actions"><button className="icon-button" title={key.is_active ? 'Pasifleştir' : 'Etkinleştir'} onClick={() => toggleKey(key)}><Power size={15} className={key.is_active ? 'text-accent-green' : ''} /></button><button className="icon-button" title="İptal et" onClick={() => revoke(key.id)}><Trash2 size={15} /></button></div></article>)}</div></article>
      <article className="ops-card"><div className="ops-card-heading"><div><span className="ops-step">WEBHOOK</span><h2>Bildirim hedefi</h2></div><Webhook size={18} /></div><label className="ops-field"><span>Ad</span><input className="input" value={hookName} onChange={(event) => setHookName(event.target.value)} placeholder="Production events" /></label><label className="ops-field"><span>HTTPS URL</span><input className="input font-mono" value={hookUrl} onChange={(event) => setHookUrl(event.target.value)} placeholder="https://example.com/hooks/mail" /></label><div className="ops-field"><span>Olaylar</span><div className="choice-grid">{EVENT_OPTIONS.map((eventName) => <label key={eventName}><input type="checkbox" checked={hookEvents.includes(eventName)} onChange={() => toggle(hookEvents, setHookEvents, eventName)} />{eventName}</label>)}</div></div><button className="btn-primary w-full" onClick={createHook}><Plus size={16} /> Webhook ekle</button><div className="automation-list">{hooks.map((hook) => <article key={hook.id}><div><strong>{hook.name}</strong><code>{hook.url}</code><small>{hook.events.join(', ')}</small></div><button className="icon-button" title={hook.is_active ? 'Durdur' : 'Başlat'} onClick={() => toggleHook(hook)}><Power size={15} className={hook.is_active ? 'text-accent-green' : ''} /></button></article>)}</div></article></div>
  </section>;
}
