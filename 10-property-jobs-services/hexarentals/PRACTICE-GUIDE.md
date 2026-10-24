# HexaRentals — Practice Guide (LAB 92)

Challenges grouped by feature, then difficulty. Each challenge has one measurable objective: make its test flip to done on the Mission Board (/tests) by performing the real exploit. Three graded hints per challenge.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: flip the "SQL Injection Login Bypass" test to done on /tests by exploiting POST /login.
- Hint 1: The login form builds its database query by gluing your input straight into the SQL string.
- Hint 2: Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.
- Hint 3: Use admin@hexarentals.local' OR '1'='1' -- as the email and any password — the query comments out the password check.

### Brute Force — No Rate Limiting or Lockout (Beginner)
- Objective: flip the "Brute Force — No Rate Limiting or Lockout" test to done on /tests by exploiting POST /login.
- Hint 1: Nothing slows you down here — no CAPTCHA, no lockout, no delay.
- Hint 2: Write down one real account email and just keep guessing passwords.
- Hint 3: Send 10+ wrong passwords for alice@test.local in a row; the 10th is still processed normally.

### User Enumeration via Login & Forgot-Password Responses (Beginner)
- Objective: flip the "User Enumeration via Login & Forgot-Password Responses" test to done on /tests by exploiting POST /login, POST /forgot.
- Hint 1: Compare the error message for an email that exists with one that does not.
- Hint 2: The forgot-password form is even more talkative than the login form.
- Hint 3: Probe at least 5 different emails across login/forgot and note which ones say "No account" vs "Wrong password" / "Reset link sent".

### Published Demo / Default Credentials (Beginner)
- Objective: flip the "Published Demo / Default Credentials" test to done on /tests by exploiting POST /login.
- Hint 1: The login page itself tells you working usernames and passwords.
- Hint 2: Scroll the login page — demo accounts are printed right on it.
- Hint 3: Log in with the published admin demo account exactly as shown on the login page.

### Predictable Password-Reset Token (Intermediate)
- Objective: flip the "Predictable Password-Reset Token" test to done on /tests by exploiting POST /reset.
- Hint 1: Reset tokens here are not random — they are computed from something you already know about the account.
- Hint 2: Request a reset for your own account and study the token pattern in the token formula the lab uses.
- Hint 3: Tokens look like RT<userId>-<userId*137+42>. Compute Bob's (id 5) token yourself and POST /reset for bob@test.local WITHOUT ever requesting a reset for him.

### Role Cookie Tampering (hx_role) (Intermediate)
- Objective: flip the "Role Cookie Tampering (hx_role)" test to done on /tests by exploiting GET /admin with forged cookie.
- Hint 1: After login, look at the cookies the app sets — one of them carries your role.
- Hint 2: The server trusts that cookie instead of checking the account’s real role.
- Hint 3: As a tenant, set the hx_role cookie to admin and visit /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner)
- Objective: flip the "Weak Password Policy (1-Character Passwords)" test to done on /tests by exploiting POST /register.
- Hint 1: Try registering with the shortest password you can think of.
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: Register a new account with the password "x" — it is accepted.

### Stored XSS in Display Name (Beginner)
- Objective: flip the "Stored XSS in Display Name" test to done on /tests by exploiting POST /register or POST /profile, viewed on /tenants.
- Hint 1: Names are rendered back to other users without encoding.
- Hint 2: Put an HTML payload where your name goes and find a page where staff see it.
- Hint 3: Register (or update your profile) with the name <script>alert(1)</script> — it is stored and served raw on the tenant directory.

### Mass Assignment — Role & Balance at Registration (Intermediate)
- Objective: flip the "Mass Assignment — Role & Balance at Registration" test to done on /tests by exploiting POST /register.
- Hint 1: The registration handler copies more of your form than the visible fields.
- Hint 2: What fields does a user record have? role, balance... What if you submit them yourself?
- Hint 3: POST /register with extra fields role=admin (or balance=99999) alongside the normal fields.

