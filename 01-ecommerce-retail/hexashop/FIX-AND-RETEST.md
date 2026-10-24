# HexaShop — Fix & Retest

How each of the 23 findings in [VULNERABILITIES.md](VULNERABILITIES.md) is fixed properly, and the regression test that proves the fix.

**Status of this lab's own Fix & Retest exercise (completed 2026-10-19):** every finding below was fixed in a separate copy of the application and retested with the original attacks — **all 23 findings: Fixed — Verified**. The vulnerable lab in this folder is unchanged (it is the practice target). The full client-style report is published as the HexaCyberLab sample report: https://hexacyberlab.great-site.net/sample-report

**How to use this document:** fix one finding at a time in your own copy, then run the regression check. On the vulnerable build the attack succeeds (the check **fails**); on a correctly fixed build the attack is blocked and normal behaviour still works (the check **passes**).

| # | Finding | Secure implementation | Regression test (expected on fixed build) |
|---|---|---|---|
| 1 | SQLi login bypass | Parameterized queries (prepared statements) for every query; no string concatenation of user input anywhere | Login with email `' OR '1'='1' -- ` fails with a normal "invalid credentials" response; real credentials still log in |
| 2 | SQLi in search / product id / sort | Parameterize all values; validate `id` as an integer; allowlist the `sort` parameter to known column names | `UNION SELECT` payloads return no user rows and no error detail; normal search, product pages and sorting still work |
| 3 | Verbose SQL errors | Generic error pages for users; full error text written to server-side logs only | A malformed query shows a plain error page with no SQL text, no query string, no stack details |
| 4 | Reflected XSS | Contextual output encoding: the search term (and every user-controlled value) is HTML-escaped on render | `<script>alert(1)</script>` in search appears as inert text; the page source shows `&lt;script&gt;` |
| 5 | Stored XSS | Escape all stored user content on output (reviews, names, tickets, Q&A); add a restrictive Content-Security-Policy | A stored payload in a review/profile renders as text for every viewer, including the admin ticket view |
| 6 | IDOR | Server-side ownership check on every object access (`WHERE id = ? AND user_id = <session user>`); deny by default | Alice requesting Bob's `/order/:id`, `/invoice/:id` or `/address/:id` gets 403/404; her own objects still open |
| 7 | Broken access control via cookie | Opaque, server-side session records; the role is read from the database on every request, never from client data | Editing any cookie value does not change the effective role; `/admin` stays 403 for customers |
| 8 | CSRF | Per-session anti-CSRF tokens on every state-changing form; SameSite=Lax cookies; state changes via POST only | A cross-site form post or a GET delete link no longer changes anything; legitimate forms (with token) still work |
| 9 | Price tampering | The server recomputes every price and the total from the database at checkout; client-sent prices/totals are ignored | Submitting a lowered hidden price still produces an order at the true catalogue total |
| 10 | Business logic (negative qty, coupon stacking/reuse, gift cards) | Server-side validation: quantity must be a positive integer; one coupon per order, single-use, tracked per account; gift-card codes are long random values with a redemption ledger | qty −1 is rejected; a reused/stacked coupon is refused; guessed gift-card codes never apply |
| 11 | Unrestricted file upload | Extension + content-type allowlist (images only), random stored filenames, size limit, files served as downloads from a non-executable location | Uploading `.html`/`.svg` with script is rejected or served inert (`Content-Disposition: attachment`, safe content type) |
| 12 | Path traversal + listing | Resolve the requested path and require it to stay inside the allowed directory; no directory listing; downloads addressed by ID, not by filename | `../` sequences return 404; `server.js` and `shop.db` are unreachable; legitimate downloads still work |
| 13 | SSRF | URL allowlist (scheme + host), block private/loopback/link-local IP ranges after DNS resolution, no redirects to internal targets | Import/avatar URL pointing at `127.0.0.1` or an internal address is refused; a public image URL still imports |
| 14 | Open redirect | `next`/`url` restricted to relative paths on the same origin, validated against an allowlist | `next=https://evil.example` is ignored and the user lands on the default in-app page |
| 15 | Weak crypto / session | Passwords hashed with bcrypt or argon2 (salted, cost-tuned); password-reset tokens are cryptographically random, single-use and expiring; session cookies HttpOnly + Secure + SameSite, with server-side invalidation on logout/password change | Stored hashes are not MD5 and cannot be cracked with the old rainbow approach; a reset token cannot be derived from the email; old sessions die on password change |
| 16 | Weak API token | Strong random signing secret held server-side (never in code or debug output); algorithm pinned server-side (`alg=none` rejected); short token expiry; vetted JWT library | A forged or `alg=none` token is rejected by `/api/me`; a genuine token works until its short expiry |
| 17 | Sensitive data exposure | `/api/users` requires admin auth and returns minimal fields (never password hashes); debug and backup endpoints removed entirely; default admin credentials must be changed on first login | Unauthenticated `/api/users`, `/debug`, `/backup.sql` all return 401/404; the app refuses to run with the documented default admin password unchanged |
| 18 | Security misconfiguration | Strict CORS allowlist (no origin reflection with credentials); security headers: CSP, `X-Content-Type-Options: nosniff`, `frame-ancestors 'none'` (or X-Frame-Options DENY), HSTS, server banner hidden | A cross-origin request from an unlisted origin is not reflected; the site cannot be framed by another page; header scan shows the full set present |
| 19 | Command injection | No shell string building: `execFile` with an argument array, plus strict input validation (IP/hostname allowlist format) | `127.0.0.1; id` and similar metacharacter payloads produce a validation error, not command output |
| 20 | XXE | Parse XML with external entities and DTDs disabled (safe parser configuration) | An import containing `<!ENTITY x SYSTEM "file:///...">` imports nothing from the filesystem and the entity is not expanded |
| 21 | Auth weaknesses | Rate limiting + progressive lockout on login; identical forgot-password responses whether or not the account exists; minimum password policy (length/complexity) at registration and reset | Repeated failed logins are throttled/locked; forgot-password returns the same message for real and fake emails; a 1-character password is rejected |
| 22 | Session tampering (combined) | One session design: a single opaque server-side session used by both the web UI and the API — no parallel client-trusted mechanisms | Tampering with either the cookie or the API credential grants nothing; role and identity always come from server-side state |
| 23 | Default credentials | No shipped default accounts in production builds; if a seed admin is required, the password is generated per-install and a change is forced at first login; documented lab credentials exist **only** in this training build | A production-configured instance has no `admin123`-style account; first login forces a password change |

