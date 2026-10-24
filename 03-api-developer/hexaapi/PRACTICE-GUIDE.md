# HexaAPI — Practice Guide (LAB 21)

Work the scored tests feature by feature. Every test completes by DOING — the server detects the real exploit effect and raises your progress (see the header bar and /tests). Each test lists its 3 graded hints (the same ones on the /tests page and in the Lab Coach, which unlocks step-by-step help after 3 genuine attempts on a feature). Progress is saved in progress.json and survives restarts.

**Setup:** `node server.js` → http://localhost:3030 · Unlock with the Lab 20 completion key · Demo accounts and keys are in README.md.

## Authentication & Tokens (4 tests)

### Brute Force — No Rate Limit on API Login
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — An unthrottled login endpoint makes online password guessing free and quiet; weak passwords fall in minutes.
- **Hint 1:** The API login endpoint answers every attempt at full speed — no lockout, no delay, no CAPTCHA.
- **Hint 2:** Script 10+ wrong passwords for omar@nimbus.test against POST /api/v2/auth/login and watch every one get processed.
- **Hint 3:** After 10 accepted failures the lab marks this test — a real attacker just keeps going until the password falls.

### JWT Forgery — alg=none & Weak Leaked Secret
- **OWASP:** API2 Broken Authentication · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Token verification must pin the algorithm, reject unsigned tokens outright, and protect a strong random secret — a hand-rolled verifier gets all three wrong.
- **Hint 1:** Decode any token (base64) and read its header — then ask what the verifier does when alg is 'none' and the signature is empty.
- **Hint 2:** The signing secret is also a guessable word — and it leaks somewhere in this app (another test finds it).
- **Hint 3:** Build an unsigned token with uid 5 (the platform operator) and call GET /api/v2/auth/me with it.

### Token Lifecycle — Logout & Password Change Revoke Nothing
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Stateless tokens without a revocation story cannot be killed: logout and password changes must invalidate outstanding tokens (denylist or token versioning), and lifetimes must be short.
- **Hint 1:** Log in via the API and save the token. Now POST /api/v2/auth/logout with it — then call /api/v2/auth/me with the SAME token.
- **Hint 2:** Still works? Decode the token and read its exp claim — how many years is this session meant to live?
- **Hint 3:** Change the account password (PATCH /api/v2/users/me) and try the old token once more.

### OTP Brute Force — 4-Digit Code, Unlimited Attempts
- **OWASP:** API6 Unrestricted Access to Sensitive Business Flows · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Short codes plus unlimited verification attempts equal no second factor at all; attempt counters and expiry are part of the control, not extras.
- **Hint 1:** Request a login OTP for wren@vertex.test (POST /api/v2/auth/request-otp). The code is only 4 digits.
- **Hint 2:** Fire wrong guesses at /api/v2/auth/verify-otp — count how many the endpoint accepts without slowing down or locking.
- **Hint 3:** After 10 failed attempts the lab marks this test; the full code space is only 10,000 — scriptable in minutes.

## Registration & Accounts (4 tests)

### Account Enumeration — Register & Login Oracles
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Auth-adjacent endpoints must answer uniformly; a differing response turns registration and login forms into a user-directory lookup.
- **Hint 1:** Register with an email that already exists (nina@nimbus.test) and read the exact error message.
- **Hint 2:** Compare the API login errors for a real email with a wrong password vs an email that does not exist at all.
- **Hint 3:** Different answers = an oracle: attackers harvest the real user list first, then attack only accounts that exist.

### Mass Assignment — Privilege Fields in Register & PATCH
- **OWASP:** API3 Broken Object Property Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Bind only allowlisted fields per endpoint; role, tenant and admin flags must never arrive from the client.
- **Hint 1:** The register form shows a few fields — the server binds more than the form shows.
- **Hint 2:** In Burp or curl, POST /api/v2/auth/register with extra JSON fields: role, company_id, is_admin.
- **Hint 3:** Or PATCH /api/v2/users/me with role/is_admin — then read back what stuck.

### Weak Password Policy — 1-Character Passwords Accepted
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — A password policy is cheap defence-in-depth: minimum length and breached-password checks remove the weakest tier of accounts.
- **Hint 1:** Register a new account and try the shortest password the API lets you submit.
- **Hint 2:** There is no policy at all — a single character is accepted.
- **Hint 3:** Every brute-force and credential-stuffing attack gets easier when accounts like this exist.

### Stored XSS — Script Payload in a User Name Reaches the Admin Console
- **OWASP:** A03 Injection (XSS) · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Output encoding must be contextual and universal — one unescaped render point poisons every viewer, including staff.
- **Hint 1:** Some user-controlled text is rendered back RAW somewhere staff look. The admin console prints user names without encoding.
- **Hint 2:** Register (or import) a user whose name is an HTML/script payload.
- **Hint 3:** Open /admin as any logged-in user — the payload is served from storage to every viewer of that console.

## Object Access (BOLA) (3 tests)

