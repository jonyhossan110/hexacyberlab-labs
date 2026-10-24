# HexaDevHub — Practice Guide (LAB 22)

25 challenges grouped by feature, ordered Beginner → Advanced inside each feature. Objective for every challenge: make the exploit's real effect happen; the /tests page flips to ✓ automatically. Use the 3 graded hints when stuck — and remember the Lab Coach unlocks step-by-step help after 3 genuine attempts on a feature.

## Login & Authentication

### SQL injection login bypass (Beginner · A03:2021 – Injection)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The login lookup is built by gluing your input straight into the query text.
  2. Try a quote in the email field and watch how the behaviour changes.
  3. Use the classic always-true condition: ' OR '1'='1 as the email, with any password.
- **What it teaches:** String-built queries let attacker input change the query logic itself — parameterised queries keep data and code separate.

### Brute force — no rate limiting or lockout (Beginner · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Fail a login on purpose. Does anything slow down, count, or lock?
  2. Keep failing — past 5, past 10. The form never pushes back.
  3. Ten or more failed attempts for one account are all processed normally — the missing throttle is the flaw.
- **What it teaches:** Without throttling or lockout, password guessing is free and unlimited; the server must count failures.

### User enumeration via login & reset responses (Beginner · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Compare the login error for an email that exists with one that does not.
  2. Do the same comparison on the forgot-password form.
  3. Different messages ("no account" vs "wrong password") confirm which emails are registered — that difference is the leak.
- **What it teaches:** Distinct error messages turn login and reset forms into a directory of valid accounts for targeted attacks.

### Weak default demo credentials (Beginner · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Portals often ship a seeded demo account — the login page mentions one.
  2. Demo accounts pair an obvious email with an obvious password.
  3. Try demo@hexadevhub.local with the password "demo". Seeded accounts must never survive into a real deployment.
- **What it teaches:** Seeded demo/default accounts are public knowledge — if they stay enabled, they are an open door.

### Predictable password-reset token (Intermediate · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Request a reset and study the token format the portal generates.
  2. The token is not random — it is derived from something you already know about the account.
  3. The token is simply the account email encoded in Base64. Encode a victim’s email and use it on the reset form.
- **What it teaches:** Reset tokens must be unguessable random values; deriving them from public data (like the email) makes them forgeable.

### Session role trusted from a client cookie (hx_role) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Log in and inspect the cookies the portal sets — one of them describes your role.
  2. Roles belong on the server. What happens if the browser simply claims a better one?
  3. Set the hx_role cookie to "admin" and open /admin — the portal believes the cookie.
- **What it teaches:** Authorisation data must live server-side in the session; anything stored client-side can be rewritten by the user.

## Registration & Profile

### Weak password policy (1-character passwords accepted) (Beginner · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Register a new account and try the shortest password the form will accept.
  2. There is no length or complexity check on the server.
  3. A password of a single character is accepted — the account is protected by almost nothing.
- **What it teaches:** The server must enforce password strength itself; browser-side hints are not a control.

### Stored XSS in display name (team roster) (Beginner · A03:2021 – Injection)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Your display name is shown to teammates on the project team roster.
  2. Names are rendered without escaping — markup survives the round trip.
  3. Set your display name to an <img onerror> payload; it executes for anyone viewing the team roster.
- **What it teaches:** Any user-controlled string rendered into HTML must be output-encoded, even "harmless" fields like names.

### Mass assignment — role set at registration (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The registration handler saves the whole submitted form onto the new account record.
  2. What fields does an account have that the form never shows you?
  3. Add a field to the registration POST — role=admin — and the new account is created as an admin.
- **What it teaches:** Binding request bodies directly to records lets attackers set fields the UI never offered (role, plan, balance).

### CSRF on profile update (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The profile form changes server state with a bare POST — no anti-CSRF token anywhere.
  2. The portal recognises its own pages only by the marker cookie it sets.
  3. Submit the profile change from a foreign Origin (or without the portal marker) — it is applied anyway.
- **What it teaches:** State-changing forms need unforgeable anti-CSRF tokens; cookies alone are sent automatically by the browser.

## Projects

### Private project readable by any account (IDOR) (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Project URLs carry a simple numeric id.
  2. Open the private project that belongs to the other seeded team — nothing checks that you are a member.
  3. Change the project id in the URL to another team’s private project and it is served to you in full.
- **What it teaches:** Every object access must check that the requester is authorised for THAT object, not just logged in.

### Project settings tampered by a non-member (write IDOR) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Reading is not the only thing missing a check — find the project settings handler.
  2. The settings POST trusts the project id in the URL.
  3. POST new settings (name, visibility) to another team’s project id — they are saved.
- **What it teaches:** Write paths need the same ownership checks as reads; a missing check on update is vandalism waiting to happen.

## API Tokens

