# HexaKids — Practice Guide (LAB 57)

Challenges grouped by feature, then difficulty. Each challenge is scored on the Mission Board (/tests) and flips only when the exploit genuinely succeeds server-side. The Lab Coach unlocks step-by-step help for a feature after you have tried that feature at least 3 times.

## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03:2021 Injection)
- **Objective:** Flip the "SQL Injection Login Bypass" test on /tests via `POST /login`.
- **Hints:**
  1. The login form feeds a string-built query on a legacy route.
  2. Classic tautology payloads work: think about making the WHERE clause always true.
  3. Use email: ' OR '1'='1 and any password — you land in an account that is not yours.

### Brute Force — No Rate Limit or Lockout (Beginner · A07:2021 Authentication Failures)
- **Objective:** Flip the "Brute Force — No Rate Limit or Lockout" test on /tests via `POST /login`.
- **Hints:**
  1. Pick one account and keep guessing wrong passwords.
  2. Count the failures — does anything change after 5? After 10?
  3. The flaw is proven when the 10th consecutive failure is still processed normally.

### User Enumeration via Forgot Password (Beginner · A07:2021 Authentication Failures)
- **Objective:** Flip the "User Enumeration via Forgot Password" test on /tests via `POST /forgot`.
- **Hints:**
  1. Compare the forgot-password response for a real account and an invented one.
  2. The messages are not identical — one of them confirms the account exists.
  3. Probe one existing and one non-existing email; the difference itself is the leak.

### Published Demo Credentials Still Active (Beginner · A07:2021 Authentication Failures)
- **Objective:** Flip the "Published Demo Credentials Still Active" test on /tests via `POST /login`.
- **Hints:**
  1. The README lists the test accounts — one of them is a public demo account.
  2. Demo accounts shipped for trials are rarely disabled.
  3. Use demo@hexakids.local with password demo123.

### Predictable Password-Reset Token (Intermediate · A07:2021 Authentication Failures)
- **Objective:** Flip the "Predictable Password-Reset Token" test on /tests via `POST /reset`.
- **Hints:**
  1. Request a reset for your own account and look at the token format.
  2. The token contains the user id and a small checksum — nothing random.
  3. Token = HK<id>-((id*731+19) mod 10000, zero-padded). Forge one for another user and POST /reset.

### Session Role Cookie Tampering (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Session Role Cookie Tampering" test on /tests via `Cookie: hx_role`.
- **Hints:**
  1. Look at the cookies the app sets after login — one of them names your role.
  2. The server reads your role from that cookie instead of its own records.
  3. Set hx_role=admin in your browser or with curl, keep your normal session, and visit /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner · A07:2021 Authentication Failures)
- **Objective:** Flip the "Weak Password Policy (1-Character Passwords)" test on /tests via `POST /register`.
- **Hints:**
  1. Try registering with the shortest password you can think of.
  2. There is no minimum length or complexity check at all.
  3. Password "a" works.

### Mass Assignment — Self-Assigned Role and Premium Plan (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Mass Assignment — Self-Assigned Role and Premium Plan" test on /tests via `POST /register`.
- **Hints:**
  1. The registration handler copies every submitted field onto the user object.
  2. What fields does a user have that the form never shows? Think role and plan.
  3. POST /register with email, password, name plus role=teacher — your account is created as a teacher.

### Stored XSS in Display Name (Intermediate · A03:2021 Injection)
- **Objective:** Flip the "Stored XSS in Display Name" test on /tests via `POST /register, POST /profile`.
- **Hints:**
  1. Your display name is shown on the dashboard exactly as typed.
  2. Try a name containing an <img> tag with an error handler.
  3. Name: <img src=x onerror=alert(1)> — it is stored and rendered unescaped.

### CSRF on Profile Update (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "CSRF on Profile Update" test on /tests via `POST /profile`.
- **Hints:**
  1. Profile updates change state with a plain POST and no anti-CSRF token.
  2. A browser sends cookies automatically — the question is whether the server checks where the request came from.
  3. POST /profile with header Origin: https://evil.example while logged in — the change is applied anyway.

## Children & Reports

### Child Profile IDOR — Another Family's Child (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Child Profile IDOR — Another Family's Child" test on /tests via `GET /children/:id`.
- **Hints:**
  1. Child profiles live at predictable numeric URLs.
  2. Nothing checks that the child belongs to your family.
  3. Log in as Priya and open /children/201 — Leo belongs to Marco's family.

### Progress Report IDOR (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Progress Report IDOR" test on /tests via `GET /children/:id/report`.
- **Hints:**
  1. Reports hang off the same predictable child ids.
  2. The report page repeats the profile page's missing ownership check.
  3. As Priya, open /children/301/report — Noor's report from Sara's family.

### Stars/Points Inflation via API (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Stars/Points Inflation via API" test on /tests via `POST /api/award`.
- **Hints:**
  1. There is an API endpoint teachers use to award stars.
  2. It never checks who you are, whose child it is, or how many stars you grant.
  3. POST /api/award {childId:301, stars:9999} as any parent — the balance jumps.

