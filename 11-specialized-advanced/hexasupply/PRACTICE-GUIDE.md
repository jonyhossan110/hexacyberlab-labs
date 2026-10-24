# HexaSupply (LAB 103) — Practice Guide

Challenges grouped by feature. Each challenge mirrors the /tests Mission Board.

## Login & Authentication

### SQL injection login bypass (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The login form builds its query by pasting your input straight into the SQL string.
- Hint 2: Try closing the email string early and commenting out the rest of the query.
- Hint 3: Use an email like admin@hexasupply.local' -- with any password.

### Brute force — no rate limit or lockout (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Keep guessing passwords for one account — nothing slows you down.
- Hint 2: There is no CAPTCHA, delay or lockout after failed attempts.
- Hint 3: Fail 10 times in a row for the same account and watch the app accept every attempt.

### User enumeration via login & forgot-password (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Compare the messages for a real email vs an invented one — on login and on forgot-password.
- Hint 2: The app helpfully confirms which accounts exist.
- Hint 3: Probe at least 5 different emails and collect the differing responses.

### Published demo credentials grant a real account (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Read the login page carefully — it tells you more than it should.
- Hint 2: A demo account is advertised right on the sign-in form.
- Hint 3: Sign in with the demo credentials printed on the login page.

### Predictable password-reset token (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Request a reset and study the token format — then look at a user id.
- Hint 2: The token is computed from data you already know, not random.
- Hint 3: Token = SUP-<id>-<id times 137 plus 42>. Compute one for a user who never requested a reset.

### Role cookie tampering (hx_role) (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: After login, inspect the cookies the app sets.
- Hint 2: One cookie carries your role — and the server believes it blindly.
- Hint 3: Set hx_role to approver and open the approvals page.

## Registration & Profile

### Weak password policy (1 character) (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Register a new account and try the shortest password the form will take.
- Hint 2: There is effectively no minimum length or complexity.
- Hint 3: A single character password is accepted.

### Mass assignment — role & balance at registration (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The registration form only shows a few fields, but the server accepts more.
- Hint 2: Add extra form fields the UI never offered.
- Hint 3: POST role=admin (or a big creditBalance) along with the normal registration fields.

### Stored XSS in display name (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Names are rendered on dashboards and admin lists without escaping.
- Hint 2: Put an HTML/JS payload where your name goes.
- Hint 3: Register with a display name containing <script>alert(1)</script> or an <img onerror> payload.

### CSRF on profile update (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The profile form changes your name/email with a plain POST.
- Hint 2: Notice the app sets an hx_origin marker cookie on its own pages — forged requests will not have it.
- Hint 3: Submit a profile update with no hx_origin marker (e.g. from a cross-site form).

## Search & Suppliers

### SQL injection in search leaks internal supplier (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Search filters suppliers and items with another string-built query.
- Hint 2: A normal search never shows the internal-only supplier.
- Hint 3: Inject an OR condition (e.g. ' OR '1'='1) to dump every supplier including the hidden one.

### Reflected XSS in search results (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The results page repeats your search term back to you.
- Hint 2: It does so without escaping HTML.
- Hint 3: Search for <script>alert(1)</script> and view the page source.

## Purchase Orders

### Unit-price tampering on purchase order (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The PO form suggests a catalogue price — but the server trusts what you send.
- Hint 2: Intercept the create-PO request and change unitPrice.
- Hint 3: Create a PO with unitPrice=1 for an item that costs far more.

### Negative quantity creates a negative-total PO (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Quantity is validated only in the browser, if at all.
- Hint 2: Try a quantity below zero when creating a PO.
- Hint 3: Create a PO with qty=-5 and check the total the server accepts.

### Creator approves their own purchase order (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Segregation of duties is a business rule — check whether the app enforces it.
- Hint 2: The approve endpoint never asks WHO created the PO.
- Hint 3: Create a PO, then approve it yourself via POST /pos/<id>/approve.

### Purchase order IDOR across suppliers (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: PO pages live at predictable /pos/<id> URLs.
- Hint 2: Ownership is not checked when the page is served.
- Hint 3: As one supplier, open the other supplier’s PO by changing the id.

### Create a PO under another supplier’s identity (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The create-PO form carries a supplierId — whose is used?
- Hint 2: A supplier account should only ever order as itself.
- Hint 3: As supplier A, create a PO with supplierId set to supplier B.

## Shipments

### Shipment IDOR exposes other suppliers’ deliveries (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Shipment pages are at /shipments/<id> with sequential ids.
- Hint 2: Try viewing a shipment that belongs to the other supplier.
- Hint 3: As one supplier, open the other supplier’s shipment by id.

## Inventory & Warehouses

### Arbitrary stock adjustment (negative stock) (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The stock-adjust endpoint trusts both the caller and the number.
- Hint 2: No warehouse role is required, and negative values are accepted.
- Hint 3: POST /inventory/adjust with a negative stock value and watch inventory break.

### Restricted internal item exposed to suppliers (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: One inventory item is flagged internal/restricted and hidden from lists.
- Hint 2: Direct URLs are not protected the same way.
- Hint 3: Open /inventory/9 (the restricted QA item) directly as a supplier.

## Supplier Invoices

### Supplier invoice IDOR (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Invoices live at /invoices/<id>.
- Hint 2: Try reading an invoice issued to the other supplier.
- Hint 3: As one supplier, open the other supplier’s invoice by id.

### Supplier marks own invoice PAID with a wrong amount (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The pay endpoint accepts an amount and a status from the caller.
- Hint 2: It never compares the amount with the invoice total, nor checks who may pay.
- Hint 3: As the supplier, POST /invoices/<id>/pay with amount=1 for a much larger invoice.

## Admin Panel

### Admin panel open to any logged-in user (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Try the /admin URL while signed in as a low-privilege user.
- Hint 2: The page checks that you are logged in — nothing more.
- Hint 3: Open /admin as the buyer or a supplier.

### CSRF on admin user deletion (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Admin actions are plain POSTs without tokens.
- Hint 2: A forged cross-site request carries the admin’s cookies but no hx_origin marker.
- Hint 3: As admin, POST /admin/users/<id>/delete without the hx_origin marker.

## Platform & API

### Unauthenticated /api/debug dumps all data (Beginner)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: Debug endpoints often survive into production.
- Hint 2: This one needs no login at all.
- Hint 3: Fetch /api/debug with no session cookie.

### Weak API token = base64(email) (Intermediate)
- Objective: complete the test so the Mission Board flips it to done (server-side detection).
- Hint 1: The API accepts an X-Api-Key header instead of a session.
- Hint 2: Look at what the "key" really is for your own account — it decodes to something familiar.
- Hint 3: Send X-Api-Key = base64 of another user’s email to /api/invoices, with no session.
