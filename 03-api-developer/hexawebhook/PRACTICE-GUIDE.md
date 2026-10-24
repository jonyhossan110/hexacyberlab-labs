# HexaWebhook — Practice Guide

Challenges grouped by feature, then difficulty. Objective for every challenge: make the test flip to done on the Mission page (/tests) by performing the real exploit. Hints are graded — reveal one at a time.

## Login & Authentication

### SQL injection login bypass (Beginner · A03:2021 Injection)
- Objective: String-built queries let attacker input change the meaning of the query itself — here it turns a login check into an open door.
- Hint 1: The login form builds its user lookup by gluing your input straight into a query string.
- Hint 2: Try a classic comment-out in the email field, e.g. an address followed by ' -- .
- Hint 3: Or put ' OR '1'='1 in the password field together with any real account email.

### Brute force — no rate limit or lockout (Beginner · A07:2021 Identification & Authentication Failures)
- Objective: Without throttling or lockout, an attacker can try millions of passwords against one account at full speed.
- Hint 1: Pick one real account and keep guessing wrong passwords.
- Hint 2: Notice the login never slows down, never CAPTCHAs and never locks — count your failures.
- Hint 3: The test flips when the 10th failed attempt for one account is still processed normally.

### User enumeration via different error messages (Beginner · A07:2021 Identification & Authentication Failures)
- Objective: Distinct "no such account" vs "wrong password" answers hand attackers a free list of valid accounts to target.
- Hint 1: Compare the login error for an email that exists with one that does not.
- Hint 2: The forgot-password form answers differently too.
- Hint 3: The test flips once the server has given both kinds of answer to the same visitor.

### Default demo credentials still active (Beginner · A07:2021 Identification & Authentication Failures)
- Objective: Shipped or seeded accounts with known passwords are the first thing attackers try on any new deployment.
- Hint 1: Seed/demo accounts are a classic leftover — think demo@… with the obvious password.
- Hint 2: The account list in the README names the demo account.
- Hint 3: Try demo@hexawebhook.local with password "demo".

### Predictable password-reset token (Intermediate · A07:2021 Identification & Authentication Failures)
- Objective: Reset tokens must be unguessable random values; a token derived from a public id can be forged for any account.
- Hint 1: Request a reset for one account and look at the shape of the token you are issued.
- Hint 2: Tokens are derived from something public about the account — its numeric id.
- Hint 3: Compute the token for a DIFFERENT account (id × 7919, mod 100000) and use it without ever requesting a reset for them.

### Role cookie tampering (Intermediate · A01:2021 Broken Access Control)
- Objective: Any authorization decision taken from client-supplied data (cookies, hidden fields) can be forged by the client.
- Hint 1: The admin gate trusts more than the server-side session.
- Hint 2: Inspect the cookies the app uses and try adding one that claims a role.
- Hint 3: Set a cookie named hx_role to the value admin, then visit /admin as a normal member.

## Registration & Profile

### Weak password policy (1 character accepted) (Beginner · A07:2021 Identification & Authentication Failures)
- Objective: Password policy is enforced on the server or it is not enforced at all — client-side hints do nothing.
- Hint 1: Register a fresh account and see how short a password the server accepts.
- Hint 2: There is effectively no minimum length or complexity check.
- Hint 3: A one-character password such as "a" is accepted.

### Stored XSS in display name (Beginner · A03:2021 Injection)
- Objective: Data stored from users must be output-encoded everywhere it is rendered — one raw render is enough.
- Hint 1: Your display name is shown to other people — including admins in the user list.
- Hint 2: Register with a name that is not just text.
- Hint 3: Use a name like <script>alert(1)</script> and watch it stored and rendered raw.

### Mass assignment — self-register as admin (Intermediate · A01:2021 Broken Access Control)
- Objective: Binding the whole request body to the user object lets attackers set privileged fields the UI never offered.
- Hint 1: The register form only shows name, email and password — the server may accept more fields than the form shows.
- Hint 2: Add an extra form field that a profile normally carries but users should never set themselves.
- Hint 3: POST /register with role=admin added to the form body.

