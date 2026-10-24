# HexaChat (LAB 89) — Practice Guide

Challenges grouped by feature, then difficulty. The /tests Mission Board mirrors this guide. A challenge is complete only when its detection flips on the server — never by declaration.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: Log in without valid credentials so the sqli-login test flips to done on /tests.
- Hints:
  1. The login form builds its database query by gluing your input straight into the query string.
  2. Try a quote character in the email field, followed by a condition that is always true.
  3. Use admin@hexachat.local' OR '1'='1' -- as the email and any password — the query stops checking the password.

### No Brute-Force Protection on Login (Beginner)
- Objective: Submit 10 failed logins for one account and confirm every attempt is still processed.
- Hints:
  1. Nothing slows you down when a password guess is wrong — no delay, no lockout, no CAPTCHA.
  2. Script ten wrong passwords for the same account and watch them all get processed.
  3. Fail 10 logins in a row for alice@hexachat.local — the 10th is still accepted for processing.

### User Enumeration via Login & Reset Responses (Beginner)
- Objective: Probe at least 5 distinct email addresses and observe the differing responses.
- Hints:
  1. Compare the error message for an email that exists with one that does not.
  2. The forgot-password page answers differently for real and fake accounts too.
  3. Probe 5 different emails across /login and /forgot and collect the two different answers.

### Published Demo Credentials (Beginner)
- Objective: Sign in with the demo credentials shown on the login page.
- Hints:
  1. Read the login page carefully — it is friendlier than it should be.
  2. The page itself tells you a working username and password.
  3. Sign in with the demo account printed on the login page.

### Predictable Password-Reset Token (Intermediate)
- Objective: Reset another account’s password using a token you computed yourself, without requesting a reset first.
- Hints:
  1. Reset tokens are not random — they are computed from something you can see.
  2. A user id is public (member list, /api/debug). The token is a short formula of that id.
  3. For user id N the token is HC<N>-<N*149+37>. Compute one for Bob and reset his password without ever requesting a reset.

### Role Cookie Tampering (hx_role) (Intermediate)
- Objective: Reach /admin as a regular user by forging the hx_role cookie.
- Hints:
  1. After login, inspect the cookies the app sets — one of them describes your role.
  2. The admin page trusts that cookie instead of checking the account on the server.
  3. Set the hx_role cookie to admin in your browser and open /admin as a normal user.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- Objective: Create an account with a 1-character password.
- Hints:
  1. Registration never checks how strong a password is.
  2. Try creating an account with the shortest password the form will take.
  3. Register a new account with the password "x" — it is accepted.

### Mass Assignment: Role Granted at Registration (Intermediate)
- Objective: Register a new account that ends up with the admin role.
- Hints:
  1. The registration handler copies more of your request into the new account than the form shows.
  2. Add a field the form never offered you and see if the account keeps it.
  3. POST /register with an extra role=admin field — the new account is created as an administrator.

### Stored XSS in Display Name (Intermediate)
- Objective: Store an XSS payload in a display name so it is saved in the profile.
- Hints:
  1. Display names are printed back to other users without encoding — check the member list.
  2. Put markup, not text, in the name field.
  3. Register or rename with the display name <script>alert(1)</script> and open /members.

### CSRF on Profile Update (Intermediate)
- Objective: Change a profile with a POST that carries no valid hx_marker.
- Hints:
  1. Profile changes are accepted from a plain POST with no anti-CSRF token check.
  2. The app’s own forms carry a marker field — the server never verifies it.
  3. POST /profile with a new display name and NO hx_marker field — the change is applied anyway.

## Direct Messages

### Read Another User’s Private Conversation (IDOR) (Beginner)
- Objective: Open a DM conversation you are not a participant of and read its messages.
- Hints:
  1. Conversation URLs are simple numbers, and the page never checks that you are in the conversation.
  2. Open a conversation id that belongs to two other people.
  3. As Alice, open /conversations/3 — that is Bob and Carol’s private chat.

### Delete Another User’s Message (Intermediate)
- Objective: Delete a message written by a different user.
- Hints:
  1. The delete endpoint checks that you are logged in — nothing more.
  2. Find a message id written by someone else and ask the endpoint to delete it.
  3. POST /messages/<id>/delete for a message authored by Bob, while signed in as Alice.

### Blocked User Can Still Send Messages (API Path) (Intermediate)
- Objective: Deliver a message to a user who has blocked you, using the API send path.
- Hints:
  1. Alice has blocked Carol — the web form honours the block. Not every code path does.
  2. The app has a JSON send endpoint used by its mobile client; checks were only added to the web form.
  3. As Carol, POST /api/send with {"to":2,"text":"..."} — the message to Alice is delivered despite the block.

## Groups & Channels

