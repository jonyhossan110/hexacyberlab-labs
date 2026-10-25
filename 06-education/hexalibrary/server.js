'use strict';
/*
 * HexaLibrary — LAB 56 (Category 6: Education & E-learning)
 * A deliberately vulnerable digital-library platform for security practice.
 * LOCAL USE ONLY. Zero-dependency Node.js. All data is fake seed data.
 *
 * Business: member / librarian / admin accounts, an ebook catalog with
 * licensed copy counts, borrowing with due dates, reservation queues,
 * late fees, reading history and librarian catalog management.
 *
 * Lab system: entry-key gate, per-test progress with persistence,
 * /tests mission board with graded hints, a Lab Coach chatbot whose
 * per-feature help unlocks after 3 genuine attempts, a completion
 * debrief at /complete and a printable certificate at /certificate.
 * Keys exist in this file ONLY as scattered encoded shards (see the
 * assembler far below); they are never stored or printed whole.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 56;
const LAB_NAME = 'HexaLibrary';
const PORT = 3065;
const HOST = '127.0.0.1';
const ROOT = __dirname;
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
const DOCS_DIR = path.join(ROOT, 'docs');
const BORROW_LIMIT = 3;          // policy: max 3 active loans per member
const LOAN_DAYS = 14;            // policy: 14-day loans
const MAX_EXTEND_DAYS = 7;       // policy: a due date may be extended by at most 7 days
const FEE_PER_DAY = 0.5;         // late fee per day

/* ------------------------------------------------------------------ *
 * Key shards, region 1 of 6 (entry key, pieces 1-2).                  *
 * Each shard is the base64 of a reversed slice of the key.           *
 * ------------------------------------------------------------------ */


/* ================================================================== *
 * TESTS REGISTRY — one entry per scored vulnerability test.          *
 * A test passes ONLY when the server observes the real exploit       *
 * effect inside the vulnerable flow (never a self-declared check).   *
 * ================================================================== */
