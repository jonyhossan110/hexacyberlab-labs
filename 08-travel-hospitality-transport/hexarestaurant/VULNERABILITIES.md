# HexaRestaurant — Vulnerabilities (LAB 80)

The complete vulnerability map of LAB 80 — HexaRestaurant: **26 scored tests across 8 features**.
Every entry below is a real, working flaw in the app, verified end-to-end. Grouped by feature.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Report title:** SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical
- **What it teaches:** String-built SQL queries let an attacker rewrite the login logic itself and walk in as the first account in the table — usually the admin.
- **Client impact:** On a real restaurant platform this means an attacker takes over the manager account in seconds: menus, prices, bookings and customer data are all exposed.
- **Remediation:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Report title:** Missing Brute-Force Protection on Login
- **Severity:** High
- **What it teaches:** Without throttling or lockout, an attacker can try unlimited passwords against any account until one works.
- **Client impact:** A client’s staff accounts can be cracked overnight with a password list, giving attackers a legitimate-looking way into the system.
- **Remediation:** Add rate limiting, progressive delays and account lockout / MFA for staff accounts.

### User enumeration via login & reset responses
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Report title:** Account Enumeration Through Divergent Authentication Responses
- **Severity:** Medium
- **What it teaches:** Different error messages for "no such account" vs "wrong password" let attackers harvest a list of valid accounts to target.
- **Client impact:** Attackers can confirm which customer and staff emails exist, then focus phishing and password attacks only on real accounts.
- **Remediation:** Return one generic message ("invalid credentials" / "if the account exists…") for every authentication failure.

### Demo credentials published on the login page
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Report title:** Demo Account Credentials Exposed on Login Page
- **Severity:** High
- **What it teaches:** Published or default demo credentials are working keys left under the doormat — anyone can sign in with them.
- **Client impact:** A demo account on a live client site gives attackers a free foothold and a way to explore authenticated features at zero cost.
- **Remediation:** Remove demo/default accounts from production and never print credentials on public pages.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Report title:** Predictable Password Reset Token Enables Account Takeover
- **Severity:** Critical
- **What it teaches:** A reset token derived from a public identifier is not a secret — anyone can forge it and reset any account, including staff.
- **Client impact:** Full account takeover of any customer or manager, leading to booking fraud, data exposure and reputational damage for the restaurant.
- **Remediation:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.

### Role trusted from a client cookie (hx_role)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Report title:** Privilege Escalation via Client-Controlled Role Cookie
- **Severity:** Critical
- **What it teaches:** Authorization decisions must come from server-side session data; anything the client sends (cookies, fields) can be edited at will.
- **Client impact:** Any diner becomes "manager" by editing a cookie — prices, staff tools and customer records are all within reach.
- **Remediation:** Derive roles exclusively from the server-side session/record; ignore role claims from cookies or request fields.

## Registration & Profile (4)

### Weak password policy (1 character accepted)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Report title:** No Password Strength Policy at Registration
- **Severity:** Medium
- **What it teaches:** A registration form that accepts any password invites accounts that fall to the first guess in a brute-force list.
- **Client impact:** Customer accounts on the client site are trivially guessable, enabling booking fraud and personal-data exposure.
- **Remediation:** Enforce a minimum length (≥10–12) and screen against common/breached password lists.

### Mass assignment — role & loyalty points at signup
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Report title:** Mass Assignment in Registration Allows Role and Balance Forgery
- **Severity:** High
- **What it teaches:** Binding a whole request body to a user record lets attackers set privileged fields (role, balances) that the UI never exposed.
- **Client impact:** Attackers mint themselves manager accounts and unlimited loyalty points — full control plus free food at the client’s expense.
- **Remediation:** Whitelist the exact fields a request may set; assign role/balance fields only on the server.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Report title:** Stored Cross-Site Scripting via Display Name
- **Severity:** High
- **What it teaches:** User-controlled text rendered without escaping executes in other users’ browsers — here, in the manager’s own panel.
- **Client impact:** A stored payload in a name can hijack staff sessions and take over the restaurant’s admin side from a single signup.
- **Remediation:** Context-encode all user output and apply a strict CSP; sanitise stored rich text.

