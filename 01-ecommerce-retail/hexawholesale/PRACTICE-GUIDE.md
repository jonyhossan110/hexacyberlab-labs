# HexaWholesale — Practice Guide

This guide mirrors the lab's mission page (`/tests`): **24 challenges grouped by feature**. Work through them in any order — the lab detects each success itself and your % rises on the header bar. Each challenge names a **measurable objective**; you're done when the test flips to ✅ on `/tests` (your evidence is the exploit itself plus the changed record).

**The assistant rule:** the Lab Assistant chatbot gives step-by-step help for a feature only after you've genuinely tried that feature **at least 3 times**. These written hints are always available — use one level at a time.

Setup: unlock the lab, run `node server.js`, open http://127.0.0.1:3018, keep Burp Suite (or browser DevTools) open. Accounts are in the README. Test IDs match `VULNERABILITIES.md` and `FIX-AND-RETEST.md`.

---

## Feature: Login & Authentication

### auth-sqli — Log in without a password *(Advanced)*
- **Objective:** Reach a dashboard via the login form without knowing any account's password.
- Hint 1: The login form still contains a legacy string-built query path — think about how the email is pasted into the query.
- Hint 2: A quote in the email field changes the query's logic. What does a classic tautology or comment sequence do?
- Hint 3: Try the email `' OR '1'='1' -- ` (any password). The comment swallows the password check.

### auth-brute — Show the login never says "slow down" *(Intermediate)*
- **Objective:** Submit 10 wrong passwords for one account in a row and show every attempt was processed normally.
- Hint 1: Count how many wrong passwords you can try for one account. Does anything slow you down or lock it?
- Hint 2: Script it — 10 rapid failed logins for the same email (Burp Intruder or a curl loop).
- Hint 3: There is no counter, delay or lockout at all — the 10th failure is processed exactly like the first.

### auth-enum — Prove which emails hold accounts *(Beginner)*
- **Objective:** Using only the forgot-password form, demonstrate a reliable way to tell real accounts from fake ones.
- Hint 1: Compare the forgot-password response for an email that exists with one that does not.
- Hint 2: One of the two answers is noticeably more helpful than the other — it even shows you something.
- Hint 3: Submit once with `a-buyer@hexawholesale.local` and once with an address that does not exist. The different responses are the enumeration oracle.

### auth-default — Walk in through the front door *(Beginner)*
- **Objective:** Log in as the platform admin using documented/demo credentials.
- Hint 1: The README lists working accounts — and their passwords follow one obvious pattern.
- Hint 2: Try the documented platform admin credentials.
- Hint 3: `admin@hexawholesale.local / Admin@123` (buyers use `User@123`).

### auth-reset — Take over an account by predicting its reset token *(Intermediate)*
- **Objective:** Set a new password for another user's account without ever seeing their reset email.
- Hint 1: Request a password reset and study the token you are shown. What kind of value is it?
- Hint 2: Request resets for two different accounts and compare the tokens.
- Hint 3: Tokens are sequential numbers (1001, 1002…). Trigger a reset for a victim, then use the next number at `/reset?token=<n>` from a different browser.

---

## Feature: Registration & Company Settings

### reg-weak — Register with a one-character password *(Beginner)*
- **Objective:** Create a working account whose password is a single character, then log in with it.
- Hint 1: Register a new account and see how short a password the form accepts.
- Hint 2: Try a one-character password.
- Hint 3: No length or complexity check exists — password `x` creates a working account with its own company and credit line.

### reg-mass — Give your new company a giant credit limit *(Intermediate)*
- **Objective:** Register a company whose starting credit limit is $777,777 instead of $10,000.
- Hint 1: Registration quietly builds your new company record from the form. What if the form carried one extra field?
- Hint 2: Intercept the register POST (Burp) or use curl, and add a field the form never showed.
- Hint 3: Add `creditLimit=777777` to the POST /register body — your company is created with the limit you typed.

### settings-mass — Raise your own credit limit *(Intermediate)*
- **Objective:** Change Company A's credit limit from $50,000 to $999,999 using only the Company Settings save.
- Hint 1: The form you see isn't the whole API. The server saves more than it shows.
- Hint 2: Intercept the save request and add a field the form never offered.
- Hint 3: Add `creditLimit=999999` (try `creditUsed=0` too) to the POST /company/settings body. Evidence: dashboard shows the new limit.

