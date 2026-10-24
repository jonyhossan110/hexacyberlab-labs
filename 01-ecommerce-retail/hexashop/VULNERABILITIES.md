# HexaShop — Vulnerability Map (25 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.

> **Bonus (unscored):** the admin XML product import also resolves external entities — a classic XXE flaw kept from the original lab as a free bonus challenge. It is intentionally **not** part of the 25 scored tests.


## Login & Authentication — 6 test(s)

### SQL Injection — Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Login forms that concatenate input into SQL let attackers rewrite the query itself. Parameterized queries make input data, never code.
- **Business impact:** On a real store this is instant takeover of any account — including admin — without knowing a single password. Customer data, orders and the whole back office are exposed.
- **Report title:** SQL Injection in Authentication (Login Form)
- **Fix:** Use parameterized queries/prepared statements for all database access; never concatenate user input into SQL.

### Brute Force — No Rate Limiting
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Without throttling, lockout or MFA, any weak password falls to automated guessing. Rate limiting turns a minutes-long attack into an impractical one.
- **Business impact:** Attackers grind through password lists against a client's customer accounts at full speed. One reused or weak password means a drained wallet and stolen personal data.
- **Report title:** Missing Rate Limiting / Account Lockout on Login
- **Fix:** Add progressive rate limiting and temporary lockout per account+IP, log authentication anomalies, and offer MFA.

### User Enumeration via Forgot Password
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Low
- **What it is:** Different responses for existing vs non-existing accounts hand attackers a free list of valid users to target. Uniform responses close the leak.
- **Business impact:** Attackers first harvest which of their leaked emails hold accounts on a client's store, then aim phishing and credential stuffing only at real customers.
- **Report title:** Account Enumeration via Password Reset Responses
- **Fix:** Return an identical generic message for all reset requests, whether or not the account exists.

### Weak Password Policy at Registration
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Low
- **What it is:** A password policy is the cheapest defence a store owns. Allowing 1-character passwords invites instant compromise of customer accounts.
- **Business impact:** Customers who pick trivial passwords lose their accounts — with stored addresses, order history and wallet balance — to the simplest guessing attacks.
- **Report title:** Weak Password Policy on Registration
- **Fix:** Enforce a minimum length (12+ recommended) and block common/breached passwords at registration and password reset.

### Default Administrator Credentials
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Default and publicly documented credentials are the first thing every attacker tries. Production systems must force a unique password at first login.
- **Business impact:** Anyone on the internet can become admin of a store that ships with known credentials — full control of products, prices, orders and customer data.
- **Report title:** Default Credentials for Administrative Account
- **Fix:** Remove default accounts from production builds; generate per-install secrets and force a password change at first login.

### Predictable Password-Reset Token
- **OWASP:** A02 Crypto Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Reset tokens must be random, single-use and expiring. A token derived from public data is not a secret — it is an account-takeover link anyone can mint.
- **Business impact:** Anyone who knows a customer's email can reset their password and take over the account. Support teams see this exact attack in real breaches.
- **Report title:** Predictable Password Reset Token (Derived from Email)
- **Fix:** Generate reset tokens from a CSPRNG, store only their hash, expire them within 30–60 minutes and invalidate after use.


## Search & Catalogue — 4 test(s)

### SQL Injection — Search (UNION)
- **OWASP:** A03 Injection · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **What it is:** UNION injection turns a search box into a database reader. Any concatenated query — search, filters, APIs — can dump the entire database.
- **Business impact:** A single search field can leak every customer record and password hash in the store. This is how mass breaches start.
- **Report title:** SQL Injection in Product Search (UNION-Based)
- **Fix:** Parameterize all queries; validate and type-check identifiers; apply least-privilege database accounts.

### SQL Injection — Sort Parameter (ORDER BY)
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** ORDER BY injection survives naive parameterization, because expression positions cannot be bound as values. Sort parameters need a strict allowlist.
- **Business impact:** Attackers run boolean- and error-based extraction through the sort parameter — a quieter path to the same full database dump.
- **Report title:** SQL Injection via Sort Parameter (ORDER BY)
- **Fix:** Map sort parameters through a server-side allowlist of permitted columns and directions; never interpolate raw input.

