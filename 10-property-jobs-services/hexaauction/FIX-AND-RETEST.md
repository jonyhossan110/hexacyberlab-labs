# HexaAuction — Fix & Retest Guide (LAB 99)

For each finding: the secure implementation, then the regression retest that must FAIL after the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Remediation: Parameterise all queries and add regression tests with injection payloads.
- Retest: repeat the original exploit (Submit an email containing a quote + comment sequence so the password clause is commented out of the string-built query.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### No Brute-Force Protection on Login (High)
- Fix: Add per-account and per-IP rate limits, exponential backoff and optional MFA.
- Remediation: Rate-limit login attempts and lock or challenge after repeated failures.
- Retest: repeat the original exploit (Submit 10+ failed logins for one account; the 10th failure is still processed with no challenge or lock.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Account Enumeration via Forgot-Password Responses (Medium)
- Fix: Return one generic response for all account-recovery and login failures.
- Remediation: Use identical generic responses regardless of account existence.
- Retest: repeat the original exploit (Submit 5 distinct emails; existing accounts return a different message than unknown ones.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Working Demo Admin Credentials Disclosed on Login Page (Critical)
- Fix: Remove demo accounts and credential hints from production; seed data must never ship live credentials.
- Remediation: Delete demo accounts and never display credentials on authentication pages.
- Retest: repeat the original exploit (Use the demo admin credentials printed on the login page to sign in.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Predictable Password Reset Token Allows Account Takeover (High)
- Fix: Generate reset tokens with a CSPRNG, store only hashes, expire them quickly and bind them to a single use.
- Remediation: Use cryptographically random, single-use, expiring reset tokens.
- Retest: repeat the original exploit (Derive the token from the target user id with the published formula and submit it without a reset request.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Privilege Escalation via Client-Side Role Cookie (High)
- Fix: Derive roles from the server-side session on every request; never trust role cookies.
- Remediation: Enforce authorisation server-side from session data on every route.
- Retest: repeat the original exploit (Forge the hx_role cookie to a privileged role and load the gated console.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Registration & Profile

### No Minimum Password Strength on Registration (Medium)
- Fix: Enforce a sane minimum length and screen against known-breached passwords.
- Remediation: Enforce minimum length/complexity and breached-password screening.
- Retest: repeat the original exploit (Create an account with a 1-character password.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Mass Assignment in Registration Allows Admin Role and Balance Forgery (Critical)
- Fix: Whitelist bindable fields per endpoint; set role and balance server-side only.
- Remediation: Bind only an explicit allow-list of fields; never accept role/balance from clients.
- Retest: repeat the original exploit (Submit extra role/balance fields at registration; they are stored on the account.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Stored Cross-Site Scripting via Display Name (High)
- Fix: Escape all user content on output and add a Content-Security-Policy.
- Remediation: Context-aware output encoding for all user-supplied fields.
- Retest: repeat the original exploit (Store a script payload as the display name; it is served unescaped to other users.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Missing CSRF Protection on Profile Update (Medium)
- Fix: Require and verify anti-CSRF tokens on every state-changing request.
- Remediation: Issue per-session CSRF tokens and verify them on all POST handlers.
- Retest: repeat the original exploit (Submit a profile change with no hx_origin marker; it is accepted.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Search & Listings

### SQL Injection in Search Exposes Unpublished Listings (High)
- Fix: Parameterise search queries and enforce visibility filters server-side.
- Remediation: Use prepared statements and server-side visibility checks.
- Retest: repeat the original exploit (Inject an OR-tautology into the search term; draft listings are returned.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Reflected Cross-Site Scripting in Search Results (Medium)
- Fix: Encode reflected values and validate input types.
- Remediation: HTML-encode all reflected user input.
- Retest: repeat the original exploit (Put a script payload in the search term; it is reflected unescaped in the response.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Bidding

### Auction Accepts Bids Below Current Price (High)
- Fix: Validate bid > current price + minimum increment on the server, inside a transaction.
- Remediation: Server-side bid validation against current price and increment rules.
- Retest: repeat the original exploit (Place a bid lower than the current highest bid; it is accepted and becomes winning.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Negative Bid Amounts Accepted (Medium)
- Fix: Reject non-positive and non-numeric amounts server-side.
- Remediation: Validate all monetary inputs as positive numbers within sane ranges.
- Retest: repeat the original exploit (Submit a negative bid amount; it is stored as a bid.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Bids Accepted on Closed Auctions (High)
- Fix: Check auction status and end time server-side before accepting any bid.
- Remediation: Enforce auction lifecycle checks in the bid handler.
- Retest: repeat the original exploit (Place a bid on an auction whose status is ended; it is accepted.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Secret Reserve Price Exposed in Auction Page (Medium)
- Fix: Never send reserve prices to clients; only reveal whether the reserve was met.
- Remediation: Remove reserve values from all client-facing responses.
- Retest: repeat the original exploit (Load an auction as a non-seller; the secret reserve price is present in the response.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Seller & Listings

### Broken Object-Level Authorisation on Listing Edit (High)
- Fix: Verify ownership (or an admin role) server-side before any object mutation.
- Remediation: Ownership checks on every object read/write.
- Retest: repeat the original exploit (Change another user's listing; the change is saved.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Live Auction Terms Editable After Bids Placed (Medium)
- Fix: Lock key fields once an auction has bids, or require cancelling and relisting.
- Remediation: Freeze listing terms after the first bid.
- Retest: repeat the original exploit (The owner edits a live auction that already has bids; the platform accepts it.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Draft Listings Accessible by Direct ID (Medium)
- Fix: Enforce status + ownership checks on object reads.
- Remediation: Server-side visibility and ownership checks on every listing view.
- Retest: repeat the original exploit (Request a draft listing by id as a non-owner; it is served in full.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Payments & Settlement

### Settlement Accepts Arbitrary Payment Amounts (Critical)
- Fix: Compute the amount due server-side and require an exact match with the payment confirmation.
- Remediation: Server-side amount verification before marking settlements paid.
- Retest: repeat the original exploit (Pay less than the winning amount; the settlement is marked fully PAID.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Zero-Value Settlement Marks Auction as Paid (High)
- Fix: Require a positive payment equal to the server-computed amount due.
- Remediation: Reject zero/negative payments; verify amount due server-side.
- Retest: repeat the original exploit (Submit amount 0; the settlement is marked PAID.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Settlement Invoices Accessible by Other Users (IDOR) (High)
- Fix: Ownership checks on settlement reads; use unguessable references.
- Remediation: Authorise every settlement read against the session user.
- Retest: repeat the original exploit (View another user's settlement invoice by changing the id.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Admin Panel

### Admin Panel Accessible to Non-Admin Users (Critical)
- Fix: Role checks on every admin route, enforced server-side.
- Remediation: Server-side role enforcement on all administrative routes.
- Retest: repeat the original exploit (Load the admin panel with a non-admin account; it renders fully, including passwords.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Missing CSRF Protection on Administrative Actions (High)
- Fix: Anti-CSRF tokens plus SameSite cookies on all admin actions.
- Remediation: Verify CSRF tokens on every state-changing admin route.
- Retest: repeat the original exploit (Trigger the admin end-auction action with no hx_origin marker; it executes.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

## Platform & API

### Unauthenticated Debug Endpoint Exposes All User Credentials (Critical)
- Fix: Remove debug endpoints from production builds; gate diagnostics behind admin auth and network controls.
- Remediation: Remove or strictly protect diagnostic endpoints in production.
- Retest: repeat the original exploit (Fetch the debug endpoint without any session; full user records with passwords are returned.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.

### Forgeable API Tokens (Base64 of Email) (High)
- Fix: Issue random, revocable API tokens stored hashed server-side.
- Remediation: Use cryptographically random API tokens with server-side verification.
- Retest: repeat the original exploit (Present base64(email) as the API token; the API accepts it as that user.) — it must no longer succeed, and the test must stay un-passed on a fresh progress file.