const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: 'Login & Authentication',
    name: 'SQL Injection Login Bypass',
    owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'The login builds its member lookup by gluing your input straight into a query string.',
      "Try a classic tautology in the email field, e.g. something with ' OR '1'='1 in it.",
      "Submit email: ' OR '1'='1 and any password. The glued-together query matches the first member row — the admin."
    ],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; the first row in the table becomes their identity.',
    impact: 'On a real library (or any membership site) this is a full account takeover of the most privileged account — every member record, every loan, every fee is exposed or editable.',
    report: { title: 'SQL Injection in Member Login (Authentication Bypass)', severity: 'Critical',
      remediation: 'Use parameterised queries / prepared statements for the login lookup and never build SQL by string concatenation.' } },
  { id: 'auth-brute', feature: 'Login & Authentication',
    name: 'Brute Force — No Rate Limiting or Lockout',
    owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Pick one member account and keep guessing its password.',
      'Notice that nothing slows you down, warns you, or locks the account — count your failures.',
      'Fail 10 logins in a row for the same account. The 10th failure is still processed like the first — there is no throttle at all.'
    ],
    lesson: 'Without throttling or lockout, password guessing is limited only by the attacker\u2019s patience.',
    impact: 'Attackers can grind through password lists against real member accounts; one weak password quietly becomes a breach of private reading history and personal data.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High',
      remediation: 'Add progressive rate limiting and temporary lockout (or CAPTCHA) after repeated failed logins, and alert on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication',
    name: 'User Enumeration via Login & Reset Responses',
    owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Compare the error you get for an email that exists with one that does not.',
      'The forgot-password form answers differently too — one says a token was sent, the other says no such account.',
      'Probe at least 5 different emails across login / forgot-password and note which ones are confirmed as real accounts.'
    ],
    lesson: 'Different error messages for "no such account" vs "wrong password" hand attackers a verified list of real users to target.',
    impact: 'Attackers first harvest valid member emails here, then aim phishing and password guessing only at accounts that definitely exist — far higher success, far less noise.',
    report: { title: 'Account Enumeration Through Differential Auth Responses', severity: 'Medium',
      remediation: 'Return one generic message ("if the account exists…") for login failures and password-reset requests alike.' } },
  { id: 'auth-default', feature: 'Login & Authentication',
    name: 'Default Demo Account Credentials',
    owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'The platform ships with a demo member account for trying the catalog.',
      'Demo accounts usually keep the password they were born with — the same word as the account name.',
      'Log in as demo@hexalibrary.local with the password: demo.'
    ],
    lesson: 'Shipped default and demo credentials survive into production surprisingly often, and attackers try them first.',
    impact: 'A forgotten demo account is a free, legitimate-looking login — from there an attacker explores everything a real member can reach.',
    report: { title: 'Default Demo Credentials Active (demo / demo)', severity: 'High',
      remediation: 'Remove or disable demo/default accounts before launch and force unique, strong passwords on every seeded account.' } },
  { id: 'auth-reset', feature: 'Login & Authentication',
    name: 'Predictable Password Reset Token',
    owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: [
      'Request a reset for your own account and look at the shape of the token the form expects.',
      'The token is derived from the account itself — think member id arithmetic, not randomness.',
      'Tokens look like LIB-<id*271+13>. Member ids are printed all over the member directory — compute any member\u2019s token and reset their password.'
    ],
    lesson: 'A reset token must be unguessable and random; deriving it from a public identifier makes it a password-change form for strangers.',
    impact: 'Anyone who can see a member\u2019s id (the directory prints them) can reset that member\u2019s password and take over the account — no email access needed.',
    report: { title: 'Predictable Password Reset Tokens', severity: 'High',
      remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication',
    name: 'Role Cookie Tampering (hx_role)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'After logging in, inspect the cookies the app sets — one of them repeats your role.',
      'Some pages trust that cookie instead of checking your account on the server.',
      'As a plain member, set the hx_role cookie to "librarian" or "admin" and open /librarian — the gate believes the cookie, not your account.'
    ],
    lesson: 'Authorization data must live server-side; anything the client sends back — cookies included — can be edited by the client.',
    impact: 'Every member becomes a librarian or admin by editing one cookie: catalog, fees and member data are all editable by the least trusted users.',
    report: { title: 'Client-Controlled Role Cookie Trusted for Authorization', severity: 'High',
      remediation: 'Never trust client-supplied role data; resolve the role from the server-side session record on every request.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weak', feature: 'Registration & Profile',
    name: 'Weak Password Policy (1-Character Passwords Accepted)',
    owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    hints: [
      'Register a new member account and be as lazy as possible with the password.',
      'There is no minimum length, no complexity check — the form accepts almost anything.',
      'Register with a 1-character password (e.g. "a"). The account is created and works.'
    ],
    lesson: 'If the platform allows trivial passwords, its users will choose them — and brute force becomes trivial too.',
    impact: 'Real members with 1–4 character passwords fall to guessing in seconds; the platform\u2019s policy, not the user, is the root cause.',
    report: { title: 'No Minimum Password Strength at Registration', severity: 'Medium',
      remediation: 'Enforce a minimum length (≥10) and screen new passwords against known breached-password lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile',
    name: 'Mass Assignment — Role Granted at Registration',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The registration handler copies the whole submitted form into the new member record.',
      'The public form has no role field — but the record has one. What happens if you submit it anyway?',
      'POST /register with an extra field role=librarian. Your brand-new account opens with librarian powers.'
    ],
    lesson: 'Binding request bodies directly to data models lets attackers set fields the UI never offered — roles, balances, tiers.',
    impact: 'Anyone on the internet can self-register as staff. Every staff-only control behind that role (catalog, fee waivers) is then legitimately "theirs".',
    report: { title: 'Mass Assignment of Role at Registration', severity: 'Critical',
      remediation: 'Whitelist exactly the fields a registration may set (name, email, password); assign roles only through staff workflows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile',
    name: 'Stored XSS in Display Name',
    owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: [
      'Your display name is shown back on profile, member and staff pages.',
      'Names are stored and rendered without escaping — a name does not have to be text.',
      'Register or rename yourself to <script>alert(1)</script> (or an <img onerror> payload). It is stored raw and fires wherever the name is rendered.'
    ],
    lesson: 'Any field that is stored and later rendered is an XSS carrier unless output is encoded everywhere it appears.',
    impact: 'A booby-trapped member name executes in staff browsers when they open the member list — session theft and actions performed as the librarian.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High',
      remediation: 'Context-encode all user-supplied output, validate names server-side, and deploy a restrictive Content-Security-Policy.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile',
    name: 'CSRF on Profile Update',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The profile form changes your name and email with a plain POST — look for an anti-CSRF token. There is none.',
      'A state-changing POST that arrives from another site is accepted exactly like your own form.',
      'While logged in, submit the profile change with a cross-site Origin header (e.g. Origin: https://evil.example). The change is applied.'
    ],
    lesson: 'State-changing requests need an unpredictable per-session token; cookies alone cannot prove the user intended the change.',
    impact: 'A member who visits a malicious page while logged in can have their profile (and contact email) silently rewritten — the first step to account recovery abuse.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium',
      remediation: 'Require a per-session CSRF token on all state-changing forms and verify Origin/Referer as defence in depth.' } },

  /* ---------------- Catalog & Search ---------------- */
  { id: 'cat-sqli', feature: 'Catalog & Search',
    name: 'SQL Injection in Book Search',
    owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    hints: [
      'The catalog search glues your query into the same kind of string-built lookup as the login.',
      'A tautology in the search box makes the "WHERE" true for every row.',
      "Search for ' OR '1'='1 — the whole catalog comes back, including rows your search term never matched."
    ],
    lesson: 'Injection rarely lives in just one input; a codebase that concatenates SQL usually does it everywhere.',
    impact: 'Search is public-facing, so this is an unauthenticated injection point — a lever for dumping or corrupting the catalog and member data behind it.',
    report: { title: 'SQL Injection in Catalog Search', severity: 'High',
      remediation: 'Parameterise the search query and treat all user input as data, never as query structure.' } },
  { id: 'cat-xss', feature: 'Catalog & Search',
    name: 'Reflected XSS in Search',
    owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    hints: [
      'The results page repeats your search term in the heading: "Results for …".',
      'It repeats it without escaping — the term does not have to be words.',
      'Search for <script>alert(1)</script>. The payload is reflected raw into the page.'
    ],
    lesson: 'Reflected input must be encoded on output even when it "only" echoes back to the same user — the victim is whoever clicks the crafted link.',
    impact: 'Attackers send members a poisoned search link; the script runs in the victim\u2019s session on the real library domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium',
      remediation: 'HTML-encode the reflected search term and add a Content-Security-Policy header.' } },

  /* ---------------- Borrowing & Loans ---------------- */
  { id: 'loan-copies', feature: 'Borrowing & Loans',
    name: 'Borrow Beyond the Licensed Copy Limit',
    owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Each ebook has a licensed copy count; the catalog shows how many are available.',
      'Find a title with 0 copies available (someone has the only copy out) and try the borrow action anyway.',
      'POST the borrow for that title. The server never checks availability — a new loan is created past the licensed limit.'
    ],
    lesson: 'License and inventory limits are business rules that must be enforced server-side at the moment of the transaction.',
    impact: 'The library is contractually liable for every copy lent beyond its licence — a script can mint unlimited "copies" of paid content.',
    report: { title: 'Licensed Copy Limit Not Enforced at Borrowing', severity: 'High',
      remediation: 'Check available copies (licensed minus active loans) inside the borrow transaction and reject when none remain.' } },
  { id: 'loan-limit', feature: 'Borrowing & Loans',
    name: 'Member Borrowing Limit Bypass (3-Loan Cap)',
    owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    hints: [
      'Policy says a member may hold at most 3 active loans. One seeded member already has exactly 3.',
      'The cap is described in the UI, but the borrow endpoint never counts your active loans.',
      'Log in as the member with 3 active loans and borrow a 4th title. It is issued without complaint.'
    ],
    lesson: 'A rule that appears in help text but not in code does not exist; limits must be checked where the state changes.',
    impact: 'One account can drain the entire licensed catalog, denying every other member access — a denial-of-service written in business logic.',
    report: { title: 'Per-Member Borrowing Limit Not Enforced', severity: 'Medium',
      remediation: 'Count the member\u2019s active loans inside the borrow transaction and enforce the cap server-side.' } },
  { id: 'loan-due', feature: 'Borrowing & Loans',
    name: 'Due-Date Extension Tampering',
    owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Members may extend a due date — policy allows at most 7 extra days.',
      'The extension form posts the number of days to the server, and the server simply believes it.',
      'POST /loans/<id>/extend with days=365. Your loan is now due next year and late fees can never start.'
    ],
    lesson: 'Client-supplied quantities in business workflows must be validated against policy on the server.',
    impact: 'Members keep books forever and the late-fee system is meaningless — direct revenue and availability loss with no hacking tools required.',
    report: { title: 'Unbounded Due-Date Extension (Policy Cap Not Enforced)', severity: 'Medium',
      remediation: 'Validate extension length server-side against the 7-day policy and ignore client-supplied due dates.' } },
  { id: 'loan-idor', feature: 'Borrowing & Loans',
    name: 'Loan IDOR — Another Member\u2019s Loan Details',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Every loan has a page at /loans/<id> with sequential ids.',
      'The page checks that you are logged in — but never that the loan is yours.',
      'Open a loan id that belongs to another member. Their book, dates and fee state are all displayed.'
    ],
    lesson: 'Authentication ("is someone logged in?") is not authorization ("is this their object?"). Every object fetch needs an ownership check.',
    impact: 'Members can map exactly what everyone else is reading and when — private behaviour data, exposed one id at a time.',
    report: { title: 'Insecure Direct Object Reference on Loan Details', severity: 'High',
      remediation: 'Verify the requesting member owns the loan (or is staff) before serving any loan record.' } },

  /* ---------------- Downloads & Files ---------------- */
  { id: 'dl-noloan', feature: 'Downloads & Files',
    name: 'Ebook Download Without Ever Borrowing It',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Downloads live at /books/<id>/download and only ask that you are logged in.',
      'Nothing checks that you have an active (or any) loan for that title.',
      'Pick a title you have never borrowed and open its download URL. The ebook is served.'
    ],
    lesson: 'Entitlement checks belong on the resource itself; a login wall is not a paywall.',
    impact: 'The entire paid catalog is free to anyone who registers a throwaway account — the library\u2019s core product leaks by URL pattern alone.',
    report: { title: 'Missing Entitlement Check on Ebook Downloads', severity: 'High',
      remediation: 'Serve downloads only when the member holds an active loan for that title; log and alert on mismatches.' } },
  { id: 'dl-traversal', feature: 'Downloads & Files',
    name: 'Path Traversal in File Download',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'The file endpoint takes a file name and reads it from the docs folder.',
      'It joins the folder and your input without checking where the result points.',
      'Request /download?file=../server.js — the path walks out of docs/ and the application source code is returned.'
    ],
    lesson: 'User-controlled paths must be canonicalised and confined to the intended directory.',
    impact: 'Source code, configuration and any file the server can read are exposed — source disclosure turns every other flaw in this lab into a guided tour.',
    report: { title: 'Directory Traversal in File Download Endpoint', severity: 'High',
      remediation: 'Resolve the requested path, require it to stay inside the documents directory, and whitelist servable files.' } },

  /* ---------------- Reservations ---------------- */
  { id: 'res-queue', feature: 'Reservations',
    name: 'Reservation Queue Jumping',
    owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Popular titles have a reservation queue — first come, first served.',
      'The reserve handler accepts a position value from the request if one is supplied.',
      'Reserve the fully-loaned title with position=1 in the POST. You are inserted at the front, ahead of members already waiting.'
    ],
    lesson: 'Queue order is server state; if the client can dictate it, fairness controls are fictional.',
    impact: 'Bots and insiders permanently front-run ordinary members for high-demand titles — trust in the reservation system collapses.',
    report: { title: 'Client-Supplied Queue Position in Reservations', severity: 'Medium',
      remediation: 'Assign queue positions server-side in arrival order and ignore any client-supplied position.' } },
  { id: 'res-cancel', feature: 'Reservations',
    name: 'Cancel Another Member\u2019s Reservation (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Reservations are cancelled with a POST to /reservations/<id>/cancel.',
      'The handler cancels whatever id it is given — ownership is never checked.',
      'Cancel a reservation that belongs to another member. It disappears from their queue as if they had cancelled it.'
    ],
    lesson: 'State-changing endpoints need the same ownership checks as read endpoints — destructive actions most of all.',
    impact: 'Members can sabotage each other\u2019s reservations at scale, destroying queue integrity and support confidence.',
    report: { title: 'Missing Ownership Check on Reservation Cancellation', severity: 'Medium',
      remediation: 'Only the reservation\u2019s owner (or staff) may cancel it; verify ownership in the handler.' } },

  /* ---------------- Fees & Payments ---------------- */
  { id: 'fee-waive', feature: 'Fees & Payments',
    name: 'Member Waives a Late Fee (Staff Action, No Role Check)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Waiving a fee is a librarian power, done via POST /fees/<id>/waive.',
      'The endpoint exists and works — it just never asks who is calling it.',
      'As a plain member, POST to the waive endpoint for a fee. The fee is waived by someone who should never hold that power.'
    ],
    lesson: 'Every privileged endpoint must verify the caller\u2019s role server-side; hiding the button in the UI is not a control.',
    impact: 'All late fees — the library\u2019s only overdue deterrent — can be erased by the very members who owe them.',
    report: { title: 'Missing Authorization on Fee Waiver Endpoint', severity: 'High',
      remediation: 'Require a staff role for fee waivers and record who waived what in an audit log.' } },
  { id: 'fee-tamper', feature: 'Fees & Payments',
    name: 'Fee Payment Amount Tampering',
    owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    hints: [
      'Paying a fee posts an amount to /fees/<id>/pay.',
      'The server marks the fee settled for whatever amount arrived — it never compares with the amount owed.',
      'Pay a $2.00 fee with amount=0.01. The fee is recorded as fully paid.'
    ],
    lesson: 'Amounts owed live on the server; a payment must be reconciled against the server-side balance, never the client\u2019s claim.',
    impact: 'Members settle any fee for a cent. On a real platform the same pattern drains real money — prices, fees and balances must be server truth.',
    report: { title: 'Payment Amount Not Verified Against Fee Owed', severity: 'High',
      remediation: 'Ignore client-supplied settlement amounts; mark a fee paid only when a verified payment covers the full balance.' } },

  /* ---------------- Members & Reading History ---------------- */
  { id: 'hist-idor', feature: 'Members & Reading History',
    name: 'Another Member\u2019s Reading History (IDOR)',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'Reading history lives at /members/<id>/history, and member ids are listed in the directory.',
      'The page shows the history of whichever id is in the URL — yours or not.',
      'Open another member\u2019s history URL. Everything they have borrowed and returned is listed.'
    ],
    lesson: 'Reading history is sensitive personal data; object-level authorization is what stands between members and each other\u2019s private lives.',
    impact: 'Reading habits reveal health, politics, religion and finances. Exposing them is a serious privacy breach and, in many jurisdictions, a regulated one.',
    report: { title: 'Insecure Direct Object Reference on Reading History', severity: 'High',
      remediation: 'Serve history only to its owner or staff; deny by default and log cross-member access attempts.' } },

  /* ---------------- Librarian & Admin ---------------- */
  { id: 'admin-bac', feature: 'Librarian & Admin',
    name: 'Admin Panel Served Without Any Role Check',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    hints: [
      'The admin console lives at the obvious address: /admin.',
      'It renders for any logged-in account — the handler never checks a role at all.',
      'Log in as a plain member and open /admin. The full member administration table is served.'
    ],
    lesson: '"Hidden" admin URLs are not protection; every privileged page must enforce its role on the server, every time.',
    impact: 'The member administration surface (accounts, roles, fee states) is one guessable URL away from every registered member.',
    report: { title: 'Missing Authorization on Admin Panel', severity: 'Critical',
      remediation: 'Enforce an admin-role check in the /admin handler and audit access to administrative pages.' } },
  { id: 'admin-catalog', feature: 'Librarian & Admin',
    name: 'Member Edits the Catalog via the Librarian Endpoint',
    owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    hints: [
      'Librarians edit titles through POST /librarian/books/<id>/edit.',
      'The librarian PAGE checks roles — the POST endpoint behind it forgot to.',
      'As a plain member, POST a new title/copies for a book directly to the edit endpoint. The catalog changes.'
    ],
    lesson: 'Authorization must be enforced on every endpoint, not just on the page that links to it; attackers call endpoints directly.',
    impact: 'Any member can rewrite the catalog — titles, authors, licensed copy counts — vandalising the collection and the licence ledger.',
    report: { title: 'Missing Authorization on Catalog Edit Endpoint', severity: 'High',
      remediation: 'Require the librarian role inside the edit handler itself, independent of how the request arrived.' } },

  /* ---------------- Platform & API ---------------- */
  { id: 'plat-debug', feature: 'Platform & API',
    name: 'Debug Endpoint Dumps Every Member Record (incl. Passwords)',
    owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    hints: [
      'Developers leave diagnostic endpoints behind more often than anyone admits.',
      'Try the obvious one: /debug.',
      'Open /debug — it returns the full member table as JSON, passwords included, no login required.'
    ],
    lesson: 'Debug and diagnostic surface must never ship to production; if it exists, it is public.',
    impact: 'One URL hands over every member\u2019s email and password — instant full-platform compromise and credential-stuffing ammunition for other sites.',
    report: { title: 'Unauthenticated Debug Endpoint Exposing Credentials', severity: 'Critical',
      remediation: 'Remove debug endpoints from production builds; if diagnostics are essential, gate them behind admin auth and network restrictions.' } }
];

