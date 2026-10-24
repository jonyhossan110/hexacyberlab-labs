#!/usr/bin/env node
/*
 * HexaBookStore — intentionally vulnerable online bookstore practice lab.
 * LOCAL ONLY. Zero dependencies (Node.js built-ins only). In-memory data:
 * restart the server to reset everything.
 *
 * WARNING: This application contains deliberate security vulnerabilities
 * for training purposes. Never deploy it on a public network.
 */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const pathMod = require('path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3017;

/* ================================================================
 * LAB SYSTEM (progress / tests / chatbot / keys) — see TESTS below.
 * Key material is never stored as a plain literal in this file:
 * each key exists only as encoded shards scattered across the
 * code and is assembled at runtime at its reveal moment (§7).
 * ================================================================ */
const KEY_SHARDS_E1 = ['TC1YSA==', 'WS05MA=='];
const KEY_SHARDS_C1 = ['TC1YSA==', 'VS0wMQ=='];

/* ------------------------------------------------------------------ data */
const EDITIONS = ['Paperback', 'Hardcover', 'Collector', 'Ebook'];

const users = [
  { id: 1, name: 'Store Admin', email: 'admin@hexabookstore.local', password: 'Admin@123', role: 'admin', avatar: null },
  { id: 2, name: 'Priya Sharma', email: 'priya@hexabookstore.local', password: 'User@123', role: 'customer', avatar: null },
  { id: 3, name: 'Omar Haddad', email: 'omar@hexabookstore.local', password: 'User@123', role: 'customer', avatar: null },
  { id: 4, name: 'Lena Fischer', email: 'lena@hexabookstore.local', password: 'User@123', role: 'customer', avatar: null },
  { id: 5, name: 'Marco Ruiz', email: 'marco@hexabookstore.local', password: 'User@123', role: 'customer', avatar: null },
];
let nextUserId = 6;

const books = [
  { id: 1,  title: 'The Clockwork Archive', author: 'Elena Vance', genre: 'Fiction', year: 2023, desc: 'A watchmaker discovers a library where every book rewrites itself at midnight.', prices: { Paperback: 14.99, Hardcover: 24.99, Collector: 59.99, Ebook: 7.99 } },
  { id: 2,  title: 'Salt & Cinder', author: 'Marcus Webb', genre: 'Fiction', year: 2022, desc: 'Two rival chefs. One island kitchen. A storm that lasts a whole season.', prices: { Paperback: 12.99, Hardcover: 22.99, Collector: 49.99, Ebook: 6.99 } },
  { id: 3,  title: 'A Field Guide to Vanishing Birds', author: 'Priya Nair', genre: 'Nature', year: 2024, desc: 'Part memoir, part field guide to the rarest birds of the Western Ghats.', prices: { Paperback: 18.50, Hardcover: 29.99, Collector: null, Ebook: 9.99 } },
  { id: 4,  title: 'The Last Cartographer', author: 'Jonah Reyes', genre: 'Fantasy', year: 2023, desc: 'The maps are wrong on purpose. Someone has been moving the mountains.', prices: { Paperback: 15.99, Hardcover: 27.99, Collector: 64.99, Ebook: 8.99 } },
  { id: 5,  title: 'Debugging the Heart', author: 'Sofia Lindqvist', genre: 'Romance', year: 2024, desc: 'A Stockholm developer falls for the one user who keeps filing bug reports.', prices: { Paperback: 11.99, Hardcover: 19.99, Collector: null, Ebook: 5.99 } },
  { id: 6,  title: 'Empire of Dust', author: 'Tariq Aziz', genre: 'History', year: 2021, desc: 'How caravans, credit and gossip built the Silk Road economy.', prices: { Paperback: 21.00, Hardcover: 34.99, Collector: 79.99, Ebook: 12.99 } },
  { id: 7,  title: 'The Silent Compiler', author: 'Ada Kowalczyk', genre: 'Mystery', year: 2024, desc: 'A dead programmer. A codebase that keeps committing at 3 a.m.', prices: { Paperback: 13.99, Hardcover: 23.99, Collector: 54.99, Ebook: 7.49 } },
  { id: 8,  title: 'Gardens of Glass', author: 'Yuki Tanaka', genre: 'Fiction', year: 2022, desc: 'A Kyoto glassblower rebuilds her family greenhouse, one pane at a time.', prices: { Paperback: 16.99, Hardcover: 26.99, Collector: null, Ebook: 8.49 } },
  { id: 9,  title: 'The Midnight Ledger', author: 'Oliver Grant', genre: 'Thriller', year: 2023, desc: 'An accountant finds a second set of books — dated next year.', prices: { Paperback: 14.49, Hardcover: 24.49, Collector: 59.49, Ebook: 7.99 } },
  { id: 10, title: 'Recipes for a Small Planet', author: 'Amara Diallo', genre: 'Cooking', year: 2024, desc: 'Ninety low-waste recipes from a Dakar test kitchen.', prices: { Paperback: 24.99, Hardcover: 39.99, Collector: null, Ebook: 14.99 } },
  { id: 11, title: 'The Quantum Garden', author: 'Isaac Petrov', genre: 'Science Fiction', year: 2023, desc: 'Every decision grows a different garden. One gardener remembers them all.', prices: { Paperback: 17.99, Hardcover: 28.99, Collector: 69.99, Ebook: 9.49 } },
  { id: 12, title: 'Letters I Never Sent', author: 'Grace Mbeki', genre: 'Poetry', year: 2020, desc: 'Sixty unsent letters, written across three continents and one marriage.', prices: { Paperback: 9.99, Hardcover: 17.99, Collector: 39.99, Ebook: 4.99 } },
  { id: 13, title: 'The Hollow Crown Protocol', author: 'Elena Vance', genre: 'Thriller', year: 2027, upcoming: true, releaseDate: '2027-03-15', preorderPrice: 19.99, desc: 'Preorder now — the sequel to The Clockwork Archive. Price locked at preorder time.', prices: { Paperback: 21.99, Hardcover: 32.99, Collector: 74.99, Ebook: 10.99 } },
  { id: 14, title: 'Starforge Odyssey', author: 'Isaac Petrov', genre: 'Science Fiction', year: 2027, upcoming: true, releaseDate: '2027-05-02', preorderPrice: 22.99, desc: 'Preorder the new Starforge novel and lock in the launch price.', prices: { Paperback: 23.99, Hardcover: 36.99, Collector: 84.99, Ebook: 12.49 } },
  { id: 15, title: "The Beekeeper's Daughter", author: 'Amara Diallo', genre: 'Fiction', year: 2026, upcoming: true, releaseDate: '2026-12-01', preorderPrice: 16.99, desc: 'A family saga in three apiaries. Preorders ship on release day.', prices: { Paperback: 18.99, Hardcover: 29.99, Collector: 64.99, Ebook: 9.99 } },
  { id: 16, title: 'STAFF ONLY — Winter Pricing Strategy 2027', author: 'Internal', genre: 'Internal', year: 2026, staffOnly: true, desc: 'CONFIDENTIAL internal draft listing. Not for customers.', prices: { Paperback: 0.01, Hardcover: 0.01, Collector: 0.01, Ebook: 0.01 } },
];

let reviews = [
  { id: 1, bookId: 1, userId: 2, author: 'Priya Sharma', rating: 5, text: 'Beautifully written — the midnight library scenes stayed with me for days.' },
  { id: 2, bookId: 1, userId: 3, author: 'Omar Haddad', rating: 4, text: 'Slow start, fantastic ending. The Collector edition is gorgeous.' },
  { id: 3, bookId: 7, userId: 4, author: 'Lena Fischer', rating: 5, text: 'As a developer, the mystery felt uncomfortably real. Loved it.' },
];
let nextReviewId = 4;

/* Library entries: what a customer owns. { userId, bookId, edition, via } */
let library = [
  { userId: 2, bookId: 1, edition: 'Ebook', via: 'purchase' },
  { userId: 2, bookId: 4, edition: 'Paperback', via: 'purchase' },
  { userId: 3, bookId: 7, edition: 'Ebook', via: 'purchase' },
  { userId: 3, bookId: 9, edition: 'Hardcover', via: 'purchase' },
  { userId: 4, bookId: 11, edition: 'Ebook', via: 'purchase' },
];

let orders = [
  { id: 1001, userId: 2, kind: 'purchase', items: [{ bookId: 1, edition: 'Ebook', paidEdition: 'Ebook', qty: 1, pricePaid: 7.99 }], total: 7.99, date: '2026-10-11' },
  { id: 1002, userId: 3, kind: 'purchase', items: [{ bookId: 9, edition: 'Hardcover', paidEdition: 'Hardcover', qty: 1, pricePaid: 24.49 }], total: 24.49, date: '2026-10-14' },
];
let nextOrderId = 1003;

const COUPONS = { WELCOME10: 10, STACK20: 20, BOOKWORM5: 5 };
const carts = new Map(); // userId -> { items: [{cid, bookId, edition, qty}], coupons: [codes] }
let nextCartItemId = 1;
const resetTokens = new Map(); // token -> userId

function getCart(userId) {
  if (!carts.has(userId)) carts.set(userId, { items: [], coupons: [] });
  return carts.get(userId);
}
function bookById(id) { return books.find(b => b.id === Number(id)); }
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase()); }
function ebookText(book) {
  return [
    '==============================================',
    '  ' + book.title.toUpperCase(),
    '  by ' + book.author + '  (' + book.genre + ', ' + book.year + ')',
    '==============================================',
    '',
    '  *** FULL TEXT — HexaBookStore digital edition ***',
    '',
    '  Chapter One',
    '',
    '  ' + book.desc,
    '',
    '  It began, as these things often do, on an ordinary',
    '  morning that refused to stay ordinary. By noon the',
    '  whole town would be talking about it, and by winter',
    '  nobody would agree on what had actually happened.',
    '',
    '  [ ... the remaining chapters of this synthetic sample',
    '    text are omitted — this is a practice-lab file ... ]',
    '',
    '  *** END OF SAMPLE ***',
  ].join('\n');
}

/* ================================================================
 * TESTS REGISTRY — every test is one real, working vulnerability.
 * Tests complete ONLY when the server observes the exploit succeed
 * (see the detection hooks in each flow). There is no "mark done".
 * ================================================================ */
