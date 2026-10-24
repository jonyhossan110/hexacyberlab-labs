# HexaVoice (LAB 37) — Complete Vulnerability Map

26 scored tests across 10 features. Every item below is a real, working flaw in this app, detected server-side by its effect.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **What it is:** String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.
- **Business impact:** On a real client site this means anyone can sign in as an administrator without a password — full account takeover of the platform and every customer recording on it.
- **Report as:** "SQL Injection in legacy SSO login allows authentication bypass" (Severity: Critical)

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Without throttling, lockout or MFA, an attacker can try unlimited passwords until one works.
- **Business impact:** A client's users with weak passwords would be taken over by automated guessing; the business learns about it only after customer data leaks.
- **Report as:** "No rate limiting or account lockout on login enables brute-force attacks" (Severity: High)

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Different error messages for "no such user" and "wrong password" let attackers build a list of valid accounts to attack.
- **Business impact:** Attackers can confirm which of a client's customers have accounts, then focus phishing and password attacks only on real targets.
- **Report as:** "Login and password-reset responses reveal whether an account exists" (Severity: Medium)

### Default Demo Credentials Still Active
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** Demo and default accounts are the first thing attackers try; they must be removed or forced to change password before go-live.
- **Business impact:** A forgotten demo login on a client platform is a free, legitimate-looking way in — no exploit needed, and it often bypasses monitoring.
- **Report as:** "Default demo account with a guessable password is active" (Severity: High)

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **What it is:** A reset token derived predictably from public data (the email) is not a secret — anyone can mint one for any account.
- **Business impact:** Anyone who knows a customer's email address can reset their password and take the account, including the recordings and billing details inside it.
- **Report as:** "Password-reset tokens are predictable (derived from the email address)" (Severity: High)

### Session Cookie Role Tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Authorisation decisions must be made from server-side session data, never from values the client can edit.
- **Business impact:** Any signed-in customer can promote themselves to platform admin by editing a cookie — deleting users and reading every transcript on the service.
- **Report as:** "Admin authorisation trusts a client-editable role cookie" (Severity: Critical)

## Registration & Profile

### Weak Password Policy (1-character passwords)
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **What it is:** A registration flow that accepts trivial passwords manufactures brute-forceable accounts.
- **Business impact:** Customers who choose "1" or "a" as a password hand attackers an easy way into their recordings and payment details.
- **Report as:** "Registration accepts single-character passwords (no password policy)" (Severity: Medium)

### Mass Assignment — Role & Plan via Registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Binding request data directly onto models lets attackers set privileged fields the UI never offered.
- **Business impact:** Attackers mint their own admin accounts or free enterprise plans — privilege escalation and revenue loss in a single request.
- **Report as:** "Registration allows mass assignment of role and plan fields" (Severity: Critical)

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** Any user-controlled string rendered without output encoding becomes stored XSS when other people view it.
- **Business impact:** An attacker's booby-trapped profile name can steal session cookies or act as the admin who views it — one bad signup can compromise staff accounts.
- **Report as:** "Stored cross-site scripting via display name" (Severity: High)

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** State-changing requests need an unguessable anti-CSRF token tied to the session; cookies alone are sent automatically by browsers.
- **Business impact:** A malicious page a customer visits while logged in can silently change their profile, email or password — account takeover by drive-by.
- **Report as:** "Profile update lacks CSRF protection" (Severity: Medium)

## Recordings & Transcripts

### Recording IDOR — Read Another User's Recording
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Every object access must check that the object belongs to (or is shared with) the requester — hiding the link is not protection.
- **Business impact:** Voice recordings are deeply personal — calls, interviews, medical and legal dictations. One changed digit exposes a customer's private audio and transcript.
- **Report as:** "Insecure direct object reference on recording pages exposes other users' recordings" (Severity: High)

### Private Recording Served via Predictable Media URL
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Media endpoints need the same authorisation as the pages that link to them; predictable URLs are public URLs.
- **Business impact:** Anyone on the internet can enumerate /media/1, /media/2, … and harvest every customer's "private" recordings without an account at all.
- **Report as:** "Unauthenticated predictable media URLs expose private recordings" (Severity: Critical)

### Transcript Edited by Non-Owner
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Write paths need the same ownership checks as read paths; a missing check on the save endpoint silently undoes all the others.
- **Business impact:** Attackers (or rivals) can rewrite the official transcript of a client's call — falsified records, wrong invoices, legal exposure — without the owner noticing.
- **Report as:** "Transcript update endpoint lacks ownership authorisation" (Severity: High)

### Reflected XSS in Recording Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** Reflected input must be output-encoded; a search box is a classic injection point into other users' browsers.
- **Business impact:** A crafted search link sent to a client's staff runs script in their session — phishing, session theft or actions taken as them.
- **Report as:** "Reflected cross-site scripting in recording search" (Severity: Medium)