const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ------------------------------------------------------------------ *
 * Key shards, region 2 of 6 (entry key, pieces 3-4).                  *
 * ------------------------------------------------------------------ */


/* ================================================================== *
 * SEED DATA (all fake)                                                *
 * ================================================================== */
let nextUserId = 7, nextBookId = 11, nextLoanId = 8, nextResId = 4, nextFeeId = 3;
const users = [
  { id: 1, name: 'Head Librarian', email: 'admin@hexalibrary.local', pass: 'admin123', role: 'admin' },
  { id: 2, name: 'Laura Librarian', email: 'librarian@hexalibrary.local', pass: 'lib12345', role: 'librarian' },
  { id: 3, name: 'Alice Reader', email: 'alice@hexalibrary.local', pass: 'alice123', role: 'member' },
  { id: 4, name: 'Bob Borrower', email: 'bob@hexalibrary.local', pass: 'bob12345', role: 'member' },
  { id: 5, name: 'Carol Reader', email: 'carol@hexalibrary.local', pass: 'carol123', role: 'member' },
  { id: 6, name: 'Demo Member', email: 'demo@hexalibrary.local', pass: 'demo', role: 'member' }
];
const books = [
  { id: 1, title: 'The Silent Stack', author: 'M. Okafor', genre: 'Fiction', copies: 1, file: 'the-silent-stack.txt' },
  { id: 2, title: 'Dune Worlds', author: 'S. Iqbal', genre: 'Sci-Fi', copies: 3, file: 'dune-worlds.txt' },
  { id: 3, title: 'A Brief History of Maps', author: 'E. Lindqvist', genre: 'History', copies: 2, file: 'brief-history-of-maps.txt' },
  { id: 4, title: 'The Clockwork Garden', author: 'R. Alvarez', genre: 'Fantasy', copies: 2, file: null },
  { id: 5, title: 'SQL for Storytellers', author: 'J. Novak', genre: 'Technology', copies: 4, file: null },
  { id: 6, title: 'The Night Train', author: 'A. Petrov', genre: 'Mystery', copies: 2, file: null },
  { id: 7, title: 'Gardens of Glass', author: 'H. Tanaka', genre: 'Fiction', copies: 1, file: null },
  { id: 8, title: 'Paper Moons', author: 'C. Dubois', genre: 'Poetry', copies: 3, file: null },
  { id: 9, title: 'The Last Archive', author: 'N. Haddad', genre: 'Sci-Fi', copies: 2, file: null },
  { id: 10, title: 'Winter Signals', author: 'K. Berg', genre: 'Thriller', copies: 2, file: null }
];
const DAY = 86400000;
function dstr(ts) { return new Date(ts).toISOString().slice(0, 10); }
const now0 = Date.now();
let loans = [
  { id: 1, userId: 3, bookId: 2, out: dstr(now0 - 3 * DAY), due: dstr(now0 + 11 * DAY), back: null },   // Alice
  { id: 2, userId: 3, bookId: 5, out: dstr(now0 - 5 * DAY), due: dstr(now0 + 9 * DAY), back: null },    // Alice
  { id: 3, userId: 3, bookId: 8, out: dstr(now0 - 1 * DAY), due: dstr(now0 + 13 * DAY), back: null },   // Alice (3 active = at cap)
  { id: 4, userId: 4, bookId: 1, out: dstr(now0 - 6 * DAY), due: dstr(now0 + 8 * DAY), back: null },    // Bob holds the only copy of book 1
  { id: 5, userId: 5, bookId: 9, out: dstr(now0 - 2 * DAY), due: dstr(now0 + 12 * DAY), back: null },   // Carol
  { id: 6, userId: 4, bookId: 3, out: dstr(now0 - 30 * DAY), due: dstr(now0 - 16 * DAY), back: dstr(now0 - 9 * DAY) }, // Bob returned 7 days late
  { id: 7, userId: 3, bookId: 6, out: dstr(now0 - 25 * DAY), due: dstr(now0 - 11 * DAY), back: dstr(now0 - 7 * DAY) }  // Alice returned 4 days late
];
let reservations = [
  { id: 1, userId: 5, bookId: 1, pos: 1, created: dstr(now0 - 2 * DAY) },  // Carol first in queue for book 1
  { id: 2, userId: 6, bookId: 1, pos: 2, created: dstr(now0 - 1 * DAY) },  // Demo second
  { id: 3, userId: 4, bookId: 7, pos: 1, created: dstr(now0 - 1 * DAY) }   // Bob queued for book 7
];
let fees = [
  { id: 1, userId: 4, loanId: 6, amount: 3.5, status: 'unpaid', paidAmount: null },  // Bob owes $3.50
  { id: 2, userId: 3, loanId: 7, amount: 2.0, status: 'unpaid', paidAmount: null }   // Alice owes $2.00
];
const sessions = new Map();  // sid -> userId
const loginFailures = {};    // email -> failed login count (never throttled — that is the flaw)
const enumProbes = new Map(); // email -> timestamp of probe (login / forgot-password)

/* ------------------------------------------------------------------ *
 * Key shards, region 3 of 6 (entry key, pieces 5-6).                  *
 * ------------------------------------------------------------------ */


/* ================================================================== *
 * PROGRESS ENGINE + PERSISTENCE                                       *
 * ================================================================== */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (p && typeof p === 'object') progress = Object.assign(progress, p);
  }
} catch (e) { /* corrupted state file -> start fresh */ }
function saveProgress() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) { /* ignore */ }
}
function pass(id) {
  if (!TESTS.some(t => t.id === id)) return;
  if (progress.tests[id]) return; // idempotent
  progress.tests[id] = true;
  if (TESTS.every(t => progress.tests[t.id])) {
    progress.completedAt = new Date().toISOString();
    progress.keyRevealed = true;
  }
  saveProgress();
}
function attempt(feature) {
  progress.attempts[feature] = (progress.attempts[feature] || 0) + 1;
  saveProgress();
}
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function progressJSON() {
  const features = {};
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    features[f] = {
      total: ft.length,
      done: ft.filter(t => progress.tests[t.id]).length,
      attempts: progress.attempts[f] || 0
    };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() };
}

