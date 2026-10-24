# HexaHotel — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge mirrors the /tests mission board; hints reveal in order.

## Login & Authentication

### SQL injection login bypass (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The login form builds its query by gluing your input straight into a string.
- Hint 2: A quote character can break out of the email value in that string.
- Hint 3: Try an email like admin@hexahotel.local' OR '1'='1 with any password.

### Brute force — no rate limit or lockout (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Nothing slows you down when a password guess is wrong.
- Hint 2: Count what happens after many wrong passwords for the same account.
- Hint 3: Send 10+ wrong passwords for alice@test.local — the 10th is still processed normally.

### User enumeration via differing error messages (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Compare the login error for an email that exists with one that does not.
- Hint 2: The forgot-password page answers differently too.
- Hint 3: Probe at least 5 different emails across login / forgot-password and watch the responses split into two kinds.

### Default administrator credentials (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Installers often ship with a well-known admin password that never gets changed.
- Hint 2: The platform admin email follows the pattern admin@<domain>.
- Hint 3: Try admin@hexahotel.local with the classic default password admin123.

### Predictable password-reset token (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Ask for a reset and look at how the token is shaped — it is derived from something public.
- Hint 2: The only variable input is the account's numeric user id.
- Hint 3: The token looks like HH<id>-<a number computed from the id>. Work out the formula from your own account, then forge one for the admin.

### Session role trusted from a client cookie (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: After login, look at the cookies the app sets — one of them repeats your role.
- Hint 2: Some pages trust that cookie instead of the server-side session.
- Hint 3: As a normal guest, set your hx_role cookie to admin and open /admin.

## Registration & Profile

### Weak password policy on registration (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: How short a password will the registration form accept?
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: Register a new account with a 1-character password.

### Stored XSS in display name (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Your display name is printed back on pages other people see — including staff pages.
- Hint 2: Nothing escapes HTML in the name field.
- Hint 3: Register (or rename yourself) with a name containing a <script> or <img onerror> payload.

### Mass assignment — role set at registration (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The registration handler copies the whole submitted form into the new user record.
- Hint 2: What fields does a real user record have that the form never shows?
- Hint 3: Register while adding a form field role=admin to the request.

### CSRF on profile update (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Legit profile forms carry a hidden hx_origin marker field — nothing checks cross-site posts that omit it.
- Hint 2: The update endpoint accepts a plain POST from anywhere while you are logged in.
- Hint 3: Submit the profile form fields (name/email) WITHOUT the hx_origin field, as a cross-site form would.

## Rooms & Search

### Reflected XSS in room search (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Your search text is echoed back in the results heading.
- Hint 2: It is echoed without escaping.
- Hint 3: Search for a <script> payload and view the page source.

### SQL injection in room search reveals hidden rooms (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The room search passes your text into the same kind of string-built query as the login.
- Hint 2: A successful injection makes the filter match everything — including rooms that are not listed publicly.
- Hint 3: Search for ' OR '1'='1 and compare the room list with a normal search.

## Bookings

### Nightly rate tampering in booking (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The booking form carries the nightly rate in a hidden field — and the server believes it.
- Hint 2: Prices must always be recomputed on the server from the room catalogue.
- Hint 3: Book a Suite but change the submitted rate field to 1.

### Booking IDOR — view another guest's booking (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Booking pages live at predictable sequential URLs.
- Hint 2: The page never checks that the booking belongs to you.
- Hint 3: Open a booking id that is not yours (seed bookings start at 5001).

### Cancel another guest's booking (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The cancel action trusts the booking id in the request.
- Hint 2: No ownership check stands between you and someone else's reservation.
- Hint 3: Cancel a booking that belongs to another guest.

### Booking a fully-booked room type (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The Deluxe type has exactly 1 room. Another guest already holds it for 10–12 Nov 2026.
- Hint 2: Availability shown on the page is not re-checked when the booking is saved.
- Hint 3: Book the Deluxe room for the same dates anyway.

### Date / nights manipulation — pay for fewer nights (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The booking form also trusts a client-supplied "nights" value for the total.
- Hint 2: The stored dates and the charged nights are never compared.
- Hint 3: Book 3 nights of dates but submit nights=1.

## Extras & Charges

### Free extras via forged extra price (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Adding an extra sends the extra's price along with its id.
- Hint 2: The server stores whatever price arrives instead of the catalogue price.
- Hint 3: Add Spa access to your booking with price=0.

### Add extras to another guest's booking (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The extras endpoint takes a booking id — any booking id.
- Hint 2: Adding charges to someone else's stay is not checked.
- Hint 3: Add a chargeable extra to a booking owned by another guest.

## Check-in & Front Desk

### Guest performs front-desk check-in (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The front-desk check-in endpoint exists and works — the question is who may call it.
- Hint 2: The page is staff-only, but the POST behind it never checks the role.
- Hint 3: As a guest, POST a booking id to /frontdesk/checkin (your own or anyone's).

### Guest uses front-desk rate override (Advanced)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Front desk can override a booking's nightly rate for service recovery.
- Hint 2: That override endpoint also skips the staff check.
- Hint 3: As a guest, POST /frontdesk/override with a booking id and a tiny new rate.

## Invoices & Payments

### Invoice IDOR — view another guest's invoice (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Invoices have their own sequential ids starting at 1001.
- Hint 2: The invoice page does not check ownership either.
- Hint 3: Open an invoice belonging to another guest.

### Settle invoice in full with a partial payment (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The pay endpoint accepts an amount — and a client flag claiming the payment settles the bill.
- Hint 2: The server marks the invoice PAID from the flag instead of the money received.
- Hint 3: Pay 1 toward a large invoice with settle=full.

## Admin Panel

### CSRF on admin room-rate change (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Admin forms also carry the hx_origin marker — and the rate-change handler also fails to require it.
- Hint 2: You need a real admin session for this one (see the Authentication tests).
- Hint 3: As admin, POST /admin/rooms/<id>/rate with a new rate and NO hx_origin field.

## Platform & API

### Unauthenticated debug endpoint dumps accounts (Beginner)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: Developers leave diagnostic endpoints behind — try the obvious name under /api.
- Hint 2: This one needs no login at all.
- Hint 3: Fetch GET /api/debug.

### Weak API token — base64 of email (Intermediate)
- Objective: make the exploit effect happen for real (the test flips automatically when it does).
- Hint 1: The JSON API authenticates with a Bearer token derived from the account email.
- Hint 2: The derivation is a common encoding, not a secret.
- Hint 3: Call GET /api/bookings with Authorization: Bearer base64(someone's email).