### CSRF on profile update (marker never checked)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Report title:** Missing CSRF Validation on Profile Update
- **Severity:** Medium
- **What it teaches:** A state-changing form without a verified anti-CSRF token can be submitted by any website the victim visits while logged in.
- **Client impact:** An attacker’s page can silently rewrite a customer’s profile (name, contact data) the moment they browse it while logged in.
- **Remediation:** Issue per-session CSRF tokens, verify them on every state-changing request, and use SameSite cookies.

## Menu & Search (2)

### SQL injection in menu search leaks hidden items
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Report title:** SQL Injection in Menu Search Exposes Hidden Records
- **Severity:** High
- **What it teaches:** Injection in search turns a filter into a full table dump — hidden, internal or unreleased records included.
- **Client impact:** Unreleased menus, staff-only items and pricing experiments leak to competitors and customers before launch.
- **Remediation:** Parameterise the search query and enforce visibility filters server-side.

### Reflected XSS in menu search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Report title:** Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium
- **What it teaches:** Reflecting input without encoding turns a harmless search link into a script-delivery vehicle against anyone who clicks it.
- **Client impact:** Attackers can send customers a "menu search" link that runs script in the restaurant’s own site — stealing sessions and trust.
- **Remediation:** HTML-encode all reflected input and deploy a Content-Security-Policy.

## Table Bookings (4)

### Booking a party larger than the table’s seats
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Report title:** Server Fails to Enforce Table Capacity on Booking
- **Severity:** Medium
- **What it teaches:** Business rules (capacity) must be enforced on the server; the form’s dropdown limits mean nothing to a direct request.
- **Client impact:** Impossible bookings reach the floor team: overbooked tables, turned-away guests and comped meals on a busy Friday night.
- **Remediation:** Validate party size against the table’s seat count server-side before confirming a booking.

### Double-booking the same table and time slot
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Report title:** Missing Slot-Availability Check Allows Double Booking
- **Severity:** Medium
- **What it teaches:** Uniqueness invariants (one booking per table per slot) must be checked at write time, or concurrent/hidden requests break them.
- **Client impact:** Two parties arrive for the same table; the restaurant eats the apology, the free desserts and the one-star reviews.
- **Remediation:** Check slot availability in the same transaction that creates the booking; add a unique constraint.

### IDOR — view another diner’s booking
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Report title:** Insecure Direct Object Reference on Booking Details
- **Severity:** High
- **What it teaches:** Every object fetch must verify ownership; sequential ids plus a missing check equal a full data leak.
- **Client impact:** Strangers can read who is dining where and when — a privacy breach and a safety risk for the restaurant’s guests.
- **Remediation:** Authorise every object access against the session user’s ownership or role.

### IDOR — cancel another diner’s booking
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Report title:** Missing Authorisation on Booking Cancellation
- **Severity:** High
- **What it teaches:** Destructive actions need the same ownership checks as reads — a missing check turns viewing rights into sabotage.
- **Client impact:** Anyone can wipe out a rival’s — or every — reservation for the evening, emptying the restaurant on demand.
- **Remediation:** Verify booking ownership (or staff role) before applying cancellations.

## Orders & Payments (4)

### Menu price tampering at checkout
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Report title:** Client-Supplied Price Trusted at Checkout
- **Severity:** High
- **What it teaches:** Prices are server-side truth; any price arriving from the client is a suggestion the attacker controls.
- **Client impact:** Customers eat $18 dishes for $1 all night — direct revenue loss that scales with every order placed.
- **Remediation:** Compute all prices and totals server-side from the catalogue; ignore client-posted amounts.

