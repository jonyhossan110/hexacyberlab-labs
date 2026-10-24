# HexaCloud — Practice Guide (LAB 23)

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective. The in-app /tests page mirrors this guide. The Lab Coach chatbot unlocks step-by-step help for a feature after you have genuinely tried that feature at least 3 times.

## Login & Authentication

### [Beginner] SQL Injection — Login Bypass (A03:2021 Injection)
- **Objective:** Make the "SQL Injection — Login Bypass" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The login form builds its database query by gluing your input straight into the query string.
- **Hint 2:** Try a classic tautology in the email field — something that makes the WHERE clause always true.
- **Hint 3:** Use email: ' OR '1'='1' -- with any password. The query matches the first user row and lets you in as them.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.

### [Beginner] No Rate Limiting — Brute-Force Login (A07:2021 Authentication Failures)
- **Objective:** Make the "No Rate Limiting — Brute-Force Login" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Notice what does NOT happen after many wrong passwords for one account.
- **Hint 2:** There is no lockout, no CAPTCHA and no slow-down — the 10th failure is processed like the 1st.
- **Hint 3:** Script 10+ wrong-password logins for dev@acme.cloud; the attempt that is still calmly processed proves the missing throttle.
- **Lesson:** Without throttling, lockout or MFA, password guessing is only a matter of time and a wordlist.

### [Beginner] User Enumeration via Login & Reset Responses (A07:2021 Authentication Failures)
- **Objective:** Make the "User Enumeration via Login & Reset Responses" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Compare the error for an email that exists with one that does not — on login AND on forgot-password.
- **Hint 2:** One says the password is wrong; the other says no such account exists. That difference is a free user list.
- **Hint 3:** Submit a login for root@globex.cloud with a wrong password, then one for nobody@nowhere.cloud; when both response types have been observed, enumeration is proven.
- **Lesson:** Different errors for "no such user" vs "wrong password" hand attackers a verified target list for phishing and password spraying.

### [Beginner] Weak / Default Demo Credentials (A07:2021 Authentication Failures)
- **Objective:** Make the "Weak / Default Demo Credentials" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The README lists the seeded accounts — one of them is a leftover demo account with a guessable password.
- **Hint 2:** Demo accounts shipped to production are a classic way in.
- **Hint 3:** Log in as demo@acme.cloud with password demo123.
- **Lesson:** Demo and default accounts with vendor passwords are the first thing attackers try on any new console.

### [Intermediate] Predictable Password-Reset Token (A07:2021 Authentication Failures)
- **Objective:** Make the "Predictable Password-Reset Token" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Request a password reset and study the token format — it is built only from things an attacker can know.
- **Hint 2:** The token contains the user id and a small number derived from the email address itself.
- **Hint 3:** Token = rst_<userId>_<sum of the email’s character codes × 31 mod 100000>. Compute it for admin@acme.cloud (id 1) and POST /reset WITHOUT requesting one first.
- **Lesson:** Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover shortcut.

### [Intermediate] Client-Side Role Cookie Trusted for Authorization (A01:2021 Broken Access Control)
- **Objective:** Make the "Client-Side Role Cookie Trusted for Authorization" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** After login, inspect the cookies the app sets — one of them carries your role, stored in your own browser.
- **Hint 2:** The server reads your role from that cookie instead of its own database. Cookies are yours to edit.
- **Hint 3:** Log in as viewer@acme.cloud, change the hx_role cookie value to owner, then visit /admin.
- **Lesson:** Authorization data must live server-side; anything stored on the client can be rewritten by the client.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration (A07:2021 Authentication Failures)
- **Objective:** Make the "Weak Password Policy at Registration" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** How short a password will the sign-up form accept?
- **Hint 2:** There is no minimum length or complexity check at all.
- **Hint 3:** Register a new account with a 1–3 character password; its acceptance proves the missing policy.
- **Lesson:** If the app accepts tiny passwords, users will pick them — and brute force becomes trivial.

### [Beginner] Stored XSS in Display Name (A03:2021 Injection)
- **Objective:** Make the "Stored XSS in Display Name" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Your display name is shown in the page header and on the admin user list — rendered exactly as typed.
- **Hint 2:** Nothing encodes it on the way out.
- **Hint 3:** Set your profile display name to <script>alert(1)</script> (or an <svg onload> payload) and save; it is stored and served raw.
- **Lesson:** Any user-controlled text rendered without output encoding is a stored XSS waiting for a victim.

### [Intermediate] Mass Assignment — Role & Tenant Injection at Registration (A04:2021 Insecure Design)
- **Objective:** Make the "Mass Assignment — Role & Tenant Injection at Registration" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The registration handler saves the whole submitted object onto the new user record.
- **Hint 2:** Extra form fields you add yourself are honoured — including ones the form never shows.
- **Hint 3:** POST /register with extra fields role=owner and tenantId=2; your new account is created as an owner inside the other tenant.
- **Lesson:** Bind only whitelisted fields on sign-up and profile updates; never copy a request body onto a privileged record.

