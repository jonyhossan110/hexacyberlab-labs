# HexaCert — Practice Guide (LAB 59)

Challenges grouped by feature, ordered by difficulty. Work through them in the app;
the `/tests` mission board mirrors this guide and tracks your attempts and progress.
Rule of the house: try each feature at least 3 times yourself — then the Lab Coach will guide you step by step.

## Login & Authentication

### [Beginner] Brute Force — No Rate Limiting or Lockout
- **Objective:** Make the server record the real effect of this flaw at POST /login — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Nothing slows you down when a password guess is wrong.
  2. Script or manually repeat wrong passwords for one account and watch for any lockout, delay or CAPTCHA.
  3. Make 10+ failed attempts against alice@test.local — every one is still processed instantly.
- **What it teaches:** Without throttling, lockout or MFA, online password guessing is only a matter of time against weak passwords.

### [Beginner] User Enumeration via Login & Reset Responses
- **Objective:** Make the server record the real effect of this flaw at POST /login and POST /forgot — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Compare the error text for an email that exists with one that does not.
  2. The forgot-password flow answers differently too.
  3. Probe at least 5 different emails across login/forgot — real accounts say "Incorrect password" / show a reset preview, unknown ones say "No account found".
- **What it teaches:** Different responses for existing vs non-existing accounts turn your login page into a free directory of valid users for targeted attacks.

### [Beginner] Default / Demo Administrator Credentials
- **Objective:** Make the server record the real effect of this flaw at POST /login with the seeded admin account — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Seeded demo accounts often keep their factory passwords.
  2. The README lists the demo accounts — one of them is an administrator.
  3. Sign in as admin@hexacert.local with the password shown in the demo account list.
- **What it teaches:** Default credentials are public knowledge; any shipped demo or factory password must be changed or removed before go-live.

### [Intermediate] SQL Injection Login Bypass
- **Objective:** Make the server record the real effect of this flaw at POST /login (legacy string-built query path) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The login form builds its account lookup by gluing your input straight into a query string.
  2. Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.
  3. Use email: ' OR '1'='1 and any password — the glued query matches the first account (the admin).
- **What it teaches:** String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.

### [Intermediate] Predictable Password Reset Token
- **Objective:** Make the server record the real effect of this flaw at POST /forgot then POST /reset — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Request a reset for your own account and study the token format in the simulated email preview.
  2. The token is derived from something public about the account — not random.
  3. The token is simply HX followed by the numeric user id (e.g. the 4th account uses HX4) — compute it for another user and reset their password.
- **What it teaches:** Reset tokens must be long, random and single-use; anything derivable from a user id or email is an account-takeover shortcut.

### [Intermediate] Session Role Cookie Tampering
- **Objective:** Make the server record the real effect of this flaw at hx_role cookie honoured by /admin and /proctor — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The app reads a role hint from a cookie instead of trusting only the server-side session.
  2. Your browser stores cookies — and lets you edit them.
  3. Sign in as a candidate, set the cookie hx_role=admin, then open /admin.
- **What it teaches:** Authorization data must live server-side; any role the client can edit will be edited.

## Registration & Profile

### [Beginner] Weak Password Policy
- **Objective:** Make the server record the real effect of this flaw at POST /register — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. How short a password will registration accept?
  2. Try a single character.
  3. Register a new account with the password "x" — it is accepted.
- **What it teaches:** A password policy is the cheapest defence you have; accepting 1-character passwords makes brute force and guessing trivial.

### [Beginner] Stored XSS in Display Name
- **Objective:** Make the server record the real effect of this flaw at POST /register and POST /profile (name rendered unescaped) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Names are printed back on dashboards and admin lists exactly as typed.
  2. Put an HTML/JS payload where your name goes.
  3. Register or rename yourself to <script>alert(1)</script> — it is stored and rendered as code.
- **What it teaches:** Every user-controlled string that is rendered must be output-encoded; stored XSS fires in other users' browsers, including admins'.

### [Intermediate] Mass Assignment — Role Escalation at Registration
- **Objective:** Make the server record the real effect of this flaw at POST /register (extra form fields are bound to the account) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The registration handler copies submitted fields straight onto the new account object.
  2. What fields does an account have that the form never shows?
  3. Register with an extra field role=admin (add it to the form data) — the new account is created as an administrator.
