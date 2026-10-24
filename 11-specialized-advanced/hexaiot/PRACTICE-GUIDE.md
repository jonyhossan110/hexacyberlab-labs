# HexaIoT — Practice Guide (LAB 101)

Challenges grouped by feature, then difficulty. Each challenge mirrors one test on the in-app Mission Board (/tests) and carries the same 3 graded hints.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: Log in with an email like ' OR '1'='1' -- so the string-built query matches the first user (the admin) without knowing any password.
- Measurable success: the "SQL Injection Login Bypass" test flips to done on /tests and /api/progress.
- Hint 1: The login form builds its database query by gluing your input straight into the query string.
- Hint 2: Try a classic tautology in the email field and comment out the rest of the query.
- Hint 3: Email: ' OR '1'='1' -- with any password lands you in as the first user in the table.

### Brute Force — No Rate Limit or Lockout (Beginner)
- Objective: Submit 10+ wrong passwords for one account (e.g. bob@test.local) and notice nothing slows down, locks, or challenges you.
- Measurable success: the "Brute Force — No Rate Limit or Lockout" test flips to done on /tests and /api/progress.
- Hint 1: Pick one real account and keep guessing wrong passwords.
- Hint 2: Count the failures — does anything change after 5? After 10?
- Hint 3: Ten failed logins for the same account are all processed normally: there is no throttle, lockout, or CAPTCHA.

### User Enumeration via Different Error Messages (Beginner)
- Objective: Compare the response for an email that exists with one that does not, on both the login and forgot-password forms. Probe at least 5 different emails.
- Measurable success: the "User Enumeration via Different Error Messages" test flips to done on /tests and /api/progress.
- Hint 1: Try logging in with a made-up email, then with a real one and a wrong password. Read the messages carefully.
- Hint 2: The forgot-password form leaks the same information in a different way.
- Hint 3: Existing accounts get "Incorrect password" / a reset is generated; unknown emails get "No account found" — probe 5 distinct emails to map valid users.

### Published Demo / Default Admin Credentials (Beginner)
- Objective: The login page itself prints a working demo admin email and password. Use them.
- Measurable success: the "Published Demo / Default Admin Credentials" test flips to done on /tests and /api/progress.
- Hint 1: Read the whole login page — including the helpful note at the bottom.
- Hint 2: Demo credentials are published right on the page.
- Hint 3: Sign in as admin@hexaiot.local with the password printed on the login page.

### Predictable Password-Reset Token (Intermediate)
- Objective: Reset tokens follow a formula from the user id (IOT<id>-<id*149+37>). Compute the token for another user (e.g. id 3) and reset their password without ever requesting a reset email.
- Measurable success: the "Predictable Password-Reset Token" test flips to done on /tests and /api/progress.
- Hint 1: Request a reset for your own account and study the token format you receive.
- Hint 2: The token is derived from something public and sequential: the user id.
- Hint 3: Token = IOT<id>-<id*149+37>. For Bob (id 3) that is IOT3-484 — post it to /reset with a new password and log in as him.

### Admin Access via Role Cookie Tampering (Intermediate)
- Objective: The admin console trusts a client-set cookie (hx_role) instead of the server-side session. Log in as a normal owner, set your hx_role cookie to admin, and open /admin.
- Measurable success: the "Admin Access via Role Cookie Tampering" test flips to done on /tests and /api/progress.
- Hint 1: After logging in, inspect the cookies the app sets. One of them describes your role — and it lives on YOUR side.
- Hint 2: The server reads your role from that cookie when you visit the admin console.
- Hint 3: Set hx_role=admin in your browser (or with curl) while logged in as Alice and request /admin.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted (Beginner)
- Objective: Register a new account with a password of a single character. It is accepted.
- Measurable success: the "Weak Password Policy — 1-Character Passwords Accepted" test flips to done on /tests and /api/progress.
- Hint 1: Try registering with shorter and shorter passwords.
- Hint 2: There is no minimum length check at all.
- Hint 3: A one-character password (like "x") creates a working account.

### Stored XSS in Display Name (Beginner)
- Objective: Set your display name to an HTML/JS payload such as <script>alert(1)</script>. It is stored and rendered unescaped on the member directory.
- Measurable success: the "Stored XSS in Display Name" test flips to done on /tests and /api/progress.
- Hint 1: Display names are shown on the /team directory page. What happens if a name contains HTML?
- Hint 2: The name is stored exactly as typed and printed without escaping.
- Hint 3: Register or rename yourself to <script>alert(1)</script> and open /team.

### Mass Assignment — Role and Plan Set at Registration (Intermediate)
- Objective: The registration handler binds every submitted field to the new account. Add role=admin (and plan=enterprise) to the registration POST and your new account is an admin.
- Measurable success: the "Mass Assignment — Role and Plan Set at Registration" test flips to done on /tests and /api/progress.
- Hint 1: The visible form only asks for name, email and password — but the server may accept more fields.
- Hint 2: What fields does a user record have? role, plan… Try submitting them too.
- Hint 3: POST /register with role=admin in the body: the new account is created as an administrator.

