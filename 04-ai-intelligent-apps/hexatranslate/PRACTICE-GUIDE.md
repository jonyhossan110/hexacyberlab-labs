# HexaTranslate — Practice Guide (25 challenges)

Work feature by feature. Each challenge states a measurable objective and carries
3 graded hints — reveal them one at a time, only when stuck. The in-app `/tests`
page mirrors this guide. After 3 genuine attempts on a feature, the Lab Coach
chatbot will walk you through its tests step by step.


## Login & Authentication

### [Beginner] SQL Injection login bypass — A03:2021 Injection
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The legacy sign-on builds its account lookup by gluing your email into the query text.
2. Try an email that starts with a real account address followed by a single quote and a comment, e.g. admin@hexatranslate.local' -- .
3. POST /login with email = admin@hexatranslate.local' -- and ANY password. The lookup matches the admin row and the password check is skipped.

### [Beginner] Brute force — no rate limit or lockout on login — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Count how many wrong passwords the login accepts for one account.
2. There is no CAPTCHA, delay or lockout — script 10+ failures in a row.
3. POST /login 10 times with a wrong password for marco@hexatranslate.local; the 10th failure is still processed normally.

### [Beginner] User enumeration via login & password-reset responses — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Compare the error text for an email that exists vs one that does not.
2. Try it on both /login and /forgot — the wording is not uniform.
3. POST /forgot or /login once with a real email (lena@hexatranslate.local) and once with a fake one (nobody@nowhere.test): one says "No account found", the other complains about the password or issues a reset.

### [Beginner] Weak & default credentials on live accounts — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Seeded/demo accounts often keep the password they were created with.
2. Look at the test-account list in the README — two accounts still use embarrassingly common passwords.
3. Log in as demo@demo.local / password, or tara@hexatranslate.local / LetMeIn123 — both are accepted.

### [Intermediate] Predictable password-reset token — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Ask for a password reset and study the token format in the response.
2. The token looks like rst-<something small and guessable>.
3. POST /forgot for any account, read the token (rst-<user id>), then POST /reset with token rst-4 to take over a DIFFERENT account's password.


## Account & Profile

### [Beginner] Weak password policy at registration — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Register a new account and see how short a password you can get away with.
2. One character is enough.
3. POST /register with password = "a" — the account is created and you are logged in.

### [Beginner] Stored XSS in profile display name — A03:2021 Injection
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Your display name is rendered back on your profile page.
2. Check whether HTML in the name is escaped or served raw.
3. Register or update your profile with name = <script>alert(1)</script> (or an <img onerror> payload), then open /profile.

### [Intermediate] Mass assignment at registration (plan / credits / role) — A08:2021 Software & Data Integrity Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The register handler binds the whole submitted object onto the new user record.
2. Add fields the form never shows: plan, credits, role.
3. POST /register with extra fields plan=Enterprise&credits=99999 (or role=admin) — your profile shows them applied.

### [Intermediate] CSRF on profile update — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The profile form carries a hidden marker field; the handler trusts requests that lack it just the same.
2. A state-changing POST with no marker and no token is accepted.
3. While logged in, POST /profile from a raw HTTP client (no hx_token field) with a new name — the change is applied.


## Translation Projects

### [Beginner] Project IDOR — read another user's project — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Project pages take a numeric id. Ownership is never checked.
2. Open a project id that is not yours (seeded projects run 101–105, across several owners).
3. Log in as marco@hexatranslate.local and open /project?id=103 — Omar's project is served in full.

### [Beginner] Export another user's project (data exfiltration) — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The export endpoint shares the id parameter with the project page — and the same missing check.
2. A JSON download of someone else's project is one request away.
3. As any user, GET /project/export?id=103 — the full project record downloads as JSON.

### [Intermediate] Delete another user's project by id — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Deletion is a plain POST with an id — whose id is never compared to the caller.
2. Create a throwaway project of your own first, note the id pattern, then aim at someone else's.
3. POST /project/delete with id=101 while logged in as a different user — Lena's project is gone.


## Translation Memory

