# HexaAgri — Practice Guide (LAB 105)

Challenges grouped by feature, then difficulty. A challenge is complete when the app records the exploit's real effect — watch your progress on /tests.

## Login & Authentication

### [Beginner] No Brute-Force Protection on Login
- **Objective:** Demonstrate the flaw — No Brute-Force Protection on Login — so its real effect happens in the app.
- **Hint 1:** Notice what happens after many wrong passwords — nothing slows down or locks.
- **Hint 2:** The app never counts failures per account.
- **Hint 3:** Submit 10+ wrong passwords for alice@greenvalley.local; the 10th is still processed normally.

### [Beginner] User Enumeration via Login & Password Reset
- **Objective:** Demonstrate the flaw — User Enumeration via Login & Password Reset — so its real effect happens in the app.
- **Hint 1:** Compare the error message for an email that exists with one that does not.
- **Hint 2:** The forgot-password flow answers differently too — try both.
- **Hint 3:** Probe at least 5 different emails across login/forgot; the responses tell you which accounts are real.

### [Beginner] Published Demo Account With Default Password
- **Objective:** Demonstrate the flaw — Published Demo Account With Default Password — so its real effect happens in the app.
- **Hint 1:** Read the login page carefully — it advertises a demo account.
- **Hint 2:** Demo accounts in production keep their factory password.
- **Hint 3:** Sign in with the nursery demo credentials printed on the login page.

### [Intermediate] SQL Injection Login Bypass
- **Objective:** Demonstrate the flaw — SQL Injection Login Bypass — so its real effect happens in the app.
- **Hint 1:** The login form builds its database query by gluing your input straight into the query string.
- **Hint 2:** Try a quote in the email field, then close the quote and add a condition that is always true.
- **Hint 3:** Use email: ' OR '1'='1' -- (with any password) — the -- comments out the password check.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Demonstrate the flaw — Predictable Password-Reset Token — so its real effect happens in the app.
- **Hint 1:** Request a reset and study the token's shape — it is built from something guessable.
- **Hint 2:** The token contains the user id and a number derived from it by simple arithmetic.
- **Hint 3:** Tokens look like AG<id>-<id x 137 + 42>; compute one for another user and use it without ever requesting a reset.

### [Intermediate] Role Cookie Trusted for Manager Access
- **Objective:** Demonstrate the flaw — Role Cookie Trusted for Manager Access — so its real effect happens in the app.
- **Hint 1:** The manager console checks something your browser sends — and you control it.
- **Hint 2:** Look at the cookies the app uses; one of them can name a role.
- **Hint 3:** Set the hx_role cookie to manager (or admin) and visit /manager with a low-privilege account.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- **Objective:** Demonstrate the flaw — Weak Password Policy at Registration — so its real effect happens in the app.
- **Hint 1:** Try registering with a one-character password.
- **Hint 2:** The form accepts almost anything as a password.
- **Hint 3:** Create an account with the password 'a' — it is accepted.

### [Beginner] Stored XSS in Display Name
- **Objective:** Demonstrate the flaw — Stored XSS in Display Name — so its real effect happens in the app.
- **Hint 1:** Your display name is printed back on pages other users read — unescaped.
- **Hint 2:** Put an HTML event-handler payload in the name field.
- **Hint 3:** Register or update your profile with the name <img src=x onerror=alert(1)> and view a page that lists users.

### [Intermediate] Mass Assignment at Registration (Role & Balance)
- **Objective:** Demonstrate the flaw — Mass Assignment at Registration (Role & Balance) — so its real effect happens in the app.
- **Hint 1:** The registration handler trusts every field in the form post — even ones the form never shows.
- **Hint 2:** Add fields the form does not display, like role or balance.
- **Hint 3:** POST /register with extra fields role=admin and balance=5000 — both are stored.

## Farms & Search