### settings-csrf — Change settings from a foreign site *(Intermediate)*
- **Objective:** Change a logged-in victim's company settings with a request that originates from another origin.
- Hint 1: The settings POST has no anti-CSRF token. What does a request from a foreign website look like to the server?
- Hint 2: The app's own pages carry an `hx_origin` marker cookie; a cross-site form post carries the session cookie but a foreign Origin — and no one checks.
- Hint 3: Auto-submit a form from another origin to `/company/settings` in the victim's browser (or replay with curl: victim's `sid` cookie + a foreign `Origin` header).

---

## Feature: Product Search

### search-sqli — Leak the internal catalogue and cost prices *(Intermediate)*
- **Objective:** Make product search return the hidden `[INTERNAL]` product **and** populated cost prices.
- Hint 1: The search box builds a query by string concatenation, and the page shows you the query.
- Hint 2: What happens to `AND internal = 0` when your input makes the whole WHERE clause true?
- Hint 3: Search for `' OR '1'='1` — the visibility filter breaks, internal rows return, cost prices show.

### search-xss — Execute script through the search box *(Beginner)*
- **Objective:** Get a script payload to execute in the browser from a search results URL.
- Hint 1: Your search term is echoed back on the results page. Is it encoded everywhere it appears?
- Hint 2: Put an HTML tag in the search box and view the page source.
- Hint 3: Search for `<script>alert(1)</script>` — the "Showing results for" echo renders it raw.

---

## Feature: Purchase Orders

### po-self-approve — Approve your own PO *(Intermediate)*
- **Objective:** As a buyer, take a PO you created from draft to `approved` (with its invoice) without any approver account.
- Hint 1: Create a PO as a buyer. Look carefully at every action offered to you on its page.
- Hint 2: Who is supposed to approve a PO — and who does the server actually check for?
- Hint 3: Submit, then POST to `/pos/<id>/approve` in the same buyer session. Approved + invoiced, no approver involved.

### po-idor — Read another company's PO *(Beginner)*
- **Objective:** As Company A's buyer, display Company B's PO-1002 with lines and total.
- Hint 1: PO detail pages live at a predictable URL. What changes between your PO and theirs?
- Hint 2: Object IDs are simple sequential numbers.
- Hint 3: Open `/pos/1002` while logged in as `a-buyer@` — full lines, prices and notes, no ownership check.

### po-tier — Get the 200+ price on a 10-unit order *(Intermediate)*
- **Objective:** Create a PO for 10 units where the charged unit price equals the 200+ tier price (e.g. Label Printer at $166.44 instead of $201.48).
- Hint 1: The order form asks which tier you *claim*. The server believes you.
- Hint 2: Price a small order while claiming the largest tier.
- Hint 3: Quantity = 10, Claimed bulk tier = 200. You are charged the 200+ unit price.

### po-credit — Submit a PO beyond your credit limit *(Intermediate)*
- **Objective:** Get a PO whose total exceeds your company's available credit into `pending` state (Company A: available $38,000 — e.g. 2,000 × Barcode Scanner).
- Hint 1: The New PO page warns about your available credit. Where does that check actually live — page or server?
- Hint 2: Build a PO larger than the remaining credit and submit it directly, ignoring the warning.
- Hint 3: POST `/pos/<id>/submit` for the oversized PO — it is accepted; the server never enforces the limit.

### po-price — Order at $0.01 *(Beginner)*
- **Objective:** Produce a PO whose line unit price is $0.01 and show the resulting total.
- Hint 1: Prices can be set at creation — and amended after. Whose numbers does the server store?
- Hint 2: Try the optional unit-price field at creation, or the "Amend a line price" form on the PO page.
- Hint 3: Set unit price to `0.01` either way; submit and approve — the invoice is issued at your price.

### po-qty — Order more than exists *(Intermediate)*
- **Objective:** Create an accepted PO for more units of a product than its stock (e.g. 2,000 × Barcode Scanner, stock 1,400).
- Hint 1: Products have stock counts. Does ordering more than the stock bother the server?
- Hint 2: Pick a product and order more units than exist.
- Hint 3: There is no stock validation anywhere in the flow — the oversized PO is created without complaint.

