# HexaFlight — PRACTICE GUIDE (LAB 73)

Challenges grouped by feature, then difficulty. Objective = the measurable server-side effect that completes the test. Hints are graded: nudge → stronger → near-answer (the /tests Mission Board mirrors this).

## Login & Authentication

### [Beginner] SQL Injection — Login Bypass
- **Objective:** Log in without valid credentials by injecting into the login query.
- **Where:** POST /login
- Hint 1: The login form builds its account lookup by gluing your input into a query string.
- Hint 2: Try a classic tautology in the email field — something that is always true.
- Hint 3: Use ' OR '1'='1 in the email (any password) and watch whose session you get.

### [Beginner] Brute Force — No Login Throttling
- **Objective:** Submit 10 failed logins for one account and show none are throttled.
- **Where:** POST /login
- Hint 1: Count how many wrong passwords the login accepts for one account.
- Hint 2: There is no lockout, no delay and no CAPTCHA — script it.
- Hint 3: Ten failures in a row for the same account are all processed normally.

### [Beginner] User Enumeration via Login & Reset Responses
- **Objective:** Distinguish registered from unregistered emails using only error messages.
- **Where:** POST /login · POST /forgot
- Hint 1: Compare the error for an email that exists vs one that does not.
- Hint 2: The forgot-password form answers differently too.
- Hint 3: Probe at least five different emails and collect the two different answers.

### [Beginner] Default Credentials on the Helpdesk Account
- **Objective:** Log in to the helpdesk account with its default password.
- **Where:** POST /login
- Hint 1: One staff account was set up with a password anyone could guess from the username.
- Hint 2: Think helpdesk@ and the pattern <name>123.
- Hint 3: The account exists — try the vendor-default style password.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Reset another account’s password using a token you computed, never requested.
- **Where:** POST /reset
- Hint 1: Request a reset for your own account and study the token shape.
- Hint 2: The token is built from something public about the account — its numeric id.
- Hint 3: Token = HF<id>-<id×137+42>. Compute it for another user and reset their password without ever requesting a reset.

### [Intermediate] Role Cookie Tampering Unlocks the Admin Panel
- **Objective:** Reach /admin as a passenger by forging the role cookie.
- **Where:** GET /admin (hx_role cookie)
- Hint 1: After login, inspect the cookies the app sets — one of them describes your role.
- Hint 2: The admin panel trusts that cookie instead of the server-side session.
- Hint 3: Set hx_role=admin in your browser and reload /admin.

## Registration & Profile

### [Beginner] Weak Password Policy — 1-Character Passwords
- **Objective:** Create an account with a 1-character password.
- **Where:** POST /register
- Hint 1: Try registering with the shortest password the form will take.
- Hint 2: There is no length or complexity check at all.
- Hint 3: A single character is accepted.

### [Beginner] Stored XSS in Display Name
- **Objective:** Store a script payload in a display name so it is saved for staff pages.
- **Where:** POST /register · POST /profile/update → rendered in /admin and agent views
- Hint 1: Your display name is shown to staff in the admin and agent views.
- Hint 2: Names are rendered without escaping.
- Hint 3: Register (or rename yourself) with a <script> payload as your name.

### [Intermediate] Mass Assignment — Self-Assigned Staff Role
- **Objective:** Register a new account that already has a staff role.
- **Where:** POST /register
- Hint 1: The registration handler copies form fields straight into the new account record.
- Hint 2: What happens if the form includes a field the page never showed — like role?
- Hint 3: Submit role=agent (or admin) with your registration and check your new powers.

### [Intermediate] CSRF on Profile Update
- **Objective:** Change a profile with a POST that carries no anti-CSRF marker.
- **Where:** POST /profile/update
- Hint 1: Legit forms carry a hidden hx_origin marker. The handler never checks it.
- Hint 2: A state-changing POST without the marker still succeeds.
- Hint 3: Send the profile update with no hx_origin field at all — e.g. as a cross-site form would.

## Flight Search

### [Beginner] Reflected XSS in Search Results
- **Objective:** Get a script payload reflected unescaped in the search response.
- **Where:** GET /flights?q=
- Hint 1: The results page repeats your search term back to you.
- Hint 2: It does so without escaping.
- Hint 3: Put a <script> payload in q and view the page source of the response.

### [Intermediate] SQL Injection in Flight Search Reveals Hidden Charter Flight
- **Objective:** Make the search return the hidden internal charter flight.
- **Where:** GET /flights?q=
- Hint 1: Search builds its filter the same sloppy way the login does.
- Hint 2: A tautology makes the filter match everything — including flights the catalogue hides.
- Hint 3: Search for ' OR '1'='1 and look for a flight that never appears normally.

## Bookings & Fares

### [Beginner] Payment Bypass — Paying $0 Marks the Booking Paid
- **Objective:** Mark a booking PAID while paying less than the amount due.
- **Where:** POST /book/:id/pay
- Hint 1: The payment step asks the client how much was paid.
- Hint 2: It never compares that with what is owed.
- Hint 3: Pay amount=0 (or negative) and watch the booking flip to PAID.

