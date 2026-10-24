# HexaInvoice — Practice Guide (26 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same guidance, but only after you have genuinely tried that feature at least 3 times. A challenge is complete when the server detects the exploit's real effect — watch your % on the header bar.

## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
**Objective:** Get a logged-in session without knowing any valid password.
**Hints:**
1. The login form checks your email against the user store with a hand-built query. What happens if the email itself contains query logic?
2. Classic tautology payloads turn "email = X AND password = Y" into something always true.
3. Try logging in with the email: ' OR '1'='1' --  and any password.
**Walkthrough (read after trying):** 1) Open the login page. 2) In the email field enter: ' OR '1'='1' --  3) Type any password and submit. 4) You are logged in as the first account in the store without knowing its password — the query was tricked into matching every row.

### Brute Force — No Rate Limiting (Beginner · A07 Authentication Failures)
**Objective:** Make 10 failed login attempts against one account and observe that nothing stops you.
**Hints:**
1. How many wrong passwords can you try for the staff account before anything stops you?
2. There is no lockout, no CAPTCHA and no delay — the counter only exists in this lab to prove the point.
3. Script 10 failed logins for staff@hexainvoice.local (e.g. with curl) and watch the test complete.
**Walkthrough (read after trying):** 1) Pick the staff account. 2) Submit 10 login attempts with wrong passwords (a small curl loop works). 3) Notice every attempt is processed normally — nothing slows down or locks. 4) The test completes at the 10th failure: the missing throttle is the vulnerability.

### User Enumeration via Password Reset (Beginner · A07 Authentication Failures)
**Objective:** Use the forgot-password flow to prove which of two email addresses has an account.
**Hints:**
1. Compare what "Forgot password" tells you for an email that exists versus one that does not.
2. Different answers = a free oracle for building a valid-user list.
3. Submit /forgot once for owner@hexainvoice.local and once for a made-up address; the two different responses complete the test.
**Walkthrough (read after trying):** 1) Go to /forgot. 2) Enter owner@hexainvoice.local — the page confirms a reset was created. 3) Enter nobody@nowhere.example — the page says no such account. 4) That difference is the oracle: you can test any email list and learn exactly who has an account.

### Weak / Default Credentials (Beginner · A07 Authentication Failures)
**Objective:** Log in to the platform admin account using its shipped default password.
**Hints:**
1. Installations often ship with a platform admin that nobody ever re-passwords.
2. Try the most-guessed admin password in the world on admin@hexainvoice.local.
3. The password is literally admin123.
**Walkthrough (read after trying):** 1) On the login page enter admin@hexainvoice.local. 2) Use the password admin123 — a vendor default that was never changed. 3) You are in as Platform Admin. Default credentials are the oldest trick in the book because they keep working.

### Predictable Password-Reset Token (Intermediate · A07 Authentication Failures)
**Objective:** Reset the staff account's password using a token you computed yourself — one that was never emailed.
**Hints:**
1. Request a reset for your own account and look closely at the token format — it is not random.
2. The token is a simple arithmetic function of the user's numeric ID.
3. Token = RST-(userId × 137 + 42). The owner is user 1, staff is user 2 — compute staff's token and reset their password without ever requesting it.
**Walkthrough (read after trying):** 1) Request a reset for your own account and note the token pattern. 2) The token is RST-(id×137+42): for staff (id 2) that is RST-316. 3) Open /reset, enter staff's email and the computed token, choose a new password. 4) Login as staff — you took the account over with maths, not access.

### Session Cookie Role Tampering (Intermediate · A01 Broken Access Control)
**Objective:** As the client viewer, reach the owner-only billing settings page by editing your own session cookie.
**Hints:**
1. Your session lives in a cookie you can read — and edit. What does it say about your role?
2. The cookie is just base64 JSON, and the billing settings page believes it.
3. Log in as the client viewer, decode the hx_sess cookie, change role to owner, re-encode, and open /settings.
**Walkthrough (read after trying):** 1) Log in as the client viewer (viewer@novatech.local). 2) Copy the hx_sess cookie and base64-decode it — it is plain JSON including your role. 3) Change "role":"viewer" to "role":"owner", re-encode, and replace the cookie. 4) Open /settings — the owner-only billing page accepts your forged role.

## Registration & Firm Profile

