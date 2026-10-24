# HexaWholesale — Intentional Vulnerabilities (24 tests, grouped by feature)

All flaws are deliberate, reproducible, and rooted in the B2B wholesale workflow. This is the lab's complete map: **24 security tests across 7 features**. Each test is detected by the lab itself when the exploit genuinely succeeds (see the mission page at `/tests`). The original wholesale findings keep their stable IDs (`V1`–`V14`) for use with `PRACTICE-GUIDE.md` and `FIX-AND-RETEST.md`; tests added in the system rebuild carry their test IDs.

---

## Feature: Login & Authentication

### auth-sqli — SQL injection login bypass
- **OWASP:** Injection (A03)
- **Location:** `POST /login` — a legacy string-built query path pastes the email into the query text.
- **Exploitation:** Enter the email `' OR '1'='1' -- ` with any password. The tautology plus comment swallows the password condition and a session is created for the first matched account — no password known.
- **Business impact:** Full authentication bypass: an attacker becomes the platform admin and sees every tenant's orders, prices and credit posture.

### auth-brute — Brute force with no rate limiting or lockout
- **OWASP:** Authentication Failures (A07)
- **Location:** `POST /login` — failures are processed identically forever; no counter, delay, lockout or CAPTCHA exists.
- **Exploitation:** Fire 10+ wrong passwords at one account in a row (Burp Intruder / curl loop). Every attempt is processed like the first.
- **Business impact:** Password guessing and credential stuffing against staff accounts run indefinitely and silently; wholesale accounts guard company credit lines.

### auth-enum — User enumeration via password reset
- **OWASP:** Authentication Failures (A07)
- **Location:** `POST /forgot` — existing accounts get a helpful reset-link page; unknown addresses get a vague generic message.
- **Exploitation:** Submit the forgot form for a real account and for a made-up one; the different responses confirm which emails hold accounts.
- **Business impact:** Attackers harvest a verified target list for phishing and password attacks instead of guessing blindly.

### auth-default — Default / demo credentials in use
- **OWASP:** Authentication Failures (A07)
- **Location:** Seed accounts — the platform admin uses `Admin@123`, every company user `User@123`, and they are printed in the README.
- **Exploitation:** Log in as `admin@hexawholesale.local / Admin@123`.
- **Business impact:** Shared, published, pattern-based passwords protect the most powerful account on the platform — the first thing any attacker tries.

### V12 / auth-reset — Weak, predictable password-reset tokens
- **OWASP:** Broken Authentication (A07)
- **Location:** `POST /forgot` — reset tokens are sequential integers (`1001`, `1002`, …) from a global counter.
- **Exploitation:** Request a reset for **your own** account and note your token (the simulated email shows it). Then trigger a reset for a victim and predict the token they were just issued; use `/reset?token=<n>` from a different browser to set their password.
- **Business impact:** Full account takeover of any user, including the platform admin, with no access to their mailbox.

---

## Feature: Registration & Company Settings

### reg-weak — Weak password policy at registration
- **OWASP:** Authentication Failures (A07)
- **Location:** `POST /register` — no length or complexity check is performed on the chosen password.
- **Exploitation:** Register with the password `x`. The account — with its own new company and credit line — works immediately.
- **Business impact:** Staff accounts end up protected by instantly guessable passwords on a platform that extends credit.

### reg-mass — Mass assignment at registration (credit limit)
- **OWASP:** Broken Access Control — Mass Assignment (API3 / A01)
- **Location:** `POST /register` — the new company record is built from the request, and a client-supplied `creditLimit` field is honoured.
- **Exploitation:** Add `creditLimit=777777` to the register POST. Your brand-new company starts with a $777,777 limit instead of the standard $10,000.
- **Business impact:** A new "customer" grants themselves a huge credit line on day one — the platform's risk decision is written by the person it restrains.

### V5 / settings-mass — Mass assignment on company settings (self-raised credit limit)
- **OWASP:** Broken Access Control — Mass Assignment (API3 / A01)
- **Location:** `POST /company/settings` — every submitted field is assigned to the company object.
- **Exploitation:** Intercept the settings save and add `creditLimit=999999` (try also `creditUsed=0`, `tier=Gold`) to the POST body. Your company's limit is now whatever you typed.
- **Business impact:** Turns the credit bypass into permanent privilege: the tenant rewrites the platform's own risk decision.

