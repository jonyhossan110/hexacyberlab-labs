# HexaWorkspace — Practice Guide (25 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app’s 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times.

## Login & Authentication

### Brute Force — No Rate Limiting or Lockout (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Nothing slows you down on the login form — no delay, no CAPTCHA, no lockout.
2. Script ten wrong passwords for one account and watch: every one is processed.
3. The 10th failed attempt for the same account is still accepted for processing — that missing throttle is the flaw.

**Walkthrough (read after trying):** Step by step: 1) Pick a real account, e.g. emma@acme.test. 2) Submit a wrong password 10 times (Burp Intruder or a small loop). 3) Every attempt is processed with no throttle — the test completes at the 10th failure.

### User Enumeration via Login & Forgot-Password Responses (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the login error for an email that exists with one that does not.
2. "No account found" vs "Incorrect password" — the app tells you which emails are registered.
3. Probe one unknown email and one known email with a wrong password; the different answers are the leak.

**Walkthrough (read after trying):** Step by step: 1) Log in with an email that does not exist, e.g. nobody@acme.test — note the message. 2) Log in with a real email (emma@acme.test) and a wrong password — note the different message. 3) The contrast confirms which accounts exist.

### Weak / Default Credentials — Demo Guest Account (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Demo and seed accounts are a classic way in. This lab ships with one.
2. The guest account uses the most-guessed pattern there is: guest / guest123.
3. Sign in as guest@hexaworkspace.local with password guest123.

**Walkthrough (read after trying):** Step by step: 1) On the login page, enter guest@hexaworkspace.local. 2) Use the password guest123. 3) You are in — a shipped default account with a guessable password.

### Predictable Password-Reset Token (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Request a password reset for your own account and study the token format.
2. The token is a deterministic function of the user ID: rst-<id>-<id*137+42>.
3. Compute the token for another user (the admin is id 1) and post it straight to /reset — no email access needed.

**Walkthrough (read after trying):** Step by step: 1) Use Forgot Password on your own account and note the token pattern: rst-<userId>-<userId*137+42>. 2) The admin is user id 1, so their token is rst-1-179. 3) POST that token to /reset with the admin email and a new password — the account is yours.

### Session Role Cookie Tampering (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. After logging in, inspect your cookies — one of them carries your role, readable and editable.
2. The admin panel trusts the hws_role cookie instead of the server-side account record.
3. Base64-decode hws_role, change the value to admin, and visit /admin.

**Walkthrough (read after trying):** Step by step: 1) Log in as any non-admin user and look at the hws_role cookie (it is base64). 2) Replace it with the base64 of the word admin. 3) Open /admin — the panel trusts the cookie and lets you in, and the test detects the mismatch with your real account role.

### SQL Injection Login Bypass (Advanced · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login handler builds its user lookup as a text query string with your email pasted straight in.
2. What happens if your 'email' contains a quote and a logical operator?
3. Try logging in with the email: ' OR '1'='1 — the password stops mattering.

**Walkthrough (read after trying):** Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1 and any password. 3) Submit — the string-built query matches the first user in the table (the administrator) and you are logged in as them.

## Registration & Profile

### Stored XSS in Display Name (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is shown to other people — in the header greeting and the workspace member list.
2. It is rendered without escaping.
3. Set your display name to <script>alert(1)</script> and view a member list.

**Walkthrough (read after trying):** Step by step: 1) Open Profile. 2) Set your display name to <script>alert(document.domain)</script> and save. 3) Open any workspace member list — the name is stored and rendered unescaped, and the test detects the stored payload.

### Weak Password Policy — 1-Character Passwords Accepted (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Register a new account and try the shortest password the form accepts.
2. There is no length or complexity check at all.
3. A 2-character password such as "ab" is happily accepted.

**Walkthrough (read after trying):** Step by step: 1) Register a new account. 2) Use a password of 3 characters or fewer, e.g. ab. 3) The account is created — the missing policy is the flaw.

