# HexaBooking — Vulnerability Map (26 scored tests)

Every vulnerability below is a **scored test** in the lab's progress system. A test completes only when the server detects the exploit actually succeeding — there is no "mark done". Grouped by feature; counts match the in-app **🎯 Tests** page exactly.


## Login & Authentication — 6 test(s)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Critical
- **What it is:** String-built queries let an attacker rewrite the login logic itself. Parameterised queries make the input data, never code.
- **Business impact:** On a real booking platform this is a full account takeover of the first account in the table — often the platform admin — with no password at all.
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Fix:** Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Without throttling or lockout, an attacker can try thousands of passwords per account. Rate limits, lockouts and MFA are what make guessing infeasible.
- **Business impact:** A business owner account on a real platform would fall to a password-spray list overnight — and with it every customer reservation and payment record the business holds.
- **Report title:** No Rate Limiting or Account Lockout on Login
- **Fix:** Throttle attempts per account and IP, add progressive delays / lockout, and offer MFA.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Different error messages for "no such account" and "wrong password" hand attackers a free list of valid accounts to target.
- **Business impact:** An attacker harvests which business owners and customers use the platform, then focuses phishing and password attacks only on real accounts.
- **Report title:** Account Enumeration via Differential Authentication Responses
- **Fix:** Return one generic message ("invalid email or password") for every failure, on login and password reset alike.

### Weak / Default Credentials Still Active
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Demo, seed and vendor-default accounts survive into production all the time. If the password is guessable, the account is public.
- **Business impact:** A leftover demo account gives an attacker a free authenticated foothold — and on a multi-tenant platform, a stepping stone into other businesses' data.
- **Report title:** Active Default/Demo Account with Guessable Password
- **Fix:** Remove demo/seed accounts before launch, force password changes on first use, and audit for default credentials.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Reset tokens must be long, random and single-use. A token derived from public data (email, user id) is just a second, weaker password anyone can compute.
- **Business impact:** Anyone who knows a victim's email address can reset their password and take the account — owner accounts included — without ever touching the victim's inbox.
- **Report title:** Predictable Password Reset Token Allows Account Takeover
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.

### Session Cookie Tampering — Client-Side Role Trusted
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Critical
- **What it is:** Anything the client sends — cookies included — is attacker-controlled. Authorisation must be decided from server-side state, never from a client-carried role claim.
- **Business impact:** Any registered customer can promote themselves to platform admin by editing a cookie: every business, reservation and account on the platform is exposed.
- **Report title:** Broken Access Control — Role Trusted from Unsigned Session Cookie
- **Fix:** Keep sessions server-side (opaque random id) or sign and verify tokens server-side; always authorise from server-side records.


## Registration & Profile — 4 test(s)

### Mass Assignment — Role Elevation at Registration
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Binding request bodies straight onto account objects lets attackers set fields that were never on the form — roles, balances, verified flags.
- **Business impact:** Anyone can register directly as a business owner or admin on the live platform — full tenant access with a throwaway email, no exploit tooling needed.
- **Report title:** Mass Assignment in Registration Allows Role Elevation
- **Fix:** Whitelist bindable fields explicitly on every endpoint; never accept role/privilege fields from clients.

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** A password policy is the cheapest defence there is. Accepting 1-character passwords makes every account on the platform trivially guessable.
- **Business impact:** Customers who pick tiny passwords — and many will — hand their accounts (and stored payment details) to the first person who tries "a", "1" or "123".
- **Report title:** No Minimum Password Strength Enforced at Registration
- **Fix:** Enforce a minimum length (≥10–12) and block common passwords at registration and password change.

### Stored XSS via Display Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Stored XSS turns any user-controlled field into a weapon against other users — especially staff and admins who view it in dashboards.
- **Business impact:** A malicious customer can run JavaScript in a business owner's browser while they review reservations — stealing their session and hijacking the business account.
- **Report title:** Stored Cross-Site Scripting via User Display Name
- **Fix:** Contextually encode all user-controlled output; treat display names as untrusted data everywhere they render.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Anti-CSRF tokens only protect if the server verifies them on every state-changing request. A token that is rendered but never checked is decoration.
- **Business impact:** A booby-trapped web page can silently change a logged-in user's profile — and on similar endpoints, their email or password — just because they visited it.
- **Report title:** Missing CSRF Validation on Profile Update
- **Fix:** Verify the anti-CSRF token server-side on every state-changing request and check Origin/Referer as defence in depth.


