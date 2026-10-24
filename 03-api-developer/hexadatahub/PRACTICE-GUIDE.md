# HexaDataHub — Practice Guide (LAB 28)

Challenges grouped by feature, then difficulty. Each challenge has a measurable objective and 3 graded hints (the same hints shown on the in-app `/tests` Mission page). A challenge is complete only when the exploit actually succeeds — the lab detects the real effect server-side.

## Login & Authentication

### [Beginner] Brute Force — No Rate Limit or Lockout
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: Nothing on the login form mentions attempt limits or CAPTCHAs.
- Hint 2: Try a handful of wrong passwords for one account and watch whether anything slows down or locks.
- Hint 3: Submit 10 or more wrong passwords for alice@acme.test — the 10th failure is still processed instantly. There is no throttle at all.

### [Beginner] User Enumeration via Error Messages
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: Compare what the app says for an email that exists versus one that does not.
- Hint 2: Try both the login form and the forgot-password form with a real and a fake email.
- Hint 3: Login with a real email + wrong password says "Incorrect password"; a fake email says "No account found". Forgot-password answers differently too — the app confirms which emails are registered.

### [Beginner] Default Demo Credentials Still Active
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: The login page itself is generous with information for new visitors.
- Hint 2: Look for a demo / trial account mentioned anywhere on the login page.
- Hint 3: The login page prints the demo account demo@datahub.io with password demo1234. It is a real, working account.

### [Intermediate] SQL Injection — Login Bypass
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A03:2021 Injection
- Hint 1: The login form builds its database query by gluing your input straight into the query text.
- Hint 2: Think about making the email condition true for every row — quotes plus a logical OR.
- Hint 3: Use email: ' OR '1'='1' --  with any password. The -- comments out the password check and the first account matches.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: Ask for a password reset and study the token in the reset link closely.
- Hint 2: The token looks familiar — compare it with the email address it was issued for.
- Hint 3: The token is simply the account email encoded in base64. Encode any victim email the same way, open /reset?token=<that value>, and set a new password.

### [Intermediate] Session Cookie Tampering — Role Forgery
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Inspect the hx_session cookie after logging in — what is inside it, and who signed it?
- Hint 2: The cookie is just encoded JSON, and nothing checks its integrity.
- Hint 3: Decode the cookie (base64), change "role" to "admin", re-encode it, and visit /admin. The server trusts the role you hand it.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: Register a new account and be lazy about the password.
- Hint 2: Does the form complain about a very short password?
- Hint 3: A one-character password ("a") is accepted. There is no length or complexity policy at all.

### [Intermediate] Mass Assignment — Self-Made Admin
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The registration endpoint binds whatever fields you send to the new account record.
- Hint 2: What fields does an account have that the form never shows? Think about role.
- Hint 3: Send the registration POST with an extra field role=admin (curl or devtools). The account is created as a platform admin.

### [Intermediate] Stored XSS in Display Name
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A03:2021 Injection
- Hint 1: Your display name appears on more pages than your own profile — the Team page shows every member.
- Hint 2: Names are rendered exactly as typed, with no output encoding.
- Hint 3: Set your display name to <script>alert(1)</script> (or an <img onerror> payload) and open the Team page: the payload is stored and served to everyone.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The profile form changes your email and name — what proves the request came from the app’s own page?
- Hint 2: There is no anti-CSRF token in the form, and the server ignores where the request came from.
- Hint 3: While logged in, submit the profile form from a different origin (or with no origin/marker at all). The change is applied anyway.

## Workspaces & Members

### [Beginner] Cross-Workspace IDOR — Rival Workspace Settings
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Your workspace has an ID in its URL. Other companies have workspaces too.
- Hint 2: The settings page checks that you are logged in — but does it check that the workspace is yours?
- Hint 3: Open /workspaces/2 while logged into workspace 1. A rival company’s settings and member list are served to you.

### [Intermediate] Invite Link Abuse — Sequential Tokens, No Email Binding
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Workspace invites are links. Look at the shape of an invite link for your own workspace.
- Hint 2: The tokens look sequential — and the accept page never asks whether the invite was meant for you.
- Hint 3: Open /invite/inv-1 while logged in as someone the invite was never sent to. You are added to that workspace instantly.

## Datasets

### [Beginner] Cross-Workspace Dataset IDOR
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Dataset pages have IDs in the URL, and datasets belong to workspaces.
- Hint 2: Try opening a dataset that belongs to the other company.
- Hint 3: Open /datasets/3 while logged into workspace 1: the other tenant’s full dataset — every row — is served.

### [Intermediate] Dataset Rename by Non-Member
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Viewing is not the only thing missing a check — look at what you can change on someone else’s dataset.
- Hint 2: The rename form on a dataset page posts to an endpoint that never verifies ownership.
- Hint 3: While viewing the other workspace’s dataset (ID 3), use its rename form. The new name is saved — you modified a rival tenant’s data.

