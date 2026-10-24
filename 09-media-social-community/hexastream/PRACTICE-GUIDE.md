# HexaStream (LAB 84) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge is measurable: it is complete exactly when the server observes the exploit effect and the test flips to done on /tests (progress persists across restarts).

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: demonstrate this flaw against the live app at POST /login; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The login form builds its database query by gluing your input straight into the SQL string.
- Hint 2: Try closing the email string early and commenting out the rest of the query.
- Hint 3: Use admin@hexastream.local' -- as the email, with any password.

### [Beginner] No Brute-Force Protection on Login
- Objective: demonstrate this flaw against the live app at POST /login; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Count how the login responds to repeated wrong passwords for one account.
- Hint 2: Nothing slows you down, locks the account, or asks for a CAPTCHA — even after many failures.
- Hint 3: Fail 10 logins in a row for bob@test.local; the 10th is still processed normally.

### [Beginner] Account Enumeration via Login & Reset Responses
- Objective: demonstrate this flaw against the live app at POST /login · POST /forgot; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Compare the exact wording of errors for accounts that exist vs accounts that do not.
- Hint 2: The forgot-password form is even more talkative than the login form.
- Hint 3: Probe the forgot form with 5 different email addresses and watch the two different answers.

### [Beginner] Published Demo Credentials Grant a Real Account
- Objective: demonstrate this flaw against the live app at GET /login · POST /login; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Read the login page carefully — it tries to be helpful to new visitors.
- Hint 2: A working username and password are printed right on the page.
- Hint 3: Sign in with the demo credentials shown on the login page.

### [Intermediate] Predictable Password-Reset Token
- Objective: demonstrate this flaw against the live app at POST /reset; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Your numeric account ID is shown on your profile page. Reset tokens look suspiciously structured.
- Hint 2: A token looks like HS<id>-<a number derived from the id>. Do the maths for small IDs.
- Hint 3: For user id N the token is HS + N + "-" + (N*137+42). Compute Bob's (id 3) and reset his password without ever requesting a reset.

### [Intermediate] Role Cookie Tampering Opens the Creator Studio
- Objective: demonstrate this flaw against the live app at GET /creator; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: After logging in, inspect the cookies the site sets. One of them describes your role.
- Hint 2: The Creator Studio trusts that cookie instead of checking your account on the server.
- Hint 3: Log in as Bob, change the hx_role cookie to creator, then open /creator.

## Registration & Profile

### [Beginner] Weak Password Policy — 1-Character Passwords Accepted
- Objective: demonstrate this flaw against the live app at POST /register; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The registration form claims to care about security. Test that claim.
- Hint 2: Try the shortest password the form will accept.
- Hint 3: Register a new account with the password "a".

### [Beginner] Stored XSS in Display Name
- Objective: demonstrate this flaw against the live app at POST /register · POST /profile → video pages; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Display names are printed back on video pages next to comments — without escaping.
- Hint 2: Put markup, not just text, into a name.
- Hint 3: Register or rename yourself with a name containing <script>alert(1)</script> and view a video page.

### [Intermediate] Mass Assignment — Role & Tier Set at Registration
- Objective: demonstrate this flaw against the live app at POST /register; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The registration handler copies more of your request body into the new account than the form shows.
- Hint 2: Accounts have role and tier fields. What happens if you submit them yourself?
- Hint 3: Register with extra fields role=creator and tier=premium in the POST body.

### [Intermediate] CSRF on Profile Update
- Objective: demonstrate this flaw against the live app at POST /profile; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The profile form relies on a cookie marker the server sets — but never actually checks it on the way in.
- Hint 2: A state-changing POST that arrives without the site's own marker should be rejected. It is not.
- Hint 3: Send a POST to /profile with your session cookie but WITHOUT the hx_origin cookie and change your name.

## Search & Library

### [Beginner] Reflected XSS in Search Results
- Objective: demonstrate this flaw against the live app at GET /search?q=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The results page repeats your search term back to you at the top.
- Hint 2: It repeats it exactly as typed — markup and all.
- Hint 3: Search for <script>alert(1)</script> and view the page source of the heading.

### [Intermediate] SQL Injection in Video Search Leaks Unlisted Titles
- Objective: demonstrate this flaw against the live app at GET /search?q=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Search builds its query the same careless way login does.
- Hint 2: A search that always returns TRUE would list the whole catalogue — including what is not published.
- Hint 3: Search for ' OR '1'='1 and look for a title that appears nowhere in the library.

## Playback & Tokens

### [Beginner] Unlisted Video Reachable by Direct Sequential ID
- Objective: demonstrate this flaw against the live app at GET /video/:id; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Video IDs are small sequential numbers, and the video page never checks whether a title is listed.
- Hint 2: The library shows 5 titles. The catalogue has 6 rows.
- Hint 3: Open /video/5 directly.