### [Intermediate] CSRF on Profile Update (A01:2021 Broken Access Control)
- **Objective:** Make the "CSRF on Profile Update" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Profile updates change state with a plain POST — look for an anti-CSRF token in the form. There is none.
- **Hint 2:** The app sets an hx_seen marker cookie on its own pages; foreign posts lack the app’s own origin.
- **Hint 3:** While logged in, POST /profile from a foreign Origin (e.g. Origin: https://evil.example) with a new display name; the change is accepted.
- **Lesson:** State-changing requests need an unguessable token (or strict SameSite cookies) so other sites cannot ride a victim’s session.

## Resources

### [Beginner] Cross-Tenant Resource IDOR (A01:2021 Broken Access Control)
- **Objective:** Make the "Cross-Tenant Resource IDOR" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Resource pages use plain sequential ids in the URL: /resources/101, 102, 103…
- **Hint 2:** The detail page checks that you are logged in — but never that the resource belongs to YOUR tenant.
- **Hint 3:** Log in on the Acme tenant and open /resources/104 — a Globex server — by guessing its id.
- **Lesson:** Every object fetch must verify the object belongs to the caller’s tenant, not just that the caller is logged in.

### [Intermediate] Unauthorized Resource Actions (Stop / Terminate / Resize) (A01:2021 Broken Access Control)
- **Objective:** Make the "Unauthorized Resource Actions (Stop / Terminate / Resize)" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The action buttons POST to /resources/<id>/action — the server never re-checks ownership or role.
- **Hint 2:** Even a read-only viewer can send the same POST by hand.
- **Hint 3:** As viewer@acme.cloud, POST action=terminate (or a resize with an absurd size) for a Globex resource id such as 104.
- **Lesson:** Destructive and billable actions need the same ownership + role checks as the screens that display them — on the server.

## Storage Buckets

### [Intermediate] Private Bucket Made Public Without Authorization (A01:2021 Broken Access Control)
- **Objective:** Make the "Private Bucket Made Public Without Authorization" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Bucket settings include a visibility toggle: POST /buckets/<id>/visibility.
- **Hint 2:** The toggle performs no ownership or role check — and /public/bucket/<id> then serves the files to anyone, logged in or not.
- **Hint 3:** As any Acme user, set bucket 203 (Globex) to public — or make your own tenant’s private bucket public — then open /public/bucket/203 in a logged-out request.
- **Lesson:** Storage exposure settings are security-critical: changing them needs ownership, a privileged role and ideally a confirmation step.

### [Intermediate] Path Traversal in Bucket File Download (A01:2021 Broken Access Control)
- **Objective:** Make the "Path Traversal in Bucket File Download" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** File downloads are served from /buckets/<id>/files/<name> — the name goes straight into a path.
- **Hint 2:** Dot-dot sequences are never stripped.
- **Hint 3:** Request /buckets/201/files/..%2fserver-config (or ../ sequences) and the app happily reads outside the bucket.
- **Lesson:** Never let user input become a filesystem path without canonicalisation and an allow-list check.

## IAM & Policies

### [Beginner] Cross-Tenant IAM Policy Disclosure (IDOR) (A01:2021 Broken Access Control)
- **Objective:** Make the "Cross-Tenant IAM Policy Disclosure (IDOR)" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Policy documents live at /iam/policies/<id> with sequential ids.
- **Hint 2:** Like the resource pages, the tenant check is missing here too.
- **Hint 3:** While on the Acme tenant, open /iam/policies/403 — Globex’s admin policy.
- **Lesson:** Access-control checks must be applied to every object type — policies describe exactly who can do what, so leaking them maps the attack surface.

### [Intermediate] IAM Privilege Escalation — Unrestricted Role Assignment (A01:2021 Broken Access Control)
- **Objective:** Make the "IAM Privilege Escalation — Unrestricted Role Assignment" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The IAM console posts role changes to /iam/role — look at what the server verifies before applying them. Nothing.
- **Hint 2:** Any signed-in user can name any user id and any role.
- **Hint 3:** As viewer@acme.cloud, POST /iam/role with userId=3 (yourself) and role=owner — then check your new powers.
- **Lesson:** Privilege changes are the crown jewels of an IAM system; they need caller authorization checks above all else.

## Billing & Plans

### [Beginner] Plan Change Without Payment Verification (A04:2021 Insecure Design)
- **Objective:** Make the "Plan Change Without Payment Verification" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** POST /billing/plan switches the tenant plan instantly.
- **Hint 2:** No checkout, no payment method check, no approval step stands in the way.
- **Hint 3:** From the Acme tenant (Pro plan) POST /billing/plan with plan=Enterprise; the upgrade applies immediately, free.
- **Lesson:** Plan/entitlement changes must be bound to a verified payment event, not to a bare request parameter.

### [Beginner] Cross-Tenant Invoice Access (IDOR) (A01:2021 Broken Access Control)
- **Objective:** Make the "Cross-Tenant Invoice Access (IDOR)" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Invoices are addressed by tenant id: /billing/invoice/<tenantId>.
- **Hint 2:** Any logged-in user can type another tenant’s id.
- **Hint 3:** As an Acme user, open /billing/invoice/2 to read Globex’s invoice.
- **Lesson:** Financial documents need the same per-object tenant check as any other record.

### [Intermediate] Billing Credit Manipulation (A04:2021 Insecure Design)
- **Objective:** Make the "Billing Credit Manipulation" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The billing page accepts promo/credit posts at /billing/credit — the amount is taken from the request.
- **Hint 2:** The server never validates the amount’s size or sign.
- **Hint 3:** POST /billing/credit with amount=5000 (or a negative amount) and watch the tenant balance obey.
- **Lesson:** Money values must be computed and validated server-side; client-supplied amounts are wishes, not facts.

## Search & Discovery

### [Beginner] Reflected XSS in Search (A03:2021 Injection)
- **Objective:** Make the "Reflected XSS in Search" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The results page echoes "Results for: <your query>" — unencoded.
- **Hint 2:** Markup you type comes straight back in the page.
- **Hint 3:** Search for <script>alert(1)</script> and view the page source: your payload is reflected raw.
- **Lesson:** Echoing user input into HTML without encoding turns a search box into a script-delivery tool.

### [Intermediate] SQL Injection in Resource Search (A03:2021 Injection)
- **Objective:** Make the "SQL Injection in Resource Search" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The global search also builds its query by string concatenation.
- **Hint 2:** A tautology in the search box removes the tenant filter from the WHERE clause.
- **Hint 3:** Search for: ' OR '1'='1 — results suddenly include the other tenant’s resources.
- **Lesson:** Search boxes are injection surfaces too; every query needs parameterisation, not just login forms.

## API & Integrations

### [Intermediate] API Broken Object-Level Authorization (BOLA) (A01:2021 / API1:2023 BOLA)
- **Objective:** Make the "API Broken Object-Level Authorization (BOLA)" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The JSON API serves /api/resources/<id> to any valid API key.
- **Hint 2:** It authenticates the key — then forgets to check the object’s tenant.
- **Hint 3:** Call GET /api/resources/104 with YOUR Acme API key; Globex’s server comes back as JSON.
- **Lesson:** APIs must authorise per object, not just per caller; a valid key is not a licence to every record.

### [Advanced] Predictable API Key Derivation (A07:2021 / API2:2023 Broken Authentication)
- **Objective:** Make the "Predictable API Key Derivation" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Besides the issued live keys, the API quietly accepts a second, undocumented key format.
- **Hint 2:** The fallback keys are derived from something public: the account’s email address.
- **Hint 3:** The fallback key is 'hx_' + base64(email). Compute it for root@globex.cloud and call /api/resources with NO session — you are answered as Globex.
- **Lesson:** Credentials must be random; a key derived from an email address is public information wearing a costume.

## Platform & Admin

### [Beginner] Sensitive Data Exposure via /debug (A05:2021 Security Misconfiguration)
- **Objective:** Make the "Sensitive Data Exposure via /debug" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Development consoles often leave a diagnostics page behind. This one did.
- **Hint 2:** It dumps configuration for ALL tenants, including API keys.
- **Hint 3:** While logged in, open /debug and read the other tenant’s API keys and internal settings.
- **Lesson:** Debug and diagnostics endpoints must never ship to production — or must sit behind strict admin auth.

### [Intermediate] CSRF on Admin User-Disable Action (A01:2021 Broken Access Control)
- **Objective:** Make the "CSRF on Admin User-Disable Action" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** Admins can disable users with POST /admin/users/<id>/disable — again, no anti-CSRF token anywhere.
- **Hint 2:** A foreign Origin on that POST is accepted just the same.
- **Hint 3:** While holding an admin-capable session, POST the disable action with Origin: https://evil.example; the user is disabled anyway.
- **Lesson:** Privileged state changes are the most important requests to protect with CSRF tokens.

### [Advanced] SSRF to the Simulated Instance Metadata Service (A10:2021 SSRF)
- **Objective:** Make the "SSRF to the Simulated Instance Metadata Service" test flip to done on /tests by performing the real exploit against the running app.
- **Hint 1:** The console has a "metadata lookup" tool that fetches a URL you give it, server-side.
- **Hint 2:** Cloud metadata endpoints (169.254.169.254) hand out temporary credentials to anything that can ask.
- **Hint 3:** Ask the tool for http://169.254.169.254/latest/meta-data/iam-credentials and read the simulated credentials it returns.
- **Lesson:** Any server-side fetcher must allow-list destinations and block link-local/metadata ranges; IMDS needs hop limits and tokens (IMDSv2).
