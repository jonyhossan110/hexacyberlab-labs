# HexaAutoParts — Practice Guide

**LAB 8 of the HexaCyberLab Category-1 chain.** A complete auto-parts store with
**22 security tests across 11 features**. Tests are grouped below by feature (the
order the in-app `/tests` mission page uses), each with graded hints and a
measurable objective.

## How this lab works

- **Unlock:** Lab 8 starts locked. Paste the completion key you earned at 100% in
  Lab 7 on the gate to begin.
- **Progress:** every test is **detected by the lab itself** when the exploit
  actually succeeds — there is no "mark done" button. The header bar always shows
  your %; `GET /api/progress` returns the full state.
- **Persistence:** progress and attempts are saved to `progress.json` as you go.
  Close the lab, come back tomorrow, restart the server — you resume exactly
  where you left off. (Delete `progress.json` to reset to a fresh, locked lab.)
- **Hints:** each test below (and on `/tests`) has 3 graded hints — nudge,
  stronger, near-answer. Reveal one at a time.
- **Lab Assistant:** the chat widget (bottom-right) knows every feature and test.
  It answers counts and names freely, but **step-by-step help for a feature
  unlocks only after you have genuinely tried that feature at least 3 times** —
  it can see your attempts and will tell you the count. It does **not** have the
  completion key before you finish: the key is assembled only at 100%.
- **Finish:** at 100%, `/complete` gives the full debrief (features, per-feature
  vulnerability counts, techniques used, lessons, client impact, and how each
  finding is written in a real report) plus the **key for Lab 9** and your
  **certificate**.

## Setup

```bash
node server.js
# → http://127.0.0.1:3016  (binds localhost only)
```

Accounts: admin@hexaautoparts.local / Admin@123 · garage@hexaautoparts.local /
Trade@123 · dewan@ / sara@ / omar@hexaautoparts.local / User@123.
Useful seeds: Dewan's vehicles — Corolla 2016 (id 1), Golf 2017. Sara's quote
#501, Sara's order #1001, Omar's order #1002. Coupons: PARTS15, TRADE10, GARAGE25.

**Rules of the lab:** the store binds `127.0.0.1` only and all data is
synthetic. Never point these techniques at a system you don't own or have
explicit permission to test.

---

## Login & Authentication

### SQL Injection Login Bypass · Intermediate
- **Objective:** hold a valid session for an account whose password you do not know (the lab detects the injected login).
- **Hints:** 1) The legacy login builds its query by gluing your input into a string — think about what a quote character does to it. 2) Try the email field: a valid email followed by a quote and a boolean condition. 3) Email: admin@hexaautoparts.local' OR '1'='1 — any password. The glued-together query now matches the admin row.

### Brute Force — No Login Throttling · Beginner
- **Objective:** get 10 failed logins for one account processed with no slowdown, lockout or challenge (the lab counts the 10th unthrottled failure).
- **Hints:** 1) Logins are answered one after another, forever — nothing slows you down or locks the account. 2) Script ten wrong passwords for dewan@hexaautoparts.local in a row and watch every one get processed. 3) After the 10th failed attempt is still accepted for processing, the lab counts the flaw as proven — there is no rate limit, CAPTCHA or lockout anywhere.

### User Enumeration via Password Reset · Beginner
- **Objective:** prove, from the app's own responses, whether a given email is registered (submit one existing and one non-existing email to /forgot).
- **Hints:** 1) Ask the forgot-password page about two different emails and compare the answers word for word. 2) Try one email that exists (sara@hexaautoparts.local) and one that cannot (nobody@nowhere.test). 3) The two responses differ — one confirms the account exists. That difference is the enumeration oracle.

### Predictable Password-Reset Token · Intermediate
- **Objective:** reset another user's password using a token you computed offline, while logged out.
- **Hints:** 1) The reset token is not random — it is computed from something you already know about the victim. 2) Request a reset for Sara, then look at the token in the simulated inbox link and stare at the email address next to it. 3) Token = first 10 hex characters of the hex encoding of the email address. Compute it for any user — even the admin — and use /reset directly.

## Registration & Profile