### CSRF on Profile Update (Intermediate)
- Objective: The profile update accepts state-changing POSTs with no anti-CSRF token. Submit the form without the app’s own hx_origin marker (e.g. a raw curl POST with only your session cookie) and the change is applied.
- Measurable success: the "CSRF on Profile Update" test flips to done on /tests and /api/progress.
- Hint 1: State-changing forms need a token a foreign site cannot know. Does this one check anything?
- Hint 2: The app sets an hx_origin cookie for its own pages — but the profile endpoint never verifies it.
- Hint 3: POST /profile with your session cookie but WITHOUT the hx_origin cookie: the name change still goes through.

## Devices & Search

### Reflected XSS in Device Search (Beginner)
- Objective: The search term is reflected into the results heading without escaping. Search for <script>alert(1)</script> and it executes.
- Measurable success: the "Reflected XSS in Device Search" test flips to done on /tests and /api/progress.
- Hint 1: The results page prints "Results for: <your term>" — exactly as typed.
- Hint 2: Try putting HTML in the search box instead of a device name.
- Hint 3: Search for <script>alert(1)</script> and the payload is reflected raw into the page.

### Device Detail IDOR — Any Device Viewable by ID (Beginner)
- Objective: Device pages check only that you are logged in, not that you own the device. Open another owner’s device (e.g. Bob’s device 3 while logged in as Alice).
- Measurable success: the "Device Detail IDOR — Any Device Viewable by ID" test flips to done on /tests and /api/progress.
- Hint 1: Device URLs end in a simple sequential number.
- Hint 2: Log in as one owner and change the number to a device that is not yours.
- Hint 3: GET /devices/3 as Alice shows Bob’s warehouse sensor in full.

### SQL Injection in Device Search Dumps Hidden Devices (Intermediate)
- Objective: The device search builds its filter as a string too. Search with ' OR '1'='1' -- to make the filter match every row — including the unlisted prototype device that normal search hides.
- Measurable success: the "SQL Injection in Device Search Dumps Hidden Devices" test flips to done on /tests and /api/progress.
- Hint 1: Normal search only shows listed devices. The prototype is hidden — unless the filter itself can be changed.
- Hint 2: The search term is glued into a LIKE filter. A quote character breaks out of it, and -- comments out the rest.
- Hint 3: Search for ' OR '1'='1' -- and the full device registry — prototype included — comes back.

## Telemetry

### Telemetry Read IDOR — Another Owner’s Sensor Data (Beginner)
- Objective: Telemetry pages repeat the device IDOR: open the telemetry of a device you do not own (e.g. device 3 as Alice) and read its sensor history.
- Measurable success: the "Telemetry Read IDOR — Another Owner’s Sensor Data" test flips to done on /tests and /api/progress.
- Hint 1: Telemetry lives under the device URL — the same sequential ID.
- Hint 2: Ownership is not checked on the telemetry view either.
- Hint 3: GET /devices/3/telemetry as Alice returns Bob’s warehouse readings.

### Telemetry Spoofing — Write Readings to Another Owner’s Device (Intermediate)
- Objective: The telemetry ingest accepts readings from any logged-in user for any device. Post a fake reading to Bob’s sensor (device 3) as Alice and it appears in his history.
- Measurable success: the "Telemetry Spoofing — Write Readings to Another Owner’s Device" test flips to done on /tests and /api/progress.
- Hint 1: If you can read another device’s telemetry, can you also write to it?
- Hint 2: The ingest form posts metric and value with no ownership check.
- Hint 3: POST /devices/3/telemetry as Alice with a made-up temperature — it is stored as if the device sent it.

## Remote Commands

### Command History IDOR (Beginner)
- Objective: The command history of any device is readable by any logged-in user. Open the command log of a device you do not own.
- Measurable success: the "Command History IDOR" test flips to done on /tests and /api/progress.
- Hint 1: Every device has a command history page under its URL.
- Hint 2: It is protected the same way as the rest of the device pages — which is to say, not at all.
- Hint 3: GET /devices/3/commands as Alice lists every command sent to Bob’s sensor.

### Send Remote Commands to Another Owner’s Device (Intermediate)
- Objective: The command endpoint never checks ownership. As Alice, send a command (e.g. reboot or unlock) to Bob’s device 3 — it is queued for execution.
- Measurable success: the "Send Remote Commands to Another Owner’s Device" test flips to done on /tests and /api/progress.
- Hint 1: Commands are the most dangerous feature here. Who is allowed to send them?
- Hint 2: The form on a device page posts a command — try it on a device that is not yours (reach it via the IDOR first).
- Hint 3: POST /devices/3/command as Alice: the command is accepted and queued against Bob’s device.

## Firmware & Updates

