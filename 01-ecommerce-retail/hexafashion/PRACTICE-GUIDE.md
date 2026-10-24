# HexaFashion — Practice Guide

Hands-on challenges for **LAB 2 — HexaFashion** (http://127.0.0.1:3010). The app's **🎯 Tests page mirrors this guide exactly**: the same challenges, grouped by feature, with the same three graded hints — and it ticks each challenge off automatically when the server detects your exploit succeeding. There is no "mark done" button anywhere; the only way to complete a test is to perform it.

**Before you start:** the lab opens with a lock screen. Paste the completion key from Lab 1 (HexaShop) to unlock it.
**Test accounts:** admin `admin@hexafashion.local / Admin@123` · customers `aisha@hexafashion.local / User@123`, `karim@hexafashion.local / User@123`.
**Reset:** restart the server to reset the shop data; your test progress is saved in `progress.json` and survives restarts (delete that file for a completely fresh lab).
**Stuck?** The 💬 Lab Assistant gives step-by-step guidance for a feature once you have tried that feature at least 3 times.

Hints are graded: Hint 1 nudges, Hint 2 points, Hint 3 nearly answers. Try to use as few as possible.

---

## 🔐 Login & Authentication

### A1. SQL Injection Login Bypass — *Intermediate* (Vuln #15)
- **Task:** Log in as the admin without knowing the admin password, by attacking the login form itself.
- **Hints:** ① The login was rebuilt on a legacy query path that still builds its query as a string. ② Try the classic: closing the quote and adding a condition that is always true, like `' OR '1'='1`. ③ Use the email field: `admin@hexafashion.local' OR '1'='1'` — the password is never really checked when the injected condition is true.
- **Measurable objective:** An admin session is created from the injected login (test flips to DONE; you can open `/admin` with it).

### A2. No Brute-Force Protection on Login — *Beginner* (Vuln #16)
- **Task:** Prove the login form can be attacked at machine speed.
- **Hints:** ① Nothing slows you down on the login form — no lockout, no delay, no CAPTCHA. ② Script 10 or more wrong-password attempts against one account, e.g. with a curl loop. ③ Watch them all get processed one after another. The flaw is proven by the attempts being accepted, not by guessing right.
- **Measurable objective:** At least 10 consecutive failed logins against one account are all processed without any throttle, lockout or challenge.

### A3. Account Enumeration via Login & Reset — *Beginner* (Vuln #17)
- **Task:** Determine whether a given email address holds an account — without logging in.
- **Hints:** ① Compare the failure message for a real email with the message for an email that does not exist. ② Try the same comparison on the Forgot password form. ③ When the two answers differ, the site itself is telling you which emails have accounts.
- **Measurable objective:** You can correctly classify one existing and one non-existing email using only the responses of the login and/or forgot-password endpoints.

### A4. Predictable Password-Reset Token — *Intermediate* (Vuln #11)
- **Task:** Reset the admin password without access to the admin inbox, then log in as admin.
- **Hints:** ① Trigger a reset for the admin email, then think about what the token could be built from. ② It is derived from things you already know about the account — their email and a small number. ③ `base64(email) + "." + userId`. You can compute the admin's token offline and never touch their inbox.
- **Measurable objective:** A working admin session obtained with an offline-computed reset token; be able to state the token properties (random, expiring, single-use) that would have prevented it.

### A5. Session Cookie Role Tampering — *Intermediate* (Vuln #6)
- **Task:** Reach `/admin` as Aisha by changing something your browser stores.
- **Hints:** ① Look at what your session cookie actually contains — it is only encoded, not signed. ② Decode it. One of the fields describes your role, and the server believes it. ③ Change `"customer"` to `"admin"`, re-encode, and visit `/admin`.
- **Measurable objective:** The admin dashboard returns 200 with a self-forged cookie while the account's real role in the database is still `customer`.

---

## 👤 Registration & Profile

### P1. Weak Password Policy at Registration — *Beginner* (Vuln #18)
- **Task:** Create the weakest account the site will accept.
- **Hints:** ① The registration form asks for a password but never judges it. ② Try creating an account with a 1-character password. ③ It is accepted. Accounts this weak fall to the first guessing attempt.
- **Measurable objective:** A registered, working account whose password is shorter than 8 characters.

### P2. Mass Assignment on Profile Update — *Intermediate* (Vuln #7)
- **Task:** Become admin (and top-tier loyalty) by adding fields to a routine form submission — after a reset, without touching your cookie.
- **Hints:** ① The profile form shows three fields. The endpoint saves far more than three. ② Intercept the profile save and add fields the form never offered. ③ Try `isAdmin=true`, `role=admin`, `loyaltyTier=PLATINUM` — then reload your profile and visit `/admin`.
- **Measurable objective:** Profile shows **Admin flag: true** / **Loyalty tier: PLATINUM** after one ordinary profile POST, and `/admin` opens.

### P3. CSRF on Profile Change — *Intermediate* (Vuln #10)
- **Task:** Change a logged-in victim's delivery address from a page the victim merely visits.
- **Hints:** ① The profile form carries a marker field — but check whether the server actually verifies it. ② A cross-site auto-submitting form cannot know your marker value, yet the request still works. ③ Send the profile POST without the `hx_marker` field (or from another origin) while logged in: the address changes anyway.
- **Measurable objective:** A profile change is accepted from a request carrying no valid session marker — a self-contained malicious HTML page changes the victim's address. **Stretch:** chain it with P2 to set `isAdmin=true`.

---

## 🛍️ Catalogue, Search & Reviews

### C1. SQL-Injection-Style Search Bypass — *Intermediate* (Vuln #9)
- **Task:** Use the search box to list products that never appear in the public catalogue — and then the users table.
- **Hints:** ① The search builds its query like: `... LIKE '%<input>%' AND hidden = 0`. ② Close the quote and make the condition always true: `' OR '1'='1'` — suddenly the hidden filter is meaningless. ③ Go further with a `UNION SELECT` and the result page will happily print rows from the users table.
- **Measurable objective:** At least one hidden DRAFT product (with its internal cost) retrieved via search alone, plus one row of user data via the UNION variant.

### C2. Reflected XSS in Search Results — *Beginner* (Vuln #19)
- **Task:** Make the search page execute JavaScript supplied in the search URL.
- **Hints:** ① Look closely at the search page: one place prints your search term back to you without encoding it. ② Search for a script payload instead of a product. ③ Your input comes back as live HTML in the "Showing results for:" line — that is reflected XSS.
- **Measurable objective:** A payload such as `<script>alert(document.domain)</script>` executes from the search results page; you can explain how a crafted link weaponises it.

### C3. Stored XSS in Product Reviews — *Intermediate* (Vuln #8)
- **Task:** Post a review that runs JavaScript in the browser of every later visitor of that product page.
- **Hints:** ① Write a review. Then compare how your name is rendered next to it versus how your review text is rendered. ② One of them is escaped. The other is stored and printed raw. ③ Post `<script>alert(document.cookie)</script>` as a review — it executes for every later visitor of that product.
- **Measurable objective:** The payload fires in a second session (or the admin's) viewing the product; be able to explain why output encoding is the fix.

---

## 🧾 Cart & Checkout

### K1. Price Tampering at Checkout — *Beginner* (Vuln #1)
- **Task:** Place an order for the Leather Biker Jacket ($199.99) with an order total of **$0.01 or less**.
- **Hints:** ① Go to checkout and inspect the form — the prices travel with the request as hidden fields. ② The server builds your total from the numbers you send it. So send different numbers. ③ Change the jacket's price field to `0.01` and place the order. You just bought it for a cent.
- **Measurable objective:** An order record whose total is ≤ $0.01 for a $199.99 catalogue item.

### K2. Size-Variant Surcharge Manipulation — *Intermediate* (Vuln #2)
- **Task:** Order an XL item so the final total is **lower than the product's base price**, without touching the `price` field.
- **Hints:** ① XL sizes carry an extra charge. That charge also travels as a hidden checkout field. ② A field the server adds can be edited — and nothing says it must stay positive. ③ Set `surcharge` to `-50` on an XL item: the "extra charge" becomes a discount below the base price.
- **Measurable objective:** An order containing an XL item charged below its base price, achieved only via the surcharge field.

### K3. Negative Quantity at Checkout — *Intermediate* (Vuln #20)
- **Task:** Make the store pay you: check out with a negative line quantity.
- **Hints:** ① The cart form clamps quantity to at least 1 — but checkout reads its own qty fields straight from the request. ② Intercept the checkout POST and set one qty to a negative number. ③ The line total goes negative: the store starts paying you to take items.
- **Measurable objective:** A completed order containing an item with a negative quantity, reducing the order total.

### K4. Overselling Beyond Stock — *Intermediate* (Vuln #21)
- **Task:** Buy more of a size than the shop owns.
- **Hints:** ① Each size shows a small stock number. Checkout never asks whether that number can cover your order. ② Order far more of a size than exists — e.g. 999 of a size with 4 in stock. ③ The order is placed in full. The shop has sold stock it does not have.
- **Measurable objective:** An accepted order whose quantity for one size exceeds that size's catalogue stock.

### K5. Coupon Stacking & Unlimited Reuse — *Beginner* (Vuln #13)
- **Task:** Place an order discounted by **more than 80%** using only coupon codes — no price-field editing.
- **Hints:** ① The coupon box accepts a comma-separated list. Try more than one code. ② Nothing deduplicates the list. Nothing remembers you used a code before, either. ③ `VIP50,VIP50,VIP50` takes 87.5% off — and the same codes work again on your next order, forever.
- **Measurable objective:** An order with >80% total discount produced purely by stacking/repeating codes, and the effective discount calculated from the order record.

---

## 📦 Orders & Invoices

### O1. IDOR — Other Customers' Orders & Invoices — *Beginner* (Vuln #3)
- **Task:** Logged in as Aisha (order #1001), view the full details **and the invoice** of an order that is not yours.
- **Hints:** ① Your order is #1001. Order IDs are just numbers in the URL. ② Change the number. What stops you from reading #1002? ③ Nothing does — and the invoice page has the same hole, email and address included.
- **Measurable objective:** Another customer's order detail and invoice rendered in your session; list exactly which personal data leaked.

---

## ↩️ Returns & Refunds

### R1. IDOR — View & Approve Other Customers' Returns — *Beginner* (Vuln #4)
- **Task:** As customer Aisha, change the status of Karim's pending return #501 to Approved — without the admin account.
- **Hints:** ① Browse the Returns section while logged in as a normal customer. Whose requests are listed? ② Open one that is not yours. The Approve button is right there. ③ A customer can approve refunds — including their own — because nobody checks who is clicking.
- **Measurable objective:** Return #501's status reads "Approved…" after action by a non-admin, non-owner account; name the missing server-side check.

### R2. Refund-Amount Tampering — *Intermediate* (Vuln #5, chained with R1)
- **Task:** Create a return whose approved refund is **at least 10×** the order's actual total.
- **Hints:** ① The return form pre-fills the refund amount with the order total. Pre-filled is not enforced. ② Edit the amount to `9999` on a $29.99 order and submit. ③ Approve it (see R1) — the system records a $9,999 refund on a $29.99 purchase.
- **Measurable objective:** An approved return record whose refund exceeds the purchase price by ≥10×; identify the two missing validations that allowed it.

---

## 🎁 Gift Cards

### G1. Gift-Card Code Enumeration — *Beginner* (Vuln #14)
- **Task:** Find the balance of at least **five** gift cards you do not own, using only the balance-check endpoint.
- **Hints:** ① The balance checker answers anyone, instantly, with the exact balance. ② The shop itself hints the codes live in the `HF-100x` range — codes are sequential. ③ Script the range: five or more balance lookups in a row and every card's value is yours to spend.
- **Measurable objective:** A table of ≥5 valid codes with balances, obtained unauthenticated; explain why sequential IDs + no throttling = theft.

---

## 📁 File Upload & Download

### F1. Unrestricted Avatar Upload — *Advanced* (Vuln #12)
- **Task:** Get the server to store and serve an HTML (or SVG) file of yours under `http://127.0.0.1:3010/uploads/…` so its script executes in the shop's origin.
- **Hints:** ① The profile-photo uploader never asks what kind of file you gave it. ② Upload a file named `avatar.html` containing a script payload. ③ It is served back from /uploads/ as `text/html` — script running in the shop's own origin.
- **Measurable objective:** Attacker-controlled active content served from the trusted origin; describe two server-side controls (allow-list + inert serving) that kill this class.

### F2. Path Traversal in File Download — *Intermediate* (Vuln #23)
- **Task:** Use the download endpoint to read a file it was never meant to serve.
- **Hints:** ① The /download endpoint is meant to serve exactly one file: logo.png. ② It joins your name parameter into a path without checking where that path ends up. ③ Try `name=server.js` — or walk up with `../` and read files that were never meant to be downloads.
- **Measurable objective:** The contents of a non-logo file (e.g. `server.js` or `progress.json`) returned by `/download`.

---

## 🛡️ Admin Panel

### D1. Stored XSS Reaching the Admin Panel — *Advanced* (Vuln #22)
- **Task:** Execute JavaScript in the admin's browser via your customer name.
- **Hints:** ① Admins have a Customers page. Customer display names are rendered there exactly as stored. ② Set your profile (or registration) name to a script payload. ③ When an admin opens the Customers page, your name executes in their browser — session theft at the highest privilege level.
- **Measurable objective:** A payload name stored on your account and rendered unescaped on `/admin/customers`; explain why admin views must encode too.

---

## 🔌 Platform & API

### X1. Unauthenticated Customer Data Exposure API — *Beginner* (Vuln #24)
- **Task:** Download the store's entire customer table — no login allowed.
- **Hints:** ① Not everything lives behind the login. Some endpoints answer with no session at all. ② Probe the API namespace: `/api/users`. ③ The whole customer table — emails, roles, even plaintext passwords — is returned to anyone who asks.
- **Measurable objective:** A JSON response from `/api/users` obtained with no session cookie, containing at least one plaintext password.

---

## 🏁 Finishing the lab

When all 24 tests are DONE, the **🏁 Complete** page unlocks your full summary — features and counts, the techniques you used, what you learned, what each finding would mean for a real client, and how each is written in a real pentest report — plus the **key for Lab 3** and your **certificate of completion** (add your name on the completion page first). Cross-check your understanding of the fixes against `FIX-AND-RETEST.md`.

**Scoring yourself**
- **Beginner complete:** you can explain *why* the server trusted you in each case.
- **Intermediate complete:** you can chain any two flaws and predict which records a given flaw exposes.
- **Advanced complete:** your R1+R2 / A5 / F1 write-up would let a developer fix every issue you used.
