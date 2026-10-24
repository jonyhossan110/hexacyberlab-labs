# HexaWallet — Practice Guide

Challenges grouped by feature, ordered by difficulty inside each feature. Each challenge lists its 3 graded hints and a measurable objective. The in-app `/tests` page mirrors this guide. Remember the Lab Coach rule: step-by-step help unlocks only after **3 genuine attempts** on a feature.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** make the "sqli-login" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The login form builds its database query by gluing your input straight into the SQL string.
- Hint 2: Try a quote in the email field, then close the condition so it is always true.
- Hint 3: Classic: ' OR '1'='1 in the email field, with any password.
- **Lesson:** String-built SQL queries let an attacker rewrite the login condition itself and walk in as the first account in the table — usually the admin.

### [Beginner] Brute force — no rate limiting or lockout
- **Objective:** make the "brute-force" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Nothing slows you down when a login fails. Try the same account again. And again.
- Hint 2: Automate it: send 10+ wrong passwords for one account in a row.
- Hint 3: The 10th failure is processed exactly like the 1st — there is no throttle, CAPTCHA or lockout anywhere.
- **Lesson:** Without rate limiting, a password is only as strong as the attacker’s patience — credential stuffing and guessing run at machine speed.

### [Beginner] Account enumeration via forgot-password
- **Objective:** make the "user-enum" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Ask for a password reset for an email that exists. Then ask for one that does not.
- Hint 2: Compare the two responses word for word — the app tells you which emails are registered.
- Hint 3: Probe one real address (alice@test.local) and one invented address and watch the messages differ.
- **Lesson:** Different responses for real vs. fake accounts hand attackers a verified target list for phishing and password attacks.

### [Beginner] Shipped demo account with default credentials
- **Objective:** make the "default-creds" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Products ship with demo or starter accounts that nobody removes.
- Hint 2: The login page footer still advertises the demo workspace.
- Hint 3: Log in as demo@hexawallet.local with the password demo123.
- **Lesson:** Default and demo credentials are public knowledge — if the account stays enabled in production, it is an open door with a sign on it.

### [Intermediate] Predictable password-reset token
- **Objective:** make the "reset-token" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Request a reset and look at the token format — it is shown in the simulation panel.
- Hint 2: The token is built from the account id and the current time of day. Nothing random is in it.
- Hint 3: Token = RST-<account id>-<minutes since midnight, zero-padded>. Compute it for any account, right now.
- **Lesson:** A reset token is a temporary password. If it is derived from guessable values (id + clock), anyone can mint one for any account.

### [Intermediate] Session role taken from a client cookie
- **Objective:** make the "cookie-role" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: After login, inspect the cookies the app sets — one of them describes your role.
- Hint 2: The server trusts that cookie instead of looking your role up itself.
- Hint 3: Set the hx_role cookie to admin in your browser, then visit /admin.
- **Lesson:** Authorization data must live server-side. If the client supplies its own role, every user is one cookie edit away from admin.

## Registration & Profile

### [Beginner] Weak password policy not enforced
- **Objective:** make the "weak-password" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The sign-up page claims passwords need 8+ characters. Test that claim.
- Hint 2: Register a new account with a 1-character password.
- Hint 3: It is accepted — the policy exists only as text on the page.
- **Lesson:** A password policy that is displayed but not enforced server-side gives a false sense of security while users pick trivial passwords.

### [Beginner] Stored XSS in display name
- **Objective:** make the "stored-xss" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Your display name is shown to other users — in recipient lists and greetings.
- Hint 2: Set your profile name to an HTML payload instead of a name.
- Hint 3: Use <script>alert(1)</script> or <img src=x onerror=alert(1)> as the display name, then view a page that renders it.
- **Lesson:** Any field rendered back to other users is an injection surface; unsanitised names turn one account’s profile into script execution for everyone who views it.

