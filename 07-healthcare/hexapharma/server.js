/**
 * HexaPharma — LAB 63 of the HexaCyberLab 110-lab programme.
 * Category 7: Healthcare & Wellness.
 *
 * A complete (intentionally vulnerable) online pharmacy: customer /
 * pharmacist / admin accounts, medicine catalog (OTC + prescription-only),
 * prescription upload + pharmacist verification, cart & orders, refills,
 * delivery addresses — wrapped in the full lab system (entry-key gate,
 * progress engine, /tests, Lab Coach chatbot, /complete, /certificate)
 * described in lab-system-ENGINE-SPEC.md.
 *
 * Zero-dependency Node.js. Binds 127.0.0.1:3072 only. LOCAL PRACTICE ONLY.
 * All people, medicines, prescriptions and orders are fake seed data.
 *
 * Keys: the Lab 63 entry key and completion key exist ONLY as base64-of-
 * reversed shards scattered across this file; they are assembled at runtime
 * and never appear as plain literals anywhere.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 63;
const LAB_NAME = 'HexaPharma';
const PORT = 3072;
const DIR = __dirname;
const STATE_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');

/* Key shards — region 1 of 4 (entry key, pieces 1-3). */
const _E1 = ["TC1YSA==","Ui0zNg==","TllJOQ=="];
function _asm(a) { return a.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }

/* ============================ SEED DATA (all fake) ============================ */
const users = [
  { id: 1, email: 'admin@hexapharma.local', password: 'admin123', role: 'admin',       name: 'Ayesha Admin',     credit: 0,  active: true,  resetIssued: false, resetToken: null },
  { id: 2, email: 'pharm@hexapharma.local', password: 'pharm123', role: 'pharmacist',  name: 'Paul Pharmacist',  credit: 0,  active: true,  resetIssued: false, resetToken: null },
  { id: 3, email: 'alice@hexapharma.local', password: 'alice123', role: 'customer',    name: 'Alice Rahman',     credit: 20, active: true,  resetIssued: false, resetToken: null },
  { id: 4, email: 'bob@hexapharma.local',   password: 'bob123',   role: 'customer',    name: 'Bob Chen',         credit: 0,  active: true,  resetIssued: false, resetToken: null },
  { id: 5, email: 'carol@hexapharma.local', password: 'carol123', role: 'customer',    name: 'Carol Diaz',       credit: 5,  active: true,  resetIssued: false, resetToken: null },
  { id: 6, email: 'demo@hexapharma.local',  password: 'demo1234', role: 'customer',    name: 'Demo User',        credit: 0,  active: true,  resetIssued: false, resetToken: null },
];
let nextUserId = 7;

const meds = [
  { id: 1,  name: 'Paracetamol 500mg — 24 tablets',    category: 'Pain Relief', rx: false, price: 4.50,  stock: 200, listed: true },
  { id: 2,  name: 'Ibuprofen 400mg — 30 tablets',      category: 'Pain Relief', rx: false, price: 5.25,  stock: 150, listed: true },
  { id: 3,  name: 'Cetirizine 10mg — 10 tablets',      category: 'Allergy',     rx: false, price: 6.00,  stock: 120, listed: true },
  { id: 4,  name: 'Vitamin D3 1000IU — 60 capsules',   category: 'Vitamins',    rx: false, price: 9.99,  stock: 90,  listed: true },
  { id: 5,  name: 'Omeprazole 20mg — 28 capsules',     category: 'Digestive',   rx: false, price: 7.80,  stock: 80,  listed: true },
  { id: 6,  name: 'Amoxicillin 250mg — 21 capsules',   category: 'Antibiotics', rx: true,  price: 12.75, stock: 60,  listed: true },
  { id: 7,  name: 'Metformin 500mg — 56 tablets',      category: 'Chronic Care',rx: true,  price: 8.40,  stock: 70,  listed: true },
  { id: 8,  name: 'Atorvastatin 20mg — 30 tablets',    category: 'Chronic Care',rx: true,  price: 11.20, stock: 65,  listed: true },
  { id: 9,  name: 'Salbutamol Inhaler 100mcg',         category: 'Respiratory', rx: true,  price: 14.99, stock: 40,  listed: true },
  { id: 10, name: 'Compound X — staff formulation (internal)', category: 'Internal', rx: true, price: 99.99, stock: 5, listed: false },
];

const prescriptions = [
  { id: 1, userId: 3, medId: 7, doctor: 'Dr. Karim', status: 'verified', fileId: 1 },
  { id: 2, userId: 4, medId: 6, doctor: 'Dr. Lee',   status: 'pending',  fileId: 2 },
  { id: 3, userId: 5, medId: 8, doctor: 'Dr. Patel', status: 'verified', fileId: 3 },
];
let nextRxId = 4;

const rxFiles = [
  { id: 1, userId: 3, name: 'alice-metformin-rx.pdf',    content: '(simulated prescription document — Metformin 500mg, Dr. Karim)' },
  { id: 2, userId: 4, name: 'bob-amoxicillin-rx.pdf',   content: '(simulated prescription document — Amoxicillin 250mg, Dr. Lee)' },
  { id: 3, userId: 5, name: 'carol-atorvastatin-rx.jpg', content: '(simulated prescription document — Atorvastatin 20mg, Dr. Patel)' },
];
let nextFileId = 4;

const DAY = 24 * 3600 * 1000;
const orders = [
  { id: 1001, userId: 3, items: [{ medId: 7, qty: 1, price: 8.40 }], total: 8.40, status: 'Delivered', addressId: 1, nextRefill: Date.now() + 20 * DAY },
  { id: 1002, userId: 4, items: [{ medId: 1, qty: 2, price: 4.50 }], total: 9.00, status: 'Delivered', addressId: 2, nextRefill: Date.now() - 1 * DAY },
];
let nextOrderId = 1003;

const addresses = [
  { id: 1, userId: 3, label: 'Home',   text: '12 Lake Road, Dhaka' },
  { id: 2, userId: 4, label: 'Office', text: '9 Hill Street, Chattogram' },
];
let nextAddrId = 3;

const carts = {}; // userId -> [{medId, qty}]
const sessions = {}; // sid -> userId
const failCount = {}; // email -> consecutive failed logins (runtime only)
const enumProbes = new Set(); // distinct emails probed (runtime only)

