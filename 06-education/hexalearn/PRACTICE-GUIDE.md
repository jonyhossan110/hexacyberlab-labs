# HexaLearn — Practice Guide (LAB 51)

Challenges grouped by feature. Each challenge mirrors a scored test on the /tests mission board. Hints reveal one at a time; the Lab Coach gives step-by-step help only after 3 genuine attempts on that feature.

## Login & Authentication

### [Beginner] SQL injection login bypass
- **Objective:** Make the "auth-sqli" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The login builds its query by gluing your input into a string.
- Hint 2: Try a quote in the email field and see how the error/behaviour changes.
- Hint 3: Email: ' OR '1'='1' OR '1'='2 with any password logs you in as the first account.

### [Beginner] Brute force — no rate limit or lockout
- **Objective:** Make the "auth-brute" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Keep guessing the same account's password. Does anything ever slow you down?
- Hint 2: Try 10 wrong passwords in a row for alice@hexalearn.local.
- Hint 3: The 10th failure is processed exactly like the 1st — no throttle, no lockout, no CAPTCHA.

### [Beginner] User enumeration via login & forgot-password
- **Objective:** Make the "auth-enum" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Compare the message for an email that exists vs one that does not.
- Hint 2: The forgot-password form answers differently too.
- Hint 3: Probe 5+ different emails on /forgot — the app happily confirms which ones are real accounts.

### [Beginner] Published demo account with default credentials
- **Objective:** Make the "auth-default" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Read the login page carefully — it advertises a way in.
- Hint 2: The demo credentials are printed right on the page.
- Hint 3: Log in as demo@hexalearn.local with the password shown on the login page.

### [Intermediate] Predictable password-reset token
- **Objective:** Make the "auth-reset" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Request a reset for your own account and look at the token format.
- Hint 2: The token is derived from something public about the account.
- Hint 3: Token = HL- + base36(user id × 9973 + 12345). Compute Bob's (id 5) and reset his password without any email.

### [Beginner] Session/role cookie tampering
- **Objective:** Make the "auth-cookie" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: After logging in, look at the cookies the app trusts.
- Hint 2: One cookie carries your role — and the server believes the browser.
- Hint 3: Set the hx_role cookie to admin and visit /admin as a student.

## Registration & Profile

### [Beginner] Weak password policy (1-character passwords)
- **Objective:** Make the "reg-weakpw" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Register a new account with the shortest password you can.
- Hint 2: Does the form demand length, numbers, anything?
- Hint 3: A 1-character password is accepted — register with password "x".

### [Intermediate] Mass assignment — role & credit via registration
- **Objective:** Make the "reg-mass" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The register form only shows name/email/password. The server may accept more.
- Hint 2: What happens if you POST extra fields the form never offered?
- Hint 3: POST /register with role=admin and credit=5000 — the account is created with both.

### [Beginner] Stored XSS in display name
- **Objective:** Make the "reg-xss" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Your display name is shown back on many pages. Is it escaped?
- Hint 2: Register with a name that is not really a name.
- Hint 3: Use <script>alert(1)</script> as the display name — it is stored and rendered raw, including in the admin user list.

### [Intermediate] CSRF on profile update
- **Objective:** Make the "reg-csrf" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Profile update is a plain POST with no token. What proves the request came from this site?
- Hint 2: The app sets an hx_origin marker cookie on its own pages — updates never check it.
- Hint 3: POST /profile/update from a foreign Origin — the name change is accepted anyway.

## Search & Catalog

### [Intermediate] SQL injection in course search
- **Objective:** Make the "search-sqli" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Search also builds a string query — this time with LIKE patterns.
- Hint 2: A quote breaks out of the pattern; a comment can end the query.
- Hint 3: Search for: %' OR 1=1 --  and every course in the catalogue comes back.

### [Beginner] Reflected XSS in search results
- **Objective:** Make the "search-xss" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The results page repeats your search term back to you.
- Hint 2: Is the echo encoded?
- Hint 3: Search for <script>alert(1)</script> — it is reflected into the page unescaped.

## Enrollment & Payments

### [Beginner] Price tampering — enrol in a paid course for $0
- **Objective:** Make the "enroll-price" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The enrol form posts a price field along with the course id.
- Hint 2: Who decides what a course costs — the catalogue or your browser?
- Hint 3: POST /enroll for a paid course with price=0 — you are enrolled, charged nothing.

