# HexaFreelance (LAB 95) — Vulnerabilities

The complete map of this lab: every scored test, grouped by feature.
The unlock key mechanism: this lab opens with the completion key of Lab 94 and, at 100%, reveals its own completion key for Lab 96. Keys are stored only as scattered encoded fragments inside the server and are never written in any document.

## Login & Authentication

### SQL Injection login bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Where: Login & Authentication flows of the live app
- Exploitation outline: Use the classic tautology in the email field: ' OR '1'='1' -- and any password.
- Impact: On a real marketplace this means instant takeover of the highest-privilege account, exposing every client, contract and payment on the platform.

### Brute force — no rate limiting or lockout
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Where: Login & Authentication flows of the live app
- Exploitation outline: Fail 10 times in a row for the same account; the server still processes number 10 like number 1.
- Impact: Attackers can grind through common passwords against client accounts and drain escrow balances once inside.

### User enumeration via differing responses
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Where: Login & Authentication flows of the live app
- Exploitation outline: Probe at least 5 different emails and watch which ones the server admits are real.
- Impact: Enumerated emails feed targeted phishing and credential-stuffing against the marketplace's clients.

### Published demo / default credentials
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Where: Login & Authentication flows of the live app
- Exploitation outline: Sign in with the demo address printed under the login form.
- Impact: Anyone on the internet can walk into a live account and use the platform's trusted features as a real user.

### Predictable password-reset token
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Intermediate
- Where: Login & Authentication flows of the live app
- Exploitation outline: It is the user id plus simple arithmetic on that id (×137 + 42), formatted HF<id>-<n>.
- Impact: An attacker who knows a victim's user id can reset their password and take over the account — and its escrow money.

### Role trusted from a client-side cookie (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Login & Authentication flows of the live app
- Exploitation outline: Set a cookie named hx_role to admin and revisit the admin area.
- Impact: Any freelancer can promote themselves to admin and moderate, ban or rob other users at will.

## Registration & Profile

### Weak password policy (1 character accepted)
- OWASP: A07:2021 Identification and Authentication Failures
- Difficulty: Beginner
- Where: Registration & Profile flows of the live app
- Exploitation outline: Use a one-character password — it will be accepted.
- Impact: Weak client passwords mean account takeovers, disputed payments and support chaos for the marketplace.

### Mass assignment — role & balance set at registration
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Registration & Profile flows of the live app
- Exploitation outline: POST role=admin (or a large balance) with your registration request.
- Impact: Attackers mint admin accounts or credit their own wallet balance out of thin air.

### Stored XSS in display name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Where: Registration & Profile flows of the live app
- Exploitation outline: Register with a name like <script>alert(1)</script> and view any page that shows it.
- Impact: A poisoned freelancer name can steal session cookies from clients and admins who merely view a proposal.

### CSRF on profile update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Registration & Profile flows of the live app
- Exploitation outline: POST a profile change without the hx_marker field; it is accepted anyway.
- Impact: Attackers can change a victim's contact email, then reset the password and own the account.

## Job Posts & Search

### SQL Injection in job search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Where: Job Posts & Search flows of the live app
- Exploitation outline: Search for ' OR '1'='1 and compare the results with a normal search.
- Impact: Injection in search dumps the whole job catalogue, including confidential invite-only engagements.

### Reflected XSS in job search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Where: Job Posts & Search flows of the live app
- Exploitation outline: Search for <script>alert(1)</script> and view the page source.
- Impact: A crafted search link sent to a client runs script in their session the moment they open it.

### Private (invite-only) job readable by direct URL
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Where: Job Posts & Search flows of the live app
- Exploitation outline: Open the private job's page directly (try ids above the public ones) while signed in as someone who was not invited.
- Impact: Confidential client engagements — budgets, internal plans — leak to any registered competitor.

## Proposals

### Competitor proposal readable (IDOR) — private bid & notes leak
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Where: Proposals flows of the live app
- Exploitation outline: Open another freelancer's proposal page while signed in as a different freelancer.
- Impact: Freelancers can read rivals' exact rates and private notes and undercut every auction.

### Editing another freelancer's proposal amount
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Proposals flows of the live app
- Exploitation outline: POST a new amount to someone else's proposal edit endpoint.
- Impact: A rival can sabotage bids — inflating a competitor's price so their own proposal wins.

### Freelancer accepts their own proposal (broken access control)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Proposals flows of the live app
- Exploitation outline: As a freelancer, POST accept on your OWN proposal and watch a contract appear.
- Impact: Freelancers can force-create contracts on their own terms without any client agreeing.

## Contracts & Milestones

### Contract of strangers readable (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Where: Contracts & Milestones flows of the live app
- Exploitation outline: Open a contract between two other users while signed in as an outsider.
- Impact: Rates, milestones and escrow states of every deal on the platform leak to competitors.

### Freelancer releases escrow milestone to themselves
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Where: Contracts & Milestones flows of the live app
- Exploitation outline: Call release yourself — the escrow pays out to you without the client ever approving.
- Impact: Freelancers can empty escrow the moment work is funded, before delivering anything.

### CSRF on milestone approval
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Contracts & Milestones flows of the live app
- Exploitation outline: POST a milestone approval without the hx_marker field; the state changes anyway.
- Impact: A client visiting a booby-trapped page silently approves milestone payments they never reviewed.

## Escrow & Payments

### Escrow marked fully funded with a $1 payment
- OWASP: A04:2021 Insecure Design
- Difficulty: Intermediate
- Where: Escrow & Payments flows of the live app
- Exploitation outline: Fund an awaiting-funds contract with amount=1 and check its status.
- Impact: Clients can activate $5,000 contracts for $1, leaving freelancers working against empty escrow.

### Escrow refund sent to whoever asks (freelancer drains it)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Advanced
- Where: Escrow & Payments flows of the live app
- Exploitation outline: As the freelancer on a funded contract, POST a refund and watch YOUR balance grow.
- Impact: The payee can "refund" the client's escrow straight into their own wallet — outright theft.

### Another freelancer's payout & earnings page readable (IDOR)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Where: Escrow & Payments flows of the live app
- Exploitation outline: Open the payout page of a different freelancer.
- Impact: Earnings of every freelancer leak, enabling targeted scams and unfair poaching.

## Reviews

### Out-of-range rating accepted (stars=100)
- OWASP: A04:2021 Insecure Design
- Difficulty: Beginner
- Where: Reviews flows of the live app
- Exploitation outline: POST a review with stars=100 and check the stored value / average.
- Impact: One forged review can rocket a scammer to the top of the marketplace rankings.

### Editing another user's review
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Where: Reviews flows of the live app
- Exploitation outline: POST an edit to a review written by someone else.
- Impact: Attackers can rewrite negative reviews about themselves or deface competitors' reputations.

## Admin & Platform

### Admin user list (with passwords) open to any logged-in user
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Where: Admin & Platform flows of the live app
- Exploitation outline: Visit /admin/users as a plain freelancer and read every account — passwords included.
- Impact: Full credential dump of every user — instant platform-wide account takeover.

### Unauthenticated /api/debug dumps the whole database
- OWASP: A05:2021 Security Misconfiguration
- Difficulty: Beginner
- Where: Admin & Platform flows of the live app
- Exploitation outline: GET /api/debug and read the platform's entire state as JSON.
- Impact: One unauthenticated request hands an attacker every user, password, contract and balance.
