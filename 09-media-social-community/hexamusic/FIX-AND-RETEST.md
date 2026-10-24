# HexaMusic (LAB 86) — Fix & Retest Guide

For every test: the secure implementation and the retest that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Secure implementation / remediation: Use parameterised queries / prepared statements for all database access and add a WAF rule for injection patterns.
- Retest: repeat the original exploit (Inject an OR-tautology into the email field so the string-built query matches a user without the real password.) — it must now fail, and the test condition must be impossible to trigger.

### Missing Brute-Force Protection on Authentication Endpoint (High)
- Secure implementation / remediation: Add progressive delays, account lockout and CAPTCHA after repeated failures, plus breached-password screening.
- Retest: repeat the original exploit (Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no lockout, delay or CAPTCHA.) — it must now fail, and the test condition must be impossible to trigger.

### Account Enumeration Through Differential Authentication Responses (Medium)
- Secure implementation / remediation: Return one generic response for all login and password-reset outcomes regardless of account existence.
- Retest: repeat the original exploit (Probe several email addresses; existing and non-existing accounts produce clearly different responses.) — it must now fail, and the test condition must be impossible to trigger.

### Working Demo Credentials Disclosed on Public Login Page (High)
- Secure implementation / remediation: Remove published credentials, disable demo accounts in production and enforce unique strong passwords.
- Retest: repeat the original exploit (Use the demo email/password printed on the login page to sign in.) — it must now fail, and the test condition must be impossible to trigger.

### Password Reset Tokens Are Predictable (Critical)
- Secure implementation / remediation: Generate reset tokens with a CSPRNG (128+ bits), expire them quickly and invalidate after use.
- Retest: repeat the original exploit (The reset token is derived from the user id by a simple formula; compute a valid token for an account that never requested a reset and take it over.) — it must now fail, and the test condition must be impossible to trigger.

### Privilege Escalation via Client-Controlled Role Cookie (Critical)
- Secure implementation / remediation: Derive roles only from the server-side session record; ignore role data supplied by the client.
- Retest: repeat the original exploit (The admin gate trusts a client-set hx_role cookie instead of the server-side session role; set hx_role=admin in your browser and open /admin as a normal listener.) — it must now fail, and the test condition must be impossible to trigger.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- Secure implementation / remediation: Enforce a minimum length of 10+ characters and screen against known breached passwords.
- Retest: repeat the original exploit (Register an account with a 1-character password; the app accepts it.) — it must now fail, and the test condition must be impossible to trigger.

### Mass Assignment Allows Privilege and Tier Escalation at Registration (High)
- Secure implementation / remediation: Whitelist bindable fields per endpoint; never accept role, tier or balance from the client.
- Retest: repeat the original exploit (Add extra fields (tier=premium or role=artist) to the registration POST; the server copies them straight onto the new account.) — it must now fail, and the test condition must be impossible to trigger.

### Stored Cross-Site Scripting via Display Name (High)
- Secure implementation / remediation: Contextually encode all user-supplied output and validate input; add a Content-Security-Policy header.
- Retest: repeat the original exploit (Put an HTML/JS payload in your display name; it is stored and rendered unescaped on profile and playlist pages.) — it must now fail, and the test condition must be impossible to trigger.

### Cross-Site Request Forgery on Profile Update (Medium)
- Secure implementation / remediation: Issue per-session anti-CSRF tokens and verify them on every state-changing request.
- Retest: repeat the original exploit (Submit a profile change without the hx_marker token (as a cross-site form would); the change is applied anyway.) — it must now fail, and the test condition must be impossible to trigger.

## Search & Catalogue

### SQL Injection in Catalogue Search Leaks Unreleased Content (High)
- Secure implementation / remediation: Use parameterised queries for search and return only published content by default.
- Retest: repeat the original exploit (Inject into the search term so the query returns every track — including the unreleased one that normal search hides.) — it must now fail, and the test condition must be impossible to trigger.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Secure implementation / remediation: Encode reflected parameters on output and deploy a Content-Security-Policy.
- Retest: repeat the original exploit (Put a script payload in the search term; it is reflected unescaped into the results page heading.) — it must now fail, and the test condition must be impossible to trigger.

## Playlists

### Insecure Direct Object Reference Exposes Private Playlists (High)
- Secure implementation / remediation: Check object ownership on every request and use unguessable identifiers.
- Retest: repeat the original exploit (Open another user’s private playlist by guessing its numeric id; ownership is never checked.) — it must now fail, and the test condition must be impossible to trigger.

