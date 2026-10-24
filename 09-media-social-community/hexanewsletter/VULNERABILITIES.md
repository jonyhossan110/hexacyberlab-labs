# HexaNewsletter (LAB 88) — Vulnerability Map

The complete map of scored tests in this lab, grouped by feature. Every entry is a real, working flaw in the app; tests complete only when the exploit actually succeeds server-side.

## Login & Authentication

### SQL Injection Login Bypass
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: On a real client's SaaS, this is a full account takeover of any user — including the owner — with no password at all.
- Report title: SQL Injection in Login Form Allows Authentication Bypass (Critical)

### Brute Force — No Rate Limiting or Lockout
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Impact: Attackers can guess weak passwords against real customer accounts at full speed, leading to account takeovers and support chaos.
- Report title: Missing Rate Limiting on Login Allows Unlimited Password Guessing (High)

### User Enumeration via Response Differences
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Impact: Attackers learn exactly which email addresses hold accounts, focusing phishing and password attacks where they will work.
- Report title: User Enumeration Through Differential Authentication Responses (Medium)

### Published Demo Credentials
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Impact: Anyone on the internet can sign in with the published demo login and explore the product as a real user — a beachhead for deeper attacks.
- Report title: Demo Account With Published Credentials Active in Production (High)

### Predictable Password-Reset Token
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Impact: An attacker can reset the password of any account — including the platform admin — and lock the real owner out.
- Report title: Password Reset Tokens Are Predictable (Derived From User ID) (Critical)

### Role Cookie Tampering (hx_role)
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Any free user can promote themselves to platform admin, exposing every customer, publication and password on the service.
- Report title: Client-Controlled Role Cookie Grants Administrative Access (Critical)

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- OWASP: A07:2021 Authentication Failures
- Difficulty: Beginner
- Impact: Customer accounts protected by trivial passwords fall to the first guessing attempt, and the business owns the breach headlines.
- Report title: No Minimum Password Strength Enforced at Registration (Medium)

### Mass Assignment — Role, Plan & API Key
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers mint themselves admin accounts or free Pro plans with self-chosen API keys — privilege escalation and revenue loss in one request.
- Report title: Mass Assignment in Registration Allows Role/Plan/API-Key Injection (High)

### Stored XSS in Display Name
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: An attacker plants a script in their profile name that fires in the admin panel, stealing staff sessions and taking over the platform.
- Report title: Stored Cross-Site Scripting via Display Name (High)

### CSRF on Profile Update
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A malicious page could silently rename or alter customer profiles while they are logged in, eroding trust and enabling follow-on fraud.
- Report title: Missing Anti-CSRF Token on Profile Update (Medium)

## Publications & Paid Content

### Paid Issue Full Text via Preview Parameter
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Every paying article is free to anyone who adds one parameter — the publication's entire subscription revenue model collapses.
- Report title: Paywall Bypass via Preview Parameter Exposes Paid Content (High)

### Paid Subscriber Tier Forged Without Payment
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Anyone becomes a "paid" subscriber for free, reading premium issues and inflating the metrics the business sells on.
- Report title: Client-Supplied Subscription Tier Allows Free Paid Access (High)

### Unpublished Draft Issue Served by Direct URL
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Unannounced launches, embargoed stories and internal notes leak early, damaging the publication and its partners.
- Report title: Draft Content Accessible by Direct URL (Missing State Check) (Medium)

## Search

### SQL Injection in Search Leaks Unpublished Publications
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: Attackers enumerate every publication — including secret, unannounced ones — through a single search request.
- Report title: SQL Injection in Search Exposes Unpublished Publications (High)

### Reflected XSS in Search
- OWASP: A03:2021 Injection
- Difficulty: Beginner
- Impact: A crafted search link executes script in a victim's browser, enabling session theft and phishing under the real domain.
- Report title: Reflected Cross-Site Scripting in Search Results (Medium)

## Subscribers & Lists

### Subscriber List Export IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: A competitor downloads the full subscriber email list of any publication — a GDPR breach and the theft of the business's core asset.
- Report title: Broken Access Control on Subscriber Export (IDOR) Exposes Email Lists (Critical)

### Subscriber Import Into Another User's Publication
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: Attackers inject fake or malicious subscribers into a rival's list, wrecking deliverability and getting the victim's domain blacklisted.
- Report title: Missing Ownership Check on Subscriber Import Allows List Poisoning (High)

### Unsubscribe Token Forgery
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone can unsubscribe every subscriber of a publication one id at a time, silently destroying its audience.
- Report title: Unsubscribe Tokens Are Forgeable From Subscriber IDs (High)

## Campaigns & Templates

### Campaign Sent to Another Publication's List
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: An attacker emails thousands of someone else's subscribers with scams from the victim's trusted brand and domain.
- Report title: Missing Ownership Check Allows Campaign Sends to Foreign Lists (Critical)

### Stored XSS in Campaign Template
- OWASP: A03:2021 Injection
- Difficulty: Intermediate
- Impact: A malicious template executes in the browsers of colleagues and reviewers who preview it, compromising their accounts.
- Report title: Stored Cross-Site Scripting via Campaign Template HTML (High)

### Campaign Analytics IDOR
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: Competitors read exact open/click performance of every campaign, stealing strategy and pricing signals.
- Report title: Broken Access Control on Campaign Analytics (IDOR) (Medium)

## Analytics & API

### Unauthenticated /api/debug Dumps Users, Passwords & API Keys
- OWASP: A01:2021 Broken Access Control
- Difficulty: Beginner
- Impact: One unauthenticated request leaks every user, plaintext password and live API key — total platform compromise in seconds.
- Report title: Unauthenticated Debug Endpoint Exposes Credentials and API Keys (Critical)

### Sending With Another User's Leaked API Key
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Impact: A leaked key lets attackers send mail as the platform to lists they do not own, burning sender reputation and enabling phishing at scale.
- Report title: API Key Accepted for Resources Owned by Other Accounts (High)

### Weak API Token — base64(email) Accepted
- OWASP: A07:2021 Authentication Failures
- Difficulty: Intermediate
- Impact: Anyone who knows a target's email address — public by design — owns their API account and can send as them.
- Report title: API Accepts base64(email) as a Valid Credential (Critical)

## Admin Panel

### Admin Panel Lists Plaintext Passwords
- OWASP: A02:2021 Cryptographic Failures
- Difficulty: Beginner
- Impact: One glance at the admin panel — or one admin account compromise — exposes every customer password for credential stuffing elsewhere.
- Report title: Plaintext Password Storage Exposed in Admin Panel (Critical)

### CSRF on Admin User Deletion
- OWASP: A01:2021 Broken Access Control
- Difficulty: Intermediate
- Impact: A booby-trapped page visited by an admin deletes user accounts, causing data loss and a support crisis.
- Report title: Missing Anti-CSRF Protection on Administrative User Deletion (High)
