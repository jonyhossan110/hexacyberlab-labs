# HexaWebhook — Vulnerabilities (complete map)

LAB 26 of 110 · Category 3: API & Developer Platforms · Port 3035 (127.0.0.1 only)

Every scored test in the lab registry, grouped by feature. Total: 26 tests across 8 features.

## Login & Authentication (6)

### SQL injection login bypass
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: String-built queries let attacker input change the meaning of the query itself — here it turns a login check into an open door.
- Impact: On a real client site this is full account takeover with no password at all — including the admin account — from a single login form.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Without throttling or lockout, an attacker can try millions of passwords against one account at full speed.
- Impact: Weak or reused passwords fall quickly; for a client this means credential-stuffing and password-spraying attacks succeed unnoticed.

### User enumeration via different error messages
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Distinct "no such account" vs "wrong password" answers hand attackers a free list of valid accounts to target.
- Impact: Attackers confirm which customer emails are registered, then focus phishing and password attacks only on real accounts.

### Default demo credentials still active
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Shipped or seeded accounts with known passwords are the first thing attackers try on any new deployment.
- Impact: A client who forgets one seeded account gives attackers a working login on day one — no exploit needed.

### Predictable password-reset token
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Intermediate
- What it is: Reset tokens must be unguessable random values; a token derived from a public id can be forged for any account.
- Impact: Anyone can reset the password of any customer — including admins — knowing only their email address.

### Role cookie tampering
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Any authorization decision taken from client-supplied data (cookies, hidden fields) can be forged by the client.
- Impact: Every regular customer can promote themselves to admin — support tools, user lists and settings all fall at once.

## Registration & Profile (4)

### Mass assignment — self-register as admin
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Binding the whole request body to the user object lets attackers set privileged fields the UI never offered.
- Impact: Attackers mint their own admin accounts on a client site — full control without touching anyone else’s credentials.

### Weak password policy (1 character accepted)
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- What it is: Password policy is enforced on the server or it is not enforced at all — client-side hints do nothing.
- Impact: Customers pick trivial passwords that fall to the first brute-force run, and the client owns the resulting breach.

### Stored XSS in display name
- OWASP: A03:2021 Injection · Difficulty: Beginner
- What it is: Data stored from users must be output-encoded everywhere it is rendered — one raw render is enough.
- Impact: Attackers run JavaScript in the browsers of a client’s staff — session theft and actions performed as the victim follow.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: State-changing requests need an unguessable token; cookies alone ride along with forged cross-site requests.
- Impact: A malicious page a customer visits can silently rewrite their profile — and on richer apps, change email or password.

## Projects (2)

### Project IDOR — read another team’s project
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Every object access must check that the object belongs to the caller; hiding links is not authorization.
- Impact: Customers read each other’s projects — endpoints, event data and business structure leak to any signed-in user.

### Project IDOR — edit another team’s project
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Write paths need the same ownership checks as reads; a read-only IDOR is often a write IDOR too.
- Impact: Attackers tamper with a competitor’s configuration — rename, re-describe or sabotage their integration from inside.

## Endpoints & SSRF (4)

### SSRF — endpoint URL reaches the internal service
- OWASP: A10:2021 Server-Side Request Forgery · Difficulty: Advanced
- What it is: Server-side fetching of user-controlled URLs must validate destinations, or the server becomes a proxy into the internal network.
- Impact: Attackers use a client’s own server to scan and read internal services that were never meant to be internet-facing.

### SSRF — cloud metadata endpoint
- OWASP: A10:2021 Server-Side Request Forgery · Difficulty: Advanced
- What it is: Cloud metadata services hand out live credentials to anything that can ask — SSRF turns that into full cloud compromise.
- Impact: Stolen cloud keys mean attackers own the client’s infrastructure, data and billing — the most expensive SSRF outcome there is.

### Endpoint IDOR — view another project’s endpoint & signing secret
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Secrets displayed on object pages inherit the object’s authorization bugs — an IDOR here leaks cryptographic keys, not just data.
- Impact: A leaked signing secret lets attackers forge perfectly-signed fake events into the victim’s systems.

### Signing secret exposed by unauthenticated API
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: API routes are part of the attack surface: a forgotten auth check on one route undoes every control on the web pages.
- Impact: Anyone on the internet can harvest signing secrets and forge webhooks into every customer of the service.

## Subscriptions (2)

### Subscription tampering on another team’s endpoint
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Configuration writes are state changes like any other — they need ownership checks, not just a login.
- Impact: Attackers silently unsubscribe a victim from payment events (or flood them) — business processes break with no visible break-in.

### Wildcard / admin event subscription
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Missing allowlist validation lets users opt into data streams that were never meant for customers.
- Impact: Customers receive internal audit/security events — a live feed of platform operations that should be private.

## Deliveries & Logs (3)

### Delivery log IDOR — read another team’s payloads & responses
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- What it is: Logs are sensitive data: payloads carry customer business data, and signatures/response bodies help forge or debug attacks.
- Impact: Competitors read a client’s live business events — orders, payments, customer records — straight from the log viewer.

### Replay another team’s delivery
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Actions on objects (not just views) need authorization; replay turns a read bug into an active one.
- Impact: Attackers re-fire a victim’s payment or fulfilment events, causing duplicate orders, refunds or shipments.

### Log export leaks every team’s deliveries
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Bulk exports multiply any scoping mistake — one route can leak the entire dataset instead of one record.
- Impact: One click downloads every customer’s event history — a reportable data breach from a single forgotten check.

## Admin Panel (2)

### Admin user API open to any logged-in user
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- What it is: Gating a page is not gating its data API; every backend route needs its own authorization check.
- Impact: Any customer can dump the whole user database — credential theft and total account compromise follow.

### CSRF on admin user-disable action
- OWASP: A01:2021 Broken Access Control · Difficulty: Advanced
- What it is: CSRF on admin actions turns any page an admin browses into an attack on their own panel.
- Impact: An attacker who lures an admin to a crafted page can disable accounts — including other admins — without any password.

## Platform & API (3)

### Predictable legacy API token (derived from email)
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Advanced
- What it is: Backward-compatible weak auth schemes stay as strong as the weakest accepted format — derivation from public data is not a secret.
- Impact: Anyone who knows a customer’s email owns their API access — automate that and every account falls.

### Debug endpoint exposes users & secrets
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- What it is: Debug/diagnostic routes must never ship to production — they bundle every secret an attacker could want.
- Impact: A single unauthenticated request hands over credentials and signing keys for the entire platform.

### Missing security headers
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- What it is: Baseline headers are cheap defence in depth — clickjacking and MIME-sniffing get harder for free.
- Impact: A client’s pages can be framed for clickjacking and sniffed as executable content — small gaps that chain into real attacks.

## Key mechanism

The lab is gated by the completion key of Lab 25 and issues its own completion key at 100%. Keys are never stored or documented in plain form — inside server.js each key exists only as encoded shards scattered across the file, assembled at runtime.
