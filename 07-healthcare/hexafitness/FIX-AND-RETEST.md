# HexaFitness — Fix & Retest Guide

For every scored test: the professional report entry, the secure implementation, and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Full Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Regression test: repeat the original exploit for "SQL injection login bypass" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Missing Brute-Force Protection on Login
- Severity: High
- Secure implementation: Add progressive rate limiting, account lockout and MFA; alert on repeated failures.
- Regression test: repeat the original exploit for "Brute force — no rate limit or lockout" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Account Enumeration via Differential Authentication Responses
- Severity: Medium
- Secure implementation: Return one generic message for all failed logins and password-reset requests.
- Regression test: repeat the original exploit for "User enumeration via login & forgot-password" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Default / Demo Credentials Active in Production (Administrator)
- Severity: Critical
- Secure implementation: Remove demo accounts, force unique strong passwords, and rotate any credential ever published.
- Regression test: repeat the original exploit for "Published demo credentials (incl. admin)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Predictable Password-Reset Tokens Allow Account Takeover
- Severity: High
- Secure implementation: Generate reset tokens with a CSPRNG (>=128 bits), store hashed, expire quickly, single use.
- Regression test: repeat the original exploit for "Predictable password-reset token" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Privilege Escalation via Client-Controlled Role Cookie
- Severity: High
- Secure implementation: Keep roles in the server-side session record only; ignore role claims from cookies or request bodies.
- Regression test: repeat the original exploit for "Session/role cookie tampering" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Registration & Profile

### No Password Policy on Registration
- Severity: Medium
- Secure implementation: Enforce >=10 characters, screen against breached-password lists, and offer MFA.
- Regression test: repeat the original exploit for "Weak password policy (1-character passwords)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Mass Assignment in Registration Allows Privilege & Plan Escalation
- Severity: Critical
- Secure implementation: Allow-list bindable fields server-side; set role, plan and balances only through privileged flows.
- Regression test: repeat the original exploit for "Mass assignment — role / plan / credits at signup" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Context-encode all user output; add a Content-Security-Policy; sanitise stored rich text.
- Regression test: repeat the original exploit for "Stored XSS in display name" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Cross-Site Request Forgery on Profile Update
- Severity: Medium
- Secure implementation: Issue and verify per-session CSRF tokens on every state-changing request; check Origin as defence in depth.
- Regression test: repeat the original exploit for "CSRF on profile update" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Membership & Payments

### Client-Side Price Tampering in Membership Purchase
- Severity: High
- Secure implementation: Look up prices server-side by plan id; ignore any price sent by the client; reconcile with the payment provider.
- Regression test: repeat the original exploit for "Premium membership activated at a tampered price" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Unbounded Client-Supplied Membership Extension
- Severity: High
- Secure implementation: Compute freeze/extension effects server-side from policy; cap durations; ignore client-supplied date math.
- Regression test: repeat the original exploit for "Membership expiry forged via freeze/extend field" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Insecure Direct Object Reference — Cross-Member Membership Freeze
- Severity: High
- Secure implementation: Authorise every object access against the session user (or an explicit staff role) before applying changes.
- Regression test: repeat the original exploit for "Freeze another member’s membership (IDOR)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Class Bookings

### Class Capacity Limit Not Enforced Server-Side
- Severity: Medium
- Secure implementation: Check capacity atomically at booking time; reject when full and offer a waitlist.
- Regression test: repeat the original exploit for "Booking into a full class (capacity not enforced)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Insecure Direct Object Reference — Cancel Any Booking
- Severity: Medium
- Secure implementation: Scope all booking operations to the session user; verify ownership before mutation.
- Regression test: repeat the original exploit for "Cancel another member’s booking (IDOR)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Personal Training

### Personal-Training Booking Without Credit/Balance Check
- Severity: High
- Secure implementation: Verify and decrement credits atomically in the booking transaction; reject insufficient balance.
- Regression test: repeat the original exploit for "PT session booked with zero credits" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Client-Side Price Tampering in PT Booking
- Severity: High
- Secure implementation: Resolve PT pricing server-side by trainer/service id; reject client-supplied amounts.
- Regression test: repeat the original exploit for "PT session price tampering" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Progress & Trainer Notes

### Insecure Direct Object Reference — Cross-Member Progress Data
- Severity: High
- Secure implementation: Authorise progress records against the session user or assigned trainer before serving.
- Regression test: repeat the original exploit for "View another member’s progress (IDOR)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Private Trainer Notes Exposed via IDOR
- Severity: High
- Secure implementation: Restrict note reads to the member themselves and staff roles; verify per-record ownership.
- Regression test: repeat the original exploit for "Read another member’s private trainer notes (IDOR)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Stored Cross-Site Scripting in Trainer Notes
- Severity: High
- Secure implementation: Output-encode note text everywhere it renders; deploy a restrictive CSP.
- Regression test: repeat the original exploit for "Stored XSS in trainer notes" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Guest Passes

### Guest Pass Reuse — Single-Use Not Enforced
- Severity: Medium
- Secure implementation: Mark passes used in the same transaction as redemption and reject already-used codes.
- Regression test: repeat the original exploit for "Guest pass redeemed twice (no single-use check)" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Predictable Guest Pass Codes Accepted Without Issuance Check
- Severity: Medium
- Secure implementation: Issue passes with random codes stored server-side; redeem only codes that exist and are unused.
- Regression test: repeat the original exploit for "Forged / predictable guest pass accepted" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Search

### SQL Injection in Search Exposes Full Member Directory
- Severity: High
- Secure implementation: Parameterise search queries; return only the fields the UI needs; log injection attempts.
- Regression test: repeat the original exploit for "SQL injection in search dumps all members" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: Encode reflected query text in HTML context; add CSP; validate input length and type.
- Regression test: repeat the original exploit for "Reflected XSS in search results" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Admin Panel

### Broken Access Control — Admin Console Reachable by Members
- Severity: Critical
- Secure implementation: Enforce role checks in middleware for all admin routes; deny by default.
- Regression test: repeat the original exploit for "Admin panel open to any logged-in member" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.

## Platform & API

### Predictable API Tokens & Missing Object Authorisation
- Severity: High
- Secure implementation: Issue random opaque tokens, scope them to the owner, and authorise every object access.
- Regression test: repeat the original exploit for "Weak API token (base64 of email) reads any member" — it must now fail (no session/data/state change), and the matching Mission Board test must stay open when the lab is re-run against the fixed build.
