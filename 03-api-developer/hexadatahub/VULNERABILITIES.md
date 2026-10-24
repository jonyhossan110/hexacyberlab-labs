# HexaDataHub — Vulnerability Map (LAB 28)

The complete map of this lab: **26 scored tests across 9 features**. Every entry is a real, working flaw in the application, detected server-side when the exploit actually succeeds. Progress is measured against this full list.

## Login & Authentication (6)

### SQL Injection — Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Open the login form. 2) In Email enter: ' OR '1'='1' --  3) Enter any password and submit. The query's email condition becomes true for the first user row and the password check is commented out, so you are logged in without knowing any password.
- **Impact:** On a client platform this is a full account takeover of the first matching account — often an admin — with nothing but a text field.

### Brute Force — No Rate Limit or Lockout
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Pick a real account, e.g. alice@acme.test. 2) Submit the login form with a wrong password. 3) Repeat at least 10 times. Every failure is accepted for processing — no lockout, no delay, no CAPTCHA.
- **Impact:** Attackers can grind through common-password lists against real customer accounts; the client discovers it only after accounts are taken over.

### User Enumeration via Error Messages
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in with a fake email (nobody@nowhere.test) and read the error. 2) Log in with alice@acme.test and a wrong password and read the different error. 3) Do the same pair on the forgot-password form. The differing answers reveal which emails have accounts.
- **Impact:** Attackers harvest valid customer email addresses, then aim phishing and password-spraying only at accounts that definitely exist.

### Default Demo Credentials Still Active
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Read the hint box on the login page. 2) Log in with the printed demo credentials (demo@datahub.io / demo1234). 3) You are inside a real account with workspace access — credentials that were never changed.
- **Impact:** Anyone on the internet can walk into a live account; if that account has data access, the client has a breach on day one.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Note that the reset link's token is the account email in base64. 2) Take a victim email, e.g. alice@acme.test, and base64-encode it. 3) Open /reset?token=<encoded value>. 4) Set a new password — you never needed the email inbox.
- **Impact:** Full takeover of any account — including admins — knowing only the victim’s email address, which is usually public.

### Session Cookie Tampering — Role Forgery
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in as any normal user. 2) Copy the hx_session cookie and base64-decode it — it is plain JSON with a role field. 3) Change role to "admin", re-encode, and replace the cookie. 4) Open /admin — the server believes your forged role.
- **Impact:** Any customer can become a platform administrator — user lists, passwords and destructive actions included — by editing one cookie.

## Registration & Profile (4)

### Weak Password Policy at Registration
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Open the registration form. 2) Create an account with the password "a" (one character). 3) The account is created and works — no policy stopped you.
- **Impact:** Customer accounts fall to the simplest guessing attacks; the client carries the breach-notification and trust cost.

### Mass Assignment — Self-Made Admin
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Intercept or craft the registration request (curl works). 2) Add the extra form field role=admin to the normal name/email/password fields. 3) Submit. 4) Log in — the new account has the admin role and can open /admin.
- **Impact:** Attackers mint their own admin accounts on a client platform: total compromise without touching the login form.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Go to your Profile. 2) Set the display name to a script payload such as <script>alert(document.domain)</script>. 3) Save and open the Team page. 4) Your payload was stored in the account record and is rendered raw to every viewer.
- **Impact:** Attackers can hijack sessions and actions of staff who merely open a team or admin page on the client’s platform.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log in. 2) Send the profile-update POST from outside the app — e.g. curl with header Origin: https://evil.example and a new email/name. 3) The server applies the change: no token was required and the foreign origin was ignored.
- **Impact:** Attackers change a customer’s email, then use password reset to take the account over completely.

## Workspaces & Members (2)

### Cross-Workspace IDOR — Rival Workspace Settings
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as a member of workspace 1 and open your workspace page — note the ID in the URL. 2) Change the ID to 2. 3) The other company’s workspace settings and member list load, although you are not a member.
- **Impact:** In multi-tenant SaaS, one IDOR exposes every customer’s workspace — names, members, plans — to every other customer.

### Invite Link Abuse — Sequential Tokens, No Email Binding
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Look at an invite link on a workspace page — the token pattern is inv-<number>. 2) Log in as a user who was never invited to workspace 2. 3) Open /invite/inv-1. 4) You are now a member of workspace 2 — the invite was addressed to a different email and still worked.
- **Impact:** Outsiders enumerate invite links and quietly join client workspaces, reading every dataset inside them.

## Datasets (3)

### Cross-Workspace Dataset IDOR
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as a workspace 1 user. 2) Open /datasets/1 (yours) and note the URL pattern. 3) Change the ID to 3 — a dataset owned by workspace 2. 4) The full dataset, including sensitive rows, is displayed.
- **Impact:** Tenant data isolation fails: one customer reads another customer’s entire datasets, row by row — a reportable data breach.

