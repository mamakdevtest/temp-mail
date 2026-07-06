const crypto = require('crypto');

/**
 * Rastgele kullanıcı adı oluşturur
 * @param {number} length - Uzunluk (varsayılan 8)
 * @returns {string} - Rastgele alfanümerik string
 */
function generateUsername(length = 8) {
  // Okunabilir karakterler kullan (0, O, l, 1, I gibi karışanları hariç tut)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Süreyi okunabilir formata çevirir
 * @param {Date} expiresAt - Bitiş tarihi
 * @returns {string} - "45 dk kaldı" gibi
 */
function formatTimeRemaining(expiresAt) {
  const now = new Date();
  const diff = new Date(expiresAt) - now;

  if (diff <= 0) return 'Süresi doldu';

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} saat ${remainingMins} dk kaldı`;
  }

  return `${minutes} dk ${seconds} sn kaldı`;
}

/**
 * Tarih formatını okunabilir hale getirir
 * @param {string|Date} date
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

module.exports = { generateUsername, formatTimeRemaining, formatDate };
