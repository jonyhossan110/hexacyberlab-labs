# HexaCampus — Practice Guide (LAB 55)

Work through the challenges feature by feature. Each challenge is scored automatically on the mission page (`/tests`) — a test flips to DONE only when the exploit genuinely succeeds server-side. Every challenge has 3 graded hints (also revealed one at a time on `/tests`), and the in-app Lab Coach gives step-by-step help for a feature once you have genuinely tried that feature at least 3 times.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Where:** `POST /login`
- **Objective:** Demonstrate the flaw for real so the "SQL Injection Login Bypass" test flips to DONE on /tests.
- **Hint 1:** The login form builds its query by gluing your input straight into the SQL string.
- **Hint 2:** Try an email that closes the quote and makes the WHERE clause always true.
- **Hint 3:** Email: ' OR '1'='1 — any password. You should land in the first account in the table.

### Brute Force — No Rate Limit or Lockout (Beginner)
- **Where:** `POST /login`
- **Objective:** Demonstrate the flaw for real so the "Brute Force — No Rate Limit or Lockout" test flips to DONE on /tests.
- **Hint 1:** How many wrong passwords can you try in a row for one account?
- **Hint 2:** Nothing slows you down — no counter, no CAPTCHA, no lockout.
- **Hint 3:** Submit 10+ wrong passwords for bob@student.hexacampus.edu and watch them all be processed.

### User Enumeration via Login & Password Reset (Beginner)
- **Where:** `POST /login · POST /forgot`
- **Objective:** Demonstrate the flaw for real so the "User Enumeration via Login & Password Reset" test flips to DONE on /tests.
- **Hint 1:** Compare the error for an email that exists with one that does not.
- **Hint 2:** The login and forgot-password pages answer differently — that difference is the leak.
- **Hint 3:** Try a real student email with a wrong password, then a made-up email. Repeat the comparison on /forgot.

### Default / Demo Credentials Still Active (Beginner)
- **Where:** `POST /login`
- **Objective:** Demonstrate the flaw for real so the "Default / Demo Credentials Still Active" test flips to DONE on /tests.
- **Hint 1:** Fresh installs ship with demo accounts — and this one was never cleaned up.
- **Hint 2:** The login page itself lists the demo accounts.
- **Hint 3:** Sign in as the seeded demo or admin account with its original password.

### Predictable Password-Reset Token (Intermediate)
- **Where:** `POST /reset`
- **Objective:** Demonstrate the flaw for real so the "Predictable Password-Reset Token" test flips to DONE on /tests.
- **Hint 1:** Request a reset for your own account and study the token format in the demo inbox note.
- **Hint 2:** The token is pure arithmetic on something you can see in profile URLs.
- **Hint 3:** Token = HXRESET-(userId × 137 + 42). Compute it for another user and reset their password without ever using /forgot for them.

### Role Cookie Tampering Opens Faculty Area (Intermediate)
- **Where:** `GET /faculty/grades`
- **Objective:** Demonstrate the flaw for real so the "Role Cookie Tampering Opens Faculty Area" test flips to DONE on /tests.
- **Hint 1:** After login, look at the cookies the portal sets — one of them carries your role.
- **Hint 2:** The faculty grade-entry page trusts that cookie instead of the server-side account.
- **Hint 3:** Set the hx_role cookie to faculty in your browser and open /faculty/grades as a student.

## Registration & Profile

### Weak Password Policy at Registration (Beginner)
- **Where:** `POST /register`
- **Objective:** Demonstrate the flaw for real so the "Weak Password Policy at Registration" test flips to DONE on /tests.
- **Hint 1:** How short a password will the sign-up form accept?
- **Hint 2:** There is effectively no minimum length or complexity rule.
- **Hint 3:** Register a new account with a 1-character password.

### Mass Assignment — Role & GPA at Registration (Intermediate)
- **Where:** `POST /register`
- **Objective:** Demonstrate the flaw for real so the "Mass Assignment — Role & GPA at Registration" test flips to DONE on /tests.
- **Hint 1:** The sign-up handler binds every submitted field onto the new account object.
- **Hint 2:** What fields does a user record have that the form never shows? Think role… and gpa.
- **Hint 3:** Submit the registration with extra fields role=admin and gpa=4.0 and check your new account.

