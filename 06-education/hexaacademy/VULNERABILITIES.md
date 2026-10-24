# HexaAcademy — Vulnerability Map (LAB 52)

Every entry below is a scored test in the lab's registry (26 tests, 8 features). Each flaw is real and working in the app, and the server detects the exploit itself when it succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** String-built queries let attacker input change the meaning of the query itself; the first matching row (here the platform admin) is returned with no password check at all.
- **Exploitation outline:** Step by step: 1) Open the login page. 2) Enter the email ' OR '1'='1' --  with any password. 3) The legacy query becomes true for the first user row and a session is issued — as the platform admin. 4) The test completes when that bypass session is created.
- **Impact:** On a real learning platform this is total compromise: one crafted login reaches the admin account — every student record, payment record and certificate behind it.

### Brute Force — No Lockout or Throttle
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Without rate limiting or lockout, online password guessing is only a matter of time — students reuse passwords, so credential lists work well here.
- **Exploitation outline:** Step by step: 1) Choose alice@hexaacademy.local. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Every attempt is processed at full speed — nothing locks or slows. 4) The test completes at the 10th processed failure.
- **Impact:** An attacker can grind through password lists against student and instructor logins undisturbed; every weak password becomes a hijacked account with paid courses attached.

### Account Enumeration via Password Reset
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Medium
- **What it is:** Different responses for existing vs non-existing accounts hand attackers a verified list of registered students and instructors to aim phishing and password attacks at.
- **Exploitation outline:** Step by step: 1) POST /forgot with alice@hexaacademy.local — note the "reset link sent" message. 2) POST /forgot with a made-up email — note the different "no account" message. 3) Observing both answers completes the test: the difference is the leak.
- **Impact:** Attackers harvest the academy's real user emails from the reset form, then target exactly those people with phishing and credential stuffing.

### Default Admin Credentials
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Default and vendor-supplied credentials are public knowledge; any privileged account still using one is an open door with a welcome mat.
- **Exploitation outline:** Step by step: 1) Go to the login page. 2) Sign in as admin@hexaacademy.local / admin123. 3) You are in as Platform Admin. The test completes on that login.
- **Impact:** The platform admin account — able to deactivate users and see everything — is protected by the first password every attacker tries.

### Predictable Password-Reset Token
- **OWASP:** A07 Authentication Failures · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Reset tokens must be high-entropy random values; a token derived from a public identifier (user ID) lets anyone reset anyone's password.
- **Exploitation outline:** Step by step: 1) Request a reset for your own account and note the token shape ACA-<number>. 2) Reverse the formula: number = userId × 167 + 41. 3) POST /reset for prof@hexaacademy.local (user 2) with the computed token and a new password — never having requested it. 4) The change is accepted; the test completes.
- **Impact:** An attacker who knows a victim's user ID — visible in instructor profile URLs all over the site — can take over their account in one request, no email access needed.

### Session Cookie Role Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Authorisation data must live server-side; anything the client can edit — including a role inside their own cookie — will be edited.
- **Exploitation outline:** Step by step: 1) Log in as any student and copy the hx_sess cookie. 2) Base64-decode it — it is plain JSON with your role. 3) Change role to admin, re-encode, replace the cookie. 4) Open /admin — the panel opens for a student account. The test completes.
- **Impact:** Every student can promote themselves to admin by editing a cookie, reaching the panel that can deactivate accounts and list every user.

## Registration & Profile

### Weak Password Policy at Registration
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Report severity:** Medium
- **What it is:** Password policy is set at registration; if 3-character passwords are allowed, brute force and guessing become trivial against those accounts.
- **Exploitation outline:** Step by step: 1) Open /register. 2) Create an account with a 3-character password such as abc. 3) The account is created without complaint. The test completes.
- **Impact:** Students who choose weak passwords (many will) get accounts that fall to the first guessing attempt — with their paid courses and certificates attached.

### Mass Assignment — Self-Appointed Instructor or Admin
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Binding request bodies directly to data models lets attackers set privileged fields (here the account role) that the UI never offered.
- **Exploitation outline:** Step by step: 1) Submit the registration form with the extra field role=instructor added to the POST body. 2) Log in with the new account. 3) It carries the instructor role you assigned yourself. The test completes.
- **Impact:** Attackers mint themselves instructor or admin accounts at will — they can publish courses, reach the earnings tooling, or walk straight into administration.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** User-controlled names must be output-encoded everywhere they render; a name field is a classic stored-XSS carrier because it is shown to staff and other users.
- **Exploitation outline:** Step by step: 1) Log in and open /profile. 2) Set your display name to <script>alert(1)</script> and save. 3) The payload is stored and rendered unescaped. The test completes on save.
- **Impact:** A student plants script in their own name; when an instructor or admin opens a user list, the script runs in the academy's origin with their session.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Medium
- **What it is:** State-changing forms need server-verified anti-CSRF tokens; a hidden field that is never checked is decoration, not protection.
- **Exploitation outline:** Step by step: 1) While logged in, POST /profile directly (curl) with a new name and no _origin field. 2) The profile changes. 3) The test completes when a marker-less update is applied.
- **Impact:** Any website a logged-in user visits can silently rewrite their profile (name, bio) — the first step in social-engineering the academy's support desk.

