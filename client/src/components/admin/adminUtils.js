export function formatAdminDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: options.withYear === false ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(value) {
  if (!value) return 'Yok';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Yok';
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'az önce';
  if (diff < hour) return `${Math.floor(diff / minute)} dk önce`;
  if (diff < day) return `${Math.floor(diff / hour)} sa önce`;
  return `${Math.floor(diff / day)} gün önce`;
}

export function formatRetention(address) {
  if (!address?.expires_at) return 'Bilinmiyor';
  const expiresAt = new Date(address.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return 'Bilinmiyor';
  if (address.is_persistent || expiresAt.getFullYear() >= 9999) return 'Süresiz';

  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return 'Süresi doldu';

  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours} saat`;

  const days = Math.round(hours / 24);
  return `${days} gün`;
}

export function getAddressStatus(address) {
  const expiresAt = address?.expires_at ? new Date(address.expires_at) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
    return { key: 'expired', label: 'Süresi Doldu', badge: 'badge-red' };
  }
  if (address?.has_password) {
    return { key: 'protected', label: 'Şifreli', badge: 'badge-purple' };
  }
  if (address?.last_email_at || address?.last_accessed) {
    return { key: 'active', label: 'Aktif', badge: 'badge-green' };
  }
  return { key: 'idle', label: 'Pasif', badge: 'badge-cyan' };
}

export function getAddressActivityTimestamp(address) {
  return address?.last_email_at || address?.last_accessed || address?.created_at || null;
}

export function sortAddresses(addresses, sortKey) {
  const list = [...addresses];
  switch (sortKey) {
    case 'oldest':
      return list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    case 'last-mail':
      return list.sort((a, b) => new Date(getAddressActivityTimestamp(b) || 0) - new Date(getAddressActivityTimestamp(a) || 0));
    case 'usage':
      return list.sort((a, b) => (b.email_count || 0) - (a.email_count || 0));
    case 'domain':
      return list.sort((a, b) => String(a.domain || '').localeCompare(String(b.domain || ''), 'tr'));
    case 'newest':
    default:
      return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}
