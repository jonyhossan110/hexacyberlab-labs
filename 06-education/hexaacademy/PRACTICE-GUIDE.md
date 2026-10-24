# HexaAcademy — Practice Guide (LAB 52)

26 hands-on challenges, grouped by feature and ordered by difficulty inside each feature. Every challenge is measured by the server detecting the real exploit — there is no "mark done" button. Stuck? Reveal the graded hints one at a time (they are also on the /tests page), or try the feature at least 3 times and ask the Lab Coach for step-by-step help.

## Login & Authentication

### Predictable Password-Reset Token (Intermediate · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone's password.
- **Hints:**
  1. Request a reset for your own account and study the token format — it is computed, not random.
  2. The token is a simple arithmetic function of the user's numeric ID.
  3. Token = ACA-(userId × 167 + 41). Dr. Maya Chen is user 2 — compute her token and reset her password without ever requesting a reset for her.
- **Walkthrough:** Step by step: 1) Request a reset for your own account and note the token shape ACA-<number>. 2) Reverse the formula: number = userId × 167 + 41. 3) POST /reset for prof@hexaacademy.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.

### Session Cookie Role Tampering (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.
- **Hints:**
  1. Your session cookie is just base64 JSON — decode it and read what it claims about you.
  2. The admin panel trusts the role written inside the cookie instead of the role stored on your account.
  3. Decode hx_sess, change "role" to "admin", re-encode, and open /admin as an ordinary student.
- **Walkthrough:** Step by step: 1) Log in as any student and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a student account. The test completes.

### SQL Injection Login Bypass (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.
- **Hints:**
  1. The academy login still routes through a legacy sign-on service that builds its query by gluing your email into a string.
  2. A tautology in the email field makes the WHERE clause true for the very first row in the user table — who sits in row 1 of an academy's user table?
  3. Log in with the email: ' OR '1'='1' --  and any password.
- **Walkthrough:** Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created.

### Brute Force — No Lockout or Throttle (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Without rate limiting or lockout, online password guessing is only a matter of time — students reuse passwords, so credential lists work well here.
- **Hints:**
  1. Pick one student account and keep guessing its password. Does anything slow down, CAPTCHA, or lock after repeated failures?
  2. A learning platform should lock or throttle after a handful of failures. Count how many this one accepts.
  3. Submit 10 wrong-password logins for alice@hexaacademy.local — the 10th is still processed normally.
- **Walkthrough:** Step by step: 1) Choose alice@hexaacademy.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.

### Account Enumeration via Password Reset (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Different responses for existing vs non-existing accounts hand attackers a verified list of registered students and instructors to aim phishing and password attacks at.
- **Hints:**
  1. Use "Forgot password" twice: once with an email that has an account, once with one that does not. Compare the two answers word for word.
  2. A safe reset flow answers identically either way. This one does not.
  3. Request a reset for alice@hexaacademy.local, then for nobody@nowhere.local — the different messages confirm which emails are registered.
- **Walkthrough:** Step by step: 1) POST /forgot with alice@hexaacademy.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.

### Default Admin Credentials (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.
- **Hints:**
  1. Somewhere in this academy there is an administrative account that was never given a real password.
  2. Try the most common admin password in the world against the admin mailbox.
  3. Log in as admin@hexaacademy.local with the password admin123.
- **Walkthrough:** Step by step: 1) Go to the login page. 2) Sign in as admin@hexaacademy.local / admin123. 3) You are in as Platform Admin. The test completes on that login.

## Registration & Profile

### Mass Assignment — Self-Appointed Instructor or Admin (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Binding request bodies directly to data models lets attackers set privileged fields (here the account role) that the UI never offered.
- **Hints:**
  1. The registration handler copies every submitted field onto the new account record — including fields the form never shows.
  2. What field on an account record decides what the user is allowed to do? Think role.
  3. Register while adding the extra form field role=instructor (or role=admin) — the new account is created with it.
