# HexaBilling — Practice Guide

Challenges grouped by feature, ordered by difficulty inside each feature. Objective for every challenge: make the flaw's real effect happen on the server so the test flips to done on `/tests`. Each challenge lists its 3 graded hints (the same hints the /tests page reveals).

## Login & Authentication

### [Beginner] SQL Injection Login Bypass (legacy SSO route)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The login form talks to a legacy SSO endpoint that builds its query by string concatenation.
- **Hint 2:** Try a classic tautology in the email field, e.g. something with ' OR '1'='1.
- **Hint 3:** Submit email: admin@hexabilling.local' OR '1'='1' -- with any password — you land in the platform admin account.
- **What it teaches:** String-built SQL queries let an attacker rewrite the login logic itself and walk in as any account, including the platform admin.

### [Beginner] Brute Force — No Rate Limit or Lockout
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Pick one account and just keep guessing wrong passwords.
- **Hint 2:** Notice the 10th, 20th, 50th wrong guess is answered exactly like the first — nothing slows down.
- **Hint 3:** Submit 10+ failed logins for demo@hexabilling.local — the app processes every one; automated guessing would run forever.
- **What it teaches:** Without throttling or lockout, password guessing is free and unlimited — weak passwords fall to patience, not skill.

### [Beginner] User Enumeration via Login & Password-Reset Responses
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Compare the error message for an email that exists vs one that does not.
- **Hint 2:** Do the same comparison on the Forgot Password page.
- **Hint 3:** Existing email + wrong password says "Incorrect password"; a made-up email says "No account found" — that difference is an account oracle.
- **What it teaches:** Different error messages for "no such user" and "wrong password" hand attackers a free list of valid accounts to target.

### [Beginner] Default Platform Admin Credentials
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The platform admin account was seeded at install time and never rotated.
- **Hint 2:** Vendor defaults are the first thing attackers try: think admin@ plus the most obvious password of all.
- **Hint 3:** Log in as admin@hexabilling.local with password admin123 — the install-time default still works.
- **What it teaches:** Default credentials are public knowledge. An unrotated install password is an open door with the vendor’s name on it.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Request a reset for your own account and study the token format.
- **Hint 2:** The token is derived from the account by a simple arithmetic formula on its numeric id — no randomness at all.
- **Hint 3:** Tokens look like RST-(id*137+42). Compute one for another user’s id and post it to /reset with a new password.
- **What it teaches:** Reset tokens must be unguessable secrets. A formula based on a public identifier lets anyone reset anyone’s password.

### [Intermediate] Session Role Cookie Tampering
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** After login, inspect the cookies the app sets — one of them repeats your role back to the server.
- **Hint 2:** The /admin gate trusts that client-supplied cookie instead of the server-side session.
- **Hint 3:** Set the hx_role cookie to admin in your browser and open /admin — the gate believes you.
- **What it teaches:** Authorization data stored on the client is attacker-controlled. Roles must live server-side, in the session.

## Registration & Profile

### [Beginner] Weak Password Policy (1-Character Passwords)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** How short a password will registration accept? Try shorter and shorter.
- **Hint 2:** There is no length or complexity check at all.
- **Hint 3:** Register an account with the password "x" — it is accepted and can log in.
- **What it teaches:** A password policy is a security control: without a minimum, users (and attackers creating accounts) choose trivially guessable secrets.

### [Intermediate] Mass Assignment — Self-Assign Admin Role at Signup
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The registration handler copies the whole submitted object onto the new account.
- **Hint 2:** Add a field the form never shows — the one that controls privilege.
- **Hint 3:** Register with an extra field role=admin in the POST body: the new account is created as a platform admin.
- **What it teaches:** Binding request bodies straight onto data models lets attackers set fields the UI never offered — role, tier, balance.

### [Intermediate] Stored XSS in Business Display Name
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Your business name is shown to platform staff in the admin console — is it escaped there?
- **Hint 2:** Put an HTML/JS payload where a name goes and view it from another account.
- **Hint 3:** Set the business display name (Profile) to <script>alert(1)</script> — it is stored and rendered raw in the admin business list.
- **What it teaches:** Any field rendered in someone else’s browser is code, not text, unless it is output-encoded. Admin views are the highest-value target.