## Whole-lab retest protocol

1. Work on a **copy** of the lab — keep the vulnerable original intact for comparison.
2. Fix in risk order (auth/session and injection first, then access control, then business logic, then hardening).
3. After each fix, re-run that finding's original attack from VULNERABILITIES.md **and** its regression test above. The attack must fail **and** the normal user flow must still pass — a "fix" that breaks the feature is not a fix.
4. Finish with a full regression pass over **all 23 findings on one build**, because fixes interact (session redesign touches findings 7, 15, 16 and 22 at once).
5. Record before/after evidence for every finding: request, response, and the business-logic result (order total, role, data returned).


---

## Lab-System Update — 2026-10-23 rebuild (25 scored tests)

In the rebuilt lab the findings above are organised as **25 scored tests across 10 features** (some findings are split per attack surface, e.g. SQL injection is scored separately in login, search and sort). The fix for every scored test is summarised below; the retest method is the same as for the original findings: apply the fix in a copy, re-run the exact exploit, confirm it now fails, and confirm the legitimate flow still works.

### Login & Authentication

- **SQL Injection — Login Bypass** (Critical): Use parameterized queries/prepared statements for all database access; never concatenate user input into SQL.
- **Brute Force — No Rate Limiting** (Medium): Add progressive rate limiting and temporary lockout per account+IP, log authentication anomalies, and offer MFA.
- **User Enumeration via Forgot Password** (Low): Return an identical generic message for all reset requests, whether or not the account exists.
- **Weak Password Policy at Registration** (Low): Enforce a minimum length (12+ recommended) and block common/breached passwords at registration and password reset.
- **Default Administrator Credentials** (Critical): Remove default accounts from production builds; generate per-install secrets and force a password change at first login.
- **Predictable Password-Reset Token** (High): Generate reset tokens from a CSPRNG, store only their hash, expire them within 30–60 minutes and invalidate after use.
### Search & Catalogue

