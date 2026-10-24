# HexaJobs (LAB 93) — Vulnerability Map

Every scored test in the lab, grouped by feature. This is the complete map: 26 tests across 9 features.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** POST /login (email field)
- **Exploitation outline:** Try the email: ' OR '1'='1' --  with any password. The comment swallows the password check.
- **Impact:** On a real job portal this means instant takeover of the admin account — every candidate CV, personal email and employer record exposed in one request.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Script 10+ failed logins for alice@test.local — the 10th failure is still processed like the first.
- **Impact:** A client's users get silently cracked by password-spraying bots; the business finds out from its users, not from its own logs.

### User Enumeration via Login & Password-Reset Responses
- **OWASP:** A07:2021 – Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /forgot and POST /login error messages
- **Exploitation outline:** Submit 5 different emails to /forgot — real accounts get "reset link sent", unknown ones get "no such account".
- **Impact:** Attackers harvest the client's real user list and focus credential-stuffing on accounts that definitely exist, massively raising success rates.

### Demo Credentials Published on the Login Page
- **OWASP:** A07:2021 – Authentication Failures
- **Difficulty:** Beginner
- **Location:** Login page demo box
- **Exploitation outline:** Log in with the demo credentials printed on the login page (demo@hexajobs.local).
- **Impact:** Anyone on the internet can walk into the client's platform with a legitimate account — the cheapest possible breach.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET/POST /reset?token=
- **Exploitation outline:** Tokens look like HJ<id>-<id*137+42>. Compute one for another user id and use it without ever requesting a reset.
- **Impact:** An attacker resets the password of any user — including admins and employers — without touching their inbox. Full platform takeover.

### Role Taken from a Client Cookie (Cookie Tampering)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** hx_role cookie, checked on /admin
- **Exploitation outline:** Log in as a normal seeker, change the hx_role cookie value to admin, then open /admin.
- **Impact:** Every registered user can promote themselves to admin in seconds — user data, billing and moderation all fall at once.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 – Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register with the password "a" — the account is created happily.
- **Impact:** The client's users pick (and attackers crack) laughably weak passwords; account-takeover support tickets follow.

### Mass Assignment — Role & Plan Set at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register (extra form fields)
- **Exploitation outline:** Add role=admin (or role=employer and plan=premium) to the registration POST and check your new account.
- **Impact:** Attackers mint free premium employer accounts — or full admins — at signup, skipping payment and vetting entirely.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** Display name, rendered on employer applicant lists & profile pages
- **Exploitation outline:** Set your name to <script>alert(1)</script> and view a page that renders it (e.g. an applicant list or your profile).
- **Impact:** An attacker's "name" steals session cookies from every employer who reviews applicants — the client's paying customers get hijacked.

### Cross-Site Request Forgery on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** POST to /profile as a logged-in user WITHOUT the hx_origin form field — the change still goes through.
- **Impact:** A malicious page silently rewrites a victim's profile (name, contact email) — a stepping stone to account recovery abuse.

## Job Search

### SQL Injection in Job Search Leaks Draft Jobs
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** GET /jobs?q=
- **Exploitation outline:** Search for: ' OR '1'='1' --  and the unpublished DRAFT job appears in the results.
- **Impact:** Unannounced roles (a secret CTO hire, a restructuring) leak to competitors and press before the client chooses to publish them.

### Reflected XSS in Search Results
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** GET /jobs?q= (term echoed in the heading)
- **Exploitation outline:** Search for <script>alert(1)</script> and view the page source — the payload sits raw in the heading.
- **Impact:** Attackers send crafted search links to the client's users; the script runs under the portal's trusted domain and steals sessions.

## Job Listings

### Unpublished Draft Job Readable by Direct URL
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /job/:id
- **Exploitation outline:** Open /job/3 — a DRAFT job that appears in no listing — as a seeker.
- **Impact:** Confidential draft postings (salaries, internal plans) are readable by anyone who guesses a number — including competitors.

