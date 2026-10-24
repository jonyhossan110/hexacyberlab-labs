# HexaAgency — Fix & Retest (LAB 96)

For every test: the secure implementation and the regression check that proves the flaw is gone.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Secure implementation: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("SQL injection login bypass"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### No Rate Limiting or Account Lockout on Login Endpoint (High)
- Secure implementation: Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Brute force — no rate limit or lockout"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### User Enumeration via Login and Password-Reset Responses (Medium)
- Secure implementation: Return one generic message for all credential and reset outcomes, regardless of whether the account exists.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("User enumeration via differing responses"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Active Demo Account with Published Credentials (High)
- Secure implementation: Remove demo/default accounts from production, or gate them behind the same controls as real accounts with unique secrets.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Demo / default credentials accepted"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Password Reset Tokens Are Predictable (Derived from User ID) (Critical)
- Secure implementation: Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Predictable password-reset token"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Authorisation Role Taken from a Client-Controlled Cookie (Critical)
- Secure implementation: Derive roles only from the server-side session record; never trust role claims supplied by the client.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Role cookie tampering (hx_role)"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Registration & Profile

### Password Policy Accepts Single-Character Passwords (Medium)
- Secure implementation: Enforce a minimum length (12+) and screen against known-breached password lists at registration.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Weak password policy (1 character)"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Mass Assignment Allows Privilege Escalation at Registration (Critical)
- Secure implementation: Whitelist bindable fields per endpoint; never accept role/privilege fields from the client.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Mass assignment — role via registration"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Stored Cross-Site Scripting via Display Name (High)
- Secure implementation: Context-encode all user-supplied output and validate input on the server side.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Stored XSS in display name"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Missing CSRF Protection on Profile Update (Medium)
- Secure implementation: Require per-session anti-CSRF tokens on all state-changing requests and verify Origin/Referer.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on profile update"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Search

### SQL Injection in Global Search Returns All Records (High)
- Secure implementation: Parameterise every query; apply the same fix pattern consistently across all search endpoints.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("SQL injection in global search"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Secure implementation: HTML-encode all reflected user input; add a Content-Security-Policy as defence in depth.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Reflected XSS in search"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Clients & Client Portal

### Insecure Direct Object Reference Exposes Other Clients' Records (High)
- Secure implementation: Enforce per-object ownership checks on every request, server-side, before serving any record.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Client record IDOR (cross-client data leak)"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Broken Access Control Allows Editing Other Clients' Notes (High)
- Secure implementation: Authorise every write against the object owner on the server; ignore client-supplied ownership claims.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Editing another client's internal notes"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Client Directory Accessible to Client-Role Accounts (Medium)
- Secure implementation: Apply role-based authorisation per route, not just authentication.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Full client directory exposed to client accounts"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Projects

### Project Records Accessible Across Client Boundaries (IDOR) (High)
- Secure implementation: Scope every project query to the session user's client (or staff role) on the server.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Project IDOR (other clients' projects)"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Mass Assignment on Project Update Allows Budget Tampering (High)
- Secure implementation: Whitelist updatable fields per role; recompute financial values server-side.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Budget tampering via project update"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Internal-Only Project Accessible by Direct URL (Medium)
- Secure implementation: Enforce visibility/ownership checks in the object handler itself, not only in list queries.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Internal project visible to clients"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Contracts & Invoices

### Contract Records Exposed via IDOR (High)
- Secure implementation: Check contract ownership against the session on every read; log cross-account access attempts.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Contract IDOR"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Invoice Records Exposed via IDOR (High)
- Secure implementation: Server-side ownership check on every invoice read and download.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Invoice IDOR"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Client-Supplied Payment Amount Trusted — Invoices Settled for $1 (Critical)
- Secure implementation: Take amounts only from the server-side invoice record; reject payments that do not match the stored total.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Invoice amount tampering at payment"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Invoice Status Transition Missing Role Authorisation (Critical)
- Secure implementation: Restrict status transitions to finance/staff roles and record an audit trail for every change.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Marking your own invoice paid (status endpoint)"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Deliverables & Files

### Deliverable Files Downloadable Across Client Boundaries (High)
- Secure implementation: Authorise downloads against the deliverable's owning project/client before streaming any file.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Deliverable download IDOR"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Path Traversal in File Download Allows Arbitrary File Read (Critical)
- Secure implementation: Resolve and whitelist paths inside the intended directory; reject any path that escapes it.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Path traversal on file download"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

## Admin Panel

### Admin User List Accessible Without Admin Role (Critical)
- Secure implementation: Enforce admin role checks server-side on all admin routes; never expose password material in any view.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Admin panel open to any logged-in user"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.

### Missing CSRF Protection on Admin User Deactivation (High)
- Secure implementation: Require anti-CSRF tokens on all admin actions and verify the request origin.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on admin user deactivation"); it must now fail (no session granted, no foreign object served, no state changed) and the test must stay open on a fresh progress file.
