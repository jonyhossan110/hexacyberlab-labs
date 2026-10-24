# HexaSocial — Practice Guide (LAB 81)

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective. The in-app Mission Board (/tests) mirrors this guide.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: make the "SQL Injection Login Bypass" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The login form builds its query by gluing your input straight into a string.
- Hint 2: Try an email that closes the quote and adds an always-true condition.
- Hint 3: Example shape: admin@hexasocial.local' OR '1'='1' -- (any password).

### Brute Force — No Rate Limit or Lockout (Beginner)
- Objective: make the "Brute Force — No Rate Limit or Lockout" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Pick one real account and keep guessing its password.
- Hint 2: Notice the server never slows down, CAPTCHAs, or locks the account.
- Hint 3: Ten wrong passwords in a row for the same account proves the point.

### User Enumeration via Login & Forgot-Password Responses (Beginner)
- Objective: make the "User Enumeration via Login & Forgot-Password Responses" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Compare the error message for an email that exists vs one that does not.
- Hint 2: The forgot-password form answers differently too.
- Hint 3: Probe at least five different email addresses and watch the responses split into two kinds.

### Demo / Default Credentials Published on the Login Page (Beginner)
- Objective: make the "Demo / Default Credentials Published on the Login Page" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Read the login page carefully — it is surprisingly generous.
- Hint 2: A working demo account is printed right there for visitors.
- Hint 3: Just sign in with the published demo email and password.

### Predictable Password-Reset Token (Intermediate)
- Objective: make the "Predictable Password-Reset Token" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Request a reset for your own account and study the token format.
- Hint 2: The token is derived from something public and guessable about the account.
- Hint 3: Compute the token for a DIFFERENT account (it is based on the user id) and reset their password without ever requesting it.

### Role Cookie Tampering into the Moderator Queue (Intermediate)
- Objective: make the "Role Cookie Tampering into the Moderator Queue" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: After login, inspect the cookies the app sets — one of them states your role.
- Hint 2: The /moderator page trusts that cookie instead of the server-side account.
- Hint 3: Edit the cookie value to moderator and reload /moderator as a normal user.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted (Beginner)
- Objective: make the "Weak Password Policy — 1-Character Passwords Accepted" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Register a fresh account and try the shortest password imaginable.
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: A single-character password is accepted.

### Stored XSS in Display Name (Beginner)
- Objective: make the "Stored XSS in Display Name" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Your display name is rendered on profiles and feeds exactly as typed.
- Hint 2: Register (or rename) with a name containing an HTML/JS payload.
- Hint 3: Use a payload like <script>alert(1)</script> or <svg onload=alert(1)> as the display name.

### Mass Assignment — Role & Follower Count at Registration (Intermediate)
- Objective: make the "Mass Assignment — Role & Follower Count at Registration" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The registration form only shows a few fields, but the server copies across whatever you POST.
- Hint 2: Add fields the form never offered, like role or followers.
- Hint 3: POST /register with role=admin (or a large followers value) and check what your new account became.

### CSRF on Profile Update (Intermediate)
- Objective: make the "CSRF on Profile Update" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The app sets an hx_origin marker cookie on its own pages — but never checks it.
- Hint 2: Make a profile-update POST without that marker (e.g. plain curl with only your session cookie).
- Hint 3: If the change sticks, a malicious page could have made the same request from your browser.

## Search & Discovery

### Reflected XSS in Search Results (Beginner)
- Objective: make the "Reflected XSS in Search Results" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The results page repeats your search term back to you.
- Hint 2: It repeats it without any encoding.
- Hint 3: Search for a payload like <svg onload=alert(1)> and view the page source.

### SQL Injection in People Search Dumps Private Accounts (Intermediate)
- Objective: make the "SQL Injection in People Search Dumps Private Accounts" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Search normally first: private accounts are hidden and emails are masked.
- Hint 2: The search box feeds the same string-built query style as the login form.
- Hint 3: Try a query like ' OR '1'='1 and see whose records come back.

## Posts & Feed

### IDOR — Read Private & Followers-Only Posts (Beginner)
- Objective: make the "IDOR — Read Private & Followers-Only Posts" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Posts have simple sequential ids in their URLs.
- Hint 2: The post page never checks the post’s visibility against you.
- Hint 3: Open /post/3 (a private diary post) or /post/4 (followers-only) while signed in as someone who should not see them.

