# HexaProperty (LAB 91) — Vulnerability Map

All 26 scored tests, grouped by feature. A test flips to DONE only when the exploit’s real effect is observed by the server.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 – Injection
- Difficulty: Beginner
- Report severity: Critical
- What it teaches: String-built queries let attacker input change the logic of the query itself; parameterised queries keep data and code separate.
- Client impact: On a real portal, anyone could sign in as the admin or any agent without knowing a password — complete account takeover of the business and its client data.

### No Brute-Force Protection on Login
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Report severity: High
- What it teaches: Without rate limiting or lockout, online password guessing is only a matter of time and a wordlist.
- Client impact: Attackers can grind through passwords for agent and owner accounts at full speed, quietly taking over listings and client inquiries.

### User Enumeration via Login and Reset Responses
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Different error messages for "no such account" and "wrong password" hand attackers a verified list of valid accounts to target.
- Client impact: Enumerated agent and owner emails become a precise target list for phishing and password attacks against the portal.

### Predictable Password-Reset Token
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Intermediate
- Report severity: High
- What it teaches: A reset token derived from public data with simple arithmetic is not a secret; tokens must be long, random and single-use.
- Client impact: Anyone can reset the password of any agent or owner whose ID they know, locking the real user out and taking over their listings.

### Demo Credentials Published on the Login Page
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Published or default credentials are not a convenience feature; they are an open door anyone can walk through.
- Client impact: Attackers get a free, legitimate account inside the portal to probe IDORs and other flaws from an authenticated position.

### Role Trusted from a Client Cookie (hx_role)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: High
- What it teaches: Authorization decisions must be made from server-side session data, never from values the client can edit.
- Client impact: Any buyer can promote themselves to agent and read commission data and client lists simply by editing a cookie.

## Registration & Profile

### Weak Password Policy at Registration
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Client-side hints are not enforcement; password policy must be validated on the server.
- Client impact: Users pick trivially guessable passwords, and the portal cannot claim any baseline of account security.

### Mass Assignment at Registration (role / featuredCredits)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: High
- What it teaches: Binding request bodies directly to data objects lets attackers set fields that were never meant to be user-controlled.
- Client impact: Attackers mint their own admin accounts or grant themselves paid featured-listing credits at sign-up — instant privilege and free advertising.

### Stored XSS in Display Name
- OWASP: A03:2021 – Injection
- Difficulty: Beginner
- Report severity: High
- What it teaches: Any stored field rendered without output encoding becomes a stored cross-site scripting payload aimed at other users — including admins.
- Client impact: An attacker can run script in the browsers of agents, owners and the portal admin, stealing sessions and acting in their name.

### CSRF on Profile Update
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: Medium
- What it teaches: Anti-CSRF markers only protect when the server verifies them on every state-changing request.
- Client impact: A malicious page visited by a signed-in agent can silently change their profile and contact email — the first step to account takeover.

## Search & Listings

### SQL Injection in Property Search Leaks Draft Listings
- OWASP: A03:2021 – Injection
- Difficulty: Intermediate
- Report severity: High
- What it teaches: Injection in search does not just error the page — it can rewrite the query to expose records that were never meant to be public.
- Client impact: Unpublished properties, pre-market prices and internal notes leak to competitors and buyers before launch, destroying negotiating position.

### Reflected XSS in Search Results
- OWASP: A03:2021 – Injection
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Reflected input must be encoded for the context it lands in, even when it looks like "just an echo".
- Client impact: Attackers craft search links that run script in a victim agent’s browser when clicked — a clean phishing and session-theft vector.

### Unpublished (Draft) Listing Visible by Direct URL
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: High
- What it teaches: Hiding an object from listings is not access control; every object request must check status and ownership on the server.
- Client impact: Pre-market properties and private agent notes (including the owner’s minimum acceptable price) leak to anyone who guesses an ID.

## Listings Management

### Edit Another Owner's Listing (Broken Access Control)
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: High
- What it teaches: Every object mutation must verify that the caller owns (or may administer) that object — the UI hiding a button is not a check.
- Client impact: Competitors or vandals can reprice, rename or deface any owner’s listings, directly costing sales and reputation.

