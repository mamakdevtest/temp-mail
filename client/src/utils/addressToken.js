const PREFIX = 'tm-addr-token:';

export function getAddressToken(address) {
  try {
    return localStorage.getItem(PREFIX + String(address).toLowerCase()) || null;
  } catch (_) {
    return null;
  }
}

export function setAddressToken(address, token) {
  try {
    if (token) localStorage.setItem(PREFIX + String(address).toLowerCase(), token);
  } catch (_) { /* private mode */ }
}

export function clearAddressToken(address) {
  try {
    localStorage.removeItem(PREFIX + String(address).toLowerCase());
  } catch (_) { /* ignore */ }
}

/** Adres-erişim header'ı: varsa X-Address-Token döner. */
export function addressTokenHeader(address) {
  const token = address ? getAddressToken(address) : null;
  return token ? { 'X-Address-Token': token } : {};
}
