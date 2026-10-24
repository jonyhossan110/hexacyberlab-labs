# HexaNutrition (LAB 68) — Practice Guide

Hands-on challenges, grouped by feature and ordered by difficulty. Work through the Mission Board at `/tests` — a challenge counts only when the server detects the real exploit effect. Stuck? Each challenge lists 3 graded hints, and the in-lab Coach will guide you step by step once you have genuinely tried a feature at least 3 times.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** Flip the "SQL Injection Login Bypass" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The login query is built by string concatenation — what happens if your email contains a quote?
  2. Try a classic tautology payload in the email field.
  3. Use admin@hexanutrition.local' OR '1'='1 as the email with any password.

### [Beginner] Brute Force — No Login Rate Limiting
- **Objective:** Flip the "Brute Force — No Login Rate Limiting" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. How many wrong passwords can you try for one account in a row?
  2. The app never locks the account or slows you down.
  3. Script 10+ failed logins for bob@test.local and watch the test flip.

### [Beginner] User Enumeration via Login & Forgot Password
- **Objective:** Flip the "User Enumeration via Login & Forgot Password" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Compare the error for an email that exists with one that does not.
  2. The forgot-password form answers differently too.
  3. Probe at least 5 different emails across login/forgot, mixing real and fake ones.

### [Beginner] Published Default Demo Credentials
- **Objective:** Flip the "Published Default Demo Credentials" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Read the login page carefully — what accounts does it advertise?
  2. Demo credentials were never changed or removed.
  3. Log in with the published demo admin account.

### [Intermediate] Predictable Password Reset Token
- **Objective:** Flip the "Predictable Password Reset Token" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Request a reset and study the token format — is any part random?
  2. Tokens follow a formula based on the account id.
  3. Compute the token for a victim account and POST /reset without ever requesting a link.

### [Intermediate] Role Cookie Tampering
- **Objective:** Flip the "Role Cookie Tampering" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. After login, look at the cookies the app sets — one of them describes your role.
  2. The server trusts that cookie instead of the account record.
  3. Set hx_role=admin in your browser and visit /admin.

## Registration & Profile

### [Beginner] Weak Password Policy
- **Objective:** Flip the "Weak Password Policy" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. How short a password will registration accept?
  2. Try a single character.
  3. Register with password "a" — if the account is created, the policy is the flaw.

### [Beginner] Stored XSS in Display Name
- **Objective:** Flip the "Stored XSS in Display Name" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Your display name is rendered in the header and the staff caseload view — is it escaped?
  2. Register with an HTML payload as your name.
  3. Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)>.

### [Intermediate] Mass Assignment — Role & Plan at Registration
- **Objective:** Flip the "Mass Assignment — Role & Plan at Registration" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The register form shows 3 fields. What if you POST more?
  2. Servers that bind the whole request body accept fields the UI never offered.
  3. Add role=nutritionist (or plan=premium) to the registration POST.

### [Intermediate] CSRF on Profile Update
- **Objective:** Flip the "CSRF on Profile Update" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The profile form carries a hidden same-site marker. What if a POST leaves it out?
  2. Nothing checks the marker, the Origin, or the Referer.
  3. POST /profile with a new name and no hx_marker field, straight from curl.

## Meal Plans

### [Beginner] Read Another Client's Meal Plan (IDOR)
- **Objective:** Flip the "Read Another Client's Meal Plan (IDOR)" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Meal plan URLs carry a simple numeric id.
  2. Nothing checks that the plan belongs to you.
  3. As Bob, open /plans/1 — Alice’s plan, allergy notes included.

### [Intermediate] Client Edits Own Plan via Nutritionist Endpoint
- **Objective:** Flip the "Client Edits Own Plan via Nutritionist Endpoint" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Plans are edited through /nutritionist/plans/<id>/update — who is allowed to call it?
  2. The endpoint never checks the caller’s role.
  3. As a client, POST new calories/notes to the nutritionist update endpoint for your own plan.

### [Intermediate] Edit Another Client's Meal Plan
- **Objective:** Flip the "Edit Another Client's Meal Plan" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The same nutritionist endpoint also ignores whose plan it is.
  2. Combine the missing role check with a foreign plan id.
  3. As Bob, POST an update to plan 1 (Alice’s plan) and change her calories.