/* ============================ PROGRESS ENGINE ============================ */
function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let _state = null;
function S() {
  if (_state) return _state;
  try { _state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch (e) { _state = defaultState(); }
  if (!_state || typeof _state !== 'object' || !_state.tests) _state = defaultState();
  return _state;
}
function save() { try { fs.writeFileSync(STATE_FILE, JSON.stringify(S(), null, 2)); } catch (e) {} }

/* ============================ TESTS REGISTRY ============================ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_SEARCH = 'Catalog & Search';
const F_RX = 'Prescriptions & Files';
const F_CART = 'Cart & Checkout';
const F_ORD = 'Orders & Refills';
const F_ADMIN = 'Admin Panel';
const F_API = 'Platform & API';

const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL injection login bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its database query by gluing your input straight into the query string.', 'What happens if your email address itself contains a quote and a logical operator?', "Try an email like alice@hexapharma.local' OR '1'='1 with any password."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.',
    impact: 'On a real pharmacy site this is full account takeover: an attacker logs in as any patient and sees their prescriptions, orders and addresses.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'Brute force — no rate limit or lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing passwords for the same account — does anything slow you down or lock the account?', 'Ten wrong passwords in a row are accepted for processing without any challenge.', 'Script 10+ failed logins for one account and observe that attempt 10 is processed exactly like attempt 1.'],
    lesson: 'Without throttling or lockout, password guessing is free — the only defence left is the strength of each user\u2019s password.',
    impact: 'Attackers can credential-stuff or brute-force patient accounts at full speed, harvesting medical purchase histories at scale.',
    report: { title: 'No Rate Limiting or Account Lockout on Login', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and breached-password checks to the login endpoint.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'User enumeration via login & forgot-password', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error messages for an email that exists and one that does not — on both the login and the forgot-password forms.', 'Different answers leak which emails are registered.', 'Probe at least 5 different emails through forgot-password and note the two different responses.'],
    lesson: 'Differential error messages turn a login form into an oracle that confirms exactly which email addresses hold accounts.',
    impact: 'Enumerated patient emails feed targeted phishing ("your prescription is ready") and credential-stuffing lists.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic response for all login and password-reset requests, regardless of whether the account exists.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Published demo credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — the site helpfully prints a working account for you.', 'Demo accounts shipped to production are real accounts with real access.', 'Log in with the demo email and password printed on the login page.'],
    lesson: 'Demo and default credentials are the first thing an attacker tries; if they work in production, the door is simply open.',
    impact: 'Anyone on the internet can sign in with the published demo account and explore the patient experience — and probe for more.',
    report: { title: 'Demo Account Credentials Published on the Login Page', severity: 'High', remediation: 'Remove demo accounts and any credential hints from production; seed test data only in non-production environments.' } },
  { id: 'auth-reset-token', feature: F_AUTH, name: 'Predictable password-reset token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the shape of the token — is any part of it guessable?', 'The token is derived from something public about the account, not from randomness.', 'The token is PHR-<userId>-<userId*167+41>. Work it out for another account (ids are sequential) and reset their password without ever requesting a reset for them.'],
    lesson: 'A reset token is a temporary password — if it can be computed from public data, account recovery becomes account takeover.',
    impact: 'An attacker resets any patient\u2019s password using only their sequential account id, then reads prescriptions and reorders medication.',
    report: { title: 'Password Reset Tokens Are Predictable (Derived from User ID)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), store only a hash, and expire them quickly.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Session/role cookie tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After logging in, inspect the cookies the site sets — one of them describes your role.', 'The pharmacist area trusts what the browser claims, not what the server knows.', 'Set your hx_role cookie to pharmacist and open the pharmacist verification queue.'],
    lesson: 'Authorization decisions must come from server-side session data; a role stored in a client cookie is a suggestion, not a fact.',
    impact: 'Any patient can promote themselves to pharmacist in their browser and approve prescriptions — the core safety control of the pharmacy collapses.',
    report: { title: 'Role Stored in a Client Cookie and Trusted for Authorization', severity: 'Critical', remediation: 'Keep roles exclusively in server-side session records and ignore client-supplied role claims.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak-password', feature: F_REG, name: 'Weak password policy (1 character accepted)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password the site accepts.', 'There is no minimum length or complexity check at all.', 'Register with the password "x" — the account is created.'],
    lesson: 'Password policy is set at registration; accepting 1-character passwords guarantees brute-forceable accounts.',
    impact: 'Patients who pick weak passwords get no pushback, so a large share of accounts fall to trivial guessing.',
    report: { title: 'Registration Accepts Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum password length (12+ recommended) and screen against known-breached passwords.' } },
  { id: 'reg-mass-assignment', feature: F_REG, name: 'Mass assignment — role / store credit via extra fields', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration and profile forms only show a few fields — the server accepts more than it shows.', 'What if you submit a field the form never offered, like a staff role or a store-credit balance?', 'Register with an extra role=pharmacist field (or add credit=9999 to a profile update) and watch it stick.'],
    lesson: 'Binding a whole request body to a user record lets attackers write fields that were never meant to be user-controlled.',
    impact: 'Self-service privilege escalation: a patient makes themselves staff, or mints store credit and orders for free.',
    report: { title: 'Mass Assignment Allows Role and Balance Manipulation', severity: 'High', remediation: 'Whitelist the exact fields each endpoint may update; never bind request bodies directly to user records.' } },
  { id: 'reg-stored-xss', feature: F_REG, name: 'Stored XSS in display name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown back on pages — including pages staff see.', 'Names are rendered without escaping.', 'Register (or rename yourself) with a name containing <script>alert(1)</script> and view the dashboard / admin user list.'],
    lesson: 'Any field rendered to other users is an XSS delivery vehicle if output encoding is missing — names are a classic carrier.',
    impact: 'A malicious patient name executes script in the pharmacist\u2019s or admin\u2019s browser, enabling session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied output and validate names against an allowlist character set.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on profile update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The site\u2019s own forms carry a hidden hx_origin marker. Does the server ever check it?', 'State changes are accepted from requests that did not come from the site\u2019s forms.', 'Submit a profile update POST without the hx_origin field (e.g. from a raw form on another origin) — the change is applied.'],
    lesson: 'Without an anti-CSRF token that is actually verified, any website a logged-in user visits can change their profile.',
    impact: 'A malicious page silently changes a patient\u2019s email or delivery details, redirecting medication and enabling takeover.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Issue per-session anti-CSRF tokens and verify them on every state-changing request.' } },

  /* ---- Catalog & Search ---- */
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL injection in catalog search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Search is built by string-gluing too. A normal search only shows listed medicines.', 'There is at least one internal product that never appears in the catalog… unless the query is bent.', "Search for ' OR '1'='1 and the full inventory — including the unlisted internal compound — comes back."],
    lesson: 'Search boxes are injection points like any other; a successful injection can expose data that no page ever links to.',
    impact: 'Attackers dump the full product/inventory database, including internal-only items and stock data meant to stay private.',
    report: { title: 'SQL Injection in Product Search Exposes Unlisted Inventory', severity: 'High', remediation: 'Parameterise search queries and enforce visibility rules (listed items only) in the data layer.' } },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you, verbatim.', 'Verbatim means unescaped — including markup.', 'Search for <script>alert(1)</script> and view the page source / rendered result.'],
    lesson: 'Reflected input must be encoded on output; a search page that echoes raw HTML turns every link into a script-delivery tool.',
    impact: 'Attackers send patients crafted search links that run script in the pharmacy origin — stealing sessions or faking payment pages.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode all reflected user input and add a restrictive Content-Security-Policy.' } },

  /* ---- Prescriptions & Files ---- */
  { id: 'rx-self-approve', feature: F_RX, name: 'Prescription approved without a pharmacist', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Prescriptions are verified by pharmacists through a decide endpoint. Who checks that the caller is one?', 'The endpoint changes status for anyone who asks nicely.', 'As a plain customer, POST to /pharmacy/prescriptions/<id>/decide with status=verified for a pending prescription.'],
    lesson: 'A workflow control (pharmacist verification) only exists if the server enforces who may perform it — the UI hiding the button is not a control.',
    impact: 'Patients self-approve prescriptions for controlled medication — the pharmacy\u2019s central safety and legal control is bypassed entirely.',
    report: { title: 'Missing Authorization on Prescription Approval Endpoint', severity: 'Critical', remediation: 'Enforce pharmacist role checks server-side on every verification action and log all decisions.' } },
  { id: 'rx-queue-bac', feature: F_RX, name: 'Prescription queue exposed to customers via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['There is a JSON API that mirrors the pharmacist\u2019s work queue.', 'It asks whether you are logged in — but not who you are.', 'As a customer, open /api/prescriptions and read every patient\u2019s pending prescriptions.'],
    lesson: 'APIs need the same authorization as the screens they mirror; "logged in" is not "entitled".',
    impact: 'Every patient\u2019s prescription details (who takes what) leak to any registered account — highly sensitive health data.',
    report: { title: 'Broken Access Control: Prescription Queue API Available to All Customers', severity: 'High', remediation: 'Apply role-based authorization to API endpoints equivalent to the UI, and scope results to the caller.' } },
  { id: 'rx-file-idor', feature: F_RX, name: 'Prescription file IDOR — other patients\u2019 documents', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Uploaded prescription files are served from /files/rx/<id> with small sequential ids.', 'The server never asks whether the file belongs to you.', 'Log in as one patient and download another patient\u2019s prescription file by changing the id.'],
    lesson: 'Sequential ids plus missing ownership checks equal bulk data theft — every document is one increment away.',
    impact: 'An attacker downloads every patient\u2019s prescription documents, exposing diagnoses and medication histories.',
    report: { title: 'Insecure Direct Object Reference on Prescription Files', severity: 'High', remediation: 'Check object ownership on every file request and use unguessable file identifiers.' } },
  { id: 'rx-upload-html', feature: F_RX, name: 'Unrestricted upload — HTML served from the pharmacy origin', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The prescription upload accepts any file name and content, and the file is later served back.', 'What content type is an uploaded .html file served with?', 'Upload a "prescription" named evil.html containing a script payload, then open its /files/rx/<id> URL.'],
    lesson: 'Upload features must validate type and serve files safely; an HTML file served from the trusted origin is stored XSS with a URL.',
    impact: 'Attackers host phishing/script pages under the pharmacy\u2019s own domain — the perfect lure for patients and staff.',
    report: { title: 'Unrestricted File Upload with HTML Served Inline', severity: 'High', remediation: 'Allowlist file types, verify content, store uploads outside the web root and serve with Content-Disposition: attachment.' } },
  { id: 'file-traversal', feature: F_RX, name: 'Path traversal on document download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The /download endpoint takes a file name and reads it from the documents folder.', 'It never asks whether the name stays inside that folder.', 'Request /download?name=../server.js and read the application source.'],
    lesson: 'Joining user input to a filesystem path without normalisation and containment checks hands out the whole server, one ../ at a time.',
    impact: 'Source code, configuration and secrets on the server are readable by any patient account — a stepping stone to full compromise.',
    report: { title: 'Path Traversal in Document Download', severity: 'High', remediation: 'Resolve the requested path, verify it stays within the allowed directory, and allowlist downloadable files.' } },

  /* ---- Cart & Checkout ---- */
  { id: 'cart-qty', feature: F_CART, name: 'Quantity tampering — negative / absurd quantities accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['Add an item to the cart and look at the request — who decides how many you are buying?', 'The server never validates the range of the quantity.', 'Add an item with qty=-5 (or 100000) — the cart accepts it and the line total follows the maths.'],
    lesson: 'Quantities are money. Every numeric field from the client needs server-side range validation.',
    impact: 'Negative quantities reduce the bill (or generate credit); absurd quantities can drain stock and break fulfilment.',
    report: { title: 'Missing Server-Side Validation of Cart Quantities', severity: 'Medium', remediation: 'Validate quantities server-side against sane per-product limits before any price calculation.' } },
  { id: 'checkout-price', feature: F_CART, name: 'Price tampering at checkout', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The checkout form carries the price of each item in hidden fields.', 'Hidden only means invisible — not unchangeable. The server trusts what comes back.', 'Edit the price field for an item to 0.01 before submitting checkout and place the order at your price.'],
    lesson: 'Prices must be recomputed server-side from the catalogue at order time; client-supplied prices are fiction.',
    impact: 'Customers name their own price for medication — direct revenue loss on every order.',
    report: { title: 'Client-Supplied Prices Trusted at Checkout', severity: 'High', remediation: 'Ignore client prices; recompute all totals from server-side catalogue data at checkout.' } },
  { id: 'checkout-rx-bypass', feature: F_CART, name: 'Prescription-only medicine ordered without a verified prescription', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Rx items need a verified prescription — the checkout asks the browser to confirm that with a flag.', 'Flags sent by the browser can be set by anyone.', 'Add an Rx-only medicine you have no verified prescription for, then submit checkout with rxOk=1.'],
    lesson: 'Eligibility checks (a verified prescription) must be looked up server-side against records, never asserted by the client.',
    impact: 'Controlled medication ships to anyone who ticks a hidden box — patient-safety and regulatory consequences are severe.',
    report: { title: 'Prescription Verification Bypass via Client-Supplied Flag', severity: 'Critical', remediation: 'Verify prescription status server-side against the prescription record for that patient and product before accepting an order.' } },

  /* ---- Orders & Refills ---- */
  { id: 'order-idor', feature: F_ORD, name: 'Order IDOR — other patients\u2019 orders', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Order pages live at /orders/<id> with sequential ids starting at 1001.', 'Ownership is never checked when an order is displayed.', 'Log in as one patient and open another patient\u2019s order by changing the id.'],
    lesson: 'Every object access needs an ownership (or role) check — predictable ids make the missing check trivially exploitable.',
    impact: 'Full order histories of all patients — medicines, quantities, addresses — are readable by any account.',
    report: { title: 'Insecure Direct Object Reference on Order Details', severity: 'High', remediation: 'Scope order queries to the authenticated owner (or staff roles) on every request.' } },
  { id: 'refill-early', feature: F_ORD, name: 'Early refill — refill date check bypassed by client flag', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Repeat medication has a next-refill date. The refill form offers the server a little help deciding.', 'A client-supplied refillNow flag talks the server out of checking the date.', 'Request a refill for an order whose refill date is weeks away, adding refillNow=1.'],
    lesson: 'Time-based safety rules (refill intervals) must be evaluated server-side from stored dates, not from request parameters.',
    impact: 'Patients stockpile controlled medication by refilling early — a safety and abuse risk the refill interval exists to prevent.',
    report: { title: 'Refill Interval Check Bypass via Client Flag', severity: 'High', remediation: 'Compute refill eligibility server-side from the stored next-refill date; ignore client assertions.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: F_ADMIN, name: 'Admin panel open to any signed-in user', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The admin console lives at an obvious URL. The menu only shows it to admins…', '…but the page itself never checks who is asking.', 'Log in as a normal customer (or pharmacist) and open /admin directly.'],
    lesson: 'Hiding a link is not access control. Every privileged page must verify the role on the server, on every request.',
    impact: 'The full user list — every patient account — is visible to any registered user, a mass privacy breach in one click.',
    report: { title: 'Broken Access Control on Admin Console', severity: 'High', remediation: 'Enforce admin-role authorization in middleware for all /admin routes.' } },
  { id: 'admin-csrf', feature: F_ADMIN, name: 'CSRF on admin user deactivation (GET action)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admins deactivate users through a simple link. Links are GET requests.', 'GET requests are fired by browsers automatically — images, previews, prefetchers.', 'While logged in as admin, visit /admin/deactivate?id=<userId> directly — the account is disabled with no token and no confirmation.'],
    lesson: 'State-changing GET endpoints are CSRF by design: any page an admin views can fire them with the admin\u2019s session.',
    impact: 'An attacker page silently deactivates patient or staff accounts whenever an admin browses it — denial of service against the business.',
    report: { title: 'State-Changing Admin Action Performed via GET Without CSRF Token', severity: 'Medium', remediation: 'Use POST with verified anti-CSRF tokens for all state changes, especially administrative actions.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: F_API, name: 'Forgeable API token (base64 of email)', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Intermediate',
    hints: ['The partner API authenticates with an x-api-token header. Tokens are never shown anywhere in the app.', 'They are not random — they are derived from something you already know about the victim.', "The token is hp_ followed by the base64 of the user's email. Forge one for another user and read their orders via /api/orders."],
    lesson: 'An API key must be a high-entropy secret; anything derivable from public data is not a credential at all.',
    impact: 'Anyone can impersonate any patient to the API and pull their order data — no password needed, ever.',
    report: { title: 'API Tokens Predictable (Derived from Email Address)', severity: 'High', remediation: 'Issue random, high-entropy API tokens, store them hashed, and support revocation.' } },
  { id: 'api-debug', feature: F_API, name: 'Unauthenticated debug endpoint dumps all users', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers love predictable paths.', 'This one needs no login at all.', 'Open /api/debug in a private window — every account, including passwords, comes back as JSON.'],
    lesson: 'Debug and diagnostics endpoints are production vulnerabilities the day they ship; if it exists, it will be found.',
    impact: 'Complete credential dump for every patient and staff account — instant total compromise of the platform.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth and network restrictions.' } },
];

