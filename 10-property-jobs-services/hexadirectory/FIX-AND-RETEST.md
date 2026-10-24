# HexaDirectory (LAB 100) — Fix & Retest

For every scored test: the secure implementation and the regression check that proves the fix. After fixing, re-run the exploit — it must fail — and re-run the normal user flow — it must still work.

## SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **Location:** POST /login
- **Secure implementation:** Use parameterised queries / prepared statements for all database access and add server-side input validation.
- **Regression test:** Re-attempt the original exploit (Inject an OR-tautology into the email or password field so the string-built query matches a user without knowing the password.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Missing Brute-Force Protection on Login
- **Severity:** High
- **Location:** POST /login
- **Secure implementation:** Add progressive rate limiting, account lockout and MFA; alert on repeated failures.
- **Regression test:** Re-attempt the original exploit (Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, CAPTCHA or lockout.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Account Enumeration Through Differential Authentication Responses
- **Severity:** Medium
- **Location:** POST /login and POST /forgot
- **Secure implementation:** Return one generic message for all authentication and password-reset outcomes.
- **Regression test:** Re-attempt the original exploit (Compare responses for existing vs non-existing emails; the app confirms which emails are registered. Probe at least 5 distinct emails.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Working Demo Credentials Disclosed on Login Page
- **Severity:** High
- **Location:** GET /login
- **Secure implementation:** Remove demo accounts and printed credentials from production; rotate any exposed passwords.
- **Regression test:** Re-attempt the original exploit (The login page prints a working demo owner account. Sign in with it.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Predictable Password Reset Token Allows Account Takeover
- **Severity:** High
- **Location:** POST /reset
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and invalidate after use.
- **Regression test:** Re-attempt the original exploit (Reset tokens follow a formula derived from the user id (HD<id>-<id*137+42>). Compute a token for a victim who never requested one and take over the account.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Admin Authorisation Based on Client-Controlled Role Cookie
- **Severity:** Critical
- **Location:** GET /admin
- **Secure implementation:** Derive roles from the server-side session record on every request; never trust role cookies.
- **Regression test:** Re-attempt the original exploit (The admin area trusts the client-set hx_role cookie instead of the server-side account role. Set hx_role=admin on a normal account and open /admin.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## No Minimum Password Strength Enforced at Registration
- **Severity:** Medium
- **Location:** POST /register
- **Secure implementation:** Enforce a minimum length (≥10) and check passwords against known-breached lists.
- **Regression test:** Re-attempt the original exploit (Register a new account with a 1–3 character password; the app accepts it.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Mass Assignment Allows Privilege Escalation at Registration
- **Severity:** Critical
- **Location:** POST /register
- **Secure implementation:** Whitelist bindable fields per endpoint; assign roles only through privileged server-side flows.
- **Regression test:** Re-attempt the original exploit (Add a role=admin field to the registration request; the server copies it onto the new account.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **Location:** POST /register (rendered in /admin and profiles)
- **Secure implementation:** Context-encode all user output and validate/sanitise profile fields server-side.
- **Regression test:** Re-attempt the original exploit (Register with an HTML/JS payload as the display name; it is stored and rendered unescaped.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Missing CSRF Protection on Profile Update
- **Severity:** Medium
- **Location:** POST /profile
- **Secure implementation:** Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.
- **Regression test:** Re-attempt the original exploit (The profile update applies changes with no anti-CSRF marker. Submit it without the hx_origin field and the change still goes through.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## SQL Injection in Search Exposes Unpublished Listings
- **Severity:** High
- **Location:** GET /search?q=
- **Secure implementation:** Parameterise search queries and enforce published-only filtering in the data layer.
- **Regression test:** Re-attempt the original exploit (Inject an OR-tautology into the search term; the result set expands to every listing, including unpublished drafts.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium
- **Location:** GET /search?q=
- **Secure implementation:** HTML-encode reflected parameters and deploy a restrictive Content-Security-Policy.
- **Regression test:** Re-attempt the original exploit (The search term is echoed unescaped in the results heading; submit a script payload as the query.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Listing Claim Flow Allows Takeover of Owned Listings
- **Severity:** Critical
- **Location:** POST /listings/:id/claim
- **Secure implementation:** Require verified proof of ownership (domain/postal verification) and manual review for already-owned listings.
- **Regression test:** Re-attempt the original exploit (The claim flow transfers ownership of ANY listing to whoever clicks claim — no proof of ownership is checked, even for listings that already have an owner.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Missing Ownership Check Allows Editing Any Listing
- **Severity:** High
- **Location:** POST /listings/:id/edit
- **Secure implementation:** Enforce per-object authorisation on every read/write of listing data.
- **Regression test:** Re-attempt the original exploit (The edit endpoint never checks that the editor owns the listing. Change another owner’s listing details.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Unpublished Listings Accessible by Direct URL (IDOR)
- **Severity:** Medium
- **Location:** GET /listings/:id
- **Secure implementation:** Check publication status and ownership on the detail endpoint; return 404 for drafts to non-owners.
- **Regression test:** Re-attempt the original exploit (Draft (unpublished) listings are hidden from search and home, but the detail page serves them to anyone who guesses the id.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Review Rating Accepts Out-of-Range Values
- **Severity:** Medium
- **Location:** POST /listings/:id/review
- **Secure implementation:** Validate rating ranges (1–5) server-side and reject anything else.
- **Regression test:** Re-attempt the original exploit (The review form offers 1–5 stars, but the server accepts any number. Submit stars=100 and the average rating explodes.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Missing Authorisation on Review Deletion
- **Severity:** Medium
- **Location:** POST /reviews/:id/delete
- **Secure implementation:** Verify review authorship (or moderator role) before deletion.
- **Regression test:** Re-attempt the original exploit (The delete endpoint does not verify authorship. Delete a review written by someone else.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Stored Cross-Site Scripting in Reviews
- **Severity:** High
- **Location:** POST /listings/:id/review (rendered on the listing page)
- **Secure implementation:** Encode review output, sanitise input and add a Content-Security-Policy.
- **Regression test:** Re-attempt the original exploit (Review text is rendered raw on the public listing page. Post a review containing a script payload.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Broken Access Control on Listing Inquiry Inbox
- **Severity:** High
- **Location:** GET /listings/:id/inquiries
- **Secure implementation:** Restrict inquiry endpoints to the listing owner (or admins) server-side.
- **Regression test:** Re-attempt the original exploit (The per-listing inquiry inbox is served to any logged-in user, not just the listing owner.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Insecure Direct Object Reference on Lead Inquiries
- **Severity:** High
- **Location:** GET /inquiries/:id
- **Secure implementation:** Check inquiry ownership through its parent listing on every access; use unguessable ids as defence-in-depth.
- **Regression test:** Re-attempt the original exploit (Individual inquiry pages are served by sequential id with no ownership check.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Client-Side Price Tampering on Premium Upgrade
- **Severity:** High
- **Location:** POST /listings/:id/premium
- **Secure implementation:** Determine prices server-side and verify payment amounts with the payment provider.
- **Regression test:** Re-attempt the original exploit (The upgrade price travels in the request and the server trusts it. Pay $1 (or $0) instead of $49 and premium activates.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Single-Use Coupon Can Be Redeemed Unlimited Times
- **Severity:** Medium
- **Location:** POST /listings/:id/premium
- **Secure implementation:** Record redemptions atomically and reject previously used single-use codes.
- **Regression test:** Re-attempt the original exploit (Coupon DIR100 is meant to be single-use, but redemption is never recorded. Use it on two different listings.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Admin Data Endpoint Missing Role Authorisation (Full Credential Dump)
- **Severity:** Critical
- **Location:** GET /admin/users.json
- **Secure implementation:** Enforce admin role checks on all admin endpoints and never expose password fields.
- **Regression test:** Re-attempt the original exploit (A JSON endpoint meant for admins returns every account including passwords, checking only that *someone* is logged in.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Missing CSRF Protection on Admin Account Disable
- **Severity:** High
- **Location:** POST /admin/users/:id/disable
- **Secure implementation:** Require CSRF tokens on all admin actions and re-confirm destructive operations.
- **Regression test:** Re-attempt the original exploit (The destructive disable-user action performs no CSRF-marker check. Submit it without hx_origin and the account is disabled.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Unauthenticated Debug Endpoint Exposes Full Database Dump
- **Severity:** Critical
- **Location:** GET /api/debug
- **Secure implementation:** Remove debug endpoints from production builds and gate diagnostics behind admin auth.
- **Regression test:** Re-attempt the original exploit (A leftover debug endpoint dumps users (with passwords), listings and inquiries to anyone, no login required.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.

## Predictable API Token (Base64 of Email) Allows Impersonation
- **Severity:** High
- **Location:** GET /api/my-inquiries with X-Api-Token header
- **Secure implementation:** Issue random, revocable API keys, store only hashes and scope them per account.
- **Regression test:** Re-attempt the original exploit (The API accepts base64(email) as a bearer token. Forge a token for any owner and read their inquiries with no session.) — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.
