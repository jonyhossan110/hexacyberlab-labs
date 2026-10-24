# HexaIncident — Practice Guide (LAB 110)

Challenges grouped by feature, then difficulty. Each has graded hints and a measurable objective: the test completes only when the server sees the real effect.

## Login & Authentication

### [Beginner] SQL injection login bypass
- Objective: make the "SQL injection login bypass" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The login form builds its database query by gluing your input straight into a string.
  2. Try a quote in the email field, then close the string and add an always-true condition.
  3. Email: ' OR '1'='1' --  with any password signs you in as the first matched account.

### [Beginner] Brute force: no rate limit or lockout
- Objective: make the "Brute force: no rate limit or lockout" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Pick one real account and just keep guessing wrong passwords.
  2. Count the failures — does anything slow down, lock, or challenge you after many tries?
  3. After 10 failed attempts the form still processes guesses at full speed: there is no throttle at all.

### [Beginner] User enumeration via response differences
- Objective: make the "User enumeration via response differences" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Compare the exact wording of a failed login for a real email versus a made-up one.
  2. The forgot-password form behaves differently too — compare both flows.
  3. Probe at least 5 different email addresses across login/forgot: real accounts answer differently, revealing the valid user list.

### [Beginner] Published demo credentials grant real access
- Objective: make the "Published demo credentials grant real access" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Read the login page carefully — some portals helpfully print a demo account.
  2. Demo accounts often keep working long after the demo ends.
  3. Sign in with the demo credentials printed on the login page; they open a real responder account.

### [Intermediate] Predictable password-reset token
- Objective: make the "Predictable password-reset token" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Request a reset for your own account and study the token format closely.
  2. The token looks derived from something public about the account — like its numeric id.
  3. Token = HI<userId>-<userId*137+42>. Compute it for another account (Bob is id 3) and reset his password without ever requesting one.

### [Intermediate] Role cookie tampering into the admin panel
- Objective: make the "Role cookie tampering into the admin panel" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. After login, inspect the cookies the portal sets — one of them announces your role to the server.
  2. The admin gate trusts that cookie instead of checking the server-side account.
  3. Set the hx_role cookie to "admin" in your browser and open /admin: the gate believes the cookie, not your account.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- Objective: make the "Weak password policy (1 character accepted)" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Register a new account and try the shortest password the form will accept.
  2. There is effectively no minimum length or complexity check.
  3. A one-character password such as "a" is accepted and the account works.

### [Beginner] Stored XSS in display name
- Objective: make the "Stored XSS in display name" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Your display name is shown to other users on the Team page — how is it rendered?
  2. Names are printed into pages exactly as stored.
  3. Set a display name containing <script>alert(1)</script> (register or profile) and open /team: the payload is stored and served raw.

### [Intermediate] Mass assignment: self-register as admin
- Objective: make the "Mass assignment: self-register as admin" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The registration form only shows name/email/password — but the server may accept more fields than the form shows.
  2. What field decides whether an account is an administrator?
  3. Add role=admin to the registration request: the server binds every submitted field, creating a full admin account.

### [Intermediate] CSRF on profile update
- Objective: make the "CSRF on profile update" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Profile changes are accepted on a bare POST — look for any anti-CSRF token in the form. There is none.
  2. The app sets a benign hx_origin marker cookie on its own pages, but the update endpoint never checks it.
  3. Submit the profile-update POST without the hx_origin marker (e.g. from curl or a foreign page): the change is applied anyway.

## Search & Discovery

### [Beginner] Reflected XSS in search results
- Objective: make the "Reflected XSS in search results" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The results page repeats your search term back to you in the heading.
  2. Check whether it is encoded or printed exactly as typed.
  3. Search for <script>alert(1)</script>: the term comes back raw in the page — reflected script execution.

### [Intermediate] Search SQL injection dumps restricted incidents
- Objective: make the "Search SQL injection dumps restricted incidents" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Incident search uses the same string-built query style as the login form.
  2. A normal search only returns incidents your team may see.
  3. Search for ' OR '1'='1 and the result set suddenly includes restricted incidents from other teams.

## Incident Reports

### [Beginner] Restricted incident readable by another team (IDOR)
- Objective: make the "Restricted incident readable by another team (IDOR)" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Incident pages live at predictable sequential URLs: /incident/1, /incident/2, …
  2. Your list hides restricted incidents from other teams — but does the page itself check?
  3. Open /incident/3 directly: the confidential Command-team investigation is served to your SOC account with no check.

