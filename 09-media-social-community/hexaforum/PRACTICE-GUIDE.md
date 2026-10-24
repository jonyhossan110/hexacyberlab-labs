# HexaForum — Practice Guide (LAB 82)

Challenges grouped by feature, then difficulty. Each challenge has 3 graded hints and a measurable objective: the test flips to done on the Mission Board (/tests) only when the real exploit effect happens server-side.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: make the "SQL Injection Login Bypass" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The login form builds its database query by gluing your input straight into the SQL string.
  2. Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.
  3. Use admin@hexaforum.local' OR '1'='1 as the email with any password — the query matches the first user (the admin) and logs you in as them.

### [Beginner] Brute Force — No Rate Limit or Lockout
- Objective: make the "Brute Force — No Rate Limit or Lockout" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Nothing slows you down when a password guess fails.
  2. Write down one account email and just keep guessing passwords.
  3. Submit 10+ wrong passwords for alice@hexaforum.local — every attempt is still processed, with no lockout, delay or CAPTCHA.

### [Beginner] User Enumeration via Login & Forgot-Password Responses
- Objective: make the "User Enumeration via Login & Forgot-Password Responses" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Compare the error message for an email that exists with one that does not.
  2. The forgot-password form answers differently too.
  3. Probe at least 5 different emails across /login and /forgot and diff the responses — "No account found" vs "Incorrect password" tells you exactly which emails are registered.

### [Beginner] Published Demo Moderator Credentials
- Objective: make the "Published Demo Moderator Credentials" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The login page itself is generous with information.
  2. Scroll the login page — a demo account is advertised to every visitor.
  3. Log in with the published demo moderator credentials shown on the login page (mod@hexaforum.local) — a privileged account protected only by a password everyone can read.

### [Intermediate] Predictable Password-Reset Token
- Objective: make the "Predictable Password-Reset Token" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Request a reset for your own account and study the token format.
  2. The token seems to be built from something you already know about the user.
  3. Tokens look like HF<id>-<id x 137 + 42>. Bob is user 3, so compute HF3-453 and POST it to /reset without ever requesting a reset for Bob — then log in with your new password.

### [Intermediate] Role Cookie Tampering into the Moderation Console
- Objective: make the "Role Cookie Tampering into the Moderation Console" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The /mod console decides who is staff by reading something your browser sends.
  2. Inspect your cookies — one of them sounds like a job title.
  3. As a plain member, set the cookie hx_role=moderator (or admin) and visit /mod — the console trusts the client-supplied cookie instead of the server-side account role.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- Objective: make the "Weak Password Policy at Registration" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Try registering with the shortest password the form will take.
  2. There is no minimum length or complexity check at all.
  3. Register a new account with a 1-character password — it is accepted immediately.

### [Beginner] Stored XSS in Display Name
- Objective: make the "Stored XSS in Display Name" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Your display name is printed on member lists and admin pages — exactly as you typed it.
  2. What happens if your "name" is actually HTML?
  3. Register (or rename yourself) with a display name like <script>alert(1)</script> or <img src=x onerror=alert(1)> — it is stored and rendered raw to everyone, including admins.

### [Intermediate] Mass Assignment — Role & Reputation at Registration
- Objective: make the "Mass Assignment — Role & Reputation at Registration" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The registration handler binds more form fields than the form shows.
  2. What fields does a user record have? role, rep... what if you just POST them?
  3. Add role=moderator and reputation=9999 to the /register POST — the new account is created as a moderator with 9,999 reputation.

### [Intermediate] CSRF on Profile Update
- Objective: make the "CSRF on Profile Update" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Your profile update form has no anti-CSRF token.
  2. The app sets a benign hx_origin marker cookie on its own pages — a genuine browser request carries it, a forged cross-site one does not.
  3. POST to /profile/update with only your session cookie and NO hx_origin marker (e.g. from a raw curl request) — the name change is accepted, proving a malicious site could do the same to a logged-in victim.

## Boards & Threads

### [Beginner] Private Staff Board Readable by Any Member
- Objective: make the "Private Staff Board Readable by Any Member" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Boards have ids. One of them is labelled staff-only.
  2. The board page checks that you are logged in — nothing more.
  3. As a plain member, open /board/3 (Staff Lounge) directly — internal threads about ban lists and alt accounts are served to you.

### [Beginner] Hidden (Removed) Thread Still Readable by Direct URL
- Objective: make the "Hidden (Removed) Thread Still Readable by Direct URL" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Moderators "removed" a thread about a leaked password dump. Removed from the listing — but is it gone?
  2. Thread ids are sequential. The removed one sits between the visible ones.
  3. Open /thread/6 directly as a member — the hidden thread is still fully served; only the listing hides it.

