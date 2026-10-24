# HexaHR — Practice Guide (24 challenges)

Work feature by feature. Each challenge lists a measurable objective and **3 graded hints** — reveal them one at a time (in the app's 🎯 Tests page, or read ahead here only when stuck). The in-app Lab Coach chatbot gives the same step-by-step guidance, but only after you have genuinely tried that feature at least 3 times.


## Login & Authentication

### SQL Injection Login Bypass (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The login form still runs through a legacy string-built query path. What happens if your input closes the string and adds a condition that is always true?
2. Classic payload shape: a quote, the word OR, and a comparison that always holds — e.g. ' OR '1'='1
3. Put the payload in the email field and use any password. If the query is built by concatenation, the database returns the first user — the HR admin.

**Walkthrough (read after trying):** Step by step: 1) Open the login page. 2) In the email field enter a classic injection payload: ' OR '1'='1  3) Enter anything as the password and submit. 4) You are logged in as the first account in the table — the HR admin — without knowing any password.

### Brute Force — No Rate Limiting (Beginner · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Try the same account with a wrong password again and again. Does anything slow you down, lock the account, or ask for a CAPTCHA?
2. Ten wrong passwords in a row for one account is the mark of an unthrottled login.
3. Script it or just submit the login form 10 times with a bad password for bob@hexahr.local — the app processes every attempt at full speed.

**Walkthrough (read after trying):** Step by step: 1) Pick an account, e.g. bob@hexahr.local. 2) Submit the login form with a wrong password 10 times in a row. 3) Notice nothing intervenes — no delay, lock or challenge. The test completes when the 10th failure is processed.

### User Enumeration via Login & Forgot-Password (Beginner · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Compare the exact wording of the error for an email that exists and one that does not — on the login form and on the forgot-password form.
2. If one says "no account with that email" and the other says "wrong password", the app is confirming which emails are real.
3. Submit /forgot once with a real employee email and once with a made-up email from the same browser; the different answers confirm both halves.

**Walkthrough (read after trying):** Step by step: 1) On /forgot, submit a real email (alice@hexahr.local) — note the answer. 2) Submit a fake one (nobody@hexahr.local) — the wording is different. 3) That difference lets anyone enumerate valid accounts; the test completes once you have observed both answers.

### Weak / Default Credentials (Beginner · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. One employee never changed the password IT issued on day one. The README lists the test accounts — one password stands out as a leftover default.
2. It is the Finance accountant, and the password is just his first name plus three digits.
3. Log in as dave@hexahr.local with the default password dave123.

**Walkthrough (read after trying):** Step by step: 1) Read the test-account list in the README. 2) Log in as dave@hexahr.local with the issued default password dave123. 3) It works — the account never changed it.

### Predictable Password-Reset Token (Intermediate · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The reset flow "emails" a token — but the token is derived from something public about the account, not from randomness.
2. It is a truncated hash of one public value: the account's email address. MD5, first 10 hex characters.
3. Compute md5("dave@hexahr.local") yourself, take the first 10 hex chars, and post it to /reset with a new password — no mailbox access needed.

**Walkthrough (read after trying):** Step by step: 1) Compute the MD5 of the target email (lowercase) and take the first 10 hex characters — that is the token. 2) Open /reset and submit the email, that token, and a new password of your choice. 3) Log in with the new password. You never saw the victim's mailbox.

### Session Cookie Role Tampering (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Look at your session cookie after logging in. It is just base64 JSON — decode it and see what the server trusts.
2. The cookie carries your role, and the server gates pages on the cookie copy instead of its own records.
3. Decode the hxh_session cookie, change "role" to "hradmin", re-encode, and visit /admin.

**Walkthrough (read after trying):** Step by step: 1) Log in as any employee. 2) Copy the hxh_session cookie and base64-decode it — it is plain JSON including your role. 3) Change the role to hradmin, re-encode, and replace the cookie. 4) Open /admin — you are treated as HR admin while your real account is still an employee.


## Employee Directory & Search

### SQL Injection in Employee Search (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The directory search feeds your text into a query the same legacy way the login does. What does an always-true condition return here?
2. Normal searches hide terminated and restricted records. An injection that makes the filter always true ignores the status filter too.
3. Search for ' OR '1'='1 and look for a record that never appears in normal searches — a confidential executive record.

**Walkthrough (read after trying):** Step by step: 1) Log in and open Employees. 2) Search for the payload ' OR '1'='1. 3) The result list now includes every record, including the terminated CONFIDENTIAL executive-compensation record that normal search hides.

