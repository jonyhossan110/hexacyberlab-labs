# HexaInvoice — Fix & Retest (all 26 scored tests)

For every test: the secure implementation, and the retest that proves the fix. The retest method throughout: apply the fix in a copy of the lab, re-run the exact exploit from `PRACTICE-GUIDE.md`, confirm it now **fails**, and confirm the legitimate flow still works.

## Login & Authentication

- **SQL Injection in Authentication (Login Bypass)** (Critical): Use parameterised queries / prepared statements everywhere; never build queries by string concatenation.
  *Retest:* the tautology login now returns "invalid credentials"; a normal login still works.
- **Missing Brute-Force Protection on Login** (High): Rate-limit and progressively delay failed logins, lock or challenge accounts after repeated failures, and alert on anomalies.
  *Retest:* the 10-attempt loop is throttled/locked before completion; the counter resets after a successful login.
- **User Enumeration via Divergent Password-Reset Responses** (Medium): Return one generic message for all reset requests ("If the account exists, a reset email has been sent").
  *Retest:* existing and non-existing emails produce byte-identical responses (body and timing aside).
- **Default Credentials on Platform Admin Account** (Critical): Force password change on first login, block known-default passwords, and audit seeded accounts before go-live.
  *Retest:* admin123 no longer authenticates anywhere; first login forces a reset.
- **Predictable Password Reset Tokens Allow Account Takeover** (High): Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire quickly, and invalidate after use.
  *Retest:* a computed/guessed token is rejected; only the emailed token works, once.
- **Unsigned Client-Side Session Allows Role Tampering (Privilege Escalation)** (High): Keep session state server-side or sign session tokens (e.g. HMAC/JWT with a server secret) and re-check the role from the database per request.
  *Retest:* a re-encoded cookie with role=owner is rejected (bad signature) and /settings stays 403 for the viewer.

## Registration & Firm Profile

- **Mass Assignment in Registration Allows Privilege Escalation** (High): Allowlist bindable fields server-side (name, email, password); assign roles and plans only through privileged code paths.
  *Retest:* registering with role=admin produces a normal owner account; the extra field is ignored.
- **No Minimum Password Strength Enforced** (Medium): Enforce ≥10–12 characters, screen against breached-password lists, and apply the same policy to resets and changes.
  *Retest:* password "x" is rejected with a policy error at register, reset and change.
- **Stored Cross-Site Scripting via Firm Name** (High): Context-aware output encoding for all user data; add a Content-Security-Policy as defence in depth.
  *Retest:* the payload displays as inert text on dashboard and invoices.
- **Cross-Site Request Forgery on Profile Update** (High): Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer as a fallback.
  *Retest:* a profile POST without a valid token is rejected (403) and the profile is unchanged.

## Clients

- **Insecure Direct Object Reference on Client Records** (High): Scope every query by the caller's account/tenant and return 404 for objects outside it.
  *Retest:* /clients/4 returns 404 for BrightLedger users and 200 for PixelCFO users.
- **Stored Cross-Site Scripting via Client Contact Name** (High): Output-encode all stored user data at render; validate/sanitise rich fields server-side.
  *Retest:* the payload shows as plain text on the client page and invoice prints.

## Invoices

- **Insecure Direct Object Reference on Invoice Detail** (High): Authorise every invoice access against the session's tenant; use unguessable IDs as defence in depth, not as the control.
  *Retest:* cross-account invoice URLs return 404; own invoices still open.
- **Client-Side Price Tampering on Invoice Creation** (High): Ignore client-posted prices; always price line items from the server-side catalogue and recompute totals server-side.
  *Retest:* posting unitPrice=1 still produces a $300 line from the catalogue.
- **Server-Side Validation Missing for Tax Rate and Discount** (High): Fix tax rates server-side per jurisdiction and enforce discount ceilings with approval workflows for exceptions.
  *Retest:* discountPct=100 or taxRate=0 is rejected/clamped to policy; valid invoices still save.
- **Invoice Status Forgery — Unauthorised State Transition to Paid** (Critical): Implement a server-side state machine; allow the paid state only when recorded payments cover the invoice total.
  *Retest:* POSTing status=paid on an unpaid invoice is rejected; the draft → sent → paid flow works via real payments.

## Payments

- **Payment Settlement Based on Client-Supplied Amount (Payment Forgery)** (Critical): Compute paid status strictly from the sum of verified payment records; reconcile against the payment provider.
  *Retest:* amount=1 with paidAmount=460 leaves the invoice "sent" with $1 recorded; paying the real balance settles it.
- **Insecure Direct Object Reference on Payment Receipts** (Medium): Check receipt ownership against the session tenant before serving any document.
  *Retest:* cross-account receipt URLs return 404.

## Recurring Templates

- **Missing Authorisation on Recurring Template Actions** (High): Scope template read/write/generate operations to the owning tenant and audit cross-tenant attempts.
  *Retest:* generating from another firm's template returns 404 and creates nothing.
- **Client-Supplied Amount Override on Template Generation** (High): Generate invoices strictly from stored template values; ignore or strictly validate any posted overrides.
  *Retest:* posting amount=1 still generates a $300 invoice from the template.

## Search & Exports

- **SQL Injection in Invoice Search** (Critical): Parameterise search queries and apply tenant scoping in the data layer, not in string filters.
  *Retest:* the tautology query returns only the caller's own invoices matching literally (none), never other tenants' rows.
- **Reflected Cross-Site Scripting in Search Results** (Medium): Encode all reflected input on output; avoid injecting raw query text into HTML.
  *Retest:* the payload appears encoded in the results heading.
- **Broken Access Control on Data Export (All Tenants)** (Critical): Restrict exports to owner role, scope rows to the caller's tenant, and log/alert on export events.
  *Retest:* viewer/staff exports are denied; an owner export contains only their firm's rows.

## Admin Panel

- **Broken Access Control Exposes Full User List with Passwords via JSON Endpoint** (Critical): Enforce admin role on the endpoint; never serialise password fields; store passwords hashed (bcrypt/argon2).
  *Retest:* staff receives 403 from /admin/users.json; the admin response contains no password material.
- **Cross-Site Request Forgery on Admin User Deactivation** (High): Require anti-CSRF tokens on all admin mutations and re-confirm highly sensitive actions.
  *Retest:* a deactivation POST without a valid token is rejected and the user stays active.

## Platform & API

- **Predictable API Tokens and Missing Tenant Scoping in API** (Critical): Issue random, revocable API keys (hashed at rest), and enforce tenant scoping on every API query.
  *Retest:* a token derived from an email is invalid; a valid key returns only its own firm's invoices.
