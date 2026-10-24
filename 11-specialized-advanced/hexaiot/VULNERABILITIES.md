# HexaIoT — Vulnerability Map (LAB 101)

Every scored test in this lab, grouped by feature. Each one is a real, working flaw in the app, detected server-side when the exploit succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Log in with an email like ' OR '1'='1' -- so the string-built query matches the first user (the admin) without knowing any password.
- Impact: On a real client platform, this is a full account takeover of the first account in the table — usually the administrator — with no password at all.

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit 10+ wrong passwords for one account (e.g. bob@test.local) and notice nothing slows down, locks, or challenges you.
- Impact: Attackers can grind through password lists against any account on a client platform until one works — credential stuffing included.

### User Enumeration via Different Error Messages
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Location: POST /login and POST /forgot
- Exploitation outline: Compare the response for an email that exists with one that does not, on both the login and forgot-password forms. Probe at least 5 different emails.
- Impact: Attackers first enumerate which staff/customer emails are valid on a client platform, then focus phishing and password attacks only on real accounts.

### Published Demo / Default Admin Credentials
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: The login page itself prints a working demo admin email and password. Use them.
- Impact: Anyone on the internet can become administrator of a client platform using credentials the platform itself advertises.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: Reset tokens follow a formula from the user id (IOT<id>-<id*149+37>). Compute the token for another user (e.g. id 3) and reset their password without ever requesting a reset email.
- Impact: An attacker who can guess sequential user ids can reset the password of any account on a client platform, including admins.

### Admin Access via Role Cookie Tampering
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /admin
- Exploitation outline: The admin console trusts a client-set cookie (hx_role) instead of the server-side session. Log in as a normal owner, set your hx_role cookie to admin, and open /admin.
- Impact: Any registered user of a client platform can promote themselves to administrator by changing one cookie value.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Register a new account with a password of a single character. It is accepted.
- Impact: Client platform accounts protected by one-character passwords are effectively public.

### Mass Assignment — Role and Plan Set at Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: The registration handler binds every submitted field to the new account. Add role=admin (and plan=enterprise) to the registration POST and your new account is an admin.
- Impact: Self-service admin creation on a client platform: the attacker skips every approval process the business relies on.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register or POST /profile, rendered on /team
- Exploitation outline: Set your display name to an HTML/JS payload such as <script>alert(1)</script>. It is stored and rendered unescaped on the member directory.
- Impact: An attacker can hijack sessions and actions of anyone who views the directory on a client platform, including staff.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: The profile update accepts state-changing POSTs with no anti-CSRF token. Submit the form without the app’s own hx_origin marker (e.g. a raw curl POST with only your session cookie) and the change is applied.
- Impact: A client’s users can be silently renamed (and worse, on other endpoints) just by visiting an attacker’s page while logged in.

## Devices & Search

### SQL Injection in Device Search Dumps Hidden Devices
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /devices?q=
- Exploitation outline: The device search builds its filter as a string too. Search with ' OR '1'='1' -- to make the filter match every row — including the unlisted prototype device that normal search hides.
- Impact: Attackers can dump a client’s entire device registry — including unreleased prototypes and internal hardware — through the public search box.

### Reflected XSS in Device Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /devices?q=
- Exploitation outline: The search term is reflected into the results heading without escaping. Search for <script>alert(1)</script> and it executes.
- Impact: Attackers craft links that run script in a victim’s browser on the client’s own trusted domain — ideal for phishing and session theft.

### Device Detail IDOR — Any Device Viewable by ID
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /devices/<id>
- Exploitation outline: Device pages check only that you are logged in, not that you own the device. Open another owner’s device (e.g. Bob’s device 3 while logged in as Alice).
- Impact: Competitors or attackers can inventory a client’s customers’ devices, locations and configurations one ID at a time.

## Telemetry

### Telemetry Read IDOR — Another Owner’s Sensor Data
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /devices/<id>/telemetry
- Exploitation outline: Telemetry pages repeat the device IDOR: open the telemetry of a device you do not own (e.g. device 3 as Alice) and read its sensor history.
- Impact: Sensor histories reveal when premises are occupied, cold-chain failures, and other operational secrets of a client’s customers.

