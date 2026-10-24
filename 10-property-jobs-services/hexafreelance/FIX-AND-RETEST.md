# HexaFreelance (LAB 95) — Fix & Retest

For every test: the secure implementation and how to retest it.

## Login & Authentication

### SQL Injection in authentication allows full login bypass
- Severity: Critical
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Missing rate limiting on login enables credential brute force
- Severity: High
- Fix: Add progressive delays / lockout and alerting after repeated failed logins per account and per IP.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Login and password-reset responses disclose whether an account exists
- Severity: Medium
- Fix: Return one generic message ("If the account exists…") for all authentication failures.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Active demo account with publicly documented credentials
- Severity: High
- Fix: Remove demo/default accounts from production and force unique credentials for every user.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Password-reset tokens are predictable from the user id
- Severity: High
- Fix: Generate reset tokens from a CSPRNG (≥128 bits), store hashed, expire quickly, single use.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Admin authorization trusts the client-controlled hx_role cookie
- Severity: Critical
- Fix: Derive roles exclusively from the server-side session/user record; ignore role claims from cookies.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Registration & Profile

### Registration accepts one-character passwords
- Severity: Medium
- Fix: Enforce a minimum length (≥10) and screen against breached-password lists.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Registration endpoint honours client-supplied role and balance fields
- Severity: Critical
- Fix: Whitelist bindable fields on registration; assign role and balance server-side only.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Stored cross-site scripting via the display-name field
- Severity: High
- Fix: Context-encode all user output and validate input; add a Content-Security-Policy.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Profile update accepts cross-site requests (no CSRF token verification)
- Severity: Medium
- Fix: Issue per-session CSRF tokens and verify them on every state-changing request.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Job Posts & Search

### SQL Injection in job search returns unauthorised records
- Severity: High
- Fix: Parameterise the search query and enforce visibility filters in the data layer.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Reflected cross-site scripting in the search results heading
- Severity: Medium
- Fix: HTML-encode reflected values on output; set a restrictive Content-Security-Policy.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Invite-only job posts are accessible to any authenticated user by direct URL (IDOR)
- Severity: High
- Fix: Check owner/invitee authorization on every object read, not just in listings.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Proposals

### Proposal pages lack object-level authorization (bid/IDOR)
- Severity: High
- Fix: Authorize proposal reads to the proposal owner and the job owner only.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Proposal edit endpoint allows modification of other users' proposals
- Severity: High
- Fix: Verify proposal ownership server-side on every mutation.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Proposal acceptance does not verify the job-owner role
- Severity: High
- Fix: Restrict proposal acceptance to the job owner and verify it server-side.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Contracts & Milestones

### Contract pages accessible to non-parties (IDOR)
- Severity: High
- Fix: Authorize contract access to its client and freelancer only.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Milestone release can be triggered by the payee (missing role check)
- Severity: Critical
- Fix: Allow milestone release only by the contract's client after an explicit approval step.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Milestone approval lacks CSRF protection
- Severity: High
- Fix: Require and verify per-session CSRF tokens on all payment-related state changes.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Escrow & Payments

### Escrow funding trusts the client-supplied amount
- Severity: Critical
- Fix: Compute funded state server-side from verified payment amounts against the contract total.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Escrow refund credits the caller instead of the original payer
- Severity: Critical
- Fix: Refunds must return funds only to the original funding account, initiated under strict role rules.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Payout/earnings pages lack object-level authorization
- Severity: Medium
- Fix: Restrict payout pages to the owning user (and admins).
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Reviews

### Review endpoint accepts out-of-range star values
- Severity: Medium
- Fix: Validate ratings server-side to the 1–5 range and one review per completed contract.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Review edit endpoint does not verify authorship
- Severity: Medium
- Fix: Check review authorship server-side before applying edits.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

## Admin & Platform

### Administrative user listing lacks role-based access control and exposes passwords
- Severity: Critical
- Fix: Enforce admin role on all admin endpoints and never store or display plaintext passwords.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.

### Unauthenticated debug endpoint exposes the full application dataset
- Severity: Critical
- Fix: Remove debug endpoints from production builds and gate diagnostics behind admin auth.
- Retest: repeat the original exploit from the Practice Guide; it must now fail (access denied / input rejected / state unchanged), and the corresponding Mission Board test must stay open on a fresh lab.