- **Walkthrough:** Step by step: 1) Submit the registration form with the extra field role=instructor added to the POST body. 2) Log in with the new account. 3) It carries the instructor role you assigned yourself. The test completes.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.
- **Hints:**
  1. The profile form carries a hidden _origin marker that ties the submit to this site. What happens if a POST arrives without it?
  2. Nothing checks the marker on the server.
  3. POST /profile with a new name and NO _origin field — the change is applied anyway.
- **Walkthrough:** Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.

### Weak Password Policy at Registration (Beginner · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.
- **Hints:**
  1. Open a new academy account and try the shortest, simplest password the form will accept.
  2. A platform holding payment data should demand length and complexity. This one demands almost nothing.
  3. Register with the password "abc" — it is accepted.
- **Walkthrough:** Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.

### Stored XSS in Display Name (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.
- **Hints:**
  1. Your display name is printed back on pages other people see — including instructors and admins. Is it escaped anywhere?
  2. Set your name to something that is not just text.
  3. Save your profile with the display name <script>alert(1)</script> — it is stored and reflected raw.
- **Walkthrough:** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.

## Course Catalogue & Search

### SQL Injection in Course Search Reveals Draft Courses (Intermediate · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — Search filters built by string concatenation are injectable like any other query; here the injection bypasses the published-only filter and leaks unreleased content.
- **Hints:**
  1. The course search still builds its filter by gluing your query into a string — and the catalogue table holds more than published courses.
  2. An injection in the search makes the filter true for every row, including the ones students must never see.
  3. Search for: ' OR '1'='1 — the unpublished draft course appears in the results.
- **Walkthrough:** Step by step: 1) Open /search. 2) Search for ' OR '1'='1. 3) The results include the unpublished draft course 'Secret Launch: AI Pentesting'. 4) The test completes when a draft course is served by the injected search.

### Reflected XSS in Course Search (Beginner · A03 Injection)
- **Objective:** make the server register this exploit by its real effect — Reflected input must be output-encoded; search boxes are a reliable way to fire script inside another user's session when the link is shared.
- **Hints:**
  1. The search page echoes your query into the results heading: "Results for …".
  2. Echoed input that is not encoded is reflected XSS.
  3. Search for <script>alert(1)</script> — the payload comes back raw in the page.
- **Walkthrough:** Step by step: 1) Open /search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.

## Enrollments & Payments

### Coupon Stacking Beyond the Intended Discount (Intermediate · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Discount rules are business logic and must be enforced server-side; if the client can present two coupons and the server applies both, the intended maximum discount is fiction.
- **Hints:**
  1. The checkout accepts TWO coupon fields. The marketing team intended one coupon per order.
  2. What happens when a 50% coupon and a 20% coupon are applied to the same enrolment, one after the other?
  3. Check out with coupon1=WELCOME50 and coupon2=STUDENT20 — both discounts apply.
- **Walkthrough:** Step by step: 1) Check out a course. 2) Submit coupon1=WELCOME50 and coupon2=STUDENT20 together. 3) Both discounts are applied to the enrolment amount. The test completes when two coupons land on one order.

### Single-Use Coupon Reused (Intermediate · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Single-use promotions need an atomic server-side check at redemption time; recording usage without enforcing it is bookkeeping, not control.
- **Hints:**
  1. The VIP100 launch coupon was meant to be used exactly once — ever. The system notes who used it…
  2. …but on the second presentation, does anything actually stop it?
  3. Use VIP100 on one enrolment. Then use it again on another — it works again.
- **Walkthrough:** Step by step: 1) Check out any course with coupon1=VIP100 — it applies (first, legitimate use). 2) Check out another course with coupon1=VIP100 again. 3) It applies a second time. The test completes on the second redemption.

### Bundle Total Tampering (Intermediate · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Any total computed client-side — bundle sums, shipping, taxes — must be recomputed server-side; otherwise the checkout is an honour system.
- **Hints:**
  1. The bundle checkout sends a "total" field computed in the browser from the bundle's parts.
  2. The server charges the total it is given instead of summing the catalogue itself.
  3. Buy the $349 bundle while posting total=10 — the whole bundle is yours for ten dollars.