### Stored XSS in Display Name (Intermediate)
- **Where:** `POST /register · POST /profile`
- **Objective:** Demonstrate the flaw for real so the "Stored XSS in Display Name" test flips to DONE on /tests.
- **Hint 1:** Your display name is printed on the dashboard and the faculty roster…
- **Hint 2:** …and it is printed without any output encoding.
- **Hint 3:** Put an HTML/JS payload in your name at registration or on /profile and view a page that renders it.

### CSRF on Profile Update (Intermediate)
- **Where:** `POST /profile`
- **Objective:** Demonstrate the flaw for real so the "CSRF on Profile Update" test flips to DONE on /tests.
- **Hint 1:** The profile form changes your email/name with a plain POST.
- **Hint 2:** The portal issues an hx_origin marker cookie on its own pages — the profile endpoint never checks it.
- **Hint 3:** Send the profile POST from a raw client (no hx_origin cookie, foreign Origin) and watch the change go through.

## Courses & Registration

### Enroll in a Full or Closed Course (Beginner)
- **Where:** `POST /courses/:id/enroll`
- **Objective:** Demonstrate the flaw for real so the "Enroll in a Full or Closed Course" test flips to DONE on /tests.
- **Hint 1:** CS201 already has 2 of 2 seats. CS301 is closed for registration.
- **Hint 2:** The enroll endpoint never checks capacity or course status.
- **Hint 3:** Just POST enroll for CS201 or CS301 and check /my-courses.

### Prerequisite Bypass on Enrollment (Beginner)
- **Where:** `POST /courses/:id/enroll`
- **Objective:** Demonstrate the flaw for real so the "Prerequisite Bypass on Enrollment" test flips to DONE on /tests.
- **Hint 1:** CS401 needs CS301 first. A brand-new account has passed nothing.
- **Hint 2:** The enroll endpoint never looks at what you have completed.
- **Hint 3:** Enroll a fresh account straight into CS401.

### Drop Another Student’s Enrollment (IDOR) (Intermediate)
- **Where:** `POST /enrollments/:id/drop`
- **Objective:** Demonstrate the flaw for real so the "Drop Another Student’s Enrollment (IDOR)" test flips to DONE on /tests.
- **Hint 1:** Your enrollment ids on /my-courses are small sequential numbers.
- **Hint 2:** The drop endpoint never asks whose enrollment it is.
- **Hint 3:** POST a drop for an enrollment id that belongs to someone else (try the ids around yours).

## Grades & Transcripts

### View Another Student’s Grades (IDOR) (Beginner)
- **Where:** `GET /students/:id/grades`
- **Objective:** Demonstrate the flaw for real so the "View Another Student’s Grades (IDOR)" test flips to DONE on /tests.
- **Hint 1:** Your own grades live at /students/<your id>/grades.
- **Hint 2:** Student ids are small and shown around the portal.
- **Hint 3:** Change the id to another student (try 4 or 5) and open the page.

### Download Another Student’s Transcript (IDOR) (Beginner)
- **Where:** `GET /transcripts/:studentId`
- **Objective:** Demonstrate the flaw for real so the "Download Another Student’s Transcript (IDOR)" test flips to DONE on /tests.
- **Hint 1:** Your transcript download is at /transcripts/<your id>.
- **Hint 2:** It includes grades, GPA — even a national id number.
- **Hint 3:** Swap the id for another student and download theirs.

### Faculty Roster Leaks All Students’ Emails & GPAs (Beginner)
- **Where:** `GET /faculty/roster`
- **Objective:** Demonstrate the flaw for real so the "Faculty Roster Leaks All Students’ Emails & GPAs" test flips to DONE on /tests.
- **Hint 1:** There is a roster page meant for lecturers at /faculty/roster.
- **Hint 2:** It checks that you are logged in — not what you are.
- **Hint 3:** Open it as a student.

### Student Changes a Grade via the Faculty Endpoint (Intermediate)
- **Where:** `POST /faculty/grades`
- **Objective:** Demonstrate the flaw for real so the "Student Changes a Grade via the Faculty Endpoint" test flips to DONE on /tests.
- **Hint 1:** The grade-entry form is only LINKED for faculty — but who checks the POST?
- **Hint 2:** The endpoint checks that you are logged in. Nothing more.
- **Hint 3:** As a student, POST studentId, courseId and grade straight to /faculty/grades.

