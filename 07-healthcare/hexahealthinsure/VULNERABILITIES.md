# HexaHealthInsure — Vulnerability Map (LAB 70)

The complete map of this lab: **26 scored tests across 10 features**. Every entry below is a real, working flaw in the app; the matching test on the /tests mission board completes only when the exploit actually succeeds server-side.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Impact:** On a real insurer portal this is instant takeover of admin and member accounts — every policy, claim and medical bill is exposed.
- **How it is exploited:** Use admin@hexainsure.local' OR '1'='1 as the email — you are logged in as admin and the password is never checked.
- **Lesson:** String-built SQL queries let an attacker rewrite the login condition and enter as any account.

### Brute Force — No Rate Limiting
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Impact:** A client’s members get their accounts cracked one by one — claims fraud and identity theft follow.
- **How it is exploited:** After 10 failures the app still processes guesses normally — the missing throttle is the finding.
- **Lesson:** Without throttling, an attacker can guess passwords forever until one works.

### User Enumeration via Error Messages
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Impact:** Attackers harvest a verified member list first, then aim phishing and credential stuffing only at real accounts.
- **How it is exploited:** Probe 5 or more different emails — the different answers reveal exactly which emails hold accounts.
- **Lesson:** Different error messages turn the login and reset forms into an account-existence oracle.

### Published Demo Credentials
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Impact:** Anyone on the internet can walk into the portal with the printed demo login and explore member functionality.
- **How it is exploited:** Sign in with the demo account printed right on the login page.
- **Lesson:** A working credential printed in the UI is a standing invitation into the application.

### Predictable Password-Reset Token
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Impact:** Any member’s password can be reset by a stranger — full account takeover with no email access needed.
- **How it is exploited:** Tokens follow HXR-<userId x 131 + 17> — compute one for another user and reset their password without ever requesting a reset.
- **Lesson:** Reset tokens must be unguessable; a formula based on the user id is public knowledge once one token is seen.

### Role Cookie Tampering
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Every member becomes an admin by editing one cookie — user management, claims and payouts are all theirs.
- **How it is exploited:** Set the hx_role cookie to admin in your browser and open /admin.
- **Lesson:** Authorisation data must live server-side; a role stored in a client cookie is editable by the client.

## Registration & Profile (4)

### Weak Password Policy
- **OWASP:** A07 Auth Failures · **Difficulty:** Beginner
- **Impact:** Members with trivial passwords are harvested by the first credential-stuffing run against the portal.
- **How it is exploited:** A 1-character password is accepted.
- **Lesson:** Accounts are only as strong as the weakest password the policy allows.

### Mass Assignment — Self-Assigned Role
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Anyone can register themselves as an admin of the insurance portal in one request — total compromise.
- **How it is exploited:** Submit role=admin with your registration — the account is created as an admin.
- **Lesson:** Binding request bodies directly to models hands the client control of privileged fields.

### Stored XSS in Display Name
- **OWASP:** A03 Injection · **Difficulty:** Intermediate
- **Impact:** An attacker plants a script in their name and hijacks the session of every admin who views the user list.
- **How it is exploited:** Register (or rename yourself) with a script payload as the name — it is stored and rendered raw.
- **Lesson:** Stored payloads in profile fields execute in other users’ browsers — including administrators.

### CSRF on Profile Update
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** A malicious page can silently rewrite a logged-in member’s profile and contact details.
- **How it is exploited:** POST to /profile with a cross-site Origin and no marker — the change is accepted anyway.
- **Lesson:** Session cookies ride along with cross-site requests, so state changes need an unforgeable token.

## Claims (5)

### Claim Above Coverage Limit Accepted
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate
- **Impact:** The insurer pays out claims far beyond what members paid for — direct, unlimited financial loss.
- **How it is exploited:** As Carol (Bronze, limit $5,000), file a claim for $9,000 — it is accepted and stored.
- **Lesson:** Financial limits that exist in the brochure must also exist in the server-side code.

### Claim IDOR — Other Members’ Claims
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Impact:** Any member can read every other member’s treatments and amounts — a mass health-data breach.
- **How it is exploited:** Open /claims/3 while signed in as a different member.
- **Lesson:** Sequential ids plus missing ownership checks expose every record in the system.

### Members Can Approve Their Own Claims
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Members approve their own claims at will — the entire claims control process is meaningless.
- **How it is exploited:** As a plain member, POST your own claim id with decision=approved — it goes through.
- **Lesson:** A workflow endpoint without a role check lets the beneficiary act as the approver.

### Claim Status Forgery by Owner
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Members mark their own claims paid without any review — instant fraudulent payouts.
- **How it is exploited:** Set your own pending claim’s status directly to paid.
- **Lesson:** Status fields are money: letting owners set them skips review, approval and payment controls at once.

