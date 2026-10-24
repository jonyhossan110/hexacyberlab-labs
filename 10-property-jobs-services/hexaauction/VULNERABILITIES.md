# HexaAuction — Vulnerability Map (LAB 99)

All 26 scored tests, grouped by feature. Every item is a real, working flaw in this app.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit an email containing a quote + comment sequence so the password clause is commented out of the string-built query.
- Impact: On a real client site this means full account takeover with no password at all — the attacker becomes an admin in one request.

### Brute Force — No Rate Limit or Lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /login
- Exploitation outline: Submit 10+ failed logins for one account; the 10th failure is still processed with no challenge or lock.
- Impact: Attackers can grind through password lists against real customer accounts until one opens, then drain balances or abuse the account.

### User Enumeration via Response Differences
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /forgot
- Exploitation outline: Submit 5 distinct emails; existing accounts return a different message than unknown ones.
- Impact: An attacker can confirm which of a client’s customers have accounts, then focus credential stuffing and phishing exactly on them.

### Demo Credentials Published on the Login Page
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: GET /login (demo box), POST /login
- Exploitation outline: Use the demo admin credentials printed on the login page to sign in.
- Impact: Anyone on the internet can sign in as admin with credentials the site itself publishes; for a client this is instant, total compromise.

### Predictable Password-Reset Token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: POST /reset
- Exploitation outline: Derive the token from the target user id with the published formula and submit it without a reset request.
- Impact: An attacker resets the password of any customer — or the admin — and owns the account, its bids, payouts and personal data.

### Role Cookie Tampering into the Seller Console
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /seller
- Exploitation outline: Forge the hx_role cookie to a privileged role and load the gated console.
- Impact: Any bidder can promote themselves to seller (or beyond), list fake auctions and manipulate listings — direct fraud against the client’s users.

## Registration & Profile

### Weak Password Policy (1 Character Accepted)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Location: POST /register
- Exploitation outline: Create an account with a 1-character password.
- Impact: Client customers end up with trivially guessed passwords, feeding account-takeover and refund fraud.

### Mass Assignment — Role & Balance via Registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /register
- Exploitation outline: Submit extra role/balance fields at registration; they are stored on the account.
- Impact: Attackers mint themselves admin accounts with fat balances — for a client this is privilege escalation plus direct financial fraud.

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: POST /register (name field), rendered site-wide
- Exploitation outline: Store a script payload as the display name; it is served unescaped to other users.
- Impact: Attackers can steal sessions or act as any viewer; one poisoned profile can compromise the client’s admin team.

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /profile
- Exploitation outline: Submit a profile change with no hx_origin marker; it is accepted.
- Impact: Attackers can silently rewrite a customer’s profile details, paving the way for social-engineering and account-recovery attacks against the client.

## Search & Listings

### SQL Injection in Search Leaks Draft Listings
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Location: GET /search
- Exploitation outline: Inject an OR-tautology into the search term; draft listings are returned.
- Impact: Unpublished products, embargoed listings and their reserve details leak before launch — a client loses control of its own catalogue.

### Reflected XSS in Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Location: GET /search
- Exploitation outline: Put a script payload in the search term; it is reflected unescaped in the response.
- Impact: Attackers send victims links that run script in the client’s domain, stealing sessions and trust.

## Bidding

### Bid Below the Current Price Accepted as Winning
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Location: POST /auction/:id/bid
- Exploitation outline: Place a bid lower than the current highest bid; it is accepted and becomes winning.
- Impact: Attackers win client auctions for $1, destroying seller revenue and platform trust in a single request.

### Negative Bid Amount Accepted
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Location: POST /auction/:id/bid
- Exploitation outline: Submit a negative bid amount; it is stored as a bid.
- Impact: Negative bids can manipulate fees and payouts, effectively making the platform pay the attacker.

### Bidding on an Ended Auction
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /auction/:id/bid (ended auction)
- Exploitation outline: Place a bid on an auction whose status is ended; it is accepted.
- Impact: Attackers snipe finished auctions, overturn legitimate winners and create settlement disputes for the client.

### Reserve Price Disclosed to Bidders
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: GET /auction/:id
- Exploitation outline: Load an auction as a non-seller; the secret reserve price is present in the response.
- Impact: Bidders learn the exact minimum a seller will accept and bid precisely that — sellers lose the entire point of a reserve.

## Seller & Listings

### Editing Another Seller's Listing (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Location: POST /auction/:id/edit
- Exploitation outline: Change another user's listing; the change is saved.
- Impact: Competitors or vandals can rewrite a client’s listings — prices, descriptions, images — causing direct revenue loss and chaos.

### Seller Edits a Live Auction After Bids Are Placed
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Location: POST /auction/:id/edit (live, has bids)
- Exploitation outline: The owner edits a live auction that already has bids; the platform accepts it.
- Impact: A seller can bait bidders with one item and swap the description after bids — textbook fraud that lands on the client’s platform.

### Unpublished Draft Listing Viewable by Direct URL (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /auction/:id (draft)
- Exploitation outline: Request a draft listing by id as a non-owner; it is served in full.
- Impact: Competitors preview a client’s unreleased products and pricing, and embargoed listings leak early.

## Payments & Settlement

### Settlement Amount Tampering — Won Auction Paid for $1
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Location: POST /settle/:id/pay
- Exploitation outline: Pay less than the winning amount; the settlement is marked fully PAID.
- Impact: Buyers settle real purchases for pennies; the client eats the loss on every single order.

### Settlement Completed with a $0 Payment
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Location: POST /settle/:id/pay
- Exploitation outline: Submit amount 0; the settlement is marked PAID.
- Impact: Attackers obtain goods entirely free while the client’s books show a completed, paid order.

### Another User's Settlement Invoice Exposed (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /settle/:id
- Exploitation outline: View another user's settlement invoice by changing the id.
- Impact: Customers’ purchase history, amounts and personal details leak to any other user — a privacy breach and a trust killer for the client.

## Admin Panel

### Admin Panel Open to Any Logged-In User
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Location: GET /admin
- Exploitation outline: Load the admin panel with a non-admin account; it renders fully, including passwords.
- Impact: Any registered user reaches the client’s control panel — user data, passwords and platform controls are all exposed.

### CSRF on Admin End-Auction Action
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Location: POST /admin/end/:id
- Exploitation outline: Trigger the admin end-auction action with no hx_origin marker; it executes.
- Impact: An attacker who lures the client’s admin to a web page can end auctions, ban users or worse — without ever knowing a password.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Users
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Location: GET /api/debug
- Exploitation outline: Fetch the debug endpoint without any session; full user records with passwords are returned.
- Impact: One URL hands attackers the client’s entire user database — instant mass account takeover and a reportable data breach.

### API Token Is Just Base64 of the Email Address
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Location: GET /api/me (X-Api-Token header)
- Exploitation outline: Present base64(email) as the API token; the API accepts it as that user.
- Impact: Anyone can impersonate any user through the API — read their bids, watchlists and settlements — with nothing but their email address.
