# HexaCommunity — Fix & Retest Guide

For every test: the finding as it appears in a real report, the secure implementation, and the regression check.

## SQL Injection in Login Allows Authentication Bypass
- Severity: Critical
- Feature: Login & Authentication (POST /login)
- Remediation: Use parameterised queries / prepared statements for all authentication lookups and never concatenate user input into SQL.
- Secure implementation: Replace the concatenated query with a parameterised lookup and compare a salted password hash (bcrypt/argon2) server-side.
- Regression test: Repeat the original exploit (Submit a login whose email or password contains a SQL tautology so the string-built query matches the first account without its real password.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Login Endpoint Has No Brute-Force Protection
- Severity: High
- Feature: Login & Authentication (POST /login)
- Remediation: Rate-limit and progressively delay failed logins per account and per IP, add lockout/backoff and alerting.
- Secure implementation: Track failed attempts per account/IP, enforce exponential backoff and CAPTCHA after a small threshold, and log the events.
- Regression test: Repeat the original exploit (Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Authentication Responses Allow Account Enumeration
- Severity: Medium
- Feature: Login & Authentication (POST /login and POST /forgot)
- Remediation: Return one generic message for all login and reset outcomes regardless of whether the account exists.
- Secure implementation: Use identical generic responses and timing for existing and non-existing accounts on login and password reset.
- Regression test: Repeat the original exploit (Compare responses for existing vs non-existing emails — they differ, so probing 5+ addresses reveals which ones are registered.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Working Demo Credentials Published on the Login Page
- Severity: Medium
- Feature: Login & Authentication (Login page / POST /login)
- Remediation: Remove demo credentials from production, or isolate demo accounts in a separate read-only demo environment.
- Secure implementation: Delete the published demo account from production data and never print working credentials on public pages.
- Regression test: Repeat the original exploit (The login page publishes a working demo account. Sign in with it — a live, real account anyone on the internet can use.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Password Reset Tokens Are Predictable
- Severity: High
- Feature: Login & Authentication (POST /reset)
- Remediation: Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.
- Secure implementation: Issue random single-use tokens with short expiry, stored hashed, and invalidate all sessions after a reset.
- Regression test: Repeat the original exploit (Reset tokens are derived from the user id with simple arithmetic. Compute another member's token and reset their password without ever requesting a reset.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Moderator Console Trusts a Client-Controlled Role Cookie
- Severity: High
- Feature: Login & Authentication (GET /mod)
- Remediation: Derive roles only from the server-side session record; never trust role values supplied by the client.
- Secure implementation: Remove the cookie-based role check; authorize /mod strictly from the session user's stored role.
- Regression test: Repeat the original exploit (The moderator console trusts a client-supplied hx_role cookie over the server-side session role. Set it as a plain member and walk in.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Registration Accepts 1-Character Passwords
- Severity: Medium
- Feature: Registration & Profile (POST /register)
- Remediation: Enforce a minimum length (≥10) and screen new passwords against breached-password lists.
- Secure implementation: Validate password length and strength server-side at registration and password change.
- Regression test: Repeat the original exploit (Register a new account with a 1-character password. It is accepted.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Registration Allows Mass Assignment of Role and Tier
- Severity: Critical
- Feature: Registration & Profile (POST /register)
- Remediation: Whitelist exactly the fields a registrant may set; assign role and tier server-side only.
- Secure implementation: Build the account from an explicit allow-list (name, email, password) and default role/tier server-side.
- Regression test: Repeat the original exploit (Registration binds every submitted field onto the new account. Add role=admin or tier=premium to the POST and the account is created with them.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Stored Cross-Site Scripting via Display Name
- Severity: High
- Feature: Registration & Profile (POST /register and POST /profile → member directory)
- Remediation: Context-encode all user-supplied values on output and validate/sanitise profile fields on input.
- Secure implementation: HTML-encode display names (and all user content) at render time; add a Content-Security-Policy as defence in depth.
- Regression test: Repeat the original exploit (Put an HTML/JS payload in the display name; it is stored and rendered unescaped to everyone who browses the directory or profile.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Profile Update Lacks CSRF Protection
- Severity: Medium
- Feature: Registration & Profile (POST /profile)
- Remediation: Require a per-session anti-CSRF token (or verify the origin marker) on every state-changing POST.
- Secure implementation: Generate a per-session CSRF token, embed it in forms, and reject state changes that arrive without it.
- Regression test: Repeat the original exploit (The profile update has no anti-CSRF token. A state-changing POST without the app's own hx_origin marker is accepted.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Private Member Contact Details Exposed via Profile URL
- Severity: High
- Feature: Member Directory (GET /member/:id)
- Remediation: Enforce the privacy flag on the profile endpoint: owner, admins or nobody — and minimise the fields returned.
- Secure implementation: Check the privacy flag server-side on every profile read and omit contact fields for private profiles.
- Regression test: Repeat the original exploit (Members who marked their profile private still have their email and phone rendered to any logged-in member who opens /member/<id> directly.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## SQL Injection in Member Search Exposes Unlisted Accounts
- Severity: High
- Feature: Member Directory (GET /directory?q=)
- Remediation: Parameterise the search query and keep the listed/visibility filter in server-side code, not in the injectable string.
- Secure implementation: Use a parameterised LIKE with escaped wildcards and apply the listed filter outside the user-controlled fragment.
- Regression test: Repeat the original exploit (The member search concatenates q into a LIKE query. Injecting a tautology plus a comment returns every account — including the unlisted member the search is supposed to hide.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Reflected Cross-Site Scripting in Member Search
- Severity: Medium
- Feature: Member Directory (GET /directory?q=)
- Remediation: HTML-encode the reflected search term (and all reflected input) on output.
- Secure implementation: Encode q when rendering the results heading and add CSP headers.
- Regression test: Repeat the original exploit (The search term is reflected into the results heading without encoding. Put a script payload in q and it comes straight back in the page.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Private Group Content Accessible to Non-Members
- Severity: High
- Feature: Private Groups (GET /group/:id)
- Remediation: Check group membership server-side before serving any private group content.
- Secure implementation: Authorize group reads against the membership list; non-members get a 403 and no content.
- Regression test: Repeat the original exploit (The Founders Circle is a private group, but its page — posts included — is served to any logged-in member, member of the group or not.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Group Join Approval Can Be Forged by the Client
- Severity: High
- Feature: Private Groups (POST /group/:id/join)
- Remediation: Record joins as pending server-side; only a moderator action may flip them to approved.
- Secure implementation: Ignore client-supplied approval state; create a pending request that only moderators can approve.
- Regression test: Repeat the original exploit (Joining an approval-required group trusts a client-supplied approved flag. Send approved=1 with the join and you are a member instantly.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Missing Ownership Check on Group Post Deletion (IDOR)
- Severity: Medium
- Feature: Private Groups (POST /grouppost/:id/delete)
- Remediation: Verify the caller is the post author (or a moderator) before deleting.
- Secure implementation: Authorize deletions server-side against post.authorId or a moderation role.
- Regression test: Repeat the original exploit (The group-post delete endpoint never checks authorship. Delete a post written by someone else by guessing its id.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Premium-Only Event RSVP Does Not Verify Member Tier
- Severity: Medium
- Feature: Events & RSVPs (POST /event/:id/rsvp)
- Remediation: Check the member's tier server-side before accepting an RSVP to a tier-restricted event.
- Secure implementation: Enforce tier restrictions in the RSVP handler, not in the page template.
- Regression test: Repeat the original exploit (The Premium Mastermind is premium-tier only, but the RSVP endpoint never checks tier. A free member RSVPs successfully.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Event RSVP Does Not Enforce Capacity
- Severity: Medium
- Feature: Events & RSVPs (POST /event/:id/rsvp)
- Remediation: Atomically check current attendance against capacity inside the RSVP transaction.
- Secure implementation: Count confirmed RSVPs server-side and reject new ones once capacity is reached.
- Regression test: Repeat the original exploit (The Community Meetup is capped at 2 seats and already full, but the RSVP endpoint never counts. RSVP anyway and the attendee list grows past capacity.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Missing Ownership Check on RSVP Cancellation (IDOR)
- Severity: Medium
- Feature: Events & RSVPs (POST /rsvp/:id/cancel)
- Remediation: Verify the RSVP belongs to the caller (or a moderator) before cancelling.
- Secure implementation: Authorize cancellations against rsvp.userId server-side.
- Regression test: Repeat the original exploit (RSVP cancel takes a bare id with no ownership check. Cancel Carol's meetup seat from your own account.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Premium Resource Download Lacks Tier Enforcement
- Severity: Medium
- Feature: Resource Library (GET /resource/:id/download)
- Remediation: Verify the member's tier on every premium download request.
- Secure implementation: Authorize downloads server-side against resource.tier and the caller's tier.
- Regression test: Repeat the original exploit (The Premium Growth Vault is premium-only, but the download endpoint serves its file to any logged-in member who asks.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Path Traversal in Resource Download
- Severity: High
- Feature: Resource Library (GET /resource/:id/download?file=)
- Remediation: Resolve the requested path, verify it stays inside the files directory, and serve files by id, not by name.
- Secure implementation: Map resource ids to fixed filenames server-side and reject any resolved path outside the files directory.
- Regression test: Repeat the original exploit (The download handler joins the file parameter onto the files folder without sanitising. ../ sequences escape the folder and read arbitrary files — including server.js.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Stored Cross-Site Scripting in Discussion Replies
- Severity: High
- Feature: Discussions (POST /discussion/:id/reply → thread view)
- Remediation: HTML-encode discussion content on render and sanitise any allowed markup.
- Secure implementation: Encode post bodies at render time; store text, render escaped.
- Regression test: Repeat the original exploit (Discussion replies are stored and rendered raw. Post a script payload as a reply; it is served to everyone who opens the thread.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Missing Ownership Check on Thread Deletion
- Severity: Medium
- Feature: Discussions (POST /discussion/:id/delete)
- Remediation: Only the thread author or a moderator may delete a thread; verify server-side.
- Secure implementation: Authorize deletion against thread.authorId or a moderation role.
- Regression test: Repeat the original exploit (Thread deletion checks nothing about authorship. Any member can delete any thread by id.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Admin Panel Accessible to Non-Admin Members
- Severity: High
- Feature: Admin & Moderation (GET /admin)
- Remediation: Require the admin role server-side for every /admin route.
- Secure implementation: Add an admin-only authorization check to the panel handler.
- Regression test: Repeat the original exploit (The admin panel — full member list with emails — is served to any signed-in user who opens /admin directly, whatever their role.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## Admin Ban Action Lacks CSRF Protection
- Severity: Medium
- Feature: Admin & Moderation (POST /admin/ban)
- Remediation: Require a per-session anti-CSRF token on all admin state-changing actions.
- Secure implementation: Issue per-session CSRF tokens and verify them on every admin POST.
- Regression test: Repeat the original exploit (The admin ban endpoint has no anti-CSRF protection. A ban POST without the app's hx_origin marker still executes.) — it must now fail, and the test must stay un-passed on a fresh progress file.

## API Authentication Token Is a Guessable Encoding of the Email
- Severity: High
- Feature: Platform & API (GET /api/members)
- Remediation: Issue random, high-entropy API tokens, store them hashed, and scope them per member.
- Secure implementation: Replace email-derived tokens with random secrets verified server-side.
- Regression test: Repeat the original exploit (The member API "authenticates" with a token that is simply base64(email) — a public value. Forge anyone's token and read the full member list without any session.) — it must now fail, and the test must stay un-passed on a fresh progress file.
