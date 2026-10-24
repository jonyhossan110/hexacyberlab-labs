# HexaLegal — Vulnerability Map (LAB 97)

Every scored test in the lab, grouped by feature. This is the complete map of what can be found and proven.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit an email containing a SQL fragment with a comment terminator and any password; a session is created without knowing a real password.
- **Impact:** On a real law-firm portal this hands an attacker the first account in the database — usually an administrator — with no password at all, exposing every client matter the firm holds.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit at least 10 failed logins for one account; the application keeps accepting attempts with no throttle, delay, or lockout.
- **Impact:** Attackers can grind through common-password lists against attorney accounts overnight; one guessed password exposes confidential client files and billing.

### User Enumeration via Different Error Messages
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Probe 5 or more distinct emails; responses differ depending on whether the account exists, confirming valid usernames.
- **Impact:** Attackers build a verified list of attorney and client emails from the firm's own pages, then aim phishing and password attacks only at accounts that definitely exist.

### Published Demo Credentials
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** Login page / POST /login
- **Exploitation outline:** The login page prints a demo email and password; signing in with them succeeds.
- **Impact:** Anyone on the internet can walk into the portal with the published demo login and browse whatever that account can reach — on a real firm that means real client matters.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Compute the token from the target's user id using the visible formula and submit it without any reset ever being requested; the password changes.
- **Impact:** Anyone who knows an attorney's user id can mint a valid reset token, set a new password, and read every confidential case that attorney handles.

### Role Cookie Tampering (Client-Supplied Role)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /attorney (hx_role cookie)
- **Exploitation outline:** Log in as a client, change the hx_role cookie to attorney, and load the attorney console; access is granted from the cookie alone.
- **Impact:** A client can promote themselves to "attorney" by editing a cookie and open the firm's internal console — every other client's matters included.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Create an account with a password shorter than 4 characters; registration succeeds.
- **Impact:** Client accounts protected by passwords like "a" or "1" can be guessed in seconds, exposing their legal matters to strangers.

### Mass Assignment — Self-Assign Attorney/Admin Role
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** Include an extra role field in the registration body; the new account is created with the attacker-chosen privileged role.
- **Impact:** A stranger can register themselves as an attorney or administrator of the firm portal in one request, gaining access to all client matters.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /register → rendered in /admin and profiles
- **Exploitation outline:** Store a script payload in the display name; it is served unescaped to other users.
- **Impact:** An attacker plants a script in their profile name; when an admin opens the user list, the script runs with the admin's session and can hijack it.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** Submit a profile change without the session's hx_origin marker; the change is accepted, proving no CSRF verification exists.
- **Impact:** A malicious page a client visits can silently rewrite their profile details on the firm portal — the first step in social-engineering and account-takeover chains.

## Search & Discovery

### SQL Injection in Case Search Leaks Draft Matters
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **Exploitation outline:** Inject a tautology into the search term; the results include the draft matter that normal lists hide.
- **Impact:** An attacker dumps the firm's entire matter list — including unfiled draft matters the firm believes are invisible — learning who is suing whom before anything is public.

### Reflected XSS in Search Results
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /search?q=
- **Exploitation outline:** Put an HTML/JS payload in the q parameter; it is reflected unescaped in the results page.
- **Impact:** Attackers send clients a "search link" to the firm's own portal that runs script in the client's browser under the firm's trusted domain.

## Cases & Matters

### Case IDOR — Read Another Client's Matter
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /cases/:id
- **Exploitation outline:** Request a case that belongs to a different client; the full matter is served with no ownership check.
- **Impact:** Any client of the firm can read every other client's legal matters simply by changing a number — a devastating breach of legal confidentiality.

### Attorney Notes Leak to Non-Assigned Users
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /cases/:id/notes
- **Exploitation outline:** Request the notes of a case you are not assigned to; the confidential notes are served.
- **Impact:** Attorney strategy notes — negotiation floors, witness plans — are the most sensitive text a firm holds; leaking them to opposing parties or other clients can lose cases.

### Edit Another Client's Case (Write IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /cases/:id/edit
- **Exploitation outline:** Submit an edit for a case owned by another client; the change is saved.
- **Impact:** A malicious user can rename, re-status, or corrupt other clients' matters — sabotaging active legal work and destroying trust in the firm's records.

## Documents & Files

### Document IDOR — Download Another Client's File
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /documents/:id
- **Exploitation outline:** Request a document belonging to another client's case; the file content is served.
- **Impact:** Confidential filings, agreements, and work product from every client can be downloaded by any other client by guessing numbers.

### Path Traversal in File Download
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /download?file=
- **Exploitation outline:** Supply ../ sequences in the file parameter; a file outside the documents folder is returned.
- **Impact:** Attackers read server source code, configuration, and any file the process can access — often including credentials — turning a download feature into full compromise.

### Unrestricted File Upload — Stored HTML Served
- **OWASP:** A08:2021 Software and Data Integrity Failures
- **Difficulty:** Intermediate
- **Location:** POST /cases/:id/upload → GET /uploads/:name
- **Exploitation outline:** Upload an .html file containing a script payload; it is stored and later served as text/html from the application origin.
- **Impact:** An attacker uploads an HTML "document" to a case; when the attorney opens it, script runs in the attorney's session under the firm's domain.

## Appointments

### Appointment IDOR — View Another Client's Booking
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /appointments/:id
- **Exploitation outline:** Request an appointment belonging to another client; its details are served.
- **Impact:** Rivals and opponents learn exactly when a client meets their attorney and the topic of the consultation — intelligence that can change negotiations and litigation.

### Double-Booking the Same Attorney Slot
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /appointments
- **Exploitation outline:** Create an appointment for an attorney at a slot that is already booked; the system accepts both bookings.
- **Impact:** Conflicting consultations get booked for the same attorney at the same time — missed meetings, angry clients, and in real matters, missed legal deadlines.

## Billing & Invoices

### Invoice IDOR — View Another Client's Bill
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /invoices/:id
- **Exploitation outline:** Request an invoice issued to another client; the full bill is served.
- **Impact:** Clients can spy on what other clients are being charged and for what work, leaking both commercial terms and the existence of sensitive matters.

### Payment Amount Tampering — Settle a Bill for $1
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /invoices/:id/pay
- **Exploitation outline:** Submit a payment far below the invoice total; the invoice is marked paid in full.
- **Impact:** Clients can settle hundreds or thousands in legal bills for a dollar, directly stealing revenue from the firm.

## Admin Panel

### Admin Console Open to Any Logged-In User
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **Exploitation outline:** Load the admin console with a non-admin session; the user table including passwords is rendered.
- **Impact:** Every registered user — including any client — can open the firm's admin console and read all accounts and passwords, a complete compromise of the portal.

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/users/:id/deactivate
- **Exploitation outline:** Submit the deactivation without the session's hx_origin marker; the account is deactivated.
- **Impact:** A firm admin browsing the web can be tricked into deactivating accounts — or worse — without ever seeing the portal.

## Platform & API

### Weak API Token — Base64 of Email
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/cases (X-Api-Token header)
- **Exploitation outline:** Base64-encode a victim's email and present it as the API token; their cases are returned without any session.
- **Impact:** Anyone who knows or guesses a client's email address can pull their entire case list from the API — no password, no session, no trace.

### Unauthenticated Debug Endpoint Dumps All Accounts
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** Fetch the debug endpoint with no credentials; the full user table including passwords is returned.
- **Impact:** A single unauthenticated URL hands out every account and password in the system — total compromise in one request.
