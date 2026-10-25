'use strict';
/*
 * HexaExpense — LAB 50 of 110 (Category 5: Finance, Payments & Insurance)
 * A deliberately vulnerable expense-management platform for hands-on
 * web penetration-testing practice. LOCAL USE ONLY — bind 127.0.0.1.
 * Zero-dependency Node.js. Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 50;
const LAB_NAME = 'HexaExpense';
const PORT = 3059;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ---- key material: stored ONLY as encoded fragments (region A of 4) ---- */



/* ============================== DATA ==================================== */
const COMPANIES = [
  { id: 1, name: 'Acme Corp' },
  { id: 2, name: 'Globex Ltd' },
];

/* Policies (per company, same values seeded for both) */
const POLICY = {
  mealsMonthlyCap: 400,      // per employee per month, category "Meals"
  managerApproveLimit: 500,  // managers may approve claims up to this amount
};

const users = [
  { id: 1, companyId: 1, name: 'Alice Adams',  email: 'alice@acme.test',   pass: 'alice123', role: 'employee', managerId: 2, bank: { holder: 'Alice Adams',  iban: 'DE00-ACME-1001', bank: 'Acme Bank' }, isDefault: false },
  { id: 2, companyId: 1, name: 'Bob Brown',    email: 'bob@acme.test',     pass: 'bob123',   role: 'manager',  managerId: null, bank: { holder: 'Bob Brown',    iban: 'DE00-ACME-1002', bank: 'Acme Bank' }, isDefault: false },
  { id: 3, companyId: 1, name: 'Fiona Fox',    email: 'fiona@acme.test',   pass: 'fiona123', role: 'finance',  managerId: null, bank: { holder: 'Fiona Fox',    iban: 'DE00-ACME-1003', bank: 'Acme Bank' }, isDefault: false },
  { id: 4, companyId: 1, name: 'Adam Admin',   email: 'adam@acme.test',    pass: 'admin123', role: 'admin',    managerId: null, bank: { holder: 'Adam Admin',   iban: 'DE00-ACME-1004', bank: 'Acme Bank' }, isDefault: false },
  { id: 5, companyId: 1, name: 'Demo User',    email: 'demo@acme.test',    pass: 'demo123',  role: 'employee', managerId: 2, bank: { holder: 'Demo User',    iban: 'DE00-ACME-1005', bank: 'Acme Bank' }, isDefault: true },
  { id: 6, companyId: 2, name: 'Carol Clark',  email: 'carol@globex.test', pass: 'carol123', role: 'employee', managerId: 7, bank: { holder: 'Carol Clark',  iban: 'GB00-GLBX-2001', bank: 'Globex Bank' }, isDefault: false },
  { id: 7, companyId: 2, name: 'Dave Doyle',   email: 'dave@globex.test',  pass: 'dave123',  role: 'manager',  managerId: null, bank: { holder: 'Dave Doyle',   iban: 'GB00-GLBX-2002', bank: 'Globex Bank' }, isDefault: false },
  { id: 8, companyId: 2, name: 'Erin Ellis',   email: 'erin@globex.test',  pass: 'erin123',  role: 'finance',  managerId: null, bank: { holder: 'Erin Ellis',   iban: 'GB00-GLBX-2003', bank: 'Globex Bank' }, isDefault: false },
];
let nextUserId = 9;

/* Receipts are simulated records: id, owner, merchant, declared amount. */
const receipts = [
  { id: 1, ownerId: 1, merchant: 'City Bistro',   amount: 120, note: 'Team lunch receipt' },
  { id: 2, ownerId: 1, merchant: 'TaxiCo',        amount: 45,  note: 'Airport taxi receipt' },
  { id: 3, ownerId: 6, merchant: 'Grand Hotel',   amount: 640, note: 'Conference hotel receipt' },
  { id: 4, ownerId: 6, merchant: 'Airline EU',    amount: 310, note: 'Flight receipt' },
];
let nextReceiptId = 5;

/* Expenses. status: draft|submitted|approved|rejected|paid
 * managerApprovedBy is set ONLY by the proper manager-approval step. */
const expenses = [
  { id: 1, companyId: 1, ownerId: 1, title: 'Client lunch',     category: 'Meals',  amount: 180, receiptId: 1, status: 'submitted', managerApprovedBy: null, createdMonth: 'current' },
  { id: 2, companyId: 1, ownerId: 1, title: 'Team dinner',      category: 'Meals',  amount: 170, receiptId: null, status: 'submitted', managerApprovedBy: null, createdMonth: 'current' },
  { id: 3, companyId: 1, ownerId: 5, title: 'Taxi to airport',  category: 'Travel', amount: 45,  receiptId: 2, status: 'approved',  managerApprovedBy: 2, createdMonth: 'current' },
  { id: 4, companyId: 2, ownerId: 6, title: 'Hotel conference', category: 'Travel', amount: 640, receiptId: 3, status: 'submitted', managerApprovedBy: null, createdMonth: 'current' },
  { id: 5, companyId: 2, ownerId: 6, title: 'Flight to Berlin', category: 'Travel', amount: 310, receiptId: 4, status: 'approved',  managerApprovedBy: 7, createdMonth: 'current' },
  { id: 6, companyId: 1, ownerId: 1, title: 'Office snacks',    category: 'Meals',  amount: 60,  receiptId: null, status: 'draft',    managerApprovedBy: null, createdMonth: 'current' },
  { id: 7, companyId: 1, ownerId: 5, title: 'Software license', category: 'Software', amount: 900, receiptId: null, status: 'submitted', managerApprovedBy: null, createdMonth: 'current' },
];
let nextExpenseId = 8;

/* Reimbursement payments created by finance. */
const payments = [];
let nextPaymentId = 1;

/* Simulated file store for receipt uploads + a sensitive file outside it. */
const receiptFiles = {
  'welcome.txt': 'HexaExpense receipt vault. Uploaded receipts live under receipts/.',
};
const ROOT_FILES = {
  'payroll-q3.csv': 'employee,salary_q3\nAlice Adams,18200\nBob Brown,24500\nFiona Fox,26900\n',
  'config.txt': 'DB_HOST=localhost\nDB_USER=expense_app\nDB_PASS=Sup3rSecretFake\n',
};

