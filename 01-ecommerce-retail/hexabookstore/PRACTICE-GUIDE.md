# HexaBookStore (LAB 9) — Practice Guide

26 challenges, grouped by feature and ordered by difficulty inside each
feature. This mirrors the **`/tests` mission page** in the running lab —
same tests, same hints. A challenge is complete only when the lab's
server-side detection sees the exploit succeed: your progress bar moves.
There is no "mark done".

Unless a challenge says otherwise, start as **Priya**
(`priya@hexabookstore.local` / `User@123`). Tools: a browser with
developer tools (Network / Application tabs), curl, and optionally an
intercepting proxy such as Burp Suite.

> 🔒 The lab starts locked: paste the completion key from **Lab 8** to
> begin. Progress is saved in `progress.json` — restart the server
> whenever you like, your % and attempts resume. (Delete `progress.json`
> for a full reset.)

---

## Login & Authentication

### `auth-default-creds` — Default & documented demo credentials · *Beginner*
- **Objective:** Log in to the admin account without guessing anything.
- **Hints:**
  1. The login page itself tells you working usernames and passwords.
  2. Development/demo accounts (admin / `Admin@123`, customers / `User@123`) are live in this build.
  3. Log in with the documented admin credentials — on a real deployment, shipped defaults like these are the first thing attackers try.
- **Success measure:** An admin session exists (the header shows `(admin)`) using only the documented credentials.

### `auth-brute-force` — Brute force, no rate limiting · *Beginner*
- **Objective:** Prove that login failures are never throttled.
- **Hints:**
  1. How many wrong passwords can you try in a row before the store slows you down or locks the account?
  2. Try 10 wrong passwords for the same account, one after another.
  3. Nothing stops you — no delay, no CAPTCHA, no lockout. The 10th failure is processed exactly like the 1st.
- **Success measure:** The 10th consecutive failed login for one account is still processed normally.

### `auth-enumeration` — Account enumeration via reset · *Beginner*
- **Objective:** Use the forgot-password form to confirm which of two emails has an account.
- **Hints:**
  1. Ask for a password reset for an email that exists. Now ask for one that does not.
  2. Compare the two responses carefully — are they really the same?
  3. A real account gets a reset link on screen; a fake one gets a vague promise. The difference is the leak.
- **Success measure:** You observed both response shapes and can state, from the form alone, which email is registered.

### `auth-sqli-login` — SQL injection login bypass · *Intermediate*
- **Objective:** Log in as admin without knowing the admin password.
- **Hints:**
  1. The login form feeds a query that is glued together with string concatenation — what does a single quote do to it?
  2. In SQL, everything after `--` is a comment. What if the password check got commented out?
  3. Use email `admin@hexabookstore.local'--` with any password — or put `' OR '1'='1` in a field.
- **Success measure:** A session for the admin account created from an injection payload, with a wrong password.

### `auth-cookie-role` — Role tampering via unsigned cookie · *Intermediate*
- **Objective:** Open the admin dashboard as a customer, without any admin credential.
- **Hints:**
  1. Your session lives in the `hbs_session` cookie. Decode it (it is only base64) and read what is inside.
  2. The cookie carries your role, and nothing signs it. What does the server check?
  3. Change `"role":"customer"` to `"role":"admin"`, re-encode, and open `/admin`.
- **Success measure:** `/admin` returns 200 for Priya's account with a forged cookie, while her genuine cookie gets 403.

### `auth-reset-token` — Predictable password-reset token · *Advanced*
- **Objective:** Take over Omar's account (user id 3) **without** using the forgot-password form for his account.
- **Hints:**
  1. User ids are printed all over the site (library URLs, order pages). What else is predictable here?
  2. Request a reset for *yourself* and study the token format: `reset-<userId>-<what changes daily?>`.
  3. Today's token for any account is `reset-<their user id>-<day of month>`. Compute Omar's, open `/reset` with it, set a new password.
- **Success measure:** You log in as Omar with a password you set using a token you computed out-of-band.

---

## Registration & Profile

### `profile-weak-password` — 1-character passwords accepted · *Beginner*
- **Objective:** Create an account whose password is a single character.
- **Hints:**
  1. How short a password will registration accept? Try shorter and shorter.
  2. There is no length or complexity check anywhere — not at register, not at reset.
  3. Register with the password `x` (one character). The account is created.
- **Success measure:** A working account exists with a 1-character password.

### `profile-mass-assignment` — Role taken from the form · *Intermediate*
- **Objective:** Become an administrator through registration or a profile save.
- **Hints:**
  1. Registration and profile forms bind fields straight onto the user record. Which fields could the server be copying that it should not?
  2. The visible form has no role field — but nothing stops you from adding one to the request.
  3. POST `/register` (or `/profile`) with an extra field `role=admin` and watch what your account becomes.
- **Success measure:** An account you control holds the admin role as a direct result of a form field you supplied.