- **Walkthrough:** Step by step: 1) Open a bundle page. 2) POST /checkout with type=bundle, the bundle id, and total=10. 3) Enrolments for every course in the bundle are created at the tampered total. The test completes.

### Refund Kept After Certificate Issued (Advanced · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Refund logic must check the fulfilment state (certificate issued, course consumed) before returning money; otherwise buyers keep the credential and the cash.
- **Hints:**
  1. Policy says: no refunds once a certificate has been issued for a course. Policies printed in text are not controls.
  2. The refund endpoint never asks whether a certificate exists for the enrolment.
  3. Get a certificate issued for an enrolment (see the Learning & Certificates feature), then POST a refund for that same enrolment — the money comes back AND the certificate stays.
- **Walkthrough:** Step by step: 1) Have a certificate issued for one of your enrolments. 2) POST /enrollments/<id>/refund for that enrolment. 3) The refund is recorded while the certificate remains issued. The test completes.

### Checkout Price Tampering (Beginner · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Prices must always be recomputed server-side from the catalogue; a price that travels through the client is a price the client chooses.
- **Hints:**
  1. The checkout form carries the course price in a hidden field — and the server believes whatever comes back.
  2. Hidden fields are visible, editable text to anyone with dev tools or curl.
  3. Enroll in the $199 course while posting price=1 — you are enrolled for one dollar.
- **Walkthrough:** Step by step: 1) Log in as a student and open a paid course. 2) POST /checkout with type=course, the course id, and price=1 instead of the catalogue price. 3) The enrolment is created and $1 is recorded as paid. The test completes.

## Learning & Certificates

### Progress Tampering — Completion Without Watching (Intermediate · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Learning progress must be derived from server-tracked events (lessons actually served and completed); a client-supplied counter is fiction waiting to be typed.
- **Hints:**
  1. The progress form posts a "lessons completed" number. The server stores whatever number arrives.
  2. Watching lessons is one path to progress. Posting the number directly is another.
  3. POST /enrollments/<your id>/progress with lessons set to the course's full lesson count — progress jumps to 100% with zero lessons watched.
- **Walkthrough:** Step by step: 1) Pick one of your enrolments with 0 lessons watched. 2) POST /enrollments/<id>/progress with lessons equal to the course's lesson count. 3) Progress shows 100%. The test completes when full progress is recorded with no lessons watched.

### Certificate Issued Without Completing the Course (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Credential issuance must verify the earning condition (here: genuine 100% progress) at issue time; the existence of a related record is not proof of achievement.
- **Hints:**
  1. Course certificates live at /certificates/<enrolmentId>. The issuer is supposed to check the course was completed.
  2. It checks that an enrolment exists — and stops checking there.
  3. Enrol in a course (0% progress) and open its certificate URL — a certificate is issued in your name.
- **Walkthrough:** Step by step: 1) Enrol in a course and watch nothing (0% progress). 2) Open /certificates/<enrolmentId>. 3) A certificate is issued in your name despite the incomplete course. The test completes.

### Enrollment IDOR — Another Student's Progress (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Every object reference needs an ownership check; sequential IDs plus login-only checks expose every student's learning record to every other student.
- **Hints:**
  1. Your enrolment pages live at /enrollments/<id> with small sequential ids.
  2. The page checks that you are logged in — but does it check the enrolment is yours?
  3. Log in as Alice (enrolment 1) and open /enrollments/2 — Bob's course progress, in full.
- **Walkthrough:** Step by step: 1) Log in as Alice. 2) Open /enrollments/2. 3) Bob's enrolment and progress render for you. The test completes when a foreign enrolment is served.

## Instructor Dashboard

