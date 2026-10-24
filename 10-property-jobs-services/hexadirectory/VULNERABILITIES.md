# HexaDirectory (LAB 100) — Vulnerability Map

The complete map of scored tests in this lab, grouped by feature. Every entry is a real, working flaw in the app; detection is server-side, on the exploit's real effect.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Inject an OR-tautology into the email or password field so the string-built query matches a user without knowing the password.
- **Impact:** On a real directory this means instant admin takeover: every listing, owner account and lead inquiry is exposed or editable by a stranger.

### Brute Force — No Rate Limiting or Lockout
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, CAPTCHA or lockout.
- **Impact:** Attackers can grind through common passwords against business-owner accounts and hijack their listings and customer leads.

### User Enumeration via Login & Forgot-Password Responses
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Compare responses for existing vs non-existing emails; the app confirms which emails are registered. Probe at least 5 distinct emails.
- **Impact:** Competitors or attackers can harvest the directory’s registered owner emails and aim phishing and password attacks precisely.

### Demo Credentials Published on the Login Page
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** GET /login
- **Exploitation outline:** The login page prints a working demo owner account. Sign in with it.
- **Impact:** A live directory account can be taken over by any visitor, letting them edit listings, read leads and post as the business.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Reset tokens follow a formula derived from the user id (HD<id>-<id*137+42>). Compute a token for a victim who never requested one and take over the account.
- **Impact:** Any registered owner’s account can be seized in seconds, giving attackers their listings, reviews and customer inquiries.

### Role Cookie Tampering Grants Admin
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /admin
- **Exploitation outline:** The admin area trusts the client-set hx_role cookie instead of the server-side account role. Set hx_role=admin on a normal account and open /admin.
- **Impact:** Every registered user becomes an admin: they can dump accounts, disable owners and rewrite the whole directory.

## Registration & Profile

### Weak Password Policy at Registration
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register a new account with a 1–3 character password; the app accepts it.
- **Impact:** Owner accounts protected by one-letter passwords fall to the first guessing attempt, handing over their business listings.

### Mass Assignment — Admin Role at Registration
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** Add a role=admin field to the registration request; the server copies it onto the new account.
- **Impact:** Anyone can mint themselves an admin account and take over the entire directory platform.

### Stored XSS in Display Name
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** POST /register (rendered in /admin and profiles)
- **Exploitation outline:** Register with an HTML/JS payload as the display name; it is stored and rendered unescaped.
- **Impact:** An attacker’s script runs in the browsers of directory admins and visitors, enabling session theft and defacement.

### CSRF on Profile Update
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** The profile update applies changes with no anti-CSRF marker. Submit it without the hx_origin field and the change still goes through.
- **Impact:** A malicious page visited by a logged-in owner silently rewrites their profile and contact details.

## Search & Discovery

### SQL Injection in Search Leaks Draft Listings
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** GET /search?q=
- **Exploitation outline:** Inject an OR-tautology into the search term; the result set expands to every listing, including unpublished drafts.
- **Impact:** Unpublished businesses, draft launches and internal listings leak to anyone, tipping off competitors.

### Reflected XSS in Search
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Beginner
- **Location:** GET /search?q=
- **Exploitation outline:** The search term is echoed unescaped in the results heading; submit a script payload as the query.
- **Impact:** Attackers craft search links that run script in victims’ browsers — a classic phishing and session-theft vector.

## Listings & Claims

### Claim Another Owner’s Listing Without Verification
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /listings/:id/claim
- **Exploitation outline:** The claim flow transfers ownership of ANY listing to whoever clicks claim — no proof of ownership is checked, even for listings that already have an owner.
- **Impact:** A rival can steal a business’s directory listing in one click, rewrite its phone number and divert all its customers.

### Edit a Competitor’s Listing (Broken Access Control)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** POST /listings/:id/edit
- **Exploitation outline:** The edit endpoint never checks that the editor owns the listing. Change another owner’s listing details.
- **Impact:** Competitors can sabotage listings — wrong phone numbers, fake closures, defaced descriptions — destroying trust and revenue.

