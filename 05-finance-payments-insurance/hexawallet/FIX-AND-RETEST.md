# HexaWallet — Fix & Retest

For every scored test: the secure implementation and the regression test that proves the fix. Work through them after completing the lab — finding a flaw is half the job; verifying the fix is the other half.

## Login & Authentication

### SQL injection login bypass
- **Report entry:** SQL Injection in Login Allows Authentication Bypass (Critical)
- **Secure implementation:** Authenticate with a parameterised query (placeholder for email) and a constant-time password-hash comparison.
- **Retest:** Regression: the classic bypass string in the email field returns the generic "invalid credentials" error and creates no session.

### Brute force — no rate limiting or lockout
- **Report entry:** Missing Rate Limiting on Login Enables Brute Force (High)
- **Secure implementation:** Count failures per account+IP; after 5 failures require CAPTCHA, after 10 lock for 15 minutes and notify the account owner.
- **Retest:** Regression: 11 rapid wrong-password attempts end in a lockout response, and the correct password is refused until the lock expires.

### Account enumeration via forgot-password
- **Report entry:** User Enumeration Through Password-Reset Responses (Medium)
- **Secure implementation:** Return the same "if the account exists, a link was sent" message and timing for every reset request.
- **Retest:** Regression: reset requests for a real and a fake address produce byte-identical responses.

### Shipped demo account with default credentials
- **Report entry:** Default Demo Account Enabled With Known Password (High)
- **Secure implementation:** Remove the demo account from production seeds; require any seeded account to set a unique password on first boot.
- **Retest:** Regression: demo@hexawallet.local / demo123 no longer authenticates on a fresh install.

### Predictable password-reset token
- **Report entry:** Password-Reset Tokens Are Predictable (High)
- **Secure implementation:** Generate tokens with crypto.randomBytes(32), store only their SHA-256 hash, expire after 15 minutes and single use.
- **Retest:** Regression: a token computed from account id + current time is rejected; only the issued random token works, once.

### Session role taken from a client cookie
- **Report entry:** Authorization Role Trusted From Client Cookie (Critical)
- **Secure implementation:** Keep the role in the server-side session record only; ignore any role claim arriving in cookies or headers.
- **Retest:** Regression: setting hx_role=admin as a normal user still returns 403 on /admin.

## Registration & Profile

### Weak password policy not enforced
- **Report entry:** Password Complexity Policy Not Enforced Server-Side (Medium)
- **Secure implementation:** Enforce a minimum of 10 characters plus a breached-password list on the server for register and reset.
- **Retest:** Regression: registering with a 1-character password is rejected with a policy error.

### Mass assignment — balance, KYC and role are client-settable
- **Report entry:** Mass Assignment Allows Setting Balance, KYC Status and Role (Critical)
- **Secure implementation:** Bind only an allow-list (name, phone) on register/profile; balance, role and KYC are writable only by dedicated privileged flows.
- **Retest:** Regression: posting balance/kyc/role fields leaves all three unchanged on the account.

### Stored XSS in display name
- **Report entry:** Stored Cross-Site Scripting via Display Name (High)
- **Secure implementation:** HTML-encode the display name everywhere it renders and restrict names to letters, spaces and basic punctuation.
- **Retest:** Regression: a script payload saved as a name renders as inert text on the dashboard and recipient lists.

### CSRF on profile update
- **Report entry:** Missing CSRF Protection on Profile Update (Medium)
- **Secure implementation:** Issue a per-session CSRF token rendered into the form and verify it on POST; set SameSite=Lax on the session cookie.
- **Retest:** Regression: a cross-site POST without the token is rejected with 403 and the profile is unchanged.

## Transfers

### Negative transfer amount steals from the recipient
- **Report entry:** Negative Transfer Amounts Reverse the Money Flow (Critical)
- **Secure implementation:** Reject any amount that is not a finite number greater than zero, before touching balances.
- **Retest:** Regression: a transfer of -50 is refused and both balances are unchanged.

### Double-spend — replayed transfer is applied twice
- **Report entry:** Transfers Are Not Idempotent — Replay Causes Double-Spend (High)
- **Secure implementation:** Store processed idempotency nonces per sender in the database with a unique constraint; a duplicate returns the first result without re-applying.
- **Retest:** Regression: replaying the same transfer request (same nonce) moves money exactly once.

