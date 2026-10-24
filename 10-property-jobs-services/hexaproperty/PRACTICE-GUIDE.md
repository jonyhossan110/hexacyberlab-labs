# HexaProperty (LAB 91) — Practice Guide

Challenges grouped by feature, then difficulty. Each has 3 graded hints and one measurable objective: make the test flip to DONE on the Mission Board (/tests) by producing the real exploit effect.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The login form builds its database query by pasting your input straight into the query string.
- Hint 2: A quote character in the email field can break out of the string the query expects.
- Hint 3: Use the admin email, then a quote and a SQL comment (-- ) so the password check is commented out.

### No Brute-Force Protection on Login (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Nothing slows you down or locks the account when a password guess is wrong.
- Hint 2: Repeat failed logins against one account and watch whether the app ever delays, CAPTCHAs or locks you out.
- Hint 3: Submit 10 wrong passwords for one real account — the 10th attempt is still processed exactly like the first.

### User Enumeration via Login and Reset Responses (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Compare the exact wording of errors for an email that exists versus one that does not.
- Hint 2: The forgot-password page is the most talkative — try it with real and invented addresses.
- Hint 3: Probe at least 5 different emails on /forgot; the responses confirm which accounts exist.

### Demo Credentials Published on the Login Page (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Read the login page carefully — it helpfully tells you a working username and password.
- Hint 2: Demo accounts are real accounts on the live system.
- Hint 3: Sign in with the demo buyer credentials printed under the login form.

### Predictable Password-Reset Token (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Reset tokens are not random — they are computed from something you can learn about the account.
- Hint 2: Tokens look like HP<id>-<number>. Account IDs leak in URLs and admin/debug views; the number is simple arithmetic on the ID.
- Hint 3: For account id N the token is HP<N>-<N*137+42>. Compute it for an owner account and POST it to /reset with a new password — no email needed.

### Role Trusted from a Client Cookie (hx_role) (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: After login, look at the cookies the portal sets — one of them describes your role.
- Hint 2: Cookies live on the client, so their contents can be edited with browser tools or curl.
- Hint 3: Sign in as a buyer, then request /agent with the hx_role cookie changed to agent (or admin).

## Registration & Profile

### Weak Password Policy at Registration (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The sign-up form claims passwords must be strong — test whether the server actually enforces it.
- Hint 2: Try registering with a very short password.
- Hint 3: Register a new account with the single-character password "x" — it is accepted.

### Stored XSS in Display Name (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Your display name is shown back on many pages — check whether HTML in it is escaped.
- Hint 2: Register (or rename yourself) with markup instead of a plain name.
- Hint 3: Use a name like <script>alert(1)</script> — it is stored and rendered unescaped, including in the admin user list.

### Mass Assignment at Registration (role / featuredCredits) (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The registration handler copies more of your submitted form than the visible fields.
- Hint 2: Add extra form fields the UI never shows — think about which account attributes would be valuable.
- Hint 3: POST /register with extra fields role=admin and featuredCredits=50 — the new account is created with them.

### CSRF on Profile Update (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The portal marks its own forms with a hidden hx_origin field — but does the server check it?
- Hint 2: Replay a profile update without the marker, as a cross-site form would.
- Hint 3: POST /profile with a new name/email and NO hx_origin field — the change is applied anyway.

## Search & Listings

### Reflected XSS in Search Results (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The results page repeats your search term back to you in the heading.
- Hint 2: Check whether that reflection is escaped.
- Hint 3: Search for <script>alert(1)</script> — the payload comes back in the page unescaped.

### Unpublished (Draft) Listing Visible by Direct URL (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Listing IDs are sequential. Drafts are hidden from search and the homepage — but are they hidden everywhere?
- Hint 2: Guess the URL of a listing that is not shown publicly.
- Hint 3: As a buyer, open /listings/2 — the draft villa, including its internal agent notes, is served.

### SQL Injection in Property Search Leaks Draft Listings (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Search builds its query the same unsafe way the login does.
- Hint 2: A normal search never shows draft (unpublished) listings — injection can change which rows the query returns.
- Hint 3: Search for ' OR '1'='1 and the unpublished Lakeview Villa draft appears in the results.