### [Intermediate] Dataset Deletion by Outsider
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: If rename lacks a check, what about the most destructive action on the page?
- Hint 2: The delete endpoint trusts any logged-in user — even one from a different workspace.
- Hint 3: As a workspace 1 user, POST the delete for dataset 4 (owned by workspace 2). It is permanently deleted.

## Imports

### [Intermediate] CSV Formula Injection via Import
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A03:2021 Injection
- Hint 1: Imported CSV cells are stored exactly as written — think about what a spreadsheet does with a cell that starts with a special character.
- Hint 2: Cells beginning with = + - or @ are treated as formulas when the data is opened in Excel or Sheets.
- Hint 3: Import a CSV containing a cell like =2+5+cmd|’ /C calc’!A0. It is stored and later exported verbatim — a formula waiting to execute on a victim’s machine.

### [Intermediate] Import Path Traversal — Reading Server Files
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The import form offers "import from a server path" for power users. Paths are joined to an uploads folder…
- Hint 2: …but nothing stops the path from walking back out of that folder.
- Hint 3: Set the source path to ../server.js. The importer reads the application’s own source code and turns it into a dataset.

### [Advanced] XML External Entity (XXE) in Dataset Import
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A05:2021 Security Misconfiguration
- Hint 1: The importer also accepts XML datasets — and its parser is old-school trusting.
- Hint 2: XML lets a document declare entities, including ones that point at files on the server.
- Hint 3: Import an XML file whose DOCTYPE declares <!ENTITY xxe SYSTEM "file:///etc/passwd"> (or the lab’s server.js) and reference &xxe; in a cell. The file’s contents land inside your dataset.

## Exports & API

### [Beginner] Cross-Workspace Dataset Export
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Exports turn a dataset into a downloadable CSV. Whose datasets can you export?
- Hint 2: The export endpoint repeats the view page’s mistake — no tenant check.
- Hint 3: Open /datasets/3/export as a workspace 1 user: the other company’s complete dataset downloads as CSV.

### [Intermediate] Predictable API Key — Derived from Email
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A07:2021 Authentication Failures
- Hint 1: Your API page shows your key. Study its format — where have you seen that string before?
- Hint 2: The key is a prefix plus your email address, encoded. Nothing random is involved.
- Hint 3: Take any user’s email, base64-encode it, prefix it like the docs show, and call /api/datasets with header x-api-key — no login needed. You are authenticated as them.

### [Intermediate] API Broken Object-Level Authorisation — Workspace Parameter
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The API accepts a workspace parameter to choose whose data to return.
- Hint 2: Your key proves who you are — but does the API check that the workspace you ask for is yours?
- Hint 3: Call /api/datasets?workspace=2 with workspace 1’s key. The other tenant’s datasets come back.

## Sharing

### [Intermediate] Guessable Public Share Links
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Shared datasets live under /s/<token>. Real share tokens are random — but old links never die.
- Hint 2: A legacy alias pattern still works for every dataset, shared or not.
- Hint 3: Open /s/share-3 in a private window (no login). Dataset 3 is served publicly — the "token" is just its ID.

### [Intermediate] Share-Link Enumeration — No Rate Limit
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: What happens when you try share tokens that do not exist? Anything slow you down?
- Hint 2: The share endpoint answers hit-or-miss questions forever, as fast as you can ask.
- Hint 3: Probe 5 or more different /s/<token> values in a minute. Nothing throttles you — an attacker can sweep the whole token space this way.

## Search

### [Beginner] Reflected XSS in Dataset Search
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A03:2021 Injection
- Hint 1: The dataset search repeats your query back on the results page.
- Hint 2: It repeats it exactly as typed — try asking it to say something with angle brackets.
- Hint 3: Search for <script>alert(1)</script>: the payload is reflected into the page unescaped and executes.

## Admin & Platform

### [Beginner] Debug Endpoint Exposes All Users and Passwords
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A05:2021 Security Misconfiguration
- Hint 1: Development leftovers often survive into production under predictable paths.
- Hint 2: Think /api/debug, /debug, /backup — try the API’s debug route.
- Hint 3: Open /api/debug with no login at all: it dumps every user (with passwords), every workspace and dataset metadata as JSON.

### [Intermediate] CSRF on Admin User Deletion
- **Objective:** Make the exploit succeed so the lab marks this test complete (watch the header progress bar / `/tests`).
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The admin panel can delete users with a single form post.
- Hint 2: Like other forms here, it carries no anti-CSRF token and ignores request origin.
- Hint 3: While an admin session exists, fire the delete POST from a foreign origin. The user is deleted — no token was ever checked.