### Telemetry Spoofing — Write Readings to Another Owner’s Device
- OWASP: A08:2021 Software & Data Integrity Failures
- Difficulty: Intermediate
- Location: POST /devices/<id>/telemetry
- Exploitation outline: The telemetry ingest accepts readings from any logged-in user for any device. Post a fake reading to Bob’s sensor (device 3) as Alice and it appears in his history.
- Impact: Forged sensor readings can hide a real cold-chain break, trigger false alarms, or falsify compliance records on a client platform.

## Remote Commands

### Send Remote Commands to Another Owner’s Device
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /devices/<id>/command
- Exploitation outline: The command endpoint never checks ownership. As Alice, send a command (e.g. reboot or unlock) to Bob’s device 3 — it is queued for execution.
- Impact: On a real IoT platform this means unlocking strangers’ doors, rebooting cameras during a break-in, or stopping industrial equipment.

### Command History IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /devices/<id>/commands
- Exploitation outline: The command history of any device is readable by any logged-in user. Open the command log of a device you do not own.
- Impact: Attackers learn when devices are controlled and by whom — perfect reconnaissance for timing a physical attack on a client’s customers.

## Firmware & Updates

### Client-Supplied Firmware Version Trusted
- OWASP: A08:2021 Software & Data Integrity Failures
- Difficulty: Intermediate
- Location: POST /devices/<id>/update
- Exploitation outline: The device update form lets the client post a firmware version directly, and the server stores whatever it receives. Update your own device with firmware=9.9.9-custom.
- Impact: Attackers can make vulnerable devices appear patched (or roll devices back to known-bad firmware) in a client’s fleet records.

### Unreleased Beta Firmware Disclosure by Direct ID
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /firmware/<id>
- Exploitation outline: The firmware list hides the unlisted beta build, but its detail page is served to any logged-in user who guesses the ID. Open /firmware/3.
- Impact: Pre-release firmware notes leak attack surface (debug consoles, known issues) for a client’s unreleased products.

## Groups & Sharing

### Private Group Device List Visible to Non-Members
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /groups/<id>
- Exploitation outline: Private group pages render their full device list to any logged-in user. Open Bob’s private warehouse group (id 2) as Alice.
- Impact: A client’s customers’ site layouts — every camera and sensor at a warehouse — are exposed to any registered user.

### Predictable Group Share Token
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- Location: GET /groups/join?token=
- Exploitation outline: Group invite links use the token share-<groupId>. Guess the token for a private group (share-3) and open the join link — you are added as a member.
- Impact: Anyone can join any "private" group on a client platform by counting up, gaining member-level access to devices and discussions.

## Alerts

### Alert Detail IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /alerts/<id>
- Exploitation outline: Alert pages are served by ID with no ownership check. Open alert 1 (Bob’s warehouse alert) as Alice.
- Impact: Attackers monitoring a client’s customers’ alerts learn exactly when a site is in trouble — or empty.

### Acknowledge Another Owner’s Alert
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: POST /alerts/<id>/ack
- Exploitation outline: The acknowledge action also skips the ownership check. As Alice, acknowledge Bob’s alert 1 — it is marked handled and disappears from his queue.
- Impact: An attacker (or a negligent insider) can silence safety alerts on a client platform, hiding real incidents from their owners.

## Admin & Platform

### Admin User Dump Served to Any Logged-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin/users.json
- Exploitation outline: A JSON endpoint under /admin returns every user — passwords included — to anyone with a session, no admin role needed. Fetch it as Alice.
- Impact: Full credential dump of every account on a client platform — customers and staff — from one forgotten endpoint.

### Unauthenticated Debug Endpoint Dumps the Database
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: A leftover debug endpoint returns users (with passwords) and devices with no authentication at all. Open it in a fresh browser with no session.
- Impact: The entire account database of a client platform is one unauthenticated URL away from the internet.

### Weak Device API Token — Base64 of the Account Email
- OWASP: A07:2021 Identification & Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/devices with header x-api-token
- Exploitation outline: The device API accepts a token that is just "iot_" + base64(email). Build one for any user and read the whole device registry with no session at all.
- Impact: Anyone who knows a customer’s email address — public information — gets full API access to a client’s device fleet.