/* ============================ TESTS REGISTRY ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL injection login bypass (legacy SSO route)', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The main login is parameterised, but finance staff mention a "legacy SSO" login page linked from the footer.', 'The legacy route builds its query by gluing your input straight into a SQL string. What happens if the password field closes the string early?', "Try a password like ' OR '1'='1 — or truncate the query with a comment — so the password check evaluates to true for the first user."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself; parameterised queries remove the whole class.',
    impact: 'On a real expense platform this means an attacker logs in as the first account in the table — often an admin — with no password at all, reaching every claim, salary-adjacent bank detail and approval queue.',
    report: { title: 'SQL Injection in Legacy Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and retire the legacy string-built login route.' } },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'No rate limiting on login (brute force)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one account and simply keep guessing wrong passwords.', 'Count how many failures the server accepts in a row — does anything slow down, lock, or CAPTCHA?', 'After 10+ rapid failures the login still processes attempts normally — that missing throttle is the finding.'],
    lesson: 'Without throttling or lockout, password guessing is free and unlimited; detection here fires when the 10th failure is still processed.',
    impact: 'Attackers can grind through password lists against finance staff accounts until one works — expense systems hold bank details, so one cracked login is a payout-diversion kit.',
    report: { title: 'Missing Rate Limiting on Login Enables Brute-Force Attacks', severity: 'High', remediation: 'Add progressive delays, lockout and alerting after repeated failed logins per account and IP.' } },
  { id: 'user-enum', feature: 'Login & Authentication', name: 'User enumeration via login & password-reset responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the exact wording of a failed login for an email that exists vs one that does not.', 'The forgot-password page answers differently too — one says a reset was sent, the other admits the account is unknown.', 'Probe both a real and an invented email on either form and note the difference.'],
    lesson: 'Different error messages for "no such user" and "wrong password" hand attackers a verified target list for free.',
    impact: 'An attacker first confirms which employee emails are real, then aims phishing and password spraying only at accounts that exist — far quieter and far more effective.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and reset requests regardless of account existence.' } },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default demo credentials left active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Seeded demo accounts are a classic leftover — the login page footer even hints a demo account exists.', 'Demo accounts almost always use the product name or "demo" in both fields.', 'Try demo@acme.test with the password demo123.'],
    lesson: 'Vendor/demo accounts with guessable passwords survive into production unless someone explicitly removes them.',
    impact: 'Anyone on the internet can walk into a live employee account with a password printed in countless tutorials — no skill required, and the login looks legitimate in the logs.',
    report: { title: 'Active Default Demo Account with Guessable Password', severity: 'High', remediation: 'Remove seeded/demo accounts before go-live and force unique credentials for every user.' } },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable password-reset token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format in the "sent" confirmation.', 'The token is derived from something stable about the account — look at your user id and a simple arithmetic pattern.', 'Tokens look like rst-<id>-<id times 137 plus 42>. Forge one for the admin (id 4) and set a new password.'],
    lesson: 'Reset tokens must be unguessable random values; a token derived from the user id is an account-takeover formula.',
    impact: 'Whoever can compute the formula can reset the finance admin\u2019s password and approve or redirect reimbursements — full control of the money-out workflow.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store hashed, single-use, short expiry.' } },
  { id: 'cookie-role', feature: 'Login & Authentication', name: 'Role stored in a client cookie (session/role tampering)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in as a normal employee, inspect the cookies the app sets.', 'One cookie repeats your role — and some pages trust it more than the server-side session.', 'Set hx_role=finance in your browser and open the Finance queue; then try hx_role=admin on the Admin panel.'],
    lesson: 'Authorization data kept on the client is attacker-controlled; roles must live server-side in the session.',
    impact: 'Any employee can promote themselves to finance or admin by editing a cookie — approving their own claims and exporting the whole company\u2019s expense data.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization', severity: 'Critical', remediation: 'Store roles only in the server-side session and ignore client-supplied role values.' } },

  /* ---- Registration & Profile ---- */
  { id: 'mass-assign', feature: 'Registration & Profile', name: 'Mass assignment on registration (role self-assignment)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Register a normal account, then look at what fields the server might accept beyond the visible form.', 'The handler copies the whole request body onto the new user record — including fields the form never shows.', 'Register again adding role=finance (and a companyId of your choice) to the POST body.'],
    lesson: 'Binding request bodies directly to data models lets attackers set privileged fields the UI never offered.',
    impact: 'A stranger can register themselves directly as finance staff inside a target company and start approving claims and viewing bank details on day one.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist bindable fields on registration; assign role and company server-side only.' } },
  { id: 'xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Names are printed on dashboards, approval queues and admin lists — anywhere your name renders is a payload slot.', 'Set your display name to an HTML/JS payload such as <script>alert(1)</script> or an <img onerror> tag.', 'The payload is stored and served unescaped to other users — that persistence is the finding.'],
    lesson: 'User-controlled text must be output-encoded everywhere it renders, especially in back-office views.',
    impact: 'An employee plants a script that fires in the finance manager\u2019s browser, riding their session to approve claims or change payout accounts.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'HTML-encode all user-supplied values on output and add a Content-Security-Policy.' } },
  { id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile updates are a plain POST with no anti-CSRF token — check what the request carries.', 'The app marks its own pages with a marker cookie; a request arriving from another site (or without the marker) should be rejected — it is not.', 'Send the profile-change POST with a foreign Origin header (or strip cookies\u2019 marker) and watch it apply.'],
    lesson: 'State-changing forms need unforgeable tokens; cookies alone are sent automatically by the victim\u2019s browser.',
    impact: 'A booby-trapped page an employee visits can silently rewrite their profile — including the bank account reimbursements are paid into.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and validate Origin/Referer.' } },

  /* ---- Expense Claims ---- */
  { id: 'expense-idor', feature: 'Expense Claims', name: 'Expense IDOR — read another company\u2019s claim', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your own claims live at /expenses/<id>. Note the numbering.', 'Nothing checks that the claim belongs to you — or even to your company.', 'Open a claim id that belongs to Globex (try the hotel claim, id 4) while logged in at Acme.'],
    lesson: 'Every object access must verify the requester owns it or is authorised — sequential ids make guessing trivial.',
    impact: 'A competitor\u2019s employee — or any user — reads the other company\u2019s travel, client and spending details claim by claim, a direct confidentiality breach between tenants.',
    report: { title: 'Insecure Direct Object Reference on Expense Claims (Cross-Tenant)', severity: 'High', remediation: 'Enforce per-object ownership and tenant checks on every expense read.' } },
  { id: 'amount-tamper', feature: 'Expense Claims', name: 'Amount tampering on a submitted claim', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Once a claim is submitted, the UI locks its amount — but the server still listens to the edit endpoint.', 'POST directly to /expenses/<id>/edit with a new amount, skipping the UI entirely.', 'Raise your submitted $180 lunch claim and reload — the stored amount changed after submission.'],
    lesson: 'Workflow locks enforced only in the UI are no lock at all; the server must enforce state rules.',
    impact: 'An employee submits a modest claim that passes review, then quietly inflates it before finance pays — the approved total and the paid total no longer match the reviewed one.',
    report: { title: 'Submitted Expense Amount Editable via Direct Request (Business-Logic Tampering)', severity: 'High', remediation: 'Reject amount changes once a claim leaves draft status; re-derive totals server-side.' } },
  { id: 'receipt-swap', feature: 'Expense Claims', name: 'Receipt swap — attach someone else\u2019s (bigger) receipt', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Claims reference a receipt by id. Receipts belong to people, not to claims.', 'The attach step never checks that the receipt is yours — or that its value matches the claim.', 'Set your claim\u2019s receiptId to the $640 Globex hotel receipt (id 3) and view the claim.'],
    lesson: 'Linked objects need ownership checks too; a foreign key is just another IDOR waiting to happen.',
    impact: 'A $40 taxi claim suddenly carries a $640 hotel receipt as "proof", and approvers reviewing paperwork see matching evidence for money that was never spent by that employee.',
    report: { title: 'Receipt Attachment Lacks Ownership Validation (Receipt Swap Fraud)', severity: 'High', remediation: 'Verify receipt ownership and reconcile receipt amount against the claim before acceptance.' } },
  { id: 'self-approve', feature: 'Expense Claims', name: 'Self-approval of own expense', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Approval is just a POST to /expenses/<id>/approve. Who does the server think is allowed to send it?', 'The endpoint checks the status, not the relationship between approver and claim owner.', 'While logged in as the claim\u2019s owner, POST the approve call for your own submitted claim.'],
    lesson: 'Segregation of duties must be enforced server-side: the requester can never be the approver.',
    impact: 'The four-eyes principle collapses — any employee can push their own invented claims through approval and into the payment queue, the classic internal expense-fraud path.',
    report: { title: 'Expense Self-Approval Allowed (Missing Segregation of Duties)', severity: 'Critical', remediation: 'Reject approvals where approver == claim owner; enforce approver role and reporting line.' } },
  { id: 'skip-step', feature: 'Expense Claims', name: 'Skip the manager step — straight to paid', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The workflow is draft → submitted → (manager) approved → (finance) paid. Two different endpoints drive the last two steps.', 'The finance "mark paid" endpoint checks the claim\u2019s status string loosely — it never verifies a manager actually approved it.', 'As finance, call the reimburse endpoint on a merely-submitted claim that has no manager approval recorded.'],
    lesson: 'State machines must verify the full transition history, not just the current status label.',
    impact: 'Colluding or compromised accounts can bypass the manager checkpoint entirely, so claims reach payment without the one review designed to catch invented expenses.',
    report: { title: 'Approval Workflow Step Skippable — Payment Without Manager Approval', severity: 'Critical', remediation: 'Require a recorded manager approval before the finance payment transition is accepted.' } },

  /* ---- Approvals & Workflow ---- */
  { id: 'cross-approve', feature: 'Approvals & Workflow', name: 'Manager approves another company\u2019s claim', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Bob manages Acme staff. Dave\u2019s Globex claims are none of his business — on paper.', 'The approve endpoint never compares the manager\u2019s company with the claim\u2019s company.', 'As Bob, approve Carol\u2019s submitted Globex hotel claim (id 4).'],
    lesson: 'Multi-tenant systems must scope every action to the actor\u2019s tenant, not just their role.',
    impact: 'Tenant isolation fails at the workflow layer: one company\u2019s manager can push through (or sabotage) a competitor tenant\u2019s claims, corrupting both companies\u2019 books.',
    report: { title: 'Cross-Tenant Approval — Manager Can Approve Another Company\u2019s Expenses', severity: 'High', remediation: 'Scope approval rights to claims in the approver\u2019s own company and reporting line.' } },
  { id: 'approve-limit', feature: 'Approvals & Workflow', name: 'Manager approval-limit bypass ($500 policy)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Company policy caps manager approvals at $500; bigger claims should route to finance.', 'The limit is displayed in the UI as guidance — look for any server-side enforcement when approving.', 'As Bob, approve Demo\u2019s $900 software claim (id 7) even though it exceeds your limit.'],
    lesson: 'Business limits written in policy documents must be encoded in the approval path, not just displayed.',
    impact: 'A manager can single-handedly approve purchases far above their authority, defeating the financial control the limit exists to provide.',
    report: { title: 'Manager Approval Limit Not Enforced Server-Side', severity: 'Medium', remediation: 'Enforce per-role approval ceilings server-side; route over-limit claims to finance.' } },

  /* ---- Reimbursements ---- */
  { id: 'bank-tamper', feature: 'Reimbursements', name: 'Reimbursement bank-account tampering (co-worker\u2019s payout account)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Bank details live on the profile. The profile-update endpoint takes a user id — whose?', 'There is no ownership check on the bank-update action, and no re-verification step before payouts use the new details.', 'POST a bank change for Fiona (finance, id 3) pointing her IBAN at an attacker account.'],
    lesson: 'Payout-detail changes are high-value operations: they need ownership checks, verification and audit alerts.',
    impact: 'An attacker reroutes a colleague\u2019s — or the whole finance run\u2019s — reimbursements to their own account; the books still balance, the money is simply gone.',
    report: { title: 'Unauthorised Change of Employee Reimbursement Bank Details', severity: 'Critical', remediation: 'Restrict bank changes to the account owner, require re-authentication and notify on change.' } },
  { id: 'double-pay', feature: 'Reimbursements', name: 'Double reimbursement — pay the same claim twice', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Finance marks a claim paid via the reimburse endpoint, creating a payment record each time.', 'Nothing makes the operation idempotent — the endpoint happily runs again on a paid claim.', 'Call reimburse twice on the same approved claim and count the payment records.'],
    lesson: 'Payment operations must be idempotent and state-guarded; a replayed request must not create a second payment.',
    impact: 'Whether by fraud or a double-click race, the company pays the same expense twice — at scale this is a steady, hard-to-notice bleed.',
    report: { title: 'Duplicate Reimbursement Payments Possible (No Idempotency)', severity: 'High', remediation: 'Allow exactly one payment per claim, guarded by status transition and a unique constraint.' } },
];