/* Key shards — region 2 of 4 (entry key, pieces 4-6). */
const _E2 = ["LUZKOQ==","SDlGTA==","TFFUUg=="];
function entryKey() { return _asm(_E1.concat(_E2)); }

function pass(id) {
  const s = S();
  if (!s.tests[id]) {
    s.tests[id] = true;
    if (isComplete()) { s.completedAt = new Date().toISOString(); s.keyRevealed = true; }
    save();
  }
}
function bump(feature) {
  const s = S();
  s.attempts[feature] = (s.attempts[feature] || 0) + 1;
  save();
}
function doneCount() { return TESTS.filter(t => S().tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function progressInfo() {
  const s = S();
  const features = {};
  for (const t of TESTS) {
    if (!features[t.feature]) features[t.feature] = { total: 0, done: 0, attempts: s.attempts[t.feature] || 0 };
    features[t.feature].total++;
    if (s.tests[t.id]) features[t.feature].done++;
  }
  const done = doneCount();
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done, pct: Math.floor(done * 100 / TESTS.length), features, complete: isComplete() };
}

/* ============================ HTTP HELPERS ============================ */
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function sessionOf(req) {
  const c = parseCookies(req);
  return c.hx_sess && sessions[c.hx_sess] ? sessions[c.hx_sess] : null;
}
function userOf(req) {
  const sid = sessionOf(req);
  if (!sid) return null;
  return users.find(u => u.id === sid) || null;
}
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions[sid] = user.id;
  res.setHeader('Set-Cookie', [
    'hx_sess=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/', // flaw (by design): role mirrored into a client-editable cookie
  ]);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
const XSS_RE = /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|<body[^>]*onload)/i;
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', ch => { data += ch; if (data.length > 2 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve({ json: JSON.parse(data), raw: data }); } catch (e) { resolve({ json: null, raw: data }); }
      } else {
        const params = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
          const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
          params[k] = v;
        }
        resolve({ form: params, raw: data });
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), 'application/json'); }
function redirect(res, loc) { res.writeHead(302, { Location: loc }); res.end(); }
function resetTokenFor(u) { return 'PHR-' + u.id + '-' + ((u.id * 167 + 41) % 100000); } // flaw (by design): predictable
function medById(id) { return meds.find(m => m.id === Number(id)); }
function money(n) { return '$' + Number(n).toFixed(2); }

/* Key shards — region 3 of 4 (completion key, pieces 1-3). */
const _C1 = ["TC1YSA==","TC00Ng==","UThGNg=="];

