# HexaChat (LAB 89) — Fix & Retest

For every scored test: the report entry, the secure implementation, and how to retest. After fixing, repeat the attack from the Practice Guide — it must fail, and the legitimate flow must still work.

## SQL Injection in Login Form Allows Authentication Bypass
- Test: SQL Injection Login Bypass (Login & Authentication)
- Severity: Critical
- Remediation: Use parameterised queries / prepared statements for all database access and never interpolate user input into SQL.
- Secure implementation: Parameterise the login query so credentials are bound as data, never concatenated into the query string.
- Regression test: repeat the exploit for "SQL Injection Login Bypass" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Missing Brute-Force Protection on Authentication Endpoint
- Test: No Brute-Force Protection on Login (Login & Authentication)
- Severity: High
- Remediation: Add per-account and per-IP rate limiting, progressive delays and lockout/alerting after repeated failures.
- Secure implementation: Throttle failed logins per account and per IP, with lockout and alerting after a small threshold.
- Regression test: repeat the exploit for "No Brute-Force Protection on Login" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Account Enumeration Through Differential Authentication Responses
- Test: User Enumeration via Login & Reset Responses (Login & Authentication)
- Severity: Medium
- Remediation: Return one generic message ("invalid credentials" / "if the account exists…") for every authentication and reset outcome.
- Secure implementation: Use identical generic responses and timing for existing and non-existing accounts on login and reset.
- Regression test: repeat the exploit for "User Enumeration via Login & Reset Responses" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Active Demo Account With Publicly Published Credentials
- Test: Published Demo Credentials (Login & Authentication)
- Severity: High
- Remediation: Remove demo/default accounts from production, or disable them and rotate their credentials before launch.
- Secure implementation: Delete demo/default accounts from production builds and never print working credentials on a login page.
- Regression test: repeat the exploit for "Published Demo Credentials" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Password Reset Tokens Are Predictable (Derived From User ID)
- Test: Predictable Password-Reset Token (Login & Authentication)
- Severity: Critical
- Remediation: Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.
- Secure implementation: Issue single-use, short-lived reset tokens from a cryptographically secure random generator.
- Regression test: repeat the exploit for "Predictable Password-Reset Token" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Authorisation Bypass via Client-Side Role Cookie
- Test: Role Cookie Tampering (hx_role) (Login & Authentication)
- Severity: Critical
- Remediation: Determine roles server-side from the authenticated session on every request; never trust client-supplied role data.
- Secure implementation: Look up the role from the server-side session record on every privileged request; ignore role cookies.
- Regression test: repeat the exploit for "Role Cookie Tampering (hx_role)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## No Minimum Password Strength Enforced at Registration
- Test: Weak Password Policy (1-Character Passwords) (Registration & Profile)
- Severity: Medium
- Remediation: Enforce a minimum length (≥10) and check new passwords against known-breached lists.
- Secure implementation: Enforce minimum password length and breached-password screening at registration and password change.
- Regression test: repeat the exploit for "Weak Password Policy (1-Character Passwords)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Mass Assignment Allows Privilege Escalation at Registration
- Test: Mass Assignment: Role Granted at Registration (Registration & Profile)
- Severity: Critical
- Remediation: Whitelist the exact fields a request may set (email, password, display name) and assign roles only through privileged server-side logic.
- Secure implementation: Build the account object from an explicit whitelist of registration fields; never bind raw request bodies.
- Regression test: repeat the exploit for "Mass Assignment: Role Granted at Registration" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Stored Cross-Site Scripting via Display Name
- Test: Stored XSS in Display Name (Registration & Profile)
- Severity: High
- Remediation: Contextually output-encode all user-supplied data and deploy a restrictive Content-Security-Policy.
- Secure implementation: HTML-encode display names (and all user content) at render time, everywhere they appear.
- Regression test: repeat the exploit for "Stored XSS in Display Name" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Missing CSRF Protection on Profile Update
- Test: CSRF on Profile Update (Registration & Profile)
- Severity: Medium
- Remediation: Require a per-session, unpredictable CSRF token on every state-changing request and verify it server-side.
- Secure implementation: Generate a per-session CSRF token, embed it in forms, and reject state changes that lack a valid token.
- Regression test: repeat the exploit for "CSRF on Profile Update" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Insecure Direct Object Reference Exposes Private Conversations
- Test: Read Another User’s Private Conversation (IDOR) (Direct Messages)
- Severity: High
- Remediation: Verify the requester is a participant of the conversation before returning any of its messages.
- Secure implementation: Check conversation membership server-side on every read and write.
- Regression test: repeat the exploit for "Read Another User’s Private Conversation (IDOR)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Missing Authorisation on Message Deletion Allows Deleting Other Users’ Messages
- Test: Delete Another User’s Message (Direct Messages)
- Severity: Medium
- Remediation: Only allow the message author (or a moderator through a checked flow) to delete a message.
- Secure implementation: Verify message authorship server-side before deletion.
- Regression test: repeat the exploit for "Delete Another User’s Message" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Block Enforcement Missing on API Message-Send Path
- Test: Blocked User Can Still Send Messages (API Path) (Direct Messages)
- Severity: Medium
- Remediation: Enforce block checks in the shared message-delivery service used by every client (web, mobile, API).
- Secure implementation: Move the block check into the single delivery function every send path calls.
- Regression test: repeat the exploit for "Blocked User Can Still Send Messages (API Path)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Private Group Join Does Not Verify Invite Code
- Test: Join a Private Group Without an Invite (Groups & Channels)
- Severity: High
- Remediation: Require and verify a valid, unexpired invite code server-side before adding any member to a private group.
- Secure implementation: Verify the invite code against the group record before granting membership.
- Regression test: repeat the exploit for "Join a Private Group Without an Invite" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Private Group Messages Served to Non-Members
- Test: Read Private Group Messages as a Non-Member (Groups & Channels)
- Severity: High
- Remediation: Check group membership server-side before returning group content; return 403 for non-members.
- Secure implementation: Gate group content behind a server-side membership check.
- Regression test: repeat the exploit for "Read Private Group Messages as a Non-Member" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Group Role Management Lacks Authorisation (Self-Promotion to Admin)
- Test: Self-Promote to Group Admin (Groups & Channels)
- Severity: High
- Remediation: Only allow group owners/admins to change member roles, verified server-side against stored membership.
- Secure implementation: Check the requester’s stored group role before applying any role change.
- Regression test: repeat the exploit for "Self-Promote to Group Admin" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Unauthorised Member Removal Allows Removing the Group Owner
- Test: Remove the Group Owner as a Regular Member (Groups & Channels)
- Severity: High
- Remediation: Restrict member removal to group admins, and never allow removal of the group owner through this endpoint.
- Secure implementation: Verify the requester is a group admin and protect the owner record from removal.
- Regression test: repeat the exploit for "Remove the Group Owner as a Regular Member" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Attachment Downloads Lack Ownership Checks (IDOR)
- Test: Download Another User’s Attachment (IDOR) (Attachments)
- Severity: High
- Remediation: Verify the requester owns the attachment or participates in the conversation it belongs to before serving the file.
- Secure implementation: Authorise every attachment download against the stored owner and conversation participants.
- Regression test: repeat the exploit for "Download Another User’s Attachment (IDOR)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Path Traversal in File Download Allows Reading Arbitrary Files
- Test: Path Traversal on File Download (Attachments)
- Severity: High
- Remediation: Resolve the requested path, require it to stay inside the upload directory, and serve files by id rather than by name.
- Secure implementation: Normalise and prefix-check every download path against the files directory.
- Regression test: repeat the exploit for "Path Traversal on File Download" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Unrestricted File Upload Allows Stored HTML/SVG (Active Content)
- Test: Unrestricted Upload: Stored HTML/SVG File Served (Attachments)
- Severity: High
- Remediation: Allow-list safe file types, verify content server-side, serve uploads from a separate domain with Content-Disposition: attachment.
- Secure implementation: Validate uploads against an extension/content allow-list and serve them as downloads, never as site pages.
- Regression test: repeat the exploit for "Unrestricted Upload: Stored HTML/SVG File Served" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## SQL Injection in Search Returns All Messages Including Private Content
- Test: SQL Injection in Message Search (Search)
- Severity: Critical
- Remediation: Parameterise search queries and scope results to content the requester is authorised to see.
- Secure implementation: Parameterise the search query and filter results by the requester’s access rights.
- Regression test: repeat the exploit for "SQL Injection in Message Search" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Reflected Cross-Site Scripting in Search Results
- Test: Reflected XSS in Search (Search)
- Severity: Medium
- Remediation: Output-encode the reflected query term (and all user input) in every response.
- Secure implementation: HTML-encode the search term wherever it is reflected in the results page.
- Regression test: repeat the exploit for "Reflected XSS in Search" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Broken Access Control on Moderator Console
- Test: Moderator Console Open to Any Logged-In User (Admin Panel)
- Severity: High
- Remediation: Require a moderator/admin role, verified server-side, for every staff page and action.
- Secure implementation: Add a server-side role check to the moderator console and every staff endpoint.
- Regression test: repeat the exploit for "Moderator Console Open to Any Logged-In User" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Missing CSRF Protection on Administrative Ban Action
- Test: CSRF on Admin Ban Action (Admin Panel)
- Severity: High
- Remediation: Require and verify per-session CSRF tokens on all administrative state-changing endpoints.
- Secure implementation: Verify the CSRF token server-side before applying any admin action.
- Regression test: repeat the exploit for "CSRF on Admin Ban Action" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## API Authentication Token Is a Guessable Encoding of the User’s Email
- Test: Weak API Token (Base64 of Email) (Platform & API)
- Severity: High
- Remediation: Issue high-entropy, random API tokens per user, store them hashed, and support revocation.
- Secure implementation: Replace email-derived tokens with random, revocable, server-issued API tokens.
- Regression test: repeat the exploit for "Weak API Token (Base64 of Email)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.

## Unauthenticated Debug Endpoint Exposes All User Credentials
- Test: Unauthenticated Debug Data Dump (/api/debug) (Platform & API)
- Severity: Critical
- Remediation: Remove debug endpoints from production builds; if diagnostics are needed, gate them behind admin auth and network restrictions.
- Secure implementation: Delete the debug endpoint from the production build entirely.
- Regression test: repeat the exploit for "Unauthenticated Debug Data Dump (/api/debug)" — the attack must be blocked, rejected or safely encoded, while the normal feature keeps working for legitimate users.
