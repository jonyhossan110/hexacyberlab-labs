# HexaTax — Vulnerability Map (25 scored tests)

Every entry below is a real, working flaw in this build, detected server-side when exploited.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** Use admin' OR '1'='1 as the email with any password - the query matches the first user in the table, the admin.
- **Why it matters:** String-built queries let an attacker rewrite the login logic itself; parameterized queries make input data, never code.
- **Client impact:** On a real tax platform this means anyone can walk in as the administrator without a password and reach every client return, bank detail and identity number stored inside.

### No Brute-Force Protection on Login
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** Submit 10 or more wrong passwords for bob@hexatax.local - the tenth is still processed like the first.
- **Why it matters:** Without throttling or lockout, passwords fall to patient guessing; rate limits and lockouts make online guessing impractical.
- **Client impact:** Attackers can guess weak client passwords overnight; on a tax platform one guessed account exposes full income and banking data.

### User Enumeration via Login and Reset Responses
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** Try alice@hexatax.local with a wrong password, then nobody@hexatax.local - the two messages tell you which accounts exist.
- **Why it matters:** Different error messages for real and fake accounts hand attackers a verified target list.
- **Client impact:** Criminals harvest the client list of a tax firm and aim phishing and credential stuffing exactly at real customers.

### Default Administrator Credentials
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** Try admin@hexatax.local with the password admin123 - it was never changed after setup.
- **Why it matters:** Default credentials are public knowledge; every deployment must force a change at first login.
- **Client impact:** Anyone on the internet can own the whole platform with a password printed in a thousand setup guides.

### Predictable Password Reset Token
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** The token is the MD5 hash of the account email - compute md5 of carol@hexatax.local and use it on the reset form to set a new password.
- **Why it matters:** Reset tokens must be random and single-use; anything derivable from public data is an account-takeover shortcut.
- **Client impact:** An attacker who knows a client email can reset the password and take over the account, returns and refund destination included.

### Session Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Login & Authentication feature of HexaTax.
- **Exploitation outline:** Set the hx_role cookie to admin and open /admin - the server never checks the role stored on your account.
- **Why it matters:** Authorization data must live server-side; anything the client can edit will be edited.
- **Client impact:** Any low-privilege client account becomes an administrator, with access to every taxpayer record on the platform.

## Registration & Profile

### Weak Password Policy at Registration
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Beginner
- **Where:** the Registration & Profile feature of HexaTax.
- **Exploitation outline:** Create an account with the single-character password a - it is accepted immediately.
- **Why it matters:** Password policy is a security control: short passwords fall to brute force in seconds.
- **Client impact:** Clients who pick tiny passwords hand attackers their tax records, identity numbers and bank details.

### Mass Assignment - Role Granted at Registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile feature of HexaTax.
- **Exploitation outline:** Register with an extra role field set to preparer (or isAdmin set to true) - the new account is created with that power.
- **Why it matters:** Bind only whitelisted fields; auto-binding whole request bodies lets clients grant themselves privileges.
- **Client impact:** A stranger can self-register as a preparer or admin and operate inside the firm tooling from minute one.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Registration & Profile feature of HexaTax.
- **Exploitation outline:** Set your display name to a script payload such as <script>alert(1)</script> and reload the dashboard - it is stored and rendered as code.
- **Why it matters:** Every stored field is code in someone else browser unless it is encoded on output.
- **Client impact:** A malicious client name can run scripts in the preparer browser, stealing sessions and opening other client files.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile feature of HexaTax.
- **Exploitation outline:** Send the profile update with a cross-site Origin header (or with no hx_origin cookie) - the change is applied anyway.
- **Why it matters:** State-changing requests need unforgeable tokens; cookies alone ride along with forged requests.
- **Client impact:** A booby-trapped web page can silently rewrite a victim profile while they are logged in, including contact data used for refunds.

## Tax Returns

### Return IDOR Exposes Another Taxpayer File
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Tax Returns feature of HexaTax.
- **Exploitation outline:** While logged in as one taxpayer, open return 1003, which belongs to another client - full income, TIN and bank details are served.
- **Why it matters:** Every object fetch must check ownership; predictable identifiers plus missing checks equal total data exposure.
- **Client impact:** Any client can read every other client tax return - income, identity numbers and bank accounts - a reportable breach on day one.

### Calculation Tampering via Hidden Tax Field
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where:** the Tax Returns feature of HexaTax.
- **Exploitation outline:** When saving a return, add a computedTax field with value 1 - the stored tax becomes 1 and the refund explodes, whatever the income says.
- **Why it matters:** Money math must be recomputed server-side from source figures; never accept a client-supplied result.
- **Client impact:** Clients can fabricate refunds by naming their own tax bill - direct financial fraud against the platform and the tax authority.

### Deduction Cap Not Enforced
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where:** the Tax Returns feature of HexaTax.
- **Exploitation outline:** Save a return whose charity deduction is larger than the total income - it is accepted and produces a giant refund.
- **Why it matters:** Business rules must be enforced in code on the server, not described in page text.
- **Client impact:** Inflated deductions manufacture refunds the client is not entitled to - fraud exposure for the firm and its customers.

