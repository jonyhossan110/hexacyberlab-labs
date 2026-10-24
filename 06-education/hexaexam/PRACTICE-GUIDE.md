# HexaExam — Practice Guide (LAB 53)

Challenges grouped by feature, then difficulty. Each challenge lists its three graded hints
(the same hints shown on the in-app /tests mission board) and a measurable objective.
Rule of the house: try each feature at least 3 times yourself — only then will the Lab Coach
chatbot unlock step-by-step guidance for that feature.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** make the "auth-sqli" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- Hint 1: The login form builds its lookup by gluing your input straight into a query string.
- Hint 2: A classic tautology in the email field can make the WHERE clause true for every row.
- Hint 3: Try an email like ' OR '1'='1 and any password — the first row in the table is the admin.
- **Lesson:** String-built queries let an attacker rewrite the login logic itself; the first matching row is usually the administrator.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** make the "auth-brute" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: Fail a login. Then fail it again. Notice what does NOT happen.
- Hint 2: There is no counter slowing you down — scripts can try thousands of passwords.
- Hint 3: Fail 10 logins in a row for one account and watch the app happily accept the 10th try.
- **Lesson:** Without throttling or lockout, password guessing is limited only by the attacker’s bandwidth.

### [Beginner] User enumeration via forgot-password responses
- **Objective:** make the "auth-enum" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: The forgot-password form answers differently depending on one detail.
- Hint 2: Compare the message for an email that exists with one that does not.
- Hint 3: Request a reset for alice@test.local, then for nobody@nowhere.local — one says "sent", the other admits there is no account.
- **Lesson:** Different responses for existing vs non-existing accounts turn your own forms into an account-existence oracle.

### [Beginner] Published demo account with default credentials
- **Objective:** make the "auth-default" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: The login page itself advertises a demo account.
- Hint 2: Demo credentials printed on production pages are production credentials.
- Hint 3: Sign in with the demo account shown on the login page: demo@hexaexam.local / demo123.
- **Lesson:** Demo and default accounts left active with known passwords are open doors, not conveniences.

### [Intermediate] Predictable password-reset token
- **Objective:** make the "auth-reset" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: Reset tokens here are computed, not random — look at the shape of a real one.
- Hint 2: The token is a simple formula of something you already know about the victim.
- Hint 3: Token = rst_<userId>_<userId*137+42>. Bob is user 5 — his token can be calculated without ever seeing his email.
- **Lesson:** A reset token derived from public data by a fixed formula is not a secret — it is an invitation.

### [Intermediate] Session role-cookie tampering
- **Objective:** make the "auth-cookie" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: After login, inspect the cookies the app trusts.
- Hint 2: One cookie simply states your role — and the server believes it.
- Hint 3: Change the hx_role cookie to admin and visit /admin — the server never checks it against your account.
- **Lesson:** Authorization data stored on the client is attacker-controlled; roles must live server-side in the session.

## Registration & Profile

### [Beginner] Weak password policy on registration
- **Objective:** make the "reg-weak" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: The registration page CLAIMS passwords need 8 characters. Claims are cheap.
- Hint 2: Try registering with the shortest password you can think of.
- Hint 3: A one-character password is accepted — the policy is printed, never enforced.
- **Lesson:** A password policy that exists only as page text does not exist at all.

### [Beginner] Stored XSS in display name
- **Objective:** make the "reg-xss" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- Hint 1: Your display name is rendered back on dashboards exactly as typed.
- Hint 2: Names are a classic stored-XSS carrier — they are shown to OTHER users too.
- Hint 3: Register or update your profile with a name containing a <script> or <img onerror> payload — it is stored and printed raw.
- **Lesson:** Any user-controlled text that is printed without encoding becomes code in someone else’s browser.

### [Intermediate] Mass assignment — self-assign examiner role at registration
- **Objective:** make the "reg-mass" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The registration handler binds whatever fields you send to the new account.
- Hint 2: What happens if the signup form quietly gains a field the UI never showed?
- Hint 3: Add role=examiner to the registration POST — the new account is created with that role.
- **Lesson:** Binding request bodies directly to account objects lets attackers set privileged fields the form never offered.

