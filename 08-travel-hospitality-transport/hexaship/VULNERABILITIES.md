# HexaShip — Vulnerability Map (LAB 76)

Every scored test in the lab, grouped by feature. Each entry is a real, working flaw in the app, detectable server-side only when the exploit actually succeeds.

**Total: 26 tests across 9 features.**

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection · Difficulty: Intermediate · Severity (report): Critical
- Exploitation outline: Try email: ' OR '1'='1 with any password — a true condition makes the first matching row (the admin) log in.
- Impact: On a real shipping portal this means instant admin takeover: every customer address, parcel and invoice exposed, from one login form.

### Brute Force — No Rate Limiting or Lockout
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Submit 10 wrong passwords for one account; the 10th is still processed like the 1st.
- Impact: Customer accounts fall to password guessing and credential stuffing — the attacker then ships parcels on the victim’s account and reads their addresses.

### User Enumeration via Login & Password Reset
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner · Severity (report): Medium
- Exploitation outline: Probe at least 5 different emails and note how the responses differ.
- Impact: Attackers harvest the portal’s real customer emails, then aim phishing and credential stuffing only at accounts that exist.

### Published Demo Credentials
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Log in with the demo credentials printed on the login page.
- Impact: Anyone on the internet can walk into a live customer account with credentials the site itself published; support/demo accounts are a classic breach entry point.

### Predictable Password-Reset Token
- OWASP: A07:2021 Authentication Failures · Difficulty: Intermediate · Severity (report): Critical
- Exploitation outline: For user id N the token is SHP-N-(N*137+42). Compute Bob’s (id 4) and reset his password without ever requesting a reset.
- Impact: Anyone who knows a customer’s user id can reset their password and take over the account — no mailbox access needed.

### Role Cookie Tampering
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): Critical
- Exploitation outline: Set the hx_role cookie to admin, then visit /admin — the server believes the cookie, not your account.
- Impact: A plain customer becomes admin by editing a cookie — full control of users, parcels and money from a free account.

## Registration & Profile

### Weak Password Policy
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner · Severity (report): Medium
- Exploitation outline: Register a new account with the single-character password "x".
- Impact: Customers who pick weak passwords (and many will, if allowed) get their accounts — and stored home addresses — cracked in seconds.

### Mass Assignment — Role & Credit at Registration
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: Register while adding extra form fields role=staff and credit=5000; the new account keeps both.
- Impact: Attackers self-register as staff with a fat credit balance — free shipping and insider access from a public form.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Register (or rename yourself) with the name <script>alert(1)</script> and look at any page that shows it.
- Impact: An attacker plants a script in their profile name; when staff open the console, the script runs in the staff browser — session theft and actions as staff.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): Medium
- Exploitation outline: Submit the profile form without the hx_origin marker (e.g. with curl) and the change still applies.
- Impact: A malicious page visited by a logged-in customer silently changes their profile — name, email or delivery details — without them knowing.

## Parcels & Pricing

### Weight/Price Tampering — 20 kg at the 1 kg Price
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: Create a 20 kg standard parcel but post the 1 kg price ($5.50). The server truth for 20 kg standard is $34 — you pay $5.50.
- Impact: Customers ship heavy parcels for the price of a letter — direct revenue loss on every order, at scale, with no hacking skill needed.

### Service-Level Upgrade Forgery
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: Create a 2 kg EXPRESS parcel but post the standard price for 2 kg ($7). You get express service at the standard rate.
- Impact: Every customer can upgrade to express for free — the premium tier stops earning money while costing the company express handling.

### Negative Weight — Negative Total
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): Medium
- Exploitation outline: Create a parcel with weight -5 and its matching negative price; it is accepted and the total goes below zero.
- Impact: Negative-weight parcels create negative invoices — in a real system that is credit/refunds minted by the customer, plus corrupt logistics data.

## Tracking & Delivery

