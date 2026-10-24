# HexaNutrition (LAB 68) — Fix & Retest Guide

For every scored test: the finding as it would appear in a real pentest report, the secure implementation, and the regression retest that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- **Severity:** Critical (A03:2021 Injection)
- **Secure implementation:** Use parameterised queries everywhere; never concatenate user input into SQL.
- **Regression retest:** Repeat the original exploit for "SQL Injection Login Bypass" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Missing Rate Limiting on Login Enables Brute Force
- **Severity:** High (A07:2021 Authentication Failures)
- **Secure implementation:** Add progressive delays, lockout and alerting after repeated failed logins.
- **Regression retest:** Repeat the original exploit for "Brute Force — No Login Rate Limiting" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Account Enumeration Through Differential Auth Responses
- **Severity:** Medium (A07:2021 Authentication Failures)
- **Secure implementation:** Return one generic message for all failed logins and reset requests.
- **Regression retest:** Repeat the original exploit for "User Enumeration via Login & Forgot Password" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Default Demo Administrator Credentials Active on Login
- **Severity:** Critical (A07:2021 Authentication Failures)
- **Secure implementation:** Remove demo accounts before launch; force unique credentials for every environment.
- **Regression retest:** Repeat the original exploit for "Published Default Demo Credentials" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Password Reset Tokens Are Predictable
- **Severity:** High (A07:2021 Authentication Failures)
- **Secure implementation:** Issue single-use, expiring reset tokens from a CSPRNG with at least 128 bits of entropy.
- **Regression retest:** Repeat the original exploit for "Predictable Password Reset Token" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Privilege Escalation via Client-Side Role Cookie
- **Severity:** Critical (A01:2021 Broken Access Control)
- **Secure implementation:** Never trust client-supplied role data; authorize from server-side session state.
- **Regression retest:** Repeat the original exploit for "Role Cookie Tampering" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Registration & Profile

### Registration Accepts Single-Character Passwords
- **Severity:** Medium (A07:2021 Authentication Failures)
- **Secure implementation:** Enforce a minimum length and block common passwords at registration.
- **Regression retest:** Repeat the original exploit for "Weak Password Policy" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Mass Assignment in Registration Allows Role/Plan Escalation
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Whitelist bindable fields on every endpoint; set role and plan server-side only.
- **Regression retest:** Repeat the original exploit for "Mass Assignment — Role & Plan at Registration" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Stored Cross-Site Scripting in Display Name
- **Severity:** High (A03:2021 Injection)
- **Secure implementation:** Escape all user-supplied output by default; add a Content-Security-Policy.
- **Regression retest:** Repeat the original exploit for "Stored XSS in Display Name" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Missing CSRF Protection on Profile Update
- **Severity:** Medium (A01:2021 Broken Access Control)
- **Secure implementation:** Require per-session CSRF tokens on all state-changing requests and verify them server-side.
- **Regression retest:** Repeat the original exploit for "CSRF on Profile Update" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Meal Plans

### Insecure Direct Object Reference on Meal Plans
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Check object ownership against the session user on every request.
- **Regression retest:** Repeat the original exploit for "Read Another Client's Meal Plan (IDOR)" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Missing Role Check on Nutritionist Plan-Update Endpoint
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Enforce role-based authorization inside every staff endpoint.
- **Regression retest:** Repeat the original exploit for "Client Edits Own Plan via Nutritionist Endpoint" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Unauthorised Modification of Other Clients’ Meal Plans
- **Severity:** Critical (A01:2021 Broken Access Control)
- **Secure implementation:** Authorize both the role and the object ownership on every update.
- **Regression retest:** Repeat the original exploit for "Edit Another Client's Meal Plan" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Consultations

### Client-Side Price Trust Allows Free Consultation Booking
- **Severity:** High (A04:2021 Insecure Design)
- **Secure implementation:** Look up the rate server-side and create bookings only after verified payment.
- **Regression retest:** Repeat the original exploit for "Consultation Booked Without Payment (Price Tampering)" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Insecure Direct Object Reference on Consultation Details
- **Severity:** Medium (A01:2021 Broken Access Control)
- **Secure implementation:** Scope every consultation query to the session user (or their assigned staff).
- **Regression retest:** Repeat the original exploit for "View Another Client's Consultation (IDOR)" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Missing Authorisation on Consultation Cancellation
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Verify the actor owns (or staffs) the consultation before cancelling.
- **Regression retest:** Repeat the original exploit for "Cancel Another Client's Consultation" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Food Logs & Check-ins

### Insecure Direct Object Reference on Food Log History
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Serve food logs only for the session user or their assigned nutritionist.
- **Regression retest:** Repeat the original exploit for "Read Another Client's Food Log History (IDOR)" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Check-in Forgery via Client-Supplied User ID
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Derive the user from the session; never accept a userId from the request body.
- **Regression retest:** Repeat the original exploit for "Forged Check-in for Another Client" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Recipes

### Missing Subscription Check on Premium Recipe Pages
- **Severity:** Medium (A01:2021 Broken Access Control)
- **Secure implementation:** Check the account plan server-side before serving premium content.
- **Regression retest:** Repeat the original exploit for "Premium Recipe Served Without a Subscription" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Premium Content Exposure Through API Responses
- **Severity:** Medium (A01:2021 Broken Access Control)
- **Secure implementation:** Apply entitlement checks and field-level filtering in API serializers.
- **Regression retest:** Repeat the original exploit for "Premium Recipe Content Leaked via API" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Subscriptions & Billing

### Client-Controlled Subscription Price
- **Severity:** High (A04:2021 Insecure Design)
- **Secure implementation:** Charge the server-side plan price via the payment provider; ignore posted amounts.
- **Regression retest:** Repeat the original exploit for "Subscription Price Tampering" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Single-Use Coupon Can Be Redeemed Repeatedly
- **Severity:** Medium (A04:2021 Insecure Design)
- **Secure implementation:** Enforce one redemption per account in the same transaction that grants the benefit.
- **Regression retest:** Repeat the original exploit for "Single-Use Coupon Reuse" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Search

### SQL Injection in Search Returns Full Client Directory
- **Severity:** High (A03:2021 Injection)
- **Secure implementation:** Parameterise search queries and scope results to the caller’s role.
- **Regression retest:** Repeat the original exploit for "SQL Injection in Search" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Reflected Cross-Site Scripting in Search Results
- **Severity:** Medium (A03:2021 Injection)
- **Secure implementation:** HTML-encode all reflected values; deploy a restrictive CSP.
- **Regression retest:** Repeat the original exploit for "Reflected XSS in Search" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

## Admin & Platform

### Broken Access Control on Caseload Export
- **Severity:** High (A01:2021 Broken Access Control)
- **Secure implementation:** Restrict caseload exports to staff roles and log every access.
- **Regression retest:** Repeat the original exploit for "Caseload Export Open to Any Logged-In User" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.

### Unauthenticated Debug Endpoint Discloses All Credentials
- **Severity:** Critical (A05:2021 Security Misconfiguration)
- **Secure implementation:** Remove debug endpoints from production builds; gate diagnostics behind admin auth and audit logs.
- **Regression retest:** Repeat the original exploit for "Debug Endpoint Exposes All Accounts & Passwords" exactly as in the Practice Guide. Expected after the fix: the attack fails (access denied / generic error / payload neutralised), no unintended state changes occur, and the legitimate user flow still works.