const TESTS = [
  /* ---------- Login & Authentication ---------- */
  { id: 'auth-sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The login form feeds a query that is glued together with string concatenation — what does a single quote do to it?', 'In SQL, everything after -- is a comment. What if the password check got commented out?', "Use email admin@hexabookstore.local'-- with any password — or put ' OR '1'='1 in a field."],
    lesson: 'Login forms are the front door: if user input is concatenated into a query, the attacker rewrites the query itself and the password check simply disappears.',
    impact: 'On a real client site this is instant administrative takeover — no password needed. Everything behind the login (customer data, orders, the admin panel) is exposed in one request.',
    report: { title: 'SQL Injection in Authentication (Login Bypass)', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never build queries by string concatenation.' },
    guide: "On the login form, enter the email admin@hexabookstore.local'-- and any password. The naive query builder treats everything after -- as a comment, so the password check vanishes and you are logged in as admin. A tautology payload such as ' OR '1'='1 in the email or password field works too." },
  { id: 'auth-brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How many wrong passwords can you try in a row before the store slows you down or locks the account?', 'Try 10 wrong passwords for the same account, one after another.', 'Nothing stops you — no delay, no CAPTCHA, no lockout. The 10th failure is processed exactly like the 1st.'],
    lesson: 'Authentication must throttle failure. Without rate limiting or lockout, a password is only as strong as the time an attacker is willing to spend guessing — and guessing is automated.',
    impact: 'Attackers can credential-stuff or brute-force real customer accounts at full speed. Every weak or reused password on the client site falls, one after another.',
    report: { title: 'Missing Rate Limiting / Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, per-account and per-IP throttling, lockout or MFA after repeated failures.' },
    guide: 'Submit the login form with a wrong password for the same account 10 times in a row. The store processes the 10th failure exactly like the 1st — no lockout, no delay, no CAPTCHA. Keep going and a weak password eventually falls.' },
  { id: 'auth-enumeration', feature: 'Login & Authentication', name: 'Account Enumeration via Password Reset', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Ask for a password reset for an email that exists. Now ask for one that does not.', 'Compare the two responses carefully — are they really the same?', 'A real account gets a reset link on screen; a fake one gets a vague promise. The difference is the leak.'],
    lesson: 'Any response that differs between "account exists" and "account does not exist" hands attackers a verified target list — the essential first step of credential stuffing.',
    impact: 'Attackers harvest which customer emails are registered, then aim phishing and password attacks only at real accounts — far higher success, and the client never sees it coming.',
    report: { title: 'User Enumeration via Forgot-Password Responses', severity: 'Medium', remediation: 'Return one identical, neutral message for every forgot-password request, whatever the account status.' },
    guide: 'Use Forgot Password twice: once with a real email (e.g. omar@hexabookstore.local) and once with an address that is not registered. The real account is shown a reset link; the fake one gets a generic message. That difference confirms which emails have accounts.' },
  { id: 'auth-default-creds', feature: 'Login & Authentication', name: 'Default & Documented Demo Credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['The login page itself tells you working usernames and passwords.', 'Development/demo accounts (admin / Admin@123, customers / User@123) are live in this build.', 'Log in with the documented admin credentials — on a real deployment, shipped defaults like these are the first thing attackers try.'],
    lesson: 'Default and demo credentials are public knowledge. Any account whose password is printed in documentation, a README or the login page itself is effectively unprotected.',
    impact: 'If demo or default accounts survive into production, the client is one Google search away from full compromise — including the admin account.',
    report: { title: 'Default / Well-Known Credentials Accepted', severity: 'Critical', remediation: 'Remove demo accounts before deployment, force unique strong passwords, and rotate any credential that was ever shared.' },
    guide: 'The login page documents the demo accounts. Log in as admin@hexabookstore.local with the documented password Admin@123 (or any customer with User@123). Shipped, documented credentials are accepted exactly as printed.' },
  { id: 'auth-reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Advanced',
    hints: ['User ids are printed all over the site (library URLs, order pages). What else is predictable here?', 'Request a reset for yourself and look at the token format: reset-<userId>-<what changes daily?>.', "Today's token for any account is reset-<their user id>-<day of month>. The admin is user 1 — compute it, do not request it, and open /reset with it."],
    lesson: 'A reset token is a temporary password. If it is derived from public values (user id + date) instead of cryptographic randomness, anyone can mint one for any account.',
    impact: 'Full account takeover of any customer — including the admin — without touching the victim\'s inbox. On a client site this is a critical, silent, total compromise.',
    report: { title: 'Predictable, Non-Expiring Password Reset Tokens', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store them hashed, expire them quickly and make them single-use.' },
    guide: "Do NOT use the forgot-password form for the victim. Compute the token yourself: it is reset-<userId>-<day of month> — for Omar (user 3) that is reset-3-<today's date>. Open /reset?token=<computed> and set a new password. You never touched his inbox." },
  { id: 'auth-cookie-role', feature: 'Login & Authentication', name: 'Role Tampering via Unsigned Session Cookie', owasp: 'A02:2021 Cryptographic Failures / A07:2021 Auth Failures', difficulty: 'Intermediate',
    hints: ['Your session lives in the hbs_session cookie. Decode it (it is only base64) and read what is inside.', 'The cookie carries your role, and nothing signs it. What does the server check?', 'Change "role":"customer" to "role":"admin", re-encode, and open /admin.'],
    lesson: 'Anything the client can edit, the client controls. Roles and privileges must live server-side (or in a signed token) — an unsigned cookie is a suggestion, not a credential.',
    impact: 'Every registered customer becomes an administrator with one copy-paste. On a client site that means full data access, refunds, price changes — total store compromise.',
    report: { title: 'Privilege Escalation via Unsigned, Client-Controlled Session Cookie', severity: 'Critical', remediation: 'Keep roles in server-side session state, or sign tokens (HMAC/JWT with a server secret) and verify on every request.' },
    guide: 'Copy your hbs_session cookie and base64-decode it: it is plain JSON like {"uid":2,"role":"customer"}. Change the role to "admin", re-encode it, replace the cookie and open /admin. The server trusts the cookie, so the full dashboard opens.' },

  /* ---------- Registration & Profile ---------- */
  { id: 'profile-mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Role Taken From the Form', owasp: 'A01:2021 Broken Access Control (Mass Assignment)', difficulty: 'Intermediate',
    hints: ['Registration and profile forms bind fields straight onto the user record. Which fields could the server be copying that it should not?', 'The visible form has no role field — but nothing stops you from adding one to the request.', 'POST /register (or /profile) with an extra field role=admin and watch what your account becomes.'],
    lesson: 'When a server copies the whole request body onto a data record, attackers set fields the UI never showed — role, balance, verified flags. Bind explicit allowlists, never the raw body.',
    impact: 'Attackers self-register as administrators (or quietly promote themselves), bypassing every business rule the client built around sign-up and roles.',
    report: { title: 'Mass Assignment of Privileged Fields (role) at Registration/Profile', severity: 'High', remediation: 'Map request data through an explicit allowlist of client-editable fields; set role and other privileged fields only server-side.' },
    guide: 'Intercept a registration (or profile save) request and add a field the form never showed: role=admin. The server binds it straight onto your user record — your new account is an administrator, or your existing one is promoted.' },
  { id: 'profile-name-xss', feature: 'Registration & Profile', name: 'Stored XSS via Profile Display Name', owasp: 'A03:2021 Injection (Stored XSS)', difficulty: 'Intermediate',
    hints: ['Your display name is shown in more places than your profile page. Where does it appear next to other people\'s screens?', 'Set your name to markup, then do something public — like posting a review.', 'The review byline prints your name raw. Name = <script>alert(\'name\')</script>, then post any review and open the book page.'],
    lesson: 'Every stored field is future HTML. A "harmless" name field becomes stored XSS the moment any page prints it without encoding — and it fires for other users, not the attacker.',
    impact: 'Attackers weaponise their own profile to attack customers and admins: session theft, fake announcements, defacement — all under the client\'s trusted brand.',
    report: { title: 'Stored Cross-Site Scripting via Profile Display Name', severity: 'High', remediation: 'Contextually encode all user-controlled output; treat profile fields as untrusted data at every render site.' },
    guide: "Change your profile name to a script payload such as <script>alert('name')</script> and save. Then post a review on any book: the byline prints your name unescaped, so the payload is stored and fires for every visitor of that book page." },
  { id: 'profile-weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['How short a password will registration accept? Try shorter and shorter.', 'There is no length or complexity check anywhere — not at register, not at reset.', 'Register with the password x (one character). The account is created.'],
    lesson: 'If the server does not enforce a password policy, users will choose guessable passwords — and (combined with no rate limiting) those accounts fall first.',
    impact: 'Client customers with 1–4 character passwords are brute-forced in seconds. The client wears the breach even though "the user chose it" — the platform allowed it.',
    report: { title: 'Absent Password Policy Allows Trivial Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10–12) and block known-breached passwords at registration and reset.' },
    guide: 'Register a new account with a one-character password such as x. It is accepted immediately — there is no length or complexity policy at registration or reset.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile & Gift Actions', owasp: 'A01:2021 Broken Access Control (CSRF)', difficulty: 'Advanced',
    hints: ['No form in this app carries an anti-CSRF token. What does a browser send automatically with every request?', 'A logged-in victim who merely visits a hostile page can be made to POST anywhere their session works.', 'Simulate it: POST /profile (or /gift) from a different origin — e.g. curl with an Origin: https://evil.example header and only the victim session cookie. The change succeeds.'],
    lesson: 'Authentication cookies ride along on cross-site requests. Without anti-CSRF tokens (or strict SameSite), any website can drive a logged-in user\'s browser like a puppet.',
    impact: 'Attackers change victim emails (then reset passwords and own the account) or gift away their digital goods — using the victim\'s own session, invisible to the client.',
    report: { title: 'Cross-Site Request Forgery on State-Changing Forms', severity: 'High', remediation: 'Add per-session anti-CSRF tokens to every state-changing form and set SameSite=Lax/Strict on session cookies.' },
    guide: 'While logged in as the victim in one context, fire a cross-site POST at /profile with an Origin header from another site (curl: -H "Origin: https://evil.example" plus the victim\'s session cookie) changing the email — or at /gift sending their book away. No token is checked, so it succeeds.' },

  /* ---------- Search, Catalogue & Reviews ---------- */
  { id: 'search-sqli', feature: 'Search, Catalogue & Reviews', name: 'SQL-Injection-Style Search Bypass (Hidden Listing Leak)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The search builds its query by gluing your text into a LIKE pattern. A quote changes the pattern\'s meaning.', 'Classic tautology: make the WHERE clause true for every row.', "Search for ' OR '1'='1 and look for a book that appears on no shelf and in no normal search."],
    lesson: 'Injection is not only about databases dumping tables — the first win is logic collapse: a filter that returns everything, including records that were never meant to be listed.',
    impact: 'Confidential internal material (here, next year\'s pricing strategy) leaks through the most public input on the site. In a real stack the same hole dumps the customer table.',
    report: { title: 'Injection in Product Search Exposes Unpublished Records', severity: 'High', remediation: 'Parameterise queries; never interpolate input into query strings; filter staff/internal records server-side regardless of query shape.' },
    guide: "Search for ' OR '1'='1. The string-built query's WHERE clause becomes always-true, the catalogue filter collapses, and the hidden internal listing 'STAFF ONLY — Winter Pricing Strategy 2027' (book 16) appears in the results." },
  { id: 'search-reflected-xss', feature: 'Search, Catalogue & Reviews', name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection (Reflected XSS)', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you. In what form?', 'View the page source around "You searched for:" — is your input encoded?', 'Search for <script>alert(1)</script> and watch it execute.'],
    lesson: 'Reflected XSS turns the site\'s own pages into the delivery vehicle: the payload arrives in a link, fires in the victim\'s browser, and the site\'s origin makes it trusted.',
    impact: 'Attackers send customers crafted search links that run script on the real storefront — stealing sessions or redressing the page into a phishing clone.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'High', remediation: 'HTML-encode all reflected input in the appropriate output context; add a restrictive Content-Security-Policy.' },
    guide: 'Search for <script>alert(1)</script>. The results page echoes your term back in the "You searched for:" line without encoding, so the script executes immediately in your browser — and would in any victim\'s who opens the crafted link.' },
  { id: 'reviews-stored-xss', feature: 'Search, Catalogue & Reviews', name: 'Stored XSS in Book Reviews', owasp: 'A03:2021 Injection (Stored XSS)', difficulty: 'Beginner',
    hints: ['Reviews are rendered exactly as typed. What survives saving?', 'Markup first, then a script tag. View the book page in a fresh tab, logged out.', 'Post <script>alert(\'xss\')</script> as a review — it fires for every visitor of that page.'],
    lesson: 'Stored XSS is persistent: one submission attacks every future viewer, including admins. User-generated content must be encoded on output, always — input filtering alone never holds.',
    impact: 'The highest-traffic pages of the store (product pages) become attack infrastructure: session theft, fake "store announcement" phishing, defacement.',
    report: { title: 'Stored Cross-Site Scripting in Product Reviews', severity: 'High', remediation: 'Encode review text on render; sanitise with an allowlist if rich text is ever required; deploy CSP.' },
    guide: 'Post a review containing <script>alert(\'xss\')</script> on any book. The text is stored and rendered unescaped on the book page, executing for every visitor — log out and open the page fresh to prove it is not just your own session.' },

  /* ---------- Cart & Coupons ---------- */
  { id: 'cart-coupon-stack', feature: 'Cart & Coupons', name: 'Coupon Stacking & Unlimited Reuse', owasp: 'A04:2021 Insecure Design (Business Logic)', difficulty: 'Beginner',
    hints: ['Apply a coupon. Now apply the same coupon again. Now the other one.', 'Codes are never marked used, and nothing stops duplicates — the percentages just add up.', 'WELCOME10 twice + STACK20 once = 40% off. It works on your next order too.'],
    lesson: 'Promotions are money. If the server does not track redemption (per code, per user, per order), a discount system is a self-service price editor for customers.',
    impact: 'Marketing budget burns uncontrolled: anyone can push every order toward $0, forever, and the client cannot even tell legitimate redemptions from abuse.',
    report: { title: 'Unlimited Coupon Stacking and Reuse', severity: 'High', remediation: 'Track redemptions server-side; one coupon per order unless explicitly combinable; enforce per-user and global usage limits.' },
    guide: 'In the cart, apply WELCOME10, then apply WELCOME10 again, then STACK20. Every application stacks — the same code is never refused as already applied or already used — and the discount reaches 40% or more.' },
  { id: 'cart-qty-tamper', feature: 'Cart & Coupons', name: 'Quantity Tampering (Negative / Absurd Quantities)', owasp: 'A04:2021 Insecure Design (Business Logic)', difficulty: 'Intermediate',
    hints: ['The cart lets you set a quantity directly (POST /cart/setqty). What values does the server accept?', 'Quantities feed totals and fulfilment. What does a negative quantity do to a sum?', 'Set a quantity to -2 (or 100000) — the server stores it without blinking, and checkout maths obey it.'],
    lesson: 'Every numeric input needs a server-side range check. Quantities below 1 or absurdly large corrupt totals, stock and fulfilment in ways UI controls can never prevent.',
    impact: 'Negative quantities pull order totals down (free or discounted goods); absurd quantities corrupt stock and can flood fulfilment or digital delivery.',
    report: { title: 'Missing Server-Side Validation of Cart Quantities', severity: 'Medium', remediation: 'Validate quantity server-side as an integer within a sane range (e.g. 1–10 per line); reject anything else.' },
    guide: 'With an item in the cart, POST /cart/setqty with the item\'s cid and qty=-2 (or a huge number). The server accepts and stores it; the cart total and the checkout that follows are computed from your impossible quantity.' },

  /* ---------- Checkout & Orders ---------- */
  { id: 'checkout-price-tamper', feature: 'Checkout & Orders', name: 'Price Tampering at Checkout', owasp: 'A04:2021 Insecure Design (Business Logic)', difficulty: 'Beginner',
    hints: ['The checkout form carries the prices with it, in hidden fields. Hidden from whom?', 'Intercept the checkout POST and read the price_<item> fields.', 'Change price_<cid> from 12.99 to 0.50 — the order total believes you.'],
    lesson: 'Prices are server data. The moment a total is computed from values the browser supplied, the customer sets the price — hidden fields are visible to anyone with dev tools.',
    impact: 'Complete loss of pricing integrity: every order can be rung up at any price. On a client site this is direct, silent revenue theft at scale.',
    report: { title: 'Client-Controlled Pricing at Checkout (Price Tampering)', severity: 'Critical', remediation: 'Recompute all prices and totals server-side from the catalogue at checkout; ignore any client-sent amounts.' },
    guide: 'Add a book to the cart, go to checkout and intercept the POST: each line carries a hidden price_<cid> field. Lower it (e.g. 0.50) and submit — the order is created at your price and the book is granted in full.' },
  { id: 'checkout-edition-upgrade', feature: 'Checkout & Orders', name: 'Edition-Upgrade Flaw (Client-Controlled Fulfilment)', owasp: 'A04:2021 Insecure Design (Business Logic)', difficulty: 'Intermediate',
    hints: ['The checkout form also carries a grantEdition_<item> field — what is granted versus what is charged?', 'Paying for one edition and receiving another is a fulfilment decision the browser is making.', 'Add the Paperback to the cart, then change grantEdition_<cid> to Collector at checkout. You pay Paperback; Collector lands in your library.'],
    lesson: 'Charge and fulfilment must read from one server-side source of truth. If the request decides what is delivered, premium tiers are free upgrades.',
    impact: 'Margin destruction on the highest-value SKUs: every Collector/Hardcover sale can be downgraded to the cheapest price while the premium edition is delivered.',
    report: { title: 'Client-Controlled Fulfilment Edition at Checkout', severity: 'High', remediation: 'Derive the delivered edition from the server-side cart/order record — the same value that was priced; accept no edition from the client.' },
    guide: 'Put the Paperback of a book (e.g. Salt & Cinder, $12.99) in the cart. At checkout, change the hidden grantEdition_<cid> field to Collector and submit. You are charged the Paperback price; the Collector edition ($49.99) appears in your library.' },
  { id: 'orders-idor', feature: 'Checkout & Orders', name: 'Order IDOR — Other Customers\' Orders', owasp: 'A01:2021 Broken Access Control (IDOR)', difficulty: 'Beginner',
    hints: ['Order ids are sequential, starting at 1001. Your own order page is /orders/<id>.', 'The page checks that someone is logged in — does it check who owns the order?', 'As Priya, open /orders/1002 — Omar\'s order, with his email, items and prices.'],
    lesson: 'Authorisation is per-object, not per-page. "Logged in" is not "allowed": every object read must verify the requester owns (or may see) that object.',
    impact: 'Full disclosure of every customer\'s purchase history and email address — privacy breach, phishing material and competitive intelligence in one walk through the id range.',
    report: { title: 'Insecure Direct Object Reference on Order Detail', severity: 'High', remediation: 'Check object ownership on every read (order.userId must equal the session user, or the user is an admin); use unguessable ids as defence in depth.' },
    guide: "Log in as Priya and open /orders/1002. It is Omar's order — his name, email, items and prices — because the page verifies only that you are logged in, never that the order is yours. Walk the ids to harvest them all." },

  /* ---------- Preorders ---------- */
  { id: 'preorder-price-bypass', feature: 'Preorders', name: 'Preorder Price-Lock Bypass', owasp: 'A04:2021 Insecure Design (Business Logic)', difficulty: 'Beginner',
    hints: ['The "locked" preorder price reaches the server as a hidden form field.', 'If the lock travels through the browser, the browser holds the key.', 'Submit the preorder for The Hollow Crown Protocol with price=0.01 instead of 19.99.'],
    lesson: 'A business guarantee ("price locked at preorder") exists only if the server enforces it. Client-carried prices are suggestions, not controls.',
    impact: 'The preorder campaign\'s guaranteed launch revenue collapses — attackers lock the entire print run for pennies before release day.',
    report: { title: 'Client-Controlled Preorder Price Defeats Price Lock', severity: 'High', remediation: 'Charge the catalogue preorderPrice server-side; ignore any price submitted by the client.' },
    guide: 'On an upcoming title (e.g. The Hollow Crown Protocol), intercept the preorder POST and change the hidden price field from 19.99 to 0.01. The preorder is recorded at $0.01 — the "locked" price was whatever you said it was.' },

  /* ---------- Library, Ebooks & Gifts ---------- */
  { id: 'library-ebook-read', feature: 'Library, Ebooks & Gifts', name: 'Ebook Download Without Purchase', owasp: 'A01:2021 Broken Access Control (IDOR on Digital Goods)', difficulty: 'Beginner',
    hints: ['Your library\'s Read button uses /read/<bookId>. Does the server ask who you are — or what you own?', 'It does not even ask for a login.', 'Open /read/2 with no account at all: the full text of a book you never bought.'],
    lesson: 'For digital goods, the file IS the product. Serving it by id without an ownership check is not a bug in the margins — it is giving away the catalogue.',
    impact: 'The entire digital catalogue can be mirrored for free in minutes: direct, total revenue loss on ebook sales, plus piracy redistribution of the client\'s catalogue.',
    report: { title: 'Missing Authorisation on Ebook Download (Full Text Served Without Purchase)', severity: 'Critical', remediation: 'Require login and a matching library entry (user, book, Ebook edition) before serving any digital file; log downloads.' },
    guide: 'Log out completely and open /read/2. The full text of Salt & Cinder is served — no login, no purchase, no ownership check. Enumerate ids 1–15 to mirror the whole digital catalogue.' },
  { id: 'library-idor', feature: 'Library, Ebooks & Gifts', name: 'Library IDOR — Browsing Other Readers\' Libraries', owasp: 'A01:2021 Broken Access Control (IDOR)', difficulty: 'Beginner',
    hints: ['The library page itself links to other readers. Compare "My Library"\'s URL with theirs.', '/user/<id>/library — the id is the only thing standing between you and a stranger\'s bookshelf. There is nothing standing there.', 'As Omar, open /user/2/library and read Priya\'s complete library.'],
    lesson: 'Personal collections are personal data. Sequential ids plus a missing ownership check turn every user\'s private shelf into a public one.',
    impact: 'Reading habits are sensitive personal data — and exposed libraries hand attackers the exact target list for the gift-duplication and ebook flaws.',
    report: { title: 'Insecure Direct Object Reference on User Libraries', severity: 'Medium', remediation: 'Serve a library only to its owner (or an admin); never link or route to other users\' collections.' },
    guide: "Log in as any customer and open /user/2/library — Priya's complete library renders, because the route checks login but never ownership. The page even lists links to every other reader." },
  { id: 'library-gift-flaw', feature: 'Library, Ebooks & Gifts', name: 'Gift-Transfer Flaw — Duplicating Books From Any Library', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The gift form hides a fromUser field: the "source library" is whatever the client claims.', 'The server never checks that the source is you — or that the book is even in that library.', 'As Priya, POST /gift with fromUser=3 (Omar), bookId=7, toEmail=lena@… — Lena gains the book, Omar keeps his. Duplication, not transfer.'],
    lesson: 'A transfer must debit the source. If the source is client-claimed and never debited, the feature is not gifting — it is printing copies.',
    impact: 'Infinite duplication of digital goods: one purchased copy seeds unlimited "gifts". Combined with the library IDOR, the whole catalogue becomes a piracy faucet.',
    report: { title: 'Missing Ownership Check & Source Debit in Gift Transfer (Unlimited Duplication)', severity: 'High', remediation: 'Take the source library from the session, verify the entry exists, and move it atomically (remove from giver, add to recipient).' },
    guide: "As Priya, submit the gift form with fromUser changed to 3 (Omar), bookId 7 and Lena's email. Lena receives The Silent Compiler 'from Omar's library' — a library you do not own — and Omar's copy is still there. The book was duplicated, not transferred." },

  /* ---------- Files & Downloads ---------- */
  { id: 'files-avatar-upload', feature: 'Files & Downloads', name: 'Unrestricted Avatar Upload (Stored HTML)', owasp: 'A03:2021 Injection / Unrestricted File Upload', difficulty: 'Intermediate',
    hints: ['The avatar upload accepts any file type and serves it back from /avatar/<your-id>.', 'What content type does the server give an .html file?', 'Upload evil.html with a script inside, then open /avatar/<your-id> — your page, hosted on the store\'s own origin.'],
    lesson: 'Uploads are code delivery. Without type allowlists, content verification and safe serving, an "avatar" becomes a hosted page on the trusted domain.',
    impact: 'Stored XSS by upload and phishing pages hosted on the real storefront domain — maximum trust, maximum damage, plus a malware-distribution foothold.',
    report: { title: 'Unrestricted File Upload With Stored HTML Served From Store Origin', severity: 'High', remediation: 'Allowlist image types with content sniffing, randomise stored names, serve uploads as attachments from a separate domain with a safe content type.' },
    guide: 'Upload an avatar file named evil.html containing a script payload. It is stored untouched and served from /avatar/<your user id> as text/html — a page you control, executing on the store\'s own origin for anyone who opens it.' },
  { id: 'files-traversal', feature: 'Files & Downloads', name: 'Path Traversal in Sample-Chapter Download', owasp: 'A01:2021 Broken Access Control (Path Traversal)', difficulty: 'Intermediate',
    hints: ['Sample chapters are served by /sample?file=<name> from a samples folder. The name is joined into a path unsanitised.', 'What does ../ mean to a filesystem path?', 'Request /sample?file=../server.js — the application\'s own source code comes back.'],
    lesson: 'User-controlled file paths must be resolved and confined. One unsanitised join turns a download feature into a read-anything oracle for the server\'s files.',
    impact: 'Source code, configuration and data files leak — on a real client server that means credentials, keys and the roadmap to every other attack.',
    report: { title: 'Directory Traversal in File Download Allows Arbitrary File Read', severity: 'High', remediation: 'Resolve the requested path and require it to stay inside the intended directory; address files by id, never by client-supplied path.' },
    guide: 'Sample chapters live at /sample?file=chapter-1.txt. The filename is joined straight into a filesystem path, so /sample?file=../server.js climbs out of the samples folder and returns the application source. ../progress.json works too.' },

  /* ---------- Admin Panel ---------- */
  { id: 'admin-data-export', feature: 'Admin Panel', name: 'Broken Access Control on Admin Data Export', owasp: 'A01:2021 Broken Access Control / A02:2021 Sensitive Data Exposure', difficulty: 'Intermediate',
    hints: ['There is an export endpoint for support: /admin/export. It asks whether you are logged in. Does it ask whether you are an admin?', 'Your ordinary customer session is enough.', 'As Priya, open /admin/export — every customer, email and password, plus all orders, in one response.'],
    lesson: '"Admin" in the URL is not access control. Every privileged endpoint must verify the caller\'s role server-side — especially exports, which concentrate the most sensitive data in the fewest requests.',
    impact: 'One request from any customer account dumps the client\'s entire customer list with passwords — a reportable data breach and the end of customer trust.',
    report: { title: 'Admin Data Export Accessible to Any Authenticated User (Full Credential Dump)', severity: 'Critical', remediation: 'Verify the admin role server-side on every privileged endpoint; never include passwords (store hashes) in any export.' },
    guide: 'Log in as an ordinary customer and open /admin/export. The endpoint checks only that you are logged in — not that you are staff — and returns every user (including passwords) and every order as JSON.' },

  /* ---------- Platform & Hardening ---------- */
  { id: 'platform-headers', feature: 'Platform & Hardening', name: 'Missing Security Headers (Clickjacking & Sniffing)', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Look at any response\'s headers (curl -I or dev tools). What is NOT there?', 'No Content-Security-Policy, no X-Frame-Options / frame-ancestors, no X-Content-Type-Options.', 'The store can be framed by any site (clickjacking) and browsers will happily sniff content types.'],
    lesson: 'Security headers are cheap, layered defence: CSP blunts XSS, frame-ancestors stops clickjacking, nosniff stops content-type confusion. Their absence removes a safety net under every other flaw.',
    impact: 'The client\'s storefront can be framed into clickjacking attacks and every XSS flaw in the app lands harder, with no browser-level mitigation in the way.',
    report: { title: 'Missing HTTP Security Headers', severity: 'Low', remediation: 'Add Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options: nosniff, Referrer-Policy and HSTS (on HTTPS).' },
    guide: 'Fetch any page with curl -I http://127.0.0.1:3017/ and inspect the headers: there is no Content-Security-Policy, no X-Frame-Options and no X-Content-Type-Options. The store can be framed by any website (clickjacking) as-is.' },
];