### Featured-Listing Price Tampering
- OWASP: A04:2021 – Insecure Design
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Prices belong on the server. Anything the client states about money must be recomputed or verified server-side.
- Client impact: Owners get premium advertising for $1 instead of $49 — quiet, scalable revenue loss on every featured listing.

### Unrestricted File Upload — HTML Served from the Portal
- OWASP: A04:2021 – Insecure Design
- Difficulty: Intermediate
- Report severity: High
- What it teaches: Uploads must be validated by content, stored safely, and served with a harmless content type — otherwise the upload feature is a hosting service for attackers.
- Client impact: Attackers host phishing pages and scripts on the portal’s trusted domain, aimed at buyers and agents.

## Inquiries

### Read Another Buyer's Inquiry with Private Contact Details
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: High
- What it teaches: Objects containing personal data need the strictest ownership checks; sequential IDs make guessing trivial.
- Client impact: Buyers’ phone numbers and emails leak to strangers — a privacy breach and a list of hot leads for competitors.

### Delete an Inquiry on Someone Else's Listing
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: Medium
- What it teaches: Destructive actions need authorization checks at least as strong as reads; otherwise rivals can erase your sales pipeline.
- Client impact: A competitor can silently delete buyer inquiries, so owners never see genuine offers and lose sales without a trace.

## Appointments

### Double-Booking the Same Viewing Slot
- OWASP: A04:2021 – Insecure Design
- Difficulty: Intermediate
- Report severity: Medium
- What it teaches: Uniqueness invariants (one booking per slot) must be enforced in server logic and storage, not assumed from the UI calendar.
- Client impact: Two buyers arrive for the same viewing, agents double-book their day, and the portal’s scheduling data becomes untrustworthy.

### Cancel Another Buyer's Viewing Appointment
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: State-changing endpoints on objects must verify the caller’s relationship to the object on every request.
- Client impact: Rivals can cancel competitors’ viewings the night before, quietly killing deals.

### Buyer Confirms Own Appointment via the Agent/Owner Action
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: Medium
- What it teaches: Workflow state transitions are authorization boundaries: each transition must name the roles allowed to perform it.
- Client impact: Buyers self-approve viewings for properties they should never access, including occupied or off-market homes — a safety as well as security issue.

## Saved Searches

### Read Another User's Saved Search and Alert Email
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: Medium
- What it teaches: Even "minor" objects leak business intelligence; authorization must cover every object type, not just the obvious ones.
- Client impact: Competing agents learn buyers’ budgets and alert emails — exactly the data needed to poach clients.

## Admin Panel

### Admin Panel Open to Any Signed-In User
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Beginner
- Report severity: Critical
- What it teaches: Admin surfaces must verify an admin role on the server for every request; obscurity of the URL is not protection.
- Client impact: Any registered user can read every account’s password and take over the entire portal.

### CSRF on Admin User Deactivation
- OWASP: A01:2021 – Broken Access Control
- Difficulty: Intermediate
- Report severity: High
- What it teaches: Admin actions are the highest-value CSRF targets; unverified markers give a false sense of safety.
- Client impact: One malicious page view by the admin can deactivate agents and owners across the portal.

## Platform & API

### Weak API Key — Base64 of the Account Email
- OWASP: A07:2021 – Identification and Authentication Failures
- Difficulty: Intermediate
- Report severity: High
- What it teaches: An API key must be an unguessable secret; encoding a public identifier is not authentication.
- Client impact: Anyone who knows an agent’s email — printed on every listing — can pull their full business data from the API.

### Unauthenticated Debug Endpoint Dumps All Accounts
- OWASP: A05:2021 – Security Misconfiguration
- Difficulty: Beginner
- Report severity: Critical
- What it teaches: Debug and diagnostics endpoints must never ship enabled in production — they bypass every other control at once.
- Client impact: One unauthenticated request hands an attacker every account and password on the portal.
