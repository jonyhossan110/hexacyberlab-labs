# HexaInvest — Vulnerability Map (LAB 45)

Complete registry of the 25 scored security tests, grouped by feature. Every item is a real, working flaw in the app; each is detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** Use alice@test.local' OR '1'='1 as the email (any password) — the concatenated query matches a row without knowing the password.
- **Impact:** On a real investment platform this is full account takeover with no password at all — portfolios, balances and personal data of any investor are exposed.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** Submit 10 wrong passwords for the same account — the 10th is still processed normally; there is no throttle, CAPTCHA or lockout.
- **Impact:** Attackers can grind through password lists against real investor accounts; combined with credential stuffing this quietly drains accounts.

### User enumeration via login error messages
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** The app says 'No account found for that email.' for strangers but 'Incorrect password.' for real accounts — a free list of valid investors.
- **Impact:** Enumerated investor emails feed phishing and credential-stuffing campaigns aimed at people known to hold money on the platform.

### Default administrator credentials
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** Log in as admin@hexainvest.local with the password admin123 — the seeded default still works.
- **Impact:** One guessed default login gives an attacker the whole platform: every investor, every balance, and the market controls.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** Tokens look like INV followed by 1000 + your user id (investor #2 -> INV1002). Compute another account's token and use it on /reset.
- **Impact:** Anyone who knows an investor's account number can reset their password and take over the account — no inbox access needed.

### Role stored in a client cookie (session tampering)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Login & Authentication flows of the HexaInvest simulator.
- **Exploitation outline:** Change hx_role to admin in your browser and open /admin — the server believes the cookie instead of its own records.
- **Impact:** Any investor can promote themselves to platform admin by editing a cookie, reaching user management and balance controls.

## Registration & Profile (4)

### Weak password policy (1-character passwords)
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Registration & Profile flows of the HexaInvest simulator.
- **Exploitation outline:** Register with the password 'a' — the account is created and you are logged in.
- **Impact:** Investors who pick short passwords are cracked in seconds, and the platform cannot claim it enforced even basic hygiene.

### Mass assignment — role & balance settable at signup
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile flows of the HexaInvest simulator.
- **Exploitation outline:** POST /register with additional fields role=admin and balance=999999 — the new account is created as an admin with a fortune.
- **Impact:** Attackers mint admin accounts with huge simulated balances at signup, corrupting the market and every report built on it.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Registration & Profile flows of the HexaInvest simulator.
- **Exploitation outline:** Set your display name to <script>alert(1)</script> on /profile — it is stored and rendered unescaped in the page header.
- **Impact:** A poisoned display name can fire in the admin's browser during user review, stealing sessions and acting with admin rights.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile flows of the HexaInvest simulator.
- **Exploitation outline:** While logged in, POST /profile with header Origin: https://evil.example and a new displayName — the change is accepted with no token check.
- **Impact:** A malicious page visited by a logged-in investor can silently rewrite their profile — the classic first step to account-recovery abuse.

## Portfolio (2)

### Portfolio IDOR — view any investor’s holdings
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Portfolio flows of the HexaInvest simulator.
- **Exploitation outline:** Open /portfolio/3 while logged in as investor #2 — Bob's holdings, cash and total value are served in full.
- **Impact:** Competitors or attackers can map exactly what every investor owns and what they paid — prime material for targeted fraud.

### Trade-history IDOR — another investor’s transactions
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Portfolio flows of the HexaInvest simulator.
- **Exploitation outline:** Open /portfolio/3/transactions as investor #2 to read Bob's complete trade history.
- **Impact:** Full trade histories reveal an investor's strategy and timing, enabling front-running and highly convincing social engineering.

## Trading & Orders (5)

### Order price tampering — buy at your own price
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where:** the Trading & Orders flows of the HexaInvest simulator.
- **Exploitation outline:** POST /trade with symbol=NOVA, side=buy, qty=10 and price=0.01 — the order fills at one cent instead of the market price.
- **Impact:** Investors could buy assets for almost nothing, destroying market integrity and every other participant's portfolio value.

### Negative-quantity trade credits cash
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where:** the Trading & Orders flows of the HexaInvest simulator.
- **Exploitation outline:** POST /trade with side=buy, qty=-10 — the 'purchase' adds cash to your balance and subtracts shares.
- **Impact:** Unlimited free cash from negative orders breaks the simulator's economy and, in a real brokerage, would be direct theft.

### Orders fill beyond available balance
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner
- **Where:** the Trading & Orders flows of the HexaInvest simulator.
- **Exploitation outline:** As Bob (cash 25,000), buy 200 QNTM at the market price (~46,000) — the order fills and the balance goes negative.
- **Impact:** Investors could acquire positions they cannot pay for, leaving the platform holding unrecoverable losses.

### Cancel another investor’s order (order IDOR)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Trading & Orders flows of the HexaInvest simulator.
- **Exploitation outline:** POST /orders/1003/cancel as a different investor — Alice's filled trade is reversed and her balance/holdings change.
- **Impact:** An attacker can unwind competitors' profitable trades after the fact, rewriting market history in their favour.

### Unsigned price-feed override moves the market
- **OWASP:** A08:2021 Software & Data Integrity Failures · **Difficulty:** Advanced
- **Where:** the Trading & Orders flows of the HexaInvest simulator.
- **Exploitation outline:** GET /api/price?symbol=HEXA&set=0.01 — the live market price for HEXA changes for everyone.
- **Impact:** Whoever moves the feed price can buy the whole market at a cent and sell back at real prices — total market manipulation.

## Watchlist (2)

### Stored XSS in watchlist note
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Watchlist flows of the HexaInvest simulator.
- **Exploitation outline:** Add a watchlist entry with note <script>alert(1)</script> — it is stored and executed when the watchlist renders.
- **Impact:** Stored payloads in shared or admin-reviewed watchlists can hijack sessions of anyone who views them.

### Watchlist IDOR — read any investor’s watchlist
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Watchlist flows of the HexaInvest simulator.
- **Exploitation outline:** Open /watchlist/3 as investor #2 to read Bob's watchlist and his private notes.
- **Impact:** Private watchlists leak an investor's intentions before they trade — valuable, tradeable intelligence.

## Reports & Exports (2)

### Report export IDOR — download any investor’s report
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Reports & Exports flows of the HexaInvest simulator.
- **Exploitation outline:** GET /report/3/export.csv as investor #2 downloads Bob's full performance report.
- **Impact:** One URL pattern hands out every investor's complete financial report — cash, holdings, profit and loss — in bulk-friendly CSV.

### Bulk export leaks every investor’s report
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Reports & Exports flows of the HexaInvest simulator.
- **Exploitation outline:** GET /report/export?scope=all as a normal investor returns a CSV with every investor's report.
- **Impact:** A single request exfiltrates the entire investor base's financial data — a reportable breach in any real deployment.

## Admin Panel (2)

### Admin user API served to any logged-in investor
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Admin Panel flows of the HexaInvest simulator.
- **Exploitation outline:** As a normal investor, GET /api/admin/users returns every account including passwords.
- **Impact:** Full credential dump for every account — attackers log in as anyone, including the real admin, afterwards.

### CSRF on admin balance credit
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Where:** the Admin Panel flows of the HexaInvest simulator.
- **Exploitation outline:** As admin, POST /admin/credit with Origin: https://evil.example, an investor email and an amount — the balance changes. A page the admin visits could do the same.
- **Impact:** A booby-trapped page an admin opens can credit arbitrary accounts, laundering value through the platform invisibly.

## Platform & API (2)

### API token is just the base64 of the email
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Platform & API flows of the HexaInvest simulator.
- **Exploitation outline:** GET /api/portfolio?token=<base64 of alice@test.local> returns Alice's portfolio with no session at all.
- **Impact:** Anyone who knows an investor's email — public information — owns API access to their portfolio.

### Debug endpoint dumps the whole platform state
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Where:** the Platform & API flows of the HexaInvest simulator.
- **Exploitation outline:** GET /api/debug — users (with passwords), orders and the price feed, no login required.
- **Impact:** A single unauthenticated request exposes every credential and position on the platform — the worst data leak in this lab.
