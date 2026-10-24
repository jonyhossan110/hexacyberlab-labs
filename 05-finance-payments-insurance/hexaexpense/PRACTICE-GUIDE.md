# HexaExpense — Practice Guide (LAB 50)

Hands-on challenges for every scored test. Work through the in-app Mission page
(/tests) — it mirrors this guide. Hints are graded: try first, then open them one
at a time. The Lab Coach chatbot unlocks step-by-step help for a feature after you
have made at least 3 genuine attempts on it. Progress is saved in progress.json and
survives restarts.

## Login & Authentication

### [Beginner] SQL injection login bypass (legacy SSO route)
- **Objective:** Make the "sqli-login" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. The main login is parameterised, but finance staff mention a "legacy SSO" login page linked from the footer.
  2. The legacy route builds its query by gluing your input straight into a SQL string. What happens if the password field closes the string early?
  3. Try a password like ' OR '1'='1 — or truncate the query with a comment — so the password check evaluates to true for the first user.
- **What it teaches:** String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries remove the whole class.

### [Beginner] No rate limiting on login (brute force)
- **Objective:** Make the "brute-force" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Pick one account and simply keep guessing wrong passwords.
  2. Count how many failures the server accepts in a row — does anything slow down, lock, or CAPTCHA?
  3. After 10+ rapid failures the login still processes attempts normally — that missing throttle is the finding.
- **What it teaches:** Without throttling or lockout, password guessing is free and unlimited; detection here fires when the 10th failure is still processed.

### [Beginner] User enumeration via login & password-reset responses
- **Objective:** Make the "user-enum" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Compare the exact wording of a failed login for an email that exists vs one that does not.
  2. The forgot-password page answers differently too — one says a reset was sent, the other admits the account is unknown.
  3. Probe both a real and an invented email on either form and note the difference.
- **What it teaches:** Different error messages for "no such user" and "wrong password" hand attackers a verified target list for free.

### [Beginner] Default demo credentials left active
- **Objective:** Make the "default-creds" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Seeded demo accounts are a classic leftover — the login page footer even hints a demo account exists.
  2. Demo accounts almost always use the product name or "demo" in both fields.
  3. Try demo@acme.test with the password demo123.
- **What it teaches:** Vendor/demo accounts with guessable passwords survive into production unless someone explicitly removes them.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the "reset-token" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Request a reset for your own account and study the token format in the "sent" confirmation.
  2. The token is derived from something stable about the account — look at your user id and a simple arithmetic pattern.
  3. Tokens look like rst-<id>-<id times 137 plus 42>. Forge one for the admin (id 4) and set a new password.
- **What it teaches:** Reset tokens must be unguessable random values; a token derived from the user id is an account-takeover formula.

### [Intermediate] Role stored in a client cookie (session/role tampering)
- **Objective:** Make the "cookie-role" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. After logging in as a normal employee, inspect the cookies the app sets.
  2. One cookie repeats your role — and some pages trust it more than the server-side session.
  3. Set hx_role=finance in your browser and open the Finance queue; then try hx_role=admin on the Admin panel.
- **What it teaches:** Authorization data kept on the client is attacker-controlled; roles must live server-side in the session.

## Registration & Profile

### [Beginner] Stored XSS in display name
- **Objective:** Make the "xss-profile" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Names are printed on dashboards, approval queues and admin lists — anywhere your name renders is a payload slot.
  2. Set your display name to an HTML/JS payload such as <script>alert(1)</script> or an <img onerror> tag.
  3. The payload is stored and served unescaped to other users — that persistence is the finding.
- **What it teaches:** User-controlled text must be output-encoded everywhere it renders, especially in back-office views.

### [Intermediate] Mass assignment on registration (role self-assignment)
- **Objective:** Make the "mass-assign" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Register a normal account, then look at what fields the server might accept beyond the visible form.
  2. The handler copies the whole request body onto the new user record — including fields the form never shows.
  3. Register again adding role=finance (and a companyId of your choice) to the POST body.
- **What it teaches:** Binding request bodies directly to data models lets attackers set privileged fields the UI never offered.

