# HexaProject — Fix & Retest Guide (27 findings)

For every scored test: the secure implementation, and the retest that proves the fix. Method: apply the fix in a copy of the lab, re-run the exact exploit from PRACTICE-GUIDE.md, confirm it now fails, and confirm the legitimate flow still works.


## Login & Authentication

### SQL Injection — Login Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Brute Force — No Rate Limiting on Login (High)
- **Fix:** Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### User Enumeration via Login & Reset Responses (Medium)
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Default / Demo Credentials Still Active (High)
- **Fix:** Remove demo/default accounts before production; force unique credentials for every seeded user.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Predictable Password-Reset Token (Critical)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Session/Role Cookie Tampering (Critical)
- **Fix:** Keep authorisation state server-side in the session; never trust client-supplied role values.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Medium)
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Mass Assignment — Self-Assigning the Admin Role (Critical)
- **Fix:** Whitelist bindable fields explicitly; never bind role/privilege fields from client input.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Stored XSS via Display Name (High)
- **Fix:** Context-encode all user-controlled output; sanitise stored rich text with an allowlist.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### CSRF on Profile Update (Medium)
- **Fix:** Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Projects

### Cross-Project IDOR — Reading Another Team’s Private Project (High)
- **Fix:** Check project membership/ownership on every project-scoped query; scope queries by the caller’s memberships.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Tampering with Another Team’s Project (Edit/Delete) (High)
- **Fix:** Require owner (or manager) role on the target project for every mutating project endpoint.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Search

### Reflected XSS in Search (Medium)
- **Fix:** HTML-encode the reflected query (and all reflected input) in the results page.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Search Leaks Private Projects & Tasks (Medium)
- **Fix:** Scope search queries to projects the caller belongs to; apply the same access checks as detail pages.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Tasks & Milestones

### Task IDOR — Viewing Tasks in Projects You Cannot Access (High)
- **Fix:** Resolve the task’s project and verify the caller’s membership before serving any task data.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Viewer Role Can Edit Tasks (Broken Role Check) (Medium)
- **Fix:** Enforce per-action role checks server-side (viewer = read-only) on every mutating endpoint.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Non-Member Can Create Tasks in a Private Project (Medium)
- **Fix:** Verify membership (member role or above) before creating objects inside a project.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Milestone Tampering by a Plain Member (Medium)
- **Fix:** Restrict milestone create/update to owner/manager roles, enforced server-side.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Comments

### Stored XSS in Task Comments (High)
- **Fix:** Encode comment output on render; sanitise with an allowlist if markup is needed.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Deleting Other Users’ Comments (No Author Check) (Medium)
- **Fix:** Only the comment’s author (or a project manager) may delete it; verify server-side.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Files & Attachments

### Attachment IDOR — Downloading Another Project’s Files (High)
- **Fix:** Authorise every file download against the file’s project membership before serving content.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Unrestricted File Upload — HTML Served as Web Content (High)
- **Fix:** Allowlist file types, verify content, store outside web root, serve with Content-Disposition: attachment.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Path Traversal in File Download (High)
- **Fix:** Resolve the requested path and require it to stay inside the attachment directory; reject ".." sequences.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Team & Roles

### Self-Promotion — Viewer Promotes Themselves to Project Owner (Critical)
- **Fix:** Only project owners may change roles; verify the caller’s role server-side on the members endpoints.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.

### Plain Member Can Remove the Project Owner (High)
- **Fix:** Enforce role hierarchy on member removal (only owners remove members; owners cannot be removed by non-owners).
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Admin Panel

### Admin Actions via GET — One-Click User Deletion (CSRF) (High)
- **Fix:** Use POST with verified anti-CSRF tokens for all admin mutations; require confirmation for destructive actions.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.


## Platform & API

### Unauthenticated API Dumps All Users incl. Passwords (Critical)
- **Fix:** Require authentication on all API endpoints; serialize allowlisted fields only; hash passwords with bcrypt/argon2.
- **Retest:** repeat the exploit steps in PRACTICE-GUIDE.md — it must now fail (access denied / generic error / payload encoded), while the normal user flow for this feature still succeeds.