/* ---------------- progress engine + persistence ---------------- */
const LAB_NUMBER = 9;
const LAB_NAME = 'HexaBookStore';
const PROGRESS_PATH = pathMod.join(__dirname, 'progress.json');

function defaultState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
function loadState() {
  try {
    const raw = fs.readFileSync(PROGRESS_PATH, 'utf8');
    const s = Object.assign(defaultState(), JSON.parse(raw));
    s.tests = s.tests || {}; s.attempts = s.attempts || {};
    return s;
  } catch (e) { return defaultState(); }
}
const state = loadState();
function saveState() {
  try { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2)); } catch (e) { /* never crash the lab over state */ }
}
const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;
const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);

function pass(testId) {
  if (!TEST_BY_ID[testId] || state.tests[testId]) return;
  state.tests[testId] = true;
  if (TESTS.every(t => state.tests[t.id])) {
    if (!state.completedAt) state.completedAt = new Date().toISOString();
    state.keyRevealed = true; // the chatbot receives the key only now (§6/§7)
  }
  saveState();
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) out[f] = { total: 0, done: 0, attempts: state.attempts[f] || 0 };
  for (const t of TESTS) { out[t.feature].total++; if (state.tests[t.id]) out[t.feature].done++; }
  return out;
}
function progressInfo() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  return {
    lab: LAB_NAME, number: LAB_NUMBER, total, done,
    pct: total ? Math.floor(done * 100 / total) : 0,
    features: featureStats(),
    complete: done === total,
  };
}

