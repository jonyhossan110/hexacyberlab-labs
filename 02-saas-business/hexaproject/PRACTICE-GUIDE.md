# HexaProject — Practice Guide (27 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same step-by-step guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL Injection — Login Bypass (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form builds its query by gluing your input straight into the SQL string.
2. A classic tautology in the email field can make the WHERE clause true for the first row in the table.
3. Try email: ' OR '1'='1' --  with any password — you land in the first account, which is the admin.

**Walkthrough (read after trying):** Step by step: 1) Open /login. 2) In the email field enter: ' OR '1'='1' --  3) Enter any password and submit. 4) You are logged in as the first user in the table (the platform admin) because the query became: email='' OR '1'='1' — always true.

### Brute Force — No Rate Limiting on Login (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Nothing slows you down: no lockout, no CAPTCHA, no delay.
2. Write a loop (or use Burp Intruder) and fire wrong passwords at one account.
3. After 10 failed attempts the app is still happily processing guesses — that missing throttle is the finding.

**Walkthrough (read after trying):** Step by step: 1) Pick an account, e.g. sara@hexaproject.local. 2) Submit a wrong password 10 times (curl loop or Intruder). 3) Every attempt is processed at full speed — no block, no delay. 4) The test passes at the 10th accepted failure.

### User Enumeration via Login & Reset Responses (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the error for an email that exists with one that does not.
2. The login form and the forgot-password form answer differently depending on whether the account is real.
3. Probe one real address (from the README) and one invented address in the same session — the difference is the oracle.

**Walkthrough (read after trying):** Step by step: 1) In one browser session, submit /login with an invented email — note "No account found for that email." 2) Submit a real email with a wrong password — note the different message "Incorrect password…". 3) /forgot behaves the same way. The test passes once one session has seen both answers.

### Default / Demo Credentials Still Active (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Seeded/demo accounts are a classic leftover in production SaaS.
2. The README’s test-account table includes a demo login — check whether it still works.
3. demo@hexaproject.local with its documented demo password is still an active account.

**Walkthrough (read after trying):** Step by step: 1) Open /login. 2) Sign in as demo@hexaproject.local / demo123. 3) The account is fully active — that successful login is the finding.

### Predictable Password-Reset Token (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Ask for a reset for your own account and study the token format (the flow is intentionally transparent in this lab).
2. The token is built only from the user’s numeric ID and the current minute — nothing random.
3. Compute rst-<victim id>-<current minute> for the admin (id 1) and post it straight to /reset without ever requesting a reset for that account.

**Walkthrough (read after trying):** Step by step: 1) Note the token format: rst-<userId>-<epoch minute>. 2) In a fresh session (never use /forgot for the victim), compute the token for the victim’s ID with the current minute. 3) POST /reset with their email, your computed token and a new password. 4) The reset succeeds — you forged it. The test passes because the token was never issued to your session.

### Session/Role Cookie Tampering (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. After login, look at the cookies the app sets — one of them carries your platform role.
2. That role cookie is trusted by the admin gate without any server-side check or signature.
3. Set hx_role=admin in your browser (or curl) while logged in as a normal user and open /admin.

**Walkthrough (read after trying):** Step by step: 1) Log in as any normal user (e.g. victor). 2) In your browser’s cookie editor (or with curl -b) set the cookie hx_role to admin. 3) Open /admin. 4) The admin panel opens because the gate reads the cookie, not the account — the test passes when a non-admin reaches /admin this way.


## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The registration form accepts almost anything as a password.
2. Try registering with a password of a single character.
3. No length, complexity or breach-list check stops you — the account is created.

**Walkthrough (read after trying):** Step by step: 1) Open /register. 2) Create an account with the password "x" (one character). 3) The account is created and works — the test passes.

### Mass Assignment — Self-Assigning the Admin Role (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The server binds the whole submitted form to the new account object — including fields the form never shows.
2. Add a field the UI doesn’t offer, e.g. role, to the register or profile request.
3. Register with role=admin added to the POST body (curl or Burp) — the new account is created as a platform admin.

**Walkthrough (read after trying):** Step by step: 1) Intercept or curl the /register POST. 2) Add the extra field role=admin to the body. 3) Submit — the account is created with the platform admin role (check the header/admin link). 4) The same trick works via POST /profile. The test passes when the injected role takes effect.

### Stored XSS via Display Name (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is shown all over the app — member lists, comment bylines, task assignees.
2. It is rendered without encoding.
3. Register or set your profile name to <script>alert(1)</script> — it is stored as-is and fires for everyone who sees it.

