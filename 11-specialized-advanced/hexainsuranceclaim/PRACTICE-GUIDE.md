# HexaInsuranceClaim (LAB 107) — Practice Guide

Challenges grouped by feature, then difficulty. Each mirrors the /tests Mission Board.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: String-built queries let an attacker rewrite the login logic itself — no password is needed when the query can be made always-true.
- Measurable goal: the "SQL Injection Login Bypass" test flips to done on /tests by performing the exploit.
- Hint 1: The login form builds its database query by gluing your input straight into the query text.
- Hint 2: Try a classic tautology in the email field so the WHERE clause is always true, and comment out the rest.
- Hint 3: Email: ' OR '1'='1' --  with any password logs you in as the first account in the table.

### Brute Force — No Login Throttling (Beginner)
- Objective: Without throttling or lockout, password guessing is only a matter of time and wordlist size.
- Measurable goal: the "Brute Force — No Login Throttling" test flips to done on /tests by performing the exploit.
- Hint 1: Notice what happens after several wrong passwords for the same account — does anything slow down or lock?
- Hint 2: Script 10+ wrong passwords for one account and watch whether every attempt is still processed normally.
- Hint 3: There is no lockout, no CAPTCHA and no delay: the 10th wrong password is answered exactly like the 1st.

### Account Enumeration via Login & Reset Responses (Beginner)
- Objective: Different error messages for "no such user" and "wrong password" turn your login form into an account-existence oracle.
- Measurable goal: the "Account Enumeration via Login & Reset Responses" test flips to done on /tests by performing the exploit.
- Hint 1: Compare the error message for an email that exists with a wrong password vs an email that does not exist at all.
- Hint 2: The forgot-password form answers differently too. Probe at least 5 different emails across the two forms.
- Hint 3: Existing account + wrong password says "Incorrect password"; unknown email says "No account with that email" — a perfect oracle for harvesting valid accounts.

### Published Demo / Default Admin Credentials (Beginner)
- Objective: Default and demo credentials printed on the login page are an open door — attackers try them before anything clever.
- Measurable goal: the "Published Demo / Default Admin Credentials" test flips to done on /tests by performing the exploit.
- Hint 1: Read the login page carefully — it helpfully lists demo accounts for testers.
- Hint 2: One of the published demo accounts is the administrator, with a password that matches its role name pattern.
- Hint 3: Log in with the published admin demo credentials shown on the login page.

### Predictable Password Reset Token (Intermediate)
- Objective: A reset token derived from public data (the user id) with simple arithmetic is not a secret — it is a formula anyone can compute.
- Measurable goal: the "Predictable Password Reset Token" test flips to done on /tests by performing the exploit.
- Hint 1: Request a reset for your own account and look at the token format — then look at your numeric user id.
- Hint 2: The token is a short prefix plus your id and a simple arithmetic function of that id (multiply, then add).
- Hint 3: Token format: HIC<id>-<id*137+42>. Compute it for any user id — it works even when no reset was ever requested.

### Role Cookie Tampering (hx_role) (Intermediate)
- Objective: Authorisation decisions must be made from server-side session data, never from values the client can edit.
- Measurable goal: the "Role Cookie Tampering (hx_role)" test flips to done on /tests by performing the exploit.
- Hint 1: After login, inspect your cookies — one of them repeats your role back to the server.
- Hint 2: The adjuster and admin areas trust that cookie instead of checking the account on the server.
- Hint 3: Set your hx_role cookie to "adjuster" or "admin" and reload /adjuster or /admin.

## Registration & Profile

### Weak Password Policy at Registration (Beginner)
- Objective: A password policy that exists only as page text protects nothing — enforcement must happen on the server.
- Measurable goal: the "Weak Password Policy at Registration" test flips to done on /tests by performing the exploit.
- Hint 1: The registration form claims a minimum password length — test whether it is actually enforced.
- Hint 2: Try registering with a password far below the stated minimum.
- Hint 3: A 1-character password is accepted and the account works immediately.

### Stored XSS in Display Name (Beginner)
- Objective: Any user-controlled text rendered without encoding becomes stored XSS when staff view it.
- Measurable goal: the "Stored XSS in Display Name" test flips to done on /tests by performing the exploit.
- Hint 1: Your display name is shown back in staff views exactly as typed.
- Hint 2: Register (or rename yourself) with a name that is actually an HTML/JS payload.
- Hint 3: A name like <script>alert(1)</script> is stored and rendered raw in the admin user list.

### Mass Assignment — Role Granted at Registration (Intermediate)
- Objective: Binding request fields directly onto the account object lets attackers set privileged attributes the UI never offered.
- Measurable goal: the "Mass Assignment — Role Granted at Registration" test flips to done on /tests by performing the exploit.
- Hint 1: The registration endpoint copies more of your submitted form into the new account than the visible fields suggest.
- Hint 2: Add fields the form never shows you — think about which account attributes would be valuable.
- Hint 3: POST /register with an extra field role=adjuster (or admin) and the new account is created with that role.