TESTS.push(
  /* ---- Budgets & Policies ---- */
  { id: 'budget-bypass', feature: 'Budgets & Policies', name: 'Monthly Meals budget cap ($400) not enforced', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Policy: $400 per employee per month for Meals. Alice already has $350 of Meals claims in play this month.', 'The submit path shows the budget on the dashboard but never blocks an over-budget claim.', 'As Alice, submit one more Meals claim of $100+ and watch it sail past the cap.'],
    lesson: 'Budget controls that only display warnings are decoration; enforcement belongs in the submit transaction.',
    impact: 'Departments silently blow their budgets claim by claim — finance only discovers the overrun at month-end, after the money has left.',
    report: { title: 'Category Budget Cap Not Enforced on Expense Submission', severity: 'Medium', remediation: 'Check cumulative category spend against the cap inside the submission transaction and block or escalate overruns.' } },

  /* ---- Search & Reports ---- */
  { id: 'search-sqli', feature: 'Search & Reports', name: 'SQL injection in expense search leaks other tenants', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The expense search builds its filter from your text, like the legacy login does.', 'A quote in the search box changes the logic of the "query" the app evaluates.', "Search expenses for ' OR '1'='1 and compare the result set with a normal search — other companies appear."],
    lesson: 'Any place user input is glued into a query string is injectable — search boxes are the most common one.',
    impact: 'One crafted search dumps every tenant\u2019s claims — amounts, employees, clients — a full cross-company data breach from a single text field.',
    report: { title: 'SQL Injection in Expense Search Exposes Cross-Tenant Data', severity: 'Critical', remediation: 'Parameterise the search query and always AND it with the requester\u2019s tenant scope.' } },
  { id: 'search-xss', feature: 'Search & Reports', name: 'Reflected XSS in expense search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page cheerfully prints "Results for: <your text>" back at you.', 'It prints it raw. Markup you type becomes markup the browser runs.', 'Search for <script>alert(1)</script> and view the page source of the response.'],
    lesson: 'Reflected input must be encoded in the response, even on "harmless" internal tools.',
    impact: 'A crafted search link sent to a finance user executes script in their session — a stepping stone to approving claims or changing payout details as them.',
    report: { title: 'Reflected Cross-Site Scripting in Expense Search', severity: 'Medium', remediation: 'HTML-encode the reflected query term and all user data in search results.' } },
  { id: 'export-cross', feature: 'Search & Reports', name: 'CSV export ignores tenant scope (all companies)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Finance can export claims to CSV from the reports page. The export was built for a single-company world.', 'The handler forgets to filter by the requester\u2019s company — try it as any Acme user.', 'Download /reports/export.csv and look for Globex rows in the file.'],
    lesson: 'Exports and reports are data-access paths too; they need the same tenant filtering as the UI queries.',
    impact: 'Any employee can download the entire multi-tenant expense ledger — a reportable data breach covering every client company on the platform.',
    report: { title: 'Expense CSV Export Missing Tenant Filter (Full Ledger Disclosure)', severity: 'High', remediation: 'Apply tenant scoping to exports and restrict export rights to finance roles.' } },

  /* ---- Receipts & Files ---- */
  { id: 'upload-html', feature: 'Receipts & Files', name: 'Unrestricted receipt upload — HTML served from the app origin', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The receipt vault accepts "receipt files" by name and content, then serves them back under /files/.', 'Nothing checks the file type — a receipt does not have to be an image or PDF at all.', 'Upload a file named claim.html containing a script payload and open its /files/ URL.'],
    lesson: 'Uploads must be type-validated and served safely; user files on the app origin inherit the app\u2019s trust.',
    impact: 'Attackers host active content on the company\u2019s own expense domain, turning every shared "receipt link" into a session-riding attack on staff.',
    report: { title: 'Unrestricted File Upload — HTML/JS Served from Application Origin', severity: 'High', remediation: 'Whitelist receipt file types, sniff content, and serve uploads with Content-Disposition: attachment from a separate host.' } },
  { id: 'traversal', feature: 'Receipts & Files', name: 'Path traversal in receipt download reads server files', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Downloads are served by name from the receipts folder: /files/<name>.', 'The name is joined to the folder path without cleaning dot-dot segments.', 'Request /files/../config.txt (URL-encode if needed) and see what answers.'],
    lesson: 'Never build filesystem paths from raw user input; resolve and confine paths to the intended directory.',
    impact: 'Server configuration, credential files and payroll exports become downloadable by any user — the traversal turns a receipt viewer into a file-read primitive.',
    report: { title: 'Path Traversal in File Download Exposes Server Files', severity: 'Critical', remediation: 'Normalise and validate download paths against an allowlist directory; reject traversal sequences.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-access', feature: 'Admin Panel', name: 'Admin panel reachable by non-admin users', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is an /admin area listing every user of every company. Who is actually stopped from opening it?', 'The route checks that you are logged in — and stops there.', 'Log in as a plain employee and open /admin directly.'],
    lesson: 'Authentication is not authorization; every privileged route needs its own role check.',
    impact: 'The full staff directory of all tenant companies — names, roles, emails — is one URL away for any user, feeding targeted phishing and takeover attempts.',
    report: { title: 'Admin Panel Accessible to Non-Admin Users', severity: 'High', remediation: 'Enforce admin-role checks server-side on every /admin route.' } },
  { id: 'debug-exposure', feature: 'Admin Panel', name: 'Debug endpoint dumps credentials & bank data (unauthenticated)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Developers leave diagnostics behind. Common paths: /debug, /api/debug, /status, /_debug.', 'This one does not even ask you to log in.', 'Fetch /api/debug with no session at all and read what it hands back.'],
    lesson: 'Debug/diagnostic endpoints must never ship to production, and never without authentication.',
    impact: 'The entire user table — passwords in plain text and bank IBANs — is public to the internet, a worst-case breach requiring zero skill to exploit.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Passwords and Bank Details', severity: 'Critical', remediation: 'Remove diagnostic endpoints from production builds; never store or return plaintext passwords.' } },
);

