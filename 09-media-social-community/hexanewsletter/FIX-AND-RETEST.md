# HexaNewsletter (LAB 88) — Fix & Retest

For every scored test: the secure implementation pattern and a regression check to prove the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterized queries / prepared statements for all database access and add injection regression tests.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Rate Limiting on Login Allows Unlimited Password Guessing (High)
- Fix: Add per-account and per-IP throttling, exponential backoff and lockout/alerting after repeated failures.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### User Enumeration Through Differential Authentication Responses (Medium)
- Fix: Return one generic message for all authentication failures and password-reset requests.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Demo Account With Published Credentials Active in Production (High)
- Fix: Remove demo/default accounts from production or force unique, unguessable passwords and disable them by default.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Password Reset Tokens Are Predictable (Derived From User ID) (Critical)
- Fix: Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Client-Controlled Role Cookie Grants Administrative Access (Critical)
- Fix: Determine roles only from the server-side session record; never trust role values supplied by the client.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- Fix: Enforce a minimum length (12+) and screen new passwords against known-breached lists.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Mass Assignment in Registration Allows Role/Plan/API-Key Injection (High)
- Fix: Whitelist exactly the fields a client may set at registration; assign role, plan and keys server-side only.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Context-encode all user-supplied output and add a Content-Security-Policy as defence in depth.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Anti-CSRF Token on Profile Update (Medium)
- Fix: Require a per-session CSRF token on every state-changing request and verify Origin/Referer as a second layer.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Publications & Paid Content

### Paywall Bypass via Preview Parameter Exposes Paid Content (High)
- Fix: Enforce entitlement checks on every content path, including preview and debug modes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Client-Supplied Subscription Tier Allows Free Paid Access (High)
- Fix: Set subscription tier only from confirmed payment events on the server; ignore client-supplied tier values.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Draft Content Accessible by Direct URL (Missing State Check) (Medium)
- Fix: Check publication state and ownership on every object access, not just in listing pages.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Search

### SQL Injection in Search Exposes Unpublished Publications (High)
- Fix: Parameterize search queries and apply publication-state filters in the data layer.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Fix: HTML-encode reflected values and deploy a restrictive Content-Security-Policy.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Subscribers & Lists

### Broken Access Control on Subscriber Export (IDOR) Exposes Email Lists (Critical)
- Fix: Verify object ownership server-side on every export and download endpoint.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Ownership Check on Subscriber Import Allows List Poisoning (High)
- Fix: Authorize the target publication's ownership before accepting any imported rows.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Unsubscribe Tokens Are Forgeable From Subscriber IDs (High)
- Fix: Use long random per-subscriber tokens, stored hashed, and rate-limit unsubscribe attempts.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Campaigns & Templates

### Missing Ownership Check Allows Campaign Sends to Foreign Lists (Critical)
- Fix: Verify list ownership at send time and log cross-account send attempts as security events.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Stored Cross-Site Scripting via Campaign Template HTML (High)
- Fix: Sanitize template HTML with an allowlist sanitizer and render previews in a sandboxed context.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Broken Access Control on Campaign Analytics (IDOR) (Medium)
- Fix: Enforce per-object ownership checks on campaign and analytics endpoints.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Analytics & API

### Unauthenticated Debug Endpoint Exposes Credentials and API Keys (Critical)
- Fix: Remove debug endpoints from production builds; never return passwords or keys in any response.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### API Key Accepted for Resources Owned by Other Accounts (High)
- Fix: Scope every API operation to resources owned by the key's account and support key rotation/revocation.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### API Accepts base64(email) as a Valid Credential (Critical)
- Fix: Accept only high-entropy issued API keys; remove legacy fallback token schemes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

## Admin Panel

### Plaintext Password Storage Exposed in Admin Panel (Critical)
- Fix: Store passwords only as salted hashes (bcrypt/argon2) and never render credential material in any UI.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.

### Missing Anti-CSRF Protection on Administrative User Deletion (High)
- Fix: Require CSRF tokens on all administrative state changes and re-confirm destructive actions.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md — it must now fail (no test flip, no effect), while the legitimate flow still works.
