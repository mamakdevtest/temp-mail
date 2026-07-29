import { useEffect, useState } from 'react';
import { BellRing, KeyRound, Plus, Power, Trash2, Webhook, Copy } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';
import { useLocale } from '../i18n';
import { ListSkeleton } from './Skeleton';
import { PageHeader, Card, Field, Input, Checkbox, Button, IconButton, EmptyState } from './ui';

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
  const [saving, setSaving] = useState('');
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
    if (!keyName.trim() || !keyScopes.length) { setMessage('Anahtar adı ve en az bir izin seçin.'); return; }
    setSaving('key'); setMessage('');
    try {
      const response = await apiFetch('/api/automation/api-keys', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: keyName, scopes: keyScopes, rate_limit_per_minute: keyRateLimit, key_type: masterKey ? 'master' : 'standard' }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || data.error);
      setSecret(data.secret); setKeyName(''); setMasterKey(false); setMessage('API anahtarı oluşturuldu.'); await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(''); }
  };
  const createHook = async () => {
    if (!hookName.trim() || !hookUrl.trim() || !hookEvents.length) { setMessage('Webhook için ad, HTTPS adresi ve en az bir olay seçin.'); return; }
    setSaving('hook'); setMessage('');
    try {
      const response = await apiFetch('/api/automation/webhooks', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: hookName, url: hookUrl, events: hookEvents }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || data.error);
      setSecret(data.secret); setHookName(''); setHookUrl(''); setMessage('Webhook oluşturuldu.'); await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(''); }
  };
  const runAction = async (id, request, successMessage) => {
    setSaving(id); setMessage('');
    try {
      const response = await request();
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'İşlem tamamlanamadı.');
      setMessage(successMessage); await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(''); }
  };
  const revoke = (id) => runAction(`key-${id}`, () => apiFetch(`/api/automation/api-keys/${id}`, { method: 'DELETE', headers }), 'API anahtarı iptal edildi.');
  const toggleKey = (key) => runAction(`key-${key.id}`, () => apiFetch(`/api/automation/api-keys/${key.id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !key.is_active }) }), key.is_active ? 'API anahtarı duraklatıldı.' : 'API anahtarı etkinleştirildi.');
  const toggleHook = (hook) => runAction(`hook-${hook.id}`, () => apiFetch(`/api/automation/webhooks/${hook.id}`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !hook.is_active }) }), hook.is_active ? 'Webhook duraklatıldı.' : 'Webhook etkinleştirildi.');

  return (
    <section className="space-y-6">
      <PageHeader eyebrow={t('automation.eyebrow') || 'AUTOMATION'} icon={BellRing} title={t('automation.title')} subtitle={t('automation.subtitle')} />

      {secret && (
        <Card className="border-[rgb(var(--success)/0.4)] bg-[rgb(var(--success)/0.08)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="section-title text-[rgb(var(--success-fg))]">{t('automation.newSecret')}</p>
              <code className="t-mono text-txt-primary break-all">{secret}</code>
            </div>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(secret)}><Copy size={14} /> {t('automation.copy')}</Button>
          </div>
        </Card>
      )}
      {message && <p className="t-body-sm text-[rgb(var(--danger-fg))]">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API keys */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><KeyRound size={16} className="text-[rgb(var(--brand))]" /><h2 className="t-card-title text-txt-primary">{t('automation.apiKey')}</h2></div>
          </div>
          <div className="space-y-3">
            <Field label={t('automation.name')}><Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="CUSTOM_TEMPMAIL_TOKEN" /></Field>
            <Field label={t('automation.rateLimit')}><Input type="number" min="10" max={isAdmin ? 10000 : 1000} value={keyRateLimit} onChange={(e) => setKeyRateLimit(e.target.value)} /></Field>
            {isAdmin && <Checkbox checked={masterKey} onChange={(e) => setMasterKey(e.target.checked)} label={t('automation.masterKey')} />}
            <div>
              <p className="section-title mb-2">{t('automation.scopes')}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {SCOPE_OPTIONS.map((scope) => <Checkbox key={scope} checked={masterKey || keyScopes.includes(scope)} onChange={() => toggle(keyScopes, setKeyScopes, scope)} label={<span className="t-mono">{scope}</span>} />)}
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={createKey} disabled={saving === 'key'}>{saving === 'key' ? 'Oluşturuluyor…' : <><Plus size={15} /> {t('automation.createKey')}</>}</Button>
          </div>
          <div className="mt-4">
            {listLoading ? <ListSkeleton rows={3} /> : keys.length === 0 ? (
              <EmptyState icon={KeyRound} title={t('automation.noKeys') || t('automation.apiKey')} />
            ) : (
              <div className="space-y-2 stagger-in">
                {keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate">{key.name} {key.key_type === 'master' && <span className="badge-gold text-[9px] px-1.5 py-0 ml-1">MASTER</span>}</p>
                      <code className="t-mono text-txt-muted">{key.key_prefix}••••</code>
                      <p className="t-caption text-txt-muted">{key.is_active ? t('automation.active') : t('automation.inactive')} · {key.rate_limit_per_minute}/dk · {t('automation.usageCount', { count: key.usage_count || 0 })}</p>
                      <p className="t-caption text-txt-disabled">{key.last_used_at ? t('automation.lastUsed', { date: new Date(key.last_used_at).toLocaleString(language === 'en' ? 'en-US' : 'tr-TR') }) : t('automation.neverUsed')}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton icon={Power} size={15} label={key.is_active ? t('automation.deactivate') : t('automation.activate')} onClick={() => toggleKey(key)} disabled={saving === `key-${key.id}`} className={key.is_active ? '!text-[rgb(var(--success-fg))]' : ''} />
                      <IconButton icon={Trash2} size={15} label={t('automation.revoke')} onClick={() => revoke(key.id)} disabled={saving === `key-${key.id}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Webhooks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Webhook size={16} className="text-[rgb(var(--brand))]" /><h2 className="t-card-title text-txt-primary">{t('automation.webhookTarget')}</h2></div>
          </div>
          <div className="space-y-3">
            <Field label={t('automation.name')}><Input value={hookName} onChange={(e) => setHookName(e.target.value)} placeholder="Production events" /></Field>
            <Field label="HTTPS URL"><Input className="font-mono" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://example.com/hooks/mail" /></Field>
            <div>
              <p className="section-title mb-2">{t('automation.events')}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {EVENT_OPTIONS.map((eventName) => <Checkbox key={eventName} checked={hookEvents.includes(eventName)} onChange={() => toggle(hookEvents, setHookEvents, eventName)} label={<span className="t-mono">{eventName}</span>} />)}
              </div>
            </div>
            <Button variant="primary" className="w-full" onClick={createHook} disabled={saving === 'hook'}>{saving === 'hook' ? 'Ekleniyor…' : <><Plus size={15} /> {t('automation.addWebhook')}</>}</Button>
          </div>
          <div className="mt-4">
            {listLoading ? <ListSkeleton rows={3} /> : hooks.length === 0 ? (
              <EmptyState icon={Webhook} title={t('automation.noHooks') || t('automation.webhookTarget')} />
            ) : (
              <div className="space-y-2 stagger-in">
                {hooks.map((hook) => (
                  <div key={hook.id} className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-brand-border bg-brand-surface2 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate">{hook.name}</p>
                      <code className="t-mono text-txt-muted break-all">{hook.url}</code>
                      <p className="t-caption text-txt-muted">{hook.events.join(', ')}</p>
                    </div>
                    <IconButton icon={Power} size={15} label={hook.is_active ? t('automation.stop') : t('automation.start')} onClick={() => toggleHook(hook)} disabled={saving === `hook-${hook.id}`} className={hook.is_active ? '!text-[rgb(var(--success-fg))]' : ''} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