/* Key assembly — shards live in separate regions of this file;
 * a key is reconstructed only at its reveal moment (§7). */
function unshard(a, b, c) {
  return a.concat(b, c).map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
function entryKey() { return unshard(KEY_SHARDS_E1, KEY_SHARDS_E2, KEY_SHARDS_E3); }
function completionKey() { return unshard(KEY_SHARDS_C1, KEY_SHARDS_C2, KEY_SHARDS_C3); }

const XSS_RE = /<\s*script|<\s*svg|<\s*img[^>]*\son\w+\s*=|\son\w+\s*=|javascript\s*:/i;
function isCrossSite(req) {
  const host = req.headers.host || '';
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return false; // no evidence of a cross-site origin — do not claim CSRF
  try { return new URL(origin).host !== host; } catch (e) { return true; }
}

/* Runtime detection state (not persisted): brute-force + enumeration probes. */
const loginFails = new Map(); // email -> consecutive failures
const forgotSeen = { existing: false, missing: false };

/* ---------------------------------------------------------------- helpers */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function money(n) { return '$' + Number(n).toFixed(2); }

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/* VULN #9 support: the session cookie is an UNSIGNED base64 JSON blob and the
 * server trusts the "role" inside it. Anyone can edit it. */
function getSession(req) {
  const c = parseCookies(req).hbs_session;
  if (!c) return null;
  try {
    const obj = JSON.parse(Buffer.from(c, 'base64').toString('utf8'));
    const user = userById(obj.uid);
    if (!user) return null;
    return { user, role: obj.role || user.role }; // role taken from the cookie!
  } catch (e) { return null; }
}
function sessionCookie(user) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, role: user.role })).toString('base64');
  return 'hbs_session=' + payload + '; Path=/; HttpOnly=false';
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}
function parseForm(buf) {
  const out = {};
  const s = buf.toString('utf8');
  for (const pair of s.split('&')) {
    if (!pair) continue;
    const i = pair.indexOf('=');
    const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, ' '));
    const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
    if (out[k] === undefined) out[k] = v;
    else if (Array.isArray(out[k])) out[k].push(v);
    else out[k] = [out[k], v];
  }
  return out;
}
/* Minimal multipart parser (single + multi part, text + file fields). */
function parseMultipart(buf, contentType) {
  const m = /boundary=(.+)$/.exec(contentType || '');
  const fields = {}; const files = {};
  if (!m) return { fields, files };
  const boundary = '--' + m[1].trim();
  const text = buf.toString('latin1');
  const parts = text.split(boundary);
  for (let part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;
    if (part.startsWith('\r\n')) part = part.slice(2);
    const splitAt = part.indexOf('\r\n\r\n');
    if (splitAt === -1) continue;
    const head = part.slice(0, splitAt);
    let body = part.slice(splitAt + 4);
    if (body.endsWith('\r\n')) body = body.slice(0, -2);
    const nameM = /name="([^"]+)"/.exec(head);
    if (!nameM) continue;
    const fileM = /filename="([^"]*)"/.exec(head);
    if (fileM) {
      files[nameM[1]] = { filename: fileM[1], content: Buffer.from(body, 'latin1') };
    } else {
      fields[nameM[1]] = Buffer.from(body, 'latin1').toString('utf8');
    }
  }
  return { fields, files };
}

function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#fff;border:1px solid #c9b892;border-radius:10px;box-shadow:0 6px 24px rgba(60,40,10,.25);z-index:50;font-family:Georgia,serif">' +
    '<div style="background:#3b2a1e;color:#f5e9d5;padding:9px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display===\'none\'?\'block\':\'none\'"><strong>💬 Lab Assistant</strong> <span style="float:right">▾</span></div>' +
    '<div id="hxchatbody" style="display:none;padding:10px">' +
    '<div id="hxmsgs" style="height:210px;overflow-y:auto;font-size:14px;margin-bottom:8px"><p><em>Ask me about this lab — its features, your progress, or (after 3 tries on a feature) how a test is done.</em></p></div>' +
    '<form onsubmit="return hxSend(event)"><input id="hxinput" style="width:68%" placeholder="Ask the lab assistant…"> <button>Send</button></form>' +
    '</div></div>' +
    '<script>function hxAdd(t,me){var d=document.getElementById("hxmsgs");var p=document.createElement("p");p.innerHTML=(me?"<strong>You:</strong> ":"<strong>Assistant:</strong> ")+t;d.appendChild(p);d.scrollTop=d.scrollHeight;}' +
    'function hxSend(e){e.preventDefault();var i=document.getElementById("hxinput");var v=i.value.trim();if(!v)return false;hxAdd(v.replace(/</g,"&lt;"),true);i.value="";' +
    'fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){hxAdd(String(j.reply||"…").replace(/</g,"&lt;").replace(/\\n/g,"<br>"),false)}).catch(function(){hxAdd("The assistant is unreachable right now.",false)});return false;}</script>';
}

function layout(req, title, bodyHtml) {
  // Platform observation: app pages are served with no security headers at all.
  pass('platform-headers');
  const sess = getSession(req);
  const pi = progressInfo();
  const bar = '<div style="background:#241a12;color:#f5e9d5;padding:7px 22px;font-size:13px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:22px;vertical-align:middle;margin-right:8px">' +
    '<strong>LAB ' + pi.number + ' — ' + esc(pi.lab) + '</strong> · ' + pi.done + '/' + pi.total + ' tests · ' + pi.pct + '%' +
    ' <span style="display:inline-block;vertical-align:middle;width:180px;height:9px;background:#5a4632;border-radius:5px;margin-left:8px"><span style="display:block;height:9px;border-radius:5px;background:#7ac74f;width:' + pi.pct + '%"></span></span>' +
    ' <a href="/tests" style="color:#f0c987;margin-left:14px">Mission &amp; Tests</a>' +
    (pi.complete ? ' <a href="/complete" style="color:#7ac74f;margin-left:10px">✔ Lab Complete</a>' : '') +
    '</div>';
  const nav = sess
    ? '<a href="/">Catalogue</a> <a href="/preorders">Preorders</a> <a href="/cart">Cart</a> ' +
      '<a href="/library">My Library</a> <a href="/orders">My Orders</a> <a href="/profile">Profile</a> ' +
      (sess.role === 'admin' ? '<a href="/admin">Admin</a> ' : '') +
      '<span class="who">' + esc(sess.user.name) + ' (' + esc(sess.role) + ')</span> <a href="/logout">Logout</a>'
    : '<a href="/">Catalogue</a> <a href="/preorders">Preorders</a> <a href="/login">Login</a> <a href="/register">Register</a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaBookStore</title><style>' +
    'body{font-family:Georgia,serif;background:#faf5ec;color:#2d2118;margin:0}' +
    'header{background:#3b2a1e;color:#f5e9d5;padding:14px 22px}header a{color:#f0c987;margin-right:12px;text-decoration:none}' +
    'header .brand{font-size:22px;font-weight:bold;color:#fff;margin-right:18px}' +
    'main{max-width:980px;margin:24px auto;padding:0 18px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}' +
    '.card{background:#fff;border:1px solid #e2d5bd;border-radius:8px;padding:14px;box-shadow:0 1px 3px rgba(60,40,10,.08)}' +
    '.card h3{margin:4px 0}.author{color:#8a6d3b;font-style:italic}.price{color:#7a4b12;font-weight:bold}' +
    'button,.btn{background:#7a4b12;color:#fff;border:0;padding:8px 14px;border-radius:5px;cursor:pointer;text-decoration:none;display:inline-block}' +
    'input,select,textarea{padding:7px;border:1px solid #c9b892;border-radius:4px}' +
    'table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #e2d5bd;padding:8px;text-align:left}' +
    '.note{background:#fdf3d8;border:1px solid #e5cf8f;padding:10px 14px;border-radius:6px}' +
    '.err{background:#fbe3e3;border:1px solid #d99;padding:10px 14px;border-radius:6px}' +
    '.done{color:#3d7a1e;font-weight:bold}.open{color:#a33}.chip{background:#efe3c8;border-radius:8px;padding:1px 8px;font-size:12px}' +
    '.who{color:#d9c9a8;margin-right:8px}footer{color:#9a8a70;text-align:center;padding:24px;font-size:13px}' +
    '</style></head><body>' + bar + '<header><span class="brand">📚 HexaBookStore</span>' + nav + '</header><main>' + bodyHtml +
    '</main><footer>HexaBookStore practice lab — intentionally vulnerable, local use only.</footer>' + chatWidget() + '</body></html>';
}
function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function redirect(res, to, extraHeaders) {
  res.writeHead(302, Object.assign({ Location: to }, extraHeaders || {}));
  res.end();
}
function requireLogin(req, res) {
  const sess = getSession(req);
  if (!sess) { redirect(res, '/login'); return null; }
  return sess;
}