### `profile-name-xss` — Stored XSS via display name · *Intermediate*
- **Objective:** Store a script payload in your profile name and make it fire for other visitors.
- **Hints:**
  1. Your display name is shown in more places than your profile page. Where does it appear on other people's screens?
  2. Set your name to markup, then do something public — like posting a review.
  3. The review byline prints your name raw. Name = `<script>alert('name')</script>`, then post any review and open the book page.
- **Success measure:** A book page serves your name payload unescaped in a review byline (visible in the page source / firing in a fresh session).

### `profile-csrf` — CSRF on profile & gift actions · *Advanced*
- **Objective:** Change a victim's profile (or gift away their book) with a cross-site request riding their session.
- **Hints:**
  1. No form in this app carries an anti-CSRF token. What does a browser send automatically with every request?
  2. A logged-in victim who merely visits a hostile page can be made to POST anywhere their session works.
  3. Simulate it: POST `/profile` (or `/gift`) from a different origin — e.g. curl with an `Origin: https://evil.example` header and only the victim session cookie. The change succeeds.
- **Success measure:** A state change on `/profile` or `/gift` succeeds when the request arrives with a cross-site `Origin` and the victim's session.

---

## Search, Catalogue & Reviews

### `search-reflected-xss` — Reflected XSS in search · *Beginner*
- **Objective:** Make a script payload execute from the search results page.
- **Hints:**
  1. The results page repeats your search term back to you. In what form?
  2. View the page source around "You searched for:" — is your input encoded?
  3. Search for `<script>alert(1)</script>` and watch it execute.
- **Success measure:** The payload is reflected unescaped in the results HTML (and fires in the browser).

### `reviews-stored-xss` — Stored XSS in reviews · *Beginner*
- **Objective:** Plant a review that executes script for every visitor of a book page.
- **Hints:**
  1. Reviews are rendered exactly as typed. What survives saving?
  2. Markup first, then a script tag. View the book page in a fresh tab, logged out.
  3. Post `<script>alert('xss')</script>` as a review — it fires for every visitor of that page.
- **Success measure:** The payload persists and renders on the public book page in a fresh, logged-out session.

### `search-sqli` — Injection search leaks the hidden listing · *Intermediate*
- **Objective:** Make the catalogue reveal a book that appears on no shelf and in no normal search.
- **Hints:**
  1. The search builds its query by gluing your text into a LIKE pattern. A quote changes the pattern's meaning.
  2. Classic tautology: make the WHERE clause true for every row.
  3. Search for `' OR '1'='1` and look for a book titled "STAFF ONLY".
- **Success measure:** The results include **"STAFF ONLY — Winter Pricing Strategy 2027"** (book 16).

---

## Cart & Coupons

### `cart-coupon-stack` — Coupon stacking & unlimited reuse · *Beginner*
- **Objective:** Reach a cart discount of **40% or more** using only the published codes.
- **Hints:**
  1. Apply a coupon. Now apply the same coupon again. Now the other one.
  2. Codes are never marked used, and nothing stops duplicates — the percentages just add up.
  3. `WELCOME10` twice + `STACK20` once = 40% off. It works on your next order too.