### Reflected XSS in Employee Search (Beginner · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your search text is echoed back on the results page ("Results for: …"). Is it encoded?
2. Put an HTML/script payload in the search box instead of a name and view the page source.
3. Search for <script>alert(1)</script> — if the payload appears in the page exactly as typed, it executes in the victim's browser.

**Walkthrough (read after trying):** Step by step: 1) In the Employees search box, enter <script>alert(1)</script> as the query. 2) Submit and view the results page. 3) The payload is reflected unescaped in the "Results for" line — in a browser it executes.

### IDOR — Full Employee Record Exposure (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Employee detail pages live at /employees/<id> with small sequential ids. What stops you opening a colleague's?
2. Open your own record, then change the number. Private fields — phone, home address, date of birth — are on that page.
3. As Alice (/employees/3 is you), open /employees/4 — Bob's private contact details are served to you.

**Walkthrough (read after trying):** Step by step: 1) Log in as an ordinary employee (Alice). 2) Open your own record at /employees/3. 3) Change the id to 4. Bob's full record — phone, home address, date of birth — is displayed with no check.


## Payroll

### Payroll IDOR — Colleague's Salary & Bank Details (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Payslips live at /payroll/<employeeId>. Yours is shown by default — what about the number next door?
2. Salary and full bank account details are on that page. No ownership check stands between you and them.
3. As Alice, open /payroll/4 — Bob's payslip, salary breakdown and full bank IBAN.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alice and open Payroll — you see your own payslip at /payroll/3. 2) Change the id to 4. 3) Bob's full payslip renders: base salary, net pay and his complete bank IBAN.

### Cross-Department Payroll Access (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Department payroll listings live at /payroll/department/<name>. A manager is meant to see only their own department.
2. Log in as the Engineering manager and ask for another department's listing.
3. As Miguel (Engineering), open /payroll/department/Sales — every Sales salary is listed for a manager with no business seeing them.

**Walkthrough (read after trying):** Step by step: 1) Log in as Miguel, the Engineering manager. 2) Open /payroll/department/Sales. 3) The full Sales payroll listing is served although Miguel manages Engineering — the department scope is never checked.


## Leave Management

### Leave Self-Approval (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The approve action for a leave request checks that you are logged in — and little else. Whose request is pending in your name?
2. Find your own pending request on /leave and look at the approve endpoint: POST /leave/<id>/approve.
3. As Alice, approve your own request #1. The system lets the requester be the approver.

**Walkthrough (read after trying):** Step by step: 1) Log in as Alice; her request #1 is pending. 2) Send POST /leave/1/approve as Alice. 3) The request flips to approved — she approved her own holiday.

### Leave Approval Across Departments (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The same approve endpoint also fails to check which department the request belongs to.
2. A manager from Engineering can decide a Sales employee's leave — the workflow never compares departments.
3. As Miguel (Engineering), approve Bob's pending request #2 (Sales). Any non-HR approver who is not the requester proves the point.

**Walkthrough (read after trying):** Step by step: 1) Log in as Miguel (Engineering manager). 2) Approve Bob's request #2 — Bob is in Sales. 3) It is approved, although Miguel has no authority over Sales staff.

### IDOR — Reading Colleagues' Leave Requests (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Leave detail pages live at /leave/<id>. Reasons can be private — sick notes, family matters.
2. As one employee, open another employee's request by changing the number.
3. As Carol, open /leave/1 — Alice's request and her personal reason are fully readable.

**Walkthrough (read after trying):** Step by step: 1) Log in as Carol. 2) Open /leave/1 — Alice's request. 3) Her leave type, dates and personal reason are displayed although Carol has no connection to the request.


## Profile & Account

### Mass Assignment — Self-Promotion & Salary Edit (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The profile update binds the whole submitted form to your record. What happens if you submit fields the form never showed — like salary or role?
2. Add an extra field to the profile POST: salary=250000 (or role=hradmin). The server trusts it.
3. Send POST /profile with your normal fields plus salary — then check your payslip: the number moved.

**Walkthrough (read after trying):** Step by step: 1) Log in as any employee and open Profile. 2) Submit the profile form with one extra field added: salary=250000. 3) Open your payslip — your recorded salary is now 250000. The same works with role=hradmin.

### Stored XSS via Display Name (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Your display name is shown in the directory and page header. Is it encoded anywhere?
2. Set your name to an HTML/script payload and view the employee directory — the payload is stored in the database and rendered raw.
3. Use the name <script>alert('xss')</script> on the profile form; the directory then serves it to every viewer, including HR admin.

**Walkthrough (read after trying):** Step by step: 1) Log in as Bob and open Profile. 2) Set the display name to <script>alert('xss')</script> and save. 3) Open the employee directory — the name is stored and rendered unescaped, firing for every viewer.

