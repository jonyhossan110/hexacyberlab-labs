# HexaMedia — Vulnerability Map (LAB 83)

Every scored test in the lab, grouped by feature. This is the complete map of what can be found and proven.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 — Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit an email such as ' OR '1'='1 so the string-built query matches the first account without knowing its password.
- Impact: On a real publication this means an attacker signs in as the admin without any password — every draft, subscriber record and article is theirs.

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Send 10 or more wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.
- Impact: A real newsroom account with a weak password would fall to an automated guessing script in hours, giving attackers a genuine login.

### User Enumeration via Login & Reset Responses
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Beginner
- Location: POST /login and POST /forgot
- Exploitation outline: Probe at least 5 different emails; existing accounts answer "Incorrect password" / "Reset link sent" while unknown emails answer "No account with that email", revealing which emails are registered.
- Impact: Attackers harvest the publication's real subscriber and staff emails, then aim phishing and password attacks only at accounts that exist.

### Published Demo Credentials
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Beginner
- Location: Login page / POST /login
- Exploitation outline: The login page itself prints a working demo account (demo@hexamedia.local / demo1234). Sign in with it.
- Impact: Anyone on the internet gets a free working login to the publication, a foothold for probing every logged-in feature.

### Predictable Password-Reset Token
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: Reset tokens follow a formula from the user id: HM<id>-<id*137+42>. Compute Bob's (id 5) token and reset his password without ever requesting a reset email.
- Impact: An attacker resets the editor-in-chief's password from nothing but her user id and takes over the newsroom's most powerful account.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: GET /editor and GET /admin
- Exploitation outline: The app trusts the client-supplied hx_role cookie for its editorial and admin gates. As a reader, set hx_role=admin and open /admin.
- Impact: Every reader becomes an admin by editing one cookie — full control of users, roles and content on the real site.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with a 1-character password; it is accepted.
- Impact: Subscribers who choose tiny passwords are compromised in seconds by guessing, and their accounts are used for spam and fraud.

### Mass Assignment — Role & Plan at Registration
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Add role=editor (or admin) and plan=premium fields to the registration request; the server copies them onto the new account.
- Impact: Attackers mint themselves editor accounts with free premium access — they can publish under the publication's name and read everything.

### Stored XSS in Display Name
- OWASP: A03:2021 — Injection
- Difficulty: Beginner
- Location: POST /register or POST /profile (name field)
- Exploitation outline: Set a display name containing an HTML/JS payload such as <script>alert(1)</script>; it is stored and rendered raw wherever the name appears.
- Impact: The payload runs in other readers' and editors' browsers — session theft, fake login forms and defaced pages under the publication's brand.

### CSRF on Profile Update
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: Change a profile with a POST that carries no hx_origin marker; the server never verifies the request really came from its own form.
- Impact: A booby-trapped page a reader visits silently rewrites their profile — the classic stepping stone to account-takeover chains.

## Articles & Paywall

### Paywall Bypass — Premium Article Without a Subscription
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Beginner
- Location: GET /article/<id>
- Exploitation outline: A free reader can read a full premium article by adding ?full=1 to the URL (or setting the hx_sub=premium cookie); the server honours the client's word.
- Impact: The publication's paid content is free to anyone who adds four characters to a URL — the subscription business quietly stops earning.

### Draft & In-Review Articles Exposed by ID (IDOR)
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Beginner
- Location: GET /article/<id>
- Exploitation outline: Article ids are sequential and unpublished pieces are served to any signed-in reader who guesses the id — open the draft (id 3) or the in-review piece (id 5) as a plain reader.
- Impact: Embargoed investigations and legally un-cleared drafts leak before publication — sources exposed, lawsuits invited, stories spoiled.

### SQL Injection in Article Search
- OWASP: A03:2021 — Injection
- Difficulty: Intermediate
- Location: GET /search?q=
- Exploitation outline: Search with ' OR '1'='1 and the string-built query returns every article in the table — including drafts and in-review pieces.
- Impact: Attackers dump the publication's entire content store — published, draft and embargoed — through one search box.

### Reflected XSS in Search
- OWASP: A03:2021 — Injection
- Difficulty: Beginner
- Location: GET /search?q=
- Exploitation outline: The search term is reflected unescaped in the results heading; search for <script>alert(1)</script> and it executes.
- Impact: Attackers send readers links to the real publication domain that run script in their browsers — credential phishing with the brand's own trust.

