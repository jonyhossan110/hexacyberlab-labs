# HexaRide — Fix & Retest Guide

For every test: the secure implementation and the regression check that proves the fix.

## Login & Authentication

### SQL Injection in Login Form Allows Authentication Bypass
- Severity: Critical
- Fix: Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("SQL Injection Login Bypass") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

### Missing Rate Limiting / Account Lockout on Login
- Severity: High
- Fix: Throttle attempts per account and IP, add progressive delays or lockout, and alert on credential-stuffing patterns.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("No Brute-Force Protection on Login") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

### Account Enumeration Through Differential Error Messages
- Severity: Medium
- Fix: Return one generic message for login and password-reset regardless of whether the account exists.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("User Enumeration via Login & Reset Responses") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

### Default Administrative Credentials Active
- Severity: Critical
- Fix: Force unique strong passwords at first login; remove demo accounts and sample credentials from production.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Default / Published Demo Credentials") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

### Password Reset Tokens Are Predictable
- Severity: High
- Fix: Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Predictable Password-Reset Token") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

### Authorisation Decisions Trust a Client-Controlled Role Cookie
- Severity: High
- Fix: Derive roles only from the server-side session record; never trust role claims stored in cookies.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Role Cookie Tampering (Client-Side Role Trust)") — it must now FAIL (no test flip, no effect), while the legitimate Login & Authentication flow still works for authorised users.

## Registration & Profile

### No Minimum Password Strength Enforced at Registration
- Severity: Medium
- Fix: Enforce a minimum length (12+) and block known-breached passwords at registration and password change.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Weak Password Policy") — it must now FAIL (no test flip, no effect), while the legitimate Registration & Profile flow still works for authorised users.

### Mass Assignment Allows Setting Role and Wallet Balance at Registration
- Severity: High
- Fix: Whitelist exactly the fields each form may set; assign role and balance server-side only.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Mass Assignment — Role & Wallet Balance") — it must now FAIL (no test flip, no effect), while the legitimate Registration & Profile flow still works for authorised users.

### Stored Cross-Site Scripting via Display Name
- Severity: High
- Fix: Context-encode all user output and validate/sanitise stored profile fields.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Stored XSS in Display Name") — it must now FAIL (no test flip, no effect), while the legitimate Registration & Profile flow still works for authorised users.

### Missing CSRF Protection on Profile Update
- Severity: Medium
- Fix: Require and verify a per-session CSRF token on every state-changing request; use SameSite cookies as defence in depth.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("CSRF on Profile Update") — it must now FAIL (no test flip, no effect), while the legitimate Registration & Profile flow still works for authorised users.

## Trips & Fares

### Trip Fare Accepted From Client Instead of Server-Side Calculation
- Severity: High
- Fix: Compute fares exclusively on the server from distance and tariff; ignore client-supplied prices.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Fare Tampering — Client-Supplied Price") — it must now FAIL (no test flip, no effect), while the legitimate Trips & Fares flow still works for authorised users.

### Client-Supplied Trip Distance Used for Fare Calculation
- Severity: High
- Fix: Compute distance server-side from the stored pickup/dropoff coordinates; reject client-supplied distance.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Distance Tampering — Client-Supplied Distance") — it must now FAIL (no test flip, no effect), while the legitimate Trips & Fares flow still works for authorised users.

### Insecure Direct Object Reference on Trip Details
- Severity: High
- Fix: Verify the requesting user owns (or is assigned to) the trip on every read; return 404 for others.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Trip IDOR — Other Riders' Trips & Routes") — it must now FAIL (no test flip, no effect), while the legitimate Trips & Fares flow still works for authorised users.

### Missing Ownership Check Allows Cancelling Other Users' Trips
- Severity: High
- Fix: Authorise every state change against the trip owner / assigned driver on the server.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Cancel Another Rider's Trip (IDOR)") — it must now FAIL (no test flip, no effect), while the legitimate Trips & Fares flow still works for authorised users.