/* ------------------------------------------------------------------ *
 * Key shards, region 4 of 6 (completion key, pieces 1-2).             *
 * ------------------------------------------------------------------ */
const _c1 = ['MDdKMg==', 'UkQ0SQ=='];

/* ------------------------------------------------------------------ *
 * Key assembler. The entry key is assembled ONLY inside /unlock       *
 * verification; the completion key ONLY once the lab is complete.     *
 * ------------------------------------------------------------------ */
function _unshard(parts) {
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8')).join('').split('').reverse().join('');
}
const ENTRY_KEY_SHA256 = '6413a9ac47365b520733f14a4fe3747c53f7be48093f7929a4807a8050c5f9f2';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() {
  if (!progress.keyRevealed) return null; // the lab itself has not earned it yet
  return _unshard([].concat(_c1, _c2, _c3));
}

/* ------------------------------------------------------------------ *
 * Key shards, region 5 of 6 (completion key, pieces 3-4).             *
 * ------------------------------------------------------------------ */
const _c2 = ['LVM2Tw==', 'WUQxWA=='];

/* ================================================================== *
 * SMALL HELPERS                                                       *
 * ================================================================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe|<body[^>]*\sonload|javascript:/i;
const INJ_RE = /'\s*(or|and)\s+('[^']*'?|\d+)\s*=\s*('[^']*'?|\d+)|'\s*or\s*'[^']*'?\s*=\s*'[^']*'?|\bor\s+1\s*=\s*1\b|'\s*--|\bunion\s+(all\s+)?select\b/i;
function looksInjected(s) { return INJ_RE.test(String(s || '')); }
function parseCookies(req) {
  const out = {};
  const h = req.headers.cookie || '';
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const sid = parseCookies(req).hx_session;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
function isCrossSite(req) {
  const o = req.headers.origin || req.headers.referer || '';
  return !!o && !o.includes('127.0.0.1') && !o.includes('localhost');
}
function activeLoans(bookId) { return loans.filter(l => l.bookId === bookId && !l.back); }
function userActiveLoans(userId) { return loans.filter(l => l.userId === userId && !l.back); }
function bookById(id) { return books.find(b => b.id === id); }
function userById(id) { return users.find(u => u.id === id); }
function resetTokenFor(user) { return 'LIB-' + (user.id * 271 + 13); } // predictable — that is the flaw

function layout(req, title, body) {
  const p = progressJSON();
  const bar = Math.max(0, Math.min(100, p.pct));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title>
<style>
body{margin:0;background:#14141d;color:#222;font-family:Arial,sans-serif}
header{background:#1d1d2b;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:40px} header .t{font-weight:bold;font-size:18px}
header nav a{color:#cdd3ff;margin-right:12px;text-decoration:none;font-size:14px}
.progress{margin-left:auto;min-width:260px}
.progress .lbl{font-size:12px;color:#aab}
.progress .track{background:#33334a;border-radius:6px;height:10px;margin-top:3px}
.progress .fill{background:linear-gradient(90deg,#4f7cff,#a04dff);height:10px;border-radius:6px}
main{max-width:980px;margin:22px auto;background:#fff;border-radius:12px;padding:26px}
table{border-collapse:collapse;width:100%} th,td{border:1px solid #dde;padding:7px 9px;text-align:left;font-size:14px}
button,.btn{background:#4f46e5;color:#fff;border:0;padding:8px 16px;border-radius:7px;cursor:pointer;text-decoration:none;display:inline-block}
input,select{padding:8px;border:1px solid #ccd;border-radius:6px}
.card{border:1px solid #dde;border-radius:10px;padding:14px;margin:10px 0}
.done{color:#0a7d2c;font-weight:bold}.open{color:#888}
details{margin:4px 0} summary{cursor:pointer;color:#4f46e5}
.err{background:#ffe9e9;border:1px solid #e5a3a3;padding:10px;border-radius:8px}
.ok{background:#e9fbe9;border:1px solid #a3d5a3;padding:10px;border-radius:8px}
#chatbox{position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-size:13px;z-index:50}
#chatbox .hd{background:#1d1d2b;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;font-weight:bold}
#chatlog{height:180px;overflow:auto;padding:10px}
#chatlog div{margin:6px 0}
#chatform{display:flex;gap:6px;padding:9px;border-top:1px solid #eee}
#chatform input{flex:1}
</style></head><body>
<header><img src="/logo.png" alt="HexaCyberLab"><span class="t">LAB ${LAB_NUMBER} — ${LAB_NAME}</span>
<nav><a href="/">Catalog</a><a href="/my">My Library</a><a href="/members">Members</a><a href="/librarian">Librarian</a><a href="/admin">Admin</a><a href="/tests">Mission Board</a></nav>
<div class="progress"><div class="lbl">LAB ${LAB_NUMBER} · ${p.done}/${p.total} tests · ${p.pct}%</div><div class="track"><div class="fill" style="width:${bar}%"></div></div></div>
</header>
<main>${body}</main>
<div id="chatbox"><div class="hd">Lab Coach — HexaLibrary</div><div id="chatlog"><div><b>Coach:</b> Hi! Ask me how many tests a feature has, how your progress looks, or — after you have genuinely tried a feature at least 3 times — how to solve its tests.</div></div>
<form id="chatform"><input id="chatin" placeholder="Ask the Lab Coach…" autocomplete="off"><button>Send</button></form></div>
<script>
var cf=document.getElementById('chatform'),cl=document.getElementById('chatlog'),ci=document.getElementById('chatin');
cf.addEventListener('submit',function(ev){ev.preventDefault();var m=ci.value.trim();if(!m)return;ci.value='';
var d=document.createElement('div');d.innerHTML='<b>You:</b> ';d.appendChild(document.createTextNode(m));cl.appendChild(d);
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){
var r=document.createElement('div');r.innerHTML='<b>Coach:</b> ';r.appendChild(document.createTextNode(j.reply||'...'));cl.appendChild(r);cl.scrollTop=cl.scrollHeight;
}).catch(function(){var r=document.createElement('div');r.textContent='Coach: (connection hiccup — try again)';cl.appendChild(r);});});
</script>
</body></html>`;
}
function gatePage() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
<img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br>
<button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form></div>
<div id="chatbox" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:12px;font-family:Arial,sans-serif;font-size:13px">
<div style="background:#1d1d2b;color:#fff;padding:9px 12px;border-radius:12px 12px 0 0;font-weight:bold">Lab Coach — HexaLibrary</div>
<div id="chatlog" style="height:150px;overflow:auto;padding:10px"><div><b>Coach:</b> This lab is still locked, but I can still tell you about it — try asking who built these labs.</div></div>
<form id="chatform" style="display:flex;gap:6px;padding:9px;border-top:1px solid #eee"><input id="chatin" style="flex:1;padding:7px" placeholder="Ask the Lab Coach…" autocomplete="off"><button>Send</button></form></div>
<script>
var cf=document.getElementById('chatform'),cl=document.getElementById('chatlog'),ci=document.getElementById('chatin');
cf.addEventListener('submit',function(ev){ev.preventDefault();var m=ci.value.trim();if(!m)return;ci.value='';
var d=document.createElement('div');d.innerHTML='<b>You:</b> ';d.appendChild(document.createTextNode(m));cl.appendChild(d);
fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){
var r=document.createElement('div');r.innerHTML='<b>Coach:</b> ';r.appendChild(document.createTextNode(j.reply||'...'));cl.appendChild(r);cl.scrollTop=cl.scrollHeight;}).catch(function(){});});
</script>
</body></html>`;
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to, cookies) {
  const h = { Location: to };
  if (cookies && cookies.length) h['Set-Cookie'] = cookies;
  res.writeHead(302, h); res.end();
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve({ fields: JSON.parse(data || '{}'), raw: data }); return; }
        catch (e) { resolve({ fields: {}, raw: data, jsonError: true }); return; }
      }
      const fields = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
        const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
        fields[k] = v;
      }
      resolve({ fields, raw: data });
    });
    req.on('error', () => resolve({ fields: {}, raw: '' }));
  });
}

/* ------------------------------------------------------------------ *
 * Key shards, region 6 of 6 (completion key, pieces 5-6).             *
 * ------------------------------------------------------------------ */
const _c3 = ['TC03NQ==', 'TC1YSA=='];

/* ================================================================== *
 * PAGE RENDERERS                                                      *
 * ================================================================== */