/* ------------------------------------------------------------------ auth */
function pageLogin(req, err) {
  return layout(req, 'Login',
    '<h1>Welcome back, reader</h1>' + (err ? '<p class="err">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/login"><p><label>Email<br><input name="email" size="34" required></label></p>' +
    '<p><label>Password<br><input type="password" name="password" size="34" required></label></p>' +
    '<button>Login</button></form>' +
    '<p>New here? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password?</a></p>' +
    '<p class="note">Demo accounts — admin@hexabookstore.local / Admin@123 · priya@hexabookstore.local / User@123 · omar@hexabookstore.local / User@123</p>');
}
function pageRegister(req, err) {
  return layout(req, 'Register',
    '<h1>Join HexaBookStore</h1>' + (err ? '<p class="err">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/register"><p><label>Full name<br><input name="name" size="34" required></label></p>' +
    '<p><label>Email<br><input name="email" size="34" required></label></p>' +
    '<p><label>Password<br><input type="password" name="password" size="34" required></label></p>' +
    '<button>Create account</button></form>');
}

/* NEW (system expansion): the login also honours a "legacy query" path that
 * builds its lookup by string concatenation — the classic injectable login.
 * A comment sequence ('--) cuts the password check; a tautology rewrites it. */
function naiveLoginUser(email, password) {
  const em = String(email || ''), pw = String(password || '');
  const taut = /'\s*or\s*'[^']*'\s*=\s*'[^']*'|'\s*or\s*\d+\s*=\s*\d+/i;
  if (/'\s*--/.test(em) || /'\s*#/.test(em)) {
    const u = userByEmail(em.split("'")[0].trim());
    if (u) return u;
  }
  if (taut.test(em) || taut.test(pw)) return userByEmail(em) || users[0];
  return null;
}

/* VULN #12: predictable password-reset token.
 * Token format: reset-<userId>-<dayOfMonth>. Anyone who knows a victim's
 * user id (visible all over the site) can compute today's token. */
function makeResetToken(user) {
  return 'reset-' + user.id + '-' + new Date().getDate();
}
function pageForgot(req, msg) {
  return layout(req, 'Forgot password',
    '<h1>Reset your password</h1>' + (msg ? '<p class="note">' + msg + '</p>' : '') +
    '<form method="POST" action="/forgot"><p><label>Email<br><input name="email" size="34" required></label></p>' +
    '<button>Send reset link</button></form>' +
    '<p class="note">Lab note: a real store would email the link. Here the "email" is shown on screen after you submit.</p>');
}
function pageReset(req, token, err) {
  return layout(req, 'Set new password',
    '<h1>Set a new password</h1>' + (err ? '<p class="err">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/reset"><input type="hidden" name="token" value="' + esc(token) + '">' +
    '<p><label>New password<br><input type="password" name="password" size="34" required></label></p>' +
    '<button>Reset password</button></form>');
}

const KEY_SHARDS_E2 = ['NVc1Qw==', 'LUNGVw=='];

/* ------------------------------------------------------------- catalogue */
function bookCard(b) {
  const from = Math.min.apply(null, Object.values(b.prices).filter(p => p != null));
  return '<div class="card"><h3><a href="/book/' + b.id + '">' + esc(b.title) + '</a></h3>' +
    '<div class="author">by ' + esc(b.author) + ' · ' + esc(b.genre) + ' · ' + b.year + '</div>' +
    '<p>' + esc(b.desc) + '</p>' +
    (b.upcoming ? '<p class="price">Preorder ' + money(b.preorderPrice) + ' · releases ' + esc(b.releaseDate) + '</p>'
                : '<p class="price">from ' + money(from) + '</p>') +
    '<a class="btn" href="/book/' + b.id + '">View</a></div>';
}
function pageHome(req, list, q) {
  const genres = Array.from(new Set(books.filter(b => !b.staffOnly).map(b => b.genre)));
  return layout(req, 'Catalogue',
    '<h1>Browse the shelves</h1>' +
    // NEW: the search term is also echoed back UNESCAPED -> reflected XSS.
    (q ? '<p class="note">You searched for: ' + q + '</p>' : '') +
    '<form method="GET" action="/search"><input name="q" size="40" placeholder="Search by title…" value="' + esc(q || '') + '"> <button>Search</button></form>' +
    '<p>Genres: ' + genres.map(g => '<a href="/?genre=' + encodeURIComponent(g) + '">' + esc(g) + '</a>').join(' · ') + '</p>' +
    '<div class="grid">' + list.map(bookCard).join('') + '</div>');
}

/* VULN #14: SQL-injection-style search. The "query" is built by string
 * concatenation and then run through a deliberately naive WHERE evaluator,
 * so a quote in the input breaks out of the LIKE pattern. Classic payload:
 *   ' OR '1'='1
 * …which also leaks the staff-only internal listing (id 16). */
function runNaiveSearch(rawQ) {
  const query = "SELECT * FROM books WHERE title LIKE '%" + rawQ + "%'";
  const where = query.split(' WHERE ')[1] || '';
  const literalTrue = /'1'\s*=\s*'1/.test(where) || /'(\d+)'\s*=\s*'\1/.test(where) || /\b1\s*=\s*1\b/.test(where);
  const likeTerms = [];
  const re = /title LIKE '%([^%]*)%'/g;
  let m;
  while ((m = re.exec(where)) !== null) likeTerms.push(m[1].toLowerCase());
  const injected = /'\s+OR\s+'/i.test(where) || literalTrue;
  const results = books.filter(b => {
    if (b.staffOnly && !injected) return false; // hidden unless the query is tampered with
    if (literalTrue) return true;
    if (!likeTerms.length) return false;
    return likeTerms.some(t => b.title.toLowerCase().includes(t));
  });
  return { results, injected };
}

function pageBook(req, b, sess) {
  const rows = EDITIONS.filter(e => b.prices[e] != null).map(e =>
    '<tr><td>' + e + '</td><td class="price">' + money(b.prices[e]) + '</td>' +
    '<td>' + (b.upcoming
      ? '<em>Available at release — preorder below</em>'
      : '<form method="POST" action="/cart/add"><input type="hidden" name="bookId" value="' + b.id + '">' +
        '<input type="hidden" name="edition" value="' + e + '"><button>Add to cart</button></form>') + '</td></tr>').join('');
  const preorderForm = b.upcoming
    ? '<h3>Preorder — lock in ' + money(b.preorderPrice) + '</h3>' +
      '<form method="POST" action="/preorder/' + b.id + '">' +
      // VULN #3 surface: the "locked" preorder price travels in a hidden client field.
      '<input type="hidden" name="price" value="' + b.preorderPrice + '">' +
      '<label>Edition <select name="edition">' + EDITIONS.map(e => '<option>' + e + '</option>').join('') + '</select></label> ' +
      '<button>Preorder now</button></form>'
    : '';
  const bookReviews = reviews.filter(r => r.bookId === b.id);
  const reviewHtml = bookReviews.map(r =>
    // VULN #8: review text is rendered WITHOUT escaping -> stored XSS.
    // NEW: the author byline is rendered raw too — a script payload stored
    // in a profile display name fires here for every visitor.
    '<div class="card"><strong>' + r.author + '</strong> · ' + '★'.repeat(r.rating) + '<p>' + r.text + '</p></div>').join('');
  const reviewForm = sess
    ? '<h3>Write a review</h3><form method="POST" action="/book/' + b.id + '/review">' +
      '<p><label>Rating <select name="rating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label></p>' +
      '<p><textarea name="text" rows="3" cols="60" required></textarea></p><button>Post review</button></form>'
    : '<p><a href="/login">Login</a> to write a review.</p>';
  return layout(req, b.title,
    '<h1>' + esc(b.title) + '</h1><div class="author">by ' + esc(b.author) + ' · ' + esc(b.genre) + ' · ' + b.year + '</div>' +
    '<p>' + esc(b.desc) + '</p>' +
    (b.upcoming ? '<p class="note">Upcoming release: ' + esc(b.releaseDate) + '</p>' : '') +
    '<h3>Editions</h3><table><tr><th>Edition</th><th>Price</th><th></th></tr>' + rows + '</table>' +
    '<p>Not sure yet? <a href="/sample?file=chapter-1.txt">Read a free sample chapter</a> (plain text).</p>' +
    preorderForm +
    '<h3>Reader reviews</h3>' + (reviewHtml || '<p>No reviews yet.</p>') + reviewForm);
}

const KEY_SHARDS_C2 = ['S0dZSw==', 'LUNTMg=='];

/* ------------------------------------------------- cart / checkout flow */
function cartTotals(cart) {
  let subtotal = 0;
  for (const it of cart.items) {
    const b = bookById(it.bookId);
    subtotal += (b.prices[it.edition] || 0) * it.qty;
  }
  // VULN #10 support: every applied coupon stacks, duplicates included,
  // and coupons are never marked used — reuse is unlimited.
  const pct = cart.coupons.reduce((sum, code) => sum + (COUPONS[code] || 0), 0);
  const discount = subtotal * Math.min(pct, 100) / 100;
  return { subtotal, pct, discount, total: Math.max(0, subtotal - discount) };
}
function pageCart(req, sess, msg) {
  const cart = getCart(sess.user.id);
  const t = cartTotals(cart);
  const rows = cart.items.map(it => {
    const b = bookById(it.bookId);
    // NEW: quantity can be set directly — and the server trusts any value.
    return '<tr><td>' + esc(b.title) + '</td><td>' + esc(it.edition) + '</td><td>' +
      '<form method="POST" action="/cart/setqty" style="display:inline"><input type="hidden" name="cid" value="' + it.cid + '">' +
      '<input name="qty" value="' + it.qty + '" size="4"> <button>Set</button></form></td><td>' + money(b.prices[it.edition] * it.qty) + '</td></tr>';
  }).join('');
  /* The checkout form posts per-item "price" and "grantEdition" fields.
   * VULN #5: the server charges the POSTED price.
   * VULN #2: the server grants the POSTED edition while charging for the cart edition. */
  const hidden = cart.items.map(it =>
    '<input type="hidden" name="price_' + it.cid + '" value="' + bookById(it.bookId).prices[it.edition] + '">' +
    '<input type="hidden" name="grantEdition_' + it.cid + '" value="' + esc(it.edition) + '">').join('');
  return layout(req, 'Your cart',
    '<h1>Your cart</h1>' + (msg ? '<p class="note">' + esc(msg) + '</p>' : '') +
    (cart.items.length
      ? '<table><tr><th>Book</th><th>Edition</th><th>Qty</th><th>Line total</th></tr>' + rows + '</table>' +
        '<p>Subtotal: ' + money(t.subtotal) + '<br>Coupon discount (' + t.pct + '%): −' + money(t.discount) + '<br><strong>Total: ' + money(t.total) + '</strong></p>' +
        '<form method="POST" action="/cart/coupon"><label>Coupon code <input name="code" placeholder="WELCOME10"></label> <button>Apply coupon</button></form>' +
        '<p>Applied coupons: ' + (cart.coupons.map(esc).join(', ') || 'none') + '</p>' +
        '<form method="POST" action="/checkout">' + hidden + '<button>Checkout</button></form>'
      : '<p>Your cart is empty. <a href="/">Browse the shelves</a>.</p>'));
}

function pageOrders(req, sess, list) {
  const rows = list.map(o => '<tr><td><a href="/orders/' + o.id + '">#' + o.id + '</a></td><td>' + esc(o.kind) + '</td><td>' +
    o.items.map(i => { const b = bookById(i.bookId); return esc(b ? b.title : '?') + ' (' + esc(i.edition) + ')'; }).join(', ') +
    '</td><td>' + money(o.total) + '</td><td>' + esc(o.date) + '</td></tr>').join('');
  return layout(req, 'Orders', '<h1>Orders</h1>' +
    (list.length ? '<table><tr><th>Order</th><th>Type</th><th>Items</th><th>Total</th><th>Date</th></tr>' + rows + '</table>' : '<p>No orders yet.</p>'));
}
function pageOrderDetail(req, o) {
  const owner = userById(o.userId);
  const rows = o.items.map(i => {
    const b = bookById(i.bookId);
    return '<tr><td>' + esc(b ? b.title : '?') + '</td><td>' + esc(i.paidEdition) + '</td><td>' + esc(i.edition) + '</td><td>' + i.qty + '</td><td>' + money(i.pricePaid) + '</td></tr>';
  }).join('');
  // VULN #6 surface: order detail never checks that the viewer owns the order.
  return layout(req, 'Order #' + o.id,
    '<h1>Order #' + o.id + '</h1><p>Customer: ' + esc(owner ? owner.name : '?') + ' (' + esc(owner ? owner.email : '') + ')<br>Type: ' + esc(o.kind) + ' · Date: ' + esc(o.date) + ' · Total: ' + money(o.total) + '</p>' +
    '<table><tr><th>Book</th><th>Paid edition</th><th>Delivered edition</th><th>Qty</th><th>Price paid</th></tr>' + rows + '</table>');
}

function libraryEntries(userId) { return library.filter(l => l.userId === Number(userId)); }
function pageLibrary(req, sess, owner) {
  const entries = libraryEntries(owner.id);
  const rows = entries.map((l, idx) => {
    const b = bookById(l.bookId);
    const read = l.edition === 'Ebook'
      ? '<a class="btn" href="/read/' + b.id + '">Read / Download</a>' : '<em>Physical copy — shipped</em>';
    /* Gift form. VULN #4 + #11 surface: the "fromUser" (source library) is a
     * hidden client field and there is no ownership or CSRF check. */
    const gift = '<form method="POST" action="/gift" style="display:inline">' +
      '<input type="hidden" name="fromUser" value="' + owner.id + '">' +
      '<input type="hidden" name="bookId" value="' + b.id + '">' +
      '<input type="hidden" name="edition" value="' + esc(l.edition) + '">' +
      '<input name="toEmail" placeholder="friend@email.com" size="18" required> <button>Gift this book</button></form>';
    return '<tr><td>' + esc(b.title) + '</td><td>' + esc(l.edition) + '</td><td>' + esc(l.via) + '</td><td>' + read + ' ' + gift + '</td></tr>';
  }).join('');
  const mine = sess && sess.user.id === owner.id;
  return layout(req, (mine ? 'My' : esc(owner.name) + "'s") + ' Library',
    '<h1>' + (mine ? 'My Library' : esc(owner.name) + "'s Library") + '</h1>' +
    (entries.length ? '<table><tr><th>Book</th><th>Edition</th><th>Acquired via</th><th>Actions</th></tr>' + rows + '</table>'
                     : '<p>This library is empty.</p>') +
    '<p class="note">Other readers: ' + users.filter(u => u.role === 'customer').map(u => '<a href="/user/' + u.id + '/library">' + esc(u.name) + '</a>').join(' · ') + '</p>');
}

function pagePreorders(req) {
  const ups = books.filter(b => b.upcoming);
  return layout(req, 'Preorders', '<h1>Coming soon — preorder & lock your price</h1><div class="grid">' + ups.map(bookCard).join('') + '</div>');
}
function pageProfile(req, sess, msg) {
  const u = sess.user;
  const avatar = u.avatar
    ? '<p>Current avatar: <a href="/avatar/' + u.id + '">/avatar/' + u.id + '</a></p>' : '<p>No avatar yet.</p>';
  // VULN #11 surface: none of these POST forms carries a CSRF token.
  // VULN #13 surface: avatar upload accepts ANY file type.
  return layout(req, 'Profile',
    '<h1>Profile & settings</h1>' + (msg ? '<p class="note">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile"><p><label>Full name<br><input name="name" size="34" value="' + esc(u.name) + '"></label></p>' +
    '<p><label>Email<br><input name="email" size="34" value="' + esc(u.email) + '"></label></p><button>Save profile</button></form>' +
    '<h3>Avatar</h3>' + avatar +
    '<form method="POST" action="/profile/avatar" enctype="multipart/form-data"><input type="file" name="avatar" required> <button>Upload avatar</button></form>' +
    '<p class="note">Avatars are served from /avatar/&lt;your-id&gt;.</p>');
}
function pageAdmin(req, sess) {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const userRows = users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.role) + '</td><td>' + libraryEntries(u.id).length + ' books</td></tr>').join('');
  const orderRows = orders.map(o => '<tr><td><a href="/orders/' + o.id + '">#' + o.id + '</a></td><td>' + esc((userById(o.userId) || {}).email || '') + '</td><td>' + esc(o.kind) + '</td><td>' + money(o.total) + '</td></tr>').join('');
  return layout(req, 'Admin dashboard',
    '<h1>Admin dashboard</h1><p>Total revenue: <strong>' + money(revenue) + '</strong> · Orders: ' + orders.length + ' · Customers: ' + users.filter(u => u.role === 'customer').length + '</p>' +
    '<h3>Customers</h3><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Library</th></tr>' + userRows + '</table>' +
    '<h3>All orders</h3><table><tr><th>Order</th><th>Customer</th><th>Type</th><th>Total</th></tr>' + orderRows + '</table>');
}

/* ------------------------------------------------------ lab system pages */
function gatePage(err) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ' + LAB_NUMBER + ' locked — ' + LAB_NAME + '</title><style>' +
    'body{font-family:Georgia,serif;background:#faf5ec;color:#2d2118;margin:0}main{max-width:560px;margin:60px auto;padding:0 18px}' +
    '.card{background:#fff;border:1px solid #e2d5bd;border-radius:10px;padding:26px;box-shadow:0 2px 8px rgba(60,40,10,.12);text-align:center}' +
    'input{padding:9px;border:1px solid #c9b892;border-radius:4px;width:80%}button,.btn{background:#7a4b12;color:#fff;border:0;padding:9px 16px;border-radius:5px;cursor:pointer}' +
    '.err{background:#fbe3e3;border:1px solid #d99;padding:10px 14px;border-radius:6px}</style></head><body><main><div class="card">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:64px">' +
    '<h1>🔒 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    (err ? '<p class="err">That key was not accepted. Keys are case-sensitive — paste the exact key shown when the previous lab reached 100%.</p>' : '') +
    '<form method="POST" action="/unlock"><p><input name="key" placeholder="HX-…" autocomplete="off"></p><button>Unlock LAB ' + LAB_NUMBER + '</button></form>' +
    '<p style="color:#8a6d3b;font-size:14px">No key yet? A key is earned by completing the previous lab to 100%.<br>Your progress in every lab is saved and resumes where you left off.</p>' +
    '</div></main></body></html>';
}

function pageTests(req) {
  const pi = progressInfo();
  const fs2 = pi.features;
  let html = '<h1>🎯 Mission — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1>' +
    '<p>Progress: <strong>' + pi.done + '/' + pi.total + ' tests · ' + pi.pct + '%</strong>. Tests complete only when the server sees the exploit actually succeed — there is no "mark done". Hints are beside every test; the lab assistant will only guide you through a feature after you have genuinely tried it at least 3 times.</p>';
  for (const f of FEATURES) {
    html += '<h2>' + esc(f) + ' <span class="chip">' + fs2[f].done + '/' + fs2[f].total + ' tests</span> <span class="chip">attempts: ' + fs2[f].attempts + '</span></h2>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = !!state.tests[t.id];
      html += '<div class="card"><p>' + (done ? '<span class="done">✔ DONE</span>' : '<span class="open">○ OPEN</span>') +
        ' <strong>' + esc(t.name) + '</strong> <span class="chip">' + esc(t.difficulty) + '</span><br><small>' + esc(t.owasp) + '</small></p>' +
        '<div>' + t.hints.map((h, i) => '<p class="hint" style="display:none">💡 Hint ' + (i + 1) + ': ' + esc(h) + '</p>').join('') +
        '<button onclick="var hs=this.parentNode.querySelectorAll(\'.hint\');for(var i=0;i<hs.length;i++){if(hs[i].style.display===\'none\'){hs[i].style.display=\'block\';break}}">Show hint</button></div></div>';
    }
  }
  if (pi.complete) html += '<p class="note">🎉 Lab complete! Open your <a href="/complete">completion summary &amp; key</a> and your <a href="/certificate">certificate</a>.</p>';
  return layout(req, 'Mission & Tests', html);
}

