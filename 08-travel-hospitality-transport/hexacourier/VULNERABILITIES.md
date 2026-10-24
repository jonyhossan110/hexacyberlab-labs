# HexaCourier — Vulnerability Map (LAB 77)

Total: 26 scored tests across 9 features. Every entry is a live, working flaw in this local training app. Tests flip to done only when the server detects the real exploit effect (see /tests in the app).

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** Use email: ' OR '1'='1 with any password — the check ends up comparing the quote logic, not your password.
- **Impact:** On a real courier platform this means instant takeover of the admin account: every customer's name, phone number and home address is exposed.
- **Report severity:** Critical

### Brute Force — No Rate Limiting
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** The 10th wrong attempt is processed exactly like the first — the missing throttle is the flaw.
- **Impact:** Customer and courier accounts fall to password guessing, exposing delivery addresses and courier earnings.
- **Report severity:** High

### User Enumeration via Login & Forgot-Password
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** Probe at least 5 different emails; the different answers confirm which accounts exist.
- **Impact:** Attackers confirm which customers and staff hold accounts, then focus phishing and guessing on real people.
- **Report severity:** Medium

### Published Demo Credentials
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** Sign in with the demo courier credentials printed under the login form.
- **Impact:** Anyone on the internet can sign in as a courier and see assigned deliveries, customer addresses and COD amounts.
- **Report severity:** High

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** Token = HC- plus a base36 value derived from the user id (id x 911 + 77). Compute another user's token and reset their password without any email.
- **Impact:** Any account — including the admin's — can be taken over by anyone who can guess a numeric user id.
- **Report severity:** Critical

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication flow of HexaCourier.
- **Exploitation outline:** Set the hx_role cookie to dispatcher and open /dispatch — the server never checks your real role.
- **Impact:** Any customer can promote themselves to dispatcher and read the full delivery manifest with every customer's address.
- **Report severity:** High

## Registration & Profile

### Weak Password Policy
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Registration & Profile flow of HexaCourier.
- **Exploitation outline:** Create an account with password 'x' — it works, and that is the vulnerability.
- **Impact:** Customer accounts with trivial passwords are harvested in bulk, leaking addresses and order history.
- **Report severity:** Medium

### Mass Assignment — Role & Credit at Registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile flow of HexaCourier.
- **Exploitation outline:** Register including role=dispatcher and credit=5000 — you are given both.
- **Impact:** Attackers mint dispatcher accounts or free credit at signup, bypassing every business control downstream.
- **Report severity:** Critical

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where:** the Registration & Profile flow of HexaCourier.
- **Exploitation outline:** Register with the name <script>alert(1)</script> — it is stored and rendered raw to staff.
- **Impact:** A malicious 'customer name' executes in the dispatcher's or admin's browser, enabling session theft and actions in their name.
- **Report severity:** High

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile flow of HexaCourier.
- **Exploitation outline:** POST /profile with a new phone number and no hx_marker field — the change is accepted anyway.
- **Impact:** A booby-trapped page a logged-in customer visits can silently change their account phone/address — rerouting their deliveries.
- **Report severity:** Medium

## Pickup Requests & Pricing

### Zone Fee / Price Tampering at Pickup Creation
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Where:** the Pickup Requests & Pricing flow of HexaCourier.
- **Exploitation outline:** Create a pickup for the Remote zone with price=1 — the parcel is booked for 1 instead of the real fee.
- **Impact:** Customers ship heavy parcels across the country for almost nothing — direct revenue loss on every tampered order.
- **Report severity:** High

### Negative Weight Accepted (Quantity Tampering)
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** the Pickup Requests & Pricing flow of HexaCourier.
- **Exploitation outline:** Create a pickup with weightKg=-5 — it is accepted and drags the total below the zone fee.
- **Impact:** Negative weights create zero or negative shipping charges and corrupt billing and courier-pay calculations.
- **Report severity:** Medium

### IDOR — View Another Customer's Parcel
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Pickup Requests & Pricing flow of HexaCourier.
- **Exploitation outline:** Open /parcels/<id> for an id that is not yours — another customer's addresses and COD amount are shown.
- **Impact:** Anyone can harvest customers' home addresses, phone numbers and what they are shipping — a serious privacy breach.
- **Report severity:** High

