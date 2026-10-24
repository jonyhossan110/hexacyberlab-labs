# HexaBank — Practice Guide (LAB 43)

26 hands-on challenges, grouped by feature and ordered by difficulty inside each feature. Every challenge is measured by the server detecting the real exploit — there is no "mark done" button. Stuck? Reveal the graded hints one at a time (they are also on the /tests page), or try the feature at least 3 times and ask the Lab Coach for step-by-step help.

## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.
- **Hints:**
  1. The online-banking login still talks to a legacy sign-on service that builds its query by gluing your email into a string.
  2. A tautology in the email field makes the WHERE clause true for the very first row in the user table — who sits in row 1 of a bank's user table?
  3. Log in with the email: ' OR '1'='1' --  and any password.
- **Walkthrough:** Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created.

### Brute Force — No Lockout or Throttle (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Without rate limiting or lockout, online password guessing is only a matter of time — credential lists make banking logins a prime target.
- **Hints:**
  1. Pick one customer account and keep guessing its password. Does anything slow down, CAPTCHA, or lock after repeated failures?
  2. Banks are supposed to lock or throttle after a handful of failures. Count how many this one accepts.
  3. Submit 10 wrong-password logins for alice@hexabank.local — the 10th is still processed normally.
- **Walkthrough:** Step by step: 1) Choose alice@hexabank.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.

### Customer Enumeration via Password Reset (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Different responses for existing vs non-existing accounts hand attackers a verified customer list to aim phishing and password attacks at.
- **Hints:**
  1. Use "Forgot password" twice: once with an email that has an account, once with one that does not. Compare the two answers word for word.
  2. A safe reset flow answers identically either way. This one does not.
  3. Request a reset for alice@hexabank.local, then for nobody@nowhere.local — the different messages confirm which emails are real bank customers.
- **Walkthrough:** Step by step: 1) POST /forgot with alice@hexabank.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.

### Default Admin Credentials (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.
- **Hints:**
  1. Somewhere in this bank there is an administrative account that was never given a real password.
  2. Try the most common admin password in the world against the admin mailbox.
  3. Log in as admin@hexabank.local with the password admin123.
- **Walkthrough:** Step by step: 1) Go to the login page. 2) Sign in as admin@hexabank.local / admin123. 3) You are in as Platform Admin. The test completes on that login.

### Predictable Password-Reset Token (Intermediate · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone's password.
- **Hints:**
  1. Request a reset for your own account and study the token format — it is computed, not random.
  2. The token is a simple arithmetic function of the customer's numeric user ID.
  3. Token = BNK-(userId × 211 + 17). The teller is user 2 — compute their token and reset their password without ever requesting a reset for them.
- **Walkthrough:** Step by step: 1) Request a reset for your own account and note the token shape BNK-<number>. 2) Reverse the formula: number = userId × 211 + 17. 3) POST /reset for teller@hexabank.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.

### Session Cookie Role Tampering (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.
- **Hints:**
  1. Your session cookie is just base64 JSON — decode it and read what it claims about you.
  2. The admin panel trusts the role written inside the cookie instead of the role stored on your account.
  3. Decode hx_sess, change "role" to "admin", re-encode, and open /admin as an ordinary customer.
- **Walkthrough:** Step by step: 1) Log in as any customer and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a customer account. The test completes.

## Registration & Profile

### Weak Password Policy at Registration (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.
- **Hints:**
  1. Open a new online-banking account and try the shortest, simplest password the form will accept.
  2. A bank should demand length and complexity. This one demands almost nothing.
  3. Register with the password "abc" — it is accepted.
- **Walkthrough:** Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.

### Stored XSS in Display Name (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.
- **Hints:**
  1. Your display name is printed back on pages other people see — including staff. Is it escaped anywhere?
  2. Set your name to something that is not just text.
  3. Save your profile with the display name <script>alert(1)</script> — it is stored and reflected raw.
- **Walkthrough:** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.

### Mass Assignment — Self-Appointed Staff / Premium Tier (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Binding request bodies directly to data models lets attackers set privileged fields (role, tier, balance) that the UI never offered.
- **Hints:**
  1. The registration handler copies every submitted field onto the new account record — including fields the form never shows.
  2. What fields does a bank account record have that you should never control? Think role and tier.
  3. Register while adding the extra form fields role=staff (or tier=premium) — the new account is created with them.
- **Walkthrough:** Step by step: 1) Submit the registration form with extra fields role=staff or tier=premium added to the POST body. 2) Log in with the new account. 3) It carries the staff role / premium tier you assigned yourself. The test completes.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.
- **Hints:**
  1. The profile form carries a hidden _origin marker that ties the submit to this site. What happens if a POST arrives without it?
  2. Nothing checks the marker on the server.
  3. POST /profile with a new name and NO _origin field — the change is applied anyway.
