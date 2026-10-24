# HexaManufacture (LAB 104) — Practice Guide

Challenges grouped by feature, then difficulty. Each challenge is complete only when the exploit genuinely succeeds — the Mission Board (/tests) tracks you live.

## Login & Authentication

### [Beginner] SQL Injection Login Bypass
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The login query is built by gluing your input straight into SQL text.
- **Hint 2:** Try a quote character in the email field and watch how the query breaks.
- **Hint 3:** Use admin@hexamanufacture.local' OR '1'='1' -- as the email with any password.

### [Beginner] No Brute-Force Protection on Login
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Nothing slows you down — no lockout, no delay, no CAPTCHA.
- **Hint 2:** Script 10 wrong passwords for one account and watch what does NOT happen.
- **Hint 3:** Submit at least 10 failed logins for operator@hexamanufacture.local; the 10th is still processed normally.

### [Beginner] User Enumeration via Login & Forgot-Password Responses
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Compare the error for an email that exists with one that does not.
- **Hint 2:** The login and forgot-password forms answer differently for real accounts.
- **Hint 3:** Probe at least 5 different emails across login/forgot and note which ones are confirmed as real.

### [Beginner] Published Demo / Default Credentials
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Read the login page carefully — it is more helpful than it should be.
- **Hint 2:** Demo accounts are printed right on the login screen.
- **Hint 3:** Sign in with the published admin demo credentials.

### [Intermediate] Predictable Password-Reset Token
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Reset tokens here are not random — they are computed from something public.
- **Hint 2:** Request a reset for one account and study the token pattern, then look at user IDs.
- **Hint 3:** The token is HM followed by the user id, a dash, and id×137+42. Compute it for a user who never requested a reset and use it.

### [Intermediate] Role Cookie Tampering (Client-Side Role Trust)
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** After login, inspect the cookies the app sets — one of them repeats your role.
- **Hint 2:** The server trusts a cookie your browser can edit.
- **Hint 3:** Set the hx_role cookie to admin and open /admin.

## Registration & Profile

### [Beginner] Weak Password Policy (1-Character Passwords)
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Try registering with the shortest password you can think of.
- **Hint 2:** There is effectively no minimum length.
- **Hint 3:** Register an account with a 1-character password.

### [Beginner] Stored XSS in Display Name
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Your display name is rendered on pages other people read — including the admin user list.
- **Hint 2:** Names are printed without escaping.
- **Hint 3:** Register or update your profile with a name containing a script payload.

### [Intermediate] Mass Assignment — Self-Assign Admin Role at Registration
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The registration form only shows a few fields, but the server reads more from the POST body.
- **Hint 2:** What happens if you add a field the form never offered?
- **Hint 3:** POST /register with an extra role=admin field.

### [Intermediate] CSRF on Profile Update
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The profile form performs no origin check at all.
- **Hint 2:** The app’s own forms carry a hidden hx_origin marker; a forged request would not.
- **Hint 3:** Submit a profile update POST without the hx_origin marker — it is accepted.

## Search & Catalogue

### [Beginner] Reflected XSS in Search
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The results page repeats your search text back to you.
- **Hint 2:** It repeats it without escaping.
- **Hint 3:** Search for a script payload and view the page source.

### [Intermediate] SQL Injection in Search Leaks Confidential Work Orders
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Search is glued into a SQL LIKE query, just like login.
- **Hint 2:** A comment sequence can cut off the part of the query that hides internal records.
- **Hint 3:** Search for ' OR '1'='1' -- and see what confidential rows appear.

## Work Orders

### [Beginner] Work Order IDOR — View Another Operator’s Work Order
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Work order URLs carry a simple numeric ID.
- **Hint 2:** Nothing checks that the order belongs to you.
- **Hint 3:** Open a work order owned by another operator by changing the ID.

### [Beginner] Confidential Internal Work Order Exposed by Direct URL
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** One work order never appears in any list — but its ID still works.
- **Hint 2:** Internal records are only hidden, not protected.
- **Hint 3:** Guess the ID after the visible orders and open the internal prototype order directly.

### [Intermediate] Work Order Quantity Tampering by Non-Owner
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The update endpoint trusts the numbers in the POST body.
- **Hint 2:** It also forgets to ask whether the order is yours.
- **Hint 3:** POST new planned/produced quantities to another operator’s work order.

### [Intermediate] Work Order Completion Without Manager/QC Authority
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Completing an order should need authority — the endpoint never asks for it.
- **Hint 2:** Any signed-in user can call the complete action.
- **Hint 3:** As an operator, complete a work order that is still in progress.

## Inventory & Materials

### [Intermediate] Stock Adjustment by Non-Manager (Broken Access Control)
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Adjusting stock levels is supposed to be a manager job.
- **Hint 2:** The adjust endpoint never checks your role.
- **Hint 3:** As an operator, POST a stock adjustment to any material.

### [Intermediate] Material Issue Drives Stock Negative (Missing Validation)
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Issuing material only checks that you asked — not that it exists.
- **Hint 2:** Ask for more than the shelf holds.
- **Hint 3:** Issue more units of a material than are in stock and watch the stock go below zero.

### [Intermediate] Purchase Order Price Tampering
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The PO form lets the browser state the unit price.
- **Hint 2:** The server believes the browser.
- **Hint 3:** Create a purchase order with a unit price far below the catalogue cost.

## Quality Control

### [Intermediate] QC Self-Approval (Inspector Approves Own Check)
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** A QC check should be approved by someone other than its inspector.
- **Hint 2:** The approve endpoint never compares the two people.
- **Hint 3:** Approve the quality check that you inspected yourself.

### [Intermediate] QC Result Tampering — Fail Changed to Pass by Operator
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The result endpoint trusts whoever calls it.
- **Hint 2:** A failed check is one POST away from passing.
- **Hint 3:** As an operator, set the failed QC check’s result to Pass.

## Maintenance

### [Beginner] Close Another Technician’s Maintenance Ticket
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Tickets belong to an assigned technician — the close action does not check.
- **Hint 2:** Anyone signed in can close any ticket.
- **Hint 3:** Close a maintenance ticket assigned to another technician.

## Admin Panel

### [Beginner] Admin User List (With Passwords) Open to Any User
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Some admin URLs were never actually protected.
- **Hint 2:** Try the user-management page as a plain operator.
- **Hint 3:** Open /admin/users while signed in as a non-admin.

### [Intermediate] CSRF on Admin User Deactivation
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The deactivation action changes state with no token or origin check.
- **Hint 2:** The real admin form carries a marker a forged request lacks.
- **Hint 3:** POST to the deactivate endpoint without the hx_origin marker.

## Platform & API

### [Beginner] Unauthenticated Debug Endpoint Dumps All Data
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** Developers leave souvenirs in production.
- **Hint 2:** This one needs no login at all.
- **Hint 3:** Fetch /api/debug with no session.

### [Intermediate] API Token Is Just Base64 of the User’s Email
- **Objective:** Demonstrate the flaw for real — the test flips only when the server observes the exploit's effect.
- **Hint 1:** The API accepts a token header instead of a session.
- **Hint 2:** The token looks like harmless base64 — decode the idea, not just the string.
- **Hint 3:** Call /api/workorders with X-Api-Token set to the base64 of another user’s email, with no session.
