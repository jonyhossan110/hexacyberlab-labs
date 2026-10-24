# HexaFitness — Practice Guide

Challenges grouped by feature, then difficulty. Objective = measurable success (the matching Mission Board test flips to DONE).

## Login & Authentication

### [Beginner] SQL injection login bypass
- Objective: String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.
- Hints:
  1. The login form builds its database query by gluing your input straight into the query string.
  2. Try a classic tautology in the email field, e.g. ' OR '1'='1.
  3. Use admin@hexafitness.local' OR '1'='1' -- as the email and any password.

### [Beginner] Brute force — no rate limit or lockout
- Objective: Without throttling, lockout or MFA, a password is only as strong as the attacker is patient.
- Hints:
  1. Keep guessing Bobs password — does anything slow you down or lock the account?
  2. There is no counter anywhere: 10 wrong passwords are processed exactly like the first.
  3. Fail 10 logins for bob@test.local in a row and watch every one get a normal response.

### [Beginner] User enumeration via login & forgot-password
- Objective: Different error messages for "no such user" and "wrong password" turn your login page into a member directory.
- Hints:
  1. Compare the error for an email that exists with one that does not — on login AND on forgot-password.
  2. The two flows answer differently: "No account with that email" vs "Incorrect password".
  3. Probe at least 5 different emails across login/forgot-password and catalogue which ones are real members.

### [Beginner] Published demo credentials (incl. admin)
- Objective: Demo and default credentials left in production are an open door with the key taped to it.
- Hints:
  1. Read the login page carefully — the site itself tells you working credentials.
  2. The demo box lists every seeded account, including the administrators.
  3. Log in as admin@hexafitness.local / admin123 straight from the login page.

### [Intermediate] Predictable password-reset token
- Objective: Reset tokens must be long, random and single-use; anything derivable from a user id is public knowledge.
- Hints:
  1. Request a reset, then look at the token format — it is computed from something public.
  2. The token is HF-<user id>-<a simple arithmetic function of the id>. User ids are sequential.
  3. For Bob (id 3) the token is HF-3-(3*137+42) = HF-3-453. POST it to /reset with a new password — no email needed.

### [Intermediate] Session/role cookie tampering
- Objective: Role and privilege data must live server-side in the session; anything the client sends can be edited by the client.
- Hints:
  1. After login, inspect your cookies — one of them repeats your role back to the server.
  2. The server trusts the hx_role cookie more than its own database.
  3. As a plain member, set the cookie hx_role=trainer and open /trainer.

## Registration & Profile

### [Beginner] Weak password policy (1-character passwords)
- Objective: A password policy is the cheapest control in the building; without one, brute force and guessing get trivial.
- Hints:
  1. Register a new account and shrink the password as far as it will go.
  2. There is no length or complexity check at all.
  3. Register with the password "x" — it is accepted.

### [Intermediate] Mass assignment — role / plan / credits at signup
- Objective: Bind only an explicit allow-list of fields on signup and profile updates; never Object.assign the request body.
- Hints:
  1. The signup form shows name/email/password — the handler copies far more than that.
  2. The server assigns the whole request body onto the new account object.
  3. POST /register with extra fields role=admin, plan=Premium and credits=999 and check your new powers.

### [Intermediate] Stored XSS in display name
- Objective: User-controlled text must be output-encoded on every render; one stored payload fires for every viewer, including admins.
- Hints:
  1. Your display name is printed back on member lists and the admin screen — is it encoded?
  2. Register with an HTML/JS payload as your name.
  3. Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)> and view the member directory.

### [Intermediate] CSRF on profile update
- Objective: State-changing forms need an unguessable anti-CSRF token verified server-side; cookies alone ride along automatically.
- Hints:
  1. Your own forms carry a hidden hx_marker field backed by a cookie. What happens if a POST arrives without it?
  2. The profile handler never checks the marker or the Origin.
  3. POST /profile/update from curl (no marker, foreign Origin) and change your email — it just works.

## Membership & Payments

### [Beginner] Premium membership activated at a tampered price
- Objective: Prices are server-side truth. Anything priced by the client will be repriced by the client — to zero.
- Hints:
  1. The upgrade form posts the plan AND its price. Only one of those should come from you.
  2. The server charges — and honours — whatever price the request claims.
  3. As Bob (Free), POST /membership/buy with plan=Premium and price=0.

### [Intermediate] Membership expiry forged via freeze/extend field
- Objective: Every numeric field a client can send is a negotiation; durations and dates that carry money must be bounded server-side.
- Hints:
  1. The membership freeze form has a legitimate days field — and accepts a second, hidden one.
  2. An extendDays parameter is added straight onto your expiry date, unchecked.
  3. POST /membership/freeze with days=7 and extendDays=365 and watch memberUntil jump a year.

### [Intermediate] Freeze another member’s membership (IDOR)
- Objective: Every object reference in a request must be authorised against the session — "they sent the id" is not permission.
- Hints:
  1. The freeze endpoint accepts a userId. Whose did you think it checks?
  2. It never compares the target id with your session.
  3. POST /membership/freeze with userId=4 (Carol) from your own account and check her status.