- **Walkthrough:** Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.

## Accounts & Statements

### Account Details IDOR (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Every object reference needs an ownership check; sequential IDs plus login-only checks expose every customer's accounts to every other customer.
- **Hints:**
  1. Your account pages live at /accounts/<id>. The ids are small sequential numbers.
  2. The page checks that you are logged in — but does it check the account is yours?
  3. Log in as Alice (accounts 101/102) and open /accounts/201 — Bob's savings account, balance and all.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) Open /accounts/201. 3) Bob's account details render for you. The test completes when a foreign account is served.

### Statement IDOR — Read Another Customer's Statement (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Statements are among the most sensitive documents a bank holds; they need the same ownership enforcement as the account itself, on every route that produces them.
- **Hints:**
  1. Statements live at /statement/<accountId> and follow the same pattern as the account pages.
  2. A statement is far richer than a balance: every transaction, salary credit and payment.
  3. As Alice, open /statement/201 — Bob's full transaction history.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) Open /statement/201. 3) Bob's statement renders. The test completes when a foreign statement is served.

### Statement CSV Export of Another Customer (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Export endpoints are high-value targets: they package sensitive data for bulk theft, and they are frequently left without the checks the UI pages got.
- **Hints:**
  1. The CSV export at /export/statement.csv?account=<id> was built for staff convenience and forgotten.
  2. It takes the account id straight from the query string.
  3. As any customer, request /export/statement.csv?account=301 — Carol's statement downloads as CSV.
- **Walkthrough:** Step by step: 1) Log in as any customer. 2) GET /export/statement.csv?account=301. 3) A CSV of Carol's transactions downloads. The test completes when a foreign statement is exported.

## Transfers

### Daily Transfer Limit Not Enforced (Beginner · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Business limits must be enforced server-side at the moment of the transaction; a limit that exists only in page copy protects nothing.
- **Hints:**
  1. The transfer page proudly states a $5,000 daily online limit. Policies printed in HTML are not controls.
  2. Try sending more than the limit in a single transfer between your own accounts.
  3. As Alice, transfer $6,000 from HB-100101 to HB-100102 — it goes through.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) POST /transfer moving $6,000 from account 101 to account 102 (both hers). 3) The transfer completes despite the stated $5,000 daily limit. The test completes.

### Negative-Amount Transfer Creates Money (Intermediate · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Financial inputs need strict validation (positive, within balance, within limits) before any ledger arithmetic runs; signed amounts invert the flow of money.
- **Hints:**
  1. The amount field is trusted arithmetic. What does "transfer -$500" do to each side of the ledger?
  2. Nobody validates that the amount is positive.
  3. POST /transfer with amount -500 between your own accounts — the source balance goes UP.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) POST /transfer with amount -500 from 101 to 102. 3) Account 101's balance increases by $500. The test completes when the negative transfer is applied.

### CSRF on Fund Transfer (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — If transfers can be triggered cross-site, any page a customer visits while logged in can move their money; anti-CSRF verification must be strictest on financial actions.
- **Hints:**
  1. The transfer form carries the _origin marker — but does the money-moving endpoint actually verify it?
  2. A transfer is the most sensitive POST in the app. Test it the same way as the profile.
  3. POST /transfer (small amount, your own accounts) with NO _origin field — the money still moves.
- **Walkthrough:** Step by step: 1) While logged in as Alice, POST /transfer directly with curl — own accounts, $10, and no _origin field. 2) The transfer is applied. 3) The test completes when a marker-less transfer moves money.

### Transfer Out of Another Customer's Account (Advanced · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Ownership must be verified on the SOURCE of funds, not just the destination; form dropdowns are not authorisation.
- **Hints:**
  1. The transfer form only OFFERS your own accounts in the dropdown — but the server accepts whatever "from" id is posted.
  2. The server never checks that the source account belongs to the logged-in customer.
  3. As Alice, POST /transfer with from=201 (Bob's account) to=101 amount=100 — Bob pays.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) POST /transfer with from=201, to=101, amount=100, including the _origin marker from the form. 3) $100 leaves Bob's account for Alice's. The test completes.

## Payees

### Delete Another Customer's Payee (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Destructive actions on user-owned objects need the same ownership check as reads; otherwise attackers vandalise or sabotage other customers' banking setup.
- **Hints:**
  1. Payee delete posts to /payees/<id>/delete. Payee ids are sequential, starting at 1.
  2. The handler deletes first and never asks whose payee it was.
  3. As Bob, delete payee 1 — Alice's payee "Bob Hossain" disappears from HER list.
- **Walkthrough:** Step by step: 1) Log in as Bob. 2) POST /payees/1/delete. 3) Payee 1 (owned by Alice) is deleted. The test completes when a foreign payee is removed.

