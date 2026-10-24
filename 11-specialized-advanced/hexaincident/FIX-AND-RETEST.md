# HexaIncident — Fix & Retest Guide (LAB 110)

For every test: the secure implementation and a regression check. After fixing, re-run the exploit — it must fail — then confirm the normal flow still works.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Secure implementation: Use parameterised queries / prepared statements everywhere; never build SQL by string concatenation.
- Regression test: repeat the original exploit for "SQL injection login bypass"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Missing Brute-Force Protection on Login
- Severity: High
- Secure implementation: Add rate limiting, progressive delays and lockout/CAPTCHA after repeated failures; alert on spikes.
- Regression test: repeat the original exploit for "Brute force: no rate limit or lockout"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Account Enumeration via Authentication Error Messages
- Severity: Medium
- Secure implementation: Return one generic message ("invalid credentials") for every failure; make forgot-password responses identical.
- Regression test: repeat the original exploit for "User enumeration via response differences"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Active Demo Account with Published Credentials
- Severity: High
- Secure implementation: Remove or disable demo/default accounts before go-live; force unique credentials per user.
- Regression test: repeat the original exploit for "Published demo credentials grant real access"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Predictable Password Reset Tokens
- Severity: High
- Secure implementation: Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, and invalidate after use.
- Regression test: repeat the original exploit for "Predictable password-reset token"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Client-Side Role Cookie Trusted for Admin Access
- Severity: Critical
- Secure implementation: Derive roles server-side from the session record on every request; ignore role claims sent by the client.
- Regression test: repeat the original exploit for "Role cookie tampering into the admin panel"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Registration & Profile

### No Minimum Password Strength Policy
- Severity: Medium
- Secure implementation: Enforce ≥10–12 characters, screen against breached-password lists, and encourage passphrases.
- Regression test: repeat the original exploit for "Weak password policy (1 character accepted)"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Mass Assignment Allows Privilege Escalation at Registration
- Severity: Critical
- Secure implementation: Whitelist bindable fields per endpoint; set role and privileges server-side only.
- Regression test: repeat the original exploit for "Mass assignment: self-register as admin"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Secure implementation: Contextually encode all user output; add a Content-Security-Policy as defence in depth.
- Regression test: repeat the original exploit for "Stored XSS in display name"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Secure implementation: Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.
- Regression test: repeat the original exploit for "CSRF on profile update"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Search & Discovery

### SQL Injection in Incident Search Exposes Restricted Records
- Severity: Critical
- Secure implementation: Parameterise all queries; enforce team-based record filtering in the data layer, not just the UI.
- Regression test: repeat the original exploit for "Search SQL injection dumps restricted incidents"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Reflected Cross-Site Scripting in Search
- Severity: Medium
- Secure implementation: HTML-encode all reflected values; validate input; deploy CSP.
- Regression test: repeat the original exploit for "Reflected XSS in search results"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Incident Reports

### Insecure Direct Object Reference on Restricted Incidents
- Severity: High
- Secure implementation: Enforce per-object authorization (owner/team/role) on every read and write; deny by default.
- Regression test: repeat the original exploit for "Restricted incident readable by another team (IDOR)"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Missing Authorization on Incident Edit
- Severity: High
- Secure implementation: Check reporter/assignee/team or admin rights before applying any incident modification.
- Regression test: repeat the original exploit for "Editing another responder’s incident"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Unauthorized Severity Modification
- Severity: High
- Secure implementation: Restrict severity changes to assignee, reporter or incident command; log every change.
- Regression test: repeat the original exploit for "Severity changed by a viewer account"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Unauthorized Incident Closure
- Severity: High
- Secure implementation: Allow status changes only for assignee, reporter, team lead or admin; require a resolution note.
- Regression test: repeat the original exploit for "Closing an incident assigned to someone else"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Assignments & Workflow

### Unauthorized Incident Reassignment
- Severity: Medium
- Secure implementation: Restrict assignment changes to the current assignee, team leads and admins; audit every change.
- Regression test: repeat the original exploit for "Reassigning another team’s incident to yourself"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Self-Assignment to Restricted Incident Grants Access
- Severity: High
- Secure implementation: Validate team/role eligibility for the target incident before any assignment; treat restricted objects as invisible to non-members.
- Regression test: repeat the original exploit for "Self-assigning a restricted incident"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Unauthorized Incident Escalation
- Severity: Medium
- Secure implementation: Restrict escalation to responder roles on the owning team and incident command; rate-limit and log escalations.
- Regression test: repeat the original exploit for "Escalation triggered by an unauthorized user"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Evidence & Attachments

### Evidence Download Missing Object Authorization
- Severity: High
- Secure implementation: Authorize every download against the parent incident’s team/restriction before serving the file.
- Regression test: repeat the original exploit for "Evidence file download IDOR"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Path Traversal in File Download
- Severity: High
- Secure implementation: Resolve the path, require it to stay inside the evidence directory, and whitelist known files.
- Regression test: repeat the original exploit for "Path traversal in evidence download"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Audit Trail & Postmortems

### Audit Trail Exposed to All Authenticated Users
- Severity: Medium
- Secure implementation: Restrict audit access to incident command/admin roles; redact sensitive fields.
- Regression test: repeat the original exploit for "Audit trail readable by any user"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Insecure Direct Object Reference on Postmortems
- Severity: Medium
- Secure implementation: Authorize postmortem reads by incident participation/team; deny cross-team access by default.
- Regression test: repeat the original exploit for "Postmortem readable across teams (IDOR)"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Admin Panel

### Broken Access Control on Admin User Export (Plaintext Passwords)
- Severity: Critical
- Secure implementation: Require admin role on all admin endpoints; never store or return plaintext passwords.
- Regression test: repeat the original exploit for "Admin user dump served to any account"; it must no longer succeed, and legitimate users must still complete the same workflow.

### Missing CSRF Protection on Admin Deactivation
- Severity: High
- Secure implementation: Require CSRF tokens on all admin actions; use SameSite cookies and verify Origin headers.
- Regression test: repeat the original exploit for "CSRF on admin user deactivation"; it must no longer succeed, and legitimate users must still complete the same workflow.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All Data
- Severity: Critical
- Secure implementation: Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.
- Regression test: repeat the original exploit for "Unauthenticated /api/debug full data dump"; it must no longer succeed, and legitimate users must still complete the same workflow.
