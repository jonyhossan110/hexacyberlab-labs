# HexaHire (LAB 94) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge flips on the Mission Board only when the real exploit succeeds server-side.

## Login & Authentication

### Brute Force - No Rate Limiting or Lockout (Beginner)
- **Objective:** POST /login 10+ times with wrong passwords for one real account; every attempt is still processed.
- **Hints:**
  1. Keep guessing the same account's password. Does anything ever slow you down or lock the account?
  2. Script 10+ wrong passwords for one account and watch the responses.
  3. The 10th wrong attempt is processed exactly like the 1st — there is no throttle at all.

### User Enumeration via Login & Forgot-Password Responses (Beginner)
- **Objective:** Probe >=5 distinct emails via /login and /forgot; responses reveal which emails are registered.
- **Hints:**
  1. Compare the error message for an email that exists with one that does not.
  2. The forgot-password page answers differently too.
  3. Probe at least 5 different emails across /login and /forgot and diff the responses.

### Published Demo Credentials (Beginner)
- **Objective:** Use the demo credentials printed on the login page to sign in.
- **Hints:**
  1. Read the login page carefully — marketing put something helpful there.
  2. A demo workspace is advertised right on the page.
  3. Log in with the demo email and password printed on /login.

### SQL Injection Login Bypass (Intermediate)
- **Objective:** POST /login with email `' OR '1'='1' -- ` and any password; a session is created without knowing any real password.
- **Hints:**
  1. The login builds its query by gluing your input straight into a string.
  2. Try closing the email string early and adding a condition that is always true.
  3. Email: ' OR '1'='1' --  (with any password) comments out the password check.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Compute HH<id>-<id*149+37> for a user who never requested a reset and POST /reset with it, then log in with the new password.
- **Hints:**
  1. Reset tokens here are not random — they are computed from something you can see.
  2. Look at a user id (the team page and API make ids easy to find).
  3. Token format: HH<id>-<id*149+37>. Compute it for a user who never requested a reset and POST /reset.

### Session/Role Cookie Tampering (Intermediate)
- **Objective:** As a non-admin, set cookie hx_role=admin and GET /admin.
- **Hints:**
  1. The app stores your role in a cookie — and some pages believe the cookie instead of the server-side session.
  2. Log in as a non-admin, then look at your cookies.
  3. Set the hx_role cookie to admin and open /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- **Objective:** POST /register with a 1-character password; the account is created.
- **Hints:**
  1. Try registering with the shortest password the form will accept.
  2. There is no minimum length at all.
  3. Register a new account with a 1-character password.

### Stored XSS in Display Name (Beginner)
- **Objective:** Register (or rename) with a display name containing a script payload; it is stored and rendered raw on /team.
- **Hints:**
  1. Your display name is shown to the whole team — and rendered as raw HTML.
  2. Register with a name that is also a small script payload.
  3. Name: <script>alert(1)</script> — then open /team as anyone.

### Mass Assignment - Self-Assign Admin Role at Registration (Intermediate)
- **Objective:** POST /register including role=admin; the new account really holds the admin role.
- **Hints:**
  1. The registration handler copies fields from your request into the new user record.
  2. The visible form only shows name/email/password — the handler accepts more.
  3. Add role=admin to the registration POST and check your profile afterwards.

### CSRF on Profile Update (Intermediate)
- **Objective:** POST /profile (name change) with a valid session but no hx_origin cookie/field; the change is accepted.
- **Hints:**
  1. The app plants a marker (hx_origin) on its own forms and pages. Real requests from the site carry it.
  2. A state-changing POST without that marker should be rejected — is it?
  3. POST /profile with your session cookie but no hx_origin marker anywhere and change the display name.

## Candidates

### Candidate IDOR - Read Another Company's Candidate (Beginner)
- **Objective:** As a company-1 user, GET /candidates/2001 (a company-2 candidate) and read the full profile.
- **Hints:**
  1. Candidate ids are sequential and the page only checks that you are logged in — not which company the candidate belongs to.
  2. Your company has candidates 1001-1003. Another company's start at 2001.
  3. Open /candidates/2001 while logged in as a NovaTech user.

### Candidate CV Download IDOR (Beginner)
- **Objective:** As a company-1 user, download document 3003 belonging to a company-2 candidate.
- **Hints:**
  1. Document downloads are nested under candidates, but the check is missing there too.
  2. Dave's CV is document 3003 under candidate 2001.
  3. GET /candidates/2001/documents/3003 as a NovaTech user.

### Pipeline Stage Skipping (Applied Straight to Hired) (Intermediate)
- **Objective:** POST /candidates/1002/stage with stage=Hired while the candidate is still at Applied.
- **Hints:**
  1. The stage-change endpoint accepts any stage name you send.
  2. There is no check that interviews or scorecards ever happened.
  3. POST stage=Hired for an Applied candidate (e.g. 1002).

