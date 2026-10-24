# HexaEventTrip — Vulnerability Map (LAB 79)

All 26 scored tests, grouped by feature. This is the complete map of what the lab intentionally contains. Detection is server-side: a test completes only when the exploit’s real effect happens.

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **How it is exploited:** Go to /login. In the email field enter: admin@hexaeventtrip.local' OR '1'='1 and any password. Submit — you are logged in as the admin without knowing the password.
- **Impact:** On a real travel platform this hands an attacker an admin session — every booking, traveller passport detail and payment record is exposed.

### Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **How it is exploited:** On /login, submit a wrong password for tom@hexaeventtrip.local at least 10 times in a row. The app never locks the account or slows you down — that missing throttle is the flaw.
- **Impact:** A client’s customer accounts fall to credential stuffing and password spraying, leading to stolen bookings and refunds fraud.

### User enumeration via login and forgot-password responses
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **How it is exploited:** Submit logins / forgot-password requests for at least 5 different emails, mixing real ones (from the demo list) and invented ones. Existing accounts answer differently from unknown ones — that difference is the leak.
- **Impact:** Attackers harvest real customer emails from the client’s platform and target them with phishing and credential stuffing.

### Default/demo admin credentials published on the login page
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **How it is exploited:** Look at the demo accounts box on /login. Use the admin email and password shown there to sign in — full admin access with public credentials.
- **Impact:** Anyone on the internet can sign in as the client’s administrator and control events, prices and customer data.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **How it is exploited:** Tokens look like ET<id>-<number> where the number is id*137+42. Pick a victim (e.g. the admin, id 1, or another user), compute their token yourself and POST it to /reset with a new password — it is accepted even though no reset was ever requested for them.
- **Impact:** An attacker resets the password of the client’s admin or any customer and takes over the account — no inbox access needed.

### Session role cookie tampering (hx_role)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** Log in as a normal traveller. In your browser dev tools (or curl) set the cookie hx_role=admin, keep your session cookie, and open /admin. The server trusts the cookie and serves the admin console.
- **Impact:** Any customer can promote themselves to admin by editing a cookie — full control of the client’s platform.

## Registration & Profile (4)

### Weak password policy (1-character passwords accepted)
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **How it is exploited:** Go to /register and create an account with the password "a" (one character). It is accepted — no policy is enforced.
- **Impact:** Customers pick trivial passwords; attackers crack accounts in seconds and steal bookings or stored payment details.

### Mass assignment — role and credit set at registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** POST to /register with the normal fields plus role=organizer and credit=500. The new account is created with that role and a credit balance — the server copied fields it should have ignored.
- **Impact:** Attackers mint themselves organizer/admin accounts or free credit, then abuse group bookings and refunds.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **How it is exploited:** Register (or rename yourself) with a display name containing <script>alert(1)</script>. Open a page where staff see your name (admin users list, organizer manifest) — the payload is stored and rendered unescaped.
- **Impact:** An attacker plants script in the client’s admin console and steals staff sessions, taking over the whole platform.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** POST to /profile/update with new name/email values but WITHOUT the hx_origin field. The change is saved anyway — the marker is never checked server-side.
- **Impact:** A malicious page visited by a logged-in customer silently changes their profile email — the first step to account takeover.

## Events & Packages (3)

### SQL injection in event search leaks unpublished events
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **How it is exploited:** On /events, search for: ' OR '1'='1 — the results include the unpublished draft event "VIP Gala Preview (Draft)" that never appears in the normal catalogue.
- **Impact:** Unpublished events, internal pricing and draft packages leak to competitors and attackers before launch.

### Reflected XSS in event search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **How it is exploited:** Search /events?q=<script>alert(1)</script>. The payload appears unescaped in the "Results for:" line of the response.
- **Impact:** Attackers send the client’s customers a crafted search link that runs script in the real site, stealing sessions.

### Bundle component swap — premium hotel at the basic price
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **How it is exploited:** POST /book with tier=basic but hotel=5-star Grand Hotel and transfer=Private car. The reservation is created with the premium components while the price stays the Basic per-person price.
- **Impact:** Customers quietly upgrade themselves to premium hotels and private transfers at basic prices — direct revenue loss on every booking.

