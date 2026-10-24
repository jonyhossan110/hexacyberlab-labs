# HexaDirectory (LAB 100) — Practice Guide

Challenges grouped by feature, then difficulty. Work them in the app; the Mission Board at /tests mirrors this guide. Help from the Lab Coach for a feature unlocks after 3 genuine attempts on that feature.

## Login & Authentication

### SQL Injection Login Bypass (Beginner)
- **Objective:** Make the "SQL Injection Login Bypass" test flip to done on the Mission Board by performing the real exploit at POST /login.
- **Hints:**
  1. The login query is built by string concatenation — quotes are not escaped.
  2. Try a classic tautology payload in the password field.
  3. Use ' OR '1'='1 in both fields and you will be logged in as the first matching user (the admin).

### Brute Force — No Rate Limiting or Lockout (Beginner)
- **Objective:** Make the "Brute Force — No Rate Limiting or Lockout" test flip to done on the Mission Board by performing the real exploit at POST /login.
- **Hints:**
  1. Pick one real account and keep guessing its password.
  2. Count how many failures the server tolerates — does anything change after 5? After 10?
  3. Ten failed logins for the same account are accepted for processing with no slowdown or lockout.

### User Enumeration via Login & Forgot-Password Responses (Beginner)
- **Objective:** Make the "User Enumeration via Login & Forgot-Password Responses" test flip to done on the Mission Board by performing the real exploit at POST /login and POST /forgot.
- **Hints:**
  1. Try logging in with an email that cannot exist, then with a real one — compare the error text.
  2. The forgot-password form answers differently too.
  3. Probe 5+ different emails across login/forgot until you can reliably tell registered from unregistered.

### Demo Credentials Published on the Login Page (Beginner)
- **Objective:** Make the "Demo Credentials Published on the Login Page" test flip to done on the Mission Board by performing the real exploit at GET /login.
- **Hints:**
  1. Read the login page carefully — everything you need is printed on it.
  2. Demo accounts in production are real accounts with real access.
  3. Use the demo owner email and password shown under the login form.

### Predictable Password-Reset Token (Intermediate)
- **Objective:** Make the "Predictable Password-Reset Token" test flip to done on the Mission Board by performing the real exploit at POST /reset.
- **Hints:**
  1. Request a reset for your own account and study the token format.
  2. The token mixes the user id with simple arithmetic — it is the same for everyone with that id.
  3. Compute HD<id>-<id*137+42> for the victim’s id and submit it at /reset without ever using /forgot for them.

### Role Cookie Tampering Grants Admin (Intermediate)
- **Objective:** Make the "Role Cookie Tampering Grants Admin" test flip to done on the Mission Board by performing the real exploit at GET /admin.
- **Hints:**
  1. Inspect the cookies the app sets after login — one of them sounds like a role.
  2. The server believes the cookie more than its own database.
  3. With any normal login, change the hx_role cookie value to admin and visit /admin.

## Registration & Profile

### Weak Password Policy at Registration (Beginner)
- **Objective:** Make the "Weak Password Policy at Registration" test flip to done on the Mission Board by performing the real exploit at POST /register.
- **Hints:**
  1. Try registering with the shortest password you can think of.
  2. There is no length or complexity check at all.
  3. A password like "a" is accepted and the account works immediately.

### Stored XSS in Display Name (Beginner)
- **Objective:** Make the "Stored XSS in Display Name" test flip to done on the Mission Board by performing the real exploit at POST /register (rendered in /admin and profiles).
- **Hints:**
  1. Your display name is shown back on several pages, including admin views.
  2. Try a name that is not really a name — something with angle brackets.
  3. Register with a name like <script>alert(1)</script> and it is stored verbatim.

### Mass Assignment — Admin Role at Registration (Intermediate)
- **Objective:** Make the "Mass Assignment — Admin Role at Registration" test flip to done on the Mission Board by performing the real exploit at POST /register.
- **Hints:**
  1. The registration form only shows name/email/password — the server may accept more fields.
  2. What field name would the user object use for its privilege level?
  3. Submit the registration with an extra role=admin field and then check your profile.

### CSRF on Profile Update (Intermediate)
- **Objective:** Make the "CSRF on Profile Update" test flip to done on the Mission Board by performing the real exploit at POST /profile.
- **Hints:**
  1. Legit forms carry a hidden hx_origin field — what happens if a request simply omits it?
  2. A cross-site form cannot read the marker, but a missing check means it does not need to.
  3. POST to /profile while logged in, leaving out hx_origin, and the new name is saved anyway.

## Search & Discovery

### Reflected XSS in Search (Beginner)
- **Objective:** Make the "Reflected XSS in Search" test flip to done on the Mission Board by performing the real exploit at GET /search?q=.
- **Hints:**
  1. Look at the "Results for:" line after a search.
  2. Your input comes back exactly as typed — including markup.
  3. Search for <script>alert(1)</script> and view the page source of the heading.

### SQL Injection in Search Leaks Draft Listings (Intermediate)
- **Objective:** Make the "SQL Injection in Search Leaks Draft Listings" test flip to done on the Mission Board by performing the real exploit at GET /search?q=.
- **Hints:**
  1. Search is powered by the same string-built query style as login.
  2. A normal search only shows published listings — what would an always-true condition show?
  3. Search for ' OR '1'='1 and look for a listing that never appears in normal results.

## Listings & Claims

### Edit a Competitor’s Listing (Broken Access Control) (Beginner)
- **Objective:** Make the "Edit a Competitor’s Listing (Broken Access Control)" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/edit.
- **Hints:**
  1. Listing ids are sequential — open the edit page of a listing that is not yours.
  2. The page loads and saves for anyone who is logged in.
  3. Edit Bob’s listing while logged in as Alice and the changes persist.

