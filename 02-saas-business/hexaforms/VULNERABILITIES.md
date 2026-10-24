# HexaForms — Vulnerability Map (24 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.


## Login & Authentication — 6 test(s)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** String-built queries turn user input into query logic; a login is only as strong as its parameter binding.
- **Business impact:** On a client's site this is full account takeover — often straight into the admin account — with no password and no trace beyond a strange login line.
- **Report title:** SQL Injection in Authentication (Login Bypass)
- **Fix:** Use parameterised queries everywhere; never concatenate input into SQL.

### Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Authentication endpoints without throttling let attackers try unlimited passwords against known accounts.
- **Business impact:** Attackers can grind through password lists against real customer accounts at full speed; weak passwords fall first, then account data and stored value follow.
- **Report title:** Missing Rate Limiting on Login (Brute Force)
- **Fix:** Throttle per account and per IP, add progressive delays/lockout and alerting.

### User enumeration via differing responses
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts.
- **Business impact:** Attackers harvest the valid customer email list, then aim phishing and password attacks only at accounts that definitely exist — far higher success for them.
- **Report title:** Account Enumeration via Authentication Responses
- **Fix:** Return one generic message for all failed logins and reset requests.

### Weak / default credentials (demo account)
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Seeded demo and default accounts are production accounts to an attacker — they must be disabled or forced to rotate on first use.
- **Business impact:** Anyone can walk into the shipped demo account and use the product as a paying customer — abusing quotas, sending mail as the business, and pivoting into shared data.
- **Report title:** Default Credentials on Seeded Demo Account
- **Fix:** Remove seeded demo accounts from production, or force a unique password at first login.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** A reset token derived from public data is not a secret — it is a password-change form anyone can drive.
- **Business impact:** Anyone who knows a customer's (or the admin's) email can reset their password and own the account — support-desk and takeover risk in one step.
- **Report title:** Predictable Password Reset Token
- **Fix:** Use crypto.randomBytes tokens, hashed at rest, single-use, expiring in ~15 minutes.

### Session/cookie tampering — client role cookie trusted
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Authorization data must live server-side; anything the client can edit will be edited.
- **Business impact:** One forged cookie opens the whole admin panel — every customer account, every form, every plan change — with no credentials at all.
- **Report title:** Client-Controlled Role Cookie Grants Admin Access
- **Fix:** Read roles from the server-side session/user record only; ignore client-supplied role data.


## Accounts & Profile — 4 test(s)

### Weak password policy on registration
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Accounts are only as strong as the weakest password the policy allows.
- **Business impact:** Customers choose trivial passwords that fall to the first guessing wave; the business carries the breach headlines for accounts it could have protected with one check.
- **Report title:** No Password Policy on Registration
- **Fix:** Enforce a minimum length (12+) and screen against breached-password lists.

### Mass assignment — plan & role via profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Binding a request body directly onto a record lets callers write fields that were never offered to them.
- **Business impact:** Free users upgrade themselves to paid plans and even to admin — direct revenue loss plus a privilege-escalation path that auditors rarely spot in UI testing.
- **Report title:** Mass Assignment in Profile Update (Plan/Role)
- **Fix:** Allowlist bindable fields per endpoint; never bind role/plan/billing fields from profile forms.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Any field rendered without output encoding is a stored-XSS carrier — names are attacker-controlled too.
- **Business impact:** A poisoned name fires in the admin's browser when they open the user list — session theft and actions performed as the admin follow.
- **Report title:** Stored Cross-Site Scripting via Display Name
- **Fix:** Escape all user-controlled output by default; add a Content-Security-Policy as defence in depth.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** A token that is issued but never verified is decoration, not CSRF protection.
- **Business impact:** A malicious page can silently rewrite a victim's profile — change their email and the account-recovery path points at the attacker.
- **Report title:** Cross-Site Request Forgery on Profile Update
- **Fix:** Verify a per-session anti-CSRF token (or SameSite=Lax cookies plus Origin checks) on every state change.


## Forms & Templates — 4 test(s)

### IDOR — view another workspace's form settings
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Checking "is someone logged in" is not authorization; every object access needs an ownership/tenant check.
- **Business impact:** Competitors and curious users can read every customer's form configuration — including the slugs of private forms, which is the first step to reaching the responses behind them.
- **Report title:** Insecure Direct Object Reference on Form Settings
- **Fix:** Authorize every object access against the session user's workspace membership.

### Access-setting tampering — private form flipped public
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **What it is:** Fields hidden in the UI are not hidden from the API — every writable property must be authorized per field.
- **Business impact:** A private HR or salary-review form — the most sensitive data in the product — becomes publicly readable because one extra form field was honoured.
- **Report title:** Mass Assignment of Form Access Setting (Private → Public)
- **Fix:** Allowlist settings fields; route access changes through the approval workflow server-side.

