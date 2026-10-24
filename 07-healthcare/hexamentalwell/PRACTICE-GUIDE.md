# HexaMentalWell — Practice Guide (LAB 69)

Challenges grouped by feature, then difficulty. Each challenge mirrors the in-app Mission Board (/tests) with the same 3 graded hints and a measurable objective: the test flips to done only when your exploit really works.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Submit an always-true SQL condition as the email; the string-built query returns a user row and a session is issued.
- **Hint 1:** The login form builds its query by gluing your input straight into the SQL string.
- **Hint 2:** Try a classic always-true condition in the email field, e.g. ' OR '1'='1 with any password.
- **Hint 3:** Submit email: ' OR '1'='1' -- and any password; you should land in an account you do not own.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Submit 10+ failed logins for one account; every attempt is processed with no throttle, CAPTCHA or lockout.
- **Hint 1:** Nothing slows you down when a password guess fails.
- **Hint 2:** Write down one real account email and just keep guessing passwords.
- **Hint 3:** Fail 10 logins in a row for the same account — the 10th is still processed normally, with no CAPTCHA or lockout.

### [Beginner] User enumeration via login & reset responses
- **Objective:** Probe 5+ distinct emails; existing and non-existing accounts produce visibly different responses.
- **Hint 1:** Compare the error wording for a real email versus an invented one, on login AND on forgot-password.
- **Hint 2:** The two flows answer differently depending on whether the account exists.
- **Hint 3:** Probe at least 5 different emails across /login and /forgot; the responses tell you exactly which are registered.

### [Beginner] Published demo credentials still active
- **Objective:** Use the published demo therapist credentials to sign in; a full staff session is issued.
- **Hint 1:** Read the demo-accounts box on the login page carefully.
- **Hint 2:** One of those accounts is a staff (therapist) account, not a client.
- **Hint 3:** Log in as dr.reyes@mentalwell.local / therapist123 — demo credentials that were never disabled in production.

### [Intermediate] Predictable password-reset token
- **Objective:** Derive the token MW-<id>-<id*331+77> for a victim id and reset their password without any email being sent.
- **Hint 1:** Reset tokens here are not random — they are computed from something you already know about the victim.
- **Hint 2:** Request a reset for your OWN account and study the token format: MW-<id>-<a number derived from the id>.
- **Hint 3:** The suffix is id*331+77. Compute it for another user’s id and POST /reset with that token — without ever requesting a reset for them.

### [Intermediate] Role cookie tampering (hx_role)
- **Objective:** Change the hx_role cookie to admin as a normal client and load the admin console.
- **Hint 1:** After login, look at the cookies the app sets — one of them carries your role.
- **Hint 2:** The server trusts that cookie when deciding who may open /admin.
- **Hint 3:** Set hx_role=admin in your browser while logged in as a normal client, then open /admin.

## Registration & Profile

### [Beginner] Weak password policy (1-character passwords)
- **Objective:** Register with a 1-character password; the account is created.
- **Hint 1:** Try registering with the shortest password the form will accept.
- **Hint 2:** There is no length or complexity check at all.
- **Hint 3:** Register a new account with password "x" — it is accepted.

### [Beginner] Stored XSS in display name
- **Objective:** Store a script payload as the display name; it is rendered unescaped to other users.
- **Hint 1:** Your display name is rendered back on pages without escaping — including pages staff see.
- **Hint 2:** Put an HTML/JS payload in the name field instead of a name.
- **Hint 3:** Register or update your profile with name <script>alert(1)</script> (or an <svg onload> payload) and view a page that prints it.

### [Intermediate] Mass assignment — self-assign therapist role
- **Objective:** Add role=therapist to the registration POST; the created account carries the staff role.
- **Hint 1:** The registration handler copies more form fields into the new account than the form shows.
- **Hint 2:** Add fields the form never offered, such as role, to your registration POST.
- **Hint 3:** Register with role=therapist added to the POST body; your new account is staff.

### [Intermediate] CSRF on profile update
- **Objective:** Submit a profile change with the session cookie but no hx_origin marker; it is applied.
- **Hint 1:** The profile form has no anti-CSRF token; the app only leaves a benign marker cookie (hx_origin) on its own pages.
- **Hint 2:** A state-changing POST that arrives WITHOUT that marker did not come from the app’s own form.
- **Hint 3:** POST /profile with your session cookie but without the hx_origin cookie (e.g. a raw curl) — the change is accepted.

## Journals & Privacy

### [Beginner] Read another client’s journal (IDOR)
- **Objective:** Request a journal whose clientId differs from the session user; the full private entry is served.
- **Hint 1:** Journal entries live at /journals/<id> with small sequential ids.
- **Hint 2:** The page checks that you are logged in — not that the journal is yours.
- **Hint 3:** As one client, open /journals/3 — an entry written by a different client.

### [Intermediate] Therapist reads journals of unassigned clients
- **Objective:** As a therapist, read a journal whose client is assigned to a different therapist; it is served.
- **Hint 1:** Therapists are meant to see only THEIR clients’ journals (user.therapistId).
- **Hint 2:** The journal page never compares the client’s assigned therapist with the reader.
- **Hint 3:** As Dr. Reyes, open the journal of Liam (id 3) — he is Dr. Okafor’s client, not hers.

