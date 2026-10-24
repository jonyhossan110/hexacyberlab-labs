# HexaInvest — Practice Guide (LAB 45)

25 challenges across 8 features. Work in the app, track progress on /tests, and ask the Lab Coach for step-by-step help only after 3 genuine attempts on a feature.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The login builds its database query by gluing your email and password straight into the SQL string.
  2. Try closing the email string early and adding a condition that is always true, e.g. an OR clause.
  3. Use alice@test.local' OR '1'='1 as the email (any password) — the concatenated query matches a row without knowing the password.
- **Lesson:** String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries make the input data, never code.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Nothing slows you down when a password guess fails.
  2. Write down what happens after the 5th wrong password for alice@test.local. Then keep going.
  3. Submit 10 wrong passwords for the same account — the 10th is still processed normally; there is no throttle, CAPTCHA or lockout.
- **Lesson:** Unlimited password guesses turn a weak password into a timed break-in; throttling and lockout are part of authentication, not extras.

### [Beginner] User enumeration via login error messages
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Compare the login error for an email that exists with one that does not.
  2. alice@test.local with a wrong password answers differently from ghost@nowhere.test.
  3. The app says 'No account found for that email.' for strangers but 'Incorrect password.' for real accounts — a free list of valid investors.
- **Lesson:** Different error messages for 'no such user' vs 'wrong password' hand attackers a verified target list before they guess a single password.

### [Beginner] Default administrator credentials
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Every platform ships with a first admin account. This one was never changed.
  2. The admin mailbox follows the lab naming pattern: admin@hexainvest.local.
  3. Log in as admin@hexainvest.local with the password admin123 — the seeded default still works.
- **Lesson:** Default credentials are public knowledge; a setup password that is never rotated is an open door with a welcome mat.

