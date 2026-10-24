# HexaExpense — Fix & Retest Guide (LAB 50)

For every scored test: the secure implementation and the regression check that
proves the fix. After fixing, re-run the original exploit — it must fail — and
confirm the legitimate workflow still works.

## Login & Authentication

### SQL injection login bypass (legacy SSO route) (Critical)
- **Secure implementation:** Use parameterised queries everywhere and retire the legacy string-built login route.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "sqli-login" test, and the normal user flow for this feature must still succeed end to end.

### No rate limiting on login (brute force) (High)
- **Secure implementation:** Add progressive delays, lockout and alerting after repeated failed logins per account and IP.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "brute-force" test, and the normal user flow for this feature must still succeed end to end.

### User enumeration via login & password-reset responses (Medium)
- **Secure implementation:** Return one generic message for all failed logins and reset requests regardless of account existence.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "user-enum" test, and the normal user flow for this feature must still succeed end to end.

### Default demo credentials left active (High)
- **Secure implementation:** Remove seeded/demo accounts before go-live and force unique credentials for every user.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "default-creds" test, and the normal user flow for this feature must still succeed end to end.

### Predictable password-reset token (Critical)
- **Secure implementation:** Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, short expiry.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "reset-token" test, and the normal user flow for this feature must still succeed end to end.

### Role stored in a client cookie (session/role tampering) (Critical)
- **Secure implementation:** Store roles only in the server-side session and ignore client-supplied role values.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "cookie-role" test, and the normal user flow for this feature must still succeed end to end.

## Registration & Profile

### Mass assignment on registration (role self-assignment) (High)
- **Secure implementation:** Whitelist bindable fields on registration; assign role and company server-side only.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "mass-assign" test, and the normal user flow for this feature must still succeed end to end.

### Stored XSS in display name (High)
- **Secure implementation:** HTML-encode all user-supplied values on output and add a Content-Security-Policy.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "xss-profile" test, and the normal user flow for this feature must still succeed end to end.

### CSRF on profile update (Medium)
- **Secure implementation:** Require per-session CSRF tokens on all state-changing requests and validate Origin/Referer.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "csrf-profile" test, and the normal user flow for this feature must still succeed end to end.

## Expense Claims

### Expense IDOR — read another company’s claim (High)
- **Secure implementation:** Enforce per-object ownership and tenant checks on every expense read.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "expense-idor" test, and the normal user flow for this feature must still succeed end to end.

### Amount tampering on a submitted claim (High)
- **Secure implementation:** Reject amount changes once a claim leaves draft status; re-derive totals server-side.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "amount-tamper" test, and the normal user flow for this feature must still succeed end to end.

### Receipt swap — attach someone else’s (bigger) receipt (High)
- **Secure implementation:** Verify receipt ownership and reconcile receipt amount against the claim before acceptance.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "receipt-swap" test, and the normal user flow for this feature must still succeed end to end.

### Self-approval of own expense (Critical)
- **Secure implementation:** Reject approvals where approver == claim owner; enforce approver role and reporting line.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "self-approve" test, and the normal user flow for this feature must still succeed end to end.

### Skip the manager step — straight to paid (Critical)
- **Secure implementation:** Require a recorded manager approval before the finance payment transition is accepted.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "skip-step" test, and the normal user flow for this feature must still succeed end to end.

## Approvals & Workflow

### Manager approves another company’s claim (High)
- **Secure implementation:** Scope approval rights to claims in the approver’s own company and reporting line.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "cross-approve" test, and the normal user flow for this feature must still succeed end to end.

### Manager approval-limit bypass ($500 policy) (Medium)
- **Secure implementation:** Enforce per-role approval ceilings server-side; route over-limit claims to finance.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "approve-limit" test, and the normal user flow for this feature must still succeed end to end.

## Reimbursements

### Reimbursement bank-account tampering (co-worker’s payout account) (Critical)
- **Secure implementation:** Restrict bank changes to the account owner, require re-authentication and notify on change.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "bank-tamper" test, and the normal user flow for this feature must still succeed end to end.

### Double reimbursement — pay the same claim twice (High)
- **Secure implementation:** Allow exactly one payment per claim, guarded by status transition and a unique constraint.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "double-pay" test, and the normal user flow for this feature must still succeed end to end.

## Budgets & Policies

### Monthly Meals budget cap ($400) not enforced (Medium)
- **Secure implementation:** Check cumulative category spend against the cap inside the submission transaction and block or escalate overruns.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "budget-bypass" test, and the normal user flow for this feature must still succeed end to end.

## Search & Reports

### SQL injection in expense search leaks other tenants (Critical)
- **Secure implementation:** Parameterise the search query and always AND it with the requester’s tenant scope.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "search-sqli" test, and the normal user flow for this feature must still succeed end to end.

### Reflected XSS in expense search (Medium)
- **Secure implementation:** HTML-encode the reflected query term and all user data in search results.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "search-xss" test, and the normal user flow for this feature must still succeed end to end.

### CSV export ignores tenant scope (all companies) (High)
- **Secure implementation:** Apply tenant scoping to exports and restrict export rights to finance roles.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "export-cross" test, and the normal user flow for this feature must still succeed end to end.

## Receipts & Files

### Unrestricted receipt upload — HTML served from the app origin (High)
- **Secure implementation:** Whitelist receipt file types, sniff content, and serve uploads with Content-Disposition: attachment from a separate host.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "upload-html" test, and the normal user flow for this feature must still succeed end to end.

### Path traversal in receipt download reads server files (Critical)
- **Secure implementation:** Normalise and validate download paths against an allowlist directory; reject traversal sequences.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "traversal" test, and the normal user flow for this feature must still succeed end to end.

## Admin Panel

### Admin panel reachable by non-admin users (High)
- **Secure implementation:** Enforce admin-role checks server-side on every /admin route.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "admin-access" test, and the normal user flow for this feature must still succeed end to end.

### Debug endpoint dumps credentials & bank data (unauthenticated) (Critical)
- **Secure implementation:** Remove diagnostic endpoints from production builds; never store or return plaintext passwords.
- **Regression test:** Repeat the exploit from the Practice Guide; it must no longer flip the "debug-exposure" test, and the normal user flow for this feature must still succeed end to end.