- **SQL Injection — Search (UNION)** (Critical): Parameterize all queries; validate and type-check identifiers; apply least-privilege database accounts.
- **SQL Injection — Sort Parameter (ORDER BY)** (High): Map sort parameters through a server-side allowlist of permitted columns and directions; never interpolate raw input.
- **Verbose SQL Error Disclosure** (Medium): Return generic error pages to users; log detailed errors server-side only; disable debug output in production.
- **Reflected XSS in Search** (Medium): Apply contextual output encoding to all reflected data and deploy a Content-Security-Policy.
### Products & Reviews

- **Stored XSS — Reviews, Q&A, Tickets, Profile Name** (High): Escape all stored user content on output in every view (storefront and admin); add CSP as defence-in-depth.
### Orders & Invoices

- **IDOR — Orders, Invoices & Addresses** (High): Enforce server-side ownership checks on every object access (WHERE user_id = session user); deny by default.
### Cart & Checkout

- **Price Tampering at Checkout** (High): Recompute all prices and totals server-side from the database at checkout; ignore client-supplied amounts.
- **Business Logic — Coupons, Gift Cards & Quantities** (High): Validate quantities server-side (> 0); single-use, non-stackable coupons; long random gift-card codes with a redemption ledger.
### Profile & Account

- **CSRF — No Anti-CSRF Tokens** (Medium): Add per-session anti-CSRF tokens to all state-changing forms; set SameSite=Lax/Strict cookies; use POST for state changes.
- **Mass Assignment — Profile Update (role & wallet)** (High): Allowlist writable fields per endpoint (name, email, phone only); never bind model objects directly from request bodies.
### File Upload & Download

- **Unrestricted File Upload** (High): Allowlist extensions and verify content type; store uploads under random names; serve them as attachments from a separate, non-executable location.
- **Path Traversal — Arbitrary File Read** (High): Resolve the requested path and verify it stays inside the allowed directory; address downloads by ID, never by user-supplied filename.
- **SSRF — Server-Side URL Fetch** (High): Allowlist permitted hosts/schemes; block private and loopback ranges after DNS resolution; disable redirects to internal targets.
### API & Tokens

- **Sensitive Data Exposure — /api/users, /debug, /backup.sql** (Critical): Require authentication and minimize returned fields (never password hashes); remove debug and backup endpoints from production entirely.
- **Weak API Token — alg=none & Guessable Secret** (Critical): Use a strong random per-install secret; pin and verify the algorithm server-side with a vetted JWT library; set short token expiries.
### Admin Panel

- **Session Cookie Tampering — Role Escalation** (Critical): Use opaque server-side sessions (or signed tokens); always load the role from the database on each request.
- **Command Injection — Admin Ping Tool** (Critical): Never build shell strings from input; call execFile with an argument array and enforce a strict host/IP allowlist format.
### Platform & Configuration

- **Open Redirect — /go & Login next** (Low): Only allow relative paths (or an explicit allowlist) for redirect targets; reject absolute external URLs.
- **Security Misconfiguration — CORS & Missing Headers** (Medium): Use a strict CORS allowlist; add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options and HSTS; remove the server banner.