### settings-csrf — CSRF on company settings
- **OWASP:** Cross-Site Request Forgery (A01)
- **Location:** `POST /company/settings` — no anti-CSRF token; the app marks its own pages with an `hx_origin` cookie but never checks for it.
- **Exploitation:** An auto-submitting form on any foreign site POSTs to `/company/settings` in a logged-in victim's browser; the company details change with no same-site proof.
- **Business impact:** Silent manipulation of company data as a stepping stone to invoice fraud and account abuse.

---

## Feature: Product Search

### V14 / search-sqli — SQL-injection-style search bypass (internal data exposure)
- **OWASP:** Injection (A03)
- **Location:** `GET /products/search?q=` — the search term is concatenated into a naive query string (`... LIKE '%<q>%' AND internal = 0`); the lab simulates the classic result of that pattern.
- **Exploitation:** Search for `' OR '1'='1` (or `' OR 1=1 --`). The visibility filter breaks: **all** products return, including the hidden `[INTERNAL] Supplier Cost Sheet` row — and the result table now shows **cost prices** for everything.
- **Business impact:** The wholesaler's cost base and internal-only records leak to any buyer — competitors learn exact margins and can undercut or renegotiate from strength.

### search-xss — Reflected XSS in search results
- **OWASP:** Injection — Cross-Site Scripting, Reflected (A03)
- **Location:** `GET /products/search?q=` — the term is echoed **unescaped** in the "Showing results for:" line (the displayed query string is encoded; the echo is not).
- **Exploitation:** Search for `<script>alert(1)</script>` and the payload executes in the browser of whoever opens that search URL.
- **Business impact:** Phishing with links to the client's own platform that run attacker script inside a logged-in staff session — session theft and actions as the victim.

---

## Feature: Purchase Orders

### V1 / po-self-approve — PO approval bypass: creator approves their own purchase order
- **OWASP:** Broken Access Control / Insecure Direct Workflow (separation-of-duties failure)
- **Location:** `POST /pos/:id/approve` — checks only that *someone* is logged in.
- **Exploitation:** Log in as `a-buyer@` → create a PO → open it → click **Approve PO** (or POST to `/pos/<id>/approve`). The PO becomes `approved` and an invoice is generated — no approver involved.
- **Business impact:** A single buyer can commit their company to unlimited spend. The entire four-eyes control on purchasing is theatre.

### V2 / po-idor — Company isolation broken: cross-tenant PO access (tenant IDOR)
- **OWASP:** Broken Access Control — IDOR (A01)
- **Location:** `GET /pos/:id` — no `companyId` ownership check.
- **Exploitation:** As Company A's buyer, open `/pos/1002` (Company B's PO). Full lines, prices and notes are visible. Enumerate IDs freely.
- **Business impact:** Competitors see each other's order volumes, negotiated volumes and purchasing patterns — commercially sensitive wholesale intelligence leaks.

### V3 / po-tier — Bulk-tier manipulation (claimed tier trusted)
- **OWASP:** Business Logic / Improper Input Validation
- **Location:** `POST /pos` — the `claimedTier` form field decides which pricing tier is charged, not the real quantity.
- **Exploitation:** Create a PO with **Quantity = 10** but **Claimed bulk tier = 200**. You are charged the 200+ unit price for a 10-unit order.
- **Business impact:** Every buyer can self-serve the deepest bulk discount on small orders, silently eroding margin on every sale.

### V4 / po-credit — Credit-limit bypass
- **OWASP:** Business Logic — control enforced only on the client
- **Location:** `POST /pos/:id/submit` (and PO creation) — the server never checks `creditLimit` vs `creditUsed + PO total`; only the browser form "warns".
- **Exploitation:** Build a PO totalling far beyond your company's remaining credit and submit it directly. It is accepted and, once approved, invoiced.
- **Business impact:** Companies can run up unsecured credit far beyond their assessed limit — direct bad-debt exposure for the wholesaler.

### V11 / po-price — Price tampering on PO lines
- **OWASP:** Business Logic / Parameter Tampering
- **Location:** `POST /pos/:id/lines` (and the `unitPrice` field accepted at PO creation) — client-supplied price is stored as-is.
- **Exploitation:** Create any PO, then use **Amend a line price** to set the unit price to `0.01`. Submit and approve: the invoice is issued at your price.
- **Business impact:** Goods can be ordered at ~zero price through the normal workflow — the invoice itself becomes the fraud document.

