# HexaProject — Vulnerability Map (27 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.


## Login & Authentication — 6 test(s)

### SQL Injection — Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** String-built SQL queries let an attacker rewrite the login check itself. Parameterised queries remove the whole class.
- **Business impact:** On a real client SaaS, this is a full account takeover of the first user in the table — usually an administrator — with no password at all.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limiting on Login
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Without throttling or lockout, online password guessing is cheap and quiet. Rate limits + lockout + MFA are the standard defence.
- **Business impact:** Attackers can grind through password lists against real user accounts; one weak password anywhere becomes a breach.
- **Report title:** No Rate Limiting or Account Lockout on Login Endpoint
- **Fix:** Add progressive delays/lockout per account and IP, CAPTCHA after failures, and offer MFA.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Different responses for "no such user" vs "wrong password" hand attackers a free list of valid accounts to target.
- **Business impact:** Attackers harvest valid employee emails from the client’s own login page, then aim phishing and password spraying precisely.
- **Report title:** Account Enumeration via Differential Authentication Responses
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for every failure case.

### Default / Demo Credentials Still Active
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Demo and default accounts shipped to production are pre-made doors: their passwords are public knowledge.
- **Business impact:** Anyone who reads the product’s docs or guesses the demo login walks straight into the client’s workspace.
- **Report title:** Active Default/Demo Account with Known Password
- **Fix:** Remove demo/default accounts before production; force unique credentials for every seeded user.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Reset tokens must be long, random and single-use. A token derived from public values (ID + time) can be forged for any account.
- **Business impact:** An attacker resets the password of any user — including admins — knowing only their email and the time of day. Full account takeover, no inbox access needed.
- **Report title:** Password Reset Tokens Are Predictable (ID + Timestamp)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, single use.

### Session/Role Cookie Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Authorisation data must live server-side. A role stored in an unsigned client cookie is a suggestion the user can edit.
- **Business impact:** Any normal user promotes themselves to platform admin by editing a cookie — full control of every workspace on the client’s SaaS.
- **Report title:** Platform Role Trusted from Unsigned Client Cookie
- **Fix:** Keep authorisation state server-side in the session; never trust client-supplied role values.


## Registration & Profile — 4 test(s)

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** A password policy is the cheapest control there is; accepting 1-character passwords invites credential stuffing and guessing.
- **Business impact:** Users will pick trivial passwords, and every one of them is an easy account takeover on the client’s platform.
- **Report title:** Registration Accepts Trivially Weak Passwords
- **Fix:** Enforce a minimum length (≥10) and screen against known-breached password lists.

### Mass Assignment — Self-Assigning the Admin Role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Frameworks that auto-bind request fields to models let attackers set privileged attributes (role, balance, tier) they were never shown.
- **Business impact:** A stranger registers and instantly owns the platform: every project, every file, every user of the client’s SaaS.
- **Report title:** Mass Assignment Allows Privilege Escalation via role Parameter
- **Fix:** Whitelist bindable fields explicitly; never bind role/privilege fields from client input.

### Stored XSS via Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Any stored field rendered without output encoding becomes a persistent script delivery mechanism aimed at other users — including admins.
- **Business impact:** An attacker plants a script in their profile name; every teammate and admin who opens a member list runs it — session theft and actions in their name.
- **Report title:** Stored Cross-Site Scripting in User Display Name
- **Fix:** Context-encode all user-controlled output; sanitise stored rich text with an allowlist.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** A CSRF token that is rendered but never verified is decoration. State-changing requests must validate the token (or SameSite + origin checks) server-side.
- **Business impact:** A malicious page a logged-in user visits silently rewrites their profile — the first step to account-takeover chains (e.g. changing the recovery email).
- **Report title:** Cross-Site Request Forgery on Profile Update (Token Not Verified)
- **Fix:** Verify the anti-CSRF token server-side on every state-changing request; enforce SameSite cookies.


## Projects — 2 test(s)