### CSRF on profile update (Intermediate · A01:2021 Broken Access Control)
- Objective: State-changing requests need an unguessable token; cookies alone ride along with forged cross-site requests.
- Hint 1: The profile form changes your display name with a plain POST and no anti-CSRF token.
- Hint 2: The app marks its own forms with a hidden hx_marker field — a forged request will not have a valid one.
- Hint 3: Send the profile POST from a cross-site Origin (or without the marker) and watch the name change anyway.

## Projects

### Project IDOR — read another team’s project (Beginner · A01:2021 Broken Access Control)
- Objective: Every object access must check that the object belongs to the caller; hiding links is not authorization.
- Hint 1: Project pages live at predictable numeric URLs like /projects/1.
- Hint 2: Log in as one user and open a project id that belongs to someone else.
- Hint 3: Sara opening project 1 (owned by Dev) is enough — the server never checks ownership.

### Project IDOR — edit another team’s project (Intermediate · A01:2021 Broken Access Control)
- Objective: Write paths need the same ownership checks as reads; a read-only IDOR is often a write IDOR too.
- Hint 1: Reading a foreign project works — try changing it.
- Hint 2: POST the project update form for a project id you do not own.
- Hint 3: The update is applied with no ownership check at all.

## Endpoints & SSRF

### Endpoint IDOR — view another project’s endpoint & signing secret (Beginner · A01:2021 Broken Access Control)
- Objective: Secrets displayed on object pages inherit the object’s authorization bugs — an IDOR here leaks cryptographic keys, not just data.
- Hint 1: Endpoint pages show everything about an endpoint — including its signing secret.
- Hint 2: Endpoints have small numeric ids; open one that belongs to another project.
- Hint 3: GET /endpoints/1 while logged in as Sara (project 2) — no ownership check stands in the way.

### Signing secret exposed by unauthenticated API (Intermediate · A01:2021 Broken Access Control)
- Objective: API routes are part of the attack surface: a forgotten auth check on one route undoes every control on the web pages.
- Hint 1: There is a JSON API for endpoints under /api/endpoints/<id>.
- Hint 2: Try it with no session cookie and no API token at all.
- Hint 3: The response includes the full endpoint record — signing_secret included.

### SSRF — endpoint URL reaches the internal service (Advanced · A10:2021 Server-Side Request Forgery)
- Objective: Server-side fetching of user-controlled URLs must validate destinations, or the server becomes a proxy into the internal network.
- Hint 1: The delivery engine fetches whatever URL an endpoint is configured with — no allowlist, no private-IP block.
- Hint 2: The app itself has an /internal/metrics service that refuses direct browser visits.
- Hint 3: Point one of YOUR endpoints at http://127.0.0.1:3035/internal/metrics and send a test event — then read the delivery log.

### SSRF — cloud metadata endpoint (Advanced · A10:2021 Server-Side Request Forgery)
- Objective: Cloud metadata services hand out live credentials to anything that can ask — SSRF turns that into full cloud compromise.
- Hint 1: The classic SSRF target is the cloud metadata address 169.254.169.254.
- Hint 2: The dispatcher does not block link-local addresses either.
- Hint 3: Set an endpoint URL to http://169.254.169.254/latest/meta-data/iam and fire a test event; the "response" lands in your delivery log.

## Subscriptions

### Subscription tampering on another team’s endpoint (Intermediate · A01:2021 Broken Access Control)
- Objective: Configuration writes are state changes like any other — they need ownership checks, not just a login.
- Hint 1: An endpoint’s event subscriptions can be replaced with a single POST.
- Hint 2: The handler never asks whether the endpoint is yours.
- Hint 3: POST /endpoints/1/subscriptions as a different user and change which events Dev receives.

