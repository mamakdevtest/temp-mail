import { useEffect, useState } from 'react';
import { BellRing, KeyRound, Plus, Power, Trash2, Webhook } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { ListSkeleton } from './Skeleton';

const EVENT_OPTIONS = ['email.received', 'otp.detected', 'address.expiring', 'bulk.completed'];
const SCOPE_OPTIONS = ['addresses:read', 'addresses:write', 'emails:read', 'emails:delete', 'bulk:write', 'webhooks:manage'];

export default function AutomationCenter({ token, isAdmin = false }) {
  const { t, language } = useLocale();
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
  const [listLoading, setListLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setListLoading(true);
    try {
      const [keyResponse, hookResponse] = await Promise.all([apiFetch('/api/automation/api-keys', { headers }), apiFetch('/api/automation/webhooks', { headers })]);
      const keyData = await keyResponse.json(); const hookData = await hookResponse.json();
      if (keyResponse.ok) setKeys(keyData.keys || []);
      if (hookResponse.ok) setHooks(hookData.webhooks || []);
    } catch (error) { setMessage(error.message); }
    finally { setListLoading(false); }
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

  return <section className="ops-page automation-page"><header className="ops-page-header"><div><p className="ops-eyebrow"><BellRing size={14} /> AUTOMATION CENTER</p><h1>{t('automation.title')}</h1><p>{t('automation.subtitle')}</p></div></header>
    {secret && <div className="ops-secret"><strong>{t('automation.newSecret')}</strong><code>{secret}</code><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(secret)}>{t('automation.copy')}</button></div>}
    {message && <p className="ops-error">{message}</p>}
    <div className="automation-grid"><article className="ops-card"><div className="ops-card-heading"><div><span className="ops-step">API</span><h2>{t('automation.apiKey')}</h2></div><KeyRound size={18} /></div><label className="ops-field"><span>{t('automation.name')}</span><input className="input" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="CUSTOM_TEMPMAIL_TOKEN" /></label><label className="ops-field"><span>{t('automation.rateLimit')}</span><input className="input" type="number" min="10" max={isAdmin ? 10000 : 1000} value={keyRateLimit} onChange={(event) => setKeyRateLimit(event.target.value)} /></label>{isAdmin && <label className="choice-grid mb-4"><span><input type="checkbox" checked={masterKey} onChange={(event) => setMasterKey(event.target.checked)} /> {t('automation.masterKey')}</span></label>}<div className="ops-field"><span>{t('automation.scopes')}</span><div className="choice-grid">{SCOPE_OPTIONS.map((scope) => <label key={scope}><input type="checkbox" checked={masterKey || keyScopes.includes(scope)} disabled={masterKey} onChange={() => toggle(keyScopes, setKeyScopes, scope)} />{scope}</label>)}</div></div><button className="btn-primary w-full" onClick={createKey}><Plus size={16} /> {t('automation.createKey')}</button>{listLoading ? <ListSkeleton rows={3} /> : <div className="automation-list stagger-in">{keys.map((key) => <article key={key.id}><div><strong>{key.name} {key.key_type === 'master' ? '· MASTER' : ''}</strong><code>{key.key_prefix}••••</code><small>{key.is_active ? t('automation.active') : t('automation.inactive')} · {key.rate_limit_per_minute}/dk · {t('automation.usageCount', { count: key.usage_count || 0 })}</small><small>{key.last_used_at ? t('automation.lastUsed', { date: new Date(key.last_used_at).toLocaleString(language === 'en' ? 'en-US' : 'tr-TR') }) : t('automation.neverUsed')}</small></div><div className="bulk-pool-actions"><button className="icon-button active:scale-95 transition-all" title={key.is_active ? t('automation.deactivate') : t('automation.activate')} onClick={() => toggleKey(key)}><Power size={15} className={key.is_active ? 'text-accent-green' : ''} /></button><button className="icon-button active:scale-95 transition-all" title={t('automation.revoke')} onClick={() => revoke(key.id)}><Trash2 size={15} /></button></div></article>)}</div>}</article>
      <article className="ops-card"><div className="ops-card-heading"><div><span className="ops-step">WEBHOOK</span><h2>{t('automation.webhookTarget')}</h2></div><Webhook size={18} /></div><label className="ops-field"><span>{t('automation.name')}</span><input className="input" value={hookName} onChange={(event) => setHookName(event.target.value)} placeholder="Production events" /></label><label className="ops-field"><span>HTTPS URL</span><input className="input font-mono" value={hookUrl} onChange={(event) => setHookUrl(event.target.value)} placeholder="https://example.com/hooks/mail" /></label><div className="ops-field"><span>{t('automation.events')}</span><div className="choice-grid">{EVENT_OPTIONS.map((eventName) => <label key={eventName}><input type="checkbox" checked={hookEvents.includes(eventName)} onChange={() => toggle(hookEvents, setHookEvents, eventName)} />{eventName}</label>)}</div></div><button className="btn-primary w-full" onClick={createHook}><Plus size={16} /> {t('automation.addWebhook')}</button>{listLoading ? <ListSkeleton rows={3} /> : <div className="automation-list stagger-in">{hooks.map((hook) => <article key={hook.id}><div><strong>{hook.name}</strong><code>{hook.url}</code><small>{hook.events.join(', ')}</small></div><button className="icon-button active:scale-95 transition-all" title={hook.is_active ? t('automation.stop') : t('automation.start')} onClick={() => toggleHook(hook)}><Power size={15} className={hook.is_active ? 'text-accent-green' : ''} /></button></article>)}</div>}</article></div>
  </section>;
}