### Stored XSS in Payee Name (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — Any free-text field that is displayed later is a stored-XSS candidate; payee names are shown to the owner and to staff reviewing payments.
- **Hints:**
  1. Payee names render in your payee list and in staff views. They are stored exactly as typed.
  2. A payee name does not have to be a name.
  3. Add a payee named <script>alert(1)</script> — it is stored and rendered raw.
- **Walkthrough:** Step by step: 1) Log in and open /payees. 2) Add a payee with the name <script>alert(1)</script>. 3) It is stored and reflected unescaped in the list. The test completes.

## Loans

### Loan Summary IDOR (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Loan records reveal income stress, debts and assets; they require the same per-object ownership checks as accounts and statements.
- **Hints:**
  1. Loan pages live at /loans/<id> with the usual small sequential ids.
  2. Your loan summary shows principal, rate and repayments — would you want another customer reading yours?
  3. As Alice (loan 1), open /loans/2 — Bob's personal loan in full.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) Open /loans/2. 3) Bob's loan summary renders for you. The test completes when a foreign loan is served.

### Customer Rewrites Own Loan Interest Rate (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Hiding a control in the UI is not authorisation; privileged mutations must check the caller's role server-side on every request.
- **Hints:**
  1. The loan page carries a "staff adjustment" form for the interest rate. The form is visible on the page — but who is allowed to USE it?
  2. The endpoint never checks that the caller is staff.
  3. As Alice, POST /loans/1/rate with rate=0.1 — your home loan now costs almost nothing.
- **Walkthrough:** Step by step: 1) Log in as Alice (a customer). 2) POST /loans/1/rate with rate=0.1. 3) The rate on her home loan changes. The test completes when a customer successfully adjusts a loan rate.

## Staff & Admin Panel

### Customers Reach the Staff Console (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Role checks must be explicit on every restricted route; "logged in" is not "authorised", especially on staff tooling.
- **Hints:**
  1. There is a staff console at /staff listing every customer and account. It checks that SOMEONE is logged in.
  2. It never checks that the someone is staff.
  3. Log in as any customer and open /staff — the full customer list renders.
- **Walkthrough:** Step by step: 1) Log in as an ordinary customer (Alice). 2) Open /staff. 3) The staff console renders with all customers and accounts. The test completes.

### Reflected XSS in Staff Customer Search (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — Reflected input must be output-encoded; search boxes on internal tools are a reliable way to fire script inside a staff member's session.
- **Hints:**
  1. The staff customer search echoes your query into the results page: "Results for …".
  2. Echoed input that is not encoded is reflected XSS.
  3. Open /staff/search?q=<script>alert(1)</script> — the payload comes back raw in the page.
- **Walkthrough:** Step by step: 1) While logged in, open /staff/search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.

### CSRF on Admin Account Freeze (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.
- **Hints:**
  1. The admin panel can freeze a customer's login with one POST. The form's _origin marker is, again, never verified.
  2. If you hold an admin session (see the cookie test), a marker-less POST will still freeze the account.
  3. As admin, POST /admin/users/4/freeze with no _origin — Bob is frozen out of his account.
- **Walkthrough:** Step by step: 1) Hold an admin session (real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/4/freeze with no _origin field. 3) Bob's account is frozen. The test completes when the marker-less freeze is applied.

## Platform & API

### Debug Endpoint Dumps Customer Passwords (Beginner · A05 Security Misconfiguration)
- **Objective:** make the server register this exploit by its real effect — Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.
- **Hints:**
  1. A leftover /debug endpoint answers any logged-in user with the bank's internal state.
  2. Internal state here includes the full user table — passwords in plain text.
  3. Log in as any customer and open /debug.
- **Walkthrough:** Step by step: 1) Log in as any ordinary customer. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.

### Predictable API Token & Unscoped Account API (Advanced · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — API credentials must be high-entropy and random, and every API response must be scoped to the authenticated customer; a derived token plus an unscoped query is total exposure.
- **Hints:**
  1. Your profile page shows your API token. Look at its shape: hb_ plus base64 of something you already know.
  2. If tokens are derived from email addresses, every customer's token is public knowledge. And the API does not scope its answer.
  3. Compute the token for carol@hexabank.local and call GET /api/accounts with header X-API-Key — accounts from every customer come back.
- **Walkthrough:** Step by step: 1) See your own token pattern on /profile: hb_ + base64(your email). 2) Derive Carol's token from carol@hexabank.local the same way. 3) GET /api/accounts with that X-API-Key. 4) Accounts belonging to other customers are included. The test completes.

