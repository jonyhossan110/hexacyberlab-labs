# HexaForms — Practice Guide (24 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL injection login bypass (Intermediate · A03:2021 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form has a legacy lookup path that glues your input into a query string.
2. Try a classic tautology in the email field — something that makes the condition always true.
3. Email: ' OR '1'='1 — any password. You land in the first account the query returns: the admin.

**Walkthrough (read after trying):** POST /login with email ' OR '1'='1 and any password. The legacy lookup treats your input as query text, the condition matches every row, and the app starts a session as the first user — the admin.

### Brute force — no rate limiting or lockout (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. How many wrong passwords can you try for one account in a minute?
2. Nothing slows you down — no counter, no lockout, no CAPTCHA. Script it.
3. Send 10+ failed logins for nabila@hexaforms.local; the 10th is still processed like the 1st. That absence of throttling is the flaw.

**Walkthrough (read after trying):** POST /login 10 times with a wrong password for the same account. Every attempt is accepted for processing — there is no rate limit, lockout or delay. The test passes when the 10th failure is still processed.

### User enumeration via differing responses (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the login error for an email that exists with one that does not.
2. The forgot-password flow answers differently too — one reveals a reset link, the other only a generic note.
3. Probe /login once with nabila@hexaforms.local (wrong password) and once with an invented email; the two different messages confirm which accounts exist.

**Walkthrough (read after trying):** POST /login with a registered email + wrong password, then with an unregistered email. The messages differ ("Wrong password" vs "No account with that email"), so valid accounts can be enumerated. The test passes once both kinds of response have been observed.

### Weak / default credentials (demo account) (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. SaaS products love shipping a demo account. Has anyone changed its password since install day?
2. The install guide for products like this usually documents the demo login. The password is the product-demo classic.
3. Log in as demo@hexaforms.local with password demo123 — the seeded demo account was never rotated.

**Walkthrough (read after trying):** POST /login with demo@hexaforms.local / demo123. The demo account seeded at install time still uses its documented default password.

### Predictable password-reset token (Intermediate · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The lab shows you a reset link after /forgot — study how its token is built.
2. The token depends only on something public about the account. Compute it offline.
3. token = first 8 hex characters of md5(email). Compute it for admin@hexaforms.local and open /reset with it.

**Walkthrough (read after trying):** Compute md5(victim email), take the first 8 hex chars, then GET /reset?email=<email>&token=<computed> and POST a new password. Works for any account, including admin.

### Session/cookie tampering — client role cookie trusted (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. After login, look at ALL the cookies the app sets — one of them is not like the others.
2. One cookie simply states your role, in plain text, and the admin gate believes it.
3. Set a cookie role=admin for this site (browser DevTools or curl -b) and open /admin — no admin account needed.

**Walkthrough (read after trying):** Set a cookie role=admin for the site (DevTools or curl -b) and GET /admin. The gate trusts the cookie, not a server-side session, and serves the full admin panel.


## Accounts & Profile

### Weak password policy on registration (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. What is the shortest password the registration form will accept?
2. There is no policy at all — try one character.
3. Register a new account with the password "a". It is accepted.

**Walkthrough (read after trying):** POST /register with a 1-character password. The account is created — no length or complexity policy exists.

### Mass assignment — plan & role via profile update (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form shows name and email. What else does the update handler accept?
2. The handler binds the whole request body onto your user record — including fields the form never shows.
3. POST /profile with your normal fields PLUS plan=pro and role=admin. Both stick.

**Walkthrough (read after trying):** POST /profile while logged in, adding plan=pro and role=admin to the normal form fields. The handler applies every field it recognises on the user object, so you become a Pro admin.

### Stored XSS in display name (Intermediate · A03:2021 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is shown back in a "profile preview" card — and in the admin user list.
2. One of those places prints the name exactly as stored, with no escaping.
3. Register or update your profile with the name <script>alert(1)</script> (or an <svg onload> payload), then view your profile preview.

**Walkthrough (read after trying):** Set your display name (register or /profile) to a script payload. The profile preview card and the admin user list render it raw, so the payload is stored and delivered to viewers.

### CSRF on profile update (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form carries a hidden hx_tok field. Is it ever checked?
2. A state-changing POST from another site carries your cookies but not that token.
3. POST /profile with your session cookie but NO hx_tok field (or a foreign Origin header) — the change applies anyway.

**Walkthrough (read after trying):** While logged in, POST /profile with new values and no hx_tok field (a cross-site auto-form does exactly this). The update applies — the token is never verified.


## Forms & Templates

### IDOR — view another workspace's form settings (Beginner · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Form settings pages live at /forms/<id>. Ids are small sequential numbers.
2. The page checks that you are logged in — but never which workspace the form belongs to.
3. Log in as Rafi (owner of workspace 2) and open /forms/1 — Nabila's form settings, access mode and public slug are all served.

**Walkthrough (read after trying):** Log in as any user from another workspace and GET /forms/1. The settings page renders for a form you do not own or belong to.

### Access-setting tampering — private form flipped public (Advanced · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The settings page shows the access mode as read-only text: changing it is supposed to need an approved plan workflow.
2. But the settings POST handler applies more fields than the form displays.
3. As the owner of the private HR form, POST /forms/3/settings with the normal fields PLUS access=public. The private form is now world-readable.

**Walkthrough (read after trying):** As Nabila, POST /forms/3/settings including access=public alongside the normal title/status fields. The handler binds it, and the private form's access flips to public.

