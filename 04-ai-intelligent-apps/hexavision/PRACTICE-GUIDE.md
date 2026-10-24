# HexaVision — Practice Guide (LAB 33)

Work feature by feature. Each challenge has a measurable objective and three graded hints (nudge → stronger → near-answer). The in-app /tests page mirrors this guide, and the Lab Coach chatbot unlocks step-by-step help for a feature after you have genuinely tried that feature at least 3 times.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** make the "auth-sqli" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The legacy SSO login builds its query by gluing your input straight into a string.
- **Hint 2:** Try a quote in the password field, then make the whole condition true.
- **Hint 3:** Password: ' OR '1'='1 — the glued-together query then matches the first account (the admin).
- **Lesson:** String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.

### [Beginner] Brute Force — No Rate Limit or Lockout
- **Objective:** make the "auth-brute" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Pick one account and keep guessing its password.
- **Hint 2:** Notice the login never slows down, CAPTCHAs or locks the account.
- **Hint 3:** Fail 10 logins in a row for the same account — every attempt is still processed.
- **Lesson:** Without throttling, lockout or MFA, an attacker can try unlimited passwords until one works.

### [Beginner] User Enumeration via Login & Forgot-Password
- **Objective:** make the "auth-enum" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Compare the answer for an email that exists with one that does not.
- **Hint 2:** Try the forgot-password form with both kinds of email too.
- **Hint 3:** Existing email: "wrong password" / reset sent. Unknown email: a different message. Probe one of each to prove it.
- **Lesson:** Different error messages for "no such account" vs "wrong password" leak which emails are registered.

### [Beginner] Default / Demo Credentials Still Active
- **Objective:** make the "auth-default" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The README lists the seeded test accounts for this lab.
- **Hint 2:** One of them is a leftover demo account with a guessable password.
- **Hint 3:** Log in as demo@hexavision.local with the documented demo password.
- **Lesson:** Demo, default and seeded accounts left active in production are a standing back door.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** make the "auth-reset" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Request a reset and look at how the token is formed.
- **Hint 2:** The token is not random — it is computed from something you know about the account.
- **Hint 3:** Token = rst-(userId × 137 + 42). Compute it for the admin (id 1) and reset without ever seeing an email.
- **Lesson:** Reset tokens must be long, random and single-use; anything derivable from a user id is public knowledge.

### [Intermediate] Session Role Cookie Tampering
- **Objective:** make the "auth-cookie" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Look at the cookies the app sets after login — one of them names a role.
- **Hint 2:** The server trusts that cookie instead of its own session record.
- **Hint 3:** Set the hxv_role cookie to admin and visit /admin as a normal user.
- **Lesson:** Authorisation data must live server-side; anything the client can edit will be edited.

## Registration & Profile

### [Beginner] Weak Password Policy at Registration
- **Objective:** make the "reg-weakpw" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Register a new account and shrink the password.
- **Hint 2:** There is no minimum length or complexity check at all.
- **Hint 3:** A 1-character password is accepted — register with one.
- **Lesson:** A password policy is the cheapest defence against credential guessing and stuffing.

### [Intermediate] Mass Assignment — Plan, Credits and Role
- **Objective:** make the "reg-massassign" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The register and profile forms only show a few fields — the server accepts more.
- **Hint 2:** Add fields the form never offered and see which ones stick.
- **Hint 3:** Submit plan=Enterprise, credits=9999 or role=admin with registration or a profile update.
- **Lesson:** Binding request bodies straight onto records lets attackers set privileged fields the UI never exposed.

### [Beginner] Stored XSS in Display Name
- **Objective:** make the "reg-xss" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Your display name is shown back on the dashboard and to the admin.
- **Hint 2:** Names are stored and printed without escaping.
- **Hint 3:** Set your display name to an HTML/JS payload such as <script>alert(1)</script>.
- **Lesson:** Any user-controlled string rendered unescaped becomes stored XSS for every viewer, including admins.

### [Intermediate] CSRF on Profile Update
- **Objective:** make the "reg-csrf" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Profile updates have no anti-CSRF token.
- **Hint 2:** The app trusts any POST that arrives with your session cookie.
- **Hint 3:** Send the profile POST from a "foreign" origin (or without the app’s marker cookie) and watch it apply.
- **Lesson:** State-changing requests need an unguessable token tied to the session; cookies alone are ambient authority.

## Galleries & Images

### [Beginner] Private Gallery IDOR
- **Objective:** make the "gal-idor" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Galleries have simple numeric ids in the URL.
- **Hint 2:** The server checks that a gallery exists — not that it belongs to you.
- **Hint 3:** Open gallery 1 or 4 (another user’s PRIVATE gallery) while logged in as someone else.
- **Lesson:** Every object access must verify ownership/permission server-side; predictable ids are not protection.

### [Beginner] Private Image IDOR
- **Objective:** make the "img-idor" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Images also live at simple numeric URLs.
- **Hint 2:** Private images are served to anyone who asks for the id.
- **Hint 3:** Open image 1, 5 or 6 (private, owned by others) as a different user.
- **Lesson:** Media and download endpoints need the same ownership checks as the pages that link to them.

### [Beginner] Reflected XSS in Gallery Search
- **Objective:** make the "gal-searchxss" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Search echoes your query back into the results page.
- **Hint 2:** It is echoed without escaping.
- **Hint 3:** Search for <script>alert(1)</script> and view the page source.
- **Lesson:** Reflected input must be encoded; search pages are a classic delivery vehicle for phishing links.

