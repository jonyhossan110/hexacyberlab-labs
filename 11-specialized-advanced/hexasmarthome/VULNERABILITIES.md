# HexaSmartHome (LAB 102) — Vulnerability Map

All 26 scored tests, grouped by feature. Every flaw below is live and detectable server-side when the exploit succeeds.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Impact: On a real client site this means anyone can sign in as the first account in the database — often the administrator — with no password at all.
- Lesson: String-built queries let attacker input change the query itself; parameterised queries keep data and logic separate.

### Brute Force — No Rate Limiting
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Beginner
- Impact: Attackers can grind through common passwords against a real customer account until one works — then they own the home controls.
- Lesson: Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.

### User Enumeration via Login & Forgot-Password
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Intermediate
- Impact: Attackers first harvest which emails are registered, then aim password attacks only at accounts that actually exist.
- Lesson: Different error messages for "no such user" and "wrong password" hand attackers a valid-account list for free.

### Published Demo Credentials
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Beginner
- Impact: A public demo login gives anyone a foothold account inside the platform, ready to attack real households from within.
- Lesson: Demo and default accounts with known passwords are real accounts — attackers try them first.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Intermediate
- Impact: Anyone who knows a victim's user id can reset their password and take over the account — and every device in their home.
- Lesson: Reset tokens must be long, random and single-use; a token computed from a user id is an open door.

### Role Cookie Tampering into Admin
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: Any user can promote themselves to administrator by editing a cookie — full platform compromise in seconds.
- Lesson: Authorisation decisions must come from server-side session data, never from values the client can edit.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Beginner
- Impact: Customers who pick weak passwords get their home accounts cracked almost instantly.
- Lesson: A password policy is a security control; accepting 1-character passwords makes every account trivially guessable.

### Mass Assignment — Admin Role at Registration
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: Attackers mint their own admin accounts at will — no exploit chain needed, just one extra form field.
- Lesson: Bind only whitelisted fields from user input; blindly assigning request bodies exposes privileged attributes.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Impact: One malicious account can run script in the browsers of household members and admins who view the list — session theft follows.
- Lesson: Any user-controlled string rendered as HTML becomes stored XSS unless it is output-encoded.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: A victim browsing any malicious page while signed in can have their profile silently changed by a cross-site form post.
- Lesson: State-changing endpoints need an unforgeable CSRF token (or strict SameSite + origin checks).

## Homes & Rooms

### IDOR — Another Household's Home Dashboard
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Impact: Anyone can browse strangers' homes: addresses, device layouts and whether doors are locked — a burglar's shopping list.
- Lesson: Every object access must verify the requester owns (or belongs to) that object — authentication is not authorisation.

### SQL Injection in Home Search (Hidden Home Dump)
- OWASP: A03:2021 Injection · Difficulty: Intermediate
- Impact: Unlisted properties — often the privacy-conscious or high-value homes — are exposed to anyone with a browser.
- Lesson: Injection in search is as dangerous as in login — it turns a filter into a full data dump.

### Reflected XSS in Search
- OWASP: A03:2021 Injection · Difficulty: Beginner
- Impact: A crafted search link sent to a homeowner runs script in their session when clicked.
- Lesson: Reflected input must be encoded in the exact context where it is rendered.

## Devices & Control

### IDOR — Control Another Home's Devices
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: A stranger can unlock the front door of someone else's house from the internet. This is the nightmare scenario for a smart-home platform.
- Lesson: Write endpoints need the same ownership checks as read endpoints — control actions are the most sensitive of all.

### Guest Permission Bypass — Unlocking the Front Door
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: A babysitter or Airbnb guest with view-only access can unlock doors — the exact abuse the permission system exists to prevent.
- Lesson: Permission levels must be enforced server-side on every action, not just hidden in the UI.

### Camera Feed IDOR — Another Home's Snapshot
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Impact: Strangers can peek into other people's homes through their own cameras — a grave privacy breach.
- Lesson: Privacy-sensitive objects (camera views) need the strictest ownership checks, applied per object.

### Stored XSS via Device Name
- OWASP: A03:2021 Injection · Difficulty: Intermediate
- Impact: A malicious household member plants script that fires for the homeowner and admins viewing the dashboard.
- Lesson: Stored strings are rendered in many places — encode on output everywhere, not only where the input arrived.

### Weak API Token — base64(email)
- OWASP: A07:2021 Identification and Authentication Failures · Difficulty: Intermediate
- Impact: Anyone who knows a customer's email address — public information — gets full API access to their devices.
- Lesson: An API credential must be a high-entropy secret; encoding a public identifier is not a token.

## Members & Invites

### Invite Accept Role Escalation — Guest to Owner
- OWASP: A01:2021 Broken Access Control · Difficulty: Advanced
- Impact: A guest invited to view cameras ends up owning the house account — able to remove the real owner and add their own devices.
- Lesson: Privilege must come from the server-side record (the invite), never from fields the invitee supplies.

### Predictable Invite Code — Joining Without an Invite
- OWASP: A01:2021 Broken Access Control · Difficulty: Advanced
- Impact: Anyone can join any household by guessing a short code, gaining member access to locks and cameras.
- Lesson: Access codes must be unguessable random values verified against issued records — pattern-shaped fallbacks destroy the control.

### Member Removes the Home Owner
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: Any invited member can seize a household by ejecting the owner, then control every device in it.
- Lesson: Destructive membership actions need role hierarchy checks (only owners manage members; owners cannot be removed by members).

## Scenes & Automations

### Run Another Home's Scene by ID
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: An outsider can trigger scenes in strangers' homes — locking doors, killing lights — without ever opening the device page.
- Lesson: Action endpoints that trigger physical effects need the same membership checks as the device controls they wrap.

### CSRF on Automation Delete
- OWASP: A01:2021 Broken Access Control · Difficulty: Intermediate
- Impact: A homeowner visiting a malicious page could silently lose the automation that locks their doors at night.
- Lesson: Every state-changing route needs CSRF defence — security automations are high-value targets.

## Activity & Privacy

### Read Another Home's Activity Log
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Impact: Strangers learn exactly when a house is empty and when its occupants come and go — intelligence for a physical break-in.
- Lesson: Audit/activity data is sensitive personal data and needs the same access control as the objects it describes.

## Admin Panel

### User List with Passwords Exposed to Any User
- OWASP: A01:2021 Broken Access Control · Difficulty: Beginner
- Impact: Every customer password is one request away from any signed-in user — total platform account takeover.
- Lesson: API endpoints behind an admin UI need their own authorisation checks; hiding the page is not protecting the data.

## Platform & API

### Unauthenticated Debug Dump (/api/debug)
- OWASP: A05:2021 Security Misconfiguration · Difficulty: Beginner
- Impact: A completely unauthenticated attacker downloads the entire platform database in one request.
- Lesson: Debug/diagnostic endpoints must never ship to production; if they exist, they need admin auth and auditing.
