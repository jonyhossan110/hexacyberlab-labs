# HexaMedia — Practice Guide (LAB 83)

Challenges grouped by feature, then difficulty. Each challenge mirrors a test on the /tests Mission Board. Hints are graded: 1 is a nudge, 3 is near-answer.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- Objective: prove the flaw at POST /login so the Mission Board marks it done.
- Submit an email such as ' OR '1'='1 so the string-built query matches the first account without knowing its password.
- Hint 1: The login form builds its account lookup by gluing your input into a query string.
- Hint 2: Try a classic tautology in the email field — quote, OR, quote-one-quote equals quote-one-quote.
- Hint 3: Email: ' OR '1'='1 with any password signs you in as the first account in the table.

### Brute Force — No Rate Limit or Lockout (Beginner)
- Objective: prove the flaw at POST /login so the Mission Board marks it done.
- Send 10 or more wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.
- Hint 1: Pick one real account and keep guessing wrong passwords.
- Hint 2: Count the failures — does anything slow down or lock after 5, 10, 20 tries?
- Hint 3: Ten failed logins for bob@test.local, one after another, are all processed normally.

### User Enumeration via Login & Reset Responses (Beginner)
- Objective: prove the flaw at POST /login and POST /forgot so the Mission Board marks it done.
- Probe at least 5 different emails; existing accounts answer "Incorrect password" / "Reset link sent" while unknown emails answer "No account with that email", revealing which emails are registered.
- Hint 1: Compare the error message for a real email and an invented one — on login and on forgot-password.
- Hint 2: The two forms answer differently depending on whether the account exists.
- Hint 3: Probe 5+ emails (a mix of real and fake) and note the two different responses.

### Published Demo Credentials (Beginner)
- Objective: prove the flaw at Login page / POST /login so the Mission Board marks it done.
- The login page itself prints a working demo account (demo@hexamedia.local / demo1234). Sign in with it.
- Hint 1: Read the login page carefully — it is more helpful than it should be.
- Hint 2: A demo account is advertised right under the form.
- Hint 3: Use the printed demo email and password to sign in.

### Predictable Password-Reset Token (Intermediate)
- Objective: prove the flaw at POST /reset so the Mission Board marks it done.
- Reset tokens follow a formula from the user id: HM<id>-<id*137+42>. Compute Bob's (id 5) token and reset his password without ever requesting a reset email.
- Hint 1: Ask for one reset email and study the shape of the token — it is built from something public.
- Hint 2: The token contains the user id and simple arithmetic on it.
- Hint 3: For user id 5 the token is HM5-(5*137+42). POST it to /reset with a new password for bob@test.local.

### Role Cookie Tampering (hx_role) (Intermediate)
- Objective: prove the flaw at GET /editor and GET /admin so the Mission Board marks it done.
- The app trusts the client-supplied hx_role cookie for its editorial and admin gates. As a reader, set hx_role=admin and open /admin.
- Hint 1: After logging in, look at the cookies the app sets — one of them carries your role.
- Hint 2: The server believes that cookie instead of checking your account.
- Hint 3: Keep your reader session but change hx_role to admin, then visit /admin.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords (Beginner)
- Objective: prove the flaw at POST /register so the Mission Board marks it done.
- Register a new account with a 1-character password; it is accepted.
- Hint 1: Try registering with the shortest password you can think of.
- Hint 2: There is no length or complexity check at all.
- Hint 3: Password "x" creates a working account.

### Stored XSS in Display Name (Beginner)
- Objective: prove the flaw at POST /register or POST /profile (name field) so the Mission Board marks it done.
- Set a display name containing an HTML/JS payload such as <script>alert(1)</script>; it is stored and rendered raw wherever the name appears.
- Hint 1: Your display name is shown back on pages and next to your comments.
- Hint 2: Is the name escaped when it is printed?
- Hint 3: Register with the name <script>alert(1)</script> and view any page that shows it.

### Mass Assignment — Role & Plan at Registration (Intermediate)
- Objective: prove the flaw at POST /register so the Mission Board marks it done.
- Add role=editor (or admin) and plan=premium fields to the registration request; the server copies them onto the new account.
- Hint 1: The registration form shows email, password and name — but the server reads more fields than the form shows.
- Hint 2: What fields would a user object have that you wish you could set?
- Hint 3: POST /register with extra fields role=editor and plan=premium.