### [Intermediate] Gallery / Image Enumeration
- **Objective:** make the "gal-enum" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Object ids are small sequential numbers.
- **Hint 2:** Nothing slows down or questions rapid browsing of many ids.
- **Hint 3:** View at least 5 different gallery/image ids in quick succession.
- **Lesson:** Sequential ids plus no monitoring turn "hidden" objects into a catalogue an attacker can scrape.

## Uploads & Import

### [Intermediate] Upload Type Confusion — HTML Served Inline
- **Objective:** make the "upl-type" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The upload form accepts any "filename" and any content.
- **Hint 2:** The media route serves the file back using the extension YOU chose.
- **Hint 3:** Upload a file named page.html containing HTML/JS, then open its /media link — it renders as a web page from this origin.
- **Lesson:** Uploaded files must be validated by content, renamed, and served with a safe content type (or as downloads).

### [Intermediate] Path Traversal on File Download
- **Objective:** make the "upl-traversal" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The download endpoint takes a file name parameter.
- **Hint 2:** It joins the name to the uploads folder without cleaning it.
- **Hint 3:** Ask for ../server.js and read the application’s own source code.
- **Lesson:** User-supplied paths must be normalised and confined to the intended directory.

### [Intermediate] SSRF via Image-URL Import
- **Objective:** make the "upl-ssrf" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The "import from URL" feature fetches whatever address you give it.
- **Hint 2:** Nothing blocks internal or cloud-metadata addresses.
- **Hint 3:** Import http://169.254.169.254/latest/meta-data/ and read what the server fetched on your behalf.
- **Lesson:** Server-side fetchers must whitelist destinations and block private/metadata IP ranges.

## AI Analysis Jobs

### [Beginner] Analysis Job Result IDOR
- **Objective:** make the "job-idor" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Finished analysis jobs have numeric ids.
- **Hint 2:** Results pages do not check the job’s owner.
- **Hint 3:** Open job 1 (Alice’s) while logged in as Bob or Carol.
- **Lesson:** Job/result endpoints are object accesses like any other — they need ownership checks.

### [Intermediate] Analysis Result Tampering by Non-Owner
- **Objective:** make the "job-tamper" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** There is a "manual correction" endpoint for job results.
- **Hint 2:** It checks that you are logged in — not that the job is yours.
- **Hint 3:** POST a new score/labels to a job owned by another user.
- **Lesson:** Write endpoints need the same ownership checks as reads — often stricter.

### [Intermediate] Credit Abuse via Client-Supplied Job Cost
- **Objective:** make the "job-credit" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Creating an analysis job charges credits — the price is meant to be fixed per job type.
- **Hint 2:** The create form carries the cost as an ordinary field.
- **Hint 3:** Submit a job with cost 0 — or a negative cost — and watch your balance.
- **Lesson:** Prices and charges must be computed server-side from the catalogue, never accepted from the client.

## Collections & Sharing

### [Beginner] Private Collection Leakage
- **Objective:** make the "col-leak" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Collections group a user’s selected images.
- **Hint 2:** Private collections are viewable by direct URL.
- **Hint 3:** Open collection 1 or 3 (private, not yours) while logged in as another user.
- **Lesson:** Visibility flags only protect data when every route enforces them.

### [Intermediate] Predictable Share Token
- **Objective:** make the "col-share" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Sharing a collection creates a public link token.
- **Hint 2:** Look at the token format for a shared collection.
- **Hint 3:** Tokens are just shr-<collection id>. Guess the link for a private, never-shared collection.
- **Lesson:** Share links are capabilities — they must be long, random and revocable, never derivable from the object id.

## API Access

### [Intermediate] Predictable API Key Derived from Email
- **Objective:** make the "api-weak" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Your API key is shown on the API page — look at its shape.
- **Hint 2:** It is not random at all: hv- plus a simple encoding of something public.
- **Hint 3:** Compute hv_ + base64(email) for another user and call the API as them.
- **Lesson:** API keys must be random secrets; anything derived from public data is public.

### [Intermediate] API Returns All Users’ Private Images (BOLA)
- **Objective:** make the "api-bola" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** The /api/images endpoint answers with a key — any valid key.
- **Hint 2:** It never scopes the results to the key’s owner.
- **Hint 3:** Call it with your own key and count how many PRIVATE images belong to other users.
- **Lesson:** API queries must always be scoped to the authenticated principal.

## Admin Panel

### [Intermediate] State-Changing Admin Action via GET (CSRF)
- **Objective:** make the "adm-csrf" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Admins can grant credits from the admin panel.
- **Hint 2:** The grant action is a plain link — a GET request that changes state.
- **Hint 3:** As admin, open /admin/grant?email=…&amount=… — or trick an admin into opening it.
- **Lesson:** GET requests must never change state; admin actions also need CSRF tokens.

## Platform & Exposure

### [Beginner] Debug Endpoint Exposes Internal Configuration
- **Objective:** make the "plt-debug" test flip to done on the /tests page by performing the exploit end-to-end.
- **Hint 1:** Development leftovers often survive into the running app.
- **Hint 2:** Try the classic diagnostics path.
- **Hint 3:** Fetch /debug and read the internal configuration it hands to anyone.
- **Lesson:** Debug and diagnostics endpoints must be removed or locked down before production.
