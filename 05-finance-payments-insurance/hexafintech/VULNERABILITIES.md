# HexaFintech — Vulnerabilities (complete map)

LAB 44 of the HexaCyberLab lab series. Every entry below is a scored test in the lab's registry,
detected server-side when the exploit actually succeeds. Grouped by feature.

## Login & Authentication

### SQL injection login bypass (legacy SSO query path)
- **OWASP:** A03:2021 Injection  ·  **Difficulty:** Beginner  ·  **Severity (report):** Critical
- **Impact:** On a real fintech, this is instant account takeover — anyone walks in as the first account in the table, often an admin, with no password at all.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.

### No rate limiting or lockout on login (brute force)
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** Attackers can grind through password lists against real customers until one works — credential stuffing against a money app pays out fast.
- **Lesson:** Without throttling, a login form is an unlimited password-guessing machine; rate limits and lockouts turn years of guessing into a dead end.

### User enumeration via differing login error messages
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Beginner  ·  **Severity (report):** Medium
- **Impact:** A fintech leaks exactly which email addresses hold money accounts — the perfect targeting list for phishing and credential stuffing.
- **Lesson:** Different error messages hand attackers a free address book of valid accounts to target; generic errors keep them guessing.

### Default demo account with a guessable password
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** A leftover demo login gives an attacker a legitimate foothold inside a finance platform on day one, no exploit needed.
- **Lesson:** Demo and default accounts are real accounts with real access — if they ship, attackers will find them before your users do.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** Anyone who knows a customer’s email can mint a valid reset token and take over the account — no inbox access needed.
- **Lesson:** Reset tokens must be unguessable random values; anything derived from public data is an account-takeover formula anyone can compute.

### Session/cookie role tampering reaches the admin panel
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** Critical
- **Impact:** Any customer becomes "admin" by editing a cookie — full user list, account controls and delete powers in a finance platform.
- **Lesson:** Authorization data kept on the client is a suggestion, not a fact; roles must be read from server-side session state on every request.

## Registration & Profile

### Weak password policy (1-character passwords accepted)
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Beginner  ·  **Severity (report):** Medium
- **Impact:** Customers who pick tiny passwords hand attackers trivial account takeovers on an app that holds their money data.
- **Lesson:** Password policy is the floor under every other control; a 1-character password falls to the first guess an attacker tries.

### Mass assignment — set role / tier / daily limit via profile update
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** A customer promotes themselves to admin or lifts their own transfer limit — privilege and money controls gone in one request.
- **Lesson:** Blindly binding request fields to records lets users edit columns that were never on the form; allow-list the fields each endpoint may change.

### Stored XSS in the display name
- **OWASP:** A03:2021 Injection  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** An attacker’s name executes script in other users’ and admins’ browsers — session theft and actions performed as the victim, inside a finance app.
- **Lesson:** Any stored field rendered unescaped becomes a permanent script delivery slot; output-encode at render time, every time.

### CSRF on the profile update form
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** Medium
- **Impact:** A malicious page silently rewrites a victim’s profile details — the first step in diverting their money and communications.
- **Lesson:** State-changing forms need an unguessable per-session token; without one, any site a victim visits can submit the form as them.

## Financial Profiles & Accounts

### Financial profile IDOR — read another user’s income & net worth
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** Every customer’s income, net worth and savings goals are public to any other customer — a privacy breach and perfect social-engineering material.
- **Lesson:** Showing an object because its id was in the URL is not authorization; every object access must check the requester owns it or holds a grant.

### Linked-account IDOR — read another user’s bank accounts & balances
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** Attackers enumerate exactly who banks where and how much they hold — targeting data for theft and extortion.
- **Lesson:** Sequential ids plus missing ownership checks turn any list into everyone’s list; check ownership server-side on every object.

### Path traversal in statement download reads server files
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** Source code, configuration and potentially secrets are downloadable — the map an attacker needs for every deeper attack.
- **Lesson:** User-controlled file paths must be canonicalised and confined to an allow-listed directory; a filename is not a path.

## Cards

### Virtual-card IDOR — full card number & CVV of another user exposed
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** Critical
- **Impact:** Complete working card credentials for every customer — direct card fraud, chargebacks and a PCI-DSS disaster for the business.
- **Lesson:** Payment data behind a guessable URL with no ownership check is card data handed to strangers; mask by default and authorize every reveal.

