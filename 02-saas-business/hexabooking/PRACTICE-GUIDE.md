# HexaBooking — Practice Guide (26 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form builds its account lookup by gluing your email straight into the query text.
2. Try an email that makes the WHERE clause always true — a quote, an OR and a true comparison.
3. Use admin@hexabooking.local' OR '1'='1 as the email with ANY password — you land inside the first account in the table.

**Walkthrough (read after trying):** Step by step: 1) Open /login. 2) Enter the email: admin@hexabooking.local' OR '1'='1  3) Type any password. 4) Submit — the string-built query matches the first row (the admin) and a session is created. That is the bypass.

### Brute Force — No Rate Limiting or Lockout (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Nothing slows you down here: no CAPTCHA, no delay, no lockout counter that ever blocks.
2. Script ten wrong passwords for one account and watch — every one is still processed politely.
3. Send 10 failed logins for sofia@glowsalon.local (any wrong passwords). The 10th is still accepted for processing: that missing throttle is the flaw.

**Walkthrough (read after trying):** Step by step: 1) Pick one account, e.g. sofia@glowsalon.local. 2) Submit 10 login attempts with wrong passwords. 3) Notice there is never a lockout, delay or CAPTCHA — the 10th attempt is processed exactly like the first. The test passes when the 10th failure is still accepted.

### User Enumeration via Login & Forgot-Password Responses (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the exact wording when the email exists vs when it does not — on BOTH the login and the forgot-password form.
2. The app is chatty: one case says the account does not exist, the other only complains about the password.
3. Probe at least 5 different emails across /login and /forgot, mixing real ones (alice@test.local) with invented ones, and diff the messages.

**Walkthrough (read after trying):** Step by step: 1) On /forgot, request a reset for alice@test.local (exists) — note the wording. 2) Request one for a made-up address — the wording changes and admits the account does not exist. 3) Probe at least 5 distinct emails across /login and /forgot, mixing real and fake. The server can see the probing pattern: that is enumeration.

### Weak / Default Credentials Still Active (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Old demo and seed accounts are a classic way in. This platform still carries one from its early demo days.
2. The login page used to advertise it. Think demo@… and the most predictable password a demo could have.
3. Sign in as demo@hexabooking.local with the password demo123 — the account was never removed or forced to change it.

**Walkthrough (read after trying):** Step by step: 1) Go to /login. 2) Email: demo@hexabooking.local, password: demo123. 3) You are signed in — a shipped demo account with its factory password still works.

### Predictable Password-Reset Token (Intermediate · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Request a reset and look at what the token is made of. It is not random — it is computed from things you already know.
2. The token format is RST-<user id>-<a small number derived from the email itself>.
3. For an account you know the email of: user ids are small sequential numbers, and the suffix is the sum of the email's character codes. Compute it, then POST /reset with that token and a new password — no inbox needed.

**Walkthrough (read after trying):** Step by step: 1) The token for an account is RST-<userId>-<sum of the email's character codes>. User ids are sequential from the seed data (alice is 7). 2) Compute alice's token offline. 3) POST /reset with email, your computed token and a new password. 4) Log in with the new password — you never saw her inbox. (A small helper: open /forgot once so you can see the format is acknowledged, then derive the token yourself.)

### Session Cookie Tampering — Client-Side Role Trusted (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Decode your hb_session cookie (it is plain base64 JSON) and read what the server trusts from it.
2. The server believes the role written inside the cookie instead of checking your account.
3. Change the role field to admin (or owner), re-encode the cookie, and open /admin — the gate checks the cookie, not the database.

**Walkthrough (read after trying):** Step by step: 1) Log in as alice@test.local. 2) Copy the hb_session cookie and base64-decode it — it is JSON with your uid and role. 3) Change role to "admin", re-encode, replace the cookie. 4) Open /admin. The server trusted the cookie and let a customer into the admin panel.


## Registration & Profile

### Mass Assignment — Role Elevation at Registration (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The registration handler copies fields from your request into the new account far too generously.
2. The form shows name/email/password — but the handler never whitelists which fields it accepts.
3. Register a new account while adding an extra form field role=owner (or admin). The account is created with that role.

**Walkthrough (read after trying):** Step by step: 1) On /register, submit the normal form but add an extra field: role=owner. 2) The created account carries the owner role. 3) Log in — owner areas are open to an account that was supposed to be a customer.

### Weak Password Policy — 1-Character Passwords Accepted (Beginner · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. How little password will this platform accept at registration?
2. Try the smallest thing you can think of. There is no length or complexity check at all.
3. Register a new account with the password "a" (one character). It is accepted.

**Walkthrough (read after trying):** Step by step: 1) Open /register. 2) Create an account with a one-character password such as "a". 3) It is accepted and you can log in with it — there is no policy at all.

### Stored XSS via Display Name (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is printed back in places other people read — including the business owner's dashboard when you book with them.
2. Set a name that is also a small HTML/JS payload and make a booking; the owner's view prints it raw.
3. In /profile, set your name to <script>alert(1)</script> (or an <img onerror> variant), then book any appointment — the payload is stored and delivered to the owner's dashboard.