### Cross-Project IDOR — Reading Another Team’s Private Project
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Hiding an object from lists is not access control. Every object fetch must check the caller’s right to that object.
- **Business impact:** Competitors or disgruntled users read other teams’ roadmaps, budgets and client names just by changing a number in the URL.
- **Report title:** Insecure Direct Object Reference on Project Detail (No Membership Check)
- **Fix:** Check project membership/ownership on every project-scoped query; scope queries by the caller’s memberships.

### Tampering with Another Team’s Project (Edit/Delete)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Broken access control on write paths turns confidentiality bugs into integrity disasters: data can be altered or destroyed, not just read.
- **Business impact:** A low-privilege user renames, corrupts or deletes other customers’ projects — vandalism or extortion against the client’s tenants.
- **Report title:** Missing Authorisation on Project Update/Delete Allows Cross-Tenant Tampering
- **Fix:** Require owner (or manager) role on the target project for every mutating project endpoint.


## Search — 2 test(s)

### Reflected XSS in Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Reflected input must be encoded for the context it lands in. Search boxes are the most-tested reflection point on any site.
- **Business impact:** Attackers send victims a crafted search link; the script runs in the victim’s session on the client’s real domain — phishing and session theft follow.
- **Report title:** Reflected Cross-Site Scripting in Search Query
- **Fix:** HTML-encode the reflected query (and all reflected input) in the results page.

### Search Leaks Private Projects & Tasks
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Every read path — lists, detail pages AND search — must apply the same authorisation scoping. Search is the path teams forget.
- **Business impact:** Private project names, task titles and internal vocabulary leak to any user, mapping the client’s confidential work for targeted attacks.
- **Report title:** Search Results Not Scoped by Project Membership (Information Disclosure)
- **Fix:** Scope search queries to projects the caller belongs to; apply the same access checks as detail pages.


## Tasks & Milestones — 4 test(s)

### Task IDOR — Viewing Tasks in Projects You Cannot Access
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Child objects inherit the parent’s sensitivity. Authorisation must be evaluated against the parent project on every child fetch.
- **Business impact:** Internal task details — migration plans, fee audits, incident notes — are readable by any user who guesses an ID.
- **Report title:** Insecure Direct Object Reference on Task Detail (Parent Project Not Checked)
- **Fix:** Resolve the task’s project and verify the caller’s membership before serving any task data.

### Viewer Role Can Edit Tasks (Broken Role Check)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Roles must be enforced server-side per action, not just hidden in the UI. A read-only role that can write is an integrity hole.
- **Business impact:** Auditors, clients and guests given "view-only" access can silently alter task states and contents — sabotage with legitimate credentials.
- **Report title:** Missing Server-Side Role Enforcement Lets Viewers Modify Tasks
- **Fix:** Enforce per-action role checks server-side (viewer = read-only) on every mutating endpoint.

### Non-Member Can Create Tasks in a Private Project
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Create paths are write paths: they need the same membership checks as reads and updates.
- **Business impact:** Outsiders inject fake tasks into private projects — spam, social-engineering bait, or poisoned work queues for the client’s teams.
- **Report title:** Task Creation Endpoint Lacks Project Membership Check
- **Fix:** Verify membership (member role or above) before creating objects inside a project.

### Milestone Tampering by a Plain Member
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Not every member action is equal: plan-level objects (milestones, budgets) need elevated roles, checked server-side.
- **Business impact:** A junior member quietly moves a contractual deadline; the client discovers it when the milestone is "missed" — or met fraudulently.
- **Report title:** Milestone Modification Allowed for Non-Manager Members
- **Fix:** Restrict milestone create/update to owner/manager roles, enforced server-side.


## Comments — 2 test(s)

### Stored XSS in Task Comments
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Collaborative text fields are prime stored-XSS territory: one user’s input becomes every teammate’s execution context.
- **Business impact:** A single comment hijacks the sessions of everyone who opens the task — including project owners and admins.
- **Report title:** Stored Cross-Site Scripting in Task Comments
- **Fix:** Encode comment output on render; sanitise with an allowlist if markup is needed.

