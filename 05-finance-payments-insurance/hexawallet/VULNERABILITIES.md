# HexaWallet — Vulnerability Map (25 scored tests)

Grouped by feature. Every entry is a real, working vulnerability in the running app, detected server-side when the exploit succeeds.

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** Critical
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** Classic: ' OR '1'='1 in the email field, with any password.
- **Impact:** On a real wallet this is full account takeover without knowing any password: balances, transfers and personal data all exposed in one request.

### Brute force — no rate limiting or lockout
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** The 10th failure is processed exactly like the 1st — there is no throttle, CAPTCHA or lockout anywhere.
- **Impact:** Attackers can grind through password lists against real customers until one account opens, then drain its balance.

### Account enumeration via forgot-password
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** Probe one real address (alice@test.local) and one invented address and watch the messages differ.
- **Impact:** An attacker can confirm exactly which of a leaked email list holds wallet accounts, focusing attacks only where money exists.

### Shipped demo account with default credentials
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** Log in as demo@hexawallet.local with the password demo123.
- **Impact:** Anyone on the internet can sign in to the seeded demo wallet and explore a live, working account — a foothold for deeper attacks.

### Predictable password-reset token
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Intermediate · **Severity (report):** High
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** Token = RST-<account id>-<minutes since midnight, zero-padded>. Compute it for any account, right now.
- **Impact:** An attacker who knows a victim’s email can calculate a valid reset token and take over the wallet within the same minute.

### Session role taken from a client cookie
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Where:** the Login & Authentication surface of the wallet.
- **Exploitation outline:** Set the hx_role cookie to admin in your browser, then visit /admin.
- **Impact:** Any registered user can promote themselves to wallet administrator — freezing accounts and viewing every customer’s balance.

## Registration & Profile

### Weak password policy not enforced
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner · **Severity (report):** Medium
- **Where:** the Registration & Profile surface of the wallet.
- **Exploitation outline:** It is accepted — the policy exists only as text on the page.
- **Impact:** Customers end up with passwords like "x" that fall to the first guess in any brute-force run against the wallet.

### Mass assignment — balance, KYC and role are client-settable
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Where:** the Registration & Profile surface of the wallet.
- **Exploitation outline:** Register with extra fields balance=5000&kyc=verified, or add them to a profile update, and watch your account change.
- **Impact:** A brand-new user can register with a pre-loaded balance and pre-verified KYC, or promote an existing account — free money and laundered identity in one request.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the Registration & Profile surface of the wallet.
- **Exploitation outline:** Use <script>alert(1)</script> or <img src=x onerror=alert(1)> as the display name, then view a page that renders it.
- **Impact:** An attacker can run script in other customers’ browsers — stealing sessions or driving transfers from the victim’s own logged-in wallet.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **Where:** the Registration & Profile surface of the wallet.
- **Exploitation outline:** Submit the profile form cross-site (foreign Origin header, no hx_origin marker) and the change applies.
- **Impact:** A malicious page can silently change a victim’s display name or contact details, setting up social-engineering and account-recovery attacks.

## Transfers

### Negative transfer amount steals from the recipient
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner · **Severity (report):** Critical
- **Where:** the Transfers surface of the wallet.
- **Exploitation outline:** The maths runs backwards: your balance goes UP and the recipient’s goes DOWN.
- **Impact:** Any user can pull money out of any other wallet by "sending" them a negative amount — theft with a normal-looking transfer record.

### Double-spend — replayed transfer is applied twice
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** High
- **Where:** the Transfers surface of the wallet.
- **Exploitation outline:** The server never checks whether the nonce was already used — both transfers land.
- **Impact:** Double-clicks, network retries or deliberate replays duplicate transfers — the wallet pays out twice for one instruction.

### Recipient swapped at the confirmation step
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Where:** the Transfers surface of the wallet.
- **Exploitation outline:** The server trusts the confirmed field, not the transfer you started — the money lands with whoever is in the field.
- **Impact:** Funds can be redirected to an attacker’s account after the sender has reviewed and approved a transfer to someone else.

