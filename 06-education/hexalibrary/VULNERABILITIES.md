# HexaLibrary — VULNERABILITIES

Every scored test in LAB 56, grouped by feature (26 tests across 10 features). Each entry maps to a real, working flaw in the app; a test passes only when the server observes the exploit’s real effect.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Severity (report):** Critical
- **Location:** POST /login (email field)
- **Exploitation outline:** Submit a tautology payload in the email field; the string-built query matches the first member row (the admin) and a session is issued without the real password.
- **Impact:** On a real library (or any membership site) this is a full account takeover of the most privileged account — every member record, every loan, every fee is exposed or editable.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Severity (report):** High
- **Location:** POST /login
- **Exploitation outline:** Script repeated password guesses against one account; no failure ever triggers a delay, lockout or challenge.
- **Impact:** Attackers can grind through password lists against real member accounts; one weak password quietly becomes a breach of private reading history and personal data.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Severity (report):** Medium
- **Location:** POST /login, POST /forgot
- **Exploitation outline:** Probe known and unknown emails and diff the responses: "No member account found" vs "Incorrect password" (and the equivalent split on the forgot-password form).
- **Impact:** Attackers first harvest valid member emails here, then aim phishing and password guessing only at accounts that definitely exist — far higher success, far less noise.

### Default Demo Account Credentials
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Severity (report):** High
- **Location:** Seed account demo@hexalibrary.local
- **Exploitation outline:** Log in with the shipped demo account using its default password (demo / demo).
- **Impact:** A forgotten demo account is a free, legitimate-looking login — from there an attacker explores everything a real member can reach.

### Predictable Password Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /reset
- **Exploitation outline:** Derive the token from the public member id using the visible formula LIB-(id*271+13) and reset any member’s password.
- **Impact:** Anyone who can see a member’s id (the directory prints them) can reset that member’s password and take over the account — no email access needed.

### Role Cookie Tampering (hx_role)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** hx_role cookie, checked at GET /librarian
- **Exploitation outline:** Log in as a member, rewrite the hx_role cookie to librarian/admin, then open the staff page that trusts the cookie.
- **Impact:** Every member becomes a librarian or admin by editing one cookie: catalog, fees and member data are all editable by the least trusted users.

## Registration & Profile

### Weak Password Policy (1-Character Passwords Accepted)
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Severity (report):** Medium
- **Location:** POST /register
- **Exploitation outline:** Register with a 1-character password; the account is created and usable.
- **Impact:** Real members with 1–4 character passwords fall to guessing in seconds; the platform’s policy, not the user, is the root cause.

### Mass Assignment — Role Granted at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** Critical
- **Location:** POST /register
- **Exploitation outline:** Add an unlisted role field to the registration request; the record is created with the supplied staff role.
- **Impact:** Anyone on the internet can self-register as staff. Every staff-only control behind that role (catalog, fee waivers) is then legitimately "theirs".

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /register, POST /profile → rendered on /members
- **Exploitation outline:** Store an HTML/JS payload as the display name; it is rendered unescaped on member/staff pages.
- **Impact:** A booby-trapped member name executes in staff browsers when they open the member list — session theft and actions performed as the librarian.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** Medium
- **Location:** POST /profile
- **Exploitation outline:** Drive the profile-update POST from a cross-site origin while the victim is logged in; the change is applied without any token check.
- **Impact:** A member who visits a malicious page while logged in can have their profile (and contact email) silently rewritten — the first step to account recovery abuse.

## Catalog & Search

### SQL Injection in Book Search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** GET /search?q=
- **Exploitation outline:** Put a tautology in the search term; the string-built catalog query returns every row.
- **Impact:** Search is public-facing, so this is an unauthenticated injection point — a lever for dumping or corrupting the catalog and member data behind it.

### Reflected XSS in Search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Severity (report):** Medium
- **Location:** GET /search?q= (results heading)
- **Exploitation outline:** Put a script payload in the search term; it is reflected raw into the results heading.
- **Impact:** Attackers send members a poisoned search link; the script runs in the victim’s session on the real library domain.

## Borrowing & Loans

### Borrow Beyond the Licensed Copy Limit
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /books/:id/borrow
- **Exploitation outline:** Borrow a title whose licensed copies are all out; the loan is issued past the licence.
- **Impact:** The library is contractually liable for every copy lent beyond its licence — a script can mint unlimited "copies" of paid content.

