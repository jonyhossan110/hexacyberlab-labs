# HexaVoice (LAB 37) — Practice Guide

Work feature by feature. Each challenge lists its objective and 3 graded hints (the /tests page mirrors these). The Lab Coach gives step-by-step help only after 3 genuine attempts on a feature.

## Login & Authentication

### SQL Injection Login Bypass (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The legacy SSO login builds its query by gluing your input straight into the string.
- Hint 2: Try a quote followed by a condition that is always true, e.g. in the email field.
- Hint 3: Email: ' OR '1'='1  (or admin@hexavoice.local'-- ) with any password signs you in as the first matched user.
- **Walkthrough:** Step by step: 1) Open the login page and choose the 'Legacy SSO sign-in' form. 2) In the email field type: ' OR '1'='1  3) Type anything as the password and submit. The glued-together query becomes true for the first row, so you are signed in without knowing any password. The variant admin@hexavoice.local'-- comments out the password check entirely.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Keep guessing the same account's password — watch whether anything ever slows you down.
- Hint 2: Script 10 or more wrong passwords for alice@hexavoice.local in a row.
- Hint 3: The 10th wrong password is processed exactly like the first: no delay, no CAPTCHA, no lockout. That missing throttle is the finding.
- **Walkthrough:** Step by step: 1) Pick a real account, e.g. alice@hexavoice.local. 2) Submit a wrong password 10 times in a row (script it with curl if you like). 3) Notice every attempt is answered instantly with the same error — nothing locks, slows or challenges you. The test completes when the 10th failure is still processed normally.

### User Enumeration via Login & Reset Responses (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Compare the error for an email that exists with one that does not.
- Hint 2: Try alice@hexavoice.local with a wrong password, then nobody@nowhere.test with any password.
- Hint 3: The two answers differ ("wrong password" vs "no account"), and Forgot Password differs too — that difference is an account-existence oracle.
- **Walkthrough:** Step by step: 1) Log in as alice@hexavoice.local with a wrong password — note the exact message. 2) Log in as ghost@nowhere.test — note the different message. 3) Do the same pair on Forgot Password. Because the answers differ, anyone can test whether an email is registered. The test completes once you have probed both an existing and a non-existing account.

### Default Demo Credentials Still Active (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Seeded demo accounts are famous for surviving into production.
- Hint 2: The login page footer names the demo mailbox. Guess the obvious demo password.
- Hint 3: demo@hexavoice.local / demo1234 signs straight in — a shipped default credential.
- **Walkthrough:** Step by step: 1) Read the demo hint in the login page footer. 2) Sign in with demo@hexavoice.local and the password demo1234. 3) You are in with a credential anyone could guess — that is the finding. The test completes on the successful demo login.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Reset tokens should be random. Ask what this one is derived from.
- Hint 2: Request a reset for your own account and inspect the link pattern in the flow. The token looks like rst- followed by a short hash.
- Hint 3: The token is a deterministic FNV hash of the email address only — compute it for any victim email and POST it to /reset without ever requesting a reset.
- **Walkthrough:** Step by step: 1) The forgot-password flow "emails" a link containing rst-<number>. 2) That number is just an FNV-1a hash of the email — no randomness, no secret. 3) Compute the same hash for a victim email (e.g. alice@hexavoice.local) yourself and POST email+token+new password to /reset WITHOUT using Forgot Password first. The password changes — token predicted, account taken.

### Session Cookie Role Tampering (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: After login, look at the cookies the app sets. One of them describes your role — in plain text.
- Hint 2: The admin area trusts that cookie instead of the server-side session.
- Hint 3: Set the hv_role cookie to admin (browser devtools or curl) and open /admin.
- **Walkthrough:** Step by step: 1) Log in as a normal user and inspect cookies: hv_role holds your role in plain text. 2) Change hv_role to admin. 3) Open /admin — the gate checks the cookie, not your real account role, so the admin console opens. The test completes when the admin area is served to an account whose real role is not admin.

## Registration & Profile

### Weak Password Policy (1-character passwords) (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Register a fresh account and see how little password it demands.
- Hint 2: Try a password of a single character.
- Hint 3: The account is created with password "x" — there is effectively no password policy at all.
- **Walkthrough:** Step by step: 1) Open Register. 2) Create an account with the password set to a single character, e.g. x. 3) The account is created and you can log in with it. The test completes the moment a too-short password is accepted.

### Mass Assignment — Role & Plan via Registration (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The register endpoint binds the whole request body onto the new user record.
- Hint 2: Add fields the form never shows — think role and plan.
- Hint 3: POST /register with extra fields role=admin and plan=enterprise: the new account is created with both.
- **Walkthrough:** Step by step: 1) Send a registration POST (curl works) with the normal fields PLUS role=admin and plan=enterprise. 2) The server copies every field onto the new user. 3) Log in — you hold an admin, enterprise account you were never granted. The test completes when a privileged field survives registration.

