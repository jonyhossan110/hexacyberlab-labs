# HexaSocial — Fix & Retest Guide (LAB 81)

For every test: the secure implementation and a regression retest that proves the fix.

## Login & Authentication

### SQL Injection Login Bypass
- Secure implementation: Use parameterised queries everywhere and never build SQL with string concatenation.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Brute Force — No Rate Limit or Lockout
- Secure implementation: Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### User Enumeration via Login & Forgot-Password Responses
- Secure implementation: Return one generic message for all failed logins and password-reset requests.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Demo / Default Credentials Published on the Login Page
- Secure implementation: Remove demo/default accounts from production or disable them and rotate their passwords.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Predictable Password-Reset Token
- Secure implementation: Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly, and make them single-use.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Role Cookie Tampering into the Moderator Queue
- Secure implementation: Determine roles from the server-side session record on every request; never trust role cookies.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Registration & Profile

### Weak Password Policy — 1-Character Passwords Accepted
- Secure implementation: Enforce a minimum length (12+ recommended) and block common/breached passwords.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Mass Assignment — Role & Follower Count at Registration
- Secure implementation: Whitelist exactly the fields a request may set; assign roles and counters server-side only.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Stored XSS in Display Name
- Secure implementation: Context-encode all user content on output and validate input server-side.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### CSRF on Profile Update
- Secure implementation: Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Search & Discovery

### SQL Injection in People Search Dumps Private Accounts
- Secure implementation: Parameterise the search query and enforce privacy filters in the data layer, not the UI.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Reflected XSS in Search Results
- Secure implementation: HTML-encode all reflected input and add a Content-Security-Policy header.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Posts & Feed

### IDOR — Read Private & Followers-Only Posts
- Secure implementation: Check the requester’s relationship to each object’s visibility on every read.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### IDOR — Edit Another User’s Post
- Secure implementation: Verify object ownership server-side before any update.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### IDOR — Delete Another User’s Post
- Secure implementation: Verify object ownership server-side before any destructive action.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Stored XSS in Post Body
- Secure implementation: Encode post bodies on output and sanitise any allowed markup.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Social Graph

### Forced Follow — Follow Action Forged for Another User
- Secure implementation: Derive the actor exclusively from the authenticated session; ignore actor fields in request bodies.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Private-Account Follow Approval Bypass
- Secure implementation: Create follow requests as pending server-side; only the target account can approve them.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Comments & Likes

### IDOR — Delete Another User’s Comment
- Secure implementation: Verify comment ownership (or moderator role) server-side before deletion.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Like Forgery — Like Recorded as Another User
- Secure implementation: Attribute likes to the session user server-side and enforce one like per user per post.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Direct Messages

### IDOR — Read Other People’s Private Conversations
- Secure implementation: Verify the requester is a conversation participant on every message read and write.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Send a Direct Message as Another User
- Secure implementation: Set the sender from the authenticated session and verify conversation participation.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Groups

### Join a Private Group Without Approval
- Secure implementation: For private groups, create a pending request that only the group owner/admin can approve.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Read a Private Group’s Posts as a Non-Member
- Secure implementation: Check group membership server-side before serving any group content.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

## Admin & Platform

### Admin Panel Open to Any Signed-In User
- Secure implementation: Enforce an admin-role check server-side on all administrative routes.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.

### Unauthenticated /api/debug Dumps All User Records
- Secure implementation: Remove debug endpoints from production builds and require admin auth for diagnostics.
- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.