### Member Borrowing Limit Bypass (3-Loan Cap)
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Severity (report):** Medium
- **Location:** POST /books/:id/borrow
- **Exploitation outline:** Borrow a 4th title on an account already holding the 3-loan maximum.
- **Impact:** One account can drain the entire licensed catalog, denying every other member access — a denial-of-service written in business logic.

### Due-Date Extension Tampering
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Severity (report):** Medium
- **Location:** POST /loans/:id/extend
- **Exploitation outline:** Submit the extension form with a day count far beyond the 7-day policy; the due date moves by that amount.
- **Impact:** Members keep books forever and the late-fee system is meaningless — direct revenue and availability loss with no hacking tools required.

### Loan IDOR — Another Member’s Loan Details
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Severity (report):** High
- **Location:** GET /loans/:id
- **Exploitation outline:** Increment the loan id in the URL to a loan owned by a different member; the record is served.
- **Impact:** Members can map exactly what everyone else is reading and when — private behaviour data, exposed one id at a time.

## Downloads & Files

### Ebook Download Without Ever Borrowing It
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Severity (report):** High
- **Location:** GET /books/:id/download
- **Exploitation outline:** Open a title’s download URL with no loan history for it; the file is served.
- **Impact:** The entire paid catalog is free to anyone who registers a throwaway account — the library’s core product leaks by URL pattern alone.

### Path Traversal in File Download
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** GET /download?file=
- **Exploitation outline:** Walk the file parameter out of the docs folder with ../ sequences to read application files.
- **Impact:** Source code, configuration and any file the server can read are exposed — source disclosure turns every other flaw in this lab into a guided tour.

## Reservations

### Reservation Queue Jumping
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Severity (report):** Medium
- **Location:** POST /books/:id/reserve
- **Exploitation outline:** Include a position field in the reservation request; the reservation is inserted at the chosen position.
- **Impact:** Bots and insiders permanently front-run ordinary members for high-demand titles — trust in the reservation system collapses.

### Cancel Another Member’s Reservation (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Severity (report):** Medium
- **Location:** POST /reservations/:id/cancel
- **Exploitation outline:** POST a cancellation for a reservation id owned by another member; it is cancelled.
- **Impact:** Members can sabotage each other’s reservations at scale, destroying queue integrity and support confidence.

## Fees & Payments

### Member Waives a Late Fee (Staff Action, No Role Check)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /fees/:id/waive
- **Exploitation outline:** Call the staff waiver endpoint as a plain member; the fee is waived.
- **Impact:** All late fees — the library’s only overdue deterrent — can be erased by the very members who owe them.

### Fee Payment Amount Tampering
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /fees/:id/pay
- **Exploitation outline:** Pay a fee with a form amount far below the balance; the fee is recorded as settled.
- **Impact:** Members settle any fee for a cent. On a real platform the same pattern drains real money — prices, fees and balances must be server truth.

## Members & Reading History

### Another Member’s Reading History (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Severity (report):** High
- **Location:** GET /members/:id/history
- **Exploitation outline:** Change the member id in the history URL; another member’s full reading history is served.
- **Impact:** Reading habits reveal health, politics, religion and finances. Exposing them is a serious privacy breach and, in many jurisdictions, a regulated one.

## Librarian & Admin

### Admin Panel Served Without Any Role Check
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Severity (report):** Critical
- **Location:** GET /admin
- **Exploitation outline:** Open the admin console as a plain member; it renders with no role check.
- **Impact:** The member administration surface (accounts, roles, fee states) is one guessable URL away from every registered member.

### Member Edits the Catalog via the Librarian Endpoint
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Severity (report):** High
- **Location:** POST /librarian/books/:id/edit
- **Exploitation outline:** POST catalog edits directly to the librarian endpoint as a member; the change is saved.
- **Impact:** Any member can rewrite the catalog — titles, authors, licensed copy counts — vandalising the collection and the licence ledger.

## Platform & API

### Debug Endpoint Dumps Every Member Record (incl. Passwords)
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Severity (report):** Critical
- **Location:** GET /debug
- **Exploitation outline:** Fetch the leftover debug endpoint; it returns the member table including plaintext passwords with no authentication.
- **Impact:** One URL hands over every member’s email and password — instant full-platform compromise and credential-stuffing ammunition for other sites.