**Walkthrough (read after trying):** Step by step: 1) Register a new account (or edit your profile) with the name: <script>alert(1)</script> 2) Submit. 3) The payload is stored verbatim and rendered raw wherever the name appears — the test passes at store time.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form carries a token field (hx_tok) — but check whether the server actually verifies it.
2. Send the profile POST from a different origin, or strip the token entirely.
3. curl the /profile POST with an Origin: https://evil.example header and no hx_tok — the change is accepted anyway.

**Walkthrough (read after trying):** Step by step: 1) Log in as any user and note your cookie. 2) From curl, POST /profile with a new name, your session cookie, an Origin: https://evil.example header and NO hx_tok field. 3) The name changes — the request was accepted cross-site. The test passes when a state change lands without a valid token.


## Projects

### Cross-Project IDOR — Reading Another Team’s Private Project (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Project URLs carry a simple numeric ID.
2. Your project list only shows your projects — but the detail page never checks membership.
3. Log in as victor and open /projects/2 — a private project you do not belong to renders in full.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor@hexaproject.local (member of project 1 only). 2) Browse to /projects/2. 3) Project 2 ("Payments Migration", a private project of another team) renders fully. The test passes when a non-member is served the project.

### Tampering with Another Team’s Project (Edit/Delete) (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Reading is not the only missing check — the project settings form posts to /projects/<id>/update.
2. The server never asks whether you own (or even belong to) the project.
3. As victor, POST a new name to /projects/2/update — another team’s project is renamed. /projects/<id>/delete works the same way.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor. 2) curl/POST to /projects/2/update with a new name (the settings form on the project page shows the fields). 3) Re-open /projects/2 — the other team’s project now carries your name. The test passes when a non-owner’s write lands.


## Search

### Reflected XSS in Search (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The results page echoes "Results for: <your query>" back at you.
2. It echoes it raw — no encoding.
3. Search for <script>alert(1)</script> and view the page source: your payload is in the HTML untouched.

**Walkthrough (read after trying):** Step by step: 1) Log in. 2) Open /search?q=<script>alert(1)</script>. 3) The query is reflected unescaped in the results heading — the test passes when the payload lands raw in the response.

### Search Leaks Private Projects & Tasks (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Search feels global — test whether it respects project membership.
2. Search a word from another team’s project while logged in as an outsider.
3. As victor, search "Payments" or "fees" — tasks from the private project 2 appear in your results. An injection string returns everything.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor (project 1 only). 2) Search for "fees" or "Payments". 3) Results include tasks/projects from private project 2, which victor cannot open from his list. The test passes when a private object appears in an outsider’s results.


## Tasks & Milestones

### Task IDOR — Viewing Tasks in Projects You Cannot Access (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Tasks have their own URLs: /tasks/<id>.
2. The task page checks that you are logged in — nothing about the project it belongs to.
3. As victor, open /tasks/3 — a task inside the private project 2 renders with its full description.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor. 2) Open /tasks/3 (belongs to private project 2). 3) The full task renders. The test passes when a non-member is served the task.

### Viewer Role Can Edit Tasks (Broken Role Check) (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. A viewer is supposed to be read-only inside a project.
2. The task update endpoint never compares your project role against the action.
3. As victor (viewer on project 1), POST /tasks/1/update with a new status — it saves.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor — a VIEWER on project 1. 2) POST /tasks/1/update with status=done (use the task page’s form fields). 3) The change saves despite the read-only role. The test passes when a viewer’s write lands.

### Non-Member Can Create Tasks in a Private Project (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Creating a task posts to /projects/<id>/tasks.
2. That endpoint never checks that you belong to the project.
3. As victor, POST a new task into project 2 — it appears in the other team’s board.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor. 2) POST /projects/2/tasks with a title. 3) The task is created inside private project 2 even though you are not a member. The test passes when the task exists.

### Milestone Tampering by a Plain Member (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Milestones drive deadlines — editing them should be an owner/manager action.
2. The milestone update endpoint accepts posts from any project member.
3. As sara (a plain member of project 1), POST /milestones/1/update with a new due date — it changes.

**Walkthrough (read after trying):** Step by step: 1) Log in as sara (member of project 1, not a manager). 2) POST /milestones/1/update with due=2030-01-01. 3) The milestone’s date changes. The test passes when a non-manager’s edit lands.


## Comments