### Edit Another Employer's Job Posting (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /employer/job/:id/edit
- **Exploitation outline:** Log in as the FoodHub employer and edit TechCorp's job (id 1) — the change is saved.
- **Impact:** A rival employer rewrites or defaces the client's customers' job ads — salaries changed, descriptions vandalised, trust destroyed.

## Applications

### Read Another Candidate's Application (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /application/:id
- **Exploitation outline:** Log in as Bob and open Alice's application at /application/1 — her cover letter renders in full.
- **Impact:** Candidates' cover letters, emails and job-hunting activity leak — a GDPR problem and a trust disaster for the portal.

### Candidate Sets Own Application Status to "Hired"
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /application/:id/status
- **Exploitation outline:** As Alice, POST status=hired to your own application (/application/1/status) — the portal accepts your self-promotion.
- **Impact:** Candidates mark themselves hired/shortlisted, corrupting the client's hiring pipeline and any reporting built on it.

### Change Another Candidate's Application Status
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /application/:id/status
- **Exploitation outline:** As Bob, POST status=rejected to Alice's application (/application/1/status) and watch her pipeline change.
- **Impact:** Rival candidates (or anyone registered) sabotage other people's job applications — real-world harm to real job seekers.

### Apply on Behalf of Another User (seekerId Parameter)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /job/:id/apply
- **Exploitation outline:** Apply to a job while adding seekerId=<another user's id> — the application is filed under their name.
- **Impact:** Attackers file fake applications in victims' names, spam employers, and poison a candidate's reputation with the client's customers.

## CVs & Files

### Unrestricted CV Upload — HTML File Stored & Served
- **OWASP:** A08:2021 – Software and Data Integrity Failures
- **Difficulty:** Intermediate
- **Location:** POST /cv/upload, served at GET /cv/file/:id
- **Exploitation outline:** Upload a file named cv.html containing <script>alert(1)</script>, then open its /cv/file/ link.
- **Impact:** Attackers host phishing pages and scripts on the client's own trusted domain — the portal becomes the attack platform.

### Path Traversal on CV Download
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /cv/download?file=
- **Exploitation outline:** Request /cv/download?file=../server.js and the application serves its own source code.
- **Impact:** Source code, configuration and secrets leak — the attacker reads the client's system like a book and plans the next attack.

### Download Another Candidate's CV (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /cv/file/:id
- **Exploitation outline:** Log in as Bob and open Alice's CV at /cv/file/1 — full text, no questions asked.
- **Impact:** Every candidate's CV — name, phone, address, work history — is harvestable. That is a reportable data breach for the client.

## Employer Plans & Billing

### Plan Upgrade Price Tampering
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /employer/plan/upgrade
- **Exploitation outline:** Upgrade to premium with price=0 — the premium plan activates and the invoice says $0.
- **Impact:** Every employer upgrades for free — direct revenue loss on the client's core product.

### Read Another Employer's Invoice (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /employer/invoice/:id
- **Exploitation outline:** Log in as FoodHub and open TechCorp's invoice at /employer/invoice/1.
- **Impact:** Competitors read each other's billing through the client's portal — pricing, plans and company details exposed.

## Admin Panel

### Admin User List Open to Any Logged-in User
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin/users
- **Exploitation outline:** Log in as any seeker and open /admin/users.
- **Impact:** The entire user list — emails and passwords — is visible to any registered user. Total platform compromise in one click.

### CSRF on Admin User Deletion
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/user/:id/delete
- **Exploitation outline:** As an admin, POST to /admin/user/3/delete WITHOUT the hx_origin field — the user is deleted.
- **Impact:** One malicious link wipes the client's user accounts while an admin is logged in — vandalism at scale.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Data
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** Open /api/debug in a fresh browser with no session and read everything.
- **Impact:** One URL, no credentials: the attacker downloads the client's entire database including plaintext passwords.