### Join a Private Group Without an Invite (Beginner)
- Objective: Become a member of the private group (id 2) without a valid invite code.
- Hints:
  1. Private groups are supposed to need an invite code. The join endpoint is less strict than the UI suggests.
  2. The server grants membership whether or not a valid code arrives.
  3. As Carol, POST /groups/2/join with no invite field at all — you become a member of the private group.

### Read Private Group Messages as a Non-Member (Beginner)
- Objective: Read the messages of private group 2 while not a member of it.
- Hints:
  1. Group pages are simple numbered URLs.
  2. The page renders the messages before it ever asks whether you belong to the group — in fact it never asks.
  3. As Carol (not a member), open /groups/2 and read the private group’s messages.

### Self-Promote to Group Admin (Intermediate)
- Objective: Promote yourself to admin of a group where you are only a member.
- Hints:
  1. Group roles are changed through an endpoint that trusts whoever calls it.
  2. You do not need to be a group admin to use the endpoint that makes group admins.
  3. As Bob (a plain member of group 2), POST /groups/2/role with your own userId and role=admin.

### Remove the Group Owner as a Regular Member (Advanced)
- Objective: Remove the owner of group 2 while signed in as a regular member.
- Hints:
  1. Member removal is another endpoint that never asks who you are in the group.
  2. Even the group’s owner is just a userId to this handler.
  3. As Bob, POST /groups/2/remove with userId=2 — the owner, Alice, is removed from her own group.

## Attachments

### Download Another User’s Attachment (IDOR) (Beginner)
- Objective: Download an attachment that belongs to another user.
- Hints:
  1. Attachments have small sequential ids and a download endpoint that trusts them.
  2. Nothing ties an attachment to the person asking for it.
  3. As Alice, open /attachments/2 — that file belongs to Bob’s private conversation with Carol.

### Path Traversal on File Download (Intermediate)
- Objective: Use /download to read a file outside the files folder (the server’s own source).
- Hints:
  1. The download endpoint joins your file parameter onto a folder path without cleaning it.
  2. Dot-dot sequences walk up out of the files folder.
  3. Request /download?file=../server.js — the app serves its own source code.

### Unrestricted Upload: Stored HTML/SVG File Served (Intermediate)
- Objective: Upload an .html file with a script payload and have it served back as a page.
- Hints:
  1. The upload form accepts any filename and any content — and the app serves it back.
  2. The content type comes from the extension you choose.
  3. Upload a file named page.html containing a <script> payload, then open /files/page.html — it runs as a page of this site.

## Search

### Reflected XSS in Search (Beginner)
- Objective: Get an XSS payload reflected unescaped in the search results page.
- Hints:
  1. The results page repeats your search term back to you — as HTML, not text.
  2. Whatever markup you search for lands in the page.
  3. Search for <script>alert(1)</script> and view the page source: your payload is reflected unescaped.

### SQL Injection in Message Search (Intermediate)
- Objective: Make search return private messages you have no right to see, via an injected always-true condition.
- Hints:
  1. Search glues your query into a database search the same careless way the login does.
  2. A classic always-true condition makes the "filter" match everything — including things you should never see.
  3. Search for ' OR '1'='1 — the results dump every message on the platform, private groups included.

## Admin Panel

### Moderator Console Open to Any Logged-In User (Beginner)
- Objective: Open the moderator console while signed in as a non-admin user.
- Hints:
  1. There is a moderation queue page meant for staff. Its only real requirement is a login.
  2. No role is ever checked on the server.
  3. Sign in as any regular user and open /moderator — the reports queue is served.

### CSRF on Admin Ban Action (Intermediate)
- Objective: Ban a user through a POST that carries no valid hx_marker.
- Hints:
  1. Banning a user is a single POST. Like the profile form, it never verifies the anti-CSRF marker.
  2. You need an admin session (or a forged admin role cookie) — then the marker is the only thing missing, and it is not checked.
  3. As admin, POST /admin/ban with a userId and NO hx_marker — the user is banned anyway.

## Platform & API

### Unauthenticated Debug Data Dump (/api/debug) (Beginner)
- Objective: Fetch /api/debug with no session and receive the full user dump.
- Hints:
  1. Developers left a debug endpoint in the build.
  2. It needs no login at all.
  3. Open /api/debug in a fresh browser with no cookies — every account, including passwords, is returned as JSON.

### Weak API Token (Base64 of Email) (Intermediate)
- Objective: Use a base64-of-email token to read another user’s conversations through the API.
- Hints:
  1. The JSON API authenticates with a token header — but the "token" is not a secret.
  2. It is a reversible encoding of something public. Whose email addresses do you know?
  3. Send GET /api/conversations with header X-Api-Token set to the base64 of bob@hexachat.local — his conversations are returned, no login needed.