## Listings Management

### Edit Another Owner's Listing (Broken Access Control) (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The edit endpoint trusts that whoever posts to it owns the listing.
- Hint 2: You do not need to own a listing to open its edit action — only to see the button.
- Hint 3: As a buyer, POST /listings/3/edit with a new price — Omar’s studio is repriced.

### Featured-Listing Price Tampering (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Featuring a listing costs $49 — but the amount travels through the client.
- Hint 2: Intercept or hand-craft the feature request and look at what the server trusts.
- Hint 3: POST /listings/1/feature as its owner with amount=1 — the listing is featured and only $1 recorded.

### Unrestricted File Upload — HTML Served from the Portal (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Listing photos are uploaded as a filename plus content, then served back from the portal’s own domain.
- Hint 2: Nothing checks that the "photo" is actually an image.
- Hint 3: POST /listings/1/photo with filename evil.html and HTML content, then open /uploads/evil.html — it is served as a web page.

## Inquiries

### Read Another Buyer's Inquiry with Private Contact Details (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Inquiries have sequential IDs and contain the buyer’s email and phone.
- Hint 2: Who is allowed to open an inquiry — and who actually can?
- Hint 3: As Ben, open /inquiries/1 — Bella’s inquiry, phone number included, is served to you.

### Delete an Inquiry on Someone Else's Listing (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Deleting an inquiry is a state-changing action with the same missing ownership check as reading.
- Hint 2: Find an inquiry that belongs to a listing you do not own and a buyer you are not.
- Hint 3: POST /inquiries/1/delete as Ben — Bella’s inquiry to Olivia is gone.

## Appointments

### Cancel Another Buyer's Viewing Appointment (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Appointment IDs are sequential and the cancel action does not ask who you are.
- Hint 2: You only need the ID of someone else’s appointment.
- Hint 3: POST /appointments/1/cancel while signed in as Bella — Ben’s viewing is cancelled.

### Double-Booking the Same Viewing Slot (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: A viewing slot for a listing should hold exactly one buyer.
- Hint 2: Look at existing appointments, then book the identical listing and slot again.
- Hint 3: POST /appointments for listing 1 at 2026-11-02 10:00 — already taken by Ben — and yours is accepted too.

### Buyer Confirms Own Appointment via the Agent/Owner Action (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Appointments start as "pending" until the owner or agent confirms them.
- Hint 2: The confirm endpoint exists — the question is who the server lets call it.
- Hint 3: Book your own viewing, then POST /appointments/<your id>/confirm as the buyer — it flips to confirmed.

## Saved Searches

### Read Another User's Saved Search and Alert Email (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Saved searches reveal what a buyer wants and their maximum budget.
- Hint 2: They also have sequential IDs.
- Hint 3: As Bella, open /saved/2 — Ben’s saved search, budget and alert email are shown.

## Admin Panel

### Admin Panel Open to Any Signed-In User (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The admin panel is just a URL. What does the server check before serving it?
- Hint 2: Try it with the least-privileged account you have.
- Hint 3: Sign in as the demo buyer and open /admin — the full user list, passwords included, is served.

### CSRF on Admin User Deactivation (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Admin actions are plain POSTs. The admin forms carry an hx_origin marker — is it verified?
- Hint 2: Replay a deactivation request without the marker, as a cross-site form would send it.
- Hint 3: As admin, POST /admin/deactivate with a userId and no hx_origin — the account is deactivated.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Accounts (Beginner)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: Developers leave helpful endpoints behind. Guess the obvious one under /api.
- Hint 2: It needs no login at all.
- Hint 3: GET /api/debug returns every user, including passwords, as JSON.

### Weak API Key — Base64 of the Account Email (Intermediate)
- Objective: trigger the real effect of this flaw so the server marks the test DONE.
- Hint 1: The JSON API authenticates with an x-api-key header instead of a session.
- Hint 2: The key is derived from something public about the account — no secret involved.
- Hint 3: Send GET /api/my-data with x-api-key set to the base64 of olivia@hexaproperty.local — her listings, inquiries and saved searches come back, no login needed.
