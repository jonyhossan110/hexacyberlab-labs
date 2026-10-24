# HexaEventTrip — Practice Guide (LAB 79)

Work through the challenges feature by feature. The in-app Mission Board (`/tests`) mirrors this guide and shows your live status and attempt counts. Each challenge is complete only when the exploit genuinely succeeds — the server detects the real effect.

## Login & Authentication

### SQL injection login bypass (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The legacy login still builds its query by string concatenation.
  2. Try a classic tautology in the email field.
  3. Use admin@hexaeventtrip.local' OR '1'='1 as the email, any password.
- **Lesson:** Login forms that build SQL queries by concatenating user input let attackers bypass authentication entirely.

### Brute force — no rate limiting or lockout (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Pick one account and keep guessing its password.
  2. Notice nothing slows you down or locks the account.
  3. Fail 10 logins in a row for the same account — the 10th is still processed normally.
- **Lesson:** Without throttling or lockout, attackers can guess passwords indefinitely.

### User enumeration via login and forgot-password responses (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Compare the error for an email that exists with one that does not.
  2. Try the forgot-password form too.
  3. Probe at least 5 different emails and watch how the messages differ.
- **Lesson:** Different responses for existing vs non-existing accounts let attackers build a valid user list.

### Default/demo admin credentials published on the login page (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Read the demo-accounts box on the login page carefully.
  2. One of the listed accounts is not a normal user.
  3. Log in with the published admin email and password.
- **Lesson:** Demo and default credentials left in production are an open door — especially when printed on the login page.

### Predictable password-reset token (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Request a reset for your own account and study the token format.
  2. The token is derived from something public about the account.
  3. It combines the user id with a simple arithmetic formula — compute another user’s token and use it without ever requesting a reset for them.
- **Lesson:** Reset tokens must be random and unguessable; a token computed from a user id can be forged for any account.

### Session role cookie tampering (hx_role) (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Inspect the cookies the app sets after login.
  2. One cookie repeats your role — and the server trusts it.
  3. Change hx_role to admin and visit /admin.
- **Lesson:** Authorization decisions must come from server-side session state, never from client-editable cookies.

## Registration & Profile

### Weak password policy (1-character passwords accepted) (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Register a new account with the shortest password you can.
  2. There is no length or complexity check at all.
  3. A single character is enough.
- **Lesson:** A password policy is the cheapest defence against guessing and credential stuffing.

### Mass assignment — role and credit set at registration (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The registration handler copies every submitted field onto the new account.
  2. Add fields the form never shows.
  3. Submit role=organizer (or admin) and credit=500 along with the normal fields.
- **Lesson:** Binding request bodies directly to data models lets attackers set fields that were never meant to be user-controlled.

### Stored XSS in display name (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Your display name is rendered on staff-facing pages without escaping.
  2. Put an HTML/JS payload in the name field.
  3. Use <script>alert(1)</script> or an <img onerror> payload as your name.
- **Lesson:** User-controlled text must be output-encoded everywhere it is rendered — especially in admin views.

### CSRF on profile update (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The profile form carries a hidden hx_origin marker — but the server never verifies it.
  2. Send the same POST without the marker.
  3. A cross-site form post changes your profile just as well.
- **Lesson:** State-changing endpoints must verify an anti-CSRF token bound to the session.

## Events & Packages

### SQL injection in event search leaks unpublished events (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The event search feeds your text straight into a query.
  2. A tautology makes the search return everything.
  3. Search for ' OR '1'='1 and look for an event that is never listed normally.
- **Lesson:** Search boxes are injection points too — and the data behind them is often more than the public catalogue.

### Reflected XSS in event search (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The search page echoes your query back at the top of the results.
  2. It is not escaped.
  3. Search for <script>alert(1)</script> and view the page source.
- **Lesson:** Reflected input must be encoded — search pages are a classic phishing delivery vehicle.

### Bundle component swap — premium hotel at the basic price (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. A package tier is a bundle: ticket + hotel class + transfer class.
  2. The booking form submits each component separately — and the server trusts them.
  3. Book the Basic tier but submit hotel=5-star Grand Hotel and transfer=Private car. You are charged the Basic price.