### [Intermediate] CSRF on profile update
- **Objective:** Make the "csrf-profile" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Profile updates are a plain POST with no anti-CSRF token — check what the request carries.
  2. The app marks its own pages with a marker cookie; a request arriving from another site (or without the marker) should be rejected — it is not.
  3. Send the profile-change POST with a foreign Origin header (or strip cookies’ marker) and watch it apply.
- **What it teaches:** State-changing forms need unforgeable tokens; cookies alone are sent automatically by the victim’s browser.

## Expense Claims

### [Beginner] Expense IDOR — read another company’s claim
- **Objective:** Make the "expense-idor" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Your own claims live at /expenses/<id>. Note the numbering.
  2. Nothing checks that the claim belongs to you — or even to your company.
  3. Open a claim id that belongs to Globex (try the hotel claim, id 4) while logged in at Acme.
- **What it teaches:** Every object access must verify the requester owns it or is authorised — sequential ids make guessing trivial.

### [Beginner] Self-approval of own expense
- **Objective:** Make the "self-approve" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Approval is just a POST to /expenses/<id>/approve. Who does the server think is allowed to send it?
  2. The endpoint checks the status, not the relationship between approver and claim owner.
  3. While logged in as the claim’s owner, POST the approve call for your own submitted claim.
- **What it teaches:** Segregation of duties must be enforced server-side: the requester can never be the approver.

### [Intermediate] Amount tampering on a submitted claim
- **Objective:** Make the "amount-tamper" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Once a claim is submitted, the UI locks its amount — but the server still listens to the edit endpoint.
  2. POST directly to /expenses/<id>/edit with a new amount, skipping the UI entirely.
  3. Raise your submitted $180 lunch claim and reload — the stored amount changed after submission.
- **What it teaches:** Workflow locks enforced only in the UI are no lock at all; the server must enforce state rules.

### [Intermediate] Receipt swap — attach someone else’s (bigger) receipt
- **Objective:** Make the "receipt-swap" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Claims reference a receipt by id. Receipts belong to people, not to claims.
  2. The attach step never checks that the receipt is yours — or that its value matches the claim.
  3. Set your claim’s receiptId to the $640 Globex hotel receipt (id 3) and view the claim.
- **What it teaches:** Linked objects need ownership checks too; a foreign key is just another IDOR waiting to happen.

### [Advanced] Skip the manager step — straight to paid
- **Objective:** Make the "skip-step" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. The workflow is draft → submitted → (manager) approved → (finance) paid. Two different endpoints drive the last two steps.
  2. The finance "mark paid" endpoint checks the claim’s status string loosely — it never verifies a manager actually approved it.
  3. As finance, call the reimburse endpoint on a merely-submitted claim that has no manager approval recorded.
- **What it teaches:** State machines must verify the full transition history, not just the current status label.

## Approvals & Workflow

### [Intermediate] Manager approves another company’s claim
- **Objective:** Make the "cross-approve" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Bob manages Acme staff. Dave’s Globex claims are none of his business — on paper.
  2. The approve endpoint never compares the manager’s company with the claim’s company.
  3. As Bob, approve Carol’s submitted Globex hotel claim (id 4).
- **What it teaches:** Multi-tenant systems must scope every action to the actor’s tenant, not just their role.

### [Intermediate] Manager approval-limit bypass ($500 policy)
- **Objective:** Make the "approve-limit" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Company policy caps manager approvals at $500; bigger claims should route to finance.
  2. The limit is displayed in the UI as guidance — look for any server-side enforcement when approving.
  3. As Bob, approve Demo’s $900 software claim (id 7) even though it exceeds your limit.
- **What it teaches:** Business limits written in policy documents must be encoded in the approval path, not just displayed.

## Reimbursements

### [Intermediate] Reimbursement bank-account tampering (co-worker’s payout account)
- **Objective:** Make the "bank-tamper" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Bank details live on the profile. The profile-update endpoint takes a user id — whose?
  2. There is no ownership check on the bank-update action, and no re-verification step before payouts use the new details.
  3. POST a bank change for Fiona (finance, id 3) pointing her IBAN at an attacker account.
