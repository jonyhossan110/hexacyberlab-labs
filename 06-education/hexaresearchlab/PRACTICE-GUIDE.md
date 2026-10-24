# HexaResearchLab (LAB 60) — Practice Guide

Work through the challenges feature by feature. Each challenge is scored automatically by the lab when the exploit really succeeds — watch the progress bar and the mission board at /tests. Hints are graded: use Hint 1 first, Hint 3 only when truly stuck. After 3 genuine attempts on a feature, the Lab Coach will guide you step by step.

## Login & Authentication

### SQL Injection — Login Bypass (Beginner)
- **Objective:** Make the lab register a pass for "SQL Injection — Login Bypass" by performing the exploit end-to-end against the live portal (POST /login).
- Hint 1: The login form builds its database query by gluing your input straight into the query text.
- Hint 2: Try a quote in the email field — then make the rest of the condition always true.
- Hint 3: Email: admin@hexaresearchlab.local' OR '1'='1 — the password check never really happens.

### Brute Force — No Rate Limiting on Login (Beginner)
- **Objective:** Make the lab register a pass for "Brute Force — No Rate Limiting on Login" by performing the exploit end-to-end against the live portal (POST /login).
- Hint 1: Nothing slows you down here — no lockout, no CAPTCHA, no delay.
- Hint 2: Pick a target email and just keep guessing passwords.
- Hint 3: After 10 failed attempts for one account the portal still happily processes the 11th — the missing throttle is the flaw.

### User Enumeration via Password Reset (Beginner)
- **Objective:** Make the lab register a pass for "User Enumeration via Password Reset" by performing the exploit end-to-end against the live portal (POST /forgot-password).
- Hint 1: The forgot-password form answers differently depending on whether the account exists.
- Hint 2: Compare the message for a real email against an invented one.
- Hint 3: Probe at least 5 different emails and note which ones the portal confirms as registered.

### Default Demo Credentials Accepted (Beginner)
- **Objective:** Make the lab register a pass for "Default Demo Credentials Accepted" by performing the exploit end-to-end against the live portal (POST /login (demo account)).
- Hint 1: The login page itself offers a demo account to visitors.
- Hint 2: Demo accounts left active in production are just published passwords.
- Hint 3: Sign in with the demo email and password printed on the login page.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the lab register a pass for "Predictable Password-Reset Token" by performing the exploit end-to-end against the live portal (POST /reset-password).
- Hint 1: Reset tokens here are generated, not randomised — they are derived from something public about the account.
- Hint 2: What does the portal know about a user that an attacker also knows? Start with the email address.
- Hint 3: The token is 'HXRESET-' plus the first 12 characters of the base64 of the account's email — compute it for any user and reset their password without requesting a link.

### Role Cookie Tampering Grants Editor Access (Intermediate)
- **Objective:** Make the lab register a pass for "Role Cookie Tampering Grants Editor Access" by performing the exploit end-to-end against the live portal (GET /editor).
- Hint 1: After login the browser carries a cookie that repeats your role back to the server.
- Hint 2: One page trusts that cookie instead of the server-side session record.
- Hint 3: Set your hx_role cookie to 'editor' and open /editor — your real role never changes, but the door opens.

## Registration & Profile

### Mass Assignment — Self-Assigned Editor Role at Registration (Intermediate)
- **Objective:** Make the lab register a pass for "Mass Assignment — Self-Assigned Editor Role at Registration" by performing the exploit end-to-end against the live portal (POST /register).
- Hint 1: The registration form only shows a few fields, but the server reads more from the request than it shows.
- Hint 2: What happens if you add a field the form never offered?
- Hint 3: Register with an extra field role=editor — the account is created holding that role.

### Weak Password Policy — 1-Character Passwords Accepted (Beginner)
- **Objective:** Make the lab register a pass for "Weak Password Policy — 1-Character Passwords Accepted" by performing the exploit end-to-end against the live portal (POST /register).
- Hint 1: Try registering with the shortest password the form will take.
- Hint 2: There is no minimum length or complexity check anywhere.
- Hint 3: A password of a single character is accepted.