### BOLA — Cross-Company Orders, Users & Invoices by ID
- **OWASP:** API1 Broken Object Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Every object fetch must verify the object belongs to the caller’s tenant — the ID in the URL is not an authorisation check.
- **Hint 1:** Object IDs are global and sequential across companies. Log in as Omar (Nimbus) and ask for order #3.
- **Hint 2:** Order #3 belongs to Vertex Health — read its note. Users and invoices work the same way: /api/v2/users/4, /api/v2/invoices/2.
- **Hint 3:** Creating works too: POST /api/v2/orders with another company’s company_id in the body.

### Parameter Pollution — ?company_id= Overrides Your Tenant
- **OWASP:** API1 Broken Object Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Tenant scope is a server-side fact derived from the authenticated identity; client parameters may filter within that scope, never widen it.
- **Hint 1:** Your token already says which company you belong to. The list endpoints ALSO listen to a query parameter.
- **Hint 2:** GET /api/v2/orders?company_id=2 with Omar’s company-1 token and compare the rows.
- **Hint 3:** Tenancy must come from the credential — never from a client-supplied parameter.

### GraphQL BOLA — Cross-Company User Resolution
- **OWASP:** API1 Broken Object Level Authorization · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — GraphQL resolvers need the same per-object authorisation as REST handlers; a new protocol surface does not inherit the old checks automatically.
- **Hint 1:** The GraphQL endpoint resolves objects with the same missing checks as REST.
- **Hint 2:** POST /graphql with a user(id:) query for a Vertex user (id 4) using Omar’s token.
- **Hint 3:** The resolver never asks which company you belong to — the full record comes back.

## Admin & Function Access (2 tests)

