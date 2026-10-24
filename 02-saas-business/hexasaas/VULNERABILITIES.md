# HexaSaaS — Vulnerability Map (LAB 11 scored registry)

> ⚠️ **LOCAL PRACTICE ONLY.** This app is deliberately vulnerable. Never deploy it publicly.

HexaSaaS is **Lab 11** of the HexaCyberLab 110-lab series. The 26 findings below are the **scored tests**: each one is detected by the server from the real exploit effect (see `/tests` in the app). The app also carries further unscored flaws from its original build (unsigned webhooks, API keys listed to every role, verbose SQL/stack errors, academy certificates from URL parameters, store/reservation price tampering) — the in-app `/lab-guide` and `SAAS-CATEGORIES-MAP.md` describe those.

**Registry: 26 scored tests across 9 features.**

## Login & Authentication (5 tests)

### 1. SQL Injection — Legacy SSO Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** POST /login/legacy (Partner SSO form on the login page)
- **How it is exploited:** In the legacy email field enter: ' OR '1'='1' -- (with a trailing space) and any password. The query matches the first user in the table and logs you in as them.
- **Business impact:** On a real SaaS, an injectable login is a full account-takeover door: the attacker signs in as the first account (often an admin) without any password, and every tenant behind that account is exposed.
- **Fix:** Use parameterised queries on every authentication path; remove or rewrite legacy endpoints; add injection regression tests for all login routes.

### 2. Brute Force — No Login Rate Limiting
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** POST /login, POST /login/legacy, POST /api/login — no rate limit or lockout anywhere
- **How it is exploited:** After 10 accepted failures the lab marks this test — in a real attack the script just keeps going until the password falls.
- **Business impact:** A real client’s users reuse weak passwords; unlimited guesses mean account takeovers at scale, starting with the workspace owner.
- **Fix:** Add per-account and per-IP throttling with exponential backoff, lockout and alerting; offer MFA for privileged roles.

### 3. User Enumeration — Forgot-Password Oracle
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** POST /forgot — different response for existing vs non-existing emails
- **How it is exploited:** That difference is the oracle: an attacker can harvest your real user list before attacking it.
- **Business impact:** Attackers enumerate a client’s real employee and customer emails, then target exactly those accounts with phishing and password spraying.
- **Fix:** Return one generic response for all reset requests regardless of whether the account exists.

### 4. Password Reset — Predictable Token & Host-Header Poisoning
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** POST /forgot (reset link built from the Host header) + GET/POST /reset — token = md5(email)
- **How it is exploited:** Or submit the forgot form with a Host header you control (Burp) — the emailed link is built on YOUR domain, token included.
- **Business impact:** Anyone can reset any user’s password — including the workspace owner and the platform admin — leading to full tenant takeover.
- **Fix:** Generate reset tokens with a CSPRNG, store hashed, expire within an hour, single-use; build links from the configured base URL only.

### 5. Client-Trusted Session Cookie — Tenant Switch & Superadmin Flip
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** The `hexasaas_session` cookie (base64 JSON) on every authenticated route; /superadmin trusts its flag
- **How it is exploited:** Change tenant_id to 2 to work inside Globex, or set is_superadmin to 1 and open /superadmin.
- **Business impact:** Any user becomes any tenant’s member — or the platform super-admin — by editing a cookie: total platform compromise from a free account.
- **Fix:** Use opaque server-side session IDs (or signed, server-verified tokens) and authorise from database state on every request.

## Registration & Invites (4 tests)

### 6. Mass Assignment — Registration & Workspace Settings
- **OWASP:** API3 Mass Assignment · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /register (plan / seats / is_superadmin) and POST /settings (plan / seats)
- **How it is exploited:** At register you can even add is_superadmin=1. The binder copies body fields straight onto the record.
- **Business impact:** Free signups upgrade themselves to Enterprise with 999 seats — or to platform admin. Direct revenue loss and total compromise.
- **Fix:** Explicit per-endpoint field allowlists; server-side defaults for plan, seats and roles; reject unexpected privilege fields.

### 7. Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Location:** POST /register, POST /invite/accept, POST /reset — no password policy anywhere
- **How it is exploited:** It is accepted. Every brute-force and credential-stuffing attack gets easier from there.
- **Business impact:** Users who pick ‘x’ or ‘123’ hand attackers their accounts; in a SaaS those accounts hold the whole team’s data.
- **Fix:** Enforce a minimum length (>=10) and block known-breached passwords at registration, invite acceptance and reset.

### 8. Invite Links — Predictable Token, Any-Email Acceptance, Replay
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** GET/POST /invite/accept — token = md5(tenant_id + email); email never checked; link reusable
- **How it is exploited:** Accept under a completely different email — it still works. Then replay the same link to create a second account.
- **Business impact:** Anyone who can guess an invited email joins the workspace with the invited role — a silent insider account inside a client’s team.
- **Fix:** CSPRNG tokens (>=128-bit), stored hashed, bound to tenant + email, expiring and single-use; verify the acceptance email matches the invite.

