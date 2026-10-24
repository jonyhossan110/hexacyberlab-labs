# HexaVision — Vulnerability Map (LAB 33)

The complete map of the lab: every scored test in the registry, grouped by feature. Each flaw is live in the running app and is detected server-side when the exploit actually succeeds.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Password: ' OR '1'='1 — the glued-together query then matches the first account (the admin).
- **Impact:** On a real client site this is a full account takeover — the attacker logs in as admin without knowing any password.
- **Report as:** "SQL Injection in Login (Authentication Bypass)" — Critical. Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Fail 10 logins in a row for the same account — every attempt is still processed.
- **Impact:** Attackers can grind through password lists against real customer accounts, including staff accounts, unnoticed.
- **Report as:** "Missing Brute-Force Protection on Login" — High. Fix: Add rate limiting, progressive delays / lockout and MFA; alert on repeated failures.

### User Enumeration via Login & Forgot-Password
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Existing email: "wrong password" / reset sent. Unknown email: a different message. Probe one of each to prove it.
- **Impact:** Attackers first build a list of valid customer emails, then aim phishing and password attacks only at real accounts.
- **Report as:** "User Enumeration via Authentication Responses" — Medium. Fix: Return one generic message ("invalid credentials" / "if an account exists…") for all cases.

### Default / Demo Credentials Still Active
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Log in as demo@hexavision.local with the documented demo password.
- **Impact:** Anyone who reads the docs (or guesses) can sign in — a real client would hand attackers a working account.
- **Report as:** "Active Default/Demo Account with Weak Password" — High. Fix: Remove or disable demo/default accounts before production; enforce unique strong passwords.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Token = rst-(userId × 137 + 42). Compute it for the admin (id 1) and reset without ever seeing an email.
- **Impact:** An attacker can reset ANY account’s password — including the admin’s — with nothing but the victim’s user id.
- **Report as:** "Predictable Password Reset Token" — High. Fix: Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and make them single-use.

### Session Role Cookie Tampering
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Login & Authentication flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Set the hxv_role cookie to admin and visit /admin as a normal user.
- **Impact:** Any customer can promote themselves to admin just by editing a cookie — full platform compromise.
- **Report as:** "Client-Controlled Role Cookie Trusted for Authorisation" — Critical. Fix: Keep roles in the server-side session; never trust client-supplied role claims.

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Where:** the Registration & Profile flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** A 1-character password is accepted — register with one.
- **Impact:** Customers will pick trivial passwords, and attackers will guess them in seconds.
- **Report as:** "No Password Policy on Registration" — Medium. Fix: Enforce a minimum length (≥10) and block common/breached passwords.

### Mass Assignment — Plan, Credits and Role
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Submit plan=Enterprise, credits=9999 or role=admin with registration or a profile update.
- **Impact:** Attackers give themselves Enterprise plans, free credits or even admin role — direct revenue loss and takeover.
- **Report as:** "Mass Assignment of Privileged Fields" — High. Fix: Whitelist bindable fields per endpoint; set role/plan/credits only in server-side logic.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Where:** the Registration & Profile flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Set your display name to an HTML/JS payload such as <script>alert(1)</script>.
- **Impact:** An attacker’s payload runs in other users’ and admins’ browsers — session theft and actions performed as the victim.
- **Report as:** "Stored Cross-Site Scripting via Display Name" — High. Fix: Escape all user output by context and add a Content-Security-Policy.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Registration & Profile flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Send the profile POST from a "foreign" origin (or without the app’s marker cookie) and watch it apply.
- **Impact:** A malicious page a logged-in user visits can silently change their profile — and, combined with other flaws, their role.
- **Report as:** "Missing CSRF Protection on Profile Update" — Medium. Fix: Add per-session CSRF tokens to all state-changing forms and verify Origin/Referer.

## Galleries & Images (4)

### Private Gallery IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Galleries & Images flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Open gallery 1 or 4 (another user’s PRIVATE gallery) while logged in as someone else.
- **Impact:** Customers’ private photo galleries — often client work or family photos — are readable by any signed-in stranger.
- **Report as:** "Insecure Direct Object Reference on Private Galleries" — High. Fix: Authorise every object access against the session user; deny by default.

### Private Image IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Galleries & Images flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Open image 1, 5 or 6 (private, owned by others) as a different user.
- **Impact:** Private client images can be downloaded in bulk by competitors or extortionists.
- **Report as:** "Insecure Direct Object Reference on Private Images" — High. Fix: Check ownership/visibility on the media endpoint itself, not just in the UI.

### Reflected XSS in Gallery Search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Where:** the Galleries & Images flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Search for <script>alert(1)</script> and view the page source.
- **Impact:** Attackers send victims a crafted search link that runs script in the victim’s session.
- **Report as:** "Reflected Cross-Site Scripting in Search" — Medium. Fix: Contextually escape all reflected values; validate input.

### Gallery / Image Enumeration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Galleries & Images flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** View at least 5 different gallery/image ids in quick succession.
- **Impact:** Attackers map the whole media library first, then target the valuable private items.
- **Report as:** "Enumerable Object Identifiers with No Access Monitoring" — Medium. Fix: Use unguessable ids (UUIDs) for sensitive objects and rate-limit object access.