### Form slug / ID enumeration (Beginner · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Public form links look like /f/<slug>, and form ids are sequential. What happens if you probe many of them?
2. The app happily answers every probe — found, private, draft, or not there at all — with no rate limit.
3. Probe at least 5 different /f/<slug> values (real or invented). Each answer maps the tenant space a little more.

**Walkthrough (read after trying):** GET five or more distinct /f/<slug> URLs. The app answers each probe without throttling, letting you enumerate which forms exist, which are private and which are drafts.

### Submitting to a private form (access check missing on submit) (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The private form's page refuses to show you the form. But is the page the only way in?
2. Rendering checks the access mode. The submit endpoint was written earlier — and forgotten.
3. POST directly to /f/hr-salary-review/submit with respondent fields. The response is stored in the private form.

**Walkthrough (read after trying):** Without any login, POST respondent fields to /f/hr-salary-review/submit. The private form refuses to render for you, yet your submission is accepted and stored.


## Submissions & Responses

### IDOR — read another workspace's submission (Beginner · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. A single response lives at /submissions/<id> with a small sequential id.
2. The detail page checks login only — never the workspace of the form the response belongs to.
3. Log in as Rafi and open /submissions/4 — a confidential HR salary-review response from Nabila's private form.

**Walkthrough (read after trying):** Log in as a user from another workspace and GET /submissions/4. The confidential response renders in full.

### Unauthorised response export (CSV) (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Every form has an export URL: /forms/<id>/export downloads all responses as CSV.
2. The export checks that you are logged in. It never checks whose form it is.
3. Log in as Rafi and GET /forms/1/export — all of Nabila's customer feedback responses download as CSV.

**Walkthrough (read after trying):** Log in as any non-member and GET /forms/1/export. A CSV of every response is served without any ownership check.

### Stored XSS in a submission (fires in owner dashboard) (Intermediate · A03:2021 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Responses are shown to the form owner exactly as the respondent typed them.
2. The submission detail view prints the respondent name and answers with no escaping.
3. Submit to the public feedback form with a <script> or <svg onload> payload in your name or comment, then view that submission as the owner.

**Walkthrough (read after trying):** POST a submission to a public form with a script payload in the name or an answer. The payload is stored and rendered raw on the submission detail page the owner reads.

### IDOR — download another workspace's attachment (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Attachments are served at /attachments/<id> — small sequential ids again.
2. Like the submission page, the download checks login only.
3. Log in as Nabila and GET /attachments/1 — the CV a candidate uploaded to Rafi's job-application form.

**Walkthrough (read after trying):** Log in as a user from another workspace and GET /attachments/1. The file downloads without any membership check.


## Files & Uploads

### Unrestricted file upload — HTML served back (Intermediate · A04:2021 Insecure Design)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Submissions accept an attachment: a filename and its content. Which filenames are allowed?
2. All of them. And the file is later served with a content type guessed from its extension.
3. Submit a response with attachment filename page.html and HTML/JS content, then open /uploads/<submissionId>/page.html — it is served as text/html.

**Walkthrough (read after trying):** POST a submission to a public form with attachmentName=page.html and script content. Then GET /uploads/<newSubmissionId>/page.html — the file is served as text/html and the script runs in the site origin.

### Path traversal on asset download (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Form assets download from /files?name=<file>. The name is joined straight onto a folder path.
2. What happens when the name climbs out of the folder with ../ ?
3. GET /files?name=../server.js — the application source is served. ../progress.json works too.

**Walkthrough (read after trying):** GET /files?name=../server.js. The handler joins the name onto the assets folder without sanitising, so the traversal escapes and the server source is returned.


## Admin Panel

### CSRF on admin user-role change (Advanced · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Admins can change any user's role from the admin panel. The form carries hx_tok.
2. Like the profile token, it is issued but never verified on the server.
3. As admin, POST /admin/users/role with a userId and role — but no hx_tok (or a foreign Origin). The role changes anyway.

**Walkthrough (read after trying):** While logged in as admin, POST /admin/users/role {userId, role=admin} without the hx_tok field. The change applies — a cross-site form could do the same.

### Broken access control — user export open to any account (Intermediate · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. There is an admin utility at /admin/export-users that downloads every account as CSV.
2. It sits under /admin — but does it actually check for the admin role?
3. Log in as ANY normal user (e.g. Rafi) and GET /admin/export-users. Names, emails, passwords and roles download.

**Walkthrough (read after trying):** Log in as a non-admin user and GET /admin/export-users. The CSV of all users, passwords included, is served because only the login is checked.


## Platform & API

### Weak / predictable API token (Intermediate · A07:2021 Identification & Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your profile shows an API token for the /api/forms endpoint. Look at how it is built.
2. It is a simple encoding of something public — not a random secret at all.
3. Compute token = 'hf_' + base64(email) for admin@hexaforms.local and call GET /api/forms with Authorization: Bearer <token> — no login session needed.

**Walkthrough (read after trying):** Derive the admin token offline (hf_ + base64 of the email) and GET /api/forms with it as a Bearer token, with no session cookie. The API accepts it and returns the admin's forms.

### Sensitive data exposure — /api/users dumps all accounts (Beginner · A01:2021 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. APIs often grow a convenience endpoint during development. What does /api/users do?
2. No token, no session, no check at all.
3. GET /api/users with no credentials — every account, passwords included, as JSON.

**Walkthrough (read after trying):** GET /api/users with no session and no token. The endpoint returns every user record, including plaintext passwords.