### [Intermediate] Mass assignment — balance, KYC and role are client-settable
- **Objective:** make the "mass-assignment" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Registration and profile update copy every submitted field onto your account record.
- Hint 2: Add fields the form never shows: balance, kyc, role.
- Hint 3: Register with extra fields balance=5000&kyc=verified, or add them to a profile update, and watch your account change.
- **Lesson:** Binding request fields directly to the data model lets clients write columns the UI never offered — balances and verification flags included.

### [Intermediate] CSRF on profile update
- **Objective:** make the "profile-csrf" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The profile form changes state with no anti-CSRF token.
- Hint 2: A POST from another origin — or simply without the app’s own marker cookie — is still accepted.
- Hint 3: Submit the profile form cross-site (foreign Origin header, no hx_origin marker) and the change applies.
- **Lesson:** State-changing endpoints without CSRF defence let any website a victim visits rewrite their wallet profile using their own session.

## Transfers

### [Beginner] Negative transfer amount steals from the recipient
- **Objective:** make the "negative-transfer" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The transfer form asks for an amount. Nobody said it had to be positive.
- Hint 2: Send a transfer with a negative amount, e.g. -50.
- Hint 3: The maths runs backwards: your balance goes UP and the recipient’s goes DOWN.
- **Lesson:** Business rules (amounts must be positive) are security controls. Validating only the field’s type, not its sign, reverses the money flow.

### [Beginner] Transfer receipt IDOR — anyone can read any receipt
- **Objective:** make the "receipt-idor" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Every completed transfer gets a receipt page at /receipt/<id>.
- Hint 2: Receipts are numbered sequentially and never checked against the viewer.
- Hint 3: Log in as a third party and open the receipt of a transfer between two other users.
- **Lesson:** Sequential object ids plus missing ownership checks expose every record in the system to every logged-in user.

### [Intermediate] Double-spend — replayed transfer is applied twice
- **Objective:** make the "double-spend" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Each transfer form carries a client nonce meant to make the request unique.
- Hint 2: Capture one transfer request and send the exact same request (same nonce) a second time.
- Hint 3: The server never checks whether the nonce was already used — both transfers land.
- **Lesson:** Payment operations need idempotency. Without server-side deduplication, a retry or replay duplicates the money movement.

### [Intermediate] Recipient swapped at the confirmation step
- **Objective:** make the "recipient-tamper" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Quick Send is two steps: enter details, then confirm. The confirm form carries the recipient in a hidden field.
- Hint 2: Start a transfer to one person, then edit the hidden recipient field before confirming.
- Hint 3: The server trusts the confirmed field, not the transfer you started — the money lands with whoever is in the field.
- **Lesson:** Multi-step flows must bind each step to server-side state. Trusting hidden form fields at confirm time lets the destination be rewritten mid-flight.

### [Advanced] Per-transfer limit enforced only in the web UI, not the API
- **Objective:** make the "limit-bypass" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The web form refuses transfers above $500. That check lives in the web flow only.
- Hint 2: The JSON API endpoint /api/transfer performs transfers with your API token — find yours on the API page.
- Hint 3: POST a $600 transfer through the API. It sails past the limit the website enforces.
- **Lesson:** A control enforced in one interface but not another does not exist. Every entry point to a money movement must enforce the same limits.

## Top-ups & Cards

### [Beginner] Top-up accepts any card number, valid or not
- **Objective:** make the "card-any" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Link a new card during top-up and see what validation happens. Very little.
- Hint 2: Try a card number of 1234.
- Hint 3: The top-up succeeds and the nonsense card is stored — no format, length or checksum validation at all.
- **Lesson:** Payment instruments must be validated (format, Luhn, processor tokenisation). Accepting arbitrary strings means the "payment" behind a top-up may not exist.

### [Beginner] Linked card details of other users exposed (full PAN)
- **Objective:** make the "card-idor" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Your linked cards live at /cards, and each card has a detail page /cards/<id>.
- Hint 2: Ids are sequential and ownership is never checked — and the detail page prints the full card number.
- Hint 3: Open another user's card id and read their complete PAN.
- **Lesson:** Payment data needs the strictest object-level authorization — and full card numbers should never be displayed or stored in the clear at all.