function userBar(user) {
  if (!user) return `<p><a href="/login">Log in</a> · <a href="/register">Register</a></p>`;
  return `<p>Signed in as <b>${esc(user.name)}</b> (${esc(user.email)}) — role: <b>${esc(user.role)}</b> · <a href="/logout">Log out</a></p>`;
}
function homePage(req, user) {
  const rows = books.map(b => {
    const avail = b.copies - activeLoans(b.id).length;
    return `<tr><td><a href="/books/${b.id}">${esc(b.title)}</a></td><td>${esc(b.author)}</td><td>${esc(b.genre)}</td><td>${b.copies}</td><td>${avail}</td></tr>`;
  }).join('');
  return layout(req, 'Catalog', `${userBar(user)}
<h2>Digital Library Catalog</h2>
<p>Browse the collection. Policy: up to <b>${BORROW_LIMIT} active loans</b> per member, ${LOAN_DAYS}-day loans, due dates extendable by at most ${MAX_EXTEND_DAYS} days, late fee $${FEE_PER_DAY.toFixed(2)}/day.</p>
<form method="GET" action="/search"><input name="q" placeholder="Search title or author…" size="34"> <button>Search</button></form>
<table><tr><th>Title</th><th>Author</th><th>Genre</th><th>Licensed copies</th><th>Available</th></tr>${rows}</table>`);
}
function searchPage(req, user, q, results, injected) {
  const rows = results.map(b => `<tr><td><a href="/books/${b.id}">${esc(b.title)}</a></td><td>${esc(b.author)}</td><td>${esc(b.genre)}</td></tr>`).join('');
  // NOTE (the flaw): q is reflected into the heading WITHOUT escaping -> cat-xss.
  return layout(req, 'Search', `${userBar(user)}
<h2>Results for ${q}</h2>
${injected ? '<p><i>(the catalog query matched every row)</i></p>' : ''}
<table><tr><th>Title</th><th>Author</th><th>Genre</th></tr>${rows || '<tr><td colspan="3">No matches.</td></tr>'}</table>
<p><a href="/">Back to catalog</a></p>`);
}
function bookPage(req, user, b) {
  const act = activeLoans(b.id);
  const avail = b.copies - act.length;
  const queue = reservations.filter(r => r.bookId === b.id).sort((x, y) => x.pos - y.pos);
  const qrows = queue.map(r => {
    const u = userById(r.userId);
    return `<tr><td>${r.pos}</td><td>${u ? esc(u.name) : '?'}</td><td>${esc(r.created)}</td><td>${user && (user.id === r.userId) ? `<form method="POST" action="/reservations/${r.id}/cancel" style="display:inline"><button>Cancel mine</button></form>` : ''}</td></tr>`;
  }).join('');
  return layout(req, b.title, `${userBar(user)}
<h2>${esc(b.title)}</h2>
<p>by ${esc(b.author)} · ${esc(b.genre)} · Licensed copies: <b>${b.copies}</b> · Available now: <b>${avail}</b></p>
${user ? `<form method="POST" action="/books/${b.id}/borrow"><button>Borrow this ebook</button></form>
<p><a href="/books/${b.id}/download">Download the ebook file</a>${b.file ? ` · <a href="/download?file=${encodeURIComponent(b.file)}">Direct file download</a>` : ''}</p>` : '<p><a href="/login">Log in</a> to borrow.</p>'}
<h3>Reservation queue</h3>
<table><tr><th>Position</th><th>Member</th><th>Reserved on</th><th></th></tr>${qrows || '<tr><td colspan="4">Nobody is waiting.</td></tr>'}</table>
${user ? `<form method="POST" action="/books/${b.id}/reserve"><button>Reserve this title</button></form>` : ''}`);
}
function loginPage(req, msg) {
  return layout(req, 'Log in', `<h2>Member Log In</h2>
${msg ? `<div class="err">${esc(msg)}</div>` : ''}
<form method="POST" action="/login">
<p>Email <input name="email" size="30"></p>
<p>Password <input name="password" type="password" size="30"></p>
<button>Log in</button></form>
<p><a href="/forgot">Forgot your password?</a> · New here? <a href="/register">Register</a></p>
<p><i>Seed accounts: admin@hexalibrary.local / admin123 · librarian@hexalibrary.local / lib12345 · alice@hexalibrary.local / alice123 · bob@hexalibrary.local / bob12345 · carol@hexalibrary.local / carol123 · demo@hexalibrary.local / demo</i></p>`);
}
function registerPage(req, msg) {
  return layout(req, 'Register', `<h2>Register a Member Account</h2>
${msg ? `<div class="err">${esc(msg)}</div>` : ''}
<form method="POST" action="/register">
<p>Display name <input name="name" size="30"></p>
<p>Email <input name="email" size="30"></p>
<p>Password <input name="password" type="password" size="30"></p>
<button>Create account</button></form>`);
}
function forgotPage(req, msg) {
  return layout(req, 'Forgot password', `<h2>Forgot Password</h2>
${msg ? `<div class="ok">${esc(msg)}</div>` : ''}
<form method="POST" action="/forgot"><p>Email <input name="email" size="30"></p><button>Send reset token</button></form>
<h3>Use a reset token</h3>
<form method="POST" action="/reset">
<p>Email <input name="email" size="30"></p>
<p>Token <input name="token" size="30"></p>
<p>New password <input name="newpass" type="password" size="30"></p>
<button>Reset password</button></form>`);
}
function myPage(req, user) {
  const myLoans = loans.filter(l => l.userId === user.id);
  const loanRows = myLoans.map(l => {
    const b = bookById(l.bookId);
    return `<tr><td>${l.id}</td><td>${b ? esc(b.title) : '?'}</td><td>${esc(l.out)}</td><td>${esc(l.due)}</td><td>${l.back ? 'returned ' + esc(l.back) : 'active'}</td>
<td><a href="/loans/${l.id}">Details</a>${!l.back ? ` <form method="POST" action="/loans/${l.id}/extend" style="display:inline"><input name="days" size="3" value="7"> <button>Extend</button></form> <form method="POST" action="/loans/${l.id}/return" style="display:inline"><button>Return</button></form>` : ''}</td></tr>`;
  }).join('');
  const myFees = fees.filter(f => f.userId === user.id);
  const feeRows = myFees.map(f => `<tr><td>${f.id}</td><td>loan ${f.loanId}</td><td>$${f.amount.toFixed(2)}</td><td>${esc(f.status)}${f.paidAmount != null ? ' (paid $' + Number(f.paidAmount).toFixed(2) + ')' : ''}</td>
<td>${f.status === 'unpaid' ? `<form method="POST" action="/fees/${f.id}/pay" style="display:inline"><input name="amount" size="5" value="${f.amount.toFixed(2)}"> <button>Pay</button></form> <form method="POST" action="/fees/${f.id}/waive" style="display:inline"><button>Waive (staff)</button></form>` : ''}</td></tr>`).join('');
  const myRes = reservations.filter(r => r.userId === user.id);
  const resRows = myRes.map(r => {
    const b = bookById(r.bookId);
    return `<tr><td>${r.id}</td><td>${b ? esc(b.title) : '?'}</td><td>${r.pos}</td><td><form method="POST" action="/reservations/${r.id}/cancel"><button>Cancel</button></form></td></tr>`;
  }).join('');
  return layout(req, 'My Library', `${userBar(user)}
<h2>My Library</h2>
<h3>My profile</h3>
<form method="POST" action="/profile"><p>Display name <input name="name" value="${esc(user.name)}" size="30"> <button>Update profile</button></p></form>
<h3>My loans (${userActiveLoans(user.id).length} active of max ${BORROW_LIMIT})</h3>
<table><tr><th>#</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Actions</th></tr>${loanRows || '<tr><td colspan="6">No loans yet.</td></tr>'}</table>
<h3>My late fees</h3>
<table><tr><th>#</th><th>Loan</th><th>Amount</th><th>Status</th><th>Actions</th></tr>${feeRows || '<tr><td colspan="5">No fees. Nice.</td></tr>'}</table>
<h3>My reservations</h3>
<table><tr><th>#</th><th>Book</th><th>Queue position</th><th></th></tr>${resRows || '<tr><td colspan="4">No reservations.</td></tr>'}</table>`);
}
function loanPage(req, user, loan) {
  const b = bookById(loan.bookId);
  const owner = userById(loan.userId);
  return layout(req, 'Loan ' + loan.id, `${userBar(user)}
<h2>Loan #${loan.id}</h2>
<table>
<tr><th>Book</th><td>${b ? esc(b.title) : '?'}</td></tr>
<tr><th>Member</th><td>${owner ? esc(owner.name) : '?'} (${owner ? esc(owner.email) : ''})</td></tr>
<tr><th>Borrowed</th><td>${esc(loan.out)}</td></tr>
<tr><th>Due</th><td>${esc(loan.due)}</td></tr>
<tr><th>Status</th><td>${loan.back ? 'returned ' + esc(loan.back) : 'active'}</td></tr>
</table>
<p><a href="/my">Back to my library</a></p>`);
}
function membersPage(req, user) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${userActiveLoans(u.id).length}</td><td><a href="/members/${u.id}/history">Reading history</a></td></tr>`).join('');
  // NOTE (the flaw): names rendered RAW (stored XSS fires here), emails exposed to every member.
  return layout(req, 'Members', `${userBar(user)}