### [Intermediate] Stored XSS through glossary term into translation output — A03:2021 Injection
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Glossary term targets are inserted into translation results verbatim.
2. Put markup in a term target, then translate a sentence containing the term's source word.
3. Add a term source "checkout" with target <img src=x onerror=alert(1)> to one of your glossaries, then translate "checkout" using that glossary — the payload is served raw in the result.

### [Advanced] Translation-memory poisoning leaks into other users' output — A08:2021 Software & Data Integrity Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The translation memory is shared by everyone, and the newest entry for a phrase wins.
2. Add a TM entry for a phrase somebody else will translate, with a target of your choosing.
3. As omar@outsider.test, POST /tm/add (en→fr) source "Your order has shipped" with a hostile target; then, as Lena, translate that exact phrase EN→FR — your text comes out in her result.


## Glossaries & Term Bases

### [Beginner] Private glossary IDOR — read another user's term base — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Glossaries have a "private" flag. Check whether the server honours it.
2. Seeded glossaries: 201 is Lena's, 202 is Omar's private one.
3. Log in as marco@hexatranslate.local and open /glossary?id=202 — the private term base is served.

### [Intermediate] Add terms to another user's glossary — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Adding a term takes a glossaryId. Whose glossary it belongs to is never verified.
2. You can write into a term base you do not own.
3. POST /terms with glossaryId=201 (Lena's glossary) while logged in as someone else — your term appears in her glossary.


## Review Workflow

### [Intermediate] Reviewer-role bypass — approve a review assigned to someone else — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. A pending review waits for its assigned reviewer (Rita). The approve endpoint never asks who you are.
2. Any logged-in account can press approve.
3. Log in as marco@hexatranslate.local and POST /review/approve with id=301 — the review is approved and the project flips to Approved, though the review belongs to Rita.


## Credits & Billing

### [Intermediate] Negative top-up accepted (no amount validation) — A04:2021 Insecure Design
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The top-up form takes an amount. Try values a sane billing system would reject.
2. Zero and negative amounts are applied to the balance as-is.
3. POST /credits/topup with amount=-500 — your credit balance drops by 500 (and a negative transfer can push it the other way).

### [Intermediate] Negative credit transfer steals credits from the recipient — A04:2021 Insecure Design
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Transfers move credits between accounts based on one signed number.
2. What happens if the amount is negative? The direction reverses.
3. POST /credits/transfer to lena@hexatranslate.local with amount=-200 — 200 credits move FROM Lena TO you.


## API & Platform

### [Beginner] Unauthenticated /api/users dumps every account incl. passwords — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Some API routes forgot the login check entirely.
2. Try the users collection without any session at all.
3. GET /api/users with no cookies — the full user list, passwords included, comes back as JSON.

### [Beginner] /debug endpoint exposes configuration and secrets — A05:2021 Security Misconfiguration
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Developers leave diagnostic pages behind. This one answers without a login.
2. It prints environment details — including a signing secret.
3. GET /debug — configuration, version and the API_SIGNING_SECRET are all in the response.

### [Beginner] Missing HTTP security headers — A05:2021 Security Misconfiguration
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Inspect any API response and look for the usual hardening headers.
2. There is no Content-Security-Policy, no X-Frame-Options, no HSTS — nothing.
3. GET /api/ping and check the response headers: the security header set is empty, and the check registers.

### [Intermediate] API token is just base64 of the account email — A07:2021 Identification & Authentication Failures
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. The API docs proudly explain how tokens are "derived".
2. base64 is an encoding, not a secret — and emails are public.
3. Compute base64("lena@hexatranslate.local") and GET /api/projects?token=<that> — her identity is accepted and projects are returned.


## Admin Panel

### [Intermediate] Role cookie tampering opens the admin panel — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Your role travels in a cookie the server trusts blindly.
2. The cookie is called hx_role and it is fully client-controlled.
3. Log in as any normal user, set cookie hx_role=admin, then open /admin — the panel, passwords and all, is served.

### [Intermediate] CSRF on admin user deletion — A01:2021 Broken Access Control
**Objective:** make the server register this test as complete on the mission page by performing the real exploit against the running app.
1. Deleting a user is a plain POST with no anti-CSRF token.
2. An admin's browser can be made to send it from any website.
3. As an admin (or via the tampered role), POST /admin/delete-user with id of a throwaway user and no token — the account is deleted.