- **Lesson:** Bundles must be priced and composed server-side from the chosen tier, never assembled from client-submitted parts.

## Group Reservations

### Group-size forgery — pay for 2, register 10 travellers (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The booking form asks how many travellers you pay for — and separately lists their names.
  2. Nobody compares the two numbers.
  3. Set paidCount=2 but list 10 traveller names. All 10 get seats and rooms.
- **Lesson:** Every quantity that money depends on must be reconciled server-side: paid count, traveller list, seats and rooms must agree.

### Reservation IDOR — view another group’s booking (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Reservation URLs carry a simple numeric id.
  2. Ownership is never checked on the view page.
  3. Open a reservation id that is not yours.
- **Lesson:** Every object access must verify that the object belongs to the caller.

### Cancel another user’s reservation (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The cancel action is a plain POST with the reservation id.
  2. It never asks whose reservation it is.
  3. Cancel a booking owned by someone else.
- **Lesson:** Destructive actions need the same ownership checks as reads — and usually stricter ones.

### Price tampering on booking (client-submitted per-person price) (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The booking form posts a perPersonPrice field.
  2. The server uses it instead of its own catalogue price.
  3. Submit perPersonPrice=1 for a $499 package.
- **Lesson:** Prices must always be recomputed server-side from the catalogue; client-submitted money values are untrusted input.

## Allocations

### Steal/modify another group’s seat & room allocation (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Allocations (seat block, rooms) can be edited with a POST carrying the reservation id.
  2. Ownership is not checked there either.
  3. Change the seat block of a reservation owned by another group.
- **Lesson:** Allocation state is part of the booking’s integrity — write access must be owner-scoped.

### Event capacity overbooking (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. One event is nearly full — check the remaining seats on its page.
  2. Bookings never re-check the remaining capacity.
  3. Book a group larger than the seats left. The event ends up over capacity.
- **Lesson:** Capacity is a hard business invariant; it must be enforced atomically at booking time.

## Payments & Instalments

### Instalment marked paid without any payment (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. An instalment can be "paid" with a simple POST.
  2. Send it with no payment token and amount 0.
  3. It still flips to PAID.
- **Lesson:** Payment state must only change on verified payment-provider confirmation, never on a bare client request.

### Partial payment accepted as full instalment payment (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Send a payment token — but pay far less than the instalment.
  2. The server never compares the amount with what is due.
  3. Pay $1 toward a $300+ instalment; it closes as fully paid.
- **Lesson:** Paid-in-full must mean the received amount equals the amount due.

## Organizer & Manifest

### Organizer-only traveller manifest readable by any traveller (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Organizers have a manifest page listing every traveller in a group.
  2. The URL is /organizer/manifest/<reservationId>.
  3. Open it while logged in as a plain traveller.
- **Lesson:** Role-restricted views must check the role server-side on every request — hiding the link is not protection.

## Admin Panel

### Admin user list served to any logged-in user (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. There is a user-management page under /admin/users.
  2. Try it as a plain traveller — no cookie tricks.
  3. It lists every account, roles included.
- **Lesson:** Admin surfaces must verify the admin role server-side; being logged in is not being authorized.

### CSRF on admin deactivate-user action (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The admin deactivate action is a POST with just a user id.
  2. Like the profile form, its marker is never verified.
  3. As admin, POST /admin/deactivate without the hx_origin marker.
- **Lesson:** Admin actions are the highest-value CSRF targets and must carry verified tokens.

## Platform & API

### Weak API token — base64(email) accepted as a bearer token (Intermediate)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. The JSON API authenticates with a Bearer token.
  2. The token is just a reversible encoding of something public.
  3. Send Authorization: Bearer base64(your email) to /api/reservations — no session needed.
- **Lesson:** API tokens must be random secrets; an encoding of a public identifier is not a credential.

### Unauthenticated /api/debug dumps users and passwords (Beginner)
- **Objective:** make the exploit succeed so the test flips to done on the Mission Board.
- **Hints:**
  1. Developers left a debug endpoint in production.
  2. It needs no login at all.
  3. Fetch /api/debug and read the user table.
- **Lesson:** Debug and diagnostic endpoints must never ship to production — they bypass every other control.
