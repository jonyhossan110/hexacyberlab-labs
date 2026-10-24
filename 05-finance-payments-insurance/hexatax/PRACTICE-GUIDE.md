# HexaTax — Practice Guide

Challenges grouped by feature, then difficulty. A challenge is complete when its test flips to
done on `/tests` — the server detects the real exploit effect. Each challenge lists its 3 graded
hints (the same hints shown in the app).

## Login & Authentication

### SQL Injection Login Bypass (Beginner — A03:2021 Injection)
- **Objective:** exploit the flaw for real; the "auth-sqli" test must show as done on /tests.
- Hint 1: The login form builds its user lookup by joining your input straight into a query string.
- Hint 2: Try a classic tautology in the email field, something that makes the WHERE clause always true.
- Hint 3: Use admin' OR '1'='1 as the email with any password - the query matches the first user in the table, the admin.

### No Brute-Force Protection on Login (Beginner — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "auth-brute" test must show as done on /tests.
- Hint 1: Count how many wrong passwords the login accepts for one account.
- Hint 2: Nothing slows you down or locks the account, even after many failures.
- Hint 3: Submit 10 or more wrong passwords for bob@hexatax.local - the tenth is still processed like the first.

### User Enumeration via Login and Reset Responses (Beginner — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "auth-enum" test must show as done on /tests.
- Hint 1: Compare the exact wording of the login error for a real account and an invented one.
- Hint 2: The forgot-password form answers differently too - one confirms the mail was sent, the other admits there is no account.
- Hint 3: Try alice@hexatax.local with a wrong password, then nobody@hexatax.local - the two messages tell you which accounts exist.

### Default Administrator Credentials (Beginner — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "auth-default" test must show as done on /tests.
- Hint 1: Fresh installs often keep the vendor-supplied admin password.
- Hint 2: The admin mailbox follows the platform naming pattern you see on the login page.
- Hint 3: Try admin@hexatax.local with the password admin123 - it was never changed after setup.

### Predictable Password Reset Token (Intermediate — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "auth-reset" test must show as done on /tests.
- Hint 1: Ask for a reset link and study the reset form - the token is derived from something public about the account.
- Hint 2: The derivation uses a fast, unsalted, well-known hash of the account email address.
- Hint 3: The token is the MD5 hash of the account email - compute md5 of carol@hexatax.local and use it on the reset form to set a new password.

### Session Role Cookie Tampering (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "auth-cookie" test must show as done on /tests.
- Hint 1: After login, inspect the cookies the app trusts.
- Hint 2: One cookie repeats your role - and the server believes the copy you send back.
- Hint 3: Set the hx_role cookie to admin and open /admin - the server never checks the role stored on your account.

## Registration & Profile

### Weak Password Policy at Registration (Beginner — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "reg-weakpw" test must show as done on /tests.
- Hint 1: Register a test account and see how short a password the form accepts.
- Hint 2: There is effectively no minimum length or complexity rule.
- Hint 3: Create an account with the single-character password a - it is accepted immediately.

### Stored XSS in Display Name (Beginner — A03:2021 Injection)
- **Objective:** exploit the flaw for real; the "reg-xss" test must show as done on /tests.
- Hint 1: Your display name is rendered on the dashboard and in staff views without escaping.
- Hint 2: Put markup in the name and watch where it appears.
- Hint 3: Set your display name to a script payload such as <script>alert(1)</script> and reload the dashboard - it is stored and rendered as code.

### Mass Assignment - Role Granted at Registration (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "reg-massassign" test must show as done on /tests.
- Hint 1: The registration form only shows name, email and password - but the handler binds more fields than it shows.
- Hint 2: Add a field the form never offered and see if the account quietly gains it.
- Hint 3: Register with an extra role field set to preparer (or isAdmin set to true) - the new account is created with that power.

### CSRF on Profile Update (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "reg-csrf" test must show as done on /tests.
- Hint 1: The profile form changes your account with a plain POST and no anti-CSRF token.
- Hint 2: The app marks its own requests with an origin cookie - watch what happens when a POST arrives without it.
- Hint 3: Send the profile update with a cross-site Origin header (or with no hx_origin cookie) - the change is applied anyway.

## Tax Returns

### Return IDOR Exposes Another Taxpayer File (Beginner — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "ret-idor" test must show as done on /tests.
- Hint 1: Open one of your own returns and look at how its address names it.
- Hint 2: Return numbers are sequential - and the page never asks whether the file is yours.
- Hint 3: While logged in as one taxpayer, open return 1003, which belongs to another client - full income, TIN and bank details are served.

### Calculation Tampering via Hidden Tax Field (Intermediate — A04:2021 Insecure Design)
- **Objective:** exploit the flaw for real; the "ret-calc" test must show as done on /tests.
- Hint 1: The return form shows a computed tax - but the save handler trusts more than the visible fields.
- Hint 2: Add a field the real form never shows and see which number the server stores.
- Hint 3: When saving a return, add a computedTax field with value 1 - the stored tax becomes 1 and the refund explodes, whatever the income says.

