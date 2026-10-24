# HexaPharma — Practice Guide (LAB 63)

Work through the challenges feature by feature. Each challenge lists its objective and 3 graded hints (the same hints the in-app Mission Board at `/tests` reveals one at a time). A challenge is complete only when the exploit really works — the lab detects success server-side.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the exploit succeed so the "SQL injection login bypass" test flips to done on the Mission Board.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.
- Hint 1: The login form builds its database query by gluing your input straight into the query string.
- Hint 2: What happens if your email address itself contains a quote and a logical operator?
- Hint 3: Try an email like alice@hexapharma.local' OR '1'='1 with any password.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the exploit succeed so the "Brute force — no rate limit or lockout" test flips to done on the Mission Board.
- **Lesson:** Without throttling or lockout, password guessing is free — the only defence left is the strength of each user’s password.
- Hint 1: Keep guessing passwords for the same account — does anything slow you down or lock the account?
- Hint 2: Ten wrong passwords in a row are accepted for processing without any challenge.
- Hint 3: Script 10+ failed logins for one account and observe that attempt 10 is processed exactly like attempt 1.

### [Beginner] User enumeration via login & forgot-password
- **Objective:** Make the exploit succeed so the "User enumeration via login & forgot-password" test flips to done on the Mission Board.
- **Lesson:** Differential error messages turn a login form into an oracle that confirms exactly which email addresses hold accounts.
- Hint 1: Compare the error messages for an email that exists and one that does not — on both the login and the forgot-password forms.
- Hint 2: Different answers leak which emails are registered.
- Hint 3: Probe at least 5 different emails through forgot-password and note the two different responses.

### [Beginner] Published demo credentials
- **Objective:** Make the exploit succeed so the "Published demo credentials" test flips to done on the Mission Board.
- **Lesson:** Demo and default credentials are the first thing an attacker tries; if they work in production, the door is simply open.
- Hint 1: Read the login page carefully — the site helpfully prints a working account for you.
- Hint 2: Demo accounts shipped to production are real accounts with real access.
- Hint 3: Log in with the demo email and password printed on the login page.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the exploit succeed so the "Predictable password-reset token" test flips to done on the Mission Board.
- **Lesson:** A reset token is a temporary password — if it can be computed from public data, account recovery becomes account takeover.
- Hint 1: Request a reset for your own account and study the shape of the token — is any part of it guessable?
- Hint 2: The token is derived from something public about the account, not from randomness.
- Hint 3: The token is PHR-<userId>-<userId*167+41>. Work it out for another account (ids are sequential) and reset their password without ever requesting a reset for them.

### [Intermediate] Session/role cookie tampering
- **Objective:** Make the exploit succeed so the "Session/role cookie tampering" test flips to done on the Mission Board.
- **Lesson:** Authorization decisions must come from server-side session data; a role stored in a client cookie is a suggestion, not a fact.
- Hint 1: After logging in, inspect the cookies the site sets — one of them describes your role.
- Hint 2: The pharmacist area trusts what the browser claims, not what the server knows.
- Hint 3: Set your hx_role cookie to pharmacist and open the pharmacist verification queue.

## Registration & Profile

### [Beginner] Weak password policy (1 character accepted)
- **Objective:** Make the exploit succeed so the "Weak password policy (1 character accepted)" test flips to done on the Mission Board.
- **Lesson:** Password policy is set at registration; accepting 1-character passwords guarantees brute-forceable accounts.
- Hint 1: Register a new account and see how short a password the site accepts.
- Hint 2: There is no minimum length or complexity check at all.
- Hint 3: Register with the password "x" — the account is created.

### [Intermediate] Mass assignment — role / store credit via extra fields
- **Objective:** Make the exploit succeed so the "Mass assignment — role / store credit via extra fields" test flips to done on the Mission Board.
- **Lesson:** Binding a whole request body to a user record lets attackers write fields that were never meant to be user-controlled.
- Hint 1: The registration and profile forms only show a few fields — the server accepts more than it shows.
- Hint 2: What if you submit a field the form never offered, like a staff role or a store-credit balance?
- Hint 3: Register with an extra role=pharmacist field (or add credit=9999 to a profile update) and watch it stick.

### [Beginner] Stored XSS in display name
- **Objective:** Make the exploit succeed so the "Stored XSS in display name" test flips to done on the Mission Board.
- **Lesson:** Any field rendered to other users is an XSS delivery vehicle if output encoding is missing — names are a classic carrier.
- Hint 1: Your display name is shown back on pages — including pages staff see.
- Hint 2: Names are rendered without escaping.
- Hint 3: Register (or rename yourself) with a name containing <script>alert(1)</script> and view the dashboard / admin user list.

