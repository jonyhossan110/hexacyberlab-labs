# HexaNewsletter (LAB 88) — Practice Guide

Challenges grouped by feature, then difficulty. Hints are graded: nudge, stronger, near-answer. Objectives are measurable — a test flips only when the real effect happens.

## Login & Authentication

### SQL Injection Login Bypass (Beginner, A03:2021 Injection)
- Objective: make the "SQL Injection Login Bypass" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The login query is built by string concatenation.
- Hint 2: Try an email that closes the string early, like admin@hexanews.local' -- 
- Hint 3: A comment sequence after a valid email makes the password check disappear.

### Brute Force — No Rate Limiting or Lockout (Beginner, A07:2021 Authentication Failures)
- Objective: make the "Brute Force — No Rate Limiting or Lockout" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Nothing slows down repeated password guesses.
- Hint 2: Fail the same account 10 times in a row and watch what does not happen.
- Hint 3: No CAPTCHA, no delay, no lockout — the 10th failure is processed like the 1st.

### User Enumeration via Response Differences (Beginner, A07:2021 Authentication Failures)
- Objective: make the "User Enumeration via Response Differences" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Compare the exact wording for a real email vs an invented one.
- Hint 2: Both the login form and the forgot-password form answer differently.
- Hint 3: Probe 5 different emails across login/forgot and collect the differences.

### Published Demo Credentials (Beginner, A07:2021 Authentication Failures)
- Objective: make the "Published Demo Credentials" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The login page itself tells you a working password.
- Hint 2: Read the small print under the login form.
- Hint 3: Sign in as the demo account exactly as the page suggests.

### Predictable Password-Reset Token (Intermediate, A07:2021 Authentication Failures)
- Objective: make the "Predictable Password-Reset Token" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Reset tokens are computed, not random.
- Hint 2: The token contains the user id — and simple arithmetic on it.
- Hint 3: Compute rst-<id>-<id*137+42> for a user who never requested a reset, then use it.

### Role Cookie Tampering (hx_role) (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "Role Cookie Tampering (hx_role)" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: After login, inspect the cookies the app trusts.
- Hint 2: One cookie repeats your role — and the server believes the copy you send back.
- Hint 3: Set hx_role=admin in your browser and visit /admin.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner, A07:2021 Authentication Failures)
- Objective: make the "Weak Password Policy (1-Character Passwords)" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Try registering with the shortest password you can think of.
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: A single character is accepted as a password.

### Stored XSS in Display Name (Beginner, A03:2021 Injection)
- Objective: make the "Stored XSS in Display Name" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Your display name is printed back on pages other people see — including the admin panel.
- Hint 2: Names are stored and rendered without escaping.
- Hint 3: Register with a name like <script>alert(1)</script> and find where it lands raw.

### Mass Assignment — Role, Plan & API Key (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "Mass Assignment — Role, Plan & API Key" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The registration endpoint copies the whole request body onto the new user.
- Hint 2: Add fields the form never shows: role, plan, apiKey.
- Hint 3: Register with role=admin (or plan=pro) and check what your account became.

### CSRF on Profile Update (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "CSRF on Profile Update" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Profile updates are accepted from plain POSTs.
- Hint 2: The app sets an hx_origin marker cookie and its own forms include it — forged requests will not.
- Hint 3: POST /profile with a new name and no hx_origin field at all.

## Publications & Paid Content

### Paid Subscriber Tier Forged Without Payment (Beginner, A01:2021 Broken Access Control)
- Objective: make the "Paid Subscriber Tier Forged Without Payment" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The public subscribe form only offers the free tier — the endpoint accepts more.
- Hint 2: The tier is taken from the request, not from a payment.
- Hint 3: Subscribe to a paid publication while posting tier=paid.

### Unpublished Draft Issue Served by Direct URL (Beginner, A01:2021 Broken Access Control)
- Objective: make the "Unpublished Draft Issue Served by Direct URL" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Issue ids are small sequential numbers.
- Hint 2: Drafts are hidden from listings — but are they hidden from the issue page itself?
- Hint 3: Open the draft issue id directly while signed in as a different author.

### Paid Issue Full Text via Preview Parameter (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "Paid Issue Full Text via Preview Parameter" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Paid issues show only a teaser — unless the app thinks you are previewing.
- Hint 2: Try adding a preview flag to the issue URL.
- Hint 3: GET the premium issue with ?preview=1 and read the full text.

## Search

