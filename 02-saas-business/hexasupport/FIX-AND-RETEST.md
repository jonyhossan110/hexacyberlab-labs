# HexaSupport — Fix & Retest

For every scored test: the secure implementation, and the regression retest that proves the fix. Method: apply the fix in a copy of the lab, re-run the exact exploit from PRACTICE-GUIDE.md, confirm it now fails, and confirm the legitimate flow still works.


## Login & Authentication

### SQL Injection Login Bypass (Critical)
- **Secure implementation:** Use parameterised queries everywhere; never concatenate user input into SQL; add a WAF/regression test for tautology payloads.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** On a real support portal this is a full account takeover of the first matching account — here the supervisor — exposing every customer conversation the company holds.

### Brute Force — No Rate Limiting or Lockout (High)
- **Secure implementation:** Throttle per account and per IP, add progressive delays/lockout and alert on credential-stuffing patterns.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Attackers can guess a customer or agent password at full speed; one reused password from a breach list is often all it takes to open a support account full of private conversations.

### User Enumeration via Login & Forgot-Password Responses (Medium)
- **Secure implementation:** Return one generic message for all auth failures and reset requests regardless of account existence.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** An attacker can harvest a verified list of the client's customers and staff emails, then aim password sprays and phishing precisely at them.

### Default Vendor Credentials Still Active (High)
- **Secure implementation:** Disable built-in accounts, force unique credentials at install, and audit for default passwords.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Anyone on the internet who knows the product manual walks into an agent account — reading and answering customer tickets as if they were staff.

### Predictable Password-Reset Token (Critical)
- **Secure implementation:** Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly, bind them to one use.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** An attacker who can guess a reset token owns the supervisor account — and with it every ticket, every customer email and every internal note in the system.

### Session Cookie Role Tampering (Critical)
- **Secure implementation:** Keep roles server-side in the session store, or sign session data (HMAC) and verify on every request.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A normal customer becomes supervisor by editing a cookie: full control of the helpdesk, its staff accounts and its SLA settings.


## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Medium)
- **Secure implementation:** Enforce a minimum length (≥10) and screen against breached-password lists.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Customers who pick "a" as a password hand attackers a trivially guessable account containing their support history and personal details.

### Mass Assignment — Role Granted at Registration (Critical)
- **Secure implementation:** Whitelist bindable fields per endpoint; never accept role/privilege fields from client input.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Anyone can self-register as supervisor of the client's helpdesk — no exploit tooling, just one extra form field.

### Stored XSS in Display Name (High)
- **Secure implementation:** Context-encode all user-supplied output; sanitise stored rich text; deploy a restrictive CSP.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A malicious customer can run script in an agent's browser, stealing their session and answering or deleting tickets as that agent.


## Tickets

### Ticket IDOR — Reading Another Customer's Ticket (High)
- **Secure implementation:** Authorize every object access server-side against the session user and role; use unguessable ids as defence in depth.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Customers can read each other's support tickets — billing problems, addresses, audit requests — a direct privacy breach and a GDPR problem for the client.

### Internal Agent Notes Leaked to Customers (High)
- **Secure implementation:** Filter internal-only content server-side per audience; never rely on hiding it in the UI.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Customers reading internal notes see exactly what staff say about them — expired cards, retention flags, suspicion notes — destroying trust and sometimes creating legal liability.

### Reply Role Spoofing — Customer Posts as an Agent (High)
- **Secure implementation:** Derive author identity and role exclusively from the server-side session.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A customer can post "official" agent replies — fake refund approvals, fake policy statements — inside real support threads, and other readers will trust them.

### Ticket Status Tampering by Customer (Medium)
- **Secure implementation:** Enforce role-based state transitions server-side; ignore workflow fields from unauthorised roles.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Customers can close or reopen tickets at will — hiding unresolved issues, corrupting support metrics and voiding SLA reporting.

### Priority & SLA Tampering by Customer (Medium)
- **Secure implementation:** Restrict priority changes to staff roles; recompute SLA only on authorised transitions and log changes.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Every customer marks themselves Critical: real emergencies drown, SLA reports become meaningless, and support costs climb.

### Agent Acting Outside Their Queue (Reassign/Close) (Medium)
- **Secure implementation:** Check queue ownership on assign/close actions; reserve cross-queue actions for supervisors and log them.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A rogue or careless agent can close another agent's critical tickets, sabotage colleagues' metrics, or bury a VIP case — with the audit trail pointing at the workflow, not the person.


## Search & Canned Responses

### SQL Injection in Ticket Search (High)
- **Secure implementation:** Parameterise search queries; enforce result scoping in the data layer, not by filter strings.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A customer can dump the entire ticket base through the search box — every subject line of every customer's support history.

### Reflected XSS in Search (Medium)
- **Secure implementation:** HTML-encode reflected input; validate search terms; add CSP.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A crafted search link sent to an agent executes script in their session — a stepping stone to helpdesk takeover.

### Canned Response Tampering (Editing the Supervisor's Templates) (Medium)
- **Secure implementation:** Authorize canned-response edits by owner or supervisor role; audit template changes.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** An agent can rewrite the official refund policy template — and every customer thereafter gets the tampered wording from "support".


## Attachments

### Unrestricted File Upload — HTML Served Back (High)
- **Secure implementation:** Whitelist file types, verify content, store outside web root, serve with Content-Disposition and safe types.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Attackers host phishing pages and script under the client's real support domain, inheriting its trust — and any agent who opens the attachment is in range.

### Path Traversal in File Download (High)
- **Secure implementation:** Resolve and verify the canonical path stays inside the upload directory; map downloads to stored ids.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Source code, configuration and any file the server can read leak through a download link — usually the first step to a deeper compromise.


## Admin Panel

### Supervisor Panel Open to Any Logged-In User (Critical)
- **Secure implementation:** Enforce supervisor role server-side on all admin routes; deny by default.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Every registered customer can open the supervisor panel and read all staff and customer credentials in plaintext.

### CSRF on Supervisor SLA Settings (Medium)
- **Secure implementation:** Issue and verify per-session CSRF tokens on all state-changing requests; set SameSite=Lax on session cookies.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** A supervisor who visits a malicious page can silently rewrite the company's SLA commitments — a business-integrity attack, not just a technical one.


## API & Platform

### Weak API Token (Base64 of Email) (High)
- **Secure implementation:** Issue random, high-entropy API keys; store hashed; allow revocation and rotation.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** Anyone who knows a customer's email — printed on every ticket — can pull their full ticket history through the API.

### Unauthenticated Customer Data Exposure Endpoint (Critical)
- **Secure implementation:** Require authentication and authorization on every API route; never return password material.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** The entire customer and staff credential list is one anonymous request away — instant full compromise of the helpdesk.

### Missing Security Headers (Low)
- **Secure implementation:** Add Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy.
- **Regression retest:** repeat the exploit steps for this test; the attack must fail (no bypass session, no foreign object served, no tampered change applied, no payload executed) while the normal user flow still succeeds.
- **Why it matters:** The support portal can be embedded in an attacker's page for clickjacking, tricking staff into clicking disguised actions.
