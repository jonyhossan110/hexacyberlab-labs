# HexaCommunity — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge mirrors the /tests Mission Board. Objective for every challenge: make its test flip to done on the Mission Board by producing the real effect described.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: Submit a login whose email or password contains a SQL tautology so the string-built query matches the first account without its real password.
- Hints:
  1. The login builds its query by gluing your input straight into a string.
  2. Try a quote followed by OR and a condition that is always true.
  3. Email: ' OR '1'='1' -- with any password logs you in as the first account.

### [Beginner] Brute Force — No Rate Limit or Lockout
- Objective: Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.
- Hints:
  1. Pick one account and keep guessing wrong passwords.
  2. Count the failures — does anything slow down or lock at 5? At 10?
  3. Ten failed attempts for the same account are still processed instantly: the missing throttle is the flaw.

### [Beginner] User Enumeration via Login & Forgot-Password
- Objective: Compare responses for existing vs non-existing emails — they differ, so probing 5+ addresses reveals which ones are registered.
- Hints:
  1. Try a real member email and a made-up one on the forgot-password form.
  2. Notice the two responses say different things.
  3. Probe at least 5 distinct addresses; the differing answers build a confirmed member list.

### [Beginner] Published Demo Credentials
- Objective: The login page publishes a working demo account. Sign in with it — a live, real account anyone on the internet can use.
- Hints:
  1. Read the login page carefully — it advertises a demo account.
  2. Demo accounts are real accounts with real sessions.
  3. Sign in with the demo email and password printed on the login page.

### [Intermediate] Predictable Password-Reset Token
- Objective: Reset tokens are derived from the user id with simple arithmetic. Compute another member's token and reset their password without ever requesting a reset.
- Hints:
  1. Request a reset for your own account and study the token format.
  2. The token contains the user id and a number derived from it.
  3. token = HC<id>-<(id*137+42) mod 100000>. Compute Bob's (id 4) and POST it to /reset — no email needed.

### [Intermediate] Role Cookie Tampering into the Moderator Console
- Objective: The moderator console trusts a client-supplied hx_role cookie over the server-side session role. Set it as a plain member and walk in.
- Hints:
  1. The moderator console checks something your browser controls.
  2. Look at the cookies the app uses — one of them names a role.
  3. Set the cookie hx_role=admin (or moderator) as a plain member and open /mod.

## Registration & Profile

### [Beginner] No Password Policy — 1-Character Passwords
- Objective: Register a new account with a 1-character password. It is accepted.
- Hints:
  1. Create a fresh account and give it the shortest password possible.
  2. Does the form complain about length at all?
  3. A single character — even "x" — becomes a working password.

### [Beginner] Stored XSS in Display Name
- Objective: Put an HTML/JS payload in the display name; it is stored and rendered unescaped to everyone who browses the directory or profile.
- Hints:
  1. Display names are shown all over the site — directory, posts, profiles.
  2. What happens if your name contains HTML?
  3. Register or rename with a name like <script>alert(1)</script> and view the directory.

### [Intermediate] Mass Assignment — Self-Assign Admin Role / Premium Tier
- Objective: Registration binds every submitted field onto the new account. Add role=admin or tier=premium to the POST and the account is created with them.
- Hints:
  1. The register endpoint copies your form fields onto the account object.
  2. What fields exist on an account that the form never shows?
  3. Add role=admin (or tier=premium) to the registration POST and inspect your new account.

### [Intermediate] CSRF on Profile Update
- Objective: The profile update has no anti-CSRF token. A state-changing POST without the app's own hx_origin marker is accepted.
- Hints:
  1. The app sets an hx_origin marker cookie on its own pages — forms rely on it being present, but the server never checks.
  2. Send the profile POST from outside the site's own flow (no marker cookie).
  3. POST /profile with a new name and no hx_origin cookie: the change is accepted anyway.

## Member Directory

### [Beginner] Private Profile Contact Leak via Direct URL
- Objective: Members who marked their profile private still have their email and phone rendered to any logged-in member who opens /member/<id> directly.
- Hints:
  1. Bob's profile is marked private — the directory hides his contact details.
  2. Profiles also live at predictable /member/<id> URLs.
  3. Open Bob's direct profile URL (id 4) as another member: email and phone are printed anyway.

### [Beginner] Reflected XSS in Directory Search
- Objective: The search term is reflected into the results heading without encoding. Put a script payload in q and it comes straight back in the page.
- Hints:
  1. The results page repeats your search term back to you.
  2. Is that reflection encoded?
  3. Search for <script>alert(1)</script> and view the page source.

### [Intermediate] SQL Injection in Directory Search Dumps Unlisted Members
- Objective: The member search concatenates q into a LIKE query. Injecting a tautology plus a comment returns every account — including the unlisted member the search is supposed to hide.
- Hints:
  1. Search builds its query the same string-built way as login.
  2. A normal search only returns listed members — one member is deliberately unlisted.
  3. Search for: ' OR '1'='1' -- and look for the member who never appears in normal results.

