# HexaFintech — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge lists its objective and 3 graded hints
(the /tests mission page in the lab mirrors this guide). A challenge completes only when the exploit
really works — progress is detected server-side.

## Login & Authentication

### [Beginner] SQL injection login bypass (legacy SSO query path)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The login form still talks to a legacy SSO path that builds its query by gluing strings together.
  2. Try a classic quote-break payload in the email field, e.g. something with ' OR in it.
  3. Use email: ' OR '1'='1' --  with any password — the comment cuts the password check off.

### [Beginner] No rate limiting or lockout on login (brute force)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Pick one real account and keep guessing its password.
  2. Count the failures — does anything slow down or lock after 5? After 10?
  3. Fail 10 logins in a row for alice@hexafintech.local; the 10th is still processed normally.

### [Beginner] User enumeration via differing login error messages
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Compare the error for an email that does not exist with the error for a real email + wrong password.
  2. One of them tells you the account exists. That difference is the leak.
  3. Try ghost@nowhere.local (no account) vs alice@hexafintech.local with a wrong password and compare both messages.

### [Beginner] Default demo account with a guessable password
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Seeded/demo accounts often survive into production.
  2. The demo mailbox follows the pattern demo@… and its password is just as predictable.
  3. Log in with demo@hexafintech.local / demo123.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Request a reset and study the token format — it is built from things you already know.
  2. The token combines the account id with a checksum of the email address. Both are public.
  3. Token = FT<id>-<sum of email char codes × 7 mod 90000 + 10000>. Compute one for bob (id 3) WITHOUT requesting a reset, then use it.

### [Intermediate] Session/cookie role tampering reaches the admin panel
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. At login the app sets a role cookie in your browser. Who do you think the server trusts — itself, or that cookie?
  2. Edit the hx_role cookie and see which doors open.
  3. Set hx_role=admin in your browser, then visit /admin.

## Registration & Profile

### [Beginner] Weak password policy (1-character passwords accepted)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Register a fresh account and keep shortening the password.
  2. There is no minimum length or complexity check at all.
  3. Register with the password "x" — the account is created.

### [Beginner] Stored XSS in the display name
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Your display name is rendered back on the dashboard greeting without escaping.
  2. Names are text to you — but the page treats them as HTML.
  3. Set your display name to <script>alert(1)</script> on the profile page and open the dashboard.

### [Intermediate] Mass assignment — set role / tier / daily limit via profile update
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The profile form shows name and phone — but the server binds whatever fields you POST.
  2. Accounts carry fields like role, tier and dailyLimit that were never meant to be user-editable.
  3. POST /profile with extra fields role=admin (or dailyLimit=999999) and watch them stick.

### [Intermediate] CSRF on the profile update form
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The app stamps its own forms with a hidden hx_marker field. What happens if a POST arrives without it?
  2. A state change that accepts requests with no marker and no origin check can be ridden cross-site.
  3. POST /profile from curl with no hx_marker field — the change is applied anyway.

## Financial Profiles & Accounts

### [Beginner] Financial profile IDOR — read another user’s income & net worth
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Your financial profile lives at /users/<id>/profile. Whose id is being checked — the page’s, or yours?
  2. Swap the id in the URL for another user’s.
  3. While logged in as Alice (id 2), open /users/3/profile to read Bob’s income and net worth.

### [Beginner] Linked-account IDOR — read another user’s bank accounts & balances
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Linked accounts are enumerated with simple ids at /accounts/<id>.
  2. Ownership is displayed on the page but never verified on the server.
  3. Logged in as Alice, open /accounts/3 — Bob’s CityBank account and live balance render in full.

### [Intermediate] Path traversal in statement download reads server files
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Statements download via /statements/download?file=… and the name is joined straight onto a folder path.
  2. What happens when the "file" walks up a directory with ../ ?
  3. Request /statements/download?file=../server.js and read the application source itself.

## Cards

