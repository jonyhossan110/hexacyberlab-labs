# HexaHire (LAB 94) — Complete Vulnerability Map

Intentionally vulnerable LOCAL practice lab. Every entry below is a scored test in the Mission Board (/tests). Do not deploy publicly.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 - Injection
- **Difficulty:** Intermediate
- **Location:** POST /login
- **Exploitation outline:** POST /login with email `' OR '1'='1' -- ` and any password; a session is created without knowing any real password.
- **Impact:** On a real client ATS, this means full account takeover of recruiter and admin accounts with no password at all — every candidate record behind them is exposed.

### Brute Force - No Rate Limiting or Lockout
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** POST /login 10+ times with wrong passwords for one real account; every attempt is still processed.
- **Impact:** Attackers can grind through common passwords against a client's recruiter accounts and walk into the whole hiring pipeline.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Probe >=5 distinct emails via /login and /forgot; responses reveal which emails are registered.
- **Impact:** A client's attacker can confirm which employee emails have accounts, then focus phishing and password attacks only on real targets.

### Published Demo Credentials
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** GET /login
- **Exploitation outline:** Use the demo credentials printed on the login page to sign in.
- **Impact:** One public demo login gives an attacker a genuine foothold inside the client's ATS to explore, enumerate and escalate from.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Compute HH<id>-<id*149+37> for a user who never requested a reset and POST /reset with it, then log in with the new password.
- **Impact:** Anyone who can see a recruiter's user id can reset that account's password and own the client's hiring data.

### Session/Role Cookie Tampering
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /admin
- **Exploitation outline:** As a non-admin, set cookie hx_role=admin and GET /admin.
- **Impact:** Any low-privilege user of the client's ATS can promote themselves to admin just by editing a cookie.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** POST /register with a 1-character password; the account is created.
- **Impact:** Client staff accounts with trivial passwords are the first domino in most breaches of tools like this.

### Mass Assignment - Self-Assign Admin Role at Registration
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** POST /register including role=admin; the new account really holds the admin role.
- **Impact:** Anyone can mint themselves an admin account in the client's ATS in one request — no exploit chain needed.

### Stored XSS in Display Name
- **OWASP:** A03:2021 - Injection
- **Difficulty:** Beginner
- **Location:** POST /register, GET /team
- **Exploitation outline:** Register (or rename) with a display name containing a script payload; it is stored and rendered raw on /team.
- **Impact:** A stored payload in the client's ATS fires in recruiters' and admins' browsers — session theft and actions in their name.

### CSRF on Profile Update
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** POST /profile (name change) with a valid session but no hx_origin cookie/field; the change is accepted.
- **Impact:** A recruiter visiting a malicious page while logged in could have their ATS profile silently altered by the attacker's site.

## Candidates

### Candidate IDOR - Read Another Company's Candidate
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /candidates/:id
- **Exploitation outline:** As a company-1 user, GET /candidates/2001 (a company-2 candidate) and read the full profile.
- **Impact:** A client using this ATS leaks rival companies' candidate pools — names, emails, salary expectations — to any authenticated user.

### Candidate CV Download IDOR
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /candidates/:id/documents/:docId
- **Exploitation outline:** As a company-1 user, download document 3003 belonging to a company-2 candidate.
- **Impact:** CVs contain personal data (emails, phone numbers, work history). Cross-tenant CV access is a personal-data breach for the client.

### Pipeline Stage Skipping (Applied Straight to Hired)
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /candidates/:id/stage
- **Exploitation outline:** POST /candidates/1002/stage with stage=Hired while the candidate is still at Applied.
- **Impact:** An insider (or hijacked account) can push an unscreened candidate straight to Hired in the client's pipeline, defeating every control before it.

## Search & Jobs

