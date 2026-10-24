# HexaCampus — Vulnerability Map (LAB 55)

HexaCampus is a deliberately vulnerable university student portal, built for authorised, local-only security training. It contains **26 scored vulnerabilities** across **8 features**. Every item below is a real, working flaw in the app; each one is also a scored test on the in-app mission page (`/tests`).

> The completion key is protected by a shard mechanism: it exists only as split, encoded fragments inside the code, is assembled in memory only when the lab reaches 100%, and is never written in any document.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **What it is:** String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.
- **Impact:** On a real campus portal this hands an attacker an administrator session in seconds: every student record, grade and fee behind that login is exposed.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **What it is:** Without throttling, a login form is an unlimited password-guessing machine; weak student passwords fall quickly.
- **Impact:** Attackers routinely credential-stuff university portals. No lockout means one guessed password equals one compromised student account.

### User Enumeration via Login & Password Reset
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /login · POST /forgot`
- **What it is:** Different error messages for "no such account" vs "wrong password" confirm which email addresses are registered.
- **Impact:** Enumeration gives attackers a verified target list of student emails — the starting point for phishing and password spraying against the university.

### Default / Demo Credentials Still Active
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /login`
- **What it is:** Default credentials are public knowledge; any account that keeps them is effectively unlocked.
- **Impact:** The seeded admin account still uses its factory password — a real deployment would give the first visitor full administrative control.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** `POST /reset`
- **What it is:** Reset tokens must be unguessable random values; a formula based on the user id lets anyone take over any account.
- **Impact:** Anyone who can see a student id — shown all over the portal — can reset that student’s password and own the account, grades and fee records included.

### Role Cookie Tampering Opens Faculty Area
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `GET /faculty/grades`
- **What it is:** Authorization data stored on the client can be edited by the client; roles must be checked server-side from the session.
- **Impact:** Any student can promote themselves to faculty in one cookie edit and open the grade-entry console of a real university portal.

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** `POST /register`
- **What it is:** A password policy that accepts anything trains users into weak passwords and makes every other control weaker.
- **Impact:** Students reuse short passwords everywhere; accepting them means the portal’s accounts fall to trivial guessing and credential stuffing.

### Mass Assignment — Role & GPA at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /register`
- **What it is:** Binding request bodies directly to data models lets attackers set fields the UI never offered — roles, balances, GPAs.
- **Impact:** A self-registered "student" who is secretly an admin — or carries a forged 4.0 GPA — defeats every trust decision the university makes from this data.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** `POST /register · POST /profile`
- **What it is:** Any user-controlled text rendered unescaped becomes stored XSS that fires in other users’ browsers — including staff.
- **Impact:** A payload in a student name executes in the faculty roster view, letting an attacker act inside a lecturer’s session — grade changes included.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /profile`
- **What it is:** State-changing forms without anti-CSRF tokens can be submitted by any website the victim visits while logged in.
- **Impact:** A malicious page could silently change a student’s contact email — the first step to locking them out via password reset.

## Courses & Registration (3)

### Enroll in a Full or Closed Course
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `POST /courses/:id/enroll`
- **What it is:** Business rules that live only in the UI (greyed-out buttons) are not rules — the server must enforce capacity and status.
- **Impact:** Students could force their way into full classes or closed courses, breaking class-size limits the university is accredited for.

### Prerequisite Bypass on Enrollment
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `POST /courses/:id/enroll`
- **What it is:** Prerequisite chains are server-side business logic; skipping the check lets users jump sequences the institution designed deliberately.
- **Impact:** Unprepared students land in advanced courses, and prerequisite-gated programmes (a compliance requirement) become meaningless.

### Drop Another Student’s Enrollment (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /enrollments/:id/drop`
- **What it is:** Object references must be authorised per request: owning the session does not mean owning every id in the URL.
- **Impact:** A malicious student could unenroll classmates from courses right before a deadline — real academic harm from one missing check.

## Grades & Transcripts (4)

