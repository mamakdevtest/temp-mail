import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Shield,
  Plus,
  Trash2,
  Download,
  LayoutDashboard,
  Users,
  Globe,
  Mail,
  KeyRound,
  Lock,
  Settings2,
  Eye,
  RefreshCw,
  Activity,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  PieChart as PieChartIcon,
  UserCog,
  Crown,
  ArrowLeft,
  Copy,
  X,
  Search,
  ChevronDown,
  Filter,
  ListRestart,
  Inbox,
  CalendarRange,
  Sparkles,
  ExternalLink,
  FolderLock,
  FileText,
  Pencil,
  Server,
  LoaderCircle,
} from 'lucide-react';
import { AdminPanelCard, AdminStatCard, AdminEmptyState, AdminInfoRow, AdminToolbar } from './admin/AdminPrimitives';
import Modal from './Modal';
import {
  formatAdminDate,
  formatRelativeTime,
  formatRetention,
  getAddressStatus,
  getAddressActivityTimestamp,
  sortAddresses,
} from './admin/adminUtils';

const CHART_COLORS = ['#3B82FF', '#27D59B', '#F5C84C', '#7A63FF', '#34D7FF'];
const ADDRESS_PAGE_SIZE = 10;

function StatusPill({ label, className }) {
  return <span className={className}>{label}</span>;
}

function sanitizeIpInput(value) {
  return value.replace(/[^0-9.]/g, '');
}