### [Intermediate] CSRF on profile update
- **Objective:** make the "reg-csrf" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The profile form carries a hidden same-site marker. Forged requests do not.
- Hint 2: A state change that arrives without the marker — or from a foreign Origin — is not from the app’s own form.
- Hint 3: POST a profile change with no hx_marker field (or a cross-site Origin) while logged in — it is applied anyway.
- **Lesson:** State-changing forms without a verified anti-CSRF token can be submitted by any website the victim visits.

## Question Bank & Catalogue

### [Beginner] Question bank readable by candidates (broken access control)
- **Objective:** make the "bank-access" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: The question bank page is linked only from the examiner menu — but links are not locks.
- Hint 2: Guess the examiner URL and open it as a candidate.
- Hint 3: While logged in as a candidate, visit /examiner/questions — the page checks that you are logged in, never that you are an examiner.
- **Lesson:** Hiding a link is not access control; every privileged page must verify the role server-side.

### [Beginner] Correct answers leaked in the attempt question API
- **Objective:** make the "bank-answers" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: While sitting an exam, watch what the question API actually sends your browser.
- Hint 2: The client needs the question text — does it need anything else?
- Hint 3: GET /api/attempts/<id>/questions returns every question WITH its correctIndex — the answers travel with the questions.
- **Lesson:** Never send the answer key to the client; anything in an API response is public to the person taking the exam.

### [Intermediate] SQL injection in exam catalogue search
- **Objective:** make the "cat-sqli" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- Hint 1: The exam search glues your term into a query the same careless way login does.
- Hint 2: A tautology in the search box should return rows your term never matched.
- Hint 3: Search for ' OR '1'='1 — every exam in the catalogue comes back.
- **Lesson:** Every input that reaches a query is an injection surface — search boxes included, not just login forms.

## Exam Attempts & Timer

### [Beginner] Attempt IDOR — view another candidate’s attempt and answers
- **Objective:** make the "att-idor" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Attempt pages live at predictable numeric URLs.
- Hint 2: Ownership is assumed, not checked.
- Hint 3: Open /attempts/<id> for an attempt that is not yours — answers and all are served.
- **Lesson:** Sequential object IDs plus missing ownership checks expose every record in the system, one number at a time.

### [Intermediate] Attempt-limit bypass (only submitted attempts are counted)
- **Objective:** make the "att-limit" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: An exam says "maximum 1 attempt". The counter behind it is picky about WHAT it counts.
- Hint 2: In-progress attempts apparently do not count as attempts.
- Hint 3: Start Networking Basics (limit 1), leave it unfinished, and start it again — the second attempt is created because only SUBMITTED attempts are counted.
- **Lesson:** Business limits must count the resource itself, not one convenient state of it.

### [Intermediate] Exam timer tampering via the extend endpoint
- **Objective:** make the "att-timer" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- Hint 1: The attempt page has a "request more time" feature. Who approves the request?
- Hint 2: Nobody does. The endpoint trusts the minutes the client sends.
- Hint 3: POST /attempts/<id>/extend with {"minutes": 600} — your deadline moves, no examiner involved.
- **Lesson:** Time limits enforced or extendable by the client are not limits; deadlines must be computed and enforced server-side only.

### [Intermediate] Submission accepted after the deadline
- **Objective:** make the "att-late" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- Hint 1: What does the submit endpoint check about WHEN you submit?
- Hint 2: The deadline is displayed to you — but is it ever compared?
- Hint 3: Let an attempt expire (negative extend makes this instant), then submit anyway — the answers are graded and recorded.
- **Lesson:** A deadline that is never checked at submission time is decoration, not a control.

## Grading & Results

### [Beginner] Results IDOR — read another candidate’s score report
- **Objective:** make the "res-idor" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Score reports have their own predictable URLs, cousins of the attempt pages.
- Hint 2: Changing one number shows you someone else’s outcome.
- Hint 3: GET /api/results/<attemptId> for another candidate’s attempt — full score report, no ownership check.
- **Lesson:** Results are sensitive personal data; every read needs an ownership or staff check.

