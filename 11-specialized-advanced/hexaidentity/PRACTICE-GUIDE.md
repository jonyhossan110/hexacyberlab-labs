# HexaIdentity — Practice Guide (LAB 108)

Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board (/tests) in the app.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: prove the flaw at POST /login (email field) — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The login query is built by gluing your input straight into a WHERE clause.
  2. A single quote in the email field changes the meaning of the query.
  3. Try email: ' OR '1'='1' -- with any password — the comment swallows the password check.

### [Beginner] Brute Force — No Login Throttling
- Objective: prove the flaw at POST /login — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Pick one real account and keep guessing its password.
  2. Count the failures — does anything change after 5? After 10?
  3. The flaw is proven when the 10th failure is still accepted for processing like the first.

### [Beginner] User Enumeration via Login & Recovery Responses
- Objective: prove the flaw at POST /login and POST /forgot — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Compare the exact wording for an email that exists vs one that does not.
  2. Both the login form and the forgot-password form answer questions.
  3. Probe 5+ distinct addresses and note which responses reveal account existence.

### [Beginner] Published Demo Admin Credentials
- Objective: prove the flaw at GET /login (help text on the page) and POST /login — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Everything you need is written on the login page itself.
  2. Look for the "demo" note under the sign-in form.
  3. Use the printed admin email and password exactly as shown.

### [Intermediate] Predictable Password-Reset Token
- Objective: prove the flaw at POST /reset — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The reset endpoint accepts a token even when no reset was ever requested.
  2. Tokens are derived from something public: the user id.
  3. For user id 3 the token is HI3-453 — try the reset form with it.

### [Intermediate] Role Cookie Tampering (hx_role)
- Objective: prove the flaw at GET /admin (role read from a client cookie) — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. After login, inspect the cookies the portal sets.
  2. One cookie carries your role — and the server believes whatever it says.
  3. Set hx_role=admin in your browser, then visit /admin.

## Registration & Profile

### [Beginner] Weak Password Policy — 1-Character Passwords Accepted
- Objective: prove the flaw at POST /register — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Try registering with the shortest password you can think of.
  2. There is no minimum length check at all.
  3. A one-character password like "x" is enough to create a working account.

### [Beginner] Stored XSS in Display Name
- Objective: prove the flaw at POST /register (name field, rendered in admin and profile views) — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Names are displayed back to other people in several places.
  2. Nothing encodes HTML in the name field.
  3. Register with a name like <script>alert(1)</script> and view the admin user list or member profile.

### [Intermediate] Mass Assignment — Role & Verified Status at Registration
- Objective: prove the flaw at POST /register — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The registration handler copies more of your request than the form shows.
  2. What fields does a user record have that the form never asks for?
  3. Submit the form again with role=admin and status=verified added as extra fields.

### [Intermediate] CSRF on Profile Update
- Objective: prove the flaw at POST /profile/update — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The portal sets a benign hx_origin cookie on its own pages — its own forms travel with it.
  2. A request that arrives WITHOUT that marker did not come from the portal’s pages.
  3. POST to /profile/update with only your session cookie and no hx_origin cookie: the change still lands.

## Identity Profiles & Documents

### [Beginner] IDOR — Full Identity Record of Another User
- Objective: prove the flaw at GET /identity/:id — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Identity records live at predictable numeric URLs.
  2. The server checks that you are logged in — but not whose record you asked for.
  3. Change the id in /identity/:id to another user’s and read their full record.

### [Intermediate] Unrestricted Document Upload — HTML Served Back
- Objective: prove the flaw at POST /documents/upload and GET /uploads/:name — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The document upload accepts any filename and any content.
  2. What matters is the extension you choose and how the file is served back.
  3. Upload evil.html with a script inside, then open /uploads/evil.html.

### [Intermediate] Path Traversal on Document Download
- Objective: prove the flaw at GET /download?file= — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The download endpoint takes a filename and reads it from the documents folder.
  2. Nothing stops the filename from walking up directories.
  3. Try /download?file=../server.js and read the application source.

## Verification Workflow

