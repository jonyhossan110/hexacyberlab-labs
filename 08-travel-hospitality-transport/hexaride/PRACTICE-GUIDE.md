# HexaRide — Practice Guide

Work through the challenges feature by feature. Hints are graded: try Hint 1 first. A challenge is complete only when the exploit actually works — the Mission Board (/tests) tracks your real progress.

## Login & Authentication

### [Beginner] No Brute-Force Protection on Login
- Objective: make the "No Brute-Force Protection on Login" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A07:2021 Authentication Failures).
- Hint 1: Nothing slows you down when a password guess is wrong.
- Hint 2: Keep guessing the same account — does anything lock, delay or CAPTCHA you after many failures?
- Hint 3: Submit 10+ wrong passwords for one account (e.g. bob@test.local) — the 10th is still processed normally.

### [Beginner] User Enumeration via Login & Reset Responses
- Objective: make the "User Enumeration via Login & Reset Responses" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A07:2021 Authentication Failures).
- Hint 1: Compare the error messages for an email that exists and one that does not.
- Hint 2: The forgot-password form is even more talkative than the login form.
- Hint 3: Probe 5+ different emails on /forgot: real accounts get "Reset link sent", unknown ones get "No account with that email".

### [Beginner] Default / Published Demo Credentials
- Objective: make the "Default / Published Demo Credentials" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A07:2021 Authentication Failures).
- Hint 1: The login page itself tells you a demo account.
- Hint 2: Demo accounts in training material have a habit of surviving into production.
- Hint 3: Sign in as admin@hexaride.local with the published demo password admin123.

### [Intermediate] SQL Injection Login Bypass
- Objective: make the "SQL Injection Login Bypass" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A03:2021 Injection).
- Hint 1: The login form builds its database query by gluing your input straight into the query string.
- Hint 2: A quote character ends the email string early — what could follow it to change the logic?
- Hint 3: Try an email like ' OR '1'='1' -- and any password. The -- comments out the password check.

### [Intermediate] Predictable Password-Reset Token
- Objective: make the "Predictable Password-Reset Token" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A07:2021 Authentication Failures).
- Hint 1: Request a reset for your own account and look at the token format.
- Hint 2: The token is built from something you can see — the user id — plus fixed arithmetic.
- Hint 3: Tokens look like HR<id>-<id*137+42>. Compute one for another user (e.g. id 3) and use /reset without ever requesting it.

### [Intermediate] Role Cookie Tampering (Client-Side Role Trust)
- Objective: make the "Role Cookie Tampering (Client-Side Role Trust)" test flip to done on the Mission Board by exploiting the real flaw in the Login & Authentication flow (A01:2021 Broken Access Control).
- Hint 1: After login, look at the cookies the app sets — one of them repeats your role.
- Hint 2: The driver area believes that cookie instead of checking your account.
- Hint 3: Set the hx_role cookie to "driver" (browser dev tools) while logged in as a rider, then open /driver.

## Registration & Profile

### [Beginner] Weak Password Policy
- Objective: make the "Weak Password Policy" test flip to done on the Mission Board by exploiting the real flaw in the Registration & Profile flow (A07:2021 Authentication Failures).
- Hint 1: How short can a password be at registration?
- Hint 2: The form accepts almost anything as a password.
- Hint 3: Register a new account with a 1-character password — it is accepted.

### [Beginner] Stored XSS in Display Name
- Objective: make the "Stored XSS in Display Name" test flip to done on the Mission Board by exploiting the real flaw in the Registration & Profile flow (A03:2021 Injection).
- Hint 1: Your display name is printed back on pages other people see — including staff.
- Hint 2: Does anything strip HTML from the name field?
- Hint 3: Register or rename yourself with a name containing <script>alert(1)</script> or an <img onerror> payload — it is stored and rendered raw.

### [Beginner] CSRF on Profile Update
- Objective: make the "CSRF on Profile Update" test flip to done on the Mission Board by exploiting the real flaw in the Registration & Profile flow (A01:2021 Broken Access Control).
- Hint 1: The profile form includes a hidden hx_origin marker — but is it checked?
- Hint 2: A state-changing POST from another site carries cookies but not that marker.
- Hint 3: POST to /profile as a logged-in user WITHOUT the hx_origin field (e.g. from curl) — the change is accepted anyway.

