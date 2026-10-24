# HexaLoan — Fix & Retest Guide (LAB 46)

For every scored test: the secure implementation that removes the flaw, and the regression check that proves it stays fixed.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass — Critical
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Missing Brute-Force Protection on Login — High
- **Fix:** Add progressive delays, account lockout and CAPTCHA after repeated failures; alert on credential-stuffing patterns.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Account Enumeration via Differential Authentication Responses — Medium
- **Fix:** Return one generic “invalid credentials” message for all failed logins and reset requests.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Default Demo Account with Weak Password Enabled in Production — High
- **Fix:** Remove demo/default accounts before launch; enforce strong unique passwords for every seeded account.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Predictable Password Reset Token Enables Account Takeover — Critical
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire within 30–60 minutes, single use.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Privilege Escalation via Client-Controlled Role Cookie — Critical
- **Fix:** Derive roles from the server-side session record on every request; never trust client-supplied role values.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration — Medium
- **Fix:** Require ≥10–12 characters, screen against breached-password lists, and encourage passphrases.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Mass Assignment Allows Modification of Credit Score and Role — High
- **Fix:** Whitelist updatable fields per endpoint; never bind raw request bodies to data models.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Stored Cross-Site Scripting via Display Name — High
- **Fix:** Context-encode all user output; add a Content-Security-Policy as defence in depth.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Cross-Site Request Forgery on Profile Update — Medium
- **Fix:** Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Loan Applications

### Insecure Direct Object Reference Exposes Loan Applications — High
- **Fix:** Enforce per-object ownership/authorisation checks on every read; use unguessable ids as defence in depth.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Loan Eligibility Determined from Client-Supplied Income and Credit Score — Critical
- **Fix:** Compute eligibility exclusively from verified server-side profile/credit-bureau data; treat form values as claims to verify.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Server Fails to Enforce Maximum Loan Amount — Medium
- **Fix:** Validate amount ranges server-side on create and edit; reject values outside policy.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Borrower Can Forge Loan Status, Including Disbursed — Critical
- **Fix:** Implement a server-side state machine; only staff actions may advance a loan past submission.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Approval Workflow

### Missing Segregation of Duties Allows Self-Approval of Loans — Critical
- **Fix:** Server-side role checks plus an explicit rule that approver ≠ applicant on every approval action.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Approval Endpoint Does Not Require Prior Verification Step — High
- **Fix:** Enforce workflow state transitions server-side; approve only from the verified state.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Approval Allowed from Terminal Rejected State — High
- **Fix:** Whitelist source states for each transition; rejected/closed loans require a brand-new application.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Repayments

### Insecure Direct Object Reference Exposes Repayment Schedules — High
- **Fix:** Check ownership on every nested resource read, not just the parent object.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Installment Marked Paid Without Full Payment — Critical
- **Fix:** Compute installment status from recorded payment totals server-side; ignore client settlement flags.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Loan Settlement Trusts Client-Declared Paid Amount — Critical
- **Fix:** Close loans only when server-recorded payments cover principal + interest; reconcile with the payment provider.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Documents

### Insecure Direct Object Reference Exposes Borrower Documents — High
- **Fix:** Authorise every file download against the owner/staff role; log access to sensitive documents.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Unrestricted File Upload Allows Stored HTML/JS on Application Origin — High
- **Fix:** Whitelist file types, verify content, store outside web root, serve with Content-Disposition: attachment.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Admin Panel

### Cross-Site Request Forgery on Platform Interest-Rate Settings — High
- **Fix:** CSRF tokens on all admin mutations, SameSite=Lax/Strict cookies, and Origin verification.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

## Platform & API

### Unauthenticated Administrative Data Export Endpoint — Critical
- **Fix:** Require authenticated admin authorisation on export/debug routes; remove them from production builds.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.

### Predictable API Keys Derived from Email Addresses — High
- **Fix:** Issue random 256-bit API tokens, store hashed, support rotation and revocation.
- **Retest:** repeat the original exploit from PRACTICE-GUIDE.md; it must now fail (blocked, rejected, or return only the requester's own data), and the corresponding /tests entry must stay open when the lab is re-run against the fixed build.
