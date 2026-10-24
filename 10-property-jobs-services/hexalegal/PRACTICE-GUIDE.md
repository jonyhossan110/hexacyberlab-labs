# HexaLegal — Practice Guide (LAB 97)

Challenges grouped by feature, then difficulty. Each challenge is complete when its test flips to done on the Mission Board (/tests) — completion is detected from the real exploit effect, never self-declared.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** Get the "SQL Injection Login Bypass" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The login form builds its database query by gluing your input straight into the query string.
- **Hint 2:** What happens if your email contains a quote character followed by a logical operator?
- **Hint 3:** Try an email like ' OR '1'='1' -- with any password — the comment cuts the password check away.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Get the "Brute Force — No Rate Limiting or Lockout" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Keep guessing the same account's password. Does anything slow you down or lock the account?
- **Hint 2:** Count your failed attempts — ten, twenty… the form never complains.
- **Hint 3:** Submit 10 or more wrong passwords for one real account (e.g. ava@hexalegal.local) and notice every attempt is still processed.

### User Enumeration via Different Error Messages (Beginner)
- **Objective:** Get the "User Enumeration via Different Error Messages" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Compare the error for an email that exists with one that does not.
- **Hint 2:** The forgot-password form leaks the same difference.
- **Hint 3:** Probe at least 5 different emails across login / forgot-password and note which responses confirm an account exists.

### Published Demo Credentials (Beginner)
- **Objective:** Get the "Published Demo Credentials" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Read the login page carefully — everything on it.
- **Hint 2:** The page itself advertises a working account for "evaluators".
- **Hint 3:** Use the demo email and password printed on the login page to sign in.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Get the "Predictable Password-Reset Token" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Request a password reset and study the token format — then request another for a different account.
- **Hint 2:** The token is built from something public about the account, combined with simple arithmetic.
- **Hint 3:** Tokens look like HL<user id>-<user id times 149 plus 37>. Compute one for a user who never requested a reset and use it at /reset.

### Role Cookie Tampering (Client-Supplied Role) (Intermediate)
- **Objective:** Get the "Role Cookie Tampering (Client-Supplied Role)" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** After logging in, inspect the cookies the app sets — one of them describes who you are.
- **Hint 2:** The attorney console trusts that cookie instead of the server-side session.
- **Hint 3:** Set the hx_role cookie to "attorney" while logged in as a client and open /attorney.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- **Objective:** Get the "Weak Password Policy (1-Character Passwords)" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Register a new account and try the shortest password the form will accept.
- **Hint 2:** There is no minimum length, no complexity check, nothing.
- **Hint 3:** Register with a 1-character password — the account is created.

### Stored XSS in Display Name (Beginner)
- **Objective:** Get the "Stored XSS in Display Name" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Your display name is shown back on pages other people read — including the admin user list.
- **Hint 2:** The name is stored and printed without escaping.
- **Hint 3:** Register with a display name containing an HTML/JS payload such as <script>alert(1)</script> and view it in /admin.

### Mass Assignment — Self-Assign Attorney/Admin Role (Intermediate)
- **Objective:** Get the "Mass Assignment — Self-Assign Attorney/Admin Role" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The registration handler copies more of your submitted form than it should.
- **Hint 2:** The form shows name, email, password — but the server accepts extra fields too.
- **Hint 3:** Add a field named "role" with value "attorney" (or "admin") to the registration request and check your new account's role.

### CSRF on Profile Update (Intermediate)
- **Objective:** Get the "CSRF on Profile Update" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The app sets a benign hx_origin marker on its own pages — check whether the profile endpoint actually verifies it.
- **Hint 2:** A state-changing POST that arrives without the marker should be rejected. It is not.
- **Hint 3:** While logged in, POST /profile with a new name but WITHOUT the hx_origin field — the change is applied anyway.

## Search & Discovery

### Reflected XSS in Search Results (Beginner)
- **Objective:** Get the "Reflected XSS in Search Results" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The results page repeats your search term back to you in the heading.
- **Hint 2:** It prints the term exactly as typed, with no escaping.
- **Hint 3:** Search for a script payload and view the page source — your payload is there verbatim.

### SQL Injection in Case Search Leaks Draft Matters (Intermediate)
- **Objective:** Get the "SQL Injection in Case Search Leaks Draft Matters" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The search box queries cases with the same string-building habit as the login form.
- **Hint 2:** Draft matters are excluded from normal lists — but are they excluded from the query itself?
- **Hint 3:** Search for ' OR '1'='1 and look for a matter that never appears in the case list (a DRAFT).

## Cases & Matters

### Case IDOR — Read Another Client's Matter (Beginner)
- **Objective:** Get the "Case IDOR — Read Another Client's Matter" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Case URLs contain a simple sequential id.
- **Hint 2:** Log in as one client and change the id in the URL.
- **Hint 3:** Open /cases/3 while logged in as Client One — the matter belongs to Client Two, yet it opens.

