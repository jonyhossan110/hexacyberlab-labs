# HexaMart — Practice Guide (LAB 4 · 23 challenges)

The same 23 challenges the in-app Mission page (`/tests`) tracks, grouped
by **feature**, then difficulty. For each challenge: reproduce the issue,
capture evidence (request/response or screenshot), and write one sentence
on the business impact before moving on. The lab marks a challenge
complete only when it observes the exploit succeed — watch your progress
bar. Stuck? Every challenge has three hints (also on `/tests`), and the
in-app assistant gives step-by-step help for a feature once you've tried
that feature at least 3 times.

Setup check: `node server.js` → unlock with the Lab 3 key → open
http://127.0.0.1:3012 → login as `rahim@example.com / User@123`.

---

## 🔐 Login & Authentication

### 🟢 A2 — Brute force (no rate limiting)
- **Objective:** Prove the login never throttles: 10 failed attempts on one account, all processed normally.
- **Hints:** (1) How many wrong passwords can you try in a row before anything stops you? (2) Nothing stops you. Count to ten failures on one account. (3) Send 10+ failed logins for tanvir@example.com — the 10th is processed exactly like the 1st.
- **Success measure:** The mission page marks the test complete after the 10th consecutive failure for the same account.

### 🟢 A3 — User enumeration
- **Objective:** Demonstrate that the app confirms which emails are registered.
- **Hints:** (1) Compare the exact wording when the email doesn't exist vs when only the password is wrong. (2) Login and forgot-password answer differently for registered and unregistered emails. (3) Probe one real email (sara@example.com, wrong password) and one fake email on /login and /forgot and diff the messages.
- **Success measure:** You can quote both different responses and state how an attacker builds a target list from them.

### 🟡 A1 — SQL injection login bypass
- **Objective:** Log in as the store manager without knowing the manager's password.
- **Hints:** (1) The login still builds its query by gluing your input into a string. (2) A single quote in the email field changes the meaning of that query. (3) Try admin@hexamart.local' OR '1'='1' -- as the email, with any password.
- **Success measure:** You hold an admin session (dashboard opens) obtained from the login form alone.

### 🔴 A4 — Predictable reset token → admin takeover
- **Objective:** Set a new password for `admin@hexamart.local` by predicting its reset token.
- **Hints:** (1) Request a reset for your own account and study the token's anatomy. (2) The token contains a user ID and a counter that only moves one way. (3) Admin is user 1. After your own reset (HM-3-1001), guess HM-1-1001 — or trigger the counter forward and iterate it.
- **Success measure:** You log in as admin with a password you set through a token you were never sent.

---

## 👤 Registration & Profile

### 🟢 P2 — One-character password
- **Objective:** Create an account whose password is a single character.
- **Hints:** (1) How short can a new account's password be? (2) There is no length or complexity check anywhere in registration. (3) Register with the password 'a' — it is accepted.
- **Success measure:** A new account exists (and is logged in) with a 1-character password.

### 🟡 P1 — Mass assignment in Settings
- **Objective:** Set your loyalty balance to exactly 50,000 using only the profile update request.
- **Hints:** (1) The settings form shows three fields. The handler is less picky than the form. (2) What other fields exist on your user record? You saw them on the loyalty page. (3) Add loyaltyPoints=50000 to the POST /profile/update request.
- **Success measure:** Loyalty page shows 50,000 points after one profile save.

### 🟡 P3 — Stored XSS via profile name
- **Objective:** Store a script payload in your display name and make it execute from the profile page.
- **Hints:** (1) Your display name appears in more places than the settings form. (2) One greeting on the profile page prints your name exactly as stored. (3) Set your name to <script>alert(document.cookie)</script> and open /profile.
- **Success measure:** The payload fires on /profile; explain whose browser would run it in a real deployment.

---

## 🔎 Product Search

### 🟢 S2 — Reflected XSS in search
- **Objective:** Make a search URL that runs script in a visitor's browser.
- **Hints:** (1) After searching, the page repeats your search term back to you. (2) Check the page source: is your term encoded everywhere it appears? (3) Search for <script>alert(1)</script> and view the 'Showing results for' line.
- **Success measure:** The results page contains your payload unescaped (view-source) and it executes.