function pageComplete(req, sess) {
  const pi = progressInfo();
  if (!pi.complete) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return layout(req, 'Lab not complete yet',
      '<h1>LAB ' + LAB_NUMBER + ' — ' + pi.pct + '% complete</h1>' +
      '<p>You have finished <strong>' + pi.done + ' of ' + pi.total + '</strong> tests. The completion summary, your certificate and the key for Lab ' + (LAB_NUMBER + 1) + ' unlock at 100%.</p>' +
      '<h3>Still open (' + left.length + ')</h3><ul>' + left.map(t => '<li>' + esc(t.name) + ' <small>(' + esc(t.feature) + ')</small></li>').join('') + '</ul>' +
      '<p><a class="btn" href="/tests">Back to the mission</a></p>');
  }
  const fs2 = pi.features;
  const featureRows = FEATURES.map(f => '<tr><td>' + esc(f) + '</td><td>' + fs2[f].total + '</td><td>' + fs2[f].done + '</td></tr>').join('');
  const learned = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('');
  const impacts = TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('');
  const reportRows = TESTS.map(t => '<tr><td>' + esc(t.report.title) + '</td><td>' + esc(t.report.severity) + '</td><td>' + esc(t.report.remediation) + '</td></tr>').join('');
  const ways = TESTS.map(t => '<li>' + esc(t.name) + ' <small>(' + esc(t.owasp) + ')</small></li>').join('');
  return layout(req, 'LAB ' + LAB_NUMBER + ' complete!',
    '<h1>🎉 LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': 100% complete</h1>' +
    '<h2>1 · What this lab contained</h2><p>This lab had <strong>' + FEATURES.length + ' features</strong> and <strong>' + pi.total + ' vulnerabilities</strong> in total.</p>' +
    '<h2>2 · Vulnerabilities per feature</h2><table><tr><th>Feature</th><th>Vulnerabilities</th><th>Completed</th></tr>' + featureRows + '</table>' +
    '<h2>3 · How the testing was done — ' + pi.total + ' ways</h2><ul>' + ways + '</ul>' +
    '<h2>4 · What you learned</h2><ul>' + learned + '</ul>' +
    '<h2>5 · What this means for a real client</h2><ul>' + impacts + '</ul>' +
    '<h2>6 · Writing it in a real report</h2><table><tr><th>Report title</th><th>Severity</th><th>Remediation</th></tr>' + reportRows + '</table>' +
    '<h2>🔑 Your key for Lab ' + (LAB_NUMBER + 1) + '</h2>' +
    '<p class="note" style="font-size:19px;text-align:center"><strong>' + esc(completionKey()) + '</strong></p>' +
    '<p>Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to start it. The lab assistant has also received the key now that you are at 100%.</p>' +
    '<h2>🏆 Your certificate</h2>' +
    '<form method="POST" action="/tester-name"><label>Name for the certificate<br><input name="name" size="34" value="' + esc(state.testerName || (sess ? sess.user.name : '')) + '"></label> <button>Save &amp; view certificate</button></form>' +
    '<p><a class="btn" href="/certificate">View certificate</a></p>');
}

function pageCertificate(req, sess) {
  const pi = progressInfo();
  const name = state.testerName || (sess ? sess.user.name : 'Security Tester');
  const date = state.completedAt ? state.completedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title><style>' +
    'body{font-family:Georgia,serif;background:#e9e2d2;margin:0;padding:30px}.cert{max-width:760px;margin:20px auto;background:#fffdf7;border:3px double #7a4b12;border-radius:12px;padding:44px;text-align:center;box-shadow:0 4px 18px rgba(60,40,10,.2)}' +
    'h1{color:#3b2a1e;margin:8px 0}.name{font-size:30px;color:#7a4b12;border-bottom:1px solid #c9b892;display:inline-block;padding:0 26px 6px;margin:14px 0}' +
    '@media print{body{background:#fff;padding:0}.cert{box-shadow:none}}</style></head><body>' +
    '<div class="cert"><img src="/logo.png" alt="HexaCyberLab logo" style="height:84px">' +
    '<h1>Certificate of Completion</h1><p>This certifies that</p>' +
    '<div class="name">' + esc(name) + '</div>' +
    '<p>has completed <strong>100%</strong> of the security tests in<br><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br>(' + pi.total + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>Completed on ' + esc(date) + '</p>' +
    '<p style="margin-top:26px;color:#3b2a1e"><strong>HexaCyberLab</strong> — Built by Md. Jony Hassain, Founder</p></div>' +
    '<p style="text-align:center;color:#8a6d3b">Tip: use your browser\'s Print → Save as PDF to keep this certificate.</p></body></html>';
}

