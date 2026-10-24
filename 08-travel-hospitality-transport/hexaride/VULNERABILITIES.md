# HexaRide — Vulnerabilities (full test registry)

LAB 74 — HexaRide (Category 8: Travel, Hospitality & Transport) · 26 scored tests across 8 features.
Every test below is a real, working vulnerability in the app; a test is marked complete only when the exploit actually succeeds (detected server-side).

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection · Difficulty: Intermediate
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Try an email like ' OR '1'='1' -- and any password. The -- comments out the password check.
- Impact: On a real ride-hailing platform this hands an attacker an admin or driver account with no password — full access to trip histories, home addresses and earnings.

### No Brute-Force Protection on Login
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Submit 10+ wrong passwords for one account (e.g. bob@test.local) — the 10th is still processed normally.
- Impact: Attackers can grind through password lists against rider and driver accounts until one works — account takeover at scale.

### User Enumeration via Login & Reset Responses
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Probe 5+ different emails on /forgot: real accounts get "Reset link sent", unknown ones get "No account with that email".
- Impact: Attackers confirm which customers and drivers have accounts, then target exactly those people with phishing and password attacks.

### Default / Published Demo Credentials
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Sign in as admin@hexaride.local with the published demo password admin123.
- Impact: Anyone who reads the manual or this page owns the admin account — the most common "how did they get in?" answer in real breaches.

### Predictable Password-Reset Token
- OWASP: A07:2021 Authentication Failures · Difficulty: Intermediate
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Tokens look like HR<id>-<id*137+42>. Compute one for another user (e.g. id 3) and use /reset without ever requesting it.
- Impact: Anyone can reset any rider, driver or admin password knowing only their user id — silent full account takeover.

### Role Cookie Tampering (Client-Side Role Trust)
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Where: the Login & Authentication flow of HexaRide.
- Exploitation outline: Set the hx_role cookie to "driver" (browser dev tools) while logged in as a rider, then open /driver.
- Impact: Every rider becomes a "driver" in one edit — they can open driver tooling, see assigned trips and touch the trip lifecycle.

## Registration & Profile

### Weak Password Policy
- OWASP: A07:2021 Authentication Failures · Difficulty: Beginner
- Where: the Registration & Profile flow of HexaRide.
- Exploitation outline: Register a new account with a 1-character password — it is accepted.
- Impact: Customers pick trivial passwords and their accounts — with saved home addresses and wallet balances — are taken over.

### Mass Assignment — Role & Wallet Balance
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Where: the Registration & Profile flow of HexaRide.
- Exploitation outline: Register while adding extra form fields role=driver and wallet=500 — the new account keeps them.
- Impact: Attackers mint themselves driver/admin accounts with pre-loaded wallet balances — fraud and privilege escalation in one request.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Where: the Registration & Profile flow of HexaRide.
- Exploitation outline: Register or rename yourself with a name containing <script>alert(1)</script> or an <img onerror> payload — it is stored and rendered raw.
- Impact: A malicious rider name executes script in the admin panel — session theft and actions performed as the admin.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Registration & Profile flow of HexaRide.
- Exploitation outline: POST to /profile as a logged-in user WITHOUT the hx_origin field (e.g. from curl) — the change is accepted anyway.
- Impact: A rider visiting a malicious page silently gets their profile (and contact email) changed — a stepping stone to account takeover.

## Trips & Fares

### Fare Tampering — Client-Supplied Price
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Trips & Fares flow of HexaRide.
- Exploitation outline: Create a trip while adding a form field fare=1 — the platform stores YOUR price, not its own.
- Impact: Riders cross the city for $1 — direct revenue loss on every tampered trip, invisible until finance reconciles.

### Distance Tampering — Client-Supplied Distance
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Trips & Fares flow of HexaRide.
- Exploitation outline: Book Airport → Sunny Beach but send distanceKm=0.5 — the fare is calculated from your number.
- Impact: Long, expensive routes are billed as trips around the block — systematic undercharging that scales with every ride.

### Trip IDOR — Other Riders' Trips & Routes
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Trips & Fares flow of HexaRide.
- Exploitation outline: Open another rider's trip (e.g. /trips/2 while logged in as Alice) — full route history is served.
- Impact: Anyone can map where any customer lives, works and travels — a physical-safety and stalking risk, not just a data leak.

