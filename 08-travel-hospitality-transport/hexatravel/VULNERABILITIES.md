# HexaTravel (LAB 71) — Vulnerabilities

26 scored tests across 8 features. Every item below is a real, working flaw in the app, detected server-side when exploited.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Lesson: String-built queries let an attacker rewrite the login logic itself; parameterised queries remove the whole class.
- Impact: On a real travel site this means full account takeover — bookings, traveller documents and payment details exposed.
- Report: **SQL Injection in Login Form Allows Authentication Bypass** (Critical) — Use parameterised queries / prepared statements for all database access; never concatenate user input into SQL.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- Lesson: Without throttling or lockout, credential stuffing and password guessing are only a matter of time.
- Impact: Attackers can grind through common passwords against customer accounts and take over bookings at scale.
- Report: **No Rate Limiting or Account Lockout on Login Endpoint** (High) — Add progressive delays, lockout after repeated failures, and CAPTCHA / MFA for accounts.

### User enumeration via login & forgot-password
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- Lesson: Different error messages for "no such account" vs "wrong password" hand attackers a valid-account list.
- Impact: Attackers harvest real customer emails first, then aim phishing and credential stuffing precisely.
- Report: **Account Enumeration via Differential Authentication Responses** (Medium) — Return one generic message ("if the account exists…") for all login and reset outcomes.

### Default / demo credentials still active
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- Lesson: Published demo/default credentials are an open door, especially on the admin account.
- Impact: Anyone on the internet can become admin of the booking platform with a password printed on the login page.
- Report: **Default Administrator Credentials Active and Publicly Disclosed** (Critical) — Force password change on first use, remove demo accounts from production, never print credentials on the login page.

### Predictable password-reset token
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Intermediate
- Lesson: Reset tokens must be long, random and single-use; a formula based on the user id is guessable by anyone.
- Impact: Any customer account can be taken over knowing only its email and its (sequential) user id.
- Report: **Password Reset Tokens Are Predictable (Derived from User ID)** (High) — Generate reset tokens from a CSPRNG (≥128-bit), store hashed, expire quickly, single use.

### Session/role cookie tampering
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Lesson: Authorization data must come from server-side session state, never from a client-editable cookie.
- Impact: A plain traveller can promote themselves to agent or admin tooling and reach internal fare and booking data.
- Report: **Authorization Role Trusted from a Client-Controlled Cookie** (High) — Derive roles from the server-side session record only; ignore any role value supplied by the client.

## Registration & Profile

### Weak password policy (1 character)
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Beginner
- Lesson: Password policy is the first line of defence; accepting 1-character passwords invites instant brute force.
- Impact: Customer accounts fall to trivial guessing, exposing bookings and personal documents.
- Report: **Registration Accepts Extremely Weak Passwords** (Medium) — Enforce a minimum length (≥10) and screen against known-breached password lists.

### Mass assignment — role & credit at signup
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Lesson: Binding request bodies straight onto the user record lets attackers set privileged fields the UI never offered.
- Impact: Attackers mint themselves agent/admin accounts or free travel credit at signup — no exploit chain needed.
- Report: **Mass Assignment in Registration Allows Privilege Escalation** (High) — Whitelist bindable fields server-side; set role/credit only through privileged internal code paths.

### Stored XSS in display name
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Lesson: Every user-controlled string printed into HTML must be output-encoded, even "harmless" name fields.
- Impact: A crafted name fires script in the browsers of staff and customers — session theft and actions in their name.
- Report: **Stored Cross-Site Scripting via Display Name** (High) — Context-aware output encoding on all user data; add a Content-Security-Policy as defence in depth.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Lesson: State-changing endpoints need anti-CSRF tokens; a marker that is issued but never verified protects nothing.
- Impact: A malicious page can silently rename/re-profile a logged-in customer, a stepping stone to account confusion and fraud.
- Report: **Missing CSRF Protection on Profile Update** (Medium) — Issue and verify per-session CSRF tokens on every state-changing request; validate Origin/Referer.

## Search & Packages

### SQL injection in package search
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Lesson: Search boxes are query builders too — injection there can dump rows the UI was never meant to show.
- Impact: Hidden/internal packages, test fares and agent-only inventory leak to the public.
- Report: **SQL Injection in Package Search Exposes Unlisted Records** (High) — Parameterise search queries and enforce listing/visibility filters server-side regardless of input.

### Reflected XSS in search
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Lesson: Reflected input must be encoded at output; search pages are a classic phishing delivery vehicle.
- Impact: Attackers send victims a crafted search link that runs script on the real travel domain, stealing sessions.
- Report: **Reflected Cross-Site Scripting in Search Results** (Medium) — HTML-encode all reflected input; deploy a restrictive Content-Security-Policy.

### Agent-only fare rules exposed to travellers
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Lesson: Fields meant for internal roles must be filtered server-side per role — hiding them in the UI is not enough, and here they are not even hidden.
- Impact: Net fares and margin rules leak to customers and competitors, destroying pricing confidentiality.
- Report: **Internal Agent Fare Rules Disclosed to Unprivileged Users** (Medium) — Strip internal fields from responses for non-agent roles; review every DTO for internal-only data.