**Walkthrough (read after trying):** Step by step: 1) Log in and open /profile. 2) Set your display name to a script payload. 3) Book an appointment at any business. 4) The name is stored as-is and rendered unescaped in the owner's reservation dashboard — stored XSS.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile form carries a token field — but does the server actually check it on the way in?
2. A state change that arrives without the app's own marker, from a foreign Origin, should be rejected. Here it is not.
3. While logged in, POST /profile/update from a cross-site Origin (e.g. Origin: https://evil.example) with a new name and NO hx_tok field. The change is applied anyway.

**Walkthrough (read after trying):** Step by step: 1) Log in as any user. 2) Send POST /profile/update with your session cookie, a foreign Origin header, a new name, and no hx_tok field. 3) The profile changes anyway — the server never verified the token. That is CSRF.


## Businesses & Services

### Reflected XSS in Business Search (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Search for something that is also markup, and look at how the results page greets your query.
2. The "results for …" line prints your text exactly as you typed it.
3. Search for <script>alert(1)</script> — the payload comes back unescaped in the page.

**Walkthrough (read after trying):** Step by step: 1) Use the search box on the home page. 2) Query: <script>alert(1)</script>. 3) The results page reflects the query unescaped — reflected XSS.

### SQL Injection in Business Search Reveals Unlisted Businesses (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The catalogue search builds its filter the same sloppy way the login does.
2. A normal search only shows listed businesses. An injected one can make the filter match everything — including a business that is deliberately unlisted.
3. Search for ' OR '1'='1 and compare the result set with a normal search — an extra, unlisted business appears.

**Walkthrough (read after trying):** Step by step: 1) Search normally for "spa" — the unlisted Secret Spa does not appear. 2) Search for ' OR '1'='1 instead. 3) The always-true filter returns every business including the unlisted one — injection in the catalogue search.

### Service Edit IDOR — Rewriting Another Business's Prices (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Owners edit their services through /services/<id>/edit. Who checks that the service is actually yours?
2. Nobody does. Any signed-in user who can guess a service id can open its edit form.
3. As the Glow Salon owner (or even a customer), POST /services/4/update — a City Dental service — with a new price of 1. It saves.

**Walkthrough (read after trying):** Step by step: 1) Log in as sofia@glowsalon.local (Glow Salon). 2) Open /services/4/edit — that is City Dental's Checkup, not yours; the form opens anyway. 3) POST a new price. 4) The competitor's price changed — no ownership check exists.


## Booking & Reservations

### Double-Booking — No Server-Side Slot Capacity Check (Intermediate · A04 Insecure Design)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. A staff member's slot holds exactly one customer. The calendar shows it as taken — but what does the booking endpoint itself check?
2. The UI hides full slots; the server never re-checks them. Book a slot that is already taken by posting the booking directly.
3. Bob already holds Mia at 2026-10-27 10:00. As alice, POST /book for the same staff, date and time — a second active reservation for the same slot is created.

**Walkthrough (read after trying):** Step by step: 1) Note the seeded booking: Bob holds Mia (staff 1) on 2026-10-27 at 10:00 for a Haircut. 2) Log in as alice. 3) POST /book with the same staff, date and time. 4) A second active reservation now exists for the same slot — the server never checked capacity.

### Booking Price Tampering — Premium Service at a Client-Chosen Price (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The booking form carries the price in a hidden field. Hidden from view — not from you.
2. The server bills whatever price the request claims the service costs.
3. Book Premium Styling (true price $120) but change the hidden price field to 1 before submitting. You are charged $1.

**Walkthrough (read after trying):** Step by step: 1) Start booking Premium Styling ($120). 2) Intercept/edit the form and set the hidden price field to 1. 3) Submit. 4) The reservation is created at $1 — the server trusted the posted price.

### Duration Tampering — Longer Appointment Than Paid For (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Same family as the price field: the form also posts the appointment's duration, and the server files it as given.
2. A 30-minute haircut that quietly becomes a 300-minute block breaks the whole day's calendar.
3. Book a Haircut but set the hidden duration field to 300. The reservation stores 300 minutes for a 30-minute service.

**Walkthrough (read after trying):** Step by step: 1) Start booking a Haircut (30 minutes). 2) Set the hidden duration field to 300. 3) Submit — the stored reservation runs 300 minutes. The calendar is blocked for five hours at a 30-minute price.

### Reservation IDOR — Viewing Another Customer's Booking (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Reservation pages live at /reservations/<id> and ids are small sequential numbers.
2. Open one that is not yours. What stops you?
3. As alice, open /reservations/1 — that is Bob's booking, with his details. Nothing stops you.

**Walkthrough (read after trying):** Step by step: 1) Log in as alice. 2) Browse to /reservations/1. 3) You are reading Bob's reservation — his service, staff, date and contact details — because the page never checks ownership.

### Reservation Cancel IDOR — Cancelling Strangers' Appointments (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Viewing is bad; cancelling is worse. The cancel endpoint has the same missing check as the view page.
2. POST to the cancel URL of a reservation that belongs to someone else.
3. As alice, POST /reservations/1/cancel — Bob's appointment is cancelled, and Bob is never asked.

