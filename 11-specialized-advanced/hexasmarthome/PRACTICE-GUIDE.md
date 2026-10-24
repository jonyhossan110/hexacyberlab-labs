# HexaSmartHome (LAB 102) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective: the test flips on the Mission Board (/tests) only when the exploit really works.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: make the "SQL Injection Login Bypass" test flip to done on /tests.
- Hint 1: The login form builds its query as a string. What happens if your input becomes part of the query logic?
- Hint 2: Try a quote in the email field, then close the condition early.
- Hint 3: Email: ' OR '1'='1' -- with any password logs you in as the first matching user.

### Brute Force — No Rate Limiting (Beginner)
- Objective: make the "Brute Force — No Rate Limiting" test flip to done on /tests.
- Hint 1: How many wrong passwords can you try for one account in a row?
- Hint 2: There is no lockout, delay or CAPTCHA — count your failures past ten.
- Hint 3: Fail 10+ logins for one real account and the app still happily processes the next one.

### Published Demo Credentials (Beginner)
- Objective: make the "Published Demo Credentials" test flip to done on /tests.
- Hint 1: Read the login page carefully — everything on it.
- Hint 2: A demo account is advertised with its password.
- Hint 3: Sign in with the demo credentials printed on the login page (demo@hexasmart.local).

### User Enumeration via Login & Forgot-Password (Intermediate)
- Objective: make the "User Enumeration via Login & Forgot-Password" test flip to done on /tests.
- Hint 1: Compare the exact wording of a failed login for a real email vs an invented one.
- Hint 2: The forgot-password form answers differently too.
- Hint 3: Probe 5+ different emails across login/forgot: real accounts say "Incorrect password", unknown ones say "No account".

### Predictable Password-Reset Token (Intermediate)
- Objective: make the "Predictable Password-Reset Token" test flip to done on /tests.
- Hint 1: Request a reset for your own account and study the token format.
- Hint 2: The token is derived from something guessable about the user — their numeric id.
- Hint 3: Token = SH<id>-<id*137+42>. Compute it for another user (e.g. id 3) and reset their password without ever requesting a token for them.

### Role Cookie Tampering into Admin (Intermediate)
- Objective: make the "Role Cookie Tampering into Admin" test flip to done on /tests.
- Hint 1: After login, inspect the cookies the app set. One of them describes your role — and the server trusts it.
- Hint 2: The admin panel checks the cookie, not your account.
- Hint 3: Set the hx_role cookie to "admin" in your browser and open /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- Objective: make the "Weak Password Policy (1-Character Passwords)" test flip to done on /tests.
- Hint 1: Register a new account and see how short a password you can get away with.
- Hint 2: Try a single character.
- Hint 3: Register with the password "x" — the account is created.

### Stored XSS in Display Name (Beginner)
- Objective: make the "Stored XSS in Display Name" test flip to done on /tests.
- Hint 1: Your display name is rendered on member lists and admin pages without encoding.
- Hint 2: Put markup in the name at registration.
- Hint 3: Register with a name like <script>alert(1)</script> and view a page that lists users.

### Mass Assignment — Admin Role at Registration (Intermediate)
- Objective: make the "Mass Assignment — Admin Role at Registration" test flip to done on /tests.
- Hint 1: The registration handler copies the whole submitted body onto the new user record.
- Hint 2: What extra field would a normal form never send, but an attacker can add?
- Hint 3: POST /register with an added field role=admin — the new account is an administrator.

### CSRF on Profile Update (Intermediate)
- Objective: make the "CSRF on Profile Update" test flip to done on /tests.
- Hint 1: The app sets an hx_origin marker cookie and its own forms include the marker. The profile endpoint never checks it.
- Hint 2: A state-changing POST with no marker at all is accepted.
- Hint 3: POST /profile with a new name but no hx_origin cookie/field — it succeeds. That request could come from any website.

## Homes & Rooms

