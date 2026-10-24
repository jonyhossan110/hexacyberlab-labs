# HexaJobs (LAB 93) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board at /tests. Attempts on a feature unlock the Lab Coach's step-by-step help after 3 tries.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /login (email field).
- Hint 1: The login form builds its database query by gluing your input straight into the SQL string.
- Hint 2: A quote character in the email can break out of the string. What happens if the rest of the query is commented away?
- Hint 3: Try the email: ' OR '1'='1' --  with any password. The comment swallows the password check.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /login.
- Hint 1: Keep guessing the same account's password. Does anything slow you down or lock the account?
- Hint 2: Ten wrong guesses in a row are all accepted for processing. There is no counter at all.
- Hint 3: Script 10+ failed logins for alice@test.local — the 10th failure is still processed like the first.

### User Enumeration via Login & Password-Reset Responses (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /forgot and POST /login error messages.
- Hint 1: Compare the response for an email that exists with one that does not.
- Hint 2: The forgot-password page happily confirms whether an account exists. Probe several different emails.
- Hint 3: Submit 5 different emails to /forgot — real accounts get "reset link sent", unknown ones get "no such account".

### Demo Credentials Published on the Login Page (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at Login page demo box.
- Hint 1: Read the login page carefully — the site tells you a working username and password.
- Hint 2: Demo accounts shipped to production are real accounts with real access.
- Hint 3: Log in with the demo credentials printed on the login page (demo@hexajobs.local).

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET/POST /reset?token=.
- Hint 1: Request a reset for a demo account and look at the token format. Does it look random?
- Hint 2: The token seems to be built from the user's numeric id with simple arithmetic.
- Hint 3: Tokens look like HJ<id>-<id*137+42>. Compute one for another user id and use it without ever requesting a reset.

### Role Taken from a Client Cookie (Cookie Tampering) (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at hx_role cookie, checked on /admin.
- Hint 1: After logging in, inspect the cookies the app sets. One of them describes your role.
- Hint 2: Cookies live on the client — you can edit them. The admin gate believes the cookie instead of the server-side account.
- Hint 3: Log in as a normal seeker, change the hx_role cookie value to admin, then open /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /register.
- Hint 1: Register a new account and try the shortest password the form will accept.
- Hint 2: There is no length or complexity check at all.
- Hint 3: Register with the password "a" — the account is created happily.

### Stored XSS in Display Name (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at Display name, rendered on employer applicant lists & profile pages.
- Hint 1: Your display name is printed back on several pages. Is it encoded anywhere?
- Hint 2: Names reach employer dashboards unescaped — a payload in your name fires in their browser.
- Hint 3: Set your name to <script>alert(1)</script> and view a page that renders it (e.g. an applicant list or your profile).

### Mass Assignment — Role & Plan Set at Registration (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /register (extra form fields).
- Hint 1: The registration form shows email, name and password. The server may accept more fields than the form shows.
- Hint 2: What fields does a user object have? role and plan are tempting targets.
- Hint 3: Add role=admin (or role=employer and plan=premium) to the registration POST and check your new account.

### Cross-Site Request Forgery on Profile Update (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /profile.
- Hint 1: State-changing forms should carry an anti-CSRF token tied to your session. Check the profile request.
- Hint 2: The app sets a casual marker cookie but the profile endpoint never verifies the form marker.
- Hint 3: POST to /profile as a logged-in user WITHOUT the hx_origin form field — the change still goes through.

## Job Search

### Reflected XSS in Search Results (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /jobs?q= (term echoed in the heading).
- Hint 1: The results page repeats your search term back to you. In what form?
- Hint 2: The term is echoed into the HTML without encoding.
- Hint 3: Search for <script>alert(1)</script> and view the page source — the payload sits raw in the heading.

### SQL Injection in Job Search Leaks Draft Jobs (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /jobs?q=.
- Hint 1: Search filters jobs with another string-built query. Draft jobs are supposed to stay hidden.
- Hint 2: The status filter is part of the same query your input lands in.
- Hint 3: Search for: ' OR '1'='1' --  and the unpublished DRAFT job appears in the results.

## Job Listings

### Unpublished Draft Job Readable by Direct URL (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /job/:id.
- Hint 1: Published jobs have sequential ids. What about the numbers in between?
- Hint 2: The detail page never checks whether the job is published — or whether you own it.
- Hint 3: Open /job/3 — a DRAFT job that appears in no listing — as a seeker.

