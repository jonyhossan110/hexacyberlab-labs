# HexaSaaS — Practice Guide (LAB 11)

> ⚠️ **LOCAL PRACTICE ONLY.** Deliberately vulnerable — run on localhost only, never deploy.

Work top to bottom. Every challenge is scored by the server: do the exploit for real and the test ticks itself on `/tests`. Each challenge lists a measurable objective and three graded hints — try before you open the next hint, and remember the **Lab Coach** (bottom-right of every page) unlocks step-by-step help for a feature after you have genuinely tried it 3 times.

**Setup:** `node server.js` → http://localhost:3020 → unlock with the Lab 10 completion key → log in as `alice@acme.test` / `alice123` (Owner, Acme Inc, Free plan). Burp Suite on 127.0.0.1:8080 is the intended companion tool.

## Feature: Login & Authentication

### Challenge 1 — SQL Injection — Legacy SSO Login Bypass
- **Objective:** Complete the scored test “SQL Injection — Legacy SSO Login Bypass” (A03 Injection, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /login/legacy (Partner SSO form on the login page)
- **Hint 1:** The login page hides a second, older sign-in form — the 'Partner SSO (legacy)' form. Legacy code rarely got the security review the main login did.
- **Hint 2:** The legacy form builds its SQL query by gluing your input straight into the string. A quote character breaks out of the email value.
- **Hint 3:** In the legacy email field enter: ' OR '1'='1' -- (with a trailing space) and any password. The query matches the first user in the table and logs you in as them.
- **Lesson:** Any query built by string concatenation is injectable — including forgotten legacy endpoints that bypass the reviewed login path.

### Challenge 2 — Brute Force — No Login Rate Limiting
- **Objective:** Complete the scored test “Brute Force — No Login Rate Limiting” (A07 Authentication Failures, Beginner) so it shows ✅ on `/tests`.
- **Where:** POST /login, POST /login/legacy, POST /api/login — no rate limit or lockout anywhere
- **Hint 1:** Nothing slows you down on the login form — no lockout, no delay, no CAPTCHA.
- **Hint 2:** Script ten wrong passwords for alice@acme.test in a row and watch every one get processed instantly.
- **Hint 3:** After 10 accepted failures the lab marks this test — in a real attack the script just keeps going until the password falls.
- **Lesson:** Without throttling, online password guessing is free and quiet — weak passwords fall in minutes.

### Challenge 3 — User Enumeration — Forgot-Password Oracle
- **Objective:** Complete the scored test “User Enumeration — Forgot-Password Oracle” (A07 Authentication Failures, Beginner) so it shows ✅ on `/tests`.
- **Where:** POST /forgot — different response for existing vs non-existing emails
- **Hint 1:** Ask the forgot-password form about two addresses: one that exists, one that doesn't.
- **Hint 2:** The two answers are different — one says the link was sent, the other admits no account exists.
- **Hint 3:** That difference is the oracle: an attacker can harvest your real user list before attacking it.
- **Lesson:** Auth-adjacent endpoints must answer uniformly; a differing response turns a password-reset form into a user-directory lookup.

### Challenge 4 — Password Reset — Predictable Token & Host-Header Poisoning
- **Objective:** Complete the scored test “Password Reset — Predictable Token & Host-Header Poisoning” (A07 Authentication Failures, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /forgot (reset link built from the Host header) + GET/POST /reset — token = md5(email)
- **Hint 1:** The reset 'token' is not random — it is derived from something public about the account. Think hashes.
- **Hint 2:** Compute md5 of the victim's email address and compare it with the token in a real reset link.
- **Hint 3:** Or submit the forgot form with a Host header you control (Burp) — the emailed link is built on YOUR domain, token included.
- **Lesson:** Reset tokens must be random, single-use and short-lived, and reset links must be built from a fixed canonical URL — never from request data.

### Challenge 5 — Client-Trusted Session Cookie — Tenant Switch & Superadmin Flip
- **Objective:** Complete the scored test “Client-Trusted Session Cookie — Tenant Switch & Superadmin Flip” (A01 Broken Access Control, Intermediate) so it shows ✅ on `/tests`.
- **Where:** The `hexasaas_session` cookie (base64 JSON) on every authenticated route; /superadmin trusts its flag
- **Hint 1:** Your session cookie is just base64. Decode it (Burp Decoder) and read what the server trusts from it.
- **Hint 2:** The cookie carries tenant_id, role and is_superadmin — and the server never re-checks them against the database.
- **Hint 3:** Change tenant_id to 2 to work inside Globex, or set is_superadmin to 1 and open /superadmin.
- **Lesson:** Session state the client can edit will be edited. Roles and tenant membership must be re-read from server-side state on every request.

## Feature: Registration & Invites

### Challenge 6 — Mass Assignment — Registration & Workspace Settings
- **Objective:** Complete the scored test “Mass Assignment — Registration & Workspace Settings” (API3 Mass Assignment, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /register (plan / seats / is_superadmin) and POST /settings (plan / seats)
- **Hint 1:** The register and settings forms show only a few fields — the server accepts more than the form shows.
- **Hint 2:** Add plan=Enterprise and seats=999 to a settings POST (or the register POST) in Burp and watch them stick.
- **Hint 3:** At register you can even add is_superadmin=1. The binder copies body fields straight onto the record.
- **Lesson:** Bind only allowlisted fields per endpoint; plan, seats and privilege flags must never arrive from the client.

### Challenge 7 — Weak Password Policy — 1-Character Passwords Accepted
- **Objective:** Complete the scored test “Weak Password Policy — 1-Character Passwords Accepted” (A07 Authentication Failures, Beginner) so it shows ✅ on `/tests`.
- **Where:** POST /register, POST /invite/accept, POST /reset — no password policy anywhere
- **Hint 1:** Create a workspace or accept an invite with the shortest password the form lets you submit.
- **Hint 2:** There is no policy at all — try a single character.
- **Hint 3:** It is accepted. Every brute-force and credential-stuffing attack gets easier from there.
- **Lesson:** A password policy is cheap defence-in-depth: minimum length and breached-password checks remove the weakest tier of accounts.

### Challenge 8 — Invite Links — Predictable Token, Any-Email Acceptance, Replay
- **Objective:** Complete the scored test “Invite Links — Predictable Token, Any-Email Acceptance, Replay” (A07 Authentication Failures, Intermediate) so it shows ✅ on `/tests`.
- **Where:** GET/POST /invite/accept — token = md5(tenant_id + email); email never checked; link reusable
- **Hint 1:** Invite tokens look random but follow a recipe: md5(tenant_id + email). Henry's pending invite is computable right now.
- **Hint 2:** Compute md5 of the string 1henry@acme.test and open /invite/accept?token=<that hash>.
- **Hint 3:** Accept under a completely different email — it still works. Then replay the same link to create a second account.
- **Lesson:** Invite tokens are credentials: they must be unguessable, bound to the invited email, expiring and single-use.

### Challenge 9 — Cross-Tenant Invite Minting
- **Objective:** Complete the scored test “Cross-Tenant Invite Minting” (A01 Broken Access Control, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /invites — the workspace comes from the form field tenant_id, not the session
- **Hint 1:** The invite form posts to /invites. What decides WHICH workspace the invite is for — your session, or a form field?
- **Hint 2:** Add tenant_id=2 to the invite POST as an Acme member.
- **Hint 3:** You just minted an invite into Globex — with an Admin role if you asked for one.
- **Lesson:** The tenant for every write must come from the authenticated session, never from request parameters.

## Feature: Team & Roles

### Challenge 10 — Privilege Escalation — Any Member Can Set Any Role
- **Objective:** Complete the scored test “Privilege Escalation — Any Member Can Set Any Role” (A01 Broken Access Control, Beginner) so it shows ✅ on `/tests`.
- **Where:** POST /team/role — caller role and target tenant never checked
- **Hint 1:** The /team page shows a role dropdown. Who is allowed to submit it — check what the server verifies, not what the UI shows.
- **Hint 2:** Log in as Erin (Viewer) or Dave (Member) and POST /team/role for your own user with role=Owner.
- **Hint 3:** It works. It even works on users in other tenants, because the target is loaded by ID alone.
- **Lesson:** Authorisation must be checked on the server for every privileged action: the caller’s role AND the target’s tenant.

### Challenge 11 — Cross-Site Request Forgery on State-Changing Forms
- **Objective:** Complete the scored test “Cross-Site Request Forgery on State-Changing Forms” (A01 Broken Access Control, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /settings, POST /team/role, POST /billing/plan — no CSRF token on any state-changing form
- **Hint 1:** No form in this app carries an anti-CSRF token, and the session cookie has no SameSite attribute.
- **Hint 2:** Build a tiny auto-submitting HTML form on another origin that POSTs to /settings or /team/role — it only needs the victim's browser to visit it while logged in.
- **Hint 3:** In the lab, send the POST with a foreign Origin and without the app's own hx_tok marker cookie — the change is accepted all the same.
- **Lesson:** State changes need unforgeable tokens; cookies alone do not prove a request was intended by the user.

## Feature: Projects, Tasks & Files

### Challenge 12 — Cross-Tenant IDOR — Projects, Tasks, Files & Invoices
- **Objective:** Complete the scored test “Cross-Tenant IDOR — Projects, Tasks, Files & Invoices” (A01 Broken Access Control, Beginner) so it shows ✅ on `/tests`.
- **Where:** GET /projects/:id, GET /tasks/:id, GET /files/:id/download, GET /billing/invoices/:id
- **Hint 1:** Object IDs are global and sequential. Your project list shows only yours — the detail pages were never told that rule.
- **Hint 2:** As Acme, open /projects/4 — Globex's confidential 'Internal CRM' project.
- **Hint 3:** Same story at /tasks/<id> and /files/<id>/download — try Globex's file IDs for the salary-bands document.
- **Lesson:** Every object query must be scoped by the caller’s tenant; unscoped primary-key lookups are the #1 SaaS data-breach pattern.

### Challenge 13 — Stored XSS — Comments, Workspace Name & Chat
- **Objective:** Complete the scored test “Stored XSS — Comments, Workspace Name & Chat” (A03 Injection, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /tasks/:id/comments, workspace name via POST /register + POST /settings, POST /apps/chat (Team Chat module)
- **Hint 1:** Some text you type is rendered back RAW. Comments are one place; there are two more — think about what every member (and the super-admin) sees.
- **Hint 2:** Post a comment containing a script payload on a task, then open the task as a teammate.
- **Hint 3:** Or name a workspace with a script payload — it fires in every member's sidebar and in the super-admin panel. Chat message bodies render raw too.
- **Lesson:** Output encoding must be contextual and universal — one unescaped render point poisons every viewer, including admins.

## Feature: Search & Reports

### Challenge 14 — SQL Injection — Project Search
- **Objective:** Complete the scored test “SQL Injection — Project Search” (A03 Injection, Intermediate) so it shows ✅ on `/tests`.
- **Where:** GET /projects/search?q= — term concatenated into the SQL string
- **Hint 1:** The project search glues your term into a LIKE clause. Baseline first: search a word only Acme uses, then one only Globex uses — notice the search never scoped to your tenant.
- **Hint 2:** Add a quote and boolean logic: ' OR '1'='1 — the result set grows to every workspace's projects.
- **Hint 3:** The projects table has 6 columns — a UNION SELECT can pull users (emails, hashes) into the results page.
- **Lesson:** Parameterise every query — search boxes are database input, and LIKE clauses are a classic injection point.

### Challenge 15 — SQL Injection — Report Sort & Analytics Report Builder
- **Objective:** Complete the scored test “SQL Injection — Report Sort & Analytics Report Builder” (A03 Injection, Advanced) so it shows ✅ on `/tests`.
- **Where:** GET /reports?sort= and GET /apps/analytics/report?sort= — ORDER BY concatenated
- **Hint 1:** ORDER BY can't be parameterised — so this app just concatenates the sort parameter. /reports?sort= is the first surface.
- **Hint 2:** Try a sort value that isn't a column and read the leaked SQL error. Then try a CASE WHEN expression to sort by a secret condition.
- **Hint 3:** The Analytics report builder (/apps/analytics/report) concatenates both q and sort — with 3 output columns, UNION SELECT fits there.
- **Lesson:** Sort parameters need strict allowlists; anything else is SQL injection with extra steps.

## Feature: Billing & Plans

### Challenge 16 — Pro Features Gated Only in the UI
- **Objective:** Complete the scored test “Pro Features Gated Only in the UI” (A01 Broken Access Control, Beginner) so it shows ✅ on `/tests`.
- **Where:** GET /reports, GET /integrations, GET /export — Pro features hidden in the UI only (Free plan)
- **Hint 1:** Acme is on the Free plan — the sidebar hides Reports, Integrations and Export. Hiding is not checking.
- **Hint 2:** Type the URLs directly as a Free-plan user: /reports, /integrations, /export.
- **Hint 3:** All three work. The server never asks what plan you're on.
- **Lesson:** Entitlements are server-side authorisation decisions. UI hiding is a UX choice, never a control.

### Challenge 17 — Billing Logic Abuse — Price Tampering, Trial & Seat Limits
- **Objective:** Complete the scored test “Billing Logic Abuse — Price Tampering, Trial & Seat Limits” (A04 Insecure Design, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /billing/plan (price from the form), POST /billing/trial-extend (unlimited), invite joins ignore the seat limit
- **Hint 1:** Three money rules are enforced nowhere: the plan price comes from a hidden form field; the trial can be extended forever; the 3-seat Free plan already holds 4 members.
- **Hint 2:** Intercept a plan change and set amount=0 — the 'paid' invoice is created at your price while the plan upgrades. Or extend the trial twice. Or accept one more invite into Acme.
- **Hint 3:** Any one of these proves the point: billing state must be computed server-side, never trusted from the request or left unchecked.
- **Lesson:** Prices, trials and seat counts are server-side facts. If the client supplies them — or nobody counts — the business model is optional.

## Feature: API, Integrations & AI

### Challenge 18 — API BOLA — Cross-Tenant API Access & User Dump
- **Objective:** Complete the scored test “API BOLA — Cross-Tenant API Access & User Dump” (API1 BOLA / API3 Excessive Data, Intermediate) so it shows ✅ on `/tests`.
- **Where:** GET /api/projects (?tenant_id=), /api/projects/:id, /api/tasks/:id, /api/users, /api/apps/<slug>[/<id>]
- **Hint 1:** Get a token: POST /api/login as Alice. The API believes whatever tenant you ask for.
- **Hint 2:** GET /api/projects?tenant_id=2 — Globex's projects, with an Acme token. Object IDs work too: /api/projects/4.
- **Hint 3:** And GET /api/users returns every user of every workspace — password hashes included. Module APIs (/api/apps/hr?tenant_id=2) behave the same.
- **Lesson:** API authorisation must derive the tenant from the credential and check object ownership on every route — the web UI’s rules do not transfer automatically.

### Challenge 19 — API Credential Attacks — Forged Tokens & Read-Key Writes
- **Objective:** Complete the scored test “API Credential Attacks — Forged Tokens & Read-Key Writes” (API2 Broken Authentication, Advanced) so it shows ✅ on `/tests`.
- **Where:** Bearer tokens (alg=none accepted; HMAC secret is a guessable word) and X-Api-Key (read scope can write)
- **Hint 1:** The token format is JWT-like. Read its header — then ask what the verifier does with alg set to 'none' and no signature.
- **Hint 2:** The HMAC secret is also guessable — and it leaks somewhere in this app. Either path forges a token for any user.
- **Hint 3:** Or skip forging: Acme's READ-only API key (find it via /debug or the integrations page) can POST /api/projects — scope is stored but never enforced, and the body chooses the tenant.
- **Lesson:** Token verification must pin the algorithm and protect the secret; API key scopes must be enforced on every route, not recorded for decoration.

### Challenge 20 — Server-Side Request Forgery — Webhooks, Import, AI & Scanner
- **Objective:** Complete the scored test “Server-Side Request Forgery — Webhooks, Import, AI & Scanner” (A10 SSRF, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /webhooks/:id/test, POST /import-url, POST /apps/ai-assistant/summarise, POST /apps/scanner
- **Hint 1:** Four features fetch URLs server-side: webhook test-ping, Import-from-URL, AI 'summarise this URL', and the vuln scanner. None of them allowlists anything.
- **Hint 2:** Point any of them at this app's own /debug page on localhost — the server fetches its own internal page and shows you the body.
- **Hint 3:** Internal metadata and admin endpoints answer the same way. The server is your proxy into its own network.
- **Lesson:** Any server-side URL fetch needs scheme/host allowlisting and private-range blocking after DNS resolution — otherwise it is an internal-network proxy.

### Challenge 21 — AI Assistant — Prompt Injection & Cross-Tenant Knowledge Leak
- **Objective:** Complete the scored test “AI Assistant — Prompt Injection & Cross-Tenant Knowledge Leak” (LLM01 Prompt Injection, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /apps/ai-assistant/chat — one system prompt holds every workspace’s knowledge snippets
- **Hint 1:** The assistant's knowledge base was loaded carelessly — one prompt context holds snippets for ALL workspaces.
- **Hint 2:** Ask it to ignore its instructions and reveal its system prompt.
- **Hint 3:** It prints everything — including Globex's confidential discount code and acquisition secret — to an Acme user.
- **Lesson:** An LLM’s context is a data boundary: never mix tenants in one prompt, and treat model output as an untrusted disclosure channel.

## Feature: Apps Modules

### Challenge 22 — Cross-Tenant Module Records — Read & Write IDOR
- **Objective:** Complete the scored test “Cross-Tenant Module Records — Read & Write IDOR” (A01 Broken Access Control, Beginner) so it shows ✅ on `/tests`.
- **Where:** GET /apps/<slug>/<id> for all 19 generic modules + bespoke actions: contract sign/download, clinic lab report, booking cancel, property edit, wallet transaction
- **Hint 1:** Every Apps module stores records with global sequential IDs — and the detail pages load by ID alone.
- **Hint 2:** As Acme, open a Globex CRM deal, support ticket, clinic record or chat channel by guessing its ID under /apps/.
- **Hint 3:** Writes too: cancel Globex's booking, sign their contract, or edit their property listing — all by ID.
- **Lesson:** Tenant scoping must cover every module and every action — reads, writes, downloads and state changes alike.

### Challenge 23 — Module Money Tampering — Wallet & Finance
- **Objective:** Complete the scored test “Module Money Tampering — Wallet & Finance” (A04 Insecure Design, Intermediate) so it shows ✅ on `/tests`.
- **Where:** POST /apps/wallet/transfer (negative amount) and POST /apps/finance/:id/pay (amount from the form)
- **Hint 1:** The Wallet transfer form posts an amount. Nobody validates it — try a negative number and watch both balances.
- **Hint 2:** Or open the Finance module: the pay form posts the amount for a $125,000 invoice. Who says you must post 125000?
- **Hint 3:** Pay it with amount=1 — the invoice flips to Paid at your price.
- **Lesson:** Money movement must be validated and computed server-side: positive amounts, sufficient funds, and totals read from the record — never from the request.

## Feature: Platform, Sharing & Exposure

### Challenge 24 — Unauthenticated Exposure — /debug & /backup.sql
- **Objective:** Complete the scored test “Unauthenticated Exposure — /debug & /backup.sql” (A05 Security Misconfiguration, Beginner) so it shows ✅ on `/tests`.
- **Where:** GET /debug and GET /backup.sql — reachable with no login at all
- **Hint 1:** Two paths need no login at all. One shows the app's internals; the other downloads the database.
- **Hint 2:** Open /debug logged out — environment, paths, and the API token secret are printed.
- **Hint 3:** Open /backup.sql — a full dump of tenants, users (hashes), projects and API keys downloads as a file.
- **Lesson:** Debug and backup surfaces must never ship reachable in production; if they exist at all, they need hard authentication and network restrictions.

### Challenge 25 — Guessable Public Tokens — Share, Tracking & Doc Links
- **Objective:** Complete the scored test “Guessable Public Tokens — Share, Tracking & Doc Links” (A01 Broken Access Control, Intermediate) so it shows ✅ on `/tests`.
- **Where:** GET /share/sh_<n>, /d/doc_<id>, /track/trk_<id>, /apps/analytics/public/dash_<tenant_id>, /apps/campaigns/unsubscribe?token=unsub_<id>
- **Hint 1:** Public links are 'protected' by tokens that follow a visible recipe: sh_1001..., trk_<item id>, doc_<item id>, dash_<tenant id>.
- **Hint 2:** Probe at least five of them in a row — walk the tracking IDs upward, logged out — and read strangers' names, addresses and phone numbers.
- **Hint 3:** Sequential identifiers are not tokens. Anything enumerable will be enumerated.
- **Lesson:** Public links need unguessable, high-entropy tokens; sequential IDs are an invitation to scrape everything.

### Challenge 26 — CSV Export — Cross-Tenant Export & Formula Injection
- **Objective:** Complete the scored test “CSV Export — Cross-Tenant Export & Formula Injection” (A03 Injection, Intermediate) so it shows ✅ on `/tests`.
- **Where:** GET /export — honours ?tenant_id= and writes task titles into the CSV raw (formula injection)
- **Hint 1:** The export endpoint believes a tenant_id parameter — /export?tenant_id=2 downloads Globex's whole task list.
- **Hint 2:** And cell values are written raw: name a task with a leading =HYPERLINK formula, export it, and open the CSV in a spreadsheet.
- **Hint 3:** The formula executes in the victim's spreadsheet app. Two flaws, one download.
- **Lesson:** Exports are both a data-scope question (whose rows?) and an injection surface (what is inside the cells?).

## Finishing

At 100% open `/complete` for the full debrief (per-feature counts, techniques, lessons, client impacts and report entries), the completion key for Lab 12, and your printable `/certificate`.
