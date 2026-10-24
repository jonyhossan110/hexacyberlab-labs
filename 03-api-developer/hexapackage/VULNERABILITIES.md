# HexaPackage — Vulnerability Map (25 scored tests)

## Login & Authentication

### SQL injection login bypass
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** Try email: ' OR '1'='1 — the lookup matches the first account in the table and never checks the password.
- **Impact:** On a real registry this means an attacker signs in as the administrator without any credentials, then owns every package, token and publisher account on the platform.

### Brute force — no rate limit or lockout
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** Send 10+ wrong passwords for priya@hexapackages.local and notice every one is still accepted for checking.
- **Impact:** Attackers can grind through password lists against publisher accounts and take over popular packages once a single password falls.

### User enumeration via login responses
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** Login once with priya@hexapackages.local (wrong password) and once with nobody@hexapackages.local — the messages differ.
- **Impact:** Attackers first harvest which publisher emails are real, then focus brute force and phishing only on accounts that exist.

### Default demo credentials still active
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** Sign in with demo@hexapackages.local / demo123 — the documented default was never disabled.
- **Impact:** Anyone can sign in with the shipped demo credentials and start abusing registry features under a "legitimate" account.

### Predictable password-reset token
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** The token is simply the base64 encoding of the account email. Compute it for any publisher and POST it to /reset.
- **Impact:** An attacker resets a top publisher's password, signs in, and pushes a malicious version of a widely downloaded package.

### Session role trusted from a client cookie
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Login & Authentication surface of the registry.
- **Exploitation outline:** Set the hx_role cookie to "admin" in your browser, then visit /admin — your account role never changed server-side.
- **Impact:** Any signed-in user promotes themselves to registry administrator — full control over users, packages and tokens.

## Registration & Profile

### Weak password policy at registration
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of the registry.
- **Exploitation outline:** Register with the password "a" — the account is created.
- **Impact:** Publisher accounts with trivial passwords are harvested by credential stuffing and used to poison packages.

### Mass assignment — role set from request body
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of the registry.
- **Exploitation outline:** POST /profile/update with an added field role=admin — the server applies it.
- **Impact:** A normal user self-promotes to administrator through a routine profile form, bypassing every approval process.

### Stored XSS in publisher display name
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Registration & Profile surface of the registry.
- **Exploitation outline:** Set your display name to <script>alert(1)</script> via /profile/update — it is stored and rendered unescaped.
- **Impact:** A malicious publisher name executes script in the browsers of registry admins and other publishers — session theft and actions in their name.