## Course Catalogue & Search

### SQL Injection in Course Search Reveals Draft Courses
- **OWASP:** A03 Injection · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Search filters built by string concatenation are injectable like any other query; here the injection bypasses the published-only filter and leaks unreleased content.
- **Exploitation outline:** Step by step: 1) Open /search. 2) Search for ' OR '1'='1. 3) The results include the unpublished draft course 'Secret Launch: AI Pentesting'. 4) The test completes when a draft course is served by the injected search.
- **Impact:** Attackers (and competitors) enumerate the academy's entire catalogue — including unreleased courses, their pricing and their instructors — before launch.

### Reflected XSS in Course Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Reflected input must be output-encoded; search boxes are a reliable way to fire script inside another user's session when the link is shared.
- **Exploitation outline:** Step by step: 1) Open /search?q=<script>alert(1)</script>. 2) The page reflects the payload unescaped. 3) The test completes when the payload is reflected.
- **Impact:** An attacker sends a student or instructor a crafted search link; the script runs in their browser, inside the academy origin, with their session attached.

## Enrollments & Payments

### Checkout Price Tampering
- **OWASP:** A04 Insecure Design · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Prices must always be recomputed server-side from the catalogue; a price that travels through the client is a price the client chooses.
- **Exploitation outline:** Step by step: 1) Log in as a student and open a paid course. 2) POST /checkout with type=course, the course id, and price=1 instead of the catalogue price. 3) The enrolment is created and $1 is recorded as paid. The test completes.
- **Impact:** Every paid course on the platform can be bought for a dollar (or a cent) — the academy's entire revenue model collapses while the enrolments look legitimate.

### Coupon Stacking Beyond the Intended Discount
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Discount rules are business logic and must be enforced server-side; if the client can present two coupons and the server applies both, the intended maximum discount is fiction.
- **Exploitation outline:** Step by step: 1) Check out a course. 2) Submit coupon1=WELCOME50 and coupon2=STUDENT20 together. 3) Both discounts are applied to the enrolment amount. The test completes when two coupons land on one order.
- **Impact:** Students combine every promotion the academy has ever issued, driving course prices toward zero — a slow, quiet revenue bleed that looks like normal sales.

### Single-Use Coupon Reused
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Single-use promotions need an atomic server-side check at redemption time; recording usage without enforcing it is bookkeeping, not control.
- **Exploitation outline:** Step by step: 1) Check out any course with coupon1=VIP100 — it applies (first, legitimate use). 2) Check out another course with coupon1=VIP100 again. 3) It applies a second time. The test completes on the second redemption.
- **Impact:** A one-off 100%-off launch coupon becomes an unlimited free-courses code shared across the internet — every course free, forever.

### Bundle Total Tampering
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Any total computed client-side — bundle sums, shipping, taxes — must be recomputed server-side; otherwise the checkout is an honour system.
- **Exploitation outline:** Step by step: 1) Open a bundle page. 2) POST /checkout with type=bundle, the bundle id, and total=10. 3) Enrolments for every course in the bundle are created at the tampered total. The test completes.
- **Impact:** Curated bundles, the academy's highest-value products, sell for whatever the buyer types — premium content at pocket-change prices.

### Refund Kept After Certificate Issued
- **OWASP:** A04 Insecure Design · **Difficulty:** Advanced · **Report severity:** High
- **What it is:** Refund logic must check the fulfilment state (certificate issued, course consumed) before returning money; otherwise buyers keep the credential and the cash.
- **Exploitation outline:** Step by step: 1) Have a certificate issued for one of your enrolments. 2) POST /enrollments/<id>/refund for that enrolment. 3) The refund is recorded while the certificate remains issued. The test completes.
- **Impact:** Students harvest certificates for free: claim a course, take the certificate, refund in full. The academy pays out and the credential keeps circulating.

## Learning & Certificates

### Enrollment IDOR — Another Student's Progress
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Every object reference needs an ownership check; sequential IDs plus login-only checks expose every student's learning record to every other student.
- **Exploitation outline:** Step by step: 1) Log in as Alice. 2) Open /enrollments/2. 3) Bob's enrolment and progress render for you. The test completes when a foreign enrolment is served.
- **Impact:** Students browse each other's progress, completions and certificates — and harvest the enrolment ids that feed the refund and certificate flaws.

