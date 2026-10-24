# HexaTravel (LAB 71) — Practice Guide

Challenges grouped by feature, then difficulty. Pass each test by actually performing the exploit — the server detects the real effect. Hints are also on the in-app Mission Board (/tests), and the Lab Coach unlocks step-by-step help after 3 genuine attempts on a feature.

## Login & Authentication

### SQL injection login bypass (Beginner)
- Objective: make the "auth-sqli" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The login form builds its query by gluing your input into a string.
  2. Try a classic tautology in the email field, e.g. ' OR '1'='1
  3. Use email: ' OR '1'='1' --  with any password to land in an account without knowing its password.

### Brute force — no rate limit or lockout (Beginner)
- Objective: make the "auth-brute" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Keep guessing passwords for one account — does anything ever slow you down?
  2. Script 10+ wrong passwords for alice@test.local and watch the responses stay identical.
  3. After 10 failed attempts the app still happily processes more: the missing throttle is the flaw.

### User enumeration via login & forgot-password (Beginner)
- Objective: make the "auth-enum" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Compare the error for an email that exists with one that does not.
  2. The forgot-password form leaks the same difference.
  3. Probe 5+ different emails across login/forgot and note the two distinct messages.

### Default / demo credentials still active (Beginner)
- Objective: make the "auth-default" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The login page itself publishes demo accounts.
  2. One of them is the administrator account.
  3. Sign in as admin@hexatravel.local with the published demo password admin123.

### Predictable password-reset token (Intermediate)
- Objective: make the "auth-reset" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Reset tokens here are not random — they are computed from something public.
  2. Look at how a token relates to the numeric user id.
  3. The token is 'HT-' + base36(userId x 137 + 42). Compute Bob's (id 4) and reset his password without ever requesting a reset email.

### Session/role cookie tampering (Intermediate)
- Objective: make the "auth-cookie" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. After login, inspect the cookies the app trusts.
  2. One cookie carries your role — and the server believes whatever it says.
  3. Set the hx_role cookie to 'agent' and open the agent console at /agent.

## Registration & Profile

### Weak password policy (1 character) (Beginner)
- Objective: make the "reg-weak" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Register a new account and try the shortest password it will accept.
  2. There is no length or complexity check at all.
  3. A one-character password like "x" is accepted.

### Stored XSS in display name (Beginner)
- Objective: make the "reg-xss" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Your display name is printed back on pages other users (and the admin) see.
  2. Names are rendered without escaping.
  3. Register (or rename yourself) with a name containing a <script> payload and view a page that prints it.

### Mass assignment — role & credit at signup (Intermediate)
- Objective: make the "reg-mass" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The signup form only shows name/email/password, but the server binds the whole request body.
  2. Add extra fields to the registration POST and see which ones stick.
  3. Register with role=agent (or a big credit value) in the POST body and check your new powers.

### CSRF on profile update (Intermediate)
- Objective: make the "reg-csrf" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Legit forms carry a hidden hx_origin marker. What happens if a POST arrives without it?
  2. The server never checks the marker — or the Origin — on profile update.
  3. POST to /profile as a logged-in user with no hx_origin field and confirm the change sticks.

## Search & Packages

### SQL injection in package search (Beginner)
- Objective: make the "search-sqli" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Search also builds its query from your raw text.
  2. A tautology here changes which rows come back.
  3. Search for ' OR '1'='1 and look for a package that never appears in normal results (an unlisted internal one).

### Reflected XSS in search (Beginner)
- Objective: make the "search-xss" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Your search text is echoed into the results page heading.
  2. It is echoed without escaping.
  3. Search for a <script> payload and view the page source / response.

### Agent-only fare rules exposed to travellers (Beginner)
- Objective: make the "pkg-notes" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Package records contain an internal "agent notes" field with fare rules.
  2. Open any package page as a normal traveller and read everything on it.
  3. The agent-only fare rule is printed right on the public package page.

## Booking & Payments

### Price-per-person tampering at checkout (Beginner)
- Objective: make the "book-price" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The booking form carries the price and total in hidden fields computed "in the browser".
  2. The server trusts the posted total.
  3. Book a package and POST a total of 1 instead of the real amount.

### Booking a sold-out departure (Beginner)
- Objective: make the "book-soldout" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. One departure (Iceland Northern Lights) is fully booked — 20 of 20 seats taken.
  2. The booking endpoint never re-checks capacity.
  3. Book the sold-out package anyway and confirm your reservation is created.

### Traveller-count forgery (pay for 1, book for 4) (Intermediate)
- Objective: make the "book-count" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The form has separate fields for how many travel and how many you pay for.
  2. The server books the first number and charges the second.
  3. Book with travellers=4 and payFor=1 and a matching total — four seats, one fare.

### Voucher stacking (two codes on one booking) (Intermediate)
- Objective: make the "voucher-stack" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The booking form accepts a voucher… and a second voucher field too.
  2. Discounts combine multiplicatively with no rule against it.
  3. Apply SAVE10 together with TRAVEL20 on one booking and watch both discounts land.

### Single-use voucher reused (Intermediate)
- Objective: make the "voucher-reuse" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. AGENT50 is described as single-use per customer.
  2. Nothing records that you already redeemed it.
  3. Use AGENT50 on two separate bookings as the same user — it works both times.

## Reservations & Documents

### Reservation IDOR — view another traveller's booking (Beginner)
- Objective: make the "res-idor" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Reservations have simple sequential ids in the URL.
  2. Ownership is never checked when one is opened.
  3. Open /reservation/2 while signed in as Alice — that is Bob's booking.

### Travel document IDOR — download another traveller's documents (Beginner)
- Objective: make the "doc-idor" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Each reservation carries travel documents with their own ids.
  2. The document endpoint checks login — but not whose document it is.
  3. Download document 2 (Bob's Bali vouchers) while signed in as Alice.

### Path traversal on document download (Intermediate)
- Objective: make the "doc-traversal" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The /download endpoint takes a file name and joins it to the documents folder.
  2. Nothing stops you from walking up the directory tree.
  3. Request /download?file=../server.js and read the application source.

## Reviews

### Stored XSS in package reviews (Beginner)
- Objective: make the "review-xss" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Reviews are printed on the package page for every visitor.
  2. Review text is stored and rendered raw.
  3. Post a review containing a <script> payload on any package and open its page.

## Admin Panel

### Admin panel open to any signed-in user (Beginner)
- Objective: make the "admin-bac" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The admin console lives at a guessable URL.
  2. It checks that you are signed in — nothing more.
  3. Open /admin as Alice, a plain traveller, and read the user list.

### CSRF on admin package deletion (Intermediate)
- Objective: make the "admin-csrf" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Admin actions are plain POSTs; the hx_origin marker is issued but never verified here either.
  2. A request forged from another site carries the admin's cookies automatically.
  3. POST to /admin/package/delete without the hx_origin marker and confirm the package disappears.

## Platform & API

### Unauthenticated debug endpoint dumps all users (Beginner)
- Objective: make the "api-debug" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. Development leftovers often live at predictable paths.
  2. Try /api/debug with no session at all.
  3. The endpoint returns every account — including plaintext passwords.

### Weak API token (base64 of email) (Intermediate)
- Objective: make the "api-token" test flip to done on /tests by exploiting the flaw end-to-end.
- Hints:
  1. The JSON API authenticates with an X-Api-Token header.
  2. The "token" is a reversible encoding of something public about the user.
  3. Send X-Api-Token: base64 of bob@test.local to /api/bookings and read Bob's reservations with no password.