### Mass Assignment — Role via Registration (Intermediate · A01 Broken Access Control)
**Objective:** Create a brand-new account that comes out with the platform-admin role.
**Hints:**
1. The registration handler copies your whole form into the new user record. What extra fields might it accept?
2. If the form blindly binds every submitted field, a field that was never shown can still be set.
3. Register a new account and add an extra form field: role=admin.
**Walkthrough (read after trying):** 1) Intercept or craft the registration request (curl works). 2) Add an extra field role=admin alongside the normal fields. 3) Register. 4) The new account is created with the admin role because the handler bound every field it received.

### Weak Password Policy (Beginner · A07 Authentication Failures)
**Objective:** Register an account whose password is a single character.
**Hints:**
1. How short a password will registration accept?
2. There is no minimum length or complexity check at all.
3. Register with the password "x" — a single character is accepted.
**Walkthrough (read after trying):** 1) Open /register. 2) Create an account with the password x (one character). 3) The account is created without complaint. 4) A policy that accepts "x" accepts everything attackers try first.

### Stored XSS in Firm Name (Intermediate · A03 Injection)
**Objective:** Store a script payload in the firm name so it executes when the dashboard is viewed.
**Hints:**
1. The firm name from your profile is printed on the dashboard and invoices. Is it encoded?
2. A value stored once and rendered everywhere is the perfect persistent payload.
3. Set your firm name to <script>alert(1)</script> in /profile and view the dashboard.
**Walkthrough (read after trying):** 1) Log in as the firm owner and open /profile. 2) Set the firm name to <script>alert(1)</script> and save. 3) Open the dashboard — the name is printed without encoding and the script executes. 4) It is stored, so it fires for everyone, every time.

### CSRF on Firm Profile Update (Intermediate · A01 Broken Access Control)
**Objective:** Change the firm profile with a request that carries no origin marker at all.
**Hints:**
1. Legit profile forms carry a hidden origin marker that matches a cookie. What if a request simply leaves it out?
2. The update endpoint never checks where the request came from.
3. While logged in as owner, POST /profile with new values but WITHOUT the _origin field — the change still applies.
**Walkthrough (read after trying):** 1) Log in as owner. 2) From another origin (curl is fine), POST to /profile with a new firm name and NO _origin marker. 3) The profile updates anyway. 4) That is CSRF: the browser would have attached your cookies to the same request from an attacker's page.

## Clients

### Cross-Account Client IDOR (Beginner · A01 Broken Access Control)
**Objective:** Read a client record that belongs to the other firm.
**Hints:**
1. Client records have simple numeric IDs. Does the page check which firm the client belongs to?
2. Log in as one firm and open the client page of the other firm's client.
3. BrightLedger is account 1; OrbitSoft (client 4) belongs to PixelCFO. Open /clients/4 while logged in as BrightLedger.
**Walkthrough (read after trying):** 1) Log in as the BrightLedger owner. 2) Browse to /clients/4. 3) You see OrbitSoft — a client of a DIFFERENT firm (PixelCFO) — because the handler never checks ownership. 4) One changed digit leaks another business's customer.

### Stored XSS in Client Contact Name (Intermediate · A03 Injection)
**Objective:** Store a script payload in a client contact name that executes on the client page.
**Hints:**
1. Client contact names are printed on the client page and invoices without encoding.
2. Store first, fire later — the payload waits for the next viewer.
3. Create or edit a client with contact name <script>alert(1)</script> and open the client page.
**Walkthrough (read after trying):** 1) Add a new client with contact name <script>alert(1)</script>. 2) Open that client's page. 3) The stored name is rendered raw and executes. 4) Stored XSS in shared business records targets the whole firm, not one visitor.

## Invoices

### Cross-Account Invoice IDOR (Beginner · A01 Broken Access Control)
**Objective:** Open a full invoice belonging to the other firm.
**Hints:**
1. Invoices are numbered and sequential, and the detail page does not check the owning firm.
2. Find the other firm's invoice IDs (they start at INV-2001) and open one.
3. As BrightLedger, open /invoices/5 — a PixelCFO invoice.
**Walkthrough (read after trying):** 1) Log in as BrightLedger owner. 2) Open /invoices/5. 3) The invoice belongs to PixelCFO (INV-2001) but is served to you in full. 4) IDOR on invoices exposes an entire firm's revenue book.