### Wildcard / admin event subscription (Intermediate · A01:2021 Broken Access Control)
- Objective: Missing allowlist validation lets users opt into data streams that were never meant for customers.
- Hint 1: Subscriptions accept a free-text event list — nothing validates it against the events your plan may receive.
- Hint 2: Platform-internal event types exist (they start with admin.).
- Hint 3: Subscribe one of your endpoints to * or admin.audit and see it saved without complaint.

## Deliveries & Logs

### Delivery log IDOR — read another team’s payloads & responses (Beginner · A01:2021 Broken Access Control)
- Objective: Logs are sensitive data: payloads carry customer business data, and signatures/response bodies help forge or debug attacks.
- Hint 1: Delivery detail pages contain the full event payload, the response body and the signature.
- Hint 2: Deliveries have small sequential ids.
- Hint 3: Open /deliveries/1 as a user who does not own that delivery’s project.

### Replay another team’s delivery (Intermediate · A01:2021 Broken Access Control)
- Objective: Actions on objects (not just views) need authorization; replay turns a read bug into an active one.
- Hint 1: Each delivery has a Replay action that re-sends the event to the endpoint.
- Hint 2: The replay handler does not check whose delivery it is.
- Hint 3: POST /deliveries/1/replay while logged in as a different user — a new delivery is created.

### Log export leaks every team’s deliveries (Intermediate · A01:2021 Broken Access Control)
- Objective: Bulk exports multiply any scoping mistake — one route can leak the entire dataset instead of one record.
- Hint 1: There is a CSV export of delivery logs at /deliveries/export.csv.
- Hint 2: It was written for admins but the route only asks for a login.
- Hint 3: Download it as a normal member and count how many other teams’ deliveries are inside.

## Admin Panel

### Admin user API open to any logged-in user (Intermediate · A01:2021 Broken Access Control)
- Objective: Gating a page is not gating its data API; every backend route needs its own authorization check.
- Hint 1: The admin console loads its user table from /admin/api/users.
- Hint 2: The page is gated — the JSON behind it may not be.
- Hint 3: Call /admin/api/users as a normal member: full user records, passwords and API tokens come back.

### CSRF on admin user-disable action (Advanced · A01:2021 Broken Access Control)
- Objective: CSRF on admin actions turns any page an admin browses into an attack on their own panel.
- Hint 1: Admins can disable a user with a POST — and that form has no CSRF token either.
- Hint 2: Reuse the profile-CSRF trick, but against /admin/users/<id>/disable while an admin session is active.
- Hint 3: A cross-site Origin (or a missing hx_marker) plus an applied disable flips the test.

## Platform & API

### Debug endpoint exposes users & secrets (Beginner · A05:2021 Security Misconfiguration)
- Objective: Debug/diagnostic routes must never ship to production — they bundle every secret an attacker could want.
- Hint 1: Developers love leaving a /debug page behind.
- Hint 2: This one needs no login at all.
- Hint 3: GET /debug returns configuration, user password hashes and every endpoint signing secret.

### Missing security headers (Beginner · A05:2021 Security Misconfiguration)
- Objective: Baseline headers are cheap defence in depth — clickjacking and MIME-sniffing get harder for free.
- Hint 1: Load any page while logged in and inspect the response headers.
- Hint 2: There is no X-Frame-Options, no X-Content-Type-Options, no Content-Security-Policy anywhere.
- Hint 3: The test flips the first time a page is served to a logged-in user with those headers missing.

### Predictable legacy API token (derived from email) (Advanced · A07:2021 Identification & Authentication Failures)
- Objective: Backward-compatible weak auth schemes stay as strong as the weakest accepted format — derivation from public data is not a secret.
- Hint 1: The API accepts Bearer tokens. Real tokens look random and start with whk_live_.
- Hint 2: A legacy token format is still accepted: the prefix wh_ followed by something derived from the account email.
- Hint 3: Try Authorization: Bearer wh_ + base64(email) for a victim account against /api/projects.