### CSRF on Profile Update (Intermediate)
- Objective: prove the flaw at POST /profile so the Mission Board marks it done.
- Change a profile with a POST that carries no hx_origin marker; the server never verifies the request really came from its own form.
- Hint 1: Legit forms on this site carry a hidden hx_origin field that matches a cookie.
- Hint 2: What happens if a state-changing POST simply leaves it out?
- Hint 3: POST /profile with a new name and no hx_origin field at all.

## Articles & Paywall

### Paywall Bypass — Premium Article Without a Subscription (Beginner)
- Objective: prove the flaw at GET /article/<id> so the Mission Board marks it done.
- A free reader can read a full premium article by adding ?full=1 to the URL (or setting the hx_sub=premium cookie); the server honours the client's word.
- Hint 1: A free account sees only the first lines of a premium article. What decides "full" vs "teaser"?
- Hint 2: Try asking the URL for the full version directly.
- Hint 3: Open /article/2?full=1 while signed in as a free reader — or set cookie hx_sub=premium.

### Draft & In-Review Articles Exposed by ID (IDOR) (Beginner)
- Objective: prove the flaw at GET /article/<id> so the Mission Board marks it done.
- Article ids are sequential and unpublished pieces are served to any signed-in reader who guesses the id — open the draft (id 3) or the in-review piece (id 5) as a plain reader.
- Hint 1: Published articles have small sequential ids. What about the unpublished ones?
- Hint 2: Sign in as a reader and walk the id numbers past the published ones.
- Hint 3: GET /article/3 as alice@test.local returns the full draft text.

### Reflected XSS in Search (Beginner)
- Objective: prove the flaw at GET /search?q= so the Mission Board marks it done.
- The search term is reflected unescaped in the results heading; search for <script>alert(1)</script> and it executes.
- Hint 1: The results page repeats your search term back to you.
- Hint 2: Does it escape HTML in that echo?
- Hint 3: Search for an <script> payload and view the page source.

### SQL Injection in Article Search (Intermediate)
- Objective: prove the flaw at GET /search?q= so the Mission Board marks it done.
- Search with ' OR '1'='1 and the string-built query returns every article in the table — including drafts and in-review pieces.
- Hint 1: Search filters titles with a string-built query, just like the login form.
- Hint 2: A tautology makes the filter match everything.
- Hint 3: q = ' OR '1'='1 lists drafts that never appear in normal search.

## Editorial Workflow

### Anyone Can Publish Articles (Intermediate)
- Objective: prove the flaw at POST /article/<id>/status so the Mission Board marks it done.
- The status endpoint checks only that you are signed in. As a plain reader, POST status=published for a draft and it goes live.
- Hint 1: Publishing is supposed to be an editor decision after review. Who does the endpoint actually check?
- Hint 2: The workflow buttons live in the editorial console, but the endpoint behind them is open.
- Hint 3: As alice (a reader), POST /article/3/status with status=published.