- **What it teaches:** Payout-detail changes are high-value operations: they need ownership checks, verification and audit alerts.

### [Intermediate] Double reimbursement — pay the same claim twice
- **Objective:** Make the "double-pay" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Finance marks a claim paid via the reimburse endpoint, creating a payment record each time.
  2. Nothing makes the operation idempotent — the endpoint happily runs again on a paid claim.
  3. Call reimburse twice on the same approved claim and count the payment records.
- **What it teaches:** Payment operations must be idempotent and state-guarded; a replayed request must not create a second payment.

## Budgets & Policies

### [Intermediate] Monthly Meals budget cap ($400) not enforced
- **Objective:** Make the "budget-bypass" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Policy: $400 per employee per month for Meals. Alice already has $350 of Meals claims in play this month.
  2. The submit path shows the budget on the dashboard but never blocks an over-budget claim.
  3. As Alice, submit one more Meals claim of $100+ and watch it sail past the cap.
- **What it teaches:** Budget controls that only display warnings are decoration; enforcement belongs in the submit transaction.

## Search & Reports

### [Beginner] Reflected XSS in expense search
- **Objective:** Make the "search-xss" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. The results page cheerfully prints "Results for: <your text>" back at you.
  2. It prints it raw. Markup you type becomes markup the browser runs.
  3. Search for <script>alert(1)</script> and view the page source of the response.
- **What it teaches:** Reflected input must be encoded in the response, even on "harmless" internal tools.

### [Beginner] CSV export ignores tenant scope (all companies)
- **Objective:** Make the "export-cross" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Finance can export claims to CSV from the reports page. The export was built for a single-company world.
  2. The handler forgets to filter by the requester’s company — try it as any Acme user.
  3. Download /reports/export.csv and look for Globex rows in the file.
- **What it teaches:** Exports and reports are data-access paths too; they need the same tenant filtering as the UI queries.

### [Intermediate] SQL injection in expense search leaks other tenants
- **Objective:** Make the "search-sqli" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. The expense search builds its filter from your text, like the legacy login does.
  2. A quote in the search box changes the logic of the "query" the app evaluates.
  3. Search expenses for ' OR '1'='1 and compare the result set with a normal search — other companies appear.
- **What it teaches:** Any place user input is glued into a query string is injectable — search boxes are the most common one.

## Receipts & Files

### [Intermediate] Unrestricted receipt upload — HTML served from the app origin
- **Objective:** Make the "upload-html" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. The receipt vault accepts "receipt files" by name and content, then serves them back under /files/.
  2. Nothing checks the file type — a receipt does not have to be an image or PDF at all.
  3. Upload a file named claim.html containing a script payload and open its /files/ URL.
- **What it teaches:** Uploads must be type-validated and served safely; user files on the app origin inherit the app’s trust.

### [Intermediate] Path traversal in receipt download reads server files
- **Objective:** Make the "traversal" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Downloads are served by name from the receipts folder: /files/<name>.
  2. The name is joined to the folder path without cleaning dot-dot segments.
  3. Request /files/../config.txt (URL-encode if needed) and see what answers.
- **What it teaches:** Never build filesystem paths from raw user input; resolve and confine paths to the intended directory.

## Admin Panel

### [Beginner] Admin panel reachable by non-admin users
- **Objective:** Make the "admin-access" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. There is an /admin area listing every user of every company. Who is actually stopped from opening it?
  2. The route checks that you are logged in — and stops there.
  3. Log in as a plain employee and open /admin directly.
- **What it teaches:** Authentication is not authorization; every privileged route needs its own role check.

### [Beginner] Debug endpoint dumps credentials & bank data (unauthenticated)
- **Objective:** Make the "debug-exposure" test flip to done on the Mission page by exploiting the real flaw.
- **Hints:**
  1. Developers leave diagnostics behind. Common paths: /debug, /api/debug, /status, /_debug.
  2. This one does not even ask you to log in.
  3. Fetch /api/debug with no session at all and read what it hands back.
- **What it teaches:** Debug/diagnostic endpoints must never ship to production, and never without authentication.