/* ---- key material (region C of 4) ---- */


const _fragE = ['TC1YSA==', 'UC0xNQ=='];
const _fragF = ['TUdTNQ=='];
function _unshard(parts) {
  return parts.map(p => [...Buffer.from(p, 'base64').toString('utf8')].reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = '60e347e1585fcbc3ee018dae1fc9b2fb370123405bace064c3cb9f23f1a2add9';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _unshard([..._fragE, ..._fragF, 'LUhGUw==', 'WlNIMA==', 'WFlMUw==']); }

const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ============================ PROGRESS ================================== */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (p && typeof p === 'object') progress = Object.assign(progress, p);
    }
  } catch (e) { /* corrupted state -> start clean */ }
  for (const f of FEATURES) if (typeof progress.attempts[f] !== 'number') progress.attempts[f] = 0;
}
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {}
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete() && !progress.completedAt) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function attempt(feature) {
  if (!FEATURES.includes(feature)) return;
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}

/* ============================ SESSIONS ================================== */
const sessions = new Map(); // sid -> { userId }
function newSession(userId) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, { userId });
  return sid;
}
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  const s = c.hx_sid && sessions.get(c.hx_sid);
  if (!s) return null;
  return users.find(u => u.id === s.userId) || null;
}
/* Authorization role: the app (wrongly) trusts the client role cookie when present. */
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.hx_role) return c.hx_role;
  return user ? user.role : null;
}
function checkCookieTamper(req, user) {
  const c = parseCookies(req);
  if (user && c.hx_role && c.hx_role !== user.role) pass('cookie-role');
}
function isCsrf(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin) {
    try { const h = new URL(origin).host; if (h && req.headers.host && h !== req.headers.host) return true; } catch (e) {}
  }
  const c = parseCookies(req);
  if (!c.hx_origin) return true;
  return false;
}

/* ====================== MINI SQL-LIKE EVALUATOR ========================= */
/* Emulates a string-built SQL WHERE clause just faithfully enough for the
 * classic login/search injection patterns used in this lab. */
function stripComment(q) { const i = q.indexOf('--'); return i >= 0 ? q.slice(0, i) : q; }
function tokenizeSql(q) {
  const toks = []; let i = 0;
  while (i < q.length) {
    const ch = q[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "'") { let j = i + 1, s = ''; while (j < q.length && q[j] !== "'") { s += q[j]; j++; } toks.push({ t: 'str', v: s }); i = j + 1; continue; }
    if (/[0-9]/.test(ch)) { let j = i, s = ''; while (j < q.length && /[0-9]/.test(q[j])) { s += q[j]; j++; } toks.push({ t: 'num', v: Number(s) }); i = j; continue; }
    if (/[A-Za-z_]/.test(ch)) { let j = i, s = ''; while (j < q.length && /[A-Za-z0-9_.]/.test(q[j])) { s += q[j]; j++; } const up = s.toUpperCase(); if (up === 'AND' || up === 'OR') toks.push({ t: up }); else toks.push({ t: 'ident', v: s }); i = j; continue; }
    if (ch === '=') { toks.push({ t: 'eq' }); i++; continue; }
    if (ch === '(' || ch === ')') { toks.push({ t: ch }); i++; continue; }
    i++;
  }
  return toks;
}
function evalWhere(query, row) {
  // row: map of column -> string value for identifier resolution
  try {
    const toks = tokenizeSql(stripComment(query));
    let pos = 0;
    function peek() { return toks[pos]; }
    function parseOperand() {
      const tk = toks[pos++];
      if (!tk) return '';
      if (tk.t === 'str') return tk.v;
      if (tk.t === 'num') return tk.v;
      if (tk.t === 'ident') { const v = row[tk.v.toLowerCase()]; return v === undefined ? '' : v; }
      if (tk.t === '(') { const v = parseOr(); if (peek() && peek().t === ')') pos++; return v; }
      return '';
    }
    function parseCmp() {
      const l = parseOperand();
      if (peek() && peek().t === 'eq') { pos++; const r = parseOperand(); return String(l) === String(r); }
      return !!l && l !== '' && l !== '0';
    }
    function parseAnd() { let v = parseCmp(); while (peek() && peek().t === 'AND') { pos++; const r = parseCmp(); v = v && r; } return v; }
    function parseOr() { let v = parseAnd(); while (peek() && peek().t === 'OR') { pos++; const r = parseAnd(); v = v || r; } return v; }
    return parseOr();
  } catch (e) { return false; }
}
function legacyLogin(email, passIn) {
  // SELECT * FROM users WHERE email='<email>' AND pass='<pass>'
  for (const u of users) {
    const where = `email='${email}' AND pass='${passIn}'`;
    if (evalWhere(where, { email: u.email, pass: u.pass })) return u;
  }
  return null;
}
function injectionish(s) { return /'|--|\bOR\b|\bAND\b/i.test(s || ''); }

/* ============================== CHATBOT ================================= */
const GUIDE = {
  'Login & Authentication': 'Step by step: (1) Find the legacy SSO login linked in the footer — it glues input into a SQL string; a password like \' OR \'1\'=\'1 logs you in as the first user. (2) Keep guessing one account\u2019s password 10+ times — nothing throttles you. (3) Compare login and forgot-password messages for real vs invented emails. (4) The seeded demo account demo@acme.test / demo123 still works. (5) Reset tokens look like rst-<id>-<id*137+42> — forge the admin\u2019s (id 4). (6) After login, edit the hx_role cookie to finance or admin and revisit gated pages.',
  'Registration & Profile': 'Step by step: (1) Register while adding extra body fields such as role=finance — the server copies the whole body onto your account. (2) Put an HTML/script payload in your display name and view any page that prints it. (3) Send a profile update POST with a foreign Origin header (or without the app\u2019s marker cookie) — it applies anyway.',
  'Expense Claims': 'Step by step: (1) Open /expenses/4 (a Globex claim) while logged in at Acme — no ownership check. (2) POST /expenses/<your submitted id>/edit with a bigger amount — the UI lock is fiction. (3) Edit your claim and set receiptId=3 (the $640 Globex hotel receipt). (4) POST /expenses/<your id>/approve as the owner. (5) As finance, POST /reimburse/<id> on a claim that was never manager-approved.',
  'Approvals & Workflow': 'Step by step: (1) As Bob (Acme manager), POST /expenses/4/approve for Carol\u2019s Globex claim — tenant scope is never checked. (2) Still as Bob, approve Demo\u2019s $900 claim (id 7) — your $500 policy limit is not enforced.',
  'Reimbursements': 'Step by step: (1) POST /profile/bank with id=3 (Fiona) and your own IBAN — no ownership check, no re-verification. (2) As finance, POST /reimburse/<approved id> twice and watch two payment records appear.',
  'Budgets & Policies': 'Step by step: Alice already has $350 of Meals claims this month and the cap is $400. As Alice, create one more Meals expense of $100 or more — submission succeeds and the cap is history.',
  'Search & Reports': 'Step by step: (1) Search expenses for \' OR \'1\'=\'1 — the result set suddenly includes other companies. (2) Search for a <script> payload and view the response source — your text comes back raw. (3) Download /reports/export.csv as any user and find the Globex rows.',
  'Receipts & Files': 'Step by step: (1) Upload a "receipt" named claim.html whose content is a script payload, then open /files/claim.html. (2) Request /files/../config.txt — the download joins paths without cleaning them.',
  'Admin Panel': 'Step by step: (1) Log in as any plain employee and open /admin — it only checks that you are logged in. (2) Fetch /api/debug with no session at all — the full user table, passwords and IBANs included, comes back as JSON.',
};
function chatReply(message) {
  const msg = String(message || '').toLowerCase();
  if (/who (built|made|created)|founder|jony|hexacyberlab/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b|unlock|next lab|password for lab/.test(msg)) {
    if (isComplete() && progress.keyRevealed) return 'You completed LAB 50 — here is the completion key for the next lab: ' + completionKey();
    return 'I don\u2019t have the completion key yet — it is only revealed to me when this lab reaches 100%. Right now you are at ' + Math.floor(doneCount() / TESTS.length * 100) + '%. Finish all ' + TESTS.length + ' tests and I\u2019ll share it.';
  }
  // feature how-to / counts
  for (const f of FEATURES) {
    const key = f.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3)[0];
    if (key && msg.includes(key)) {
      const list = TESTS.filter(t => t.feature === f);
      if (/how|help|guide|do|solve|step/.test(msg)) {
        const a = progress.attempts[f] || 0;
        if (a >= 3 || list.every(t => progress.tests[t.id])) return GUIDE[f];
        return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + a + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
      }
      return f + ' has ' + list.length + ' test(s): ' + list.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[f] || 0) + '.';
    }
  }
  if (/progress|status|score|percent/.test(msg)) {
    return 'Current progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%). Open /tests to see what is left.';
  }
  if (/hi|hello|hey|start/.test(msg)) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + FEATURES.length + ' features and ' + TESTS.length + ' scored tests. Work through /tests; after 3 genuine attempts on a feature I can guide you step by step. Progress: ' + doneCount() + '/' + TESTS.length + '.';
  }
  return 'I can help with: progress, test counts per feature, and step-by-step guidance for a feature once you\u2019ve tried it at least 3 times. See /tests for the full mission list.';
}