## Sharing Links

### Share-Link Enumeration (Sequential Tokens)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Capability URLs only work as access control when the token is unguessable; a sequence number is not a secret.
- **Business impact:** Every "anyone with the link" recording a client ever shared can be harvested by walking the counter — private meetings and interviews leak wholesale.
- **Report as:** "Share tokens are sequential and enumerable" (Severity: High)

### Share Link Created for Someone Else's Recording
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Actions that publish data need ownership checks most of all — creating the share is itself the disclosure.
- **Business impact:** Any user can publicly expose another customer's private recording and send the link anywhere — a one-click data breach.
- **Report as:** "Users can create public share links for recordings they do not own" (Severity: Critical)

## Speakers

### Speaker Profile IDOR — Private Voiceprint Notes
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Secondary objects (speakers, attachments, notes) are forgotten in access-control reviews — they need the same ownership checks as headline objects.
- **Business impact:** Private speaker notes can identify who said what in sensitive calls; leaking them de-anonymises a client's confidential conversations.
- **Report as:** "Speaker profiles (with private notes) accessible by any user" (Severity: Medium)

### Rename Another User's Speaker
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Write endpoints on secondary objects are classic IDOR territory — test every mutation, not just the reads.
- **Business impact:** Tampered speaker labels corrupt the record of who said what — in legal, HR or journalistic recordings that destroys trust in the transcript itself.
- **Report as:** "Speaker rename endpoint lacks ownership authorisation" (Severity: Medium)

## Usage & Billing

### Usage-Minute Manipulation (Client-Supplied Duration)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **What it is:** Billing quantities must be measured server-side; a client-supplied usage figure is an invitation to free service.
- **Business impact:** Customers (or attackers in stolen accounts) can transcribe unlimited audio while reporting zero minutes — direct revenue loss that scales silently.
- **Report as:** "Transcription billing trusts client-supplied minute counts" (Severity: High)

### Plan Upgrade Price Tampering
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner
- **What it is:** Never trust prices, totals or discounts sent by the client; look them up server-side at purchase time.
- **Business impact:** Anyone can upgrade to the top plan for free — the client's premium tier becomes worthless and paying customers feel cheated.
- **Report as:** "Plan upgrade accepts client-supplied price (free enterprise upgrade)" (Severity: High)

## API Access

### Predictable API Key Derived from Email
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **What it is:** API keys must be random secrets; deriving them from public identifiers makes them public too.
- **Business impact:** Anyone who knows a customer's email address owns their API access — recordings can be pulled programmatically, at scale, invisibly.
- **Report as:** "API keys are predictable (base64 of the account email)" (Severity: Critical)

### API BOLA — Foreign Recording via API
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** APIs need per-object authorisation exactly like web pages — BOLA is the #1 API vulnerability for a reason.
- **Business impact:** Through the API, an attacker can script the download of every recording on the platform — bulk theft instead of one page at a time.
- **Report as:** "Broken object-level authorisation in the recordings API (BOLA/IDOR)" (Severity: High)

## Webhooks & Integrations

### Webhook SSRF to Internal Services (simulated)
- **OWASP:** A10:2021 Server-Side Request Forgery · **Difficulty:** Advanced
- **What it is:** Any server-side fetch of a user-supplied URL must be allow-listed and blocked from internal address ranges, or the server becomes a proxy into the private network.
- **Business impact:** Attackers can make a client's server call internal admin panels and cloud metadata endpoints — a foothold behind the firewall from a settings page.
- **Report as:** "Webhook test fetch allows SSRF to internal addresses" (Severity: High)

## Admin Panel

### CSRF on Admin User Deletion (GET)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** State changes must never ride on GET, and always need CSRF tokens — admin actions most of all.
- **Business impact:** One malicious image tag on a page an admin views can delete customer accounts — destructive CSRF with real data loss.
- **Report as:** "Admin user deletion is a tokenless GET request (CSRF)" (Severity: High)

## Platform & Data Exposure

### Debug Endpoint Dumps All Users & Passwords
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **What it is:** Debug and diagnostic endpoints must never ship to production — they bypass every other control at once.
- **Business impact:** One forgotten URL hands out every customer's password — instant, total compromise of the whole service.
- **Report as:** "Public /debug endpoint exposes all user records including passwords" (Severity: Critical)

### Missing HTTP Security Headers
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **What it is:** Baseline security headers are cheap defence in depth against clickjacking, sniffing and injected content.
- **Business impact:** Without headers, a client's site can be embedded in phishing frames and its uploads sniffed as executable content — small gaps that make other attacks easier.
- **Report as:** "Missing HTTP security headers on all responses" (Severity: Low)
