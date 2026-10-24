# HexaCreator — Vulnerability Map (LAB 87)

The complete map of the 26 scored tests, grouped by feature. Every flaw below is a real, working vulnerability in this local practice app.

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit the login form with an injection payload in the email field so the credential check is bypassed and a session is issued without the real password.
- **Impact:** On a real creator platform this hands an attacker the admin account in seconds — every creator page, payout and supporter record is exposed.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Send repeated failed logins for one account and observe that attempts are never throttled or locked.
- **Impact:** Attackers can grind through password lists against creator accounts and take over pages that hold supporter money and content.

### User enumeration via differing responses
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Probe multiple distinct emails and compare responses to learn which emails own accounts.
- **Impact:** An attacker builds a verified list of creator and fan accounts, then aims phishing and password attacks only at real targets.

### Published demo credentials
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** GET /login (credentials printed on the page)
- **Exploitation outline:** Read the demo credentials published on the login page and sign in with them.
- **Impact:** Anyone on the internet can walk into a live creator account and a fan account using credentials the site publishes itself.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Derive the deterministic reset token from the victim user id and set a new password without access to their email.
- **Impact:** Any account — including the admin and top creators — can be taken over by anyone who can guess a small integer.

### Role cookie tampering into Creator Studio
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /studio (hx_role cookie)
- **Exploitation outline:** Forge the role cookie so a low-privilege session is treated as a creator by the studio gate.
- **Impact:** Any fan can promote themselves into creator tooling, reaching earnings and payout functions they should never see.

## Registration & Profile

### Weak password policy (1-character passwords)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Create an account with a password far below any sane minimum and observe it is accepted.
- **Impact:** Supporter and creator accounts protected by one-character passwords fall to the most basic guessing attack.

### Mass assignment — role granted at registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** Add privileged fields to the registration request and observe the new account is created with them applied.
- **Impact:** Anyone can mint themselves a creator or admin account at sign-up, skipping every approval and verification step.

### Stored XSS in display name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /register and POST /profile/update (name rendered site-wide)
- **Exploitation outline:** Store a script payload in the display name so it is saved and rendered raw to other visitors.
- **Impact:** A malicious display name can run script in the browsers of fans and staff who view the attacker’s page — session theft and fake payout forms follow.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile/update
- **Exploitation outline:** Submit a profile change that carries no origin marker, as a cross-site request would, and observe it is accepted.
- **Impact:** A malicious page a creator visits while logged in can silently rename their profile or deface their public identity.

## Creators & Search

### SQL injection in creator search leaks unlisted page
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** GET /creators?q=
- **Exploitation outline:** Inject into the creator search so the result set includes the unlisted page that normal search never returns.
- **Impact:** A creator’s private, invite-only page — meant to be invisible — is exposed to anyone who can type a quote character.

### Reflected XSS in creator search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** GET /creators?q=
- **Exploitation outline:** Place a script payload in the search query and observe it reflected unescaped in the results page.
- **Impact:** Attackers send creators a crafted search link that runs script in their browser under the platform’s real domain and trust.

## Posts

### Members-only post readable without a membership
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /post/:id
- **Exploitation outline:** Open a members-only post directly as a user with no membership for that page and read the full body.
- **Impact:** This is the platform’s core product leaking: every members-only post can be read for free, destroying creators’ reason to paywall content.

### Edit another creator’s post (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /post/:id/edit
- **Exploitation outline:** Submit an edit for a post authored by someone else and observe the change is saved.
- **Impact:** Rivals or vandals can rewrite any creator’s posts — replacing download links with malware is the obvious escalation.

### Stored XSS in post body
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /post (body rendered raw at GET /post/:id)
- **Exploitation outline:** Save a post containing a script payload and observe it stored and rendered unescaped.
- **Impact:** One poisoned post can harvest the sessions of every fan and creator who reads it — platform-wide account takeover from a single upload.

## Memberships & Payments

### Membership price tampering
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /subscribe
- **Exploitation outline:** Subscribe while posting a price lower than the tier’s real price and observe the membership created at the fake price.
- **Impact:** Every paid tier on the platform can be bought for a dollar — creators lose their subscription revenue while the platform reports "sales".

### Negative months create wallet credit
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /subscribe
- **Exploitation outline:** Subscribe with a negative months value so the computed charge is negative and credits the wallet.
- **Impact:** Attackers mint free wallet credit out of thin air and spend it across the platform — direct financial loss.

### Membership details IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /membership/:id
- **Exploitation outline:** View a membership record belonging to another user by changing the id.
- **Impact:** Supporters’ subscription and payment details can be harvested one id at a time — a privacy breach and a phishing goldmine.

### Cancel another user’s membership (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /membership/:id/cancel
- **Exploitation outline:** Cancel a membership that belongs to another user.
- **Impact:** Anyone can cancel every paying supporter’s membership — instant revenue destruction for creators and chaos for support.

## Earnings & Payouts

### Another creator’s earnings exposed (IDOR)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /earnings/:creatorId
- **Exploitation outline:** Open the earnings page of a creator you are not, and read their figures.
- **Impact:** Competitors and extortionists can pull every creator’s income and bank details — doxxing the platform’s earners and enabling targeted fraud.

### Payout larger than earnings accepted
- **OWASP:** A04:2021 Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /payout
- **Exploitation outline:** Request a payout greater than the creator’s available earnings and observe it accepted.
- **Impact:** Creators can request payouts far beyond what they earned — the platform pays out money that does not exist.

### CSRF on payout request
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /payout
- **Exploitation outline:** Create a payout via a request carrying no origin marker, as a cross-site form would.
- **Impact:** A creator who visits a malicious page while logged in can have payout requests fired in their name without ever seeing the form.

## Supporters & Community

### Supporter list with emails exposed to everyone
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /page/:id/supporters
- **Exploitation outline:** Open another creator’s supporter list and read supporter names and email addresses.
- **Impact:** Anyone can scrape every creator’s supporter emails — spam, phishing and poaching lists built straight from the platform itself (a GDPR problem too).

## Admin Panel

### Admin panel open to any logged-in user
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin
- **Exploitation outline:** Open the admin panel with a non-admin session and read the full user list.
- **Impact:** Every registered user — including free fans — can open the admin panel and read the entire account table with passwords.

## Platform & API

### Unauthenticated debug endpoint dumps all users
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** Fetch the debug endpoint and observe the full user dump including passwords.
- **Impact:** A single unauthenticated request downloads every account and password on the platform — total compromise in one click.

### Weak API token (base64 of email)
- **OWASP:** A07:2021 Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/my-memberships (x-api-token header)
- **Exploitation outline:** Call the API with a token computed from a victim’s email and receive their data without a session.
- **Impact:** Anyone who knows a user’s email — public by design on a creator platform — can call the API as that user.