### Deleting Other Users’ Comments (No Author Check)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Ownership checks apply to destructive actions too. "Logged in" is not "authorised for this object".
- **Business impact:** Users erase colleagues’ comments — destroying discussion history and audit trails inside the client’s projects.
- **Report title:** Comment Deletion Lacks Authorisation (Any User Can Delete Any Comment)
- **Fix:** Only the comment’s author (or a project manager) may delete it; verify server-side.


## Files & Attachments — 3 test(s)

### Attachment IDOR — Downloading Another Project’s Files
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** File downloads are object fetches like any other: the caller’s right to the parent project must be checked before bytes are served.
- **Business impact:**  Budgets, contracts and designs attached to private projects leak to any authenticated user — the classic SaaS data breach pattern.
- **Report title:** Insecure Direct Object Reference on File Download (No Project Check)
- **Fix:** Authorise every file download against the file’s project membership before serving content.

### Unrestricted File Upload — HTML Served as Web Content
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Uploads must be validated by content, stored safely, and served with a neutral Content-Type / Content-Disposition. An .html upload served inline is stored XSS by another name.
- **Business impact:** Attackers host phishing pages and scripts on the client’s own trusted domain, defeating user suspicion and some security tooling.
- **Report title:** Unrestricted File Upload Allows Hosting HTML/JS Content
- **Fix:** Allowlist file types, verify content, store outside web root, serve with Content-Disposition: attachment.

### Path Traversal in File Download
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** User-controlled paths must be canonicalised and confined to an allowlisted base directory. "../" is the oldest trick in the book because it keeps working.
- **Business impact:** Source code, configuration and any file the server can read are exposed — the standard first step from bug to full compromise.
- **Report title:** Directory Traversal in Download Endpoint Exposes Server Files
- **Fix:** Resolve the requested path and require it to stay inside the attachment directory; reject ".." sequences.


## Team & Roles — 2 test(s)

### Self-Promotion — Viewer Promotes Themselves to Project Owner
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Role-management endpoints are the crown jewels of a collaboration tool: they demand the strictest server-side checks.
- **Business impact:** A read-only guest seizes ownership of the project — locks out the real owner, reads everything, invites anyone.
- **Report title:** Project Role Changes Lack Authorisation (Privilege Escalation to Owner)
- **Fix:** Only project owners may change roles; verify the caller’s role server-side on the members endpoints.

### Plain Member Can Remove the Project Owner
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Destructive membership actions need role hierarchy rules: nobody below owner should be able to remove an owner.
- **Business impact:** A disgruntled member ejects the project owner, causing lockout and chaos — a denial-of-service against the client’s own team.
- **Report title:** Member Removal Endpoint Allows Ejecting the Project Owner
- **Fix:** Enforce role hierarchy on member removal (only owners remove members; owners cannot be removed by non-owners).


## Admin Panel — 1 test(s)

### Admin Actions via GET — One-Click User Deletion (CSRF)
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **What it is:** State changes must never ride on GET, and admin actions need CSRF tokens plus re-confirmation for destructive operations.
- **Business impact:** An attacker page auto-visited by an admin deletes users at scale — a one-image-tag attack on the client’s whole platform.
- **Report title:** State-Changing Admin Actions over GET without CSRF Protection
- **Fix:** Use POST with verified anti-CSRF tokens for all admin mutations; require confirmation for destructive actions.


## Platform & API — 1 test(s)

### Unauthenticated API Dumps All Users incl. Passwords
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** APIs deserve the same authentication as the UI — and must never serialize secrets like passwords. Field-level allowlists prevent over-exposure.
- **Business impact:** The entire user base — names, emails and reusable plaintext passwords — is public to the internet. Credential stuffing against every other service follows.
- **Report title:** Unauthenticated API Endpoint Exposes All Users and Plaintext Passwords
- **Fix:** Require authentication on all API endpoints; serialize allowlisted fields only; hash passwords with bcrypt/argon2.