### Mass Assignment — Privileged Fields Accepted from the Form (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile update binds every posted field straight onto your user record.
2. The form shows name, email and plan — but the model also has a siteRole field.
3. Add a siteRole=admin field to the profile POST (browser dev tools or Burp) and save.

**Walkthrough (read after trying):** Step by step: 1) Log in as a normal user and open Profile. 2) Intercept the profile save request and add the field siteRole with value admin. 3) Send it — your account is now a site administrator.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form carries a hidden hx_tok field — check whether the server actually verifies it.
2. It does not. A POST with no token, or from a foreign Origin, is accepted.
3. Replay the profile POST without hx_tok (curl makes this easy) and your name changes anyway.

**Walkthrough (read after trying):** Step by step: 1) Log in and copy your session cookie. 2) From curl, POST to /profile with your cookie but WITHOUT the hx_tok field (add a foreign Origin header for realism). 3) The change is applied — the token was never verified.

## Workspaces & Members

### IDOR — Another Workspace’s Member List Exposed (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Workspace IDs are small sequential numbers, and member lists live at /workspace/<id>/members.
2. The endpoint checks that you are logged in — not that you belong to that workspace.
3. Log in as the Globex user and open workspace 1’s member list.

**Walkthrough (read after trying):** Step by step: 1) Log in as oscar@globex.test (owner of workspace 2, not a member of workspace 1). 2) Open /workspace/1/members. 3) The full Acme member list is served — the membership check is missing.

### Role Tampering — a Viewer Can Demote or Remove the Owner (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Member role changes and removals are simple POSTs under /workspace/<id>/members/.
2. The server never checks that the caller is the workspace owner.
3. Log in as the viewer and POST a role change — or remove the owner outright.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor@acme.test (a viewer). 2) POST to /workspace/1/members/remove with userId=2 (the owner). 3) The owner is removed by a viewer — the endpoint never checked who was calling.

## Files & Permissions

### IDOR — Private File of Another Team Served by ID (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. File pages live at /files/<id> with small sequential IDs.
2. The page checks login only — not workspace membership or a sharing grant.
3. As the Globex user, open file 102 — Acme’s confidential salary document.

**Walkthrough (read after trying):** Step by step: 1) Log in as oscar@globex.test. 2) Open /files/102. 3) Acme’s salary-band file is served to a user from a different company with no grant.

### Permission Bypass — Viewer Edits a File (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Viewers are read-only in the UI — the Edit button is hidden from them.
2. The POST endpoint behind it only checks membership, not role.
3. As the viewer, POST directly to /files/101/edit with new content.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/101/edit with a new content field. 3) The roadmap is rewritten by a read-only account.

### Permission Bypass — Viewer Deletes a File (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Same missing check as edit — the delete endpoint trusts membership alone.
2. Create or pick a file, then call the delete endpoint as the viewer.
3. POST to /files/<id>/delete as victor and the file is gone.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/<id>/delete for a workspace file. 3) The file is deleted by a read-only account.

### Folder Path Traversal — Reading Another Team’s Files by Path (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The raw download endpoint takes a path: /raw?path=acme/projects/roadmap-2027.txt.
2. It resolves ".." segments naively, with no check on where you end up.
3. Walk up and across: /raw?path=acme/projects/../../globex/strategy/globex-takeover-plan.txt

**Walkthrough (read after trying):** Step by step: 1) Log in as an Acme member. 2) Request /raw?path=acme/projects/../../globex/strategy/globex-takeover-plan.txt. 3) The Globex secret is served — traversal escaped your workspace.

### Sharing Grant Created Without Authority (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Per-file sharing grants are created by POST /files/<id>/share with a userId and a role.
2. The endpoint never asks whether YOU are allowed to share that file.
3. As a mere viewer, grant the outsider access to Acme’s salary file.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor@acme.test (viewer). 2) POST to /files/102/share with userId=5 and role=viewer. 3) The grant is created — a viewer just shared a file they could not even edit.

