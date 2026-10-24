# HexaFleet (LAB 75) — Practice Guide

Challenges grouped by feature, then difficulty. The /tests Mission Board mirrors this guide.

## Login & Authentication

### SQL injection login bypass (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The login form builds its query by string concatenation.
  2. Try a classic tautology in the email field: ' OR '1'='1
  3. Submit with any password — if a session opens as another user, the query was injected.

### Brute force — no rate limiting or lockout (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Pick one real account and keep guessing its password.
  2. Notice nothing slows down or locks after many failures.
  3. Fail 10 times in a row for the same account — the app still happily processes attempt 11.

### User enumeration via login and forgot-password responses (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Compare the error for an email that exists with one that does not.
  2. The forgot-password form answers differently too.
  3. Probe at least 5 different emails and note which ones are confirmed as real accounts.

### Weak and published default credentials (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The login page itself prints a demo account.
  2. Factory passwords like admin123 were never changed.
  3. Sign in with a published/default credential set and you are straight in.

### Predictable password-reset token (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Request a reset and look at the token format.
  2. The token is computed from the user id with simple arithmetic: HF + (id x 137 + 42).
  3. Compute the token for any user id and reset their password without ever requesting a link.

### Session role cookie tampering (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. After login, inspect the cookies the app sets.
  2. One cookie carries your role — and the server trusts the copy your browser sends back.
  3. Edit hx_role to manager or admin, then open the manager dashboard.

## Registration & Profile

### Weak password policy on registration (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Register a new account with the shortest password you can think of.
  2. Even a single character is accepted.
  3. Weak passwords fall instantly to guessing and credential stuffing.

### Mass assignment — self-assign a privileged role (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The registration form only shows name, email and password — the server accepts more.
  2. Add a role field to the registration POST.
  3. Register with role=manager and check what your new account can open.

### Stored XSS in display name (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Names are rendered back without encoding — including in the admin user list.
  2. Put an HTML/JS payload in the display name at registration or in your profile.
  3. A payload like <script>alert(1)</script> in the name is stored and served raw.

### CSRF on profile update (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The app marks its own forms with a hidden hx_origin field — but never checks it properly.
  2. Submit the profile form without that marker, from a foreign Origin.
  3. The change is applied anyway: no token, no origin check.

## Vehicles & Documents

### Vehicle IDOR — view another driver’s vehicle and documents (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Vehicle pages live at /vehicles/<id> with small sequential ids.
  2. Log in as one driver and open the vehicle assigned to another driver.
  3. The full record — including its document list — is served without an ownership check.

### Path traversal on document download (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Documents are downloaded through /documents?file=<name>.
  2. The name is joined to the docs folder without sanitising .. segments.
  3. Ask for ../../server.js and the application source code comes back.

### Driver reassigns a vehicle to themselves (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Assignment is a POST to /vehicles/<id>/assign meant for managers.
  2. The server never checks the caller’s role.
  3. As a driver, assign another driver’s vehicle to your own id.

## Trip Logs & Mileage

### Trip log IDOR — read another driver’s trips (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Trip pages live at /trips/<id>.
  2. Open a trip that belongs to another driver.
  3. Routes, times and mileage of colleagues are all readable.

### Mileage tampering on an approved trip (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Approved trips should be immutable — the edit endpoint disagrees.
  2. POST a new endKm to /trips/<id>/edit for an already-approved trip.
  3. The payable mileage changes after approval, with no re-review.

### Delete another driver’s trip log (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The delete action is a POST to /trips/<id>/delete.
  2. Ownership is never checked.
  3. Delete a trip that belongs to a colleague and it is gone.

## Fuel Expenses

### Fuel expense amount inflation (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The expense form asks for litres AND an amount.
  2. The server should price fuel itself (litres x $1.45) — it trusts your amount instead.
  3. Claim 10 litres with an amount of $500 and watch it get stored.

### Driver approves their own fuel expense (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Approval is a POST to /expenses/<id>/approve — a manager action.
  2. The endpoint never verifies the caller is a manager, or that they are not the claimant.
  3. Create an expense, then approve it yourself.

## Maintenance & Work Orders

### Close another driver’s maintenance work order (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Work orders close via POST /workorders/<id>/close.
  2. The closer is never checked against the reporter, the assigned mechanic, or staff roles.
  3. Close a work order reported by another driver.

### Work order cost tampering by a driver (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Costs are set through POST /workorders/<id>/cost, a mechanic/manager function.
  2. A plain driver session can call it too.
  3. Set an arbitrary cost on any work order.

## Search

### SQL injection in vehicle search (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Search builds its query with the raw q parameter.
  2. A tautology like ' OR '1'='1 makes the WHERE clause always true.
  3. The dump includes a decommissioned vehicle that normal search hides.

### Reflected XSS in search results (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The results page prints your query back: Results for "...".
  2. It prints it raw, without encoding.
  3. Put a script payload in q and view the page source.

## Admin Panel

### Admin panel open to any signed-in user (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The admin console lives at /admin.
  2. Nothing checks your role before serving it — being logged in is enough.
  3. Open it as a plain driver and read the full user list, passwords included.

### CSRF on admin user deactivation (Advanced)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Deactivation is a POST to /admin/deactivate.
  2. Like the profile form, it carries a marker the server ignores.
  3. Fire the POST without hx_origin, from a foreign Origin, using an admin session — the user is deactivated.

## Platform & API

### Unauthenticated debug endpoint dumps all data (Beginner)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. Developers left a diagnostic endpoint at /api/debug.
  2. It needs no login at all.
  3. It returns every user — passwords included — plus the fleet data.

### Weak API token — base64 of the user’s email (Intermediate)
- Objective: demonstrate the flaw end-to-end so the Mission Board marks it done.
- Hints:
  1. The JSON API checks an X-API-Key header.
  2. The "key" is just the account email, base64-encoded.
  3. Encode any user’s email and the API treats you as them.