### Verbose SQL Error Disclosure
- **OWASP:** A05 Misconfiguration · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Error messages that include SQL text teach attackers your schema for free. Users get generic errors; details belong in server logs only.
- **Business impact:** Every failed attack becomes reconnaissance: error output reveals table names, column names and query structure, making the real injection far easier.
- **Report title:** Verbose Error Messages Disclosing SQL Queries
- **Fix:** Return generic error pages to users; log detailed errors server-side only; disable debug output in production.

### Reflected XSS in Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Any input reflected into a page without contextual output encoding becomes script in a victim's browser. Encode on output, always.
- **Business impact:** Attackers send customers a crafted search link that runs script in their session — stealing carts, sessions and payment details on a store they trust.
- **Report title:** Reflected Cross-Site Scripting in Search Results
- **Fix:** Apply contextual output encoding to all reflected data and deploy a Content-Security-Policy.


## Products & Reviews — 1 test(s)

### Stored XSS — Reviews, Q&A, Tickets, Profile Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Stored XSS is the persistent variant: one submission attacks every future viewer, including staff. Output encoding on every render is the only safe default.
- **Business impact:** A poisoned review or ticket executes in the admin's browser during routine moderation — session theft and actions performed in the admin's name by the attacker's script.
- **Report title:** Stored Cross-Site Scripting in User-Generated Content
- **Fix:** Escape all stored user content on output in every view (storefront and admin); add CSP as defence-in-depth.


## Orders & Invoices — 1 test(s)

### IDOR — Orders, Invoices & Addresses
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Checking "is the user logged in" is not authorization. Every object access must verify the object belongs to that user.
- **Business impact:** Every customer's orders, invoices and addresses are readable by any other customer — names, addresses, phone numbers and purchase history, at scale.
- **Report title:** Insecure Direct Object Reference (IDOR) on Orders / Invoices / Addresses
- **Fix:** Enforce server-side ownership checks on every object access (WHERE user_id = session user); deny by default.


## Cart & Checkout — 2 test(s)

### Price Tampering at Checkout
- **OWASP:** A04 Insecure Design · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Prices and totals must be recomputed on the server from the catalogue at order time. Anything the browser sends is a request, not a fact.
- **Business impact:** Customers check out a $999 phone for $1. On a real store this is direct revenue theft that finance may not notice for weeks.
- **Report title:** Client-Side Price Tampering in Checkout
- **Fix:** Recompute all prices and totals server-side from the database at checkout; ignore client-supplied amounts.

### Business Logic — Coupons, Gift Cards & Quantities
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Business-logic flaws are rule violations, not syntax bugs: the code runs exactly as written, but the rules themselves are missing. Model abuse cases for every money flow.
- **Business impact:** Stacked discounts, reused coupons, guessed gift cards and negative quantities quietly convert a profitable store into a giveaway — no "hack" required.
- **Report title:** Business Logic Flaws in Cart/Checkout (Coupons, Gift Cards, Quantities)
- **Fix:** Validate quantities server-side (> 0); single-use, non-stackable coupons; long random gift-card codes with a redemption ledger.


## Profile & Account — 2 test(s)

### CSRF — No Anti-CSRF Tokens
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Without per-session tokens and SameSite cookies, any website a logged-in user visits can act in their name. GET requests must never change state.
- **Business impact:** A booby-trapped page or ad silently changes a customer's email — then the attacker uses 'forgot password' to own the account completely.
- **Report title:** Cross-Site Request Forgery on Account & Admin Actions
- **Fix:** Add per-session anti-CSRF tokens to all state-changing forms; set SameSite=Lax/Strict cookies; use POST for state changes.

### Mass Assignment — Profile Update (role & wallet)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Binding request bodies directly to data models lets attackers write fields that were never on the form. Update endpoints need explicit field allowlists.
- **Business impact:** A customer promotes themselves to admin and inflates their wallet in one request — privilege escalation and free money with no exploit code at all.
- **Report title:** Mass Assignment in Profile Update (Role & Wallet Writable)
- **Fix:** Allowlist writable fields per endpoint (name, email, phone only); never bind model objects directly from request bodies.


## File Upload & Download — 3 test(s)

### Unrestricted File Upload
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** An upload feature without type allowlisting, random names and safe serving is a stored-XSS and webshell delivery system. Treat every upload as hostile.
- **Business impact:** Attackers host script and phishing pages on the store's own domain — abusing its reputation and stealing the sessions of anyone who opens the link, staff included.
- **Report title:** Unrestricted File Upload Leading to Stored Content Execution
- **Fix:** Allowlist extensions and verify content type; store uploads under random names; serve them as attachments from a separate, non-executable location.