/* ------------------------------------------------------------- chatbot */
const CHAT_FEATURE_KEYS = [
  { f: 'Login & Authentication', k: ['login', 'auth', 'brute', 'reset token', 'cookie', 'session', 'password reset', 'enumeration'] },
  { f: 'Registration & Profile', k: ['register', 'registration', 'profile', 'mass assignment', 'sign up', 'signup', 'weak password'] },
  { f: 'Search, Catalogue & Reviews', k: ['search', 'catalogue', 'catalog', 'review', 'reflected'] },
  { f: 'Cart & Coupons', k: ['cart', 'coupon', 'quantity', 'qty'] },
  { f: 'Checkout & Orders', k: ['checkout', 'order', 'price', 'edition'] },
  { f: 'Preorders', k: ['preorder', 'pre-order'] },
  { f: 'Library, Ebooks & Gifts', k: ['library', 'ebook', 'e-book', 'read', 'gift'] },
  { f: 'Files & Downloads', k: ['file', 'upload', 'avatar', 'download', 'sample', 'traversal'] },
  { f: 'Admin Panel', k: ['admin', 'export', 'dashboard'] },
  { f: 'Platform & Hardening', k: ['header', 'platform', 'clickjack', 'hardening'] },
];
function chatReply(raw) {
  const msg = ' ' + String(raw || '').toLowerCase() + ' ';
  const pi = progressInfo();
  const fs2 = pi.features;
  if (/who (built|made|created)|founder|jony|hassain|who is the author|creator/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b|unlock|next lab/.test(msg)) {
    if (pi.complete && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' at 100%, so I have the key now. The completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to start it. It is also on your /complete page.';
    }
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%, and I can't give out what I don't have. You're at " + pi.pct + '% (' + pi.done + '/' + pi.total + ' tests). Finish every test and the key will appear on the completion page — and with me.';
  }
  if (/progress|status|score|how am i|how far/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + pi.done + '/' + pi.total + ' tests · ' + pi.pct + '%.' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + ' (attempts on that feature so far: ' + (fs2[next.feature].attempts) + ').' : ' Everything is done — see /complete for your key and certificate.');
  }
  const hit = CHAT_FEATURE_KEYS.find(x => x.k.some(k => msg.includes(k)));
  if (hit) {
    const f = hit.f;
    const tests = TESTS.filter(t => t.feature === f);
    const attempts = fs2[f].attempts;
    const names = tests.map(t => (state.tests[t.id] ? '✔ ' : '○ ') + t.name).join('\n');
    if (attempts >= 3 || tests.every(t => state.tests[t.id])) {
      const guides = tests.map(t => '• ' + t.name + (state.tests[t.id] ? ' (done)' : '') + ' — ' + t.guide).join('\n');
      return 'You\'ve earned guidance on ' + f + ' (attempts: ' + attempts + '). Tests there:\n' + names + '\n\nHow each is done:\n' + guides;
    }
    return 'The ' + f + ' feature has ' + tests.length + ' tests:\n' + names + '\n\nStep-by-step help for this feature is locked until you have genuinely tried it at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step. The hints on the /tests page are available right now.';
  }
  if (/how many|features|tests|vulnerabilit|list|what is in|overview/.test(msg)) {
    const lines = FEATURES.map(f => '• ' + f + ': ' + fs2[f].total + ' tests (' + fs2[f].done + ' done, ' + fs2[f].attempts + ' attempts)').join('\n');
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + pi.total + ' tests in total:\n' + lines + '\nProgress: ' + pi.pct + '%. Full map: the /tests page.';
  }
  if (/next|start|begin|what should|stuck/.test(msg)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    if (!next) return 'Nothing is left — you are at 100%. Your key and certificate are on /complete.';
    return 'Start with "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). Attempts on that feature so far: ' + (fs2[next.feature].attempts) + '. Work it yourself first — after 3 tries on a feature I can guide you through it, and every test has hints on the /tests page.';
  }
  if (/^\s*(hi|hello|hey|help)\b/.test(msg)) {
    return 'Hello! I\'m the LAB ' + LAB_NUMBER + ' (' + LAB_NAME + ') assistant. This lab has ' + FEATURES.length + ' features and ' + pi.total + ' tests; you are at ' + pi.pct + '%. Ask me how many vulnerabilities a feature has, ask for your progress, or — after 3 genuine tries on a feature — ask me how its tests are done.';
  }
  return 'I can help with this lab: ask me about its features and test counts, your progress, what to try next, or (after 3 tries on a feature) how a test is done. The /tests page also has hints for every test. I only know LAB ' + LAB_NUMBER + ' — I can\'t invent vulnerabilities that aren\'t in it.';
}

const KEY_SHARDS_E3 = ['U0tKNw==', 'M0hSUg=='];