## Consultations

### [Beginner] View Another Client's Consultation (IDOR)
- **Objective:** Flip the "View Another Client's Consultation (IDOR)" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Consultation detail URLs use sequential ids.
  2. Ownership is never checked on the read path.
  3. As Bob, open /consultations/1 to see Alice’s session with Nina.

### [Intermediate] Consultation Booked Without Payment (Price Tampering)
- **Objective:** Flip the "Consultation Booked Without Payment (Price Tampering)" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The booking form carries the price in a hidden field.
  2. The server trusts the submitted price as the amount paid.
  3. Book Nina ($60) with price=0 and see the booking confirmed as paid.

### [Intermediate] Cancel Another Client's Consultation
- **Objective:** Flip the "Cancel Another Client's Consultation" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The cancel action is a POST with the consultation id.
  2. It checks you are logged in — and nothing else.
  3. As Bob, POST /consultations/1/cancel.

## Food Logs & Check-ins

### [Beginner] Read Another Client's Food Log History (IDOR)
- **Objective:** Flip the "Read Another Client's Food Log History (IDOR)" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Food logs are addressed by user id: /foodlog/<userId>.
  2. Any client can ask for any user’s log.
  3. As Bob, open /foodlog/4 — Alice’s complete food history.

### [Intermediate] Forged Check-in for Another Client
- **Objective:** Flip the "Forged Check-in for Another Client" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The check-in form posts a hidden userId field.
  2. The server records the check-in for whoever the form names.
  3. POST /checkins with userId=4 and a fake weight while logged in as Bob.

## Recipes

### [Beginner] Premium Recipe Served Without a Subscription
- **Objective:** Flip the "Premium Recipe Served Without a Subscription" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Premium recipes are marked with a lock — is the lock real?
  2. Open a premium recipe while on the free plan.
  3. As Bob (free), open /recipes/2 and read the full premium protocol.

### [Intermediate] Premium Recipe Content Leaked via API
- **Objective:** Flip the "Premium Recipe Content Leaked via API" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The JSON API returns recipe objects — how much of them?
  2. Web pages may hide what the API happily serialises.
  3. As a free user, GET /api/recipes/4 and read the premium body.

## Subscriptions & Billing

### [Intermediate] Subscription Price Tampering
- **Objective:** Flip the "Subscription Price Tampering" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. The subscribe form posts an amount field.
  2. The server compares nothing — it just upgrades you.
  3. POST /subscribe with plan=premium and amount=0.

### [Intermediate] Single-Use Coupon Reuse
- **Objective:** Flip the "Single-Use Coupon Reuse" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. FIRSTFREE is meant to be used once per account.
  2. Redemption is recorded — but is it checked?
  3. Subscribe with FIRSTFREE twice and collect two free months.

## Search

### [Beginner] SQL Injection in Search
- **Objective:** Flip the "SQL Injection in Search" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Search builds its query from your text, just like login does.
  2. A tautology payload makes the filter match everything.
  3. Search for ' OR '1'='1 and watch private results pour in.

### [Beginner] Reflected XSS in Search
- **Objective:** Flip the "Reflected XSS in Search" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Your query is echoed in the results heading.
  2. It is echoed without escaping.
  3. Search for <script>alert(1)</script> and inspect the page source.

## Admin & Platform

### [Beginner] Caseload Export Open to Any Logged-In User
- **Objective:** Flip the "Caseload Export Open to Any Logged-In User" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Staff export the full caseload from /admin/clients.
  2. The route checks for a login — and stops there.
  3. As any client, open /admin/clients and download the whole client list.

### [Beginner] Debug Endpoint Exposes All Accounts & Passwords
- **Objective:** Flip the "Debug Endpoint Exposes All Accounts & Passwords" test to done on the Mission Board by carrying out the exploit against the running app (server-side detection — there is no checkbox).
- **Hints:**
  1. Developers leave diagnostic routes behind. Guess a common one.
  2. This one needs no login at all.
  3. GET /api/debug and read every account, plaintext passwords included.