### po-qty — Unvalidated quantity: ordering beyond stock
- **OWASP:** Business Logic / Improper Input Validation
- **Location:** `POST /pos` — the quantity is clamped to a minimum of 1 but never checked against the product's stock.
- **Exploitation:** Order 2,000 units of a product with 1,400 in stock. The PO is created without complaint.
- **Business impact:** Buyers commit the wholesaler to deliver goods that do not exist — failed fulfilment, penalty clauses, warehouse chaos.

### V13 / po-rebate — Rebate code reuse without limit (stacking)
- **OWASP:** Business Logic — abuse of functionality
- **Location:** `POST /pos/:id/rebate` — codes (`WHOLESALE10`, `BULK5`) add their percentage every time they're applied; no per-PO, per-company or global usage limit.
- **Exploitation:** Apply `WHOLESALE10` to the same PO repeatedly — 10% + 10% + 10%… The PO total keeps dropping (apply enough times and it approaches zero).
- **Business impact:** Discounts stack far beyond the intended commercial terms; margin loss scales with every order a buyer touches.

### V8 / po-xss — Stored XSS in PO notes
- **OWASP:** Cross-Site Scripting — Stored (A03 Injection)
- **Location:** PO `notes` field, rendered **unescaped** on the PO detail page (`GET /pos/:id`) — the page approvers and admins read.
- **Exploitation:** Create a PO with notes: `<script>alert(document.cookie)</script>` (or an `<img onerror>` payload). Anyone opening that PO — approver or admin — executes it.
- **Business impact:** Session theft / actions-on-behalf against the exact people who approve spending and administer the platform.

### V9 / po-csrf — CSRF on the approve action (state-changing GET link)
- **OWASP:** Cross-Site Request Forgery (A01)
- **Location:** `GET /pos/:id/approve-link` — approves a PO on a plain GET, no anti-CSRF token anywhere.
- **Exploitation:** Send an approver a page/message containing `<img src="http://127.0.0.1:3018/pos/1003/approve-link">`. When their browser loads it (while logged in), PO-1003 is approved.
- **Business impact:** Approvals can be forged from outside the platform — combined with V1/V4, spend can be pushed through without any insider clicking "approve" in the app.

---

## Feature: Invoices

### V7 / inv-idor — Invoice IDOR (cross-company invoice download)
- **OWASP:** Broken Access Control — IDOR (A01)
- **Location:** `GET /invoices/:id` and `GET /invoices/:id/download` — no ownership check.
- **Exploitation:** As Company A, open `/invoices/2002` or `/invoices/2002/download` — Company B's invoice, with their company name, lines and totals.
- **Business impact:** Financial documents of one business are exposed to another — privacy breach, fraud enabler (fake-invoice scams), audit failure.

---

## Feature: Platform & API

### V6 / api-leak — Negotiated-price leak (all companies)
- **OWASP:** Broken Access Control / Excessive Data Exposure
- **Location:** `GET /api/negotiated-prices` — returns every company's negotiated prices to any logged-in user.
- **Exploitation:** Log in as any buyer and open `/api/negotiated-prices` (linked from the dashboard). Company names, products and their private negotiated prices are all there.
- **Business impact:** Confidential commercial terms leak to direct competitors, destroying trust and negotiating position.

### platform-headers — Missing security headers
- **OWASP:** Security Misconfiguration (A05)
- **Location:** All responses — no `Content-Security-Policy`, no `X-Frame-Options`/`frame-ancestors`, no `X-Content-Type-Options`.
- **Exploitation:** Fetch any page and inspect the headers (`curl -I`). Pages can be framed by any site (clickjacking) and injected scripts meet no CSP backstop.
- **Business impact:** The platform can be embedded in phishing pages to hijack clicks from logged-in staff, and every injection flaw becomes easier to exploit.

---

## Feature: Admin Panel

### V10 / admin-cookie — Role tampering via cookie → platform admin
- **OWASP:** Broken Access Control — privilege escalation
- **Location:** Login sets a plain `role` cookie; privilege checks (e.g. `/admin`) trust the cookie value.
- **Exploitation:** Log in as any buyer, then change your `role` cookie to `admin` (DevTools → Application → Cookies, or Burp). Open `/admin` — full platform dashboard: all companies, credit limits, all users.
- **Business impact:** Complete platform compromise from the lowest-privilege account: every tenant's data and credit posture exposed.