### Missing Ownership Check Allows Tampering With Other Users’ Playlists (High)
- Secure implementation / remediation: Authorise every mutation against the object owner server-side.
- Retest: repeat the original exploit (Add a track to a playlist you do not own; the endpoint never verifies ownership.) — it must now fail, and the test condition must be impossible to trigger.

### Predictable Share Tokens Expose Private Playlists (Medium)
- Secure implementation / remediation: Generate share tokens with a CSPRNG and allow owners to revoke them.
- Retest: repeat the original exploit (Share links are just "share-" plus the playlist id; construct the link for a private playlist you were never given.) — it must now fail, and the test condition must be impossible to trigger.

## Tracks & Streaming

### Missing Tier Check Allows Free Accounts to Stream Premium Content (High)
- Secure implementation / remediation: Enforce subscription tier server-side on every stream/download request.
- Retest: repeat the original exploit (As a free-tier listener, stream a premium-only track; the stream endpoint never checks your tier.) — it must now fail, and the test condition must be impossible to trigger.

### Unreleased Content Accessible via Direct Object Reference (High)
- Secure implementation / remediation: Enforce release status and ownership on every content fetch.
- Retest: repeat the original exploit (Open the track page for an unreleased track by its id as an ordinary listener; the release flag is not enforced.) — it must now fail, and the test condition must be impossible to trigger.

### Directory Traversal in Download Endpoint Exposes Server Files (Critical)
- Secure implementation / remediation: Normalise paths, enforce a base-directory prefix check and serve files by id, not by name.
- Retest: repeat the original exploit (Use ../ sequences in the file parameter to escape the downloads folder and read server files.) — it must now fail, and the test condition must be impossible to trigger.

### API Stream Token Is a Guessable Encoding of the User Email (High)
- Secure implementation / remediation: Issue random, expiring, server-side session/API tokens and verify them on each call.
- Retest: repeat the original exploit (The API accepts a "token" that is just the base64 of a user’s email; forge one and stream with no session at all.) — it must now fail, and the test condition must be impossible to trigger.

## Artists & Royalties

### Artists Can Modify Royalty and Licensing Data of Other Artists (Critical)
- Secure implementation / remediation: Authorise royalty/licensing changes against track ownership and require approval workflows for financial metadata.
- Retest: repeat the original exploit (As one artist, change the royalty rate and licensing label of a track owned by a different artist; only the artist role is checked, never ownership.) — it must now fail, and the test condition must be impossible to trigger.

### Insecure Direct Object Reference Exposes Artist Earnings (Medium)
- Secure implementation / remediation: Derive the artist identity from the session; never accept it as a client parameter.
- Retest: repeat the original exploit (Ask for another artist’s earnings by changing the artist parameter; the figures are served without an ownership check.) — it must now fail, and the test condition must be impossible to trigger.

## Premium & Billing

### Client-Side Price Tampering Allows Free Premium Upgrades (High)
- Secure implementation / remediation: Compute prices server-side from the plan catalogue and verify payment with the provider.
- Retest: repeat the original exploit (The upgrade form posts an amount the server trusts; submit amount=0 and get Premium for free.) — it must now fail, and the test condition must be impossible to trigger.

### Single-Use Promotional Code Is Not Consumed on Redemption (Medium)
- Secure implementation / remediation: Mark codes redeemed in the same transaction that grants the benefit and enforce uniqueness.
- Retest: repeat the original exploit (Redeem the single-use code HEXAFREE twice; it is never marked as consumed, so it keeps granting Premium.) — it must now fail, and the test condition must be impossible to trigger.

## Admin Panel

### Broken Access Control Exposes Admin User List With Passwords (Critical)
- Secure implementation / remediation: Require the admin role for all /admin routes and never display stored passwords.
- Retest: repeat the original exploit (Open the admin user list as a normal listener; the page only checks that you are logged in, and it prints every password.) — it must now fail, and the test condition must be impossible to trigger.

### Cross-Site Request Forgery on Administrative Track Deletion (High)
- Secure implementation / remediation: Verify anti-CSRF tokens on all admin mutations and add confirmation for destructive actions.
- Retest: repeat the original exploit (As admin, delete a track with a POST that carries no hx_marker token; the destructive action succeeds anyway.) — it must now fail, and the test condition must be impossible to trigger.

## Platform & API

### Unauthenticated Debug Endpoint Dumps Full User Database (Critical)
- Secure implementation / remediation: Remove debug endpoints from production builds and gate diagnostics behind admin auth and network restrictions.
- Retest: repeat the original exploit (Fetch the debug endpoint with no session at all; it dumps every user including passwords.) — it must now fail, and the test condition must be impossible to trigger.
