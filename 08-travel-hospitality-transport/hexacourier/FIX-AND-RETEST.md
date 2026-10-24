# HexaCourier — Fix & Retest Guide (LAB 77)

For every scored test: the secure implementation, and the regression test that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries everywhere; never build SQL by string concatenation.
- **Retest:** repeat the original exploit — Use email: ' OR '1'='1 with any password — the check ends up comparing the quote logic, not your password. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Missing Rate Limiting on Login Allows Brute-Force Attacks (High)
- **Fix:** Add progressive delays, account lockout and CAPTCHA after repeated failed logins.
- **Retest:** repeat the original exploit — The 10th wrong attempt is processed exactly like the first — the missing throttle is the flaw. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### User Enumeration Through Differential Authentication Responses (Medium)
- **Fix:** Return one generic message for all failed logins and password-reset requests.
- **Retest:** repeat the original exploit — Probe at least 5 different emails; the different answers confirm which accounts exist. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Active Demo Account With Publicly Displayed Credentials (High)
- **Fix:** Remove demo accounts from production and force unique credentials for every user.
- **Retest:** repeat the original exploit — Sign in with the demo courier credentials printed under the login form. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Password Reset Token Is Predictable (Derived From User ID) (Critical)
- **Fix:** Generate reset tokens with a CSPRNG, store only a hash, and expire them quickly.
- **Retest:** repeat the original exploit — Token = HC- plus a base36 value derived from the user id (id x 911 + 77). Compute another user's token and reset their password without any email. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Broken Access Control — Role Stored in a Client-Side Cookie (High)
- **Fix:** Keep roles in the server-side session record and verify them on every privileged request.
- **Retest:** repeat the original exploit — Set the hx_role cookie to dispatcher and open /dispatch — the server never checks your real role. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Registration & Profile

### Weak Password Policy Allows Single-Character Passwords (Medium)
- **Fix:** Enforce a minimum length of 10+ characters and block commonly used passwords.
- **Retest:** repeat the original exploit — Create an account with password 'x' — it works, and that is the vulnerability. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Mass Assignment in Registration Allows Role and Credit Injection (Critical)
- **Fix:** Whitelist exactly the fields a registration may set; assign role and credit server-side only.
- **Retest:** repeat the original exploit — Register including role=dispatcher and credit=5000 — you are given both. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** HTML-encode all user-controlled output and add a Content-Security-Policy.
- **Retest:** repeat the original exploit — Register with the name <script>alert(1)</script> — it is stored and rendered raw to staff. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Require and verify a per-session CSRF token on every state-changing request.
- **Retest:** repeat the original exploit — POST /profile with a new phone number and no hx_marker field — the change is accepted anyway. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Pickup Requests & Pricing

### Client-Supplied Price Trusted at Pickup Creation (High)
- **Fix:** Ignore client pricing fields; compute fees server-side from zone and weight.
- **Retest:** repeat the original exploit — Create a pickup for the Remote zone with price=1 — the parcel is booked for 1 instead of the real fee. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Missing Range Validation Allows Negative Parcel Weight (Medium)
- **Fix:** Validate weight as a positive number within business limits on the server.
- **Retest:** repeat the original exploit — Create a pickup with weightKg=-5 — it is accepted and drags the total below the zone fee. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Insecure Direct Object Reference on Parcel Details (High)
- **Fix:** Check ownership or assignment on every parcel read and write.
- **Retest:** repeat the original exploit — Open /parcels/<id> for an id that is not yours — another customer's addresses and COD amount are shown. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Broken Access Control Allows Cancelling Other Customers' Pickups (High)
- **Fix:** Verify the session user owns the parcel before allowing cancellation.
- **Retest:** repeat the original exploit — POST /parcels/<id>/cancel for someone else's parcel — it is cancelled. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Delivery Jobs & Assignment

### Missing Function-Level Authorisation on Job Assignment (High)
- **Fix:** Require the dispatcher/admin role server-side for assignment actions.
- **Retest:** repeat the original exploit — As a customer, POST /jobs/<id>/assign with a courierId — the job is assigned on your word. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Broken Access Control — Customer Can Confirm Delivery (High)
- **Fix:** Restrict delivery confirmation to the assigned courier and verify the assignment.
- **Retest:** repeat the original exploit — POST /jobs/<id>/deliver with a receiver name — the parcel becomes 'delivered'. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Missing Assignment Check Allows Cross-Courier Delivery (Medium)
- **Fix:** Verify parcel.courierId equals the session courier on pickup/deliver actions.
- **Retest:** repeat the original exploit — Deliver a parcel whose courierId is a different courier — it succeeds. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Insecure Direct Object Reference on Proof of Delivery (Medium)
- **Fix:** Restrict POD views to the parcel's customer, its assigned courier, and staff.
- **Retest:** repeat the original exploit — Open /pod/<id> for a parcel that is not yours — the receiver details are exposed. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## COD & Payments

### Cash-on-Delivery Amount Editable After Booking (High)
- **Fix:** Lock COD at creation; allow changes only by staff roles with an audit trail.
- **Retest:** repeat the original exploit — POST /parcels/<id>/cod with a new codAmount — the courier will collect whatever you set. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### COD Settlement Accepts Partial Amount as Fully Collected (High)
- **Fix:** Only mark COD collected when the received amount equals the amount due; log discrepancies.
- **Retest:** repeat the original exploit — POST /parcels/<id>/cod-collect with amount=1 on a large COD parcel — the books say 'collected'. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Courier Earnings & Manifest

### Insecure Direct Object Reference on Courier Earnings (Medium)
- **Fix:** Serve earnings only for the session courier (staff roles excepted).
- **Retest:** repeat the original exploit — Open /couriers/<otherId>/earnings — their delivered jobs and pay are listed for you. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Sensitive Data Exposure — Dispatch Manifest Served to Customers (Critical)
- **Fix:** Restrict the manifest to dispatcher/admin roles and audit access to it.
- **Retest:** repeat the original exploit — As a customer, open /manifest — the whole day's deliveries are yours to read. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Search & Tracking

### SQL Injection in Tracking Search Returns All Parcels (Critical)
- **Fix:** Parameterise all queries and validate tracking-code formats.
- **Retest:** repeat the original exploit — Search with ' OR '1'='1 — every parcel in the system is returned. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

### Reflected Cross-Site Scripting in Tracking Search (Medium)
- **Fix:** HTML-encode reflected values and deploy a Content-Security-Policy.
- **Retest:** repeat the original exploit — Search for <script>alert(1)</script> — the payload comes back raw in the page. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Admin Panel

### Broken Access Control on Admin Console (Critical)
- **Fix:** Enforce admin role checks on every admin route and never display stored passwords.
- **Retest:** repeat the original exploit — Open /admin while signed in as a customer — the user list, roles and passwords are served. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.

## Platform & API

### Unauthenticated Debug Endpoint Exposes Full Database (Critical)
- **Fix:** Remove debug endpoints from production builds entirely.
- **Retest:** repeat the original exploit — Open /api/debug in a private window — the full user and parcel data comes back as JSON. After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.