### Dataset Rename by Non-Member
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Open the other workspace’s dataset (/datasets/3) as an outsider. 2) Use the rename form on that page with any new name. 3) Submit — the dataset now carries your name. The endpoint never checked that you belong to its workspace.
- **Impact:** Attackers alter or deface other customers’ datasets, destroying trust and data integrity on the platform.

### Dataset Deletion by Outsider
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Note a dataset owned by the other workspace (ID 4). 2) While logged in as a workspace 1 user, send its delete POST (the button on its page works, even for outsiders). 3) The dataset is gone — deletion never verified ownership.
- **Impact:** A rival or malicious user wipes other customers’ datasets: data loss, downtime and contractual fallout for the client.

## Imports (3)

### CSV Formula Injection via Import
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Prepare a small CSV whose second column starts with a formula character, e.g. =2+5+cmd|’ /C calc’!A0. 2) Import it via the Imports page into your workspace. 3) View or export the dataset — the formula cell is stored and served verbatim, ready to fire in a spreadsheet.
- **Impact:** A client’s staff open a routine export and the embedded formula executes commands or exfiltrates data from their workstations.

### Import Path Traversal — Reading Server Files
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Open the Imports page. 2) In "server path" enter ../server.js and import. 3) A dataset appears whose rows are the lines of the application source code — the path escaped the uploads folder.
- **Impact:** Attackers read source code, configuration and secrets from the client’s server — the first step to a full compromise.

### XML External Entity (XXE) in Dataset Import
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Advanced
- **Where / how:** Step by step: 1) Craft an XML dataset with a DOCTYPE declaring an external entity pointing at file:///etc/passwd (or file://../server.js style paths the parser accepts). 2) Put &xxe; as a cell value. 3) Import it and open the dataset — the referenced file’s contents are inside the rows.
- **Impact:** Attackers upload a "dataset" and walk away with server configuration, credentials files and source code.

## Exports & API (3)

### Cross-Workspace Dataset Export
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log in as a workspace 1 user. 2) Open /datasets/3/export — dataset 3 belongs to workspace 2. 3) A CSV with every row of the rival tenant’s dataset downloads.
- **Impact:** Full exfiltration of another tenant’s data in a single click — exactly what breach notifications are made of.

### Predictable API Key — Derived from Email
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Open the API page and note your key’s format: dh_ followed by your base64-encoded email. 2) Take another user’s email (carol@globex.test) and build the same string. 3) Call /api/datasets with header x-api-key set to it, with no session cookie. 4) The API answers as that user.
- **Impact:** Anyone who knows a customer’s email — public information — gets full API access to their account and data.

### API Broken Object-Level Authorisation — Workspace Parameter
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Use your own valid API key (workspace 1). 2) Call /api/datasets?workspace=2. 3) The response contains workspace 2’s datasets although your key has no rights there — the parameter was trusted blindly.
- **Impact:** Any API customer can pull every other tenant’s datasets by changing one number — silent, scriptable mass exfiltration.

## Sharing (2)

### Guessable Public Share Links
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Log out or open a private window. 2) Visit /s/share-3. 3) The full dataset is shown with no login and no real share token — the legacy pattern share-<id> works for every dataset ID.
- **Impact:** Every dataset on the platform — shared or not — is readable by anyone on the internet who can count.

### Share-Link Enumeration — No Rate Limit
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Pick any 5 different token values, existing or not. 2) Request /s/<token> for each within a minute. 3) Every request is answered immediately — hit vs miss is distinguishable and nothing limits the probing.
- **Impact:** Attackers script the share endpoint to map and harvest every publicly reachable dataset on the platform.

## Search (1)

### Reflected XSS in Dataset Search
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Open the Datasets page search. 2) Search for <script>alert(document.domain)</script>. 3) The results page includes your payload verbatim in the HTML — it executes in the browser.
- **Impact:** Attackers send crafted search links to staff; one click runs script in the victim’s session on the client’s domain.

## Admin & Platform (2)

### CSRF on Admin User Deletion
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Where / how:** Step by step: 1) Have an admin session (real admin, or the forged-cookie one). 2) Send the /admin/users/<id>/delete POST with a foreign Origin header (or none of the app’s markers) via curl. 3) The user is deleted — the request’s origin was never verified.
- **Impact:** An attacker lures one admin to a booby-trapped page and deletes users — sabotage with the admin’s own authority.

### Debug Endpoint Exposes All Users and Passwords
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Where / how:** Step by step: 1) Log out completely. 2) Open /api/debug. 3) The JSON response lists every user including plaintext passwords, plus workspaces and datasets — no authentication was requested.
- **Impact:** One unauthenticated URL hands attackers every customer’s credentials — instant platform-wide compromise.
