# HexaNutrition (LAB 68) — Vulnerability Map

Complete map of every scored vulnerability test in this lab, grouped by feature.
Every flaw is a real, working weakness in the app and is detected server-side when the exploit succeeds (see the Mission Board at `/tests`).

**Total: 26 tests across 9 features.**

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** String-built SQL queries let an attacker rewrite the query logic and log in as anyone — here, the first account in the table (the admin).
- **Exploitation outline:** Use admin@hexanutrition.local' OR '1'='1 as the email with any password.
- **Impact:** On a real health platform this means instant takeover of staff accounts and every client record behind them — meal plans, weights, consultation notes.

### Brute Force — No Login Rate Limiting
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner
- **What it is:** Without throttling or lockout, credential stuffing and password guessing run at machine speed until one works.
- **Exploitation outline:** Script 10+ failed logins for bob@test.local and watch the test flip.
- **Impact:** Attackers can grind through common passwords against real client accounts — weight histories and health notes are deeply personal data.

### User Enumeration via Login & Forgot Password
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner
- **What it is:** Different error messages for "no such account" vs "wrong password" hand attackers a free list of valid accounts to target.
- **Exploitation outline:** Probe at least 5 different emails across login/forgot, mixing real and fake ones.
- **Impact:** For a health service, confirming that a person is a client is itself a privacy leak — and it feeds targeted phishing and brute force.

### Published Default Demo Credentials
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner
- **What it is:** Demo/default credentials left on a production login page are an open door — attackers try them first, every time.
- **Exploitation outline:** Log in with the published demo admin account.
- **Impact:** A real clinic platform shipping with admin/admin123-style creds would be breached within hours of launch.

### Predictable Password Reset Token
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Intermediate
- **What it is:** A reset token derived from the account id by a fixed formula is not a secret — anyone can compute it and reset any password.
- **Exploitation outline:** Compute the token for a victim account and POST /reset without ever requesting a link.
- **Impact:** Full account takeover of any client or staff member, including their health data and billing, with no email access needed.

### Role Cookie Tampering
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Authorization data stored client-side is attacker-controlled. Roles must be read from the server-side account record on every request.
- **Exploitation outline:** Set hx_role=admin in your browser and visit /admin.
- **Impact:** Any client becomes an admin by editing a cookie — full control of the platform, its users and its health records.

## Registration & Profile

### Weak Password Policy
- **OWASP:** A07:2021 Authentication Failures · **Difficulty:** Beginner
- **What it is:** A password policy that accepts one character guarantees weak accounts across the whole user base.
- **Exploitation outline:** Register with password "a" — if the account is created, the policy is the flaw.
- **Impact:** Trivially guessable client passwords expose personal health journeys and enable account resale/takeover.

### Mass Assignment — Role & Plan at Registration
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Binding request bodies straight to account records lets users grant themselves staff roles and paid plans.
- **Exploitation outline:** Add role=nutritionist (or plan=premium) to the registration POST.
- **Impact:** Attackers self-register as nutritionists — trusted staff who can read every client plan — or take premium for free.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** User-supplied names stored and rendered unescaped execute JavaScript in other users’ browsers — including staff.
- **Exploitation outline:** Use a name like <script>alert(1)</script> or <img src=x onerror=alert(1)>.
- **Impact:** A malicious client name can hijack a nutritionist or admin session when they open the caseload list, pivoting to all client data.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** State-changing forms without anti-CSRF tokens can be triggered from any website the victim visits while logged in.
- **Exploitation outline:** POST /profile with a new name and no hx_marker field, straight from curl.
- **Impact:** An attacker page could silently rename accounts or change details on a health platform the victim trusts.

## Meal Plans

### Read Another Client's Meal Plan (IDOR)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Sequential ids plus a missing ownership check expose every record in the system one URL at a time.
- **Exploitation outline:** As Bob, open /plans/1 — Alice’s plan, allergy notes included.
- **Impact:** Meal plans contain allergy and health-condition notes — leaking them is a serious medical-privacy breach for real clients.

### Client Edits Own Plan via Nutritionist Endpoint
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Hiding a staff URL is not authorization. Every endpoint must verify the role itself, not rely on the UI.
- **Exploitation outline:** As a client, POST new calories/notes to the nutritionist update endpoint for your own plan.
- **Impact:** Clients could rewrite their own prescribed plans — dangerous where calories and allergens are clinically set.