### Transfer receipt IDOR — anyone can read any receipt
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Medium
- **Where:** the Transfers surface of the wallet.
- **Exploitation outline:** Log in as a third party and open the receipt of a transfer between two other users.
- **Impact:** Attackers can enumerate receipts to map who pays whom and how much — financial surveillance of the whole customer base.

### Per-transfer limit enforced only in the web UI, not the API
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced · **Severity (report):** High
- **Where:** the Transfers surface of the wallet.
- **Exploitation outline:** POST a $600 transfer through the API. It sails past the limit the website enforces.
- **Impact:** Limits meant to cap fraud losses can be bypassed entirely through the API, letting a compromised account move large sums at once.

## Top-ups & Cards

### Top-up credits more than the card is charged
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate · **Severity (report):** Critical
- **Where:** the Top-ups & Cards surface of the wallet.
- **Exploitation outline:** Post amount=200 with charge=20. Your wallet gains $200; the card was "charged" $20.
- **Impact:** Users mint wallet balance at a 10:1 discount or better — direct, scalable theft of funds from the platform.

### Top-up accepts any card number, valid or not
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the Top-ups & Cards surface of the wallet.
- **Exploitation outline:** The top-up succeeds and the nonsense card is stored — no format, length or checksum validation at all.
- **Impact:** Attackers can top up from non-existent cards, creating wallet balance backed by nothing.

### Linked card details of other users exposed (full PAN)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **Where:** the Top-ups & Cards surface of the wallet.
- **Exploitation outline:** Open another user's card id and read their complete PAN.
- **Impact:** Any customer can harvest every other customer’s full card numbers — a reportable card-data breach (PCI DSS) on its own.

## KYC & Verification

### Unverified (KYC) account can withdraw to a bank
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** High
- **Where:** the KYC & Verification surface of the wallet.
- **Exploitation outline:** Log in as carol@test.local (unverified) and POST directly to /withdraw.
- **Impact:** Unverified — potentially anonymous or fraudulent — accounts can cash out to bank accounts, breaking AML/KYC obligations and enabling money laundering.

### KYC identity record of other users readable
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the KYC & Verification surface of the wallet.
- **Exploitation outline:** Open /kyc/2 while logged in as someone else and read Alice's identity record.
- **Impact:** Attackers can steal complete identity records — full name, DOB and government ID number — enabling identity theft against every customer.

## Transaction History

### Full transaction history of any user via ?user=
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** High
- **Where:** the Transaction History surface of the wallet.
- **Exploitation outline:** Open /history?user=2 as a different account and read Alice’s complete money history.
- **Impact:** Complete financial histories — every transfer, top-up and withdrawal — of any customer are visible to any other customer.

### Reflected XSS in history search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner · **Severity (report):** Medium
- **Where:** the Transaction History surface of the wallet.
- **Exploitation outline:** Search for <script>alert(1)</script> and watch it land unescaped in the page.
- **Impact:** A crafted history link executes script in a victim’s wallet session when clicked, enabling session theft and actions in their name.

## Admin Panel

### State-changing admin action over GET (freeze account)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate · **Severity (report):** Medium
- **Where:** the Admin Panel surface of the wallet.
- **Exploitation outline:** As an admin (see the cookie test), call /admin/freeze?id=<user> directly — an image tag on any page could do the same to a logged-in admin.
- **Impact:** A booby-trapped page can freeze customer accounts the moment an admin browses it — a denial-of-service against the wallet’s own users.

## Platform & API

### Unauthenticated /api/users dumps balances and card numbers
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner · **Severity (report):** Critical
- **Where:** the Platform & API surface of the wallet.
- **Exploitation outline:** Fetch /api/users logged out and receive every account with its balance and full card numbers.
- **Impact:** The entire customer database — emails, balances, KYC status and full card numbers — is downloadable by anyone, no account needed.

### API accepts base64(email) as a valid token
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Advanced · **Severity (report):** High
- **Where:** the Platform & API surface of the wallet.
- **Exploitation outline:** Call /api/wallet with the header x-api-token set to the base64 encoding of any user’s email address.
- **Impact:** Anyone who knows a customer’s email address — public information — can read their wallet through the API and act with a predictable credential.
