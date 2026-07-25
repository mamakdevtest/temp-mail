const buckets = new Map();

function apiContract(req, res, next) {
  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    if (res.locals.skipApiEnvelope || (payload && typeof payload.success === 'boolean')) {
      return sendJson(payload);
    }

    if (res.statusCode >= 400) {
      const message = payload?.message || payload?.error || 'İstek işlenemedi';
      const knownCode = new Set(['invalid_domain', 'domain_not_active', 'address_exists', 'password_required', 'invalid_request', 'not_found', 'rate_limited', 'invalid_password', 'unauthorized', 'forbidden', 'quota_exceeded', 'bulk_access_required', 'relay_unavailable']);
      const fallbackCode = res.statusCode === 404 ? 'not_found' : res.statusCode === 429 ? 'rate_limited' : res.statusCode === 400 ? 'invalid_request' : res.statusCode === 401 ? 'unauthorized' : res.statusCode === 403 ? 'forbidden' : 'internal_error';
      return sendJson({
        success: false,
        error: payload?.error_code || (knownCode.has(payload?.error) ? payload.error : fallbackCode),
        message,
        ...(payload?.data !== undefined ? { data: payload.data } : {}),
      });
    }

    return sendJson({ success: true, data: payload });
  };
  next();
}

function rateLimit({ windowMs = 60_000, max, key = 'default' }) {
  return (req, res, next) => {
    const now = Date.now();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${key}:${clientIp}`;
    const bucket = buckets.get(bucketKey);
    const fresh = !bucket || now >= bucket.resetAt;
    const state = fresh ? { count: 0, resetAt: now + windowMs } : bucket;
    state.count += 1;
    buckets.set(bucketKey, state);

    if (state.count > max) {
      res.set('Retry-After', String(Math.ceil((state.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'rate_limited', message: 'Too many requests' });
    }
    return next();
  };
}

module.exports = { apiContract, rateLimit };
