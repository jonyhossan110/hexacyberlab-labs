# HexaHire (LAB 94) — Fix & Retest Guide

For every scored test: the professional report entry, the secure implementation, and the regression check.

## SQL Injection in Login Form Allows Authentication Bypass
- **Feature:** Login & Authentication
- **Severity:** Critical
- **Secure implementation:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Regression test:** Re-run the documented exploit (POST /login with email `' OR '1'='1' -- ` and any password; a session is created without knowing any real password.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## No Rate Limiting or Account Lockout on Login
- **Feature:** Login & Authentication
- **Severity:** High
- **Secure implementation:** Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.
- **Regression test:** Re-run the documented exploit (POST /login 10+ times with wrong passwords for one real account; every attempt is still processed.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Account Enumeration via Differential Authentication Responses
- **Feature:** Login & Authentication
- **Severity:** Medium
- **Secure implementation:** Return one generic message ("if the account exists...") for login failures and password resets.
- **Regression test:** Re-run the documented exploit (Probe >=5 distinct emails via /login and /forgot; responses reveal which emails are registered.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Demo Account Credentials Published on the Login Page
- **Feature:** Login & Authentication
- **Severity:** High
- **Secure implementation:** Remove public demo credentials; give demos isolated, expiring, low-privilege accounts.
- **Regression test:** Re-run the documented exploit (Use the demo credentials printed on the login page to sign in.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Predictable Password Reset Tokens Allow Account Takeover
- **Feature:** Login & Authentication
- **Severity:** Critical
- **Secure implementation:** Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.
- **Regression test:** Re-run the documented exploit (Compute HH<id>-<id*149+37> for a user who never requested a reset and POST /reset with it, then log in with the new password.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Role Stored in a Client-Controlled Cookie Used for Authorization
- **Feature:** Login & Authentication
- **Severity:** High
- **Secure implementation:** Derive authorization from the server-side session only; ignore role claims from cookies or request bodies.
- **Regression test:** Re-run the documented exploit (As a non-admin, set cookie hx_role=admin and GET /admin.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## No Minimum Password Strength Enforced at Registration
- **Feature:** Registration & Profile
- **Severity:** Medium
- **Secure implementation:** Enforce a minimum length (12+) and block known-breached passwords at registration and password change.
- **Regression test:** Re-run the documented exploit (POST /register with a 1-character password; the account is created.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Mass Assignment Allows Privilege Escalation at Registration
- **Feature:** Registration & Profile
- **Severity:** Critical
- **Secure implementation:** Whitelist assignable fields per endpoint; never accept role/privilege fields from client input.
- **Regression test:** Re-run the documented exploit (POST /register including role=admin; the new account really holds the admin role.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Stored Cross-Site Scripting via Display Name
- **Feature:** Registration & Profile
- **Severity:** High
- **Secure implementation:** Context-encode all user-controlled output and sanitise stored rich text; add a Content-Security-Policy.
- **Regression test:** Re-run the documented exploit (Register (or rename) with a display name containing a script payload; it is stored and rendered raw on /team.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing CSRF Protection on Profile Update
- **Feature:** Registration & Profile
- **Severity:** Medium
- **Secure implementation:** Require an unpredictable anti-CSRF token on every state-changing request and verify Origin/Referer.
- **Regression test:** Re-run the documented exploit (POST /profile (name change) with a valid session but no hx_origin cookie/field; the change is accepted.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Insecure Direct Object Reference on Candidate Profiles (Cross-Tenant)
- **Feature:** Candidates
- **Severity:** High
- **Secure implementation:** Scope every query by the caller's tenant/company and return 404 for objects outside it.
- **Regression test:** Re-run the documented exploit (As a company-1 user, GET /candidates/2001 (a company-2 candidate) and read the full profile.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Insecure Direct Object Reference on Candidate Document Downloads
- **Feature:** Candidates
- **Severity:** High
- **Secure implementation:** Verify document -> candidate -> tenant ownership on every download request.
- **Regression test:** Re-run the documented exploit (As a company-1 user, download document 3003 belonging to a company-2 candidate.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing Workflow Validation Allows Pipeline Stage Skipping
- **Feature:** Candidates
- **Severity:** Medium
- **Secure implementation:** Enforce a server-side state machine for pipeline stages, including required artefacts (scorecards) per transition.
- **Regression test:** Re-run the documented exploit (POST /candidates/1002/stage with stage=Hired while the candidate is still at Applied.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## SQL Injection in Candidate Search Bypasses Tenant and Confidentiality Filters
- **Feature:** Search & Jobs
- **Severity:** Critical
- **Secure implementation:** Parameterise the search query and apply tenant/confidentiality filters in code, not in the query string.
- **Regression test:** Re-run the documented exploit (GET /search?q=' OR '1'='1' --  returns confidential and other-company candidates.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Reflected Cross-Site Scripting in Search Results
- **Feature:** Search & Jobs
- **Severity:** Medium
- **Secure implementation:** HTML-encode all reflected user input in responses.
- **Regression test:** Re-run the documented exploit (GET /search?q=<script>alert(1)</script> reflects the payload unescaped in the response.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing Ownership Check Allows Editing Other Tenants' Job Postings
- **Feature:** Search & Jobs
- **Severity:** High
- **Secure implementation:** Check tenant ownership on every mutating job endpoint; log cross-tenant attempts.
- **Regression test:** Re-run the documented exploit (As a company-1 user, POST /jobs/201/edit changing a company-2 job; the change is applied.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Insecure Direct Object Reference on Interviews and Scorecards
- **Feature:** Interviews & Scorecards
- **Severity:** High
- **Secure implementation:** Scope interview access by tenant and interviewer assignment.
- **Regression test:** Re-run the documented exploit (As a company-1 user, GET /interviews/502 and read another company's scorecard.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing Authorization on Scorecard Submission
- **Feature:** Interviews & Scorecards
- **Severity:** High
- **Secure implementation:** Only the assigned interviewer (or an admin) may create or modify a scorecard; keep an audit trail.
- **Regression test:** Re-run the documented exploit (POST /interviews/503/scorecard as a user who is not the assigned interviewer; the scorecard is stored.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Insecure Direct Object Reference on Offer Letters
- **Feature:** Offers
- **Severity:** High
- **Secure implementation:** Scope offers by tenant; use unguessable identifiers as defence-in-depth.
- **Regression test:** Re-run the documented exploit (As a company-1 user, GET /offers/701 and read another company's offer salary.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing Authorization and Validation on Offer Updates
- **Feature:** Offers
- **Severity:** High
- **Secure implementation:** Restrict offer edits by role and state; only the candidate can accept, via a signed single-use link.
- **Regression test:** Re-run the documented exploit (POST /offers/702/update changing the salary, or setting status=Accepted; the change is stored.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Unrestricted File Upload with Content Served from Application Origin
- **Feature:** Documents & Files
- **Severity:** High
- **Secure implementation:** Whitelist file types, verify content, store uploads outside the web root and serve via a separate domain with Content-Disposition: attachment.
- **Regression test:** Re-run the documented exploit (Upload an .html file containing a script payload, then GET it from /uploads/ and receive it as text/html.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Path Traversal in File Download Endpoint
- **Feature:** Documents & Files
- **Severity:** High
- **Secure implementation:** Resolve the requested path and verify it stays inside the intended directory; whitelist downloadable file ids instead of paths.
- **Regression test:** Re-run the documented exploit (GET /download?file=../server.js returns the server source.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Broken Access Control on Admin User Export (Passwords Exposed)
- **Feature:** Admin Panel
- **Severity:** Critical
- **Secure implementation:** Require an admin role server-side for user exports; never include password material in API responses.
- **Regression test:** Re-run the documented exploit (As a non-admin user, GET /admin/users.json and receive all users including passwords.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Missing CSRF Protection on Administrative User Deactivation
- **Feature:** Admin Panel
- **Severity:** Medium
- **Secure implementation:** Verify anti-CSRF tokens on all administrative state-changing endpoints.
- **Regression test:** Re-run the documented exploit (As an admin, POST /admin/deactivate without the hx_origin marker; the user is deactivated.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## API Authentication Uses Base64-Encoded Email as the Token
- **Feature:** Platform & API
- **Severity:** High
- **Secure implementation:** Issue random, per-user API secrets; store hashes, support rotation and revocation.
- **Regression test:** Re-run the documented exploit (GET /api/candidates with header X-Api-Key = base64(email) and no session cookie; candidate data is returned.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.

## Unauthenticated Debug Endpoint Exposes Full User Table
- **Feature:** Platform & API
- **Severity:** Critical
- **Secure implementation:** Remove debug/diagnostic endpoints from production builds; gate any retained tooling behind admin auth and network restrictions.
- **Regression test:** Re-run the documented exploit (GET /api/debug with no session returns all users including passwords.) against the fixed build — it must fail: no session, data change or disclosure may occur, and the Mission Board test must stay open.