### Path Traversal — Arbitrary File Read
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** User-controlled paths must be resolved and confined to an allowed directory. One traversal flaw turns a download link into the entire server filesystem.
- **Business impact:** Source code and the live database file — every customer and order — can be downloaded through one innocent-looking parameter.
- **Report title:** Path Traversal in File Download (Arbitrary File Read)
- **Fix:** Resolve the requested path and verify it stays inside the allowed directory; address downloads by ID, never by user-supplied filename.

### SSRF — Server-Side URL Fetch
- **OWASP:** A10 SSRF · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** When a server fetches arbitrary URLs it becomes the attacker's proxy inside the network — reaching admin panels and cloud metadata that outsiders cannot.
- **Business impact:** Internal services, debug pages and cloud metadata endpoints become readable — a classic stepping stone from one web bug to full cloud account compromise.
- **Report title:** Server-Side Request Forgery in URL Import Features
- **Fix:** Allowlist permitted hosts/schemes; block private and loopback ranges after DNS resolution; disable redirects to internal targets.


## API & Tokens — 2 test(s)

### Sensitive Data Exposure — /api/users, /debug, /backup.sql
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Debug pages, backups and over-sharing APIs are production data leaks hiding in plain sight. If an endpoint is not needed in production, it must not exist there.
- **Business impact:** One anonymous request downloads every account with its password hash — and the debug page even hands out the token-signing secret. Total compromise with zero exploitation skill.
- **Report title:** Sensitive Data Exposure via Unauthenticated Endpoints
- **Fix:** Require authentication and minimize returned fields (never password hashes); remove debug and backup endpoints from production entirely.

### Weak API Token — alg=none & Guessable Secret
- **OWASP:** A02 Crypto Failures · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **What it is:** Tokens are only as strong as their secret and algorithm checks. Accepting alg=none or using a published secret reduces authentication to a text file anyone can write.
- **Business impact:** Attackers mint admin tokens at will — full API access as any user, no password needed, and nothing in the logs looks like a login.
- **Report title:** API Token Forgery (alg=none Accepted, Weak Hardcoded Secret)
- **Fix:** Use a strong random per-install secret; pin and verify the algorithm server-side with a vetted JWT library; set short token expiries.


## Admin Panel — 2 test(s)

### Session Cookie Tampering — Role Escalation
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Identity and role are server-side facts. Anything stored client-side — cookies included — is attacker-editable and must never be trusted for authorization.
- **Business impact:** Every customer becomes admin in ten seconds: product prices, orders, user roles and the admin toolkit all surrender to a copy-paste.
- **Report title:** Broken Access Control via Unsigned Session Cookie (Role Tampering)
- **Fix:** Use opaque server-side sessions (or signed tokens); always load the role from the database on each request.

### Command Injection — Admin Ping Tool
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Passing user input to a shell is remote code execution with extra steps. Use argument-array execution APIs and validate input as data.
- **Business impact:** Whoever reaches this tool runs operating-system commands as the server — reading files, planting backdoors, pivoting into the internal network.
- **Report title:** OS Command Injection in Admin Ping Utility
- **Fix:** Never build shell strings from input; call execFile with an argument array and enforce a strict host/IP allowlist format.


## Platform & Configuration — 2 test(s)

### Open Redirect — /go & Login next
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Low
- **What it is:** Redirect targets must be allowlisted to relative, in-app paths. An unchecked redirector lends your domain's trust to any phishing page.
- **Business impact:** Attackers send customers a link on the real shop domain that ends on a fake payment page — the victim checked the first domain and trusted it.
- **Report title:** Open Redirect in /go and Login next Parameter
- **Fix:** Only allow relative paths (or an explicit allowlist) for redirect targets; reject absolute external URLs.

### Security Misconfiguration — CORS & Missing Headers
- **OWASP:** A05 Misconfiguration · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** CORS reflection with credentials lets any website read a logged-in user's responses cross-origin. Security headers are cheap, standard hardening — their absence is a finding.
- **Business impact:** A malicious site can read a signed-in customer's account data through their own browser, and frame the shop inside a clickjacking page that tricks their clicks.
- **Report title:** Security Misconfiguration (Permissive CORS, Missing Security Headers)
- **Fix:** Use a strict CORS allowlist; add CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options and HSTS; remove the server banner.