## Businesses & Services — 3 test(s)

### Reflected XSS in Business Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** Reflected XSS lives wherever input is echoed without encoding — search boxes are the textbook example.
- **Business impact:** An attacker can send a business owner a crafted search link that runs script in their browser — a clean phishing and session-theft channel.
- **Report title:** Reflected Cross-Site Scripting in Search
- **Fix:** Encode all reflected input in the appropriate output context; deploy a Content-Security-Policy as a backstop.

### SQL Injection in Business Search Reveals Unlisted Businesses
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Injection anywhere is injection everywhere: the same string-building habit that breaks login also leaks data the UI was carefully hiding.
- **Business impact:** Competitors (or attackers) can enumerate businesses that opted out of the public directory — private tenants, test businesses, pre-launch clients.
- **Report title:** SQL Injection in Search Exposes Unlisted Records
- **Fix:** Parameterise the search query and enforce the listed/visibility filter server-side regardless of the query.

### Service Edit IDOR — Rewriting Another Business's Prices
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Object-level authorisation must be checked on every object access: "is this YOUR service?" is a server question, not a UI one.
- **Business impact:** A rival business can slash or spike a competitor's prices platform-wide — sabotage that customers see immediately and the victim may not notice for days.
- **Report title:** Insecure Direct Object Reference in Service Management
- **Fix:** Verify ownership of the target object on every read/write; scope all queries to the caller's tenant.


## Booking & Reservations — 5 test(s)

### Double-Booking — No Server-Side Slot Capacity Check
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Capacity is a server-side invariant. If the only thing stopping a double-booking is a greyed-out button, the data will double-book.
- **Business impact:** Real customers arrive to find their slot given away twice — refunds, chargebacks, and a calendar the business can no longer trust.
- **Report title:** Missing Server-Side Capacity Validation Allows Double-Booking
- **Fix:** Enforce slot capacity atomically in the booking transaction (unique constraint / serialised check-and-insert).

### Booking Price Tampering — Premium Service at a Client-Chosen Price
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Prices are server-side facts. Any price, discount or total arriving from the client must be recomputed from the catalogue, never trusted.
- **Business impact:** Every premium service on the platform can be bought for a dollar. Revenue leakage like this is silent — bookings look normal in every report.
- **Report title:** Client-Side Price Tampering in Booking Flow
- **Fix:** Ignore client-supplied prices; always recompute price and totals from server-side catalogue data.

### Duration Tampering — Longer Appointment Than Paid For
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Every attribute of a transaction — not just price — must be derived server-side. Durations, quantities and tiers are all billing/calendar facts.
- **Business impact:** Attackers (or cheap customers) block out entire days of staff time while paying for the shortest service — a denial-of-service against the business's diary.
- **Report title:** Client-Side Duration Tampering in Booking Flow
- **Fix:** Derive duration from the server-side service record; reject or ignore client-supplied durations.

### Reservation IDOR — Viewing Another Customer's Booking
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Severity (in a real client report):** High
- **What it is:** Sequential ids plus a missing ownership check equals a full data leak: every reservation on the platform is one increment away.
- **Business impact:** Names, phone numbers, appointment times and services of every customer leak — a privacy breach and a gift to social engineers targeting a business's clients.
- **Report title:** Insecure Direct Object Reference Exposes Customer Reservations
- **Fix:** Check that the requesting user owns (or staffs) the reservation on every access; use unguessable ids as defence in depth.

### Reservation Cancel IDOR — Cancelling Strangers' Appointments
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** State-changing actions need the same ownership checks as reads — a destructive IDOR is sabotage, not just disclosure.
- **Business impact:** A competitor can quietly cancel a rival's entire day of appointments. Customers show up to cancelled bookings; the business eats the blame.
- **Report title:** Insecure Direct Object Reference Allows Cancelling Other Customers' Reservations
- **Fix:** Authorise the actor against the target reservation on every state change; log and alert on cancellations.


## Staff & Schedules — 2 test(s)

