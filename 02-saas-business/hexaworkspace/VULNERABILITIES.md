# HexaWorkspace — Vulnerability Map (25 scored tests)

Every vulnerability below is a **scored test** in the lab’s progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.

## Login & Authentication — 6 test(s)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Advanced · **Severity (in a real client report):** Critical
- **Where:** POST /login (string-built user lookup)
- **What it is:** String-built queries let attacker input change the logic of the query itself. Authentication must use parameterised queries so input is always treated as data, never as code.
- **Business impact:** An attacker logs in as the site administrator without any password. On a real client workspace that means every team file, member list and billing setting is exposed in one request.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements for all database access; never build queries by string concatenation.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** POST /login
- **What it is:** Without rate limiting or lockout, an attacker can try unlimited passwords against any account. Failed-login throttling is a basic authentication control.
- **Business impact:** Attackers can grind through password lists against a real client’s accounts at full speed until one works — especially dangerous for owner and admin accounts.
- **Report title:** Missing Brute-Force Protection on Login
- **Fix:** Rate-limit login attempts per account and per IP, add progressive delays / lockout and alerting on repeated failures.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Where:** POST /login + POST /forgot
- **What it is:** Different error messages for "user does not exist" and "wrong password" let attackers build a list of valid accounts to target. Authentication responses must be identical either way.
- **Business impact:** An attacker first harvests which employee emails have accounts on the client’s platform, then focuses phishing and password attacks only on real users.
- **Report title:** Account Enumeration via Distinct Authentication Error Messages
- **Fix:** Return one generic message ("Invalid email or password") for all failed logins and password-reset requests.

### Weak / Default Credentials — Demo Guest Account
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** Seeded guest account + POST /login
- **What it is:** Default and demo credentials left active in production are an open door — attackers try them first, before any clever exploit.
- **Business impact:** Anyone on the internet can sign in with the published demo login and start exploring the client’s platform from the inside.
- **Report title:** Active Default/Demo Account with Weak Password
- **Fix:** Remove or disable demo/default accounts before production; enforce unique, strong credentials for every account.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Where:** POST /reset (token = rst-<id>-<id*137+42>)
- **What it is:** Reset tokens must be long, random and single-use. A token an attacker can compute from a user ID is equivalent to no token at all.
- **Business impact:** An attacker resets the workspace owner’s password using only their user ID, takes over the account, and inherits every file and permission it controls.
- **Report title:** Predictable Password Reset Token Allows Account Takeover
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.

### Session Role Cookie Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Where:** hws_role cookie, trusted by GET /admin
- **What it is:** Authorization data must live server-side. A role stored in a client cookie — even encoded — is just a suggestion the attacker can rewrite.
- **Business impact:** Any low-privilege user promotes themselves to site administrator by editing a cookie, reaching user management and moderation for the whole platform.
- **Report title:** Privilege Escalation via Unsigned Role Cookie
- **Fix:** Keep roles in server-side session state; never trust client-supplied role claims. If a token must carry claims, sign and verify it (e.g. HMAC/JWT with server secret).

## Registration & Profile — 4 test(s)

### Mass Assignment — Privileged Fields Accepted from the Form
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Where:** POST /profile + POST /register (unfiltered field binding)
- **What it is:** Binding request data directly to a data model lets attackers set fields the UI never offered. Updates must use an explicit allowlist of editable fields.
- **Business impact:** A ordinary user grants themselves site-admin on the client’s SaaS, unlocking user deletion, moderation and platform-wide settings.
- **Report title:** Mass Assignment Allows Privilege Escalation to Site Admin
- **Fix:** Allowlist bindable fields per endpoint; never bind role/permission fields from request data.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** Display name rendered raw in header + /workspace/:id/members
- **What it is:** Any user-controlled text rendered into other users’ pages must be output-encoded. Stored XSS fires in the victim’s browser with their session.
- **Business impact:** An attacker plants a script in their profile name; every teammate or admin who views the member list runs it — session theft and actions performed as the victim follow.
- **Report title:** Stored Cross-Site Scripting via Display Name
- **Fix:** Context-appropriate output encoding for all user-supplied content; add a Content-Security-Policy as defence in depth.

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Where:** POST /register (no length/complexity check)
- **What it is:** Password policy is enforced server-side or not at all. Accepting trivial passwords makes accounts guessable in seconds.
- **Business impact:** Customers who choose weak passwords (many will) have their workspaces — and every shared client file inside — taken over by simple guessing.
- **Report title:** Missing Password Complexity / Length Policy
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists at registration and reset.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **Where:** POST /profile (hx_tok rendered, never verified)
- **What it is:** State-changing forms need an unguessable, server-verified CSRF token bound to the session. A token that is rendered but never checked is decoration.
- **Business impact:** A malicious page open in a victim’s browser silently rewrites their profile — the first step in account-takeover and social-engineering chains against the client’s team.
- **Report title:** Cross-Site Request Forgery on Profile Update (Token Not Verified)
- **Fix:** Verify the CSRF token server-side on every state-changing request and enforce SameSite cookies.

