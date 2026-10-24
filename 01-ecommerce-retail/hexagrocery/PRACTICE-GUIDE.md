# HexaGrocery — Practice Guide (LAB 6)

22 challenges, grouped by feature — the same map as the **`/tests`** Mission page in the app, which ticks each challenge automatically when the server sees your exploit succeed. Restart the server (`Ctrl+C`, `node server.js`) whenever you want the *business* state back; your **progress survives restarts** (delete `progress.json` only if you want a full lab reset, gate included).

Accounts: Monir `monir@hexagrocery.local` / Ela `ela@hexagrocery.local` (`User@123`), picker `picker@hexagrocery.local` (`Picker@123`), admin `admin@hexagrocery.local` (`Admin@123`).

Stuck? Every challenge has 3 graded hints (below and on `/tests`). The **Lab Coach** chatbot gives step-by-step help for a feature only after you have tried that feature **at least 3 times** — it counts your attempts, so go and try first.

---

## Login & Authentication

**A1 — SQL Injection: Login Bypass** *(Intermediate)*
Objective: get a session as the admin without knowing any password, using only the login form.
Hints: ① The login form's inputs end up inside a query string — punctuation is not escaped. ② Try a quote followed by a logical condition in the email field. ③ Email: `' OR '1'='1' -- ` with any password makes the WHERE clause true and comments out the password check.

**A2 — Brute Force: No Login Rate Limiting** *(Beginner)*
Objective: submit 10 failed logins for one account and show every attempt was processed normally.
Hints: ① Nothing slows you down or locks the account — count the failures. ② Script 10 wrong passwords for ela@hexagrocery.local. ③ The flaw is proven when double-digit failures are all accepted with no throttle, CAPTCHA or lockout.

**A3 — User Enumeration via Error Messages** *(Beginner)*
Objective: prove from the app's own responses which of two email addresses has an account.
Hints: ① Compare the login error for an email that exists with one that does not. ② Do the same comparison on the forgot-password form. ③ When the two answers differ, an attacker can harvest valid accounts before attacking them.

**A4 — Predictable Password-Reset Token** *(Intermediate)*
Objective: reset the admin password without any inbox access and log in as admin.
Hints: ① The token is built from things you already know, plus the clock. ② Format: `rst-<userId>-<yyyymmddhhmm>`; the admin's userId is 1. ③ Request a reset, compute the token for the current minute (try neighbouring minutes for skew), post it to `/reset`.

## Session & Access Control

**S1 — Privilege Escalation via Unsigned Role Cookie** *(Beginner)*
Objective: reach `/admin` as a normal customer, without logging out.
Hints: ① Login sets two cookies; only one of them is checked properly. ② Your browser lets you edit cookie values — no tools needed. ③ Set the `role` cookie to `admin` and open `/admin`.

## Registration & Profile

**R1 — Weak Password Policy at Registration** *(Beginner)*
Objective: create an account whose password is a single character.
Hints: ① The registration form never comments on your password choice. ② Try a one-character password. ③ If the account is created, the policy is "anything goes" — evidence enough.

**R2 — Mass Assignment: Wallet & Role via Profile Update** *(Intermediate)*
Objective: raise a customer wallet balance from $25 to ≥ $1,000 via the profile endpoint, and screenshot before/after.
Hints: ① The profile form shows name and phone; the endpoint accepts more than the form shows. ② Add fields the form never offered — think about what a user record contains. ③ POST `/profile/update` with `walletBalance=100000` (and try `role=admin`).

**R3 — Stored XSS in Display Name** *(Intermediate)*
Objective: store a script payload as your display name and show it executing on your profile page.
Hints: ① Your display name is printed back on your profile page — check whether it is encoded there. ② Set your name to a script payload and revisit `/profile`. ③ The payload is stored in the user record, so it fires on every view.

**R4 — CSRF on Profile & Address Changes** *(Intermediate)*
Objective: change a logged-in victim's profile from a page on another origin, with before/after evidence.
Hints: ① State-changing forms carry no token, and the session cookie has no SameSite attribute. ② A form on another origin will still be submitted with the victim's cookies. ③ Host an auto-submitting form posting to `/profile/update` (or replay the POST with a foreign `Origin` header).

## Search & Catalogue

**SE1 — SQL Injection in Product Search** *(Beginner)*
Objective: make one search request return all 20 products including stock counts, and explain why the same pattern in a SQL-backed app is worse.
Hints: ① The search term is concatenated into a query string and interpreted, not bound as data. ② Speak to it in quotes: a quote, a condition, another quote. ③ `q = ' OR '1'='1` turns the filter into "always true".

**SE2 — Reflected XSS in Search Results** *(Beginner)*
Objective: get a script payload reflected and executed from the search results page.
Hints: ① Your search term is echoed at the top of the results page. ② Check the page source: is your input encoded there? ③ Put a script payload in `q` and watch it come back as code, not text.

## Cart & Checkout

**C1 — Price Tampering at Checkout** *(Beginner)*
Objective: check out the Atlantic Salmon Fillet ($12.50) at a unit price of $0.01 and show the order total reflecting it.
Hints: ① The checkout page itself hands you editable price fields — ask why the server trusts them. ② Change the salmon's `price_8` field before submitting. ③ The order is billed at YOUR price, not the catalogue price.

**C2 — Negative Delivery-Fee Tampering** *(Beginner)*
Objective: complete an order whose "delivery fee" reduced the bill by $50.
Hints: ① The delivery fee is a number your browser sends. ② Numbers can be negative; fees become discounts. ③ Checkout with `deliveryFee=-50` and compare the total with the basket subtotal.

**C3 — Coupon Stacking & Unlimited Reuse** *(Intermediate)*
Objective: complete one order using at least 4 coupon applications (repeats allowed) in a single checkout.
Hints: ① The coupon field is more flexible than it looks — think lists. ② Codes can be comma-separated, and nothing remembers that you used one. ③ `coupon=FRESH10,GROCERY20,WELCOME15,FRESH10` compounds the discounts.

**C4 — Quantity Tampering (Negative Quantities)** *(Beginner)*
Objective: make the cart subtotal drop below $0 using only a quantity.
Hints: ① Quantities are accepted as sent — the server never asks if they make sense. ② What happens to a line total when qty is −5? ③ Add an item with a negative quantity and watch the cart total.

## Delivery Slots

**D1 — Delivery-Slot Capacity Bypass** *(Beginner)*
Objective: create an order in slot 3 (10:00–11:00) even though the UI calls it FULL, and show `/slots` reading 3/2 (or higher).
Hints: ① Full slots are only greyed out in the form — presentation, not enforcement. ② The checkout POST names the slot by id; slot 3 is FULL at 2/2. ③ Post `slotId=3` directly with curl and read `/slots` afterwards.

**D2 — Slot Reservation Race Condition** *(Advanced)*
Objective: using parallel requests, push slot 4 (capacity 3) to ≥ 6 booked, and write two sentences on why the sequential version behaves differently.
Hints: ① Checkout checks capacity, waits ~120 ms, then commits — with no lock. ② Get many requests inside that window, all seeing the same "room available". ③ Prepare several sessions with an item in the cart and fire their checkouts at slot 4 simultaneously.

## Orders

**O1 — IDOR: Another Customer's Order, Address & Phone** *(Beginner)*
Objective: logged in as Ela, open one of Monir's orders and read his delivery address and phone from the page.
Hints: ① Order ids are sequential, starting at 1001; nothing checks whose order it is. ② Log in as Ela and open one of Monir's order ids. ③ The page includes his delivery address and phone.

**O2 — Stored XSS in Delivery Note** *(Intermediate)*
Objective: place an order whose delivery note executes `alert(document.cookie)` when staff open it.
Hints: ① The delivery note is the one field every driver and admin must read. ② It is rendered without encoding on the order page, the Picker Desk and the Admin dashboard. ③ Check out with a script payload as your note and open the Picker Desk.

## Address Book

**AD1 — IDOR: Edit Another Customer's Address** *(Intermediate)*
Objective: change Monir's saved home address (id 1) while logged in as Ela, prove it, then restore it.
Hints: ① Address ids are small and sequential — Monir's Home is id 1. ② `/addresses/<id>/edit` never asks whose address it is. ③ As Ela, POST a new line/phone to `/addresses/1/edit`.

## Picker & Substitutions

**P1 — Substitution Price-Difference Fraud** *(Intermediate)*
Objective: as the picker, substitute an item in an order with the Atlantic Salmon ($12.50) while the customer is charged the original item's price; show the order line and total as evidence.
Hints: ① The substitution form asks the *client* what to charge — that is the bug. ② The picker proposes a product id AND a price; the server believes both. ③ POST the substitute with `substituteId=8` and `price` set to the original item's price.

## Platform & Data Exposure

**PL1 — Sensitive Data Exposure via /api/users** *(Beginner)*
Objective: retrieve the full user table — emails, roles, wallets and passwords — with no session at all.
Hints: ① Not every route is linked; APIs often ship with debug endpoints nobody removed. ② Try the conventional path: `/api/users`. ③ No login is needed — and look at which fields come back.

---

## Capstone

**X1 — Full kill chain.** Chain three flaws into one outcome — e.g. address IDOR (AD1) + a note payload (O2) + role tampering (S1) — to demonstrate a fake "support refund" scenario against a victim order. Document each hop and the business impact in ≤ 200 words.

**X2 — Fix & verify.** Pick any three flaws, apply the fixes from `FIX-AND-RETEST.md` in a copy of `server.js`, and show each original exploit now failing while normal shopping still works end to end.
