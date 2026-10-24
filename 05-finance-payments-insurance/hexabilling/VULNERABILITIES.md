# HexaBilling — Vulnerability Map (all 26 scored tests)

Every entry below is a real, working flaw in this lab. A test is scored only when the exploit's effect actually happens on the server.

## Login & Authentication

### SQL Injection Login Bypass (legacy SSO route)
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Submit email: admin@hexabilling.local' OR '1'='1' -- with any password — you land in the platform admin account.
- **Impact:** On a real billing platform this is total compromise on day one: every business account, every invoice and every stored payment method is exposed.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Submit 10+ failed logins for demo@hexabilling.local — the app processes every one; automated guessing would run forever.
- **Impact:** Attackers can credential-stuff or brute-force your customers’ billing accounts and pivot into invoices and payment data.

### User Enumeration via Login & Password-Reset Responses
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Existing email + wrong password says "Incorrect password"; a made-up email says "No account found" — that difference is an account oracle.
- **Impact:** Attackers first harvest which of your customers have accounts, then aim phishing and password attacks only at real targets.

### Default Platform Admin Credentials
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Log in as admin@hexabilling.local with password admin123 — the install-time default still works.
- **Impact:** Anyone on the internet can try vendor defaults; on a billing platform that means the master account guarding all customer billing data.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Tokens look like RST-(id*137+42). Compute one for another user’s id and post it to /reset with a new password.
- **Impact:** Full account takeover of any customer — including business owners — without touching their inbox.

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /login, POST /forgot, POST /reset, hx_role cookie, GET /admin
- **Exploitation outline:** Set the hx_role cookie to admin in your browser and open /admin — the gate believes you.
- **Impact:** Any logged-in customer can promote themselves to platform admin and read or suspend every business on the platform.

## Registration & Profile

### Mass Assignment — Self-Assign Admin Role at Signup
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /register, POST /profile, GET /admin (rendering)
- **Exploitation outline:** Register with an extra field role=admin in the POST body: the new account is created as a platform admin.
- **Impact:** Attackers mint themselves admin accounts on your SaaS from the public signup form — no exploit tooling required.

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Location:** POST /register, POST /profile, GET /admin (rendering)
- **Exploitation outline:** Register an account with the password "x" — it is accepted and can log in.
- **Impact:** Weak customer passwords fall instantly to guessing, especially combined with unlimited login attempts.

### Stored XSS in Business Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Location:** POST /register, POST /profile, GET /admin (rendering)
- **Exploitation outline:** Set the business display name (Profile) to <script>alert(1)</script> — it is stored and rendered raw in the admin business list.
- **Impact:** A customer can run script in your support team’s browser — session theft and admin actions performed by the victim’s own browser.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /register, POST /profile, GET /admin (rendering)
- **Exploitation outline:** While logged in, submit the /profile form from a page with Origin https://evil.example — the change is applied anyway.
- **Impact:** A malicious link can silently change a customer’s billing contact details — the first step of invoice-redirection fraud.

## Subscriptions & Plans

### Plan Upgrade Without Payment
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /subscription/upgrade, /subscription/change, /subscription/trial/extend, /subscription/seats
- **Exploitation outline:** POST /subscription/upgrade with plan=scale and amount=0 — the business is upgraded to Scale instantly, no invoice, no payment.
- **Impact:** Customers help themselves to your most expensive tier for free — direct revenue loss that scales with every user who notices.

### Proration Credit Manipulation
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Advanced
- **Location:** POST /subscription/upgrade, /subscription/change, /subscription/trial/extend, /subscription/seats
- **Exploitation outline:** POST /subscription/change with plan=growth and prorationCredit=9000 — your account credit jumps by exactly $9,000.
- **Impact:** Attackers mint unlimited account credit and never pay for the service again — silent, compounding revenue leakage.

### Trial Extension Abuse
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /subscription/upgrade, /subscription/change, /subscription/trial/extend, /subscription/seats
- **Exploitation outline:** POST /subscription/trial/extend with days=365 — the free trial now runs for over a year.
- **Impact:** Free-forever accounts: users run production workloads on endless trials and the business never converts them.

### Seat Count Tampering (Negative Seats)
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Location:** POST /subscription/upgrade, /subscription/change, /subscription/trial/extend, /subscription/seats
- **Exploitation outline:** POST /subscription/seats with seats=-5 — the count is stored and the monthly bill drops below the plan price.
- **Impact:** Customers shrink or negate their bill by editing a number the server should never have trusted.

## Coupons