### CSRF on Profile Update (Intermediate)
- Objective: State-changing endpoints without an anti-CSRF token can be triggered by any website the victim visits while logged in.
- Measurable goal: the "CSRF on Profile Update" test flips to done on /tests by performing the exploit.
- Hint 1: Legit profile forms carry a hidden hx_marker field tied to your session. What happens if it is missing?
- Hint 2: Replay the profile update POST without the hx_marker field (e.g. from a raw curl request).
- Hint 3: The update is applied with no marker check at all — a cross-site form could do the same in a victim's browser.

## Claims

### Claim IDOR — Read Another Policyholder's Claim (Beginner)
- Objective: Sequential object ids plus no ownership check equals a full read of every customer's private claims.
- Measurable goal: the "Claim IDOR — Read Another Policyholder's Claim" test flips to done on /tests by performing the exploit.
- Hint 1: Claim pages live at predictable numeric URLs like /claim/2.
- Hint 2: Log in as one policyholder and open a claim that belongs to someone else.
- Hint 3: No ownership check is done — any logged-in policyholder can read any claim, including amounts and descriptions.

### Claim Amount Inflation Beyond Coverage Limit (Intermediate)
- Objective: Business limits (coverage caps) must be enforced server-side at the moment data changes, not just displayed in the UI.
- Measurable goal: the "Claim Amount Inflation Beyond Coverage Limit" test flips to done on /tests by performing the exploit.
- Hint 1: Your policy has a coverage limit. The claim update form lets you edit the claimed amount — does the server compare them?
- Hint 2: Edit your own claim and raise the amount far above your policy's coverage limit.
- Hint 3: Amounts above the coverage limit are saved without complaint — the policy terms say payouts must stay within the limit.

### Edit Another Policyholder's Claim (Intermediate)
- Objective: Read-only IDOR often hides a write IDOR next door: if you can view it, check whether you can also change it.
- Measurable goal: the "Edit Another Policyholder's Claim" test flips to done on /tests by performing the exploit.
- Hint 1: The claim update endpoint takes a claim id — try posting an update to a claim that is not yours.
- Hint 2: Change the description or amount of someone else's claim via POST /claim/<id>/update.
- Hint 3: The update is saved even though you do not own the claim.

### Claim Status Forgery via Edit Form (Intermediate)
- Objective: Workflow state must transition only through guarded server-side steps — never from client-supplied fields.
- Measurable goal: the "Claim Status Forgery via Edit Form" test flips to done on /tests by performing the exploit.
- Hint 1: The update handler copies several posted fields onto the claim — including one it should only take from adjusters.
- Hint 2: Add a status field to your own claim's update POST.
- Hint 3: POST /claim/<id>/update with status=approved flips your own claim to approved without any adjuster.

## Adjuster & Approvals

### Internal Adjuster Notes Leaked to Policyholder (Beginner)
- Objective: Fields intended for staff eyes must be filtered from customer responses, not merely hidden with CSS.
- Measurable goal: the "Internal Adjuster Notes Leaked to Policyholder" test flips to done on /tests by performing the exploit.
- Hint 1: One seeded claim carries confidential internal notes about a fraud suspicion. Whose screen do they appear on?
- Hint 2: Log in as the owner of Bob's water-damage claim (claim 2) and open its detail page.
- Hint 3: The internal SIU note is rendered on the customer-facing claim page — it was only ever meant for staff.

### Approval Endpoint Missing Role Check (Intermediate)
- Objective: Hiding a button is not access control. Every privileged endpoint must verify the caller's role on the server.
- Measurable goal: the "Approval Endpoint Missing Role Check" test flips to done on /tests by performing the exploit.
- Hint 1: The adjuster approval action is just a POST to /adjuster/approve/<claimId>. Who is allowed to call it?
- Hint 2: Call it as a plain policyholder on your own claim — the UI hides the button, but the endpoint may not check.
- Hint 3: Any logged-in user can approve any claim: the endpoint never verifies the adjuster role.

### Payout Set Above the Claimed Amount (Intermediate)
- Objective: Money-out fields need server-side sanity bounds against the underlying claim and policy, whoever submits them.
- Measurable goal: the "Payout Set Above the Claimed Amount" test flips to done on /tests by performing the exploit.
- Hint 1: When approving, a payout figure is submitted with the request. Is it compared to the claimed amount?
- Hint 2: Approve a claim while supplying a payout far larger than the amount claimed.
- Hint 3: The payout is stored unchecked — approve a $2,500 claim with payout=999999 and it sticks.