/* ============================ HTML HELPERS ============================== */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function layout(req, user, title, body) {
  const p = pct();
  const chat = `<div id="chatbox" style="position:fixed;right:14px;bottom:14px;width:320px;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:10px;font-family:monospace;z-index:50">
  <div style="padding:8px 10px;border-bottom:1px solid #374151"><b>Lab Coach</b> — LAB ${LAB_NUMBER}</div>
  <div id="chatlog" style="height:170px;overflow:auto;padding:8px 10px;font-size:12px"></div>
  <div style="display:flex;gap:6px;padding:8px"><input id="chatin" style="flex:1;background:#1f2937;color:#fff;border:1px solid #4b5563;border-radius:6px;padding:6px" placeholder="Ask the Lab Coach..."><button onclick="sendChat()" style="background:#2563eb;color:#fff;border:0;border-radius:6px;padding:6px 10px">Send</button></div></div>
  <script>async function sendChat(){var i=document.getElementById('chatin');var log=document.getElementById('chatlog');var m=i.value;i.value='';log.innerHTML+='<div><b>You:</b> '+m.replace(/</g,'&lt;')+'</div>';var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();log.innerHTML+='<div><b>Coach:</b> '+String(j.reply).replace(/</g,'&lt;')+'</div>';log.scrollTop=log.scrollHeight;}</script>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaExpense</title>
  <style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f8fafc;color:#0f172a}header{background:#0f172a;color:#fff;padding:10px 18px;display:flex;gap:14px;align-items:center}header a{color:#93c5fd;text-decoration:none}main{max-width:960px;margin:20px auto;padding:0 16px}.bar{height:10px;background:#e2e8f0;border-radius:6px;overflow:hidden;min-width:180px}.bar>i{display:block;height:100%;background:#2563eb}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;font-size:14px}input,select,textarea{padding:7px;border:1px solid #cbd5e1;border-radius:6px}button{background:#2563eb;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:12px 0}.muted{color:#64748b;font-size:13px}</style></head>
  <body><header><img src="/logo.png" alt="HexaCyberLab" style="height:34px"><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
  <span class="bar"><i style="width:${p}%"></i></span><span>${doneCount()}/${TESTS.length} tests · ${p}%</span>
  <nav style="margin-left:auto;display:flex;gap:12px"><a href="/">Dashboard</a><a href="/tests">Mission</a><a href="/expenses">Expenses</a><a href="/search">Search</a><a href="/files">Receipt Vault</a>${user ? '<a href="/logout">Logout (' + esc(user.name) + ')</a>' : '<a href="/login">Login</a>'}</nav></header>
  <main>${body}</main>${chat}</body></html>`;
}
function gatePage(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
  <body style="font-family:system-ui;text-align:center;margin-top:80px"><img src="/logo.png" style="height:70px">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${msg ? '<p style="color:#b91c1c">' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/unlock"><input name="key" size="42" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><button type="submit">Unlock</button></form>
  <p style="color:#64748b">HexaCyberLab practice labs — local use only.</p></body></html>`;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj), 'application/json'); }
function redirect(res, to, extra) {
  res.writeHead(302, Object.assign({ Location: to }, extra || {}));
  res.end();
}

/* ============================== SERVER ================================== */
const failedLogins = new Map();   // email -> consecutive failures
const enumProbes = new Map();     // ip -> Set('y'|'n')
const issuedResetTokens = new Set();

function noteEnum(req, exists) {
  const ip = (req.socket && req.socket.remoteAddress) || 'local';
  if (!enumProbes.has(ip)) enumProbes.set(ip, new Set());
  const s = enumProbes.get(ip);
  s.add(exists ? 'y' : 'n');
  if (s.has('y') && s.has('n')) pass('user-enum');
}
function resetTokenFor(u) { return 'rst-' + u.id + '-' + (u.id * 137 + 42); }
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) { try { req.destroy(); } catch (e) {} resolve({}); } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
        const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function money(n) { return '$' + Number(n).toFixed(2); }
function ownerName(id) { const u = users.find(x => x.id === id); return u ? u.name : 'user#' + id; }
function companyName(id) { const c = COMPANIES.find(x => x.id === id); return c ? c.name : 'company#' + id; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = req.url.split('?')[0]; // raw path — URL parsing would normalise away ../ (the traversal test needs it)
    const method = req.method;

    /* static logo */
    if (p === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
      catch (e) { return send(res, 404, 'no logo'); }
    }

    /* progress API (also used pre-gate for status) */
    if (p === '/api/progress') {
      const features = {};
      for (const f of FEATURES) {
        const list = TESTS.filter(t => t.feature === f);
        features[f] = { total: list.length, done: list.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
      }
      return sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() });
    }
    if (p === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      return sendJson(res, 200, { reply: chatReply(b.message) });
    }
    if (p === '/api/debug') {
      pass('debug-exposure');
      return sendJson(res, 200, { debug: true, users: users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.pass, role: u.role, company: companyName(u.companyId), bank: u.bank })), expenses });
    }

    /* unlock gate */
    if (p === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      const key = String(b.key || '').trim();
      if (key && entryKeyMatches(key)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(gatePage('That key was not accepted.'));
    }
    if (!progress.unlocked) return send(res, 200, gatePage());

    const user = sessionUser(req);
    if (user) checkCookieTamper(req, user);
    const role = effectiveRole(req, user);

    /* ---------- auth pages ---------- */
    if (p === '/login' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Login', `<h2>Login to HexaExpense</h2>
      <form method="POST" action="/login"><p><input name="email" placeholder="Email" size="34"></p>
      <p><input name="password" type="password" placeholder="Password" size="34"></p>
      <button>Login</button></form>
      <p class="muted">New here? <a href="/register">Register</a> · <a href="/forgot">Forgot password</a></p>
      <p class="muted">Finance partners: <a href="/legacy-login">Legacy SSO login</a> · A demo account is available for evaluation.</p>`));
    }
    if (p === '/login' && method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const u = users.find(x => x.email === String(b.email || '').toLowerCase());
      noteEnum(req, !!u);
      if (u && u.pass === String(b.password || '')) {
        failedLogins.delete(u.email);
        if (u.isDefault) pass('default-creds');
        const sid = newSession(u.id);
        return redirect(res, '/', { 'Set-Cookie': ['hx_sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + u.role + '; Path=/', 'hx_origin=1; Path=/'] });
      }
      if (u) {
        const n = (failedLogins.get(u.email) || 0) + 1;
        failedLogins.set(u.email, n);
        if (n >= 10) pass('brute-force');
        return send(res, 401, layout(req, null, 'Login failed', '<h2>Login failed</h2><p>Wrong password for that account. Please try again.</p><p><a href="/login">Back</a></p>'));
      }
      return send(res, 401, layout(req, null, 'Login failed', '<h2>Login failed</h2><p>No account exists for that email address.</p><p><a href="/login">Back</a></p>'));
    }
    if (p === '/legacy-login' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Legacy SSO', `<h2>Legacy SSO Login</h2>
      <form method="POST" action="/legacy-login"><p><input name="email" placeholder="Email" size="34"></p>
      <p><input name="password" type="password" placeholder="Password" size="34"></p>
      <button>Login via SSO</button></form><p class="muted"><a href="/login">Back to standard login</a></p>`));
    }
    if (p === '/legacy-login' && method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const email = String(b.email || ''), pw = String(b.password || '');
      const u = legacyLogin(email, pw);
      if (u) {
        if (!(email === u.email && pw === u.pass)) pass('sqli-login');
        if (u.isDefault) pass('default-creds');
        const sid = newSession(u.id);
        return redirect(res, '/', { 'Set-Cookie': ['hx_sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + u.role + '; Path=/', 'hx_origin=1; Path=/'] });
      }
      noteEnum(req, !!users.find(x => x.email === email.toLowerCase()));
      return send(res, 401, layout(req, null, 'SSO failed', '<h2>SSO login failed</h2><p>Invalid credentials.</p>'));
    }
    if (p === '/logout') { const c = parseCookies(req); if (c.hx_sid) sessions.delete(c.hx_sid); return redirect(res, '/login', { 'Set-Cookie': ['hx_sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] }); }
    if (p === '/forgot' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Forgot password', `<h2>Forgot password</h2>
      <form method="POST" action="/forgot"><input name="email" placeholder="Email" size="34"> <button>Send reset link</button></form>
      <p class="muted">Already have a token? <a href="/reset">Reset here</a></p>`));
    }
    if (p === '/forgot' && method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const u = users.find(x => x.email === String(b.email || '').toLowerCase());
      noteEnum(req, !!u);
      if (u) { issuedResetTokens.add(resetTokenFor(u)); return send(res, 200, layout(req, null, 'Reset sent', '<h2>Check your inbox</h2><p>A password reset link was sent to that address.</p>')); }
      return send(res, 200, layout(req, null, 'Unknown', '<h2>No account</h2><p>There is no account for that email address.</p>'));
    }
    if (p === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Reset password', `<h2>Reset password</h2>
      <form method="POST" action="/reset"><p><input name="email" placeholder="Email" size="34"></p>
      <p><input name="token" placeholder="Reset token" size="34"></p>
      <p><input name="newpass" placeholder="New password" size="34"></p>
      <button>Set new password</button></form>`));
    }
    if (p === '/reset' && method === 'POST') {
      const b = await readBody(req);
      attempt('Login & Authentication');
      const u = users.find(x => x.email === String(b.email || '').toLowerCase());
      if (u && String(b.token || '') === resetTokenFor(u)) {
        const ownSession = user && user.id === u.id;
        if (!ownSession) pass('reset-token');
        u.pass = String(b.newpass || 'changed123');
        return send(res, 200, layout(req, null, 'Done', '<h2>Password updated</h2><p><a href="/login">Login</a></p>'));
      }
      return send(res, 400, layout(req, null, 'Bad token', '<h2>Invalid reset token</h2>'));
    }
    if (p === '/register' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Register', `<h2>Create your HexaExpense account</h2>
      <form method="POST" action="/register"><p><input name="name" placeholder="Full name" size="34"></p>
      <p><input name="email" placeholder="Email" size="34"></p>
      <p><input name="password" placeholder="Password" size="34"></p>
      <button>Register</button></form>`));
    }
    if (p === '/register' && method === 'POST') {
      const b = await readBody(req);
      attempt('Registration & Profile');
      const nu = { id: nextUserId++, companyId: 1, name: String(b.name || 'New User'), email: String(b.email || '').toLowerCase(), pass: String(b.password || ''), role: 'employee', managerId: null, bank: { holder: String(b.name || ''), iban: '', bank: '' }, isDefault: false };
      /* flaw: the whole body is trusted (mass assignment) */
      if (b.role) nu.role = String(b.role);
      if (b.companyId) nu.companyId = Number(b.companyId) || 1;
      if (b.isDefault) nu.isDefault = true;
      if ((b.role && String(b.role) !== 'employee') || b.companyId) pass('mass-assign');
      users.push(nu);
      const sid = newSession(nu.id);
      return redirect(res, '/', { 'Set-Cookie': ['hx_sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/', 'hx_origin=1; Path=/'] });
    }

    /* everything below requires a login */
    if (!user && p !== '/complete' && p !== '/complete/name' && p !== '/certificate') return redirect(res, '/login');

    /* ---------- dashboard ---------- */
    if (p === '/' && method === 'GET') {
      const mine = expenses.filter(e => e.ownerId === user.id);
      const meals = expenses.filter(e => e.ownerId === user.id && e.category === 'Meals' && ['submitted', 'approved', 'paid'].includes(e.status)).reduce((s, e) => s + e.amount, 0);
      const queue = expenses.filter(e => e.status === 'submitted');
      let q = '';
      if (['manager', 'finance', 'admin'].includes(role)) {
        q = `<div class="card"><h3>Approval / payment queue</h3><table><tr><th>ID</th><th>Title</th><th>Owner</th><th>Company</th><th>Amount</th><th>Action</th></tr>
        ${queue.map(e => `<tr><td>${e.id}</td><td>${esc(e.title)}</td><td>${ownerName(e.ownerId)}</td><td>${companyName(e.companyId)}</td><td>${money(e.amount)}</td>
        <td><form method="POST" action="/expenses/${e.id}/approve" style="display:inline"><button>Approve</button></form>
        <form method="POST" action="/reimburse/${e.id}" style="display:inline"><button>Mark paid</button></form></td></tr>`).join('')}</table>
        <p class="muted">Policy: managers approve up to ${money(POLICY.managerApproveLimit)}; larger claims route to Finance.</p></div>`;
      }
      return send(res, 200, layout(req, user, 'Dashboard', `<h2>Welcome, ${user.name}</h2>
      <p>${esc(user.role)} at ${esc(companyName(user.companyId))} · Bank on file: ${esc(user.bank.iban || '—')} (${esc(user.bank.bank || '—')})</p>
      <div class="card"><h3>My budget — Meals this month</h3><p>${money(meals)} of ${money(POLICY.mealsMonthlyCap)} policy cap used.</p></div>
      <div class="card"><h3>My expenses</h3><table><tr><th>ID</th><th>Title</th><th>Category</th><th>Amount</th><th>Status</th></tr>
      ${mine.map(e => `<tr><td><a href="/expenses/${e.id}">${e.id}</a></td><td>${esc(e.title)}</td><td>${esc(e.category)}</td><td>${money(e.amount)}</td><td>${e.status}</td></tr>`).join('')}</table>
      <p><a href="/expenses/new">+ New expense</a></p></div>${q}`));
    }

    /* ---------- profile ---------- */
    if (p === '/profile' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Profile', `<h2>My profile</h2>
      <form method="POST" action="/profile"><p>Name: <input name="name" value="${esc(user.name)}" size="34"></p><button>Save profile</button></form>
      <h3>Reimbursement bank account</h3>
      <form method="POST" action="/profile/bank"><input type="hidden" name="id" value="${user.id}">
      <p>Holder: <input name="holder" value="${esc(user.bank.holder)}" size="30"></p>
      <p>IBAN: <input name="iban" value="${esc(user.bank.iban)}" size="30"></p>
      <p>Bank: <input name="bank" value="${esc(user.bank.bank)}" size="30"></p>
      <button>Save bank details</button></form>`));
    }
    if (p === '/profile' && method === 'POST') {
      const b = await readBody(req);
      attempt('Registration & Profile');
      if (isCsrf(req)) pass('csrf-profile');
      if (b.name) {
        user.name = String(b.name);
        if (/<script|<svg|<img|onerror=|onload=/i.test(user.name)) pass('xss-profile');
      }
      return redirect(res, '/profile');
    }
    if (p === '/profile/bank' && method === 'POST') {
      const b = await readBody(req);
      attempt('Reimbursements');
      const target = users.find(x => x.id === Number(b.id)) || user;
      if (target.id !== user.id) pass('bank-tamper');
      target.bank = { holder: String(b.holder || target.bank.holder), iban: String(b.iban || ''), bank: String(b.bank || '') };
      return send(res, 200, layout(req, user, 'Bank saved', `<h2>Bank details saved</h2><p>Reimbursements for ${target.name} will now be paid to ${esc(target.bank.iban)}.</p>`));
    }

    /* ---------- expenses ---------- */
    if (p === '/expenses' && method === 'GET') {
      const list = expenses.filter(e => e.companyId === user.companyId);
      return send(res, 200, layout(req, user, 'Expenses', `<h2>Expenses at ${esc(companyName(user.companyId))}</h2>
      <table><tr><th>ID</th><th>Title</th><th>Owner</th><th>Category</th><th>Amount</th><th>Status</th></tr>
      ${list.map(e => `<tr><td><a href="/expenses/${e.id}">${e.id}</a></td><td>${esc(e.title)}</td><td>${ownerName(e.ownerId)}</td><td>${esc(e.category)}</td><td>${money(e.amount)}</td><td>${e.status}</td></tr>`).join('')}</table>
      <p><a href="/expenses/new">+ New expense</a> · <a href="/reports/export.csv">Export CSV</a></p>`));
    }
    if (p === '/expenses/new' && method === 'GET') {
      return send(res, 200, layout(req, user, 'New expense', `<h2>Submit an expense</h2>
      <form method="POST" action="/expenses"><p><input name="title" placeholder="Title" size="40"></p>
      <p>Category: <select name="category"><option>Meals</option><option>Travel</option><option>Software</option><option>Office</option></select></p>
      <p>Amount: <input name="amount" placeholder="0.00" size="12"></p>
      <p>Receipt id (optional): <input name="receiptId" size="8"> <span class="muted">your receipts: ${receipts.filter(r => r.ownerId === user.id).map(r => '#' + r.id + ' ' + esc(r.merchant) + ' ' + money(r.amount)).join(', ') || 'none'}</span></p>
      <button>Submit expense</button></form>`));
    }
    if (p === '/expenses' && method === 'POST') {
      const b = await readBody(req);
      attempt('Expense Claims'); attempt('Budgets & Policies');
      const amt = Number(b.amount) || 0;
      const ne = { id: nextExpenseId++, companyId: user.companyId, ownerId: user.id, title: String(b.title || 'Expense'), category: String(b.category || 'Office'), amount: amt, receiptId: b.receiptId ? Number(b.receiptId) : null, status: 'submitted', managerApprovedBy: null, createdMonth: 'current' };
      if (ne.receiptId) {
        const r = receipts.find(x => x.id === ne.receiptId);
        if (r && r.ownerId !== user.id) pass('receipt-swap');
      }
      expenses.push(ne);
      if (ne.category === 'Meals') {
        const total = expenses.filter(e => e.ownerId === user.id && e.category === 'Meals' && ['submitted', 'approved', 'paid'].includes(e.status)).reduce((s, e) => s + e.amount, 0);
        if (total > POLICY.mealsMonthlyCap) pass('budget-bypass');
      }
      return redirect(res, '/expenses/' + ne.id);
    }
    const mExp = p.match(/^\/expenses\/(\d+)$/);
    if (mExp && method === 'GET') {
      const e = expenses.find(x => x.id === Number(mExp[1]));
      if (!e) return send(res, 404, layout(req, user, 'Not found', '<h2>Expense not found</h2>'));
      attempt('Expense Claims');
      if (e.ownerId !== user.id && e.companyId !== user.companyId) pass('expense-idor');
      const r = e.receiptId ? receipts.find(x => x.id === e.receiptId) : null;
      return send(res, 200, layout(req, user, 'Expense #' + e.id, `<h2>${esc(e.title)}</h2>
      <table><tr><th>Field</th><th>Value</th></tr>
      <tr><td>Owner</td><td>${ownerName(e.ownerId)} (${esc(companyName(e.companyId))})</td></tr>
      <tr><td>Category</td><td>${esc(e.category)}</td></tr>
      <tr><td>Amount</td><td>${money(e.amount)}</td></tr>
      <tr><td>Status</td><td>${e.status}${e.managerApprovedBy ? ' · manager approval by ' + ownerName(e.managerApprovedBy) : ' · no manager approval recorded'}</td></tr>
      <tr><td>Receipt</td><td>${r ? '#' + r.id + ' — ' + esc(r.merchant) + ', declared ' + money(r.amount) + ', owned by ' + ownerName(r.ownerId) : 'none attached'}</td></tr></table>
      <div class="card"><h3>Edit claim</h3>
      <form method="POST" action="/expenses/${e.id}/edit"><p>Amount: <input name="amount" value="${e.amount}" size="10"></p>
      <p>Receipt id: <input name="receiptId" value="${e.receiptId || ''}" size="8"></p>
      <button>Save changes</button></form>
      <p class="muted">Note: submitted claims are locked in the UI workflow — finance verifies amounts before payment.</p></div>
      <div class="card"><h3>Actions</h3>
      <form method="POST" action="/expenses/${e.id}/approve" style="display:inline"><button>Approve</button></form>
      <form method="POST" action="/reimburse/${e.id}" style="display:inline"><button>Mark paid (Finance)</button></form></div>`));
    }
    const mEdit = p.match(/^\/expenses\/(\d+)\/edit$/);
    if (mEdit && method === 'POST') {
      const b = await readBody(req);
      attempt('Expense Claims');
      const e = expenses.find(x => x.id === Number(mEdit[1]));
      if (!e) return send(res, 404, 'not found');
      const newAmt = b.amount !== undefined && b.amount !== '' ? Number(b.amount) : e.amount;
      if (e.status !== 'draft' && newAmt !== e.amount) pass('amount-tamper');
      e.amount = newAmt;
      if (b.receiptId !== undefined && b.receiptId !== '') {
        e.receiptId = Number(b.receiptId);
        const r = receipts.find(x => x.id === e.receiptId);
        if (r && r.ownerId !== e.ownerId) pass('receipt-swap');
      }
      return redirect(res, '/expenses/' + e.id);
    }
    const mApprove = p.match(/^\/expenses\/(\d+)\/approve$/);
    if (mApprove && method === 'POST') {
      await readBody(req);
      attempt('Approvals & Workflow');
      const e = expenses.find(x => x.id === Number(mApprove[1]));
      if (!e) return send(res, 404, 'not found');
      if (e.status !== 'submitted') return send(res, 400, layout(req, user, 'Cannot approve', '<h2>Only submitted claims can be approved.</h2>'));
      if (user.id === e.ownerId) pass('self-approve');
      if (user.companyId !== e.companyId) pass('cross-approve');
      if (role === 'manager' && e.amount > POLICY.managerApproveLimit) pass('approve-limit');
      e.status = 'approved';
      e.managerApprovedBy = user.id;
      return redirect(res, '/expenses/' + e.id);
    }
    const mReimb = p.match(/^\/reimburse\/(\d+)$/);
    if (mReimb && method === 'POST') {
      await readBody(req);
      attempt('Reimbursements');
      const e = expenses.find(x => x.id === Number(mReimb[1]));
      if (!e) return send(res, 404, 'not found');
      if (e.status === 'paid') {
        payments.push({ id: nextPaymentId++, expenseId: e.id, amount: e.amount, toIban: (users.find(x => x.id === e.ownerId) || {}).bank ? users.find(x => x.id === e.ownerId).bank.iban : '', by: user.id });
        pass('double-pay');
        return send(res, 200, layout(req, user, 'Paid again', `<h2>Payment recorded</h2><p>Expense #${e.id} now has ${payments.filter(x => x.expenseId === e.id).length} payment record(s).</p>`));
      }
      if (e.status === 'submitted' && !e.managerApprovedBy) pass('skip-step');
      if (!['submitted', 'approved'].includes(e.status)) return send(res, 400, layout(req, user, 'Cannot pay', '<h2>This claim cannot be paid in its current state.</h2>'));
      payments.push({ id: nextPaymentId++, expenseId: e.id, amount: e.amount, toIban: (users.find(x => x.id === e.ownerId) || { bank: {} }).bank.iban || '', by: user.id });
      e.status = 'paid';
      return redirect(res, '/expenses/' + e.id);
    }

    /* ---------- search & reports ---------- */
    if (p === '/search' && method === 'GET') {
      const q = url.searchParams.get('q') || '';
      let results = [];
      if (q) {
        attempt('Search & Reports');
        if (injectionish(q)) {
          results = expenses.filter(e => evalWhere(`title='${q}'`, { title: e.title, category: e.category }));
          if (results.some(e => e.companyId !== user.companyId)) pass('search-sqli');
        } else {
          const ql = q.toLowerCase();
          results = expenses.filter(e => e.companyId === user.companyId && (e.title.toLowerCase().includes(ql) || e.category.toLowerCase().includes(ql)));
        }
        if (/<script|<svg|<img|onerror=|onload=/i.test(q)) pass('search-xss');
      }
      return send(res, 200, layout(req, user, 'Search', `<h2>Search expenses</h2>
      <form method="GET" action="/search"><input name="q" size="40" value="${esc(q)}"> <button>Search</button></form>
      ${q ? `<p>Results for: ${q}</p>` : ''}
      <table><tr><th>ID</th><th>Title</th><th>Owner</th><th>Company</th><th>Amount</th><th>Status</th></tr>
      ${results.map(e => `<tr><td><a href="/expenses/${e.id}">${e.id}</a></td><td>${esc(e.title)}</td><td>${ownerName(e.ownerId)}</td><td>${companyName(e.companyId)}</td><td>${money(e.amount)}</td><td>${e.status}</td></tr>`).join('')}</table>`));
    }
    if (p === '/reports/export.csv') {
      attempt('Search & Reports');
      const rows = expenses.map(e => [e.id, e.title, ownerName(e.ownerId), companyName(e.companyId), e.category, e.amount, e.status].join(','));
      if (expenses.some(e => e.companyId !== user.companyId)) pass('export-cross');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="expenses.csv"' });
      return res.end('id,title,owner,company,category,amount,status\n' + rows.join('\n'));
    }

    /* ---------- files / receipt vault ---------- */
    if (p === '/files' && method === 'GET') {
      return send(res, 200, layout(req, user, 'Receipt vault', `<h2>Receipt vault</h2>
      <table><tr><th>File</th><th>Link</th></tr>${Object.keys(receiptFiles).map(n => `<tr><td>${esc(n)}</td><td><a href="/files/${encodeURIComponent(n)}">open</a></td></tr>`).join('')}</table>
      <div class="card"><h3>Upload a receipt file</h3>
      <form method="POST" action="/files/upload"><p><input name="filename" placeholder="filename e.g. taxi.txt" size="30"></p>
      <p><textarea name="content" rows="4" cols="50" placeholder="file content"></textarea></p>
      <button>Upload</button></form></div>`));
    }
    if (p === '/files/upload' && method === 'POST') {
      const b = await readBody(req);
      attempt('Receipts & Files');
      const name = String(b.filename || 'receipt.txt');
      receiptFiles[name] = String(b.content || '');
      return redirect(res, '/files/' + encodeURIComponent(name));
    }
    const mFile = p.match(/^\/files\/(.+)$/);
    if (mFile && method === 'GET') {
      attempt('Receipts & Files');
      let name = mFile[1];
      try { name = decodeURIComponent(name); } catch (e) {}
      if (name.includes('..')) {
        const rootName = name.replace(/^(\.\.\/)+/, '');
        if (ROOT_FILES[rootName] !== undefined) { pass('traversal'); return send(res, 200, ROOT_FILES[rootName], 'text/plain'); }
        return send(res, 404, 'not found');
      }
      if (receiptFiles[name] !== undefined) {
        const isHtml = /\.html?$/i.test(name);
        if (isHtml && /<script|<svg|onerror=|onload=/i.test(receiptFiles[name])) pass('upload-html');
        return send(res, 200, receiptFiles[name], isHtml ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8');
      }
      return send(res, 404, 'not found');
    }

    /* ---------- admin ---------- */
    if (p === '/admin' && method === 'GET') {
      attempt('Admin Panel');
      if (user.role !== 'admin' && role !== 'admin') pass('admin-access');
      return send(res, 200, layout(req, user, 'Admin', `<h2>Admin — all users</h2>
      <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Bank IBAN</th></tr>
      ${users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${companyName(u.companyId)}</td><td>${esc(u.bank.iban)}</td></tr>`).join('')}</table>`));
    }

    /* ---------- mission / complete / certificate ---------- */
    if (p === '/tests' && method === 'GET') {
      const groups = FEATURES.map(f => {
        const list = TESTS.filter(t => t.feature === f);
        return `<div class="card"><h3>${esc(f)} <span class="muted">(${list.filter(t => progress.tests[t.id]).length}/${list.length} done · attempts: ${progress.attempts[f] || 0})</span></h3>
        ${list.map(t => `<div style="margin:10px 0"><b>${progress.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span class="muted">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <details><summary>Hints</summary><ol><li>${esc(t.hints[0])}</li></ol><details><summary>Stronger hint</summary><ol start="2"><li>${esc(t.hints[1])}</li></ol><details><summary>Near-answer</summary><ol start="3"><li>${esc(t.hints[2])}</li></ol></details></details></details></div>`).join('')}</div>`;
      }).join('');
      return send(res, 200, layout(req, user, 'Mission', `<h2>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p>${doneCount()}/${TESTS.length} tests complete (${pct()}%). Guidance from the Lab Coach unlocks after 3 attempts on a feature.</p>${groups}`));
    }
    if (p === '/complete/name' && method === 'POST') {
      const b = await readBody(req);
      if (b.testerName) { progress.testerName = String(b.testerName); saveProgress(); }
      return redirect(res, '/certificate');
    }
    if (p === '/complete' && method === 'GET') {
      if (!isComplete()) {
        const left = TESTS.filter(t => !progress.tests[t.id]);
        return send(res, 200, layout(req, user, 'Not yet', `<h2>Lab not complete yet</h2><p>Progress: ${doneCount()}/${TESTS.length} (${pct()}%). Remaining:</p><ul>${left.map(t => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('')}</ul><p><a href="/tests">Back to the mission</a></p>`));
      }
      const byFeature = FEATURES.map(f => { const l = TESTS.filter(t => t.feature === f); return `<tr><td>${esc(f)}</td><td>${l.length}</td></tr>`; }).join('');
      return send(res, 200, layout(req, user, 'Complete', `<h2>🎉 LAB ${LAB_NUMBER} complete — 100%</h2>
      <h3>1) Total features in this lab</h3><p>${FEATURES.length} features.</p>
      <h3>2) Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th></tr>${byFeature}</table>
      <h3>3) How testing was done — ${TESTS.length} techniques</h3><ul>${TESTS.map(t => `<li>${esc(t.name)}</li>`).join('')}</ul>
      <h3>4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
      <h3>5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
      <h3>6) Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>${TESTS.map(t => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>
      <div class="card"><h3>Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h3>
      <p style="font-size:20px;font-family:monospace"><b>${completionKey()}</b></p>
      <form method="POST" action="/complete/name"><input name="testerName" placeholder="Your name for the certificate" size="34"> <button>Get my certificate</button></form>
      <p><a href="/certificate">View certificate</a></p></div>`));
    }
    if (p === '/certificate' && method === 'GET') {
      if (!isComplete()) return redirect(res, '/complete');
      const name = progress.testerName || (user && user.name);
      const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
      return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>body{font-family:Georgia,serif;background:#f1f5f9}.card{max-width:640px;margin:50px auto;background:#fff;border:3px double #2563eb;border-radius:14px;padding:36px;text-align:center}img{height:64px}@media print{body{background:#fff}}</style></head>
      <body><div class="card"><img src="/logo.png" alt="HexaCyberLab">
      <h1>Certificate of Completion</h1><p>This certifies that</p><h2>${esc(name)}</h2>
      <p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
      <p>${esc(date)}</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>`);
    }

    return send(res, 404, layout(req, user, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (err) {
    try { send(res, 500, 'Internal error'); } catch (e) {}
  }
});

function main() {
  loadProgress();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT);
  });
}
if (require.main === module) main();
module.exports = { TESTS, FEATURES };