### [Beginner] Stored XSS in Post Body
- Objective: make the "Stored XSS in Post Body" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Post bodies are printed back to every reader of the thread.
  2. Try posting something that is more than text.
  3. Reply in any thread with a body containing <script>alert(1)</script> or an <img onerror> payload — it is stored and served raw to every reader.

### [Intermediate] Edit Another User's Post (Post IDOR)
- Objective: make the "Edit Another User's Post (Post IDOR)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The edit form only appears on your own posts. The endpoint behind it is less picky.
  2. Post ids are sequential — note one that belongs to Bob.
  3. POST to /post/3/edit as Alice with a new body — Bob's post is rewritten, because the endpoint never checks authorship.

## Search

### [Beginner] Reflected XSS in Search Results
- Objective: make the "Reflected XSS in Search Results" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The results page politely repeats what you searched for.
  2. It repeats it without encoding it.
  3. Search for <script>alert(1)</script> — the payload is reflected raw into the results page heading.

### [Intermediate] SQL Injection in Forum Search Leaks Private Threads
- Objective: make the "SQL Injection in Forum Search Leaks Private Threads" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Normal search politely hides the private board and removed threads.
  2. The search box feeds the same string-built query style as the login form.
  3. Search for ' OR '1'='1 — the tautology makes the query match everything, including Staff Lounge and hidden threads that normal search never shows.

## Reputation & Voting

### [Beginner] Self-Upvoting Your Own Posts
- Objective: make the "Self-Upvoting Your Own Posts" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The vote button politely disappears on your own posts. The endpoint does not check.
  2. Find one of your own post ids.
  3. POST to /post/<your post id>/vote with value=1 as its author — your reputation increases.

### [Beginner] Repeat Voting on the Same Post
- Objective: make the "Repeat Voting on the Same Post" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Nothing remembers that you already voted.
  2. Just press the same endpoint again.
  3. Vote on the same post two or more times — every request adds reputation again; there is no one-vote-per-user record.

### [Intermediate] Vote Amount Tampering (Arbitrary Reputation)
- Objective: make the "Vote Amount Tampering (Arbitrary Reputation)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. A vote is worth 1 point. That number travels in your request.
  2. What if the request asks for more?
  3. POST a vote with value=999 — the author's reputation jumps by 999. The server trusts the client-supplied amount completely.

## Private Messages

### [Beginner] Read Another User's Private Message (PM IDOR)
- Objective: make the "Read Another User's Private Message (PM IDOR)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Private messages have sequential ids in their URLs.
  2. The reader page never asks whether you are the sender or the recipient.
  3. As Alice, open /pm/4 — Carol's private message (including her backup email) is served to you.

### [Intermediate] Send a PM Spoofed as Another User
- Objective: make the "Send a PM Spoofed as Another User" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The send form decides who the message is "from". So does the request body, apparently.
  2. What extra field might the handler trust?
  3. POST to /pm/send with a from field naming another user (e.g. the admin's id or email) — the message is stored and delivered as if they sent it.

## Moderation & Admin

### [Beginner] Admin Panel Open to Any Logged-In Member
- Objective: make the "Admin Panel Open to Any Logged-In Member" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The /admin URL is easy to guess. Guessing is all it takes.
  2. The panel checks that *someone* is logged in. Anyone.
  3. Log in as a plain member and open /admin — the full user list, including passwords and roles, is served.

### [Intermediate] Member Performs Moderation Action (Pin Thread)
- Objective: make the "Member Performs Moderation Action (Pin Thread)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Pinning a thread is a moderator action. The button is hidden from members.
  2. The endpoint behind the button does not ask who you are.
  3. As a plain member, POST to /thread/<id>/pin — the thread is pinned. No role check exists on the server.

### [Intermediate] CSRF on Admin User-Ban Action
- Objective: make the "CSRF on Admin User-Ban Action" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Banning a user is a single POST with no anti-CSRF token.
  2. The app's own pages carry the hx_origin marker cookie; a forged cross-site request would not.
  3. As the admin, POST to /admin/ban with only the session cookie and NO hx_origin marker — the ban is applied, proving any site the admin visits could ban users through their browser.

## Platform & API

### [Beginner] Unauthenticated Debug Endpoint Dumps All Users
- Objective: make the "Unauthenticated Debug Endpoint Dumps All Users" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Developers love leaving diagnostic endpoints behind.
  2. Try the obvious debugging path on the API.
  3. Open /api/debug with no login at all — it returns every user record, including passwords, roles and reputation.

### [Intermediate] API Token Is Just Base64 of Your Email
- Objective: make the "API Token Is Just Base64 of Your Email" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The JSON API authenticates with an X-Api-Token header. Its format is embarrassingly guessable.
  2. Take a member's email address. Encode it. That is the whole attack.
  3. Send GET /api/mydata with header X-Api-Token set to base64(victim email) and no session cookie — the API returns that user's data.