### Unpublished Draft Listing Served by Direct URL
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /listings/:id
- **Exploitation outline:** Draft (unpublished) listings are hidden from search and home, but the detail page serves them to anyone who guesses the id.
- **Impact:** Pre-launch businesses and their contact details leak before they choose to go public.

## Reviews

### Rating Manipulation via Out-of-Range Stars
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /listings/:id/review
- **Exploitation outline:** The review form offers 1–5 stars, but the server accepts any number. Submit stars=100 and the average rating explodes.
- **Impact:** Fake ratings destroy the directory’s credibility and let scammers outrank honest businesses.

### Delete Another User’s Review (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** POST /reviews/:id/delete
- **Exploitation outline:** The delete endpoint does not verify authorship. Delete a review written by someone else.
- **Impact:** Businesses can erase negative reviews or rivals can erase positive ones, corrupting the review system.

### Stored XSS in Review Text
- **OWASP:** A03:2021 – Injection
- **Difficulty:** Intermediate
- **Location:** POST /listings/:id/review (rendered on the listing page)
- **Exploitation outline:** Review text is rendered raw on the public listing page. Post a review containing a script payload.
- **Impact:** Every visitor of a popular listing runs attacker script — drive-by malware, fake payment forms and session theft follow.

## Lead Inquiries

### Inquiry List of Another Owner’s Listing Exposed
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /listings/:id/inquiries
- **Exploitation outline:** The per-listing inquiry inbox is served to any logged-in user, not just the listing owner.
- **Impact:** A business’s entire pipeline of customer leads — names, emails, requests — leaks to competitors.

### Read Another Owner’s Lead Inquiry (IDOR)
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /inquiries/:id
- **Exploitation outline:** Individual inquiry pages are served by sequential id with no ownership check.
- **Impact:** Private customer messages and contact details are harvested lead by lead.

## Premium & Placement

### Premium Placement Price Tampering
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Beginner
- **Location:** POST /listings/:id/premium
- **Exploitation outline:** The upgrade price travels in the request and the server trusts it. Pay $1 (or $0) instead of $49 and premium activates.
- **Impact:** The directory’s paid placement revenue evaporates — everyone gets premium for a dollar.

### Single-Use 100%-Off Coupon Redeemed Repeatedly
- **OWASP:** A04:2021 – Insecure Design
- **Difficulty:** Intermediate
- **Location:** POST /listings/:id/premium
- **Exploitation outline:** Coupon DIR100 is meant to be single-use, but redemption is never recorded. Use it on two different listings.
- **Impact:** A leaked promo code becomes unlimited free premium placement for everyone, forever.

## Admin Panel

### Admin User Dump Served to Any Logged-In User
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /admin/users.json
- **Exploitation outline:** A JSON endpoint meant for admins returns every account including passwords, checking only that *someone* is logged in.
- **Impact:** Full credential disclosure for every business owner on the platform — total compromise in one request.

### CSRF on Admin Disable-User Action
- **OWASP:** A01:2021 – Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /admin/users/:id/disable
- **Exploitation outline:** The destructive disable-user action performs no CSRF-marker check. Submit it without hx_origin and the account is disabled.
- **Impact:** A tricked admin disables business owners’ accounts just by visiting a malicious page.

## Platform & API

### Unauthenticated /api/debug Data Dump
- **OWASP:** A05:2021 – Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /api/debug
- **Exploitation outline:** A leftover debug endpoint dumps users (with passwords), listings and inquiries to anyone, no login required.
- **Impact:** One unauthenticated request hands attackers every account credential and customer lead on the platform.

### Weak API Token — Base64 of Email Accepted
- **OWASP:** A07:2021 – Identification and Authentication Failures
- **Difficulty:** Intermediate
- **Location:** GET /api/my-inquiries with X-Api-Token header
- **Exploitation outline:** The API accepts base64(email) as a bearer token. Forge a token for any owner and read their inquiries with no session.
- **Impact:** Anyone who knows an owner’s email address — printed on their listing — owns their API identity.
