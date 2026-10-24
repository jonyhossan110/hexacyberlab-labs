# HexaRestaurant — Fix & Retest Guide (LAB 80)

For every scored test in LAB 80: the secure implementation pattern and the regression retest that proves the fix. Work through them after completing the lab.

## Login & Authentication

### SQL injection login bypass
- **Finding:** SQL Injection in Login Form Allows Authentication Bypass (Critical)
- **Fix:** Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Brute force — no rate limit or lockout
- **Finding:** Missing Brute-Force Protection on Login (High)
- **Fix:** Add rate limiting, progressive delays and account lockout / MFA for staff accounts.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### User enumeration via login & reset responses
- **Finding:** Account Enumeration Through Divergent Authentication Responses (Medium)
- **Fix:** Return one generic message ("invalid credentials" / "if the account exists…") for every authentication failure.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Demo credentials published on the login page
- **Finding:** Demo Account Credentials Exposed on Login Page (High)
- **Fix:** Remove demo/default accounts from production and never print credentials on public pages.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Predictable password-reset token
- **Finding:** Predictable Password Reset Token Enables Account Takeover (Critical)
- **Fix:** Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Role trusted from a client cookie (hx_role)
- **Finding:** Privilege Escalation via Client-Controlled Role Cookie (Critical)
- **Fix:** Derive roles exclusively from the server-side session/record; ignore role claims from cookies or request fields.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Registration & Profile

### Weak password policy (1 character accepted)
- **Finding:** No Password Strength Policy at Registration (Medium)
- **Fix:** Enforce a minimum length (≥10–12) and screen against common/breached password lists.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Mass assignment — role & loyalty points at signup
- **Finding:** Mass Assignment in Registration Allows Role and Balance Forgery (High)
- **Fix:** Whitelist the exact fields a request may set; assign role/balance fields only on the server.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Stored XSS in display name
- **Finding:** Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Context-encode all user output and apply a strict CSP; sanitise stored rich text.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### CSRF on profile update (marker never checked)
- **Finding:** Missing CSRF Validation on Profile Update (Medium)
- **Fix:** Issue per-session CSRF tokens, verify them on every state-changing request, and use SameSite cookies.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Menu & Search

### SQL injection in menu search leaks hidden items
- **Finding:** SQL Injection in Menu Search Exposes Hidden Records (High)
- **Fix:** Parameterise the search query and enforce visibility filters server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Reflected XSS in menu search
- **Finding:** Reflected Cross-Site Scripting in Search Results (Medium)
- **Fix:** HTML-encode all reflected input and deploy a Content-Security-Policy.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Table Bookings

### Booking a party larger than the table’s seats
- **Finding:** Server Fails to Enforce Table Capacity on Booking (Medium)
- **Fix:** Validate party size against the table’s seat count server-side before confirming a booking.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Double-booking the same table and time slot
- **Finding:** Missing Slot-Availability Check Allows Double Booking (Medium)
- **Fix:** Check slot availability in the same transaction that creates the booking; add a unique constraint.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### IDOR — view another diner’s booking
- **Finding:** Insecure Direct Object Reference on Booking Details (High)
- **Fix:** Authorise every object access against the session user’s ownership or role.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### IDOR — cancel another diner’s booking
- **Finding:** Missing Authorisation on Booking Cancellation (High)
- **Fix:** Verify booking ownership (or staff role) before applying cancellations.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Orders & Payments

### Menu price tampering at checkout
- **Finding:** Client-Supplied Price Trusted at Checkout (High)
- **Fix:** Compute all prices and totals server-side from the catalogue; ignore client-posted amounts.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Negative quantity creates a negative-total order
- **Finding:** Missing Quantity Validation Allows Negative Orders (Medium)
- **Fix:** Validate quantity as a positive integer within sane bounds server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### IDOR — view another diner’s order
- **Finding:** Insecure Direct Object Reference on Order Details (High)
- **Fix:** Scope every order query to the session user (or staff role) server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Diner marks own order paid/served (staff action)
- **Finding:** Missing Function-Level Authorisation on Order Status Changes (High)
- **Fix:** Restrict status transitions to staff roles and to the transitions each role may perform.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Reviews & Loyalty

### Loyalty points forged — redeem more than the balance
- **Finding:** Loyalty Redemption Without Balance Verification (High)
- **Fix:** Check and debit the loyalty balance server-side in the same transaction as the order.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Review posted without any completed order
- **Finding:** Reviews Accepted Without a Verified Completed Order (Medium)
- **Fix:** Require a completed order containing the item before accepting a review.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### Stored XSS in review text
- **Finding:** Stored Cross-Site Scripting in Customer Reviews (High)
- **Fix:** HTML-encode review text on render and add a restrictive Content-Security-Policy.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Staff & Manager

### Kitchen queue readable by any diner
- **Finding:** Broken Access Control on Kitchen Queue (Medium)
- **Fix:** Gate staff screens by server-side role checks on every request.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

### CSRF on manager price change
- **Finding:** Missing CSRF Validation on Manager Price Change (High)
- **Fix:** Verify per-session CSRF tokens on all state-changing manager actions.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.

## Platform & API

### API token is just base64(email)
- **Finding:** Predictable API Token (Base64 of Email) Allows Impersonation (High)
- **Fix:** Issue random, revocable API tokens per user and store them hashed server-side.
- **Retest:** Re-run the original exploit from the Practice Guide. Expected after the fix: the exploit no longer succeeds (no bypass, no foreign object, no forged state) and the Mission Board test can no longer be triggered by that path, while the legitimate flow still works.