### Staff Schedule IDOR — Rewriting a Rival's Availability
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Tenant boundaries must be enforced on staff/administrative objects too, not just customer-facing ones.
- **Business impact:** A rival can wipe a competitor's dentists off the calendar for a week — no bookings, no alerts, just mysteriously empty days.
- **Report title:** Insecure Direct Object Reference in Staff Schedule Management
- **Fix:** Scope schedule reads/writes to staff of the caller's own business (or the staff member themselves).

### Cross-Tenant Staff Assignment — Booking Dental Staff for a Salon Service
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** Medium
- **What it is:** Relational integrity is a security control: when two objects from different tenants can be linked, isolation has already failed.
- **Business impact:** Cross-tenant bookings corrupt calendars in two businesses at once and prove the tenant isolation model is broken — auditors treat this as a platform-level failure.
- **Report title:** Missing Tenant Consistency Check Allows Cross-Business Staff Assignment
- **Fix:** Validate that all objects in a transaction belong to the same tenant before committing.


## Payments & Promo Codes — 2 test(s)

### Promo Code Reuse — "Single-Use" Code Works Forever
- **OWASP:** A04 Insecure Design · **Difficulty:** Beginner · **Severity (in a real client report):** Medium
- **What it is:** One-time codes are a state machine, not a string comparison: issuance, redemption and per-user usage must be recorded server-side.
- **Business impact:** A "new customer" promotion becomes a permanent 20% discount for anyone who hears the code — margin quietly bleeding on every booking.
- **Report title:** Single-Use Promo Code Can Be Redeemed Unlimited Times
- **Fix:** Record redemptions per user server-side and reject repeat use atomically at booking time.

### Payment Status Tampering — Marking Your Own Booking "Paid"
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Payment state must only move through the payment flow. If a general update endpoint can flip it, every service is free.
- **Business impact:** Customers receive services marked as paid without paying. Reconciliation sees "paid" bookings with no matching transaction — if anyone ever reconciles.
- **Report title:** Payment Status Can Be Forged Through Reservation Update (Mass Assignment)
- **Fix:** Whitelist updatable fields; payment status changes only via verified payment events.


## Reviews — 2 test(s)

### Stored XSS in Business Reviews
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Severity (in a real client report):** High
- **What it is:** Every stored text field is a delivery channel. Reviews, comments and names must all be encoded on output, everywhere they appear.
- **Business impact:** A fake review can attack every visitor of a business's page — and the owner themselves — turning the platform's own content into the exploit.
- **Report title:** Stored Cross-Site Scripting in Customer Reviews
- **Fix:** Encode review content on render in all views; consider a strict allowlist sanitiser if any markup is permitted.

### Review Delete IDOR — Deleting Competitors' Reviews
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Severity (in a real client report):** Medium
- **What it is:** Moderation powers must be scoped: author, or the owning business, or a platform admin — nobody else. Missing checks turn delete buttons into vandalism tools.
- **Business impact:** Businesses wake up to find their best reviews deleted by competitors — reputation damage that is hard to prove and harder to undo.
- **Report title:** Insecure Direct Object Reference Allows Deleting Any Review
- **Fix:** Authorise deletions to the review author, the business owner, or platform admins only.


## Admin & Platform — 2 test(s)

### Admin Action Without CSRF Protection — Business Deleted via GET Link
- **OWASP:** A01 Broken Access Control · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **What it is:** State changes must never ride on GET, and destructive admin actions need CSRF tokens plus confirmation. A link should never be able to delete a tenant.
- **Business impact:** One emailed link can erase an entire business — services, staff and reservations — from the platform while an admin is just reading their mail.
- **Report title:** State-Changing Admin Action via GET Without CSRF Protection
- **Fix:** Require POST + valid CSRF token + confirmation for destructive admin actions; never mutate state on GET.

### Predictable API Tokens — Cross-Tenant Data via the API
- **OWASP:** A07 Auth Failures · **Difficulty:** Advanced · **Severity (in a real client report):** High
- **What it is:** API tokens are credentials: they must be long, random and unguessable. Sequential ids with a prefix are just usernames wearing a costume.
- **Business impact:** Every business's full appointment book — customer names, times, services — is readable by anyone who can count, no account required.
- **Report title:** Predictable API Tokens Allow Unauthorised Cross-Tenant Data Access
- **Fix:** Issue API tokens from a CSPRNG (≥128 bits), hash them at rest, and scope each token to its tenant.
