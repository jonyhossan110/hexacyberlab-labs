# HexaRAG — Practice Guide (LAB 36)

Work the challenges feature by feature. Your progress bar and the `/tests` page track every test. Hints unlock in three grades; the Lab Coach gives step-by-step help only after you have genuinely tried a feature at least 3 times. Reaching 100% reveals the completion key for Lab 37 and your certificate.

## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03:2021 Injection)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Submit the admin email with password ' OR '1'='1 — the evaluated WHERE clause becomes true and a session is issued.
- **Hint 1:** The legacy SSO login builds its query by gluing your input straight into the string.
- **Hint 2:** Try a quote in the password field and see how the query logic changes.
- **Hint 3:** Password: ' OR '1'='1 with the admin email — the OR makes the check true without the real password.
- **Lesson:** String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.

### Brute Force — No Rate Limiting (Beginner · A07:2021 Authentication Failures)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Fail 10 logins for one account; the 10th failure is still processed with no throttle.
- **Hint 1:** Nothing slows you down when a password guess fails.
- **Hint 2:** Script ten wrong passwords for one account and watch what does not happen.
- **Hint 3:** After 10 failed logins for the same account the platform still processes attempts — no lockout, no CAPTCHA.
- **Lesson:** Without throttling or lockout, credential guessing is limited only by attacker patience.

### User Enumeration via Login & Reset Responses (Beginner · A07:2021 Authentication Failures)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Probe one existing and one non-existing email; the responses differ, confirming which accounts exist.
- **Hint 1:** Compare the error for a real account with the error for an address that does not exist.
- **Hint 2:** The forgot-password flow answers differently too.
- **Hint 3:** Login with sarah@acme.io + wrong password vs nobody@nowhere.io — one says "wrong password", the other "no account found".
- **Lesson:** Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.

### Default Demo Credentials Still Active (Beginner · A07:2021 Authentication Failures)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Sign in as demo@hexarag.local / demo123 — the seeded demo account is active.
- **Hint 1:** Seeded demo accounts are famous for surviving into production.
- **Hint 2:** The demo address follows the product name.
- **Hint 3:** demo@hexarag.local with password demo123 signs straight in.
- **Lesson:** Default and demo credentials are public knowledge; if they work, the attacker needs no exploit at all.

### Predictable Password-Reset Token (Intermediate · A07:2021 Authentication Failures)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Compute tok-<id>-<id*137+42> for a victim and reset their password without any email being sent.
- **Hint 1:** Ask for one reset token and study its shape.
- **Hint 2:** The token is derived from something public about the account, plus simple arithmetic.
- **Hint 3:** Tokens look like tok-<id>-<id times 137 plus 42>. Compute one for another user without ever requesting a reset.
- **Lesson:** Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover machine.

### Role Cookie Tampering (Client-Side Role) (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Sign in as a normal user, set hx_role=admin, and the admin console opens.
- **Hint 1:** After signing in, look at the cookies the app trusts.
- **Hint 2:** One cookie carries your role — and the server believes the browser.
- **Hint 3:** Set the hx_role cookie to admin and open /admin.
- **Lesson:** Authorization data must live server-side; anything stored in a cookie can be edited by the user.

## Registration & Profile

### Weak Password Policy (1-Character Passwords) (Beginner · A07:2021 Authentication Failures)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Register with a 1-character password — the account is created.
- **Hint 1:** Register a new account and be as lazy as possible with the password.
- **Hint 2:** There is no minimum length at all.
- **Hint 3:** A one-character password like "a" is accepted.
- **Lesson:** Password policy is the cheapest control there is; without it users choose guessable passwords.

### Stored XSS in Display Name (Beginner · A03:2021 Injection)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Save a display name containing a script payload; it is stored and rendered unescaped.
- **Hint 1:** Your display name is shown to teammates on the Team page.
- **Hint 2:** It is rendered exactly as typed.
- **Hint 3:** Set your display name to a script payload and open /team — the payload is stored and served raw.
- **Lesson:** Any user-controlled text rendered without encoding becomes stored XSS for every viewer.