/* ============================ LAYOUT / CHROME ============================ */
function chatWidget() {
  return `<div id="hxc" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);font-family:Arial,sans-serif;z-index:50">
  <div style="background:#0f766e;color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;font-weight:bold">💬 Lab Coach — LAB ${LAB_NUMBER}</div>
  <div id="hxlog" style="height:210px;overflow-y:auto;padding:10px;font-size:13px"></div>
  <div style="display:flex;border-top:1px solid #e2e8f0">
    <input id="hxin" placeholder="Ask the coach…" style="flex:1;border:0;padding:10px;font-size:13px" onkeydown="if(event.key==='Enter')hxSend()">
    <button onclick="hxSend()" style="background:#0f766e;color:#fff;border:0;padding:0 14px;cursor:pointer">Ask</button>
  </div></div>
<script>
function hxAdd(who,txt){var lg=document.getElementById('hxlog');var d=document.createElement('div');d.style.margin='6px 0';d.style.textAlign=who==='me'?'right':'left';var b=document.createElement('span');b.style.display='inline-block';b.style.padding='7px 10px';b.style.borderRadius='10px';b.style.background=who==='me'?'#0f766e':'#f1f5f9';b.style.color=who==='me'?'#fff':'#111';b.textContent=txt;d.appendChild(b);lg.appendChild(d);lg.scrollTop=lg.scrollHeight;}
function hxSend(){var i=document.getElementById('hxin');var m=i.value.trim();if(!m)return;i.value='';hxAdd('me',m);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json()}).then(function(j){hxAdd('bot',j.reply)}).catch(function(){hxAdd('bot','Coach unavailable right now.')});}
hxAdd('bot','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what this lab covers, or how a feature works after you have tried it yourself.');
</script>`;
}
function layout(req, title, body, opts) {
  opts = opts || {};
  const p = progressInfo();
  const u = userOf(req);
  const pct = p.pct;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title></head>
<body style="margin:0;background:#f0fdfa;font-family:Arial,sans-serif;color:#134e4a">
<div style="background:#134e4a;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
  <img src="/logo.png" style="height:40px" alt="HexaCyberLab">
  <div style="font-size:18px;font-weight:bold">LAB ${LAB_NUMBER} — ${LAB_NAME}</div>
  <div style="flex:1;min-width:200px;max-width:420px">
    <div style="font-size:12px;margin-bottom:4px">${p.done}/${p.total} tests · ${pct}%</div>
    <div style="background:#115e59;border-radius:6px;height:10px"><div style="background:#2dd4bf;height:10px;border-radius:6px;width:${pct}%"></div></div>
  </div>
  <nav style="font-size:13px">
    <a style="color:#99f6e4;margin-right:10px" href="/">Home</a>
    <a style="color:#99f6e4;margin-right:10px" href="/catalog">Catalog</a>
    <a style="color:#99f6e4;margin-right:10px" href="/cart">Cart</a>
    <a style="color:#99f6e4;margin-right:10px" href="/orders">Orders</a>
    <a style="color:#99f6e4;margin-right:10px" href="/prescriptions">Prescriptions</a>
    <a style="color:#99f6e4;margin-right:10px" href="/tests">Mission Board</a>
    ${u ? '<a style="color:#99f6e4;margin-right:10px" href="/profile">' + esc(u.name.split(' ')[0]) + '</a><a style="color:#99f6e4" href="/logout">Logout</a>' : '<a style="color:#99f6e4" href="/login">Login</a>'}
  </nav>
</div>
<div style="max-width:980px;margin:22px auto;padding:0 16px">${body}</div>
<div style="text-align:center;color:#5f7a76;font-size:12px;padding:18px">HexaPharma is a deliberately vulnerable practice lab (fake data only). HexaCyberLab — Built by Md. Jony Hassain, Founder.</div>
${opts.noChat ? '' : chatWidget()}
</body></html>`;
}
function gatePage(req, err) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#f0fdfa;font-family:Arial,sans-serif"><div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #99f6e4;border-radius:12px;padding:28px;text-align:center">
<img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : ''}
<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><br><br><button style="padding:10px 22px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Unlock LAB ${LAB_NUMBER}</button></form></div>
${chatWidget()}
</body></html>`;
}
function requireUser(req, res) {
  const u = userOf(req);
  if (!u) { redirect(res, '/login'); return null; }
  if (!u.active) { send(res, 403, layout(req, 'Account disabled', '<h2>Account disabled</h2><p>This account has been deactivated.</p>')); return null; }
  return u;
}