### [Intermediate] CSRF on profile update
- **Objective:** Make the exploit succeed so the "CSRF on profile update" test flips to done on the Mission Board.
- **Lesson:** Without an anti-CSRF token that is actually verified, any website a logged-in user visits can change their profile.
- Hint 1: The site’s own forms carry a hidden hx_origin marker. Does the server ever check it?
- Hint 2: State changes are accepted from requests that did not come from the site’s forms.
- Hint 3: Submit a profile update POST without the hx_origin field (e.g. from a raw form on another origin) — the change is applied.

## Catalog & Search

### [Beginner] SQL injection in catalog search
- **Objective:** Make the exploit succeed so the "SQL injection in catalog search" test flips to done on the Mission Board.
- **Lesson:** Search boxes are injection points like any other; a successful injection can expose data that no page ever links to.
- Hint 1: Search is built by string-gluing too. A normal search only shows listed medicines.
- Hint 2: There is at least one internal product that never appears in the catalog… unless the query is bent.
- Hint 3: Search for ' OR '1'='1 and the full inventory — including the unlisted internal compound — comes back.

### [Beginner] Reflected XSS in search
- **Objective:** Make the exploit succeed so the "Reflected XSS in search" test flips to done on the Mission Board.
- **Lesson:** Reflected input must be encoded on output; a search page that echoes raw HTML turns every link into a script-delivery tool.
- Hint 1: The results page repeats your search term back to you, verbatim.
- Hint 2: Verbatim means unescaped — including markup.
- Hint 3: Search for <script>alert(1)</script> and view the page source / rendered result.

## Prescriptions & Files

### [Intermediate] Prescription approved without a pharmacist
- **Objective:** Make the exploit succeed so the "Prescription approved without a pharmacist" test flips to done on the Mission Board.
- **Lesson:** A workflow control (pharmacist verification) only exists if the server enforces who may perform it — the UI hiding the button is not a control.
- Hint 1: Prescriptions are verified by pharmacists through a decide endpoint. Who checks that the caller is one?
- Hint 2: The endpoint changes status for anyone who asks nicely.
- Hint 3: As a plain customer, POST to /pharmacy/prescriptions/<id>/decide with status=verified for a pending prescription.

### [Beginner] Prescription queue exposed to customers via API
- **Objective:** Make the exploit succeed so the "Prescription queue exposed to customers via API" test flips to done on the Mission Board.
- **Lesson:** APIs need the same authorization as the screens they mirror; "logged in" is not "entitled".
- Hint 1: There is a JSON API that mirrors the pharmacist’s work queue.
- Hint 2: It asks whether you are logged in — but not who you are.
- Hint 3: As a customer, open /api/prescriptions and read every patient’s pending prescriptions.

### [Beginner] Prescription file IDOR — other patients’ documents
- **Objective:** Make the exploit succeed so the "Prescription file IDOR — other patients’ documents" test flips to done on the Mission Board.
- **Lesson:** Sequential ids plus missing ownership checks equal bulk data theft — every document is one increment away.
- Hint 1: Uploaded prescription files are served from /files/rx/<id> with small sequential ids.
- Hint 2: The server never asks whether the file belongs to you.
- Hint 3: Log in as one patient and download another patient’s prescription file by changing the id.

### [Intermediate] Unrestricted upload — HTML served from the pharmacy origin
- **Objective:** Make the exploit succeed so the "Unrestricted upload — HTML served from the pharmacy origin" test flips to done on the Mission Board.
- **Lesson:** Upload features must validate type and serve files safely; an HTML file served from the trusted origin is stored XSS with a URL.
- Hint 1: The prescription upload accepts any file name and content, and the file is later served back.
- Hint 2: What content type is an uploaded .html file served with?
- Hint 3: Upload a "prescription" named evil.html containing a script payload, then open its /files/rx/<id> URL.

### [Intermediate] Path traversal on document download
- **Objective:** Make the exploit succeed so the "Path traversal on document download" test flips to done on the Mission Board.
- **Lesson:** Joining user input to a filesystem path without normalisation and containment checks hands out the whole server, one ../ at a time.
- Hint 1: The /download endpoint takes a file name and reads it from the documents folder.
- Hint 2: It never asks whether the name stays inside that folder.
- Hint 3: Request /download?name=../server.js and read the application source.

## Cart & Checkout

### [Beginner] Quantity tampering — negative / absurd quantities accepted
- **Objective:** Make the exploit succeed so the "Quantity tampering — negative / absurd quantities accepted" test flips to done on the Mission Board.
- **Lesson:** Quantities are money. Every numeric field from the client needs server-side range validation.
- Hint 1: Add an item to the cart and look at the request — who decides how many you are buying?
- Hint 2: The server never validates the range of the quantity.
- Hint 3: Add an item with qty=-5 (or 100000) — the cart accepts it and the line total follows the maths.