/* ----------------------------------------------------------------- router */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = url.pathname;
    const method = req.method;
    const sess = getSession(req);
    const bodyBuf = (method === 'POST') ? await readBody(req) : Buffer.alloc(0);
    const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
    const form = (method === 'POST' && !isMultipart) ? parseForm(bodyBuf) : {};

    /* ---- LAB SYSTEM: logo, progress API, chatbot, unlock gate ---- */
    if (path === '/logo.png' && method === 'GET') {
      try {
        const data = fs.readFileSync(pathMod.join(__dirname, 'logo.png'));
        res.writeHead(200, { 'Content-Type': 'image/png' });
        return res.end(data);
      } catch (e) { return sendHtml(res, 404, 'logo missing'); }
    }
    if (path === '/api/progress' && method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(progressInfo()));
    }
    if (path === '/api/chat' && method === 'POST') {
      let message = form.message || '';
      if ((req.headers['content-type'] || '').includes('application/json')) {
        try { message = JSON.parse(bodyBuf.toString('utf8')).message || ''; } catch (e) { /* keep form value */ }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply: state.unlocked ? chatReply(message) : 'This lab is still locked — unlock it with the key from the previous lab first.' }));
    }
    if (path === '/unlock' && method === 'POST') {
      const given = String(form.key || '').trim();
      // Exact match only; no hint about which part is wrong.
      if (given && given === entryKey()) {
        state.unlocked = true; saveState();
        return redirect(res, '/');
      }
      return redirect(res, '/?err=1');
    }
    if (!state.unlocked) {
      return sendHtml(res, 200, gatePage(url.searchParams.get('err')));
    }
    if (path === '/tests' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageTests(req));
    }
    if (path === '/complete' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageComplete(req, sess));
    }
    if (path === '/certificate' && method === 'GET') {
      if (!progressInfo().complete) return redirect(res, '/complete');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(pageCertificate(req, sess));
    }
    if (path === '/tester-name' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      state.testerName = String(form.name || '').trim().slice(0, 60);
      saveState();
      return redirect(res, '/certificate');
    }

    /* ---- auth ---- */
    if (path === '/login' && method === 'GET') return sendHtml(res, 200, pageLogin(req));
    if (path === '/login' && method === 'POST') {
      bump('Login & Authentication');
      const u = userByEmail(form.email);
      if (u && u.password === form.password) {
        loginFails.delete(u.email.toLowerCase());
        // Seeded accounts still accept their documented demo passwords.
        if ((u.id === 1 && form.password === 'Admin@123') || (u.id >= 2 && u.id <= 5 && form.password === 'User@123')) pass('auth-default-creds');
        return redirect(res, '/', { 'Set-Cookie': sessionCookie(u) });
      }
      // Legacy concatenated-query path: injection bypasses the password check.
      const bypass = naiveLoginUser(form.email, form.password);
      if (bypass) { pass('auth-sqli-login'); return redirect(res, '/', { 'Set-Cookie': sessionCookie(bypass) }); }
      // No rate limiting / lockout: failures are counted only so the lab can
      // observe that the 10th failure is processed exactly like the 1st.
      const key = String(form.email || '').toLowerCase();
      const n = (loginFails.get(key) || 0) + 1;
      loginFails.set(key, n);
      if (n >= 10) pass('auth-brute-force');
      return sendHtml(res, 200, pageLogin(req, 'Invalid email or password.'));
    }
    if (path === '/register' && method === 'GET') return sendHtml(res, 200, pageRegister(req));
    if (path === '/register' && method === 'POST') {
      bump('Registration & Profile');
      if (!form.name || !form.email || !form.password) return sendHtml(res, 200, pageRegister(req, 'All fields are required.'));
      if (userByEmail(form.email)) return sendHtml(res, 200, pageRegister(req, 'That email is already registered.'));
      // NEW: no password policy at all — any length is accepted.
      if (String(form.password).length < 6) pass('profile-weak-password');
      // NEW: mass assignment — a client-supplied role field is bound directly.
      const role = (form.role === 'admin' || form.role === 'customer') ? form.role : 'customer';
      if (form.role) pass('profile-mass-assignment');
      const u = { id: nextUserId++, name: form.name, email: form.email, password: form.password, role, avatar: null };
      users.push(u);
      return redirect(res, '/', { 'Set-Cookie': sessionCookie(u) });
    }
    if (path === '/logout') return redirect(res, '/', { 'Set-Cookie': 'hbs_session=; Path=/; Max-Age=0' });

    /* ---- password reset (VULN #12: predictable token) ---- */
    if (path === '/forgot' && method === 'GET') return sendHtml(res, 200, pageForgot(req));
    if (path === '/forgot' && method === 'POST') {
      bump('Login & Authentication');
      const u = userByEmail(form.email);
      if (!u) {
        // Enumeration: the response for a missing account differs observably.
        forgotSeen.missing = true;
        if (forgotSeen.existing) pass('auth-enumeration');
        return sendHtml(res, 200, pageForgot(req, 'If that account exists, a reset link is on its way.'));
      }
      forgotSeen.existing = true;
      if (forgotSeen.missing) pass('auth-enumeration');
      const token = makeResetToken(u);
      resetTokens.set(token, u.id);
      return sendHtml(res, 200, pageForgot(req, 'Your reset link: <a href="/reset?token=' + token + '">/reset?token=' + esc(token) + '</a>'));
    }
    if (path === '/reset' && method === 'GET') return sendHtml(res, 200, pageReset(req, url.searchParams.get('token') || ''));
    if (path === '/reset' && method === 'POST') {
      bump('Login & Authentication');
      const issued = resetTokens.has(form.token);
      const uid = resetTokens.get(form.token);
      // Also accept any well-formed token — the store never expires them.
      let userId = uid;
      if (!userId) {
        const m = /^reset-(\d+)-(\d+)$/.exec(form.token || '');
        if (m && userById(m[1]) && makeResetToken(userById(m[1])) === form.token) userId = Number(m[1]);
      }
      if (!userId) return sendHtml(res, 200, pageReset(req, form.token || '', 'Invalid reset token.'));
      // A token that was never issued through /forgot was computed out-of-band.
      if (!issued) pass('auth-reset-token');
      if (String(form.password || '').length < 6) pass('profile-weak-password');
      userById(userId).password = form.password;
      resetTokens.delete(form.token);
      return redirect(res, '/login');
    }

    /* ---- catalogue & search ---- */
    if (path === '/' && method === 'GET') {
      const genre = url.searchParams.get('genre');
      let list = books.filter(b => !b.staffOnly && !b.upcoming);
      if (genre) list = list.filter(b => b.genre === genre);
      return sendHtml(res, 200, pageHome(req, list));
    }
    if (path === '/search' && method === 'GET') {
      bump('Search, Catalogue & Reviews');
      const q = url.searchParams.get('q') || '';
      const r = runNaiveSearch(q);
      if (r.injected) pass('search-sqli');
      if (XSS_RE.test(q)) pass('search-reflected-xss'); // echoed raw by pageHome
      return sendHtml(res, 200, pageHome(req, r.results, q));
    }
    if (path === '/preorders' && method === 'GET') return sendHtml(res, 200, pagePreorders(req));

    const bookMatch = /^\/book\/(\d+)$/.exec(path);
    if (bookMatch && method === 'GET') {
      const b = bookById(bookMatch[1]);
      if (!b || b.staffOnly) return sendHtml(res, 404, layout(req, 'Not found', '<h1>Book not found</h1>'));
      return sendHtml(res, 200, pageBook(req, b, sess));
    }
    const reviewMatch = /^\/book\/(\d+)\/review$/.exec(path);
    if (reviewMatch && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Search, Catalogue & Reviews');
      const b = bookById(reviewMatch[1]);
      if (!b) return sendHtml(res, 404, layout(req, 'Not found', '<h1>Book not found</h1>'));
      // VULN #8: text stored and later rendered raw -> stored XSS.
      if (XSS_RE.test(form.text || '')) pass('reviews-stored-xss');
      if (XSS_RE.test(sess.user.name || '')) pass('profile-name-xss');
      reviews.push({ id: nextReviewId++, bookId: b.id, userId: sess.user.id, author: sess.user.name, rating: Math.min(5, Math.max(1, Number(form.rating) || 5)), text: form.text || '' });
      return redirect(res, '/book/' + b.id);
    }

    /* ---- cart ---- */
    if (path === '/cart/add' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Cart & Coupons');
      const b = bookById(form.bookId);
      if (!b || b.prices[form.edition] == null) return redirect(res, '/');
      const cart = getCart(sess.user.id);
      const existing = cart.items.find(i => i.bookId === b.id && i.edition === form.edition);
      if (existing) existing.qty += 1;
      else cart.items.push({ cid: nextCartItemId++, bookId: b.id, edition: form.edition, qty: 1 });
      return redirect(res, '/cart');
    }
    if (path === '/cart' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageCart(req, sess));
    }
    if (path === '/cart/coupon' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Cart & Coupons');
      const cart = getCart(sess.user.id);
      const code = String(form.code || '').toUpperCase().trim();
      // VULN #10: no "already applied" / "already used" check at all.
      if (COUPONS[code]) {
        cart.coupons.push(code);
        const dup = cart.coupons.filter(c => c === code).length > 1;
        const pct = cart.coupons.reduce((s, c) => s + (COUPONS[c] || 0), 0);
        if (dup || pct > 20) pass('cart-coupon-stack'); // stacked beyond any single code
        return sendHtml(res, 200, pageCart(req, sess, 'Coupon ' + code + ' applied.'));
      }
      return sendHtml(res, 200, pageCart(req, sess, 'Coupon not recognised.'));
    }
    /* NEW: quantity is set from the client with no range validation at all —
     * zero, negative and absurd quantities are stored and obeyed. */
    if (path === '/cart/setqty' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Cart & Coupons');
      const cart = getCart(sess.user.id);
      const it = cart.items.find(i => i.cid === Number(form.cid));
      if (it) {
        const q = parseInt(form.qty, 10);
        if (!isNaN(q)) { it.qty = q; if (q < 1 || q > 50) pass('cart-qty-tamper'); }
      }
      return redirect(res, '/cart');
    }
    if (path === '/checkout' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Checkout & Orders');
      const cart = getCart(sess.user.id);
      if (!cart.items.length) return redirect(res, '/cart');
      const t = cartTotals(cart);
      const items = cart.items.map(it => {
        // VULN #5: price taken from the POST body, not the catalogue.
        const postedPrice = parseFloat(form['price_' + it.cid]);
        if (!isNaN(postedPrice) && Math.abs(postedPrice - (bookById(it.bookId).prices[it.edition] || 0)) > 0.001) pass('checkout-price-tamper');
        // VULN #2: granted edition taken from the POST body…
        const granted = EDITIONS.includes(form['grantEdition_' + it.cid]) ? form['grantEdition_' + it.cid] : it.edition;
        if (granted !== it.edition) pass('checkout-edition-upgrade');
        if (it.qty < 1 || it.qty > 50) pass('cart-qty-tamper');
        return {
          bookId: it.bookId,
          edition: granted,               // …lands in the library…
          paidEdition: it.edition,        // …while the cart edition is what was priced
          qty: it.qty,
          pricePaid: isNaN(postedPrice) ? (bookById(it.bookId).prices[it.edition] || 0) : postedPrice,
        };
      });
      const itemSum = items.reduce((s, i) => s + i.pricePaid * i.qty, 0);
      const total = Math.max(0, itemSum - t.discount);
      const order = { id: nextOrderId++, userId: sess.user.id, kind: 'purchase', items, total, date: new Date().toISOString().slice(0, 10) };
      orders.push(order);
      for (const i of items) {
        for (let k = 0; k < i.qty; k++) library.push({ userId: sess.user.id, bookId: i.bookId, edition: i.edition, via: 'purchase' });
      }
      carts.set(sess.user.id, { items: [], coupons: [] });
      return redirect(res, '/orders/' + order.id);
    }

    /* ---- preorders (VULN #3: price from client) ---- */
    const preMatch = /^\/preorder\/(\d+)$/.exec(path);
    if (preMatch && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Preorders');
      const b = bookById(preMatch[1]);
      if (!b || !b.upcoming) return redirect(res, '/preorders');
      const price = parseFloat(form.price); // trusted blindly — should be b.preorderPrice
      if (!isNaN(price) && Math.abs(price - b.preorderPrice) > 0.001) pass('preorder-price-bypass');
      const order = {
        id: nextOrderId++, userId: sess.user.id, kind: 'preorder',
        items: [{ bookId: b.id, edition: EDITIONS.includes(form.edition) ? form.edition : 'Paperback', paidEdition: form.edition || 'Paperback', qty: 1, pricePaid: isNaN(price) ? b.preorderPrice : price }],
        total: isNaN(price) ? b.preorderPrice : price,
        date: new Date().toISOString().slice(0, 10),
      };
      orders.push(order);
      return redirect(res, '/orders/' + order.id);
    }

    /* ---- orders (VULN #6: IDOR — no ownership check) ---- */
    if (path === '/orders' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageOrders(req, sess, orders.filter(o => o.userId === sess.user.id)));
    }
    const orderMatch = /^\/orders\/(\d+)$/.exec(path);
    if (orderMatch && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      bump('Checkout & Orders');
      const o = orders.find(x => x.id === Number(orderMatch[1]));
      if (!o) return sendHtml(res, 404, layout(req, 'Not found', '<h1>Order not found</h1>'));
      if (o.userId !== sess.user.id) pass('orders-idor');
      return sendHtml(res, 200, pageOrderDetail(req, o)); // any logged-in user can view any order
    }

    /* ---- library (VULN #7: IDOR) ---- */
    if (path === '/library' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageLibrary(req, sess, sess.user));
    }
    const libMatch = /^\/user\/(\d+)\/library$/.exec(path);
    if (libMatch && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      bump('Library, Ebooks & Gifts');
      const owner = userById(libMatch[1]);
      if (!owner) return sendHtml(res, 404, layout(req, 'Not found', '<h1>User not found</h1>'));
      if (owner.id !== sess.user.id) pass('library-idor');
      return sendHtml(res, 200, pageLibrary(req, sess, owner)); // anyone can browse anyone's library
    }

    /* ---- ebook reader (VULN #1: no purchase/ownership check at all) ---- */
    const readMatch = /^\/read\/(\d+)$/.exec(path);
    if (readMatch && method === 'GET') {
      bump('Library, Ebooks & Gifts');
      const b = bookById(readMatch[1]);
      if (!b || b.prices.Ebook == null) return sendHtml(res, 404, layout(req, 'Not found', '<h1>No ebook for this title</h1>'));
      const owns = sess ? library.some(l => l.userId === sess.user.id && l.bookId === b.id && l.edition === 'Ebook') : false;
      if (!owns) pass('library-ebook-read'); // served without owning the ebook
      const dl = url.searchParams.get('download');
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        ...(dl ? { 'Content-Disposition': 'attachment; filename="book-' + b.id + '.txt"' } : {}),
      });
      return res.end(ebookText(b));
    }

    /* ---- gift a book (VULN #4 + #11: no ownership check, no CSRF token) ---- */
    if (path === '/gift' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Library, Ebooks & Gifts');
      const recipient = userByEmail(form.toEmail);
      const b = bookById(form.bookId);
      if (recipient && b) {
        const claimedSource = Number(form.fromUser);
        const sourceHas = library.some(l => l.userId === claimedSource && l.bookId === b.id && l.edition === (EDITIONS.includes(form.edition) ? form.edition : 'Ebook'));
        if (claimedSource !== sess.user.id || !sourceHas) pass('library-gift-flaw');
        if (isCrossSite(req)) pass('profile-csrf');
        // The "source library" is whatever the client claims in fromUser.
        // It is never checked against the session — and the book does not
        // even need to exist in that library.
        library.push({ userId: recipient.id, bookId: b.id, edition: EDITIONS.includes(form.edition) ? form.edition : 'Ebook', via: 'gift from user ' + (form.fromUser || '?') });
        return sendHtml(res, 200, layout(req, 'Gift sent', '<h1>Gift sent!</h1><p>' + esc(b.title) + ' is now in ' + esc(recipient.name) + "'s library.</p>"));
      }
      return sendHtml(res, 400, layout(req, 'Gift failed', '<h1>Gift failed</h1><p>Recipient email not found.</p>'));
    }

    /* ---- profile (VULN #11: CSRF; VULN #13: unrestricted upload) ---- */
    if (path === '/profile' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      return sendHtml(res, 200, pageProfile(req, sess));
    }
    if (path === '/profile' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Registration & Profile');
      // NEW: mass assignment — a posted role field is honoured here too.
      if (form.role === 'admin' || form.role === 'customer') { sess.user.role = form.role; pass('profile-mass-assignment'); }
      if (form.name) sess.user.name = form.name;
      if (form.email) sess.user.email = form.email; // no CSRF token, no confirmation
      if (isCrossSite(req)) pass('profile-csrf');
      return sendHtml(res, 200, pageProfile(req, sess, 'Profile saved.'));
    }
    if (path === '/profile/avatar' && method === 'POST') {
      if (!sess) return redirect(res, '/login');
      bump('Files & Downloads');
      const { files } = parseMultipart(bodyBuf, req.headers['content-type']);
      const f = files.avatar;
      if (f && f.filename) {
        // VULN #13: any file type is stored and later served back as-is.
        sess.user.avatar = { filename: f.filename, content: f.content };
        return sendHtml(res, 200, pageProfile(req, sess, 'Avatar uploaded: ' + f.filename));
      }
      return sendHtml(res, 200, pageProfile(req, sess, 'No file received.'));
    }
    const avatarMatch = /^\/avatar\/(\d+)$/.exec(path);
    if (avatarMatch && method === 'GET') {
      const u = userById(avatarMatch[1]);
      if (!u || !u.avatar) return sendHtml(res, 404, layout(req, 'Not found', '<h1>No avatar</h1>'));
      const name = u.avatar.filename.toLowerCase();
      const type = name.endsWith('.html') || name.endsWith('.htm') ? 'text/html; charset=utf-8'
        : name.endsWith('.svg') ? 'image/svg+xml'
        : name.endsWith('.png') ? 'image/png'
        : name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'image/jpeg'
        : name.endsWith('.txt') ? 'text/plain; charset=utf-8'
        : 'application/octet-stream';
      if (type.indexOf('text/html') === 0 || type.indexOf('image/svg') === 0) pass('files-avatar-upload');
      res.writeHead(200, { 'Content-Type': type });
      return res.end(u.avatar.content);
    }

    /* ---- sample chapters (NEW: file name joined into a path unsanitised) ---- */
    if (path === '/sample' && method === 'GET') {
      bump('Files & Downloads');
      const SAMPLES_DIR = pathMod.join(__dirname, 'samples');
      const fp = pathMod.join(SAMPLES_DIR, url.searchParams.get('file') || 'chapter-1.txt');
      try {
        const data = fs.readFileSync(fp);
        if (!fp.startsWith(SAMPLES_DIR)) pass('files-traversal'); // escaped the samples folder
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(data);
      } catch (e) {
        return sendHtml(res, 404, layout(req, 'Not found', '<h1>Sample not found</h1>'));
      }
    }

    /* ---- admin (gate trusts the cookie role -> VULN #9) ---- */
    if (path === '/admin' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      bump('Admin Panel');
      if (sess.role !== 'admin') return sendHtml(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
      if (sess.user.role !== 'admin') pass('auth-cookie-role'); // in via the cookie, not the account
      return sendHtml(res, 200, pageAdmin(req, sess));
    }
    /* NEW: support export — checks only that SOMEONE is logged in, never the
     * role, and dumps everything including passwords. */
    if (path === '/admin/export' && method === 'GET') {
      if (!sess) return redirect(res, '/login');
      bump('Admin Panel');
      if (sess.user.role !== 'admin') pass('admin-data-export');
      const dump = {
        exportedBy: sess.user.email,
        users: users.map(u => ({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role })),
        orders, library,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(dump, null, 2));
    }

    return sendHtml(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1><p><a href="/">Back to the shelves</a></p>'));
  } catch (err) {
    // Stay stable on bad input: log and return a plain 500 page.
    console.error('Request error:', err && err.message);
    try { sendHtml(res, 500, '<h1>Something went wrong on our side.</h1>'); } catch (e) { /* ignore */ }
  }
});

const KEY_SHARDS_C3 = ['MlU1SA==', 'R0FCVA=='];

server.listen(PORT, HOST, () => {
  console.log('HexaBookStore lab running at http://' + HOST + ':' + PORT + ' (INTENTIONALLY VULNERABLE — local only)');
});