### Edit Another Client's Meal Plan
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Missing role checks AND missing ownership checks compound: a low-privilege user can modify anyone’s clinical data.
- **Exploitation outline:** As Bob, POST an update to plan 1 (Alice’s plan) and change her calories.
- **Impact:** Tampering with another client’s meal plan — e.g. removing an allergy warning — can cause real physical harm, not just data loss.

## Consultations

### Consultation Booked Without Payment (Price Tampering)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **What it is:** Prices and payment status must come from server-side records, never from fields the client submits.
- **Exploitation outline:** Book Nina ($60) with price=0 and see the booking confirmed as paid.
- **Impact:** Every consultation can be booked free — direct revenue loss for practitioners on a real platform.

### View Another Client's Consultation (IDOR)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Read endpoints need the same ownership checks as write endpoints.
- **Exploitation outline:** As Bob, open /consultations/1 to see Alice’s session with Nina.
- **Impact:** Consultation details reveal who is seeing which specialist and when — sensitive health-adjacent metadata.

### Cancel Another Client's Consultation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Destructive actions need ownership checks most of all; "logged in" is not "authorised".
- **Exploitation outline:** As Bob, POST /consultations/1/cancel.
- **Impact:** Malicious users can sabotage other clients’ care by cancelling their appointments — a denial-of-service against patients.

## Food Logs & Check-ins

### Read Another Client's Food Log History (IDOR)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Per-user collections keyed by a guessable id must be scoped to the requester.
- **Exploitation outline:** As Bob, open /foodlog/4 — Alice’s complete food history.
- **Impact:** Food diaries expose eating habits, religious observance, disorders and routines — intimate data that must never cross accounts.

### Forged Check-in for Another Client
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** Identity fields in request bodies must be ignored — the session is the only trustworthy source of "who".
- **Exploitation outline:** POST /checkins with userId=4 and a fake weight while logged in as Bob.
- **Impact:** Forged weigh-ins corrupt a client’s progress record and the nutritionist’s clinical decisions based on it.

## Recipes

### Premium Recipe Served Without a Subscription
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Paywalls must be enforced where the content is served, not just drawn in the UI.
- **Exploitation outline:** As Bob (free), open /recipes/2 and read the full premium protocol.
- **Impact:** The entire premium recipe library — the product being sold — is free to anyone with an account.

### Premium Recipe Content Leaked via API
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **What it is:** APIs must apply the same entitlement rules as pages, and serialise only the fields the caller may see.
- **Exploitation outline:** As a free user, GET /api/recipes/4 and read the premium body.
- **Impact:** Scrapers can harvest the full premium catalogue through the API even if the website paywall is later fixed.

## Subscriptions & Billing

### Subscription Price Tampering
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **What it is:** Payment amounts must be computed from server-side price lists; a posted amount is a claim, not a fact.
- **Exploitation outline:** POST /subscribe with plan=premium and amount=0.
- **Impact:** Premium subscriptions for $0 — the core revenue of the business — with a one-line request.

### Single-Use Coupon Reuse
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **What it is:** Coupon rules must be enforced at redemption time against the redemption ledger, atomically.
- **Exploitation outline:** Subscribe with FIRSTFREE twice and collect two free months.
- **Impact:** Unlimited free months from one leaked code — a slow, quiet revenue bleed that finance may never notice.

## Search

### SQL Injection in Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** Every string-built query is an injection point — search boxes are the most tested input on any site.
- **Exploitation outline:** Search for ' OR '1'='1 and watch private results pour in.
- **Impact:** Here it dumps the client directory (names and emails of everyone getting nutrition coaching) — a reportable data breach.

### Reflected XSS in Search
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **What it is:** Reflected input must be output-encoded; an echo is an injection if it is not.
- **Exploitation outline:** Search for <script>alert(1)</script> and inspect the page source.
- **Impact:** A crafted search link sent to a nutritionist executes script in their session — a stepping stone to staff account takeover.

## Admin & Platform

### Caseload Export Open to Any Logged-In User
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **What it is:** Sensitive staff endpoints need explicit role checks; being hidden behind /admin/ in the URL is not protection.
- **Exploitation outline:** As any client, open /admin/clients and download the whole client list.
- **Impact:** Every client’s name, email, plan and coach leaks to any registered user — the exact dataset health-privacy law protects most.

### Debug Endpoint Exposes All Accounts & Passwords
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **What it is:** Debug endpoints ship with the code and are found within minutes by scanners — they must never reach production.
- **Exploitation outline:** GET /api/debug and read every account, plaintext passwords included.
- **Impact:** Complete credential dump of a health platform: every client and staff password, reusable on other services.