## Editorial Workflow

### Anyone Can Publish Articles
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /article/<id>/status
- Exploitation outline: The status endpoint checks only that you are signed in. As a plain reader, POST status=published for a draft and it goes live.
- Impact: Anyone can push unreviewed, legally risky copy live under the masthead — one request turns a draft allegation into a published claim.

### Editing Other Writers' Articles (No Ownership Check)
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /article/<id>/edit
- Exploitation outline: The edit endpoint never checks ownership. As one user, edit an article written by someone else (e.g. id 5, the editor's piece in review).
- Impact: A disgruntled account rewrites colleagues' stories before publication — sabotage and misinformation inside the newsroom's own pipeline.

## Subscriptions & Payments

### Subscription Price Tampering
- OWASP: A04:2021 — Insecure Design
- Difficulty: Beginner
- Location: POST /subscribe
- Exploitation outline: The subscribe form posts a price field the server trusts. Subscribe to Premium posting price=1 and the $12 plan activates for $1.
- Impact: Premium subscriptions sell for a dollar — direct revenue loss that scales with every "customer" who finds the trick.

### Single-Use Coupon Reuse (WELCOME50)
- OWASP: A04:2021 — Insecure Design
- Difficulty: Intermediate
- Location: POST /subscribe
- Exploitation outline: WELCOME50 is advertised as one-per-customer, but the server never records its use. Apply it on two separate subscriptions and it works both times.
- Impact: A "one-time" 50% welcome offer becomes a permanent half-price tier for anyone who notices, halving subscription revenue.

### Cancel Another Subscriber's Subscription (IDOR)
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /subscription/<userId>/cancel
- Exploitation outline: The cancel endpoint takes a user id and never checks it is yours. Cancel Bob's subscription (user id 5) while signed in as Alice.
- Impact: Malicious users cancel paying subscribers' access at will — churn, support chaos and refund demands caused by strangers.

## Comments

### Stored XSS in Comments
- OWASP: A03:2021 — Injection
- Difficulty: Beginner
- Location: POST /article/<id>/comment
- Exploitation outline: Post a comment containing <script>alert(1)</script> on any article; it is stored and rendered raw to every reader.
- Impact: One comment attacks every reader of a popular article — drive-by script under the publication's own pages.

### Delete Other Readers' Comments (IDOR)
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Beginner
- Location: POST /comment/<id>/delete
- Exploitation outline: Comment ids are sequential and deletion checks nothing. Delete Bob's comment (id 2) while signed in as Alice.
- Impact: Trolls erase other readers' contributions and moderation history, poisoning community trust in the publication.

## Newsletter & Audience

### Newsletter Subscriber List Exposure
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Beginner
- Location: GET /newsletter/subscribers
- Exploitation outline: The subscriber list page requires only a login — any reader can open it and harvest every subscriber email address.
- Impact: The publication's entire subscriber email list — its core commercial asset and a privacy liability — is one click from any account.

## Admin Panel

### Admin User Data Endpoint Without Role Check
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Beginner
- Location: GET /admin/users.json
- Exploitation outline: The JSON user dump checks only that a session exists. Any reader can fetch every account including passwords.
- Impact: Every staff and subscriber password is exposed to any signed-in user — instant full compromise of the publication.

### CSRF on Admin Role Change
- OWASP: A01:2021 — Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/user/<id>/role
- Exploitation outline: Promote or demote a user with a POST that carries no hx_origin marker; the admin action has no CSRF verification.
- Impact: A single malicious page visited by the admin silently promotes an attacker to editor — or demotes the real staff.

## Platform & API

### Weak API Token (Base64 of Email) Leaks Premium Content
- OWASP: A07:2021 — Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/premium
- Exploitation outline: The API accepts X-Api-Token equal to the base64 of a subscriber's email. Compute it for editor@hexamedia.local and read all premium articles.
- Impact: The entire premium archive is downloadable by anyone who can base64-encode an email address found on the site.

### Unauthenticated Debug Endpoint Dumps All Accounts
- OWASP: A05:2021 — Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: Open /api/debug with no login at all; it returns every user including passwords, left over from development.
- Impact: A completely unauthenticated visitor downloads every account and password — the worst finding a publication can have.