### Edit Another Employer's Job Posting (IDOR) (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /employer/job/:id/edit.
- Hint 1: The employer edit endpoint checks that you are AN employer — but not that the job is YOURS.
- Hint 2: Sequential job ids + a missing ownership check = every listing is editable by every employer.
- Hint 3: Log in as the FoodHub employer and edit TechCorp's job (id 1) — the change is saved.

## Applications

### Read Another Candidate's Application (IDOR) (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /application/:id.
- Hint 1: Application pages have sequential ids and hold cover letters and personal details.
- Hint 2: The page checks that you are logged in — never that the application is yours.
- Hint 3: Log in as Bob and open Alice's application at /application/1 — her cover letter renders in full.

### Candidate Sets Own Application Status to "Hired" (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /application/:id/status.
- Hint 1: Application status should move only by the employer. The status endpoint never asks who you are.
- Hint 2: A seeker session can call the employer's workflow endpoint directly.
- Hint 3: As Alice, POST status=hired to your own application (/application/1/status) — the portal accepts your self-promotion.

### Change Another Candidate's Application Status (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /application/:id/status.
- Hint 1: The same status endpoint also ignores WHICH application you touch.
- Hint 2: A third party — neither applicant nor employer — can move someone else's application.
- Hint 3: As Bob, POST status=rejected to Alice's application (/application/1/status) and watch her pipeline change.

### Apply on Behalf of Another User (seekerId Parameter) (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /job/:id/apply.
- Hint 1: The apply request carries more than a cover letter — the server trusts a client-supplied applicant id.
- Hint 2: Your identity should come from your session, never from a form field.
- Hint 3: Apply to a job while adding seekerId=<another user's id> — the application is filed under their name.

## CVs & Files

### Download Another Candidate's CV (IDOR) (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /cv/file/:id.
- Hint 1: CV links are sequential and the viewer is never checked against the owner.
- Hint 2: Anyone logged in can read every CV on the platform, one id at a time.
- Hint 3: Log in as Bob and open Alice's CV at /cv/file/1 — full text, no questions asked.

### Unrestricted CV Upload — HTML File Stored & Served (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /cv/upload, served at GET /cv/file/:id.
- Hint 1: The CV upload accepts any filename and any content. What does the server do with an .html "CV"?
- Hint 2: Uploaded files are served back from the app's own domain with a browser-friendly content type.
- Hint 3: Upload a file named cv.html containing <script>alert(1)</script>, then open its /cv/file/ link.

### Path Traversal on CV Download (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /cv/download?file=.
- Hint 1: The download endpoint joins your file parameter onto the uploads folder. What escapes a folder?
- Hint 2: Dot-dot sequences are never normalised away.
- Hint 3: Request /cv/download?file=../server.js and the application serves its own source code.

## Employer Plans & Billing

### Read Another Employer's Invoice (IDOR) (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /employer/invoice/:id.
- Hint 1: Invoices have sequential ids and contain billing details.
- Hint 2: The invoice page checks your role, not your ownership of the invoice.
- Hint 3: Log in as FoodHub and open TechCorp's invoice at /employer/invoice/1.

### Plan Upgrade Price Tampering (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /employer/plan/upgrade.
- Hint 1: The upgrade form posts the plan AND its price. The server believes the posted price.
- Hint 2: Prices must be looked up server-side. Here the client names its own.
- Hint 3: Upgrade to premium with price=0 — the premium plan activates and the invoice says $0.

## Admin Panel

### Admin User List Open to Any Logged-in User (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /admin/users.
- Hint 1: Some admin pages check your role. This one only checks that you have a session.
- Hint 2: A plain seeker session is enough for the full user table — passwords included.
- Hint 3: Log in as any seeker and open /admin/users.

### CSRF on Admin User Deletion (Intermediate)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at POST /admin/user/:id/delete.
- Hint 1: Destructive admin actions need the same anti-CSRF protection as everything else.
- Hint 2: The delete endpoint performs the action without verifying the session marker.
- Hint 3: As an admin, POST to /admin/user/3/delete WITHOUT the hx_origin field — the user is deleted.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Data (Beginner)
- **Objective:** Make the Mission Board flip this test to done by producing the real exploit effect at GET /api/debug.
- Hint 1: Developers leave helpers behind. This one needs no login at all.
- Hint 2: The endpoint serialises the whole database — users, passwords, applications — as JSON.
- Hint 3: Open /api/debug in a fresh browser with no session and read everything.