### [Intermediate] Premium Playback Granted by a Client-Supplied Tier Parameter
- Objective: demonstrate this flaw against the live app at GET /watch/:id?tier=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Free accounts are told a video is premium-only. The watch endpoint asks the request — not your account — what tier you are.
- Hint 2: Try telling the watch URL that you are premium.
- Hint 3: As Bob (free), open /watch/2?tier=premium.

### [Intermediate] Forged Playback Token Accepted
- Objective: demonstrate this flaw against the live app at GET /stream/:id?token=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Watch a video you are entitled to and inspect its stream URL. The token is just base64 text.
- Hint 2: Decode it — the format is stream:<videoId>:<userId>. Nothing is signed.
- Hint 3: Craft base64 of "stream:3:3" yourself and open /stream/3?token=<your token> without ever being issued one.

## Watchlists & History

### [Beginner] Watchlist IDOR — View Another User's Watchlist
- Objective: demonstrate this flaw against the live app at GET /watchlist?user=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Your watchlist page quietly accepts a user parameter.
- Hint 2: It never checks that the list you asked for is yours.
- Hint 3: Open /watchlist?user=2 while logged in as Bob.

### [Beginner] Watch History IDOR — View Another User's History
- Objective: demonstrate this flaw against the live app at GET /history?user=; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: History has the same user-parameter habit as the watchlist.
- Hint 2: Someone else's full viewing record is one parameter away.
- Hint 3: Open /history?user=2 while logged in as Bob.

### [Intermediate] Remove Items From Another User's Watchlist
- Objective: demonstrate this flaw against the live app at POST /watchlist/remove; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Removing an item accepts a user field — and believes it.
- Hint 2: A state-changing IDOR is worse than a read-only one.
- Hint 3: POST /watchlist/remove with videoId=2 and user=2 while logged in as Bob, then check Alice's list.

## Membership & Payments

### [Beginner] Single-Use Coupon Can Be Reused (FREEMONTH)
- Objective: demonstrate this flaw against the live app at POST /membership/upgrade; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: FREEMONTH is advertised as single-use per account. The server records the use — somewhere it never looks again.
- Hint 2: Apply it, finish the upgrade, then apply it a second time.
- Hint 3: POST two upgrades with coupon=FREEMONTH; the second free month should be refused but is granted.

### [Intermediate] Premium Upgrade Price Tampering
- Objective: demonstrate this flaw against the live app at POST /membership/upgrade; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The upgrade form posts an amount field, and the server trusts it as the price paid.
- Hint 2: Premium costs $12. The server never compares your amount to $12.
- Hint 3: Upgrade with amount=1 in the POST body and check your tier.

## Comments

### [Beginner] Stored XSS in Comments
- Objective: demonstrate this flaw against the live app at POST /comment → GET /video/:id; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Comments are printed on the video page exactly as stored.
- Hint 2: A comment is just text — until it contains markup.
- Hint 3: Post a comment containing <script>alert(1)</script> on any video and reload its page.

### [Beginner] Delete Another User's Comment
- Objective: demonstrate this flaw against the live app at POST /comment/delete; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The delete endpoint asks for a comment id and nothing else.
- Hint 2: Ownership is never compared with your session.
- Hint 3: Delete comment id 1 (Alice's) while logged in as Bob.

## Creator Studio

### [Beginner] Edit Another Creator's Video Metadata
- Objective: demonstrate this flaw against the live app at POST /creator/edit; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The edit endpoint trusts the videoId in the form and never asks who owns the video.
- Hint 2: Carol owns videos 1 and 4. Video 2 belongs to someone else.
- Hint 3: As Carol, POST /creator/edit with videoId=2 and a new title.

### [Intermediate] Unrestricted Upload — HTML/SVG "Video" Stored & Served
- Objective: demonstrate this flaw against the live app at POST /creator/upload → GET /files/:name; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The upload form accepts any file and the site serves it back under its own domain, with its content type intact.
- Hint 2: A "video" does not have to be a video file at all.
- Hint 3: Upload a file named evil.html containing a script payload, then open /files/evil.html.

## Admin & Platform

### [Beginner] Admin Console Open to Any Signed-In User
- Objective: demonstrate this flaw against the live app at GET /admin; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: The admin console URL is guessable, and the page never checks your role on the server.
- Hint 2: You only need to be logged in — as anyone.
- Hint 3: Log in as Bob and open /admin.

### [Beginner] Unauthenticated /api/debug Exposes All Accounts
- Objective: demonstrate this flaw against the live app at GET /api/debug; the Mission Board flips it to done when the server sees the real effect.
- Hint 1: Developers leave diagnostic endpoints behind. This one needs no login at all.
- Hint 2: Try the classic debugging path on the API.
- Hint 3: Open /api/debug in a private window with no session.