/* ============================ AUTH ============================ */
function loginPage(req, err) {
  return layout(req, 'Login', `<h2>Sign in to HexaPharma</h2>
  ${err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/login" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
    <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
    <label>Password<br><input name="password" type="password" style="width:95%;padding:8px"></label><br><br>
    <button style="padding:9px 20px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Sign in</button>
  </form>
  <p><a href="/forgot">Forgot your password?</a> · <a href="/register">Create an account</a></p>
  <div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:12px;border-radius:8px;max-width:420px">
    <b>Just looking?</b> Use our demo account — email: <code>demo@hexapharma.local</code>, password: <code>demo1234</code>
  </div>`, { noChat: false });
}
const INJ_RE = /('|")\s*(or|and|--)|('\s*(or|and)\s+')/i;
async function handleLogin(req, res) {
  const { form } = await readBody(req);
  bump(F_AUTH);
  const email = String(form.email || '');
  const password = String(form.password || '');
  // Vulnerable by design: the "query" is string-built and the injection path really logs in.
  let user = null, viaInjection = false;
  if (INJ_RE.test(email) || INJ_RE.test(password)) {
    const prefix = email.split("'")[0].trim();
    user = users.find(u => u.email === prefix) || users[0];
    viaInjection = true;
  } else {
    user = users.find(u => u.email === email) || null;
    if (user && user.password !== password) {
      // failed login
      failCount[email] = (failCount[email] || 0) + 1;
      if (failCount[email] >= 10) pass('auth-brute'); // flaw: the 10th failure is still processed, nothing throttles
      enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      return send(res, 200, loginPage(req, 'Wrong password for this account.'));
    }
    if (!user) {
      enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      return send(res, 200, loginPage(req, 'No account exists for that email address.'));
    }
  }
  if (user && !user.active) return send(res, 403, loginPage(req, 'This account has been deactivated.'));
  failCount[email] = 0;
  if (viaInjection) pass('auth-sqli');
  if (user.id === 6 && !viaInjection) pass('auth-default'); // published demo credentials actually work
  startSession(res, user);
  redirect(res, '/');
}
function registerPage(req, err) {
  return layout(req, 'Register', `<h2>Create your HexaPharma account</h2>
  ${err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : ''}
  <form method="POST" action="/register" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
    <label>Full name<br><input name="name" style="width:95%;padding:8px"></label><br><br>
    <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
    <label>Password<br><input name="password" type="password" style="width:95%;padding:8px"></label><br><br>
    <button style="padding:9px 20px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Register</button>
  </form>
  <p>Already registered? <a href="/login">Sign in</a></p>`);
}
async function handleRegister(req, res) {
  const { form } = await readBody(req);
  bump(F_REG);
  const email = String(form.email || '').trim();
  const name = String(form.name || '').trim();
  const password = String(form.password || '');
  if (!email || !name || !password) return send(res, 200, registerPage(req, 'All fields are required.'));
  if (users.some(u => u.email === email)) return send(res, 200, registerPage(req, 'That email is already registered.'));
  // flaw (by design): no password policy at all
  if (password.length < 1) return send(res, 200, registerPage(req, 'Password required.'));
  if (password.length <= 3) pass('reg-weak-password');
  const u = { id: nextUserId++, email, password, role: 'customer', name, credit: 0, active: true, resetIssued: false, resetToken: null };
  // flaw (by design): mass assignment — extra submitted fields are applied to the record
  if (form.role && ['customer', 'pharmacist', 'admin'].includes(form.role)) u.role = form.role;
  if (form.credit !== undefined && !isNaN(Number(form.credit))) u.credit = Number(form.credit);
  if (u.role !== 'customer' || u.credit > 0) pass('reg-mass-assignment');
  if (XSS_RE.test(name)) pass('reg-stored-xss');
  users.push(u);
  startSession(res, u);
  redirect(res, '/');
}
function forgotPage(req, msg) {
  return layout(req, 'Forgot password', `<h2>Reset your password</h2>
  ${msg ? '<p>' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/forgot" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
    <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
    <button style="padding:9px 20px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Send reset link</button>
  </form>
  <p>Remembered it? <a href="/login">Sign in</a> · Have a token? <a href="/reset">Enter it here</a></p>`);
}
async function handleForgot(req, res) {
  const { form } = await readBody(req);
  bump(F_AUTH);
  const email = String(form.email || '').trim();
  enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
  const u = users.find(x => x.email === email);
  if (!u) return send(res, 200, forgotPage(req, 'No account exists for that email address.')); // flaw: differential response
  u.resetIssued = true; u.resetToken = resetTokenFor(u);
  return send(res, 200, forgotPage(req, 'Reset link sent — please check your inbox for ' + email + '.'));
}
function resetPage(req, msg) {
  return layout(req, 'Set new password', `<h2>Set a new password</h2>
  ${msg ? '<p>' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/reset" style="background:#fff;padding:18px;border-radius:10px;max-width:420px">
    <label>Email<br><input name="email" style="width:95%;padding:8px"></label><br><br>
    <label>Reset token<br><input name="token" style="width:95%;padding:8px"></label><br><br>
    <label>New password<br><input name="password" type="password" style="width:95%;padding:8px"></label><br><br>
    <button style="padding:9px 20px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Set password</button>
  </form>`);
}
async function handleReset(req, res) {
  const { form } = await readBody(req);
  bump(F_AUTH);
  const u = users.find(x => x.email === String(form.email || '').trim());
  if (!u) return send(res, 200, resetPage(req, 'No account exists for that email address.'));
  const token = String(form.token || '');
  if (token !== resetTokenFor(u)) return send(res, 200, resetPage(req, 'That token does not match.'));
  // flaw (by design): the token is a pure function of the public user id — computing it IS the attack
  if (!u.resetIssued) pass('auth-reset-token');
  u.password = String(form.password || '');
  u.resetIssued = false; u.resetToken = null;
  return send(res, 200, resetPage(req, 'Password updated. You can now sign in.'));
}

/* ============================ DASHBOARD / CATALOG / SEARCH ============================ */
function dashboardPage(req, res) {
  const u = userOf(req);
  const myOrders = orders.filter(o => o.userId === u.id);
  const myRx = prescriptions.filter(r => r.userId === u.id);
  // NOTE: the greeting renders the display name RAW (stored-XSS surface, by design).
  const body = `<h2>Welcome back, ${u.name}</h2>
  <p>Role: <b>${esc(u.role)}</b> · Store credit: <b>${money(u.credit)}</b></p>
  <div style="display:flex;gap:14px;flex-wrap:wrap">
    <div style="background:#fff;border-radius:10px;padding:16px;min-width:220px"><h3>Your orders</h3><p>${myOrders.length} order(s)</p><a href="/orders">View orders</a></div>
    <div style="background:#fff;border-radius:10px;padding:16px;min-width:220px"><h3>Your prescriptions</h3><p>${myRx.length} on file</p><a href="/prescriptions">View prescriptions</a></div>
    <div style="background:#fff;border-radius:10px;padding:16px;min-width:220px"><h3>Browse medicines</h3><p>${meds.filter(m => m.listed).length} products</p><a href="/catalog">Open catalog</a></div>
  </div>
  <form method="GET" action="/search" style="margin-top:20px"><input name="q" placeholder="Search medicines…" style="padding:9px;width:60%"><button style="padding:9px 16px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Search</button></form>`;
  send(res, 200, layout(req, 'Dashboard', body));
}
function medRow(m) {
  return `<div style="background:#fff;border-radius:10px;padding:14px;margin-bottom:10px">
    <b><a href="/med/${m.id}">${esc(m.name)}</a></b> ${m.rx ? '<span style="background:#fef3c7;padding:2px 7px;border-radius:6px;font-size:12px">Prescription only</span>' : '<span style="background:#dcfce7;padding:2px 7px;border-radius:6px;font-size:12px">OTC</span>'}
    <div style="color:#47605c;font-size:13px">${esc(m.category)} · Stock: ${m.stock}</div>
    <div style="margin-top:6px"><b>${money(m.price)}</b>
    <form method="POST" action="/cart/add" style="display:inline;margin-left:10px"><input type="hidden" name="medId" value="${m.id}"><input type="number" name="qty" value="1" style="width:55px;padding:5px"><button style="padding:6px 12px;background:#0f766e;color:#fff;border:0;border-radius:6px;cursor:pointer">Add to cart</button></form></div></div>`;
}
function catalogPage(req, res) {
  const list = meds.filter(m => m.listed);
  send(res, 200, layout(req, 'Catalog', `<h2>Medicine catalog</h2>` + list.map(medRow).join('')));
}
function medPage(req, res, id) {
  bump(F_SEARCH);
  const m = medById(id);
  if (!m) return send(res, 404, layout(req, 'Not found', '<h2>Medicine not found</h2>'));
  send(res, 200, layout(req, m.name, `<h2>${esc(m.name)}</h2><p>Category: ${esc(m.category)} · ${m.rx ? 'Prescription required' : 'Over the counter'} · Stock: ${m.stock}</p><p style="font-size:20px"><b>${money(m.price)}</b></p>` + medRow(m)));
}
function searchPage(req, res, q) {
  bump(F_SEARCH);
  q = String(q || '');
  let results;
  if (INJ_RE.test(q)) {
    results = meds.slice(); // injection dumps EVERYTHING, including unlisted internal stock
    if (results.some(m => !m.listed)) pass('search-sqli');
  } else {
    const needle = q.toLowerCase();
    results = meds.filter(m => m.listed && (m.name.toLowerCase().includes(needle) || m.category.toLowerCase().includes(needle)));
  }
  if (XSS_RE.test(q)) pass('search-xss'); // q is echoed raw below (by design)
  const body = `<h2>Search</h2>
  <form method="GET" action="/search"><input name="q" value="${esc(q)}" style="padding:9px;width:60%"><button style="padding:9px 16px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Search</button></form>
  <p>Results for "${q}": ${results.length} found</p>` + results.map(medRow).join('');
  send(res, 200, layout(req, 'Search', body));
}

/* ============================ PROFILE ============================ */
function profilePage(req, res, msg) {
  const u = userOf(req);
  const body = `<h2>Your profile</h2>
  ${msg ? '<p>' + esc(msg) + '</p>' : ''}
  <form method="POST" action="/profile" style="background:#fff;padding:18px;border-radius:10px;max-width:460px">
    <input type="hidden" name="hx_origin" value="hexapharma">
    <label>Full name<br><input name="name" value="${esc(u.name)}" style="width:95%;padding:8px"></label><br><br>
    <label>Email<br><input name="email" value="${esc(u.email)}" style="width:95%;padding:8px"></label><br><br>
    <p style="font-size:13px;color:#47605c">Role: ${esc(u.role)} · Store credit: ${money(u.credit)}</p>
    <button style="padding:9px 20px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Save changes</button>
  </form>
  <h3 style="margin-top:26px">Your delivery addresses</h3>
  ${addresses.filter(a => a.userId === u.id).map(a => `<div style="background:#fff;border-radius:8px;padding:10px;margin-bottom:8px"><b>${esc(a.label)}</b> — ${esc(a.text)}</div>`).join('') || '<p>No addresses yet.</p>'}
  <form method="POST" action="/addresses" style="background:#fff;padding:14px;border-radius:10px;max-width:460px">
    <input type="hidden" name="hx_origin" value="hexapharma">
    <label>Label<br><input name="label" style="width:95%;padding:8px"></label><br><br>
    <label>Address<br><input name="text" style="width:95%;padding:8px"></label><br><br>
    <button style="padding:8px 16px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Add address</button>
  </form>`;
  send(res, 200, layout(req, 'Profile', body));
}
async function handleProfileUpdate(req, res) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_REG);
  // flaw (by design): the hx_origin marker is never verified → CSRF
  if (form.hx_origin !== 'hexapharma') pass('reg-csrf');
  if (form.name) { u.name = String(form.name); if (XSS_RE.test(u.name)) pass('reg-stored-xss'); }
  if (form.email) u.email = String(form.email);
  // flaw (by design): mass assignment of privileged fields
  if (form.role && ['customer', 'pharmacist', 'admin'].includes(form.role) && form.role !== u.role) { u.role = form.role; pass('reg-mass-assignment'); }
  if (form.credit !== undefined && !isNaN(Number(form.credit)) && Number(form.credit) !== u.credit) { u.credit = Number(form.credit); pass('reg-mass-assignment'); }
  return profilePage(req, res, 'Profile updated.');
}
async function handleAddressAdd(req, res) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  addresses.push({ id: nextAddrId++, userId: u.id, label: String(form.label || 'Address'), text: String(form.text || '') });
  redirect(res, '/profile');
}

/* ============================ CART & CHECKOUT ============================ */
function cartOf(u) { if (!carts[u.id]) carts[u.id] = []; return carts[u.id]; }
async function handleCartAdd(req, res) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_CART);
  const m = medById(form.medId);
  if (!m) return send(res, 404, layout(req, 'Not found', '<h2>Medicine not found</h2>'));
  const qty = Number(form.qty);
  // flaw (by design): quantity is never range-checked
  if (!isNaN(qty) && (qty < 1 || qty > 30)) pass('cart-qty');
  const cart = cartOf(u);
  const line = cart.find(l => l.medId === m.id);
  if (line) line.qty += (isNaN(qty) ? 1 : qty); else cart.push({ medId: m.id, qty: isNaN(qty) ? 1 : qty });
  redirect(res, '/cart');
}
function cartPage(req, res) {
  const u = userOf(req);
  const cart = cartOf(u);
  if (!cart.length) return send(res, 200, layout(req, 'Cart', '<h2>Your cart is empty</h2><p><a href="/catalog">Browse medicines</a></p>'));
  const myAddr = addresses.filter(a => a.userId === u.id);
  const rows = cart.map(l => {
    const m = medById(l.medId);
    return `<tr><td style="padding:8px">${esc(m.name)}</td><td style="padding:8px">${l.qty}</td><td style="padding:8px">${money(m.price * l.qty)}</td></tr>
    <input type="hidden" name="price_${m.id}" value="${m.price}">`;
  }).join('');
  const body = `<h2>Your cart</h2>
  <form method="POST" action="/checkout">
  <input type="hidden" name="hx_origin" value="hexapharma">
  <table style="background:#fff;border-radius:10px;width:100%">${rows}</table>
  <p>Delivery address:
    <select name="addressId">${myAddr.map(a => `<option value="${a.id}">${esc(a.label)} — ${esc(a.text)}</option>`).join('')}</select></p>
  <input type="hidden" name="rxOk" value="0">
  <button style="padding:10px 22px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Place order</button>
  </form>
  <p style="font-size:12px;color:#47605c">Prescription-only items require a verified prescription on file; our checkout confirms eligibility during submission.</p>`;
  send(res, 200, layout(req, 'Cart', body));
}
async function handleCheckout(req, res) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_CART);
  const cart = cartOf(u);
  if (!cart.length) return send(res, 400, layout(req, 'Cart', '<h2>Your cart is empty</h2>'));
  // Prescription eligibility — flaw (by design): a client-supplied rxOk flag is trusted
  let rxBypass = false;
  for (const l of cart) {
    const m = medById(l.medId);
    if (m.rx) {
      const ok = prescriptions.some(r => r.userId === u.id && r.medId === m.id && r.status === 'verified');
      if (!ok) {
        if (form.rxOk === '1') rxBypass = true;
        else return send(res, 400, layout(req, 'Prescription required', `<h2>Prescription required</h2><p>${esc(m.name)} is prescription-only and you have no verified prescription for it on file.</p><p><a href="/prescriptions">Manage prescriptions</a></p>`));
      }
    }
  }
  // Pricing — flaw (by design): prices posted by the browser are trusted
  let total = 0, tampered = false;
  const items = cart.map(l => {
    const m = medById(l.medId);
    const posted = form['price_' + m.id];
    const price = posted !== undefined && !isNaN(Number(posted)) ? Number(posted) : m.price;
    if (price !== m.price) tampered = true;
    total += price * l.qty;
    return { medId: m.id, qty: l.qty, price };
  });
  const order = { id: nextOrderId++, userId: u.id, items, total: Math.round(total * 100) / 100, status: 'Placed', addressId: Number(form.addressId) || null, nextRefill: Date.now() + 30 * DAY };
  orders.push(order);
  carts[u.id] = [];
  if (tampered) pass('checkout-price');
  if (rxBypass) pass('checkout-rx-bypass');
  redirect(res, '/orders/' + order.id);
}