### [Intermediate] Predictable password-reset token
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Request a password reset for your own account from /forgot and study the pattern the token must follow (your investor number is on your profile).
  2. The token is not random at all — it is built from your account number.
  3. Tokens look like INV followed by 1000 + your user id (investor #2 -> INV1002). Compute another account's token and use it on /reset.
- **Lesson:** Reset tokens must be unguessable random values; a token derived from a public identifier is just a second, weaker password.

### [Intermediate] Role stored in a client cookie (session tampering)
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. After login, inspect the cookies the app sets — one of them describes who you are.
  2. The hx_role cookie mirrors your account role, and the admin gate trusts it.
  3. Change hx_role to admin in your browser and open /admin — the server believes the cookie instead of its own records.
- **Lesson:** Authorization data must live server-side; anything the client can edit — cookies included — will be edited.

## Registration & Profile

### [Beginner] Weak password policy (1-character passwords)
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Register a throwaway account and see how little password the form accepts.
  2. There is no minimum length or complexity check at all.
  3. Register with the password 'a' — the account is created and you are logged in.
- **Lesson:** A password policy is the floor under every other control; without one, brute force and guessing become trivial.

### [Beginner] Stored XSS in display name
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Your display name is printed in the header of every page. Check whether it is escaped.
  2. Save a display name that contains HTML and view any page.
  3. Set your display name to <script>alert(1)</script> on /profile — it is stored and rendered unescaped in the page header.
- **Lesson:** Any user-controlled text rendered without output encoding becomes persistent JavaScript in other users' browsers.

### [Intermediate] Mass assignment — role & balance settable at signup
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The registration handler copies every submitted field onto the new account object — including fields the form never shows.
  2. Add extra form fields to the signup request and see which ones stick.
  3. POST /register with additional fields role=admin and balance=999999 — the new account is created as an admin with a fortune.
- **Lesson:** Binding request bodies directly to data models lets clients write fields that were never meant for them; allow-list input fields explicitly.

### [Intermediate] CSRF on profile update
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The profile form changes server state with no anti-CSRF token.
  2. A POST that arrives from a different Origin is still applied.
  3. While logged in, POST /profile with header Origin: https://evil.example and a new displayName — the change is accepted with no token check.
- **Lesson:** State-changing requests need an unguessable per-session token; cookies alone are sent by the browser for any site that asks.

## Portfolio

### [Beginner] Portfolio IDOR — view any investor’s holdings
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Your portfolio lives at /portfolio/<your id>. What stops you changing the number?
  2. Nothing checks that the portfolio you ask for is yours.
  3. Open /portfolio/3 while logged in as investor #2 — Bob's holdings, cash and total value are served in full.
- **Lesson:** Every object reference needs an ownership check on the server; hiding a link is not access control.

### [Beginner] Trade-history IDOR — another investor’s transactions
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Under each portfolio there is a transactions view with the same numbering pattern.
  2. The /transactions sub-page performs the same missing ownership check.
  3. Open /portfolio/3/transactions as investor #2 to read Bob's complete trade history.
- **Lesson:** Access control must be applied per route, not per page — sub-resources inherit the sensitivity of the parent object.

## Trading & Orders

### [Beginner] Orders fill beyond available balance
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Compare your cash with the cost of a very large buy order.
  2. The execution path never checks whether you can pay.
  3. As Bob (cash 25,000), buy 200 QNTM at the market price (~46,000) — the order fills and the balance goes negative.
- **Lesson:** Funds checks must happen atomically at execution; a balance that can go negative is a credit line nobody approved.

### [Intermediate] Order price tampering — buy at your own price
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The trade form posts more than symbol and quantity. Watch the full request.
  2. A price field travels with the order — and the server trusts it.
  3. POST /trade with symbol=NOVA, side=buy, qty=10 and price=0.01 — the order fills at one cent instead of the market price.
- **Lesson:** Prices are server-side truth; anything the client sends about money must be recomputed, never trusted.

### [Intermediate] Negative-quantity trade credits cash
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Quantity is multiplied straight into the total. What does a negative total do to a buy?
  2. The form accepts values the number input would never offer.
  3. POST /trade with side=buy, qty=-10 — the 'purchase' adds cash to your balance and subtracts shares.
- **Lesson:** Quantities need range validation (positive, sane bounds); sign errors in financial math create money from nothing.

### [Intermediate] Cancel another investor’s order (order IDOR)
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Order ids are sequential and shown in the orders list. Cancelling reverses a trade.
  2. The cancel endpoint never asks whose order it is.
  3. POST /orders/1003/cancel as a different investor — Alice's filled trade is reversed and her balance/holdings change.
- **Lesson:** Mutating endpoints need the same ownership checks as read endpoints — a cancel is a financial transaction in reverse.

### [Advanced] Unsigned price-feed override moves the market
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The market page reads prices from /api/price. That endpoint accepts more than a symbol.
  2. An extra query parameter is treated as a signed feed update — but nothing signs it.
  3. GET /api/price?symbol=HEXA&set=0.01 — the live market price for HEXA changes for everyone.
- **Lesson:** Market data is a trust boundary; feed updates need authentication and integrity checks exactly like payments do.

## Watchlist

### [Beginner] Stored XSS in watchlist note
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Watchlist notes are rendered back on the watchlist page. Check the encoding.
  2. Add a note containing HTML and reload the page.
  3. Add a watchlist entry with note <script>alert(1)</script> — it is stored and executed when the watchlist renders.
- **Lesson:** Notes and comments are code to a browser unless they are encoded; every free-text field is an XSS candidate.

### [Beginner] Watchlist IDOR — read any investor’s watchlist
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Watchlists are addressed by investor number, like portfolios.
  2. The ownership check is missing here too.
  3. Open /watchlist/3 as investor #2 to read Bob's watchlist and his private notes.
- **Lesson:** Consistent server-side authorization has to cover every feature, not only the ones that look financial.

## Reports & Exports

### [Intermediate] Report export IDOR — download any investor’s report
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Your performance report can be exported as CSV. The export URL carries an investor number.
  2. Exports are the most commonly forgotten authorization check.
  3. GET /report/3/export.csv as investor #2 downloads Bob's full performance report.
- **Lesson:** Exports concentrate sensitive data into one file; they need the strictest ownership checks, not the weakest.

### [Intermediate] Bulk export leaks every investor’s report
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The export endpoint understands a scope parameter meant for administrators.
  2. Nothing verifies that the requester is an administrator.
  3. GET /report/export?scope=all as a normal investor returns a CSV with every investor's report.
- **Lesson:** Administrative bulk features must check the caller's role server-side on every request, not rely on the UI hiding them.

## Admin Panel

### [Intermediate] Admin user API served to any logged-in investor
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. There is an API twin of the admin user list under /api/admin/.
  2. It checks that you are logged in — but not that you are an admin.
  3. As a normal investor, GET /api/admin/users returns every account including passwords.
- **Lesson:** APIs need the same role checks as pages; 'logged in' is authentication, not authorization.

### [Advanced] CSRF on admin balance credit
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The admin credit action changes balances with a bare POST — no token anywhere in the admin panel.
  2. A cross-site Origin on that POST is not rejected.
  3. As admin, POST /admin/credit with Origin: https://evil.example, an investor email and an amount — the balance changes. A page the admin visits could do the same.
- **Lesson:** Admin actions are the highest-value CSRF targets; tokens and SameSite cookies are mandatory there first.

## Platform & API

### [Beginner] Debug endpoint dumps the whole platform state
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. Development leftovers love predictable paths under /api/.
  2. One endpoint returns the server's entire in-memory state for 'debugging'.
  3. GET /api/debug — users (with passwords), orders and the price feed, no login required.
- **Lesson:** Debug and diagnostic endpoints must never ship to production; if they must exist, they need authentication and network restrictions.

### [Intermediate] API token is just the base64 of the email
- **Objective:** perform the exploit so the server records the real effect (progress on /tests flips to done).
- **Hints:**
  1. The JSON API authenticates with a token parameter. Tokens are derived, not random.
  2. Take an investor's email and transform it the simplest way an API might.
  3. GET /api/portfolio?token=<base64 of alice@test.local> returns Alice's portfolio with no session at all.
- **Lesson:** Tokens must be unguessable random secrets; encoding is not encryption and derivation from public data is not authentication.