### Stored XSS in Task Comments (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Comment bodies are shown to the whole team on the task page.
2. They are stored and rendered without sanitising.
3. Post a comment containing <script>alert(1)</script> on any task — it is saved verbatim and fires for every viewer.

**Walkthrough (read after trying):** Step by step: 1) Log in as any project member. 2) On a task page, post the comment: <script>alert(1)</script> 3) It is stored and rendered raw to every viewer of the task. The test passes at store time.

### Deleting Other Users’ Comments (No Author Check) (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Every comment has a delete endpoint: /comments/<id>/delete.
2. The server never checks that the comment is yours.
3. Note a comment written by someone else, then POST its delete as a different user — it disappears.

**Walkthrough (read after trying):** Step by step: 1) Find a comment by another user (e.g. comment 1 by dev on task 1). 2) Log in as victor. 3) POST /comments/1/delete. 4) The comment is gone even though it was never yours. The test passes when a non-author delete succeeds.


## Files & Attachments

### Attachment IDOR — Downloading Another Project’s Files (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Uploaded files are served from /files/<id> with sequential IDs.
2. The handler checks nothing about the file’s project.
3. As victor, open /files/2 — the confidential budget file of private project 2 downloads.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor. 2) Open /files/2. 3) The confidential file from private project 2 is served to you. The test passes when a non-member receives the file.

### Unrestricted File Upload — HTML Served as Web Content (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The upload form accepts any filename and content — no type validation.
2. Try uploading a file whose name ends in .html with markup inside.
3. Upload evil.html to a project, then open /files/<its id> — it is served back as text/html from the app’s own origin.

**Walkthrough (read after trying):** Step by step: 1) Log in as a project member. 2) Upload a file named evil.html containing <h1>phish</h1> via the project files form. 3) Open the new /files/<id> URL — it renders as an HTML page from the app origin. The test passes when the HTML file is stored and served.

### Path Traversal in File Download (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The /download?path= endpoint reads files from the attachments folder.
2. It joins your path onto the folder without cleaning it.
3. Request /download?path=../server.js — the application’s own source code comes back.

**Walkthrough (read after trying):** Step by step: 1) Log in. 2) Open /download?path=../server.js. 3) The server returns its own source code — you escaped the attachments folder. The test passes when a file outside that folder is served.


## Team & Roles

### Self-Promotion — Viewer Promotes Themselves to Project Owner (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Member roles are changed by posting to /projects/<id>/members/role.
2. The endpoint never checks YOUR role before honouring the change.
3. As victor (viewer), POST your own userId with role=owner for project 1 — you now own it.

**Walkthrough (read after trying):** Step by step: 1) Log in as victor (viewer on project 1). 2) POST /projects/1/members/role with userId=5 and role=owner. 3) Your role in project 1 becomes owner. The test passes when an unprivileged caller’s role change lands.

### Plain Member Can Remove the Project Owner (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Removing a member posts to /projects/<id>/members/remove.
2. There is no check on who is being removed — or who is asking.
3. As sara (plain member of project 1), remove userId 2 — the project’s owner is ejected from their own project.

**Walkthrough (read after trying):** Step by step: 1) Log in as sara (member of project 1). 2) POST /projects/1/members/remove with userId=2. 3) Tanvir, the project owner, is removed from his own project. The test passes when the removal succeeds.


## Admin Panel

### Admin Actions via GET — One-Click User Deletion (CSRF) (Advanced · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. In the admin panel, deleting a user is a plain link: /admin/users/<id>/delete.
2. State changes over GET, with no token, are CSRF by design — an <img> tag on any page is enough.
3. As admin, simply visit that URL (imagine it embedded in a page the admin browses) — the user is deleted. No confirmation, no token.

**Walkthrough (read after trying):** Step by step: 1) Log in as the platform admin. 2) Visit /admin/users/6/delete directly in the browser (as an attacker’s <img src> would). 3) The user is deleted instantly — no token, no POST, no confirmation. The test passes when the GET deletion succeeds.


## Platform & API

### Unauthenticated API Dumps All Users incl. Passwords (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The platform exposes a small JSON API under /api/.
2. One endpoint returns the user directory — check what it returns without any login at all.
3. curl /api/users in a private window (no cookies): every user, email and PLAINTEXT password comes back.

**Walkthrough (read after trying):** Step by step: 1) Open a private window or use curl with no cookies. 2) GET /api/users. 3) A JSON dump of every user — including plaintext passwords — returns with no authentication. The test passes on that fetch.