### [Beginner] Price tampering at checkout
- **Objective:** Make the exploit succeed so the "Price tampering at checkout" test flips to done on the Mission Board.
- **Lesson:** Prices must be recomputed server-side from the catalogue at order time; client-supplied prices are fiction.
- Hint 1: The checkout form carries the price of each item in hidden fields.
- Hint 2: Hidden only means invisible — not unchangeable. The server trusts what comes back.
- Hint 3: Edit the price field for an item to 0.01 before submitting checkout and place the order at your price.

### [Intermediate] Prescription-only medicine ordered without a verified prescription
- **Objective:** Make the exploit succeed so the "Prescription-only medicine ordered without a verified prescription" test flips to done on the Mission Board.
- **Lesson:** Eligibility checks (a verified prescription) must be looked up server-side against records, never asserted by the client.
- Hint 1: Rx items need a verified prescription — the checkout asks the browser to confirm that with a flag.
- Hint 2: Flags sent by the browser can be set by anyone.
- Hint 3: Add an Rx-only medicine you have no verified prescription for, then submit checkout with rxOk=1.

## Orders & Refills

### [Beginner] Order IDOR — other patients’ orders
- **Objective:** Make the exploit succeed so the "Order IDOR — other patients’ orders" test flips to done on the Mission Board.
- **Lesson:** Every object access needs an ownership (or role) check — predictable ids make the missing check trivially exploitable.
- Hint 1: Order pages live at /orders/<id> with sequential ids starting at 1001.
- Hint 2: Ownership is never checked when an order is displayed.
- Hint 3: Log in as one patient and open another patient’s order by changing the id.

### [Intermediate] Early refill — refill date check bypassed by client flag
- **Objective:** Make the exploit succeed so the "Early refill — refill date check bypassed by client flag" test flips to done on the Mission Board.
- **Lesson:** Time-based safety rules (refill intervals) must be evaluated server-side from stored dates, not from request parameters.
- Hint 1: Repeat medication has a next-refill date. The refill form offers the server a little help deciding.
- Hint 2: A client-supplied refillNow flag talks the server out of checking the date.
- Hint 3: Request a refill for an order whose refill date is weeks away, adding refillNow=1.

## Admin Panel

### [Beginner] Admin panel open to any signed-in user
- **Objective:** Make the exploit succeed so the "Admin panel open to any signed-in user" test flips to done on the Mission Board.
- **Lesson:** Hiding a link is not access control. Every privileged page must verify the role on the server, on every request.
- Hint 1: The admin console lives at an obvious URL. The menu only shows it to admins…
- Hint 2: …but the page itself never checks who is asking.
- Hint 3: Log in as a normal customer (or pharmacist) and open /admin directly.

### [Intermediate] CSRF on admin user deactivation (GET action)
- **Objective:** Make the exploit succeed so the "CSRF on admin user deactivation (GET action)" test flips to done on the Mission Board.
- **Lesson:** State-changing GET endpoints are CSRF by design: any page an admin views can fire them with the admin’s session.
- Hint 1: Admins deactivate users through a simple link. Links are GET requests.
- Hint 2: GET requests are fired by browsers automatically — images, previews, prefetchers.
- Hint 3: While logged in as admin, visit /admin/deactivate?id=<userId> directly — the account is disabled with no token and no confirmation.

## Platform & API

### [Intermediate] Forgeable API token (base64 of email)
- **Objective:** Make the exploit succeed so the "Forgeable API token (base64 of email)" test flips to done on the Mission Board.
- **Lesson:** An API key must be a high-entropy secret; anything derivable from public data is not a credential at all.
- Hint 1: The partner API authenticates with an x-api-token header. Tokens are never shown anywhere in the app.
- Hint 2: They are not random — they are derived from something you already know about the victim.
- Hint 3: The token is hp_ followed by the base64 of the user's email. Forge one for another user and read their orders via /api/orders.

### [Beginner] Unauthenticated debug endpoint dumps all users
- **Objective:** Make the exploit succeed so the "Unauthenticated debug endpoint dumps all users" test flips to done on the Mission Board.
- **Lesson:** Debug and diagnostics endpoints are production vulnerabilities the day they ship; if it exists, it will be found.
- Hint 1: Development leftovers love predictable paths.
- Hint 2: This one needs no login at all.
- Hint 3: Open /api/debug in a private window — every account, including passwords, comes back as JSON.