## Private Groups

### [Beginner] Private Group Content Served to Non-Members
- Objective: The Founders Circle is a private group, but its page — posts included — is served to any logged-in member, member of the group or not.
- Hints:
  1. The group list marks Founders Circle as private.
  2. Private is apparently only a label.
  3. Open /group/1 as Bob (not a member): the confidential posts are all there.

### [Beginner] Delete Another Member's Group Post (IDOR)
- Objective: The group-post delete endpoint never checks authorship. Delete a post written by someone else by guessing its id.
- Hints:
  1. Group posts have small sequential ids.
  2. The delete button is shown to authors — but the endpoint does not care who calls it.
  3. POST /grouppost/3/delete as Bob: Alice's lounge post is gone.

### [Intermediate] Private Group Join Without Moderator Approval
- Objective: Joining an approval-required group trusts a client-supplied approved flag. Send approved=1 with the join and you are a member instantly.
- Hints:
  1. Joining Founders Circle normally goes to a moderator for approval.
  2. The join endpoint reads more than your user id from the request.
  3. POST the join with approved=1 in the body — membership is granted on the spot.

## Events & RSVPs

### [Beginner] Free Tier RSVPs to a Premium-Only Event
- Objective: The Premium Mastermind is premium-tier only, but the RSVP endpoint never checks tier. A free member RSVPs successfully.
- Hints:
  1. Event 1 is labelled premium-only.
  2. Labels are not checks — try the endpoint.
  3. RSVP to event 1 as Bob (free tier): the seat is yours.

### [Beginner] Cancel Another Member's RSVP (IDOR)
- Objective: RSVP cancel takes a bare id with no ownership check. Cancel Carol's meetup seat from your own account.
- Hints:
  1. RSVPs have small sequential ids — Carol's meetup RSVP is id 1.
  2. Your own "My RSVPs" page only lists yours, but the endpoint is open.
  3. POST /rsvp/1/cancel as Alice: Carol's seat is cancelled.

### [Intermediate] Event Capacity Overbooking
- Objective: The Community Meetup is capped at 2 seats and already full, but the RSVP endpoint never counts. RSVP anyway and the attendee list grows past capacity.
- Hints:
  1. Event 2 shows 2/2 seats taken.
  2. Full is apparently also just a label.
  3. RSVP to event 2: the booking is accepted and attendance exceeds the cap.

## Resource Library

### [Beginner] Free Tier Downloads Premium Resources
- Objective: The Premium Growth Vault is premium-only, but the download endpoint serves its file to any logged-in member who asks.
- Hints:
  1. Resource 2 is marked premium.
  2. The detail page hides the button for free members — the endpoint does not hide anything.
  3. As Bob (free), open /resource/2/download and read the vault file.

### [Intermediate] Path Traversal in Resource Download Reads Server Files
- Objective: The download handler joins the file parameter onto the files folder without sanitising. ../ sequences escape the folder and read arbitrary files — including server.js.
- Hints:
  1. The download accepts a file parameter.
  2. Filenames with ../ climb out of the files directory.
  3. Use file=../server.js on any download URL and read the application source.

## Discussions

### [Beginner] Stored XSS in Discussion Posts
- Objective: Discussion replies are stored and rendered raw. Post a script payload as a reply; it is served to everyone who opens the thread.
- Hints:
  1. Discussion bodies are rendered exactly as written.
  2. What if a reply contains HTML?
  3. Reply with <script>alert(1)</script> and reopen the thread.

### [Beginner] Delete Another Member's Discussion Thread
- Objective: Thread deletion checks nothing about authorship. Any member can delete any thread by id.
- Hints:
  1. Threads have sequential ids; Alice started thread 1.
  2. The UI only offers delete to the author — the endpoint offers it to everyone.
  3. POST /discussion/1/delete as Bob: Alice's thread disappears.

## Admin & Moderation

### [Beginner] Admin Panel Served to Regular Members
- Objective: The admin panel — full member list with emails — is served to any signed-in user who opens /admin directly, whatever their role.
- Hints:
  1. Admin pages are linked only for admins, but the URL is guessable.
  2. Try the obvious path as a plain member.
  3. Open /admin as Bob: the full member list renders.

### [Intermediate] CSRF on Admin Ban Action
- Objective: The admin ban endpoint has no anti-CSRF protection. A ban POST without the app's hx_origin marker still executes.
- Hints:
  1. Admin actions are state-changing POSTs — do they verify origin?
  2. The marker cookie exists, but is it checked here?
  3. As admin, POST /admin/ban for a user with no hx_origin cookie: the ban goes through.

## Platform & API

### [Intermediate] API Token Is Just Base64 of the Member Email
- Objective: The member API "authenticates" with a token that is simply base64(email) — a public value. Forge anyone's token and read the full member list without any session.
- Hints:
  1. The API expects an X-Api-Token header.
  2. Tokens here are an encoding, not a secret — of something public.
  3. Send X-Api-Token: base64 of alice@test.local with no cookies at all; the member list is yours.