### Negative quantity creates a negative-total order
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Report title:** Missing Quantity Validation Allows Negative Orders
- **Severity:** Medium
- **What it teaches:** Numeric inputs need range validation; a negative quantity turns a purchase into a credit against the business.
- **Client impact:** Negative orders can offset real charges or corrupt the day’s takings and stock counts for the client.
- **Remediation:** Validate quantity as a positive integer within sane bounds server-side.

### IDOR — view another diner’s order
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Report title:** Insecure Direct Object Reference on Order Details
- **Severity:** High
- **What it teaches:** Read endpoints for private objects must check ownership every time — ids are not secrets.
- **Client impact:** Customers’ orders, addresses and habits leak to anyone with an account — a privacy and GDPR problem for the restaurant.
- **Remediation:** Scope every order query to the session user (or staff role) server-side.

### Diner marks own order paid/served (staff action)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Report title:** Missing Function-Level Authorisation on Order Status Changes
- **Severity:** High
- **What it teaches:** Function-level authorization matters as much as data access: a user may own an object yet must not perform staff-only transitions on it.
- **Client impact:** Diners mark bills "paid" without paying and orders "served" that never left the kitchen — chaos and direct loss.
- **Remediation:** Restrict status transitions to staff roles and to the transitions each role may perform.

## Reviews & Loyalty (3)

### Loyalty points forged — redeem more than the balance
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Report title:** Loyalty Redemption Without Balance Verification
- **Severity:** High
- **What it teaches:** Balances must be verified and debited atomically on the server; a redemption field without a balance check is free money.
- **Client impact:** Unlimited discounts drain margin on every order and poison the loyalty programme’s accounting.
- **Remediation:** Check and debit the loyalty balance server-side in the same transaction as the order.

### Review posted without any completed order
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Report title:** Reviews Accepted Without a Verified Completed Order
- **Severity:** Medium
- **What it teaches:** Eligibility rules (only buyers may review) are business logic that must be enforced server-side, not assumed.
- **Client impact:** Fake reviews — glowing or vicious — can be manufactured at scale, distorting the restaurant’s reputation and ratings.
- **Remediation:** Require a completed order containing the item before accepting a review.

### Stored XSS in review text
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Report title:** Stored Cross-Site Scripting in Customer Reviews
- **Severity:** High
- **What it teaches:** Stored user content must be encoded on output everywhere it appears — one raw render poisons every visitor.
- **Client impact:** Every customer browsing the menu runs attacker script in the restaurant’s domain — session theft and defacement follow.
- **Remediation:** HTML-encode review text on render and add a restrictive Content-Security-Policy.

## Staff & Manager (2)

### Kitchen queue readable by any diner
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Report title:** Broken Access Control on Kitchen Queue
- **Severity:** Medium
- **What it teaches:** Internal operational screens are part of the attack surface; "staff will only use the link" is not access control.
- **Client impact:** Diners see every table’s orders in real time — privacy exposure and a window into the business’s busiest data.
- **Remediation:** Gate staff screens by server-side role checks on every request.

### CSRF on manager price change
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Report title:** Missing CSRF Validation on Manager Price Change
- **Severity:** High
- **What it teaches:** Privileged actions are the highest-value CSRF targets; a token that is issued but never verified protects nothing.
- **Client impact:** A malicious page a manager browses can reprice the whole menu — $1 mains or $999 salads — without a single click on the real site.
- **Remediation:** Verify per-session CSRF tokens on all state-changing manager actions.

## Platform & API (1)

### API token is just base64(email)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Report title:** Predictable API Token (Base64 of Email) Allows Impersonation
- **Severity:** High
- **What it teaches:** An API token must be an unguessable secret; encoding a public identifier is not authentication.
- **Client impact:** Anyone who knows a customer’s email — it is on every receipt — can pull their full order history from the API.
- **Remediation:** Issue random, revocable API tokens per user and store them hashed server-side.