### View Another Student’s Grades (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /students/:id/grades`
- **What it is:** Grades are among the most sensitive records a school holds; a missing ownership check exposes all of them.
- **Impact:** Every student’s grades become readable by every other student — a serious privacy breach (FERPA/GDPR territory) for a real university.

### Student Changes a Grade via the Faculty Endpoint
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `POST /faculty/grades`
- **What it is:** Hiding a link is not access control. Every privileged action must re-verify the caller’s role on the server.
- **Impact:** A student awarding themselves an A destroys the integrity of the entire grading system — the one asset a university cannot afford to lose.

### Download Another Student’s Transcript (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /transcripts/:studentId`
- **What it is:** Document endpoints are record endpoints: the same ownership rules apply to generated files as to pages.
- **Impact:** Transcripts bundle identity data and academic history; leaking them enables identity fraud against every student on the portal.

### Faculty Roster Leaks All Students’ Emails & GPAs
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /faculty/roster`
- **What it is:** Internal directories concentrate sensitive data; "logged in" is not an authorization policy.
- **Impact:** One URL hands any student a full directory of names, emails and GPAs — perfect raw material for targeted phishing of the whole cohort.

## Tuition & Payments (3)

### View Another Student’s Fee Statement (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /statements/:id`
- **What it is:** Financial records need the same per-object authorization as everything else; sequential ids make guessing trivial.
- **Impact:** Students’ tuition balances and payment history — sensitive financial data — become public inside the portal.

### Statement Settled as Paid for $1
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Location:** `POST /payments`
- **What it is:** Payment state must be derived server-side from real amounts; a client-supplied "settled" flag is an invitation to free tuition.
- **Impact:** A student wipes a $5,000 tuition bill with a $1 payment — direct revenue loss that also corrupts the university’s accounts.

### Single-Use Merit Waiver Can Be Reused
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Location:** `POST /waivers/apply`
- **What it is:** One-time benefits need server-side usage records; a code without a redemption ledger is an unlimited discount.
- **Impact:** Repeated 50% waivers shrink a tuition bill to almost nothing — the same bug class as reusable coupon codes in e-commerce.

## Documents & Uploads (2)

### Unrestricted Upload — HTML Served from the Portal Origin
- **OWASP:** A08:2021 – Software and Data Integrity Failures
- **Difficulty:** Intermediate
- **Location:** `POST /upload · GET /uploads/:name`
- **What it is:** If user uploads are served as active content from the app origin, upload becomes stored XSS with the portal’s full trust.
- **Impact:** An attacker hosts a fake "re-login" page on the real university domain and harvests student passwords with perfect credibility.

### Path Traversal in Document Download
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** `GET /documents/download?name=`
- **What it is:** User-controlled file paths must be canonicalised and constrained to the intended directory.
- **Impact:** Traversal out of the document folder reaches registrar backups — a full export of student identity data in one request.

## Search (2)

### SQL Injection in Course Search Leaks Hidden Courses
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** `GET /search?q=`
- **What it is:** Injection in a "harmless" search box still rewrites the query — here it exposes unpublished data.
- **Impact:** Unpublished draft courses (and anything else the query touches) leak; the same flaw usually reaches far more sensitive tables.

### Reflected XSS in Course Search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** `GET /search?q=`
- **What it is:** Reflected input is still user content: echoing a query unescaped executes in the victim’s browser.
- **Impact:** A crafted search link sent to a lecturer runs script in their session — a clean path to grade tampering via their browser.

## Admin Panel (2)

### Admin Console Reachable by Any Student
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** `GET /admin`
- **What it is:** Admin surfaces must verify the admin role on every request, not just hide their links from menus.
- **Impact:** The console lists every account including passwords — one student visit equals a full credential dump of the university.

### CSRF on Admin Role Change
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Advanced
- **Location:** `POST /admin/adjust-role`
- **What it is:** Privileged state changes need CSRF tokens most of all — they are the highest-value forgery targets.
- **Impact:** A page an admin merely visits could promote an attacker’s account to admin — full portal takeover without stealing any password.