### [Intermediate] CSRF on Profile Update
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Profile changes are accepted from a plain POST with no anti-CSRF token.
- **Hint 2:** A form on any other website can submit it, riding your logged-in session.
- **Hint 3:** While logged in, submit the /profile form from a page with Origin https://evil.example — the change is applied anyway.
- **What it teaches:** State-changing requests need an unguessable token the attacker’s site cannot know; cookies alone prove nothing about intent.

## Subscriptions & Plans

### [Intermediate] Plan Upgrade Without Payment
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The upgrade flow trusts the amount the client sends to decide whether payment is needed.
- **Hint 2:** What happens if the amount you submit is zero?
- **Hint 3:** POST /subscription/upgrade with plan=scale and amount=0 — the business is upgraded to Scale instantly, no invoice, no payment.
- **What it teaches:** Payment decisions must be computed server-side from the catalogue. If the client names the price, the price is zero.

### [Intermediate] Trial Extension Abuse
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Trials are meant to last 14 days. Look for an endpoint that moves the trial end date.
- **Hint 2:** The extend endpoint accepts any number of days, as often as you like.
- **Hint 3:** POST /subscription/trial/extend with days=365 — the free trial now runs for over a year.
- **What it teaches:** Trial rules are business logic, and business logic needs server-side limits like any other input validation.

### [Intermediate] Seat Count Tampering (Negative Seats)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Per-seat billing multiplies seats by the seat price — what if seats are negative?
- **Hint 2:** The seats endpoint validates nothing about the number you send.
- **Hint 3:** POST /subscription/seats with seats=-5 — the count is stored and the monthly bill drops below the plan price.
- **What it teaches:** Quantities are money in disguise. Range-check every numeric input that feeds a price calculation.

### [Advanced] Proration Credit Manipulation
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Mid-cycle plan changes grant a proration credit — check who calculates it.
- **Hint 2:** The change-plan endpoint accepts a prorationCredit field from the client and applies it verbatim.
- **Hint 3:** POST /subscription/change with plan=growth and prorationCredit=9000 — your account credit jumps by exactly $9,000.
- **What it teaches:** Money values derived from client input are donations. Credits, refunds and proration must be computed from server-side facts only.

## Coupons

### [Intermediate] Coupon Stacking on One Invoice
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The marketing intent is one coupon per invoice. Check what the apply endpoint enforces.
- **Hint 2:** Apply a second, different coupon code to the same invoice.
- **Hint 3:** Apply SAVE20 to an open invoice, then apply WELCOME10 to the same invoice — both discounts are deducted.
- **What it teaches:** Discount rules are business invariants: "one coupon per order" must be enforced on the server, not described in the UI.

### [Intermediate] Single-Use Coupon Reuse
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** ONETIME50 is marked single-use. Find out whether redemption is actually recorded against the invoice.
- **Hint 2:** Redeem it on one invoice — then try the same code on a second invoice.
- **Hint 3:** ONETIME50 applies successfully to two different invoices; the redemption counter is never checked.
- **What it teaches:** A "single-use" flag that the redemption path never reads is decoration. Usage must be checked and recorded atomically.

### [Advanced] Over-100% Coupon Creates Negative Invoice (Credit Minting)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Businesses can create their own coupons. Is the percent field range-checked?
- **Hint 2:** Create a coupon above 100% and apply it to an invoice of your own.
- **Hint 3:** Create coupon MEGA150 with percent=150, apply it — the invoice total goes negative and turns into account credit.
- **What it teaches:** Every numeric business field needs bounds. A discount above 100% is not a discount, it is a money printer.

## Usage Metering

### [Intermediate] Negative Usage Reporting Rewinds the Meter
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Usage-based billing adds up the quantities you report. Can a report subtract?
- **Hint 2:** Submit a usage event with a negative quantity and watch the metered total.
- **Hint 3:** POST /usage with metric=api_calls and quantity=-5000 — the usage total drops and so does the amount owed.
- **What it teaches:** Metering input is billing input: it must be validated (non-negative, plausible) exactly like a payment amount.