- **What it teaches:** Binding request data directly to model objects lets attackers set fields they were never offered; whitelist what each form may set.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the server record the real effect of this flaw at POST /profile (no anti-CSRF token; origin marker never verified) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The app sets an hx_origin marker cookie on its own pages but never checks it on profile updates.
  2. A state-changing POST from outside the app's own pages carries no marker.
  3. While signed in, submit the profile form from a raw request that has only your session cookie (no hx_origin marker) — the name still changes.
- **What it teaches:** State-changing requests need an unguessable token tied to the session; cookies alone are sent by the browser on cross-site requests too.

## Exam Booking

### [Beginner] Booking IDOR — View Another Candidate's Booking
- **Objective:** Make the server record the real effect of this flaw at GET /bookings/:id — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Booking detail pages are addressed by a simple numeric id.
  2. Your own bookings are listed under /bookings — what happens if you change the number?
  3. Open /bookings/2 while signed in as Alice — it is Bob's booking, served without any ownership check.
- **What it teaches:** Every object access must check that the object belongs to the requester; sequential ids make unprotected objects trivially enumerable.

### [Intermediate] Exam Swap After Booking (Price Downgrade Fraud)
- **Objective:** Make the server record the real effect of this flaw at POST /bookings/:id/exam — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. A booking remembers which exam it was created for — but the change-exam action trusts your new choice completely.
  2. Book (or use) the cheapest exam, then change it.
  3. Change a Web Security Fundamentals booking ($199) to Cloud Security Associate ($299) via the exam-swap action — no payment for the difference is ever requested.
- **What it teaches:** Price and entitlement must be recomputed server-side on every change; a paid-for cheap item must never silently become an expensive one.

## Exam Taking & Results

### [Beginner] Exam Result IDOR — Read Another Candidate's Result
- **Objective:** Make the server record the real effect of this flaw at GET /results/:bookingId — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Result pages use the same numeric booking ids as everything else.
  2. Whose results can you open if you guess an id?
  3. Open /results/5 as Alice — Carol's completed exam result, score included, is served to you.
- **What it teaches:** Results are personal data; object-level authorization must be checked on reads just as strictly as on writes.

### [Intermediate] Candidate Releases Own Results (Proctor-Only Action)
- **Objective:** Make the server record the real effect of this flaw at POST /results/:bookingId/release — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Finished results stay unreleased until a proctor publishes them — that is the design.
  2. The release action checks that you are signed in, but not who you are.
  3. As a candidate, call the release action on an unreleased result — it publishes without any proctor involved.
- **What it teaches:** Workflow steps restricted by role must verify the role on the server for every single action, not hide the button.

### [Advanced] Self-Graded Exam — Client-Supplied Score Trusted
- **Objective:** Make the server record the real effect of this flaw at POST /exam/:bookingId/submit — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The exam submission accepts a finished score from the browser instead of grading answers server-side.
  2. Look at what the submit request actually sends.
  3. Submit your own exam with score=100 in the request — the platform records a perfect pass without grading a single answer.
- **What it teaches:** Scores, prices and verdicts must be computed on the server from raw inputs; anything the client states about outcomes is fiction.

## Certificates & Verification

### [Beginner] Sequential Certificate ID Enumeration (Public)
- **Objective:** Make the server record the real effect of this flaw at GET /verify?certId=HC-#### — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Certificate ids follow a simple pattern shown right on the verify page.
  2. Employers can check any id without signing in — and so can you, repeatedly.
  3. Probe HC-1001 through HC-1005 on the public verify page — each real one reveals its holder's name and credential.
- **What it teaches:** Public lookup endpoints need unguessable identifiers; sequential ids turn a verification tool into a full directory of credential holders.

### [Intermediate] Verification Result Forgery via URL Parameters
- **Objective:** Make the server record the real effect of this flaw at GET /verify?certId=...&status=valid&name=... — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The verify page helpfully reflects extra query parameters into its verdict.
  2. What decides whether the page says VALID — the database, or the URL?
  3. Open /verify?certId=HC-9999&status=valid&name=Forged+Name — a non-existent certificate is presented as VALID.
- **What it teaches:** Verdicts must come only from server-side records; trusting display parameters lets anyone fabricate proof of certification.

### [Advanced] Self-Issued Credential Without Passing
- **Objective:** Make the server record the real effect of this flaw at POST /certificates/issue — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Issuing is meant to be an admin action following a verified pass.
  2. The issue endpoint only checks that someone is signed in.
  3. As a plain candidate, POST an issue request for the Cloud Security Associate exam — a real, verifiable credential is created for you.
