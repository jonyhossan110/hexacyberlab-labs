# HexaFintech — Fix & Retest Guide

For every scored test: the secure implementation and the regression check that proves the fix.
Work through this after completing the lab to learn the defender's side.

## Login & Authentication

### SQL Injection in Authentication (Legacy SSO Path) (Critical)
- **Fix:** Use parameterised queries everywhere and retire the legacy string-built login path.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Account Enumeration via Authentication Error Messages (Medium)
- **Fix:** Return one generic "invalid email or password" message for every failed login.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Default/Demo Account with Weak Password Enabled (High)
- **Fix:** Remove demo accounts from production and enforce unique, strong credentials for every seeded account.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Predictable Password Reset Token (High)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly and single-use them.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Client-Side Role Cookie Trusted for Authorization (Critical)
- **Fix:** Store roles only in server-side sessions and authorize every request against them.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Registration & Profile

### No Minimum Password Strength Policy (Medium)
- **Fix:** Enforce ≥10 characters with a breached-password check at registration and password change.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Mass Assignment Allows Privilege/Limit Escalation (High)
- **Fix:** Allow-list bindable fields per endpoint; never bind role, tier or limit fields from user input.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** HTML-encode all user-supplied values at output and add a Content-Security-Policy.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Missing CSRF Token on Profile Update (Medium)
- **Fix:** Require a per-session CSRF token on every state-changing request and verify Origin/Referer.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Financial Profiles & Accounts

### Insecure Direct Object Reference on Financial Profiles (High)
- **Fix:** Enforce per-object ownership/grant checks on every profile read.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Insecure Direct Object Reference on Linked Bank Accounts (High)
- **Fix:** Scope every account query to the authenticated owner (or a verified share grant).
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Directory Traversal in Statement Download (High)
- **Fix:** Resolve and validate paths inside the statements directory only; reject any traversal sequences.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Cards

### Virtual Card Details (PAN + CVV) Exposed via IDOR (Critical)
- **Fix:** Authorize card-detail access per owner, mask PAN, never display CVV, and log every reveal.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Missing Authorization on Card Limit Update (High)
- **Fix:** Verify card ownership (or admin role) server-side before applying any limit change.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Server-Side Card Limit Cap Not Enforced (Medium)
- **Fix:** Enforce the maximum card limit server-side on every limit change.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Transfers

### Negative Transfer Amount Accepted (Reverse Money Flow) (Critical)
- **Fix:** Validate amounts server-side: positive, within balance and within the sender’s limits.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Missing Balance Check Allows Overdraft (High)
- **Fix:** Check available funds server-side and reject transfers that exceed the balance.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Spending Analytics

### Analytics Export Missing Tenant Filter (All Users’ Data) (High)
- **Fix:** Filter exports to the requester’s own data and audit every export endpoint for the same flaw.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Reflected Cross-Site Scripting in Analytics Filter (Medium)
- **Fix:** HTML-encode all reflected parameters and validate the period against an allow-list format.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Sharing & Permissions

### Share Scope Escalation by Grantee (Missing Owner Check) (Critical)
- **Fix:** Only the grant owner may change scope; authorize scope changes server-side and audit them.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### View-Only Share Scope Not Enforced on Transfers (Critical)
- **Fix:** Enforce grant scope on every action: view grants are read-only, checked server-side per request.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Share Invitation Not Bound to Invited Account (High)
- **Fix:** Bind invites to the invited email, require the accepting account to match, and expire invites quickly.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Admin Panel

### State-Changing Admin Action over GET without CSRF Protection (High)
- **Fix:** Move destructive actions to POST/DELETE with CSRF tokens and confirmation.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

## Platform & API

### Unauthenticated User Enumeration Endpoint Exposes Passwords (Critical)
- **Fix:** Require authentication and admin authorization on user-listing APIs; never serialize password fields.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.

### Predictable API Key Derived from Email Address (High)
- **Fix:** Issue random ≥128-bit API keys, store them hashed, and scope each key to its owner’s data only.
- **Retest:** Repeat the original exploit from the practice guide — it must now fail (access denied, input rejected, or the action blocked), while the legitimate workflow keeps working.
