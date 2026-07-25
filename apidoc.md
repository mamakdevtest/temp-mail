# Temp Mail — API Documentation

Project API documentation (extracted from repository code)

## Files reviewed
- Server entry and routes: server/index.js, server/routes/auth.js, server/routes/addresses.js, server/routes/emails.js, server/routes/admin.js
- Services: server/services/smtpServer.js, server/services/cleanup.js
- DB: server/db.js
- Client usage examples: client/src/hooks/useAuth.js, client/src/App.jsx

## Overview
- Base API prefix: `/api`
- Main route groups:
  - `/api/auth` — authentication & user management
  - `/api/addresses` — address creation, query, login
  - `/api/emails` — list, view, send, delete emails 
  - `/api/admin` — admin-only management endpoints
  - `/api/health` — health check: `GET /api/health`
- Auth uses JWT Bearer tokens in the `Authorization` header. Tokens include `session_id` and expire in 7 days.

## Environment variables (relevant)
- `API_PORT` / `PORT` — API port (default `3001`)
- `SMTP_PORT` — SMTP listening port (default `25`)
- `JWT_SECRET` — JWT signing secret
- `SMTP_RELAY_HOST`, `SMTP_RELAY_PORT`, `SMTP_RELAY_SECURE`, `SMTP_RELAY_USER`, `SMTP_RELAY_PASS`, `SMTP_RELAY_FROM` — outgoing mail relay
- `WEBHOOK_URL` — optional webhook for incoming mails
- `ADMIN_PASSWORD` — fallback admin password for admin routes
- `MAIL_SERVER_IP` / `PUBLIC_IP` / `SERVER_IP` — used for domain DNS defaults
- `NODE_ENV` — `production` causes serving the frontend build

## Authentication & tokens
- Tokens are issued on register/login and returned as `{ token, session_id, user }`.
- Use header: `Authorization: Bearer <token>` for protected endpoints.

### `POST /api/auth/register`
- Body: `{ username, email, password }`
- Success: `{ message, token, session_id, user }`
- Errors: `400` validation, `409` conflict

### `POST /api/auth/login`
- Body: `{ login, password }` where `login` is username or email
- Success: `{ message, token, session_id, user }`

### `GET /api/auth/me` (auth)
- Header: `Authorization: Bearer <token>`
- Returns: user center payload `{ user, package, stats, preferences, favorite_domains, addresses }`

### `PUT /api/auth/me` (auth)
- Body: `{ username?, display_name?, email? }` — email change must follow request/confirm flow

### Email change flow
- `POST /api/auth/request-email-change` (auth) — Body: `{ email }` — creates pending change, may email code if SMTP_RELAY configured
- `POST /api/auth/confirm-email-change` (auth) — Body: `{ code }` — confirm pending change

### Sessions & preferences
- `GET /api/auth/sessions` (auth) — list sessions
- `DELETE /api/auth/sessions/:id` (auth) — revoke session
- `GET /api/auth/login-history` (auth)
- `PUT /api/auth/preferences` (auth) — update preferences
- `PUT /api/auth/profile-photo` (auth) — Body `{ avatarDataUrl }` (data URL)
- `POST /api/auth/change-password` (auth) — Body `{ currentPassword, newPassword }` — revokes old sessions and issues new token
- `GET /api/auth/packages` — list packages (public)
- `POST /api/auth/request-pro` (auth) — Body `{ message? }`

## Addresses endpoints

### `GET /api/addresses/domains`
- Public: lists active domains and subdomains.

### `POST /api/addresses/random`
- Body: `{ password? }` — create a random permanent address. Enforces package quotas if authenticated.

### `POST /api/addresses/set-password`
- Body: `{ address, password }` — set password for an existing address (if none exists).

### `POST /api/addresses/check`
- Body: `{ username, domain }` — returns `{ exists, has_password, address }`.

### `POST /api/addresses`
- Body: `{ username, domain, subdomain?, password? }`
- Behavior: creates or returns an address; if existing and password-protected returns `403` with `error: 'password_required'`.

### `POST /api/addresses/login`
- Body: `{ address, password }` — login to password-protected address.

### `GET /api/addresses/:address`
- Returns address info and recent emails.

## Emails endpoints

### `GET /api/emails/:address`
- List recent emails for an address (polling endpoint). Response includes OTP detection when present.

### `GET /api/emails/single/:id`
- Full email detail: `body_text`, `body_html`, attachments, `otp_code`.

### `DELETE /api/emails/:id`
- Delete a single email.

