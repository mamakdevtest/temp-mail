# Graph Report - temp-mail  (2026-07-07)

## Corpus Check
- 35 files · ~42,135 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 286 nodes · 384 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f702141`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_admin.js|admin.js]]
- [[_COMMUNITY_📧 TempMail - Geçici E-posta Uygulaması|📧 TempMail - Geçici E-posta Uygulaması]]
- [[_COMMUNITY_db.js|db.js]]
- [[_COMMUNITY_App.jsx|App.jsx]]
- [[_COMMUNITY_🚀 Coolify ile Deployment Rehberi|🚀 Coolify ile Deployment Rehberi]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_AdminPanel.jsx|AdminPanel.jsx]]
- [[_COMMUNITY_auth.js|auth.js]]
- [[_COMMUNITY_addresses.js|addresses.js]]
- [[_COMMUNITY_☁️ Coolify ile Deployment|☁️ Coolify ile Deployment]]
- [[_COMMUNITY_MS Temp Mail UIUX Update Notes|MS Temp Mail UI/UX Update Notes]]
- [[_COMMUNITY_statusline.sh|statusline.sh]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 16 edges
2. `🚀 Coolify ile Deployment Rehberi` - 16 edges
3. `📧 TempMail - Geçici E-posta Uygulaması` - 11 edges
4. `AdminPanel()` - 10 edges
5. `☁️ Coolify ile Deployment` - 9 edges
6. `scripts` - 8 edges
7. `stripHtml()` - 8 edges
8. `extractOtp()` - 8 edges
9. `initDatabase()` - 7 edges
10. `Kurulum` - 7 edges

## Surprising Connections (you probably didn't know these)
- `AdminPanel()` --indirect_call--> `Inbox()`  [INFERRED]
  client/src/components/AdminPanel.jsx → client/src/components/Inbox.jsx
- `authMiddleware()` --calls--> `getDb()`  [EXTRACTED]
  server/routes/auth.js → server/db.js
- `main()` --calls--> `initDatabase()`  [EXTRACTED]
  server/index.js → server/db.js
- `processIncomingMail()` --calls--> `getDb()`  [EXTRACTED]
  server/services/smtpServer.js → server/db.js
- `EmailView()` --references--> `dompurify`  [EXTRACTED]
  client/src/components/EmailView.jsx → client/package.json

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "admin.js"
Cohesion: 0.08
Nodes (29): buildDomainDnsDefaults(), enrichMailWithOtp(), express, { extractOtp, stripHtml }, { getDb }, getDefaultServerIp(), jwt, { manualCleanup } (+21 more)

### Community 1 - "📧 TempMail - Geçici E-posta Uygulaması"
Cohesion: 0.07
Nodes (28): 1. Ön Gereksinimler, 2. Projeyi İndirin, 3. .env Dosyasını Düzenleyin, 4. Bağımlılıkları Kurun, 5. Uygulamayı Başlatın, 6. İlk Kullanım, Admin Paneli ile Otomatik DNS Şablonu, Admin (`x-admin-password` header gerekli) (+20 more)

### Community 2 - "db.js"
Cohesion: 0.11
Nodes (24): all(), dataDir, DB_PATH, exec(), fs, get(), getDb(), initDatabase() (+16 more)

### Community 3 - "App.jsx"
Cohesion: 0.11
Nodes (14): App(), useBeep(), AddressBar(), AuthPage(), Inbox(), EmailViewSkeleton(), InboxSkeleton(), GUEST_PACKAGE (+6 more)

### Community 4 - "🚀 Coolify ile Deployment Rehberi"
Cohesion: 0.07
Nodes (26): Adım 10: İlk Kullanım, Adım 11: Doğrulama, Adım 1: Projeyi GitHub'a Pushlayın, Adım 2: Coolify'da Yeni Kaynak Oluşturun, Adım 3: Uygulama Tipi Seçin, Adım 4: Docker Compose Ayarları, Adım 5: Domain Yapılandırması, Adım 6: Port 25 Ayarı (SMTP) (+18 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (26): dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, mailparser, node-cron (+18 more)

### Community 6 - "devDependencies"
Cohesion: 0.08
Nodes (24): dependencies, dompurify, lucide-react, react, react-dom, recharts, socket.io-client, devDependencies (+16 more)

### Community 7 - "AdminPanel.jsx"
Cohesion: 0.19
Nodes (17): AccountPanel(), buildAddressDrafts(), AdminEmptyState(), AdminInfoRow(), AdminPanelCard(), AdminStatCard(), AdminToolbar(), formatAdminDate() (+9 more)

### Community 8 - "auth.js"
Cohesion: 0.10
Nodes (19): authMiddleware(), bcrypt, createMailTransporter(), createSession(), crypto, ensureUserPreferences(), express, fs (+11 more)

### Community 9 - "addresses.js"
Cohesion: 0.17
Nodes (7): crypto, express, { generateUsername }, { getDb }, router, crypto, generateUsername()

### Community 10 - "☁️ Coolify ile Deployment"
Cohesion: 0.22
Nodes (9): Adım 1: Projeyi Git Repo'suna Yükleyin, Adım 2: Coolify'da Yeni Kaynak Oluşturun, Adım 3: Domain Ayarı, Adım 4: Port Mapping, Adım 5: Environment Variables, Adım 6: Deploy, Adım 7: DNS Ayarları, Adım 8: Test (+1 more)

### Community 11 - "MS Temp Mail UI/UX Update Notes"
Cohesion: 0.29
Nodes (6): Backend additions, Branding, Domain DNS management, Implemented fixes, MS Temp Mail UI/UX Update Notes, Notes

## Knowledge Gaps
- **148 isolated node(s):** `statusline.sh script`, `name`, `private`, `version`, `type` (+143 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `db.js` to `admin.js`, `addresses.js`, `auth.js`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `EmailView()` connect `devDependencies` to `App.jsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `getDb()` (e.g. with `db.js` and `all()`) actually correct?**
  _`getDb()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `statusline.sh script`, `name`, `private` to the rest of the system?**
  _148 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08408408408408409 - nodes in this community are weakly interconnected._
- **Should `📧 TempMail - Geçici E-posta Uygulaması` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11083743842364532 - nodes in this community are weakly interconnected._