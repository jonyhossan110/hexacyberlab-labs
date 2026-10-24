# HexaBank — Fix & Retest Guide (LAB 43)

For every scored test: the professional report title, severity, the secure implementation that removes the flaw, and the regression check that proves the fix holds. Work through them after completing the lab — finding a flaw is half the job; verifying the fix is the other half.

## Login & Authentication

### SQL Injection in Online Banking Login (Authentication Bypass)
- **Severity:** Critical · **Test:** SQL Injection Login Bypass (A03 Injection)
- **Fix:** Use parameterised queries everywhere; never build SQL by string concatenation; add regression tests with injection payloads on all auth endpoints.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("SQL Injection Login Bypass"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing Brute-Force Protection on Customer Login
- **Severity:** High · **Test:** Brute Force — No Lockout or Throttle (A07 Authentication Failures)
- **Fix:** Add progressive delays, per-account and per-IP throttling, lockout with safe unlock, and alerting on credential-stuffing patterns.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Brute Force — No Lockout or Throttle"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Account Enumeration via Password-Reset Responses
- **Severity:** Medium · **Test:** Customer Enumeration via Password Reset (A07 Authentication Failures)
- **Fix:** Return one identical, generic message for every reset request regardless of whether the account exists.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Customer Enumeration via Password Reset"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Default Credentials on Platform Admin Account
- **Severity:** Critical · **Test:** Default Admin Credentials (A07 Authentication Failures)
- **Fix:** Force unique, strong passwords at first setup; scan all privileged accounts for known default passwords and rotate them.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Default Admin Credentials"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Predictable Password-Reset Tokens Allow Account Takeover
- **Severity:** Critical · **Test:** Predictable Password-Reset Token (A07 Authentication Failures)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Predictable Password-Reset Token"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Client-Controlled Role in Session Cookie Enables Privilege Escalation
- **Severity:** Critical · **Test:** Session Cookie Role Tampering (A01 Broken Access Control)
- **Fix:** Keep roles server-side in the session store; if claims travel in a cookie, sign them (HMAC) and verify before trusting any field.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Session Cookie Role Tampering"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Registration & Profile

### No Minimum Password Strength for New Banking Accounts
- **Severity:** Medium · **Test:** Weak Password Policy at Registration (A07 Authentication Failures)
- **Fix:** Enforce a modern password policy (length ≥ 12, breached-password screening) at registration and password change.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Weak Password Policy at Registration"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Mass Assignment in Registration Allows Role/Tier Escalation
- **Severity:** High · **Test:** Mass Assignment — Self-Appointed Staff / Premium Tier (A01 Broken Access Control)
- **Fix:** Whitelist assignable fields explicitly on registration; set role and tier server-side only.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Mass Assignment — Self-Appointed Staff / Premium Tier"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Stored Cross-Site Scripting via Customer Display Name
- **Severity:** High · **Test:** Stored XSS in Display Name (A03 Injection)
- **Fix:** Output-encode all user data at render time and validate name fields against a strict character whitelist.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Stored XSS in Display Name"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing CSRF Validation on Profile Update
- **Severity:** Medium · **Test:** CSRF on Profile Update (A01 Broken Access Control)
- **Fix:** Verify a per-session anti-CSRF token server-side on every state-changing request; reject requests that lack it.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("CSRF on Profile Update"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Accounts & Statements

### Insecure Direct Object Reference on Account Details
- **Severity:** High · **Test:** Account Details IDOR (A01 Broken Access Control)
- **Fix:** Authorise every account read against the session customer (owner, joint holder, or staff with a business need); log cross-customer access attempts.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Account Details IDOR"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Insecure Direct Object Reference on Account Statements
- **Severity:** High · **Test:** Statement IDOR — Read Another Customer's Statement (A01 Broken Access Control)
- **Fix:** Enforce account ownership on statement generation exactly as on account reads; audit statement access.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Statement IDOR — Read Another Customer's Statement"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Unauthorised Statement Export (CSV) for Arbitrary Accounts
- **Severity:** High · **Test:** Statement CSV Export of Another Customer (A01 Broken Access Control)
- **Fix:** Apply the same ownership authorisation to export/download endpoints as to on-screen views; rate-limit and log exports.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Statement CSV Export of Another Customer"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Transfers

### Server-Side Transfer Limit Missing (Policy Stated, Not Enforced)
- **Severity:** High · **Test:** Daily Transfer Limit Not Enforced (A04 Insecure Design)
- **Fix:** Enforce per-customer daily transfer limits server-side, calculated across all channels, before any funds move.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Daily Transfer Limit Not Enforced"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Negative Transfer Amounts Reverse Fund Flow (Money Creation)
- **Severity:** Critical · **Test:** Negative-Amount Transfer Creates Money (A04 Insecure Design)
- **Fix:** Reject non-positive amounts server-side; re-verify source balance and limits inside the transfer transaction.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Negative-Amount Transfer Creates Money"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing Ownership Check on Transfer Source Account
- **Severity:** Critical · **Test:** Transfer Out of Another Customer's Account (A01 Broken Access Control)
- **Fix:** Verify the authenticated customer owns (or is mandated on) the source account inside the transfer handler; reject and alert otherwise.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Transfer Out of Another Customer's Account"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing CSRF Validation on Fund Transfers
- **Severity:** Critical · **Test:** CSRF on Fund Transfer (A01 Broken Access Control)
- **Fix:** Require and verify anti-CSRF tokens on all money-movement endpoints; consider step-up confirmation for new payees and large amounts.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("CSRF on Fund Transfer"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Payees

### Insecure Direct Object Reference on Payee Deletion
- **Severity:** Medium · **Test:** Delete Another Customer's Payee (A01 Broken Access Control)
- **Fix:** Scope every payee read/write/delete to the owning customer; return 404 for foreign payee ids.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Delete Another Customer's Payee"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Stored Cross-Site Scripting via Payee Name
- **Severity:** High · **Test:** Stored XSS in Payee Name (A03 Injection)
- **Fix:** Output-encode payee names at render; restrict payee names to a safe character set at input.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Stored XSS in Payee Name"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Loans

### Insecure Direct Object Reference on Loan Summaries
- **Severity:** High · **Test:** Loan Summary IDOR (A01 Broken Access Control)
- **Fix:** Authorise loan reads against the borrowing customer or mandated staff; log cross-customer access.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Loan Summary IDOR"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Missing Role Check on Loan Rate Adjustment (Staff Function)
- **Severity:** Critical · **Test:** Customer Rewrites Own Loan Interest Rate (A01 Broken Access Control)
- **Fix:** Require staff role server-side for all loan-term mutations; dual-approve rate changes and audit them.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Customer Rewrites Own Loan Interest Rate"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Staff & Admin Panel

### Broken Access Control on Staff Console (Any Customer Can Enter)
- **Severity:** Critical · **Test:** Customers Reach the Staff Console (A01 Broken Access Control)
- **Fix:** Enforce staff/admin role server-side on all staff routes; deny by default and test each role against each route.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Customers Reach the Staff Console"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Reflected Cross-Site Scripting in Staff Customer Search
- **Severity:** High · **Test:** Reflected XSS in Staff Customer Search (A03 Injection)
- **Fix:** Output-encode the reflected query and all result fields; add a Content-Security-Policy as defence in depth.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Reflected XSS in Staff Customer Search"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Cross-Site Request Forgery on Admin Account Freeze
- **Severity:** High · **Test:** CSRF on Admin Account Freeze (A01 Broken Access Control)
- **Fix:** Verify anti-CSRF tokens on all admin mutations; require step-up re-authentication for account freeze/unfreeze.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("CSRF on Admin Account Freeze"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

## Platform & API

### Predictable API Tokens and Missing Customer Scoping in Account API
- **Severity:** Critical · **Test:** Predictable API Token & Unscoped Account API (A07 Authentication Failures)
- **Fix:** Issue random, revocable API keys (hashed at rest); enforce per-customer scoping on every API query.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Predictable API Token & Unscoped Account API"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

### Debug Endpoint Exposes All User Credentials
- **Severity:** Critical · **Test:** Debug Endpoint Dumps Customer Passwords (A05 Security Misconfiguration)
- **Fix:** Remove debug endpoints from production builds; never store or display plaintext passwords; audit for other diagnostic routes.
- **Retest:** re-run the original exploit from PRACTICE-GUIDE.md ("Debug Endpoint Dumps Customer Passwords"). It must now fail — no session created, no foreign object served, no state changed — and the corresponding test must NOT flip when the lab's detection is pointed at the fixed build. Also confirm the legitimate workflow still works end to end.