### Edit Another Instructor's Public Profile (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Profile mutations must be scoped to the session user; an id in the URL is an address, not a permission.
- **Hints:**
  1. Instructor profile edits post to /instructors/<id>/profile — the same id you see on their public page.
  2. The handler updates whichever profile the id names. It never asks whose session this is.
  3. As a student (or a rival instructor), POST a new name and bio for instructor 3 — Diego's public page now says what you wrote.
- **Walkthrough:** Step by step: 1) Log in as anyone who is not instructor 3. 2) POST /instructors/3/profile with a new name and bio. 3) Instructor 3's public profile changes. The test completes when a foreign profile is modified.

### Payout Request Exceeds Earnings Balance (Advanced · A04 Insecure Design)
- **Objective:** make the server register this exploit by its real effect — Money-out requests must be validated against the server-side balance at request time; otherwise a payout form is a cheque the user writes to themselves.
- **Hints:**
  1. The payout form asks the instructor how much to pay out. The server records the request…
  2. …without ever comparing it to what the instructor actually earned.
  3. As an instructor, POST /instructor/payout with an amount far above your earnings balance — the payout is recorded in full.
- **Walkthrough:** Step by step: 1) Log in as an instructor and note your earnings balance on your dashboard. 2) POST /instructor/payout with amount=99999. 3) The payout is recorded despite exceeding the balance. The test completes.

### Instructor Earnings IDOR (Beginner · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — Financial dashboards are objects like any other: they need ownership checks, or every user can read every instructor's income.
- **Hints:**
  1. Earnings dashboards live at /instructor/<userId>/earnings. Instructor ids are the small user ids you see in profile URLs.
  2. The dashboard checks that someone is logged in — not that the earnings are theirs.
  3. As any student, open /instructor/2/earnings — Dr. Chen's revenue, course by course.
- **Walkthrough:** Step by step: 1) Log in as any student. 2) Open /instructor/2/earnings. 3) Dr. Chen's earnings dashboard renders for you. The test completes when foreign earnings are served.

## Admin Panel

### CSRF on Admin User Deactivation (Intermediate · A01 Broken Access Control)
- **Objective:** make the server register this exploit by its real effect — High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.
- **Hints:**
  1. The admin panel can deactivate a user account with one POST. The form's _origin marker is, once again, never verified.
  2. If you hold an admin session (see the cookie test), a marker-less POST will still deactivate the account.
  3. As admin, POST /admin/users/5/deactivate with no _origin — Bob is locked out of the academy.
- **Walkthrough:** Step by step: 1) Hold an admin session (the real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/5/deactivate with no _origin field. 3) Bob's account is deactivated. The test completes when the marker-less deactivation is applied.

## Platform & API

### Predictable API Token & Unscoped Enrollment API (Advanced · A07 Authentication Failures)
- **Objective:** make the server register this exploit by its real effect — API credentials must be high-entropy and random, and every API response must be scoped to the authenticated user; a derived token plus an unscoped query is total exposure.
- **Hints:**
  1. Your profile page shows your API token. Look at its shape: ha_ plus base64 of something you already know.
  2. If tokens are derived from email addresses, every user's token is public knowledge. And the API does not scope its answer.
  3. Compute the token for bob@hexaacademy.local and call GET /api/enrollments with header X-API-Key — enrolments from every student come back.
- **Walkthrough:** Step by step: 1) See your own token pattern on /profile: ha_ + base64(your email). 2) Derive Bob's token from bob@hexaacademy.local the same way. 3) GET /api/enrollments with that X-API-Key. 4) Enrolments belonging to other students are included. The test completes.

### Debug Endpoint Dumps User Passwords (Beginner · A05 Security Misconfiguration)
- **Objective:** make the server register this exploit by its real effect — Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.
- **Hints:**
  1. A leftover /debug endpoint answers any logged-in user with the academy's internal state.
  2. Internal state here includes the full user table — passwords in plain text.
  3. Log in as any student and open /debug.
- **Walkthrough:** Step by step: 1) Log in as any ordinary student. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.
