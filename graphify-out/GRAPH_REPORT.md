# Graph Report - .  (2026-07-26)

## Corpus Check
- 4 files · ~72,825 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 473 nodes · 726 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- React App Shell
- OTP Detection & Email Tests
- Admin UI Components
- Admin API Routes & Auth Middleware
- Client Dependencies
- API Key System Tests
- UI Design Brief
- API Documentation
- Auth API Routes
- Server Dependencies
- Operations & Deployment Docs
- Addresses API Routes
- Root Package Scripts
- Server Entry Point
- Coolify Deployment Guide
- DB Verification Script
- Documentation Center UI
- User Avatars
- Statusline Script
- HTML Entry Document

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 30 edges
2. `MS Temp Mail UI Design Brief (v3)` - 21 edges
3. `apiFetch()` - 13 edges
4. `scripts` - 11 edges
5. `extractOtpFromEmail()` - 11 edges
6. `AdminPanel()` - 10 edges
7. `getApiKeyPrincipal()` - 10 edges
8. `initDatabase()` - 9 edges
9. `MS Temp Mail Sunucu Operasyon Rehberi` - 9 edges
10. `App()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `DNS setup requirements` --semantically_similar_to--> `DNS records for mail delivery`  [INFERRED] [semantically similar]
  README.md → Coolify.md
- `Project structure (README view)` --semantically_similar_to--> `Project structure (Coolify view)`  [INFERRED] [semantically similar]
  README.md → Coolify.md
- `Temp Mail API Overview` --semantically_similar_to--> `MS Temp Mail API`  [INFERRED] [semantically similar]
  apidoc.md → docs/API.md
- `SSE Email Stream` --semantically_similar_to--> `Socket.io Realtime Notifications`  [INFERRED] [semantically similar]
  docs/API.md → apidoc.md
- `OTP Detection Scoring` --semantically_similar_to--> `OTP Extraction`  [INFERRED] [semantically similar]
  docs/API.md → apidoc.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MS Temp Mail Full UI Scene Inventory** — temp_mail_ui_v3_authpage, temp_mail_ui_v3_addressbar, temp_mail_ui_v3_inbox, temp_mail_ui_v3_emailview, temp_mail_ui_v3_accountpanel, temp_mail_ui_v3_accounteditormodal, temp_mail_ui_v3_adminpanel, temp_mail_ui_v3_adminbulkstudio, temp_mail_ui_v3_bulkstudio, temp_mail_ui_v3_bulkinbox, temp_mail_ui_v3_automationcenter, temp_mail_ui_v3_documentationcenter, temp_mail_ui_v3_modal, temp_mail_ui_v3_skeleton, temp_mail_ui_v3_adminprimitives [EXTRACTED 1.00]
- **Coolify deployment flow** — coolify_deployment_guide, coolify_docker_compose_yaml, coolify_port25_smtp, coolify_dns_records [EXTRACTED 1.00]
- **OTP Detection Pipeline** — apidoc_smtp_inbound, apidoc_otp_extraction, apidoc_emails_endpoints, docs_api_otp_detection [INFERRED 0.85]
- **Automation API Contract** — docs_api_apikey_auth, docs_api_scopes, docs_api_rate_limiting, docs_api_envelope, docs_api_ownership_check, docs_api_automation_flow [EXTRACTED 1.00]
- **Realtime Mail Delivery Mechanisms** — apidoc_smtp_inbound, apidoc_socketio_realtime, docs_api_sse_stream, docs_api_longpoll, docs_api_webhooks [INFERRED 0.75]
- **Inbound mail pipeline: SMTP ports -> DNS deliverability -> event streaming** — docker_compose_port_mappings, docs_operations_smtp_dns_setup, docs_operations_event_streaming [INFERRED 0.75]
- **Per-domain DNS management surfaced in admin UI and operations guide** — docs_ui_ux_update_notes_per_domain_dns, docs_operations_smtp_dns_setup, docs_ui_ux_update_notes_dokumanlar_center [INFERRED 0.75]

## Communities (23 total, 3 thin omitted)

### Community 0 - "React App Shell"
Cohesion: 0.06
Nodes (35): dompurify, AdminBulkStudio, AdminPanel, App(), AuthPage, AutomationCenter, BulkInbox, BulkStudio (+27 more)

### Community 1 - "OTP Detection & Email Tests"
Cohesion: 0.06
Nodes (42): assert, cases, { extractOtp, extractOtpFromEmail }, decodedAddress(), { emailEvents, waitForEmail }, express, { extractOtpFromEmail }, { getDb } (+34 more)

### Community 2 - "Admin UI Components"
Cohesion: 0.11
Nodes (26): AdminEmptyState(), AdminInfoRow(), AdminPanelCard(), AdminStatCard(), AdminToolbar(), formatAdminDate(), formatRelativeTime(), formatRetention() (+18 more)

### Community 3 - "Admin API Routes & Auth Middleware"
Cohesion: 0.07
Nodes (31): hasApiScope(), requireApiScope(), buildDomainDnsDefaults(), { createApiKey, listApiKeys, VALID_SCOPES }, enrichMailWithOtp(), express, { extractOtpFromEmail, stripHtml }, { getDb } (+23 more)

### Community 4 - "Client Dependencies"
Cohesion: 0.05
Nodes (36): autoprefixer, allowScripts, esbuild@0.21.5, dependencies, lucide-react, react, react-dom, recharts (+28 more)

### Community 5 - "API Key System Tests"
Cohesion: 0.12
Nodes (30): assert, { createApiKey }, { getApiKeyPrincipal, getRawApiKey }, { initDatabase, getDb }, run(), all(), dataDir, exec() (+22 more)

### Community 6 - "UI Design Brief"
Cohesion: 0.10
Nodes (26): AccountEditorModal, AccountPanel, AddressBar, AdminBulkStudio, AdminPanel, AdminPrimitives, API Surface (UI-called endpoints), AuthPage (+18 more)

### Community 7 - "API Documentation"
Cohesion: 0.10
Nodes (24): Addresses Endpoints (/api/addresses), Admin Endpoints (/api/admin), Auth Endpoints (/api/auth), Email Change Flow, Emails Endpoints (/api/emails), JWT Bearer Authentication, OTP Extraction, Temp Mail API Overview (+16 more)

### Community 8 - "Auth API Routes"
Cohesion: 0.11
Nodes (18): bcrypt, createMailTransporter(), createSession(), crypto, ensureUserPreferences(), express, fs, getClientMeta() (+10 more)

### Community 9 - "Server Dependencies"
Cohesion: 0.09
Nodes (23): bcryptjs, cors, dotenv, express, jsonwebtoken, mailparser, node-cron, nodemailer (+15 more)

### Community 10 - "Operations & Deployment Docs"
Cohesion: 0.12
Nodes (23): Healthcheck curl /api/health, Port mappings 25:25 (SMTP) and 3001:3001 (API), SMTP relay env config (SMTP_RELAY_HOST/PORT/SECURE/USER/PASS), tempmail-data volume mounted at /app/data, tempmail Docker service, Additive migration policy, API key lifecycle (create, store as CUSTOM_TEMPMAIL_TOKEN, track, revoke, admin master key), API.md reference document (+15 more)

### Community 11 - "Addresses API Routes"
Cohesion: 0.12
Nodes (16): assertAddressQuota(), crypto, express, { generateUsername }, getAddressCount(), { getApiKeyPrincipal, hasApiScope, requireApiScope }, { getDb }, getOptionalUser() (+8 more)

### Community 12 - "Root Package Scripts"
Cohesion: 0.11
Nodes (18): concurrently, description, devDependencies, concurrently, name, private, scripts, build (+10 more)

### Community 13 - "Server Entry Point"
Cohesion: 0.12
Nodes (15): API_PORT, { apiContract, rateLimit }, app, cors, express, http, { initDatabase }, main() (+7 more)

### Community 14 - "Coolify Deployment Guide"
Cohesion: 0.18
Nodes (12): Coolify Deployment Guide, DNS records for mail delivery, docker-compose.yaml naming requirement, Port 25 SMTP direct host mapping, Project structure (Coolify view), REST API endpoints, DNS setup requirements, Environment variables configuration (+4 more)

### Community 15 - "DB Verification Script"
Cohesion: 0.32
Nodes (7): fs, initSqlJs, main(), path, rows(), source, target

### Community 17 - "User Avatars"
Cohesion: 0.83
Nodes (4): User 1 Avatar (1783428274030), User Avatar Concept, User 1 Avatar (1783428282542), User 4 Avatar (1783440354935)

## Ambiguous Edges - Review These
- `Package Quota System` → `Mailbox Ownership Check`  [AMBIGUOUS]
  docs/API.md · relation: conceptually_related_to

## Knowledge Gaps
- **175 isolated node(s):** `statusline.sh script`, `AuthPage`, `AdminPanel`, `BulkStudio`, `BulkInbox` (+170 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Package Quota System` and `Mailbox Ownership Check`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `getDb()` connect `API Key System Tests` to `Admin API Routes & Auth Middleware`, `Auth API Routes`, `Addresses API Routes`, `OTP Detection & Email Tests`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Client Dependencies` to `React App Shell`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `getDb()` (e.g. with `db.js` and `all()`) actually correct?**
  _`getDb()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `statusline.sh script`, `AuthPage`, `AdminPanel` to the rest of the system?**
  _175 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.056261343012704176 - nodes in this community are weakly interconnected._
- **Should `OTP Detection & Email Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.06352941176470588 - nodes in this community are weakly interconnected._