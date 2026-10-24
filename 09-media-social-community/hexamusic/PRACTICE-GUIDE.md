# HexaMusic (LAB 86) — Practice Guide

Challenges grouped by feature, each with graded hints and a measurable objective: make the test flip to done on the Mission Board (/tests).

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: exploit "SQL Injection Login Bypass" (POST /login) until it shows done on /tests.
- Hints:
  1. The login query is built by string concatenation — think about closing the quote.
  2. Try an email that turns the WHERE clause into something that is always true.
  3. Email: ' OR '1'='1' --  with any password logs you in as the first user.

### [Beginner] No Brute-Force Protection on Login
- Objective: exploit "No Brute-Force Protection on Login" (POST /login) until it shows done on /tests.
- Hints:
  1. Count how many wrong passwords you can try in a row.
  2. There is no lockout, no delay and no CAPTCHA — nothing slows you down.
  3. Script 10 failed logins for alice@test.local; the 10th is still processed normally.

### [Beginner] User Enumeration via Login & Forgot-Password Responses
- Objective: exploit "User Enumeration via Login & Forgot-Password Responses" (POST /forgot and POST /login) until it shows done on /tests.
- Hints:
  1. Compare the forgot-password answer for a real account and an invented one.
  2. The messages differ — one confirms the account exists.
  3. Probe 5+ different emails on /forgot and note which ones are confirmed as real accounts.

### [Beginner] Demo Credentials Published on the Login Page
- Objective: exploit "Demo Credentials Published on the Login Page" (GET /login (credentials printed on the page)) until it shows done on /tests.
- Hints:
  1. Read the login page carefully — it is unusually helpful.
  2. A working demo account is printed right on the page.
  3. Sign in with the demo@hexamusic.local credentials shown on /login.

### [Intermediate] Predictable Password-Reset Token
- Objective: exploit "Predictable Password-Reset Token" (POST /reset) until it shows done on /tests.
- Hints:
  1. Request a reset for an account you control and study the token format.
  2. The token is just the user id run through simple arithmetic.
  3. Token = HM<id>-<id*137+42>. Compute it for bob (id 5) and POST /reset without ever using /forgot for him.

### [Intermediate] Role Cookie Tampering (hx_role)
- Objective: exploit "Role Cookie Tampering (hx_role)" (GET /admin) until it shows done on /tests.
- Hints:
  1. Look at the cookies the app sets after login.
  2. One cookie carries your role — and the server trusts it blindly.
  3. As any listener, set the cookie hx_role=admin and visit /admin.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- Objective: exploit "Weak Password Policy at Registration" (POST /register) until it shows done on /tests.
- Hints:
  1. Try registering with the shortest password you can think of.
  2. There is no minimum length or complexity check at all.
  3. Register with password "a" — it is accepted.

### [Intermediate] Mass Assignment — Free Premium Tier / Role at Registration
- Objective: exploit "Mass Assignment — Free Premium Tier / Role at Registration" (POST /register) until it shows done on /tests.
- Hints:
  1. The registration form only shows name/email/password — but the server accepts more.
  2. What happens if you tell the server which tier you would like?
  3. POST /register with extra fields tier=premium (or role=artist) and check your new account.

### [Beginner] Stored XSS in Display Name
- Objective: exploit "Stored XSS in Display Name" (POST /register or POST /profile (display name)) until it shows done on /tests.
- Hints:
  1. Your display name is shown on several pages — is it encoded there?
  2. Try a name that is also a small piece of HTML.
  3. Register with the name <script>alert(1)</script> and view your profile.

### [Intermediate] CSRF on Profile Update
- Objective: exploit "CSRF on Profile Update" (POST /profile) until it shows done on /tests.
- Hints:
  1. Legitimate forms carry a hidden hx_marker field — what if it is simply absent?
  2. The server never actually verifies the marker.
  3. POST /profile with a new name and no hx_marker field; the change still applies.

## Search & Catalogue

### [Intermediate] SQL Injection in Track Search
- Objective: exploit "SQL Injection in Track Search" (GET /search?q=) until it shows done on /tests.
- Hints:
  1. Search results are built from your input with string concatenation.
  2. An always-true condition makes the catalogue dump everything.
  3. Search for ' OR '1'='1 and watch the unreleased demo appear.

### [Beginner] Reflected XSS in Search
- Objective: exploit "Reflected XSS in Search" (GET /search?q=) until it shows done on /tests.
- Hints:
  1. Your search term is echoed back on the results page.
  2. Check whether the echo is encoded — it is not.
  3. Search for <script>alert(1)</script> and view the page source.

## Playlists

### [Beginner] Private Playlist IDOR
- Objective: exploit "Private Playlist IDOR" (GET /playlist/<id>) until it shows done on /tests.
- Hints:
  1. Playlist ids are small sequential numbers.
  2. Privacy is a flag in the data — is it enforced?
  3. Log in as Bob and open /playlist/1 (Alice’s private mix).

