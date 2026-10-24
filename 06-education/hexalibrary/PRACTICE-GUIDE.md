# HexaLibrary — PRACTICE GUIDE

Challenges for LAB 56, grouped by feature, each with graded hints and a measurable objective. The Mission Board at `/tests` mirrors this guide. A challenge counts as solved only when the server detects the real exploit effect.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** Make the server register the real effect of this flaw (SQL Injection in Member Login (Authentication Bypass)) so the test flips to done on /tests.
- **Hints:**
  1. The login builds its member lookup by gluing your input straight into a query string.
  2. Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.
  3. Submit email: ' OR '1'='1 and any password. The glued-together query matches the first member row — the admin.
- **You will learn:** String-built queries let an attacker rewrite the login logic itself; the first row in the table becomes their identity.

### [Beginner] Brute Force — No Rate Limiting or Lockout
- **Objective:** Make the server register the real effect of this flaw (Missing Brute-Force Protection on Login) so the test flips to done on /tests.
- **Hints:**
  1. Pick one member account and keep guessing its password.
  2. Notice that nothing slows you down, warns you, or locks the account — count your failures.
  3. Fail 10 logins in a row for the same account. The 10th failure is still processed like the first — there is no throttle at all.
- **You will learn:** Without throttling or lockout, password guessing is limited only by the attacker’s patience.

### [Beginner] User Enumeration via Login & Reset Responses
- **Objective:** Make the server register the real effect of this flaw (Account Enumeration Through Differential Auth Responses) so the test flips to done on /tests.
- **Hints:**
  1. Compare the error you get for an email that exists with one that does not.
  2. The forgot-password form answers differently too — one says a token was sent, the other says no such account.
  3. Probe at least 5 different emails across login / forgot-password and note which ones are confirmed as real accounts.
- **You will learn:** Different error messages for "no such account" vs "wrong password" hand attackers a verified list of real users to target.

### [Beginner] Default Demo Account Credentials
- **Objective:** Make the server register the real effect of this flaw (Default Demo Credentials Active (demo / demo)) so the test flips to done on /tests.
- **Hints:**
  1. The platform ships with a demo member account for trying the catalog.
  2. Demo accounts usually keep the password they were born with — the same word as the account name.
  3. Log in as demo@hexalibrary.local with the password: demo.
- **You will learn:** Shipped default and demo credentials survive into production surprisingly often, and attackers try them first.

### [Intermediate] Predictable Password Reset Token
- **Objective:** Make the server register the real effect of this flaw (Predictable Password Reset Tokens) so the test flips to done on /tests.
- **Hints:**
  1. Request a reset for your own account and look at the shape of the token the form expects.
  2. The token is derived from the account itself — think member id arithmetic, not randomness.
  3. Tokens look like LIB-<id*271+13>. Member ids are printed all over the member directory — compute any member’s token and reset their password.
- **You will learn:** A reset token must be unguessable and random; deriving it from a public identifier makes it a password-change form for strangers.

### [Intermediate] Role Cookie Tampering (hx_role)
- **Objective:** Make the server register the real effect of this flaw (Client-Controlled Role Cookie Trusted for Authorization) so the test flips to done on /tests.
- **Hints:**
  1. After logging in, inspect the cookies the app sets — one of them repeats your role.
  2. Some pages trust that cookie instead of checking your account on the server.
  3. As a plain member, set the hx_role cookie to "librarian" or "admin" and open /librarian — the gate believes the cookie, not your account.
- **You will learn:** Authorization data must live server-side; anything the client sends back — cookies included — can be edited by the client.

## Registration & Profile

### [Beginner] Weak Password Policy (1-Character Passwords Accepted)
- **Objective:** Make the server register the real effect of this flaw (No Minimum Password Strength at Registration) so the test flips to done on /tests.
- **Hints:**
  1. Register a new member account and be as lazy as possible with the password.
  2. There is no minimum length, no complexity check — the form accepts almost anything.
  3. Register with a 1-character password (e.g. "a"). The account is created and works.
- **You will learn:** If the platform allows trivial passwords, its users will choose them — and brute force becomes trivial too.

### [Intermediate] Mass Assignment — Role Granted at Registration
- **Objective:** Make the server register the real effect of this flaw (Mass Assignment of Role at Registration) so the test flips to done on /tests.
- **Hints:**
  1. The registration handler copies the whole submitted form into the new member record.
  2. The public form has no role field — but the record has one. What happens if you submit it anyway?
  3. POST /register with an extra field role=librarian. Your brand-new account opens with librarian powers.
- **You will learn:** Binding request bodies directly to data models lets attackers set fields the UI never offered — roles, balances, tiers.

### [Intermediate] Stored XSS in Display Name
- **Objective:** Make the server register the real effect of this flaw (Stored Cross-Site Scripting via Display Name) so the test flips to done on /tests.
- **Hints:**
  1. Your display name is shown back on profile, member and staff pages.
  2. Names are stored and rendered without escaping — a name does not have to be text.
  3. Register or rename yourself to <script>alert(1)</script> (or an <img onerror> payload). It is stored raw and fires wherever the name is rendered.
