# HexaLearn — Vulnerability Map (LAB 51)

The complete scored test registry for LAB 51 — HexaLearn, grouped by feature. 26 tests across 10 features. Every test completes only when the exploit actually succeeds (server-side detection).

## Login & Authentication (6)

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** String-built SQL lets attacker input change the query logic itself — authentication falls without knowing any password.
- **Business impact:** On a real client site this means full account takeover, including admin, from the public login form — the most damaging class of finding a login page can have.
- **Report severity:** Critical

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Without throttling, an attacker can try unlimited passwords against any account; weak passwords fall quickly.
- **Business impact:** A client's customers get credential-stuffed or brute-forced silently — account takeovers, fraud and support chaos follow.
- **Report severity:** High

### User enumeration via login & forgot-password
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Different responses for real vs fake accounts hand attackers a verified target list for phishing and password attacks.
- **Business impact:** Attackers harvest the client's real user list and focus credential attacks only on accounts that exist — far higher success rate.
- **Report severity:** Medium

### Published demo account with default credentials
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** Demo/default accounts ship with known passwords and are the first thing an attacker tries.
- **Business impact:** A known-credential account is a free foothold inside the client's platform — attackers use it to explore everything an insider can see.
- **Report severity:** High

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **What it is:** Reset tokens must be long, random and single-use; a token computed from a user id is an account-takeover formula.
- **Business impact:** Anyone can reset any customer's password — including staff — with zero access to their inbox. Total account compromise at scale.
- **Report severity:** Critical

### Session/role cookie tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Authorisation data stored client-side is attacker-controlled; roles must live in the server-side session.
- **Business impact:** Any student becomes an admin by editing a cookie — full platform control, every customer record exposed.
- **Report severity:** Critical

## Registration & Profile (4)

### Weak password policy (1-character passwords)
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it is:** A password policy that accepts anything guarantees weak passwords across the whole user base.
- **Business impact:** Customers pick trivial passwords that fall to the first dictionary an attacker tries — mass account takeover.
- **Report severity:** Medium

### Mass assignment — role & credit via registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Binding request bodies straight onto data models lets attackers set fields that were never meant to be user-controlled.
- **Business impact:** Attackers mint themselves admin accounts or free credit balances at signup — privilege escalation and direct financial loss.
- **Report severity:** Critical

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** Any user-supplied text rendered without encoding becomes stored XSS that fires in other users' browsers.
- **Business impact:** An attacker's payload runs in the admin's browser — session theft and actions performed as the admin.
- **Report severity:** High

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** State-changing endpoints without anti-CSRF tokens can be triggered by any website the victim visits while logged in.
- **Business impact:** A malicious page silently rewrites a victim's profile — the first step in social-engineering and account-recovery attacks.
- **Report severity:** Medium

## Search & Catalog (2)

### SQL injection in course search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it is:** Every string-built query is injectable, not just login forms — search is a classic entry point.
- **Business impact:** Attackers dump the client's entire catalogue/database through the search box, or bypass its logic entirely.
- **Report severity:** High

### Reflected XSS in search results
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** Reflecting input without encoding lets attackers craft links that run script in a victim's session.
- **Business impact:** Phishing links on the client's own domain execute script as the victim — trusted-domain attacks convert extremely well.
- **Report severity:** Medium

## Enrollment & Payments (3)

### Price tampering — enrol in a paid course for $0
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Prices must be looked up server-side at purchase time; a client-sent price is an invitation to pay nothing.
- **Business impact:** Every paying customer can take the client's courses for free — direct, total revenue loss on digital products.
- **Report severity:** Critical

### Negative price — buying a course pays YOU credit
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Missing server-side validation of amounts lets attackers invert a payment flow and mint value from nothing.
- **Business impact:** Attackers generate unlimited store credit from the checkout itself — fraud that compounds with every other purchase flow.
- **Report severity:** Critical

### Single-use coupon can be reused forever
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Promotions are business rules; if the server never checks redemption state, "single-use" is fiction.
- **Business impact:** One leaked coupon code becomes a permanent 50% discount for everyone — margin destroyed across the whole catalogue.
- **Report severity:** High

## Lessons & Progress (2)

### Forge lesson completion without enrolling
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Progress writes must verify enrollment and ownership server-side; otherwise course completion is whatever the client claims.
- **Business impact:** Students skip paid content entirely and unlock certificates/credentials they never earned — the product's core value evaporates.
- **Report severity:** High

### IDOR — view any student's progress
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Object URLs must check the requester owns (or may see) the object; sequential ids make guessing trivial.
- **Business impact:** Every learner's record is exposed to every other learner — a privacy breach and a GDPR problem for the client.
- **Report severity:** High

## Quizzes & Scores (2)

### Quiz answers shipped to the browser
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Anything sent to the client is public. Answer keys belong on the server; grading must happen server-side.
- **Business impact:** Every student aces every quiz — certificates and course credentials become meaningless to employers.
- **Report severity:** High

### Client-submitted quiz score trusted
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Scores, like prices, are server truth. A client-reported score is not a result; it is a request.
- **Business impact:** Anyone can "pass" any assessment instantly — paid certifications and compliance training records are falsified.
- **Report severity:** High

## Course Certificates (2)

### Certificate issued without completing the course
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Credential issuance must re-verify every precondition server-side at issue time.
- **Business impact:** Fraudulent certificates with the client's brand get sold/shared — reputational damage and worthless credentials.
- **Report severity:** High

### IDOR — view another student's certificate
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Credential documents are sensitive objects; serving them by guessable id without an ownership check exposes them to everyone.
- **Business impact:** Strangers harvest certificates bearing real names — identity fraud material and a privacy breach.
- **Report severity:** Medium

## Reviews (1)

### Stored XSS in course reviews
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it is:** UGC rendered without encoding is stored XSS aimed at everyone who views the page — instructors and admins included.
- **Business impact:** Attack script runs for every visitor of a popular course page — session theft at the client's most trusted surface.
- **Report severity:** High

## Instructor Payouts (2)

### Payout amount tampering — request more than earned
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Payout/withdrawal amounts must be validated against the server-side balance, every time.
- **Business impact:** Instructors (or anyone who hijacks an instructor account) drain the platform — direct theft from the client.
- **Report severity:** Critical

### IDOR — view another instructor's payout summary
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it is:** Financial summaries are private objects; role alone is not authorisation — ownership is.
- **Business impact:** Competitors and curious users read every instructor's income — sensitive commercial data leaked.
- **Report severity:** Medium

## Admin & Platform (2)

### CSRF on admin course deletion
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it is:** Admin actions are the highest-value CSRF targets; they need tokens and origin checks most of all.
- **Business impact:** One malicious page view by an admin deletes catalogue content — vandalism with the admin's own authority.
- **Report severity:** High

### Weak API token — base64(email) accepted
- **OWASP:** A02:2021 Cryptographic Failures
- **Difficulty:** Intermediate
- **What it is:** Tokens must be unguessable secrets. Encoding is not encryption, and a public identifier is not a credential.
- **Business impact:** Anyone who knows a customer's email address owns their API identity — full impersonation of every user.
- **Report severity:** Critical