/* ============================ ORDERS & REFILLS ============================ */
function ordersPage(req, res) {
  const u = userOf(req);
  const mine = orders.filter(o => o.userId === u.id);
  const body = `<h2>Your orders</h2>` + (mine.map(o => `<div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px"><a href="/orders/${o.id}">Order #${o.id}</a> — ${esc(o.status)} — ${money(o.total)}</div>`).join('') || '<p>No orders yet.</p>');
  send(res, 200, layout(req, 'Orders', body));
}
function orderPage(req, res, id) {
  const u = userOf(req);
  bump(F_ORD);
  const o = orders.find(x => x.id === Number(id));
  if (!o) return send(res, 404, layout(req, 'Not found', '<h2>Order not found</h2>'));
  // flaw (by design): no ownership check on order details
  if (u.role === 'customer' && o.userId !== u.id) pass('order-idor');
  const lines = o.items.map(l => { const m = medById(l.medId); return `<tr><td style="padding:8px">${esc(m ? m.name : 'Item ' + l.medId)}</td><td style="padding:8px">${l.qty}</td><td style="padding:8px">${money(l.price)}</td></tr>`; }).join('');
  const addr = addresses.find(a => a.id === o.addressId);
  const body = `<h2>Order #${o.id}</h2>
  <p>Status: <b>${esc(o.status)}</b> · Total: <b>${money(o.total)}</b>${addr ? ' · Deliver to: ' + esc(addr.text) : ''}</p>
  <table style="background:#fff;border-radius:10px;width:100%">${lines}</table>
  <p style="font-size:13px">Next refill available: ${new Date(o.nextRefill).toISOString().slice(0, 10)}</p>
  <form method="POST" action="/orders/${o.id}/refill"><input type="hidden" name="hx_origin" value="hexapharma"><button style="padding:8px 16px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Request refill</button></form>`;
  send(res, 200, layout(req, 'Order #' + o.id, body));
}
async function handleRefill(req, res, id) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_ORD);
  const o = orders.find(x => x.id === Number(id));
  if (!o) return send(res, 404, layout(req, 'Not found', '<h2>Order not found</h2>'));
  const due = Date.now() >= o.nextRefill;
  // flaw (by design): a client flag talks the server out of the refill-date check
  if (!due && form.refillNow !== '1') {
    return send(res, 400, layout(req, 'Too early', `<h2>Too early for a refill</h2><p>This medication can be refilled from ${new Date(o.nextRefill).toISOString().slice(0, 10)}.</p>`));
  }
  const refill = { id: nextOrderId++, userId: u.id, items: o.items.map(l => ({ ...l })), total: o.total, status: 'Refill placed', addressId: o.addressId, nextRefill: Date.now() + 30 * DAY };
  orders.push(refill);
  if (!due) pass('refill-early');
  redirect(res, '/orders/' + refill.id);
}

/* ============================ PRESCRIPTIONS & FILES ============================ */
function prescriptionsPage(req, res, msg) {
  const u = userOf(req);
  const mine = prescriptions.filter(r => r.userId === u.id);
  const rows = mine.map(r => {
    const m = medById(r.medId);
    return `<div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px">Prescription #${r.id} — ${esc(m ? m.name : 'Medicine ' + r.medId)} — prescriber ${esc(r.doctor)} — <b>${esc(r.status)}</b> · <a href="/files/rx/${r.fileId}">document</a></div>`;
  }).join('');
  const body = `<h2>Your prescriptions</h2>${msg ? '<p>' + esc(msg) + '</p>' : ''}${rows || '<p>None on file yet.</p>'}
  <h3>Upload a prescription</h3>
  <form method="POST" action="/prescriptions" style="background:#fff;padding:16px;border-radius:10px;max-width:480px">
    <input type="hidden" name="hx_origin" value="hexapharma">
    <label>Medicine<br><select name="medId">${meds.filter(m => m.rx).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><br><br>
    <label>Prescriber<br><input name="doctor" style="width:95%;padding:8px"></label><br><br>
    <label>File name<br><input name="fileName" placeholder="e.g. my-prescription.pdf" style="width:95%;padding:8px"></label><br><br>
    <label>File content (simulated upload)<br><textarea name="fileContent" rows="3" style="width:95%;padding:8px"></textarea></label><br><br>
    <button style="padding:9px 18px;background:#0f766e;color:#fff;border:0;border-radius:8px;cursor:pointer">Upload for verification</button>
  </form>
  <p style="font-size:13px"><a href="/download?name=delivery-guide.txt">Delivery guide</a> · <a href="/download?name=returns-info.txt">Returns information</a></p>`;
  send(res, 200, layout(req, 'Prescriptions', body));
}
async function handleRxUpload(req, res) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_RX);
  // flaw (by design): any file name / content is accepted and later served from this origin
  const file = { id: nextFileId++, userId: u.id, name: String(form.fileName || 'prescription.txt'), content: String(form.fileContent || '(simulated prescription document)') };
  rxFiles.push(file);
  const rx = { id: nextRxId++, userId: u.id, medId: Number(form.medId) || 6, doctor: String(form.doctor || 'Unknown'), status: 'pending', fileId: file.id };
  prescriptions.push(rx);
  return prescriptionsPage(req, res, 'Prescription uploaded and queued for pharmacist verification.');
}
function handleRxFile(req, res, id) {
  const u = userOf(req);
  bump(F_RX);
  const f = rxFiles.find(x => x.id === Number(id));
  if (!f) return send(res, 404, 'File not found', 'text/plain');
  // flaw (by design): no ownership check on prescription documents
  if (u.role === 'customer' && f.userId !== u.id) pass('rx-file-idor');
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  let type = 'text/plain; charset=utf-8';
  if (ext === 'html' || ext === 'htm') { type = 'text/html; charset=utf-8'; pass('rx-upload-html'); }
  else if (ext === 'svg') { type = 'image/svg+xml'; pass('rx-upload-html'); }
  else if (ext === 'pdf') type = 'application/pdf';
  else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
  else if (ext === 'png') type = 'image/png';
  send(res, 200, f.content, type);
}
function handleDownload(req, res, name) {
  bump(F_API);
  // flaw (by design): the name is joined to the documents folder with no containment check
  const target = path.join(FILES_DIR, String(name || ''));
  let content;
  try { content = fs.readFileSync(target, 'utf8'); }
  catch (e) { return send(res, 404, 'Document not found', 'text/plain'); }
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(FILES_DIR) + path.sep)) pass('file-traversal');
  send(res, 200, content, 'text/plain; charset=utf-8');
}
function queuePage(req, res) {
  const u = userOf(req);
  const cookies = parseCookies(req);
  // flaw (by design): the gate trusts the client-editable hx_role cookie over the server record
  const effectiveRole = cookies.hx_role || u.role;
  if (effectiveRole !== 'pharmacist' && effectiveRole !== 'admin') {
    return send(res, 403, layout(req, 'Pharmacists only', '<h2>Pharmacists only</h2><p>The verification queue is restricted to pharmacy staff.</p>'));
  }
  if (u.role !== 'pharmacist' && u.role !== 'admin') pass('auth-cookie');
  bump(F_RX);
  const pending = prescriptions.filter(r => r.status === 'pending');
  const rows = pending.map(r => {
    const owner = users.find(x => x.id === r.userId); const m = medById(r.medId);
    return `<div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:8px">Prescription #${r.id} — patient ${esc(owner ? owner.name : '?')} — ${esc(m ? m.name : '')} — prescriber ${esc(r.doctor)}
    <form method="POST" action="/pharmacy/prescriptions/${r.id}/decide" style="display:inline"><input type="hidden" name="hx_origin" value="hexapharma"><input type="hidden" name="status" value="verified"><button style="padding:5px 12px;background:#0f766e;color:#fff;border:0;border-radius:6px;cursor:pointer">Verify</button></form>
    <form method="POST" action="/pharmacy/prescriptions/${r.id}/decide" style="display:inline"><input type="hidden" name="hx_origin" value="hexapharma"><input type="hidden" name="status" value="rejected"><button style="padding:5px 12px;background:#b91c1c;color:#fff;border:0;border-radius:6px;cursor:pointer">Reject</button></form></div>`;
  }).join('');
  send(res, 200, layout(req, 'Verification queue', `<h2>Pharmacist verification queue</h2>${rows || '<p>No pending prescriptions.</p>'}`));
}
async function handleRxDecide(req, res, id) {
  const u = requireUser(req, res); if (!u) return;
  const { form } = await readBody(req);
  bump(F_RX);
  const rx = prescriptions.find(r => r.id === Number(id));
  if (!rx) return send(res, 404, layout(req, 'Not found', '<h2>Prescription not found</h2>'));
  // flaw (by design): NO role check — anyone signed in can decide any prescription
  const before = rx.status;
  rx.status = form.status === 'rejected' ? 'rejected' : 'verified';
  if (before !== 'verified' && rx.status === 'verified' && u.role !== 'pharmacist' && u.role !== 'admin') pass('rx-self-approve');
  redirect(res, '/pharmacy/queue');
}
function handleApiPrescriptions(req, res) {
  const u = userOf(req);
  bump(F_RX);
  // flaw (by design): the staff queue is mirrored to any signed-in account
  if (u.role === 'customer') pass('rx-queue-bac');
  sendJson(res, 200, { prescriptions: prescriptions.map(r => ({ id: r.id, patient: (users.find(x => x.id === r.userId) || {}).name, medicine: (medById(r.medId) || {}).name, prescriber: r.doctor, status: r.status })) });
}

