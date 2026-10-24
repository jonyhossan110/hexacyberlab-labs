# HexaCourier — Practice Guide (LAB 77)

Challenges grouped by feature, then difficulty. Each challenge is scored on the /tests Mission Board: it completes only when the exploit actually works.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** make the "SQL Injection Login Bypass" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The login form builds its query by gluing your input straight into SQL.
  2. Try a quote in the email field and watch how the behaviour changes.
  3. Use email: ' OR '1'='1 with any password — the check ends up comparing the quote logic, not your password.

### [Beginner] Brute Force — No Rate Limiting
- **Objective:** make the "Brute Force — No Rate Limiting" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Nothing slows you down when a password is wrong.
  2. Script 10+ wrong passwords for one account: no lockout, no CAPTCHA, no delay.
  3. The 10th wrong attempt is processed exactly like the first — the missing throttle is the flaw.

### [Beginner] User Enumeration via Login & Forgot-Password
- **Objective:** make the "User Enumeration via Login & Forgot-Password" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Compare the error for an email that exists with one that does not — on both forms.
  2. The forgot-password form is even more talkative than the login form.
  3. Probe at least 5 different emails; the different answers confirm which accounts exist.

### [Beginner] Published Demo Credentials
- **Objective:** make the "Published Demo Credentials" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Read the login page carefully — the site itself hands out a working account.
  2. Demo accounts created for convenience are rarely removed in production.
  3. Sign in with the demo courier credentials printed under the login form.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** make the "Predictable Password-Reset Token" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Look at the shape of a reset token — then look at the account's user id.
  2. The token is computed from something public about the account, not generated randomly.
  3. Token = HC- plus a base36 value derived from the user id (id x 911 + 77). Compute another user's token and reset their password without any email.

### [Intermediate] Session Role Cookie Tampering
- **Objective:** make the "Session Role Cookie Tampering" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. After login, inspect the cookies the app sets — your role travels with your browser.
  2. The dispatch console trusts a cookie instead of the server-side account record.
  3. Set the hx_role cookie to dispatcher and open /dispatch — the server never checks your real role.

## Registration & Profile

### [Beginner] Weak Password Policy
- **Objective:** make the "Weak Password Policy" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Try registering with a one-character password.
  2. The form accepts anything — there is no length or complexity check at all.
  3. Create an account with password 'x' — it works, and that is the vulnerability.

### [Beginner] Stored XSS in Display Name
- **Objective:** make the "Stored XSS in Display Name" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Your display name is printed back on dashboards and staff screens without escaping.
  2. Put an HTML/JS payload where a name should be, then look at where that name appears.
  3. Register with the name <script>alert(1)</script> — it is stored and rendered raw to staff.

### [Intermediate] Mass Assignment — Role & Credit at Registration
- **Objective:** make the "Mass Assignment — Role & Credit at Registration" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The registration handler copies more fields from your request than the form shows.
  2. Add fields the form never offered — the server trusts your request body.
  3. Register including role=dispatcher and credit=5000 — you are given both.

### [Intermediate] CSRF on Profile Update
- **Objective:** make the "CSRF on Profile Update" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The profile form carries a hidden marker that pretends to be CSRF protection — check whether the server verifies it.
  2. Submit the profile change from a plain script with no marker and no same-site Origin.
  3. POST /profile with a new phone number and no hx_marker field — the change is accepted anyway.

## Pickup Requests & Pricing

### [Beginner] Zone Fee / Price Tampering at Pickup Creation
- **Objective:** make the "Zone Fee / Price Tampering at Pickup Creation" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The server should price a pickup from the zone table — check what it actually uses.
  2. Your request can carry its own price field.
  3. Create a pickup for the Remote zone with price=1 — the parcel is booked for 1 instead of the real fee.

### [Beginner] IDOR — View Another Customer's Parcel
- **Objective:** make the "IDOR — View Another Customer's Parcel" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Parcel pages use a simple numeric id.
  2. You only ever see your own parcels in the list — but the detail page never checks ownership.
  3. Open /parcels/<id> for an id that is not yours — another customer's addresses and COD amount are shown.

### [Beginner] Cancel Another Customer's Pickup
- **Objective:** make the "Cancel Another Customer's Pickup" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Cancelling is just a POST with the parcel id.
  2. The cancel endpoint checks that you are logged in — nothing more.
  3. POST /parcels/<id>/cancel for someone else's parcel — it is cancelled.