### 9. Cross-Tenant Invite Minting
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** POST /invites — the workspace comes from the form field tenant_id, not the session
- **How it is exploited:** You just minted an invite into Globex — with an Admin role if you asked for one.
- **Business impact:** A low-privilege user of one customer plants an admin account inside another customer’s workspace — a complete tenant-isolation breach.
- **Fix:** Derive tenant scope from the session server-side; ignore or reject client-supplied tenant identifiers on writes.

## Team & Roles (2 tests)

### 10. Privilege Escalation — Any Member Can Set Any Role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** POST /team/role — caller role and target tenant never checked
- **How it is exploited:** It works. It even works on users in other tenants, because the target is loaded by ID alone.
- **Business impact:** The lowliest Viewer becomes Owner in one request — then exports, deletes or ransoms the workspace.
- **Fix:** Require Owner/Admin role server-side for role changes; scope targets to the caller’s tenant; audit all role changes.

### 11. Cross-Site Request Forgery on State-Changing Forms
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /settings, POST /team/role, POST /billing/plan — no CSRF token on any state-changing form
- **How it is exploited:** In the lab, send the POST with a foreign Origin and without the app's own hx_tok marker cookie — the change is accepted all the same.
- **Business impact:** A malicious page visited by a workspace owner silently renames, upgrades or re-roles their workspace — full account actions without the password.
- **Fix:** Per-session CSRF tokens on all state changes, SameSite=Lax/Strict session cookies, Origin/Referer verification as backup.

## Projects, Tasks & Files (2 tests)

### 12. Cross-Tenant IDOR — Projects, Tasks, Files & Invoices
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** GET /projects/:id, GET /tasks/:id, GET /files/:id/download, GET /billing/invoices/:id
- **How it is exploited:** Same story at /tasks/<id> and /files/<id>/download — try Globex's file IDs for the salary-bands document.
- **Business impact:** One customer reads another customer’s projects, tasks and files — in production this is a reportable data breach and a lost enterprise contract.
- **Fix:** Scope all object queries by session tenant_id; return 404 on cross-tenant access; add tenant-isolation tests.

### 13. Stored XSS — Comments, Workspace Name & Chat
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /tasks/:id/comments, workspace name via POST /register + POST /settings, POST /apps/chat (Team Chat module)
- **How it is exploited:** Or name a workspace with a script payload — it fires in every member's sidebar and in the super-admin panel. Chat message bodies render raw too.
- **Business impact:** Attackers plant payloads that fire in the browsers of a client’s whole team — session theft, actions performed as the victim, admin compromise.
- **Fix:** Contextual output encoding on all user content at render; sanitise stored rich text; add a Content-Security-Policy.

## Search & Reports (2 tests)

### 14. SQL Injection — Project Search
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** GET /projects/search?q= — term concatenated into the SQL string
- **How it is exploited:** The projects table has 6 columns — a UNION SELECT can pull users (emails, hashes) into the results page.
- **Business impact:** Full database extraction through a search box: every tenant’s projects first, then user credentials for offline cracking.
- **Fix:** Parameterised queries everywhere; generic error messages; least-privilege database access.

### 15. SQL Injection — Report Sort & Analytics Report Builder
- **OWASP:** A03 Injection · **Difficulty:** Advanced · **Severity (report):** High
- **Location:** GET /reports?sort= and GET /apps/analytics/report?sort= — ORDER BY concatenated
- **How it is exploited:** The Analytics report builder (/apps/analytics/report) concatenates both q and sort — with 3 output columns, UNION SELECT fits there.
- **Business impact:** Attackers extract data row by row through sorting behaviour, or dump tables via the report builder — all through ‘safe’ reporting features.
- **Fix:** Allowlist sort columns and directions; parameterise search terms; suppress SQL errors to users.

## Billing & Plans (2 tests)

### 16. Pro Features Gated Only in the UI
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Location:** GET /reports, GET /integrations, GET /export — Pro features hidden in the UI only (Free plan)
- **How it is exploited:** All three work. The server never asks what plan you're on.
- **Business impact:** Every free user gets the paid product for $0 — and ‘hidden’ features usually hide data access too.
- **Fix:** Enforce plan entitlements in server middleware on every gated route.

### 17. Billing Logic Abuse — Price Tampering, Trial & Seat Limits
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /billing/plan (price from the form), POST /billing/trial-extend (unlimited), invite joins ignore the seat limit
- **How it is exploited:** Any one of these proves the point: billing state must be computed server-side, never trusted from the request or left unchecked.
- **Business impact:** Customers self-serve Enterprise at $0, trials never convert, and per-seat pricing collapses — direct, silent revenue loss.
- **Fix:** Recompute prices from the plan table server-side; enforce trial rules and seat limits in transactions at join/accept time.

## API, Integrations & AI (4 tests)

### 18. API BOLA — Cross-Tenant API Access & User Dump
- **OWASP:** API1 BOLA / API3 Excessive Data · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Location:** GET /api/projects (?tenant_id=), /api/projects/:id, /api/tasks/:id, /api/users, /api/apps/<slug>[/<id>]
- **How it is exploited:** And GET /api/users returns every user of every workspace — password hashes included. Module APIs (/api/apps/hr?tenant_id=2) behave the same.
- **Business impact:** Programmatic, bulk theft of a whole platform’s data — the API version of the breach is faster and quieter than clicking through the UI.
- **Fix:** Derive tenant from the token server-side; ignore client tenant_id; enforce per-object ownership; minimise returned fields.

