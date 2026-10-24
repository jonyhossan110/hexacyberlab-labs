# HexaHealthInsure — Practice Guide (LAB 70)

Challenges grouped by feature, then difficulty. Each challenge mirrors one test on the /tests mission board. Use the three graded hints in order — and remember the Lab Coach will only guide you step-by-step after you have genuinely tried a feature at least 3 times.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** Make the "SQL Injection Login Bypass" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A03 Injection
- **Hint 1:** The login form builds its query by gluing your input into a string.
- **Hint 2:** Try an email that closes the string early, such as admin@hexainsure.local' -- 
- **Hint 3:** Use admin@hexainsure.local' OR '1'='1 as the email — you are logged in as admin and the password is never checked.

### [Beginner] Brute Force — No Rate Limiting
- **Objective:** Make the "Brute Force — No Rate Limiting" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** Nothing slows down repeated password guesses.
- **Hint 2:** Script 10+ wrong passwords for one account and watch for any lockout or delay.
- **Hint 3:** After 10 failures the app still processes guesses normally — the missing throttle is the finding.

### [Beginner] User Enumeration via Error Messages
- **Objective:** Make the "User Enumeration via Error Messages" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** Compare the error for an email that exists with one that does not.
- **Hint 2:** The forgot-password form answers differently too.
- **Hint 3:** Probe 5 or more different emails — the different answers reveal exactly which emails hold accounts.

### [Beginner] Published Demo Credentials
- **Objective:** Make the "Published Demo Credentials" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** The login page itself offers a demo account.
- **Hint 2:** Demo logins from a vendor demo often stay live in production.
- **Hint 3:** Sign in with the demo account printed right on the login page.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Make the "Predictable Password-Reset Token" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** Request a reset and study the shape of the token.
- **Hint 2:** The token is computed from the account, not randomly generated.
- **Hint 3:** Tokens follow HXR-<userId x 131 + 17> — compute one for another user and reset their password without ever requesting a reset.

### [Intermediate] Role Cookie Tampering
- **Objective:** Make the "Role Cookie Tampering" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** After login, inspect the cookies the app sets.
- **Hint 2:** One cookie repeats your role — and the server believes it.
- **Hint 3:** Set the hx_role cookie to admin in your browser and open /admin.

## Registration & Profile

### [Beginner] Weak Password Policy
- **Objective:** Make the "Weak Password Policy" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** Register a new account.
- **Hint 2:** How short can the password be?
- **Hint 3:** A 1-character password is accepted.

### [Intermediate] Mass Assignment — Self-Assigned Role
- **Objective:** Make the "Mass Assignment — Self-Assigned Role" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** The register endpoint binds the whole request body to the new user record.
- **Hint 2:** Add a field the visible form never shows.
- **Hint 3:** Submit role=admin with your registration — the account is created as an admin.

### [Intermediate] Stored XSS in Display Name
- **Objective:** Make the "Stored XSS in Display Name" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A03 Injection
- **Hint 1:** Your display name is printed back on several pages.
- **Hint 2:** One of those pages is the admin user list.
- **Hint 3:** Register (or rename yourself) with a script payload as the name — it is stored and rendered raw.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the "CSRF on Profile Update" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Your own pages carry a hidden hx_origin marker in their forms.
- **Hint 2:** A state-changing POST from another origin does not carry it.
- **Hint 3:** POST to /profile with a cross-site Origin and no marker — the change is accepted anyway.

## Claims

### [Beginner] Claim IDOR — Other Members’ Claims
- **Objective:** Make the "Claim IDOR — Other Members’ Claims" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Claim detail pages use a simple numeric id.
- **Hint 2:** Ownership is never checked when the page loads.
- **Hint 3:** Open /claims/3 while signed in as a different member.

### [Intermediate] Claim Above Coverage Limit Accepted
- **Objective:** Make the "Claim Above Coverage Limit Accepted" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** Every plan has an annual coverage limit — find the Bronze limit on the Plans page.
- **Hint 2:** The claim form never compares the amount against it.
- **Hint 3:** As Carol (Bronze, limit $5,000), file a claim for $9,000 — it is accepted and stored.

### [Intermediate] Members Can Approve Their Own Claims
- **Objective:** Make the "Members Can Approve Their Own Claims" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Adjusters decide claims through /adjuster/decide.
- **Hint 2:** Who checks that the caller really is an adjuster?
- **Hint 3:** As a plain member, POST your own claim id with decision=approved — it goes through.

