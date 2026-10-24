# HexaPodcast — Practice Guide (LAB 85)

Challenges grouped by feature, then difficulty. Each challenge mirrors an entry on the in-app Mission Board (/tests). A test completes only when the exploit actually succeeds — the server detects the real effect.

## Login & Authentication

### SQL injection login bypass (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The login form builds its user lookup by gluing your input straight into a query string.
- Hint 2: Try a classic tautology in the email field — something that makes the WHERE clause always true.
- Hint 3: Use ' OR '1'='1 as the email with any password and you will be signed in as the first account in the table: the admin.

### Brute force — no rate limit or lockout (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Pick one real account and keep guessing its password.
- Hint 2: Notice the server never slows down, CAPTCHAs you, or locks the account.
- Hint 3: Fail 10 logins in a row for the same account — the 10th is still processed like the first. That missing throttle is the flaw.

### User enumeration via forgot-password (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Compare the forgot-password response for an email that exists with one that does not.
- Hint 2: The two answers are different — one confirms the account is real.
- Hint 3: Probe at least 5 different emails and record which ones the page confirms as registered.

### Published demo credentials (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Read the login page carefully — it is more helpful than it should be.
- Hint 2: A demo account and its password are printed right on the page.
- Hint 3: Sign in with the demo listener credentials shown on the login page.

### Predictable password-reset token (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Reset tokens here follow a pattern built from something public: the user id.
- Hint 2: The token looks like POD-<id>-<a number derived from the id>. Small ids are printed in API responses and profile URLs.
- Hint 3: Compute Bob's token yourself (id 5): POD-5-(5*149+37). Post it to /reset without ever requesting a reset — it is accepted.

### Role cookie tampering (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: After login, inspect the cookies the app sets — one of them carries your role.
- Hint 2: The server trusts that cookie instead of checking your account on the server side.
- Hint 3: Set the hx_role cookie to admin in your browser and visit /admin.

## Registration & Profile

### Weak password policy at registration (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Try registering with the shortest password the form will accept.
- Hint 2: There is no length or complexity check at all.
- Hint 3: Register a new account with a 1-character password — it is accepted.

### Stored XSS in display name (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Your display name is printed back in many places — comments, the header, profiles.
- Hint 2: Nothing escapes it on the way out.
- Hint 3: Register or rename yourself with a name like <script>alert(1)</script> and view a page that prints it — it runs.

### Mass assignment — role / premium via registration fields (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The registration handler copies more of your form than the three visible fields.
- Hint 2: Add fields the form never showed you — the account record has role and premium properties.
- Hint 3: Register with extra fields role=creator (or plan=premium) in the POST body and check what kind of account you get.

### CSRF on profile update (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Your own profile form carries a hidden hx_origin field that matches a cookie.
- Hint 2: The server never actually verifies it on the way in.
- Hint 3: POST to /profile with a new name but WITHOUT the hx_origin field — the change is accepted anyway.

## Search & Discovery

### Reflected XSS in search results (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The results page repeats your search term back to you in the heading.
- Hint 2: It repeats it exactly as typed — markup and all.
- Hint 3: Search for <script>alert(1)</script> and view the page source of the results heading.

### Unlisted episode reachable by direct ID (IDOR) (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Episode pages are just numbers: /episode/1, /episode/2, ...
- Hint 2: One episode belongs to the unlisted draft show. Nothing checks whether you should see it.
- Hint 3: Open /episode/5 directly while signed in as a listener — the secret pilot plays.

### SQL injection in search leaks unlisted content (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Search builds its matching the same careless way login does.
- Hint 2: A tautology in the query makes the search match everything — including rows that are not public.
- Hint 3: Search for ' OR '1'='1 and look for the unlisted draft show and its secret episode in the results.

## Episodes & Premium

### Premium episode stream served to free listeners (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Premium episodes show a paywall on the episode page — but the stream URL is a separate endpoint.
- Hint 2: The stream endpoint never asks whether you paid.
- Hint 3: As Bob (free plan), open /episode/2/stream directly — the premium audio streams.

### Edit another creator’s episode (IDOR) (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The episode edit form posts to /episode/<id>/edit.
- Hint 2: It checks that you are a creator — never that the episode is yours.
- Hint 3: As Casey, POST a new title to /episode/3/edit (Maya’s episode) and watch it change.

## Subscriptions & Payments

### Subscription price tampering (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The subscribe form posts the amount along with the plan.
- Hint 2: The server believes the amount your browser sends.
- Hint 3: POST /subscribe with plan=premium and amount=0 — Premium is granted for free.

### Another user’s subscription details (IDOR) (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Subscription pages live at /subscription/<id> and ids are small numbers.
- Hint 2: The page shows plan, amount and card digits — to whoever asks.
- Hint 3: As Bob, open /subscription/1 and read Alice’s plan and card last four digits.

## Comments & Ratings

### Stored XSS in episode comments (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Comments are printed under episodes exactly as written.
- Hint 2: Try leaving a comment that is more than text.
- Hint 3: Post a comment containing <script>alert(1)</script> on any episode — it is stored and served raw to every visitor.

### Rating value tampering (stars out of range) (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The rating form offers 1–5 stars, but that limit lives only in the HTML.
- Hint 2: The server stores whatever number arrives.
- Hint 3: POST a rating with stars=100 to /episode/1/rate and check the average afterwards.

## Creator Analytics & Payouts

### Another creator’s analytics (IDOR) (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Analytics pages live at /analytics/<showId>.
- Hint 2: Plays and revenue are commercially sensitive — and served to any creator who asks.
- Hint 3: As Maya, open /analytics/1 and read Casey’s plays and revenue.

### Another creator’s payout record (IDOR) (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Payout receipts live at /payout/<id> with small sequential ids.
- Hint 2: Receipts include the bank reference — exactly what a fraudster needs.
- Hint 3: As Maya, open /payout/1 and read Casey’s payout amount and bank reference.

### Payout amount exceeds earnings (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The payout form asks how much you want to withdraw.
- Hint 2: Compare the amount you request with the earnings the studio shows you.
- Hint 3: Request a payout far above your earnings (e.g. 100000) — it is recorded without any balance check.

## Admin Panel

### Admin panel served when role cookie is absent (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The admin gate reads your role from a cookie.
- Hint 2: Ask yourself what the code does when that cookie is simply not there.
- Hint 3: Sign in, delete the hx_role cookie entirely, then visit /admin — the gate defaults to letting you in.

### CSRF on admin episode-hide action (Advanced)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Admin actions are plain POSTs — like the episode hide button.
- Hint 2: Like the profile form, the hx_origin marker is rendered but never verified.
- Hint 3: As admin, POST /admin/episode/2/hide without the hx_origin field — the episode disappears anyway.

## Platform & API

### Unauthenticated /api/debug dumps all accounts (Beginner)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: Developers leave diagnostic endpoints behind. This app has one.
- Hint 2: It needs no login at all.
- Hint 3: Open /api/debug in a fresh browser with no session — every account, including passwords, comes back as JSON.

### Weak API token — base64 of email (Intermediate)
- Objective: perform the exploit so the server records the real effect (see VULNERABILITIES.md).
- Hint 1: The JSON API at /api/my/episodes authenticates with an X-Api-Token header.
- Hint 2: The token is not random — it is a simple encoding of something public.
- Hint 3: Send X-Api-Token set to the base64 encoding of alice@test.local — her data comes back with no session at all.
