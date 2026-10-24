# HexaHealthInsure — Fix & Retest Guide (LAB 70)

For every scored test: the secure implementation, and the regression check that proves the fix. Apply the fix in a COPY of the lab, retest with the same exploit that passed the test, and confirm the exploit now fails while normal use still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical · **OWASP:** A03 Injection
- **Secure implementation:** Use parameterised queries everywhere; never build SQL with string concatenation.
- **Regression test:** Repeat the original exploit ("SQL Injection Login Bypass"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### No Rate Limiting or Account Lockout on Login
- **Severity:** High · **OWASP:** A07 Auth Failures
- **Secure implementation:** Throttle login attempts per account and IP; add progressive delays or CAPTCHA after repeated failures.
- **Regression test:** Repeat the original exploit ("Brute Force — No Rate Limiting"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Account Enumeration via Differential Error Messages
- **Severity:** Medium · **OWASP:** A07 Auth Failures
- **Secure implementation:** Return one generic message for all login and password-reset outcomes.
- **Regression test:** Repeat the original exploit ("User Enumeration via Error Messages"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Working Demo Account Disclosed on the Login Page
- **Severity:** High · **OWASP:** A07 Auth Failures
- **Secure implementation:** Remove demo accounts from production and never print credentials in the UI.
- **Regression test:** Repeat the original exploit ("Published Demo Credentials"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Password Reset Tokens Are Predictable
- **Severity:** High · **OWASP:** A07 Auth Failures
- **Secure implementation:** Generate reset tokens from a CSPRNG, store only a hash, expire them quickly, and bind them to a real request.
- **Regression test:** Repeat the original exploit ("Predictable Password-Reset Token"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Server Trusts Client-Supplied Role Cookie (Privilege Escalation)
- **Severity:** Critical · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Derive roles only from the server-side session; never trust role data from cookies.
- **Regression test:** Repeat the original exploit ("Role Cookie Tampering"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Registration & Profile

### No Minimum Password Strength on Registration
- **Severity:** Medium · **OWASP:** A07 Auth Failures
- **Secure implementation:** Enforce a minimum length of 12+ and block known common passwords.
- **Regression test:** Repeat the original exploit ("Weak Password Policy"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Mass Assignment Allows Privilege Escalation at Registration
- **Severity:** Critical · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Whitelist bindable fields on registration; set roles server-side only.
- **Regression test:** Repeat the original exploit ("Mass Assignment — Self-Assigned Role"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Stored Cross-Site Scripting via Display Name
- **Severity:** High · **OWASP:** A03 Injection
- **Secure implementation:** Context-encode all user-supplied output and validate name fields on the server.
- **Regression test:** Repeat the original exploit ("Stored XSS in Display Name"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Missing CSRF Protection on Profile Update
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Require a per-session CSRF token on every state-changing request and verify the Origin header.
- **Regression test:** Repeat the original exploit ("CSRF on Profile Update"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Claims

### Claim Amounts Are Not Validated Against Coverage Limits
- **Severity:** High · **OWASP:** A04 Insecure Design
- **Secure implementation:** Validate claim amounts server-side against the member’s remaining coverage before accepting.
- **Regression test:** Repeat the original exploit ("Claim Above Coverage Limit Accepted"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Insecure Direct Object Reference on Claim Details
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Check object ownership on every claim read and write.
- **Regression test:** Repeat the original exploit ("Claim IDOR — Other Members’ Claims"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Missing Authorisation on Claim Decision Endpoint (Self-Approval)
- **Severity:** Critical · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Enforce adjuster/admin role checks on the decision endpoint server-side.
- **Regression test:** Repeat the original exploit ("Members Can Approve Their Own Claims"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Members Can Forge Claim Status (Workflow Bypass)
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Drive status transitions from a server-side state machine restricted by role.
- **Regression test:** Repeat the original exploit ("Claim Status Forgery by Owner"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Approved Claims Remain Editable (Amount Tampering)
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Lock claims from editing once approved or paid; route changes through adjusters with an audit log.
- **Regression test:** Repeat the original exploit ("Editing an Already-Approved Claim"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Pre-authorizations

### Pre-Authorizations Can Be Forged as Pre-Approved
- **Severity:** Critical · **OWASP:** A04 Insecure Design
- **Secure implementation:** Set member and status server-side; approvals only through the reviewer workflow.
- **Regression test:** Repeat the original exploit ("Forged Pre-Authorization"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Insecure Direct Object Reference on Pre-Authorizations
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Verify the requester owns, or is assigned to, each pre-authorization.
- **Regression test:** Repeat the original exploit ("Pre-Authorization IDOR"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Eligibility Checks

### Eligibility Decisions Based on Client-Supplied Plan Data
- **Severity:** High · **OWASP:** A04 Insecure Design
- **Secure implementation:** Look up the member’s actual plan server-side; never accept plan parameters from the client.
- **Regression test:** Repeat the original exploit ("Eligibility Check Trusts Client-Supplied Plan"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Insecure Direct Object Reference on Eligibility Summaries
- **Severity:** Medium · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Restrict eligibility views to the owner and authorised staff.
- **Regression test:** Repeat the original exploit ("Eligibility Summary IDOR"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Plans & Coverage

### Plan Upgrades Applied Without Payment Verification
- **Severity:** High · **OWASP:** A04 Insecure Design
- **Secure implementation:** Activate plan changes only after confirmed payment.
- **Regression test:** Repeat the original exploit ("Free Plan Upgrade (No Payment)"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Provider Billing

### Providers Can Bill for Non-Existent Treatments (Phantom Billing)
- **Severity:** Critical · **OWASP:** A04 Insecure Design
- **Secure implementation:** Require bills to reference a verified claim or visit before acceptance.
- **Regression test:** Repeat the original exploit ("Billing for Treatment Never Given"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Duplicate Billing Against an Already-Paid Claim
- **Severity:** High · **OWASP:** A04 Insecure Design
- **Secure implementation:** Enforce one payable bill per claim and check the claim billing state server-side.
- **Regression test:** Repeat the original exploit ("Double Billing for the Same Claim"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Provider Directory

### Reflected Cross-Site Scripting in Provider Search
- **Severity:** Medium · **OWASP:** A03 Injection
- **Secure implementation:** HTML-encode all reflected input.
- **Regression test:** Repeat the original exploit ("Reflected XSS in Provider Search"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Admin Panel

### Missing CSRF Protection on Administrative Role Changes
- **Severity:** High · **OWASP:** A01 Broken Access Control
- **Secure implementation:** Verify CSRF tokens on all administrative actions.
- **Regression test:** Repeat the original exploit ("CSRF on Admin Role Change"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

## Platform & API

### API Tokens Are Predictably Derived from Email Addresses
- **Severity:** High · **OWASP:** A07 Auth Failures
- **Secure implementation:** Issue random, revocable API keys and store only their hashes server-side.
- **Regression test:** Repeat the original exploit ("Weak API Token (Derived from Email)"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.

### Unauthenticated Debug Endpoint Exposes All User Credentials
- **Severity:** Critical · **OWASP:** A05 Security Misconfiguration
- **Secure implementation:** Remove debug endpoints from production and never expose password data.
- **Regression test:** Repeat the original exploit ("Unauthenticated Debug Data Dump"). After the fix it must fail — the test must NOT flip to DONE — while the legitimate version of the same flow still succeeds for an authorised user.
