# HexaLoan — Vulnerability Map (LAB 46)

The complete scored registry: **25 tests across 8 features**. Every test completes only when the exploit's real effect is observed server-side.

## Login & Authentication (6)

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it teaches:** String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.
- **Client impact:** On a real lending site this is instant account takeover — an attacker logs in as an administrator without any password and reaches every borrower record.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it teaches:** Without throttling, lockout or CAPTCHA, password guessing is free and unlimited — weak passwords fall quickly.
- **Client impact:** Attackers can grind through password lists against borrower and staff accounts at full speed until one works.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it teaches:** Different error messages for “no such user” and “wrong password” hand attackers a verified list of accounts to target.
- **Client impact:** Attackers can confirm which borrowers and staff have accounts, then focus phishing and password attacks only on real targets.

### Weak / Default Demo Credentials
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it teaches:** Default and demo accounts with guessable passwords are a standing backdoor in production systems.
- **Client impact:** Anyone on the internet can walk into a live borrower account using credentials printed in countless breach lists.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Intermediate
- **What it teaches:** Reset tokens must be long, random and single-use; a formula based on a user id is guessable by anyone.
- **Client impact:** An attacker can reset any borrower’s or officer’s password knowing only their account id — full takeover without touching their inbox.

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it teaches:** Authorisation data must live server-side; any role stored in a client cookie can simply be edited.
- **Client impact:** Any borrower can promote themselves to platform admin by editing one cookie — full control of rates, users and approvals.

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 Identification & Authentication Failures
- **Difficulty:** Beginner
- **What it teaches:** Password policy is set at registration; accepting 1-character passwords guarantees weak accounts exist.
- **Client impact:** Borrowers who choose tiny passwords are compromised in seconds by guessing — and their loan data goes with them.

### Mass Assignment — Credit Score & Role via Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it teaches:** Binding request bodies directly to records lets clients write fields the UI never offered — including trust fields like credit score.
- **Client impact:** A borrower can inflate their own verified credit score or grant themselves a staff role, poisoning every downstream lending decision.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **What it teaches:** Any user-controlled string rendered without encoding becomes stored XSS for everyone who views it — here, the loan officers.
- **Client impact:** A borrower can run JavaScript in a loan officer’s browser, hijacking the staff session and approving loans from the inside.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it teaches:** State-changing forms without CSRF tokens can be driven by any website the victim visits while logged in.
- **Client impact:** A malicious page a borrower visits can rewrite their profile (and contact details) without them ever seeing the loan site.

## Loan Applications (4)

### Application IDOR — Other Borrowers’ Financial Data
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it teaches:** Every object read must verify the requester owns it (or has a staff need); sequential ids make unchecked reads trivially enumerable.
- **Client impact:** Every borrower’s income, credit score and borrowing history can be scraped by any other customer — a serious privacy and regulatory breach.

### Eligibility Tampering — Declared Income & Credit Score Trusted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it teaches:** Decisions that move money must be computed from server-side verified data, never from client-declared figures.
- **Client impact:** Uncreditworthy borrowers can make themselves “eligible” by typing better numbers — the lender books bad loans it believes are safe.

### Loan Amount Above Platform Cap Accepted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **What it teaches:** Limits that exist only in the UI do not exist; every business rule must be re-checked on the server.
- **Client impact:** Oversized applications enter the pipeline and, combined with any approval weakness, become oversized real loans.

### Application Status Forgery — Self-Disbursement
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it teaches:** Workflow state machines must be enforced server-side with allowed transitions per role; a free-form status field is a forgery kit.
- **Client impact:** A borrower can mark their own application disbursed without verification or approval — the money pipeline believes money moved.

## Approval Workflow (3)

### Self-Approval of Own Loan Application
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Advanced
- **What it teaches:** Segregation of duties must be enforced on the server: the applicant and the approver can never be the same identity.
- **Client impact:** A borrower approving their own application defeats the entire credit process — loans issue with zero independent review.

### Verification Step Skipped Before Approval
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it teaches:** Multi-step workflows must check the current state at every step; a later step that ignores earlier ones makes the earlier ones theatre.
- **Client impact:** Income/identity verification can be bypassed entirely, so loans are approved on unverified declarations.

### Rejected Loan Can Be Approved Afterwards
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it teaches:** Terminal states must be terminal; status overwrites without precondition checks resurrect dead decisions.
- **Client impact:** Loans a credit officer already declined can be silently revived and funded, undoing risk decisions after the fact.

## Repayments (3)

### Repayment Schedule IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it teaches:** Child resources inherit the parent’s sensitivity; schedules reveal balances, due dates and payment behaviour.
- **Client impact:** Competitors and snoops can map any borrower’s debt position and payment history — prime material for fraud and extortion.

### Underpayment Marked as Paid in Full
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **What it teaches:** Payment state must be derived from verified amounts received, never from a client-supplied “paid in full” flag.
- **Client impact:** Borrowers can extinguish installments for pennies, quietly writing off the lender’s money one schedule line at a time.

### Forged Settlement Amount Closes the Loan
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Advanced
- **What it teaches:** Ledger truth must come from the payment system’s own records; a client-declared total is not evidence of payment.
- **Client impact:** An entire loan can be discharged on paper with no money received — direct, total loss of the principal.

## Documents (2)

### Document IDOR — Others’ Income Proofs
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it teaches:** Uploaded evidence files are among the most sensitive objects in a lending app; every download needs an ownership check.
- **Client impact:** Payslips, bank statements and tax returns of every borrower can be harvested — identity-theft kits, complete in one request each.

### Unrestricted Upload — HTML Served from Platform Origin
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **What it teaches:** Uploads must be type-checked, renamed, and served from a separate domain or as downloads — never as active content on the app origin.
- **Client impact:** Attackers host phishing pages and script payloads on the lender’s real domain, inheriting its trust and users’ sessions.

## Admin Panel (1)

### CSRF on Platform Settings (APR Change)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **What it teaches:** Admin actions are the highest-value CSRF targets; tokens and origin checks are mandatory there most of all.
- **Client impact:** One malicious page view by an admin can slash (or spike) the interest rate applied to every new loan on the platform.

## Platform & API (2)

### Unauthenticated API Export of All Borrower Data
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **What it teaches:** Every route needs an explicit authorisation decision; “nobody links to it” is not access control.
- **Client impact:** The entire borrower database — financial profiles included — is one unauthenticated request away from any attacker.

### API Token Derived from Public Email Address
- **OWASP:** A02:2021 Cryptographic Failures
- **Difficulty:** Intermediate
- **What it teaches:** API credentials must be high-entropy secrets; an encoding of a public identifier is not a secret at all.
- **Client impact:** Anyone who knows a borrower’s email — public information — owns their API access and full loan data.