## Tuition & Payments

### View Another Student’s Fee Statement (IDOR) (Beginner)
- **Where:** `GET /statements/:id`
- **Objective:** Demonstrate the flaw for real so the "View Another Student’s Fee Statement (IDOR)" test flips to DONE on /tests.
- **Hint 1:** Your statement link is on /billing — the ids are sequential (501, 502, 503…).
- **Hint 2:** The statement page never checks the statement’s owner.
- **Hint 3:** Open /statements/502 as a different student.

### Single-Use Merit Waiver Can Be Reused (Beginner)
- **Where:** `POST /waivers/apply`
- **Objective:** Demonstrate the flaw for real so the "Single-Use Merit Waiver Can Be Reused" test flips to DONE on /tests.
- **Hint 1:** The merit waiver code HEXAMERIT50 halves a statement — once, in theory.
- **Hint 2:** Nothing records that your statement already used it.
- **Hint 3:** Apply the same code to the same statement a second time.

### Statement Settled as Paid for $1 (Intermediate)
- **Where:** `POST /payments`
- **Objective:** Demonstrate the flaw for real so the "Statement Settled as Paid for $1" test flips to DONE on /tests.
- **Hint 1:** The payment form has a "pay in full" flag the server trusts blindly.
- **Hint 2:** The server never compares the amount sent with the amount owed.
- **Hint 3:** POST a $1 payment for your statement with settle=full.

## Documents & Uploads

### Unrestricted Upload — HTML Served from the Portal Origin (Intermediate)
- **Where:** `POST /upload · GET /uploads/:name`
- **Objective:** Demonstrate the flaw for real so the "Unrestricted Upload — HTML Served from the Portal Origin" test flips to DONE on /tests.
- **Hint 1:** The document upload accepts any file name and content.
- **Hint 2:** Uploaded files are served back — with a content type guessed from the extension.
- **Hint 3:** Upload an .html file containing a script and open its /uploads/ URL.

### Path Traversal in Document Download (Intermediate)
- **Where:** `GET /documents/download?name=`
- **Objective:** Demonstrate the flaw for real so the "Path Traversal in Document Download" test flips to DONE on /tests.
- **Hint 1:** Downloads take a name and join it onto the docs folder.
- **Hint 2:** The join honours ../ segments.
- **Hint 3:** Ask for name=../private/all-transcripts-backup.txt.

## Search

### Reflected XSS in Course Search (Beginner)
- **Where:** `GET /search?q=`
- **Objective:** Demonstrate the flaw for real so the "Reflected XSS in Course Search" test flips to DONE on /tests.
- **Hint 1:** The results page prints "Results for: …" with your query.
- **Hint 2:** It prints it raw.
- **Hint 3:** Put an HTML payload in q and view the page source.

### SQL Injection in Course Search Leaks Hidden Courses (Intermediate)
- **Where:** `GET /search?q=`
- **Objective:** Demonstrate the flaw for real so the "SQL Injection in Course Search Leaks Hidden Courses" test flips to DONE on /tests.
- **Hint 1:** Search builds its query the same sloppy way login does.
- **Hint 2:** A classic always-true condition changes what the query returns.
- **Hint 3:** Search for ' OR '1'='1 and look for a course that never appears in /courses.

## Admin Panel

### Admin Console Reachable by Any Student (Beginner)
- **Where:** `GET /admin`
- **Objective:** Demonstrate the flaw for real so the "Admin Console Reachable by Any Student" test flips to DONE on /tests.
- **Hint 1:** The console lives at the obvious address: /admin.
- **Hint 2:** It checks only that somebody is logged in.
- **Hint 3:** Open it as a student.

### CSRF on Admin Role Change (Advanced)
- **Where:** `POST /admin/adjust-role`
- **Objective:** Demonstrate the flaw for real so the "CSRF on Admin Role Change" test flips to DONE on /tests.
- **Hint 1:** The role-change POST trusts the session cookie alone.
- **Hint 2:** No anti-CSRF token, and the hx_origin marker is never verified here either.
- **Hint 3:** Submit the role change from a raw client without the hx_origin marker and see it applied.
