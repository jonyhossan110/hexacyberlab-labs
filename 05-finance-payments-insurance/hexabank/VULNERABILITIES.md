# HexaBank — Vulnerability Map (LAB 43)

Every entry below is a scored test in the lab's registry (26 tests, 8 features). Each flaw is real and working in the app, and the server detects the exploit itself when it succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.
- **Exploitation outline:** Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created.
- **Impact:** On a real bank this is catastrophic: one crafted login reaches the most privileged account in the system — every customer balance, statement and transfer function behind it.

### Brute Force — No Lockout or Throttle
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Without rate limiting or lockout, online password guessing is only a matter of time — credential lists make banking logins a prime target.
- **Exploitation outline:** Step by step: 1) Choose alice@hexabank.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.
- **Impact:** A real attacker can grind through password lists against customer logins undisturbed; every weak customer password becomes a drained account.

### Customer Enumeration via Password Reset
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Medium
- **What it is:** Different responses for existing vs non-existing accounts hand attackers a verified customer list to aim phishing and password attacks at.
- **Exploitation outline:** Step by step: 1) POST /forgot with alice@hexabank.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.
- **Impact:** Attackers harvest the bank's real customer emails from the reset form, then target exactly those people with phishing and credential stuffing.

### Default Admin Credentials
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.
- **Exploitation outline:** Step by step: 1) Go to the login page. 2) Sign in as admin@hexabank.local / admin123. 3) You are in as Platform Admin. The test completes on that login.
- **Impact:** The platform admin account — able to freeze customers and see everything — is protected by the first password every attacker tries.

### Predictable Password-Reset Token
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone's password.
- **Exploitation outline:** Step by step: 1) Request a reset for your own account and note the token shape BNK-<number>. 2) Reverse the formula: number = userId × 211 + 17. 3) POST /reset for teller@hexabank.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.
- **Impact:** An attacker who knows a victim's user ID — visible all over the app — can take over their bank account in one request, no email access needed.

### Session Cookie Role Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.
- **Exploitation outline:** Step by step: 1) Log in as any customer and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a customer account. The test completes.
- **Impact:** Every customer can promote themselves to admin by editing a cookie, reaching the panel that can freeze accounts and list every customer.

## Registration & Profile

### Weak Password Policy at Registration
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Medium
- **What it is:** Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.
- **Exploitation outline:** Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.
- **Impact:** Customers who choose weak passwords (many will) get accounts that fall to the first guessing attempt — and the bank wears the fraud losses.

### Mass Assignment — Self-Appointed Staff / Premium Tier
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Binding request bodies directly to data models lets attackers set privileged fields (role, tier, balance) that the UI never offered.
- **Exploitation outline:** Step by step: 1) Submit the registration form with extra fields role=staff or tier=premium added to the POST body. 2) Log in with the new account. 3) It carries the staff role / premium tier you assigned yourself. The test completes.
- **Impact:** Attackers mint themselves staff accounts or premium-tier accounts at will — insider access and fee-free premium banking without any approval.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.
- **Exploitation outline:** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.
- **Impact:** A customer plants script in their own name; when a teller or admin opens the customer list, the script runs in the bank's origin with their session.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Medium
- **What it is:** State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.
- **Exploitation outline:** Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.
- **Impact:** Any website a logged-in customer visits can silently rewrite their profile (name, phone) — the first step in social-engineering the bank's own support desk.

## Accounts & Statements

### Account Details IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Every object reference needs an ownership check; sequential IDs plus login-only checks expose every customer's accounts to every other customer.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) Open /accounts/201. 3) Bob's account details render for you. The test completes when a foreign account is served.
- **Impact:** Any customer can browse every other customer's balances — a full map of who holds what money at the bank, ready for targeted fraud.

### Statement IDOR — Read Another Customer's Statement
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Statements are among the most sensitive documents a bank holds; they need the same ownership enforcement as the account itself, on every route that produces them.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) Open /statement/201. 3) Bob's statement renders. The test completes when a foreign statement is served.
- **Impact:** Attackers harvest full transaction histories — employers, income, spending habits — perfect raw material for identity theft and convincing phishing.

### Statement CSV Export of Another Customer
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Export endpoints are high-value targets: they package sensitive data for bulk theft, and they are frequently left without the checks the UI pages got.
- **Exploitation outline:** Step by step: 1) Log in as any customer. 2) GET /export/statement.csv?account=301. 3) A CSV of Carol's transactions downloads. The test completes when a foreign statement is exported.
- **Impact:** One request per account id downloads the bank's entire customer statement history in machine-readable form — bulk data theft, scripted in minutes.

## Transfers

### Daily Transfer Limit Not Enforced
- **OWASP:** A04 Insecure Design · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Business limits must be enforced server-side at the moment of the transaction; a limit that exists only in page copy protects nothing.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) POST /transfer moving $6,000 from account 101 to account 102 (both hers). 3) The transfer completes despite the stated $5,000 daily limit. The test completes.
- **Impact:** A compromised customer account can be emptied in one transfer instead of being slowed by the daily cap — the limit was the bank's last line of defence.

