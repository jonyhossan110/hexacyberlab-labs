# HexaBilling — Fix & Retest

For every scored test: the secure implementation and the regression check that proves the flaw is gone in a fixed build. Severity and remediation are written the way they would appear in a real client pentest report.

## Login & Authentication

### SQL Injection in Authentication (Legacy SSO Login)
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries everywhere and retire the legacy string-concatenation login path.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("SQL Injection Login Bypass (legacy SSO route)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Missing Brute-Force Protection on Login
- **Severity:** High
- **Secure implementation:** Add progressive rate limiting, account lockout and alerting on repeated failed logins.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Brute Force — No Rate Limit or Lockout"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Account Enumeration via Differential Authentication Responses
- **Severity:** Medium
- **Secure implementation:** Return one generic "invalid email or password" message and identical reset responses for all inputs.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("User Enumeration via Login & Password-Reset Responses"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Default Credentials on Platform Administrator Account
- **Severity:** Critical
- **Secure implementation:** Force a unique admin password at first setup and disable or rotate all seeded credentials.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Default Platform Admin Credentials"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Predictable Password Reset Token Allows Account Takeover
- **Severity:** High
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, single-use and short-lived.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Predictable Password-Reset Token"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Privilege Escalation via Client-Side Role Cookie
- **Severity:** High
- **Secure implementation:** Never trust client-supplied role claims; resolve authorization from the server-side session on every request.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Session Role Cookie Tampering"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Registration & Profile

### Mass Assignment in Registration Allows Admin Self-Creation
- **Severity:** Critical
- **Secure implementation:** Whitelist assignable fields on every endpoint; never bind role/tier fields from client input.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Mass Assignment — Self-Assign Admin Role at Signup"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### No Minimum Password Strength Enforced
- **Severity:** Medium
- **Secure implementation:** Enforce ≥10 characters, screen against breached-password lists, and encourage passphrases.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Weak Password Policy (1-Character Passwords)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Stored Cross-Site Scripting via Business Display Name
- **Severity:** High
- **Secure implementation:** Contextually output-encode all user data and add a Content-Security-Policy header.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Stored XSS in Business Display Name"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Cross-Site Request Forgery on Profile Update
- **Severity:** Medium
- **Secure implementation:** Require per-session CSRF tokens on all state-changing requests and validate Origin/Referer.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on Profile Update"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Subscriptions & Plans

### Subscription Upgrade Applied Without Payment Verification
- **Severity:** High
- **Secure implementation:** Compute upgrade charges server-side and apply plan changes only after a confirmed payment event.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Plan Upgrade Without Payment"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Client-Supplied Proration Credit Applied to Account Balance
- **Severity:** High
- **Secure implementation:** Calculate proration server-side from plan prices and cycle dates; ignore all client-supplied money fields.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Proration Credit Manipulation"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Unbounded Trial Extension Allows Indefinite Free Use
- **Severity:** Medium
- **Secure implementation:** Fix trial length server-side, allow at most one trial per business, and require payment method upfront.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Trial Extension Abuse"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Missing Range Validation on Seat Count Enables Billing Manipulation
- **Severity:** Medium
- **Secure implementation:** Validate seats as an integer within plan limits server-side before applying billing changes.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Seat Count Tampering (Negative Seats)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Coupons

### Multiple Coupons Can Be Stacked on a Single Invoice
- **Severity:** Medium
- **Secure implementation:** Enforce a single active coupon per invoice server-side and reject further applications.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Coupon Stacking on One Invoice"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Single-Use Coupon Can Be Redeemed Multiple Times
- **Severity:** Medium
- **Secure implementation:** Record redemptions transactionally and reject codes whose single-use budget is exhausted.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Single-Use Coupon Reuse"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Coupon Percentage Above 100% Produces Negative Invoice Totals
- **Severity:** High
- **Secure implementation:** Clamp coupon percent to 1–100 at creation and floor invoice totals at zero server-side.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Over-100% Coupon Creates Negative Invoice (Credit Minting)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Usage Metering

### Negative Usage Quantities Accepted and Deducted from Billable Total
- **Severity:** High
- **Secure implementation:** Reject negative or implausible usage server-side; make usage events append-only with signed sources.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Negative Usage Reporting Rewinds the Meter"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Insecure Direct Object Reference on Usage Record Deletion
- **Severity:** High
- **Secure implementation:** Scope every usage query and mutation by the caller’s business id on the server.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Delete Another Business’s Usage Records (IDOR)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Invoices

### Broken Access Control Exposes Other Businesses’ Invoices
- **Severity:** High
- **Secure implementation:** Filter all invoice reads by the session’s business id; return 404 for foreign objects.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Invoice IDOR Across Businesses"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Invoice Status Can Be Forged to Paid Without a Payment
- **Severity:** High
- **Secure implementation:** Restrict status transitions server-side; derive "paid" only from recorded, verified payments.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Invoice Status Forgery — Mark Paid Without Paying"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Predictable Public Invoice Tokens Allow Full Enumeration
- **Severity:** High
- **Secure implementation:** Use ≥128-bit random tokens for share links, rate-limit probing, and expire links after payment.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Guessable Public Invoice Links (Enumeration)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Customers & Payments

### Customer PII and Payment Metadata Exposed via IDOR
- **Severity:** High
- **Secure implementation:** Scope customer reads by business id and minimise payment data shown (brand/last4 only where needed).
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Customer Record IDOR (Emails + Card Details)"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Stored Payment Method of Another Business Can Be Charged
- **Severity:** Critical
- **Secure implementation:** Verify payment-method ownership against the session business on every charge; log and alert on mismatches.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Pay Your Invoice with Another Business’s Card"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

## Platform & API

### API Keys Predictably Derived from Owner Email
- **Severity:** High
- **Secure implementation:** Issue CSPRNG API keys, store only hashes, support rotation and per-key scopes.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Predictable API Key Derived from Owner Email"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.

### Unauthenticated Debug Endpoint Exposes Full Platform Dataset
- **Severity:** Critical
- **Secure implementation:** Remove debug/diagnostic endpoints from production builds and gate any internal tooling behind admin auth.
- **Retest:** Repeat the original exploit from PRACTICE-GUIDE.md ("Unauthenticated Debug Dump of All Platform Data"). Expected after the fix: the exploit effect no longer occurs (request rejected, scoped to the owner, or value recomputed server-side) and the lab test does NOT flip to done, while the legitimate workflow still succeeds.