### Mass Assignment — Role Set at Registration (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Submit role=admin with the registration; the created account has the admin role.
- **Hint 1:** The registration form shows three fields, but the server reads the whole request body.
- **Hint 2:** What happens if you submit a field the form never offered?
- **Hint 3:** Add role=admin to the registration POST and the new account is created as an administrator.
- **Lesson:** Bind only whitelisted fields from requests; blindly assigning the whole body hands attackers the privileged columns.

### CSRF on Profile Update (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Submit a profile change with a cross-site Origin (or no marker cookie); it is applied.
- **Hint 1:** Profile updates accept a plain POST with no anti-CSRF token.
- **Hint 2:** A request from another origin — or without the app’s own marker cookie — is still applied.
- **Hint 3:** POST /profile with an evil Origin header and a new display name; the change is saved.
- **Lesson:** State-changing forms need unguessable tokens tied to the session; cookies alone are sent automatically by browsers.

## Collections & Documents

### Collection IDOR — Another Workspace’s Collection (Beginner · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Open another workspace’s collection id while signed in; its documents are listed.
- **Hint 1:** Collections have simple ids in the URL.
- **Hint 2:** The page checks that you are signed in — but not whose collection it is.
- **Hint 3:** Sign in as Acme and open /collections/c3, a NovaLegal collection.
- **Lesson:** Every object read must check ownership against the caller’s workspace, not just authentication.

### Document IDOR — Read Another Workspace’s Document (Beginner · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Open another workspace’s document id; full content and chunks are served.
- **Hint 1:** Documents have simple ids too.
- **Hint 2:** The confidential ones are the interesting ones.
- **Hint 3:** Open /documents/d5 — NovaLegal’s settlement agreement — while signed in as Acme.
- **Lesson:** Document-level checks matter as much as collection-level ones; attackers enumerate ids.

### Cross-Workspace Document Deletion (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Delete a document belonging to another workspace; it is removed.
- **Hint 1:** Reading across workspaces works. What about destroying?
- **Hint 2:** The delete action performs the same missing check.
- **Hint 3:** POST /documents/d6/delete as Acme — a NovaLegal document disappears.
- **Lesson:** Write and delete paths need the same ownership checks as reads; destructive IDOR is data loss, not just leakage.

### Path Traversal in File Download (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Request ../server.js; the resolved path escapes the data folder and the source is served.
- **Hint 1:** The download endpoint takes a file name.
- **Hint 2:** It joins the name to the data folder without cleaning it.
- **Hint 3:** Request /download?file=../server.js and read the application source.
- **Lesson:** User-controlled paths must be normalised and confined to an allowed directory.

### HTML Upload Served Inline (Stored XSS via File) (Intermediate · A03:2021 Injection)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Upload an .html file containing a script; it is later served as text/html from the app origin.
- **Hint 1:** Uploads accept any file type, and files are served back from the app’s own origin.
- **Hint 2:** An .html file comes back with an HTML content type.
- **Hint 3:** Upload evil.html with a script, then open /files/evil.html — it executes in the app origin.
- **Lesson:** Uploaded files must be type-checked, stored safely and served with safe content types / disposition.

## Retrieval & AI Answers

### Poisoned Document Hijacks AI Answers (Advanced · A03:2021 Injection)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: A document containing an [[INSTRUCTION: ...]] marker is indexed; a matching query makes the answer repeat the attacker text.
- **Hint 1:** The answer builder trusts instructional text inside retrieved documents.
- **Hint 2:** Index a document containing an instruction marker and wording that matches your question.
- **Hint 3:** Upload a doc with [[INSTRUCTION: ...]] and query for its keywords — the assistant repeats the attacker’s text as its answer.
- **Lesson:** Retrieved content is untrusted input; an assistant must never treat document text as instructions (indirect prompt injection).

### Cross-Workspace Retrieval Leakage (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Query another workspace’s collection; the generated answer cites its chunks as sources.
- **Hint 1:** The Ask page lets you choose a collection — but the server never checks that the collection is yours.
- **Hint 2:** Post a query naming the other firm’s private collection.
- **Hint 3:** Ask about "settlement" with collectionId c3 as an Acme user; the answer is built from NovaLegal’s confidential chunks.
- **Lesson:** In RAG systems the retrieval layer is an authorization boundary: the index must be filtered by tenant before ranking.