### Live API token printed inside public docs quickstart (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Open the public documentation of the seeded public project — read the quickstart code sample carefully.
  2. The "example" credential in the sample is not a placeholder.
  3. The docs generator pastes the project’s real, live token into the example — anyone on the internet can copy and use it.
- **What it teaches:** Documentation generators must never substitute real credentials into examples; samples need obviously fake placeholders.

### Read-only token can write (scope not enforced) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Find a token whose scope is "read". The API still lets it change things.
  2. Scope is stored on the token, but the write endpoint never looks at it.
  3. Call the project-settings API endpoint with the read-only token — the change is applied.
- **What it teaches:** Scopes only protect you if every endpoint enforces them; storing a scope is not enforcement.

### Any user can revoke another project’s tokens (IDOR) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Token management actions address tokens by a simple numeric id.
  2. The revoke handler never asks whose token it is.
  3. Revoke a token that belongs to another team’s project — their integration dies instantly.
- **What it teaches:** Management endpoints must verify the caller owns the parent project of the token being changed.

### Forgeable legacy API token (derived from public ids) (Intermediate · A07:2021 – Identification and Authentication Failures)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The API still honours an old "legacy" token format alongside issued tokens.
  2. The legacy format is built only from values shown on the public project page.
  3. Legacy token = dh_legacy_<projectId>_<ownerId>. Both numbers are public — forge it and call the API.
- **What it teaches:** Credentials must be high-entropy secrets; anything derivable from public identifiers is not a credential.

## Documentation

### Private project documentation served without login (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Docs are addressed by a friendly slug, and the docs route never asks who you are.
  2. Private projects have docs too — their slugs follow the project name.
  3. Open the private project’s docs slug in a private window (logged out) — the full internal guide is served.
- **What it teaches:** Public-by-URL is not a permission model; private content needs an authorisation check on every request.

### Stored XSS in documentation page content (Intermediate · A03:2021 – Injection)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Docs pages allow rich formatting — the renderer trusts the stored content completely.
  2. HTML saved into a docs page comes back raw on the public docs view.
  3. Save a docs page containing a <script> or <img onerror> payload — it executes for every visitor of the public page.
- **What it teaches:** Rich-text features need allowlist sanitisation before rendering; storing raw HTML is stored XSS by design.

### Documentation of another project editable (IDOR) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Docs pages are addressed by id, and the edit handler trusts it.
  2. You do not need to belong to a project to save changes to its pages.
  3. POST an edit to a docs page of the other team’s project — your text replaces theirs.
- **What it teaches:** Editor endpoints need the same membership checks as the content they modify.

## Team Invites

### Invite link accepted by the wrong account (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. An invite is addressed to one email — watch what the accept handler actually checks.
  2. It checks that SOMEONE is logged in. Not who.
  3. Log in as a different person and open someone else’s invite link — you join the project.
- **What it teaches:** Invitations must be bound to the invited identity and verified at acceptance time.

### Invite link reusable (never marked used) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. After an invite is accepted, try the same link again from a second account.
  2. The invite record is never consumed.
  3. One invite link can onboard an unlimited number of accounts.
- **What it teaches:** Invite tokens are single-use credentials; they must be invalidated on first acceptance.

### Invite acceptance lets the guest choose their own role (Advanced · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The accept form posts more than the token — look at what else the handler trusts.
  2. The role stored in the invite is not the role the handler uses.
  3. Accept an invite while posting role=owner — you land in the project as its owner.
- **What it teaches:** Server-side records (the invite) must decide privileges; never take the granted role from the request.

## Usage & API

### Usage dashboard of another project viewable (IDOR) (Beginner · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. The usage dashboard URL carries the project id, like the project page.
  2. Membership is not checked here either.
  3. Open the usage dashboard of the other team’s project — full call volume and token usage is shown.
- **What it teaches:** Dashboards aggregate sensitive operational data and need the same per-object checks as the objects themselves.

### API returns another project’s stats (BOLA) (Intermediate · A01:2021 – Broken Access Control)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Your token unlocks your project’s stats endpoint. The id in the URL is the only thing choosing whose stats you get.
  2. The API never compares the token’s project with the requested project.
  3. Call /api/v1/projects/<other-id>/stats with your token — their usage data is returned.
- **What it teaches:** API authorisation must compare the credential’s owner with the requested object on every call.

## Platform & Admin

### Debug endpoint dumps users, tokens and config (Beginner · A05:2021 – Security Misconfiguration)
- **Objective:** Successfully exploit this flaw in HexaDevHub so the server registers the real effect.
- **Hints:**
  1. Development leftovers love obvious paths. The API has a diagnostics route.
  2. It answers without any login at all.
  3. GET /api/debug returns every user, every live token and the portal config in one JSON.
- **What it teaches:** Debug/diagnostic endpoints must never ship to production; if they exist they need admin auth and redaction.