### Progress Tampering — Completion Without Watching
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Learning progress must be derived from server-tracked events (lessons actually served and completed); a client-supplied counter is fiction waiting to be typed.
- **Exploitation outline:** Step by step: 1) Pick one of your enrolments with 0 lessons watched. 2) POST /enrollments/<id>/progress with lessons equal to the course's lesson count. 3) Progress shows 100%. The test completes when full progress is recorded with no lessons watched.
- **Impact:** Students "complete" courses in one request, unlocking certificates without learning anything — the credential stops meaning anything.

### Certificate Issued Without Completing the Course
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** Critical
- **What it is:** Credential issuance must verify the earning condition (here: genuine 100% progress) at issue time; the existence of a related record is not proof of achievement.
- **Exploitation outline:** Step by step: 1) Enrol in a course and watch nothing (0% progress). 2) Open /certificates/<enrolmentId>. 3) A certificate is issued in your name despite the incomplete course. The test completes.
- **Impact:** Anyone can mint genuine-looking academy certificates for courses they never took — employers trust the credential, and the academy's name carries the fraud.

## Instructor Dashboard

### Instructor Earnings IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner · **Report severity:** High
- **What it is:** Financial dashboards are objects like any other: they need ownership checks, or every user can read every instructor's income.
- **Exploitation outline:** Step by step: 1) Log in as any student. 2) Open /instructor/2/earnings. 3) Dr. Chen's earnings dashboard renders for you. The test completes when foreign earnings are served.
- **Impact:** Instructors' earnings — commercially sensitive numbers — are visible to every registered user, poisoning trust and inviting targeted social engineering.

### Payout Request Exceeds Earnings Balance
- **OWASP:** A04 Insecure Design · **Difficulty:** Advanced · **Report severity:** Critical
- **What it is:** Money-out requests must be validated against the server-side balance at request time; otherwise a payout form is a cheque the user writes to themselves.
- **Exploitation outline:** Step by step: 1) Log in as an instructor and note your earnings balance on your dashboard. 2) POST /instructor/payout with amount=99999. 3) The payout is recorded despite exceeding the balance. The test completes.
- **Impact:** Instructors drain the platform: request payouts larger than their earnings and the academy pays out money that was never earned.

### Edit Another Instructor's Public Profile
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** Profile mutations must be scoped to the session user; an id in the URL is an address, not a permission.
- **Exploitation outline:** Step by step: 1) Log in as anyone who is not instructor 3. 2) POST /instructors/3/profile with a new name and bio. 3) Instructor 3's public profile changes. The test completes when a foreign profile is modified.
- **Impact:** Rivals or trolls rewrite instructors' public names and bios — defamation, fake endorsements and course links planted under a trusted name.

## Admin Panel

### CSRF on Admin User Deactivation
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate · **Report severity:** High
- **What it is:** High-impact admin actions need verified anti-CSRF tokens (and ideally re-authentication); otherwise any page an admin views can weaponise their session.
- **Exploitation outline:** Step by step: 1) Hold an admin session (the real admin login, or the forged cookie from the cookie-role test). 2) POST /admin/users/5/deactivate with no _origin field. 3) Bob's account is deactivated. The test completes when the marker-less deactivation is applied.
- **Impact:** A booby-trapped page deactivates students and instructors en masse while the admin browses — a denial-of-service against the whole academy.

## Platform & API

### Predictable API Token & Unscoped Enrollment API
- **OWASP:** A07 Authentication Failures · **Difficulty:** Advanced · **Report severity:** Critical
- **What it is:** API credentials must be high-entropy and random, and every API response must be scoped to the authenticated user; a derived token plus an unscoped query is total exposure.
- **Exploitation outline:** Step by step: 1) See your own token pattern on /profile: ha_ + base64(your email). 2) Derive Bob's token from bob@hexaacademy.local the same way. 3) GET /api/enrollments with that X-API-Key. 4) Enrolments belonging to other students are included. The test completes.
- **Impact:** Anyone who knows a user's email (public) owns their API access — and the API hands over every student's enrolments, amounts paid and certificate status.

### Debug Endpoint Dumps User Passwords
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner · **Report severity:** Critical
- **What it is:** Debug and diagnostic endpoints must never ship to production; when they expose credential material, one request compromises every account at once.
- **Exploitation outline:** Step by step: 1) Log in as any ordinary student. 2) Open /debug. 3) The JSON dump includes every user with their plaintext password. The test completes when a non-admin receives the dump.
- **Impact:** One click hands an attacker every student's, instructor's and the admin's password in clear text — total academy-wide account takeover.