**Walkthrough (read after trying):** Step by step: 1) Log in as alice. 2) POST /reservations/1/cancel (Bob's booking). 3) Its status flips to cancelled. The endpoint acted on an object you do not own.


## Staff & Schedules

### Staff Schedule IDOR — Rewriting a Rival's Availability (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Staff availability is edited per staff id. The endpoint trusts the id in the URL more than the session.
2. Mark another business's staff member as off for a whole week and watch their bookable slots vanish.
3. POST /staff/3/schedule/update (Nina at City Dental) while signed in as Glow Salon's owner, setting her days off. It applies.

**Walkthrough (read after trying):** Step by step: 1) Log in as sofia (Glow Salon owner). 2) POST /staff/3/schedule/update — Nina belongs to City Dental. 3) Set her unavailable. 4) The change saves: cross-tenant schedule tampering.

### Cross-Tenant Staff Assignment — Booking Dental Staff for a Salon Service (Advanced · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. A booking ties a service to a staff member. Shouldn't they at least work at the same business?
2. The booking endpoint never compares the staff member's business with the service's business.
3. POST /book for a Glow Salon service (serviceId 1) but with staffId 3 — Nina, who works at City Dental. The booking is created across tenants.

**Walkthrough (read after trying):** Step by step: 1) Log in as a customer. 2) POST /book choosing serviceId 1 (Glow Salon Haircut) with staffId 3 (Nina — City Dental). 3) The reservation is created even though the staff member works for a different business.


## Payments & Promo Codes

### Promo Code Reuse — "Single-Use" Code Works Forever (Beginner · A04 Insecure Design)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. FIRST20 promises 20% off your FIRST booking. The fine print is enforced by… nothing.
2. Use it once. Then use it again. Then again.
3. Book twice as the same customer, applying FIRST20 both times — the discount lands on every booking.

**Walkthrough (read after trying):** Step by step: 1) Book any service with promo code FIRST20 — 20% comes off. 2) Book again with the same code on the same account. 3) The discount applies again — the "single-use" rule is never checked.

### Payment Status Tampering — Marking Your Own Booking "Paid" (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Customers can update their reservation (notes, requests). The update handler accepts more fields than the form shows.
2. What if the request also claims the booking is already paid?
3. POST /reservations/<your id>/update adding paymentStatus=paid. Your unpaid booking now reads PAID.

**Walkthrough (read after trying):** Step by step: 1) Make a booking as alice (it starts unpaid). 2) POST /reservations/<its id>/update with paymentStatus=paid added. 3) The reservation now shows PAID — no money ever moved.


## Reviews

### Stored XSS in Business Reviews (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Reviews are read by everyone — including the business owner in their dashboard. They are printed raw.
2. Leave a review whose text is also a payload.
3. Review Glow Salon with the text <script>alert(1)</script> — it is stored and rendered unescaped on the business page and the owner dashboard.

**Walkthrough (read after trying):** Step by step: 1) Log in as a customer. 2) Leave a review on a business with a script payload as the text. 3) Open the business page — the payload is in the page source unescaped, stored for every future visitor.

### Review Delete IDOR — Deleting Competitors' Reviews (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Reviews can be deleted through /reviews/<id>/delete. Whose reviews? Apparently anyone's.
2. Find a glowing review of a rival business and delete it as an unrelated customer.
3. POST /reviews/1/delete while signed in as someone who neither wrote it nor owns the business. It is gone.

**Walkthrough (read after trying):** Step by step: 1) Note a seeded review (id 1) praising a business. 2) Log in as an unrelated customer. 3) POST /reviews/1/delete. 4) The review disappears — no authorisation was checked.


## Admin & Platform

### Admin Action Without CSRF Protection — Business Deleted via GET Link (Advanced · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The most destructive action in the admin panel is a plain link — a GET request with no token at all.
2. If an admin can be lured into clicking a link while signed in, the action fires with their session.
3. As admin, simply GET /admin/businesses/2/delete — City Dental is deleted by a page view. No confirmation, no token.

**Walkthrough (read after trying):** Step by step: 1) Log in as the platform admin. 2) Visit /admin/businesses/2/delete directly (that is all an attacker's link needs). 3) The business is deleted by a GET — the ultimate CSRF.

### Predictable API Tokens — Cross-Tenant Data via the API (Advanced · A07 Auth Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The appointments API authenticates with per-user tokens. Look at the pattern of yours (Profile page shows it).
2. Tokens are sequential and guessable — one user's token is arithmetic away from another's.
3. Tokens look like hbk-<1000 + user id>. The Glow Salon owner is user 2, so hbk-1002. Call /api/appointments?businessId=1&token=hbk-1002 with NO login session and read her business's appointments.

**Walkthrough (read after trying):** Step by step: 1) Check your own API token on /profile: it is hbk-(1000 + your user id). 2) The Glow Salon owner is user 2 → her token is hbk-1002. 3) Without logging in, GET /api/appointments?businessId=1&token=hbk-1002. 4) Her business's appointments are returned — the token was pure arithmetic.