### 19. API Credential Attacks — Forged Tokens & Read-Key Writes
- **OWASP:** API2 Broken Authentication · **Difficulty:** Advanced · **Severity (report):** Critical
- **Location:** Bearer tokens (alg=none accepted; HMAC secret is a guessable word) and X-Api-Key (read scope can write)
- **How it is exploited:** Or skip forging: Acme's READ-only API key (find it via /debug or the integrations page) can POST /api/projects — scope is stored but never enforced, and the body chooses the tenant.
- **Business impact:** Attackers mint tokens as any user — including other tenants’ owners — or turn a leaked read-only key into full write access.
- **Fix:** Strong random secret from config (never exposed); pinned HS256 verification with expiry; enforce key scope per route.

### 20. Server-Side Request Forgery — Webhooks, Import, AI & Scanner
- **OWASP:** A10 SSRF · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /webhooks/:id/test, POST /import-url, POST /apps/ai-assistant/summarise, POST /apps/scanner
- **How it is exploited:** Internal metadata and admin endpoints answer the same way. The server is your proxy into its own network.
- **Business impact:** Attackers reach cloud metadata (credentials), internal admin panels and localhost services that were never meant to be public.
- **Fix:** Allowlist permitted hosts and schemes; block loopback/private/link-local ranges post-resolution; disable or re-validate redirects.

### 21. AI Assistant — Prompt Injection & Cross-Tenant Knowledge Leak
- **OWASP:** LLM01 Prompt Injection · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /apps/ai-assistant/chat — one system prompt holds every workspace’s knowledge snippets
- **How it is exploited:** It prints everything — including Globex's confidential discount code and acquisition secret — to an Acme user.
- **Business impact:** Any customer extracts other customers’ confidential data through the AI feature — a breach the vendor shipped as a feature.
- **Fix:** Per-tenant retrieval scoping; instruction/data separation; output filtering for secrets; never place other tenants’ data in context.

## Apps Modules (2 tests)

### 22. Cross-Tenant Module Records — Read & Write IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** GET /apps/<slug>/<id> for all 19 generic modules + bespoke actions: contract sign/download, clinic lab report, booking cancel, property edit, wallet transaction
- **How it is exploited:** Writes too: cancel Globex's booking, sign their contract, or edit their property listing — all by ID.
- **Business impact:** Each module repeats the breach in its own data: salaries, patient notes, contracts, deals — one missing check per category.
- **Fix:** Scope all module queries and actions by session tenant; 404 on cross-tenant IDs; isolation tests per module.

### 23. Module Money Tampering — Wallet & Finance
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** POST /apps/wallet/transfer (negative amount) and POST /apps/finance/:id/pay (amount from the form)
- **How it is exploited:** Pay it with amount=1 — the invoice flips to Paid at your price.
- **Business impact:** Negative transfers mint money out of other tenants; $1 ‘payments’ settle six-figure invoices — direct financial loss and corrupted books.
- **Fix:** Validate amount > 0 and sufficient funds; read payable amounts from server records; atomic ledger updates.

## Platform, Sharing & Exposure (3 tests)

### 24. Unauthenticated Exposure — /debug & /backup.sql
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner · **Severity (report):** Critical
- **Location:** GET /debug and GET /backup.sql — reachable with no login at all
- **How it is exploited:** Open /backup.sql — a full dump of tenants, users (hashes), projects and API keys downloads as a file.
- **Business impact:** One unauthenticated request hands attackers the entire database and the secret that forges every API token — game over in seconds.
- **Fix:** Remove debug/backup endpoints from production builds; if retained, require admin auth + IP allowlist; generic error pages.

### 25. Guessable Public Tokens — Share, Tracking & Doc Links
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** GET /share/sh_<n>, /d/doc_<id>, /track/trk_<id>, /apps/analytics/public/dash_<tenant_id>, /apps/campaigns/unsubscribe?token=unsub_<id>
- **How it is exploited:** Sequential identifiers are not tokens. Anything enumerable will be enumerated.
- **Business impact:** Attackers harvest customer PII (shipment recipients, private documents, dashboards) at scale with no account at all.
- **Fix:** Use >=128-bit random tokens for all public links, store hashed, support expiry and revocation; minimise data shown publicly.

### 26. CSV Export — Cross-Tenant Export & Formula Injection
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (report):** High
- **Location:** GET /export — honours ?tenant_id= and writes task titles into the CSV raw (formula injection)
- **How it is exploited:** The formula executes in the victim's spreadsheet app. Two flaws, one download.
- **Business impact:** Competitors download a client’s full task list; a booby-trapped export runs formulas on an employee’s machine when opened.
- **Fix:** Scope exports to the session tenant; prefix/escape cells beginning with = + - @; audit export access.