### Change another user’s card limit (missing ownership check)
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** An attacker freezes victims out of their own money by dropping card limits to near zero — or raises a stolen card’s limit before draining it.
- **Lesson:** Write endpoints need the same ownership checks as reads; a missing check on a money control is sabotage-as-a-service.

### Card limit raised far beyond the platform maximum
- **OWASP:** A04:2021 Insecure Design  ·  **Difficulty:** Beginner  ·  **Severity (report):** Medium
- **Impact:** Customers (or attackers in their accounts) mint near-unlimited card spending power, voiding the platform’s core risk control.
- **Lesson:** Business limits must be enforced server-side; client-side validation is decoration an attacker removes in seconds.

## Transfers

### Negative transfer amount reverses the money flow
- **OWASP:** A04:2021 Insecure Design  ·  **Difficulty:** Intermediate  ·  **Severity (report):** Critical
- **Impact:** Anyone can pull money OUT of other customers’ accounts into their own by "sending" negative amounts — theft with a normal-looking form.
- **Lesson:** Every numeric business input needs server-side range validation; a negative amount is not a discount, it is a reversed transaction.

### Transfer more than the balance — no funds check
- **OWASP:** A04:2021 Insecure Design  ·  **Difficulty:** Beginner  ·  **Severity (report):** High
- **Impact:** Customers spend money that does not exist and the platform eats the loss — or every downstream balance is fiction.
- **Lesson:** A ledger that never checks funds is an IOU generator; balance checks must happen server-side inside the transaction.

## Spending Analytics

### Analytics CSV export leaks every user’s spending
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** The whole customer base’s spending habits in one file — a reportable privacy breach and a competitor’s dream dataset.
- **Lesson:** Exports must be filtered with the same authorization as the screen they came from; a report is a data dump with a friendlier name.

### Reflected XSS in the analytics period filter
- **OWASP:** A03:2021 Injection  ·  **Difficulty:** Beginner  ·  **Severity (report):** Medium
- **Impact:** A crafted analytics link runs script in a victim customer’s browser — phishing and session theft wearing the platform’s own URL.
- **Lesson:** Reflected input is still injection; encode every value echoed into a page, even "harmless" filters and headings.

## Sharing & Permissions

### View-only grantee upgrades their own share to full control
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Advanced  ·  **Severity (report):** Critical
- **Impact:** An accountant or family member with read-only access silently becomes a full controller of the victim’s finances — insider fraud with no alarm.
- **Lesson:** Permission changes are themselves privileged operations; the actor’s authority over the grant must be checked, not just the grant’s existence.

### View-only shared access can still move money (scope not enforced)
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** Critical
- **Impact:** Anyone ever given view access — an accountant, an ex-partner — can drain the account they were only meant to watch.
- **Lesson:** Read and write are different permissions; every write path must re-check scope, not inherit trust from a view grant.

### Share invite can be accepted by the wrong account
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** A forwarded or leaked invite link hands financial access to whoever opens it first — no trace back to the intended person.
- **Lesson:** Invite tokens must be bound to the invited identity and verified at acceptance; a bearer link is a bearer permission.

## Admin Panel

### Admin user deletion via a simple GET link (CSRF)
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** One malicious image tag on any page an admin views deletes customer accounts — destructive power with zero clicks.
- **Lesson:** State changes must never ride on GET and always need CSRF tokens; a link is the easiest request in the world to trick a browser into making.

## Platform & API

### Unauthenticated API dumps every user including passwords
- **OWASP:** A01:2021 Broken Access Control  ·  **Difficulty:** Beginner  ·  **Severity (report):** Critical
- **Impact:** The entire customer credential list in one request — every account on the platform falls at once.
- **Lesson:** Every route needs authentication and field-level restraint; an unlinked endpoint is still a public endpoint.

### API key derived from the email address (base64)
- **OWASP:** A07:2021 Identification & Authentication Failures  ·  **Difficulty:** Intermediate  ·  **Severity (report):** High
- **Impact:** Anyone can forge any customer’s API key from their email address and pull their financial data programmatically.
- **Lesson:** API keys must be high-entropy random secrets; a key derived from public data authenticates everyone to everyone.