### Stored XSS in Display Name (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Your display name is rendered on the dashboard, speaker pages and the admin user list — as raw HTML.
- Hint 2: Put a markup payload in the name field of your profile.
- Hint 3: Saving a name like <script>alert(1)</script> (or an <svg onload> payload) stores it, and it executes in other users' browsers.
- **Walkthrough:** Step by step: 1) Go to Profile (or register) and set your display name to <svg onload=alert(1)>. 2) Save. 3) The name is stored raw and rendered unescaped wherever it appears — including the admin user list. The test completes when the payload is stored in the profile.

### CSRF on Profile Update (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Legit profile forms carry a hidden marker that matches a cookie the app set on its own pages.
- Hint 2: A state-changing POST that arrives WITHOUT that marker is still accepted.
- Hint 3: POST /profile as a logged-in user with no hx_marker field (curl with your session cookie) — the change is applied anyway.
- **Walkthrough:** Step by step: 1) Note the hidden hx_marker field in the real profile form — it mirrors the hx_origin cookie. 2) Using curl with your session cookie, POST /profile with a new display name but NO hx_marker. 3) The change is applied even though the request could have come from any website. The test completes when a marker-less POST changes the profile.

## Recordings & Transcripts

### Recording IDOR — Read Another User's Recording (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Recording pages live at /recordings/<number> and the numbers are sequential.
- Hint 2: Log in as one user and open a recording id that belongs to someone else.
- Hint 3: No ownership check is done: bob can open alice's private recording page and read the full transcript.
- **Walkthrough:** Step by step: 1) Log in as bob@hexavoice.local and note his recording ids on the dashboard. 2) Change the URL to a lower id belonging to alice, e.g. /recordings/1. 3) Her private recording page — title, speakers and full transcript — is served to you. The test completes when a recording owned by someone else is served.

### Private Recording Served via Predictable Media URL (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The "audio" for a recording is served from /media/<id> — a plain sequential number.
- Hint 2: That endpoint does not even ask you to log in.
- Hint 3: Open /media/1 in a private window (no session): the private recording's audio stub and transcript are served.
- **Walkthrough:** Step by step: 1) Log out (or use a fresh browser profile). 2) Browse to /media/1. 3) The server hands over the private recording's content — no login, no ownership check, and the id is just a sequence number. The test completes when private media is served to someone who is not the owner.

### Transcript Edited by Non-Owner (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The transcript editor posts to /recordings/<id>/transcript.
- Hint 2: Ownership is checked when viewing some things — but not when writing this one.
- Hint 3: As bob, POST a new transcript for alice's recording id 1. It saves.
- **Walkthrough:** Step by step: 1) Log in as bob. 2) POST to /recordings/1/transcript with a replacement transcript (recording 1 belongs to alice). 3) Open the recording — your text replaced hers. The test completes when a non-owner's edit is stored.

### Reflected XSS in Recording Search (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The recordings search echoes your query back into the results page.
- Hint 2: It echoes it as HTML, not as text.
- Hint 3: Search for <script>alert(1)</script> and view the page source — the payload comes back unescaped.
- **Walkthrough:** Step by step: 1) In Recordings, search for <svg onload=alert(1)>. 2) The results page prints your query back without encoding, so the markup becomes live HTML. The test completes when the payload is reflected unescaped.

## Sharing Links

### Share-Link Enumeration (Sequential Tokens) (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Share links look like /share/shr-1001 — the token is just a counter.
- Hint 2: Counters can be walked: shr-1001, shr-1002, shr-1003…
- Hint 3: Probe at least 5 different share tokens quickly and watch them resolve to real recordings.
- **Walkthrough:** Step by step: 1) Create or notice a share link: /share/shr-1001. 2) Change the number up and down — shr-1002, shr-1003, shr-1004, shr-1005. 3) Each resolves to somebody's shared recording. The test completes once 5 distinct tokens have been probed in a short window.

### Share Link Created for Someone Else's Recording (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The "create share link" action is POST /recordings/<id>/share.
- Hint 2: It never asks whether the recording is yours.
- Hint 3: As bob, create a share link for alice's private recording 1 — then open the link. Her private recording is now public-by-link.
- **Walkthrough:** Step by step: 1) Log in as bob. 2) POST /recordings/1/share (recording 1 is alice's private one). 3) A working /share/shr-… link is created for a recording you do not own. The test completes when the foreign share link exists.

## Speakers

### Speaker Profile IDOR — Private Voiceprint Notes (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Speaker pages live at /speakers/<number> with sequential ids.
- Hint 2: A speaker profile holds private notes about that voice.
- Hint 3: As bob, open /speakers/1 — alice's speaker notes are shown to you.
- **Walkthrough:** Step by step: 1) Log in as bob and open your own speaker page to learn the URL shape. 2) Change the id to 1. 3) Alice's speaker profile and her private voiceprint notes are served. The test completes when another user's speaker is served.