function AdminHero({ title, subtitle, icon: Icon, actions, tabs, activeTab, onTabChange }) {
  return (
    <div className="card p-6 bg-[radial-gradient(circle_at_top_left,rgba(122,99,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(52,215,255,0.12),transparent_26%)]">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[24px] panel-soft flex items-center justify-center shadow-glow-cyan shrink-0">
            <Icon size={30} className="text-accent-cyan" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[2rem] font-semibold tracking-tight text-txt-primary">{title}</h2>
            <p className="text-sm text-txt-secondary mt-1">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </div>
      <div className="flex flex-wrap gap-2 mt-6">
        {tabs.map((item) => {
          const IconNode = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={activeTab === item.id ? 'nav-pill nav-pill-active' : 'nav-pill'}
            >
              <IconNode size={15} /> {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPanel({ api, token, notificationSound = 'classic', notificationSounds = [], onNotificationSoundChange, onPreviewNotificationSound }) {
  const [pw, setPw] = useState(() => localStorage.getItem('tm-admin-pw') || '');
  const [auth, setAuth] = useState(Boolean(token));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [tab, setTab] = useState('dashboard');

  const [domains, setDomains] = useState([]);
  const [stats, setStats] = useState(null);
  const [addrs, setAddrs] = useState([]);
  const [emails, setEmails] = useState([]);
  const [emailsTotal, setEmailsTotal] = useState(0);
  const [emailsPage, setEmailsPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);

  const [showDomainForm, setShowDomainForm] = useState(false);
  const [newDom, setNewDom] = useState('');
  const [newDomWildcard, setNewDomWildcard] = useState(false);
  const [docsDomain, setDocsDomain] = useState(null);
  const [docsIp, setDocsIp] = useState('');
  const [docsRefreshing, setDocsRefreshing] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [editDomainIp, setEditDomainIp] = useState('');
  const [editDomainWildcard, setEditDomainWildcard] = useState(false);

  // Subdomain yönetimi
  const [domainSubdomains, setDomainSubdomains] = useState({});
  const [subdomainDrafts, setSubdomainDrafts] = useState({});
  const [addingSubdomainTo, setAddingSubdomainTo] = useState(null);
  const [loadingSubdomains, setLoadingSubdomains] = useState({});
  const [expandedDomains, setExpandedDomains] = useState({});

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedAddressDetail, setSelectedAddressDetail] = useState(null);
  const [selectedAddressMail, setSelectedAddressMail] = useState(null);
  const [selectedGlobalMail, setSelectedGlobalMail] = useState(null);

  const [addressQuery, setAddressQuery] = useState('');
  const [addressDomainFilter, setAddressDomainFilter] = useState('all');
  const [addressStatusFilter, setAddressStatusFilter] = useState('all');
  const [addressSort, setAddressSort] = useState('newest');
  const [addressPage, setAddressPage] = useState(1);

  const addDomainInputRef = useRef(null);
  const flashTimerRef = useRef(null);

  const flash = useCallback((msg, type = 'success') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (type === 'success') {
      setOk(msg);
      setErr('');
    } else {
      setErr(msg);
      setOk('');
    }
    flashTimerRef.current = setTimeout(() => {
      setOk('');
      setErr('');
    }, 3500);
  }, []);

  const getHeaders = useCallback((withJson = false) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-admin-password': pw };
    return withJson ? { 'Content-Type': 'application/json', ...headers } : headers;
  }, [token, pw]);

  const apiRequest = useCallback(async (path, options = {}) => {
    const { method = 'GET', body, withJson = method !== 'GET' } = options;
    const res = await fetch(`${api}${path}`, {
      method,
      headers: getHeaders(withJson),
      body: body ? JSON.stringify(body) : undefined,
    });

    let data = {};
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }
    }

    if (res.status === 401) {
      setAuth(false);
      throw new Error('Admin yetkisi gerekiyor');
    }

    if (!res.ok) {
      if (typeof data.message === 'string' && data.message.includes('Cannot ') && data.message.includes('/api/')) {
        throw new Error('API endpoint bulunamadı. Backend sunucusunu yeniden başlatın.');
      }
      throw new Error(data.error || data.message || 'İşlem başarısız');
    }

    return data;
  }, [api, getHeaders]);

  const loadDomains = useCallback(async () => {
    const data = await apiRequest('/admin/domains');
    const nextDomains = data.domains || [];
    setDomains(nextDomains);
    setExpandedDomains((prev) => nextDomains.reduce((acc, domain) => {
      acc[domain.id] = prev[domain.id] ?? true;
      return acc;
    }, {}));
    setAuth(true);
    return nextDomains;
  }, [apiRequest]);

  const loadStats = useCallback(async () => {
    const data = await apiRequest('/admin/stats');
    setStats(data);
  }, [apiRequest]);

  const loadAddrs = useCallback(async () => {
    const data = await apiRequest('/admin/addresses');
    setAddrs(data.addresses || []);
  }, [apiRequest]);

  const loadEmails = useCallback(async (page = 1) => {
    const data = await apiRequest(`/admin/emails?page=${page}&limit=50`);
    setEmails(data.emails || []);
    setEmailsTotal(data.total || 0);
    setEmailsPage(data.page || page);
  }, [apiRequest]);

  const loadUsers = useCallback(async () => {
    const data = await apiRequest('/admin/users');
    setUsers(data.users || []);
  }, [apiRequest]);

  const loadRequests = useCallback(async () => {
    const data = await apiRequest('/admin/package-requests');
    setRequests(data.requests || []);
  }, [apiRequest]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDomains(), loadStats(), loadAddrs(), loadUsers(), loadRequests()]);
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [flash, loadAddrs, loadDomains, loadRequests, loadStats, loadUsers]);

  const loadAddressDetail = useCallback(async (addressValue) => {
    const data = await apiRequest(`/admin/addresses/${encodeURIComponent(addressValue)}`);
    setSelectedAddress(addressValue);
    setSelectedAddressDetail(data);
    setSelectedAddressMail(null);
    return data;
  }, [apiRequest]);

  const openAddressDetail = useCallback(async (addressValue) => {
    setLoading(true);
    try {
      await loadAddressDetail(addressValue);
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [flash, loadAddressDetail]);

  const openMailDetail = useCallback(async (id, scope = 'address') => {
    try {
      const res = await fetch(`${api}/emails/single/${id}`);
      if (!res.ok) throw new Error('Mail detayı alınamadı');
      const mail = await res.json();
      if (scope === 'global') setSelectedGlobalMail(mail);
      else setSelectedAddressMail(mail);
    } catch (e) {
      flash(e.message, 'error');
    }
  }, [api, flash]);

  const login = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setLoading(true);
    try {
      const data = await apiRequest('/admin/stats');
      if (data) {
        localStorage.setItem('tm-admin-pw', pw);
        setAuth(true);
        flash('Admin girişi başarılı');
      }
    } catch (e2) {
      flash(e2.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuth(false);
    setPw('');
    setStats(null);
    setEmails([]);
    setAddrs([]);
    setUsers([]);
    setRequests([]);
    setDomains([]);
    setSelectedAddress(null);
    setSelectedAddressDetail(null);
    setSelectedAddressMail(null);
    setSelectedGlobalMail(null);
    localStorage.removeItem('tm-admin-pw');
  };

  const addDomain = async (e) => {
    e.preventDefault();
    if (!newDom.trim()) return;
    setLoading(true);
    try {
      const data = await apiRequest('/admin/domains', {
        method: 'POST',
        body: { domain: newDom.trim(), wildcard_subdomains: newDomWildcard }
      });
      setNewDom('');
      setNewDomWildcard(false);
      setShowDomainForm(false);
      flash(`"${data.domain.domain}" eklendi${data.domain.wildcard_subdomains ? ' (subdomain destekli)' : ''}`);
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e2) {
      flash(e2.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDom = async (id, active, wildcard) => {
    try {
      await apiRequest(`/admin/domains/${id}`, { method: 'PUT', body: { is_active: !active, wildcard_subdomains: !!wildcard } });
      flash(active ? 'Domain pasife alındı' : 'Domain aktifleştirildi');
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const delDom = async (id, name) => {
    if (!confirm(`"${name}" silinecek. Devam edilsin mi?`)) return;
    try {
      await apiRequest(`/admin/domains/${id}`, { method: 'DELETE', withJson: false });
      flash(`"${name}" silindi`);
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const openDomainEditor = useCallback((domain) => {
    setEditingDomain(domain);
    setEditDomainIp(domain.server_ip || '');
    setEditDomainWildcard(domain.wildcard_subdomains === 1);
  }, []);

  // Subdomain yönetimi fonksiyonları
  const loadSubdomains = useCallback(async (domainId) => {
    setLoadingSubdomains(prev => ({ ...prev, [domainId]: true }));
    try {
      const data = await apiRequest(`/admin/domains/${domainId}/subdomains`);
      setDomainSubdomains(prev => ({ ...prev, [domainId]: data.subdomains || [] }));
    } catch (e) {
      const message = String(e.message || '');
      if (message.includes('Cannot GET') || message.includes('404')) {
        setDomainSubdomains(prev => ({ ...prev, [domainId]: [] }));
      } else {
        flash(e.message, 'error');
      }
    } finally {
      setLoadingSubdomains(prev => ({ ...prev, [domainId]: false }));
    }
  }, [apiRequest, flash]);

  const addSubdomain = async (domainId, domainName) => {
    const nextSubdomain = String(subdomainDrafts[domainId] || '').trim();
    if (!nextSubdomain) return;
    setLoading(true);
    setAddingSubdomainTo(domainId);
    try {
      const data = await apiRequest(`/admin/domains/${domainId}/subdomains`, {
        method: 'POST',
        body: { subdomain: nextSubdomain },
      });
      setSubdomainDrafts((prev) => ({ ...prev, [domainId]: '' }));
      flash(`"${data.full_domain}" subdomain eklendi`);
      await loadSubdomains(domainId);
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setAddingSubdomainTo(null);
      setLoading(false);
    }
  };

  const deleteSubdomain = async (domainId, subdomainId, subdomainName) => {
    if (!confirm(`"${subdomainName}" subdomain'i silinecek. Devam edilsin mi?`)) return;
    try {
      await apiRequest(`/admin/domains/${domainId}/subdomains/${subdomainId}`, { method: 'DELETE', withJson: false });
      flash(`"${subdomainName}" subdomain silindi`);
      await loadSubdomains(domainId);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const saveDomainEditor = async () => {
    if (!editingDomain) return;
    const ip = editDomainIp.trim();
    if (!ip) {
      flash('IP adresi gerekli', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest(`/admin/domains/${editingDomain.id}`, {
        method: 'PUT',
        body: {
          server_ip: ip,
          wildcard_subdomains: editDomainWildcard,
        },
      });
      if (data?.domain) {
        setDomains((prev) => prev.map((item) => (item.id === data.domain.id ? data.domain : item)));
        setDocsDomain((prev) => (prev && prev.id === data.domain.id ? data.domain : prev));
        setEditingDomain(data.domain);
      }
      flash('Domain bilgileri güncellendi');
      setEditingDomain(null);
      setEditDomainIp('');
      setEditDomainWildcard(false);
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const buildDomainDocs = useCallback((domain, ipOverride = '') => {
    if (!domain) return [];

    const ttl = 3600;
    const domainName = String(domain.domain || '').trim();
    const ip = sanitizeIpInput((ipOverride || domain.server_ip || '').trim());
    const effectiveIp = ip || 'SUNUCU_IP';
    const aHost = String(domain.a_host ?? 'mail').trim() || 'mail';
    const aValue = String(domain.a_value ?? '').trim() || effectiveIp;
    const mxHost = String(domain.mx_host ?? '@').trim() || '@';
    const mxValue = String(domain.mx_value ?? '').trim() || `mail.${domainName}`;
    const mxPriority = Number.isFinite(Number(domain.mx_priority)) ? Number(domain.mx_priority) : 10;
    const spfHost = String(domain.txt_spf_host ?? '@').trim() || '@';
    const spfValue = String(domain.txt_spf_value ?? '').trim() || `v=spf1 mx ip4:${effectiveIp} ~all`;
    const verificationHost = String(domain.txt_verification_host ?? '@').trim() || '@';
    const verificationValue = String(domain.txt_verification_value ?? '').trim() || `ms-temp-mail-domain=${domainName.replace(/[^a-z0-9]/gi, '-')}`;
    const dkimHost = String(domain.dkim_host ?? 'default._domainkey').trim() || 'default._domainkey';
    const dkimValue = String(domain.dkim_value ?? '').trim() || 'v=DKIM1; k=rsa; p=REPLACE_WITH_PUBLIC_KEY';
    const dmarcHost = String(domain.dmarc_host ?? '_dmarc').trim() || '_dmarc';
    const dmarcValue = String(domain.dmarc_value ?? '').trim() || `v=DMARC1; p=none; rua=mailto:postmaster@${domainName}`;

    return [
      {
        key: 'a',
        kind: 'A',
        title: 'A (HOST)',
        label: 'A',
        note: 'Ana sunucu adresi',
        tone: 'blue',
        badge: 'badge-blue',
        fields: [
          { label: 'Host / Name', value: aHost },
          { label: 'Value / Address', value: aValue },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `A | ${aHost} | ${aValue} | TTL ${ttl}`,
      },
      {
        key: 'mx',
        kind: 'MX',
        title: 'MX (MAIL EXCHANGE)',
        label: 'MX',
        note: 'Posta yönlendirme kaydı',
        tone: 'cyan',
        badge: 'badge-cyan',
        fields: [
          { label: 'Host / Name', value: mxHost },
          { label: 'Value / Address', value: mxValue },
          { label: 'Priority', value: String(mxPriority) },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `MX | ${mxHost} | ${mxValue} | Priority ${mxPriority} | TTL ${ttl}`,
      },
      {
        key: 'spf',
        kind: 'TXT',
        title: 'SPF (TXT)',
        label: 'SPF',
        note: 'Gönderim yetkilendirmesi',
        tone: 'purple',
        badge: 'badge-purple',
        fields: [
          { label: 'Host / Name', value: spfHost },
          { label: 'Value', value: spfValue },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `TXT | ${spfHost} | ${spfValue} | TTL ${ttl}`,
      },
      {
        key: 'verification',
        kind: 'TXT',
        title: 'Mail Verification (TXT)',
        label: 'TXT',
        note: 'Alan adı doğrulama kaydı',
        tone: 'green',
        badge: 'badge-green',
        fields: [
          { label: 'Host / Name', value: verificationHost },
          { label: 'Value', value: verificationValue },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `TXT | ${verificationHost} | ${verificationValue} | TTL ${ttl}`,
      },
      {
        key: 'dkim',
        kind: 'TXT',
        title: 'DKIM (TXT)',
        label: 'DKIM',
        note: 'İmza doğrulama kaydı',
        tone: 'gold',
        badge: 'badge-gold',
        fields: [
          { label: 'Host / Name', value: dkimHost },
          { label: 'Value', value: dkimValue },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `TXT | ${dkimHost} | ${dkimValue} | TTL ${ttl}`,
      },
      {
        key: 'dmarc',
        kind: 'TXT',
        title: 'DMARC (TXT)',
        label: 'DMARC',
        note: 'Politika ve raporlama kaydı',
        tone: 'red',
        badge: 'badge-red',
        fields: [
          { label: 'Host / Name', value: dmarcHost },
          { label: 'Value', value: dmarcValue },
          { label: 'TTL', value: String(ttl) },
        ],
        copyText: `TXT | ${dmarcHost} | ${dmarcValue} | TTL ${ttl}`,
      },
    ];
  }, []);

  const getDocsTone = useCallback((row) => {
    if (!row) {
      return {
        shell: 'border-brand-border/25 bg-brand-surface2/30',
        badge: 'badge-blue',
        title: 'text-txt-primary',
        copy: 'btn-secondary',
      };
    }

    if (row.tone === 'blue') {
      return {
        shell: 'border-accent-blue/25 bg-gradient-to-r from-accent-blue/18 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-blue',
        title: 'text-accent-blue',
        copy: 'btn-secondary border-accent-blue/25 text-accent-blue hover:bg-accent-blue/12',
      };
    }
    if (row.tone === 'cyan') {
      return {
        shell: 'border-cyan-400/25 bg-gradient-to-r from-cyan-400/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-cyan',
        title: 'text-cyan-300',
        copy: 'btn-secondary border-cyan-400/25 text-cyan-200 hover:bg-cyan-400/12',
      };
    }
    if (row.tone === 'purple') {
      return {
        shell: 'border-accent-purple/25 bg-gradient-to-r from-accent-purple/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-purple',
        title: 'text-accent-purple',
        copy: 'btn-secondary border-accent-purple/25 text-accent-purple hover:bg-accent-purple/12',
      };
    }
    if (row.tone === 'green') {
      return {
        shell: 'border-accent-green/25 bg-gradient-to-r from-accent-green/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-green',
        title: 'text-accent-green',
        copy: 'btn-secondary border-accent-green/25 text-accent-green hover:bg-accent-green/12',
      };
    }
    if (row.tone === 'gold') {
      return {
        shell: 'border-accent-gold/25 bg-gradient-to-r from-accent-gold/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-gold',
        title: 'text-accent-gold',
        copy: 'btn-secondary border-accent-gold/25 text-accent-gold hover:bg-accent-gold/12',
      };
    }
    if (row.tone === 'red') {
      return {
        shell: 'border-accent-red/25 bg-gradient-to-r from-accent-red/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-red',
        title: 'text-accent-red',
        copy: 'btn-secondary border-accent-red/25 text-accent-red hover:bg-accent-red/12',
      };
    }

    return {
      shell: 'border-brand-border/25 bg-brand-surface2/30',
      badge: 'badge-blue',
      title: 'text-txt-primary',
      copy: 'btn-secondary',
    };
  }, []);

  const copyText = useCallback(async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(successMessage || 'Kopyalandı', 'success');
    } catch (e) {
      flash('Kopyalama başarısız', 'error');
    }
  }, [flash]);

  const copyDnsRecord = useCallback(async (row) => {
    if (!row) return;
    await copyText(row.copyText, `${row.title} kopyalandı`);
  }, [copyText]);

  const copyDomainDocs = useCallback(async (domain) => {
    const lines = buildDomainDocs(domain, docsIp).map((row) => row.copyText).join('\n');
    await copyText(lines, 'Tüm DNS değerleri kopyalandı');
  }, [buildDomainDocs, copyText, docsIp]);

  const refreshDocsDomain = useCallback(async () => {
    if (!docsDomain) return;
    setDocsRefreshing(true);
    try {
      const nextDomains = await loadDomains();
      const refreshed = nextDomains.find((item) => item.id === docsDomain.id);
      if (refreshed) {
        setDocsDomain(refreshed);
        setDocsIp(refreshed.server_ip || '');
      }
      flash('DNS kayıtları yenilendi');
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setDocsRefreshing(false);
    }
  }, [docsDomain, flash, loadDomains]);

  const cleanupAll = async () => {
    if (!confirm('Tüm geçici adresler ve mailler için temizlik çalıştırılsın mı?')) return;
    try {
      const data = await apiRequest('/admin/cleanup', { method: 'POST', body: { type: 'all' } });
      flash(data.message || 'Temizlik tamamlandı');
      await Promise.all([refreshAll(), loadEmails(1)]);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const cleanupAddress = async (addressValue) => {
    if (!confirm(`"${addressValue}" için tüm mail geçmişi temizlensin mi?`)) return;
    try {
      const data = await apiRequest(`/admin/addresses/${encodeURIComponent(addressValue)}/cleanup`, { method: 'POST', body: {} });
      flash(data.message || 'Adres geçmişi temizlendi');
      await Promise.all([loadAddrs(), loadStats(), loadEmails(1)]);
      if (selectedAddress === addressValue) {
        await loadAddressDetail(addressValue);
      }
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const deleteAddress = async (addressValue) => {
    if (!confirm(`"${addressValue}" tamamen silinecek. Devam edilsin mi?`)) return;
    try {
      const data = await apiRequest(`/admin/addresses/${encodeURIComponent(addressValue)}`, { method: 'DELETE', withJson: false });
      flash(data.message || 'Adres silindi');
      await Promise.all([loadAddrs(), loadStats(), loadEmails(1)]);
      setSelectedAddress(null);
      setSelectedAddressDetail(null);
      setSelectedAddressMail(null);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const deleteEmail = async (id, scope = 'global') => {
    if (!confirm('Bu mail silinsin mi?')) return;
    try {
      await apiRequest(`/admin/emails/${id}`, { method: 'DELETE', withJson: false });
      flash('Mail silindi');
      await Promise.all([loadStats(), loadEmails(emailsPage), loadAddrs()]);
      if (scope === 'address' && selectedAddress) {
        await loadAddressDetail(selectedAddress);
        setSelectedAddressMail((prev) => (prev?.id === id ? null : prev));
      } else {
        setSelectedGlobalMail((prev) => (prev?.id === id ? null : prev));
      }
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const updateUserRole = async (id, role) => {
    try {
      await apiRequest(`/admin/users/${id}/role`, { method: 'PUT', body: { role } });
      flash('Kullanıcı rolü güncellendi');
      await Promise.all([loadUsers(), loadRequests()]);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const updateUserStatus = async (id, isActive) => {
    try {
      await apiRequest(`/admin/users/${id}/status`, { method: 'PUT', body: { is_active: isActive } });
      flash(isActive ? 'Kullanıcı aktif edildi' : 'Kullanıcı pasife alındı');
      await loadUsers();
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const handleRequestDecision = async (id, status) => {
    try {
      await apiRequest(`/admin/package-requests/${id}`, { method: 'PUT', body: { status } });
      flash(status === 'approved' ? 'Pro isteği onaylandı' : 'Pro isteği reddedildi');
      await Promise.all([loadRequests(), loadUsers()]);
    } catch (e) {
      flash(e.message, 'error');
    }
  };

  const exportSnapshot = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      stats,
      domains,
      users,
      requests,
      addresses: addrs.slice(0, 100),
      emails: emails.slice(0, 100),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempmail-admin-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Admin snapshot dışa aktarıldı');
  };

  useEffect(() => {
    if (auth) refreshAll();
  }, [auth, refreshAll]);

  useEffect(() => {
    if (tab === 'emails' && auth) loadEmails(emailsPage || 1);
  }, [tab, auth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showDomainForm) {
      setTimeout(() => addDomainInputRef.current?.focus(), 50);
    }
  }, [showDomainForm]);

  useEffect(() => {
    domains.forEach((domain) => {
      if (domain.wildcard_subdomains !== 1) return;
      if (domainSubdomains[domain.id] || loadingSubdomains[domain.id]) return;
      loadSubdomains(domain.id);
    });
  }, [domainSubdomains, domains, loadSubdomains, loadingSubdomains]);

  useEffect(() => {
    setAddressPage(1);
  }, [addressQuery, addressDomainFilter, addressStatusFilter, addressSort]);

  const activeDomains = useMemo(() => domains.filter((d) => d.is_active === 1).length, [domains]);
  const protectedAddresses = useMemo(() => addrs.filter((a) => a.has_password).length, [addrs]);
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  const inactiveUsers = useMemo(() => users.filter((u) => u.is_active !== 1).length, [users]);
  const expiredAddresses = useMemo(() => addrs.filter((a) => getAddressStatus(a).key === 'expired').length, [addrs]);
  const activeAddressCount = useMemo(() => addrs.filter((a) => getAddressStatus(a).key === 'active').length, [addrs]);
  const docsRecords = useMemo(() => (docsDomain ? buildDomainDocs(docsDomain, docsIp) : []), [buildDomainDocs, docsDomain, docsIp]);
  const addressCountByMailboxDomain = useMemo(() => addrs.reduce((acc, addr) => {
    const rawAddress = String(addr.address || '').toLowerCase();
    const mailboxDomain = rawAddress.includes('@') ? rawAddress.split('@')[1] : String(addr.domain || '').toLowerCase();
    if (mailboxDomain) acc[mailboxDomain] = (acc[mailboxDomain] || 0) + 1;
    return acc;
  }, {}), [addrs]);

  const trafficData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, index) => ({
      hour: `${String(index).padStart(2, '0')}:00`,
      incoming: 0,
      otp: 0,
      attachments: 0,
    }));

    (stats?.latest_emails || []).forEach((mail) => {
      const hour = new Date(mail.received_at).getHours();
      if (Number.isInteger(hour) && buckets[hour]) {
        buckets[hour].incoming += 1;
        if (mail.otp_code) buckets[hour].otp += 1;
        if (mail.has_attachments) buckets[hour].attachments += 1;
      }
    });

    return buckets;
  }, [stats]);

  const mailMix = useMemo(() => {
    const total = stats?.total_emails || 0;
    const otp = stats?.otp_count || 0;
    const attachmentCount = (stats?.latest_emails || []).filter((m) => m.has_attachments).length;
    const normal = Math.max(total - otp, 0);
    return [
      { name: 'Normal', value: normal },
      { name: 'OTP', value: otp },
      { name: 'Ekli', value: attachmentCount },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const activities = useMemo(() => {
    const items = [];

    addrs.slice(0, 3).forEach((addr) => {
      items.push({
        key: `addr-${addr.id}`,
        label: 'Yeni adres oluşturuldu',
        detail: addr.address,
        time: addr.created_at,
        tone: 'green',
      });
    });

    domains.slice(0, 2).forEach((domain) => {
      items.push({
        key: `domain-${domain.id}`,
        label: domain.is_active === 1 ? 'Domain aktif durumda' : 'Domain pasife alındı',
        detail: domain.domain,
        time: domain.created_at,
        tone: domain.is_active === 1 ? 'cyan' : 'gold',
      });
    });

    requests.slice(0, 2).forEach((request) => {
      items.push({
        key: `req-${request.id}`,
        label: request.status === 'pending' ? 'Pro isteği bekliyor' : request.status === 'approved' ? 'Pro isteği onaylandı' : 'Pro isteği reddedildi',
        detail: request.username,
        time: request.reviewed_at || request.created_at,
        tone: request.status === 'approved' ? 'green' : request.status === 'rejected' ? 'red' : 'purple',
      });
    });

    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 6);
  }, [addrs, domains, requests]);

  const systemChecks = useMemo(() => ([
    { label: 'SMTP Akışı', value: activeDomains > 0 ? 'Aktif' : 'Bekliyor', tone: activeDomains > 0 ? 'text-accent-green' : 'text-accent-gold' },
    { label: 'Admin Oturumu', value: auth ? 'Açık' : 'Kapalı', tone: auth ? 'text-accent-green' : 'text-accent-red' },
    { label: 'Aktif Domainler', value: `${activeDomains}/${domains.length || 0}`, tone: 'text-accent-cyan' },
    { label: 'Şifreli Mailbox', value: `${protectedAddresses}`, tone: 'text-accent-purple' },
    { label: 'Temizlik Politikası', value: '7 gün / yalnızca manuel tetikleme', tone: 'text-txt-primary' },
  ]), [activeDomains, auth, domains.length, protectedAddresses]);

  const topDomainRows = useMemo(() => domains.slice(0, 5), [domains]);

  const filteredAddresses = useMemo(() => {
    const query = addressQuery.trim().toLowerCase();
    const filtered = addrs.filter((addr) => {
      const status = getAddressStatus(addr);
      const matchesQuery = !query || [addr.address, addr.domain, addr.username].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesDomain = addressDomainFilter === 'all' || addr.domain === addressDomainFilter;
      const matchesStatus = addressStatusFilter === 'all' || status.key === addressStatusFilter;
      return matchesQuery && matchesDomain && matchesStatus;
    });
    return sortAddresses(filtered, addressSort);
  }, [addrs, addressDomainFilter, addressQuery, addressSort, addressStatusFilter]);

  const addressTotalPages = Math.max(1, Math.ceil(filteredAddresses.length / ADDRESS_PAGE_SIZE));
  const pagedAddresses = useMemo(() => {
    const start = (addressPage - 1) * ADDRESS_PAGE_SIZE;
    return filteredAddresses.slice(start, start + ADDRESS_PAGE_SIZE);
  }, [addressPage, filteredAddresses]);

  const addressDetailStats = selectedAddressDetail?.stats || null;
  const addressInfo = selectedAddressDetail?.address || null;
  const addressEmails = selectedAddressDetail?.emails || [];
  const addressOtpHistory = selectedAddressDetail?.otp_history || [];
  const addressStatus = addressInfo ? getAddressStatus(addressInfo) : null;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'addresses', label: 'Adresler', icon: Inbox },
    { id: 'domains', label: 'Domainler', icon: Globe },
    { id: 'emails', label: 'Mailler', icon: Mail },
    { id: 'users', label: 'Kullanıcılar', icon: Users },
    { id: 'requests', label: 'İstekler', icon: Crown },
    { id: 'settings', label: 'Ayarlar', icon: Settings2 },
  ];

  if (!auth) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="card overflow-hidden">
          <div className="px-7 py-8 border-b border-brand-border/30 bg-[radial-gradient(circle_at_top_left,rgba(122,99,255,0.18),transparent_32%),linear-gradient(180deg,rgba(10,19,41,0.94),rgba(10,19,41,0.82))]">
            <div className="w-16 h-16 rounded-3xl panel-soft flex items-center justify-center mb-5">
              <Shield size={28} className="text-accent-cyan" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-txt-primary">Admin Paneli</h2>
            <p className="text-sm text-txt-muted mt-2">Yönetim paneline erişmek için admin parolasını girin.</p>
          </div>
          <form onSubmit={login} className="p-7 space-y-4">
            <div>
              <label className="section-title mb-2 block">Admin Şifresi</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(''); }}
                placeholder="admin123"
                className="input"
                autoFocus
              />
            </div>
            {err && <p className="text-sm text-accent-red">{err}</p>}
            <button type="submit" disabled={loading || !pw} className="btn-primary w-full">
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
            <p className="text-xs text-txt-muted text-center">Varsayılan parola: <code className="bg-brand-surface2 px-1.5 py-0.5 rounded">admin123</code></p>
          </form>
        </div>
      </div>
    );
  }

  if (selectedAddressDetail && addressInfo) {
    return (
      <div className="space-y-5">
        <div className="card p-6 bg-[radial-gradient(circle_at_top_left,rgba(122,99,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(52,215,255,0.1),transparent_26%)]">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div className="min-w-0">
              <button onClick={() => { setSelectedAddress(null); setSelectedAddressDetail(null); setSelectedAddressMail(null); }} className="btn-ghost px-0 mb-3">
                <ArrowLeft size={14} /> Admin / Adresler
              </button>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-[2rem] font-semibold tracking-tight text-txt-primary font-mono break-all">{addressInfo.address}</h2>
                <StatusPill label={addressStatus.label} className={addressStatus.badge} />
              </div>
              <p className="text-sm text-txt-secondary mt-2">Seçili geçici e-posta adresinin operasyon görünümü ve gelen mail geçmişi.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigator.clipboard.writeText(addressInfo.address)} className="btn-secondary">
                <Copy size={15} /> Kopyala
              </button>
              <button onClick={() => cleanupAddress(addressInfo.address)} className="btn-secondary">
                <ListRestart size={15} /> Geçmişi Temizle
              </button>
              <button onClick={() => deleteAddress(addressInfo.address)} className="btn-danger">
                <Trash2 size={15} /> Adresi Sil
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <AdminStatCard title="Durum" value={addressStatus.label} subtitle={addressInfo.has_password ? 'Şifre korumalı' : 'Açık erişim'} icon={addressInfo.has_password ? FolderLock : Shield} tone={addressInfo.has_password ? 'purple' : 'green'} />
          <AdminStatCard title="Domain" value={addressInfo.domain} subtitle="Bağlı alan adı" icon={Globe} tone="cyan" />
          <AdminStatCard title="Toplam Mail" value={addressDetailStats?.total_emails || 0} subtitle="Gelen içerik" icon={Mail} tone="blue" />
          <AdminStatCard title="OTP Kodları" value={addressDetailStats?.otp_count || 0} subtitle="Algılanan doğrulama" icon={KeyRound} tone="purple" />
          <AdminStatCard title="Son Aktivite" value={formatRelativeTime(addressDetailStats?.last_email_at || addressInfo.last_accessed)} subtitle={formatAdminDate(addressDetailStats?.last_email_at || addressInfo.last_accessed)} icon={Clock3} tone="gold" />
          <AdminStatCard title="Saklama" value={formatRetention(addressInfo)} subtitle={addressInfo.is_persistent ? 'Persistent mailbox' : 'Otomatik temizlik'} icon={CalendarRange} tone="green" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <AdminPanelCard title="Genel Bilgiler" icon={Sparkles} className="xl:col-span-4">
            <div className="panel-soft px-4">
              <AdminInfoRow label="Adres ID" value={addressInfo.id} valueClassName="font-mono" />
              <AdminInfoRow label="Kullanıcı adı" value={addressInfo.username || '-'} valueClassName="font-mono" />
              <AdminInfoRow label="Domain" value={addressInfo.domain} />
              <AdminInfoRow label="Oluşturulma" value={formatAdminDate(addressInfo.created_at)} />
              <AdminInfoRow label="Son erişim" value={formatAdminDate(addressInfo.last_accessed)} />
              <AdminInfoRow label="Saklama süresi" value={formatRetention(addressInfo)} />
            </div>
          </AdminPanelCard>

          <AdminPanelCard title="İstatistikler" icon={Activity} className="xl:col-span-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="panel-soft p-4">
                <p className="text-xs text-txt-muted">Toplam Mail</p>
                <p className="text-3xl font-semibold text-txt-primary mt-2">{addressDetailStats?.total_emails || 0}</p>
              </div>
              <div className="panel-soft p-4">
                <p className="text-xs text-txt-muted">OTP Sayısı</p>
                <p className="text-3xl font-semibold text-txt-primary mt-2">{addressDetailStats?.otp_count || 0}</p>
              </div>
              <div className="panel-soft p-4">
                <p className="text-xs text-txt-muted">Ekli Mail</p>
                <p className="text-3xl font-semibold text-txt-primary mt-2">{addressDetailStats?.attachment_count || 0}</p>
              </div>
              <div className="panel-soft p-4">
                <p className="text-xs text-txt-muted">Güncel Durum</p>
                <p className="text-3xl font-semibold text-txt-primary mt-2">{addressStatus.label}</p>
              </div>
            </div>
          </AdminPanelCard>

          <AdminPanelCard title="Güvenlik ve İşlemler" icon={Lock} className="xl:col-span-4">
            <div className="panel-soft px-4">
              <AdminInfoRow label="Şifre koruması" value={addressInfo.has_password ? 'Aktif' : 'Kapalı'} valueClassName={addressInfo.has_password ? 'text-accent-purple' : ''} />
              <AdminInfoRow label="Persistent mailbox" value={addressInfo.is_persistent ? 'Evet' : 'Hayır'} />
              <AdminInfoRow label="IP / Oturum bilgisi" value="İzlenmiyor" valueClassName="text-txt-muted" />
              <AdminInfoRow label="Toplam OTP kaydı" value={addressOtpHistory.length} />
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={() => navigator.clipboard.writeText(addressInfo.address)} className="btn-secondary w-full">
                <Copy size={14} /> Adresi Kopyala
              </button>
              <button onClick={() => cleanupAddress(addressInfo.address)} className="btn-secondary w-full">
                <ListRestart size={14} /> Mail Geçmişini Temizle
              </button>
              <button onClick={() => deleteAddress(addressInfo.address)} className="btn-danger w-full justify-center py-3 text-sm">
                <Trash2 size={14} /> Adresi Sil
              </button>
            </div>
          </AdminPanelCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <AdminPanelCard title="OTP Geçmişi" icon={KeyRound} className="xl:col-span-4">
            {addressOtpHistory.length > 0 ? (
              <div className="space-y-2">
                {addressOtpHistory.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-txt-primary truncate">{entry.sender}</p>
                      <span className="badge-purple font-mono">{entry.otp_code}</span>
                    </div>
                    <p className="text-xs text-txt-secondary mt-1 truncate">{entry.subject || '(Konu yok)'}</p>
                    <p className="text-xs text-txt-muted mt-2">{formatAdminDate(entry.received_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState title="OTP kaydı yok" subtitle="Bu adrese gelen doğrulama kodları burada listelenir." />
            )}
          </AdminPanelCard>

          <AdminPanelCard title="Gelen Mailler" icon={Mail} className="xl:col-span-8">
            {addressEmails.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-txt-muted">
                      <tr className="border-b border-brand-border/20">
                        <th className="py-3 font-medium">Gönderen</th>
                        <th className="py-3 font-medium">Konu</th>
                        <th className="py-3 font-medium">Tarih</th>
                        <th className="py-3 font-medium">Etiket</th>
                        <th className="py-3 font-medium">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addressEmails.map((mail) => (
                        <tr key={mail.id} className="border-b border-brand-border/10 last:border-0">
                          <td className="py-4 text-txt-primary">{mail.sender}</td>
                          <td className="py-4 text-txt-secondary">{mail.subject || '(Konu yok)'}</td>
                          <td className="py-4 text-txt-muted">{formatAdminDate(mail.received_at)}</td>
                          <td className="py-4">
                            <div className="flex gap-2 flex-wrap">
                              {mail.otp_code ? <span className="badge-purple">OTP</span> : <span className="badge-green">Normal</span>}
                              {mail.has_attachments && <span className="badge-cyan">Ekli</span>}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => openMailDetail(mail.id, 'address')} className="btn-ghost text-accent-blue px-0"><Eye size={14} /></button>
                              <button onClick={() => deleteEmail(mail.id, 'address')} className="btn-ghost text-accent-red px-0"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-3xl border border-brand-border/30 bg-brand-surface2/25 p-5 min-h-[220px]">
                  {selectedAddressMail ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-txt-secondary">{selectedAddressMail.sender}</p>
                        <h4 className="text-lg font-semibold text-txt-primary mt-1">{selectedAddressMail.subject || '(Konu yok)'}</h4>
                        <p className="text-xs text-txt-muted mt-1">{formatAdminDate(selectedAddressMail.received_at)}</p>
                      </div>
                      {selectedAddressMail.otp_code ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="badge-purple text-sm px-3 py-2 font-mono">{selectedAddressMail.otp_code}</span>
                          <button onClick={() => navigator.clipboard.writeText(selectedAddressMail.otp_code)} className="btn-secondary text-xs px-3 py-2">
                            <Copy size={12} /> OTP Kopyala
                          </button>
                        </div>
                      ) : null}
                      <pre className="whitespace-pre-wrap text-sm text-txt-secondary font-mono leading-relaxed">{selectedAddressMail.body_text || '(HTML içerik)'}</pre>
                      {selectedAddressMail.attachments?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedAddressMail.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={`${api}/emails/${selectedAddressMail.id}/attachments/${attachment.id}`}
                              className="btn-secondary text-xs px-3 py-2"
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink size={12} /> {attachment.filename || 'Ek'}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <AdminEmptyState title="Bir mail seçin" subtitle="Detay görmek için tablodan göz ikonuna basın." />
                  )}
                </div>
              </div>
            ) : (
              <AdminEmptyState title="Mailbox boş" subtitle="Bu adrese henüz mail gelmedi." />
            )}
          </AdminPanelCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminHero
        title="Admin Paneli"
        subtitle="MS Temp Mail sistem yönetimi, canlı istatistikler ve operasyon akışları."
        icon={Settings2}
        activeTab={tab}
        onTabChange={setTab}
        tabs={tabs}
        actions={[
          <button key="domain" onClick={() => { setTab('domains'); setShowDomainForm(true); }} className="btn-primary">
            <Plus size={15} /> Yeni Domain Ekle
          </button>,
          <button key="cleanup" onClick={cleanupAll} className="btn-danger">
            <Trash2 size={15} /> Temizle
          </button>,
          <button key="export" onClick={exportSnapshot} className="btn-secondary">
            <Download size={15} /> Dışa Aktar
          </button>,
        ]}
      />

      {(ok || err) && (
        <div className={`card px-4 py-3 text-sm ${ok ? 'text-accent-green' : 'text-accent-red'}`}>
          {ok || err}
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <AdminStatCard title="Toplam Mail" value={stats?.total_emails || 0} subtitle="Tüm zamanlar" icon={Mail} tone="blue" />
            <AdminStatCard title="Toplam Adres" value={stats?.total_addresses || 0} subtitle={`Şifreli: ${protectedAddresses}`} icon={Users} tone="green" />
            <AdminStatCard title="Son 24 Saat" value={stats?.recent_24h || 0} subtitle="Yeni gelen mesaj" icon={Clock3} tone="gold" />
            <AdminStatCard title="OTP Kodları" value={stats?.otp_count || 0} subtitle="Algılanan doğrulama" icon={KeyRound} tone="purple" />
            <AdminStatCard title="Aktif Domain" value={activeDomains} subtitle={`${domains.length || 0} toplam domain`} icon={Globe} tone="cyan" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <AdminPanelCard title="Mail Trafiği" icon={Activity} className="xl:col-span-6">
              {trafficData.some((item) => item.incoming > 0 || item.otp > 0 || item.attachments > 0) ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient id="incomingFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82FF" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#3B82FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="otpFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7A63FF" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#7A63FF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill: '#6B7FA5', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6B7FA5', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#0A1329', border: '1px solid rgba(27,45,82,0.5)', borderRadius: '16px', color: '#F6FAFF' }} />
                      <Area type="monotone" dataKey="incoming" stroke="#3B82FF" fill="url(#incomingFill)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="otp" stroke="#7A63FF" fill="url(#otpFill)" strokeWidth={2} />
                      <Area type="monotone" dataKey="attachments" stroke="#F5C84C" fill="transparent" strokeWidth={1.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <AdminEmptyState title="Grafik için veri yok" subtitle="Mail geldikçe trafik burada belirecek." />
              )}
            </AdminPanelCard>

            <AdminPanelCard title="Sistem Durumu" icon={Shield} className="xl:col-span-3" action={<span className="badge-green">Operasyon özeti</span>}>
              <div className="space-y-3">
                {systemChecks.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 text-txt-secondary">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-green" />
                      {item.label}
                    </div>
                    <span className={`font-medium ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </AdminPanelCard>

            <AdminPanelCard title="Son Aktiviteler" icon={RefreshCw} className="xl:col-span-3">
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((item) => (
                    <div key={item.key} className="flex items-start gap-3">
                      <span className={`mt-1 w-3 h-3 rounded-full ${item.tone === 'green' ? 'bg-accent-green' : item.tone === 'purple' ? 'bg-accent-purple' : item.tone === 'red' ? 'bg-accent-red' : item.tone === 'gold' ? 'bg-accent-gold' : 'bg-accent-cyan'}`} />
                      <div>
                        <p className="text-sm text-txt-primary">{item.label}</p>
                        <p className="text-xs text-txt-muted mt-1">{item.detail}</p>
                        <p className="text-xs text-txt-disabled mt-1">{formatRelativeTime(item.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <AdminEmptyState title="Henüz aktivite yok" subtitle="Yeni işlemler burada görünecek." />
              )}
            </AdminPanelCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <AdminPanelCard title="Domain Yönetimi" icon={Globe} className="xl:col-span-7" action={<button onClick={() => setTab('domains')} className="btn-ghost text-accent-blue">Tümünü Gör</button>}>
              {topDomainRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-txt-muted">
                      <tr className="border-b border-brand-border/20">
                        <th className="py-3 font-medium">Domain</th>
                        <th className="py-3 font-medium">Durum</th>
                        <th className="py-3 font-medium">Adres</th>
                        <th className="py-3 font-medium">Oluşturulma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDomainRows.map((domain) => (
                        <tr key={domain.id} className="border-b border-brand-border/10 last:border-0">
                          <td className="py-4 text-txt-primary font-medium">{domain.domain}</td>
                          <td className="py-4">{domain.is_active === 1 ? <span className="badge-green">Aktif</span> : <span className="badge-red">Pasif</span>}</td>
                          <td className="py-4 text-txt-secondary">{domain.address_count}</td>
                          <td className="py-4 text-txt-muted">{formatAdminDate(domain.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <AdminEmptyState title="Henüz domain eklenmedi" subtitle="Üstteki hızlı aksiyonla yeni domain ekleyin." />
              )}
            </AdminPanelCard>

            <AdminPanelCard title="Güvenlik ve Temizlik" icon={Lock} className="xl:col-span-5">
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-txt-secondary">Bekleyen Pro İsteği</span>
                  <span className={pendingRequests > 0 ? 'text-accent-gold font-medium' : 'text-accent-green font-medium'}>{pendingRequests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-secondary">Pasif Kullanıcı</span>
                  <span className={inactiveUsers > 0 ? 'text-accent-red font-medium' : 'text-accent-green font-medium'}>{inactiveUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-secondary">Şifreli Adres</span>
                  <span className="text-accent-cyan font-medium">{protectedAddresses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-txt-secondary">Süresi Dolan Adres</span>
                  <span className={expiredAddresses > 0 ? 'text-accent-red font-medium' : 'text-accent-green font-medium'}>{expiredAddresses}</span>
                </div>
                <button onClick={() => setTab('requests')} className="btn-secondary w-full mt-3">
                  <Settings2 size={14} /> İstekleri Yönet
                </button>
              </div>
            </AdminPanelCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <AdminPanelCard title="Son Mailler" icon={Mail} className="xl:col-span-8" action={<button onClick={() => { setTab('emails'); loadEmails(1); }} className="btn-ghost text-accent-blue">Tüm mailleri görüntüle</button>}>
              {(stats?.latest_emails || []).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-txt-muted">
                      <tr className="border-b border-brand-border/20">
                        <th className="py-3 font-medium">Gönderen</th>
                        <th className="py-3 font-medium">Alıcı</th>
                        <th className="py-3 font-medium">Konu</th>
                        <th className="py-3 font-medium">Tarih</th>
                        <th className="py-3 font-medium">Durum</th>
                        <th className="py-3 font-medium">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.latest_emails.slice(0, 5).map((mail) => (
                        <tr key={mail.id} className="border-b border-brand-border/10 last:border-0">
                          <td className="py-4 text-txt-primary">{mail.sender}</td>
                          <td className="py-4 text-txt-secondary font-mono">{mail.recipient_address}</td>
                          <td className="py-4 text-txt-secondary">{mail.subject || '(Konu yok)'}</td>
                          <td className="py-4 text-txt-muted">{formatAdminDate(mail.received_at)}</td>
                          <td className="py-4">{mail.otp_code ? <span className="badge-purple">OTP</span> : <span className="badge-green">Gelen</span>}</td>
                          <td className="py-4">
                            <button onClick={() => openAddressDetail(mail.recipient_address)} className="btn-ghost text-accent-blue px-0">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <AdminEmptyState title="Henüz mail yok" subtitle="Yeni mesajlar geldiğinde burada listelenecek." />
              )}
            </AdminPanelCard>

            <AdminPanelCard title="Mail Dağılımı" icon={PieChartIcon} className="xl:col-span-4">
              {mailMix.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={mailMix} dataKey="value" innerRadius={55} outerRadius={88} paddingAngle={3}>
                        {mailMix.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0A1329', border: '1px solid rgba(27,45,82,0.5)', borderRadius: '16px', color: '#F6FAFF' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {mailMix.map((entry, index) => (
                      <span key={entry.name} className="text-xs text-txt-secondary inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        {entry.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <AdminEmptyState title="Dağılım verisi yok" subtitle="Mail geldikçe pasta grafik dolacak." />
              )}
            </AdminPanelCard>
          </div>
        </div>
      )}

      {tab === 'addresses' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <AdminStatCard title="Toplam Adres" value={addrs.length} subtitle="Tüm mailbox kayıtları" icon={Users} tone="green" />
            <AdminStatCard title="Aktif Adres" value={activeAddressCount} subtitle="Son erişim veya mail var" icon={CheckCircle2} tone="green" />
            <AdminStatCard title="Süresi Dolan" value={expiredAddresses} subtitle="Temizlik bekleyen" icon={Clock3} tone="gold" />
            <AdminStatCard title="Şifre Korumalı" value={protectedAddresses} subtitle="Ek güvenlik açık" icon={FolderLock} tone="purple" />
          </div>

          <AdminPanelCard title="Tüm Adresler" icon={Inbox}>
            <AdminToolbar className="mb-4">
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))] gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input value={addressQuery} onChange={(e) => setAddressQuery(e.target.value)} placeholder="E-posta adresi ara..." className="input pl-11" />
                </div>
                <div className="relative">
                  <select value={addressStatusFilter} onChange={(e) => setAddressStatusFilter(e.target.value)} className="input appearance-none pr-10">
                    <option value="all">Durum</option>
                    <option value="active">Aktif</option>
                    <option value="protected">Şifreli</option>
                    <option value="idle">Pasif</option>
                    <option value="expired">Süresi doldu</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={addressDomainFilter} onChange={(e) => setAddressDomainFilter(e.target.value)} className="input appearance-none pr-10">
                    <option value="all">Domain</option>
                    {[...new Set(addrs.map((item) => item.domain))].map((domain) => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={addressSort} onChange={(e) => setAddressSort(e.target.value)} className="input appearance-none pr-10">
                    <option value="newest">Sırala: En yeni</option>
                    <option value="oldest">Sırala: En eski</option>
                    <option value="last-mail">Son aktivite</option>
                    <option value="usage">Kullanım sayısı</option>
                    <option value="domain">Domain</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none" />
                </div>
              </div>
              <button
                onClick={() => {
                  setAddressQuery('');
                  setAddressDomainFilter('all');
                  setAddressStatusFilter('all');
                  setAddressSort('newest');
                }}
                className="btn-secondary"
              >
                <Filter size={15} /> Filtreyi Temizle
              </button>
            </AdminToolbar>

            {pagedAddresses.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1120px]">
                    <thead className="text-left text-txt-muted">
                      <tr className="border-b border-brand-border/20">
                        <th className="py-3 font-medium">E-posta Adresi</th>
                        <th className="py-3 font-medium">Durum</th>
                        <th className="py-3 font-medium">Oluşturulma</th>
                        <th className="py-3 font-medium">Son Aktivite</th>
                        <th className="py-3 font-medium">Mail Sayısı</th>
                        <th className="py-3 font-medium">Domain</th>
                        <th className="py-3 font-medium">Saklama</th>
                        <th className="py-3 font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedAddresses.map((addr) => {
                        const status = getAddressStatus(addr);
                        return (
                          <tr key={addr.id} className="border-b border-brand-border/10 last:border-0">
                            <td className="py-4">
                              <p className="text-txt-primary font-medium font-mono">{addr.address}</p>
                            </td>
                            <td className="py-4"><StatusPill label={status.label} className={status.badge} /></td>
                            <td className="py-4 text-txt-secondary">{formatAdminDate(addr.created_at)}</td>
                            <td className="py-4 text-txt-secondary">{formatAdminDate(getAddressActivityTimestamp(addr))}</td>
                            <td className="py-4 text-txt-primary">{addr.email_count || 0}</td>
                            <td className="py-4 text-txt-secondary">{addr.domain}</td>
                            <td className="py-4 text-txt-secondary">{formatRetention(addr)}</td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <button onClick={() => openAddressDetail(addr.address)} className="btn-ghost text-accent-blue px-0"><Eye size={14} /></button>
                                <button onClick={() => navigator.clipboard.writeText(addr.address)} className="btn-ghost px-0"><Copy size={14} /></button>
                                <button onClick={() => cleanupAddress(addr.address)} className="btn-ghost text-accent-gold px-0"><ListRestart size={14} /></button>
                                <button onClick={() => deleteAddress(addr.address)} className="btn-ghost text-accent-red px-0"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-txt-muted">
                    {filteredAddresses.length} adresten {(addressPage - 1) * ADDRESS_PAGE_SIZE + 1}-{Math.min(addressPage * ADDRESS_PAGE_SIZE, filteredAddresses.length)} arası gösteriliyor
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAddressPage((prev) => Math.max(1, prev - 1))} disabled={addressPage <= 1} className="btn-secondary text-xs px-4 py-2">Önceki</button>
                    <span className="text-sm text-txt-secondary">Sayfa {addressPage} / {addressTotalPages}</span>
                    <button onClick={() => setAddressPage((prev) => Math.min(addressTotalPages, prev + 1))} disabled={addressPage >= addressTotalPages} className="btn-secondary text-xs px-4 py-2">Sonraki</button>
                  </div>
                </div>
              </>
            ) : (
              <AdminEmptyState title="Adres bulunamadı" subtitle="Arama ve filtreleri temizleyip tekrar deneyin." />
            )}
          </AdminPanelCard>
        </div>
      )}

      {tab === 'domains' && (
        <div className="space-y-5">
          <AdminPanelCard title="Domain Yönetimi" icon={Globe}>
            <AdminToolbar className="mb-5">
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowDomainForm((v) => !v)} className="btn-primary">
                  <Plus size={15} /> {showDomainForm ? 'Formu Kapat' : 'Yeni Domain Ekle'}
                </button>
                <button onClick={loadDomains} className="btn-secondary">
                  <RefreshCw size={15} /> Yenile
                </button>
              </div>
              <div className="text-sm text-txt-muted">{activeDomains} aktif / {domains.length} toplam</div>
            </AdminToolbar>

            {showDomainForm ? (
              <form onSubmit={addDomain} className="panel-soft p-4 mb-5 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <input ref={addDomainInputRef} value={newDom} onChange={(e) => setNewDom(e.target.value)} placeholder="ornek.com" className="input flex-1" />
                  <button type="submit" disabled={loading || !newDom.trim()} className="btn-primary">Kaydet</button>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${newDomWildcard ? 'bg-accent-cyan' : 'bg-brand-surface2/70'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${newDomWildcard ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <input
                    type="checkbox"
                    checked={newDomWildcard}
                    onChange={(e) => setNewDomWildcard(e.target.checked)}
                    className="sr-only"
                  />
                  <div>
                    <p className="text-sm font-medium text-txt-primary">Wildcard Subdomain Desteği</p>
                    <p className="text-[11px] text-txt-muted">Aktif edilirse *.domain.com şeklinde alt domainler oluşturulabilir</p>
                  </div>
                </label>
              </form>
            ) : null}

            {domains.length > 0 ? (
              <div className="space-y-4">
                {domains.map((domain) => {
                  const rootDomainKey = String(domain.domain || '').toLowerCase();
                  const subdomains = domainSubdomains[domain.id] || [];
                  const activeSubdomainCount = subdomains.filter((item) => item.is_active === 1).length;
                  const rootAddressCount = addressCountByMailboxDomain[rootDomainKey] || domain.address_count || 0;

                  return (
                    <div key={domain.id} className="card p-6 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_30%),linear-gradient(180deg,rgba(10,19,41,0.96),rgba(10,19,41,0.78))]">
                      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-[1.7rem] font-semibold tracking-tight text-txt-primary break-all">{domain.domain}</p>
                            {domain.is_active === 1 ? <span className="badge-green">Aktif</span> : <span className="badge-red">Pasif</span>}
                            {domain.wildcard_subdomains === 1 ? <span className="badge-cyan">Wildcard Aktif</span> : <span className="badge-gold">Wildcard Kapalı</span>}
                          </div>
                          <p className="text-sm text-txt-muted mt-2">Sistemdeki root domainleri yönetin ve alt domainleri tek panelden düzenleyin.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button onClick={() => openDomainEditor(domain)} className="btn-secondary text-xs px-3 py-2">
                            <Pencil size={13} /> Düzenle
                          </button>
                          <button onClick={() => { setDocsDomain(domain); setDocsIp(domain.server_ip || ''); }} className="btn-secondary text-xs px-3 py-2">
                            <FileText size={13} /> Domain Docs
                          </button>
                          <button onClick={() => toggleDom(domain.id, domain.is_active === 1, domain.wildcard_subdomains)} className="btn-secondary text-xs px-3 py-2">
                            {domain.is_active === 1 ? 'Pasifleştir' : 'Aktifleştir'}
                          </button>
                          <button onClick={() => setExpandedDomains((prev) => ({ ...prev, [domain.id]: !prev[domain.id] }))} className="btn-secondary text-xs px-3 py-2">
                            <ChevronDown size={13} className={`transition-transform ${expandedDomains[domain.id] ? 'rotate-180' : ''}`} />
                            {expandedDomains[domain.id] ? 'Daralt' : 'Genişlet'}
                          </button>
                          <button onClick={() => delDom(domain.id, domain.domain)} className="btn-danger text-xs px-3 py-2">Sil</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-6">
                        <div className="rounded-[26px] border border-brand-border/20 bg-brand-surface2/35 px-4 py-4">
                          <div className="flex items-center gap-2 text-txt-secondary">
                            <Server size={15} className="text-accent-blue" />
                            <span className="text-sm">Sunucu IP</span>
                          </div>
                          <p className="text-lg font-semibold text-txt-primary mt-3">{domain.server_ip || '-'}</p>
                        </div>
                        <div className="rounded-[26px] border border-brand-border/20 bg-brand-surface2/35 px-4 py-4">
                          <div className="flex items-center gap-2 text-txt-secondary">
                            <Mail size={15} className="text-accent-blue" />
                            <span className="text-sm">MX Kaydı</span>
                          </div>
                          <p className="text-lg font-semibold text-txt-primary mt-3 break-all">{domain.mx_value || '-'}</p>
                        </div>
                        <div className="rounded-[26px] border border-brand-border/20 bg-brand-surface2/35 px-4 py-4">
                          <div className="flex items-center gap-2 text-txt-secondary">
                            <CalendarRange size={15} className="text-accent-blue" />
                            <span className="text-sm">Oluşturulma Tarihi</span>
                          </div>
                          <p className="text-lg font-semibold text-txt-primary mt-3">{formatAdminDate(domain.created_at)}</p>
                        </div>
                        <div className="rounded-[26px] border border-brand-border/20 bg-brand-surface2/35 px-4 py-4">
                          <div className="flex items-center gap-2 text-txt-secondary">
                            <Activity size={15} className="text-accent-blue" />
                            <span className="text-sm">Wildcard Desteği</span>
                          </div>
                          <p className="text-lg font-semibold text-txt-primary mt-3">{domain.wildcard_subdomains === 1 ? 'Aktif edildi' : 'Pasif'}</p>
                        </div>
                        <div className="rounded-[26px] border border-brand-border/20 bg-brand-surface2/35 px-4 py-4">
                          <div className="flex items-center gap-2 text-txt-secondary">
                            <Users size={15} className="text-accent-blue" />
                            <span className="text-sm">Toplam Aktif Adres</span>
                          </div>
                          <p className="text-lg font-semibold text-accent-green mt-3">{rootAddressCount} adres</p>
                        </div>
                      </div>

                      {expandedDomains[domain.id] ? (
                        <div className="mt-6 rounded-[28px] border border-brand-border/20 bg-brand-surface2/28 px-5 py-5">
                          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="text-[1.05rem] font-semibold text-txt-primary">Alt Domainler</h4>
                                <span className="badge-cyan">{activeSubdomainCount} aktif</span>
                              </div>
                              <p className="text-sm text-txt-muted mt-2">Bu root domain altında alt domainler oluşturabilir ve yönetebilirsiniz.</p>
                            </div>

                            {domain.wildcard_subdomains === 1 ? (
                              <div className="flex flex-col sm:flex-row gap-3 xl:min-w-[520px]">
                                <div className="flex-1 flex rounded-[22px] border border-brand-border/20 overflow-hidden bg-brand-surface2/55">
                                  <input
                                    value={subdomainDrafts[domain.id] || ''}
                                    onChange={(e) => setSubdomainDrafts((prev) => ({ ...prev, [domain.id]: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addSubdomain(domain.id, domain.domain);
                                      }
                                    }}
                                    placeholder="Yeni subdomain ekle (örn: mail, gmail, temp)"
                                    className="flex-1 bg-transparent px-4 py-3 text-sm text-txt-primary placeholder-txt-muted outline-none"
                                  />
                                  <div className="hidden sm:flex items-center px-4 text-sm text-txt-secondary border-l border-brand-border/20">
                                    .{domain.domain}
                                  </div>
                                </div>
                                <button
                                  onClick={() => addSubdomain(domain.id, domain.domain)}
                                  disabled={loading || addingSubdomainTo === domain.id || !String(subdomainDrafts[domain.id] || '').trim()}
                                  className="btn-primary px-6"
                                >
                                  {addingSubdomainTo === domain.id ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
                                  Ekle
                                </button>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/10 px-4 py-3 text-sm text-accent-gold">
                                Subdomain oluşturmak için önce wildcard desteğini açın.
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 mt-5">
                            {subdomains.length > 0 ? (
                              subdomains.map((subdomain) => {
                                const fullDomain = `${subdomain.subdomain}.${domain.domain}`.toLowerCase();
                                const subdomainAddressCount = addressCountByMailboxDomain[fullDomain] || 0;
                                return (
                                  <div key={subdomain.id} className="rounded-[24px] border border-brand-border/20 bg-[#101d39]/72 px-5 py-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                      <div className="min-w-0 flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-[18px] panel-soft flex items-center justify-center shrink-0">
                                          <Globe size={22} className="text-accent-blue" />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <p className="text-[1.05rem] font-semibold text-txt-primary break-all">{subdomain.subdomain}.{domain.domain}</p>
                                            {subdomain.is_active === 1 ? <span className="badge-green">Aktif</span> : <span className="badge-red">Pasif</span>}
                                          </div>
                                          <p className="text-sm text-txt-secondary mt-2 break-all">Ornek: demo@{subdomain.subdomain}.{domain.domain}</p>
                                        </div>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="badge-green text-sm px-3 py-1.5">{subdomainAddressCount} aktif adres</span>
                                        <button onClick={() => copyText(`${subdomain.subdomain}.${domain.domain}`, 'Subdomain kopyalandı')} className="btn-secondary text-xs px-3 py-2">
                                          <Copy size={13} /> Kopyala
                                        </button>
                                        <button onClick={() => deleteSubdomain(domain.id, subdomain.id, `${subdomain.subdomain}.${domain.domain}`)} className="btn-danger text-xs px-3 py-2">
                                          <Trash2 size={13} /> Sil
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="rounded-[24px] border border-dashed border-brand-border/25 bg-brand-surface2/22 px-5 py-7 text-center">
                                {loadingSubdomains[domain.id] ? (
                                  <div className="inline-flex items-center gap-2 text-sm text-txt-secondary">
                                    <LoaderCircle size={15} className="animate-spin" />
                                    Subdomainler yukleniyor...
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm font-medium text-txt-secondary">Henüz subdomain eklenmedi</p>
                                    <p className="text-xs text-txt-muted mt-1">Yukarıdaki alanı kullanarak bu root domain için ilk subdomaini oluşturabilirsiniz.</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <AdminEmptyState title="Domain yok" subtitle="Yeni bir domain ekleyerek başlayın." />
            )}
          </AdminPanelCard>
        </div>
      )}

      {tab === 'emails' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <AdminPanelCard title={`Tüm Mailler (${emailsTotal})`} icon={Mail} className="xl:col-span-8" action={<button onClick={() => loadEmails(1)} className="btn-ghost"><RefreshCw size={14} /></button>}>
            {emails.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[920px]">
                    <thead className="text-left text-txt-muted">
                      <tr className="border-b border-brand-border/20">
                        <th className="py-3 font-medium">Gönderen</th>
                        <th className="py-3 font-medium">Alıcı</th>
                        <th className="py-3 font-medium">Konu</th>
                        <th className="py-3 font-medium">Tarih</th>
                        <th className="py-3 font-medium">Etiket</th>
                        <th className="py-3 font-medium">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((mail) => (
                        <tr key={mail.id} className="border-b border-brand-border/10 last:border-0">
                          <td className="py-4 text-txt-primary">{mail.sender}</td>
                          <td className="py-4 text-txt-secondary font-mono">{mail.recipient_address}</td>
                          <td className="py-4 text-txt-secondary">{mail.subject || '(Konu yok)'}</td>
                          <td className="py-4 text-txt-muted">{formatAdminDate(mail.received_at)}</td>
                          <td className="py-4">
                            <div className="flex gap-2 flex-wrap">
                              {mail.otp_code && <span className="badge-purple">OTP</span>}
                              {mail.has_attachments && <span className="badge-cyan">Ekli</span>}
                              {!mail.otp_code && !mail.has_attachments && <span className="badge-green">Normal</span>}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => openMailDetail(mail.id, 'global')} className="btn-ghost text-accent-blue px-0"><Eye size={14} /></button>
                              <button onClick={() => openAddressDetail(mail.recipient_address)} className="btn-ghost px-0"><ExternalLink size={14} /></button>
                              <button onClick={() => deleteEmail(mail.id, 'global')} className="btn-ghost text-accent-red px-0"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {emailsTotal > 50 ? (
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <button onClick={() => loadEmails(emailsPage - 1)} disabled={emailsPage <= 1} className="btn-secondary text-xs px-3 py-2">Önceki</button>
                    <span className="text-sm text-txt-secondary">Sayfa {emailsPage}</span>
                    <button onClick={() => loadEmails(emailsPage + 1)} disabled={emails.length < 50} className="btn-secondary text-xs px-3 py-2">Sonraki</button>
                  </div>
                ) : null}
              </>
            ) : (
              <AdminEmptyState title="Henüz mail yok" subtitle="Sistem mail almaya başladığında burada listelenecek." />
            )}
          </AdminPanelCard>

          <AdminPanelCard title="Mail Detayı" icon={Eye} className="xl:col-span-4">
            {selectedGlobalMail ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-txt-secondary">{selectedGlobalMail.sender}</p>
                  <h4 className="text-lg font-semibold text-txt-primary mt-1">{selectedGlobalMail.subject || '(Konu yok)'}</h4>
                  <p className="text-xs text-txt-muted mt-1">{formatAdminDate(selectedGlobalMail.received_at)}</p>
                </div>
                {selectedGlobalMail.otp_code ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="badge-purple text-sm px-3 py-2 font-mono">{selectedGlobalMail.otp_code}</span>
                    <button onClick={() => navigator.clipboard.writeText(selectedGlobalMail.otp_code)} className="btn-secondary text-xs px-3 py-2">
                      <Copy size={12} /> OTP Kopyala
                    </button>
                  </div>
                ) : null}
                <div className="rounded-3xl border border-brand-border/30 bg-brand-surface2/25 p-4 min-h-[260px]">
                  <pre className="whitespace-pre-wrap text-sm text-txt-secondary font-mono leading-relaxed">{selectedGlobalMail.body_text || '(HTML içerik)'}</pre>
                </div>
              </div>
            ) : (
              <AdminEmptyState title="Bir mail seçin" subtitle="Detayı görmek için listedeki göz ikonuna basın." />
            )}
          </AdminPanelCard>
        </div>
      )}

      {tab === 'users' && (
        <AdminPanelCard title={`Kullanıcılar (${users.length})`} icon={Users} action={<button onClick={loadUsers} className="btn-ghost"><RefreshCw size={14} /></button>}>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <thead className="text-left text-txt-muted">
                  <tr className="border-b border-brand-border/20">
                    <th className="py-3 font-medium">Kullanıcı</th>
                    <th className="py-3 font-medium">Rol</th>
                    <th className="py-3 font-medium">Adres</th>
                    <th className="py-3 font-medium">Mail</th>
                    <th className="py-3 font-medium">Son giriş</th>
                    <th className="py-3 font-medium">Durum</th>
                    <th className="py-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-brand-border/10 last:border-0">
                      <td className="py-4">
                        <p className="text-txt-primary font-medium">{user.username}</p>
                        <p className="text-xs text-txt-muted mt-1">{user.email}</p>
                      </td>
                      <td className="py-4">
                        {user.role === 'admin' ? <span className="badge-blue">Admin</span> : user.role === 'pro' ? <span className="badge-purple">Pro</span> : <span className="badge-cyan">Free</span>}
                      </td>
                      <td className="py-4 text-txt-secondary">{user.address_count}</td>
                      <td className="py-4 text-txt-secondary">{user.email_count}</td>
                      <td className="py-4 text-txt-secondary">{formatAdminDate(user.last_login)}</td>
                      <td className="py-4">{user.is_active === 1 ? <span className="badge-green">Aktif</span> : <span className="badge-red">Pasif</span>}</td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.role !== 'admin' ? (
                            <button onClick={() => updateUserRole(user.id, user.role === 'free' ? 'pro' : 'free')} className="btn-secondary text-xs px-3 py-2">
                              <UserCog size={12} /> {user.role === 'free' ? 'Pro Yap' : 'Free Yap'}
                            </button>
                          ) : null}
                          <button onClick={() => updateUserStatus(user.id, user.is_active !== 1)} className="btn-secondary text-xs px-3 py-2">
                            {user.is_active === 1 ? 'Pasifleştir' : 'Aktifleştir'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <AdminEmptyState title="Kullanıcı bulunamadı" subtitle="Kayıt olan kullanıcılar burada listelenir." />
          )}
        </AdminPanelCard>
      )}

      {tab === 'requests' && (
        <AdminPanelCard title={`Pro İstekleri (${requests.length})`} icon={Crown} action={<button onClick={loadRequests} className="btn-ghost"><RefreshCw size={14} /></button>}>
          {requests.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {requests.map((request) => (
                <div key={request.id} className="panel-soft p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-txt-primary">{request.username}</p>
                        {request.status === 'pending' ? <span className="badge-purple">Bekliyor</span> : request.status === 'approved' ? <span className="badge-green">Onaylandı</span> : <span className="badge-red">Reddedildi</span>}
                      </div>
                      <p className="text-xs text-txt-muted mt-1">{request.email}</p>
                    </div>
                    {request.role === 'pro' ? <span className="badge-cyan">Zaten Pro</span> : null}
                  </div>
                  <p className="text-sm text-txt-secondary mt-4">{request.message || 'Mesaj bırakılmadı.'}</p>
                  <p className="text-xs text-txt-disabled mt-4">{formatAdminDate(request.reviewed_at || request.created_at)}</p>
                  {request.status === 'pending' ? (
                    <div className="flex gap-2 mt-5">
                      <button onClick={() => handleRequestDecision(request.id, 'approved')} className="btn-primary text-xs px-4 py-2"><CheckCircle2 size={12} /> Onayla</button>
                      <button onClick={() => handleRequestDecision(request.id, 'rejected')} className="btn-danger text-xs px-4 py-2"><AlertTriangle size={12} /> Reddet</button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Bekleyen istek yok" subtitle="Yeni Pro talepleri burada görünür." />
          )}
        </AdminPanelCard>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <AdminPanelCard title="Genel Ayarlar" icon={Settings2}>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Aktif Domain Sayısı</span>
                <span className="text-txt-primary">{activeDomains}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Varsayılan Veri Saklama</span>
                <span className="text-txt-primary">7 gün / yalnızca manuel tetikleme</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Temizlik Politikası</span>
                <span className="text-txt-primary">Manuel + servis bazlı</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Admin kimlik doğrulama</span>
                <span className="text-txt-primary">JWT + parola fallback</span>
              </div>
              <button onClick={refreshAll} className="btn-secondary mt-2">
                <RefreshCw size={14} /> Tüm Veriyi Yenile
              </button>
            </div>
          </AdminPanelCard>

          <AdminPanelCard title="Bildirim Sesi" icon={Mail}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/25 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-txt-muted">Seçili Sinyal</p>
                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 min-w-0">
                    <select
                      value={notificationSound}
                      onChange={(e) => onNotificationSoundChange?.(e.target.value)}
                      className="input appearance-none pr-11"
                    >
                      {notificationSounds.map((sound) => (
                        <option key={sound.id} value={sound.id}>
                          {sound.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-txt-muted" />
                  </div>
                  <button
                    onClick={() => onPreviewNotificationSound?.(notificationSound)}
                    className="btn-primary shrink-0"
                  >
                    <Mail size={12} /> Önizle
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-txt-primary">
                      {notificationSounds.find((sound) => sound.id === notificationSound)?.name || 'Glass Chime'}
                    </p>
                    <p className="text-xs text-txt-muted mt-1">
                      {notificationSounds.find((sound) => sound.id === notificationSound)?.description || 'Katmanlı ve parlak bir chime efekti.'}
                    </p>
                  </div>
                  {notificationSound === 'chime' ? <span className="badge-blue">Glass Chime</span> : null}
                </div>
              </div>
            </div>
          </AdminPanelCard>

          <AdminPanelCard title="Operasyon Özeti" icon={Shield}>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Toplam Kullanıcı</span>
                <span className="text-txt-primary">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Bekleyen İstek</span>
                <span className="text-txt-primary">{pendingRequests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Şifreli Mailbox</span>
                <span className="text-txt-primary">{protectedAddresses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-txt-secondary">Mail Hacmi</span>
                <span className="text-txt-primary">{stats?.total_emails || 0}</span>
              </div>
              <button onClick={logout} className="btn-danger mt-2">
                <Trash2 size={14} /> Admin Oturumunu Kapat
              </button>
            </div>
          </AdminPanelCard>
        </div>
      )}

      <Modal
        show={Boolean(docsDomain)}
        onClose={() => {
          setDocsDomain(null);
          setDocsIp('');
        }}
        size="3xl"
      >
        {docsDomain ? (
          <div className="space-y-5">
            <div className="relative pr-14">
              <button
                onClick={() => {
                  setDocsDomain(null);
                  setDocsIp('');
                }}
                aria-label="Kapat"
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-border/60 bg-brand-surface2/80 text-txt-muted transition hover:border-brand-border2 hover:text-txt-primary hover:bg-brand-surface2"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl panel-soft flex items-center justify-center shadow-glow-cyan shrink-0">
                  <Globe size={20} className="text-accent-blue" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-2xl sm:text-[2rem] font-semibold tracking-tight text-txt-primary">DNS Kayıt Kurulumu</h4>
                  <p className="text-sm text-txt-muted mt-1">Aşağıdaki DNS kayıtlarını alan adınız için ekleyin.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-accent-blue/18 bg-[radial-gradient(circle_at_top_left,rgba(59,130,255,0.16),transparent_32%),linear-gradient(135deg,rgba(11,21,45,0.96),rgba(9,18,38,0.9))] p-5 sm:p-6 shadow-[0_24px_70px_rgba(8,16,35,0.55)]">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-accent-blue/80">Alan Adı</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-2xl sm:text-[2rem] font-semibold text-txt-primary break-all">{docsDomain.domain}</h4>
                    <button
                      onClick={() => copyText(docsDomain.domain, 'Alan adı kopyalandı')}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-border/55 bg-brand-surface2/70 text-txt-secondary transition hover:text-txt-primary hover:border-accent-blue/40 hover:bg-brand-surface2/90"
                      aria-label="Alan adını kopyala"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="max-w-2xl text-sm text-txt-muted">Seçilen alan adınız için gerekli DNS kayıtlarını aşağıda görebilirsiniz.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-txt-muted">Kayıt Durumu</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-blue">A</span>
                    <span className="badge-cyan">MX</span>
                    <span className="badge-purple">SPF</span>
                    <span className="badge-gold">DKIM</span>
                    <span className="badge-red">DMARC</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-border/20 bg-brand-surface2/25 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-txt-primary">Sunucu IP</p>
                  <p className="text-xs text-txt-muted mt-1">Tüm e-posta trafiği bu IP adresi üzerinden yönlendirilecektir.</p>
                </div>
                <button
                  onClick={() => copyText(docsIp || docsDomain.server_ip || '', 'Sunucu IP kopyalandı')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-brand-border/55 bg-brand-surface2/70 px-3 py-2 text-xs font-semibold text-txt-secondary transition hover:text-txt-primary hover:border-accent-blue/40"
                >
                  <Copy size={14} /> Kopyala
                </button>
              </div>
              <div className="mt-4">
                <input
                  value={docsIp}
                  onChange={(e) => setDocsIp(sanitizeIpInput(e.target.value))}
                  placeholder="159.146.103.84"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  className="input bg-brand-surface/70 border-accent-blue/20 text-txt-primary placeholder:text-txt-muted font-mono text-base"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent-blue" />
                <h5 className="text-sm font-semibold text-txt-primary">DNS Kayıtları</h5>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {docsRecords.map((row) => {
                  const tone = getDocsTone(row);
                  return (
                    <div key={row.key} className={`rounded-[26px] border p-4 sm:p-5 ${tone.shell}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className={`${tone.badge} shrink-0 mt-0.5`}>{row.label}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-base font-semibold ${tone.title}`}>{row.title}</p>
                              <span className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{row.note}</span>
                            </div>
                          </div>
                        </div>
                        <span className="badge-green">Ekleyin</span>
                      </div>

                      <div className={`mt-4 grid gap-3 ${row.fields.length > 3 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
                        {row.fields.map((field) => (
                          <div key={`${row.key}-${field.label}`} className="rounded-2xl border border-brand-border/20 bg-brand-surface/40 px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">{field.label}</p>
                            <p className="mt-2 break-all text-sm sm:text-[15px] font-mono font-medium leading-relaxed text-txt-primary">{field.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button onClick={() => copyDnsRecord(row)} className={tone.copy}>
                          <Copy size={12} /> Kopyala
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wildcard Subdomain DNS Kayıtları */}
            {docsDomain.wildcard_subdomains === 1 && (
              <div className="rounded-[28px] border border-accent-purple/25 bg-[radial-gradient(circle_at_top_left,rgba(122,99,255,0.15),transparent_30%),linear-gradient(135deg,rgba(11,21,45,0.96),rgba(9,18,38,0.9))] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe size={18} className="text-accent-purple" />
                      <p className="text-sm font-semibold text-accent-purple">Wildcard Subdomain DNS Kayıtları</p>
                    </div>
                    <p className="text-xs text-txt-muted mt-1">Subdomain desteği için aşağıdaki DNS kayıtlarını ekleyin. Bu kayıtlar ile *.domain.com şeklinde tüm alt domainler otomatik çalışır.</p>
                  </div>
                </div>

                {/* DNS Tablo */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border/30">
                        <th className="text-left py-3 px-3 text-[11px] uppercase tracking-[0.2em] text-txt-muted font-medium">Type</th>
                        <th className="text-left py-3 px-3 text-[11px] uppercase tracking-[0.2em] text-txt-muted font-medium">Host</th>
                        <th className="text-left py-3 px-3 text-[11px] uppercase tracking-[0.2em] text-txt-muted font-medium">Value</th>
                        <th className="text-left py-3 px-3 text-[11px] uppercase tracking-[0.2em] text-txt-muted font-medium">TTL</th>
                        <th className="text-right py-3 px-3 text-[11px] uppercase tracking-[0.2em] text-txt-muted font-medium">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-brand-border/15 hover:bg-brand-surface2/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="badge-blue text-[10px]">A Record</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-txt-primary">mail</td>
                        <td className="py-3 px-3 font-mono text-accent-cyan">{docsIp || docsDomain.server_ip || 'SUNUCU_IP'}</td>
                        <td className="py-3 px-3 text-txt-muted text-xs">Automatic</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => copyText(`A | mail | ${docsIp || docsDomain.server_ip || 'SUNUCU_IP'} | Automatic`, 'A Record kopyalandı')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/50 bg-brand-surface2/70 px-2.5 py-1.5 text-[11px] text-txt-secondary transition hover:text-txt-primary hover:border-accent-blue/40"
                          >
                            <Copy size={11} /> Kopyala
                          </button>
                        </td>
                      </tr>
                      <tr className="border-b border-brand-border/15 hover:bg-brand-surface2/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="badge-purple text-[10px]">TXT Record</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-txt-primary">*</td>
                        <td className="py-3 px-3 font-mono text-accent-cyan break-all">v=spf1 ip4:{docsIp || docsDomain.server_ip || 'SUNUCU_IP'} ~all</td>
                        <td className="py-3 px-3 text-txt-muted text-xs">Automatic</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => copyText(`TXT | * | v=spf1 ip4:${docsIp || docsDomain.server_ip || 'SUNUCU_IP'} ~all | Automatic`, 'TXT Record kopyalandı')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/50 bg-brand-surface2/70 px-2.5 py-1.5 text-[11px] text-txt-secondary transition hover:text-txt-primary hover:border-accent-blue/40"
                          >
                            <Copy size={11} /> Kopyala
                          </button>
                        </td>
                      </tr>
                      <tr className="hover:bg-brand-surface2/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="badge-cyan text-[10px]">MX Record</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-txt-primary">*</td>
                        <td className="py-3 px-3 font-mono text-accent-cyan">mail.{docsDomain.domain}.</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-txt-muted text-xs">Automatic</span>
                            <span className="badge-gold text-[9px]">Priority: 10</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => copyText(`MX | * | mail.${docsDomain.domain}. | Priority 10 | Automatic`, 'MX Record kopyalandı')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-border/50 bg-brand-surface2/70 px-2.5 py-1.5 text-[11px] text-txt-secondary transition hover:text-txt-primary hover:border-accent-blue/40"
                          >
                            <Copy size={11} /> Kopyala
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-accent-purple/10 border border-accent-purple/20">
                  <p className="text-xs text-accent-purple leading-relaxed">
                    <strong>Not:</strong> Bu kayıtlar ile <span className="font-mono">*. {docsDomain.domain}</span> şeklindeki tüm subdomain'ler otomatik olarak çalışacaktır.
                    Kullanıcılar istedikleri subdomain'i seçerek mail adresi oluşturabilir.
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      const ip = docsIp || docsDomain.server_ip || 'SUNUCU_IP';
                      const lines = [
                        `A | mail | ${ip} | Automatic`,
                        `TXT | * | v=spf1 ip4:${ip} ~all | Automatic`,
                        `MX | * | mail.${docsDomain.domain}. | Priority 10 | Automatic`,
                      ].join('\n');
                      copyText(lines, 'Wildcard Subdomain DNS kayıtları kopyalandı');
                    }}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    <Copy size={12} /> Tümünü Kopyala
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/10 p-4 text-sm text-txt-secondary">
                <div className="flex items-center gap-2 text-accent-blue">
                  <Globe size={16} />
                  <p className="text-xs uppercase tracking-[0.22em]">Nasıl Kullanılır?</p>
                </div>
                <p className="mt-2 leading-relaxed">Alan adınızın DNS paneline gidin ve yukarıdaki kayıtları eksiksiz şekilde ekleyin.</p>
              </div>
              <div className="rounded-2xl border border-accent-cyan/20 bg-cyan-400/10 p-4 text-sm text-txt-secondary">
                <div className="flex items-center gap-2 text-cyan-300">
                  <CalendarRange size={16} />
                  <p className="text-xs uppercase tracking-[0.22em]">Yayılma Süresi</p>
                </div>
                <p className="mt-2 leading-relaxed">DNS değişiklikleri genellikle 5-60 dakika içinde yayılır.</p>
              </div>
              <div className="rounded-2xl border border-accent-green/20 bg-accent-green/10 p-4 text-sm text-txt-secondary">
                <div className="flex items-center gap-2 text-accent-green">
                  <CheckCircle2 size={16} />
                  <p className="text-xs uppercase tracking-[0.22em]">Doğrulama</p>
                </div>
                <p className="mt-2 leading-relaxed">Kayıtlar eklendikten sonra doğrulama işlemini yenileyebilirsiniz.</p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-brand-border/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => {
                  setDocsDomain(null);
                  setDocsIp('');
                }}
                className="btn-secondary w-full sm:w-auto"
              >
                Kapat
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button onClick={refreshDocsDomain} disabled={docsRefreshing} className="btn-secondary w-full sm:w-auto">
                  <RefreshCw size={14} className={docsRefreshing ? 'animate-spin' : ''} /> Doğrulamayı Yenile
                </button>
                <button onClick={() => copyDomainDocs(docsDomain)} className="btn-primary w-full sm:w-auto">
                  <Copy size={14} /> Tüm Değerleri Kopyala
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        show={Boolean(editingDomain)}
        onClose={() => {
          setEditingDomain(null);
          setEditDomainIp('');
          setEditDomainWildcard(false);
        }}
        title={editingDomain ? `${editingDomain.domain} Domain Düzenle` : 'Domain Düzenle'}
        subtitle="IP adresini güncelleyin. Sistem A, MX ve TXT değerlerini otomatik yeniden üretir."
        footer={
          <>
            <button
              onClick={() => {
                setEditingDomain(null);
                setEditDomainIp('');
                setEditDomainWildcard(false);
              }}
              className="btn-secondary"
            >
              Kapat
            </button>
            <button onClick={saveDomainEditor} disabled={loading} className="btn-primary">
              <Pencil size={12} /> Kaydet
            </button>
          </>
        }
      >
        {editingDomain ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-4">
              <p className="text-sm text-txt-secondary">Domain</p>
              <p className="text-base font-semibold text-txt-primary mt-2 break-all">{editingDomain.domain}</p>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-4">
              <p className="text-sm text-txt-secondary">Sunucu IP</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={editDomainIp}
                  onChange={(e) => setEditDomainIp(sanitizeIpInput(e.target.value))}
                  placeholder="0.0.0.0"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  className="input"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(editDomainIp || '')}
                  className="btn-secondary shrink-0"
                >
                  <Copy size={12} /> Kopyala
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`relative w-10 h-5 rounded-full transition-colors ${editDomainWildcard ? 'bg-accent-cyan' : 'bg-brand-surface2/70'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editDomainWildcard ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <input
                  type="checkbox"
                  checked={editDomainWildcard}
                  onChange={(e) => setEditDomainWildcard(e.target.checked)}
                  className="sr-only"
                />
                <div>
                  <p className="text-sm font-medium text-txt-primary">Wildcard Subdomain Desteği</p>
                  <p className="text-[11px] text-txt-muted mt-1">Aktif edilirse *.domain.com şeklinde alt domainler oluşturulabilir</p>
                </div>
              </label>
            </div>
            <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 p-4 text-sm text-txt-secondary space-y-2">
              <p><strong className="text-txt-primary">Not:</strong> Sadece rakam ve nokta kabul edilir.</p>
              <p><strong className="text-txt-primary">Örnek:</strong> 123.45.67.89</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