### Reflected XSS in Search (Beginner, A03:2021 Injection)
- Objective: make the "Reflected XSS in Search" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Your search term is printed back at the top of the results.
- Hint 2: It is printed without escaping.
- Hint 3: Search for a <script> payload and view the page source.

### SQL Injection in Search Leaks Unpublished Publications (Intermediate, A03:2021 Injection)
- Objective: make the "SQL Injection in Search Leaks Unpublished Publications" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Search builds its query the same broken way login does.
- Hint 2: A quote plus OR logic widens the result set dramatically.
- Hint 3: Search for ' OR '1'='1 and look for a publication that is not public.

## Subscribers & Lists

### Subscriber List Export IDOR (Beginner, A01:2021 Broken Access Control)
- Objective: make the "Subscriber List Export IDOR" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Exports are addressed by publication id alone.
- Hint 2: Nobody checks that the publication belongs to you.
- Hint 3: Download /subs/export?pub=1 while signed in as Bob.

### Subscriber Import Into Another User's Publication (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "Subscriber Import Into Another User's Publication" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Import takes a publication id and a CSV — ownership is never asked.
- Hint 2: You can write into lists you do not own.
- Hint 3: POST a CSV import aimed at publication 1 while signed in as Bob.

### Unsubscribe Token Forgery (Intermediate, A07:2021 Authentication Failures)
- Objective: make the "Unsubscribe Token Forgery" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Unsubscribe links carry a token — but a second, simpler token also works.
- Hint 2: Think about what an attacker knows: just the subscriber id.
- Hint 3: Try token unsub-<subscriberId> on the unsubscribe endpoint.

## Campaigns & Templates

### Campaign Analytics IDOR (Beginner, A01:2021 Broken Access Control)
- Objective: make the "Campaign Analytics IDOR" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Campaign pages are addressed by sequential ids.
- Hint 2: Opens, clicks and audience size are visible to whoever asks.
- Hint 3: Open campaign 1 while signed in as Bob.

### Campaign Sent to Another Publication's List (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "Campaign Sent to Another Publication's List" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The campaign form lists your publications — the endpoint accepts any publication id.
- Hint 2: Sending trusts the id you post.
- Hint 3: Create a campaign with pubId=1 while signed in as Bob and watch it "send".

### Stored XSS in Campaign Template (Intermediate, A03:2021 Injection)
- Objective: make the "Stored XSS in Campaign Template" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Templates are stored as raw HTML and rendered in campaign previews.
- Hint 2: Nothing sanitizes the HTML you save.
- Hint 3: Save a template containing a <script> payload.

## Analytics & API

### Unauthenticated /api/debug Dumps Users, Passwords & API Keys (Beginner, A01:2021 Broken Access Control)
- Objective: make the "Unauthenticated /api/debug Dumps Users, Passwords & API Keys" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Developers leave diagnostic endpoints behind.
- Hint 2: This one needs no login at all.
- Hint 3: Fetch /api/debug and read what it hands you.

### Sending With Another User's Leaked API Key (Intermediate, A07:2021 Authentication Failures)
- Objective: make the "Sending With Another User's Leaked API Key" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The API checks that a key exists — not that the key owns the publication.
- Hint 2: Keys leak from the debug endpoint.
- Hint 3: POST /api/send with Alice's key but Bob's publication (or any foreign list).

### Weak API Token — base64(email) Accepted (Intermediate, A07:2021 Authentication Failures)
- Objective: make the "Weak API Token — base64(email) Accepted" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: The API accepts a fallback token format for "legacy clients".
- Hint 2: It is a simple encoding of something public.
- Hint 3: Try x-api-key set to the base64 of a user's email address.

## Admin Panel

### Admin Panel Lists Plaintext Passwords (Beginner, A02:2021 Cryptographic Failures)
- Objective: make the "Admin Panel Lists Plaintext Passwords" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Reach the admin panel (the role cookie test shows the way).
- Hint 2: The user table shows more than names and emails.
- Hint 3: Read the password column — those are the real passwords.

### CSRF on Admin User Deletion (Intermediate, A01:2021 Broken Access Control)
- Objective: make the "CSRF on Admin User Deletion" test flip to done on the Mission Board (/tests) by performing the exploit end-to-end.
- Hint 1: Admin actions are plain POSTs.
- Hint 2: The deletion form carries no anti-CSRF marker — and the endpoint never checks for one.
- Hint 3: POST /admin/users/delete with an id and no hx_origin field.
