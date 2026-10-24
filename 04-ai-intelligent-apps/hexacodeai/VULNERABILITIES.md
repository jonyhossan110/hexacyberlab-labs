# HexaCodeAI — Vulnerability Map (25 scored tests)

Every entry below is a real, working flaw in this app. A test passes only when the exploit’s real effect happens server-side.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Impact:** On a real client site this is a full account takeover of the first matching account — often the admin — from the public login page.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the database can be talked into skipping the check.

### No Brute-Force Protection on Login
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Impact:** Weak or reused passwords fall quickly; a client learns about it only after the account is already taken over.
- **Lesson:** Without throttling, an attacker can try thousands of passwords against one account until one works.

### Account Enumeration via Forgot Password
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Impact:** Attackers confirm which customer emails are registered, then aim phishing and password attacks only at real accounts.
- **Lesson:** Different responses for existing vs non-existing accounts hand attackers a verified target list.

### Default Demo Credentials Still Active
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Impact:** Anyone can walk into a working account with guessed credentials; from there they pivot to real data.
- **Lesson:** Default and demo accounts are public knowledge — leaving one active is leaving a spare key under the mat.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **Impact:** Full account takeover of any user — including admins — with no access to their inbox.
- **Lesson:** A reset token is a temporary password: if it can be predicted from public values, anyone can reset anyone’s account.

### Role Stored in a Client Cookie (Tampering)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Any ordinary user can promote themselves to admin in seconds and reach every admin-only function.
- **Lesson:** Authorization data kept on the client is decoration, not security — the user can rewrite it at will.

## Registration & Profile

### No Minimum Password Strength
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Impact:** Customer accounts fall to trivial guessing and credential stuffing, and the client carries the blame.
- **Lesson:** If the app accepts any password, users will choose guessable ones — policy is the first line of defence.

### Mass Assignment — Role & Plan From the Form
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Attackers self-register as admins or upgrade to paid plans for free; the client loses both control and revenue.
- **Lesson:** Binding request data straight onto a model lets attackers set fields — role, plan, balance — that were never offered to them.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Impact:** Attackers run JavaScript in teammates’ and admins’ browsers — session theft and actions performed as the victim.
- **Lesson:** Any field rendered without encoding becomes a delivery vehicle: one malicious profile attacks every viewer.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Attackers silently change a victim’s profile — and in real apps, their email or password — using the victim’s own session.
- **Lesson:** State-changing requests without CSRF tokens can be triggered by any website the victim visits while logged in.

## Repositories

### Private Repository IDOR
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Impact:** A client’s proprietary source code — and any secrets sitting in it — is readable by any registered user who guesses an ID.
- **Lesson:** Checking "is logged in" is not checking "is allowed": every object access needs an ownership check.

### Delete Another User’s Repository
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Competitors or disgruntled users can wipe a client’s projects — data loss and downtime with no technical skill required.
- **Lesson:** Destructive actions need the strictest authorization checks; a missing one turns any user into a vandal.

### API Returns Private Repos (BOLA)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Bulk, scripted theft of a client’s entire private codebase through a documented-looking endpoint.
- **Lesson:** APIs need the same per-object authorization as pages; attackers script the API long before they click through the UI.

## Search & Snippets

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Impact:** A crafted search link executes code in a logged-in user’s browser — phishing-grade attacks against staff and customers.
- **Lesson:** Echoing input without encoding turns a harmless search box into a script-delivery link an attacker can send to victims.

### Search Leaks Private Code of Other Users
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Private source code and embedded secrets leak to every user through a feature that looks harmless in a demo.
- **Lesson:** Search is an access path like any other: if the index ignores visibility, search becomes a skeleton key.

### Private Snippet IDOR
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Impact:** Developers’ private snippets — often full of credentials and internal endpoints — are readable by anyone with an account.
- **Lesson:** Small, guessable IDs plus no ownership check means "private" is only a label.

### Guessable Snippet Share Links
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Anyone can enumerate share links and harvest every "private" snippet in the system, no login required beyond the lab gate.
- **Lesson:** A share link is a capability: if it is predictable and ignores the item’s privacy, sharing protection does not exist.

## Patches & Approvals

### Patch From a Private Repo Leaks to Outsiders
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Impact:** Unreleased code and security fixes leak before deployment — attackers learn exactly what was vulnerable.
- **Lesson:** Derived objects (patches, previews, exports) inherit the sensitivity of their parent object and need the same checks.

### Patch Approval Bypass — Author Approves Own Patch
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** A malicious or careless change sails through "review" — the client believes code was vetted when nobody vetted it.
- **Lesson:** Workflow rules (who may approve) are security controls; if the endpoint ignores them, the review process is fiction.

### Prompt Injection via Code Comment Approves the Patch
- **OWASP:** A03:2021 Injection (LLM) · **Difficulty:** Advanced
- **Impact:** Attackers smuggle approvals past AI review gates — the client’s "AI-checked" code was checked by the attacker’s comment.
- **Lesson:** An AI reviewer that follows instructions found inside the content it reviews can be talked into approving anything.

## Workspaces & Teams

### Workspace Cross-Access (Non-Member)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Impact:** One customer reads another customer’s projects and team details — a multi-tenancy breach that destroys trust in a SaaS.
- **Lesson:** Tenant boundaries must be enforced on every request, not implied by navigation.

### Member Promotes Self to Workspace Owner
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Impact:** Any invited member can seize the workspace — remove the real owner, take the billing and the code with it.
- **Lesson:** Role-management endpoints are privilege-escalation endpoints: they must check the CALLER’s authority, not just the target.

## Usage & Quotas

### Quota / Plan Tampering in Generation Request
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Impact:** Free users consume unlimited paid AI generation — direct revenue loss that scales with every abuser.
- **Lesson:** Billing state must be computed server-side from the account record; any plan/credit value arriving from the client is a forgery waiting to happen.

## Platform & API

### Predictable API Token (Derived From Email)
- **OWASP:** A02:2021 Cryptographic Failures · **Difficulty:** Intermediate
- **Impact:** Full API access to any account from nothing but the victim’s email address — silent, scriptable, total.
- **Lesson:** A token derived from public data is not a credential — it is a lookup key anyone can compute.

### Debug Endpoint Dumps All Users & Passwords
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Impact:** One request hands an attacker every credential in the system — the incident is over before it is noticed.
- **Lesson:** Debug/diagnostic endpoints are production’s forgotten doors: if they ship, they must be treated as admin surfaces.