## Group Reservations (4)

### Group-size forgery — pay for 2, register 10 travellers
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **How it is exploited:** Create a booking with paidCount=2 and a travellers list of 10 names. The server charges for 2 and allocates seats/rooms for all 10.
- **Impact:** Groups travel at a fraction of the price — 10 people on a 2-person payment — while the client still provides seats, rooms and transfers for all.

### Reservation IDOR — view another group’s booking
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **How it is exploited:** Log in as one user and open /reservations/<id> for a reservation owned by someone else (ids are sequential). Their full booking, travellers and instalments are served.
- **Impact:** Travellers’ names, itineraries and payment status of every group leak to any logged-in user — a serious privacy breach.

### Cancel another user’s reservation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **How it is exploited:** POST /reservations/<id>/cancel for a reservation that is not yours. It is cancelled without any ownership check.
- **Impact:** A malicious user cancels competitors’ or victims’ group trips days before departure — chaos and refunds for the client.

### Price tampering on booking (client-submitted per-person price)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner
- **How it is exploited:** POST /book including perPersonPrice=1. The reservation total is computed from your price, not the catalogue price.
- **Impact:** Anyone books premium event packages for $1 a head — total revenue loss that accounting may not notice for weeks.

## Allocations (2)

### Steal/modify another group’s seat & room allocation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** POST /reservations/<id>/allocation with a new seatBlock for someone else’s reservation. The allocation changes — no ownership check.
- **Impact:** Attackers move rival groups to the worst seats, steal premium rooms, or corrupt the seating plan on event day.

### Event capacity overbooking
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **How it is exploited:** The Desert Rally Expo has only a few seats left (a large group is already booked). Create a booking whose traveller count exceeds the remaining seats. It is accepted and the event goes over capacity.
- **Impact:** The client sells seats that do not exist — refunds, chargebacks and a crowd problem at the venue.

## Payments & Instalments (2)

### Instalment marked paid without any payment
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **How it is exploited:** POST /reservations/<id>/instalments/1/pay with amount=0 and no paymentToken. The instalment is recorded as PAID in full.
- **Impact:** Groups mark every instalment paid and travel for free while the client’s ledger shows the money as received.

### Partial payment accepted as full instalment payment
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner
- **How it is exploited:** POST to an instalment pay endpoint with a paymentToken but amount=1. The instalment closes as PAID even though almost nothing was paid.
- **Impact:** Customers settle large instalments for pennies; the shortfall is invisible until manual reconciliation.

## Organizer & Manifest (1)

### Organizer-only traveller manifest readable by any traveller
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** Log in as a traveller (not an organizer) and open /organizer/manifest/<id> for someone’s group reservation. The complete traveller manifest is served.
- **Impact:** Full traveller manifests — names, groups, itineraries — leak to any user; a privacy and safeguarding failure.

## Admin Panel (2)

### Admin user list served to any logged-in user
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **How it is exploited:** Log in as any non-admin user and open /admin/users. The full account list is served without any role check.
- **Impact:** Attackers enumerate all staff and customer accounts, roles and emails — the map for a targeted takeover.

### CSRF on admin deactivate-user action
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **How it is exploited:** While logged in as admin, POST /admin/deactivate with a userId and no hx_origin marker. The account is deactivated — no token was verified.
- **Impact:** A page visited by a logged-in admin silently deactivates accounts — including other admins or big group organizers.

## Platform & API (2)

### Weak API token — base64(email) accepted as a bearer token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **How it is exploited:** curl /api/reservations with header Authorization: Bearer <base64 of a user’s email> and no cookies. Their reservations are returned.
- **Impact:** Anyone who knows a customer’s email — public information — can pull their bookings from the API.

### Unauthenticated /api/debug dumps users and passwords
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **How it is exploited:** Simply GET /api/debug (after unlocking the lab). It returns every user with their password and role, no authentication required.
- **Impact:** The entire customer database, including passwords, is downloadable by anyone — total compromise in one request.