### System Prompt Disclosure via Query Parameter (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Request a JSON answer with includeSystem=1; the internal system prompt is included in the response.
- **Hint 1:** The query API has a debug-flavoured parameter the UI never shows.
- **Hint 2:** Ask for the JSON format and add includeSystem=1.
- **Hint 3:** The response JSON gains a system field containing the internal prompt, including secret index names.
- **Lesson:** Debug affordances in production APIs leak the system prompt — and with it the guardrails and internal naming attackers probe.

## API Keys & Sharing

### Guessable Share Links — Sequential Tokens (Beginner · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Probe 5 distinct sequential share tokens within a minute; the pattern exposes other workspaces’ shared collections.
- **Hint 1:** Shared collections get public links. Look at the token pattern.
- **Hint 2:** shr-1, shr-2... what do you think shr-3 will be?
- **Hint 3:** Probe five different share tokens quickly; sequential ids make every shared collection enumerable.
- **Lesson:** Public links must use long random tokens; sequential ids turn "shared with a link" into "published to everyone".

### Query Logs Expose Every Workspace’s Questions (Beginner · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Open the log page as a normal member; entries from another workspace are shown.
- **Hint 1:** The query log page is meant for workspace admins reviewing their own team.
- **Hint 2:** It shows everyone’s questions instead.
- **Hint 3:** Open /settings/query-logs as a regular member; NovaLegal’s questions — including the settlement query — are listed.
- **Lesson:** Logs and analytics are sensitive data: user questions reveal intentions, clients and matters.

### Read-Only API Key Can Index Documents (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Index a new document using the read-only website-widget key; the write succeeds.
- **Hint 1:** API keys carry scopes. Does the write endpoint actually check them?
- **Hint 2:** The website widget key is read-only. Try writing with it.
- **Hint 3:** POST /api/documents with the read key rag_ws1_read_7f3a and a new document — it is indexed.
- **Lesson:** Scopes must be enforced on every endpoint; a scope that is only displayed, not checked, is decoration.

### API Keys of Another Workspace Disclosed (BOLA) (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Request another workspace’s key list; full key secrets are returned.
- **Hint 1:** The API keys settings page takes a workspace parameter.
- **Hint 2:** It never checks the workspace is yours.
- **Hint 3:** Open /settings/api-keys?workspace=ws2 as Acme and read NovaLegal’s live key secrets.
- **Lesson:** Settings and admin-style listings are high-value BOLA targets: they hand out credentials, not just data.

## Admin & Platform

### Debug Endpoint Dumps Keys & System Prompt (Beginner · A05:2021 Security Misconfiguration)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Open /debug as a non-admin user; API keys and the system prompt are returned.
- **Hint 1:** Developers leave diagnostic routes behind. This one is at the obvious path.
- **Hint 2:** Any signed-in user can open it — admin or not.
- **Hint 3:** GET /debug returns every workspace’s API keys and the internal system prompt as JSON.
- **Lesson:** Debug endpoints must be removed or admin-gated before production; they concentrate the most sensitive data in one URL.

### Unauthenticated API Document Read (Beginner · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Request a document’s chunks with no session and no API key; the content is returned.
- **Hint 1:** The API document route validates a key only when one is presented.
- **Hint 2:** What happens when no key and no session are sent at all?
- **Hint 3:** GET /api/documents/d5 with no credentials returns the confidential settlement document’s chunks.
- **Lesson:** Authentication must be deny-by-default: "no credentials" is a failure case, not a pass.

### User Deletion via GET (Admin CSRF) (Intermediate · A01:2021 Broken Access Control)
- **Objective:** Successfully exploit this flaw so the lab detects the real effect: Call the delete URL with a plain GET as an admin; the user is deleted.
- **Hint 1:** In the admin console, deleting a user is a link, not a form.
- **Hint 2:** A state change on GET needs no token and no confirmation.
- **Hint 3:** As admin, GET /admin/users/<id>/delete removes the account immediately — an attacker page could fire it in an admin’s browser.
- **Lesson:** State changes require POST + CSRF token + confirmation; GET endpoints that mutate are CSRF by design.