### [Intermediate] Claim Status Forgery by Owner
- **Objective:** Make the "Claim Status Forgery by Owner" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** The claim detail page has a status form for "updates".
- **Hint 2:** It trusts whatever status you submit.
- **Hint 3:** Set your own pending claim’s status directly to paid.

### [Intermediate] Editing an Already-Approved Claim
- **Objective:** Make the "Editing an Already-Approved Claim" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Approved claims should be frozen — are they?
- **Hint 2:** The edit form still posts for claims of any status.
- **Hint 3:** Raise the amount of Alice’s approved $1,200 claim to $45,000.

## Pre-authorizations

### [Beginner] Pre-Authorization IDOR
- **Objective:** Make the "Pre-Authorization IDOR" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Pre-auth detail pages take a numeric id.
- **Hint 2:** Try a neighbour’s id while signed in as someone else.
- **Hint 3:** Open /preauth/1 as a different member — full details are served.

### [Advanced] Forged Pre-Authorization
- **Objective:** Make the "Forged Pre-Authorization" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** The pre-auth form carries hidden fields for the member and the status.
- **Hint 2:** Hidden fields are only suggestions — the server trusts them.
- **Hint 3:** Submit a pre-authorization with status=approved (optionally for another member) — it is stored as approved.

## Eligibility Checks

### [Beginner] Eligibility Summary IDOR
- **Objective:** Make the "Eligibility Summary IDOR" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** The eligibility summary URL ends with a member id.
- **Hint 2:** Change it.
- **Hint 3:** Open /eligibility/6 as another member to see their plan, usage and remaining coverage.

### [Advanced] Eligibility Check Trusts Client-Supplied Plan
- **Objective:** Make the "Eligibility Check Trusts Client-Supplied Plan" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** The eligibility checker asks which plan to check against.
- **Hint 2:** Your real plan is on your profile — but the form’s planId field is editable.
- **Hint 3:** As Carol (Bronze), check "Cosmetic rhinoplasty" with planId set to Gold — it answers ELIGIBLE for a treatment Bronze never covers.

## Plans & Coverage

### [Intermediate] Free Plan Upgrade (No Payment)
- **Objective:** Make the "Free Plan Upgrade (No Payment)" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** The Plans page offers upgrades.
- **Hint 2:** Watch what the upgrade request actually verifies.
- **Hint 3:** POST an upgrade to Gold — the plan changes instantly with no payment step at all.

## Provider Billing

### [Intermediate] Double Billing for the Same Claim
- **Objective:** Make the "Double Billing for the Same Claim" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** Claim 1 already has a paid bill.
- **Hint 2:** What stops a second bill against the same claim?
- **Hint 3:** Submit another bill referencing claim 1 — it is accepted too.

### [Advanced] Billing for Treatment Never Given
- **Objective:** Make the "Billing for Treatment Never Given" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A04 Insecure Design
- **Hint 1:** Providers submit bills directly to the insurer.
- **Hint 2:** Nothing ties a bill to a real visit or claim.
- **Hint 3:** As City Clinic, bill Dave for "Brain surgery" — Dave has claims, but never with City Clinic, yet the bill is accepted.

## Provider Directory

### [Beginner] Reflected XSS in Provider Search
- **Objective:** Make the "Reflected XSS in Provider Search" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A03 Injection
- **Hint 1:** The provider directory echoes your search term back.
- **Hint 2:** It echoes it exactly as typed.
- **Hint 3:** Search for a script payload — it comes back unescaped in the page.

## Admin Panel

### [Intermediate] CSRF on Admin Role Change
- **Objective:** Make the "CSRF on Admin Role Change" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A01 Broken Access Control
- **Hint 1:** Admin actions are plain POSTs.
- **Hint 2:** The hx_origin marker in admin forms is never verified by the server.
- **Hint 3:** As admin, POST to /admin/role with a cross-site Origin and no marker — the role change applies.

## Platform & API

### [Beginner] Unauthenticated Debug Data Dump
- **Objective:** Make the "Unauthenticated Debug Data Dump" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A05 Security Misconfiguration
- **Hint 1:** Developers love leaving debug endpoints behind.
- **Hint 2:** Try the obvious one.
- **Hint 3:** Open /debug with no login at all — every account, including passwords, is returned.

### [Intermediate] Weak API Token (Derived from Email)
- **Objective:** Make the "Weak API Token (Derived from Email)" test flip to DONE on the mission board by performing the real exploit against the running app.
- **OWASP:** A07 Auth Failures
- **Hint 1:** The API wants a Bearer token.
- **Hint 2:** The token is derived from something public.
- **Hint 3:** Use hhi_ followed by the base64 of a member’s email as the token for /api/claims — it authenticates as that member.