### Line-Item Price Tampering (Beginner · A04 Insecure Design)
**Objective:** Issue an invoice for the $300 bookkeeping service with a total based on $1.
**Hints:**
1. The invoice form helpfully posts the unit price in a hidden field. The server believes what it receives.
2. Server-side truth lives in the services catalogue — the request should never set the price.
3. Create an invoice for the $300 bookkeeping service but post unitPrice=1.
**Walkthrough (read after trying):** 1) Open the new-invoice form and pick Bookkeeping ($300). 2) Intercept the POST (or use curl) and change unitPrice to 1. 3) Submit. 4) The invoice is created at $1 — the server never checked its own catalogue.

### Tax Rate & Discount Manipulation (Intermediate · A04 Insecure Design)
**Objective:** Create an invoice whose total is $0 by abusing the posted discount/tax fields.
**Hints:**
1. Tax rate and discount % are also posted fields. Firm policy caps discounts at 20% and VAT is fixed at 15% — does the server enforce either?
2. What happens to the total with discountPct=100, or taxRate=0?
3. Create an invoice posting discountPct=100 (or taxRate=0) and read the resulting total.
**Walkthrough (read after trying):** 1) Create an invoice via POST with discountPct=100. 2) The total collapses to $0 yet the invoice is valid. 3) The same works with taxRate=0 or even negative values. 4) Every money rule the server fails to enforce is money an attacker can erase.

### Forged Payment Status (Draft → Paid) (Intermediate · A01 Broken Access Control)
**Objective:** Get an invoice with zero payments to display the status PAID.
**Hints:**
1. The status endpoint accepts whatever status the request names — no workflow, no payment check.
2. If "paid" is just a field value, anyone can declare an invoice settled.
3. Create a draft invoice, then POST /invoices/<id>/status with status=paid. No payment exists, yet it shows PAID.
**Walkthrough (read after trying):** 1) Create or pick a draft invoice and note it has no payments. 2) POST /invoices/<id>/status with status=paid. 3) The invoice now shows PAID. 4) Status is money: whoever controls the transition controls the ledger.

## Payments

### Forged Payment Settlement Amount (Intermediate · A04 Insecure Design)
**Objective:** Settle a $460 invoice as PAID while recording only a $1 payment.
**Hints:**
1. The payment form posts both the amount and a hidden "paidAmount" the server uses to decide if the invoice is settled.
2. Settling is decided by a number the payer controls.
3. On a sent invoice, POST /invoices/<id>/pay with amount=1 but paidAmount=<full total> — the invoice becomes PAID for $1.
**Walkthrough (read after trying):** 1) Open a sent invoice (e.g. INV-1002, $460). 2) POST a payment with amount=1 and paidAmount=460. 3) The invoice flips to PAID and a $1 payment is all that exists. 4) The server trusted the summary field instead of adding up the money.

### Payment Receipt IDOR (Beginner · A01 Broken Access Control)
**Objective:** Download the payment receipt of the other firm.
**Hints:**
1. Receipts have their own URLs with small numeric IDs and no ownership check.
2. Payment 2 belongs to the other firm. Ask for its receipt.
3. As BrightLedger, open /payments/2/receipt — PixelCFO's receipt.
**Walkthrough (read after trying):** 1) Log in as BrightLedger. 2) Open /payments/2/receipt. 3) You receive the receipt for PixelCFO's payment on INV-2001. 4) Documents leak the same data as pages when IDs are guessable and unchecked.

## Recurring Templates

### Cross-Account Recurring Template Abuse (Intermediate · A01 Broken Access Control)
**Objective:** Generate a real invoice from the other firm's recurring template.
**Hints:**
1. Recurring templates generate real invoices. The generate action does not check which firm owns the template.
2. Template 2 belongs to PixelCFO. Generate from it while logged in as BrightLedger.
3. POST /templates/2/generate as BrightLedger — an invoice appears from their template.
**Walkthrough (read after trying):** 1) Log in as BrightLedger. 2) POST /templates/2/generate. 3) A new invoice is created from PixelCFO's template, in their account. 4) You reached inside another firm's automation — IDOR with a multiplier.