### CSRF on Profile Update (Intermediate)
- Objective: flip the "CSRF on Profile Update" test to done on /tests by exploiting POST /profile.
- Hint 1: State-changing forms here carry no anti-CSRF token; the app only sets a casual origin marker cookie on its own pages.
- Hint 2: A POST that arrives WITHOUT the hx_origin marker cookie is treated exactly like a genuine one.
- Hint 3: While logged in, POST /profile with a new name and no hx_origin cookie (e.g. curl with only the sid cookie) — the change is accepted.

## Properties & Search

### Reflected XSS in Search (Beginner)
- Objective: flip the "Reflected XSS in Search" test to done on /tests by exploiting GET /search?q=.
- Hint 1: Your search text is echoed into the results heading.
- Hint 2: Try searching for an HTML tag and view the page source.
- Hint 3: Search for <script>alert(1)</script> — the payload is reflected into the page unescaped.

### SQL Injection in Property Search (Unlisted Listing Leak) (Intermediate)
- Objective: flip the "SQL Injection in Property Search (Unlisted Listing Leak)" test to done on /tests by exploiting GET /search?q=.
- Hint 1: The search box feeds a string-built LIKE query, just like the login form.
- Hint 2: A tautology here does not log you in — it changes WHICH rows come back.
- Hint 3: Search for: ' OR '1'='1 — every property comes back, including the unlisted penthouse that normal search hides.

## Units & Leases

### Unit IDOR — Another Tenant’s Unit & Lease Details (Beginner)
- Objective: flip the "Unit IDOR — Another Tenant’s Unit & Lease Details" test to done on /tests by exploiting GET /unit/:id.
- Hint 1: Unit pages are numbered and nothing checks that the unit is yours.
- Hint 2: Open your own unit, then change the number in the URL.
- Hint 3: As Alice, open /unit/2 — Bob’s unit and lease summary are served to you.

### Lease Document IDOR (Beginner)
- Objective: flip the "Lease Document IDOR" test to done on /tests by exploiting GET /lease/:id.
- Hint 1: The full lease page has the same numbering habit as the units.
- Hint 2: You only need to be logged in — not a party to the lease.
- Hint 3: As Alice, open /lease/2 and read Bob’s complete lease terms.

### Unlisted Property Readable by Direct URL (Beginner)
- Objective: flip the "Unlisted Property Readable by Direct URL" test to done on /tests by exploiting GET /property/:id.
- Hint 1: Hidden from search is not the same as protected.
- Hint 2: Property pages have predictable numbers; one listing is deliberately unlisted.
- Hint 3: Open /property/4 directly — the unlisted internal penthouse is served to any logged-in user.

### Broken Access Control — Anyone Can Sign a Lease (Intermediate)
- Objective: flip the "Broken Access Control — Anyone Can Sign a Lease" test to done on /tests by exploiting POST /lease/:id/sign.
- Hint 1: The sign action checks that you are logged in — and nothing else.
- Hint 2: You do not need to be the tenant OR the landlord named on the lease.
- Hint 3: As Carol, POST /lease/1/sign — Alice’s lease gets marked signed by you.

### Lease Terms Tampering by Non-Party (Rent Edit IDOR) (Intermediate)
- Objective: flip the "Lease Terms Tampering by Non-Party (Rent Edit IDOR)" test to done on /tests by exploiting POST /lease/:id/edit.
- Hint 1: The lease edit endpoint trusts whoever calls it.
- Hint 2: The rent field is just a form value — and the server never asks who you are to that lease.
- Hint 3: As Bob, POST /lease/1/edit with rent=1 — Alice’s lease rent is rewritten.

## Rent Payments

