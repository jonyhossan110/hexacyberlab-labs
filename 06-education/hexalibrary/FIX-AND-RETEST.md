# HexaLibrary — FIX & RETEST

For every scored test: the secure implementation (the fix that belongs in a real codebase) and the regression test that proves the flaw stays closed.

## Login & Authentication

### SQL Injection in Member Login (Authentication Bypass) (Critical)
- **Fix:** Use parameterised queries / prepared statements for the login lookup and never build SQL by string concatenation.
- **Regression test:** Repeat the injection login: authentication must fail and no session may be issued.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Add progressive rate limiting and temporary lockout (or CAPTCHA) after repeated failed logins, and alert on credential-stuffing patterns.
- **Regression test:** Fail 10 logins: the 10th must be throttled/locked and further attempts challenged.

### Account Enumeration Through Differential Auth Responses (Medium)
- **Fix:** Return one generic message ("if the account exists…") for login failures and password-reset requests alike.
- **Regression test:** Probe known and unknown emails: responses must be identical in both cases.

### Default Demo Credentials Active (demo / demo) (High)
- **Fix:** Remove or disable demo/default accounts before launch and force unique, strong passwords on every seeded account.
- **Regression test:** Attempt demo/demo and admin defaults: all shipped defaults must be rejected or force a change.

### Predictable Password Reset Tokens (High)
- **Fix:** Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.
- **Regression test:** Compute the old formula token: reset must fail; a real token must be random, single-use and expiring.

### Client-Controlled Role Cookie Trusted for Authorization (High)
- **Fix:** Never trust client-supplied role data; resolve the role from the server-side session record on every request.
- **Regression test:** Set hx_role=admin as a member: staff pages must still refuse based on the server-side session role.

## Registration & Profile

### No Minimum Password Strength at Registration (Medium)
- **Fix:** Enforce a minimum length (≥10) and screen new passwords against known breached-password lists.
- **Regression test:** Register with a 1-character password: registration must be rejected by policy.

### Mass Assignment of Role at Registration (Critical)
- **Fix:** Whitelist exactly the fields a registration may set (name, email, password); assign roles only through staff workflows.
- **Regression test:** Register with role=librarian in the body: the account must be created as a plain member.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Context-encode all user-supplied output, validate names server-side, and deploy a restrictive Content-Security-Policy.
- **Regression test:** Store a script payload as a name: it must render as inert text everywhere.

### Missing CSRF Protection on Profile Update (Medium)
- **Fix:** Require a per-session CSRF token on all state-changing forms and verify Origin/Referer as defence in depth.
- **Regression test:** Replay the profile POST from a cross-site origin without a token: the change must be rejected.

## Catalog & Search

### SQL Injection in Catalog Search (High)
- **Fix:** Parameterise the search query and treat all user input as data, never as query structure.
- **Regression test:** Repeat the tautology search: only genuine title/author matches may return.

### Reflected Cross-Site Scripting in Search Results (Medium)
- **Fix:** HTML-encode the reflected search term and add a Content-Security-Policy header.
- **Regression test:** Repeat the payload search: the term must appear HTML-encoded in the page.

## Borrowing & Loans

### Licensed Copy Limit Not Enforced at Borrowing (High)
- **Fix:** Check available copies (licensed minus active loans) inside the borrow transaction and reject when none remain.
- **Regression test:** Borrow an exhausted title: the request must be refused with no loan created.

### Per-Member Borrowing Limit Not Enforced (Medium)
- **Fix:** Count the member’s active loans inside the borrow transaction and enforce the cap server-side.
- **Regression test:** Borrow a 4th title at the cap: the request must be refused.

### Unbounded Due-Date Extension (Policy Cap Not Enforced) (Medium)
- **Fix:** Validate extension length server-side against the 7-day policy and ignore client-supplied due dates.
- **Regression test:** Extend with days=365: the due date may move by at most the 7-day policy.

### Insecure Direct Object Reference on Loan Details (High)
- **Fix:** Verify the requesting member owns the loan (or is staff) before serving any loan record.
- **Regression test:** Open another member’s loan: access must be denied (403/404).

## Downloads & Files

### Missing Entitlement Check on Ebook Downloads (High)
- **Fix:** Serve downloads only when the member holds an active loan for that title; log and alert on mismatches.
- **Regression test:** Download without a loan: access must be denied; with an active loan it must succeed.

### Directory Traversal in File Download Endpoint (High)
- **Fix:** Resolve the requested path, require it to stay inside the documents directory, and whitelist servable files.
- **Regression test:** Request ../ paths: the server must refuse anything outside the docs folder.

## Reservations

### Client-Supplied Queue Position in Reservations (Medium)
- **Fix:** Assign queue positions server-side in arrival order and ignore any client-supplied position.
- **Regression test:** Reserve with a position field: position must be assigned server-side at the back of the queue.

### Missing Ownership Check on Reservation Cancellation (Medium)
- **Fix:** Only the reservation’s owner (or staff) may cancel it; verify ownership in the handler.
- **Regression test:** Cancel another member’s reservation: the request must be denied and the reservation intact.

## Fees & Payments

### Missing Authorization on Fee Waiver Endpoint (High)
- **Fix:** Require a staff role for fee waivers and record who waived what in an audit log.
- **Regression test:** Call the waiver as a member: it must be denied; as a librarian it must succeed and be audited.

### Payment Amount Not Verified Against Fee Owed (High)
- **Fix:** Ignore client-supplied settlement amounts; mark a fee paid only when a verified payment covers the full balance.
- **Regression test:** Pay less than owed: the fee must remain unpaid (or partially paid), never settled.

## Members & Reading History

### Insecure Direct Object Reference on Reading History (High)
- **Fix:** Serve history only to its owner or staff; deny by default and log cross-member access attempts.
- **Regression test:** Open another member’s history: access must be denied.

## Librarian & Admin

### Missing Authorization on Admin Panel (Critical)
- **Fix:** Enforce an admin-role check in the /admin handler and audit access to administrative pages.
- **Regression test:** Open /admin as a member: access must be denied.

### Missing Authorization on Catalog Edit Endpoint (High)
- **Fix:** Require the librarian role inside the edit handler itself, independent of how the request arrived.
- **Regression test:** POST a catalog edit as a member: it must be denied and the catalog unchanged.

## Platform & API

### Unauthenticated Debug Endpoint Exposing Credentials (Critical)
- **Fix:** Remove debug endpoints from production builds; if diagnostics are essential, gate them behind admin auth and network restrictions.
- **Regression test:** Fetch /debug in the production build: it must not exist (404) or require admin authentication.
