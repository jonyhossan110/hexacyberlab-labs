# HexaPodcast — Fix & Retest (LAB 85)

For every test in the registry: the secure implementation and how to retest that the fix holds.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing Rate Limiting on Login Allows Unlimited Password Guessing (High)
- Fix: Add per-account and per-IP rate limiting, progressive delays / lockout, and offer MFA.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Account Enumeration via Differential Forgot-Password Responses (Medium)
- Fix: Return one generic message for all forgot-password submissions regardless of account existence.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Live Credentials Published on the Login Page (Medium)
- Fix: Remove credentials from all pages and disable demo accounts in production.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Predictable Password Reset Token Enables Account Takeover (High)
- Fix: Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and make them single-use.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Client-Side Role Cookie Trusted for Authorisation (High)
- Fix: Derive roles from the server-side session record only; never trust role values sent by the client.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Registration & Profile

### No Minimum Password Policy on Registration (Medium)
- Fix: Enforce a minimum length (12+ recommended) and screen against breached-password lists.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Mass Assignment in Registration Allows Role and Plan Escalation (High)
- Fix: Allow-list assignable fields per endpoint and set roles/plans only through privileged server-side logic.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Contextually output-encode all user-supplied data and validate input on the server.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing CSRF Validation on Profile Update (Medium)
- Fix: Issue per-session CSRF tokens and verify them server-side on every state-changing request.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Search & Discovery

### SQL Injection in Search Exposes Unlisted Shows and Episodes (High)
- Fix: Parameterise search queries and enforce visibility filters in the data layer.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search (Medium)
- Fix: Output-encode all reflected request data in HTML responses.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing Visibility Check Allows Direct Access to Unlisted Episodes (Medium)
- Fix: Check object visibility and ownership server-side on every object access.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Episodes & Premium

### Premium Content Stream Missing Entitlement Check (High)
- Fix: Verify subscription entitlement server-side before serving premium media.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing Ownership Check on Episode Edit (IDOR) (High)
- Fix: Enforce per-object ownership authorisation on all edit/delete endpoints.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Subscriptions & Payments

### Client-Supplied Price Trusted for Premium Subscription (High)
- Fix: Look up prices server-side from the plan catalogue and ignore client-supplied amounts.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Broken Access Control on Subscription Records (IDOR) (Medium)
- Fix: Restrict subscription views to the owning user (or admins) server-side.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Comments & Ratings

### Stored Cross-Site Scripting in Episode Comments (High)
- Fix: Output-encode comment text on render and apply a strict content policy.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing Range Validation on Episode Ratings (Medium)
- Fix: Validate rating values server-side (integers 1–5) and reject out-of-range input.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Creator Analytics & Payouts

### Broken Access Control on Creator Analytics (IDOR) (Medium)
- Fix: Restrict analytics to the show owner server-side.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Payout Created Without Balance Verification (Critical)
- Fix: Verify available earnings server-side and cap payouts at the verified balance.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Broken Access Control on Payout Records (IDOR) (Medium)
- Fix: Restrict payout views to the owning creator (or admins) server-side.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Admin Panel

### Admin Authorisation Fails Open When Role Cookie Is Missing (High)
- Fix: Deny by default; require a positive server-side role check for admin routes.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Missing CSRF Validation on Admin Content Actions (Medium)
- Fix: Verify anti-CSRF tokens server-side on all admin state-changing endpoints.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

## Platform & API

### API Token Is a Deterministic Encoding of the User’s Email (High)
- Fix: Issue high-entropy random API tokens, store them hashed, and support revocation.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.

### Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- Fix: Remove debug endpoints from production builds and require admin auth for any diagnostics.
- Retest: repeat the original exploit from the Practice Guide — it must now fail (no session granted, no object served, no state changed), while the legitimate flow still works.