### Filing Status Bypass - Skipping Preparer and Reviewer
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Tax Returns feature of HexaTax.
- **Exploitation outline:** Edit your own draft and add a status field set to filed - the return is filed instantly, with no preparer preparation and no reviewer approval.
- **Why it matters:** Workflow state must transition only through role-checked actions, never through editable fields.
- **Client impact:** Unreviewed, possibly fabricated returns get filed in the firm name - regulatory and fraud fallout lands on the business.

### Filed Returns Can Still Be Edited
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Tax Returns feature of HexaTax.
- **Exploitation outline:** Save changes to the wages of a return whose status is filed - the locked record quietly changes.
- **Why it matters:** Immutability of finalized records is a control: once filed, corrections need a formal amendment flow.
- **Client impact:** Filed figures can be rewritten after submission, destroying the audit trail and exposing the firm to severe penalties.

## Documents

### Document Download IDOR
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Documents feature of HexaTax.
- **Exploitation outline:** As one taxpayer, download document 2002 - it belongs to another client and contains their income statement.
- **Why it matters:** Attachments carry the same sensitivity as the records they belong to and need the same ownership checks.
- **Client impact:** Identity documents and income statements of every client can be harvested one number at a time.

### Unrestricted HTML Upload Served Inline
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Intermediate
- **Where:** the Documents feature of HexaTax.
- **Exploitation outline:** Upload an .html file containing a script payload and open its raw link - it is served as a web page from the platform origin.
- **Why it matters:** Uploads must be type-checked and served as inert downloads, never as active content from your origin.
- **Client impact:** Attackers host phishing pages and script payloads on the trusted tax platform domain, aimed at staff and clients.

### Path Traversal in Document Viewer
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Documents feature of HexaTax.
- **Exploitation outline:** Ask the viewer for ../server.js - it returns the application source code.
- **Why it matters:** Never build file paths from raw user input; resolve and confine paths to an allowed directory.
- **Client impact:** Source code and configuration leak first; from there attackers map every other weakness in the platform.

## Search & Exports

### SQL Injection in Return Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Where:** the Search & Exports feature of HexaTax.
- **Exploitation outline:** Search for ' OR '1'='1 while logged in as a taxpayer - every client return appears in the results.
- **Why it matters:** Search boxes are query builders too; every input that reaches a query needs parameterization.
- **Client impact:** One search string dumps the entire client book - every income, TIN and bank detail the firm holds.

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Search & Exports feature of HexaTax.
- **Exploitation outline:** Search for a script payload such as <script>alert(1)</script> - it is reflected unescaped into the results page.
- **Why it matters:** Reflected input must be encoded on output, even in something as small as a results heading.
- **Client impact:** A crafted search link sent to a preparer runs script in their session, opening the client files they can reach.

### Taxpayer Export Downloads Every Client Record
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Search & Exports feature of HexaTax.
- **Exploitation outline:** As any taxpayer, download the export - it contains every client return, with TINs and bank accounts, not just yours.
- **Why it matters:** Bulk endpoints need the same scoping as single-record views - they are the highest-value target in the app.
- **Client impact:** One click exfiltrates the entire client database in spreadsheet form, ready for identity theft.

## Admin Panel

### User Deactivation by Simple GET Link (CSRF)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Admin Panel feature of HexaTax.
- **Exploitation outline:** While an admin is logged in, visiting the deactivate link for a user disables that account immediately - no confirmation, no token.
- **Why it matters:** State changes require POST plus a CSRF token; a GET that changes state is an attack waiting for a browser.
- **Client impact:** An attacker can trick the logged-in admin into disabling staff and client accounts, sabotaging the firm at filing deadline.

### Compliance Audit Page Skips the Admin Role Check
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Admin Panel feature of HexaTax.
- **Exploitation outline:** As a normal taxpayer, open /admin/audit - every account, its plaintext password and TIN are listed.
- **Why it matters:** Authorization must be enforced on every route, not just the landing page of an admin area.
- **Client impact:** Any registered user can read every password and identity number on the platform - total compromise in one click.

## Platform & API

### Predictable API Token Returns All Returns
- **OWASP:** A07:2021 Identification and Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Platform & API feature of HexaTax.
- **Exploitation outline:** Call /api/returns with api_key set to hxt_ followed by the base64 of any user email, with no login at all - every return comes back as JSON.
- **Why it matters:** API tokens must be unguessable random secrets, scoped per user; encoding is not encryption and not a secret.
- **Client impact:** The whole client book leaks through the API to anyone who knows a staff email address - no password ever needed.

### Unauthenticated Debug Endpoint Leaks User Table
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Where:** the Platform & API feature of HexaTax.
- **Exploitation outline:** Open /debug with no login at all - it dumps the configuration and the full user table including passwords.
- **Why it matters:** Debug surfaces are production vulnerabilities; remove them or lock them behind admin auth before release.
- **Client impact:** A single public URL hands attackers every credential on the platform, no skill required.