### Mass Assignment — Self-Service Role Upgrade · Intermediate
- **Objective:** create an account whose role is trade or admin without any admin involvement.
- **Hints:** 1) The registration handler builds the new account from whatever fields you POST — not just the ones on the form. 2) Add a field the form never shows you. What field decides what kind of account you get? 3) POST /register with an extra role=admin field (Burp or curl). The server happily creates an admin.

### No Password Policy at Registration · Beginner
- **Objective:** register an account with a one-character password.
- **Hints:** 1) Registration asks for a password — but does it ever say no? 2) Try the shortest password the form will accept. 3) Register a new account with the password "x" — one character. It succeeds: there is no length or complexity policy at all.

## Fitment Search

### SQL-Injection-Style Fitment Search Bypass · Intermediate
- **Objective:** make the part finder return parts its own filter would never show you (the tautology returns all 19 parts).
- **Hints:** 1) The legacy part finder glues your search term into a query string — and even shows you the query it built. 2) A quote followed by OR and a true condition changes what the query means. 3) Search for: brake' OR '1'='1 — every one of the 19 parts comes back, whatever your vehicle.

### Reflected XSS in Part Finder · Beginner
- **Objective:** get a script payload reflected into the results page as live markup.
- **Hints:** 1) Search for something distinctive and look at how the results page repeats it back to you. 2) The results heading echoes your term without any encoding. 3) Search for <script>alert(1)</script> — it lands in the page as live markup, not text.

## VIN Lookup

### VIN Lookup Exposes Owner PII · Beginner
- **Objective:** retrieve a stranger's name, home address, phone and service history with no account at all.
- **Hints:** 1) The VIN lookup is free, public and very talkative. 2) You do not need an account. Try the first VIN you can guess: HAP20261001. 3) One lookup hands you the owner's name, home address, phone and full service history.

### VIN Registry Enumeration · Beginner
- **Objective:** resolve at least 5 distinct sequential VINs to full owner records.
- **Hints:** 1) Look at the shape of a VIN: a fixed prefix and a short number that only goes one direction. 2) HAP20261001 exists. What about ...1002? ...1003? How high does it go? 3) Step through five or more sequential VINs — the whole 12-record registry can be harvested with a tiny loop.

## Product Q&A

### Stored XSS in Product Q&A · Intermediate
- **Objective:** store a script payload that the product page serves raw to other visitors.
- **Hints:** 1) The Q&A box stores exactly what you type and shows it to everyone who opens the part — including admins. 2) Ask a "question" that is not really a question: something with angle brackets and an event handler. 3) Post <script>alert(document.cookie)</script> as a question on any part. It is stored raw and fires for every visitor.

## Cart & Checkout

### Fitment Check Bypass at Checkout · Intermediate
- **Objective:** complete an order for a part that does not fit the selected vehicle (e.g. part 2 for Dewan's Corolla).
- **Hints:** 1) The checkout page warns you about incompatible parts and hides the button. Ask yourself: who is doing the checking — your browser or the server? 2) The warning lives in the page. The order endpoint never re-checks compatibility. 3) Put the F-150-only Vented Brake Rotor (part 2) in Dewan's cart, then POST /checkout directly with vehicleId=1 — or use the direct-buy partId=2&qty=1.

### Trade-Pricing Bypass via accountType · Intermediate
- **Objective:** as a retail account, complete an order priced at trade rates (brake pads at $41.99 instead of $59.99).
- **Hints:** 1) Checkout decides your price tier from a field in the request — read the hidden inputs on the checkout page. 2) One of them names your account type. The server believes whatever it says. 3) POST /checkout as retail Dewan with accountType=trade — brake pads drop from $59.99 to the $41.99 trade price.

### Price Tampering at Checkout · Beginner
- **Objective:** complete an order at a unit price you chose (e.g. price_1=0.01).
- **Hints:** 1) The checkout form renders each unit price as an editable input. Editable by whom? 2) The server totals the order from the prices you POST, not from the catalogue. 3) POST /checkout with price_1=0.01 for the brake pads — the order is created at your price.

### Negative Quantity Tampering · Intermediate
- **Objective:** create an order with a negative quantity and a negative total (direct-buy partId=3&qty=-5).
- **Hints:** 1) Direct-buy checkout takes a quantity straight from the request. Quantities are numbers — and numbers can be negative. 2) What happens to the total when qty is below zero? And to the stock count? 3) POST /checkout with partId=3&qty=-5 — the order is created with a negative quantity and a negative total.

