# HexaCommunity — Vulnerabilities (complete test map)

LAB 90 — HexaCommunity (Category 9: Media, Social & Community). 26 scored tests across 9 features. Every test flips only on server-side detection of the real exploit effect.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit a login whose email or password contains a SQL tautology so the string-built query matches the first account without its real password.
- Impact: On a real community site this hands an attacker the first account in the table — usually the administrator — with no password at all: full control of members, groups and moderation.

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.
- Impact: Attackers can grind through common-password lists against real member accounts — one weak password means a hijacked identity inside the community.

### User Enumeration via Login & Forgot-Password
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login and POST /forgot
- Exploitation outline: Compare responses for existing vs non-existing emails — they differ, so probing 5+ addresses reveals which ones are registered.
- Impact: Attackers harvest a verified list of member emails — the perfect targeting list for phishing and password spraying against the community.

### Published Demo Credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: Login page / POST /login
- Exploitation outline: The login page publishes a working demo account. Sign in with it — a live, real account anyone on the internet can use.
- Impact: Anyone can walk in through the front door with the published demo login and act inside the community as a "member" — spam, scraping and social engineering included.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: Reset tokens are derived from the user id with simple arithmetic. Compute another member's token and reset their password without ever requesting a reset.
- Impact: An attacker who can see member ids (the directory shows them) can reset ANY member's password — including moderators — and take over the account silently.

### Role Cookie Tampering into the Moderator Console
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /mod
- Exploitation outline: The moderator console trusts a client-supplied hx_role cookie over the server-side session role. Set it as a plain member and walk in.
- Impact: Every member can promote themselves to moderator by editing a cookie: banning rivals, reading private groups and abusing moderation tools.

## Registration & Profile

### No Password Policy — 1-Character Passwords
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with a 1-character password. It is accepted.
- Impact: Members who choose 1-character passwords can be guessed in seconds, and every hijacked account erodes trust in the whole community.

### Mass Assignment — Self-Assign Admin Role / Premium Tier
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Registration binds every submitted field onto the new account. Add role=admin or tier=premium to the POST and the account is created with them.
- Impact: Self-service admin creation is game over: the attacker owns the community, its member data and its moderation tools from minute one.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register and POST /profile → member directory
- Exploitation outline: Put an HTML/JS payload in the display name; it is stored and rendered unescaped to everyone who browses the directory or profile.
- Impact: One malicious member name executes script in every visitor's browser — session theft, defacement and phishing from inside a trusted page.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: The profile update has no anti-CSRF token. A state-changing POST without the app's own hx_origin marker is accepted.
- Impact: Attackers can vandalise or weaponise member profiles (names, bios with phishing links) simply by getting members to open a page.

## Member Directory

### Private Profile Contact Leak via Direct URL
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /member/:id
- Exploitation outline: Members who marked their profile private still have their email and phone rendered to any logged-in member who opens /member/<id> directly.
- Impact: Members who explicitly chose privacy get their personal email and phone harvested anyway — a GDPR-style breach of trust and possibly of law.

### SQL Injection in Directory Search Dumps Unlisted Members
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /directory?q=
- Exploitation outline: The member search concatenates q into a LIKE query. Injecting a tautology plus a comment returns every account — including the unlisted member the search is supposed to hide.
- Impact: The full member list — including unlisted and private members — can be exfiltrated through the search box, defeating every privacy control at once.

### Reflected XSS in Directory Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /directory?q=
- Exploitation outline: The search term is reflected into the results heading without encoding. Put a script payload in q and it comes straight back in the page.
- Impact: Attackers send members a crafted search link that runs script in their session — credential theft and actions taken as the victim.

## Private Groups

### Private Group Content Served to Non-Members
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /group/:id
- Exploitation outline: The Founders Circle is a private group, but its page — posts included — is served to any logged-in member, member of the group or not.
- Impact: Everything members share in "private" groups — plans, revenue notes, personal updates — is readable by the entire community.

### Private Group Join Without Moderator Approval
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /group/:id/join
- Exploitation outline: Joining an approval-required group trusts a client-supplied approved flag. Send approved=1 with the join and you are a member instantly.
- Impact: The approval process — the whole point of a vetted private group — is theatre: anyone can self-approve into the most sensitive spaces.

### Delete Another Member's Group Post (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /grouppost/:id/delete
- Exploitation outline: The group-post delete endpoint never checks authorship. Delete a post written by someone else by guessing its id.
- Impact: Any member can vandalise group conversations by deleting other people's posts — harassment and content destruction with no trace.

## Events & RSVPs

### Free Tier RSVPs to a Premium-Only Event
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /event/:id/rsvp
- Exploitation outline: The Premium Mastermind is premium-tier only, but the RSVP endpoint never checks tier. A free member RSVPs successfully.
- Impact: The entire paid tier loses its value: every premium event is open to free members who call the endpoint directly.

### Event Capacity Overbooking
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Location: POST /event/:id/rsvp
- Exploitation outline: The Community Meetup is capped at 2 seats and already full, but the RSVP endpoint never counts. RSVP anyway and the attendee list grows past capacity.
- Impact: Venues get over-filled, paid seats are oversold, and organisers face refunds and angry members — a business-logic failure, not just a bug.

### Cancel Another Member's RSVP (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /rsvp/:id/cancel
- Exploitation outline: RSVP cancel takes a bare id with no ownership check. Cancel Carol's meetup seat from your own account.
- Impact: Members can sabotage each other — cancelling seats at sold-out events — a nasty harassment and denial-of-service vector inside the community.

## Resource Library

### Free Tier Downloads Premium Resources
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /resource/:id/download
- Exploitation outline: The Premium Growth Vault is premium-only, but the download endpoint serves its file to any logged-in member who asks.
- Impact: All premium content leaks to free members — the subscription model collapses and paying members feel cheated.

### Path Traversal in Resource Download Reads Server Files
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /resource/:id/download?file=
- Exploitation outline: The download handler joins the file parameter onto the files folder without sanitising. ../ sequences escape the folder and read arbitrary files — including server.js.
- Impact: Attackers read source code, configuration and any file the server can see — the first step to full server compromise.

## Discussions

### Stored XSS in Discussion Posts
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /discussion/:id/reply → thread view
- Exploitation outline: Discussion replies are stored and rendered raw. Post a script payload as a reply; it is served to everyone who opens the thread.
- Impact: A single post infects the whole thread — every reader's session is exposed to theft and impersonation.

### Delete Another Member's Discussion Thread
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /discussion/:id/delete
- Exploitation outline: Thread deletion checks nothing about authorship. Any member can delete any thread by id.
- Impact: Trolls can wipe the community's discussion history thread by thread — pure vandalism with real community damage.

## Admin & Moderation

### Admin Panel Served to Regular Members
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin
- Exploitation outline: The admin panel — full member list with emails — is served to any signed-in user who opens /admin directly, whatever their role.
- Impact: Every member can enumerate the entire community — names, emails, tiers, ban status — prime material for spam and targeted attacks.

### CSRF on Admin Ban Action
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /admin/ban
- Exploitation outline: The admin ban endpoint has no anti-CSRF protection. A ban POST without the app's hx_origin marker still executes.
- Impact: One malicious page visit by the admin can ban arbitrary members — attackers weaponise the admin's own session.

## Platform & API

### API Token Is Just Base64 of the Member Email
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/members
- Exploitation outline: The member API "authenticates" with a token that is simply base64(email) — a public value. Forge anyone's token and read the full member list without any session.
- Impact: Anyone who knows (or guesses) a member email — they are in the directory — owns a working API key to the entire member database.