### [Beginner] Examiner score export downloadable by candidates
- **Objective:** make the "res-export" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Examiners export results as CSV from their menu. The route is a normal URL like the question bank.
- Hint 2: Role checks were forgotten in more than one examiner corner.
- Hint 3: As a candidate, GET /examiner/export.csv — the full results file downloads.
- **Lesson:** Bulk exports are the highest-value target in the app and need the strictest role enforcement.

### [Intermediate] Grade tampering — client-supplied score is trusted
- **Objective:** make the "grade-tamper" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A04:2021 Insecure Design
- Hint 1: The submit request carries your answers. What else might the server accept from it?
- Hint 2: A helpful extra field the UI never sends — but the server honours.
- Hint 3: Add "score": 100 to your submission JSON — the recorded grade becomes yours, not the computed one.
- **Lesson:** Any value the server accepts from the client about its own decisions will be forged; grading must be computed server-side from stored answers.

## Proctor Notes

### [Intermediate] Private proctor notes readable by the candidate
- **Objective:** make the "proc-read" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Proctors write notes ABOUT a candidate’s attempt — suspicions included.
- Hint 2: The notes API checks login. It stops there.
- Hint 3: As the candidate, GET /api/attempts/<id>/notes on your own attempt — the proctor’s private remarks come back.
- **Lesson:** Staff-only annotations are still access-controlled data; "the candidate cannot see the button" is not protection.

### [Intermediate] Candidates can write fake proctor notes
- **Objective:** make the "proc-write" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: If reading notes needs no role check, what about writing them?
- Hint 2: The same endpoint accepts POSTs from anyone logged in.
- Hint 3: POST a note to /api/attempts/<id>/notes as a candidate — it is stored as an official proctor note.
- **Lesson:** Write endpoints need the same authorisation as reads — integrity of staff records depends on it.

## Admin Panel

### [Intermediate] Stored XSS reaching the admin user list
- **Objective:** make the "adm-xss" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A03:2021 Injection
- Hint 1: A display name stored by a candidate does not stay on the candidate’s screen.
- Hint 2: Admins review user lists — names included, printed the same raw way.
- Hint 3: Register an account whose name carries a script payload, then view /admin/users as admin — the payload is served in the admin’s page.
- **Lesson:** Stored payloads travel to the most privileged viewers; admin interfaces need the same output encoding as public ones.

### [Advanced] CSRF on admin role change
- **Objective:** make the "adm-csrf" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A01:2021 Broken Access Control
- Hint 1: Admin actions use the same form machinery as profile updates — including its missing verification.
- Hint 2: A role change POST without the same-site marker should ring every alarm. It rings none.
- Hint 3: While logged in as admin, POST /admin/users/<id>/role with a new role and no hx_marker — the change is applied.
- **Lesson:** The more powerful the action, the more damaging a missing CSRF token — admin functions are the worst place to skip it.

## Platform & API

### [Beginner] Unauthenticated /api/debug dumps every account (incl. passwords)
- **Objective:** make the "plat-debug" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A05:2021 Security Misconfiguration
- Hint 1: Developers leave diagnostic endpoints behind. Production forgets them.
- Hint 2: No login, no token, no questions asked.
- Hint 3: GET /api/debug with no session at all — every user record, passwords included, comes back as JSON.
- **Lesson:** Debug and diagnostic endpoints must never ship enabled; if they do, they must be authenticated and audited.

### [Intermediate] API accepts base64(email) as a bearer token
- **Objective:** make the "plat-token" test flip to done on /tests by performing the real exploit against the running app.
- **OWASP:** A07:2021 Identification and Authentication Failures
- Hint 1: The API’s idea of a token is a transformation of something public.
- Hint 2: Your email address is not a secret. Encoding it does not make it one.
- Hint 3: Call GET /api/me with Authorization: Bearer <base64 of any user’s email> — the API accepts it as that user.
- **Lesson:** A token must be an unguessable secret issued by the server — never a reversible encoding of public data.