### Unpublished Draft Listing Served by Direct URL (Beginner)
- **Objective:** Make the "Unpublished Draft Listing Served by Direct URL" test flip to done on the Mission Board by performing the real exploit at GET /listings/:id.
- **Hints:**
  1. Listings have small sequential ids. One id never appears anywhere in the UI.
  2. Hidden from lists does not mean hidden from direct requests.
  3. Visit /listings/5 directly — a draft salon page renders with its contact details.

### Claim Another Owner’s Listing Without Verification (Intermediate)
- **Objective:** Make the "Claim Another Owner’s Listing Without Verification" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/claim.
- **Hints:**
  1. The pharmacy listing is unclaimed and claiming it is legitimate. Try a listing that already has an owner.
  2. Does the server ever ask you to prove the business is yours?
  3. Log in as one owner and claim a listing owned by a different owner — it becomes yours.

## Reviews

### Rating Manipulation via Out-of-Range Stars (Beginner)
- **Objective:** Make the "Rating Manipulation via Out-of-Range Stars" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/review.
- **Hints:**
  1. The dropdown limits you to 5 — the server does not.
  2. Ratings feed the average shown on the listing; what would an extreme value do?
  3. POST a review with stars=100 and watch the listing’s average.

### Delete Another User’s Review (IDOR) (Beginner)
- **Objective:** Make the "Delete Another User’s Review (IDOR)" test flip to done on the Mission Board by performing the real exploit at POST /reviews/:id/delete.
- **Hints:**
  1. Review ids appear in the page markup.
  2. Whose reviews can you see delete buttons for — and whose can you actually delete?
  3. POST to /reviews/1/delete while logged in as a different user; the review disappears.

### Stored XSS in Review Text (Intermediate)
- **Objective:** Make the "Stored XSS in Review Text" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/review (rendered on the listing page).
- **Hints:**
  1. Reviews are public content rendered for every visitor.
  2. Try markup in the review body, not just plain text.
  3. A review containing <script>alert(1)</script> is stored and served back unescaped.

## Lead Inquiries

### Inquiry List of Another Owner’s Listing Exposed (Beginner)
- **Objective:** Make the "Inquiry List of Another Owner’s Listing Exposed" test flip to done on the Mission Board by performing the real exploit at GET /listings/:id/inquiries.
- **Hints:**
  1. Owners have an inbox of customer inquiries per listing, under a predictable URL.
  2. Try opening the inbox of a listing you do not own.
  3. GET /listings/1/inquiries as Bob shows Alice’s customer leads.

### Read Another Owner’s Lead Inquiry (IDOR) (Beginner)
- **Objective:** Make the "Read Another Owner’s Lead Inquiry (IDOR)" test flip to done on the Mission Board by performing the real exploit at GET /inquiries/:id.
- **Hints:**
  1. Inquiry ids are small sequential numbers.
  2. You can read your own inquiries — can you read id 1 and 2 regardless of owner?
  3. Open /inquiries/1 as a user who does not own that listing.

## Premium & Placement

### Premium Placement Price Tampering (Beginner)
- **Objective:** Make the "Premium Placement Price Tampering" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/premium.
- **Hints:**
  1. The premium page states $49 — where does that number go when you submit?
  2. Prices sent by the client are suggestions, not truth.
  3. Submit the premium form with amount=1 and the listing turns premium.

### Single-Use 100%-Off Coupon Redeemed Repeatedly (Intermediate)
- **Objective:** Make the "Single-Use 100%-Off Coupon Redeemed Repeatedly" test flip to done on the Mission Board by performing the real exploit at POST /listings/:id/premium.
- **Hints:**
  1. The premium page mentions a launch coupon: DIR100 for 100% off.
  2. Single-use must be enforced somewhere — check whether it is.
  3. Apply DIR100 to one listing, then apply it again to a second listing; both go premium free.

## Admin Panel

### Admin User Dump Served to Any Logged-In User (Beginner)
- **Objective:** Make the "Admin User Dump Served to Any Logged-In User" test flip to done on the Mission Board by performing the real exploit at GET /admin/users.json.
- **Hints:**
  1. Admin tooling often lives under /admin — including data endpoints.
  2. Being logged in is not the same as being an admin.
  3. As Carol (a plain member), fetch /admin/users.json and read all credentials.

### CSRF on Admin Disable-User Action (Intermediate)
- **Objective:** Make the "CSRF on Admin Disable-User Action" test flip to done on the Mission Board by performing the real exploit at POST /admin/users/:id/disable.
- **Hints:**
  1. Powerful actions without tokens can be triggered cross-site.
  2. Compare the admin action form with the profile form — which marker is missing?
  3. POST /admin/users/4/disable with an admin session and no hx_origin field; Carol is disabled.

## Platform & API

### Unauthenticated /api/debug Data Dump (Beginner)
- **Objective:** Make the "Unauthenticated /api/debug Data Dump" test flip to done on the Mission Board by performing the real exploit at GET /api/debug.
- **Hints:**
  1. Debug and diagnostics endpoints are often left behind in production.
  2. This one answers even with no cookies at all.
  3. Fetch /api/debug in a fresh session and read the full data dump.

### Weak API Token — Base64 of Email Accepted (Intermediate)
- **Objective:** Make the "Weak API Token — Base64 of Email Accepted" test flip to done on the Mission Board by performing the real exploit at GET /api/my-inquiries with X-Api-Token header.
- **Hints:**
  1. API tokens should be unguessable. This one is derived from something public.
  2. What is the most predictable encoding of an email address?
  3. Send X-Api-Token as base64 of alice@test.local with no cookies — her inquiries come back.