## Booking & Payments

### Price-per-person tampering at checkout
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Lesson: Prices must be recomputed server-side from the catalogue; anything the browser sends about money is a suggestion, not truth.
- Impact: Customers book $1,450 tours for $1 — direct revenue loss on every tampered booking.
- Report: **Client-Side Price Trusted at Booking (Price Tampering)** (Critical) — Recompute price and total server-side from catalogue data; ignore all client-supplied monetary fields.

### Traveller-count forgery (pay for 1, book for 4)
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Lesson: Quantity invariants (seats booked == seats paid) must be enforced server-side, not by form design.
- Impact: Groups travel while paying for one seat — silent inventory and revenue leakage.
- Report: **Booked Traveller Count Not Reconciled with Paid Count** (High) — Derive the booked quantity from the paid line items server-side; reject mismatches.

### Booking a sold-out departure
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Lesson: Capacity checks belong in the booking transaction itself; a "sold out" label in the UI stops nobody.
- Impact: Oversold departures mean refunds, compensation and reputational damage on the travel day.
- Report: **Missing Capacity Validation Allows Overselling Departures** (High) — Check and decrement seat inventory atomically inside the booking transaction.

### Voucher stacking (two codes on one booking)
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Lesson: Promotion rules (one code per order) are business invariants that must be enforced in code, not in marketing copy.
- Impact: Stacked discounts quietly erode margin and can be combined with other flaws for near-free travel.
- Report: **Multiple Discount Vouchers Can Be Stacked on a Single Booking** (Medium) — Enforce a single active voucher per booking server-side unless an explicit combining rule exists.

### Single-use voucher reused
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Lesson: Single-use semantics need server-side redemption records checked at apply time.
- Impact: A leaked "one-time" 50% code becomes a permanent half-price channel for anyone who reuses it.
- Report: **Single-Use Voucher Can Be Redeemed Repeatedly** (Medium) — Persist voucher redemptions per user/code and reject repeat use of single-use codes.

## Reservations & Documents

### Reservation IDOR — view another traveller's booking
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Lesson: Every object access needs an ownership/authorization check; predictable ids make gaps trivially enumerable.
- Impact: Full itineraries, dates and traveller details of every customer are readable by any other customer.
- Report: **Insecure Direct Object Reference on Reservation Records** (High) — Verify the requesting user owns (or is authorised for) the reservation on every read and write.

### Travel document IDOR — download another traveller's documents
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Lesson: Documents concentrate the most sensitive trip data; they need the same ownership checks as the parent record.
- Impact: Passport-adjacent travel documents and vouchers of other customers can be harvested wholesale.
- Report: **Insecure Direct Object Reference on Travel Documents** (High) — Authorize document access through the parent reservation's ownership, every time.

### Path traversal on document download
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Lesson: File paths built from user input must be canonicalised and confined to an allow-listed directory.
- Impact: Source code, configuration and any file the server can read become downloadable — a beachhead for deeper attacks.
- Report: **Directory Traversal in File Download Endpoint** (High) — Resolve the requested path, verify it stays inside the documents directory, and serve files by id, not by name.

## Reviews

### Stored XSS in package reviews
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Lesson: User-generated content shown to other users is the highest-value XSS surface and must be encoded on output.
- Impact: One review can attack every future visitor of a popular package page, including staff.
- Report: **Stored Cross-Site Scripting in Package Reviews** (High) — Output-encode review text at render time and sanitise stored rich text if any is allowed.

## Admin Panel

### Admin panel open to any signed-in user
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Lesson: Role checks must run on every privileged route; "signed in" is not "authorised".
- Impact: Every registered customer can reach admin tooling and the full customer list.
- Report: **Broken Access Control — Admin Console Accessible to Non-Admin Users** (Critical) — Enforce role-based authorization middleware on all admin routes.

### CSRF on admin package deletion
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Lesson: Privileged actions are the most damaging CSRF targets and need verified tokens, not decorative ones.
- Impact: An admin visiting a malicious page can be made to delete packages or sabotage the catalogue unknowingly.
- Report: **Missing CSRF Protection on Administrative Actions** (High) — Verify per-session CSRF tokens on all admin state changes and add SameSite cookies.

## Platform & API

### Weak API token (base64 of email)
- OWASP: A07:2021 Identification & Authentication Failures · Difficulty: Intermediate
- Lesson: API credentials must be unguessable random secrets; encoding an email address is not a credential.
- Impact: Anyone who knows a customer's email — public information — gets full API access to their bookings.
- Report: **API Authentication Token Is a Predictable Encoding of the User's Email** (High) — Issue random, high-entropy API keys, store them hashed, and support revocation/rotation.

### Unauthenticated debug endpoint dumps all users
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- Lesson: Debug/diagnostic endpoints must never ship to production; if they must exist, they need auth and auditing.
- Impact: Total credential disclosure: every customer and staff password, enabling full platform takeover.
- Report: **Unauthenticated Debug Endpoint Exposes All User Credentials** (Critical) — Remove debug endpoints from production builds; gate any diagnostics behind admin auth and logging.