### [Intermediate] Negative price — buying a course pays YOU credit
- **Objective:** Make the "enroll-negative" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: If the server trusts the price for charging, what does a negative price do to your credit?
- Hint 2: Watch your credit balance before and after.
- Hint 3: POST /enroll with price=-50 — enrolment succeeds and your credit balance grows by 50.

### [Intermediate] Single-use coupon can be reused forever
- **Objective:** Make the "enroll-coupon" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: WELCOME50 is meant to be used once per student. Is that checked anywhere?
- Hint 2: Use it on one course. Then use it again on another.
- Hint 3: The code keeps applying 50% off on every enrolment — redemption is recorded but never enforced.

## Lessons & Progress

### [Intermediate] Forge lesson completion without enrolling
- **Objective:** Make the "progress-forge" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The progress endpoint marks lessons complete. What does it check first?
- Hint 2: Does it verify you are enrolled — or even that you paid?
- Hint 3: POST /api/progress/complete for a course you never enrolled in — the completion is recorded.

### [Beginner] IDOR — view any student's progress
- **Objective:** Make the "progress-idor" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Student progress lives at /students/<id>/progress. Whose id can you put there?
- Hint 2: Bob is user 5. You are not Bob.
- Hint 3: Open /students/5/progress while logged in as Alice — his courses and completion are fully visible.

## Quizzes & Scores

### [Beginner] Quiz answers shipped to the browser
- **Objective:** Make the "quiz-answers" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: The quiz is loaded from /api/quiz/<courseId> as JSON. Read the raw response.
- Hint 2: The client needs questions. Does it need the answers too?
- Hint 3: Every question object includes its correct answer index — fetch the API and read them.

### [Beginner] Client-submitted quiz score trusted
- **Objective:** Make the "quiz-score" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Submitting a quiz posts a score. Where was that score computed?
- Hint 2: What if you skip the questions and send the result directly?
- Hint 3: POST /api/quiz/submit with score=100 — the attempt is recorded as passed, no questions answered.

## Course Certificates

### [Intermediate] Certificate issued without completing the course
- **Objective:** Make the "cert-issue" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Certificates are issued by POST /api/certificates/issue. What completion does it verify?
- Hint 2: Try it on a course where you have done zero lessons.
- Hint 3: The certificate is generated immediately — progress and quiz results are never checked.

### [Beginner] IDOR — view another student's certificate
- **Objective:** Make the "cert-idor" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Certificates live at /certificates/<id> with small sequential ids.
- Hint 2: Whose certificate is id 1? Probably not yours.
- Hint 3: Open another student's certificate id while logged in as someone else — it renders in full.

## Reviews

### [Beginner] Stored XSS in course reviews
- **Objective:** Make the "review-xss" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Reviews are printed on the course page for everyone — including the instructor.
- Hint 2: Post a review that is more than text.
- Hint 3: A review containing <script>alert(1)</script> is stored and rendered raw on the course page.

## Instructor Payouts

### [Intermediate] Payout amount tampering — request more than earned
- **Objective:** Make the "payout-tamper" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Instructors request payouts of their earnings. The amount comes from a form field.
- Hint 2: Irene has earned a fixed amount. What if she asks for much more?
- Hint 3: POST /instructor/payout with amount=99999 — it is accepted and queued despite earnings of only 480.

### [Beginner] IDOR — view another instructor's payout summary
- **Objective:** Make the "payout-idor" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Payout summaries live at /instructors/<id>/payouts.
- Hint 2: You do not need to be that instructor to open the page.
- Hint 3: As any logged-in user, open Irene's (id 2) payout page — her earnings and payouts are fully visible.

## Admin & Platform

### [Intermediate] CSRF on admin course deletion
- **Objective:** Make the "admin-csrf" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: Admins can delete courses with a plain POST. No token rides along.
- Hint 2: The hx_origin marker the app sets is never checked on admin actions either.
- Hint 3: POST /admin/courses/delete from a foreign Origin while an admin is "visiting" — the course is gone.

### [Intermediate] Weak API token — base64(email) accepted
- **Objective:** Make the "api-token" test flip to done on /tests by performing the real exploit in the running app.
- Hint 1: /api/me accepts an X-Api-Token header as an alternative to logging in.
- Hint 2: The token scheme is not random — it is derived from something you know about any user.
- Hint 3: Send X-Api-Token as base64 of bob@hexalearn.local — the API returns Bob's full profile.
