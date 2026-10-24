# HexaLoan — Practice Guide (LAB 46)

Challenges grouped by feature. Try each one yourself first — the Lab Coach unlocks step-by-step help after 3 real attempts on a feature. Hints reveal in order: nudge → stronger → near-answer.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The login form builds its query by gluing your input straight into a string.
- Hint 2: Try a classic tautology in the email field, e.g. something with ' OR '1'='1.
- Hint 3: Use email: ' OR '1'='1' -- with any password — the query matches the first user (the admin).

### Brute Force — No Rate Limit or Lockout (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Keep guessing passwords for one account — does anything ever slow you down?
- Hint 2: Count the failures: 5, 10, 20… the form never locks or delays.
- Hint 3: Submit 10+ wrong passwords for alice@test.local in a row; every attempt is still processed.

### User Enumeration via Login & Reset Responses (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Compare the error for an email that exists with one that does not.
- Hint 2: “No account found” vs “Incorrect password” tells you exactly which emails are registered.
- Hint 3: Try a wrong password for alice@test.local, then any password for nobody@test.local — the messages differ.

### Weak / Default Demo Credentials (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Every platform ships with a demo account. What password would a demo use?
- Hint 2: Think product demos: demo@… and the most predictable password in the world.
- Hint 3: Log in with demo@hexaloan.local / password — a seeded demo account with a dictionary password.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Request a reset and look at the pattern of the token the “email” would contain.
- Hint 2: The token is built from something public about the account — its numeric id.
- Hint 3: Token = RST-<userId>-<userId*73+11>. Alice is user 4, so her token is RST-4-303. Compute it and reset her password.

### Session Role Cookie Tampering (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: After login, inspect the cookies the app sets. One of them describes WHO you are.
- Hint 2: The server trusts a client-side cookie for your role instead of checking its own records.
- Hint 3: Set the hx_role cookie to admin and visit /admin — the gate believes your browser, not the database.

## Registration & Profile

### Weak Password Policy at Registration (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Register a new account and see how short a password you can get away with.
- Hint 2: There is no length or complexity check at all.
- Hint 3: Register with the one-character password “x” — the account is created happily.

### Mass Assignment — Credit Score & Role via Profile Update (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The profile form shows name and phone. The handler is less picky than the form.
- Hint 2: Profile update applies every field you POST, including ones never rendered.
- Hint 3: POST /profile with creditScore=850 (or role=officer) added — your verified financial profile changes instantly.

### Stored XSS in Display Name (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Your display name is shown to staff in the approval queue. Is it escaped there?
- Hint 2: Put an HTML/JS payload where your name goes and see how it renders for others.
- Hint 3: Set your display name to <script>alert(1)</script> (or an <img onerror> payload) — it is stored and rendered raw in the staff dashboard.

### CSRF on Profile Update (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Profile changes need only your session cookie — no anti-CSRF token anywhere.
- Hint 2: The app sets an hx_origin marker cookie on its own pages; a cross-site POST will not have it.
- Hint 3: From a “foreign” origin (or with no marker cookie), POST a name change to /profile — it is applied silently.

## Loan Applications

### Application IDOR — Other Borrowers’ Financial Data (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Your application lives at /loans/<id>. What stops you changing the number?
- Hint 2: Ownership is never checked when an application is served.
- Hint 3: Log in as Bob and open /loans/1 — Alice’s application, income and credit score are all displayed.

### Eligibility Tampering — Declared Income & Credit Score Trusted (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The application form pre-fills YOUR income and credit score — and lets you edit them.
- Hint 2: Eligibility is decided from the numbers in the request, not from your verified profile.
- Hint 3: As Bob (real score 610, income 42000) apply with creditScore=760 and income=95000 — the platform declares you eligible.

### Loan Amount Above Platform Cap Accepted (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The form says the platform cap is $50,000. Is that enforced anywhere but the label?
- Hint 2: Client-side limits are decorations. POST a bigger number.
- Hint 3: Create an application with amount=250000 — it is accepted and stored despite the $50,000 cap.