### 🟡 S1 — Search filter bypass (injection)
- **Objective:** Make a nonsense search return the entire catalogue.
- **Hints:** (1) The search page politely shows you the 'query' it built from your input. (2) Your input becomes part of that query's logic, not just its data. (3) Search for ' OR '1'='1 and watch the whole catalogue come back.
- **Success measure:** A search matching no product name returns all 24 products with the bypass notice.

---

## ⭐ Reviews

### 🟡 R1 — Stored XSS that fires for everyone
- **Objective:** Plant a review payload that executes JavaScript for other users and demonstrates session impact.
- **Hints:** (1) Reviews are shown to every shopper — and to the manager. (2) The review text is printed exactly as it was stored. (3) Post <script>alert(document.cookie)</script> as a review, then visit the product as another user.
- **Success measure:** Payload executes in a second session; you can explain how the session cookie would be replayed.

---

## 🛒 Cart

### 🟢 C1 — Break the cart total (negative quantity)
- **Objective:** Reach a cart/checkout total lower than the price of the most expensive single item in the cart.
- **Hints:** (1) Quantity inputs accept more than positive numbers. (2) What does a line with quantity −50 do to the cart total? (3) Add one item normally, then set another line's qty to −50 in /cart/update.
- **Success measure:** Cart or receipt total < highest single item price; note what happened to stock.

---

## 💳 Checkout & Payments

### 🟢 K1 — Set your own price (price tampering)
- **Objective:** Buy the Soybean Oil 5L ($9.89) for $0.10 or less.
- **Hints:** (1) The checkout form very helpfully pre-fills the unit prices for you. (2) Editable fields are trusted fields — check what the POST actually sends. (3) Change price_23 to 0.10 and place the order.
- **Success measure:** Receipt line shows unit price $0.10 and the order total matches.

### 🟢 K2 — The 90% "partner tier" (bulk discount)
- **Objective:** Buy exactly 1 item and pay at most 15% of its shelf price.
- **Hints:** (1) Bulk tiers are meant to reward quantity. Who verifies the quantity? (2) The tier travels to the server as a form value. (3) Buy one item and submit bulkDiscountPercent=90.
- **Success measure:** A receipt showing a single item with ≥ 85% discount applied.

### 🟡 K3 — Coupon compounding (stacking + reuse)
- **Objective:** Get ≥ 45% combined coupon discount on one order — or reuse one code across two orders.
- **Hints:** (1) The coupon field is free text that accepts a list. (2) What happens if a code appears twice in that list — or on every order you place? (3) Submit coupons=SAVE10,SAVE10,SAVE10 and watch one code pay out three times.
- **Success measure:** Receipt discount ≥ 45% of subtotal from coupons alone (tier = None), or the same code paying out on two separate orders.

### 🟡 K4 — Sell the shop air (oversell)
- **Objective:** Complete an order for more units of a product than exist in stock.
- **Hints:** (1) The shelf says 85 chickens. The cart does not care. (2) Nothing compares your quantity to the stock count before the order is accepted. (3) Order 500 Whole Chickens and read the stock level afterwards.
- **Success measure:** An accepted order whose quantity exceeds stock; the product's stock is negative afterwards.

---

## 📦 Orders & Receipts

### 🟢 O1 — Read someone else's order (IDOR)
- **Objective:** Open an order belonging to Sara while logged in as Rahim.
- **Hints:** (1) Your order history has a pattern in its URLs. (2) Order IDs are small sequential numbers. (3) Your order is #2 — open /orders/1 and /orders/3.
- **Success measure:** You can state the items and total of Sara's order #3 from its page.

### 🟢 O2 — Read someone else's receipt (IDOR + PII)
- **Objective:** Open Sara's receipt, with her name, email and delivery address.
- **Hints:** (1) Receipts live at a guessable address of their own. (2) A receipt shows more than an order: name, email, delivery address. (3) Open /receipt/1 while logged in as Rahim.
- **Success measure:** You can quote Sara's delivery address and order #1 total from her receipt.