### Stored XSS in Display Name (Intermediate)
- **Objective:** Make the lab register a pass for "Stored XSS in Display Name" by performing the exploit end-to-end against the live portal (POST /register, POST /profile/update).
- Hint 1: Your display name is printed back in the header of every page — and it is not encoded.
- Hint 2: Whatever you store as your name is delivered to the browser exactly as you wrote it.
- Hint 3: Register (or rename yourself) with a name containing a script payload and watch it stored raw.

### CSRF on Profile Update (Intermediate)
- **Objective:** Make the lab register a pass for "CSRF on Profile Update" by performing the exploit end-to-end against the live portal (POST /profile/update).
- Hint 1: The profile form carries a same-site marker — but does the server ever check it?
- Hint 2: A state-changing POST from another origin is processed exactly like your own.
- Hint 3: Submit the profile update with a cross-site Origin header and no marker field — the change is saved anyway.

## Paper Submissions

### Paper IDOR — Reading Another Author's Paper (Beginner)
- **Objective:** Make the lab register a pass for "Paper IDOR — Reading Another Author's Paper" by performing the exploit end-to-end against the live portal (GET /papers/:id).
- Hint 1: Paper URLs carry a simple numeric id.
- Hint 2: Nobody checks whether the paper belongs to you, is assigned to you, or is any of your business.
- Hint 3: Open /papers/2 while signed in as a different author and read the full paper.

### Manuscript Download Without Authorisation (Beginner)
- **Objective:** Make the lab register a pass for "Manuscript Download Without Authorisation" by performing the exploit end-to-end against the live portal (GET /papers/:id/manuscript).
- Hint 1: The manuscript link hangs off the paper page — and the download endpoint has the same missing check.
- Hint 2: You do not need to own a paper, or be assigned to review it, to pull its full text.
- Hint 3: Request /papers/<id>/manuscript for a paper you have no relationship with.

### Unrestricted File Upload — Stored HTML Served From the Portal (Intermediate)
- **Objective:** Make the lab register a pass for "Unrestricted File Upload — Stored HTML Served From the Portal" by performing the exploit end-to-end against the live portal (POST /papers/:id/upload, GET /files/:name).
- Hint 1: The attachment upload never asks what kind of file you are sending.
- Hint 2: The portal serves your file back under its own origin, with a content type picked from the extension.
- Hint 3: Upload a file named evil.html containing markup and open /files/evil.html — it renders as a page of this portal.

### Path Traversal in Supplementary File Download (Intermediate)
- **Objective:** Make the lab register a pass for "Path Traversal in Supplementary File Download" by performing the exploit end-to-end against the live portal (GET /download?file=).
- Hint 1: The download helper joins your file name onto the files folder without cleaning it.
- Hint 2: Dot-dot segments let you walk out of the folder.
- Hint 3: Ask the download endpoint for ../data/editor-notes.txt and read the editors’ private notes.

## Peer Review

### Review Submitted Without Assignment (Intermediate)
- **Objective:** Make the lab register a pass for "Review Submitted Without Assignment" by performing the exploit end-to-end against the live portal (POST /papers/:id/reviews).
- Hint 1: The review form only appears when you are assigned, but the endpoint behind it trusts the POST.
- Hint 2: Any signed-in user can post a review for any paper if they ask the endpoint directly.
- Hint 3: POST a review to /papers/<id>/reviews for a paper you were never assigned to.

### Tampering With Another Reviewer's Score (Intermediate)
- **Objective:** Make the lab register a pass for "Tampering With Another Reviewer's Score" by performing the exploit end-to-end against the live portal (POST /reviews/:id/score).
- Hint 1: Review scores can be updated through a small endpoint keyed by review id.
- Hint 2: The endpoint never asks whose review it is.
- Hint 3: POST a new score to /reviews/<id>/score for a review you did not write.

### Reviewer Identity Leak to Authors (Double-Blind Broken) (Beginner)
- **Objective:** Make the lab register a pass for "Reviewer Identity Leak to Authors (Double-Blind Broken)" by performing the exploit end-to-end against the live portal (GET /api/papers/:id/reviews).
- Hint 1: Peer review here is supposed to be double-blind — authors must never learn who reviewed them.
- Hint 2: A JSON endpoint returns more about each review than the paper page does.
- Hint 3: As the paper's author, fetch /api/papers/<id>/reviews and read the reviewers' real names and emails.

