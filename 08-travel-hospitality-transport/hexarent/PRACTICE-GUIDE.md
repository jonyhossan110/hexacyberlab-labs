# HexaRent — Practice Guide (LAB 78)

Challenges grouped by feature, then difficulty. Each challenge has 3 graded hints (nudge → stronger → near-answer) — the same hints shown on the in-app Mission Board (`/tests`). A challenge is complete only when the exploit actually succeeds; the server detects the effect.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** Make the server record this exploit's real effect: String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.
- **Hints:**
  1. The login form builds its query by pasting your email straight into a string.
  2. Try a classic tautology in the email field: a quote, OR, and a comparison that is always true.
  3. Email: ' OR '1'='1 — the app logs you in as the first matching account.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] Brute Force — No Rate Limiting or Lockout
- **Objective:** Make the server record this exploit's real effect: Without throttling or lockout, password guessing is free and unlimited — weak passwords fall quickly.
- **Hints:**
  1. Keep guessing the same account's password — watch what does NOT happen.
  2. There is no CAPTCHA, no delay and no lockout, however many times you fail.
  3. Fail 10 logins in a row for one account; the 10th is still processed normally.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] User Enumeration via Divergent Responses
- **Objective:** Make the server record this exploit's real effect: Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.
- **Hints:**
  1. Compare the forgot-password answer for an email that exists with one that does not.
  2. The app is polite — too polite. One says a reset was sent; the other admits there is no account.
  3. Submit 5 different emails to /forgot and collect the two different answers.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] Demo Credentials Published on the Login Page
- **Objective:** Make the server record this exploit's real effect: Demo/default credentials left visible in production are an open door — attackers try them first.
- **Hints:**
  1. Read the login page carefully — it tries to be helpful.
  2. A demo account with its password is printed right under the form.
  3. Just log in with the published demo renter credentials.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Make the server record this exploit's real effect: Reset tokens must be long, random and single-use; a formula based on public values is no secret at all.
- **Hints:**
  1. Request a reset for an account you control and look at the token pattern.
  2. The token is computed from something you can see — the account's numeric id.
  3. Token = HR followed by (user id × 149 + 37). Compute another user's token without ever requesting a reset for them.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Role Cookie Tampering — Client-Supplied Role Trusted
- **Objective:** Make the server record this exploit's real effect: Authorization data must live server-side; anything stored on the client can be edited by the client.
- **Hints:**
  1. After logging in, inspect your cookies — one of them states your role.
  2. The owner console believes that cookie instead of the server-side account.
  3. Set the hx_role cookie to owner (or admin) and open /owner.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Registration & Profile

### [Beginner] Weak Password Policy — 1-Character Passwords Accepted
- **Objective:** Make the server record this exploit's real effect: Password policy is the first line of defence; accepting 1-character passwords makes brute force trivial.
- **Hints:**
  1. Register a new account and be lazy with the password.
  2. There is no minimum length at all.
  3. A password of a single character (e.g. "x") is accepted.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] Stored XSS in Display Name
- **Objective:** Make the server record this exploit's real effect: User-supplied text must be output-encoded everywhere it is rendered; one unescaped field poisons every viewer.
- **Hints:**
  1. Your display name is shown in the page header and in owner/admin lists — exactly as typed.
  2. Put a script payload where your name goes.
  3. Register (or rename yourself) with a name like <script>alert(1)</script> and view a page that renders it.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Mass Assignment — Role Set at Registration
- **Objective:** Make the server record this exploit's real effect: Bind only whitelisted fields from requests; blindly assigning every submitted field lets users grant themselves privileges.
- **Hints:**
  1. The registration form shows name, email, password — the server accepts more than it shows.
  2. What if the request also carried a role field?
  3. Add role=owner (or admin) to the registration POST and check your new powers.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the server record this exploit's real effect: State-changing requests need an unguessable CSRF token tied to the session; cookies alone are ambient authority.
- **Hints:**
  1. The profile form changes your name and phone with a plain POST.
  2. Nothing in the request proves it came from this site's own form.
  3. POST the profile change from another origin (or without the site's origin marker) while logged in.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Search & Listings

### [Beginner] Reflected XSS in Search Results
- **Objective:** Make the server record this exploit's real effect: Anything reflected into a page must be encoded for that context; search terms are a classic reflection point.
- **Hints:**
  1. The results page repeats your search term back to you — verbatim.
  2. What happens if the "term" is actually HTML?
  3. Search for <script>alert(1)</script> and look at the page source.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] SQL Injection in Listing Search — Hidden Draft Listings Leaked
- **Objective:** Make the server record this exploit's real effect: Search is an injection surface like any other; parameterise it, and filter unpublished rows in the query, not the template.
- **Hints:**
  1. The search box feeds a string-built query over the listings table.
  2. A tautology in the search term makes the WHERE clause match everything — even rows the public never sees.
  3. Search for: ' OR '1'='1 — the unpublished DRAFT villa appears in the results.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Listings Management

### [Intermediate] Edit Another Owner's Listing Price
- **Objective:** Make the server record this exploit's real effect: Function-level authorization must be enforced on the server for every write, not just by hiding the edit button from non-owners.
- **Hints:**
  1. Owners edit their listings at /listings/<id>/edit. The form checks ownership — the endpoint does not.
  2. Listing 2 belongs to Marcus. You are not Marcus.
  3. POST a new dailyRate to /listings/2/edit while logged in as anyone else.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Bookings