### Negative-Amount Transfer Creates Money
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Financial inputs need strict validation (positive, within balance, within limits) before any ledger arithmetic runs; signed amounts invert the flow of money.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) POST /transfer with amount -500 from 101 to 102. 3) Account 101's balance increases by $500. The test completes when the negative transfer is applied.
- **Impact:** Customers mint money from nothing: a negative transfer credits the sender. At scale this is direct theft from the bank's own ledger.

### Transfer Out of Another Customer's Account
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Report severity:** Critical
- **What it is:** Ownership must be verified on the SOURCE of funds, not just the destination; form dropdowns are not authorisation.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) POST /transfer with from=201, to=101, amount=100, including the _origin marker from the form. 3) $100 leaves Bob's account for Alice's. The test completes.
- **Impact:** Any customer can move money out of any other customer's account into their own. This is the single most direct theft a banking app can allow.

### CSRF on Fund Transfer
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** If transfers can be triggered cross-site, any page a customer visits while logged in can move their money; anti-CSRF verification must be strictest on financial actions.
- **Exploitation outline:** Step by step: 1) While logged in as Alice, POST /transfer directly with curl — own accounts, $10, and no _origin field. 2) The transfer is applied. 3) The test completes when a marker-less transfer moves money.
- **Impact:** A malicious link or ad silently transfers funds out of a logged-in customer's account — no password, no interaction beyond a page view.

## Payees

### Delete Another Customer's Payee
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** Medium
- **What it is:** Destructive actions on user-owned objects need the same ownership check as reads; otherwise attackers vandalise or sabotage other customers' banking setup.
- **Exploitation outline:** Step by step: 1) Log in as Bob. 2) POST /payees/1/delete. 3) Payee 1 (owned by Alice) is deleted. The test completes when a foreign payee is removed.
- **Impact:** Attackers wipe a victim's saved payees — rent, salary and supplier payments fail, and a fake replacement payee can be planted in the confusion.

### Stored XSS in Payee Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Any free-text field that is displayed later is a stored-XSS candidate; payee names are shown to the owner and to staff reviewing payments.
- **Exploitation outline:** Step by step: 1) Log in and open /payees. 2) Add a payee with the name <script>alert(1)</script>. 3) It is stored and reflected unescaped in the list. The test completes.
- **Impact:** A scripted payee name fires in the browser of anyone reviewing the payments — including tellers — inside the bank's trusted origin.

## Loans

### Loan Summary IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Loan records reveal income stress, debts and assets; they require the same per-object ownership checks as accounts and statements.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) Open /loans/2. 3) Bob's loan summary renders for you. The test completes when a foreign loan is served.
- **Impact:** Customers can map each other's debts — who is over-extended, who just borrowed — prime material for scams and extortion.

### Customer Rewrites Own Loan Interest Rate
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Hiding a control in the UI is not authorisation; privileged mutations must check the caller's role server-side on every request.
- **Exploitation outline:** Step by step: 1) Log in as Alice (a customer). 2) POST /loans/1/rate with rate=0.1. 3) The rate on her home loan changes. The test completes when a customer successfully adjusts a loan rate.
- **Impact:** Borrowers set their own interest rate to near zero — direct revenue theft from the bank, hidden inside a legitimate-looking staff function.

## Staff & Admin Panel

### Customers Reach the Staff Console
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Role checks must be explicit on every restricted route; "logged in" is not "authorised", especially on staff tooling.
- **Exploitation outline:** Step by step: 1) Log in as an ordinary customer (Alice). 2) Open /staff. 3) The staff console renders with all customers and accounts. The test completes.
- **Impact:** Every customer can open the staff console and browse the bank's entire customer and account list — the reconnaissance jackpot for fraud.

### Reflected XSS in Staff Customer Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Reflected input must be output-encoded; search boxes on internal tools are a reliable way to fire script inside a staff member's session.
- **Exploitation outline:** Step by step: 1) While logged in, open /staff/search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.
- **Impact:** An attacker sends a teller a crafted search link; the script runs as the teller, inside the staff console, with staff powers attached.

### CSRF on Admin Account Freeze
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.
- **Exploitation outline:** Step by step: 1) Hold an admin session (real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/4/freeze with no _origin field. 3) Bob's account is frozen. The test completes when the marker-less freeze is applied.
- **Impact:** A booby-trapped page freezes customers en masse while the admin browses — a denial-of-service against the bank's whole customer base.

## Platform & API

### Predictable API Token & Unscoped Account API
- **OWASP:** A07 Authentication Failures · **Difficulty:** Advanced · **Report severity:** Critical
- **What it is:** API credentials must be high-entropy and random, and every API response must be scoped to the authenticated customer; a derived token plus an unscoped query is total exposure.
- **Exploitation outline:** Step by step: 1) See your own token pattern on /profile: hb_ + base64(your email). 2) Derive Carol's token from carol@hexabank.local the same way. 3) GET /api/accounts with that X-API-Key. 4) Accounts belonging to other customers are included. The test completes.
- **Impact:** Anyone who knows a customer's email (public) owns their API access — and the API hands over every customer's accounts and balances, not just theirs.

### Debug Endpoint Dumps Customer Passwords
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.
- **Exploitation outline:** Step by step: 1) Log in as any ordinary customer. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.
- **Impact:** One click hands an attacker every customer's and staff member's password in clear text — total bank-wide account takeover.