### `GET /api/emails/:emailId/attachments/:attId`
- Download attachment (binary response with `Content-Type` and `Content-Disposition`).

### `POST /api/emails/send`
- Body: `{ from, to, subject, body }`
- Requires SMTP relay configured (`SMTP_RELAY_HOST` etc.) and `from` address must exist in DB.
- Returns `{ message, messageId }` on success or `503` if relay not configured.

### `GET /api/emails/send/status`
- Returns `{ configured, host, port }`.

## Admin endpoints (admin JWT OR `x-admin-password` header / `?password=` fallback)

### Domains
- `GET /api/admin/domains`
- `POST /api/admin/domains` — Body: `{ domain, wildcard_subdomains?, ...dns config }`
- `PUT /api/admin/domains/:id`
- `DELETE /api/admin/domains/:id`
- Subdomains: `GET/POST/DELETE /api/admin/domains/:id/subdomains`

### Cleanup
- `POST /api/admin/cleanup` — Body `{ type?: 'all' | 'expired' }` — calls manualCleanup service.

### Stats
- `GET /api/admin/stats` — totals, OTP counts, top senders/domains, latest emails.

### Emails
- `GET /api/admin/emails` (pagination via `page` & `limit`)
- `DELETE /api/admin/emails/:id`

### Addresses
- `GET /api/admin/addresses`
- `GET /api/admin/addresses/:address` — address detail + OTP history
- `POST /api/admin/addresses/:address/cleanup` — clear mail history
- `DELETE /api/admin/addresses/:address` — delete address and related mails

### Users
- `GET /api/admin/users`
- `PUT /api/admin/users/:id/role` — Body `{ role }` (`free|pro|admin`)
- `PUT /api/admin/users/:id/package` — Body `{ package_name }` (`free|pro|pro_plus|admin`)
- `PUT /api/admin/users/:id/status` — Body `{ is_active }`
- `GET /api/admin/package-requests`, `PUT /api/admin/package-requests/:id` — Body `{ status: 'approved'|'rejected' }`

## Websockets (Socket.io)
- Socket.io is initialized by the server. Clients `emit('subscribe', address)` to join room `inbox:<address>`.
- Server emits `new-email` with payload `{ id, sender, subject, received_at, has_attachments, otp_code }` to the room when SMTP processing stores a mail.

## SMTP inbound & processing
- Built-in SMTP server (default port `25`) accepts incoming mail and stores parsed messages in the DB, including attachments.
- Rejects RCPT for addresses not present or for inactive domains.
- Extracts OTP codes via `extractOtp` and optionally posts to `WEBHOOK_URL`.

## Database
- SQLite (sql.js) file at `data/tempmail.db`.
- Key tables: `users`, `packages`, `user_preferences`, `user_sessions`, `login_events`, `favorite_domains`, `domains`, `subdomains`, `addresses`, `emails`, `attachments`, `package_requests`.
- Default admin user created at init if none exists (password from `ADMIN_PASSWORD`).

## Validation & quota
- Username: 3–30 chars, `/^[a-zA-Z0-9._-]+$/`
- Password: minimum 6 chars
- Address creation enforces package `max_addresses` quota (packages table)

## Client integration notes
- Client uses `API = '/api'` and `fetch()` calls. Typical flow: register/login → save token to `localStorage` (`tm-token`) → use `Authorization` header → create/open address → poll `/api/emails/:address` or subscribe via Socket.io.

## Quick curl snippets
- Register:
```
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}'
```

- Login:
```
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"alice","password":"secret123"}'
```

- Get current user:
```
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"
```

- Create random address:
```
curl -X POST http://localhost:3001/api/addresses/random \
  -H "Content-Type: application/json" \
  -d '{"password":"addrpass"}'
```

- Send mail (requires SMTP_RELAY configured):
```
curl -X POST http://localhost:3001/api/emails/send \
  -H "Content-Type: application/json" \
  -d '{"from":"alice@domain","to":"bob@example.com","subject":"Hi","body":"Hello"}'
```

## References
- Server bootstrap: `server/index.js`
- Auth: `server/routes/auth.js`
- Addresses: `server/routes/addresses.js`
- Emails: `server/routes/emails.js`
- Admin: `server/routes/admin.js`
- SMTP service: `server/services/smtpServer.js`
- DB schema: `server/db.js`
- Client usage examples: `client/src/hooks/useAuth.js`, `client/src/App.jsx`

---

If you want additional curl examples for every endpoint or more detailed request/response schemas, tell me which sections to expand.