### [Beginner] Booking IDOR — View Another Renter's Booking
- **Objective:** Make the server record this exploit's real effect: Every object access must check that the requester is a party to the object — hiding links is not authorization.
- **Hints:**
  1. Your booking detail page has a number in its URL.
  2. Numbers are sequential. What is booking 2?
  3. Open /bookings/<id> for a booking that involves neither you nor your listings.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] Daily-Rate Tampering — Total Price Trusted from the Client
- **Objective:** Make the server record this exploit's real effect: Money figures must always be recomputed server-side from the catalogue truth; a client-sent total is a suggestion, not a fact.
- **Hints:**
  1. The booking form shows a total — computed in the browser and sent as a field.
  2. The server never recomputes days × daily rate.
  3. Book 3 nights but send totalPrice=1.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Security Deposit Waived by Parameter Forgery
- **Objective:** Make the server record this exploit's real effect: Every financial term of a transaction — price, deposit, fees — must be derived server-side, never accepted from the request.
- **Hints:**
  1. The deposit is also just a form field (depositAmount) on its way to the server.
  2. What if the deposit arriving at the server is 0?
  3. Book with depositAmount=0 — the booking confirms with no deposit held.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Double Booking — Availability Calendar Never Checked
- **Objective:** Make the server record this exploit's real effect: Availability is a core business invariant; it must be checked inside the booking transaction, not drawn on a calendar and forgotten.
- **Hints:**
  1. The Beach Apartment is already booked 2026-11-10 → 2026-11-12.
  2. The booking code never looks at existing bookings for those dates.
  3. Book the same listing for overlapping dates — it confirms as a second booking.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] Free Rental Extension — Extra Days Without Payment
- **Objective:** Make the server record this exploit's real effect: Any change that extends consumption of a paid resource must re-price and re-bill in the same server-side flow.
- **Hints:**
  1. Bookings can be extended from the detail page — a new end date is all it takes.
  2. Nobody recomputes the price for the extra days, and no new invoice appears.
  3. Extend your booking by 5 extra days and watch the amount owed stay exactly the same.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Invoices & Payments

### [Beginner] Invoice IDOR — View Another Party's Invoice
- **Objective:** Make the server record this exploit's real effect: Financial documents need the same per-object authorization as the bookings they belong to.
- **Hints:**
  1. Invoices live at /invoices/<id> with sequential ids.
  2. An invoice names the renter, the property and exactly what they paid.
  3. Open /invoices/3 as the demo renter — it belongs to Tom's booking.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Beginner] Invoice Payment Amount Tampering — Settles in Full for $1
- **Objective:** Make the server record this exploit's real effect: Payment state must be derived from server-side amounts and verified transactions, never from client-supplied figures.
- **Hints:**
  1. The pay form sends the amount as a field. The server trusts it completely.
  2. What does the server actually verify before marking an invoice PAID?
  3. Pay invoice 1 with amount=1 — the $660 invoice is marked fully paid.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Owner Payouts

### [Intermediate] Payout IDOR — View Another Owner's Payout
- **Objective:** Make the server record this exploit's real effect: Payout data is among the most sensitive financial data on a marketplace; per-object checks must compare the payout's owner to the session.
- **Hints:**
  1. Payouts live at /payouts/<id>. Owners are supposed to see only their own money.
  2. The handler serves any payout to any signed-in account.
  3. As Olivia (owner 1), open /payouts/2 — it is Marcus's payout. Even a renter can read it.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Damage Claims

### [Beginner] Damage Claim IDOR — View Another Party's Claim
- **Objective:** Make the server record this exploit's real effect: Dispute records are sensitive for both sides; access must be limited to the claim's parties and staff.
- **Hints:**
  1. Claims live at /claims/<id>, sequential as usual.
  2. A claim shows the item, the amount, and both parties.
  3. Open /claims/1 as the demo renter Rita — that claim is about Tom's rental, not yours.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Advanced] Renter Approves Their Own Damage Claim via the Owner Endpoint
- **Objective:** Make the server record this exploit's real effect: Workflow decision endpoints must verify the caller is the authorised decision-maker for that object; a hidden button is not a check.
- **Hints:**
  1. Owners decide claims at /claims/<id>/decide. The server never asks WHO is deciding.
  2. Claim 2 is a claim AGAINST you (Rita) by the apartment owner.
  3. As Rita, POST decision=rejected to /claims/2/decide — kill the claim against yourself.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Admin Panel

### [Beginner] Admin Panel Open to Any Logged-In User
- **Objective:** Make the server record this exploit's real effect: Every privileged route needs an explicit server-side role check; "nobody will guess the URL" is not a control.
- **Hints:**
  1. Try /admin while logged in as a plain renter.
  2. The handler simply forgot the role check.
  3. The full user list — emails and roles — renders for anyone with a session.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

### [Intermediate] CSRF on Admin User Deactivation
- **Objective:** Make the server record this exploit's real effect: Admin actions are the most dangerous CSRF targets; they need tokens and re-confirmation for destructive operations.
- **Hints:**
  1. Admins can deactivate users with a POST. No token protects it.
  2. An admin browsing a malicious page while logged in is enough.
  3. POST /admin/users/<id>/deactivate from a foreign origin with no site marker.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.

## Platform & API

### [Beginner] Unauthenticated Debug Endpoint Exposes All Accounts
- **Objective:** Make the server record this exploit's real effect: Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and must never include secrets.
- **Hints:**
  1. Developers leave helpers behind. Try /api/debug.
  2. No login is needed at all.
  3. The JSON includes every user — with passwords.
- **Coach rule:** after 3 genuine attempts on this feature, the Lab Coach will walk you through it step by step.