### Stored XSS in Post Body (Beginner)
- Objective: make the "Stored XSS in Post Body" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Post bodies are rendered raw into everyone’s feed.
- Hint 2: Write a post containing an HTML/JS payload.
- Hint 3: A payload like <svg onload=alert(1)> in a new post is stored and served to all viewers.

### IDOR — Edit Another User’s Post (Intermediate)
- Objective: make the "IDOR — Edit Another User’s Post" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The edit endpoint trusts the post id in the request.
- Hint 2: It never asks whether the post belongs to you.
- Hint 3: POST /post/2/edit with a new body while signed in as a different user.

### IDOR — Delete Another User’s Post (Intermediate)
- Objective: make the "IDOR — Delete Another User’s Post" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Deletion is just another POST with a post id.
- Hint 2: Like edit, it performs no ownership check.
- Hint 3: POST /post/5/delete as a different user and watch the post disappear.

## Social Graph

### Private-Account Follow Approval Bypass (Intermediate)
- Objective: make the "Private-Account Follow Approval Bypass" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Following a private account normally creates a pending request.
- Hint 2: The follow endpoint also honours an "approved" field from the request.
- Hint 3: POST /follow to Carol (id 4) with approved=1 and you are instantly an approved follower.

### Forced Follow — Follow Action Forged for Another User (Advanced)
- Objective: make the "Forced Follow — Follow Action Forged for Another User" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The follow endpoint accepts an optional "from" field in the POST body.
- Hint 2: The server trusts it instead of using your session.
- Hint 3: POST /follow with to=<you> and from=<a victim’s id> — the victim now "follows" you.

## Comments & Likes

### IDOR — Delete Another User’s Comment (Intermediate)
- Objective: make the "IDOR — Delete Another User’s Comment" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Comment deletion is a POST with a comment id.
- Hint 2: No check ties the comment to your account.
- Hint 3: POST /comment/1/delete while signed in as someone else.

### Like Forgery — Like Recorded as Another User (Intermediate)
- Objective: make the "Like Forgery — Like Recorded as Another User" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The like endpoint accepts an optional userId in the POST body.
- Hint 2: It records the like under whoever you name.
- Hint 3: POST /like for a post with userId set to another user’s id.

## Direct Messages

### IDOR — Read Other People’s Private Conversations (Beginner)
- Objective: make the "IDOR — Read Other People’s Private Conversations" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Conversation URLs carry a simple numeric id.
- Hint 2: The messages page never checks that you are a participant.
- Hint 3: Open /messages/1 while signed in as Alice — that conversation is between Bob and Carol.

### Send a Direct Message as Another User (Advanced)
- Objective: make the "Send a Direct Message as Another User" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: The send endpoint accepts an optional "from" field.
- Hint 2: It files the message under whoever you name, participant or not.
- Hint 3: POST /messages/2/send with from=3 and a body — Bob appears to have written it.

## Groups

### Read a Private Group’s Posts as a Non-Member (Beginner)
- Objective: make the "Read a Private Group’s Posts as a Non-Member" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: A group’s page shows its posts to whoever asks.
- Hint 2: Membership is never checked on the read path.
- Hint 3: Open /group/2 while signed in as a non-member and read the Inner Circle’s secret post.

### Join a Private Group Without Approval (Intermediate)
- Objective: make the "Join a Private Group Without Approval" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Private groups are supposed to be invite/approval only.
- Hint 2: The join endpoint forgets to enforce that for private groups.
- Hint 3: POST /groups/2/join as an outsider and you are immediately a member of the Studio Inner Circle.

## Admin & Platform

### Admin Panel Open to Any Signed-In User (Beginner)
- Objective: make the "Admin Panel Open to Any Signed-In User" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Try the obvious administration URL while signed in as a normal user.
- Hint 2: There is no role check on it at all.
- Hint 3: Open /admin as Alice and browse the full user table, passwords included.

### Unauthenticated /api/debug Dumps All User Records (Beginner)
- Objective: make the "Unauthenticated /api/debug Dumps All User Records" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).
- Hint 1: Developers love leaving a debug endpoint behind.
- Hint 2: This one needs no login at all.
- Hint 3: Fetch /api/debug in a fresh browser with no cookies and read every account, passwords included.