---

## ⭐ Loyalty Programme

### 🟢 L1 — Free loyalty money (redemption overdraw)
- **Objective:** Turn Rahim's 240 points into at least $500 of store credit.
- **Hints:** (1) The redeem form asks how many points. It never asks how many you HAVE. (2) Your balance is checked by the page display, not by the server. (3) Redeem 1000000 points and read your new store credit.
- **Success measure:** Loyalty page shows store credit ≥ $500 with a negative points balance.

### 🟡 L2 — Steal Sara's points (transfer forgery)
- **Objective:** Move at least 1,000 of Sara's 1,320 points into your own account without her password.
- **Hints:** (1) The transfer form asks who the points come FROM. (2) Why would the sender be a form field — and who checks it? (3) Set fromEmail=sara@example.com, toEmail=your own, points=1300.
- **Success measure:** Your balance rises by ≥ 1,000 while Sara's drops correspondingly.

### 🔴 L3 — CSRF that drains loyalty points
- **Objective:** Build a standalone HTML page that, when opened by a logged-in victim in the same browser, transfers their points to you — with no clicks from the victim.
- **Hints:** (1) No state-changing form in this app carries a real anti-CSRF token. (2) A victim's browser will happily POST to the store while they visit another site. (3) An auto-submitting form plus the transfer endpoint's field names from L2 is all you need — the lab registers any marker-less state change as proof.
- **Success measure:** The victim's balance drops and yours rises after they merely open your page.

---

## 📦 Supplier Console

### 🟡 U1 — Supplier sabotage (broken access control)
- **Objective:** As the supplier, change the price of a product you do NOT own (owned by "Supplier 9") and confirm it on the public catalogue.
- **Hints:** (1) The supplier console lists more products than the supplier owns. (2) Products marked with another supplier's ID still come with a Save button. (3) Set a Supplier-9 product's price to 0.01 and check the home page.
- **Success measure:** A Supplier-9 product shows your modified price on the home page.

---

## 🛠️ Admin Panel

### 🟡 M1 — Become the store manager (cookie role tampering)
- **Objective:** Reach the `/admin` dashboard as a customer account.
- **Hints:** (1) Your session cookie is readable — and writable — by you. (2) Its value looks like '3.customer'. What is the server trusting there? (3) Change it to 3.admin and reload /admin.
- **Success measure:** Admin dashboard renders, showing total revenue and the all-users table.

---

## 🌐 Platform & Data Exposure

### 🟢 D1 — The whole customer list, no login (API exposure)
- **Objective:** Retrieve every customer's record — names, emails, phone numbers, home addresses — without any account.
- **Hints:** (1) Not every door is in the navigation. Integrations leave doors too. (2) A 'partner API' endpoint answers without asking who you are. (3) Open /api/customers in a private window — no login at all.
- **Success measure:** You hold the full JSON customer dump and can state exactly which PII fields it includes.

---

## 🏆 Capstones

### 🔴 X1 — The full-chain "free shop"
- **Objective:** In ONE order, check out a cart worth ≥ $200 (shelf prices) and pay ≤ $1.00 total.
- **Plan:** Chain at least three flaws: price tampering, tier manipulation, coupons, negative quantities, overselling and pre-funded store credit from points abuse are all combinable. Plan the order of operations (credit first).
- **Success measure:** A receipt whose shelf value ≥ $200 shows a final total ≤ $1.00. Write up which flaws chained and why each was necessary.

### 🔴 X2 — Evidence-grade report
- **Objective:** Pick any three tests from this lab and write them up as a client would receive them: title, severity with reasoning, step-by-step reproduction, business impact in money/operations terms, and a concrete fix (cross-reference FIX-AND-RETEST.md only *after* writing your own).
- **Success measure:** A reviewer can reproduce each finding from your text alone, without hints from this guide. Compare your structure with the report entries on the lab's `/complete` page.

---

*Progress, attempts and the unlock state persist in `progress.json` — you
can stop mid-way and resume. Delete that file for a completely fresh lab.*