### Generated Invoice Amount Tampering (Intermediate · A04 Insecure Design)
**Objective:** Generate an invoice from your own $300 template with a $1 total.
**Hints:**
1. Generating an invoice from your own template accepts an "amount" override in the request.
2. The template says $300. The request can say otherwise.
3. POST /templates/1/generate with amount=1 — the generated invoice totals $1, not $300.
**Walkthrough (read after trying):** 1) Note template 1 is a $300 retainer. 2) POST /templates/1/generate with amount=1. 3) The new invoice totals $1. 4) The template's price was never consulted — the request rewrote it.

## Search & Exports

### SQL Injection in Invoice Search (Intermediate · A03 Injection)
**Objective:** Make invoice search return the other firm's invoices.
**Hints:**
1. Invoice search filters with a hand-built query over invoice numbers and client names.
2. A tautology in the search box makes the filter match everything — including other firms' rows.
3. Search for: ' OR '1'='1 — the results include PixelCFO invoices.
**Walkthrough (read after trying):** 1) Log in and open invoice search. 2) Enter ' OR '1'='1 as the query. 3) Results include INV-2001/INV-2002 — another firm's invoices. 4) The filter matched everything because the query logic was injected.

### Reflected XSS in Search (Beginner · A03 Injection)
**Objective:** Get a script payload reflected unencoded in the search results page.
**Hints:**
1. The results page prints "Results for: <your query>" — exactly as typed.
2. Reflected means the payload comes back in the same response, unencoded.
3. Search for <script>alert(1)</script> and view the page source/response.
**Walkthrough (read after trying):** 1) Search for <script>alert(1)</script>. 2) The results heading prints your input raw. 3) In a browser the script runs in the victim's session. 4) Any page that echoes input owes the user encoding.

### Full Data Export Exposure (Intermediate · A01 Broken Access Control)
**Objective:** As the client viewer, download the CSV export containing every firm's invoices.
**Hints:**
1. The CSV export was built for firm owners. Who else can call it?
2. The client viewer role should see one client's invoices — try the export as the viewer.
3. Log in as viewer@novatech.local and open /export/invoices — you receive every invoice in the system.
**Walkthrough (read after trying):** 1) Log in as the client viewer — a role meant to see only NovaTech's invoices. 2) Open /export/invoices. 3) A CSV downloads with ALL invoices from ALL firms. 4) The export checked only that you were logged in, never what you may take.

## Admin Panel

### Admin User List Exposure (JSON) (Intermediate · A01 Broken Access Control)
**Objective:** As a non-admin, retrieve the full user list including passwords.
**Hints:**
1. The admin console has a JSON helper endpoint for its user table. Was it given the same protection as the page?
2. Any logged-in user can ask for /admin/users.json — including staff.
3. As staff, fetch /admin/users.json and read every account, including passwords.
**Walkthrough (read after trying):** 1) Log in as staff (a non-admin). 2) GET /admin/users.json. 3) The full user list returns, passwords included. 4) The admin PAGE checks your role — the JSON endpoint behind it never did.

### CSRF on Admin User Deactivation (Advanced · A01 Broken Access Control)
**Objective:** Deactivate a user as admin with a request that carries no origin marker.
**Hints:**
1. Deactivating a user is a state-changing admin POST. Does it demand the origin marker?
2. Admin actions are the highest-value CSRF targets — and this one skips the check.
3. As admin, POST /admin/users/2/deactivate WITHOUT the _origin field — the staff account is deactivated anyway.
**Walkthrough (read after trying):** 1) Log in as the platform admin. 2) POST /admin/users/2/deactivate with no _origin marker. 3) The staff user is deactivated regardless. 4) If a browser had sent this from an attacker's site, the cookies would have ridden along — that is the CSRF.

## Platform & API

### Predictable API Token & Unscoped API Data (Advanced · A07 Authentication Failures)
**Objective:** Using only a token you derived from a public email address, pull another firm's invoices from the API.
**Hints:**
1. API keys here are derived, not random: the token is simply hx_ + base64(the account email).
2. If you know any user's email, you know their API key. And the API does not scope results to their firm.
3. Compute the PixelCFO owner's token from owner@pixelcfo.local and call GET /api/invoices with header X-API-Key — invoices from all firms come back.
**Walkthrough (read after trying):** 1) Notice your own API token pattern on the settings page: hx_ plus base64 of your email. 2) Derive the token for owner@pixelcfo.local the same way. 3) GET /api/invoices with that X-API-Key. 4) All firms' invoices return — a guessed key plus an unscoped API is total exposure.