### [Intermediate] Modify Another User’s Playlist
- Objective: exploit "Modify Another User’s Playlist" (POST /playlist/<id>/add) until it shows done on /tests.
- Hints:
  1. Reading was not the only thing missing a check…
  2. The add-track endpoint trusts the playlist id in the URL.
  3. As Bob, POST a trackId to /playlist/1/add (Alice’s playlist).

### [Intermediate] Predictable Playlist Share Token
- Objective: exploit "Predictable Playlist Share Token" (GET /share/share-<id>) until it shows done on /tests.
- Hints:
  1. Look at the format of a share link for your own playlist.
  2. The "secret" token is the playlist id with a prefix.
  3. Open /share/share-1 to reach Alice’s private playlist without her link.

## Tracks & Streaming

### [Beginner] Premium Track Streamed by a Free Account
- Objective: exploit "Premium Track Streamed by a Free Account" (GET /stream/<id>) until it shows done on /tests.
- Hints:
  1. The catalogue marks some tracks Premium — is the stream itself gated?
  2. The paywall is only a label on the page.
  3. Log in as Alice (free) and open /stream/2 (Golden Hour, premium).

### [Intermediate] Unreleased Track Accessible by Direct ID
- Objective: exploit "Unreleased Track Accessible by Direct ID" (GET /track/<id>) until it shows done on /tests.
- Hints:
  1. Search hides unreleased tracks — but hiding is not blocking.
  2. Track ids are sequential; one of them is not released yet.
  3. As Alice, open /track/3 — the unreleased Secret Demo.

### [Intermediate] Path Traversal in Track Download
- Objective: exploit "Path Traversal in Track Download" (GET /download?file=) until it shows done on /tests.
- Hints:
  1. The file parameter is joined to a folder path without cleaning.
  2. Classic dot-dot sequences walk up the tree.
  3. Request /download?file=../server.js and read the source.

### [Intermediate] Weak Stream Token — base64(email)
- Objective: exploit "Weak Stream Token — base64(email)" (GET /api/stream/<id>?token=) until it shows done on /tests.
- Hints:
  1. The mobile API uses a token — see if you can figure out its format from your own.
  2. It decodes to something you already know.
  3. base64-encode bob@test.local and call /api/stream/2?token=<that> with no cookies.

## Artists & Royalties

### [Advanced] Royalty & Licensing Tampering on Another Artist’s Track
- Objective: exploit "Royalty & Licensing Tampering on Another Artist’s Track" (POST /artist/track/<id>/royalty) until it shows done on /tests.
- Hints:
  1. The artist console checks that you are AN artist — not THE artist.
  2. Track ids in the royalty endpoint are not tied to your catalogue.
  3. As Echo Park (A2), POST a new rate to /artist/track/1/royalty (Nova’s track).

### [Beginner] Artist Earnings IDOR
- Objective: exploit "Artist Earnings IDOR" (GET /artist/earnings?artist=<id>) until it shows done on /tests.
- Hints:
  1. Your earnings page takes an artist parameter.
  2. Try asking for the other artist’s id.
  3. As Nova (A1), open /artist/earnings?artist=A2.

## Premium & Billing

### [Beginner] Premium Upgrade Price Tampering
- Objective: exploit "Premium Upgrade Price Tampering" (POST /upgrade) until it shows done on /tests.
- Hints:
  1. The price travels from your browser to the server — who verifies it?
  2. Edit the amount field before submitting.
  3. POST /upgrade with amount=0 and check your tier.

### [Intermediate] Single-Use Promo Code Can Be Reused
- Objective: exploit "Single-Use Promo Code Can Be Reused" (POST /upgrade/promo) until it shows done on /tests.
- Hints:
  1. A "single-use" code that nobody crosses off the list…
  2. Redeem HEXAFREE once — then simply redeem it again.
  3. POST /upgrade/promo with code HEXAFREE two times as the same user.

## Admin Panel

### [Beginner] Admin User List Open to Any Logged-In User
- Objective: exploit "Admin User List Open to Any Logged-In User" (GET /admin/users) until it shows done on /tests.
- Hints:
  1. Admin pages are just URLs — try the user list directly.
  2. This endpoint checks login, not role.
  3. As Alice, open /admin/users.

### [Intermediate] CSRF on Admin Track Deletion
- Objective: exploit "CSRF on Admin Track Deletion" (POST /admin/track/delete) until it shows done on /tests.
- Hints:
  1. Destructive admin actions are plain POSTs.
  2. The anti-CSRF marker is displayed but never verified here either.
  3. POST /admin/track/delete with an id and no marker, using the admin session.

## Platform & API

### [Beginner] Unauthenticated /api/debug Data Dump
- Objective: exploit "Unauthenticated /api/debug Data Dump" (GET /api/debug) until it shows done on /tests.
- Hints:
  1. Developers leave diagnostic endpoints behind…
  2. No login is needed for this one.
  3. Open /api/debug in a fresh browser with no cookies.