## Comments

### Stored XSS in File Comments (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Comments render on the file page for everyone who opens it.
2. Comment bodies are not escaped.
3. Post a comment containing <script>alert(1)</script> on any file.

**Walkthrough (read after trying):** Step by step: 1) Open any file you can view. 2) Post the comment <script>alert(document.domain)</script>. 3) It is stored raw and rendered unescaped on the file page.

### IDOR — Deleting Another User's Comment (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Comment deletion is a POST to /comments/<id>/delete.
2. The server does not check that the comment is yours.
3. Delete a comment written by a teammate while logged in as someone else.

**Walkthrough (read after trying):** Step by step: 1) Note a comment written by Emma. 2) Log in as Victor. 3) POST to /comments/<id>/delete — someone else’s comment disappears.

## Share Links

### Revoked Share Link Keeps Working (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Owners can revoke a share link from the file page.
2. The public link handler never looks at the revoked flag.
3. Create a link, revoke it, then open it in a private window — it still serves the file.

**Walkthrough (read after trying):** Step by step: 1) As Olivia, create a share link for a file and open it — it works. 2) Revoke it from the file page. 3) Open the same /s/<token> URL again — the file is still served.

### Predictable, Enumerable Share-Link Tokens (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Look at a real share token: shr-1001. The next one is not hard to guess.
2. Tokens are a public sequence: shr-1002, shr-1003, …
3. Probe five different token values in a row and the pattern — and other people’s shared files — are yours.

**Walkthrough (read after trying):** Step by step: 1) Note the seeded share token shr-1001. 2) Request /s/shr-1002, /s/shr-1003, /s/shr-1004, /s/shr-1005 in the same session. 3) Five distinct sequential tokens probed — enumeration is trivial because tokens are predictable.

## File Upload

### Unrestricted Upload — HTML File Served as a Web Page (Intermediate · A05 Security Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The upload feature stores any filename and content, then serves it back under /uploads/.
2. The content type is chosen from the extension — .html is served as text/html.
3. Upload a file named evil.html containing a script payload, then open its /uploads/ URL.

**Walkthrough (read after trying):** Step by step: 1) Use the upload form (name + content). 2) Name the file evil.html and put <script>alert(document.domain)</script> in the content. 3) Open /uploads/evil.html — it is served as a real HTML page from the app origin.

## Admin Panel

### CSRF — Admin User Deletion via a GET Link (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. In the admin panel, deleting a user is a plain link — a GET request.
2. GET requests must never change state; there is also no token of any kind.
3. While logged in as admin, just visiting /admin/users/<id>/delete removes the account.

**Walkthrough (read after trying):** Step by step: 1) Log in as the site admin and open /admin. 2) Click (or simply request) a user’s delete link — a GET. 3) The account is gone; in a real attack an <img src> on any site would fire this in the admin’s browser.

## Platform & API

### Sensitive Data Exposure — /api/users Full Dump (Beginner · A05 Security Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. There is a JSON endpoint at /api/users.
2. It performs no authentication or authorization check at all.
3. Open it logged out — every account, email and password comes back.

**Walkthrough (read after trying):** Step by step: 1) Log out (or use a fresh browser). 2) Open /api/users. 3) The complete user table — including passwords — is returned with no login at all.

### Predictable API Token — Cross-Account API Access (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your profile page shows your API token. Look at its shape: hw-1000 plus your user ID.
2. The files API accepts any token: /api/files?token=…
3. Compute another user’s token (Oscar is id 5 → hw-1005) and read their files through the API.

**Walkthrough (read after trying):** Step by step: 1) Open your profile and note your token pattern hw-<1000+yourId>. 2) Log in as Emma and request /api/files?token=hw-1005 (Oscar’s). 3) Globex files are returned — the token was never a secret.