### [Beginner] Verification Status Tampering via Client-Supplied Status
- Objective: prove the flaw at POST /identity/status — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. There is an endpoint that updates identity status — and it believes the caller.
  2. Your verification status is just a field; who is allowed to write it?
  3. POST to /identity/status with status=verified while signed in as an unverified user.

### [Beginner] Verification Queue Leaks Applicant PII to Regular Users
- Objective: prove the flaw at GET /verify/queue — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Staff pages are not always protected just because they are staff pages.
  2. The queue URL is guessable: /verify/queue.
  3. Sign in as a normal user and open /verify/queue directly.

### [Intermediate] Self-Verification Through the Verifier Endpoint
- Objective: prove the flaw at POST /verify/approve — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Approval is a POST the staff UI sends — but the endpoint itself never checks your role.
  2. Your own identity is pending; its user id is yours.
  3. POST to /verify/approve with your own userId and watch your status change to verified.

## Credentials & Badges

### [Beginner] Credential IDOR — Another User’s Credential
- Objective: prove the flaw at GET /credential/:id — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Credentials have their own numeric URLs.
  2. Ownership is never compared with the session.
  3. Change the id in /credential/:id to read a credential that is not yours.

### [Intermediate] Forged Credential Issuance — Government-Verified Badge
- Objective: prove the flaw at POST /credentials/issue — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Self-service issuance trusts the requested credential type.
  2. The basic badge is free for everyone; the valuable types should require a workflow.
  3. POST to /credentials/issue with type=gov-verified and check your credentials page.

## Linked Services

### [Beginner] Linked Services IDOR — Service Tokens Exposed
- Objective: prove the flaw at GET /services/user/:userId — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Linked services can be listed per user id.
  2. The response includes more than service names.
  3. Visit /services/user/<another id> and read their service tokens.

### [Intermediate] Unlink Another User’s Service
- Objective: prove the flaw at POST /services/unlink — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Unlinking takes a link id — whose links can you name?
  2. The handler deletes by id alone.
  3. POST to /services/unlink with the linkId of a service owned by another user.

## Account Recovery

### [Intermediate] Password Recovery via Publicly Visible Security Answer
- Objective: prove the flaw at POST /recover (answer shown on GET /profile/:id) — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The recovery question’s answer is not secret — the portal publishes it.
  2. Check what a member’s public profile says about where they are from.
  3. Use the hometown from /profile/3 as the recovery answer for Bob’s account.

### [Intermediate] Reset Token Reuse — Tokens Never Invalidate After Use
- Objective: prove the flaw at POST /forgot then POST /reset twice with the same issued token — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Get a legitimate reset token from the forgot-password flow first.
  2. Use it once. Then ask: did the portal retire it?
  3. Submit the reset form a second time with the identical token and a different new password.

## Admin Panel

### [Beginner] Admin User Dump Served to Any Logged-In User
- Objective: prove the flaw at GET /admin/users.json — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Admin data endpoints sometimes check for "a login" instead of "an admin".
  2. The JSON twin of the admin user list lives under /admin/.
  3. Sign in as a normal user and fetch /admin/users.json.

### [Intermediate] CSRF on Admin Account Deactivation
- Objective: prove the flaw at POST /admin/deactivate — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Admin actions are state-changing POSTs too — and just as forgeable.
  2. The portal’s own pages carry the hx_origin marker; a forged request does not.
  3. POST to /admin/deactivate as an admin with only the session cookie — no marker — and the user is deactivated.

## Platform & API

### [Beginner] Unauthenticated Debug Dump of All Identity Data
- Objective: prove the flaw at GET /api/debug (no session) — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. Diagnostic endpoints often survive into production.
  2. This one needs no session, no token, nothing.
  3. Fetch /api/debug while logged out.

### [Intermediate] Weak API Token — Base64 of the Email Address
- Objective: prove the flaw at GET /api/identity?token= — the test flips on the Mission Board only when the real effect happens.
- Hints:
  1. The API token is derived from something public — the account email.
  2. Base64 is an encoding, not a secret.
  3. base64-encode bob@test.local and call /api/identity?token=<that value>.
