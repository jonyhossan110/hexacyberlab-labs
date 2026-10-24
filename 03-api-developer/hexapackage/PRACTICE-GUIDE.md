# HexaPackage — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints
(same hints as the in-app Mission page at `/tests`) and a measurable objective.

## Login & Authentication

### SQL injection login bypass (Beginner · A03:2021 Injection)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The login form builds its account lookup by gluing your input straight into a query string.
2. What if the email field itself contained a quote and a condition that is always true?
3. Try email: ' OR '1'='1 — the lookup matches the first account in the table and never checks the password.

### Brute force — no rate limit or lockout (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. How many wrong passwords can you try for one account in a row?
2. Nothing slows you down, counts failures or locks the account — even the 10th failure is processed normally.
3. Send 10+ wrong passwords for priya@hexapackages.local and notice every one is still accepted for checking.

### User enumeration via login responses (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Compare the error for an email that exists with one that does not.
2. The two answers are worded differently — one confirms the account is real.
3. Login once with priya@hexapackages.local (wrong password) and once with nobody@hexapackages.local — the messages differ.

### Default demo credentials still active (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The product documentation mentions a demo account that ships with the registry.
2. Demo accounts usually follow a pattern: demo@… / demo…
3. Sign in with demo@hexapackages.local / demo123 — the documented default was never disabled.

### Predictable password-reset token (Intermediate · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Request a password reset and look closely at the token format.
2. The token is not random — it is derived from something public about the account.
3. The token is simply the base64 encoding of the account email. Compute it for any publisher and POST it to /reset.

### Session role trusted from a client cookie (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. After login, inspect the cookies the app sets — one of them carries your role.
2. The server trusts that cookie when deciding who may open /admin.
3. Set the hx_role cookie to "admin" in your browser, then visit /admin — your account role never changed server-side.

## Registration & Profile

### Weak password policy at registration (Beginner · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Register a new account and see how short a password you can get away with.
2. There is effectively no minimum length or complexity check.
3. Register with the password "a" — the account is created.

### Stored XSS in publisher display name (Beginner · A03:2021 Injection)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Your display name is shown on your public publisher page and in admin lists — how is it rendered?
2. Try storing markup instead of a plain name.
3. Set your display name to <script>alert(1)</script> via /profile/update — it is stored and rendered unescaped.

### Mass assignment — role set from request body (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The profile update form only shows name and bio fields — but the server binds the whole submitted object.
2. What extra field would change your privileges if the server copied it blindly?
3. POST /profile/update with an added field role=admin — the server applies it.

### CSRF on profile update (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Profile changes are accepted from a plain POST with no anti-CSRF token.
2. The app only checks that you are logged in — not where the request came from.
3. POST /profile/update from a cross-site Origin (e.g. Origin: https://evil.example) while logged in — the change is applied.

## Packages & Versions

### Unpublish/delete versions of other publishers' packages (Beginner · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The unpublish action removes a version from distribution. Whose versions can you unpublish?
2. Like the maintainer endpoint, it never checks package ownership.
3. As any logged-in user, POST /package/webutils/unpublish with version 0.9.1 — Marco's release disappears.

### Stored XSS in package README / description (Beginner · A03:2021 Injection)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Package pages render the README and description as rich content. Is any of it encoded?
2. Maintainers can edit the README — what if the README is not documentation but markup?
3. As a maintainer, POST /package/dataforge/readme with a description containing <script>alert(1)</script> — it renders raw on the package page.

### Package takeover via maintainer manipulation (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Maintainers can be added to a package from its page — who is allowed to do that?
2. The endpoint checks that you are logged in, but never that you own the package.
3. As any user, POST /package/swiftcache/maintainers/add with username = your own account email — you become a maintainer of Marco's package.

### Version overwrite — republish replaces a released version (Intermediate · A04:2021 Insecure Design)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Released versions should be immutable. What happens if you publish a version number that already exists?
2. The registry silently replaces the stored content instead of rejecting the duplicate.
3. As a maintainer of dataforge, publish version 1.0.0 again with a new changelog/content — the original release is overwritten.

### Ownership claim of an active package (name-squat transfer) (Advanced · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The registry lets users "claim" packages whose owners abandoned them. What proves abandonment?
2. The claim form exists — but the inactivity check behind it was never implemented.
3. POST /package/dataforge/claim as any other user — ownership of an actively maintained package transfers to you immediately.

## Search & Discovery

### Reflected XSS in search results (Beginner · A03:2021 Injection)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The results page echoes "Results for …" — how is your term written back?
2. Put markup in the search box and view the page source.
3. Search for <script>alert(1)</script> — the term is reflected into the page unescaped.

### SQL injection in package search exposes unlisted packages (Intermediate · A03:2021 Injection)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Search only shows listed packages — in the results the query builds.
2. The search term is glued into the lookup the same way the login was.
3. Search for: ' OR '1'='1 — the result set suddenly includes packages that are not listed publicly.

## Tokens & API

### Token IDOR — view other publishers' token values (Beginner · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Your token page shows each token at /tokens/<id>. The ids are small sequential numbers.
2. What stops you opening a token that is not yours?
3. Open /tokens/1 while signed in as someone else — Priya's full publish token value is displayed.

### Read-only token can publish (scope never checked) (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Tokens carry a scope: read or publish. The API publish endpoint authenticates the token — but does it authorise it?
2. The demo account owns a read-only token meant only for stats.
3. POST /api/v1/publish with the demo read token (Authorization: Bearer …) — a new version is created.

### Legacy API key derived from the account email (Intermediate · A07:2021 Identification & Authentication Failures)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The API also accepts a "legacy key" header for old integrations. Legacy schemes are rarely random.
2. The key is derived from something every publisher page shows publicly.
3. Call GET /api/v1/me with header X-Api-Key set to the base64 of a user's email (e.g. the admin's) — you are authenticated as them.

### API returns unlisted package data to any token (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. The API package endpoint looks packages up by name — does it apply the listed/unlisted visibility rule?
2. An unlisted internal package exists. The website hides it; the API may not.
3. GET /api/v1/packages/internal-tools with any valid token — full details of the unlisted package are returned.

## Downloads & Stats

### Download-count inflation (no rate limit / dedup) (Beginner · A04:2021 Insecure Design)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Download counts drive the registry's popularity rankings. What counts as a download?
2. Every single request bumps the counter — same user, same second, no questions asked.
3. Request /download/dataforge/1.1.0 twenty times in a row — the counter climbs by twenty.

### Detailed download stats of others' packages are public (Beginner · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Each package has a /stats page with the detailed download log. Who is it for?
2. The log includes downloader email addresses — and the page checks nothing at all.
3. Open /stats/swiftcache as any other user — Marco's full download log, with customer emails, is shown.

## Admin Panel

### Admin user deactivation via simple GET (CSRF) (Intermediate · A01:2021 Broken Access Control)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Admin actions should be deliberate POSTs with tokens. Look at how user deactivation is triggered in /admin.
2. It is a plain link — a GET request changes account state.
3. While signed in as admin, GET /admin/users/5/deactivate — the account is disabled by a link an attacker could make the admin's browser visit.

## Platform & Exposure

### Debug endpoint dumps users, passwords and tokens (Beginner · A05:2021 Security Misconfiguration)
**Objective:** make the server record this test as passed (watch the header progress bar / `/api/progress`).
Hints:
1. Development leftovers love predictable paths.
2. Try the endpoint every developer forgets to remove before shipping.
3. GET /debug — the full registry state, including account passwords and live publish tokens, is returned to anyone.