### CSRF on profile update
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Registration & Profile surface of the registry.
- **Exploitation outline:** POST /profile/update from a cross-site Origin (e.g. Origin: https://evil.example) while logged in — the change is applied.
- **Impact:** A publisher visiting a malicious page silently gets their profile — or worse, their account email — changed by an attacker.

## Packages & Versions

### Package takeover via maintainer manipulation
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Packages & Versions surface of the registry.
- **Exploitation outline:** As any user, POST /package/swiftcache/maintainers/add with username = your own account email — you become a maintainer of Marco's package.
- **Impact:** This is the classic supply-chain takeover: an attacker adds themselves as maintainer of a popular package and ships a backdoored release to thousands of projects.

### Version overwrite — republish replaces a released version
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Intermediate
- **Where:** the Packages & Versions surface of the registry.
- **Exploitation outline:** As a maintainer of dataforge, publish version 1.0.0 again with a new changelog/content — the original release is overwritten.
- **Impact:** Attackers who gain publish rights can rewrite history — swapping a trusted, audited release for a malicious one under the exact version everyone already approved.

### Unpublish/delete versions of other publishers' packages
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Packages & Versions surface of the registry.
- **Exploitation outline:** As any logged-in user, POST /package/webutils/unpublish with version 0.9.1 — Marco's release disappears.
- **Impact:** Competitors or vandals can pull a company's packages from distribution, breaking builds and deploys across every customer who depends on them.

### Ownership claim of an active package (name-squat transfer)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Advanced
- **Where:** the Packages & Versions surface of the registry.
- **Exploitation outline:** POST /package/dataforge/claim as any other user — ownership of an actively maintained package transfers to you immediately.
- **Impact:** A headline package can be seized in one request — its name, download base and reputation now belong to the attacker.

### Stored XSS in package README / description
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Packages & Versions surface of the registry.
- **Exploitation outline:** As a maintainer, POST /package/dataforge/readme with a description containing <script>alert(1)</script> — it renders raw on the package page.
- **Impact:** Every visitor of a popular package page — including registry admins — runs the attacker's script; one poisoned README can cascade into account takeovers.

## Search & Discovery

### SQL injection in package search exposes unlisted packages
- **OWASP:** A03:2021 Injection · **Difficulty:** Intermediate
- **Where:** the Search & Discovery surface of the registry.
- **Exploitation outline:** Search for: ' OR '1'='1 — the result set suddenly includes packages that are not listed publicly.
- **Impact:** Internal package names leak: attackers learn a company's private tooling and target it for dependency-confusion attacks.

### Reflected XSS in search results
- **OWASP:** A03:2021 Injection · **Difficulty:** Beginner
- **Where:** the Search & Discovery surface of the registry.
- **Exploitation outline:** Search for <script>alert(1)</script> — the term is reflected into the page unescaped.
- **Impact:** Attackers send victims crafted search links that run script in the registry origin — stealing sessions of signed-in publishers.

## Tokens & API

### Read-only token can publish (scope never checked)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Tokens & API surface of the registry.
- **Exploitation outline:** POST /api/v1/publish with the demo read token (Authorization: Bearer …) — a new version is created.
- **Impact:** A leaked low-privilege "read-only" token — the kind pasted into dashboards and CI logs — becomes full publish access to production packages.

### Token IDOR — view other publishers' token values
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Tokens & API surface of the registry.
- **Exploitation outline:** Open /tokens/1 while signed in as someone else — Priya's full publish token value is displayed.
- **Impact:** Any user harvests every publisher's live publish tokens and can release malicious versions as them.

### Legacy API key derived from the account email
- **OWASP:** A07:2021 Identification & Authentication Failures · **Difficulty:** Intermediate
- **Where:** the Tokens & API surface of the registry.
- **Exploitation outline:** Call GET /api/v1/me with header X-Api-Key set to the base64 of a user's email (e.g. the admin's) — you are authenticated as them.
- **Impact:** Anyone who knows a publisher's email — printed on every package page — owns their API identity.

### API returns unlisted package data to any token
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Tokens & API surface of the registry.
- **Exploitation outline:** GET /api/v1/packages/internal-tools with any valid token — full details of the unlisted package are returned.
- **Impact:** Private/internal packages (names, maintainers, versions) leak through the API even though the website correctly hides them.

## Downloads & Stats

### Download-count inflation (no rate limit / dedup)
- **OWASP:** A04:2021 Insecure Design · **Difficulty:** Beginner
- **Where:** the Downloads & Stats surface of the registry.
- **Exploitation outline:** Request /download/dataforge/1.1.0 twenty times in a row — the counter climbs by twenty.
- **Impact:** Attackers inflate a malicious package's download count to make it look established and trustworthy, pushing it up search results.

### Detailed download stats of others' packages are public
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Beginner
- **Where:** the Downloads & Stats surface of the registry.
- **Exploitation outline:** Open /stats/swiftcache as any other user — Marco's full download log, with customer emails, is shown.
- **Impact:** Competitors scrape which companies download a package and when — a ready-made list of another firm's customers to poach.

## Admin Panel

### Admin user deactivation via simple GET (CSRF)
- **OWASP:** A01:2021 Broken Access Control · **Difficulty:** Intermediate
- **Where:** the Admin Panel surface of the registry.
- **Exploitation outline:** While signed in as admin, GET /admin/users/5/deactivate — the account is disabled by a link an attacker could make the admin's browser visit.
- **Impact:** An attacker tricks the registry admin into opening a page and silently deactivates publisher accounts, locking companies out of their own packages.

## Platform & Exposure

### Debug endpoint dumps users, passwords and tokens
- **OWASP:** A05:2021 Security Misconfiguration · **Difficulty:** Beginner
- **Where:** the Platform & Exposure surface of the registry.
- **Exploitation outline:** GET /debug — the full registry state, including account passwords and live publish tokens, is returned to anyone.
- **Impact:** One unauthenticated request hands over every credential and token in the registry — total platform compromise in a single call.