### Application Status Forgery — Self-Disbursement (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: A convenience endpoint lets owners “update status”. It trusts whatever status you send.
- Hint 2: Draft → submitted is the intended step. The endpoint does not restrict the target state.
- Hint 3: POST /loans/<your draft id>/status with status=disbursed — your unreviewed loan jumps straight to paid-out.

## Approval Workflow

### Self-Approval of Own Loan Application (Advanced)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Approval is a staff action — but what does the approval endpoint actually check?
- Hint 2: Combine what you know: how does the app decide you are “staff”?
- Hint 3: As a borrower, set hx_role=officer, get your loan verified, then POST /staff/loans/<your id>/approve — you approved your own loan.

### Verification Step Skipped Before Approval (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The workflow is submit → verify → approve. Does approve actually require the verify step?
- Hint 2: Try approving a loan that is still only “submitted”.
- Hint 3: As the officer, POST /staff/loans/3/approve while loan 3 was never verified — approval succeeds anyway.

### Rejected Loan Can Be Approved Afterwards (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: A rejected application should be final. Is it?
- Hint 2: The approve action never looks at the current status before overwriting it.
- Hint 3: As the officer, approve loan 6 — it was already rejected, yet it flips to approved.

## Repayments

### Repayment Schedule IDOR (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Schedules live under the loan URL: /loans/<id>/schedule.
- Hint 2: Like the application itself, the schedule read skips the ownership check.
- Hint 3: As Alice, open /loans/5/schedule — Carol’s full repayment schedule is shown.

### Underpayment Marked as Paid in Full (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The repayment form has a “settle in full” convenience flag. Who verifies the amount?
- Hint 2: Pay a tiny amount but claim the installment is settled.
- Hint 3: On your disbursed loan, POST a repayment of amount=1 with settleFull=true — the $1,250 installment is marked PAID.

### Forged Settlement Amount Closes the Loan (Advanced)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The “settle loan” action asks how much was paid — and believes the answer.
- Hint 2: Your real payments are tracked separately from the number you declare at settlement.
- Hint 3: POST /loans/<your id>/settle with paidAmount equal to the full loan amount while you have actually paid almost nothing — the loan closes as SETTLED.

## Documents

### Document IDOR — Others’ Income Proofs (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Documents download from /documents/<id>/download with sequential ids.
- Hint 2: The download handler never asks whose document it is.
- Hint 3: As Bob, download document 1 — Alice’s payslip, with her salary, is served to you.

### Unrestricted Upload — HTML Served from Platform Origin (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The document upload accepts any “file”. What does it do with an .html one?
- Hint 2: Uploaded content is re-served from the platform’s own origin with its real content type.
- Hint 3: Upload a document named proof.html containing a script payload, then open /uploads/proof.html — it runs as platform HTML.

## Admin Panel

### CSRF on Platform Settings (APR Change) (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: The admin settings form changes the platform APR. It carries no CSRF token.
- Hint 2: A cross-site POST riding an admin session will lack the hx_origin marker.
- Hint 3: While “logged in as admin”, POST /admin/settings {apr: 0.1} from a foreign origin — the platform rate changes.

## Platform & API

### Unauthenticated API Export of All Borrower Data (Beginner)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: APIs often hide a debug or export route. Try /api/admin/export.
- Hint 2: No session, no token — the route simply never checks.
- Hint 3: GET /api/admin/export with no cookies at all — every user, income, credit score and loan is returned as JSON.

### API Token Derived from Public Email Address (Intermediate)
- **Objective:** make the test flip to done on the /tests page by performing the real exploit.
- Hint 1: Your API token is shown in your profile area. Look at its structure — it is not random.
- Hint 2: It is a simple encoding of something everyone knows about the account.
- Hint 3: Bob's token is hx_ + base64(bob@test.local). Compute it and call /api/loans with header X-API-Key — his loans come back.
