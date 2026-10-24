# HexaAgent — Practice Guide (LAB 35)

Work through the challenges feature by feature. The in-app /tests page mirrors this list and tracks your progress. Hints are graded: nudge → stronger → near-answer.

## Login & Authentication

### [Intermediate] SQL injection login bypass (legacy SSO login)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The legacy SSO login builds its query by string concatenation.
- Hint 2: Try a quote in the email field and see how the query breaks.
- Hint 3: A classic always-true condition in the email field logs you in without a password.

### [Beginner] Brute force — no rate limiting or lockout
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Keep guessing one account’s password and watch whether anything slows you down.
- Hint 2: Ten wrong passwords in a row are still processed normally.
- Hint 3: There is no lockout, delay or CAPTCHA — automated guessing just works.

### [Beginner] User enumeration via login responses
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Compare the error for a real email with a wrong password vs an invented email.
- Hint 2: The two messages are different — one confirms the account exists.
- Hint 3: Any difference (text, timing, code) lets an attacker build a valid-email list.

### [Beginner] Weak default demo credentials
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Seeded demo accounts are a classic entry point.
- Hint 2: The demo account’s password is the same word as its purpose.
- Hint 3: Try demo@hexaagent.local with the most predictable password imaginable.

### [Intermediate] Predictable password-reset token
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Request a reset, then study how the token could be constructed.
- Hint 2: The token combines something public (the user id) with something guessable (the current hour).
- Hint 3: Compute rst-<id>-<current hour epoch> for the victim and reset their password.

### [Intermediate] Role cookie tampering (hx_role)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: After login, inspect the cookies the app sets.
- Hint 2: One cookie carries your role — and the server trusts it blindly.
- Hint 3: Set hx_role to the highest role and visit the admin area.

## Registration & Profile

### [Beginner] Weak password policy on registration
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Register a new account with the shortest password the form accepts.
- Hint 2: Even a single character is accepted.
- Hint 3: No length or complexity rule is enforced anywhere.

### [Intermediate] Mass assignment — role set at registration
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The registration handler binds every submitted field to the new user.
- Hint 2: Add a field the form never shows.
- Hint 3: Submitting role=admin with your registration creates an admin account.

### [Beginner] Stored XSS in display name
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Display names are rendered without escaping in user lists.
- Hint 2: Put a script payload in your name when registering or editing your profile.
- Hint 3: An admin viewing the user list executes your payload in their browser.

### [Intermediate] CSRF on profile update (no anti-CSRF marker)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The profile form carries a hidden hx_marker field — but the server never requires it.
- Hint 2: Submit the same POST from another origin without the marker.
- Hint 3: The change is applied anyway: any site can edit a logged-in user’s profile.

## Agents & Sharing

### [Beginner] Private agent exposed by IDOR (read)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Agents have sequential ids in their URLs.
- Hint 2: Open another user’s private agent id while logged in as someone else.
- Hint 3: No ownership check stands between you and their private agent page.

### [Intermediate] Agent instructions leaked via API
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The web page hides agent instructions from non-owners. The API is less careful.
- Hint 2: Fetch /api/agents/<id> for an agent you do not own.
- Hint 3: The JSON includes the full confidential instructions the UI hides.

### [Intermediate] Edit or delete another user’s agent (IDOR write)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Reading a stranger’s agent works — try changing it.
- Hint 2: POST the edit form for an agent id you do not own.
- Hint 3: The change saves, and even deletion succeeds, without any ownership check.

### [Intermediate] Predictable share-token enumeration
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Shared agents get links like /s/shr-2.
- Hint 2: The token is just the sequential agent id.
- Hint 3: Walk shr-1, shr-2, shr-3... and harvest every shared agent.

### [Beginner] Reflected XSS in agent search
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The search page echoes your query back into the results heading.
- Hint 2: Put an HTML/JS payload in the q parameter.
- Hint 3: It comes back unescaped and executes in the browser.

## Tools & Permissions

### [Intermediate] Tool permission escalation by non-owner
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Tools carry permission levels: read, write, high-risk.
- Hint 2: The level-change endpoint never checks that you own the agent.
- Hint 3: Raise someone else’s harmless read tool to high-risk.

### [Intermediate] Tool configuration tampering by non-owner
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: A fetch tool’s target URL lives in its configuration.
- Hint 2: POST a new config for a tool on someone else’s agent.
- Hint 3: The endpoint saves it without asking who you are to that agent.

### [Advanced] High-risk tool runs without admin approval
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: High-risk tools (like Send Email) need an admin approval flag before they may run.
- Hint 2: The run engine never checks that flag — it only displays it.
- Hint 3: Run Alice’s unapproved Send Email tool and watch it execute.

### [Intermediate] SSRF via simulated web-fetch tool (internal URL)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The Fetch Web Page tool fetches whatever URL the task names.
- Hint 2: Point it at the app itself: http://127.0.0.1:3044/...
- Hint 3: The run log returns internal-only content — the server fetched its own internals.

## Task Runs

### [Beginner] Another user’s run and log exposed (IDOR)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Run pages have sequential ids, just like agents.
- Hint 2: Open a run id owned by another user.
- Hint 3: Their full task and log — including tool output — are served to you.

### [Beginner] Run log accessible without authentication
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: There is a "raw log" endpoint for runs: /runs/<id>/log.
- Hint 2: Open it in a private window — no login at all.
- Hint 3: It returns the complete log JSON to anonymous visitors.

### [Intermediate] Direct prompt injection — system prompt disclosure
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The agent obeys instructions typed into the task box — including hostile ones.
- Hint 2: Tell the agent to ignore its instructions and print its system prompt.
- Hint 3: The run log dutifully includes the confidential instructions.

### [Advanced] Indirect prompt injection via knowledge-base document
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: One imported KB document was written by an outsider — read it closely.
- Hint 2: It hides an instruction addressed to the agent, not to you.
- Hint 3: Run a partner-integration task with the KB tool and watch the agent obey the document.

## Admin & Platform

### [Intermediate] State-changing admin action over GET (CSRF)
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: The admin panel deletes users through a plain link.
- Hint 2: A GET request changes state — no token, no confirmation POST.
- Hint 3: Any page an admin views can fire that link and delete a user.

### [Beginner] Unauthenticated /debug data exposure
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Developers love leaving a /debug route behind.
- Hint 2: This one needs no login at all.
- Hint 3: It dumps users, API keys and platform internals as JSON.

### [Intermediate] Predictable API key derived from email
- **Objective:** carry out the exploit so the app itself registers the success (progress flips on /tests).
- Hint 1: Alongside real random keys, the API quietly accepts a derived one.
- Hint 2: The formula uses only the account’s email, base64-encoded, with a fixed prefix.
- Hint 3: Build hx_ + base64(email) for any user and call /api/agents with it.