### Cancel Another Rider's Trip (IDOR)
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Trips & Fares flow of HexaRide.
- Exploitation outline: POST a cancel for a trip that belongs to someone else — it cancels.
- Impact: Attackers cancel competitors' or victims' rides at will — service disruption and harassment straight from the API.

### Trip Completion by Non-Driver (Broken Function-Level Authorisation)
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Where: the Trips & Fares flow of HexaRide.
- Exploitation outline: As a RIDER, POST to /driver/trips/<your trip id>/complete — the trip completes without any driver.
- Impact: Riders complete their own trips to trigger payouts/ratings flows, or fake completed trips — fraud inside the core money flow.

## Promo Codes

### Promo Code Stacking
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Promo Codes flow of HexaRide.
- Exploitation outline: Apply WELCOME20 and then RIDE50 to the same unpaid trip — both discounts land.
- Impact: Stacked discounts quietly erase the margin on every ride — a 20% + 50% stack makes most trips loss-makers.

### Single-Use Promo Code Reuse
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Promo Codes flow of HexaRide.
- Exploitation outline: Use RIDEFREE on one trip, then on a second trip — it works again.
- Impact: One leaked "single-use" code becomes unlimited free rides for everyone who hears about it.

### Promo Applied to a Completed Trip — Wallet Refund
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Where: the Promo Codes flow of HexaRide.
- Exploitation outline: Apply a promo code to your own completed, paid trip (e.g. trip 1) — the discount is credited back to your wallet.
- Impact: Every finished trip becomes a refund machine — riders drain promo value out of historical rides indefinitely.

## Wallet & Payments

### Wallet Top-Up Amount Forgery
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Wallet & Payments flow of HexaRide.
- Exploitation outline: POST /wallet/topup with amount=100 and paidAmount=1 — $100 lands in the wallet for a $1 "payment".
- Impact: Free money: attackers load wallets with funds they never paid, then spend them on rides or cash-out flows.

### Negative Trip Payment Credits the Wallet
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Where: the Wallet & Payments flow of HexaRide.
- Exploitation outline: On a completed unpaid trip of yours, POST /trips/<id>/pay with amount=-50 — your wallet GROWS and the trip counts as paid.
- Impact: Paying with negative amounts turns every fare into income — the platform pays riders to ride.

## Driver & Earnings

### Driver Earnings IDOR
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Driver & Earnings flow of HexaRide.
- Exploitation outline: Open /driver/earnings?driverId=5 while logged in as someone else — Erin's earnings are served.
- Impact: Drivers' income data leaks to anyone — competitive intelligence and a privacy breach for every driver on the platform.

### Payout Above Earnings Balance
- OWASP: A04:2021 Insecure Design · Difficulty: Intermediate
- Where: the Driver & Earnings flow of HexaRide.
- Exploitation outline: As a driver, POST /driver/payout with an amount far above your earnings (e.g. 10000) — it is accepted.
- Impact: Drivers cash out money they never earned — direct financial theft from the platform.

## Ratings

### Out-of-Range Rating Value Accepted
- OWASP: A04:2021 Insecure Design · Difficulty: Beginner
- Where: the Ratings flow of HexaRide.
- Exploitation outline: Rate one of your completed trips with stars=100 — it is stored as-is.
- Impact: Rating averages are destroyed by absurd values — driver reputations and ranking algorithms become meaningless.

### Rating a Trip You Did Not Take
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Ratings flow of HexaRide.
- Exploitation outline: Rate another rider's completed trip (e.g. trip 2 as Alice) — the review lands.
- Impact: Fake reviews from strangers — reputation manipulation against drivers or riders, straight through the official endpoint.

## Admin & Platform

### Admin Panel Without Access Control
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Where: the Admin & Platform flow of HexaRide.
- Exploitation outline: Log in as a plain rider and open /admin — the full user list, passwords included, is served.
- Impact: Every customer account can open the admin console and read all credentials — total platform compromise.

### Debug Endpoint Exposes All Accounts & Passwords
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- Where: the Admin & Platform flow of HexaRide.
- Exploitation outline: Open /api/debug — the whole user table, plaintext passwords included, comes back as JSON.
- Impact: One URL hands an attacker every account and password on the platform — the breach writes itself.