### Payment Record IDOR (Beginner)
- Objective: flip the "Payment Record IDOR" test to done on /tests by exploiting GET /payment/:id.
- Hint 1: Payment receipts follow the same predictable numbering.
- Hint 2: Receipts show amounts and dates for other people’s rent.
- Hint 3: As Alice, open /payment/2 — Bob’s rent payment record is served to you.

### Rent Amount Tampering — Pay $1, Marked Paid in Full (Intermediate)
- Objective: flip the "Rent Amount Tampering — Pay $1, Marked Paid in Full" test to done on /tests by exploiting POST /payments/pay.
- Hint 1: The pay form lets the client state the amount — and the server believes it.
- Hint 2: What happens if the amount you submit is not the rent on the lease?
- Hint 3: POST /payments/pay for your lease with amount=1 — the payment is recorded as PAID and the lease shows settled.

### Negative Payment Credits the Wallet (Intermediate)
- Objective: flip the "Negative Payment Credits the Wallet" test to done on /tests by exploiting POST /payments/pay.
- Hint 1: The amount is never checked for being positive.
- Hint 2: What does a payment of minus fifty do to your balance arithmetic?
- Hint 3: POST /payments/pay with amount=-50 — your wallet balance grows by $50 and the payment still counts.

## Deposits

### Deposit Record IDOR (Beginner)
- Objective: flip the "Deposit Record IDOR" test to done on /tests by exploiting GET /deposit/:id.
- Hint 1: Deposit pages are numbered like everything else here.
- Hint 2: Amounts held, and for whom, are none of your business — but the page disagrees.
- Hint 3: As Alice, open /deposit/2 — Bob’s deposit record is fully visible.

### Deposit Refund Abuse — Non-Landlord Refunds Any Amount (Advanced)
- Objective: flip the "Deposit Refund Abuse — Non-Landlord Refunds Any Amount" test to done on /tests by exploiting POST /deposit/:id/refund.
- Hint 1: The refund action is meant for the landlord at the end of a lease. The endpoint never checks.
- Hint 2: It also trusts whatever refund amount the caller types.
- Hint 3: As Bob, POST /deposit/1/refund with amount=5000 — a refund bigger than the deposit itself is recorded.

## Maintenance Requests

### Maintenance Request Privacy IDOR (Beginner)
- Objective: flip the "Maintenance Request Privacy IDOR" test to done on /tests by exploiting GET /request/:id.
- Hint 1: Repair requests describe what is broken inside someone’s home.
- Hint 2: The request pages are numbered; ownership is never checked.
- Hint 3: As Alice, open /request/2 — Bob’s maintenance request, with his unit details, is served.

### Tenant Can Close Own Request via Landlord-Only Status Action (Intermediate)
- Objective: flip the "Tenant Can Close Own Request via Landlord-Only Status Action" test to done on /tests by exploiting POST /request/:id/status.
- Hint 1: Marking a job complete is the landlord’s call. The endpoint does not agree.
- Hint 2: The status form is only SHOWN to landlords, but the POST URL works for anyone.
- Hint 3: As Alice, POST /request/1/status with status=completed — your own request closes without the landlord.

## Admin Panel

### CSRF on Admin User Deletion (Intermediate)
- Objective: flip the "CSRF on Admin User Deletion" test to done on /tests by exploiting POST /admin/users/:id/delete.
- Hint 1: Even the admin’s destructive actions carry no CSRF token.
- Hint 2: Like the profile form, the delete action ignores the missing hx_origin marker.
- Hint 3: As the admin (demo login), POST /admin/users/6/delete with only the sid cookie and no hx_origin marker — the user is deleted.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Data (Beginner)
- Objective: flip the "Unauthenticated Debug Endpoint Dumps All Data" test to done on /tests by exploiting GET /api/debug.
- Hint 1: Developers leave themselves presents. Try the obvious debug path.
- Hint 2: No login is needed for this one at all.
- Hint 3: Open /api/debug in a fresh browser with no session — every user (with passwords), lease and payment is returned as JSON.