### [Beginner] Booking IDOR — Read Any Passenger’s Booking
- **Objective:** View a booking owned by a different passenger.
- **Where:** GET /booking/:id
- Hint 1: Booking pages live at predictable numeric addresses.
- Hint 2: Nothing checks that the booking belongs to you.
- Hint 3: Open a booking id that is not yours (another passenger’s).

### [Beginner] Cancel Another Passenger’s Booking
- **Objective:** Cancel a booking owned by a different passenger.
- **Where:** POST /booking/:id/cancel
- Hint 1: The cancel endpoint is as trusting as the view endpoint.
- Hint 2: No ownership check stands between you and someone else’s trip.
- Hint 3: Cancel a booking that belongs to another passenger.

### [Intermediate] Fare Tampering — Business Seat at an Economy Price
- **Objective:** Create a booking whose charged fare is lower than the server fare for that seat.
- **Where:** POST /book (price field)
- Hint 1: The booking form helpfully sends the price along with the seat choice.
- Hint 2: The server believes it.
- Hint 3: Book a business seat but submit the economy price in the price field.

## Seats & Check-in

### [Beginner] Check In Another Passenger
- **Objective:** Check in a booking owned by a different passenger.
- **Where:** POST /booking/:id/checkin
- Hint 1: Check-in changes who is expected at the gate.
- Hint 2: The endpoint does not ask whose booking it is.
- Hint 3: Check in a booking that belongs to someone else.

### [Beginner] E-Ticket IDOR — Download Any Passenger’s Ticket
- **Objective:** View the e-ticket of a booking owned by a different passenger.
- **Where:** GET /ticket/:id
- Hint 1: The e-ticket page uses the same predictable booking id.
- Hint 2: It prints the full ticket — name, PNR, seat — for whoever asks.
- Hint 3: Open the ticket of a booking that is not yours.

### [Intermediate] Free Upgrade — Premium Seat Change Without Paying the Difference
- **Objective:** Hold a seat worth more than the fare your booking paid.
- **Where:** POST /booking/:id/seat
- Hint 1: After booking economy, the seat-change form lets you pick any seat on the plane.
- Hint 2: Nobody charges the fare difference.
- Hint 3: Move your booking to a first-class seat and compare seat price with what you paid.

### [Intermediate] Double-Booked Seat — the Same Seat Sold Twice
- **Objective:** End up holding a seat that another active booking already holds.
- **Where:** POST /booking/:id/seat
- Hint 1: The seat-change endpoint never asks whether the seat is already taken.
- Hint 2: Pick a seat another booking already holds.
- Hint 3: Two active bookings end up owning the same seat on the same flight.

## Agent Desk

### [Intermediate] Wholesale Fare Rules Exposed to Passengers via API
- **Objective:** Read the fare rules as a plain passenger.
- **Where:** GET /api/fare-rules
- Hint 1: The agent fare-rules page checks your role properly. Its JSON API does not.
- Hint 2: Ask the API directly while logged in as a passenger.
- Hint 3: GET /api/fare-rules returns wholesale fares and commission rates.

### [Intermediate] Passengers Can Mint Their Own Discount Codes
- **Objective:** Create a discount code while logged in as a passenger.
- **Where:** POST /agent/discount
- Hint 1: Agents create discount codes from the agent desk.
- Hint 2: The create endpoint forgot to check who is calling.
- Hint 3: As a passenger, POST a code with pct=100 and it exists.

## Admin Panel

### [Beginner] Admin User List Served to Any Logged-In User
- **Objective:** Fetch the admin user list as a non-admin user.
- **Where:** GET /admin/users
- Hint 1: The admin area has a JSON user list behind it.
- Hint 2: It asks only that you are logged in — not that you are staff.
- Hint 3: Fetch /admin/users as a passenger.

### [Intermediate] CSRF on Admin Fare Update
- **Objective:** Change a flight fare as admin with a POST lacking the CSRF marker.
- **Where:** POST /admin/fares
- Hint 1: Admin fare changes are a plain POST with no anti-CSRF marker check.
- Hint 2: Even the admin’s own browser can be tricked into sending it.
- Hint 3: As admin, change a fare with a POST that carries no hx_origin marker.

## Platform & API

### [Beginner] Debug Endpoint Dumps Every Account and Password
- **Objective:** Fetch the debug dump and read the account table.
- **Where:** GET /api/debug
- Hint 1: Developers leave diagnostic endpoints behind more often than anyone admits.
- Hint 2: This one needs no login at all.
- Hint 3: GET /api/debug and read the whole user table — passwords included.

### [Intermediate] Weak API Token — Base64 of the Account Email
- **Objective:** Authenticate to the API with a token derived only from an email address.
- **Where:** GET /api/my-bookings (Authorization: Bearer)
- Hint 1: The mobile API authenticates with a Bearer token tied to your email.
- Hint 2: It is a reversible encoding, not a secret.
- Hint 3: Send Bearer base64(your email) — no password involved — and your bookings appear.
