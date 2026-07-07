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
  const [docsDomain, setDocsDomain] = useState(null);
  const [docsIp, setDocsIp] = useState('');
  const [editingDomain, setEditingDomain] = useState(null);
  const [editDomainIp, setEditDomainIp] = useState('');

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
      throw new Error(data.error || data.message || 'İşlem başarısız');
    }

    return data;
  }, [api, getHeaders]);

  const loadDomains = useCallback(async () => {
    const data = await apiRequest('/admin/domains');
    setDomains(data.domains || []);
    setAuth(true);
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
      const data = await apiRequest('/admin/domains', { method: 'POST', body: { domain: newDom.trim() } });
      setNewDom('');
      setShowDomainForm(false);
      flash(`"${data.domain.domain}" eklendi`);
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e2) {
      flash(e2.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDom = async (id, active) => {
    try {
      await apiRequest(`/admin/domains/${id}`, { method: 'PUT', body: { is_active: !active } });
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
  }, []);

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
      await Promise.all([loadDomains(), loadStats()]);
    } catch (e) {
      flash(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const buildDomainDocs = useCallback((domain, ipOverride = '') => {
    if (!domain) return [];
    const ip = sanitizeIpInput((ipOverride || domain.server_ip || '').trim());
    const effectiveIp = ip || '-';
    const mailHost = domain.a_host || 'mail';
    const mailFqdn = mailHost === '@' ? domain.domain : `${mailHost}.${domain.domain}`;
    return [
      { type: 'A', host: mailHost, value: effectiveIp, extra: 'Mail host IP' },
      { type: 'MX', host: '@', value: mailFqdn, extra: `Priority: ${domain.mx_priority || 10}` },
      { type: 'TXT', host: '@', value: `v=spf1 mx ip4:${effectiveIp === '-' ? 'SUNUCU_IP' : effectiveIp} ~all`, extra: 'SPF' },
      { type: 'TXT', host: '_mail', value: `mail verification token for ${domain.domain}`, extra: 'Verification' },
      { type: 'TXT', host: 'default._domainkey', value: 'v=DKIM1; k=rsa; p=REPLACE_WITH_PUBLIC_KEY', extra: 'DKIM' },
      { type: 'TXT', host: '_dmarc', value: `v=DMARC1; p=none; rua=mailto:postmaster@${domain.domain}`, extra: 'DMARC' },
    ];
  }, []);

  const getDocsTone = useCallback((type, host) => {
    if (type === 'A') {
      return {
        shell: 'border-accent-blue/25 bg-gradient-to-r from-accent-blue/18 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-blue',
        title: 'text-accent-blue',
        copy: 'btn-secondary border-accent-blue/25 text-accent-blue hover:bg-accent-blue/12',
      };
    }
    if (type === 'MX') {
      return {
        shell: 'border-cyan-400/25 bg-gradient-to-r from-cyan-400/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-cyan',
        title: 'text-cyan-300',
        copy: 'btn-secondary border-cyan-400/25 text-cyan-200 hover:bg-cyan-400/12',
      };
    }
    if (host === '_dmarc') {
      return {
        shell: 'border-pink-400/25 bg-gradient-to-r from-pink-400/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-red',
        title: 'text-pink-300',
        copy: 'btn-secondary border-pink-400/25 text-pink-200 hover:bg-pink-400/12',
      };
    }
    if (host === 'default._domainkey') {
      return {
        shell: 'border-amber-400/25 bg-gradient-to-r from-amber-400/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-gold',
        title: 'text-amber-200',
        copy: 'btn-secondary border-amber-400/25 text-amber-100 hover:bg-amber-400/12',
      };
    }
    if (host === '_mail') {
      return {
        shell: 'border-accent-purple/25 bg-gradient-to-r from-accent-purple/14 via-brand-surface2/35 to-brand-surface2/20',
        badge: 'badge-purple',
        title: 'text-accent-purple',
        copy: 'btn-secondary border-accent-purple/25 text-accent-purple hover:bg-accent-purple/12',
      };
    }
    return {
      shell: 'border-accent-green/25 bg-gradient-to-r from-accent-green/14 via-brand-surface2/35 to-brand-surface2/20',
      badge: 'badge-green',
      title: 'text-accent-green',
      copy: 'btn-secondary border-accent-green/25 text-accent-green hover:bg-accent-green/12',
    };
  }, []);

  const copyDomainDocs = async (domain) => {
    const lines = buildDomainDocs(domain, docsIp)
      .map((row) => `${row.type} | ${row.host} | ${row.value}${row.extra ? ` | ${row.extra}` : ''}`)
      .join('\n');
    await navigator.clipboard.writeText(lines);
    flash('Domain kayıt dokümanı kopyalandı');
  };

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
    setAddressPage(1);
  }, [addressQuery, addressDomainFilter, addressStatusFilter, addressSort]);

  const activeDomains = useMemo(() => domains.filter((d) => d.is_active === 1).length, [domains]);
  const protectedAddresses = useMemo(() => addrs.filter((a) => a.has_password).length, [addrs]);
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  const inactiveUsers = useMemo(() => users.filter((u) => u.is_active !== 1).length, [users]);
  const expiredAddresses = useMemo(() => addrs.filter((a) => getAddressStatus(a).key === 'expired').length, [addrs]);
  const activeAddressCount = useMemo(() => addrs.filter((a) => getAddressStatus(a).key === 'active').length, [addrs]);

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
              <form onSubmit={addDomain} className="panel-soft p-4 mb-5 flex flex-col md:flex-row gap-3">
                <input ref={addDomainInputRef} value={newDom} onChange={(e) => setNewDom(e.target.value)} placeholder="ornek.com" className="input flex-1" />
                <button type="submit" disabled={loading || !newDom.trim()} className="btn-primary">Kaydet</button>
              </form>
            ) : null}

            {domains.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {domains.map((domain) => (
                  <div key={domain.id} className="panel-soft p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-txt-primary">{domain.domain}</p>
                        <p className="text-sm text-txt-muted mt-2">{domain.address_count} aktif adres kaydı</p>
                      </div>
                      {domain.is_active === 1 ? <span className="badge-green">Aktif</span> : <span className="badge-red">Pasif</span>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                      <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-txt-muted">Server IP</p>
                        <p className="text-sm font-semibold text-txt-primary mt-2">{domain.server_ip || '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-brand-border/20 bg-brand-surface2/30 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-txt-muted">MX</p>
                        <p className="text-sm font-semibold text-txt-primary mt-2 break-all">{domain.mx_value || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-5 text-sm">
                      <span className="text-txt-secondary">Oluşturulma</span>
                      <span className="text-txt-primary">{formatAdminDate(domain.created_at)}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">
                      <button onClick={() => openDomainEditor(domain)} className="btn-secondary text-xs px-3 py-2">
                        <Pencil size={13} /> Düzenle
                      </button>
                      <button onClick={() => { setDocsDomain(domain); setDocsIp(domain.server_ip || ''); }} className="btn-secondary text-xs px-3 py-2">
                        <FileText size={13} /> Domain Docs
                      </button>
                      <button onClick={() => toggleDom(domain.id, domain.is_active === 1)} className="btn-secondary text-xs px-3 py-2">{domain.is_active === 1 ? 'Pasifleştir' : 'Aktifleştir'}</button>
                      <button onClick={() => delDom(domain.id, domain.domain)} className="btn-danger text-xs px-3 py-2">Sil</button>
                    </div>
                  </div>
                ))}
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
        onClose={() => setDocsDomain(null)}
        title={docsDomain ? `${docsDomain.domain} Domain Docs` : 'Domain Docs'}
        subtitle="Sadece IP girin, MX ve TXT değerleri otomatik üretilecek."
        size="2xl"
        footer={<button onClick={() => setDocsDomain(null)} className="btn-secondary">Kapat</button>}
      >
        {docsDomain ? (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-accent-blue/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,255,0.18),transparent_30%),linear-gradient(135deg,rgba(11,21,45,0.95),rgba(9,19,38,0.88))] p-5 shadow-[0_20px_60px_rgba(59,130,255,0.08)]">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-accent-blue/80">DNS Hızlı Kurulum</p>
                  <h4 className="text-xl font-semibold text-txt-primary">{docsDomain.domain}</h4>
                  <p className="text-sm text-txt-muted">A, MX, SPF, DKIM ve DMARC kayıtları otomatik oluşur.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge-blue">A</span>
                  <span className="badge-cyan">MX</span>
                  <span className="badge-purple">SPF</span>
                  <span className="badge-gold">DKIM</span>
                  <span className="badge-red">DMARC</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-brand-border/20 bg-brand-surface2/25 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-txt-secondary">Sunucu IP</p>
                  <p className="text-xs text-txt-muted mt-1">A kaydı ve SPF değeri bu IP üzerinden üretilir.</p>
                </div>
                <span className="badge-blue">Manuel IP</span>
              </div>
              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <input
                  value={docsIp}
                  onChange={(e) => setDocsIp(sanitizeIpInput(e.target.value))}
                  placeholder="159.146.103.84"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  className="input md:flex-1 bg-brand-surface/70 border-accent-blue/20 text-txt-primary placeholder:text-txt-muted font-mono text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {buildDomainDocs(docsDomain, docsIp).map((row, index) => (
                (() => {
                  const tone = getDocsTone(row.type, row.host);
                  return (
                    <div key={`${row.type}-${index}`} className={`rounded-[26px] border p-4 sm:p-5 ${tone.shell}`}>
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <span className={`${tone.badge} shrink-0 mt-0.5`}>{row.type}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-base font-semibold ${tone.title}`}>{row.host}</p>
                              <span className="text-[11px] uppercase tracking-[0.22em] text-txt-muted">{row.extra || 'Kayıt'}</span>
                            </div>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-txt-muted">Değer</p>
                            <p className="text-base sm:text-lg text-txt-primary font-mono break-all mt-1 leading-relaxed">{row.value}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-accent-blue/20 bg-accent-blue/10 p-4 text-sm text-txt-secondary">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-blue">Nasıl kullanılır</p>
                <p className="mt-2 leading-relaxed">IP girin, kayıtlarınızı DNS paneline birebir ekleyin.</p>
              </div>
              <div className="rounded-2xl border border-accent-cyan/20 bg-cyan-400/10 p-4 text-sm text-txt-secondary">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">MX</p>
                <p className="mt-2 leading-relaxed">Host `@`, değer `mail.{docsDomain.domain}`, öncelik `10`.</p>
              </div>
              <div className="rounded-2xl border border-accent-purple/20 bg-accent-purple/10 p-4 text-sm text-txt-secondary">
                <p className="text-xs uppercase tracking-[0.22em] text-accent-purple">TXT</p>
                <p className="mt-2 leading-relaxed">SPF, verification, DKIM ve DMARC kayıtlarını ayrı ekleyin.</p>
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
        }}
        title={editingDomain ? `${editingDomain.domain} Domain Düzenle` : 'Domain Düzenle'}
        subtitle="IP adresini güncelleyin. Sistem A, MX ve TXT değerlerini otomatik yeniden üretir."
        footer={
          <>
            <button
              onClick={() => {
                setEditingDomain(null);
                setEditDomainIp('');
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