### Driver-Only Trip Completion Endpoint Accepts Any Authenticated User
- Severity: High
- Fix: Enforce role and assignment checks inside every driver endpoint, not just in the UI.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Trip Completion by Non-Driver (Broken Function-Level Authorisation)") — it must now FAIL (no test flip, no effect), while the legitimate Trips & Fares flow still works for authorised users.

## Promo Codes

### Multiple Promo Codes Can Be Stacked on One Trip
- Severity: Medium
- Fix: Enforce a single active promotion per trip on the server; reject additional codes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Promo Code Stacking") — it must now FAIL (no test flip, no effect), while the legitimate Promo Codes flow still works for authorised users.

### Single-Use Promo Code Can Be Redeemed Unlimited Times
- Severity: Medium
- Fix: Record redemptions per user and reject codes already redeemed where the terms say single-use.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Single-Use Promo Code Reuse") — it must now FAIL (no test flip, no effect), while the legitimate Promo Codes flow still works for authorised users.

### Promo Codes Applicable to Completed Trips, Crediting the Wallet
- Severity: High
- Fix: Only allow promo application on unpaid, uncompleted trips; never credit wallets from retroactive discounts.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Promo Applied to a Completed Trip — Wallet Refund") — it must now FAIL (no test flip, no effect), while the legitimate Promo Codes flow still works for authorised users.

## Wallet & Payments

### Wallet Credited With Client-Supplied Amount Independent of Payment
- Severity: Critical
- Fix: Credit wallets only from verified payment-provider callbacks, for the exact captured amount.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Wallet Top-Up Amount Forgery") — it must now FAIL (no test flip, no effect), while the legitimate Wallet & Payments flow still works for authorised users.

### Negative Payment Amount Accepted and Credited to Wallet
- Severity: High
- Fix: Reject non-positive amounts and require the payment to equal the server-side amount due.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Negative Trip Payment Credits the Wallet") — it must now FAIL (no test flip, no effect), while the legitimate Wallet & Payments flow still works for authorised users.

## Driver & Earnings

### Earnings of Any Driver Visible via IDOR
- Severity: Medium
- Fix: Ignore client-supplied driver ids; serve earnings only for the authenticated driver.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Driver Earnings IDOR") — it must now FAIL (no test flip, no effect), while the legitimate Driver & Earnings flow still works for authorised users.

### Payout Requests Not Checked Against Earnings Balance
- Severity: High
- Fix: Validate payout amount ≤ available earnings server-side and reserve the funds atomically.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Payout Above Earnings Balance") — it must now FAIL (no test flip, no effect), while the legitimate Driver & Earnings flow still works for authorised users.

## Ratings

### Rating Value Not Range-Validated (Accepts 100 Stars)
- Severity: Low
- Fix: Validate ratings as integers within 1–5 on the server.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Out-of-Range Rating Value Accepted") — it must now FAIL (no test flip, no effect), while the legitimate Ratings flow still works for authorised users.

### Users Can Rate Trips They Did Not Take
- Severity: Medium
- Fix: Only the trip's rider may rate it, once, after completion.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Rating a Trip You Did Not Take") — it must now FAIL (no test flip, no effect), while the legitimate Ratings flow still works for authorised users.

## Admin & Platform

### Administrative Panel Accessible to Any Authenticated User
- Severity: Critical
- Fix: Enforce admin role checks server-side on all administrative routes.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Admin Panel Without Access Control") — it must now FAIL (no test flip, no effect), while the legitimate Admin & Platform flow still works for authorised users.

### Unauthenticated Debug Endpoint Dumps User Credentials
- Severity: Critical
- Fix: Remove debug endpoints from production builds; never store or return plaintext passwords.
- Retest: repeat the original exploit from PRACTICE-GUIDE.md ("Debug Endpoint Exposes All Accounts & Passwords") — it must now FAIL (no test flip, no effect), while the legitimate Admin & Platform flow still works for authorised users.
