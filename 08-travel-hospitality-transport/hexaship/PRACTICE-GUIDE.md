# HexaShip — Practice Guide (LAB 76)

Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests. Hints are graded: 1 = nudge, 2 = stronger, 3 = near-answer. A challenge is complete only when the exploit really works against the app.

## Login & Authentication

### Brute Force — No Rate Limiting or Lockout (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Nothing slows you down when a password guess is wrong.
- Hint 2: There is no CAPTCHA, no delay and no account lockout — count the failures.
- Hint 3: Submit 10 wrong passwords for one account; the 10th is still processed like the 1st.

### User Enumeration via Login & Password Reset (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Compare the answers for an email that exists with one that does not.
- Hint 2: The forgot-password page is especially talkative about which accounts are real.
- Hint 3: Probe at least 5 different emails and note how the responses differ.

### Published Demo Credentials (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Read the login page carefully — it tries to be helpful to new users.
- Hint 2: A demo account is advertised right on the page, password included.
- Hint 3: Log in with the demo credentials printed on the login page.

### SQL Injection Login Bypass (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The login form builds its database query by gluing your input straight into the SQL string.
- Hint 2: A quote character lets you step out of the value and add your own logic to the WHERE clause.
- Hint 3: Try email: ' OR '1'='1 with any password — a true condition makes the first matching row (the admin) log in.

### Predictable Password-Reset Token (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Reset tokens here are not random — they are computed from something public about the account.
- Hint 2: The token format mentions the user id. What simple arithmetic could produce the rest?
- Hint 3: For user id N the token is SHP-N-(N*137+42). Compute Bob’s (id 4) and reset his password without ever requesting a reset.

### Role Cookie Tampering (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The app trusts a cookie to tell it what role you have.
- Hint 2: Your browser lets you edit cookies. One of them is named after a role.
- Hint 3: Set the hx_role cookie to admin, then visit /admin — the server believes the cookie, not your account.

## Registration & Profile

### Weak Password Policy (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: How short a password will the registration form accept?
- Hint 2: There is no minimum length check at all.
- Hint 3: Register a new account with the single-character password "x".

### Stored XSS in Display Name (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Your display name is shown back on pages without being cleaned.
- Hint 2: HTML typed into the name field is stored and rendered as-is.
- Hint 3: Register (or rename yourself) with the name <script>alert(1)</script> and look at any page that shows it.

### Mass Assignment — Role & Credit at Registration (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The registration handler copies more of your form than it shows you.
- Hint 2: What fields does a user record have that the form never displays — role? credit balance?
- Hint 3: Register while adding extra form fields role=staff and credit=5000; the new account keeps both.

### CSRF on Profile Update (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Profile changes are accepted from a bare POST — no anti-CSRF token is verified.
- Hint 2: The app’s own forms carry a hidden hx_origin marker; the server never checks it.
- Hint 3: Submit the profile form without the hx_origin marker (e.g. with curl) and the change still applies.

## Parcels & Pricing

### Negative Weight — Negative Total (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Does the server ever check that a weight is a sensible, positive number?
- Hint 2: Negative inputs turn totals negative — and a negative bill is a credit.
- Hint 3: Create a parcel with weight -5 and its matching negative price; it is accepted and the total goes below zero.

### Weight/Price Tampering — 20 kg at the 1 kg Price (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The create-parcel form computes the price in the browser and posts it along.
- Hint 2: The server trusts the price it is sent instead of pricing the parcel itself.
- Hint 3: Create a 20 kg standard parcel but post the 1 kg price ($5.50). The server truth for 20 kg standard is $34 — you pay $5.50.

### Service-Level Upgrade Forgery (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Express costs more than Standard — but who checks that you paid the express price?
- Hint 2: The service level and the price travel together in one form post.
- Hint 3: Create a 2 kg EXPRESS parcel but post the standard price for 2 kg ($7). You get express service at the standard rate.

## Tracking & Delivery

