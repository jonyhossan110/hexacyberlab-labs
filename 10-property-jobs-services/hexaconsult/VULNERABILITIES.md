# HexaConsult — Vulnerabilities (LAB 98)

The complete map: every scored test in this lab, grouped by feature.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Email: ' OR '1'='1' --  (with any password) comments out the password check entirely.
- Impact: On a real consulting platform this hands an attacker the admin account on day one — every client engagement, report and invoice is exposed.

### Brute Force — No Rate Limiting or Lockout
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Submit 10+ failed logins for alice@test.local and notice the 10th is still processed normally.
- Impact: Attackers can grind through passwords for consultant and client accounts at full speed until one works.

### User Enumeration via Login & Forgot-Password Responses
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Probe at least 5 different emails across login/forgot and watch the wording change.
- Impact: An attacker can build a verified list of client and consultant emails for phishing and password spraying.

### Published Demo Credentials Are Live Admin Credentials
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Exploitation outline: Log in with the published admin demo credentials and you are the real admin.
- Impact: Anyone on the internet can sign in as admin with credentials the site itself advertises.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- Exploitation outline: Token = HCN<userId>-<userId*137+42>. Compute it for Bob (id 6) — no email access needed.
- Impact: An attacker who knows a victim's user ID can take over their account in one request — no inbox access required.

### Role Cookie Tampering into the Consultant Hub
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Set hx_role=consultant on a client account and open the Consultant Hub.
- Impact: Any client can promote themselves to consultant by editing a cookie, reaching consultant-only tools and data.

## Registration & Profile

### Weak Password Policy (1 Character Accepted)
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Exploitation outline: A one-character password is accepted.
- Impact: Client accounts protected by trivial passwords are harvested in bulk by credential stuffing.

### Mass Assignment — Role & Rate Set at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Add role=consultant and rate=999 to the registration POST — they are honoured.
- Impact: Attackers self-register as consultants (or admins) with fake rates and instantly gain trusted status on the platform.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Register with a name like <script>alert(1)</script> and view your profile.
- Impact: A booby-trapped name can steal session cookies or act on behalf of any staff member who views it.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: POST to /profile from a bare request (no cookies except the session) and the name changes.
- Impact: A malicious page could silently rename or deface a consultant's public profile while they browse the web.

## Consultants & Search

### SQL Injection in Consultant Search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Exploitation outline: Search for ' OR '1'='1' --  and meet the unlisted consultant.
- Impact: Competitors or attackers can enumerate the full consultant roster, including people and specialisms the firm keeps private.

### Reflected XSS in Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Exploitation outline: Search for <script>alert(1)</script> and view the page source.
- Impact: Phishing links to the firm's own site can run script in a victim's session, undermining trust in the real domain.

### Unlisted Consultant Profile Accessible by Direct ID
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Open /consultant/4 directly and read the unlisted profile and internal notes.
- Impact: A consultant engaged on a confidential mandate (and his internal notes) is exposed to anyone who guesses an ID.

## Appointments & Booking

### Appointment IDOR — View Another Client's Booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Log in as Alice and open /appointment/1 — it is Bob's booking with Sara.
- Impact: Clients can see each other's meeting schedules, consultants and topics — a confidentiality breach for a consultancy.

### Double-Booking — Same Consultant, Same Slot, Twice
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Exploitation outline: Book Sara for 2026-11-02 10:00 as another client — both bookings stand.
- Impact: Consultants get double-booked, clients show up to clashes, and the firm's calendar becomes unreliable.

### Consultant Rate Tampering at Booking
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Book Sara (rate 200) with rate=1 and the appointment total is $1.
- Impact: Clients can book senior consultants for $1 an hour — direct revenue loss on every booking.

## Engagements

### Engagement IDOR — Read Another Client's Engagement
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: As Alice, open /engagement/2 — Bob's finance review, fee and all.
- Impact: Clients can read competitors' engagement scopes and fees — commercially devastating for the firm.

### Client Approves Own Milestone via Consultant-Only Endpoint
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: As the client, POST to /engagement/1/milestone/approve and approve your own deliverable.
- Impact: Clients can self-approve milestones, triggering payments and closing work that was never reviewed.

### Cancel Another Party's Engagement
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: As Carol, POST /engagement/2/cancel to cancel Bob's engagement.
- Impact: A malicious user can cancel competitors' engagements, halting billable work and damaging client relationships.

## Reports & Deliverables

### Deliverable Download IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: As Alice, download deliverable-2.txt — Bob's report.
- Impact: Confidential client reports — findings, weaknesses, strategy — leak to any other client who guesses a filename.

### Path Traversal on Deliverable Download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Exploitation outline: Request /download?file=../server.js and read the application source.
- Impact: Attackers can read source code and configuration from the server, exposing secrets and the full vulnerability map.

## Invoices & Payments

### Invoice IDOR — View Another Client's Invoice
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: As Alice, open /invoice/2 to see Bob's fee.
- Impact: Clients learn exactly what competitors pay — pricing intelligence the firm never intended to share.

### Invoice Payment Amount Tampering ($1 Settles $4,000)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Pay invoice 1 with amount=1 and watch a $4,000 invoice settle in full.
- Impact: Clients can settle five-figure invoices for a dollar — catastrophic, silent revenue loss.

## Admin Panel

### Admin Panel Open to Any Logged-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: Log in as any client and open /admin — full user list, passwords included.
- Impact: Any registered user can open the admin panel and harvest every account's password.

## Platform & API

### API Token Is Just base64(email)
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- Exploitation outline: Send Authorization: Bearer <base64 of bob@test.local> to /api/engagements — no password needed.
- Impact: Anyone who knows a client's email address can pull their engagements through the API.

### Unauthenticated /api/debug Dumps All Accounts
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Exploitation outline: GET /api/debug returns every user, including passwords, with no login.
- Impact: The entire user database — emails and passwords — is one unauthenticated request away.
