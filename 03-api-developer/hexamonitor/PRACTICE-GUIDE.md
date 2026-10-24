# HexaMonitor — Practice Guide (LAB 27)

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective: the test flips to done only when the exploit actually succeeds server-side.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the /tests page mark "SQL injection login bypass" as done by performing the real exploit at POST /login.
- Hint 1: The login builds its database query by gluing your input straight into the query string.
- Hint 2: Try a classic tautology payload in the email field, e.g. something that makes the WHERE clause always true.
- Hint 3: Use ada@northbeam.test' OR '1'='1 as the email with any password — the password check disappears.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the /tests page mark "Brute force — no rate limit or lockout" as done by performing the real exploit at POST /login.
- Hint 1: How many wrong passwords can you try for one account in a row?
- Hint 2: Nothing slows you down — no counter, no CAPTCHA, no lockout message.
- Hint 3: Send 10 failed logins for omar@northbeam.test — the 10th is still processed normally.

### [Beginner] User enumeration via different error messages
- **Objective:** Make the /tests page mark "User enumeration via different error messages" as done by performing the real exploit at POST /login and POST /forgot.
- Hint 1: Compare the error for an email that exists with one that does not.
- Hint 2: The app is helpful in two different voices — that difference is the leak.
- Hint 3: Login once with a real email + wrong password ("Incorrect password") and once with a fake email ("No account found") — the pair confirms which emails are registered.

### [Beginner] Default platform admin credentials unchanged
- **Objective:** Make the /tests page mark "Default platform admin credentials unchanged" as done by performing the real exploit at POST /login (platform root account).
- Hint 1: Every product ships with a first admin account. What password do vendors always pick?
- Hint 2: The platform root account is root@hexamonitor.test.
- Hint 3: Try the most infamous default of all: admin123. It was never changed.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the /tests page mark "Predictable password-reset token" as done by performing the real exploit at POST /forgot and POST /reset.
- Hint 1: Request a reset for your own account and study the token format — it is not random.
- Hint 2: The token is a small arithmetic function of the user’s numeric ID and the day of the year.
- Hint 3: Token = HM- + hex(userId × 331 + dayOfYear). Vera is user 3 — compute her token and reset her password without ever requesting one.

### [Intermediate] Session/cookie role tampering
- **Objective:** Make the /tests page mark "Session/cookie role tampering" as done by performing the real exploit at GET /admin (hx_role cookie).
- Hint 1: The app keeps a helper cookie that mirrors your role. Who does the server believe — the session or the cookie?
- Hint 2: Edit the hx_role cookie in your browser and see what value the admin gate wants.
- Hint 3: As Vera (viewer), set cookie hx_role=platform and open /admin — the gate trusts the cookie over the real account.

## Registration & Profile

### [Beginner] Weak password policy on registration
- **Objective:** Make the /tests page mark "Weak password policy on registration" as done by performing the real exploit at POST /register.
- Hint 1: What is the shortest password the sign-up form accepts?
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: Register a new account with the password "a" — it is accepted.

### [Beginner] Stored XSS in display name
- **Objective:** Make the /tests page mark "Stored XSS in display name" as done by performing the real exploit at POST /profile (name), served on /team and page headers.
- Hint 1: Your display name is printed on the team page for your colleagues. Is it encoded?
- Hint 2: Put markup in your name and visit /team.
- Hint 3: Set your profile name to Ada <script>alert(1)</script> — the payload is stored and served raw to teammates.

### [Intermediate] Mass assignment — role granted at registration
- **Objective:** Make the /tests page mark "Mass assignment — role granted at registration" as done by performing the real exploit at POST /register (role parameter).
- Hint 1: The registration handler binds every submitted field onto the new user object.
- Hint 2: What happens if you add a field the form never showed — like the account’s role?
- Hint 3: Submit the registration with an extra field role=platform — the new account is created as platform administrator.