## Search & Jobs

### Reflected XSS in Search (Beginner)
- **Objective:** GET /search?q=<script>alert(1)</script> reflects the payload unescaped in the response.
- **Hints:**
  1. The results page repeats your search text back to you.
  2. It does not encode it first.
  3. Search for <script>alert(1)</script> and view the page source.

### SQL Injection in Candidate Search (Intermediate)
- **Objective:** GET /search?q=' OR '1'='1' --  returns confidential and other-company candidates.
- **Hints:**
  1. Search builds one big string query: name pattern, confidential flag and your company id all glued together.
  2. A comment sequence can cut off the filters glued after your input.
  3. Search for: ' OR '1'='1' --  and see who shows up.

### Edit Another Company's Job Posting (Intermediate)
- **Objective:** As a company-1 user, POST /jobs/201/edit changing a company-2 job; the change is applied.
- **Hints:**
  1. The job edit endpoint trusts the job id in the URL.
  2. BrightLabs' Data Analyst job is id 201.
  3. POST /jobs/201/edit as a NovaTech user and change its title or salary band.

## Interviews & Scorecards

### Interview & Scorecard IDOR (Beginner)
- **Objective:** As a company-1 user, GET /interviews/502 and read another company's scorecard.
- **Hints:**
  1. Interview pages follow the same id pattern — and the same missing tenant check.
  2. Interview 502 belongs to BrightLabs' candidate Dave.
  3. Open /interviews/502 as a NovaTech user and read the scorecard.

### Scorecard Tampering - Score an Interview You Did Not Conduct (Intermediate)
- **Objective:** POST /interviews/503/scorecard as a user who is not the assigned interviewer; the scorecard is stored.
- **Hints:**
  1. The scorecard endpoint never asks whether YOU were the assigned interviewer.
  2. Interview 503 is assigned to Henry. You are not Henry.
  3. POST a scorecard for interview 503 as Rita and watch it save.

## Offers

### Offer Letter IDOR (Beginner)
- **Objective:** As a company-1 user, GET /offers/701 and read another company's offer salary.
- **Hints:**
  1. Offer letters live at predictable ids too.
  2. Offer 701 belongs to BrightLabs' candidate Dave.
  3. Open /offers/701 as a NovaTech user and read the salary.

### Offer Salary / Status Tampering (Intermediate)
- **Objective:** POST /offers/702/update changing the salary, or setting status=Accepted; the change is stored.
- **Hints:**
  1. The offer update endpoint accepts salary and status straight from the request.
  2. Accepting an offer is supposed to be the candidate's move.
  3. POST /offers/702/update with a new salary or status=Accepted.

## Documents & Files

### Unrestricted File Upload - HTML Served from the App (Intermediate)
- **Objective:** Upload an .html file containing a script payload, then GET it from /uploads/ and receive it as text/html.
- **Hints:**
  1. Uploads accept any filename and content, and serve them back from the app's own origin.
  2. An .html file is served as text/html — the browser will run its script.
  3. Upload evil.html with a script payload, then open /uploads/evil.html.

### Path Traversal on File Download (Intermediate)
- **Objective:** GET /download?file=../server.js returns the server source.
- **Hints:**
  1. The download endpoint joins your file parameter onto the files folder without checking where it lands.
  2. Dot-dot segments are not stripped.
  3. GET /download?file=../server.js and read the application source.

## Admin Panel

### Admin User Data Served to Any Logged-In User (Beginner)
- **Objective:** As a non-admin user, GET /admin/users.json and receive all users including passwords.
- **Hints:**
  1. One admin endpoint only checks that *someone* is logged in.
  2. It returns the user table as JSON — passwords included.
  3. GET /admin/users.json as a plain recruiter.

### CSRF on Admin User Deactivation (Intermediate)
- **Objective:** As an admin, POST /admin/deactivate without the hx_origin marker; the user is deactivated.
- **Hints:**
  1. Admin actions use the same marker scheme as the profile form — and it is not verified here either.
  2. You need admin access (your own admin account, or the role cookie).
  3. POST /admin/deactivate for a user id with no hx_origin marker anywhere.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Users (Beginner)
- **Objective:** GET /api/debug with no session returns all users including passwords.
- **Hints:**
  1. Developers left something behind for debugging.
  2. It needs no login at all.
  3. Open /api/debug in a private window (or curl it with no cookies).

### Weak API Token - Base64 of the User's Email (Intermediate)
- **Objective:** GET /api/candidates with header X-Api-Key = base64(email) and no session cookie; candidate data is returned.
- **Hints:**
  1. The API accepts an X-Api-Key header instead of a session.
  2. The "key" is derived from something public about the user.
  3. Send X-Api-Key with the base64 encoding of a user's email — no cookies.