### [Intermediate] Negative Weight Accepted (Quantity Tampering)
- **Objective:** make the "Negative Weight Accepted (Quantity Tampering)" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Weight feeds the fee formula — what happens below zero?
  2. The form validates the zone but never the weight range.
  3. Create a pickup with weightKg=-5 — it is accepted and drags the total below the zone fee.

## Delivery Jobs & Assignment

### [Beginner] IDOR — Proof of Delivery of Another Job
- **Objective:** make the "IDOR — Proof of Delivery of Another Job" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Proof-of-delivery pages carry the receiver's name and signature code.
  2. Like the parcel page, the POD page trusts the id in the URL.
  3. Open /pod/<id> for a parcel that is not yours — the receiver details are exposed.

### [Intermediate] Customer Assigns Delivery Jobs (Dispatcher Function)
- **Objective:** make the "Customer Assigns Delivery Jobs (Dispatcher Function)" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Assignment is meant for dispatchers — find the endpoint the dispatch page uses.
  2. The server never asks what role you hold when you call it directly.
  3. As a customer, POST /jobs/<id>/assign with a courierId — the job is assigned on your word.

### [Intermediate] Customer Marks Own Parcel Delivered (Courier Endpoint)
- **Objective:** make the "Customer Marks Own Parcel Delivered (Courier Endpoint)" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Delivery confirmation is a courier action — but who does the endpoint actually check?
  2. Call the courier's deliver endpoint while signed in as the customer.
  3. POST /jobs/<id>/deliver with a receiver name — the parcel becomes 'delivered'.

### [Intermediate] Courier Delivers a Job Assigned to Another Courier
- **Objective:** make the "Courier Delivers a Job Assigned to Another Courier" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The deliver endpoint checks that you are a courier — but not that the job is yours.
  2. Sign in as one courier and complete a job from another courier's list.
  3. Deliver a parcel whose courierId is a different courier — it succeeds.

## COD & Payments

### [Intermediate] COD Amount Forgery After Booking
- **Objective:** make the "COD Amount Forgery After Booking" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The cash-on-delivery amount is fixed at booking — or is it?
  2. There is an endpoint that updates it, and it asks no questions.
  3. POST /parcels/<id>/cod with a new codAmount — the courier will collect whatever you set.

### [Intermediate] COD Marked Collected for Less Than the Amount Due
- **Objective:** make the "COD Marked Collected for Less Than the Amount Due" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Collection should require the full COD amount.
  2. The collect endpoint marks the parcel settled for whatever number it is given.
  3. POST /parcels/<id>/cod-collect with amount=1 on a large COD parcel — the books say 'collected'.

## Courier Earnings & Manifest

### [Beginner] IDOR — Another Courier's Earnings
- **Objective:** make the "IDOR — Another Courier's Earnings" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Earnings pages are per-courier and use the courier's id in the URL.
  2. Your own earnings link works — so does everyone else's.
  3. Open /couriers/<otherId>/earnings — their delivered jobs and pay are listed for you.

### [Beginner] Dispatch Manifest Exposed to Customers
- **Objective:** make the "Dispatch Manifest Exposed to Customers" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The daily manifest lists every parcel, sender, recipient and address.
  2. It is a staff page — but the server hands it to anyone signed in.
  3. As a customer, open /manifest — the whole day's deliveries are yours to read.

## Search & Tracking

### [Beginner] Reflected XSS in Tracking Search
- **Objective:** make the "Reflected XSS in Tracking Search" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Your search text is echoed back on the results page.
  2. It is echoed without any encoding.
  3. Search for <script>alert(1)</script> — the payload comes back raw in the page.

### [Intermediate] SQL Injection in Parcel Tracking Search
- **Objective:** make the "SQL Injection in Parcel Tracking Search" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Tracking search glues your text into a query the same way the login form does.
  2. A quote in the tracking code changes the query's meaning.
  3. Search with ' OR '1'='1 — every parcel in the system is returned.

## Admin Panel

### [Beginner] Admin Console Open to Any Signed-In User
- **Objective:** make the "Admin Console Open to Any Signed-In User" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. The admin link is hidden from customers — the page itself is not protected.
  2. Just type the URL directly.
  3. Open /admin while signed in as a customer — the user list, roles and passwords are served.

## Platform & API

### [Beginner] Unauthenticated Debug Endpoint Dumps All Data
- **Objective:** make the "Unauthenticated Debug Endpoint Dumps All Data" test flip to done on /tests by performing the real exploit.
- **Hints:**
  1. Leftover debug routes are a classic production accident.
  2. This one needs no login at all.
  3. Open /api/debug in a private window — the full user and parcel data comes back as JSON.
