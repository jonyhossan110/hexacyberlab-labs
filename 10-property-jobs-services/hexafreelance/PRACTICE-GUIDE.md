# HexaFreelance (LAB 95) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge mirrors the Mission Board (/tests) in the app.

## Login & Authentication

### [Beginner] SQL Injection login bypass
- Objective: make the "SQL Injection login bypass" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The login form builds its database query by gluing your input straight into a string.
- Hint 2: Try a quote character in the email field and see how the error/behaviour changes.
- Hint 3: Use the classic tautology in the email field: ' OR '1'='1' -- and any password.

### [Beginner] Brute force — no rate limiting or lockout
- Objective: make the "Brute force — no rate limiting or lockout" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Pick one real account and keep guessing its password.
- Hint 2: Count how many failures the server tolerates — does anything slow you down?
- Hint 3: Fail 10 times in a row for the same account; the server still processes number 10 like number 1.

### [Beginner] User enumeration via differing responses
- Objective: make the "User enumeration via differing responses" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Compare the error message for an email that exists vs one that does not.
- Hint 2: The forgot-password page answers differently too.
- Hint 3: Probe at least 5 different emails and watch which ones the server admits are real.

### [Beginner] Published demo / default credentials
- Objective: make the "Published demo / default credentials" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Read the login page itself very carefully — everything you need is on it.
- Hint 2: Demo accounts in production are real accounts.
- Hint 3: Sign in with the demo address printed under the login form.

### [Intermediate] Predictable password-reset token
- Objective: make the "Predictable password-reset token" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Request a reset for your own account and study the token format.
- Hint 2: The token is derived from something you already know about the victim.
- Hint 3: It is the user id plus simple arithmetic on that id (×137 + 42), formatted HF<id>-<n>.

### [Intermediate] Role trusted from a client-side cookie (hx_role)
- Objective: make the "Role trusted from a client-side cookie (hx_role)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The app shows your role in the UI — where does it read that role from?
- Hint 2: Cookies are client-side storage; you can edit them.
- Hint 3: Set a cookie named hx_role to admin and revisit the admin area.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- Objective: make the "Weak password policy (1 character accepted)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Register a new account and try the shortest password the form allows.
- Hint 2: There is no minimum length check at all.
- Hint 3: Use a one-character password — it will be accepted.

### [Beginner] Stored XSS in display name
- Objective: make the "Stored XSS in display name" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Your display name is rendered on profiles and listings all over the site.
- Hint 2: Names are output without encoding.
- Hint 3: Register with a name like <script>alert(1)</script> and view any page that shows it.

### [Intermediate] Mass assignment — role & balance set at registration
- Objective: make the "Mass assignment — role & balance set at registration" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The registration form only shows a few fields — the server may accept more.
- Hint 2: Add fields the form never offered you.
- Hint 3: POST role=admin (or a large balance) with your registration request.

### [Intermediate] CSRF on profile update
- Objective: make the "CSRF on profile update" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The site's own forms carry a hidden hx_marker field — forged requests would not.
- Hint 2: State-changing forms never verify that marker.
- Hint 3: POST a profile change without the hx_marker field; it is accepted anyway.

## Job Posts & Search

### [Beginner] SQL Injection in job search
- Objective: make the "SQL Injection in job search" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Search builds its query from your text exactly like the login form does.
- Hint 2: A tautology makes the filter match everything.
- Hint 3: Search for ' OR '1'='1 and compare the results with a normal search.

### [Beginner] Reflected XSS in job search
- Objective: make the "Reflected XSS in job search" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The results page repeats your search term back to you in the heading.
- Hint 2: It repeats it without encoding.
- Hint 3: Search for <script>alert(1)</script> and view the page source.

### [Beginner] Private (invite-only) job readable by direct URL
- Objective: make the "Private (invite-only) job readable by direct URL" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Private jobs are hidden from listings — but do they still have URLs?
- Hint 2: Job ids are small sequential numbers.
- Hint 3: Open the private job's page directly (try ids above the public ones) while signed in as someone who was not invited.

## Proposals

### [Beginner] Competitor proposal readable (IDOR) — private bid & notes leak
- Objective: make the "Competitor proposal readable (IDOR) — private bid & notes leak" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Proposals have sequential ids and their own pages.
- Hint 2: Who is supposed to see a proposal? The freelancer and the job owner. Who actually can?
- Hint 3: Open another freelancer's proposal page while signed in as a different freelancer.

