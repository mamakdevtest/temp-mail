const { authMiddleware } = require('../routes/auth');
const { getRawApiKey, getApiKeyPrincipal, enforceApiKeyRate } = require('./apiKeyAuth');

const PUBLIC_PATHS = new Set(['/health', '/auth/login', '/auth/register']);

function requireApiAccess(req, res, next) {
  if (PUBLIC_PATHS.has(req.path)) return next();

  const rawKey = getRawApiKey(req);
  const principal = getApiKeyPrincipal(req);
  if (principal) {
    req.user = principal;
    req.apiKey = principal;
    return enforceApiKeyRate(req, res, next);
  }
  if (rawKey) return res.status(401).json({ error: 'unauthorized', message: 'Geçersiz, pasif veya süresi dolmuş API key' });

  // Browser session requests remain compatible. Programmatic integrations must
  // use tm_ keys; the API key middleware never treats a missing key as public.
  return authMiddleware(req, res, next);
}

module.exports = { requireApiAccess };