### [Intermediate] Journal export of another client
- **Objective:** Request the export for another client id; their full journal text is returned.
- **Hint 1:** The export feature takes a client parameter: /journals/export?client=<id>.
- **Hint 2:** It never checks that the requested client is you.
- **Hint 3:** As Emma, export client=5 and download Liam’s complete journal history as text.

### [Advanced] Support context tool leaks journal text to any user
- **Objective:** As a non-admin user, fetch the support context for another client; journal excerpts are returned.
- **Hint 1:** Support staff use /support/context/<clientId> to see "recent journal excerpts" beside a ticket.
- **Hint 2:** That endpoint checks only that you are signed in.
- **Hint 3:** As any client, call /support/context/5 — you receive Liam’s journal excerpts in JSON.

## Mood Tracking

### [Beginner] Another client’s mood history (IDOR)
- **Objective:** Request the mood list for another client id; their scores and notes are served.
- **Hint 1:** The mood page accepts a client parameter: /moods?client=<id>.
- **Hint 2:** It happily renders anyone’s history.
- **Hint 3:** As Emma, open /moods?client=5 to see Liam’s day-by-day mood scores and notes.

### [Intermediate] Forge mood entries in another client’s record
- **Objective:** Submit a mood entry carrying another client’s id; it is stored in their record.
- **Hint 1:** The mood check-in POST trusts a clientId field from the request body.
- **Hint 2:** Add clientId of someone else to your check-in.
- **Hint 3:** POST /moods with clientId=5 and a score; a fake entry appears in Liam’s health record.

## Sessions & Booking

### [Beginner] Cancel another client’s session
- **Objective:** Cancel a session owned by another client; its status becomes cancelled.
- **Hint 1:** Cancelling is a POST to /sessions/<id>/cancel with no ownership check.
- **Hint 2:** Session ids are sequential.
- **Hint 3:** As Emma, cancel session 2 — Liam’s booked therapy session is cancelled.

### [Intermediate] Session notes visible to the wrong party
- **Objective:** Fetch notes for a session you are not a party to; the therapist’s private notes are returned.
- **Hint 1:** Therapist notes for a session are served at /sessions/<id>/notes.
- **Hint 2:** Neither the session’s client nor its therapist is checked.
- **Hint 3:** As Emma, open /sessions/2/notes — private notes about Liam’s therapy, written by his therapist.

### [Intermediate] Book a session in another client’s name
- **Objective:** Book with a clientId different from the session user; the session is created under the victim.
- **Hint 1:** The booking form posts a clientId along with therapist and time.
- **Hint 2:** The server books whoever the form says.
- **Hint 3:** POST /sessions/book with clientId=5; a session appears in Liam’s account that he never booked.

## Payments

### [Beginner] Session payment amount tampering ($1 for a $60 session)
- **Objective:** Submit a payment far below the session price; the session is recorded as paid in full.
- **Hint 1:** The payment form posts the amount back to the server.
- **Hint 2:** The server believes whatever amount arrives.
- **Hint 3:** Pay for your booked session with amount=1; it is marked fully paid.

### [Intermediate] Free session via unverified mark-paid endpoint
- **Objective:** Call the mark-paid endpoint directly; the session becomes paid with no payment.
- **Hint 1:** A leftover endpoint /sessions/<id>/mark-paid simulates the payment webhook.
- **Hint 2:** It performs no signature or secret check at all.
- **Hint 3:** POST to /sessions/<your id>/mark-paid with an empty body; the unpaid session flips to paid.

## Therapist Directory

### [Beginner] Reflected XSS in therapist search
- **Objective:** Submit a script payload as the search term; it is reflected unescaped in the response.
- **Hint 1:** Your search term is echoed in the results heading — unescaped.
- **Hint 2:** Put markup in the query and view the page source.
- **Hint 3:** Search for <svg onload=alert(1)> and watch it land in the page as live HTML.

### [Intermediate] SQL injection in therapist search dumps user table
- **Objective:** Inject an always-true condition into the search; all user rows are returned.
- **Hint 1:** Directory search builds its query by string concatenation, like the login did.
- **Hint 2:** An always-true condition makes the "therapist search" return every user row.
- **Hint 3:** Search for ' OR '1'='1 and inspect the results table — clients, emails and passwords appear.

## Support & Admin

### [Advanced] CSRF on admin account deactivation
- **Objective:** Trigger the deactivation GET with a cross-site Referer under an admin session; the target account is deactivated.
- **Hint 1:** Admins deactivate accounts through a plain GET link: /admin/users/<id>/deactivate.
- **Hint 2:** A GET that changes state can be triggered cross-site by an <img> tag — no token can protect it.
- **Hint 3:** While logged in as admin, visit that URL with a foreign Referer (e.g. from another origin) — the account is deactivated.

## Platform & API

### [Beginner] Unauthenticated /api/debug dumps all accounts
- **Objective:** Fetch /api/debug without any session; full user records including passwords are returned.
- **Hint 1:** Developers left a debug endpoint in the build.
- **Hint 2:** It needs no login at all.
- **Hint 3:** Open /api/debug in a fresh browser — every user, email, role and password in JSON.

### [Intermediate] Forgeable API token (base64 of email)
- **Objective:** Present mhw_+base64(victim email) as the Bearer token; the API authenticates as the victim.
- **Hint 1:** The API accepts a Bearer token at /api/me.
- **Hint 2:** Tokens are not random — they are derived from something public about the user.
- **Hint 3:** The token is mhw_ followed by the base64 of the user’s email. Forge one for the admin and call /api/me.
