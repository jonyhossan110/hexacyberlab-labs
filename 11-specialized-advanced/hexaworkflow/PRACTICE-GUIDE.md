# HexaWorkflow (LAB 109) — Practice Guide

Challenges grouped by feature, then difficulty. Solve them in the app; progress is scored on /tests.

## Login & Authentication

### [Beginner] SQL injection login bypass
- Objective: make the "SQL injection login bypass" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The login form builds its query by pasting your input straight into the SQL text.
  2. Try a classic tautology in the email field, e.g. an OR '1'='1' condition.
  3. Use ' OR '1'='1' -- as the email with any password — the comment cuts the password check off.

### [Beginner] Brute force — no rate limit or lockout
- Objective: make the "Brute force — no rate limit or lockout" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Count how many wrong passwords the login accepts for one account.
  2. There is no CAPTCHA, delay or lockout — script 10+ failures.
  3. The 10th failed attempt is still processed normally; that missing throttle is the flaw.

### [Beginner] User enumeration via differing error messages
- Objective: make the "User enumeration via differing error messages" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Compare the login error for an email that exists with one that does not.
  2. The forgot-password form answers differently too — probe at least 5 distinct emails.
  3. Existing accounts say "Incorrect password." / get a reset message; unknown ones are told no account exists.

### [Beginner] Demo credentials published on the login page
- Objective: make the "Demo credentials published on the login page" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Read the login page carefully — everything you need is printed on it.
  2. A demo account is advertised with its password.
  3. Log in as dave@test.local with the published demo password.

### [Intermediate] Predictable password-reset token
- Objective: make the "Predictable password-reset token" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Request a reset for your own account and study the token format.
  2. The token is built from the account's numeric id with simple arithmetic.
  3. Token = WF<id>-<id*137+42>. Compute Bob's (id 3) and reset his password without ever requesting it.

### [Intermediate] Role taken from a client cookie (session/role tampering)
- Objective: make the "Role taken from a client cookie (session/role tampering)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Inspect the cookies the app sets after login — one of them states your role.
  2. The admin area trusts that cookie instead of the server-side session.
  3. Set hx_role=admin in your browser while logged in as a normal user, then open /admin.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- Objective: make the "Weak password policy (1 character accepted)" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Register a new account and shrink the password.
  2. There is effectively no minimum length or complexity check.
  3. A single-character password such as "x" is accepted.

### [Beginner] Stored XSS in display name
- Objective: make the "Stored XSS in display name" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Your display name is rendered back on several pages — check whether it is encoded.
  2. Register (or rename yourself) with an HTML payload as the name.
  3. Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)> — it is stored and rendered raw, including in the admin user list.

### [Intermediate] Mass assignment — role/plan set at registration
- Objective: make the "Mass assignment — role/plan set at registration" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The registration handler copies more form fields onto the account than the form shows.
  2. Add extra fields to the POST body and see what sticks.
  3. POST /register with role=admin (or plan=pro) in the body — the new account is created with them.

### [Intermediate] CSRF on profile update
- Objective: make the "CSRF on profile update" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The profile form has no anti-CSRF token; the app only sets a benign marker cookie on its own pages.
  2. A state-changing POST that arrives WITHOUT the hx_origin cookie did not come from the app's own pages.
  3. POST /profile with a new name from curl (no cookies except the session) — the change is accepted.

## Workflows

### [Beginner] Cross-workspace workflow IDOR
- Objective: make the "Cross-workspace workflow IDOR" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Workflow ids are small sequential numbers — open one that is not yours.
  2. The detail page checks that you are logged in, not which workspace owns the workflow.
  3. As Alice (workspace 1), open /workflow/3 — a Globex Labs workflow.

### [Beginner] Reflected XSS in workflow search
- Objective: make the "Reflected XSS in workflow search" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Your search term is echoed in the results heading.
  2. Check whether the echo is HTML-encoded.
  3. Search for <script>alert(1)</script> — it comes back raw in the page.

### [Intermediate] Private workflow served to non-owners
- Objective: make the "Private workflow served to non-owners" test flip to done on /tests by performing the real exploit.
- Hints:
  1. One Globex workflow is marked private — it hides payroll data.
  2. Privacy flags are cosmetic here; the direct URL still works.
  3. Open /workflow/4 as Alice — the private HR payroll export, its webhook URL included.