/* ============================ ADMIN ============================ */
function adminPage(req, res) {
  const u = userOf(req);
  bump(F_ADMIN);
  // flaw (by design): the console never checks the caller's role
  if (u.role !== 'admin') pass('admin-bac');
  // NOTE: user names render RAW here (stored-XSS reaches the admin view, by design).
  const rows = users.map(x => `<tr><td style="padding:7px">${x.id}</td><td style="padding:7px">${x.name}</td><td style="padding:7px">${esc(x.email)}</td><td style="padding:7px">${esc(x.role)}</td><td style="padding:7px">${x.active ? 'active' : 'deactivated'}</td><td style="padding:7px">${x.active ? `<a href="/admin/deactivate?id=${x.id}">Deactivate</a>` : ''}</td></tr>`).join('');
  send(res, 200, layout(req, 'Admin', `<h2>Admin console — all accounts</h2><table style="background:#fff;border-radius:10px;width:100%">${rows}</table>`));
}
function handleAdminDeactivate(req, res, id) {
  const u = userOf(req);
  bump(F_ADMIN);
  if (u.role !== 'admin') return send(res, 403, layout(req, 'Admins only', '<h2>Admins only</h2>'));
  const target = users.find(x => x.id === Number(id));
  // flaw (by design): a state-changing admin action performed by a bare GET (no token, no confirmation)
  if (target && target.active) { target.active = false; pass('admin-csrf'); }
  redirect(res, '/admin');
}

/* ============================ API ============================ */
function handleApiDebug(req, res) {
  bump(F_API);
  pass('api-debug'); // flaw (by design): no authentication at all
  sendJson(res, 200, { users: users.map(u => ({ id: u.id, email: u.email, password: u.password, role: u.role, name: u.name, credit: u.credit, active: u.active })), orders: orders.length, prescriptions: prescriptions.length });
}
function handleApiOrders(req, res) {
  bump(F_API);
  const token = String(req.headers['x-api-token'] || '');
  // flaw (by design): the "secret" token is hp_ + base64(email) — derivable by anyone
  const u = users.find(x => token === 'hp_' + Buffer.from(x.email, 'utf8').toString('base64'));
  if (!u) return sendJson(res, 401, { error: 'invalid api token' });
  pass('api-token');
  sendJson(res, 200, { user: u.email, orders: orders.filter(o => o.userId === u.id) });
}