### [Intermediate] Delete Another Business’s Usage Records (IDOR)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Usage records are addressed by numeric id. The delete endpoint checks the session — but does it check ownership?
- **Hint 2:** Find the id of a usage record belonging to the other business and delete it as yourself.
- **Hint 3:** POST /usage/<id-of-pixelforge-record>/delete while logged in as Northbeam — the record is gone.
- **What it teaches:** Authentication is not authorization: every object access must verify the object belongs to the caller’s tenant.

## Invoices

### [Beginner] Invoice IDOR Across Businesses
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Your invoice URLs end in a sequential number. What stops you from opening the number next door?
- **Hint 2:** Log in as one business and open an invoice id that belongs to the other business.
- **Hint 3:** GET /invoices/4 while logged in as Northbeam — PixelForge’s invoice renders in full, line items and totals included.
- **What it teaches:** Sequential ids plus a missing ownership check equals a full data leak — the classic multi-tenant breach.

### [Intermediate] Invoice Status Forgery — Mark Paid Without Paying
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Invoices move draft → open → paid. Who is allowed to make the last jump?
- **Hint 2:** Try setting the status directly instead of going through the payment flow.
- **Hint 3:** POST /invoices/<your draft id>/status with status=paid — the invoice shows PAID with zero payments recorded.
- **What it teaches:** State transitions are privileged operations. The "paid" state must be reachable only from a verified payment event.

### [Advanced] Guessable Public Invoice Links (Enumeration)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Invoices have public share links for customers. Look at the token format.
- **Hint 2:** The tokens are sequential — walking them walks every invoice on the platform.
- **Hint 3:** Request /i/pub-1001, /i/pub-1002, /i/pub-1003, /i/pub-1004, /i/pub-1005 — five sequential public invoices, no login needed.
- **What it teaches:** Public links are capabilities: their tokens need the entropy of a password, because the link IS the credential.

## Customers & Payments

### [Beginner] Customer Record IDOR (Emails + Card Details)
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Customer profiles sit behind the same sequential ids as everything else here.
- **Hint 2:** Open a customer id that belongs to the other business.
- **Hint 3:** GET /customers/3 as Northbeam — you see PixelForge’s customer, their email and their stored card brand + last four digits.
- **What it teaches:** PII and payment metadata deserve the strictest tenant scoping — a customer list is a breach headline on its own.

### [Advanced] Pay Your Invoice with Another Business’s Card
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** The pay endpoint accepts a payment method id. Does it check whose method it is?
- **Hint 2:** First find the other business’s payment method id (their customer/invoice views leak it), then pay your own invoice with it.
- **Hint 3:** POST /invoices/<your invoice>/pay with paymentMethodId of PixelForge’s card — the charge lands on their card, your invoice is PAID.
- **What it teaches:** A payment method is a credential. It must be bound to its owner at charge time, not just at save time.

## Platform & API

### [Beginner] Unauthenticated Debug Dump of All Platform Data
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** Leftover diagnostics endpoints are a classic. Probe the API namespace for a debug route.
- **Hint 2:** No session is required for this one.
- **Hint 3:** GET /api/debug returns every user, business, invoice and payment method on the platform, unauthenticated.
- **What it teaches:** Debug endpoints are production backdoors. If it exists in prod, it is part of your attack surface.

### [Intermediate] Predictable API Key Derived from Owner Email
- **Objective:** Trigger the real effect of this flaw (see VULNERABILITIES.md) until the test shows done.
- **Hint 1:** API keys on this platform are not random — they are derived from something public about the account.
- **Hint 2:** The format is hb_ followed by the base64 of the owner’s email address.
- **Hint 3:** Compute hb_ + base64(owner@pixelforge.test) and call GET /api/invoices with it as a Bearer token — no login, full invoice list of that business.
- **What it teaches:** An API key must be a random secret. Deriving it from a public identifier makes it a username, not a password.