### [Beginner] Card limit raised far beyond the platform maximum
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The platform advertises a $5,000 virtual-card cap. The server never enforces it.
  2. The form validates the limit in the browser. Servers should not trust browsers.
  3. POST /cards/1/limit with limit=999999 on your own card — it is accepted.

### [Intermediate] Virtual-card IDOR — full card number & CVV of another user exposed
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Your card detail page shows the full PAN and CVV "for convenience". Check whose cards it will show.
  2. Card ids are small sequential numbers at /cards/<id>.
  3. Logged in as Alice, open /cards/3 — Bob’s full card number, CVV and expiry are displayed.

### [Intermediate] Change another user’s card limit (missing ownership check)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The card-limit endpoint takes a card id and a new limit. It verifies the limit is a number — nothing else.
  2. Try setting a limit on a card that is not yours.
  3. POST /cards/3/limit with limit=50 as Alice — Bob’s card limit changes.

## Transfers

### [Beginner] Transfer more than the balance — no funds check
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Try sending more money than your checking account holds.
  2. The balance is displayed to you, but never checked by the server.
  3. From an account holding $210, send $5,000 — it settles and the balance goes negative.

### [Intermediate] Negative transfer amount reverses the money flow
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The transfer form assumes amounts are positive because the input says so.
  2. What does the ledger do with a minus sign?
  3. Send a transfer of -100 to Bob from your account — your balance goes UP and his goes down.

## Spending Analytics

### [Beginner] Reflected XSS in the analytics period filter
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The analytics heading repeats the period you asked for — verbatim.
  2. Periods are usually values like 2026-10. The page does not check.
  3. Open /analytics?period=<script>alert(1)</script> and watch it land in the page unescaped.

### [Intermediate] Analytics CSV export leaks every user’s spending
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Your analytics page shows YOUR spending. The export button builds its file from a bigger table.
  2. Download your export and read ALL the rows, not just yours.
  3. GET /analytics/export.csv as any normal user — the file contains every customer’s spending rows.

## Sharing & Permissions

### [Intermediate] View-only shared access can still move money (scope not enforced)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The shared dashboard renders a transfer form for viewers. Rendering is not the flaw — the endpoint accepts it.
  2. The server checks a grant EXISTS for the shared account, never what its scope allows.
  3. As Carol (view-only on Alice), POST /shared/2/transfer moving money from Alice’s account — it settles.

### [Intermediate] Share invite can be accepted by the wrong account
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Alice invited Bob by email with a token link. The accept endpoint checks the token — and nothing about who clicks it.
  2. An invite is bound to an email address in the data, but not in the code.
  3. Log in as Carol and open /shares/accept?token=inv-8f42c1 — the grant lands on Carol, not Bob.

### [Advanced] View-only grantee upgrades their own share to full control
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Alice granted Carol view-only access. The scope-change endpoint does not ask WHO is calling it.
  2. Only the grant’s owner should be able to change its scope. The server never checks.
  3. As Carol, POST /shares/1/scope with scope=full — your view-only grant becomes full control.

## Admin Panel

### [Intermediate] Admin user deletion via a simple GET link (CSRF)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The admin panel deletes users from a plain link — a state change riding on GET.
  2. GET requests need no token and no confirmation, so any page can fire one in an admin’s browser.
  3. As admin, visit /admin/delete?id=5 — the demo user is gone, no form, no token.

## Platform & API

### [Beginner] Unauthenticated API dumps every user including passwords
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. The JSON API has a users collection endpoint. Try it with no login at all.
  2. Debug-era endpoints tend to survive because nobody links to them.
  3. curl /api/users with no cookies — every account, email and password comes back as JSON.

### [Intermediate] API key derived from the email address (base64)
- **Objective:** Make the lab register this test as complete on the /tests page by performing the real exploit.
- **Hints:**
  1. Your API key is shown on the API docs page. Look at its structure — it is an encoding, not a secret.
  2. ftk_ plus base64 of… something you already know about every user.
  3. Compute base64('bob@hexafintech.local'), prefix ftk_, and call /api/accounts?userId=3 with that X-API-Key — Bob's accounts open.