### IDOR — Another Household's Home Dashboard (Beginner)
- Objective: make the "IDOR — Another Household's Home Dashboard" test flip to done on /tests.
- Hint 1: Home ids are small sequential numbers in the URL.
- Hint 2: The dashboard checks that you are signed in — not that the home is yours.
- Hint 3: Sign in as Alice and open /home/2 (Bob's home): full device states and address are served.

### Reflected XSS in Search (Beginner)
- Objective: make the "Reflected XSS in Search" test flip to done on /tests.
- Hint 1: The search term is echoed in the results heading.
- Hint 2: It is echoed without encoding.
- Hint 3: Search for <script>alert(1)</script> and view the page source of the heading.

### SQL Injection in Home Search (Hidden Home Dump) (Intermediate)
- Objective: make the "SQL Injection in Home Search (Hidden Home Dump)" test flip to done on /tests.
- Hint 1: Search builds a LIKE query as a string, the same way login does.
- Hint 2: One home is deliberately unlisted and never appears in normal search.
- Hint 3: Search for ' OR '1'='1' -- and the hidden Lake Villa appears in the results.

## Devices & Control

### Camera Feed IDOR — Another Home's Snapshot (Beginner)
- Objective: make the "Camera Feed IDOR — Another Home's Snapshot" test flip to done on /tests.
- Hint 1: Camera pages are just device pages with a snapshot description.
- Hint 2: No membership check stands between you and device 7.
- Hint 3: As Alice, open /device/7 — Bob's hall camera snapshot details are served.

### IDOR — Control Another Home's Devices (Intermediate)
- Objective: make the "IDOR — Control Another Home's Devices" test flip to done on /tests.
- Hint 1: The control endpoint checks the device exists — not whose home it is in.
- Hint 2: Find a device id from another home (Bob's front door lock is device 5).
- Hint 3: As Alice, POST /device/5/control with state=unlocked. Bob's door unlocks.

### Guest Permission Bypass — Unlocking the Front Door (Intermediate)
- Objective: make the "Guest Permission Bypass — Unlocking the Front Door" test flip to done on /tests.
- Hint 1: Dave is a guest in Maple House: view-only by design.
- Hint 2: The control endpoint never looks at the membership permission level.
- Hint 3: Sign in as Dave and POST /device/1/control state=unlocked — the lock obeys a view-only guest.

### Stored XSS via Device Name (Intermediate)
- Objective: make the "Stored XSS via Device Name" test flip to done on /tests.
- Hint 1: Device names are rendered raw on the home dashboard and in the activity log.
- Hint 2: Any member can rename a device; nobody encodes the name.
- Hint 3: Rename a device to <script>alert(1)</script> via POST /device/2/rename and open the home page.

### Weak API Token — base64(email) (Intermediate)
- Objective: make the "Weak API Token — base64(email)" test flip to done on /tests.
- Hint 1: The device API accepts an x-api-token header instead of a session.
- Hint 2: The "token" is a reversible encoding of something public — the account email.
- Hint 3: Send GET /api/devices with header x-api-token set to base64 of bob@test.local, no cookies: his devices come back.

## Members & Invites

### Member Removes the Home Owner (Intermediate)
- Objective: make the "Member Removes the Home Owner" test flip to done on /tests.
- Hint 1: The member-removal endpoint checks you are signed in — nothing more.
- Hint 2: It does not compare your permission with the target's.
- Hint 3: As Carol (a plain member), POST /home/1/members/remove with userId=2 — Alice, the owner, is removed from her own home.

### Invite Accept Role Escalation — Guest to Owner (Advanced)
- Objective: make the "Invite Accept Role Escalation — Guest to Owner" test flip to done on /tests.
- Hint 1: Carol holds a guest invite to Cedar Flat (the code format is INV-<home>-<n>; hers is INV-2-1).
- Hint 2: The accept endpoint trusts a role field in the request body more than the invite itself.
- Hint 3: POST /invite/accept with code INV-2-1 and an added role=owner — Carol becomes OWNER of Bob's home.

### Predictable Invite Code — Joining Without an Invite (Advanced)
- Objective: make the "Predictable Invite Code — Joining Without an Invite" test flip to done on /tests.
- Hint 1: Invite codes follow a visible pattern: INV-<homeId>-<sequence>.
- Hint 2: The accept endpoint has a fallback: a well-formed code is trusted even if it was never issued.
- Hint 3: As Alice, POST /invite/accept with code INV-2-99 (never issued) — you join Cedar Flat anyway.

## Scenes & Automations

### Run Another Home's Scene by ID (Intermediate)
- Objective: make the "Run Another Home's Scene by ID" test flip to done on /tests.
- Hint 1: Scenes execute real device actions for their home. The run endpoint asks only for a scene id.
- Hint 2: Scene 2 is Bob's "Away Mode" for Cedar Flat.
- Hint 3: As Alice, POST /scene/2/run — Bob's scene executes: his doors lock and cameras switch on.

### CSRF on Automation Delete (Intermediate)
- Objective: make the "CSRF on Automation Delete" test flip to done on /tests.
- Hint 1: Deleting an automation is a state-changing POST with no CSRF marker check.
- Hint 2: The app's own delete form includes the hx_origin marker; a cross-site form would not.
- Hint 3: POST /automation/1/delete with no hx_origin cookie/field — the rule is deleted.

## Activity & Privacy

### Read Another Home's Activity Log (Beginner)
- Objective: make the "Read Another Home's Activity Log" test flip to done on /tests.
- Hint 1: The activity log shows when doors unlocked and when cameras saw motion.
- Hint 2: The log page is scoped by home id in the URL — and unchecked.
- Hint 3: As Alice, open /home/2/log: Bob's lock and camera history is fully readable.

## Admin Panel

### User List with Passwords Exposed to Any User (Beginner)
- Objective: make the "User List with Passwords Exposed to Any User" test flip to done on /tests.
- Hint 1: There is a JSON endpoint the admin UI uses: /admin/users.json.
- Hint 2: It checks only that *someone* is signed in.
- Hint 3: As Alice (a normal user), GET /admin/users.json — every account, including passwords, comes back.

## Platform & API

### Unauthenticated Debug Dump (/api/debug) (Beginner)
- Objective: make the "Unauthenticated Debug Dump (/api/debug)" test flip to done on /tests.
- Hint 1: Development leftovers often live under /api/.
- Hint 2: This one needs no session, no token, nothing.
- Hint 3: GET /api/debug with no cookies at all: users, homes, devices and memberships are dumped as JSON.
