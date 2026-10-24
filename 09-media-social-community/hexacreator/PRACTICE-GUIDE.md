# HexaCreator — Practice Guide (LAB 87)

Challenges grouped by feature, then difficulty. Solve them in the app; the Mission Board (/tests) mirrors this guide. A test completes only when the exploit really works — never by declaration.

## Login & Authentication

### SQL injection login bypass (Beginner)
- **Objective:** Log in as another account without knowing its password.
- **Hints:**
  1. The login form builds its database query by pasting your input straight into the query string.
  2. Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.
  3. Use admin@hexacreator.local' OR '1'='1' -- as the email with any password.

### Brute force — no rate limit or lockout (Beginner)
- **Objective:** Reach 10 failed logins for one account with every attempt still accepted for processing.
- **Hints:**
  1. Nothing slows you down when a password guess is wrong.
  2. Script ten or more wrong passwords for one account and watch what does not happen.
  3. Submit 10 failed logins for bob@hexacreator.local — the 10th is still processed with no lockout, CAPTCHA or delay.

### User enumeration via differing responses (Beginner)
- **Objective:** Probe at least 5 distinct emails and identify which are registered from the differing responses.
- **Hints:**
  1. Compare the error message for an email that exists with one that does not.
  2. The forgot-password form answers differently too.
  3. Probe at least 5 distinct emails across login failures and /forgot and note which ones are confirmed as real accounts.

### Published demo credentials (Beginner)
- **Objective:** Gain an authenticated session using only credentials the site itself publishes.
- **Hints:**
  1. The login page itself tells you a working username and password.
  2. Demo accounts are production accounts here.
  3. Sign in with the demo fan or demo creator credentials printed on the login page.

### Predictable password-reset token (Intermediate)
- **Objective:** Reset another account’s password using only its user id.
- **Hints:**
  1. Reset tokens here are not random — they are computed from something public.
  2. A user id is sequential and visible. What simple arithmetic could turn an id into a token?
  3. The token format is HC<id>-<id*137+42>. Compute it for the victim id and submit it at /reset without ever requesting a reset email.

### Role cookie tampering into Creator Studio (Intermediate)
- **Objective:** Open the Creator Studio as a fan by changing only a cookie value.
- **Hints:**
  1. After login the server sets a cookie that repeats your role back to it.
  2. The Creator Studio trusts that cookie instead of the server-side session.
  3. As a fan, edit the hx_role cookie to creator and open /studio.

## Registration & Profile

### Weak password policy (1-character passwords) (Beginner)
- **Objective:** Create a working account with a password of 3 characters or fewer.
- **Hints:**
  1. Registration barely looks at the password you choose.
  2. Try the shortest password the form will accept.
  3. Register a new account with a 1-character password — it is created without complaint.

### Stored XSS in display name (Beginner)
- **Objective:** Persist a script payload in a profile field that other pages render.
- **Hints:**
  1. Your display name is shown on public pages exactly as typed.
  2. Names are rendered without output encoding.
  3. Register (or rename yourself) with a name containing <script>alert(1)</script> or an <img onerror> payload and view a page that prints it.

### Mass assignment — role granted at registration (Intermediate)
- **Objective:** Create an account whose role is creator or admin purely by adding a form field.
- **Hints:**
  1. The registration handler copies more of your request body into the new account than it should.
  2. What field would you add to the form if you wanted a better account?
  3. Add role=creator (or admin) to the registration POST — the new account is created with that role.

### CSRF on profile update (Intermediate)
- **Objective:** Change a profile via a request with no hx_origin marker.
- **Hints:**
  1. The app marks its own pages with an hx_origin cookie; state-changing forms never check it.
  2. A POST that arrives without that marker did not come from the app’s own pages.
  3. While logged in, POST /profile/update with a new name but without the hx_origin cookie (e.g. plain curl) — the change is applied.

## Creators & Search

### Reflected XSS in creator search (Beginner)
- **Objective:** Get a script payload reflected raw by the search page.
- **Hints:**
  1. The search page repeats your query back to you at the top of the results.
  2. It repeats it without encoding.
  3. Search for <script>alert(1)</script> and view the page source — your payload is reflected raw.

### SQL injection in creator search leaks unlisted page (Intermediate)
- **Objective:** Make the unlisted creator page appear in search results.
- **Hints:**
  1. Creator search builds its query the same careless way login does.
  2. One creator page is unlisted and never appears in normal results.
  3. Search for ' OR '1'='1 and see the full directory — including the unlisted Secret Studio page.

## Posts

