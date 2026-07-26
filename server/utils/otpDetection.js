// OTP mail formats vary wildly. This detector deliberately ranks candidates
// by nearby intent instead of returning the first 4-8 digit number it sees.
const OTP_LABEL_RE = /(?:verification|verify|security|one[-\s]?time|one time|authentication|auth(?:orization)?|passcode|otp|2fa|mfa|pin|login|sign[\s-]?in|confirm(?:ation)?|access\s*(?:code|token)?|\bcode\b|\btoken\b|doğrulama|doğrula|tek\s*kullanımlık|güvenlik|güvenli̇k|onay(?:lama)?|giriş|kod(?:unuz|u)?|şifre)/i;
const NEGATIVE_CONTEXT_RE = /(?:unsubscribe|order|invoice|receipt|tracking|shipment|reference|transaction|payment|amount|price|phone|tel(?:ephone)?|customer\s*(?:id|number)|ticket|account\s*(?:id|number)|postal|zip|copyright|telif|©)/i;
const DATE_LIKE_RE = /(?:\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b)/i;
const HEADER_RE = /^(?:from|sent|to|cc|bcc|subject|date|tarih|gönderen|gonderen|konu|reply-to)\s*[:\-]/i;
// Includes common provider formats such as BXS-AJ2, ABC-123 and IRU-VO0.
const TOKEN_RE = /(?:^|[^a-z0-9_-])([a-z0-9]+(?:-[a-z0-9]+){0,2})(?![a-z0-9_-])/gi;

function decodeHtmlEntities(text) {
  const entityMap = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) {
      const point = parseInt(key.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    if (key.startsWith('#')) {
      const point = parseInt(key.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : match;
    }
    return Object.prototype.hasOwnProperty.call(entityMap, key) ? entityMap[key] : match;
  });
}

function stripHtml(html) {
  if (!html) return '';
  let text = String(html)
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, ' ')
    .replace(/<\s*style[\s\S]*?<\s*\/\s*style\s*>/gi, ' ')
    .replace(/<\s*br\b[^>]*>/gi, '\n')
    .replace(/<\s*\/\s*(?:p|div|section|article|header|footer|main|aside|li|ul|ol|table|thead|tbody|tfoot|tr|td|th|blockquote|pre|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*(?:p|div|section|article|header|footer|main|aside|li|ul|ol|table|thead|tbody|tfoot|tr|td|th|blockquote|pre|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeText(text) {
  if (!text) return '';
  const raw = String(text);
  const cleaned = /<\/?[a-z][\s\S]*>/i.test(raw) ? stripHtml(raw) : raw;
  return cleaned
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wordCount(line) {
  return (line.match(/[A-Za-zÀ-ÿ0-9]+/g) || []).length;
}

function nearestLabel(lines, index) {
  let best = null;
  for (let offset = -3; offset <= 3; offset += 1) {
    const candidateIndex = index + offset;
    if (candidateIndex < 0 || candidateIndex >= lines.length) continue;
    if (OTP_LABEL_RE.test(lines[candidateIndex])) {
      const distance = Math.abs(offset);
      if (!best || distance < best.distance) best = { distance, line: lines[candidateIndex] };
    }
  }
  return best;
}

function isIsolated(line, token) {
  return new RegExp(`^\\s*[^A-Za-z0-9]*${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^A-Za-z0-9]*\\s*$`, 'i').test(line);
}

function scoreCandidate({ token, line, lines, index, sourceWeight }) {
  const numeric = /^\d+$/.test(token);
  const length = token.replace(/-/g, '').length;
  const label = nearestLabel(lines, index);
  let score = numeric ? 32 : 18;

  if (numeric) {
    if (length === 6) score += 14;
    else if (length >= 5 && length <= 8) score += 10;
    else score += 4;
  } else if (!label) {
    // Alphanumeric account/order IDs are common, so require OTP intent.
    score -= 30;
  }

  if (isIsolated(line, token)) score += 16;
  if (label) {
    score += [26, 20, 13, 7][label.distance];
    if (/[:#-]\s*$/.test(label.line.trim()) && label.distance <= 1) score += 4;
  }
  if (new RegExp(`#${token}\\b`, 'i').test(line)) score += 8;
  if (DATE_LIKE_RE.test(line)) score -= 42;
  if (HEADER_RE.test(line)) score -= 18;
  if (/^>/.test(line.trim())) score -= 20;
  if (NEGATIVE_CONTEXT_RE.test(line)) score -= 42;
  if (/https?:\/\/|\bwww\.|@\S+\./i.test(line)) score -= 18;
  if (wordCount(line) > 12) score -= 8;
  else if (wordCount(line) > 6) score -= 3;

  return { token, score: score + sourceWeight, hasLabel: Boolean(label), numeric };
}

function rankOtpCandidates(sources) {
  const candidates = [];
  sources.forEach(({ name, text, weight }) => {
    const normalized = normalizeText(text);
    if (!normalized) return;
    const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    lines.forEach((line, index) => {
      for (const match of line.matchAll(TOKEN_RE)) {
        const token = match[1];
        const compact = token.replace(/-/g, '');
        if (!/\d/.test(compact) || compact.length < 4 || compact.length > 10) continue;
        const candidate = scoreCandidate({ token, line, lines, index, sourceWeight: weight });
        candidates.push({ ...candidate, source: name, index });
      }
    });
  });
  return candidates.sort((a, b) => b.score - a.score || Number(b.hasLabel) - Number(a.hasLabel) || b.token.length - a.token.length || a.index - b.index);
}

function pickOtp(candidates) {
  const best = candidates[0];
  if (!best) return null;
  // Numeric codes can be rendered as a standalone line. Alphanumeric codes
  // must have explicit OTP context to avoid promoting arbitrary identifiers.
  if (best.numeric && best.score >= 52) return best.token;
  if (!best.numeric && best.hasLabel && best.score >= 54) return best.token;
  return null;
}

function extractOtp(text) {
  return pickOtp(rankOtpCandidates([{ name: 'text', text, weight: 8 }]));
}

function extractOtpFromEmail(subject = '', bodyText = '', bodyHtml = '') {
  return pickOtp(rankOtpCandidates([
    { name: 'subject', text: subject, weight: 12 },
    { name: 'text', text: bodyText, weight: 8 },
    { name: 'html', text: stripHtml(bodyHtml), weight: 5 },
  ]));
}

module.exports = { extractOtp, extractOtpFromEmail, rankOtpCandidates, stripHtml };