### [Intermediate] Run or toggle another workspace's workflow
- Objective: make the "Run or toggle another workspace's workflow" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Viewing is not the only unchecked action — try the Run button on someone else's workflow.
  2. The run and activate/deactivate endpoints skip the ownership check too.
  3. As Alice, POST /workflow/3/run (or /toggle) — Globex's workflow executes / changes state.

### [Intermediate] Workflow export leaks full configuration cross-workspace
- Objective: make the "Workflow export leaks full configuration cross-workspace" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The export endpoint returns the complete workflow definition as JSON.
  2. It performs even less checking than the detail page.
  3. As Alice, GET /workflow/3/export — full config, including the action target, is returned.

### [Intermediate] SQL injection in workflow search
- Objective: make the "SQL injection in workflow search" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Search builds its WHERE clause by string concatenation too.
  2. A tautology in the search box changes which rows come back.
  3. Search for ' OR '1'='1 — every workflow on the platform is returned, including other workspaces and the private one.

## Runs & History

### [Intermediate] Run-log IDOR exposes another workspace's execution output
- Objective: make the "Run-log IDOR exposes another workspace's execution output" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Run records have their own sequential ids and their own detail view.
  2. Run output contains what the workflow actually did — URLs, row counts, recipients.
  3. As Alice, open /run/3 — the Globex payroll export run, with its output.

## Templates

### [Intermediate] Use another user's private template
- Objective: make the "Use another user's private template" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The template gallery mixes official templates with users' own ones.
  2. The "use template" action does not check who owns the template.
  3. As Alice, POST /template/4/use — Bob's private lead-scoring template is copied into your workspace.

## Integrations & API Keys

### [Beginner] Integrations page exposes teammates' API keys
- Objective: make the "Integrations page exposes teammates' API keys" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Open the Integrations page and look beyond your own key.
  2. A "team keys" section helpfully lists everyone's keys in your workspace.
  3. Your own Integrations page shows Carol's full API key — copy it; the leak itself is the flaw.

### [Intermediate] Rotate another user's API key
- Objective: make the "Rotate another user's API key" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The rotate endpoint accepts a userId parameter.
  2. It never checks that the key being rotated belongs to you.
  3. POST /integrations/rotate with userId=3 — Bob's API key is replaced, locking his integrations out.

### [Intermediate] API accepts base64(email) as a credential
- Objective: make the "API accepts base64(email) as a credential" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The JSON API authenticates with a key parameter — look at what else it accepts.
  2. A legacy fallback compares the key against something trivially derivable from the account.
  3. GET /api/v1/workflows?key=<base64 of bob@test.local> — Bob's workflows are returned; an email address is not a secret.

### [Advanced] Server-side request forgery via webhook tester
- Objective: make the "Server-side request forgery via webhook tester" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The webhook tester makes the server fetch any URL you give it.
  2. Point it at an internal address instead of a public one.
  3. POST /integrations/webhook-test with url=http://169.254.169.254/latest/meta-data (or an internal hostname) — the server fetches it and shows you the response.

## Workspaces & Members

### [Intermediate] Member promotes roles — workspace role escalation
- Objective: make the "Member promotes roles — workspace role escalation" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The member-role endpoint trusts whoever calls it.
  2. You do not need to be the workspace owner to change roles.
  3. As Carol (a plain member), POST /workspace/role with userId=4 and role=owner — you are now a workspace owner.

## Admin Panel

### [Beginner] Admin panel open to non-admin sessions
- Objective: make the "Admin panel open to non-admin sessions" test flip to done on /tests by performing the real exploit.
- Hints:
  1. The /admin URL is only hidden, not protected, if your role claim says admin.
  2. Combine this with the role-cookie flaw.
  3. Logged in as any user with hx_role=admin, open /admin — the full user list appears.

### [Advanced] CSRF on admin plan change
- Objective: make the "CSRF on admin plan change" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Admin actions are plain POSTs with no anti-CSRF token.
  2. The marker-cookie check used elsewhere is missing here entirely.
  3. While holding an admin session, POST /admin/plan (userId + plan) from curl without the hx_origin cookie — the plan changes.

## Platform & API

### [Beginner] Unauthenticated debug endpoint dumps all data
- Objective: make the "Unauthenticated debug endpoint dumps all data" test flip to done on /tests by performing the real exploit.
- Hints:
  1. Developers leave diagnostic endpoints behind — guess the obvious path.
  2. No login is required at all.
  3. GET /api/debug — every user (passwords and API keys included), workflow and run, as JSON.