### Tracking IDOR — Sequential Tracking Numbers (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Tracking numbers here are just counters: SHP1001, SHP1002, …
- Hint 2: The tracking page shows the full journey — and the delivery address — to anyone who asks.
- Hint 3: Track a parcel that is not yours, e.g. SHP1002 (Bob’s), while logged in as Alice.

### Forged "Delivered" Tracking Event by a Customer (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Tracking events are added through an endpoint meant for courier staff.
- Hint 2: Nothing checks that the person posting an event actually is staff.
- Hint 3: As a customer, POST a tracking event with status Delivered to /parcels/<your parcel id>/events — the parcel is suddenly "delivered".

### Destination Change on an In-Transit Parcel (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Business rule: once a parcel is out for delivery, its destination is locked.
- Hint 2: The change-address endpoint never asks what state the parcel is in.
- Hint 3: Take Bob’s "Out for delivery" parcel (as Bob) — or your own in-transit one — and POST a new destination to /parcels/<id>/address. It changes.

## Labels & Invoices

### Shipping Label IDOR (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Labels carry both the sender and the recipient address in full.
- Hint 2: The label URL is just the parcel id — /parcels/<id>/label.
- Hint 3: Open the label of a parcel that belongs to someone else (e.g. parcel 2, Bob’s).

### Invoice IDOR (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Invoices are numbered in order and the page never asks whose invoice it is.
- Hint 2: Try /invoices/2 while logged in as Alice — that one is Bob’s.
- Hint 3: Any invoice id you can guess, you can read: amounts, addresses, parcel details.

### Invoice Payment Amount Tampering (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The pay-invoice form lets the client say how much they paid — and whether it settles the bill.
- Hint 2: A "settle in full" flag from the client is taken at face value.
- Hint 3: Pay your $7 invoice with amount=1 and settle=full: the invoice flips to PAID for $1.

## Address Book

### Address Book IDOR — Edit Another Customer’s Address (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Saved addresses have simple ids too — and the edit form trusts them.
- Hint 2: Your address book shows your entries; the edit URL takes any id.
- Hint 3: Open /addresses/2/edit as Alice (that address is Bob’s) and save a change. It sticks.

## Search

### Reflected XSS in Search (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The results page repeats your search term back to you — uncleaned.
- Hint 2: Put markup in the query and view the page source.
- Hint 3: Search for <script>alert(1)</script> and it is reflected verbatim into the page.

### SQL Injection in Parcel Search (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Search glues your query text into SQL the same way the login form does.
- Hint 2: A tautology in the WHERE clause makes every row match.
- Hint 3: Search for ' OR '1'='1 and the results include everyone’s parcels, not just yours.

## Staff & Admin Panel

### Staff Console Broken Access Control (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The staff console URL is /staff. Who does it actually let in?
- Hint 2: It checks that you are logged in — not that you are staff.
- Hint 3: Log in as a normal customer and simply visit /staff.

### CSRF on Admin User Deactivation (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Admin actions ride on the admin’s cookies, with no token check — the same missing-marker flaw as the profile form, one level up.
- Hint 2: The deactivate button form carries an hx_origin marker that nobody verifies.
- Hint 3: As admin, POST /admin/users/5/deactivate without the hx_origin marker; the user is deactivated anyway.

## Platform & API

### Unauthenticated Debug Data Dump (Beginner)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: Developers leave helpers behind. This one answers at /api/debug.
- Hint 2: No login, no token, no questions asked.
- Hint 3: Fetch /api/debug in a fresh browser (or curl) and read the entire user table — passwords included.

### Weak API Token — base64 of the Email Address (Intermediate)
- Objective: perform the attack so its real effect happens in the app (the Mission Board flips to done automatically).
- Hint 1: The API authenticates with an X-API-Key header. The key is derived from something public.
- Hint 2: Try reversible encodings of your own email address.
- Hint 3: The token is shp_ + base64(email). Forge Alice’s and call GET /api/parcels with no session cookie at all.