## Activities & Rewards

### Premium Activities Without a Subscription (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Premium Activities Without a Subscription" test on /tests via `POST /activities/:id/complete`.
- **Hints:**
  1. Premium activities are greyed out in the UI for free families — but the completion endpoint still answers.
  2. UI hiding is not access control.
  3. As a free parent, POST /activities/3/complete — Math Quest completes and progress is recorded.

### Quiz Answers Exposed via API (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Quiz Answers Exposed via API" test on /tests via `GET /api/activities/:id/answers`.
- **Hints:**
  1. The player app needs answers to grade — find the endpoint it calls.
  2. Grading data shipped to the client is public data.
  3. GET /api/activities/3/answers returns the full answer key.

### Reward Redemption Without Enough Stars (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Reward Redemption Without Enough Stars" test on /tests via `POST /rewards/:id/redeem`.
- **Hints:**
  1. Rewards cost stars — try redeeming one a child cannot afford.
  2. The endpoint subtracts first and asks questions never.
  3. Redeem reward 3 (500 stars) for Noor (60 stars) — it succeeds and her balance goes negative.

## Classes & Teachers

### Teacher Access to Children Outside Their Class (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Teacher Access to Children Outside Their Class" test on /tests via `GET /children/:id`.
- **Hints:**
  1. Teachers can view their own class children — the check stops there.
  2. Try a child id from a different class, or no class at all.
  3. As Ms. Lee (Sunshine 1), open /children/201 — Leo is in Mr. Omar's class.

### Class Membership Forgery — Join Without Invite (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Class Membership Forgery — Join Without Invite" test on /tests via `POST /classes/:id/join`.
- **Hints:**
  1. Classes have invite codes — but the join endpoint may not ask for one.
  2. A parent should not be able to enrol into a closed class unilaterally.
  3. POST /classes/2/join {childId:301} — Noor joins Rainbow 2 without any invite.

### Class Roster PII Exposure via API (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "Class Roster PII Exposure via API" test on /tests via `GET /api/classes/:id/roster`.
- **Hints:**
  1. The teacher app loads rosters from an API endpoint.
  2. Check what the roster includes beyond names — and who can call it.
  3. GET /api/classes/1/roster as Sara (unrelated) returns all children and parent emails.

## Subscriptions & Billing

### Subscription Price Tampering (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Subscription Price Tampering" test on /tests via `POST /subscribe`.
- **Hints:**
  1. The subscribe form posts a price field along with the plan.
  2. Prices quoted by the browser are suggestions, not truth.
  3. POST /subscribe {plan:premium, price:0} — Premium activates and the recorded charge is $0.

### Billing Invoice IDOR (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Billing Invoice IDOR" test on /tests via `GET /invoices/:id`.
- **Hints:**
  1. Invoices have small sequential ids.
  2. Billing pages repeat the same missing ownership check as profiles.
  3. As Priya, open /invoices/1 — it is Marco's paid Premium invoice.

## Search

### Reflected XSS in Search (Beginner · A03:2021 Injection)
- **Objective:** Flip the "Reflected XSS in Search" test on /tests via `GET /search?q=`.
- **Hints:**
  1. The results page repeats your search term back to you.
  2. It repeats it without escaping.
  3. Search for <script>alert(1)</script> — the payload lands in the page as-is.

### SQL Injection in Search Dumps All Children (Intermediate · A03:2021 Injection)
- **Objective:** Flip the "SQL Injection in Search Dumps All Children" test on /tests via `GET /search?q=`.
- **Hints:**
  1. Search normally only shows your own children — the filter is part of the query string.
  2. A tautology in q changes what the query matches.
  3. Search for ' OR '1'='1 and every child on the platform appears.

## Admin Panel

### CSRF on Admin User Deactivation (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Flip the "CSRF on Admin User Deactivation" test on /tests via `POST /admin/users/:id/deactivate`.
- **Hints:**
  1. Admin actions are plain POSTs with no anti-CSRF token.
  2. Reaching the action as an admin is easy (remember the role cookie) — the missing piece is origin checking.
  3. As admin, POST /admin/users/4/deactivate with Origin: https://evil.example — Sara is deactivated.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Users (Beginner · A01:2021 Broken Access Control)
- **Objective:** Flip the "Unauthenticated Debug Endpoint Dumps All Users" test on /tests via `GET /api/debug`.
- **Hints:**
  1. Development endpoints often survive into production.
  2. Try the obvious: /api/debug.
  3. No session needed — the full user table with passwords comes back as JSON.

### Predictable API Token (Base64 of Email) (Intermediate · A07:2021 Authentication Failures)
- **Objective:** Flip the "Predictable API Token (Base64 of Email)" test on /tests via `GET /api/me with X-Api-Token`.
- **Hints:**
  1. Find your own API token in the API docs section and study its shape.
  2. Decode it — what does it actually contain?
  3. Token = hk_ + base64(email). Forge Marco's and call GET /api/me.