- **You will learn:** Any field that is stored and later rendered is an XSS carrier unless output is encoded everywhere it appears.

### [Intermediate] CSRF on Profile Update
- **Objective:** Make the server register the real effect of this flaw (Missing CSRF Protection on Profile Update) so the test flips to done on /tests.
- **Hints:**
  1. The profile form changes your name and email with a plain POST — look for an anti-CSRF token. There is none.
  2. A state-changing POST that arrives from another site is accepted exactly like your own form.
  3. While logged in, submit the profile change with a cross-site Origin header (e.g. Origin: https://evil.example). The change is applied.
- **You will learn:** State-changing requests need an unpredictable per-session token; cookies alone cannot prove the user intended the change.

## Catalog & Search

### [Beginner] Reflected XSS in Search
- **Objective:** Make the server register the real effect of this flaw (Reflected Cross-Site Scripting in Search Results) so the test flips to done on /tests.
- **Hints:**
  1. The results page repeats your search term in the heading: "Results for …".
  2. It repeats it without escaping — the term does not have to be words.
  3. Search for <script>alert(1)</script>. The payload is reflected raw into the page.
- **You will learn:** Reflected input must be encoded on output even when it "only" echoes back to the same user — the victim is whoever clicks the crafted link.

### [Intermediate] SQL Injection in Book Search
- **Objective:** Make the server register the real effect of this flaw (SQL Injection in Catalog Search) so the test flips to done on /tests.
- **Hints:**
  1. The catalog search glues your query into the same kind of string-built lookup as the login.
  2. A tautology in the search box makes the "WHERE" true for every row.
  3. Search for ' OR '1'='1 — the whole catalog comes back, including rows your search term never matched.
- **You will learn:** Injection rarely lives in just one input; a codebase that concatenates SQL usually does it everywhere.

## Borrowing & Loans

### [Beginner] Member Borrowing Limit Bypass (3-Loan Cap)
- **Objective:** Make the server register the real effect of this flaw (Per-Member Borrowing Limit Not Enforced) so the test flips to done on /tests.
- **Hints:**
  1. Policy says a member may hold at most 3 active loans. One seeded member already has exactly 3.
  2. The cap is described in the UI, but the borrow endpoint never counts your active loans.
  3. Log in as the member with 3 active loans and borrow a 4th title. It is issued without complaint.
- **You will learn:** A rule that appears in help text but not in code does not exist; limits must be checked where the state changes.

### [Beginner] Loan IDOR — Another Member’s Loan Details
- **Objective:** Make the server register the real effect of this flaw (Insecure Direct Object Reference on Loan Details) so the test flips to done on /tests.
- **Hints:**
  1. Every loan has a page at /loans/<id> with sequential ids.
  2. The page checks that you are logged in — but never that the loan is yours.
  3. Open a loan id that belongs to another member. Their book, dates and fee state are all displayed.
- **You will learn:** Authentication ("is someone logged in?") is not authorization ("is this their object?"). Every object fetch needs an ownership check.

### [Intermediate] Borrow Beyond the Licensed Copy Limit
- **Objective:** Make the server register the real effect of this flaw (Licensed Copy Limit Not Enforced at Borrowing) so the test flips to done on /tests.
- **Hints:**
  1. Each ebook has a licensed copy count; the catalog shows how many are available.
  2. Find a title with 0 copies available (someone has the only copy out) and try the borrow action anyway.
  3. POST the borrow for that title. The server never checks availability — a new loan is created past the licensed limit.
- **You will learn:** License and inventory limits are business rules that must be enforced server-side at the moment of the transaction.

### [Intermediate] Due-Date Extension Tampering
- **Objective:** Make the server register the real effect of this flaw (Unbounded Due-Date Extension (Policy Cap Not Enforced)) so the test flips to done on /tests.
- **Hints:**
  1. Members may extend a due date — policy allows at most 7 extra days.
  2. The extension form posts the number of days to the server, and the server simply believes it.
  3. POST /loans/<id>/extend with days=365. Your loan is now due next year and late fees can never start.
- **You will learn:** Client-supplied quantities in business workflows must be validated against policy on the server.

## Downloads & Files

### [Beginner] Ebook Download Without Ever Borrowing It
- **Objective:** Make the server register the real effect of this flaw (Missing Entitlement Check on Ebook Downloads) so the test flips to done on /tests.
- **Hints:**
  1. Downloads live at /books/<id>/download and only ask that you are logged in.
  2. Nothing checks that you have an active (or any) loan for that title.
  3. Pick a title you have never borrowed and open its download URL. The ebook is served.
- **You will learn:** Entitlement checks belong on the resource itself; a login wall is not a paywall.

### [Intermediate] Path Traversal in File Download
- **Objective:** Make the server register the real effect of this flaw (Directory Traversal in File Download Endpoint) so the test flips to done on /tests.
- **Hints:**
  1. The file endpoint takes a file name and reads it from the docs folder.
  2. It joins the folder and your input without checking where the result points.
  3. Request /download?file=../server.js — the path walks out of docs/ and the application source code is returned.
- **You will learn:** User-controlled paths must be canonicalised and confined to the intended directory.

## Reservations

### [Beginner] Cancel Another Member’s Reservation (IDOR)
- **Objective:** Make the server register the real effect of this flaw (Missing Ownership Check on Reservation Cancellation) so the test flips to done on /tests.
- **Hints:**
  1. Reservations are cancelled with a POST to /reservations/<id>/cancel.
  2. The handler cancels whatever id it is given — ownership is never checked.
  3. Cancel a reservation that belongs to another member. It disappears from their queue as if they had cancelled it.
- **You will learn:** State-changing endpoints need the same ownership checks as read endpoints — destructive actions most of all.

### [Intermediate] Reservation Queue Jumping
- **Objective:** Make the server register the real effect of this flaw (Client-Supplied Queue Position in Reservations) so the test flips to done on /tests.
- **Hints:**
  1. Popular titles have a reservation queue — first come, first served.
  2. The reserve handler accepts a position value from the request if one is supplied.
  3. Reserve the fully-loaned title with position=1 in the POST. You are inserted at the front, ahead of members already waiting.
- **You will learn:** Queue order is server state; if the client can dictate it, fairness controls are fictional.

## Fees & Payments

### [Intermediate] Member Waives a Late Fee (Staff Action, No Role Check)
- **Objective:** Make the server register the real effect of this flaw (Missing Authorization on Fee Waiver Endpoint) so the test flips to done on /tests.
- **Hints:**
  1. Waiving a fee is a librarian power, done via POST /fees/<id>/waive.
  2. The endpoint exists and works — it just never asks who is calling it.
  3. As a plain member, POST to the waive endpoint for a fee. The fee is waived by someone who should never hold that power.
- **You will learn:** Every privileged endpoint must verify the caller’s role server-side; hiding the button in the UI is not a control.

### [Intermediate] Fee Payment Amount Tampering
- **Objective:** Make the server register the real effect of this flaw (Payment Amount Not Verified Against Fee Owed) so the test flips to done on /tests.
- **Hints:**
  1. Paying a fee posts an amount to /fees/<id>/pay.
  2. The server marks the fee settled for whatever amount arrived — it never compares with the amount owed.
  3. Pay a $2.00 fee with amount=0.01. The fee is recorded as fully paid.
- **You will learn:** Amounts owed live on the server; a payment must be reconciled against the server-side balance, never the client’s claim.

## Members & Reading History

### [Beginner] Another Member’s Reading History (IDOR)
- **Objective:** Make the server register the real effect of this flaw (Insecure Direct Object Reference on Reading History) so the test flips to done on /tests.
- **Hints:**
  1. Reading history lives at /members/<id>/history, and member ids are listed in the directory.
  2. The page shows the history of whichever id is in the URL — yours or not.
  3. Open another member’s history URL. Everything they have borrowed and returned is listed.
- **You will learn:** Reading history is sensitive personal data; object-level authorization is what stands between members and each other’s private lives.

## Librarian & Admin

### [Beginner] Admin Panel Served Without Any Role Check
- **Objective:** Make the server register the real effect of this flaw (Missing Authorization on Admin Panel) so the test flips to done on /tests.
- **Hints:**
  1. The admin console lives at the obvious address: /admin.
  2. It renders for any logged-in account — the handler never checks a role at all.
  3. Log in as a plain member and open /admin. The full member administration table is served.
- **You will learn:** "Hidden" admin URLs are not protection; every privileged page must enforce its role on the server, every time.

### [Intermediate] Member Edits the Catalog via the Librarian Endpoint
- **Objective:** Make the server register the real effect of this flaw (Missing Authorization on Catalog Edit Endpoint) so the test flips to done on /tests.
- **Hints:**
  1. Librarians edit titles through POST /librarian/books/<id>/edit.
  2. The librarian PAGE checks roles — the POST endpoint behind it forgot to.
  3. As a plain member, POST a new title/copies for a book directly to the edit endpoint. The catalog changes.
- **You will learn:** Authorization must be enforced on every endpoint, not just on the page that links to it; attackers call endpoints directly.

## Platform & API

### [Beginner] Debug Endpoint Dumps Every Member Record (incl. Passwords)
- **Objective:** Make the server register the real effect of this flaw (Unauthenticated Debug Endpoint Exposing Credentials) so the test flips to done on /tests.
- **Hints:**
  1. Developers leave diagnostic endpoints behind more often than anyone admits.
  2. Try the obvious one: /debug.
  3. Open /debug — it returns the full member table as JSON, passwords included, no login required.
- **You will learn:** Debug and diagnostic surface must never ship to production; if it exists, it is public.