### Members-only post readable without a membership (Beginner)
- **Objective:** Read a members-only post without any membership.
- **Hints:**
  1. Members-only posts are hidden from listings for non-members — but hiding is all that happens.
  2. Post URLs are simple sequential ids.
  3. As a fan with no membership, open /post/2 directly — the full members-only content is served.

### Stored XSS in post body (Beginner)
- **Objective:** Persist a script payload inside a post.
- **Hints:**
  1. Post bodies are rendered exactly as the author typed them.
  2. Creators can post — and payloads persist for every reader.
  3. Create a post whose body contains <script>alert(1)</script> or an <img src=x onerror=...> payload, then open the post.

### Edit another creator’s post (IDOR) (Intermediate)
- **Objective:** Modify a post you do not own.
- **Hints:**
  1. The post-edit endpoint checks that you are logged in — nothing more.
  2. Ownership is never compared with the post’s author.
  3. As any other user, POST /post/1/edit with a new title/body — Nova’s post is changed.

## Memberships & Payments

### Membership price tampering (Beginner)
- **Objective:** Obtain a paid membership for less than the tier price.
- **Hints:**
  1. The subscribe form posts a price field along with the tier.
  2. The server trusts the price it is given.
  3. Subscribe to the $15 Superfan tier but post price=1 — your membership is created at $1.

### Membership details IDOR (Beginner)
- **Objective:** Read another user’s membership record.
- **Hints:**
  1. Membership records have their own sequential ids and their own page.
  2. That page never asks whether the membership is yours.
  3. Open /membership/1 while logged in as Bob — Alice’s membership details are shown.

### Negative months create wallet credit (Intermediate)
- **Objective:** Increase your wallet balance through a negative subscription charge.
- **Hints:**
  1. The subscribe form also accepts a months value.
  2. Nobody checks its sign.
  3. Subscribe with months=-3 — the "charge" is negative, so your wallet balance goes UP instead of down.

### Cancel another user’s membership (IDOR) (Intermediate)
- **Objective:** Cancel someone else’s membership.
- **Hints:**
  1. Cancelling is a POST to the membership’s own URL.
  2. Like the view, it never checks ownership.
  3. As Bob, POST /membership/1/cancel — Alice’s membership is cancelled.

## Earnings & Payouts

### Another creator’s earnings exposed (IDOR) (Beginner)
- **Objective:** View another creator’s earnings and payout history.
- **Hints:**
  1. Earnings pages are addressed by creator id.
  2. Logging in is the only check performed.
  3. Open /earnings/2 as a fan — Nova’s earnings, payout history and bank reference are displayed.

### Payout larger than earnings accepted (Intermediate)
- **Objective:** Create a payout that exceeds the creator’s earnings.
- **Hints:**
  1. Payout requests ask how much you want — and believe you.
  2. Your real available balance is never consulted.
  3. As a creator, POST /payout with amount=99999, far above your earnings — the payout is created.

### CSRF on payout request (Intermediate)
- **Objective:** Trigger a payout request with no hx_origin marker.
- **Hints:**
  1. The payout form is a state-changing, money-moving POST with no marker check.
  2. Requests arriving without the hx_origin cookie are still honoured.
  3. While logged in as a creator, POST /payout from curl (no hx_origin cookie) — a payout is created.

## Supporters & Community

### Supporter list with emails exposed to everyone (Beginner)
- **Objective:** Read a supporter list (with emails) for a page you do not own.
- **Hints:**
  1. Each creator page links to its supporter list.
  2. The list includes private email addresses — and no ownership check.
  3. Open /page/1/supporters as any other user and read the supporters’ names and emails.

## Admin Panel

### Admin panel open to any logged-in user (Beginner)
- **Objective:** Reach the admin panel as a non-admin user.
- **Hints:**
  1. The admin panel checks that *someone* is logged in.
  2. It never checks that the someone is an admin.
  3. Log in as the demo fan and open /admin — the full user table, including passwords, is served.

## Platform & API

### Unauthenticated debug endpoint dumps all users (Beginner)
- **Objective:** Retrieve the full account list from the debug endpoint.
- **Hints:**
  1. Developers leave diagnostic endpoints behind more often than you would think.
  2. This one needs no login at all.
  3. Fetch /api/debug — every account, including passwords, comes back as JSON.

### Weak API token (base64 of email) (Intermediate)
- **Objective:** Access another user’s API data using only their email address.
- **Hints:**
  1. The API accepts an x-api-token header instead of a session.
  2. The "token" is a reversible encoding of something public.
  3. Send x-api-token as base64 of alice@hexacreator.local to /api/my-memberships — her memberships come back with no session at all.