### [Intermediate] CSRF on profile update
- **Objective:** Make the /tests page mark "CSRF on profile update" as done by performing the real exploit at POST /profile.
- Hint 1: The profile form carries a hidden marker field. Does the server actually require it?
- Hint 2: A state change that succeeds without the marker — or from a foreign Origin — is CSRF.
- Hint 3: While logged in, submit a profile change from another origin (or with the hx_marker field removed) — it is applied.

## Monitors

### [Beginner] Cross-account monitor IDOR (read)
- **Objective:** Make the /tests page mark "Cross-account monitor IDOR (read)" as done by performing the real exploit at GET /monitors/:id.
- Hint 1: Monitor IDs are small sequential numbers. What stops you opening another account’s monitor?
- Hint 2: Nothing checks that the monitor belongs to your account.
- Hint 3: Log in as Ada (account 1) and open /monitors/4 — PixelPort’s monitor, including its internal note, is served.

### [Intermediate] Cross-account monitor tampering (edit)
- **Objective:** Make the /tests page mark "Cross-account monitor tampering (edit)" as done by performing the real exploit at POST /monitors/:id/edit.
- Hint 1: Reading a foreign monitor worked. Does writing work too?
- Hint 2: The edit handler has the same missing ownership check as the read.
- Hint 3: POST a new name/URL to /monitors/4/edit as Ada — PixelPort’s monitor is rewritten.

### [Intermediate] SSRF in the quick-check tool
- **Objective:** Make the /tests page mark "SSRF in the quick-check tool" as done by performing the real exploit at POST /tools/quickcheck.
- Hint 1: The quick-check tool fetches any URL you give it — from the server’s network position.
- Hint 2: What internal addresses would a cloud server trust? The lab simulates one: 169.254.169.254.sim.
- Hint 3: Quick-check http://169.254.169.254.sim/latest/meta-data/iam/security-credentials — the checker returns the simulated cloud credentials.

### [Advanced] Monitor URL allowlist bypass via userinfo
- **Objective:** Make the /tests page mark "Monitor URL allowlist bypass via userinfo" as done by performing the real exploit at POST /monitors (URL validation vs fetch).
- Hint 1: Creating a monitor with an internal URL is blocked — the validator reads the host one way, the fetcher another.
- Hint 2: In a URL, everything before the @ is userinfo, not the host. Which parser forgets that?
- Hint 3: Create a monitor with URL http://shop.northbeam.test@169.254.169.254.sim/latest/meta-data — the validator approves "shop.northbeam.test", the checker fetches the metadata service.

## Alert Rules

### [Intermediate] Cross-account alert rule tampering
- **Objective:** Make the /tests page mark "Cross-account alert rule tampering" as done by performing the real exploit at POST /alerts/:id/edit.
- Hint 1: Alert rules are objects with IDs too — and the edit handler trusts them.
- Hint 2: Whose inbox receives PixelPort’s down-alerts after you visit their rule?
- Hint 3: As Ada, POST to /alerts/2/edit and change notify to your own address — their alerts now come to you (or nowhere).

### [Intermediate] Silencing a rival’s monitor via maintenance window
- **Objective:** Make the /tests page mark "Silencing a rival’s monitor via maintenance window" as done by performing the real exploit at POST /maintenance.
- Hint 1: Maintenance windows pause alerting for a monitor. Which monitor IDs does the form accept?
- Hint 2: The handler never asks whether the monitor is yours.
- Hint 3: As Ada, create a maintenance window for monitor 4 (PixelPort’s) — their monitor is silenced under a fake maintenance note.

## Incidents

### [Beginner] Stored XSS in incident comments
- **Objective:** Make the /tests page mark "Stored XSS in incident comments" as done by performing the real exploit at POST /incidents/:id/comment, served on the incident page.
- Hint 1: Incident comments are the team’s shared timeline. How are they rendered?
- Hint 2: Post a comment containing markup and reload the incident.
- Hint 3: Comment <script>alert(document.domain)</script> on an incident — it executes for everyone who opens the timeline.