### SQL Injection in Candidate Search
- **OWASP:** A03:2021 - Injection
- **Difficulty:** Intermediate
- **Location:** GET /search
- **Exploitation outline:** GET /search?q=' OR '1'='1' --  returns confidential and other-company candidates.
- **Impact:** Confidential executive-search candidates and other tenants' pipelines — the data the client most needs to protect — are dumped through a search box.

### Reflected XSS in Search
- **OWASP:** A03:2021 - Injection
- **Difficulty:** Beginner
- **Location:** GET /search
- **Exploitation outline:** GET /search?q=<script>alert(1)</script> reflects the payload unescaped in the response.
- **Impact:** A crafted search link sent to a client recruiter executes script in their ATS session when clicked.

### Edit Another Company's Job Posting
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /jobs/:id/edit
- **Exploitation outline:** As a company-1 user, POST /jobs/201/edit changing a company-2 job; the change is applied.
- **Impact:** A competitor or malicious user can rewrite the client's job ads — titles, salary bands — damaging hiring and reputation.

## Interviews & Scorecards

### Interview & Scorecard IDOR
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /interviews/:id
- **Exploitation outline:** As a company-1 user, GET /interviews/502 and read another company's scorecard.
- **Impact:** Leaked scorecards expose brutally honest internal opinions about candidates — a legal and reputational risk for the client.

### Scorecard Tampering - Score an Interview You Did Not Conduct
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /interviews/:id/scorecard
- **Exploitation outline:** POST /interviews/503/scorecard as a user who is not the assigned interviewer; the scorecard is stored.
- **Impact:** Anyone can fabricate glowing (or damning) scorecards in the client's ATS, corrupting hiring decisions.

## Offers

### Offer Letter IDOR
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /offers/:id
- **Exploitation outline:** As a company-1 user, GET /offers/701 and read another company's offer salary.
- **Impact:** Competitors learning the client's exact offer amounts can outbid every hire — a direct commercial loss.

### Offer Salary / Status Tampering
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /offers/:id/update
- **Exploitation outline:** POST /offers/702/update changing the salary, or setting status=Accepted; the change is stored.
- **Impact:** A tampered offer can commit the client to the wrong salary, or fake an acceptance that triggers onboarding and costs.

## Documents & Files

### Unrestricted File Upload - HTML Served from the App
- **OWASP:** A08:2021 - Software and Data Integrity Failures
- **Difficulty:** Intermediate
- **Location:** POST /upload, GET /uploads/:name
- **Exploitation outline:** Upload an .html file containing a script payload, then GET it from /uploads/ and receive it as text/html.
- **Impact:** Phishing pages and script hosted on the client's own ATS domain inherit its trust and its users' sessions.

### Path Traversal on File Download
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /download
- **Exploitation outline:** GET /download?file=../server.js returns the server source.
- **Impact:** Source code, configuration and secrets on the client's server become downloadable — the keys to every other attack.

## Admin Panel

### Admin User Data Served to Any Logged-In User
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin/users.json
- **Exploitation outline:** As a non-admin user, GET /admin/users.json and receive all users including passwords.
- **Impact:** Every user password in the client's ATS is one request away for the lowliest account — total compromise.

### CSRF on Admin User Deactivation
- **OWASP:** A01:2021 - Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/deactivate
- **Exploitation outline:** As an admin, POST /admin/deactivate without the hx_origin marker; the user is deactivated.
- **Impact:** An attacker page visited by the client's admin silently deactivates user accounts — a denial of service against the whole hiring team.

## Platform & API

### Weak API Token - Base64 of the User's Email
- **OWASP:** A07:2021 - Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/candidates
- **Exploitation outline:** GET /api/candidates with header X-Api-Key = base64(email) and no session cookie; candidate data is returned.
- **Impact:** Anyone who knows a recruiter's email address has full API access to the client's candidate pipeline.

### Unauthenticated Debug Endpoint Dumps All Users
- **OWASP:** A05:2021 - Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** GET /api/debug with no session returns all users including passwords.
- **Impact:** The entire user table, passwords included, is public on the client's ATS to anyone who guesses one URL.
