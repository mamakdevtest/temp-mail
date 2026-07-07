const STRONG_LABEL_RE = /(?:verification\s*(?:code|token)?|security\s*(?:code|token)?|one[-\s]?time\s*(?:code|passcode|password|token)?|auth(?:entication)?\s*(?:code|token)?|passcode|otp|2fa|mfa|pin|doğrulama\s*(?:kodu|kod)?|tek\s*kullanımlık\s*(?:kod|şifre)?|kod|code|token)/i;
const DATE_LIKE_RE = /(?:\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}[./-]\d{1,2}[./-]\d{1,2}\b|\b\d{1,2}:\d{2}(?::\d{2})?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|ocak|subat|şubat|mart|nisan|mayis|mayıs|haziran|temmuz|agustos|ağustos|eylul|eylül|ekim|kasim|kasım|aralik|aralık)\b)/i;
const META_LINE_RE = /^(?:from|sent|to|cc|bcc|subject|date|tarih|gönderen|gonderen|konu)\s*[:\-]/i;
const CANDIDATE_RE = /\b([a-z0-9]*\d[a-z0-9]{3,9})\b/gi;

function decodeHtmlEntities(text) {
  const entityMap = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    '#39': "'",
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) {
      const codePoint = parseInt(key.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (key.startsWith('#')) {
      const codePoint = parseInt(key.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
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

  text = decodeHtmlEntities(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function normalizeText(text) {
  if (!text) return '';

  const raw = String(text);
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const cleaned = looksLikeHtml ? stripHtml(raw) : raw;

  return cleaned
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200f\ufeff]/g, '')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isDateLikeLine(line) {
  return DATE_LIKE_RE.test(line);
}

function countWords(line) {
  const matches = line.match(/[A-Za-zÀ-ÿ0-9]+/g);
  return matches ? matches.length : 0;
}

function isIsolatedCandidateLine(line, token) {
  const compact = line.replace(new RegExp(`^\\s*[^A-Za-z0-9]*(${token})[^A-Za-z0-9]*\\s*$`, 'i'), '$1');
  return compact.toLowerCase() === token.toLowerCase();
}

function scoreToken(token, line, lineIndex, labelIndex, labelLine) {
  const digitsOnly = /^\d+$/.test(token);
  const length = token.length;
  const words = countWords(line);
  let score = 0;

  if (digitsOnly) {
    score += 32;
    if (length === 6) score += 14;
    else if (length >= 5 && length <= 8) score += 10;
    else if (length === 4 || length === 9 || length === 10) score += 4;
  } else {
    score += 18;
  }

  if (isIsolatedCandidateLine(line, token)) {
    score += 12;
  }

  if (isDateLikeLine(line)) {
    score -= 35;
  } else if (words > 4) {
    score -= 4;
  }

  if (META_LINE_RE.test(line)) {
    score -= 8;
  }

  if (labelIndex !== null && labelIndex !== undefined) {
    const distance = lineIndex - labelIndex;
    if (distance === 0) {
      score += 22;
    } else if (distance === 1) {
      score += 18;
    } else if (distance === 2) {
      score += 12;
    } else if (distance === 3) {
      score += 8;
    } else if (distance > 3) {
      score -= distance * 2;
    }

    if (labelLine && /:\s*$/.test(labelLine.trim())) {
      score += distance <= 1 ? 3 : 0;
    }
  }

  return score;
}

function findBestCandidate(lines, startIndex, lookahead = 4) {
  let best = null;

  for (let offset = 0; offset <= lookahead; offset += 1) {
    const lineIndex = startIndex + offset;
    if (lineIndex >= lines.length) break;
    const line = lines[lineIndex];
    const matches = [...line.matchAll(CANDIDATE_RE)];

    for (const match of matches) {
      const token = match[1];
      const score = scoreToken(token, line, lineIndex, startIndex, lines[startIndex]);
      if (!best || score > best.score || (score === best.score && token.length > best.token.length)) {
        best = { token, score };
      }
    }
  }

  return best;
}

function extractOtp(text) {
  if (!text) return null;

  const normalized = normalizeText(text);
  if (!normalized) return null;

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let best = null;

  for (let i = 0; i < lines.length; i += 1) {
    if (!STRONG_LABEL_RE.test(lines[i])) continue;

    const candidate = findBestCandidate(lines, i, 4);
    if (candidate && (!best || candidate.score > best.score)) {
      best = candidate;
    }
  }

  if (!best) {
    for (let i = 0; i < lines.length; i += 1) {
      const candidate = findBestCandidate(lines, i, 0);
      if (candidate && (!best || candidate.score > best.score)) {
        best = candidate;
      }
    }
  }

  return best && best.score >= 30 ? best.token : null;
}

module.exports = { extractOtp, stripHtml };