- **What it teaches:** High-value actions (issuing credentials, payments, refunds) need explicit server-side authorization and a verified precondition.

## Vouchers & Partners

### [Beginner] Voucher Code Enumeration / Guessing
- **Objective:** Make the server record the real effect of this flaw at POST /vouchers/redeem (error oracle) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The redeem form tells you clearly when a code does not exist.
  2. Codes follow a readable pattern: PARTNER-YEAR-WORD.
  3. Probe 5 or more different code guesses — nothing throttles you, and the responses confirm which guesses are wrong.
- **What it teaches:** Redemption endpoints are guessing targets: codes need real entropy and attempts need throttling, or valid codes will be found by patience.

### [Intermediate] Voucher Re-Redemption (Single-Use Not Enforced)
- **Objective:** Make the server record the real effect of this flaw at POST /vouchers/redeem — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Partner vouchers are sold as single-use codes.
  2. The redeem flow marks a voucher used — but does it ever check that flag first?
  3. Redeem PARTNER-2026-ALPHA once, then redeem the very same code again (any account) — a second free booking is created.
- **What it teaches:** Single-use semantics must be enforced atomically on the server at redemption time; a "used" flag nobody reads is decoration.

## Renewals

### [Beginner] Renew Another Candidate's Credential
- **Objective:** Make the server record the real effect of this flaw at POST /renewals/:credId — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The renew action is addressed by credential id and trusts the caller.
  2. Your renewals page lists only your credentials — the endpoint does not.
  3. Renew credential id 2 (Bob's HC-1002) while signed in as someone else — it renews without any ownership check.
- **What it teaches:** Ownership checks belong on every object action — renewals change another person's legal credential status.

### [Intermediate] Renew Expired Credential Without Re-Examination
- **Objective:** Make the server record the real effect of this flaw at POST /renewals/:credId — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Credentials expire so holders must re-prove competence.
  2. One of Alice's credentials is already past its expiry date.
  3. Renew credential HC-1001 (expired 2026-10-15) — it becomes active again instantly, with no re-exam and no checks.
- **What it teaches:** Expiry is a business rule, not a display state; renewal paths must re-validate the conditions that made the credential lapse.

## Admin Panel

### [Beginner] Broken Access Control — Admin Panel Open to Any Signed-In User
- **Objective:** Make the server record the real effect of this flaw at GET /admin — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The admin panel is not linked from candidate pages — but hiding a link is not protection.
  2. Guess the obvious path.
  3. Sign in as any candidate and open /admin directly — the full panel, user list included, is served.
- **What it teaches:** Every privileged route must verify authorization on the server; unlinked URLs are found in seconds.

### [Intermediate] CSRF on Admin Action (Revoke Certificate)
- **Objective:** Make the server record the real effect of this flaw at POST /admin/revoke (origin marker never verified) — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Admin actions change state with a bare POST and the session cookie.
  2. The hx_origin marker the app sets on its own pages is never checked here either.
  3. Submit the revoke action from a raw request carrying only the admin session cookie (no hx_origin marker) — the certificate is revoked.
- **What it teaches:** Privileged state changes are the highest-value CSRF targets; tokens and origin checks are mandatory there.

## Platform & API

### [Beginner] Sensitive Data Exposure — /api/debug Dumps All Accounts
- **Objective:** Make the server record the real effect of this flaw at GET /api/debug — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. Developers love leaving a debug endpoint behind.
  2. Try the obvious diagnostic path under /api.
  3. Open /api/debug — every account, including passwords, plus vouchers and credentials, is returned as JSON with no login at all.
- **What it teaches:** Debug and diagnostic endpoints must never reach production; if they do, they need the same authentication as the data they expose.

### [Intermediate] Weak API Token (Base64 of Email)
- **Objective:** Make the server record the real effect of this flaw at GET /api/me with Authorization: Bearer <token> — the test on the mission board flips to done only when the effect is observed.
- **Hints:**
  1. The API token is not random — it is a reversible encoding of something public.
  2. What does every user know about themselves that an API might lazily reuse?
  3. Send Authorization: Bearer with the base64 encoding of any user's email (e.g. alice@test.local) — the API returns that user's account data.
- **What it teaches:** API tokens must be opaque random secrets; an encoding is not encryption and a public identifier is not a credential.