## Evidence & Documents

### Evidence Download IDOR (Beginner)
- Objective: Attachments inherit the sensitivity of the claim — they need the same ownership checks as the claim itself.
- Measurable goal: the "Evidence Download IDOR" test flips to done on /tests by performing the exploit.
- Hint 1: Evidence files have their own numeric download URLs (/evidence/<id>).
- Hint 2: As one policyholder, download an evidence file that belongs to another customer's claim.
- Hint 3: No ownership check: any logged-in user can download any evidence file by guessing its id.

### Unrestricted Evidence Upload (Stored HTML) (Intermediate)
- Objective: Upload features must validate type by content, store safely, and serve with safe content types — extension trust is not enough.
- Measurable goal: the "Unrestricted Evidence Upload (Stored HTML)" test flips to done on /tests by performing the exploit.
- Hint 1: Evidence upload accepts a filename and content. What file types does it refuse?
- Hint 2: Upload an evidence file whose name ends in .html and whose content is a script payload, then open it.
- Hint 3: The file is stored and served back as text/html from the portal domain — a stored XSS page on the insurer's own site.

### Path Traversal in Document Download (Intermediate)
- Objective: Filenames from users must be resolved and confined to the intended directory — string concatenation is not confinement.
- Measurable goal: the "Path Traversal in Document Download" test flips to done on /tests by performing the exploit.
- Hint 1: The /download endpoint serves files from the docs folder using the name you give it.
- Hint 2: What happens if the name contains ../ sequences that climb out of the docs folder?
- Hint 3: /download?file=../server.js serves the application's own source code.

## Payouts

### Payout Record IDOR (Beginner)
- Objective: Financial records are prime IDOR targets — every record view needs an ownership or role decision.
- Measurable goal: the "Payout Record IDOR" test flips to done on /tests by performing the exploit.
- Hint 1: Payout records live at /payouts/<id> with sequential ids.
- Hint 2: As a policyholder, open a payout record that belongs to another customer.
- Hint 3: Payout amounts and claim links of other customers are served without any ownership check.

### Double Payout — No Idempotency on Release (Advanced)
- Objective: Money-moving actions must be idempotent and state-guarded: once paid, a claim must refuse further payouts.
- Measurable goal: the "Double Payout — No Idempotency on Release" test flips to done on /tests by performing the exploit.
- Hint 1: An approved claim can be paid via POST /adjuster/payout/<claimId>. What stops it being called twice?
- Hint 2: Approve a claim, release its payout, then release it again and compare the payout records / totals.
- Hint 3: Every call creates a fresh payout: the same claim can be paid again and again, exceeding the approved amount.

## Search

### Reflected XSS in Search Results (Beginner)
- Objective: Reflected output must be encoded even when it "only" echoes the user's own input — links make it someone else's browser.
- Measurable goal: the "Reflected XSS in Search Results" test flips to done on /tests by performing the exploit.
- Hint 1: The results page repeats your search term back to you in the heading.
- Hint 2: Put an HTML payload in the search box and view the page source of the results.
- Hint 3: Your term is reflected unescaped — <script>alert(1)</script> lands raw in the page.

### SQL Injection in Claim Search (Intermediate)
- Objective: Every string-built query is an injection point, not just the login form — search is a favourite because it returns data directly.
- Measurable goal: the "SQL Injection in Claim Search" test flips to done on /tests by performing the exploit.
- Hint 1: Search builds a LIKE query from your term by string concatenation, just like the login did.
- Hint 2: A tautology in the search box can dump rows that normal searches never show — including non-customer records.
- Hint 3: Search for ' OR '1'='1' --  and the hidden internal investigation claim appears in the results.

## Admin & Platform

### Unauthenticated Debug Endpoint Data Dump (Beginner)
- Objective: Debug and diagnostic endpoints must never ship to production, and certainly not without authentication.
- Measurable goal: the "Unauthenticated Debug Endpoint Data Dump" test flips to done on /tests by performing the exploit.
- Hint 1: Development leftovers often live at predictable paths like /api/debug.
- Hint 2: Fetch /api/debug without logging in at all.
- Hint 3: It returns every user (with passwords), policy and claim as JSON — no authentication required.

### CSRF on Admin User Deactivation (Intermediate)
- Objective: Privileged actions are the most important ones to protect with anti-CSRF tokens — their impact is the highest.
- Measurable goal: the "CSRF on Admin User Deactivation" test flips to done on /tests by performing the exploit.
- Hint 1: Admin actions are plain POSTs. Compare them with the profile form — do they carry the hx_marker token?
- Hint 2: Replay POST /admin/deactivate/<userId> as admin without the hx_marker field.
- Hint 3: The account is deactivated with no CSRF token check — a malicious page could fire this from an admin's browser.