### Coupon Stacking on One Invoice
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /coupons, POST /invoices/:id/coupon
- **Exploitation outline:** Apply SAVE20 to an open invoice, then apply WELCOME10 to the same invoice — both discounts are deducted.
- **Impact:** Combined promotions quietly multiply — margin disappears on every stacked invoice and spreads by word of mouth.

### Single-Use Coupon Reuse
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Location:** POST /coupons, POST /invoices/:id/coupon
- **Exploitation outline:** ONETIME50 applies successfully to two different invoices; the redemption counter is never checked.
- **Impact:** A one-off goodwill or win-back coupon becomes a permanent 50% discount for anyone it leaks to.

### Over-100% Coupon Creates Negative Invoice (Credit Minting)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Advanced
- **Location:** POST /coupons, POST /invoices/:id/coupon
- **Exploitation outline:** Create coupon MEGA150 with percent=150, apply it — the invoice total goes negative and turns into account credit.
- **Impact:** Negative invoices convert to spendable credit — attackers manufacture balance from nothing.

## Usage Metering

### Negative Usage Reporting Rewinds the Meter
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Location:** POST /usage, POST /usage/:id/delete
- **Exploitation outline:** POST /usage with metric=api_calls and quantity=-5000 — the usage total drops and so does the amount owed.
- **Impact:** Customers erase their usage bill by reporting negative consumption — pure revenue loss with a clean-looking audit trail.

### Delete Another Business’s Usage Records (IDOR)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** POST /usage, POST /usage/:id/delete
- **Exploitation outline:** POST /usage/<id-of-pixelforge-record>/delete while logged in as Northbeam — the record is gone.
- **Impact:** A competitor-tenant can vandalise another business’s billing data, destroying invoices before they are even issued.

## Invoices

### Invoice IDOR Across Businesses
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /invoices/:id, POST /invoices/:id/status, GET /i/:token
- **Exploitation outline:** GET /invoices/4 while logged in as Northbeam — PixelForge’s invoice renders in full, line items and totals included.
- **Impact:** Every customer’s invoices — amounts, clients, payment status — readable by any other customer with a browser.

### Invoice Status Forgery — Mark Paid Without Paying
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Location:** GET /invoices/:id, POST /invoices/:id/status, GET /i/:token
- **Exploitation outline:** POST /invoices/<your draft id>/status with status=paid — the invoice shows PAID with zero payments recorded.
- **Impact:** Customers mark their own bills paid and receive service for free; accounting reconciles against fiction.

### Guessable Public Invoice Links (Enumeration)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Location:** GET /invoices/:id, POST /invoices/:id/status, GET /i/:token
- **Exploitation outline:** Request /i/pub-1001, /i/pub-1002, /i/pub-1003, /i/pub-1004, /i/pub-1005 — five sequential public invoices, no login needed.
- **Impact:** Unauthenticated attackers enumerate every invoice ever issued — a complete, silent copy of the platform’s billing history.

## Customers & Payments

### Customer Record IDOR (Emails + Card Details)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Location:** GET /customers/:id, POST /invoices/:id/pay
- **Exploitation outline:** GET /customers/3 as Northbeam — you see PixelForge’s customer, their email and their stored card brand + last four digits.
- **Impact:** Attackers harvest names, emails and card fragments of every customer on the platform for phishing and fraud.

### Pay Your Invoice with Another Business’s Card
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Location:** GET /customers/:id, POST /invoices/:id/pay
- **Exploitation outline:** POST /invoices/<your invoice>/pay with paymentMethodId of PixelForge’s card — the charge lands on their card, your invoice is PAID.
- **Impact:** Direct financial fraud: one tenant pays its bills with another tenant’s stored card.

## Platform & API

### Predictable API Key Derived from Owner Email
- **OWASP:** A02:2021 Cryptographic Failures · **Difficulty:** Intermediate
- **Location:** GET /api/invoices, GET /api/debug
- **Exploitation outline:** Compute hb_ + base64(owner@pixelforge.test) and call GET /api/invoices with it as a Bearer token — no login, full invoice list of that business.
- **Impact:** Anyone who knows a business owner’s email — public information — owns their API: invoices, customers, exports.

### Unauthenticated Debug Dump of All Platform Data
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Location:** GET /api/invoices, GET /api/debug
- **Exploitation outline:** GET /api/debug returns every user, business, invoice and payment method on the platform, unauthenticated.
- **Impact:** One unauthenticated request exfiltrates the entire platform database — the worst-case breach in a single call.