- **Success measure:** A cart shows the same code applied twice (or a stacked discount above any single code's value).

### `cart-qty-tamper` — Quantity tampering · *Intermediate*
- **Objective:** Get the store to accept a negative (or absurd) cart quantity and honour it in totals.
- **Hints:**
  1. The cart lets you set a quantity directly (POST `/cart/setqty`). What values does the server accept?
  2. Quantities feed totals and fulfilment. What does a negative quantity do to a sum?
  3. Set a quantity to `-2` (or `100000`) — the server stores it without blinking, and checkout maths obey it.
- **Success measure:** A cart line holds a quantity < 1 or > 50 and the totals are computed from it.

---

## Checkout & Orders

### `checkout-price-tamper` — Price tampering at checkout · *Beginner*
- **Objective:** Complete an order at a price you chose.
- **Hints:**
  1. The checkout form carries the prices with it, in hidden fields. Hidden from whom?
  2. Intercept the checkout POST and read the `price_<item>` fields.
  3. Change `price_<cid>` from 12.99 to 0.50 — the order total believes you.
- **Success measure:** An order exists whose line price differs from the catalogue price (and the book was still granted).

### `orders-idor` — Order IDOR · *Beginner*
- **Objective:** Read Omar's seeded order (#1002) while logged in as Priya.
- **Hints:**
  1. Order ids are sequential, starting at 1001. Your own order page is `/orders/<id>`.
  2. The page checks that someone is logged in — does it check who owns the order?
  3. As Priya, open `/orders/1002` — Omar's order, with his email, items and prices.
- **Success measure:** Omar's order detail (total $24.49) renders in Priya's session.

### `checkout-edition-upgrade` — Edition-upgrade flaw · *Intermediate*
- **Objective:** Own the **Collector** edition of *Salt & Cinder* while paying the Paperback price.
- **Hints:**
  1. The checkout form also carries a `grantEdition_<item>` field — what is granted versus what is charged?
  2. Paying for one edition and receiving another is a fulfilment decision the browser is making.
  3. Add the Paperback to the cart, then change `grantEdition_<cid>` to `Collector` at checkout. You pay Paperback; Collector lands in your library.
- **Success measure:** Your library holds *Salt & Cinder* (Collector) from an order whose paid edition/price is Paperback.

---

## Preorders

### `preorder-price-bypass` — Price-lock bypass · *Beginner*
- **Objective:** Preorder *The Hollow Crown Protocol* for $0.01.
- **Hints:**
  1. The "locked" preorder price reaches the server as a hidden form field.
  2. If the lock travels through the browser, the browser holds the key.
  3. Submit the preorder with `price=0.01` instead of `19.99`.
- **Success measure:** A preorder order exists with total $0.01 for a title whose locked price is $19.99.

---

## Library, Ebooks & Gifts

### `library-ebook-read` — Ebook without purchase · *Beginner*
- **Objective:** Read the full text of *Salt & Cinder* (book 2) with no account and no purchase.
- **Hints:**
  1. Your library's Read button uses `/read/<bookId>`. Does the server ask who you are — or what you own?
  2. It does not even ask for a login.
  3. Open `/read/2` with no account at all: the full text of a book you never bought.
- **Success measure:** The full text of book 2 is served to a requester who does not own its Ebook edition.

### `library-idor` — Library IDOR · *Beginner*
- **Objective:** List every book in Priya's library while logged in as Omar.
- **Hints:**
  1. The library page itself links to other readers. Compare "My Library"'s URL with theirs.
  2. `/user/<id>/library` — the id is the only thing standing between you and a stranger's bookshelf. Nothing is standing there.
  3. As Omar, open `/user/2/library` and read Priya's complete library.
- **Success measure:** Another reader's full library (books + editions) renders in your session.

### `library-gift-flaw` — Gift duplication · *Intermediate*
- **Objective:** Give Lena a book "from" Omar's library — while Omar keeps his copy.
- **Hints:**
  1. The gift form hides a `fromUser` field: the "source library" is whatever the client claims.
  2. The server never checks that the source is you — or that the book is even in that library.
  3. As Priya, POST `/gift` with `fromUser=3` (Omar), `bookId=7`, `toEmail=lena@…` — Lena gains the book, Omar keeps his. Duplication, not transfer.
- **Success measure:** Lena's library gains *The Silent Compiler* and Omar's copy is still there.

---

## Files & Downloads

### `files-avatar-upload` — Unrestricted avatar upload · *Intermediate*
- **Objective:** Host an HTML page of your own on the store's origin.
- **Hints:**
  1. The avatar upload accepts any file type and serves it back from `/avatar/<your-id>`.
  2. What content type does the server give an `.html` file?
  3. Upload `evil.html` with a script inside, then open `/avatar/<your-id>` — your page, hosted on the store's own origin.
- **Success measure:** Your uploaded `.html` is served from `/avatar/<id>` with content type `text/html`.

### `files-traversal` — Path traversal in sample downloads · *Intermediate*
- **Objective:** Read a file that lives outside the `samples/` folder through the sample download.
- **Hints:**
  1. Sample chapters are served by `/sample?file=<name>` from a samples folder. The name is joined into a path unsanitised.
  2. What does `../` mean to a filesystem path?
  3. Request `/sample?file=../server.js` — the application's own source code comes back.
- **Success measure:** The endpoint returns the contents of `../server.js` (or `../progress.json`).

---

## Admin Panel

### `admin-data-export` — Data export open to any customer · *Intermediate*
- **Objective:** Download the full customer + password dump as an ordinary customer.
- **Hints:**
  1. There is an export endpoint for support: `/admin/export`. It asks whether you are logged in. Does it ask whether you are an admin?
  2. Your ordinary customer session is enough.
  3. As Priya, open `/admin/export` — every customer, email and password, plus all orders, in one response.
- **Success measure:** The export JSON (including `Admin@123`) is served to a non-admin session.

---

## Platform & Hardening

### `platform-headers` — Missing security headers · *Beginner*
- **Objective:** Show that the store's responses carry no browser security protections.
- **Hints:**
  1. Look at any response's headers (curl -I or dev tools). What is NOT there?
  2. No Content-Security-Policy, no X-Frame-Options / frame-ancestors, no X-Content-Type-Options.
  3. The store can be framed by any site (clickjacking) and browsers will happily sniff content types.
- **Success measure:** A captured response header block with CSP, X-Frame-Options and X-Content-Type-Options all absent. (The lab scores this automatically the first time it serves you a page — observing responses is the test.)