### [Intermediate] Editing another responder’s incident
- Objective: make the "Editing another responder’s incident" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The edit form for an incident is reachable by URL for any incident id.
  2. Try editing INC-2, which belongs to Bob on the Infra team, from your account.
  3. POST /incident/2/edit applies your changes even though you are neither reporter, assignee, nor admin.

### [Intermediate] Severity changed by a viewer account
- Objective: make the "Severity changed by a viewer account" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Severity drives paging and escalation — who is allowed to change it?
  2. The severity endpoint accepts posts from any signed-in account, even a read-only viewer.
  3. As Carol (viewer), POST /incident/1/severity with severity=P4: a live P2 incident is silently downgraded.

### [Intermediate] Closing an incident assigned to someone else
- Objective: make the "Closing an incident assigned to someone else" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Status transitions close the book on an incident — check who can perform them.
  2. The status endpoint never compares the caller to the assignee.
  3. As Alice, POST /incident/2/status with status=closed: Bob's open incident is closed without his knowledge.

## Assignments & Workflow

### [Intermediate] Reassigning another team’s incident to yourself
- Objective: make the "Reassigning another team’s incident to yourself" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The assign endpoint takes an incident id and a user id — and trusts both.
  2. You do not need to be involved in an incident to take it over.
  3. POST /incident/2/assign with assignee=<your id> from your account: Bob's incident is now yours.

### [Intermediate] Escalation triggered by an unauthorized user
- Objective: make the "Escalation triggered by an unauthorized user" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Escalation jumps an incident to P1 and hands it to the Command team — a powerful, paging action.
  2. The escalate endpoint checks only that you are signed in.
  3. As Carol (viewer), POST /incident/1/escalate: the incident is escalated and reassigned without any command authority.

### [Advanced] Self-assigning a restricted incident
- Objective: make the "Self-assigning a restricted incident" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Restricted incidents should not even be visible to other teams — but assignment is a write path nobody guarded.
  2. Combine what you learned: the restricted incident is id 3, and the assign endpoint trusts the caller.
  3. POST /incident/3/assign with assignee=<your id>: you are now the assignee of the confidential Command investigation.

## Evidence & Attachments

### [Intermediate] Evidence file download IDOR
- Objective: make the "Evidence file download IDOR" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Evidence files are downloaded by file name through /download?file=…
  2. The download never asks whether your team may see the incident the file belongs to.
  3. Download evidence-3.txt — the confidential mailbox-forensics notes of the restricted Command incident — from your SOC account.

### [Intermediate] Path traversal in evidence download
- Objective: make the "Path traversal in evidence download" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The file parameter is joined straight onto the evidence folder path.
  2. What happens if the "file name" contains ../ segments?
  3. Request /download?file=../server.js: the application source code itself is served.

## Audit Trail & Postmortems

### [Beginner] Audit trail readable by any user
- Objective: make the "Audit trail readable by any user" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. The audit trail at /audit records who did what across the whole platform.
  2. It should be a command-only tool — check who can actually open it.
  3. Any signed-in account, even a viewer, can read the full audit trail including admin actions.

### [Intermediate] Postmortem readable across teams (IDOR)
- Objective: make the "Postmortem readable across teams (IDOR)" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Postmortems live at predictable URLs: /postmortem/1 …
  2. PM-1 belongs to a SOC incident. What stops an Infra account from reading it?
  3. Open /postmortem/1 as Bob (Infra): the full postmortem — root cause and lessons — is served without any check.

## Admin Panel

### [Beginner] Admin user dump served to any account
- Objective: make the "Admin user dump served to any account" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Admin tooling often hides JSON endpoints next to the HTML pages, like /admin/users.json.
  2. This one checks that you are signed in — and nothing else.
  3. Open /admin/users.json as a plain responder: every account, including plaintext passwords, is returned.

### [Advanced] CSRF on admin user deactivation
- Objective: make the "CSRF on admin user deactivation" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Deactivating a user is a state-changing admin POST with no anti-CSRF token.
  2. The app’s hx_origin marker cookie is never verified on this endpoint either.
  3. As the admin, submit /admin/deactivate for a user without the marker: the account is deactivated by a tokenless request.

## Platform & API

### [Beginner] Unauthenticated /api/debug full data dump
- Objective: make the "Unauthenticated /api/debug full data dump" test flip to done on the Mission Board (/tests) by performing the real exploit.
- Hints:
  1. Developers love leaving a debug endpoint behind. Try /api/debug.
  2. This one does not even ask for a login.
  3. Open /api/debug with no session at all: users, passwords and incidents are dumped as JSON.
