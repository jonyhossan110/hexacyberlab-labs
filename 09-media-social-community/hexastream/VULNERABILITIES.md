# HexaStream (LAB 84) — Vulnerability Map

The complete map of the 26 scored tests, grouped by feature. Every item is a real, working flaw in the app; the server detects the exploit effect itself.

## Login & Authentication (6)

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Use admin@hexastream.local' -- as the email, with any password.
- Impact: On a real streaming service this hands an attacker the admin account: full control of the catalogue, user accounts and billing settings.

### No Brute-Force Protection on Login
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Fail 10 logins in a row for bob@test.local; the 10th is still processed normally.
- Impact: Attackers can grind through password lists against real subscriber accounts, leading to account takeovers and stolen payment details.

### Account Enumeration via Login & Reset Responses
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Location: POST /login · POST /forgot
- Exploitation outline: Probe the forgot form with 5 different email addresses and watch the two different answers.
- Impact: Attackers first harvest which email addresses hold accounts, then aim password attacks only at real targets — far more efficient and quieter.

### Published Demo Credentials Grant a Real Account
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Location: GET /login · POST /login
- Exploitation outline: Sign in with the demo credentials shown on the login page.
- Impact: Anyone on the internet can walk into the demo account, and demo accounts often share data, privileges or billing with production.

### Predictable Password-Reset Token
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: For user id N the token is HS + N + "-" + (N*137+42). Compute Bob's (id 3) and reset his password without ever requesting a reset.
- Impact: Anyone who can see a user ID (often public) can reset that user's password and take over the account, including admins.

### Role Cookie Tampering Opens the Creator Studio
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /creator
- Exploitation outline: Log in as Bob, change the hx_role cookie to creator, then open /creator.
- Impact: Any free viewer can promote themselves to creator (or admin) in the browser and reach consoles meant for staff only.

## Registration & Profile (4)

### Weak Password Policy — 1-Character Passwords Accepted
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with the password "a".
- Impact: Subscribers pick guessable passwords, and one breached account often means a reused password elsewhere too.

### Mass Assignment — Role & Tier Set at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Register with extra fields role=creator and tier=premium in the POST body.
- Impact: Attackers mint themselves premium, creator or even admin accounts for free, bypassing payment and vetting entirely.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register · POST /profile → video pages
- Exploitation outline: Register or rename yourself with a name containing <script>alert(1)</script> and view a video page.
- Impact: Attackers can hijack viewer sessions, deface pages, or run actions as other users — including admins who merely open a page.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: Send a POST to /profile with your session cookie but WITHOUT the hx_origin cookie and change your name.
- Impact: Attackers silently change victims' profile data (and on other flows, emails or passwords) from a malicious page.

## Search & Library (2)

### SQL Injection in Video Search Leaks Unlisted Titles
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /search?q=
- Exploitation outline: Search for ' OR '1'='1 and look for a title that appears nowhere in the library.
- Impact: Unreleased content, internal screeners and embargoed titles leak before launch, destroying release and licensing plans.

### Reflected XSS in Search Results
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /search?q=
- Exploitation outline: Search for <script>alert(1)</script> and view the page source of the heading.
- Impact: Crafted search links can steal sessions or run actions for any logged-in viewer who clicks them.

## Playback & Tokens (3)

### Premium Playback Granted by a Client-Supplied Tier Parameter
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /watch/:id?tier=
- Exploitation outline: As Bob (free), open /watch/2?tier=premium.
- Impact: Every free user can stream the entire paid catalogue — the subscription business simply stops earning.

### Forged Playback Token Accepted
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Location: GET /stream/:id?token=
- Exploitation outline: Craft base64 of "stream:3:3" yourself and open /stream/3?token=<your token> without ever being issued one.
- Impact: Attackers generate stream URLs for any title and share them publicly, bypassing accounts and paywalls at scale.

### Unlisted Video Reachable by Direct Sequential ID
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /video/:id
- Exploitation outline: Open /video/5 directly.
- Impact: Unreleased and internal content is one guessed number away from anyone, no account or exploit tooling needed.

## Watchlists & History (3)

### Watchlist IDOR — View Another User's Watchlist
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /watchlist?user=
- Exploitation outline: Open /watchlist?user=2 while logged in as Bob.
- Impact: Viewing habits of every subscriber are exposed: profiling, stalking and targeted phishing material.

### Watch History IDOR — View Another User's History
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /history?user=
- Exploitation outline: Open /history?user=2 while logged in as Bob.
- Impact: Complete viewing histories leak, a sensitive behavioural record for every subscriber.

### Remove Items From Another User's Watchlist
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /watchlist/remove
- Exploitation outline: POST /watchlist/remove with videoId=2 and user=2 while logged in as Bob, then check Alice's list.
- Impact: Attackers can wipe or alter every subscriber's saved lists — support chaos and data-loss complaints follow.

## Membership & Payments (2)

### Premium Upgrade Price Tampering
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Location: POST /membership/upgrade
- Exploitation outline: Upgrade with amount=1 in the POST body and check your tier.
- Impact: Attackers (and ordinary users) upgrade for $1 or $0 — direct, silent revenue loss.

### Single-Use Coupon Can Be Reused (FREEMONTH)
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Location: POST /membership/upgrade
- Exploitation outline: POST two upgrades with coupon=FREEMONTH; the second free month should be refused but is granted.
- Impact: Coupon codes leak once and are reused forever — promotions become permanent free premium.

## Comments (2)

### Stored XSS in Comments
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /comment → GET /video/:id
- Exploitation outline: Post a comment containing <script>alert(1)</script> on any video and reload its page.
- Impact: Attackers run scripts in subscribers' and moderators' browsers: session theft, fake payment forms, defacement.

### Delete Another User's Comment
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /comment/delete
- Exploitation outline: Delete comment id 1 (Alice's) while logged in as Bob.
- Impact: Anyone can erase other users' comments: censorship, harassment cover-ups and review manipulation.

## Creator Studio (2)

### Unrestricted Upload — HTML/SVG "Video" Stored & Served
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Intermediate
- Location: POST /creator/upload → GET /files/:name
- Exploitation outline: Upload a file named evil.html containing a script payload, then open /files/evil.html.
- Impact: Attackers host phishing and script payloads on the trusted streaming domain itself.

### Edit Another Creator's Video Metadata
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /creator/edit
- Exploitation outline: As Carol, POST /creator/edit with videoId=2 and a new title.
- Impact: Rival creators (or one compromised account) can retitle and deface every video on the platform.

## Admin & Platform (2)

### Admin Console Open to Any Signed-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin
- Exploitation outline: Log in as Bob and open /admin.
- Impact: The full user list — emails and passwords — is visible to every subscriber: a complete account-takeover kit.

### Unauthenticated /api/debug Exposes All Accounts
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: Open /api/debug in a private window with no session.
- Impact: One unauthenticated request dumps every account: instant mass account takeover and a reportable data breach.
