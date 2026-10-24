# HexaInsurance (LAB 47) — Practice Guide

Hands-on challenges, grouped by feature and ordered by difficulty. Each
challenge has a measurable objective (the matching test on the /tests page
flips to done) and 3 graded hints. Try at least 3 times before opening the
walkthrough — the Lab Coach enforces the same rule.

## Login & Authentication

### SQL Injection — Login Bypass (Beginner · A03:2021 – Injection)
- **Objective:** Make the "SQL Injection — Login Bypass" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The login form builds its lookup by gluing your input straight into a query string.
- **Hint 2:** Try a quote character in the email field and see how the app reacts.
- **Hint 3:** Classic payload in the email field: ' OR '1'='1 — with any password.
- **Walkthrough:** Step by step: 1) Log out and open the login page. 2) In the Email field type: ' OR '1'='1  3) Type any password and submit. The query is built by string concatenation, so your input rewrites the WHERE clause and the first matching user — the platform admin — is signed in.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.

### Brute Force — No Login Throttling (Beginner · A07:2021 – Authentication Failures)
- **Objective:** Make the "Brute Force — No Login Throttling" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Keep guessing the same account's password — does anything ever slow you down or lock the account?
- **Hint 2:** Try 10 wrong passwords in a row for bob@test.local.
- **Hint 3:** The flaw is proven when the 10th failure is still processed like the first.
- **Walkthrough:** Step by step: 1) Pick an account, e.g. bob@test.local. 2) Submit a wrong password. 3) Repeat at least 10 times in a row. Notice nothing changes: no delay, no CAPTCHA, no lockout. The test passes on the 10th processed failure — that missing throttle IS the vulnerability.
- **Lesson:** Without rate limiting or lockout, a login form is an unlimited password-guessing machine.

### User Enumeration via Login Errors (Beginner · A07:2021 – Authentication Failures)
- **Objective:** Make the "User Enumeration via Login Errors" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Compare the error for an email that exists with one that does not.
- **Hint 2:** Try alice@test.local with a wrong password, then a made-up email with any password.
- **Hint 3:** Two different error messages = a free list of valid accounts.
- **Walkthrough:** Step by step: 1) Submit a login for alice@test.local with a WRONG password and read the error: 'Incorrect password.' 2) Submit a login for an email that does not exist, e.g. ghost@nowhere.local: 'No account found for that email.' 3) The two different answers confirm which emails are real accounts.
- **Lesson:** Different error messages for "no such account" and "wrong password" confirm which emails are registered — the first step of every targeted attack.

### Default Demo Credentials Still Active (Beginner · A07:2021 – Authentication Failures)
- **Objective:** Make the "Default Demo Credentials Still Active" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The login page itself is generous — read everything on it carefully.
- **Hint 2:** A demo account is advertised so visitors can "look around".
- **Hint 3:** Sign in with demo@hexainsure.local / demo123.
- **Walkthrough:** Step by step: 1) Read the login page carefully — it advertises a demo account. 2) Sign in with demo@hexainsure.local and password demo123. 3) You are inside a live policyholder account. Seeded/demo credentials must never survive into production.
- **Lesson:** Demo and default accounts shipped to production are open doors — attackers try the published credentials first.

### Predictable Password-Reset Token (Intermediate · A07:2021 – Authentication Failures)
- **Objective:** Make the "Predictable Password-Reset Token" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Request a password reset, then think about how the token could be produced.
- **Hint 2:** The token is derived from something public about the account — its email address.
- **Hint 3:** It is the first 10 hex characters of md5(email). Compute it and post it to the reset form.
- **Walkthrough:** Step by step: 1) The reset token is the first 10 hex characters of md5(email) — the email is public, so the token is computable. 2) In a terminal: printf 'alice@test.local' | md5sum, take the first 10 characters. 3) Open 'Forgot password', then the reset form, and submit the email, your computed token, and a new password. It is accepted.
- **Lesson:** A reset token is only as strong as its unpredictability — a token derived from the email address can be computed by anyone.

### Role Cookie Tampering — Admin Trusts the Browser (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Role Cookie Tampering — Admin Trusts the Browser" test pass on the /tests page by performing the real exploit.
- **Hint 1:** After login, inspect the cookies the portal sets — one of them describes your role.
- **Hint 2:** Cookies live in your browser, so you can rewrite them. What does /admin believe?
- **Hint 3:** Set the hx_role cookie to "admin" while signed in as a normal customer and visit /admin.
- **Walkthrough:** Step by step: 1) Sign in as a customer (Alice). 2) Open your browser's cookie storage for this site and find hx_role — it says 'customer'. 3) Change its value to 'admin'. 4) Visit /admin. The console reads your role from the cookie you control instead of the server-side account.
- **Lesson:** Authorization data stored unsigned on the client is not authorization — the server must decide roles from its own records.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords (Beginner · A07:2021 – Authentication Failures)
- **Objective:** Make the "Weak Password Policy — 1-Character Passwords" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Register a new account and be as lazy as possible with the password.
- **Hint 2:** Does the form enforce any length or complexity at all?
- **Hint 3:** A password of a single character — "a" — is accepted.
- **Walkthrough:** Step by step: 1) Open Register. 2) Create an account with the password set to a single character: a. 3) It is accepted. A password policy (length + breached-password screening) is the missing control.
- **Lesson:** If the portal allows it, users will choose terrible passwords — the policy is the only defence most accounts have.