### [Intermediate] Top-up credits more than the card is charged
- **Objective:** make the "topup-tamper" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The top-up form posts two numbers: the amount credited and the amount charged to the card.
- Hint 2: They travel as separate fields — and the server believes both.
- Hint 3: Post amount=200 with charge=20. Your wallet gains $200; the card was "charged" $20.
- **Lesson:** When price/charge data travels with the request, the client sets the price. The amount credited must be derived from the verified payment, never from form fields.

## KYC & Verification

### [Beginner] KYC identity record of other users readable
- **Objective:** make the "kyc-idor" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Your own identity record is at /kyc. Other users’ records sit at /kyc/<user id>.
- Hint 2: No ownership check stands between you and their legal name, date of birth and ID number.
- Hint 3: Open /kyc/2 while logged in as someone else and read Alice's identity record.
- **Lesson:** Identity documents are the most sensitive data a wallet holds; per-object authorization is not optional on KYC records.

### [Intermediate] Unverified (KYC) account can withdraw to a bank
- **Objective:** make the "kyc-bypass" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Bank withdrawal is supposed to require completed KYC. The withdraw page hides the form from unverified users.
- Hint 2: Hiding a form is not a check. The POST endpoint itself never verifies KYC status.
- Hint 3: Log in as carol@test.local (unverified) and POST directly to /withdraw.
- **Lesson:** Compliance gates are security controls: if the check lives only in the UI, unverified money can still leave the platform.

## Transaction History

### [Beginner] Full transaction history of any user via ?user=
- **Objective:** make the "history-idor" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The history page accepts a user parameter — meant for internal support tooling.
- Hint 2: It never checks that the user you ask for is you.
- Hint 3: Open /history?user=2 as a different account and read Alice’s complete money history.
- **Lesson:** Convenience parameters that select "whose data" must be authorized as strictly as the data itself.

### [Beginner] Reflected XSS in history search
- **Objective:** make the "history-xss" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: History search echoes your search term back at the top of the results.
- Hint 2: It echoes it as raw HTML.
- Hint 3: Search for <script>alert(1)</script> and watch it land unescaped in the page.
- **Lesson:** Reflected input must be output-encoded everywhere — search boxes are a classic place teams forget.

## Admin Panel

### [Intermediate] State-changing admin action over GET (freeze account)
- **Objective:** make the "admin-csrf" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: Admins freeze and unfreeze accounts from the admin panel — by clicking a link.
- Hint 2: A link means a GET request changes account state, with no token and no confirmation.
- Hint 3: As an admin (see the cookie test), call /admin/freeze?id=<user> directly — an image tag on any page could do the same to a logged-in admin.
- **Lesson:** GET requests must never change state. Without CSRF tokens, admin powers can be triggered by any page an admin merely views.

## Platform & API

### [Beginner] Unauthenticated /api/users dumps balances and card numbers
- **Objective:** make the "api-users-dump" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The JSON API has a users endpoint meant for internal tooling.
- Hint 2: It asks for no token, no session, nothing.
- Hint 3: Fetch /api/users logged out and receive every account with its balance and full card numbers.
- **Lesson:** Debug and internal endpoints shipped to production without authentication are bulk-data breaches waiting for a crawler.

### [Advanced] API accepts base64(email) as a valid token
- **Objective:** make the "api-weak-token" test flip to done on /tests by performing the real exploit against the running wallet.
- Hint 1: The API authenticates with a token. A legacy fallback was left in the token check.
- Hint 2: The fallback accepts something derived only from a public value: the account email.
- Hint 3: Call /api/wallet with the header x-api-token set to the base64 encoding of any user’s email address.
- **Lesson:** A token that can be computed from public data is not a credential. Fallback auth paths are still auth paths — attackers only need the weakest one.