### CSRF on Profile Update (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Profile changes ride on your session cookie alone. The app's own form carries a hidden marker — a foreign form would not.
2. A state-changing POST that succeeds with a cross-site Origin and no marker is a CSRF proof.
3. POST to /profile from a "different site" (Origin: http://evil.example, no hx_origin field) while logged in — the change is applied.

**Walkthrough (read after trying):** Step by step: 1) Stay logged in as Carol. 2) Send a POST to /profile with a new phone number, an Origin header of http://evil.example, and no hx_origin marker. 3) The update is accepted — a foreign site could have sent that request from her browser.

### Weak Password Policy (Beginner · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Change your password on the profile page. How short will it let you go?
2. There is no minimum length, complexity or blocklist check at all.
3. Set the new password to a single character — "x". If the app accepts it, the policy is fiction.

**Walkthrough (read after trying):** Step by step: 1) Log in as Tom and open Profile → change password. 2) Enter a one-character password. 3) It is accepted and you can log in with it — there is no policy.


## Admin Panel

### CSRF on Admin Action (Deactivate Employee) (Advanced · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Admin actions — like deactivating an employee — are plain POSTs guarded only by the admin's cookie.
2. The admin form carries the same hidden marker as other forms; a cross-site request would lack it and carry a foreign Origin.
3. While logged in as Hana (HR admin), POST /admin/deactivate for Tom (id 8) with Origin: http://evil.example and no marker. The account is deactivated.

**Walkthrough (read after trying):** Step by step: 1) Log in as Hana, the HR admin. 2) Send POST /admin/deactivate with id=8, a cross-site Origin header and no hx_origin marker. 3) Tom's account is deactivated — the request needed nothing but her browser's cookie.


## API & Data Exposure

### Weak Static API Token (Beginner · A07 Authentication Failures)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The API at /api/employees wants an X-API-Key header. Where would a lazy integration leave that key lying around?
2. Read the /api-docs page source — there is an example key in a comment, marked TODO.
3. Send GET /api/employees with header X-API-Key: hexahr123 — the "secret" is a guessable word printed in the docs.

**Walkthrough (read after trying):** Step by step: 1) Open /api-docs and view the page source — a commented example key is left in the HTML. 2) Call GET /api/employees with that value in the X-API-Key header. 3) The full employee list is returned.

### Unauthenticated Employee Data Export (Beginner · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. There is a bulk export endpoint at /api/export. Try it with no login and no API key at all.
2. Bulk endpoints are the ones developers forget to protect.
3. Just GET /api/export in a fresh browser — the entire workforce, salaries and bank details included, downloads as JSON.

**Walkthrough (read after trying):** Step by step: 1) Log out completely. 2) Open /api/export. 3) A JSON dump of every employee — salary, bank IBAN, phone, address — is served with no authentication whatsoever.

### Missing Security Headers (Beginner · A05 Security Misconfiguration)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Fetch any page and inspect the response headers. What is missing that a hardened app would send?
2. No X-Frame-Options, no Content-Security-Policy, no X-Content-Type-Options — the app sends none of them.
3. Open the dashboard and check its headers: the absence of clickjacking and MIME-sniffing protections is the finding.

**Walkthrough (read after trying):** Step by step: 1) Log in and request the dashboard. 2) Inspect the response headers. 3) None of the standard security headers are present — the test completes on that observation.


## Files & Documents

### Unrestricted File Upload (Stored HTML) (Intermediate · A03 Injection)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. The avatar/document upload on the profile page takes any filename and content, and serves it back under /uploads/.
2. What content type does an uploaded .html file get served with?
3. Upload a file named evil.html containing a heading, then open /uploads/evil.html — it renders as a web page from the HR app's own origin.

**Walkthrough (read after trying):** Step by step: 1) Log in and use the upload form on Profile with filename evil.html and any HTML content. 2) Open /uploads/evil.html. 3) Your HTML is served as a page from the app itself — the upload is unrestricted.

### Path Traversal in Document Download (Intermediate · A01 Broken Access Control)
**Objective:** complete the exploit so the server detects the real effect and ticks this test off.

**Hints:**
1. Documents download via /documents?name=handbook.txt. The name is joined straight onto a folder path.
2. What if the name walks up a directory with ../ ?
3. Request /documents?name=../server.js — the application's own source code comes back.

**Walkthrough (read after trying):** Step by step: 1) Download the handbook normally: /documents?name=handbook.txt. 2) Now request /documents?name=../server.js. 3) The server returns its own source code — the name was never sanitised.