### Editing an Already-Approved Claim
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** An approved $1,200 claim quietly becomes $45,000 — the difference is paid out before anyone notices.
- **How it is exploited:** Raise the amount of Alice’s approved $1,200 claim to $45,000.
- **Lesson:** Once a financial record is approved, any later silent edit destroys the audit trail and the payout math.

## Pre-authorizations (2)

### Forged Pre-Authorization
- **OWASP:** A04 Insecure Design · **Difficulty:** Advanced
- **Impact:** Members walk into clinics with "approved" authorisations the insurer never reviewed — guaranteed payouts for anything.
- **How it is exploited:** Submit a pre-authorization with status=approved (optionally for another member) — it is stored as approved.
- **Lesson:** Approval state must be produced by the approval workflow, never supplied by the requester.

### Pre-Authorization IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Impact:** Planned surgeries and treatments of every member are readable by any other member.
- **How it is exploited:** Open /preauth/1 as a different member — full details are served.
- **Lesson:** The same missing ownership check usually repeats on every object type in the app.

## Eligibility Checks (2)

### Eligibility Check Trusts Client-Supplied Plan
- **OWASP:** A04 Insecure Design · **Difficulty:** Advanced
- **Impact:** Members get written "eligible" answers for treatments they never paid to cover — clinics bill, insurer pays.
- **How it is exploited:** As Carol (Bronze), check "Cosmetic rhinoplasty" with planId set to Gold — it answers ELIGIBLE for a treatment Bronze never covers.
- **Lesson:** A decision is only trustworthy when every input comes from the server’s own records.

### Eligibility Summary IDOR
- **OWASP:** A01 Broken Access Control · **Difficulty:** Beginner
- **Impact:** Any member can map every other member’s plan and remaining coverage — perfect targeting for fraud.
- **How it is exploited:** Open /eligibility/6 as another member to see their plan, usage and remaining coverage.
- **Lesson:** Coverage details are sensitive personal data and need the same ownership checks as claims.

## Plans & Coverage (1)

### Free Plan Upgrade (No Payment)
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate
- **Impact:** Every member upgrades to the top plan for free — premium revenue and coverage control both collapse.
- **How it is exploited:** POST an upgrade to Gold — the plan changes instantly with no payment step at all.
- **Lesson:** Entitlement changes must be chained to a verified payment event, not to the upgrade request itself.

## Provider Billing (2)

### Billing for Treatment Never Given
- **OWASP:** A04 Insecure Design · **Difficulty:** Advanced
- **Impact:** Clinics bill the insurer for phantom treatments at scale — the classic healthcare-fraud pattern, fully automated.
- **How it is exploited:** As City Clinic, bill Dave for "Brain surgery" — Dave has claims, but never with City Clinic, yet the bill is accepted.
- **Lesson:** Money-out endpoints must verify the underlying real-world event exists before accepting a charge.

### Double Billing for the Same Claim
- **OWASP:** A04 Insecure Design · **Difficulty:** Intermediate
- **Impact:** Every paid treatment can be billed again and again — losses grow silently inside normal-looking billing volume.
- **How it is exploited:** Submit another bill referencing claim 1 — it is accepted too.
- **Lesson:** Idempotency is a security control: the same event must never be payable twice.

## Provider Directory (1)

### Reflected XSS in Provider Search
- **OWASP:** A03 Injection · **Difficulty:** Beginner
- **Impact:** Attackers send members crafted search links that run script in the portal under the victim’s session.
- **How it is exploited:** Search for a script payload — it comes back unescaped in the page.
- **Lesson:** Reflected input must be encoded for the context it lands in, every time.

## Admin Panel (1)

### CSRF on Admin Role Change
- **OWASP:** A01 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** One malicious page visited by an admin silently promotes an attacker account to admin.
- **How it is exploited:** As admin, POST to /admin/role with a cross-site Origin and no marker — the role change applies.
- **Lesson:** The more powerful the action, the more dangerous a missing CSRF token becomes.

## Platform & API (2)

### Weak API Token (Derived from Email)
- **OWASP:** A07 Auth Failures · **Difficulty:** Intermediate
- **Impact:** Every member’s claims are readable by anyone who knows an email address — no password ever needed.
- **How it is exploited:** Use hhi_ followed by the base64 of a member’s email as the token for /api/claims — it authenticates as that member.
- **Lesson:** A token anyone can compute from public data is not a credential at all.

### Unauthenticated Debug Data Dump
- **OWASP:** A05 Security Misconfiguration · **Difficulty:** Beginner
- **Impact:** The full credential list of the insurer portal is one unauthenticated request away — game over.
- **How it is exploited:** Open /debug with no login at all — every account, including passwords, is returned.
- **Lesson:** Leftover debug surfaces bypass every other control in the application.
