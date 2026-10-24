# HexaRestaurant — Practice Guide (LAB 80)

26 hands-on challenges, grouped by feature then difficulty. Each challenge lists a measurable objective and 3 graded hints (the same hints shown on the in-app Mission Board at `/tests`). A challenge is complete only when the exploit actually succeeds — the lab detects the real effect server-side.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the lab register "SQL injection login bypass" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hints:**
  1. The login form builds its query by gluing your input straight into a string.
  2. Try a classic tautology in the email field, e.g. something containing ' OR '1'='1.
  3. Use email: x' OR '1'='1' --  with any password — the query comment swallows the password check.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the lab register "Brute force — no rate limit or lockout" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. Pick one real account and just keep guessing wrong passwords.
  2. There is no lockout, no CAPTCHA and no delay — count how many failures the app happily processes.
  3. Fail 10 times in a row for the same account; the 10th failure is still processed like the first.

### [Beginner] User enumeration via login & reset responses
- **Objective:** Make the lab register "User enumeration via login & reset responses" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. Compare the error message for an email that exists with one that does not.
  2. The forgot-password form answers differently too — that difference is an oracle.
  3. Probe at least 5 different email addresses across login/forgot and watch the messages diverge.

### [Beginner] Demo credentials published on the login page
- **Objective:** Make the lab register "Demo credentials published on the login page" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. Read the login page carefully — the site itself hands you an account.
  2. Demo accounts shipped to production are real accounts with real access.
  3. Sign in with the demo diner account printed under the login form.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the lab register "Predictable password-reset token" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. Reset tokens here are not random — they are computed from something you can see.
  2. The token looks like HR<user id>-<a number derived from the id>. User ids are sequential.
  3. For user id N the token is HR<N>-<N*137+42>. Compute Bob’s (id 3) and reset his password without ever requesting a reset.

### [Intermediate] Role trusted from a client cookie (hx_role)
- **Objective:** Make the lab register "Role trusted from a client cookie (hx_role)" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. After login, inspect your cookies — the app mirrors your role into one of them.
  2. The server trusts that cookie more than its own session record.
  3. Set the hx_role cookie to "manager" in your browser, then visit /manager as a plain diner.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- **Objective:** Make the lab register "Weak password policy (1 character accepted)" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. Register a new account and shrink the password.
  2. There is no minimum length or complexity check at all.
  3. Create an account with the single-character password "x" — it is accepted.

### [Beginner] Stored XSS in display name
- **Objective:** Make the lab register "Stored XSS in display name" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hints:**
  1. Your display name is shown to staff in the manager user list — exactly as you typed it.
  2. HTML is not escaped on the way out.
  3. Register with a name like <script>alert(1)</script> and let the manager open the user list.

### [Intermediate] Mass assignment — role & loyalty points at signup
- **Objective:** Make the lab register "Mass assignment — role & loyalty points at signup" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. The register endpoint copies more of your POST body than the form shows.
  2. Add fields the form never offered and see which ones stick.
  3. POST /register with extra fields role=manager and loyaltyPoints=9999, then check the new account.

### [Intermediate] CSRF on profile update (marker never checked)
- **Objective:** Make the lab register "CSRF on profile update (marker never checked)" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. The real profile form carries a hidden hx_marker tied to your session.
  2. The server never actually verifies that marker on the way in.
  3. POST /profile with a new name and NO hx_marker at all — the change still goes through.

## Menu & Search

### [Beginner] SQL injection in menu search leaks hidden items
- **Objective:** Make the lab register "SQL injection in menu search leaks hidden items" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hints:**
  1. The search box feeds the same string-built query style as login.
  2. A tautology makes the WHERE clause true for every row — including rows meant to be invisible.
  3. Search for ' OR '1'='1 and look for the dish that never appears on the normal menu.

### [Beginner] Reflected XSS in menu search
- **Objective:** Make the lab register "Reflected XSS in menu search" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hints:**
  1. Your search term is echoed back in the results heading — unescaped.
  2. Put markup in the query and view the page source.
  3. Search for <script>alert(1)</script> and watch it land raw in the page.

## Table Bookings

### [Beginner] Booking a party larger than the table’s seats
- **Objective:** Make the lab register "Booking a party larger than the table’s seats" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hints:**
  1. Table T1 seats 2. The booking form asks for party size…
  2. …but nothing compares the party size with the table’s capacity.
  3. Book table 1 for a party of 8 — it is accepted.

