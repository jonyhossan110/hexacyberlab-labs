# HexaAuction — Practice Guide (LAB 99)

Challenges grouped by feature, then difficulty. Solve them in the app; the Mission Board (/tests) mirrors this guide.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- Objective: Submit an email containing a quote + comment sequence so the password clause is commented out of the string-built query.
- Hints:
  1. The login form builds its query by gluing your input straight into a string.
  2. Try closing the email string early and commenting out the rest of the query.
  3. Email: admin@hexaauction.local' --  with any password logs you in as admin.

### [Beginner] Brute Force — No Rate Limit or Lockout
- Objective: Submit 10+ failed logins for one account; the 10th failure is still processed with no challenge or lock.
- Hints:
  1. Nothing slows you down when a password guess fails.
  2. Script 10 or more wrong passwords for one account and watch what does NOT happen.
  3. After 10 failed logins for the same account the app still happily accepts more guesses.

### [Beginner] User Enumeration via Response Differences
- Objective: Submit 5 distinct emails; existing accounts return a different message than unknown ones.
- Hints:
  1. Compare the forgot-password answer for a real email vs an invented one.
  2. The two answers are worded differently — that difference is the leak.
  3. Probe 5 different emails on /forgot; real accounts get a distinct "reset sent" message.

### [Beginner] Demo Credentials Published on the Login Page
- Objective: Use the demo admin credentials printed on the login page to sign in.
- Hints:
  1. Read the login page carefully — it is more helpful than it should be.
  2. A demo admin account is printed right on the page.
  3. Log in with the demo admin credentials shown in the box on /login.

### [Intermediate] Predictable Password-Reset Token
- Objective: Derive the token from the target user id with the published formula and submit it without a reset request.
- Hints:
  1. Request a reset and study the token format — it is not random.
  2. The token is built from the user id with simple arithmetic: HA<id>-<id*137+42>.
  3. Compute Bob's token (id 3) yourself and POST it to /reset without ever requesting one.

### [Intermediate] Role Cookie Tampering into the Seller Console
- Objective: Forge the hx_role cookie to a privileged role and load the gated console.
- Hints:
  1. After login, look at the cookies the app sets — one of them carries your role.
  2. The seller console trusts that cookie instead of the server-side session.
  3. Log in as a plain bidder, change hx_role to seller, then open /seller.

## Registration & Profile

### [Beginner] Weak Password Policy (1 Character Accepted)
- Objective: Create an account with a 1-character password.
- Hints:
  1. Try registering with the shortest password the form will take.
  2. There is no minimum length or complexity check at all.
  3. Register with the password "x" — the account is created.

### [Beginner] Stored XSS in Display Name
- Objective: Store a script payload as the display name; it is served unescaped to other users.
- Hints:
  1. Your display name is printed back on pages without escaping.
  2. Put an HTML payload in it instead of a name.
  3. Register with display name <script>alert(1)</script> and view any page that lists members.

### [Intermediate] Mass Assignment — Role & Balance via Registration
- Objective: Submit extra role/balance fields at registration; they are stored on the account.
- Hints:
  1. The register handler copies every submitted field onto the new user record.
  2. Add fields the form never shows you — like role and balance.
  3. Register with extra fields role=admin and balance=9999 and check your profile.

### [Intermediate] CSRF on Profile Update
- Objective: Submit a profile change with no hx_origin marker; it is accepted.
- Hints:
  1. Legit forms carry a hidden hx_origin marker field. The profile endpoint never checks it.
  2. A POST without the marker still changes the profile.
  3. POST to /profile with a new name and no hx_origin field — it succeeds.

## Search & Listings

### [Beginner] Reflected XSS in Search
- Objective: Put a script payload in the search term; it is reflected unescaped in the response.
- Hints:
  1. The results page repeats your search term back to you — raw.
  2. Search for an HTML payload and view the page source.
  3. Search for <script>alert(1)</script>; it lands unescaped in the results heading.

### [Intermediate] SQL Injection in Search Leaks Draft Listings
- Objective: Inject an OR-tautology into the search term; draft listings are returned.
- Hints:
  1. Search glues your term into a query the same way login does.
  2. A classic OR-tautology makes the filter match everything — including drafts.
  3. Search for ' OR '1'='1 and look for the unpublished draft lot.

## Bidding

### [Beginner] Bid Below the Current Price Accepted as Winning
- Objective: Place a bid lower than the current highest bid; it is accepted and becomes winning.
- Hints:
  1. The bid endpoint never compares your amount with the current highest bid.
  2. Bid far below the current price on a live auction.
  3. Bid $1 on the Vintage Camera (current bid $150) — it becomes the winning bid.