### BFLA — Admin Functions Without an Admin Check (+ X-Admin Header Trust)
- **OWASP:** API5 Broken Function Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Function-level authorisation must be enforced server-side on every route, and roles must come from the authenticated session — never from client-supplied headers.
- **Hint 1:** Admin functions live at /api/v2/admin/* and DELETE /api/v2/users/:id. Ask what the server checks before running them — not what the UI shows.
- **Hint 2:** As plain-user Omar: GET /api/v2/admin/users, or DELETE a throwaway user you registered.
- **Hint 3:** For /api/v2/admin/stats you get 403 — until you add one header the route blindly trusts: X-Admin: true.

### GraphQL BFLA — Role Mutation for Any Caller
- **OWASP:** API5 Broken Function Level Authorization · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Every mutation is a privileged function: apply the same role and tenant checks as the equivalent REST endpoint.
- **Hint 1:** The schema (find it via introspection) contains a mutation that changes user roles.
- **Hint 2:** Call updateUserRole as plain-user Omar, on any user id you like.
- **Hint 3:** No admin check, no company check — the role changes. Mutations are functions, and functions need authorisation.

## API Keys (3 tests)

### API Key Scope Never Enforced — Read-Only Key Deletes Users
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Scopes are authorisation decisions: enforce them on every route, or do not pretend they exist.
- **Hint 1:** Nimbus’s first key (see /keys or the README) is labelled read-only. Its scope is stored — find out if anything ever checks it.
- **Hint 2:** Use hx_live_nimbus_0001 as a Bearer token on a WRITE: DELETE a throwaway user you registered.
- **Hint 3:** It works. A ‘read-only’ key with full write power is just a leaked password waiting to happen.

### Predictable API Keys — Pattern Gives Away Every Company’s Keys
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — API keys are credentials: they need unguessable random material, not a company name and a counter.
- **Hint 1:** Keys follow a pattern: hx_live_<company-slug>_<sequence>. You have seen Nimbus’s keys — what is Vertex’s first key, from memory alone?
- **Hint 2:** Log in to the portal as Omar, then call /api/v2/auth/me presenting the key you predicted — as Omar, who was never issued it.
- **Hint 3:** Possession is the only check, and the secret is guessable: that is the whole flaw.

### API Keys Accepted in the URL Query String
- **OWASP:** API2 Broken Authentication · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Credentials belong in headers, never URLs; servers must reject query-string keys so they cannot leak through logs and history.
- **Hint 1:** Keys work in the Authorization header — try them somewhere they should never be accepted.
- **Hint 2:** GET /api/v2/auth/me?api_key=<your-key> with no header at all.
- **Hint 3:** URLs land in server logs, browser history, proxies and Referer headers — every one of those is a key leak.

## Data Exposure & Exports (3 tests)

### Excessive Data Exposure — Full User Records incl. Password Hashes
- **OWASP:** API3 Broken Object Property Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Serializers must be per-endpoint allowlists; returning the database row ‘because it is convenient’ leaks credentials and PII by default.
- **Hint 1:** Compare what the portal SHOWS about a user with what the API RETURNS for the same user.
- **Hint 2:** GET /api/v2/users/4 as Omar and read every field: password_hash, ssn_last4, internal_notes.
- **Hint 3:** The UI never displays these — the API hands them to any authenticated caller.

### Export Leak — Users CSV Contains Every Company
- **OWASP:** API3 Broken Object Property Level Authorization · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Exports must be scoped to the caller’s tenant and minimised to business-necessary fields; treat bulk export as a privileged, logged function.
- **Hint 1:** Exports are bulk data — ask whose rows the users export really contains.
- **Hint 2:** GET /api/v2/users/export.csv as Omar and count the companies in the file.
- **Hint 3:** Nimbus, Vertex AND the platform operator — with hashes and SSN fragments. Bulk endpoints need tenant scoping most of all.

### Debug Config — JWT Secret & Internals, No Auth
- **OWASP:** API8 Security Misconfiguration · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Debug and diagnostics endpoints must never ship reachable in production; if retained, they need hard authentication and network restrictions.
- **Hint 1:** Debug surfaces ship in builds more often than anyone admits. This API has one — the docs do not list it, the path is guessable: /api/v2/debug/config.
- **Hint 2:** Open it logged out. Read what it prints about the token system.
- **Hint 3:** It hands you the signing secret — the master key for the JWT forgery test.

## Integrations & Webhooks (3 tests)

### SSRF — URL Fetcher & Webhook Tester Reach Internal Endpoints
- **OWASP:** API7 Server Side Request Forgery · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Any server-side URL fetch needs scheme/host allowlisting and private-range blocking after DNS resolution — otherwise it is an internal-network proxy.
- **Hint 1:** Two features fetch URLs server-side: POST /api/v2/integrations/fetch-url and the webhook tester. Neither allowlists anything.
- **Hint 2:** Point fetch-url at the app’s OWN internal vault: http://127.0.0.1:3030/internal/secret.
- **Hint 3:** The server fetches it ‘from inside’ and returns the body — including the JWT secret. Who made that request, your browser or the server?

### Unsafe Consumption — Import Feed Creates Privileged Accounts
- **OWASP:** API10 Unsafe Consumption of APIs · **Difficulty:** Intermediate
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Third-party data is untrusted input: validate against a strict schema and never import privilege fields — assign least-privilege defaults instead.
- **Hint 1:** The user-import integration trusts a remote JSON feed. Host a tiny feed yourself (any static server) with one user object.
- **Hint 2:** Set role, company_id and is_admin in the feed — fields a feed should never control.
- **Hint 3:** Import it as Omar (POST /api/v2/integrations/import-users), then log in as the imported user. Third-party data just became privileged accounts.

### Forged Webhooks — Payment Events Accepted Without a Signature
- **OWASP:** API8 Security Misconfiguration · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Webhook receivers must verify an HMAC signature and a replay window per endpoint secret; webhook-driven state changes are financial transactions.
- **Hint 1:** Order #2 is pending. The incoming webhook receiver flips orders to paid — ask what proof it demands from the sender.
- **Hint 2:** POST /api/v2/webhooks/receive with {order_id: 2, status: 'paid'} — no signature, no secret, no auth header.
- **Hint 3:** Re-read order #2 (and its invoice). Financial state changed on an unsigned stranger’s say-so.

## Platform & Inventory (3 tests)

### Improper Inventory — Legacy v1 Live Without Auth + Undocumented /internal/*
- **OWASP:** API9 Improper Inventory Management · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Maintain a full API inventory: retire or fully secure old versions, and keep internal endpoints on a separate, access-controlled interface.
- **Hint 1:** The docs list only v2. Old versions rarely die — try /api/v1/orders with NO Authorization header at all.
- **Hint 2:** Then try the undocumented v2 internal routes with Omar’s ordinary token: /api/v2/internal/metrics and /api/v2/internal/users/export.
- **Hint 3:** Shadow surfaces carry none of the current version’s fixes — and all of its data.

### Unrestricted Resource Consumption — Uncapped Limits & Expensive Reports
- **OWASP:** API4 Unrestricted Resource Consumption · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Every list needs a server-side page cap and every expensive operation a cost budget; unbounded client-chosen work is a denial-of-service feature.
- **Hint 1:** List endpoints honour ?limit= — ask how high it goes (register a crowd of users first, then try limit=100000).
- **Hint 2:** The usage report is worse: GET /api/v2/reports/run?months=120 and read rows_scanned in the response.
- **Hint 3:** No page cap, no cost budget, no timeout — the client chooses how much work the server does.

### GraphQL Introspection — Full Schema Disclosed to Any Caller
- **OWASP:** API8 Security Misconfiguration · **Difficulty:** Beginner
- **Objective:** make the exploit's real effect happen (the server marks the test when it observes it) — Introspection belongs in development; production GraphQL needs it disabled, plus depth/cost limits and per-field authorisation.
- **Hint 1:** GraphQL introspection is a developer convenience — in production it is a map of everything, including the sensitive bits.
- **Hint 2:** POST /graphql with an introspection query ({ __schema { ... } }) using any ordinary token.
- **Hint 3:** The schema names the sensitive user fields AND the role mutation — the attacker’s shopping list, gift-wrapped.