### Author Assigns Themselves as Reviewer of Their Own Paper (Intermediate)
- **Objective:** Make the lab register a pass for "Author Assigns Themselves as Reviewer of Their Own Paper" by performing the exploit end-to-end against the live portal (POST /papers/:id/assign).
- Hint 1: Assigning reviewers is an editor job — but the assignment endpoint only checks that you are signed in.
- Hint 2: The author of a paper is very motivated to review it themselves.
- Hint 3: POST your own email to /papers/<your paper id>/assign and you become its reviewer.

### Accept/Reject Decision Made by a Non-Editor (Intermediate)
- **Objective:** Make the lab register a pass for "Accept/Reject Decision Made by a Non-Editor" by performing the exploit end-to-end against the live portal (POST /papers/:id/decide).
- Hint 1: The decision endpoint changes a paper’s status to accepted or rejected.
- Hint 2: It never checks that the caller is an editor.
- Hint 3: POST a decision to /papers/<id>/decide as a plain author and the status changes.

### Accepting a Review Invitation Addressed to Someone Else (Beginner)
- **Objective:** Make the lab register a pass for "Accepting a Review Invitation Addressed to Someone Else" by performing the exploit end-to-end against the live portal (POST /invitations/:id/accept).
- Hint 1: Invitations are keyed by a simple numeric id and can be accepted with a POST.
- Hint 2: The endpoint never compares the invitation’s addressee with your account.
- Hint 3: Accept invitation #1 while signed in as a different user and you take their reviewer seat.

## Search

### SQL Injection in Paper Search (Beginner)
- **Objective:** Make the lab register a pass for "SQL Injection in Paper Search" by performing the exploit end-to-end against the live portal (GET /search?q=).
- Hint 1: Search glues your query into the same kind of string-built statement as the login.
- Hint 2: A tautology in the search box makes the WHERE clause true for every row.
- Hint 3: Search for ' OR '1'='1 and every paper in the portal comes back, including ones your term never matched.

### Reflected XSS in Search Results (Beginner)
- **Objective:** Make the lab register a pass for "Reflected XSS in Search Results" by performing the exploit end-to-end against the live portal (GET /search?q=).
- Hint 1: The results page politely repeats your search term back to you — unencoded.
- Hint 2: Whatever markup you search for lands in the page.
- Hint 3: Put a script payload in q and view the page: your payload is reflected raw.

## Admin Panel

### Admin Panel Open to Any Signed-In User (Beginner)
- **Objective:** Make the lab register a pass for "Admin Panel Open to Any Signed-In User" by performing the exploit end-to-end against the live portal (GET /admin).
- Hint 1: The admin console checks only that somebody is signed in — never who.
- Hint 2: Your ordinary author account is enough.
- Hint 3: Open /admin as a regular researcher and browse the user administration.

### CSRF on Admin Role Change (Intermediate)
- **Objective:** Make the lab register a pass for "CSRF on Admin Role Change" by performing the exploit end-to-end against the live portal (POST /admin/users/:id/role).
- Hint 1: Admin actions change user roles with a plain POST.
- Hint 2: Like the profile form, the marker is rendered but never verified.
- Hint 3: Submit the role change from a cross-site origin, or without the marker, and the role still changes.

## Platform & API

### Weak API Token — Base64 of the Account Email (Intermediate)
- **Objective:** Make the lab register a pass for "Weak API Token — Base64 of the Account Email" by performing the exploit end-to-end against the live portal (GET /api/papers (X-Api-Key header)).
- Hint 1: The JSON API wants an X-Api-Key header. Real keys are shown in profiles — but the API also accepts something far weaker.
- Hint 2: The legacy check accepts a trivial encoding of a public fact about the account.
- Hint 3: Send X-Api-Key as the base64 of any user’s email address and the API lets you in.

### Sensitive Data Exposure — /api/debug Dumps All Users and Passwords (Beginner)
- **Objective:** Make the lab register a pass for "Sensitive Data Exposure — /api/debug Dumps All Users and Passwords" by performing the exploit end-to-end against the live portal (GET /api/debug).
- Hint 1: A leftover debug endpoint ships with the portal.
- Hint 2: It requires no login at all.
- Hint 3: Fetch /api/debug and receive every account, including plaintext passwords.