### Attorney Notes Leak to Non-Assigned Users (Intermediate)
- **Objective:** Get the "Attorney Notes Leak to Non-Assigned Users" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Each case has an internal notes page meant only for the assigned attorney.
- **Hint 2:** The notes URL follows the case URL — try it as a different user.
- **Hint 3:** Open /cases/1/notes as Client Two (or any non-assigned account) and read the confidential strategy notes.

### Edit Another Client's Case (Write IDOR) (Intermediate)
- **Objective:** Get the "Edit Another Client's Case (Write IDOR)" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Reading a case is not the only thing missing an ownership check — look for the edit form endpoint.
- **Hint 2:** The edit POST trusts whichever case id it is given.
- **Hint 3:** As Client One, POST /cases/3/edit with a new title and watch Client Two's matter change.

## Documents & Files

### Document IDOR — Download Another Client's File (Beginner)
- **Objective:** Get the "Document IDOR — Download Another Client's File" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Documents also live behind simple sequential ids.
- **Hint 2:** Your own case has documents 1 and 2 — what is document 3?
- **Hint 3:** Open /documents/3 as Client One: it is the confidential work product of Client Two's case.

### Path Traversal in File Download (Intermediate)
- **Objective:** Get the "Path Traversal in File Download" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The /download endpoint takes a file name and joins it to the documents folder.
- **Hint 2:** Nothing stops you from walking up the directory tree.
- **Hint 3:** Request /download?file=../server.js and read the application's own source code.

### Unrestricted File Upload — Stored HTML Served (Intermediate)
- **Objective:** Get the "Unrestricted File Upload — Stored HTML Served" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The case upload form accepts a file name and content — try a name ending in .html.
- **Hint 2:** Uploaded files are served back from the app's own domain with a type guessed from the extension.
- **Hint 3:** Upload "evil.html" containing a script payload to any case, then open /uploads/evil.html.

## Appointments

### Appointment IDOR — View Another Client's Booking (Beginner)
- **Objective:** Get the "Appointment IDOR — View Another Client's Booking" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Appointment pages use the same sequential id pattern.
- **Hint 2:** Your appointments are listed for you — the detail page is the interesting part.
- **Hint 3:** Open /appointments/2 as Client One: it is Client Two's consultation, with time and topic.

### Double-Booking the Same Attorney Slot (Intermediate)
- **Objective:** Get the "Double-Booking the Same Attorney Slot" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Booking checks that the case and attorney exist — does it check the attorney's calendar?
- **Hint 2:** Attorney Ava already has a booking at 2026-11-03 14:00 (appointment 2).
- **Hint 3:** Book another appointment with Ava at exactly 2026-11-03 14:00 — it is accepted too.

## Billing & Invoices

### Invoice IDOR — View Another Client's Bill (Beginner)
- **Objective:** Get the "Invoice IDOR — View Another Client's Bill" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Invoices follow the same id pattern as everything else here.
- **Hint 2:** Invoice 2 belongs to Client Two.
- **Hint 3:** Open /invoices/2 as Client One and read another client's legal bill.

### Payment Amount Tampering — Settle a Bill for $1 (Intermediate)
- **Objective:** Get the "Payment Amount Tampering — Settle a Bill for $1" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The pay form posts an amount — the server never compares it to the invoice total.
- **Hint 2:** Invoice 1 is $450. What if you pay… less?
- **Hint 3:** POST /invoices/1/pay with amount=1: the $450 invoice is marked PAID.

## Admin Panel

### Admin Console Open to Any Logged-In User (Beginner)
- **Objective:** Get the "Admin Console Open to Any Logged-In User" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The admin panel is just a URL: /admin.
- **Hint 2:** It checks that you are logged in — nothing more.
- **Hint 3:** Log in as any client and open /admin: the full user list, passwords included, is served.

### CSRF on Admin User Deactivation (Intermediate)
- **Objective:** Get the "CSRF on Admin User Deactivation" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Admin actions are state-changing POSTs — do they verify the hx_origin marker either?
- **Hint 2:** They do not. The same missing check as the profile form, with higher stakes.
- **Hint 3:** As admin, POST /admin/users/6/deactivate WITHOUT the hx_origin field — the user is deactivated.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Accounts (Beginner)
- **Objective:** Get the "Unauthenticated Debug Endpoint Dumps All Accounts" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** Developers love leaving themselves a back door for debugging…
- **Hint 2:** Try the obvious path: /api/debug.
- **Hint 3:** Open /api/debug with no login at all — every user, passwords included, comes back as JSON.

### Weak API Token — Base64 of Email (Intermediate)
- **Objective:** Get the "Weak API Token — Base64 of Email" test to flip to done on /tests by performing the exploit against the running lab.
- **Hint 1:** The JSON API authenticates with a token header instead of a session.
- **Hint 2:** The token looks suspiciously readable — try decoding one.
- **Hint 3:** The token for any user is just base64(their email). Call /api/cases with header X-Api-Token set to base64 of client.two@example.local — no session needed.