### [Beginner] Negative Bid Amount Accepted
- Objective: Submit a negative bid amount; it is stored as a bid.
- Hints:
  1. Amounts are never checked for being positive, either.
  2. What happens if a bid amount is below zero?
  3. Bid -50 on a live auction — the negative bid is recorded.

### [Intermediate] Bidding on an Ended Auction
- Objective: Place a bid on an auction whose status is ended; it is accepted.
- Hints:
  1. The ended auction page still has a working bid path underneath.
  2. The endpoint never checks the auction status.
  3. POST a bid to the Antique Vase auction, which already ended — it is accepted.

### [Intermediate] Reserve Price Disclosed to Bidders
- Objective: Load an auction as a non-seller; the secret reserve price is present in the response.
- Hints:
  1. The reserve is secret — but view the auction page source as a bidder.
  2. The server ships the reserve value to every visitor in a hidden field.
  3. Open the Vintage Camera page as Bob and find the reserve in the HTML.

## Seller & Listings

### [Beginner] Unpublished Draft Listing Viewable by Direct URL (IDOR)
- Objective: Request a draft listing by id as a non-owner; it is served in full.
- Hints:
  1. Drafts are hidden from search — but ids are sequential.
  2. Guess the next id after the public listings.
  3. Open /auction/4 as Bob: Alice’s unpublished draft loads in full.

### [Intermediate] Editing Another Seller's Listing (IDOR)
- Objective: Change another user's listing; the change is saved.
- Hints:
  1. The edit endpoint asks for a listing id but never asks who owns it.
  2. A bidder account can POST edits to a listing it does not own.
  3. As Bob, POST a new title to /auction/1/edit — Alice's listing changes.

### [Intermediate] Seller Edits a Live Auction After Bids Are Placed
- Objective: The owner edits a live auction that already has bids; the platform accepts it.
- Hints:
  1. Nothing freezes a listing once bidding starts.
  2. The seller can still rewrite the terms mid-auction.
  3. As Alice, edit the live Vintage Camera (it already has bids) — the change goes through.

## Payments & Settlement

### [Beginner] Settlement Completed with a $0 Payment
- Objective: Submit amount 0; the settlement is marked PAID.
- Hints:
  1. If $1 works, what about nothing at all?
  2. A zero payment is accepted the same way.
  3. POST a settlement payment of 0 for a won auction — status flips to PAID.

### [Beginner] Another User's Settlement Invoice Exposed (IDOR)
- Objective: View another user's settlement invoice by changing the id.
- Hints:
  1. Settlement pages are numbered, just like listings.
  2. Nothing checks that the invoice belongs to you.
  3. Open /settle/5 as Bob — Carol's invoice, amount and details load.

### [Intermediate] Settlement Amount Tampering — Won Auction Paid for $1
- Objective: Pay less than the winning amount; the settlement is marked fully PAID.
- Hints:
  1. The settle page asks you how much you are paying — and believes you.
  2. The amount due lives on the server, but the payment amount comes from your request.
  3. Win the Antique Vase at $300, then POST a settlement payment of $1 — it is marked PAID.

## Admin Panel

### [Beginner] Admin Panel Open to Any Logged-In User
- Objective: Load the admin panel with a non-admin account; it renders fully, including passwords.
- Hints:
  1. The admin panel URL is easy to guess — try it as a normal bidder.
  2. Logging in is the only check it performs.
  3. Sign in as Bob and open /admin — the full user list with passwords renders.

### [Advanced] CSRF on Admin End-Auction Action
- Objective: Trigger the admin end-auction action with no hx_origin marker; it executes.
- Hints:
  1. Admin actions are plain POSTs. Do they carry the hx_origin marker? They do not check it.
  2. A marker-less POST from the admin session still executes.
  3. As admin, POST to /admin/end/2 with no hx_origin field — the auction ends.

## Platform & API

### [Beginner] Unauthenticated Debug Endpoint Dumps All Users
- Objective: Fetch the debug endpoint without any session; full user records with passwords are returned.
- Hints:
  1. Developers leave helpers behind. Try the obvious debug path.
  2. No login is needed for this one.
  3. GET /api/debug returns every account, passwords included.

### [Intermediate] API Token Is Just Base64 of the Email Address
- Objective: Present base64(email) as the API token; the API accepts it as that user.
- Hints:
  1. The API wants an X-Api-Token header. What could the token be made of?
  2. It decodes to something you already know about every user.
  3. Send X-Api-Token with base64(alice@hexaauction.local) to /api/me — her data comes back, no session needed.