<h2>Member Directory</h2>
<table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Active loans</th><th></th></tr>${rows}</table>`);
}
function historyPage(req, user, member) {
  const rows = loans.filter(l => l.userId === member.id).map(l => {
    const b = bookById(l.bookId);
    return `<tr><td>${b ? esc(b.title) : '?'}</td><td>${esc(l.out)}</td><td>${esc(l.due)}</td><td>${l.back ? 'returned ' + esc(l.back) : 'still out'}</td></tr>`;
  }).join('');
  return layout(req, 'Reading history', `${userBar(user)}
<h2>Reading History — ${member.name}</h2>
<table><tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Status</th></tr>${rows || '<tr><td colspan="4">No reading history.</td></tr>'}</table>`);
}
function librarianPage(req, user) {
  const rows = books.map(b => `<tr><td>${b.id}</td><td>${esc(b.title)}</td><td>${esc(b.author)}</td><td>${b.copies}</td>
<td><form method="POST" action="/librarian/books/${b.id}/edit"><input name="title" value="${esc(b.title)}" size="22"> <input name="copies" size="3" value="${b.copies}"> <button>Save</button></form></td></tr>`).join('');
  return layout(req, 'Librarian', `${userBar(user)}
<h2>Librarian — Catalog Management</h2>
<table><tr><th>#</th><th>Title</th><th>Author</th><th>Copies</th><th>Edit</th></tr>${rows}</table>`);
}
function adminPage(req, user) {
  const rows = users.map(u => {
    const owed = fees.filter(f => f.userId === u.id && f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);
    return `<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${userActiveLoans(u.id).length}</td><td>$${owed.toFixed(2)}</td></tr>`;
  }).join('');
  return layout(req, 'Admin', `${userBar(user)}
<h2>Admin Console — All Members</h2>
<table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Active loans</th><th>Unpaid fees</th></tr>${rows}</table>`);
}
function testsPage(req, user) {
  const p = progressJSON();
  let html = `${userBar(user)}<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>${p.done}/${p.total} tests complete · ${p.pct}% · Attempts are counted per feature; the Lab Coach unlocks step-by-step help for a feature after <b>3 genuine attempts</b>.</p>`;
  for (const f of FEATURES) {
    const ft = TESTS.filter(t => t.feature === f);
    html += `<h3>${esc(f)} <small>(${ft.filter(t => progress.tests[t.id]).length}/${ft.length} done · ${p.features[f].attempts} attempt(s))</small></h3>`;
    for (const t of ft) {
      const done = !!progress.tests[t.id];
      html += `<div class="card"><b>${esc(t.name)}</b> — <i>${esc(t.owasp)}</i> · ${esc(t.difficulty)} · ${done ? '<span class="done">✓ DONE</span>' : '<span class="open">○ OPEN</span>'}
<details><summary>Hint 1</summary><p>${esc(t.hints[0])}</p><details><summary>Hint 2</summary><p>${esc(t.hints[1])}</p><details><summary>Hint 3 (near-answer)</summary><p>${esc(t.hints[2])}</p></details></details></details></div>`;
    }
  }
  return layout(req, 'Mission Board', html);
}
function completePage(req, user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  const p = progressJSON();
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]);
    return layout(req, 'Not yet complete', `${userBar(user)}
<h2>Completion Debrief — not yet</h2>
<p>You are at <b>${p.done}/${p.total} (${p.pct}%)</b>. The debrief, the completion key and the certificate unlock at 100%.</p>
<h3>Still open (${left.length})</h3><ul>${left.map(t => `<li>${esc(t.name)} — <i>${esc(t.feature)}</i></li>`).join('')}</ul>
<p><a href="/tests">Back to the Mission Board</a></p>`);
  }
  const byFeature = FEATURES.map(f => {
    const ft = TESTS.filter(t => t.feature === f);
    return `<tr><td>${esc(f)}</td><td>${ft.length}</td><td>${ft.map(t => esc(t.name)).join('<br>')}</td></tr>`;
  }).join('');
  const key = completionKey();
  return layout(req, 'Complete', `${userBar(user)}
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}: COMPLETE</h2>
<div class="ok">100% — all ${p.total} tests passed${progress.completedAt ? ' on ' + esc(progress.completedAt.slice(0, 10)) : ''}.</div>
<h3>1 · Features in this lab</h3><p><b>${FEATURES.length}</b> features carried scored tests.</p>
<h3>2 · Vulnerabilities per feature</h3><table><tr><th>Feature</th><th>Tests</th><th>Names</th></tr>${byFeature}</table>
<h3>3 · How the testing was done</h3><p>${p.total} techniques were executed and verified server-side:</p><ul>${TESTS.map(t => `<li>${esc(t.name)} (<i>${esc(t.feature)}</i>)</li>`).join('')}</ul>
<h3>4 · What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
<h3>5 · What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
<h3>6 · Writing it in a real report</h3><table><tr><th>Finding</th><th>Severity</th><th>Remediation</th></tr>${TESTS.map(t => `<tr><td>${esc(t.report.title)}</td><td>${esc(t.report.severity)}</td><td>${esc(t.report.remediation)}</td></tr>`).join('')}</table>
<h3>Your completion key for the next lab</h3>
<p style="font-size:20px"><code>${esc(key || '')}</code></p>
<p>Paste it into Lab ${LAB_NUMBER + 1} to unlock it.</p>
<h3>Certificate</h3>
<form method="POST" action="/tester-name"><p>Your name for the certificate: <input name="name" value="${esc(progress.testerName)}" size="30"> <button>Save name</button></p></form>
<p><a class="btn" href="/certificate">View my certificate</a></p>`);
}
function certificatePage(req, user) { if (!user) user = { name: 'Tester', email: '', id: 0 };
  if (!isComplete()) return null;
  const name = progress.testerName || (user ? user.name : 'Guest Tester');
  const date = progress.completedAt ? progress.completedAt.slice(0, 10) : dstr(Date.now());
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{background:#e9e9f2;font-family:Georgia,serif}.cert{max-width:760px;margin:40px auto;background:#fff;border:3px double #4f46e5;border-radius:8px;padding:44px;text-align:center}img{height:74px}h1{margin:8px 0}.name{font-size:30px;font-weight:bold;margin:14px 0}@media print{body{background:#fff}.cert{border:2px solid #333}}</style></head>
<body><div class="cert">
<img src="/logo.png" alt="HexaCyberLab logo">
<h1>Certificate of Completion</h1>
<p>This certifies that</p>
<div class="name">${esc(name)}</div>
<p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${esc(date)}</p>
<p style="margin-top:26px"><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p>
</div></body></html>`;
}

/* ================================================================== *
 * LAB COACH CHATBOT (rule-based, in-lab, zero external calls)         *
 * ================================================================== */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'authentication', 'password', 'brute', 'reset token', 'cookie', 'sign in', 'signin']],
  ['Registration & Profile', ['registration', 'register', 'profile', 'mass assignment', 'sign up', 'signup']],
  ['Catalog & Search', ['catalog', 'search']],
  ['Borrowing & Loans', ['borrow', 'loan', 'due date', 'copies']],
  ['Downloads & Files', ['download', 'file', 'ebook file', 'traversal']],
  ['Reservations', ['reservation', 'reserve', 'queue']],
  ['Fees & Payments', ['fee', 'payment', 'pay', 'waive']],
  ['Members & Reading History', ['history', 'member', 'reading']],
  ['Librarian & Admin', ['librarian', 'admin', 'catalog edit']],
  ['Platform & API', ['platform', 'debug', 'api']]
];
function matchFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) {
    if (msg.includes(f.toLowerCase())) return f;
  }
  for (const [f, keys] of FEATURE_KEYS) {
    for (const k of keys) { if (msg.includes(k)) return f; }
  }
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const p = progressJSON();
  // Attribution — always available, locked or not.
  if (/who (built|made|created|builds)|founder|who is (the )?(author|creator)|your creator/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  // Completion key — secrecy until 100%.
  if (/key|unlock|next lab/.test(msg)) {
    if (isComplete() && progress.keyRevealed) {
      return 'Congratulations — LAB ' + LAB_NUMBER + ' is 100% complete, so I can share it now. The completion key is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.';
    }
    return 'I don\u2019t have the completion key yet — it is only revealed to me when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and ask me again.';
  }
  const feature = matchFeature(msg);
  const wantsHow = /how|help|hint|solve|guide|step|do i|approach|attack/.test(msg);
  // How-to lock: help only after >=3 genuine attempts on the feature (or its tests are done).
  if (wantsHow && feature) {
    const ft = TESTS.filter(t => t.feature === feature);
    const n = progress.attempts[feature] || 0;
    const passedCount = ft.filter(t => progress.tests[t.id]).length;
    if (n >= 3 || passedCount === ft.length) {
      const lines = ft.map(t => {
        const st = progress.tests[t.id] ? 'DONE' : 'OPEN';
        return '• ' + t.name + ' [' + st + '] — step by step: ' + t.hints[2];
      });
      return 'You have tried ' + feature + ' ' + n + ' time(s), so here is the full guidance:\n' + lines.join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  if (wantsHow && !feature) {
    return 'Tell me which feature you mean — one of: ' + FEATURES.join(', ') + '. Remember the rule: I unlock step-by-step help for a feature after you have genuinely tried it at least 3 times. The /tests page shows your attempt counts.';
  }
  // Counts / feature maps are public.
  if (/how many|count|list|which (tests|features|vulnerabilities)|what tests|what features/.test(msg)) {
    if (feature) {
      const ft = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + ft.length + ' test(s): ' + ft.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. You have tried this feature ' + (progress.attempts[feature] || 0) + ' time(s).';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' +
      FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '.';
  }
  if (/progress|score|percent|how am i|status/.test(msg)) {
    const nxt = TESTS.find(t => !progress.tests[t.id]);
    return 'You are at ' + p.pct + '% — ' + p.done + '/' + p.total + ' tests done.' +
      (nxt ? ' Next open test: "' + nxt.name + '" in ' + nxt.feature + ' (you have tried that feature ' + (progress.attempts[nxt.feature] || 0) + ' time(s)).' : ' Everything is complete — see /complete for your debrief and key.');
  }
  if (feature) {
    const ft = TESTS.filter(t => t.feature === feature);
    return feature + ': ' + ft.map(t => t.name + (progress.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far: ' + (progress.attempts[feature] || 0) + '. Ask me "how do I solve ' + feature + '" once you have tried it at least 3 times and I will walk you through it.';
  }
  if (/^(hi|hello|hey|yo)\b/.test(msg)) {
    return 'Hello! This is LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a deliberately vulnerable digital library. You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). The map is on /tests; ask me about any feature, and after 3 genuine tries on a feature I will guide you step by step.';
  }
  if (/certificate/.test(msg)) {
    return isComplete() ? 'Your certificate is ready at /certificate — set your name on /complete first if you like.' : 'The certificate unlocks at 100%. You are at ' + p.pct + '% — keep going via /tests.';
  }
  return 'I can tell you the map (test names and counts per feature), your progress, and — after 3 genuine attempts on a feature — step-by-step guidance for it. Try: "how many tests in Borrowing & Loans", "my progress", or "how do I solve Fees & Payments". I never invent vulnerabilities that are not on the /tests board.';
}

/* ================================================================== *
 * ROUTER                                                              *
 * ================================================================== */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const pathName = u.pathname;
    const method = req.method;

    /* --- always-available endpoints (also while locked) --- */
    if (pathName === '/logo.png') {
      try {
        const data = fs.readFileSync(path.join(ROOT, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data);
      } catch (e) { return send(res, 404, 'not found', 'text/plain'); }
    }
    if (pathName === '/api/progress' && method === 'GET') {
      return send(res, 200, JSON.stringify(progressJSON(), null, 2), 'application/json');
    }
    if (pathName === '/api/chat' && method === 'POST') {
      const { fields, jsonError } = await readBody(req);
      if (jsonError || !fields || typeof fields.message !== 'string') {
        return send(res, 200, JSON.stringify({ reply: 'I could not read that message — send me plain text and I will do my best. Ask about a feature, your progress, or who built these labs.' }), 'application/json');
      }
      return send(res, 200, JSON.stringify({ reply: chatReply(fields.message) }), 'application/json');
    }
    if (pathName === '/unlock' && method === 'POST') {
      const { fields } = await readBody(req);
      const given = String(fields.key || '');
      if (!entryKeyMatches(given)) return send(res, 403, '403 — that key does not unlock this lab.', 'text/plain');
      progress.unlocked = true; saveProgress();
      return redirect(res, '/');
    }

    /* --- lock gate --- */
    if (!progress.unlocked) return send(res, 200, gatePage());

    const user = currentUser(req);

    /* --- debug exposure (intentional flaw: works for anyone) --- */
    if (pathName === '/debug' && method === 'GET') {
      attempt('Platform & API');
      pass('plat-debug');
      return send(res, 200, JSON.stringify({ debug: true, users, loans, fees }, null, 2), 'application/json');
    }

    /* --- public pages --- */
    if (pathName === '/' && method === 'GET') return send(res, 200, homePage(req, user));
    if (pathName === '/search' && method === 'GET') {
      attempt('Catalog & Search');
      const q = u.searchParams.get('q') || '';
      let results, injected = false;
      if (looksInjected(q)) { results = books.slice(); injected = true; pass('cat-sqli'); }
      else {
        const needle = q.toLowerCase();
        results = books.filter(b => b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle));
      }
      if (XSS_RE.test(q)) pass('cat-xss');
      return send(res, 200, searchPage(req, user, q, results, injected));
    }
    const bookMatch = pathName.match(/^\/books\/(\d+)$/);
    if (bookMatch && method === 'GET') {
      const b = bookById(Number(bookMatch[1]));
      if (!b) return send(res, 404, 'book not found', 'text/plain');
      return send(res, 200, bookPage(req, user, b));
    }

    /* --- auth flows --- */
    if (pathName === '/login' && method === 'GET') return send(res, 200, loginPage(req, ''));
    if (pathName === '/login' && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Login & Authentication');
      const email = String(fields.email || ''), passw = String(fields.password || '');
      // enumeration probe tracking
      const known = users.some(x => x.email === email);
      enumProbes.set(email, Date.now());
      const recent = [...enumProbes.entries()].filter(([, ts]) => Date.now() - ts < 10 * 60 * 1000);
      const distinct = new Set(recent.map(([e]) => e));
      if (distinct.size >= 5 && [...distinct].some(e => !users.some(x => x.email === e))) pass('auth-enum');
      // vulnerable string-built query simulation:
      //   SELECT * FROM members WHERE email = '<email>' AND password = '<passw>'
      let found = null;
      if (looksInjected(email) || looksInjected(passw)) found = users[0]; // injection returns the first row (admin)
      else found = users.find(x => x.email === email && x.pass === passw) || null;
      if (!found) {
        loginFailures[email] = (loginFailures[email] || 0) + 1;
        if (loginFailures[email] >= 10) pass('auth-brute');
        const msg = !known ? 'No member account found for that email.' : 'Incorrect password for this account.';
        return send(res, 200, loginPage(req, msg));
      }
      if (looksInjected(email) || looksInjected(passw)) pass('auth-sqli');
      if (found.email === 'demo@hexalibrary.local' && passw === 'demo') pass('auth-default');
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, found.id);
      return redirect(res, '/', ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + found.role + '; Path=/']);
    }
    if (pathName === '/logout' && method === 'GET') {
      const sid = parseCookies(req).hx_session;
      if (sid) sessions.delete(sid);
      return redirect(res, '/', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
    }
    if (pathName === '/register' && method === 'GET') return send(res, 200, registerPage(req, ''));
    if (pathName === '/register' && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Registration & Profile');
      const name = String(fields.name || ''), email = String(fields.email || ''), passw = String(fields.password || '');
      if (!name || !email || !passw) return send(res, 200, registerPage(req, 'All fields are required.'));
      if (users.some(x => x.email === email)) return send(res, 200, registerPage(req, 'That email is already registered.'));
      // NOTE (the flaws): whole form is bound to the record (mass assignment),
      // no password policy, and the name is stored raw (stored XSS).
      const assignedId = nextUserId++;
      const nu = { id: assignedId, name, email, pass: passw, role: 'member' };
      for (const k of Object.keys(fields)) {
        if (k !== 'name' && k !== 'email' && k !== 'password' && k !== 'id') nu[k] = fields[k];
      }
      nu.id = assignedId; // the record id itself always stays server-assigned
      users.push(nu);
      if (passw.length < 8) pass('reg-weak');
      if (nu.role && nu.role !== 'member') pass('reg-mass');
      if (XSS_RE.test(name)) pass('reg-xss');
      const sid = crypto.randomBytes(16).toString('hex');
      sessions.set(sid, nu.id);
      return redirect(res, '/my', ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/']);
    }
    if (pathName === '/forgot' && method === 'GET') return send(res, 200, forgotPage(req, ''));
    if (pathName === '/forgot' && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Login & Authentication');
      const email = String(fields.email || '');
      enumProbes.set(email, Date.now());
      const recent = [...enumProbes.entries()].filter(([, ts]) => Date.now() - ts < 10 * 60 * 1000);
      const distinct = new Set(recent.map(([e]) => e));
      if (distinct.size >= 5 && [...distinct].some(e => !users.some(x => x.email === e))) pass('auth-enum');
      const exists = users.some(x => x.email === email);
      return send(res, 200, forgotPage(req, exists ? 'A reset token has been sent to that email.' : 'No member account exists for that email.'));
    }
    if (pathName === '/reset' && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Login & Authentication');
      const target = users.find(x => x.email === String(fields.email || ''));
      if (target && String(fields.token || '') === resetTokenFor(target)) {
        target.pass = String(fields.newpass || 'changed123');
        pass('auth-reset');
        return send(res, 200, loginPage(req, ''));
      }
      return send(res, 200, forgotPage(req, 'That token was not accepted.'));
    }

    /* --- everything below needs a login --- */
    if (!user && pathName !== '/complete' && pathName !== '/complete/name' && pathName !== '/certificate') return redirect(res, '/login');

    if (pathName === '/profile' && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Registration & Profile');
      if (fields.name) {
        user.name = String(fields.name);
        if (XSS_RE.test(user.name)) pass('reg-xss');
        if (isCrossSite(req)) pass('reg-csrf');
      }
      return redirect(res, '/my');
    }
    if (pathName === '/my' && method === 'GET') return send(res, 200, myPage(req, user));

    const loanView = pathName.match(/^\/loans\/(\d+)$/);
    if (loanView && method === 'GET') {
      attempt('Borrowing & Loans');
      const loan = loans.find(l => l.id === Number(loanView[1]));
      if (!loan) return send(res, 404, 'loan not found', 'text/plain');
      if (loan.userId !== user.id) pass('loan-idor');
      return send(res, 200, loanPage(req, user, loan));
    }
    const loanExtend = pathName.match(/^\/loans\/(\d+)\/extend$/);
    if (loanExtend && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Borrowing & Loans');
      const loan = loans.find(l => l.id === Number(loanExtend[1]));
      if (loan && !loan.back) {
        const days = parseInt(fields.days, 10) || 0;
        const newDue = new Date(new Date(loan.due + 'T00:00:00Z').getTime() + days * DAY);
        loan.due = dstr(newDue.getTime());
        if (days > MAX_EXTEND_DAYS) pass('loan-due');
      }
      return redirect(res, '/my');
    }
    const loanReturn = pathName.match(/^\/loans\/(\d+)\/return$/);
    if (loanReturn && method === 'POST') {
      await readBody(req);
      attempt('Borrowing & Loans');
      const loan = loans.find(l => l.id === Number(loanReturn[1]));
      if (loan && !loan.back) {
        loan.back = dstr(Date.now());
        const lateDays = Math.floor((new Date(loan.back + 'T00:00:00Z') - new Date(loan.due + 'T00:00:00Z')) / DAY);
        if (lateDays > 0) fees.push({ id: nextFeeId++, userId: loan.userId, loanId: loan.id, amount: lateDays * FEE_PER_DAY, status: 'unpaid', paidAmount: null });
      }
      return redirect(res, '/my');
    }

    const borrowMatch = pathName.match(/^\/books\/(\d+)\/borrow$/);
    if (borrowMatch && method === 'POST') {
      await readBody(req);
      attempt('Borrowing & Loans');
      const b = bookById(Number(borrowMatch[1]));
      if (b) {
        // NOTE (the flaws): neither the licensed-copy count nor the member's
        // 3-loan cap is checked here — the loan is simply issued.
        const overCopies = activeLoans(b.id).length >= b.copies;
        const overLimit = userActiveLoans(user.id).length >= BORROW_LIMIT;
        loans.push({ id: nextLoanId++, userId: user.id, bookId: b.id, out: dstr(Date.now()), due: dstr(Date.now() + LOAN_DAYS * DAY), back: null });
        if (overCopies) pass('loan-copies');
        if (overLimit) pass('loan-limit');
      }
      return redirect(res, '/my');
    }
    const dlMatch = pathName.match(/^\/books\/(\d+)\/download$/);
    if (dlMatch && method === 'GET') {
      attempt('Downloads & Files');
      const b = bookById(Number(dlMatch[1]));
      if (!b) return send(res, 404, 'book not found', 'text/plain');
      // NOTE (the flaw): any logged-in member may download; no loan is required.
      const hasLoan = loans.some(l => l.userId === user.id && l.bookId === b.id);
      if (!hasLoan) pass('dl-noloan');
      return send(res, 200, 'EBOOK FILE: ' + b.title + ' by ' + b.author + '\n(Simulated licensed ebook content for LAB 56 practice.)\n', 'text/plain');
    }
    if (pathName === '/download' && method === 'GET') {
      attempt('Downloads & Files');
      const file = u.searchParams.get('file') || '';
      // NOTE (the flaw): the file name is joined to the docs folder unchecked.
      const target = path.join(DOCS_DIR, file);
      try {
        const data = fs.readFileSync(target);
        if (!path.resolve(target).startsWith(path.resolve(DOCS_DIR))) pass('dl-traversal');
        return send(res, 200, data, 'text/plain');
      } catch (e) { return send(res, 404, 'file not found', 'text/plain'); }
    }
    const reserveMatch = pathName.match(/^\/books\/(\d+)\/reserve$/);
    if (reserveMatch && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Reservations');
      const b = bookById(Number(reserveMatch[1]));
      if (b) {
        const queue = reservations.filter(r => r.bookId === b.id);
        const supplied = parseInt(fields.position, 10);
        let pos;
        if (!isNaN(supplied)) {
          // NOTE (the flaw): the client may dictate its queue position.
          pos = supplied;
          const jumped = queue.some(r => r.pos >= pos);
          reservations.push({ id: nextResId++, userId: user.id, bookId: b.id, pos, created: dstr(Date.now()) });
          if (jumped) pass('res-queue');
        } else {
          pos = queue.length ? Math.max(...queue.map(r => r.pos)) + 1 : 1;
          reservations.push({ id: nextResId++, userId: user.id, bookId: b.id, pos, created: dstr(Date.now()) });
        }
      }
      return redirect(res, '/books/' + reserveMatch[1]);
    }
    const resCancel = pathName.match(/^\/reservations\/(\d+)\/cancel$/);
    if (resCancel && method === 'POST') {
      await readBody(req);
      attempt('Reservations');
      const idx = reservations.findIndex(r => r.id === Number(resCancel[1]));
      if (idx >= 0) {
        // NOTE (the flaw): ownership is never checked before cancelling.
        if (reservations[idx].userId !== user.id) pass('res-cancel');
        reservations.splice(idx, 1);
      }
      return redirect(res, '/my');
    }
    const feePay = pathName.match(/^\/fees\/(\d+)\/pay$/);
    if (feePay && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Fees & Payments');
      const fee = fees.find(f => f.id === Number(feePay[1]));
      if (fee && fee.status === 'unpaid') {
        const amount = parseFloat(fields.amount);
        fee.paidAmount = isNaN(amount) ? 0 : amount;
        fee.status = 'paid'; // NOTE (the flaw): settled for whatever arrived
        if (fee.paidAmount < fee.amount) pass('fee-tamper');
      }
      return redirect(res, '/my');
    }
    const feeWaive = pathName.match(/^\/fees\/(\d+)\/waive$/);
    if (feeWaive && method === 'POST') {
      await readBody(req);
      attempt('Fees & Payments');
      const fee = fees.find(f => f.id === Number(feeWaive[1]));
      if (fee && fee.status === 'unpaid') {
        fee.status = 'waived'; // NOTE (the flaw): no staff role check at all
        if (user.role === 'member') pass('fee-waive');
      }
      return redirect(res, '/my');
    }

    if (pathName === '/members' && method === 'GET') {
      attempt('Members & Reading History');
      return send(res, 200, membersPage(req, user));
    }
    const histMatch = pathName.match(/^\/members\/(\d+)\/history$/);
    if (histMatch && method === 'GET') {
      attempt('Members & Reading History');
      const member = userById(Number(histMatch[1]));
      if (!member) return send(res, 404, 'member not found', 'text/plain');
      if (member.id !== user.id) pass('hist-idor');
      return send(res, 200, historyPage(req, user, member));
    }

    if (pathName === '/librarian' && method === 'GET') {
      attempt('Librarian & Admin');
      // NOTE (the flaw): this page trusts the client-supplied hx_role cookie.
      const cookieRole = parseCookies(req).hx_role || user.role;
      if (cookieRole === 'librarian' || cookieRole === 'admin' || user.role === 'librarian' || user.role === 'admin') {
        if (user.role === 'member' && (cookieRole === 'librarian' || cookieRole === 'admin')) pass('auth-cookie');
        return send(res, 200, librarianPage(req, user));
      }
      return send(res, 403, 'Librarians only.', 'text/plain');
    }
    const catEdit = pathName.match(/^\/librarian\/books\/(\d+)\/edit$/);
    if (catEdit && method === 'POST') {
      const { fields } = await readBody(req);
      attempt('Librarian & Admin');
      const b = bookById(Number(catEdit[1]));
      if (b) {
        // NOTE (the flaw): the page checks roles; this endpoint never does.
        if (fields.title) b.title = String(fields.title);
        const c = parseInt(fields.copies, 10);
        if (!isNaN(c)) b.copies = c;
        if (user.role === 'member') pass('admin-catalog');
      }
      return redirect(res, '/librarian');
    }
    if (pathName === '/admin' && method === 'GET') {
      attempt('Librarian & Admin');
      // NOTE (the flaw): no role check whatsoever on the admin console.
      if (user.role !== 'admin') pass('admin-bac');
      return send(res, 200, adminPage(req, user));
    }

    if (pathName === '/tests' && method === 'GET') return send(res, 200, testsPage(req, user));
    if (pathName === '/complete' && method === 'GET') return send(res, 200, completePage(req, user));
    if (pathName === '/tester-name' && method === 'POST') {
      const { fields } = await readBody(req);
      progress.testerName = String(fields.name || '').slice(0, 80);
      saveProgress();
      return redirect(res, '/complete');
    }
    if (pathName === '/certificate' && method === 'GET') {
      const cert = certificatePage(req, user);
      if (!cert) return redirect(res, '/complete');
      return send(res, 200, cert);
    }

    return send(res, 404, '404 — not found', 'text/plain');
  } catch (err) {
    try { send(res, 500, '500 — the lab hiccuped, but it is still standing.', 'text/plain'); } catch (e) { /* socket gone */ }
  }
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT + ' (LOCAL ONLY)');
  });
}
module.exports = { TESTS, FEATURES };