### Cancel Another Customer's Pickup
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Pickup Requests & Pricing flow of HexaCourier.
- **Exploitation outline:** POST /parcels/<id>/cancel for someone else's parcel — it is cancelled.
- **Impact:** A competitor or prankster can cancel strangers' deliveries, destroying trust and revenue.
- **Report severity:** High

## Delivery Jobs & Assignment

### Customer Assigns Delivery Jobs (Dispatcher Function)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Delivery Jobs & Assignment flow of HexaCourier.
- **Exploitation outline:** As a customer, POST /jobs/<id>/assign with a courierId — the job is assigned on your word.
- **Impact:** Customers can steer any parcel to any courier — enabling theft rings where a fake courier 'delivers' parcels to themselves.
- **Report severity:** High

### Customer Marks Own Parcel Delivered (Courier Endpoint)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Delivery Jobs & Assignment flow of HexaCourier.
- **Exploitation outline:** POST /jobs/<id>/deliver with a receiver name — the parcel becomes 'delivered'.
- **Impact:** Customers can fake completed deliveries, claim refunds for 'never received' parcels, and corrupt courier pay records.
- **Report severity:** High

### Courier Delivers a Job Assigned to Another Courier
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Delivery Jobs & Assignment flow of HexaCourier.
- **Exploitation outline:** Deliver a parcel whose courierId is a different courier — it succeeds.
- **Impact:** Couriers can steal each other's jobs and earnings, and parcels change hands with no accountable handler.
- **Report severity:** Medium

### IDOR — Proof of Delivery of Another Job
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Delivery Jobs & Assignment flow of HexaCourier.
- **Exploitation outline:** Open /pod/<id> for a parcel that is not yours — the receiver details are exposed.
- **Impact:** Strangers can learn who received a parcel and when — enabling targeted scams against recipients.
- **Report severity:** Medium

## COD & Payments

### COD Amount Forgery After Booking
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** the COD & Payments flow of HexaCourier.
- **Exploitation outline:** POST /parcels/<id>/cod with a new codAmount — the courier will collect whatever you set.
- **Impact:** COD amounts can be shrunk so couriers collect almost nothing, or inflated to extort recipients — direct cash loss.
- **Report severity:** High

### COD Marked Collected for Less Than the Amount Due
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Where:** the COD & Payments flow of HexaCourier.
- **Exploitation outline:** POST /parcels/<id>/cod-collect with amount=1 on a large COD parcel — the books say 'collected'.
- **Impact:** Couriers or customers can close COD debts for pennies while the cash disappears — reconciliation never balances.
- **Report severity:** High

## Courier Earnings & Manifest

### IDOR — Another Courier's Earnings
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Courier Earnings & Manifest flow of HexaCourier.
- **Exploitation outline:** Open /couriers/<otherId>/earnings — their delivered jobs and pay are listed for you.
- **Impact:** Couriers' income data leaks to competitors and colleagues — privacy and labour-relations damage.
- **Report severity:** Medium

### Dispatch Manifest Exposed to Customers
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Courier Earnings & Manifest flow of HexaCourier.
- **Exploitation outline:** As a customer, open /manifest — the whole day's deliveries are yours to read.
- **Impact:** A full manifest leak exposes every customer's name, phone and address for the day — a bulk privacy breach.
- **Report severity:** Critical

## Search & Tracking

### SQL Injection in Parcel Tracking Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where:** the Search & Tracking flow of HexaCourier.
- **Exploitation outline:** Search with ' OR '1'='1 — every parcel in the system is returned.
- **Impact:** Attackers dump the entire parcel database: customers, addresses, phone numbers and COD values.
- **Report severity:** Critical

### Reflected XSS in Tracking Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where:** the Search & Tracking flow of HexaCourier.
- **Exploitation outline:** Search for <script>alert(1)</script> — the payload comes back raw in the page.
- **Impact:** Attack links sent to staff execute scripts in their browsers — session theft and actions performed as the victim.
- **Report severity:** Medium

## Admin Panel

### Admin Console Open to Any Signed-In User
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Admin Panel flow of HexaCourier.
- **Exploitation outline:** Open /admin while signed in as a customer — the user list, roles and passwords are served.
- **Impact:** Every registered user can read all accounts and passwords — total platform compromise from a free signup.
- **Report severity:** Critical

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Data
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Where:** the Platform & API flow of HexaCourier.
- **Exploitation outline:** Open /api/debug in a private window — the full user and parcel data comes back as JSON.
- **Impact:** The entire customer and staff database is downloadable by anyone on the internet, with no account needed.
- **Report severity:** Critical