### Recipient swapped at the confirmation step
- **Report entry:** Transfer Recipient Taken From Client Field at Confirmation (High)
- **Secure implementation:** Create the pending transfer server-side and confirm by id only; ignore recipient/amount fields posted at confirm time.
- **Retest:** Regression: editing the hidden recipient field has no effect — funds go to the originally reviewed recipient.

### Transfer receipt IDOR — anyone can read any receipt
- **Report entry:** Insecure Direct Object Reference on Transfer Receipts (Medium)
- **Secure implementation:** Before serving a receipt, verify the session user is the sender or the recipient of that transaction.
- **Retest:** Regression: a third party opening another pair's receipt gets 403.

### Per-transfer limit enforced only in the web UI, not the API
- **Report entry:** Transfer Limit Not Enforced on API Endpoint (High)
- **Secure implementation:** Enforce the per-transfer limit in the shared transfer service used by web and API alike.
- **Retest:** Regression: a $600 API transfer is refused with the same limit error as the web flow.

## Top-ups & Cards

### Top-up credits more than the card is charged
- **Report entry:** Top-Up Amount and Card Charge Both Client-Controlled (Critical)
- **Secure implementation:** Credit exactly the amount confirmed by the payment processor webhook; never read amount/charge fields from the client for crediting.
- **Retest:** Regression: posting amount=200&charge=20 credits nothing until a processor confirmation for $20 arrives, then credits $20.

### Top-up accepts any card number, valid or not
- **Report entry:** No Validation of Card Numbers on Top-Up (High)
- **Secure implementation:** Tokenise cards through the processor, validate format/Luhn client- and server-side, and store only brand + last4.
- **Retest:** Regression: a top-up with card number 1234 is rejected before any credit is applied.

### Linked card details of other users exposed (full PAN)
- **Report entry:** IDOR Exposes Full Card Numbers of Other Users (Critical)
- **Secure implementation:** Check card ownership on the detail endpoint and render only brand + last4 — full PAN is never stored or shown.
- **Retest:** Regression: opening another user's card id returns 403 and no card data.

## KYC & Verification

### Unverified (KYC) account can withdraw to a bank
- **Report entry:** KYC Verification Not Enforced on Bank Withdrawal (High)
- **Secure implementation:** Check kyc.status === verified on the withdrawal endpoint itself for every request.
- **Retest:** Regression: an unverified account POSTing to /withdraw receives 403 and its balance is unchanged.

### KYC identity record of other users readable
- **Report entry:** IDOR on KYC Identity Records (High)
- **Secure implementation:** Restrict KYC records to the owner (and audited compliance roles); log every access.
- **Retest:** Regression: /kyc/<other id> returns 403 for a non-owner.

## Transaction History

### Full transaction history of any user via ?user=
- **Report entry:** Transaction History IDOR via User Parameter (High)
- **Secure implementation:** Scope history strictly to the session user; staff access goes through a separate, authorized support tool.
- **Retest:** Regression: /history?user=<other> shows only the session user’s own history.

### Reflected XSS in history search
- **Report entry:** Reflected Cross-Site Scripting in Transaction Search (Medium)
- **Secure implementation:** HTML-encode the search term when reflecting it and add a Content-Security-Policy header.
- **Retest:** Regression: searching a script payload shows it as plain text and nothing executes.

## Admin Panel

### State-changing admin action over GET (freeze account)
- **Report entry:** Account Freeze Performed via Unprotected GET Request (Medium)
- **Secure implementation:** Make freeze a POST with a CSRF token and a confirmation step; never mutate state on GET.
- **Retest:** Regression: GET /admin/freeze?id=… returns 405 and the account state is unchanged.

## Platform & API

### Unauthenticated /api/users dumps balances and card numbers
- **Report entry:** Unauthenticated API Endpoint Exposes All User and Card Data (Critical)
- **Secure implementation:** Require staff authentication + a dedicated permission for any user-directory API; return minimal fields (never PANs).
- **Retest:** Regression: an unauthenticated GET /api/users returns 401.

### API accepts base64(email) as a valid token
- **Report entry:** Predictable API Token Derived From Email Address (High)
- **Secure implementation:** Accept only the high-entropy issued token (hashed at rest); remove the email-derived fallback entirely.
- **Retest:** Regression: x-api-token set to base64(email) returns 401; the issued token still works.