### [Beginner] Cross-account incident access
- **Objective:** Make the /tests page mark "Cross-account incident access" as done by performing the real exploit at GET /incidents/:id.
- Hint 1: Incidents carry internal notes marked "do not share". Who can read them?
- Hint 2: Incident IDs are sequential and the handler skips the tenant check.
- Hint 3: As Ada, open /incidents/2 — PixelPort’s incident, including its internal note, is fully visible.

## Status Pages

### [Beginner] Public status page leaks internal data
- **Objective:** Make the /tests page mark "Public status page leaks internal data" as done by performing the real exploit at GET /status/:slug (unauthenticated).
- Hint 1: The public status page is meant to show up/down. What else is in the HTML?
- Hint 2: View the page source while logged out and look for "INTERNAL".
- Hint 3: Open /status/northbeam logged out — monitor internal notes and the account contact email are in the public markup.

### [Beginner] Status page enumeration
- **Objective:** Make the /tests page mark "Status page enumeration" as done by performing the real exploit at GET /status/:slug.
- Hint 1: Status pages live at short, guessable slugs — the account’s short name.
- Hint 2: How many different company status pages can you find by guessing?
- Hint 3: Probe 5 distinct slugs (northbeam, pixelport, and a few guesses) while logged out — every guess is answered and nothing throttles you.

### [Intermediate] Reflected XSS on the public status page
- **Objective:** Make the /tests page mark "Reflected XSS on the public status page" as done by performing the real exploit at GET /status/:slug?notice=.
- Hint 1: Status pages accept a notice parameter shown as a banner. Is it encoded?
- Hint 2: Craft a link with markup in the notice and open it.
- Hint 3: Open /status/northbeam?notice=<script>alert(1)</script> — the banner reflects it raw, a perfect phishing link on the real domain.

## Integrations

### [Intermediate] SSRF via integration webhook test
- **Objective:** Make the /tests page mark "SSRF via integration webhook test" as done by performing the real exploit at POST /integrations/:id/test.
- Hint 1: The "Send test" button makes the server call your webhook URL. Any URL.
- Hint 2: Internal addresses answer the server — including the simulated ops console at internal-admin.sim.
- Hint 3: Create a webhook integration pointing at http://internal-admin.sim/ and press test — the response shows the internal console.

### [Intermediate] Cross-account integration secrets exposure
- **Objective:** Make the /tests page mark "Cross-account integration secrets exposure" as done by performing the real exploit at GET /integrations/:id.
- Hint 1: Integration details include the webhook signing secret. Whose integrations can you open?
- Hint 2: IDs are sequential; the detail handler shows the full record.
- Hint 3: As Ada, open /integrations/2 — PixelPort’s webhook URL and its signing secret are displayed.

## Admin Panel

### [Intermediate] Admin user deletion via GET (CSRF)
- **Objective:** Make the /tests page mark "Admin user deletion via GET (CSRF)" as done by performing the real exploit at GET /admin/users/delete?id=.
- Hint 1: Destructive admin actions should never ride on a GET — do these?
- Hint 2: A link an admin can be tricked into clicking must not change state.
- Hint 3: As platform admin, open /admin/users/delete?id=2 — Omar is deleted by a plain GET: an <img> tag on any page would do the same.

## Platform & API

### [Intermediate] API BOLA — accountId parameter crosses tenants
- **Objective:** Make the /tests page mark "API BOLA — accountId parameter crosses tenants" as done by performing the real exploit at GET /api/monitors?accountId=.
- Hint 1: Your API key belongs to your account. What does the accountId query parameter do?
- Hint 2: The API trusts the parameter over the key’s tenant.
- Hint 3: Call /api/monitors?accountId=2 with Northbeam’s key — PixelPort’s monitors come back.

### [Advanced] Legacy API key derived from email
- **Objective:** Make the /tests page mark "Legacy API key derived from email" as done by performing the real exploit at GET /api/monitors (X-API-Key).
- Hint 1: Old "legacy" API keys are still accepted next to the real ones. How were they generated?
- Hint 2: Emails are public. Base64 is not encryption.
- Hint 3: The legacy key for an account is hmk_ + base64(admin email). Compute Ben’s from ben@pixelport.test and call the API — it authenticates.