### po-rebate — Stack a rebate past 10% *(Intermediate)*
- **Objective:** Apply `WHOLESALE10` to one PO enough times to cut its total by at least 20%.
- Hint 1: Apply a rebate code. Now apply it again. And again.
- Hint 2: Nothing counts how many times a code was used — on this PO or anywhere.
- Hint 3: Each application of `WHOLESALE10` subtracts another 10% from the same PO.

### po-xss — Plant a payload for the approver *(Advanced)*
- **Objective:** Store a note payload that executes when another user (approver/admin) opens the PO.
- Hint 1: Notes are rendered to approvers/admins. How are they rendered on the PO page?
- Hint 2: Put markup in a note and open the PO as a different user.
- Hint 3: Create a PO with note `<script>alert(document.cookie)</script>` — it is stored and rendered unescaped on the PO page.

### po-csrf — Forge an approval from outside the app *(Advanced)*
- **Objective:** Approve a PO without clicking anything inside HexaWholesale — the approval must fire from an external page load in a logged-in browser.
- Hint 1: One PO action happens on a plain GET — the "approver quick link".
- Hint 2: What loads a URL automatically in a logged-in browser? Images, previews, prefetchers…
- Hint 3: Load `/pos/<id>/approve-link` as an `<img src>` in any local HTML file while logged in — the PO flips to `approved`.

---

## Feature: Invoices

### inv-idor — Read a competitor's invoice *(Beginner)*
- **Objective:** Download Company B's invoice INV-2002 while logged in as Company A.
- Hint 1: Invoices have their own predictable IDs, separate from POs.
- Hint 2: The list only shows yours — the URLs do not care.
- Hint 3: Open `/invoices/2002` or `/invoices/2002/download` as `a-buyer@`.

---

## Feature: Platform & API

### api-leak — Find everyone's negotiated prices *(Beginner)*
- **Objective:** Display the negotiated prices of all three companies in one response.
- Hint 1: There's an API endpoint linked from the dashboard. Who is it filtered for? (Nobody.)
- Hint 2: APIs need the same authorisation as pages.
- Hint 3: GET `/api/negotiated-prices` as any buyer — every company's confidential terms are in the JSON.

### platform-headers — Show the platform's missing armour *(Beginner)*
- **Objective:** Demonstrate from response headers that the app sends no CSP and no framing protection.
- Hint 1: Inspect the response headers of any page (DevTools → Network, or `curl -I`).
- Hint 2: Look for `Content-Security-Policy` and `X-Frame-Options` / `frame-ancestors`.
- Hint 3: Neither header exists anywhere — pages can be framed by any site (clickjacking) and injected scripts meet no CSP.

---

## Feature: Admin Panel

### admin-cookie — Become platform admin without credentials *(Intermediate)*
- **Objective:** Reach `/admin` and display all companies' credit limits while authenticated as a buyer.
- Hint 1: After login, look at *all* the cookies the app sets — and which one the server trusts for privilege decisions.
- Hint 2: Your privilege travels in a cookie you can edit.
- Hint 3: Change the `role` cookie to `admin` (DevTools → Application → Cookies), then open `/admin`.

---

## Capstones

### Capstone 1 — Full chain: free goods, properly invoiced
- **Objective:** As Company C's buyer, end with an **approved PO + invoice** for ≥ 200 units of any product at an effective total under $100 — using only workflow flaws, no admin access.
- **Path:** Claim the deepest tier (po-tier) → amend the line price (po-price) → stack the rebate (po-rebate) → submit past the credit limit (po-credit) → approve it yourself (po-self-approve).
- **Evidence:** The final invoice (INV id, total < $100) plus a one-paragraph write-up of each step — the client-report format: *what you did, what it proves, what it costs the business.*

### Capstone 2 — Fix & retest (uses `FIX-AND-RETEST.md`)
- **Objective:** Implement the fixes for V1 (self-approval) and V2 (tenant IDOR) in a **copy** of the lab, then re-run po-idor and po-self-approve against the fixed copy: both must now fail (403/404), while a legitimate approver approval still works.
- **Evidence:** Before/after requests for both attacks + one successful legitimate approval on the fixed build.