### Stored XSS in Display Name (Beginner · A03:2021 – Injection)
- **Objective:** Make the "Stored XSS in Display Name" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Your display name is shown back on every page — in the greeting, the profile, and agent views.
- **Hint 2:** What if your name were not a name at all, but markup?
- **Hint 3:** Register (or rename yourself) with a name like <script>alert(1)</script> — it is stored and rendered unescaped.
- **Walkthrough:** Step by step: 1) Register (or use Profile) with the display name set to a payload: <script>alert(1)</script>. 2) The name is stored as-is. 3) Browse the app — the greeting in the header renders your 'name' as markup, and the same happens for agents/admins who view lists containing you.
- **Lesson:** Any field that is stored and later rendered is an XSS carrier if output is not encoded — names are a classic hiding place.

### Mass Assignment — Self-Assign the Agent Role (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Mass Assignment — Self-Assign the Agent Role" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The registration form shows three fields — but the server may accept more than it shows.
- **Hint 2:** What happens if the request also carries a "role" field?
- **Hint 3:** Register with an extra field: role=agent. Then check what your new account can do.
- **Walkthrough:** Step by step: 1) Intercept or craft the registration request (the form posts name, email, password). 2) Add one more field to the POST body: role=agent. 3) Submit. The server binds the whole body, so your new account is created as an agent — sign in and open /agent to confirm.
- **Lesson:** Binding a whole request body to a database record lets attackers set fields the form never offered — including the role.

### CSRF on Profile Update (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "CSRF on Profile Update" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The profile form carries a hidden marker field — the server never actually checks it.
- **Hint 2:** Replay the profile-update request without the marker, or from a foreign Origin.
- **Hint 3:** The change is applied anyway: the anti-CSRF marker is decoration.
- **Walkthrough:** Step by step: 1) Sign in and open Profile — note the hidden marker field in the form. 2) Replay the POST to /profile/update WITHOUT the marker field (or with an Origin header from another site). 3) The change is applied anyway — the marker is never verified server-side.
- **Lesson:** A CSRF token that is not verified is not a control — state-changing forms must prove the request came from the app's own pages.

## Policies & Coverage

### Policy IDOR — Read Any Customer's Policy (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Make the "Policy IDOR — Read Any Customer's Policy" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Your policy pages live at /policies/<id> with small sequential ids.
- **Hint 2:** The list shows only your policies — but does the detail page check ownership?
- **Hint 3:** Sign in as Alice and open /policies/3 — that one belongs to Bob.
- **Walkthrough:** Step by step: 1) Sign in as Alice and open your own policy (id 1). 2) Change the URL to /policies/3. 3) Bob's Home Shield Plus policy renders in full — coverage, premium, everything. The detail page never checks that the policy belongs to you.
- **Lesson:** Hiding an object from the list is not access control — every object request must check the requester owns it.

### Reflected XSS in Policy Search (Beginner · A03:2021 – Injection)
- **Objective:** Make the "Reflected XSS in Policy Search" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The results page repeats your search text back to you: "Results for …".
- **Hint 2:** Does it repeat markup as markup?
- **Hint 3:** Search for <script>alert(1)</script> and view the page source.
- **Walkthrough:** Step by step: 1) In the policy search, search for: <script>alert(1)</script>  2) Open the results page and view source. 3) Your input is reflected unescaped in the 'Results for' line — markup you control, executed in the portal origin.
- **Lesson:** Reflected input is still dangerous output — anything echoed into a page must be encoded, even "just the search term".

### Coverage Tampering via Mass Assignment (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Coverage Tampering via Mass Assignment" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The "manage policy" form posts coverage and premium fields back to the server.
- **Hint 2:** The server saves what it is given — including numbers it should compute itself.
- **Hint 3:** Edit the coverageLimit field (e.g. to 999999) or drop the premium before submitting the policy update.
- **Walkthrough:** Step by step: 1) Open your own policy and find the 'Manage policy' update form — it posts coverageLimit and premium back to the server. 2) Change coverageLimit to 999999 (and/or lower the premium). 3) Submit and reload: the contract terms are now whatever you typed. Price and coverage must be computed server-side, never bound from the request.
- **Lesson:** Fields that define the contract — coverage limits and premiums — must be server-computed; a form that posts them back is an invitation to rewrite the contract.