### Unreleased Beta Firmware Disclosure by Direct ID (Beginner)
- Objective: The firmware list hides the unlisted beta build, but its detail page is served to any logged-in user who guesses the ID. Open /firmware/3.
- Measurable success: the "Unreleased Beta Firmware Disclosure by Direct ID" test flips to done on /tests and /api/progress.
- Hint 1: The firmware index only shows stable releases. Are there more records behind it?
- Hint 2: Firmware detail pages use sequential IDs too.
- Hint 3: GET /firmware/3 shows the internal beta build notes — including that its debug console is enabled.

### Client-Supplied Firmware Version Trusted (Intermediate)
- Objective: The device update form lets the client post a firmware version directly, and the server stores whatever it receives. Update your own device with firmware=9.9.9-custom.
- Measurable success: the "Client-Supplied Firmware Version Trusted" test flips to done on /tests and /api/progress.
- Hint 1: Firmware should only ever come from the update channel — but the edit form has a firmware field.
- Hint 2: The server never checks the posted version against the released firmware list.
- Hint 3: POST /devices/<your id>/update with firmware=9.9.9-custom and the device now "runs" a version that does not exist.

## Groups & Sharing

### Private Group Device List Visible to Non-Members (Beginner)
- Objective: Private group pages render their full device list to any logged-in user. Open Bob’s private warehouse group (id 2) as Alice.
- Measurable success: the "Private Group Device List Visible to Non-Members" test flips to done on /tests and /api/progress.
- Hint 1: Groups marked private should be members-only. The group page does not check.
- Hint 2: Group URLs are sequential. Try the private ones.
- Hint 3: GET /groups/2 as Alice lists every device in Bob’s private group.

### Predictable Group Share Token (Intermediate)
- Objective: Group invite links use the token share-<groupId>. Guess the token for a private group (share-3) and open the join link — you are added as a member.
- Measurable success: the "Predictable Group Share Token" test flips to done on /tests and /api/progress.
- Hint 1: Invite links carry a token. Look at the format of a legitimate one on a group you own.
- Hint 2: The token is built from something sequential and public.
- Hint 3: Token = share-<groupId>: /groups/join?token=share-3 joins you to the private HQ group.

## Alerts

### Alert Detail IDOR (Beginner)
- Objective: Alert pages are served by ID with no ownership check. Open alert 1 (Bob’s warehouse alert) as Alice.
- Measurable success: the "Alert Detail IDOR" test flips to done on /tests and /api/progress.
- Hint 1: Alerts have their own sequential URLs.
- Hint 2: An alert reveals which device fired, where, and why — to anyone who asks.
- Hint 3: GET /alerts/1 as Alice shows Bob’s warehouse temperature alert.

### Acknowledge Another Owner’s Alert (Beginner)
- Objective: The acknowledge action also skips the ownership check. As Alice, acknowledge Bob’s alert 1 — it is marked handled and disappears from his queue.
- Measurable success: the "Acknowledge Another Owner’s Alert" test flips to done on /tests and /api/progress.
- Hint 1: Reading an alert is bad; clearing it is worse. The ack button posts to /alerts/<id>/ack.
- Hint 2: No ownership check stands between you and the button.
- Hint 3: POST /alerts/1/ack as Alice marks Bob’s warehouse alert as acknowledged.

## Admin & Platform

### Admin User Dump Served to Any Logged-In User (Beginner)
- Objective: A JSON endpoint under /admin returns every user — passwords included — to anyone with a session, no admin role needed. Fetch it as Alice.
- Measurable success: the "Admin User Dump Served to Any Logged-In User" test flips to done on /tests and /api/progress.
- Hint 1: Admin areas often have machine-readable side doors. This one ends in .json.
- Hint 2: It checks that you are logged in. It does not check that you are an admin.
- Hint 3: GET /admin/users.json as Alice returns all accounts with their passwords.

### Unauthenticated Debug Endpoint Dumps the Database (Beginner)
- Objective: A leftover debug endpoint returns users (with passwords) and devices with no authentication at all. Open it in a fresh browser with no session.
- Measurable success: the "Unauthenticated Debug Endpoint Dumps the Database" test flips to done on /tests and /api/progress.
- Hint 1: Developers leave diagnostic endpoints behind. This app has one under /api.
- Hint 2: No login needed. That is the point.
- Hint 3: GET /api/debug with no cookies returns the full user and device tables.

### Weak Device API Token — Base64 of the Account Email (Intermediate)
- Objective: The device API accepts a token that is just "iot_" + base64(email). Build one for any user and read the whole device registry with no session at all.
- Measurable success: the "Weak Device API Token — Base64 of the Account Email" test flips to done on /tests and /api/progress.
- Hint 1: API tokens should be random secrets. This one is an encoding, not a secret.
- Hint 2: Emails are public. What simple transform of an email might the API accept?
- Hint 3: Token = iot_ + base64("alice@test.local"). Send it as x-api-token to /api/devices — no cookies needed.