### Tracking IDOR — Sequential Tracking Numbers
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Track a parcel that is not yours, e.g. SHP1002 (Bob’s), while logged in as Alice.
- Impact: Anyone can enumerate every shipment — who sent what to which home address, and when the house is expecting a delivery. A privacy and physical-safety problem.

### Forged "Delivered" Tracking Event by a Customer
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: As a customer, POST a tracking event with status Delivered to /parcels/<your parcel id>/events — the parcel is suddenly "delivered".
- Impact: Customers mark their own parcels delivered (refund/insurance fraud: "it never arrived" — or the opposite, closing disputes early) and corrupt the tracking record the business relies on.

### Destination Change on an In-Transit Parcel
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: Take Bob’s "Out for delivery" parcel (as Bob) — or your own in-transit one — and POST a new destination to /parcels/<id>/address. It changes.
- Impact: Parcels get rerouted mid-delivery — interception fraud and theft of goods in transit, with the audit trail showing a "customer request".

## Labels & Invoices

### Shipping Label IDOR
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Open the label of a parcel that belongs to someone else (e.g. parcel 2, Bob’s).
- Impact: Full names and home addresses of every sender and recipient leak — a ready-made list for phishing, stalking or burglary timing.

### Invoice IDOR
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Any invoice id you can guess, you can read: amounts, addresses, parcel details.
- Impact: Competitors or snoops read every customer’s billing — prices paid, addresses, shipping habits — straight off the invoice pages.

### Invoice Payment Amount Tampering
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): Critical
- Exploitation outline: Pay your $7 invoice with amount=1 and settle=full: the invoice flips to PAID for $1.
- Impact: Every invoice can be "paid" for a dollar — total revenue leakage dressed up as completed payments in the ledger.

## Address Book

### Address Book IDOR — Edit Another Customer’s Address
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): High
- Exploitation outline: Open /addresses/2/edit as Alice (that address is Bob’s) and save a change. It sticks.
- Impact: An attacker rewrites a victim’s saved delivery address — the victim’s next orders quietly ship to the attacker’s door.

## Search

### SQL Injection in Parcel Search
- OWASP: A03:2021 Injection · Difficulty: Intermediate · Severity (report): Critical
- Exploitation outline: Search for ' OR '1'='1 and the results include everyone’s parcels, not just yours.
- Impact: One search dumps the entire shipment database — customers, addresses, contents — the full breach in a single request.

### Reflected XSS in Search
- OWASP: A03:2021 Injection · Difficulty: Beginner · Severity (report): Medium
- Exploitation outline: Search for <script>alert(1)</script> and it is reflected verbatim into the page.
- Impact: Attackers send victims a crafted search link; the script runs on the real site in the victim’s browser — session theft from a trusted URL.

## Staff & Admin Panel

### Staff Console Broken Access Control
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): Critical
- Exploitation outline: Log in as a normal customer and simply visit /staff.
- Impact: Any free customer account opens the staff console — all parcels, all customers, staff tooling — the keys to the warehouse on a public URL.

### CSRF on Admin User Deactivation
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: As admin, POST /admin/users/5/deactivate without the hx_origin marker; the user is deactivated anyway.
- Impact: A booby-trapped page visited by an admin deactivates users — lock out staff or customers at scale without ever learning a password.

## Platform & API

### Weak API Token — base64 of the Email Address
- OWASP: A07:2021 Authentication Failures · Difficulty: Intermediate · Severity (report): High
- Exploitation outline: The token is shp_ + base64(email). Forge Alice’s and call GET /api/parcels with no session cookie at all.
- Impact: Anyone who knows a customer’s email — public information — owns their API identity: parcels, addresses and invoices via script.

### Unauthenticated Debug Data Dump
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner · Severity (report): Critical
- Exploitation outline: Fetch /api/debug in a fresh browser (or curl) and read the entire user table — passwords included.
- Impact: Total breach in one request: every account with its password, every parcel and address — the endpoint attackers dream about.