### [Intermediate] Mass Assignment — Role & Wallet Balance
- Objective: make the "Mass Assignment — Role & Wallet Balance" test flip to done on the Mission Board by exploiting the real flaw in the Registration & Profile flow (A01:2021 Broken Access Control).
- Hint 1: The registration handler copies more of your form than the visible fields.
- Hint 2: What fields does a user record have that the form never shows? role? wallet?
- Hint 3: Register while adding extra form fields role=driver and wallet=500 — the new account keeps them.

## Trips & Fares

### [Beginner] Fare Tampering — Client-Supplied Price
- Objective: make the "Fare Tampering — Client-Supplied Price" test flip to done on the Mission Board by exploiting the real flaw in the Trips & Fares flow (A04:2021 Insecure Design).
- Hint 1: The booking form computes a helpful fare estimate in the page. Where is the real price decided?
- Hint 2: The create-trip request accepts fields the form never shows.
- Hint 3: Create a trip while adding a form field fare=1 — the platform stores YOUR price, not its own.

### [Beginner] Distance Tampering — Client-Supplied Distance
- Objective: make the "Distance Tampering — Client-Supplied Distance" test flip to done on the Mission Board by exploiting the real flaw in the Trips & Fares flow (A04:2021 Insecure Design).
- Hint 1: Fare follows distance. Who measures the distance?
- Hint 2: The booking request can carry its own distanceKm value.
- Hint 3: Book Airport → Sunny Beach but send distanceKm=0.5 — the fare is calculated from your number.

### [Beginner] Trip IDOR — Other Riders' Trips & Routes
- Objective: make the "Trip IDOR — Other Riders' Trips & Routes" test flip to done on the Mission Board by exploiting the real flaw in the Trips & Fares flow (A01:2021 Broken Access Control).
- Hint 1: Trip pages live at predictable URLs: /trips/<id>.
- Hint 2: Does the page check whose trip it is before showing pickup and dropoff?
- Hint 3: Open another rider's trip (e.g. /trips/2 while logged in as Alice) — full route history is served.

### [Beginner] Cancel Another Rider's Trip (IDOR)
- Objective: make the "Cancel Another Rider's Trip (IDOR)" test flip to done on the Mission Board by exploiting the real flaw in the Trips & Fares flow (A01:2021 Broken Access Control).
- Hint 1: Cancelling is a POST to /trips/<id>/cancel.
- Hint 2: Viewing was only the beginning — is writing checked any better?
- Hint 3: POST a cancel for a trip that belongs to someone else — it cancels.

### [Intermediate] Trip Completion by Non-Driver (Broken Function-Level Authorisation)
- Objective: make the "Trip Completion by Non-Driver (Broken Function-Level Authorisation)" test flip to done on the Mission Board by exploiting the real flaw in the Trips & Fares flow (A01:2021 Broken Access Control).
- Hint 1: Drivers move a trip through accepted → ongoing → completed via /driver/trips/<id>/... endpoints.
- Hint 2: The complete endpoint seems to have forgotten to ask WHO is calling.
- Hint 3: As a RIDER, POST to /driver/trips/<your trip id>/complete — the trip completes without any driver.

## Promo Codes

### [Beginner] Promo Code Stacking
- Objective: make the "Promo Code Stacking" test flip to done on the Mission Board by exploiting the real flaw in the Promo Codes flow (A04:2021 Insecure Design).
- Hint 1: One promo per trip is the business rule. Is it the code's rule?
- Hint 2: The apply-promo endpoint can be called more than once on the same trip.
- Hint 3: Apply WELCOME20 and then RIDE50 to the same unpaid trip — both discounts land.

### [Beginner] Single-Use Promo Code Reuse
- Objective: make the "Single-Use Promo Code Reuse" test flip to done on the Mission Board by exploiting the real flaw in the Promo Codes flow (A04:2021 Insecure Design).
- Hint 1: RIDEFREE is a single-use welcome gift: 100% off, once per rider.
- Hint 2: The system counts redemptions... and then does nothing with the count.
- Hint 3: Use RIDEFREE on one trip, then on a second trip — it works again.