## Uploads & Import (3)

### Upload Type Confusion — HTML Served Inline
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Where:** the Uploads & Import flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Upload a file named page.html containing HTML/JS, then open its /media link — it renders as a web page from this origin.
- **Impact:** Attackers host phishing pages and script under the client’s own trusted domain.
- **Report as:** "Unrestricted File Upload — HTML/Script Served from Application Origin" — High. Fix: Whitelist image types by magic bytes, store outside web root, serve with Content-Disposition: attachment or a safe type.

### Path Traversal on File Download
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Uploads & Import flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Ask for ../server.js and read the application’s own source code.
- **Impact:** Attackers read source code, configuration and secrets from the server — the keys to every other attack.
- **Report as:** "Path Traversal in File Download" — High. Fix: Resolve the final path and verify it stays inside the allowed directory; whitelist file names.

### SSRF via Image-URL Import
- **OWASP:** A10:2021 – Server-Side Request Forgery
- **Difficulty:** Intermediate
- **Where:** the Uploads & Import flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Import http://169.254.169.254/latest/meta-data/ and read what the server fetched on your behalf.
- **Impact:** Attackers reach cloud credentials and internal services that were never meant to be public — often full cloud takeover.
- **Report as:** "Server-Side Request Forgery in URL Import" — High. Fix: Allowlist hosts, block private/link-local ranges, and disable redirects to internal addresses.

## AI Analysis Jobs (3)

### Analysis Job Result IDOR
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the AI Analysis Jobs flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Open job 1 (Alice’s) while logged in as Bob or Carol.
- **Impact:** Competitors can read the AI results customers paid for, including labels on unreleased product photos.
- **Report as:** "Insecure Direct Object Reference on Analysis Jobs" — Medium. Fix: Authorise job access against the owning account on every request.

### Analysis Result Tampering by Non-Owner
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the AI Analysis Jobs flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** POST a new score/labels to a job owned by another user.
- **Impact:** Attackers can falsify moderation or quality results — e.g. mark unsafe content as safe on a client’s platform.
- **Report as:** "Broken Access Control on Job Result Update" — High. Fix: Verify ownership (or an explicit reviewer role) before allowing result changes; log all edits.

### Credit Abuse via Client-Supplied Job Cost
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Where:** the AI Analysis Jobs flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Submit a job with cost 0 — or a negative cost — and watch your balance.
- **Impact:** Customers run unlimited paid AI jobs for free — or mint themselves credits — direct revenue loss.
- **Report as:** "Client-Controlled Pricing on Credit-Charged Jobs" — High. Fix: Compute charges server-side; ignore any client-supplied price/cost fields.

## Collections & Sharing (2)

### Private Collection Leakage
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Where:** the Collections & Sharing flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Open collection 1 or 3 (private, not yours) while logged in as another user.
- **Impact:** Curated client proof sets — often the most sensitive images — leak to any account holder.
- **Report as:** "Private Collections Accessible by Direct URL" — High. Fix: Enforce visibility + ownership checks on the collection route.

### Predictable Share Token
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Collections & Sharing flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Tokens are just shr-<collection id>. Guess the link for a private, never-shared collection.
- **Impact:** Anyone can open every "private" shared collection by counting numbers — sharing controls become theatre.
- **Report as:** "Guessable Share Tokens for Private Collections" — High. Fix: Generate share tokens with a CSPRNG, store them hashed, and allow revocation.

## API Access (2)

### Predictable API Key Derived from Email
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Where:** the API Access flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Compute hv_ + base64(email) for another user and call the API as them.
- **Impact:** Anyone who knows a customer’s email owns their API account — data access and credit spending included.
- **Report as:** "Predictable API Keys Derived from Email Address" — High. Fix: Issue random API keys (≥128 bits), show them once, store only hashes.

### API Returns All Users’ Private Images (BOLA)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the API Access flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Call it with your own key and count how many PRIVATE images belong to other users.
- **Impact:** One free account drains the whole platform’s private media library through the official API.
- **Report as:** "Broken Object Level Authorisation in API Image Listing" — High. Fix: Scope every API query by the token owner; filter private objects by permission.

## Admin Panel (1)

### State-Changing Admin Action via GET (CSRF)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Where:** the Admin Panel flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** As admin, open /admin/grant?email=…&amount=… — or trick an admin into opening it.
- **Impact:** An attacker who gets an admin to click a link can mint credits or alter accounts — no password needed.
- **Report as:** "CSRF / Unsafe GET for Admin Credit Grant" — Medium. Fix: Use POST with CSRF tokens for all state changes; never mutate on GET.

## Platform & Exposure (1)

### Debug Endpoint Exposes Internal Configuration
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Where:** the Platform & Exposure flows of HexaVision (see PRACTICE-GUIDE.md for the step-by-step challenge).
- **Exploitation outline:** Fetch /debug and read the internal configuration it hands to anyone.
- **Impact:** Attackers get internal configuration and notes that make every other attack faster and quieter.
- **Report as:** "Exposed Debug Endpoint with Internal Configuration" — Medium. Fix: Remove debug endpoints in production; restrict diagnostics to admin + localhost.