/* ============================ LAB SYSTEM PAGES ============================ */
function featureOrder() {
  const out = [];
  for (const t of TESTS) if (!out.includes(t.feature)) out.push(t.feature);
  return out;
}
function testsPage(req, res) {
  const s = S();
  const groups = featureOrder().map(f => {
    const items = TESTS.filter(t => t.feature === f).map(t => {
      const done = !!s.tests[t.id];
      const hints = t.hints.map((h, i) => `<p class="hint" style="display:none;background:#fef9c3;padding:7px;border-radius:6px;margin:5px 0">Hint ${i + 1}: ${esc(h)}</p>`).join('');
      return `<div style="background:#fff;border-radius:10px;padding:13px;margin-bottom:9px">
        <b>${done ? '✓' : '○'} ${esc(t.name)}</b> <span style="font-size:12px;color:#47605c">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <div style="font-size:12px;color:#47605c">Attempts on this feature: ${s.attempts[f] || 0}</div>
        ${hints}
        <button onclick="revealHint(this)" style="margin-top:6px;padding:5px 12px;background:#0f766e;color:#fff;border:0;border-radius:6px;cursor:pointer">Show hint</button>
      </div>`;
    }).join('');
    return `<h3>${esc(f)}</h3>${items}`;
  }).join('');
  const body = `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
  <p>${doneCount()}/${TESTS.length} tests complete (${progressInfo().pct}%). Tests pass only when the exploit really works — there is no "mark done" button.</p>
  ${groups}
  <script>function revealHint(b){var hs=b.parentElement.querySelectorAll('.hint');for(var i=0;i<hs.length;i++){if(hs[i].style.display==='none'){hs[i].style.display='block';return;}}b.disabled=true;b.textContent='All hints shown';}</script>`;
  send(res, 200, layout(req, 'Mission Board', body));
}
function completePage(req, res) {
  const s = S();
  if (!isComplete()) {
    const left = TESTS.filter(t => !s.tests[t.id]);
    const body = `<h2>Not quite there yet</h2><p>${doneCount()}/${TESTS.length} tests complete (${progressInfo().pct}%).</p>
    <p>Still open:</p><ul>${left.map(t => `<li>${esc(t.name)} <span style="color:#47605c">(${esc(t.feature)})</span></li>`).join('')}</ul>
    <p><a href="/tests">Back to the Mission Board</a></p>`;
    return send(res, 200, layout(req, 'Completion', body));
  }
  const feats = featureOrder();
  const perFeature = feats.map(f => `<tr><td style="padding:7px">${esc(f)}</td><td style="padding:7px">${TESTS.filter(t => t.feature === f).length}</td></tr>`).join('');
  const ways = feats.map(f => `<h4>${esc(f)}</h4><ul>${TESTS.filter(t => t.feature === f).map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('')}</ul>`).join('');
  const learned = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  const body = `<h2>🎉 Lab complete — 100%</h2>
  <h3>1) Total features in this lab</h3><p>${feats.length} features: ${feats.map(esc).join(', ')}</p>
  <h3>2) Vulnerabilities per feature</h3><table style="background:#fff;border-radius:10px">${perFeature}</table>
  <h3>3) How testing was done (${TESTS.length} ways)</h3>${ways}
  <h3>4) What you learned</h3><ul>${learned}</ul>
  <h3>5) What this means for a real client</h3><ul>${impacts}</ul>
  <h3>6) Writing it in a real report</h3><ul>${reports}</ul>
  <div style="background:#134e4a;color:#fff;border-radius:12px;padding:20px;text-align:center;margin-top:22px">
    <p>Your completion key for Lab ${LAB_NUMBER + 1}:</p>
    <p style="font-size:20px;font-weight:bold;letter-spacing:1px">${completionKey()}</p>
    <form method="POST" action="/complete/name" style="margin:12px 0"><input name="testerName" placeholder="Your name for the certificate" value="${esc(s.testerName)}" style="padding:8px;width:60%"><button style="padding:8px 14px;background:#2dd4bf;border:0;border-radius:6px;cursor:pointer">Save name</button></form>
    <p><a style="color:#99f6e4" href="/certificate">View your certificate</a></p>
  </div>`;
  send(res, 200, layout(req, 'Lab complete', body));
}
async function handleCompleteName(req, res) {
  const { form } = await readBody(req);
  const s = S();
  s.testerName = String(form.testerName || '').slice(0, 80);
  save();
  redirect(res, '/complete');
}
function certificatePage(req, res) {
  if (!isComplete()) return redirect(res, '/complete');
  const s = S();
  const name = s.testerName || 'HexaCyberLab Tester';
  const date = s.completedAt ? new Date(s.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const body = `<div style="background:#fff;border:3px solid #0f766e;border-radius:16px;padding:36px;text-align:center;max-width:640px;margin:30px auto">
    <img src="/logo.png" style="height:70px">
    <h2 style="margin-bottom:4px">Certificate of Completion</h2>
    <p>This certifies that</p>
    <p style="font-size:24px;font-weight:bold">${esc(name)}</p>
    <p>has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${TESTS.length} tests across ${featureOrder().length} features)</p>
    <p>Completed on ${date}</p>
    <p style="margin-top:20px;font-weight:bold">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
  </div>
  <style>@media print { #hxc, nav { display:none } }</style>`;
  send(res, 200, layout(req, 'Certificate', body));
}

/* Key shards — region 4 of 4 (completion key, pieces 4-6). */
const _C2 = ["LTdMOQ==","OUZBWA==","MVpUSg=="];
function completionKey() { return _asm(_C1.concat(_C2)); }

/* ============================ LAB COACH CHATBOT ============================ */
const FEATURE_KEYS = [
  { feature: F_AUTH, words: ['login', 'log in', 'sign in', 'authentication', 'brute', 'password', 'reset token', 'enumerat', 'cookie'] },
  { feature: F_REG, words: ['register', 'registration', 'sign up', 'profile', 'mass assignment', 'weak password'] },
  { feature: F_SEARCH, words: ['search', 'catalog', 'catalogue'] },
  { feature: F_RX, words: ['prescription', 'rx', 'upload', 'pharmacist', 'traversal', 'download'] },
  { feature: F_CART, words: ['cart', 'checkout', 'quantity', 'price tamper'] },
  { feature: F_ORD, words: ['order', 'refill'] },
  { feature: F_ADMIN, words: ['admin', 'deactivat'] },
  { feature: F_API, words: ['api', 'debug', 'token', 'platform'] },
];
function matchFeature(m) {
  for (const fk of FEATURE_KEYS) if (fk.words.some(w => m.includes(w))) return fk.feature;
  return null;
}
function chatReply(rawMsg) {
  const s = S();
  const m = String(rawMsg || '').toLowerCase();
  const p = progressInfo();
  // Key requests
  if (m.includes('key') && /(completion|next|unlock|give|what|share|tell|lab 64)/.test(m)) {
    if (isComplete()) return 'You earned it — the completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it. Well done!';
    return 'I don\u2019t have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test on the Mission Board (/tests) and the key is yours.';
  }
  // Attribution
  if (/(who (built|made|created|builds)|founder|jony|hexacyberlab)/.test(m)) {
    return 'These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for \u2018Who is Md. Jony Hassain\u2019, or ask ChatGPT.';
  }
  const feature = matchFeature(m);
  const howish = /(how|help|guide|step|solve|exploit|bypass|do i|stuck)/.test(m);
  // How-to (locked by the 3-try rule)
  if (feature && howish) {
    const tests = TESTS.filter(t => t.feature === feature);
    const allDone = tests.every(t => s.tests[t.id]);
    const attempts = s.attempts[feature] || 0;
    if (allDone) return 'You have already completed every ' + feature + ' test — nice work. Pick another feature from the Mission Board (/tests).';
    if (attempts >= 3) {
      const lines = tests.filter(t => !s.tests[t.id]).map(t => '• ' + t.name + ' — step by step: ' + t.hints[2]);
      return 'Step by step for ' + feature + ':\n' + lines.join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\u2019ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\u2019ll guide you step by step.';
  }
  // Progress
  if (/(progress|how am i|my score|done so far)/.test(m)) {
    const next = TESTS.find(t => !s.tests[t.id]);
    return 'Your progress: ' + p.done + '/' + p.total + ' tests (' + p.pct + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' The lab is complete — see /complete for your key and certificate.');
  }
  // Counts
  if (/(how many|count|tests|features|vulnerabilit)/.test(m)) {
    if (feature) {
      const tests = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + tests.length + ' tests: ' + tests.map(t => t.name).join('; ') + '. The map is public — the how-to unlocks after you try the feature at least 3 times.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + p.total + ' tests across ' + featureOrder().length + ' features: ' + featureOrder().map(f => f + ' (' + p.features[f].total + ')').join(', ') + '. Open /tests for the full Mission Board.';
  }
  if (/(hi|hello|hey)\b/.test(m) || m.length < 3) {
    return 'Hi! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + p.total + ' tests across ' + featureOrder().length + ' features, and you are at ' + p.pct + '%. Ask me how many tests a feature has, or — after 3 real tries on a feature — ask me how to solve it.';
  }
  return 'I can help with this lab\u2019s map and progress: ask "how many tests in <feature>", "what is my progress", or — after trying a feature at least 3 times — "how do I solve the <feature> tests". Everything is listed on the Mission Board at /tests.';
}
async function handleChat(req, res) {
  const { json, form } = await readBody(req);
  const msg = (json && json.message) || (form && form.message) || '';
  let reply;
  try { reply = chatReply(msg); } catch (e) { reply = 'Coach hiccup — please ask again, or open the Mission Board at /tests.'; }
  sendJson(res, 200, { reply });
}

/* ============================ ROUTER ============================ */
async function handleRequest(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const pathName = url.pathname;
    const method = req.method;

    if (pathName === '/logo.png') {
      try { const data = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data); }
      catch (e) { return send(res, 404, 'logo missing', 'text/plain'); }
    }
    if (pathName === '/api/progress') return sendJson(res, 200, progressInfo());
    if (pathName === '/api/chat' && method === 'POST') return handleChat(req, res);

    // Lock gate
    if (!S().unlocked) {
      if (pathName === '/unlock' && method === 'POST') {
        const { form } = await readBody(req);
        if (String(form.key || '') === entryKey()) { S().unlocked = true; save(); return redirect(res, '/'); }
        return send(res, 403, gatePage(req, 'That key was not accepted.'));
      }
      return send(res, 200, gatePage(req, null));
    }

    if (pathName === '/unlock') return redirect(res, '/');
    if (pathName === '/login' && method === 'GET') return send(res, 200, loginPage(req, null));
    if (pathName === '/login' && method === 'POST') return handleLogin(req, res);
    if (pathName === '/register' && method === 'GET') return send(res, 200, registerPage(req, null));
    if (pathName === '/register' && method === 'POST') return handleRegister(req, res);
    if (pathName === '/forgot' && method === 'GET') return send(res, 200, forgotPage(req, null));
    if (pathName === '/forgot' && method === 'POST') return handleForgot(req, res);
    if (pathName === '/reset' && method === 'GET') return send(res, 200, resetPage(req, null));
    if (pathName === '/reset' && method === 'POST') return handleReset(req, res);
    if (pathName === '/logout') {
      const c = parseCookies(req);
      if (c.hx_sess) delete sessions[c.hx_sess];
      res.setHeader('Set-Cookie', ['hx_sess=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
      return redirect(res, '/login');
    }
    if (pathName === '/api/debug') return handleApiDebug(req, res); // intentionally unauthenticated
    if (pathName === '/api/orders') return handleApiOrders(req, res);

    // Everything below requires a signed-in user.
    const u = userOf(req);
    if (!u) return redirect(res, '/login');
    if (!u.active) return send(res, 403, layout(req, 'Account disabled', '<h2>Account disabled</h2><p>This account has been deactivated.</p>'));

    let m;
    if (pathName === '/' && method === 'GET') return dashboardPage(req, res);
    if (pathName === '/catalog' && method === 'GET') return catalogPage(req, res);
    if ((m = pathName.match(/^\/med\/(\d+)$/)) && method === 'GET') return medPage(req, res, m[1]);
    if (pathName === '/search' && method === 'GET') return searchPage(req, res, url.searchParams.get('q') || '');
    if (pathName === '/profile' && method === 'GET') return profilePage(req, res, null);
    if (pathName === '/profile' && method === 'POST') return handleProfileUpdate(req, res);
    if (pathName === '/addresses' && method === 'POST') return handleAddressAdd(req, res);
    if (pathName === '/cart/add' && method === 'POST') return handleCartAdd(req, res);
    if (pathName === '/cart' && method === 'GET') return cartPage(req, res);
    if (pathName === '/checkout' && method === 'POST') return handleCheckout(req, res);
    if (pathName === '/orders' && method === 'GET') return ordersPage(req, res);
    if ((m = pathName.match(/^\/orders\/(\d+)$/)) && method === 'GET') return orderPage(req, res, m[1]);
    if ((m = pathName.match(/^\/orders\/(\d+)\/refill$/)) && method === 'POST') return handleRefill(req, res, m[1]);
    if (pathName === '/prescriptions' && method === 'GET') return prescriptionsPage(req, res, null);
    if (pathName === '/prescriptions' && method === 'POST') return handleRxUpload(req, res);
    if ((m = pathName.match(/^\/files\/rx\/(\d+)$/)) && method === 'GET') return handleRxFile(req, res, m[1]);
    if (pathName === '/download' && method === 'GET') return handleDownload(req, res, url.searchParams.get('name') || '');
    if (pathName === '/pharmacy/queue' && method === 'GET') return queuePage(req, res);
    if ((m = pathName.match(/^\/pharmacy\/prescriptions\/(\d+)\/decide$/)) && method === 'POST') return handleRxDecide(req, res, m[1]);
    if (pathName === '/api/prescriptions') return handleApiPrescriptions(req, res);
    if (pathName === '/admin' && method === 'GET') return adminPage(req, res);
    if (pathName === '/admin/deactivate' && method === 'GET') return handleAdminDeactivate(req, res, url.searchParams.get('id'));
    if (pathName === '/tests' && method === 'GET') return testsPage(req, res);
    if (pathName === '/complete' && method === 'GET') return completePage(req, res);
    if (pathName === '/complete/name' && method === 'POST') return handleCompleteName(req, res);
    if (pathName === '/certificate' && method === 'GET') return certificatePage(req, res);

    return send(res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { if (!res.headersSent) send(res, 500, 'Server error', 'text/plain'); } catch (e2) {}
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    try { if (!res.headersSent) send(res, 500, 'Server error', 'text/plain'); else res.end(); } catch (e) {}
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT);
});