### SQL Injection in Policy Search (Intermediate · A03:2021 – Injection)
- **Objective:** Make the "SQL Injection in Policy Search" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The policy search box feeds your text into a lookup query.
- **Hint 2:** A quote character is the classic first probe.
- **Hint 3:** Search for ' OR '1'='1 and watch whose policies come back.
- **Walkthrough:** Step by step: 1) Open the policy search. 2) Search for: ' OR '1'='1  3) Instead of only your policies, the results list every customer's policies — the search text was glued into a query.
- **Lesson:** Search boxes are query builders — unparameterised search is the same injection flaw as a login form, with the whole book of business behind it.

## Claims

### Claim IDOR — Read Any Customer's Claim (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Make the "Claim IDOR — Read Any Customer's Claim" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Claims live at /claims/<id>, sequential like the policies.
- **Hint 2:** Your claim list is scoped to you — the detail page is not.
- **Hint 3:** As Alice, open /claims/2 — Bob's storm-damage claim, amounts and all.
- **Walkthrough:** Step by step: 1) Sign in as Alice and open your claim (id 1). 2) Change the URL to /claims/2. 3) Bob's storm-damage claim renders in full. Same IDOR pattern as policies — claims were never ownership-checked either.
- **Lesson:** Claim files hold sensitive incident details and amounts; an id in the URL is not permission.

### Evidence Download IDOR — Other Customers' Files (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Make the "Evidence Download IDOR — Other Customers' Files" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Evidence files download from /evidence/<id> — small sequential ids again.
- **Hint 2:** The download never asks whose claim the file belongs to.
- **Hint 3:** As Alice, download /evidence/2 — Bob's roof-damage evidence pack.
- **Walkthrough:** Step by step: 1) Sign in as Alice. 2) Your own evidence is at /evidence/1. 3) Request /evidence/2 — Bob's roof-damage evidence pack downloads. The download endpoint never checks whose claim the file belongs to.
- **Lesson:** Download endpoints are object accesses too — every file fetch needs the same ownership check as the page that links to it.

### Claim Amount Above Coverage Limit Accepted (Intermediate · A04:2021 – Insecure Design)
- **Objective:** Make the "Claim Amount Above Coverage Limit Accepted" test pass on the /tests page by performing the real exploit.
- **Hint 1:** When you file a claim, YOU type the amount. Does the server compare it with anything?
- **Hint 2:** Your Auto Protect policy covers $20,000. What does the form think of $50,000?
- **Hint 3:** File a claim on your own policy with an amount far above its coverage limit — it is accepted and queued for review.
- **Walkthrough:** Step by step: 1) Check your Auto Protect policy: coverage limit $20,000. 2) File a new claim on that policy and set the amount to 50000. 3) Submit — the claim is created and queued 'under review' at $50,000. The server never compares the amount with the coverage it is claimed against.
- **Lesson:** Business rules are security rules: if the client supplies the number, the server must validate it against the policy's actual coverage.

### Unrestricted Evidence Upload — HTML Served Inline (Intermediate · A03:2021 – Injection)
- **Objective:** Make the "Unrestricted Evidence Upload — HTML Served Inline" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Evidence "uploads" take any filename and any content — the portal never asks what kind of file it is.
- **Hint 2:** What if the evidence file were an HTML page with a script in it?
- **Hint 3:** Upload evidence named proof.html containing a script payload, then open its /evidence link — it is served as text/html from the portal origin.
- **Walkthrough:** Step by step: 1) Open one of your claims and find the evidence upload form (filename + content). 2) Upload a file named proof.html whose content is an HTML page with a <script> in it. 3) Open the new evidence's download link: it is served as text/html from the portal's own origin, so the script runs as the portal.
- **Lesson:** An upload feature that stores and re-serves arbitrary content turns your own domain into the attacker's hosting.

## Renewals & Billing

### Renewal Premium Manipulation — Pay $1 Instead of $340 (Intermediate · A04:2021 – Insecure Design)
- **Objective:** Make the "Renewal Premium Manipulation — Pay $1 Instead of $340" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The renewal form carries the premium as a hidden field, computed in the page.
- **Hint 2:** Hidden fields are only hidden from people who do not look.
- **Hint 3:** Intercept the renewal POST for your Auto policy and change premium from 340 to 1 — the renewal goes through at $1.
- **Walkthrough:** Step by step: 1) Open your Auto Protect policy (renewal premium $340) and intercept the renewal POST — the premium travels as a form field. 2) Change premium to 1. 3) Submit: the policy renews and the recorded renewal premium is $1. Prices must be recomputed on the server.
- **Lesson:** Prices must be recomputed on the server at the moment of the transaction; any price that travels through the client is negotiable.