## Class Bookings

### [Beginner] Booking into a full class (capacity not enforced)
- Objective: Business invariants (capacity, stock, seats) must be enforced where the state changes — on the server, transactionally.
- Hints:
  1. HIIT Blast seats 2 and both seats are taken. What does the booking endpoint think?
  2. Capacity is displayed in the UI but never checked on the server.
  3. POST /classes/2/book as Bob — a third seat appears.

### [Beginner] Cancel another member’s booking (IDOR)
- Objective: Cancel/modify endpoints are IDOR magnets: always verify the record belongs to the caller.
- Hints:
  1. Bookings have small sequential ids and a cancel endpoint that trusts them.
  2. Ownership is never compared with your session.
  3. Cancel booking id 2 — that seat belongs to Carol.

## Personal Training

### [Beginner] PT session booked with zero credits
- Objective: Paid actions must check entitlement at the moment of the transaction, server-side, every time.
- Hints:
  1. PT sessions are paid from a credit balance. Bob has 0 credits — try booking anyway.
  2. The booking handler never looks at the balance.
  3. As Bob, POST /pt/book with trainerId=5 and watch the session appear.

### [Intermediate] PT session price tampering
- Objective: Like membership prices, service prices must be resolved server-side from the catalogue, never from the request.
- Hints:
  1. A PT session costs $60 — according to a field in the booking request.
  2. The server stores and charges the price you send.
  3. As Alice, POST /pt/book with trainerId=6 and price=1.

## Progress & Trainer Notes

### [Beginner] View another member’s progress (IDOR)
- Objective: Health-adjacent data (weight, measurements) is sensitive personal data — object-level authorisation is mandatory.
- Hints:
  1. Your progress page lives at /progress/<your id>. The ids are sequential.
  2. The page never checks that the id is yours.
  3. Open /progress/4 as Alice and read Carol’s weight history.

### [Intermediate] Read another member’s private trainer notes (IDOR)
- Objective: "Private" in the UI copy is not access control. Notes about health need the strictest object checks in the app.
- Hints:
  1. Trainer notes are labelled staff-only — including a medical rehab note about Bob.
  2. The notes page takes a member id and checks nothing.
  3. Open /notes/3 as any member and read Bob’s private rehab note.

### [Intermediate] Stored XSS in trainer notes
- Objective: Free-text staff fields are stored-XSS carriers too; encode on output no matter who typed it.
- Hints:
  1. Trainers write free-text notes that members and admins read back — rendered raw.
  2. A payload planted by a trainer fires in the browsers of everyone who opens the notes.
  3. As Tom, POST /trainer/notes for member 2 with text containing <script>alert(1)</script>, then open /notes/2.

## Guest Passes

### [Intermediate] Guest pass redeemed twice (no single-use check)
- Objective: Single-use tokens must be consumed atomically and checked on every redemption.
- Hints:
  1. Alice has pass GP-2-1, unused. Redeem it — then redeem it again.
  2. The used flag is written but never read.
  3. POST /guest/redeem with code GP-2-1 twice; both succeed.

### [Intermediate] Forged / predictable guest pass accepted
- Objective: Identifiers that double as secrets must be unguessable and verified against issued records.
- Hints:
  1. Pass codes look like GP-<member id>-<number>. What does the desk actually verify?
  2. Only the format and that the member exists — never that the pass was issued.
  3. Redeem GP-3-99: Bob never issued a pass 99, yet it is accepted.

## Search

### [Beginner] Reflected XSS in search results
- Objective: Reflected input must be encoded in the response; search pages are the classic delivery vehicle for phishing links.
- Hints:
  1. The results page repeats your query back to you — unencoded.
  2. Put markup in q and view the page source.
  3. Search for <script>alert(1)</script> and watch it land raw in the heading.

### [Intermediate] SQL injection in search dumps all members
- Objective: Every input that reaches a query needs parameterisation — search boxes are the most-tested input on any site.
- Hints:
  1. Search builds its member query the same sloppy way login does.
  2. A tautology in q turns a name search into a full member list.
  3. Search for ' OR '1'='1 and read every member’s email and plan.

## Admin Panel

### [Beginner] Admin panel open to any logged-in member
- Objective: Every privileged route needs a server-side role check on every request; obscurity is not a control.
- Hints:
  1. The admin console is "hidden" — there is no link in the member UI. Hidden is not protected.
  2. No role check runs on /admin at all.
  3. Log in as Bob and open /admin directly.

## Platform & API

### [Intermediate] Weak API token (base64 of email) reads any member
- Objective: API tokens must be random, secret and scoped; an identifier is not a credential, and tokens never replace per-object authorisation.
- Hints:
  1. The JSON API authenticates with a Bearer token. It is derived from something you know about every user.
  2. The token is simply base64(email) — and the endpoint never checks the token owner against the record requested.
  3. Send GET /api/members/4 with Authorization: Bearer <base64 of alice@test.local> and read Carol’s record.
