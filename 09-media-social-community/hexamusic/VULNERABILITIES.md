# HexaMusic (LAB 86) — Vulnerability Map

The complete map of this lab: every scored test, grouped by feature. Progress is earned only by actually exploiting each flaw — the server detects the real effect.

## Login & Authentication (6)

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Inject an OR-tautology into the email field so the string-built query matches a user without the real password.
- Impact: On a real streaming service this means instant takeover of any account — including admin — without knowing a single password.

### No Brute-Force Protection on Login
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no lockout, delay or CAPTCHA.
- Impact: Attackers can crack customer accounts at scale, hijack listening accounts and pivot to payment details.

### User Enumeration via Login & Forgot-Password Responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /forgot and POST /login
- Exploitation outline: Probe several email addresses; existing and non-existing accounts produce clearly different responses.
- Impact: Attackers harvest valid customer emails, then aim phishing and credential-stuffing at accounts that definitely exist.

### Demo Credentials Published on the Login Page
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: GET /login (credentials printed on the page)
- Exploitation outline: Use the demo email/password printed on the login page to sign in.
- Impact: Anyone on the internet can walk into a working account, and demo accounts often share passwords with real systems.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: The reset token is derived from the user id by a simple formula; compute a valid token for an account that never requested a reset and take it over.
- Impact: An attacker who knows a victim’s user id can reset their password and own the account in seconds.

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /admin
- Exploitation outline: The admin gate trusts a client-set hx_role cookie instead of the server-side session role; set hx_role=admin in your browser and open /admin as a normal listener.
- Impact: Any customer can promote themselves to admin in seconds and reach user data and destructive actions.

## Registration & Profile (4)

### Weak Password Policy at Registration
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register an account with a 1-character password; the app accepts it.
- Impact: Customer accounts protected by one-character passwords are trivially guessed, exposing profiles and payment methods.

### Mass Assignment — Free Premium Tier / Role at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Add extra fields (tier=premium or role=artist) to the registration POST; the server copies them straight onto the new account.
- Impact: Attackers self-grant premium subscriptions for free, or register as artists/admins and walk into privileged areas.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register or POST /profile (display name)
- Exploitation outline: Put an HTML/JS payload in your display name; it is stored and rendered unescaped on profile and playlist pages.
- Impact: Attackers plant scripts that run for other users and staff — stealing sessions, defacing pages and driving phishing.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: Submit a profile change without the hx_marker token (as a cross-site form would); the change is applied anyway.
- Impact: A malicious page a victim visits can silently rewrite their profile, email or settings in the background.

## Search & Catalogue (2)

### SQL Injection in Track Search
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /search?q=
- Exploitation outline: Inject into the search term so the query returns every track — including the unreleased one that normal search hides.
- Impact: Unreleased tracks, internal catalogue data and pricing can be dumped by anyone — a direct leak of the company’s assets.

### Reflected XSS in Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /search?q=
- Exploitation outline: Put a script payload in the search term; it is reflected unescaped into the results page heading.
- Impact: Crafted links run scripts in victims’ browsers — session theft and convincing phishing hosted on the real site.

## Playlists (3)

### Private Playlist IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /playlist/<id>
- Exploitation outline: Open another user’s private playlist by guessing its numeric id; ownership is never checked.
- Impact: Private customer data — playlists reveal taste, habits and sometimes identity — is exposed to anyone who can count.

### Modify Another User’s Playlist
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /playlist/<id>/add
- Exploitation outline: Add a track to a playlist you do not own; the endpoint never verifies ownership.
- Impact: Attackers can vandalise or weaponise other customers’ content, destroying trust in the platform.

### Predictable Playlist Share Token
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /share/share-<id>
- Exploitation outline: Share links are just "share-" plus the playlist id; construct the link for a private playlist you were never given.
- Impact: Every "shared privately" playlist is effectively public — private customer content leaks at scale.

## Tracks & Streaming (4)

### Premium Track Streamed by a Free Account
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /stream/<id>
- Exploitation outline: As a free-tier listener, stream a premium-only track; the stream endpoint never checks your tier.
- Impact: The entire premium catalogue can be consumed for free — the subscription business model collapses.

### Unreleased Track Accessible by Direct ID
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /track/<id>
- Exploitation outline: Open the track page for an unreleased track by its id as an ordinary listener; the release flag is not enforced.
- Impact: Unreleased music leaks before launch — killing premiere deals, marketing plans and artist trust.

### Path Traversal in Track Download
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /download?file=
- Exploitation outline: Use ../ sequences in the file parameter to escape the downloads folder and read server files.
- Impact: Attackers read source code, configuration and secrets from the server — often the first step to full compromise.

### Weak Stream Token — base64(email)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/stream/<id>?token=
- Exploitation outline: The API accepts a "token" that is just the base64 of a user’s email; forge one and stream with no session at all.
- Impact: Anyone can impersonate any user to the API with nothing but their email address.

## Artists & Royalties (2)

### Royalty & Licensing Tampering on Another Artist’s Track
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Location: POST /artist/track/<id>/royalty
- Exploitation outline: As one artist, change the royalty rate and licensing label of a track owned by a different artist; only the artist role is checked, never ownership.
- Impact: Royalty rates and licensing terms are money — tampering diverts artist income and creates legal liability.

### Artist Earnings IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /artist/earnings?artist=<id>
- Exploitation outline: Ask for another artist’s earnings by changing the artist parameter; the figures are served without an ownership check.
- Impact: Competitors and attackers can map exactly what every artist earns — ammunition for poaching and extortion.

## Premium & Billing (2)

### Premium Upgrade Price Tampering
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /upgrade
- Exploitation outline: The upgrade form posts an amount the server trusts; submit amount=0 and get Premium for free.
- Impact: Every customer can self-upgrade for free — direct, immediate revenue loss.

### Single-Use Promo Code Can Be Reused
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /upgrade/promo
- Exploitation outline: Redeem the single-use code HEXAFREE twice; it is never marked as consumed, so it keeps granting Premium.
- Impact: One leaked promo code becomes unlimited free Premium for everyone who hears about it.

## Admin Panel (2)

### Admin User List Open to Any Logged-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin/users
- Exploitation outline: Open the admin user list as a normal listener; the page only checks that you are logged in, and it prints every password.
- Impact: Full customer list with passwords is exposed to any registered user — a complete account database leak.

### CSRF on Admin Track Deletion
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/track/delete
- Exploitation outline: As admin, delete a track with a POST that carries no hx_marker token; the destructive action succeeds anyway.
- Impact: One malicious page in an admin’s browser can delete catalogue content with the admin’s own privileges.

## Platform & API (1)

### Unauthenticated /api/debug Data Dump
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: Fetch the debug endpoint with no session at all; it dumps every user including passwords.
- Impact: One URL hands an attacker the entire user database — the worst single leak a service can have.