### [Beginner] Farm Record IDOR (Another Owner's Farm)
- **Objective:** Demonstrate the flaw — Farm Record IDOR (Another Owner's Farm) — so its real effect happens in the app.
- **Hint 1:** Farms are numbered in the URL, and the page never checks whose farm it is.
- **Hint 2:** Sign in as one owner and change the farm id in the address bar.
- **Hint 3:** As Alice, open /farms/2 — Sunridge Acres is served in full, including its internal notes.

### [Beginner] Reflected XSS in Search
- **Objective:** Demonstrate the flaw — Reflected XSS in Search — so its real effect happens in the app.
- **Hint 1:** The results page repeats your search text back to you — raw.
- **Hint 2:** Put a script payload in the search box and view the page source.
- **Hint 3:** Search for <script>alert(1)</script> and watch it land unescaped in the results heading.

### [Intermediate] SQL Injection in Farm Search
- **Objective:** Demonstrate the flaw — SQL Injection in Farm Search — so its real effect happens in the app.
- **Hint 1:** Search glues your text into a query the same way login does.
- **Hint 2:** A quote plus an always-true condition widens the result set.
- **Hint 3:** Search for ' OR '1'='1 — every farm appears, including the unlisted Whispering Pines Agro.

## Crops & Fields

### [Beginner] Edit Another Farm's Crop (IDOR)
- **Objective:** Demonstrate the flaw — Edit Another Farm's Crop (IDOR) — so its real effect happens in the app.
- **Hint 1:** The crop edit form posts to a numbered URL with no ownership check.
- **Hint 2:** Find a crop that belongs to another farm and submit its edit form.
- **Hint 3:** As Alice, POST a new name to /crops/3/edit — Bob's wheat crop is renamed.

### [Intermediate] Yield Figure Tampering
- **Objective:** Demonstrate the flaw — Yield Figure Tampering — so its real effect happens in the app.
- **Hint 1:** Expected yield is just a number the server accepts from the form.
- **Hint 2:** Nothing sanity-checks the harvest a field could plausibly produce.
- **Hint 3:** Set a crop's expected yield to 999999 — the inflated figure is stored and used for planning.

### [Intermediate] Harvesting Another Farm's Field
- **Objective:** Demonstrate the flaw — Harvesting Another Farm's Field — so its real effect happens in the app.
- **Hint 1:** The harvest button posts a field id — the server never asks whose field it is.
- **Hint 2:** Call the harvest endpoint for a field on someone else's farm.
- **Hint 3:** As Alice, POST /fields/3/harvest — Bob's field is harvested by a stranger.

## Harvest Inventory

### [Beginner] Negative Inventory Accepted
- **Objective:** Demonstrate the flaw — Negative Inventory Accepted — so its real effect happens in the app.
- **Hint 1:** The adjust form does not check the sign of the number you enter.
- **Hint 2:** Quantities are trusted exactly as typed.
- **Hint 3:** Set a lot's quantity to -50 — the negative stock is stored.

### [Intermediate] Harvest Inventory Inflation
- **Objective:** Demonstrate the flaw — Harvest Inventory Inflation — so its real effect happens in the app.
- **Hint 1:** The stock adjust form lets you type the new quantity directly.
- **Hint 2:** There is no comparison with harvest records or reasonableness.
- **Hint 3:** Raise a lot from 400 kg to 5000 kg in one adjust — the phantom stock is now sellable.

## Sales & Orders

### [Beginner] Order Price Tampering
- **Objective:** Demonstrate the flaw — Order Price Tampering — so its real effect happens in the app.
- **Hint 1:** The order form sends the price along with the lot and quantity.
- **Hint 2:** The server totals the order using the price you sent.
- **Hint 3:** Order lot 1 with price=1 — your invoice is computed at $1/kg instead of $32/kg.

### [Beginner] Sales Order IDOR
- **Objective:** Demonstrate the flaw — Sales Order IDOR — so its real effect happens in the app.
- **Hint 1:** Order pages are numbered and served to any signed-in user.
- **Hint 2:** Change the order id in the URL.
- **Hint 3:** As Alice, open /orders/1 — Bob's order details are shown.

### [Beginner] Invoice IDOR
- **Objective:** Demonstrate the flaw — Invoice IDOR — so its real effect happens in the app.
- **Hint 1:** Invoices live at numbered URLs with no ownership check.
- **Hint 2:** Open an invoice that belongs to another buyer.
- **Hint 3:** As Alice, open /invoices/1 — Bob's invoice is rendered in full.

### [Intermediate] Overselling Beyond Available Stock
- **Objective:** Demonstrate the flaw — Overselling Beyond Available Stock — so its real effect happens in the app.
- **Hint 1:** The order flow never compares your quantity with what the lot actually holds.
- **Hint 2:** Stock is decremented without a floor check.
- **Hint 3:** Order 100000 kg from a 400 kg lot — the order is accepted and stock goes negative.

## Equipment & Maintenance

### [Intermediate] Self-Approved Equipment Maintenance
- **Objective:** Demonstrate the flaw — Self-Approved Equipment Maintenance — so its real effect happens in the app.
- **Hint 1:** Maintenance requests are approved through an endpoint that never checks your role.
- **Hint 2:** The worker who filed a request can also approve it.
- **Hint 3:** As Wally (worker), POST approve on your own maintenance request — it is approved.

## Workers & Subsidies

### [Intermediate] Worker Self-Promotes to Manager
- **Objective:** Demonstrate the flaw — Worker Self-Promotes to Manager — so its real effect happens in the app.
- **Hint 1:** The team page's role-change endpoint trusts whoever calls it.
- **Hint 2:** A worker's session is enough to rewrite roles.
- **Hint 3:** As Wally, POST /workers/4/role with role=manager — you are now a manager.

### [Intermediate] Self-Approved Subsidy Application
- **Objective:** Demonstrate the flaw — Self-Approved Subsidy Application — so its real effect happens in the app.
- **Hint 1:** Subsidy approval is a plain POST with no role check.
- **Hint 2:** Apply for a subsidy, then call the approve endpoint yourself.
- **Hint 3:** As Bob, apply for a subsidy and POST /subsidies/<id>/approve — public money approved by the applicant.

## Admin & Platform

### [Beginner] Unauthenticated Debug Endpoint Exposes All Data
- **Objective:** Demonstrate the flaw — Unauthenticated Debug Endpoint Exposes All Data — so its real effect happens in the app.
- **Hint 1:** Developers often leave a debug route in production builds.
- **Hint 2:** Try common debug paths under /api.
- **Hint 3:** GET /api/debug with no login at all — every user, password and order is returned.

### [Intermediate] CSRF on Admin User Deactivation
- **Objective:** Demonstrate the flaw — CSRF on Admin User Deactivation — so its real effect happens in the app.
- **Hint 1:** Admin actions accept POSTs with no anti-CSRF token.
- **Hint 2:** The app marks its own pages with an hx_origin cookie — forged requests will not have it.
- **Hint 3:** Send the deactivate POST for a user with an admin session but without the hx_origin marker — the account is deactivated.