### [Intermediate] Editing another freelancer's proposal amount
- Objective: make the "Editing another freelancer's proposal amount" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The edit form trusts the proposal id in the URL.
- Hint 2: Ownership is checked on the view page — is it checked on the edit action?
- Hint 3: POST a new amount to someone else's proposal edit endpoint.

### [Intermediate] Freelancer accepts their own proposal (broken access control)
- Objective: make the "Freelancer accepts their own proposal (broken access control)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Accepting a proposal is the client's decision — find the accept endpoint.
- Hint 2: The server checks that you are logged in, not who you are.
- Hint 3: As a freelancer, POST accept on your OWN proposal and watch a contract appear.

## Contracts & Milestones

### [Beginner] Contract of strangers readable (IDOR)
- Objective: make the "Contract of strangers readable (IDOR)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Contracts live at predictable URLs.
- Hint 2: Only the two parties should see amounts and milestones.
- Hint 3: Open a contract between two other users while signed in as an outsider.

### [Intermediate] CSRF on milestone approval
- Objective: make the "CSRF on milestone approval" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Approving a milestone moves real money — and uses the same marker-free pattern as profiles.
- Hint 2: The approval POST never verifies hx_marker.
- Hint 3: POST a milestone approval without the hx_marker field; the state changes anyway.

### [Advanced] Freelancer releases escrow milestone to themselves
- Objective: make the "Freelancer releases escrow milestone to themselves" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Releasing a milestone is supposed to be the client's approval action.
- Hint 2: Find the release endpoint on a funded milestone of a contract where YOU are the freelancer.
- Hint 3: Call release yourself — the escrow pays out to you without the client ever approving.

## Escrow & Payments

### [Beginner] Another freelancer's payout & earnings page readable (IDOR)
- Objective: make the "Another freelancer's payout & earnings page readable (IDOR)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Payout pages are keyed by user id.
- Hint 2: Your own payout page shows your balance and history — now change the id.
- Hint 3: Open the payout page of a different freelancer.

### [Intermediate] Escrow marked fully funded with a $1 payment
- Objective: make the "Escrow marked fully funded with a $1 payment" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Funding a contract asks for an amount — who decides what "fully funded" means?
- Hint 2: The server trusts the amount you send instead of comparing it to the contract total.
- Hint 3: Fund an awaiting-funds contract with amount=1 and check its status.

### [Advanced] Escrow refund sent to whoever asks (freelancer drains it)
- Objective: make the "Escrow refund sent to whoever asks (freelancer drains it)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The refund endpoint pays the escrow back — but to whom?
- Hint 2: It credits the wallet of whoever calls it, and either party can call it.
- Hint 3: As the freelancer on a funded contract, POST a refund and watch YOUR balance grow.

## Reviews

### [Beginner] Out-of-range rating accepted (stars=100)
- Objective: make the "Out-of-range rating accepted (stars=100)" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: The review form offers 1–5 stars — the server counts whatever you send.
- Hint 2: Form controls are suggestions, not validation.
- Hint 3: POST a review with stars=100 and check the stored value / average.

### [Intermediate] Editing another user's review
- Objective: make the "Editing another user's review" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Reviews have edit endpoints keyed by id.
- Hint 2: Authorship is displayed — but is it enforced on edit?
- Hint 3: POST an edit to a review written by someone else.

## Admin & Platform

### [Beginner] Admin user list (with passwords) open to any logged-in user
- Objective: make the "Admin user list (with passwords) open to any logged-in user" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: There is an admin area linked from nowhere. Its data page is even less protected than the dashboard.
- Hint 2: The user-list endpoint checks only that you are signed in.
- Hint 3: Visit /admin/users as a plain freelancer and read every account — passwords included.

### [Beginner] Unauthenticated /api/debug dumps the whole database
- Objective: make the "Unauthenticated /api/debug dumps the whole database" test flip to done on the Mission Board by performing the real exploit in the app.
- Hint 1: Debug endpoints love predictable paths.
- Hint 2: This one needs no login at all.
- Hint 3: GET /api/debug and read the platform's entire state as JSON.