### [Intermediate] Promo Applied to a Completed Trip — Wallet Refund
- Objective: make the "Promo Applied to a Completed Trip — Wallet Refund" test flip to done on the Mission Board by exploiting the real flaw in the Promo Codes flow (A04:2021 Insecure Design).
- Hint 1: What happens if you apply a promo to a trip that is already finished and paid?
- Hint 2: The endpoint never asks about the trip's state — and it is generous about the difference.
- Hint 3: Apply a promo code to your own completed, paid trip (e.g. trip 1) — the discount is credited back to your wallet.

## Wallet & Payments

### [Beginner] Wallet Top-Up Amount Forgery
- Objective: make the "Wallet Top-Up Amount Forgery" test flip to done on the Mission Board by exploiting the real flaw in the Wallet & Payments flow (A04:2021 Insecure Design).
- Hint 1: Top-up takes two numbers: what you pay and what you are credited. The form only shows one.
- Hint 2: The server believes the credited amount the client sends.
- Hint 3: POST /wallet/topup with amount=100 and paidAmount=1 — $100 lands in the wallet for a $1 "payment".

### [Intermediate] Negative Trip Payment Credits the Wallet
- Objective: make the "Negative Trip Payment Credits the Wallet" test flip to done on the Mission Board by exploiting the real flaw in the Wallet & Payments flow (A04:2021 Insecure Design).
- Hint 1: Paying a trip subtracts the amount from your wallet. What if the amount is below zero?
- Hint 2: The pay endpoint never validates the sign of the amount.
- Hint 3: On a completed unpaid trip of yours, POST /trips/<id>/pay with amount=-50 — your wallet GROWS and the trip counts as paid.

## Driver & Earnings

### [Beginner] Driver Earnings IDOR
- Objective: make the "Driver Earnings IDOR" test flip to done on the Mission Board by exploiting the real flaw in the Driver & Earnings flow (A01:2021 Broken Access Control).
- Hint 1: The earnings page takes a driverId parameter.
- Hint 2: It never asks whether that driver is you.
- Hint 3: Open /driver/earnings?driverId=5 while logged in as someone else — Erin's earnings are served.

### [Intermediate] Payout Above Earnings Balance
- Objective: make the "Payout Above Earnings Balance" test flip to done on the Mission Board by exploiting the real flaw in the Driver & Earnings flow (A04:2021 Insecure Design).
- Hint 1: Drivers request payouts of their earnings. Who checks the balance?
- Hint 2: The payout form certainly shows your balance — but the endpoint trusts your amount.
- Hint 3: As a driver, POST /driver/payout with an amount far above your earnings (e.g. 10000) — it is accepted.

## Ratings

### [Beginner] Out-of-Range Rating Value Accepted
- Objective: make the "Out-of-Range Rating Value Accepted" test flip to done on the Mission Board by exploiting the real flaw in the Ratings flow (A04:2021 Insecure Design).
- Hint 1: Ratings are 1–5 stars. In the UI, anyway.
- Hint 2: The rating endpoint stores whatever number arrives.
- Hint 3: Rate one of your completed trips with stars=100 — it is stored as-is.

### [Beginner] Rating a Trip You Did Not Take
- Objective: make the "Rating a Trip You Did Not Take" test flip to done on the Mission Board by exploiting the real flaw in the Ratings flow (A01:2021 Broken Access Control).
- Hint 1: The rate endpoint asks for a trip id. Whose trip may it be?
- Hint 2: Nothing ties the rater to the trip.
- Hint 3: Rate another rider's completed trip (e.g. trip 2 as Alice) — the review lands.

## Admin & Platform

### [Beginner] Admin Panel Without Access Control
- Objective: make the "Admin Panel Without Access Control" test flip to done on the Mission Board by exploiting the real flaw in the Admin & Platform flow (A01:2021 Broken Access Control).
- Hint 1: The admin panel lives at /admin. Surely it checks for admins?
- Hint 2: It does not. Anyone with any login can open it.
- Hint 3: Log in as a plain rider and open /admin — the full user list, passwords included, is served.

### [Beginner] Debug Endpoint Exposes All Accounts & Passwords
- Objective: make the "Debug Endpoint Exposes All Accounts & Passwords" test flip to done on the Mission Board by exploiting the real flaw in the Admin & Platform flow (A05:2021 Security Misconfiguration).
- Hint 1: Development leftovers have a habit of shipping. Check /api/debug.
- Hint 2: No login is even required once the lab is unlocked.
- Hint 3: Open /api/debug — the whole user table, plaintext passwords included, comes back as JSON.
