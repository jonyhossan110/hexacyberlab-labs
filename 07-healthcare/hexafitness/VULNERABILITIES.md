# HexaFitness — Vulnerabilities (full test map)

LAB 67 · Category 7: Healthcare & Wellness · 26 scored tests across 10 features.
Every entry below is a real, working vulnerability in this app, detected server-side when the exploit succeeds.

## Login & Authentication

### SQL injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- What it is: String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.
- Impact: On a real gym platform this hands an attacker the admin account — every member record, payment detail and health note behind it.

### Brute force — no rate limit or lockout
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- What it is: Without throttling, lockout or MFA, a password is only as strong as the attacker is patient.
- Impact: Member accounts fall to automated guessing; the club faces account takeovers and a personal-data breach.

### User enumeration via login & forgot-password
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- What it is: Different error messages for "no such user" and "wrong password" turn your login page into a member directory.
- Impact: Attackers harvest a verified member email list for phishing and credential stuffing against the club.

### Published demo credentials (incl. admin)
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- What it is: Demo and default credentials left in production are an open door with the key taped to it.
- Impact: Anyone on the internet can sign in as staff — full control of members, plans and payments.

### Predictable password-reset token
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- What it is: Reset tokens must be long, random and single-use; anything derivable from a user id is public knowledge.
- Impact: Any member account — including staff — can be taken over by guessing an id, no inbox access required.

### Session/role cookie tampering
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it is: Role and privilege data must live server-side in the session; anything the client sends can be edited by the client.
- Impact: Any member becomes "staff" by editing a cookie — trainer dashboards, member notes and schedules all exposed.

## Registration & Profile

### Weak password policy (1-character passwords)
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- What it is: A password policy is the cheapest control in the building; without one, brute force and guessing get trivial.
- Impact: Members pick guessable passwords, and the club owns the resulting account-takeover incidents.

### Mass assignment — role / plan / credits at signup
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it is: Bind only an explicit allow-list of fields on signup and profile updates; never Object.assign the request body.
- Impact: Attackers self-register as administrators with premium plans and free PT credits — total platform compromise at signup.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- What it is: User-controlled text must be output-encoded on every render; one stored payload fires for every viewer, including admins.
- Impact: An attacker plants script that runs in staff browsers — session theft and actions performed as the club admin.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it is: State-changing forms need an unguessable anti-CSRF token verified server-side; cookies alone ride along automatically.
- Impact: A malicious page visited by a logged-in member silently rewrites their profile and contact email.

## Membership & Payments

### Premium membership activated at a tampered price
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- What it is: Prices are server-side truth. Anything priced by the client will be repriced by the client — to zero.
- Impact: The club gives away its premium tier for free; at scale this is direct revenue loss and fraud.

### Membership expiry forged via freeze/extend field
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- What it is: Every numeric field a client can send is a negotiation; durations and dates that carry money must be bounded server-side.
- Impact: Members extend paid membership indefinitely for free — silent, compounding revenue leakage.

### Freeze another member’s membership (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it is: Every object reference in a request must be authorised against the session — "they sent the id" is not permission.
- Impact: Members sabotage each other: rivals freeze competitors’ memberships before a competition or billing run.

## Class Bookings

### Booking into a full class (capacity not enforced)
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- What it is: Business invariants (capacity, stock, seats) must be enforced where the state changes — on the server, transactionally.
- Impact: Classes overbook beyond safe capacity: fire-code and injury risk, refunds and angry members at the door.

### Cancel another member’s booking (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it is: Cancel/modify endpoints are IDOR magnets: always verify the record belongs to the caller.
- Impact: Harassment and denial of service between members — booked spots vanish minutes before class.

## Personal Training

### PT session booked with zero credits
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- What it is: Paid actions must check entitlement at the moment of the transaction, server-side, every time.
- Impact: Unlimited free personal training — the club’s highest-margin product given away by a missing if-statement.

### PT session price tampering
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- What it is: Like membership prices, service prices must be resolved server-side from the catalogue, never from the request.
- Impact: Members buy premium coaching for $1; trainers’ earnings and reports are corrupted downstream.

## Progress & Trainer Notes

### View another member’s progress (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it is: Health-adjacent data (weight, measurements) is sensitive personal data — object-level authorisation is mandatory.
- Impact: Members’ body data leaks between members: embarrassment, stalking risk and a data-protection breach for the club.

### Read another member’s private trainer notes (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- What it is: "Private" in the UI copy is not access control. Notes about health need the strictest object checks in the app.
- Impact: Medical and rehab notes exposed to all members — a serious privacy breach with regulatory consequences.

### Stored XSS in trainer notes
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- What it is: Free-text staff fields are stored-XSS carriers too; encode on output no matter who typed it.
- Impact: A rogue or compromised trainer account attacks members and admins through a trusted internal feature.

## Guest Passes

### Guest pass redeemed twice (no single-use check)
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- What it is: Single-use tokens must be consumed atomically and checked on every redemption.
- Impact: One pass admits an endless stream of guests — lost day-pass revenue and unknown people in the facility.

### Forged / predictable guest pass accepted
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- What it is: Identifiers that double as secrets must be unguessable and verified against issued records.
- Impact: Anyone who knows a member id mints valid guest passes — unauthorised access to the premises.

## Search

### SQL injection in search dumps all members
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- What it is: Every input that reaches a query needs parameterisation — search boxes are the most-tested input on any site.
- Impact: The entire member directory (names, emails, plans) is exfiltrated through the public search box.

### Reflected XSS in search results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- What it is: Reflected input must be encoded in the response; search pages are the classic delivery vehicle for phishing links.
- Impact: Attackers send members crafted links that run script in the club’s own site, stealing sessions.

## Admin Panel

### Admin panel open to any logged-in member
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- What it is: Every privileged route needs a server-side role check on every request; obscurity is not a control.
- Impact: Every member can view the full member list with emails, plans and account data — mass personal-data exposure.

## Platform & API

### Weak API token (base64 of email) reads any member
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- What it is: API tokens must be random, secret and scoped; an identifier is not a credential, and tokens never replace per-object authorisation.
- Impact: The full member database is readable by anyone who can guess an email — which the search flaw happily provides.
