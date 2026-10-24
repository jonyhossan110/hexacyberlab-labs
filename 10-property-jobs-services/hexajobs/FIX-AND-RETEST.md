# HexaJobs (LAB 93) — Fix & Retest

For every test: the secure implementation, and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Remediation:** Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.
- **Retest:** Repeat the original exploit (POST /login (email field)). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Missing Brute-Force Protection on Login (High)
- **Remediation:** Rate-limit login attempts per account and IP, add progressive delays / lockout and alerting on failure spikes.
- **Retest:** Repeat the original exploit (POST /login). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Account Enumeration via Differential Authentication Responses (Medium)
- **Remediation:** Return one generic message for all login/reset outcomes regardless of whether the account exists.
- **Retest:** Repeat the original exploit (POST /forgot and POST /login error messages). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Working Demo Credentials Exposed on Production Login Page (High)
- **Remediation:** Remove demo/default accounts and credentials from production; enforce unique strong passwords for seed accounts.
- **Retest:** Repeat the original exploit (Login page demo box). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Password-Reset Tokens Are Predictable (Derived from User ID) (High)
- **Remediation:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and use each once.
- **Retest:** Repeat the original exploit (GET/POST /reset?token=). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Authorization Role Trusted from Client-Controlled Cookie (Critical)
- **Remediation:** Derive roles only from server-side session data; never trust role or privilege values sent by the client.
- **Retest:** Repeat the original exploit (hx_role cookie, checked on /admin). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration (Medium)
- **Remediation:** Enforce a minimum length (≥10) and check passwords against known-breached lists at registration and reset.
- **Retest:** Repeat the original exploit (POST /register). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Mass Assignment Allows Privilege/Plan Escalation at Registration (High)
- **Remediation:** Whitelist assignable fields per endpoint (email, name, password only); set role/plan server-side by business rules.
- **Retest:** Repeat the original exploit (POST /register (extra form fields)). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Stored Cross-Site Scripting via Display Name (High)
- **Remediation:** Context-encode all user-supplied output; sanitise stored rich text; add a Content-Security-Policy.
- **Retest:** Repeat the original exploit (Display name, rendered on employer applicant lists & profile pages). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Missing CSRF Protection on Profile Update (Medium)
- **Remediation:** Require a per-session CSRF token on every state-changing request and validate Origin/Referer as defence-in-depth.
- **Retest:** Repeat the original exploit (POST /profile). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Job Search

### SQL Injection in Job Search Exposes Unpublished Listings (High)
- **Remediation:** Parameterise the search query; enforce publication status as a server-side filter that user input cannot alter.
- **Retest:** Repeat the original exploit (GET /jobs?q=). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Reflected Cross-Site Scripting in Job Search (Medium)
- **Remediation:** HTML-encode reflected values; validate input; deploy a Content-Security-Policy.
- **Retest:** Repeat the original exploit (GET /jobs?q= (term echoed in the heading)). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Job Listings

### Broken Access Control: Draft Job Listings Publicly Readable by ID (Medium)
- **Remediation:** Enforce status + ownership checks on every object read; return 404 for objects the requester may not see.
- **Retest:** Repeat the original exploit (GET /job/:id). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Insecure Direct Object Reference: Cross-Employer Job Editing (High)
- **Remediation:** Verify resource ownership on every read/write; scope all queries by the authenticated owner id.
- **Retest:** Repeat the original exploit (POST /employer/job/:id/edit). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Applications

### Insecure Direct Object Reference Exposes Candidate Applications (High)
- **Remediation:** Check that the requester is the applicant or the owning employer before returning any application.
- **Retest:** Repeat the original exploit (GET /application/:id). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Broken Access Control: Applicants Can Set Their Own Application Status (High)
- **Remediation:** Restrict status transitions to the owning employer, server-side, per transition.
- **Retest:** Repeat the original exploit (POST /application/:id/status). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Insecure Direct Object Reference: Cross-User Application Status Changes (High)
- **Remediation:** Authorize every status change against both the application owner and the job owner.
- **Retest:** Repeat the original exploit (POST /application/:id/status). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Client-Supplied User ID Allows Applying as Another User (High)
- **Remediation:** Ignore client-supplied identity fields; always derive the actor from the server-side session.
- **Retest:** Repeat the original exploit (POST /job/:id/apply). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## CVs & Files

### Unrestricted File Upload Allows Stored HTML/JS on the Application Domain (High)
- **Remediation:** Whitelist extensions + verify content type, store uploads outside web root, serve with Content-Disposition and nosniff.
- **Retest:** Repeat the original exploit (POST /cv/upload, served at GET /cv/file/:id). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Path Traversal in File Download Exposes Server Files (High)
- **Remediation:** Resolve the requested path and verify it stays inside the upload directory; whitelist downloadable file ids instead of names.
- **Retest:** Repeat the original exploit (GET /cv/download?file=). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Insecure Direct Object Reference Exposes Candidate CVs (High)
- **Remediation:** Check CV ownership (or employer-with-application relationship) before serving any file.
- **Retest:** Repeat the original exploit (GET /cv/file/:id). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Employer Plans & Billing

### Client-Side Price Tampering on Plan Upgrades (High)
- **Remediation:** Determine prices exclusively from server-side plan data; ignore any client-posted amounts.
- **Retest:** Repeat the original exploit (POST /employer/plan/upgrade). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Insecure Direct Object Reference Exposes Employer Invoices (Medium)
- **Remediation:** Scope invoice queries to the authenticated employer; return 404 for invoices owned by others.
- **Retest:** Repeat the original exploit (GET /employer/invoice/:id). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Admin Panel

### Broken Access Control: Admin User Listing Accessible to Non-Admins (Critical)
- **Remediation:** Enforce admin role checks server-side on every admin route; never expose password material in any view.
- **Retest:** Repeat the original exploit (GET /admin/users). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

### Missing CSRF Protection on Administrative User Deletion (High)
- **Remediation:** Require per-session CSRF tokens on all state-changing admin actions; consider re-authentication for destructive ones.
- **Retest:** Repeat the original exploit (POST /admin/user/:id/delete). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.

## Platform & API

### Exposed Debug Endpoint Leaks Full Database Without Authentication (Critical)
- **Remediation:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- **Retest:** Repeat the original exploit (GET /api/debug). It must now fail (403/404 or a safe generic response), the Mission Board test must NOT flip on a fresh progress file, and the legitimate flow must still work.