### Rename Another User's Speaker (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Renaming posts to /speakers/<id>/rename.
- Hint 2: Try it on a speaker id that is not yours.
- Hint 3: As bob, rename alice's speaker 1. The new name is saved.
- **Walkthrough:** Step by step: 1) Log in as bob. 2) POST /speakers/1/rename with a new name (speaker 1 belongs to alice). 3) The rename is saved. The test completes when a non-owner's rename succeeds.

## Usage & Billing

### Usage-Minute Manipulation (Client-Supplied Duration) (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Transcribing a recording charges your monthly minutes.
- Hint 2: The charge is computed from a "minutes" value in the request — which you control.
- Hint 3: POST /recordings/<yours>/transcribe with minutes=0 for a long recording: usage barely moves.
- **Walkthrough:** Step by step: 1) Pick one of your own long recordings and note your used minutes on Billing. 2) POST /recordings/<id>/transcribe with minutes=0 in the body. 3) The transcript is generated but your usage is charged 0 instead of the real duration. The test completes when the charged minutes are less than the recording's true minutes.

### Plan Upgrade Price Tampering (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The upgrade form posts the plan AND its price to /billing/upgrade.
- Hint 2: Prices belong on the server, not in the request.
- Hint 3: POST plan=enterprise with price=0 — the account becomes Enterprise and is charged nothing.
- **Walkthrough:** Step by step: 1) Send POST /billing/upgrade with plan=enterprise and price=0 (curl with your session). 2) Your account is now on the Enterprise plan. 3) The server charged the price you sent instead of the catalogue price. The test completes when the plan changes at a tampered price.

## API Access

### Predictable API Key Derived from Email (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: API keys look like hv_ followed by base64. Base64 of what?
- Hint 2: Decode your own key from the API page and compare it with your account details.
- Hint 3: The key is simply hv_ + base64(email). Mint alice's key yourself and call the API as her — without ever opening her API page.
- **Walkthrough:** Step by step: 1) Look at the key format on the API page: hv_<base64>. 2) Base64-encode alice@hexavoice.local yourself and prefix hv_. 3) Call GET /api/recordings with header x-api-key set to your minted key — you receive her data. The test completes when a never-issued, self-derived key authenticates.

### API BOLA — Foreign Recording via API (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: GET /api/recordings lists YOUR recordings. GET /api/recordings/<id> is less careful.
- Hint 2: Use your own valid key, but ask for a recording id that is not yours.
- Hint 3: Bob's key + recording id 1 returns alice's recording and transcript as JSON.
- **Walkthrough:** Step by step: 1) Get your own API key from the API page. 2) Call GET /api/recordings/1 with YOUR key (recording 1 is alice's). 3) The API returns her recording including the transcript. The test completes when the API serves a recording the key owner does not own.

## Webhooks & Integrations

### Webhook SSRF to Internal Services (simulated) (Advanced)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: The webhook "test" button makes the server fetch your URL and shows you the response.
- Hint 2: Point it back at the platform itself — its own admin/debug surfaces.
- Hint 3: Set the webhook URL to http://127.0.0.1:3046/debug and press test: internal-only data comes back in the response.
- **Walkthrough:** Step by step: 1) Open Webhooks and save the URL http://127.0.0.1:3046/debug. 2) Press "Send test". 3) The platform fetches its own internal debug endpoint and shows you the internal-only response — the server was tricked into requesting itself. (Simulated in-app: no real outbound request leaves the lab.) The test completes when internal content is returned.

## Admin Panel

### CSRF on Admin User Deletion (GET) (Intermediate)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Admin user deletion is a plain GET link: /admin/users/delete?id=<n>.
- Hint 2: GETs need no token at all — a browser will fire one from any page via an <img> tag.
- Hint 3: While signed in as admin, simply visit the delete URL for the demo user. The account is gone.
- **Walkthrough:** Step by step: 1) Sign in as admin@hexavoice.local / admin123. 2) Visit /admin/users/delete?id=4 (the demo user). 3) The account is deleted by a bare GET — no confirmation, no token. The test completes when the deletion executes.

## Platform & Data Exposure

### Debug Endpoint Dumps All Users & Passwords (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Development leftovers love obvious paths.
- Hint 2: Try /debug — no login required.
- Hint 3: The endpoint returns every user, including plaintext passwords, as JSON.
- **Walkthrough:** Step by step: 1) In any browser state (even logged out), open /debug. 2) The full user table — emails, roles, plans and plaintext passwords — is returned. The test completes when the dump is fetched.

### Missing HTTP Security Headers (Beginner)
- **Objective:** Make the exploit's real effect happen (e.g. data served, state changed, usage mis-charged) so the server marks this test complete.
- Hint 1: Inspect the response headers of any page (curl -I).
- Hint 2: Look for Content-Security-Policy, X-Frame-Options, X-Content-Type-Options…
- Hint 3: None of them are set — pages can be framed and MIME-sniffed. The test completes when a normal page is served without them.
- **Walkthrough:** Step by step: 1) Unlock the lab and open the dashboard. 2) The page is served with no Content-Security-Policy, no X-Frame-Options and no X-Content-Type-Options (check with curl -I if you like). The test completes on the first ordinary page load inside the lab.