### [Beginner] Double-booking the same table and time slot
- **Objective:** Make the lab register "Double-booking the same table and time slot" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hints:**
  1. Bob already holds table T2 at 19:00 on 2026-10-24.
  2. The booking flow never checks whether the slot is taken.
  3. Book table 2, 2026-10-24, 19:00 yourself — the second booking is accepted too.

### [Beginner] IDOR — view another diner’s booking
- **Objective:** Make the lab register "IDOR — view another diner’s booking" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. Booking ids are small sequential numbers.
  2. The booking page checks that you are logged in — not that the booking is yours.
  3. Open /booking/1 while signed in as Alice; booking 1 belongs to Bob.

### [Beginner] IDOR — cancel another diner’s booking
- **Objective:** Make the lab register "IDOR — cancel another diner’s booking" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. Cancellation trusts the booking id in the URL the same way viewing does.
  2. You do not need to own a booking to destroy it.
  3. POST /booking/1/cancel as Alice — Bob’s reservation disappears.

## Orders & Payments

### [Beginner] Menu price tampering at checkout
- **Objective:** Make the lab register "Menu price tampering at checkout" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hints:**
  1. The order form posts the item price along with the item id.
  2. The server trusts the posted price instead of looking it up.
  3. Order the Truffle Pasta (real price $18) with price=1 and check the order total.

### [Beginner] Negative quantity creates a negative-total order
- **Objective:** Make the lab register "Negative quantity creates a negative-total order" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hints:**
  1. Quantities are multiplied straight into the total with no sanity check.
  2. What happens when qty is below zero?
  3. Order any dish with qty=-3 — the platform stores an order with a negative total.

### [Beginner] IDOR — view another diner’s order
- **Objective:** Make the lab register "IDOR — view another diner’s order" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. Order ids are sequential, starting at 1 (that one is Bob’s).
  2. The order page repeats the booking mistake: login is checked, ownership is not.
  3. Open /order/1 while signed in as Alice.

### [Intermediate] Diner marks own order paid/served (staff action)
- **Objective:** Make the lab register "Diner marks own order paid/served (staff action)" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. There is a status endpoint the kitchen uses: /order/<id>/status.
  2. It never asks WHO is calling — a diner’s session works fine.
  3. As a diner, POST status=paid to your own order and watch it settle itself.

## Reviews & Loyalty

### [Beginner] Review posted without any completed order
- **Objective:** Make the lab register "Review posted without any completed order" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. The review form asks for a dish and a rating — nothing about whether you ate it.
  2. Verified-purchase checks were never implemented.
  3. Create a fresh account with zero orders and post a review for any dish.

### [Beginner] Stored XSS in review text
- **Objective:** Make the lab register "Stored XSS in review text" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- **Hints:**
  1. Reviews are printed on the menu page word-for-word.
  2. The browser cannot tell your review text from the page’s own markup.
  3. Post a review containing <img src=x onerror=alert(1)> and open the menu page.

### [Intermediate] Loyalty points forged — redeem more than the balance
- **Objective:** Make the lab register "Loyalty points forged — redeem more than the balance" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- **Hints:**
  1. Checkout accepts a "redeem" field: points become discount at 10 points = $1… roughly.
  2. Your balance is never checked before the discount is applied.
  3. Alice has 120 points. Order with redeem=10000 and watch the discount land anyway (and the balance go negative).

## Staff & Manager

### [Beginner] Kitchen queue readable by any diner
- **Objective:** Make the lab register "Kitchen queue readable by any diner" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. The kitchen screen lives at /kitchen and shows every live order.
  2. It checks that you are signed in. It forgets to check that you are staff.
  3. Sign in as a diner and open /kitchen.

### [Intermediate] CSRF on manager price change
- **Objective:** Make the lab register "CSRF on manager price change" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- **Hints:**
  1. Managers can reprice dishes at /manager — the form carries the same hx_marker as the profile form.
  2. And just like the profile form, the server never verifies it.
  3. As the manager, POST /manager/price with a new price and no hx_marker — the menu changes.

## Platform & API

### [Intermediate] API token is just base64(email)
- **Objective:** Make the lab register "API token is just base64(email)" as completed on the Mission Board by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Hints:**
  1. The JSON API authenticates with a Bearer token.
  2. The token is derived from something public — decode what a token looks like.
  3. Send Authorization: Bearer <base64 of bob@diner.local> to /api/orders with NO session cookie and read his orders.
