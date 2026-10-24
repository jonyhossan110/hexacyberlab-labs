# HexaSupply (LAB 103) — Vulnerability Map

26 scored tests across 9 features.

## Login & Authentication (6 tests)

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: On a real client platform this means full account takeover of admin accounts — the attacker walks in through the front door.
- Lesson: String-built SQL queries let an attacker rewrite the query logic and log in as anyone without a password.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: A client’s accounts can be cracked with automated password guessing, especially where users reuse weak passwords.
- Lesson: Without throttling, attackers can guess passwords indefinitely until one works.

### User enumeration via login & forgot-password
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Attackers learn exactly which employee emails have accounts, making every later attack cheaper and more convincing.
- Lesson: Different error messages for real vs fake accounts hand attackers a verified target list for phishing and brute force.

### Published demo credentials grant a real account
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Anyone on the internet can sign in with the published demo account and explore the client’s platform from the inside.
- Lesson: Demo/default accounts left active in production are a standing invitation — attackers try them first.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: An attacker can reset any account’s password — including the admin’s — without ever seeing an email.
- Lesson: Reset tokens must be unguessable random values; a formula based on the user id can be computed by anyone.

### Role cookie tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Any low-privilege user can promote themselves to approver or admin just by editing a cookie.
- Lesson: Authorisation decisions must come from server-side session data, never from values the client can edit.

## Registration & Profile (4 tests)

### Weak password policy (1 character)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Impact: Client users end up with guessable passwords, and the business carries the breach risk.
- Lesson: Weak password policies make brute force and credential stuffing trivially effective.

### Mass assignment — role & balance at registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers register straight into an admin account — complete platform compromise in one request.
- Lesson: Binding request data directly to the user record lets attackers set privileged fields the form never showed.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: An attacker’s payload runs in the admin’s browser, enabling session theft and actions taken as the admin.
- Lesson: User-controlled data stored and rendered unescaped executes in other users’ browsers.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A client’s users can be silently modified — contact details changed, accounts prepared for takeover.
- Lesson: State-changing forms without anti-CSRF tokens can be triggered by any website the victim visits while logged in.

## Search & Suppliers (2 tests)

### SQL injection in search leaks internal supplier
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: Confidential supplier relationships and pricing — commercially sensitive data — leak to any logged-in user.
- Lesson: Search boxes are SQL injection points too; a successful injection can expose data the UI is designed to hide.

### Reflected XSS in search results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: Attackers send the client’s staff a poisoned search link and hijack their sessions.
- Lesson: Reflected input must be encoded; otherwise a crafted link executes script in a victim’s session.

## Purchase Orders (5 tests)

### Unit-price tampering on purchase order
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: The business buys (or sells) at attacker-chosen prices — direct financial loss on every order.
- Lesson: Prices must be taken from the server-side catalogue at order time, never from the request.

### Negative quantity creates a negative-total PO
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: Negative orders can generate credits/refunds out of thin air and corrupt inventory and accounts.
- Lesson: Numeric inputs need server-side range validation; negative quantities invert the money flow.

### Creator approves their own purchase order
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: One rogue or compromised account can raise and approve fraudulent orders — a classic procurement-fraud path.
- Lesson: Approval workflows must enforce separation of duties server-side: the requester can never be the approver.

### Purchase order IDOR across suppliers
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Competitors/suppliers read each other’s orders, prices and volumes — commercial espionage built into the app.
- Lesson: Every object fetch must verify the requester owns (or may see) that object.

### Create a PO under another supplier’s identity
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Orders, debts and deliveries can be planted on another supplier, poisoning trust and billing.
- Lesson: Server-side identity must come from the session; client-supplied owner ids let users act as someone else.

## Shipments (1 tests)

### Shipment IDOR exposes other suppliers’ deliveries
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Rivals learn delivery routes, dates and contents — enabling theft targeting and competitive harm.
- Lesson: Delivery data is sensitive operational data; object-level authorisation is required on every read.

## Inventory & Warehouses (2 tests)

### Arbitrary stock adjustment (negative stock)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers zero out or negate stock — operations halt, orders fail, and the books stop matching reality.
- Lesson: Inventory mutations need role checks and invariant validation (stock can never go below zero).

### Restricted internal item exposed to suppliers
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Internal QA/prototype stock and notes leak to external suppliers who were never meant to see them.
- Lesson: Hiding an item in the UI is not access control; the object endpoint must enforce the restriction.

## Supplier Invoices (2 tests)

### Supplier invoice IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Invoice amounts, bank details and payment terms of other suppliers are exposed — fraud and social-engineering fuel.
- Lesson: Financial documents need the strictest object-level authorisation.

### Supplier marks own invoice PAID with a wrong amount
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Invoices get marked settled for pennies — the business loses the full amount while its books show "paid".
- Lesson: Payment state transitions must be server-controlled and reconciled against the real amount.

## Admin Panel (2 tests)

### Admin panel open to any logged-in user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Every user can see the full user list including passwords — instant total compromise.
- Lesson: Authentication is not authorisation; admin surfaces must verify the admin role on every request.

### CSRF on admin user deletion
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An attacker can delete the client’s user accounts by luring an admin to a malicious page.
- Lesson: Privileged state changes need anti-CSRF tokens; otherwise any site can wield the admin’s session.

## Platform & API (2 tests)

### Unauthenticated /api/debug dumps all data
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: One URL hands an attacker every user, password, order and invoice — the whole business in a single request.
- Lesson: Debug/diagnostic endpoints must never ship to production — they bypass every other control.

### Weak API token = base64(email)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone who knows an email address — public information — can read that supplier’s invoices through the API.
- Lesson: API credentials must be random secrets; a reversible encoding of a public identifier is not a credential.