## Workspaces & Members — 2 test(s)

### IDOR — Another Workspace’s Member List Exposed
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** GET /workspace/:id/members (no membership check)
- **What it is:** Every object endpoint must verify the requester’s relationship to that object. Sequential IDs plus a missing membership check expose the whole tenant map.
- **Business impact:** A competitor enumerates the client’s customer workspaces and their full member rosters — names and emails ready-made for phishing.
- **Report title:** Insecure Direct Object Reference on Workspace Member List
- **Fix:** Check workspace membership (or an explicit grant) on every workspace-scoped endpoint, not just authentication.

### Role Tampering — a Viewer Can Demote or Remove the Owner
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** POST /workspace/:id/members/role + /remove (no owner check)
- **What it is:** Sensitive team operations must verify the actor’s role server-side. Hiding the button in the UI is not authorization.
- **Business impact:** The lowest-privilege member of a client workspace fires the owner and seizes or destroys the team’s shared space — a total loss of control in one request.
- **Report title:** Missing Authorization on Member Role Change / Removal
- **Fix:** Require workspace-owner role (verified server-side) for role changes and removals; protect the owner record from demotion.

## Files & Permissions — 5 test(s)

### IDOR — Private File of Another Team Served by ID
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **Where:** GET /files/:id (login check only)
- **What it is:** Object-level authorization must be checked on every read. "Logged in" is not "allowed". This is the single most common SaaS data-leak pattern.
- **Business impact:** Every private file on the platform — contracts, salary bands, roadmaps — is readable by any account holder who guesses an ID. A client’s entire document store leaks.
- **Report title:** Insecure Direct Object Reference on File View
- **Fix:** Authorize each file read against workspace membership or an explicit per-file grant.

### Permission Bypass — Viewer Edits a File
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** POST /files/:id/edit (membership checked, role not checked)
- **What it is:** UI hiding is not enforcement. Every mutating endpoint must re-check the actor’s permission for that object.
- **Business impact:** A read-only guest silently rewrites shared client documents — contracts altered, figures changed — with no visual clue anything was wrong.
- **Report title:** Missing Role Check on File Edit Endpoint
- **Fix:** Enforce editor-or-above role server-side on all file mutation endpoints.

### Permission Bypass — Viewer Deletes a File
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** POST /files/:id/delete (membership checked, role not checked)
- **What it is:** Destructive actions deserve the strictest server-side checks. A delete that trusts the UI’s hidden button is one request away from data loss.
- **Business impact:** A disgruntled read-only member wipes the client’s shared files. Without backups the business documents are simply gone.
- **Report title:** Missing Role Check on File Delete Endpoint
- **Fix:** Enforce editor-or-above (ideally owner) server-side for deletion; consider soft-delete with recovery.

### Folder Path Traversal — Reading Another Team’s Files by Path
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Where:** GET /raw?path= (naive ".." resolution)
- **What it is:** User-supplied paths must be canonicalised and confined to an allowed root. String prefixes are not a boundary once ".." is resolved.
- **Business impact:** An attacker walks the folder tree out of their own workspace and downloads every other customer’s files on the platform.
- **Report title:** Path Traversal in File Download Allows Cross-Tenant File Access
- **Fix:** Resolve the canonical path and verify it stays inside the requester’s authorised root; reject ".." outright.

### Sharing Grant Created Without Authority
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** POST /files/:id/share (no authority check)
- **What it is:** Sharing is a privileged operation: only owners/editors may extend access. If anyone can grant, permissions are theatre.
- **Business impact:** An insider quietly grants an outside accomplice access to confidential client files — the leak looks like legitimate sharing in every log.
- **Report title:** Missing Authorization on File Sharing Grant Creation
- **Fix:** Require owner/editor role on the file’s workspace to create grants; log grant creation for audit.

## Comments — 2 test(s)