### Form slug / ID enumeration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Predictable identifiers plus unlimited probing let attackers map every tenant and target the interesting ones.
- **Business impact:** Attackers enumerate all customers and their form slugs, then focus on private and high-value forms — reconnaissance the business never notices.
- **Report title:** Unrestricted Enumeration of Form Identifiers
- **Fix:** Use unguessable public slugs (random tokens), rate-limit public endpoints, and answer uniformly.

### Submitting to a private form (access check missing on submit)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Authorization must be enforced on every endpoint that acts on an object — not only on the page that displays it.
- **Business impact:** Attackers can flood a private internal form with forged responses — poisoned HR data, fake approvals, garbage in the records the business trusts.
- **Report title:** Missing Access Check on Form Submission Endpoint
- **Fix:** Enforce the form's access mode on the submission endpoint exactly as on the render path.


## Submissions & Responses — 4 test(s)

### IDOR — read another workspace's submission
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Every object read needs a tenant check; response data is usually the most sensitive data a SaaS holds.
- **Business impact:** Confidential responses — salary reviews, applications, personal data — leak across customers. For a form platform this is a reportable data breach per tenant.
- **Report title:** Insecure Direct Object Reference on Submission Detail
- **Fix:** Authorize submission reads against the parent form's workspace membership.

### Unauthorised response export (CSV)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Bulk-export endpoints are the highest-value IDOR targets: one request takes the whole dataset, not one record.
- **Business impact:** One request exfiltrates an entire response set — names, emails, answers — the exact dataset GDPR-style breach notifications are made of.
- **Report title:** Broken Access Control on Response Export
- **Fix:** Require workspace membership (owner/member) for exports; audit-log every export.

### Stored XSS in a submission (fires in owner dashboard)
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Respondent-controlled content is untrusted input for the dashboard too — stored XSS aims UP the privilege ladder.
- **Business impact:** One crafted response executes in the form owner's browser — session theft, responses deleted, settings changed as the owner. The attacker never needed an account.
- **Report title:** Stored Cross-Site Scripting via Form Response
- **Fix:** Escape respondent content everywhere it renders; sanitize if rich text is ever allowed.

### IDOR — download another workspace's attachment
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Files inherit the sensitivity of the record they hang off; their endpoints need the same tenant checks.
- **Business impact:** CVs, ID scans, contracts — whatever respondents upload — downloadable across tenants by guessing a number.
- **Report title:** Insecure Direct Object Reference on Attachment Download
- **Fix:** Authorize attachment downloads via the parent submission's workspace.


## Files & Uploads — 2 test(s)

### Unrestricted file upload — HTML served back
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Upload features must validate type by content, store outside the web root, and serve with safe content types.
- **Business impact:** Attackers host phishing pages and scripts on the product's own trusted domain — the link victims receive really is the real service.
- **Report title:** Unrestricted File Upload with Active Content Serving
- **Fix:** Allowlist safe types, verify content, serve downloads as attachments with nosniff.

### Path traversal on asset download
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** User-controlled file paths must be canonicalised and confined to an allowlisted directory.
- **Business impact:** Source code, configuration and state files leak — and with them every secret the deployment holds, including the keys that protect other customers.
- **Report title:** Path Traversal in File Download
- **Fix:** Resolve the final path and verify it stays inside the asset directory; reject ".." outright.


## Admin Panel — 2 test(s)

### CSRF on admin user-role change
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **What it is:** Privileged actions need CSRF verification most of all — the blast radius of a forged admin request is total.
- **Business impact:** A page an admin merely visits can promote an attacker's account to admin — full platform takeover with the admin's own session doing the work.
- **Report title:** Cross-Site Request Forgery on Admin Role Management
- **Fix:** Verify anti-CSRF tokens on all admin actions; consider re-authentication for role changes.

### Broken access control — user export open to any account
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Putting a route under an /admin prefix is not access control; the role check must run on the route itself.
- **Business impact:** The full account database — including plaintext passwords — is one URL away for every registered user. That is a complete platform compromise.
- **Report title:** Missing Role Check on Admin User Export
- **Fix:** Enforce the admin role on every admin route, server-side, with deny-by-default.


## Platform & API — 2 test(s)

### Weak / predictable API token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** An API token must be a high-entropy secret; anything derived from public data is a password everyone knows.
- **Business impact:** Anyone who knows a customer's email — public information — holds their full API key: read every form and response count the integration can reach.
- **Report title:** Predictable API Token Derived from Email
- **Fix:** Generate tokens from crypto.randomBytes, store hashed, allow revocation and rotation.

### Sensitive data exposure — /api/users dumps all accounts
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** Debug and convenience endpoints must be authenticated like everything else — or removed before launch.
- **Business impact:** The entire user database with plaintext passwords is public to the internet — instant credential-stuffing material against every customer.
- **Report title:** Unauthenticated Sensitive Data Exposure at /api/users
- **Fix:** Require authenticated, authorized access; never return password fields in API responses.