### Deduction Cap Not Enforced (Intermediate — A04:2021 Insecure Design)
- **Objective:** exploit the flaw for real; the "ret-deduction" test must show as done on /tests.
- Hint 1: The return form states a rule: charity deductions are capped at 60 percent of total income.
- Hint 2: Rules written in help text are not enforced anywhere in the save handler.
- Hint 3: Save a return whose charity deduction is larger than the total income - it is accepted and produces a giant refund.

### Filing Status Bypass - Skipping Preparer and Reviewer (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "ret-status" test must show as done on /tests.
- Hint 1: A return normally moves draft, then submitted, then prepared, then filed - each step by a different role.
- Hint 2: The save handler accepts a status value from the request body, from anyone who owns the draft.
- Hint 3: Edit your own draft and add a status field set to filed - the return is filed instantly, with no preparer preparation and no reviewer approval.

### Filed Returns Can Still Be Edited (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "ret-edit-filed" test must show as done on /tests.
- Hint 1: A filed return should be locked forever - the figures went to the tax authority.
- Hint 2: Open one of your filed returns from last year and try the edit form anyway.
- Hint 3: Save changes to the wages of a return whose status is filed - the locked record quietly changes.

## Documents

### Document Download IDOR (Beginner — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "doc-idor" test must show as done on /tests.
- Hint 1: Your W-2 and 1099 documents live behind numbered download links.
- Hint 2: The numbers are sequential and ownership is never checked on download.
- Hint 3: As one taxpayer, download document 2002 - it belongs to another client and contains their income statement.

### Unrestricted HTML Upload Served Inline (Intermediate — A05:2021 Security Misconfiguration)
- **Objective:** exploit the flaw for real; the "doc-upload" test must show as done on /tests.
- Hint 1: The upload form accepts any file type, not just the documents it asks for.
- Hint 2: Upload something that is not a document at all and then open its raw view.
- Hint 3: Upload an .html file containing a script payload and open its raw link - it is served as a web page from the platform origin.

### Path Traversal in Document Viewer (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "doc-traversal" test must show as done on /tests.
- Hint 1: The document viewer takes a file name and reads it from the documents folder.
- Hint 2: Nothing stops the name from walking out of that folder.
- Hint 3: Ask the viewer for ../server.js - it returns the application source code.

## Search & Exports

### Reflected XSS in Search (Beginner — A03:2021 Injection)
- **Objective:** exploit the flaw for real; the "search-xss" test must show as done on /tests.
- Hint 1: The results page repeats your search term at the top, exactly as typed.
- Hint 2: Markup in the term comes back as markup in the page.
- Hint 3: Search for a script payload such as <script>alert(1)</script> - it is reflected unescaped into the results page.

### SQL Injection in Return Search (Intermediate — A03:2021 Injection)
- **Objective:** exploit the flaw for real; the "search-sqli" test must show as done on /tests.
- Hint 1: The return search matches records with a hand-built query, just like the login.
- Hint 2: A search term that makes the WHERE clause always true returns more than your own files.
- Hint 3: Search for ' OR '1'='1 while logged in as a taxpayer - every client return appears in the results.

### Taxpayer Export Downloads Every Client Record (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "export-leak" test must show as done on /tests.
- Hint 1: The export button promises a CSV of your returns.
- Hint 2: Compare what lands in the file with what you actually own.
- Hint 3: As any taxpayer, download the export - it contains every client return, with TINs and bank accounts, not just yours.

## Admin Panel

### User Deactivation by Simple GET Link (CSRF) (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "admin-csrf" test must show as done on /tests.
- Hint 1: In the admin panel, deactivating a user is not a form with a token - it is a plain link.
- Hint 2: State changes that ride on GET can be triggered by an image tag on any website the admin visits.
- Hint 3: While an admin is logged in, visiting the deactivate link for a user disables that account immediately - no confirmation, no token.

### Compliance Audit Page Skips the Admin Role Check (Intermediate — A01:2021 Broken Access Control)
- **Objective:** exploit the flaw for real; the "admin-pii" test must show as done on /tests.
- Hint 1: The /admin home checks your role. Not every page under /admin does.
- Hint 2: One sub-page only asks whether you are logged in - and it prints the most sensitive table in the app.
- Hint 3: As a normal taxpayer, open /admin/audit - every account, its plaintext password and TIN are listed.

## Platform & API

### Unauthenticated Debug Endpoint Leaks User Table (Beginner — A05:2021 Security Misconfiguration)
- **Objective:** exploit the flaw for real; the "platform-debug" test must show as done on /tests.
- Hint 1: Development leftovers often survive into the deployed build.
- Hint 2: One short, well-known path returns diagnostics meant only for developers.
- Hint 3: Open /debug with no login at all - it dumps the configuration and the full user table including passwords.

### Predictable API Token Returns All Returns (Intermediate — A07:2021 Identification and Authentication Failures)
- **Objective:** exploit the flaw for real; the "api-weak-token" test must show as done on /tests.
- Hint 1: The API documentation page proudly shows how your token is built.
- Hint 2: It is just your email address, encoded - anyone can mint a token for anyone else.
- Hint 3: Call /api/returns with api_key set to hxt_ followed by the base64 of any user email, with no login at all - every return comes back as JSON.