### Stored XSS in File Comments
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **Where:** Comment body rendered raw on GET /files/:id
- **What it is:** Discussion text is code’s worst neighbour: stored unescaped, it executes for every viewer. Output encoding is mandatory on every render path.
- **Business impact:** One poisoned comment on a popular client file attacks every teammate and admin who opens it — a watering-hole inside the client’s own workspace.
- **Report title:** Stored Cross-Site Scripting in Comments
- **Fix:** Escape all comment content on render; sanitise if rich text is ever allowed; add CSP.

### IDOR — Deleting Another User's Comment
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **Where:** POST /comments/:id/delete (no ownership check)
- **What it is:** Ownership checks apply to every object, however small. If delete checks nothing, moderation history and evidence can be erased by anyone.
- **Business impact:** Attackers erase inconvenient comments — approvals, warnings, audit trail — undermining trust in the client’s collaboration records.
- **Report title:** Missing Ownership Check on Comment Deletion
- **Fix:** Allow deletion only by the comment author, workspace owner, or a site admin — verified server-side.

## Share Links — 2 test(s)

### Revoked Share Link Keeps Working
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** GET /s/:token (revoked flag never consulted)
- **What it is:** Revocation must be enforced at access time, not just recorded. A revoked link that still resolves is a permanent backdoor.
- **Business impact:** A client revokes a link after a leak scare and believes the file is safe — while the "dead" link keeps serving it to whoever saved it.
- **Report title:** Revoked Share Links Remain Active
- **Fix:** Check the revoked flag (and expiry) on every share-link access; deny revoked tokens.

### Predictable, Enumerable Share-Link Tokens
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** GET /s/:token (sequential tokens shr-1001, shr-1002, ...)
- **What it is:** Access tokens must be unguessable: long, random, and independent. Sequential IDs turn "anyone with the link" into "anyone".
- **Business impact:** An attacker enumerates every shared file on the platform by counting upwards — every "private link" a client ever sent becomes public.
- **Report title:** Guessable Share-Link Tokens Allow Enumeration of Shared Files
- **Fix:** Generate share tokens with a CSPRNG (≥128 bits of entropy); rate-limit token lookups.

## File Upload — 1 test(s)

### Unrestricted Upload — HTML File Served as a Web Page
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** POST /upload + GET /uploads/:name (content type from extension)
- **What it is:** Uploads must be validated by content, stored outside the web root or served with a safe content type and Content-Disposition. Serving attacker HTML from your own origin is stored XSS with extra steps.
- **Business impact:** Attackers host phishing pages and scripts on the client’s own trusted domain — links that pass every "check the URL" test a victim was taught.
- **Report title:** Unrestricted File Upload Leads to Stored XSS / Content Spoofing
- **Fix:** Allowlist file types, verify content, serve uploads as attachments or from a separate sandbox domain with safe content types.

## Admin Panel — 1 test(s)

### CSRF — Admin User Deletion via a GET Link
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **Where:** GET /admin/users/:id/delete (state change via GET, no token)
- **What it is:** State changes require POST plus a verified CSRF token. A destructive GET can be triggered by an <img> tag on any page the admin views.
- **Business impact:** An attacker emails the admin a page containing an invisible image pointing at the delete URL — one glance deletes a customer account.
- **Report title:** State-Changing GET Request Allows CSRF Account Deletion
- **Fix:** Make destructive actions POST-only with a verified CSRF token and re-authentication for critical operations.

## Platform & API — 2 test(s)

### Sensitive Data Exposure — /api/users Full Dump
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **Where:** GET /api/users (no authentication)
- **What it is:** API endpoints need the same authN/authZ discipline as pages. Debug and convenience endpoints left open are mass data breaches waiting for a crawler.
- **Business impact:** Full account takeover of the entire platform in one request: every user’s email and password, ready for direct login.
- **Report title:** Unauthenticated API Endpoint Exposes All User Credentials
- **Fix:** Require authentication and admin authorization on user-listing APIs; never return password material in API responses.

### Predictable API Token — Cross-Account API Access
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **Where:** GET /api/files?token= (token = hw-<1000+userId>)
- **What it is:** API tokens are credentials. They must be long and random; a token derived from a public user ID authenticates no one.
- **Business impact:** Anyone can mint any customer’s API token from their user ID and pull their files programmatically — silent, bulk exfiltration.
- **Report title:** Predictable API Tokens Allow Cross-Account Data Access
- **Fix:** Issue API tokens from a CSPRNG with ≥128 bits of entropy; show them once, store hashed, and scope them per account.