### Editing Other Writers' Articles (No Ownership Check) (Intermediate)
- Objective: prove the flaw at POST /article/<id>/edit so the Mission Board marks it done.
- The edit endpoint never checks ownership. As one user, edit an article written by someone else (e.g. id 5, the editor's piece in review).
- Hint 1: The edit form exists for your own pieces. Does the endpoint compare the author id to your session?
- Hint 2: Try editing an article whose author is not you.
- Hint 3: As alice, POST new title/body to /article/5/edit.

## Subscriptions & Payments

### Subscription Price Tampering (Beginner)
- Objective: prove the flaw at POST /subscribe so the Mission Board marks it done.
- The subscribe form posts a price field the server trusts. Subscribe to Premium posting price=1 and the $12 plan activates for $1.
- Hint 1: The subscribe form carries the price in a hidden field.
- Hint 2: Hidden fields are visible — and editable.
- Hint 3: POST /subscribe with plan=premium and price=1.

### Single-Use Coupon Reuse (WELCOME50) (Intermediate)
- Objective: prove the flaw at POST /subscribe so the Mission Board marks it done.
- WELCOME50 is advertised as one-per-customer, but the server never records its use. Apply it on two separate subscriptions and it works both times.
- Hint 1: The welcome coupon halves the premium price — once per customer, supposedly.
- Hint 2: Subscribe with it, then subscribe again the same way.
- Hint 3: Second use of WELCOME50 still takes 50% off.

### Cancel Another Subscriber's Subscription (IDOR) (Intermediate)
- Objective: prove the flaw at POST /subscription/<userId>/cancel so the Mission Board marks it done.
- The cancel endpoint takes a user id and never checks it is yours. Cancel Bob's subscription (user id 5) while signed in as Alice.
- Hint 1: Your account page cancels via a URL containing a user id.
- Hint 2: Whose id does the endpoint believe?
- Hint 3: As alice, POST /subscription/5/cancel.

## Comments

### Stored XSS in Comments (Beginner)
- Objective: prove the flaw at POST /article/<id>/comment so the Mission Board marks it done.
- Post a comment containing <script>alert(1)</script> on any article; it is stored and rendered raw to every reader.
- Hint 1: Comments appear under articles exactly as typed.
- Hint 2: Try markup instead of plain text in a comment.
- Hint 3: A script payload in a comment body is served back unescaped on the article page.

### Delete Other Readers' Comments (IDOR) (Beginner)
- Objective: prove the flaw at POST /comment/<id>/delete so the Mission Board marks it done.
- Comment ids are sequential and deletion checks nothing. Delete Bob's comment (id 2) while signed in as Alice.
- Hint 1: Your own comments have a delete action. Look at the URL it calls.
- Hint 2: Does the server ask whose comment it is?
- Hint 3: As alice, POST /comment/2/delete.

## Newsletter & Audience

### Newsletter Subscriber List Exposure (Beginner)
- Objective: prove the flaw at GET /newsletter/subscribers so the Mission Board marks it done.
- The subscriber list page requires only a login — any reader can open it and harvest every subscriber email address.
- Hint 1: The newsletter has an admin-ish page listing everyone who signed up.
- Hint 2: It asks whether you are logged in, not who you are.
- Hint 3: Sign in as any reader and open /newsletter/subscribers.

## Admin Panel

### Admin User Data Endpoint Without Role Check (Beginner)
- Objective: prove the flaw at GET /admin/users.json so the Mission Board marks it done.
- The JSON user dump checks only that a session exists. Any reader can fetch every account including passwords.
- Hint 1: The admin console loads its user table from a JSON endpoint.
- Hint 2: That endpoint is less careful than the page.
- Hint 3: As a reader, GET /admin/users.json.

### CSRF on Admin Role Change (Intermediate)
- Objective: prove the flaw at POST /admin/user/<id>/role so the Mission Board marks it done.
- Promote or demote a user with a POST that carries no hx_origin marker; the admin action has no CSRF verification.
- Hint 1: The admin role form carries the hx_origin marker — but is it checked?
- Hint 2: Replay the role change without the marker field.
- Hint 3: With admin access, POST /admin/user/4/role with role=author and no hx_origin.

## Platform & API

### Unauthenticated Debug Endpoint Dumps All Accounts (Beginner)
- Objective: prove the flaw at GET /api/debug so the Mission Board marks it done.
- Open /api/debug with no login at all; it returns every user including passwords, left over from development.
- Hint 1: Developers leave helpful endpoints behind. Try the obvious name.
- Hint 2: No session is needed for this one.
- Hint 3: GET /api/debug returns the full user table.

### Weak API Token (Base64 of Email) Leaks Premium Content (Intermediate)
- Objective: prove the flaw at GET /api/premium so the Mission Board marks it done.
- The API accepts X-Api-Token equal to the base64 of a subscriber's email. Compute it for editor@hexamedia.local and read all premium articles.
- Hint 1: The API wants a token header. Tokens here are derived from something public about the account.
- Hint 2: What is the most guessable encoding of an email address?
- Hint 3: X-Api-Token = base64("editor@hexamedia.local") returns the premium catalogue.