### Renew Another Customer's Policy (Action IDOR) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Renew Another Customer's Policy (Action IDOR)" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Renewal is a POST to /policies/<id>/renew — and ids are sequential.
- **Hint 2:** Reading a policy checks nothing here; does acting on one check more?
- **Hint 3:** As Alice, POST a renewal for policy 3 — Bob's policy. It renews.
- **Walkthrough:** Step by step: 1) Sign in as Alice. 2) Send the renewal POST to /policies/3/renew (Bob's policy), with his normal renewal premium. 3) The renewal is applied to a policy you do not own — the action endpoint never checks ownership.
- **Lesson:** State-changing actions need authorization even more than reads — an id in the URL plus a POST is not consent from the owner.

## Agent Portal

### Agent Claims Queue Visible to Any Policyholder (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Make the "Agent Claims Queue Visible to Any Policyholder" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Agents work from /agent. The route exists for every signed-in user to try.
- **Hint 2:** The portal checks that you are logged in — it forgets to check WHAT you are.
- **Hint 3:** Sign in as a normal customer and open /agent: the full claims queue, every customer, every amount.
- **Walkthrough:** Step by step: 1) Sign in as a normal customer (Alice). 2) Browse directly to /agent. 3) The full claims queue renders — every customer, claim, and amount. The route verifies only that SOMEONE is logged in, never that they are staff.
- **Lesson:** Authentication is not authorization: a staff-only page must verify the staff role on the server, every time.

### Claim Decision by Non-Agent — Approve Your Own Claim (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Claim Decision by Non-Agent — Approve Your Own Claim" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The queue's approve/reject action posts to /agent/claims/<id>/decide.
- **Hint 2:** If the page forgot the role check, the action behind it probably did too.
- **Hint 3:** As Alice, POST a decision of "approved" for your own claim (CLM-501) — it is approved. By you.
- **Walkthrough:** Step by step: 1) Sign in as Alice; your claim CLM-501 is 'under review'. 2) POST to /agent/claims/1/decide with decision=approved. 3) Your claim is now approved — decided by you. The decision endpoint performs no role check at all.
- **Lesson:** Every privileged action endpoint must re-check the caller's role — hiding the button is not a control.

## Admin Panel

### Admin User Deactivation via GET (CSRF) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Make the "Admin User Deactivation via GET (CSRF)" test pass on the /tests page by performing the real exploit.
- **Hint 1:** In the admin console, "Deactivate" is a plain link — a GET request that changes state.
- **Hint 2:** GETs are fired by browsers for images, links, and prefetch — no form, no token.
- **Hint 3:** As admin, simply visiting /admin/users/5/deactivate disables Carol's account — imagine that URL in an email to the admin.
- **Walkthrough:** Step by step: 1) Sign in as the admin and open /admin. 2) Notice 'Deactivate' is a plain link. 3) Visit /admin/users/5/deactivate directly — a bare GET, no form, no token — and Carol's account is disabled. Any page that makes an admin's browser load that URL fires it.
- **Lesson:** State changes must never ride on GET, and every admin action needs a verified anti-CSRF token.

## Platform & API

### Unauthenticated API Dumps Every Policyholder (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Make the "Unauthenticated API Dumps Every Policyholder" test pass on the /tests page by performing the real exploit.
- **Hint 1:** The portal has a JSON API for "partners": /api/policyholders.
- **Hint 2:** Try it in a private window — signed out completely.
- **Hint 3:** No token, no login: the full policyholder list with emails and phone numbers comes back as JSON.
- **Walkthrough:** Step by step: 1) Sign out completely (or use a private window). 2) Request /api/policyholders. 3) Full JSON comes back: every policyholder's name, email, phone, and their policies. No token was ever asked for.
- **Lesson:** APIs are doors too — an endpoint without authentication is a public data feed, whatever the UI shows.

### Missing Security Headers (Beginner · A05:2021 – Security Misconfiguration)
- **Objective:** Make the "Missing Security Headers" test pass on the /tests page by performing the real exploit.
- **Hint 1:** Look at the response headers of any page — what is NOT there?
- **Hint 2:** No Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options.
- **Hint 3:** Simply loading the dashboard demonstrates it: the portal sends none of the standard protective headers.
- **Walkthrough:** Step by step: 1) Sign in and load the dashboard. 2) Inspect the response headers (browser dev tools → Network, or curl -I). 3) There is no Content-Security-Policy, no X-Frame-Options, no X-Content-Type-Options — the test passes on observation because the headers genuinely are absent.
- **Lesson:** Security headers are cheap, broad protection — their absence leaves clickjacking and MIME-sniffing doors open that cost nothing to close.