### Unlimited Coupon Reuse · Beginner
- **Objective:** get the same coupon code accepted on two different orders from the same account (e.g. GARAGE25 twice).
- **Hints:** 1) The coupon box accepts codes like GARAGE25. The interesting question is what the server remembers about them. 2) Use the same code on one order. Then use it on the next. And the next. 3) There is no redemption ledger: GARAGE25 (25% off) applies on every order, forever. The lab counts the second successful use by the same account.

## Orders

### Order IDOR — Read Any Customer's Order · Beginner
- **Objective:** view the full details of an order that belongs to another customer (e.g. #1002 while logged in as Dewan).
- **Hints:** 1) Order pages live at predictable addresses: /order?id=1001, 1002, … Whose orders are those? 2) Log in as Dewan and ask for an order number that is not yours. 3) Open /order?id=1002 — Omar's order renders in full, because the page never checks ownership.

## Quotes

### Quote IDOR — View & Accept Others' Quotes · Intermediate
- **Objective:** read another customer's negotiated quote (and, for full effect, accept it so the order lands on your account at their price).
- **Hints:** 1) Quotes have IDs too, and negotiated prices are supposed to be confidential. 2) Sara's open quote is #501. What stops you from opening it — or accepting it? 3) Open /quote?id=501 as Dewan, then POST /quote/accept with quoteId=501 — her $198 alternator quote becomes your order.

## Returns

### Returns IDOR — File Returns on Others' Orders · Intermediate
- **Objective:** open a return against an order you do not own (e.g. orderId=1002 as Dewan).
- **Hints:** 1) The return form asks for an order ID. It never asks whose order it is. 2) You already know a stranger's order number from the Orders test. 3) POST /returns with orderId=1002 (Omar's) and any reason — the refund workflow opens against his order.

## Profile & Garage

### CSRF on Profile & Vehicle Changes · Intermediate
- **Objective:** change a logged-in victim's settings (or garage) with a request that originates outside the app — the lab accepts a foreign `Origin` as the cross-site proof.
- **Hints:** 1) Your browser sends your session cookie to this site automatically — even when a form on a different site asks it to. 2) The settings and vehicle forms have no anti-CSRF token, no SameSite cookie, no Origin check. 3) Host a page that auto-submits a POST to /settings (or /vehicles) with a foreign Origin while a victim is logged in — their profile changes silently. For the lab, send the same POST with header Origin: https://evil.example.

## Admin & Platform

### Role Tampering via Cookie → Admin · Beginner
- **Objective:** open the full admin dashboard as a non-admin account, without any password change (role cookie = admin).
- **Hints:** 1) After login, look at the cookies the site sets. One of them says what you are. 2) It is plain, unsigned, and the server trusts it more than its own database. 3) Change the role cookie from retail to admin and reload /admin — the full dashboard opens.

### Unauthenticated Customer Data Export · Beginner
- **Objective:** download the full customer list (names, emails, addresses, phones) with no session at all.
- **Hints:** 1) Not every sensitive page is linked in the nav. APIs and exports are easy to forget — and easier to find. 2) Try the customers export the admin tooling uses: /api/customers. 3) It answers with every customer's name, email, address and phone — no login required at all.

---

## Capstone chains (after the individual tests)

### C1 — Full admin takeover
Chain the Product Q&A stored XSS (steal a session context) with the cookie role
tamper and the predictable reset token: three different roads to the same admin
dashboard. Which would survive longest in a real engagement, and why?

### C2 — The cheapest possible order
Combine trade-pricing bypass + price tampering + coupon reuse on one order and
compute the total margin loss vs list price. Then write the one-paragraph
business-impact summary you would put in a client report.

### C3 — Fix & retest (defensive capstone)
Work through [FIX-AND-RETEST.md](FIX-AND-RETEST.md): patch the flaws in a copy
of the lab and re-run every attack. All 22 regression tests must PASS on your
fixed build while the normal shopping journeys still work.

## Scoring yourself

- **22/22 = 100%** — the lab itself certifies this: `/complete` unlocks, the
  Lab 9 key is revealed, and your certificate is issued.
- Track your attempts honestly: the Assistant's 3-try rule exists because
  struggling first is where the learning is. Note how many hints (0–3) each
  test cost you; revisit the expensive ones after a week.
