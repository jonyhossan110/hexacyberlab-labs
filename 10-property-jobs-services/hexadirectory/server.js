'use strict';
/*
 * HexaDirectory — LAB 100 (Category 10: Property, Jobs & Professional Services)
 * A deliberately vulnerable business-directory training lab.
 * Zero-dependency Node.js. Binds 127.0.0.1:3109 only. LOCAL USE ONLY.
 * All data is fake, in-memory seed data. See README.md.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3109;
const HOST = '127.0.0.1';
const LAB_NAME = 'HexaDirectory';
const LAB_NUMBER = 100;
const PREV_LAB = 99;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const PREMIUM_PRICE = 49;

/* ------------------------------------------------------------------ *
 * Entry-key shards (region: gate config). The entry key exists ONLY as
 * base64-of-reversed pieces scattered here; it is assembled at runtime
 * inside /unlock verification and is never stored or printed whole.
 * ------------------------------------------------------------------ */
const ENTRY_SHARDS = ["TC1YSA==","LTAwMQ==","Q1E1Mw==","V1hCQQ==","U0NNLQ==","TVVLMw==","SQ=="];
function assembleEntryKey() {
  return ENTRY_SHARDS.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ------------------------- progress state ------------------------- */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(state, raw);
    }
  } catch (e) { /* corrupted state -> start fresh */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();

/* --------------------------- seed data ---------------------------- */
let users = [
  { id: 1, name: 'Ada Admin',   email: 'admin@hexadirectory.local', password: 'admin123', role: 'admin',  disabled: false },
  { id: 2, name: 'Alice Baker', email: 'alice@test.local',          password: 'alice123', role: 'owner',  disabled: false },
  { id: 3, name: 'Bob Carter',  email: 'bob@test.local',            password: 'bob123',   role: 'owner',  disabled: false },
  { id: 4, name: 'Carol Diaz',  email: 'carol@test.local',          password: 'carol123', role: 'member', disabled: false },
  { id: 5, name: 'Dave Evans',  email: 'dave@test.local',           password: 'dave123',  role: 'owner',  disabled: false }
];
let listings = [
  { id: 1, name: 'Sunrise Bakery',        category: 'Food & Drink',  ownerId: 2,    published: true,  premium: false, phone: '555-0101', contactEmail: 'hello@sunrisebakery.example', description: 'Family bakery, fresh bread daily.' },
  { id: 2, name: "Bob's Auto Repair",     category: 'Automotive',    ownerId: 3,    published: true,  premium: true,  phone: '555-0102', contactEmail: 'shop@bobsauto.example',          description: 'Full-service auto repair and MOT.' },
  { id: 3, name: 'Green Leaf Landscaping',category: 'Home Services', ownerId: 5,    published: true,  premium: false, phone: '555-0103', contactEmail: 'hi@greenleaf.example',           description: 'Garden design and maintenance.' },
  { id: 4, name: 'Old Town Pharmacy',     category: 'Health',        ownerId: null, published: true,  premium: false, phone: '555-0104', contactEmail: 'care@oldtownpharmacy.example', description: 'Unclaimed listing — is this your business?' },
  { id: 5, name: 'Secret Draft Salon',    category: 'Beauty',        ownerId: 5,    published: false, premium: false, phone: '555-0105', contactEmail: 'draft@secretsalon.example',      description: 'Draft listing, not yet launched.' }
];
let reviews = [
  { id: 1, listingId: 1, authorId: 4, stars: 5, text: 'Great bread, lovely staff!' },
  { id: 2, listingId: 1, authorId: 3, stars: 4, text: 'Good croissants.' },
  { id: 3, listingId: 2, authorId: 2, stars: 5, text: 'Fixed my car the same day.' }
];
let inquiries = [
  { id: 1, listingId: 1, fromName: 'Frank Mills', fromEmail: 'frank@example.com', message: 'Do you cater weddings? Need prices for 120 guests.' },
  { id: 2, listingId: 2, fromName: 'Grace Lee',   fromEmail: 'grace@example.com', message: 'Please quote a brake repair for a 2018 sedan.' }
];
let nextUserId = 6, nextListingId = 6, nextReviewId = 4, nextInquiryId = 3;
const sessions = new Map();          // sid -> userId
const loginFailures = {};            // email -> failed count
const enumProbes = new Set();        // distinct emails probed (login + forgot)
let enumSawKnown = false, enumSawUnknown = false;
const resetIssued = {};              // userId -> token actually issued via /forgot
const usedCoupons = new Set();       // single-use premium coupons already redeemed

/* --------------------------- TESTS registry ------------------------ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    where: 'POST /login', how: 'Inject an OR-tautology into the email or password field so the string-built query matches a user without knowing the password.',
    hints: ['The login query is built by string concatenation — quotes are not escaped.', "Try a classic tautology payload in the password field.", "Use ' OR '1'='1 in both fields and you will be logged in as the first matching user (the admin)."],
    lesson: 'String-built SQL queries let attackers rewrite the login logic itself; parameterised queries make the payload inert data.',
    impact: 'On a real directory this means instant admin takeover: every listing, owner account and lead inquiry is exposed or editable by a stranger.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and add server-side input validation.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', how: 'Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, CAPTCHA or lockout.',
    hints: ['Pick one real account and keep guessing its password.', 'Count how many failures the server tolerates — does anything change after 5? After 10?', 'Ten failed logins for the same account are accepted for processing with no slowdown or lockout.'],
    lesson: 'Without throttling, lockout or MFA, online password guessing is only a matter of time and a wordlist.',
    impact: 'Attackers can grind through common passwords against business-owner accounts and hijack their listings and customer leads.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive rate limiting, account lockout and MFA; alert on repeated failures.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login and POST /forgot', how: 'Compare responses for existing vs non-existing emails; the app confirms which emails are registered. Probe at least 5 distinct emails.',
    hints: ['Try logging in with an email that cannot exist, then with a real one — compare the error text.', 'The forgot-password form answers differently too.', 'Probe 5+ different emails across login/forgot until you can reliably tell registered from unregistered.'],
    lesson: 'Differential error messages turn a login form into an account-existence oracle that feeds targeted attacks.',
    impact: 'Competitors or attackers can harvest the directory’s registered owner emails and aim phishing and password attacks precisely.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all authentication and password-reset outcomes.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'GET /login', how: 'The login page prints a working demo owner account. Sign in with it.',
    hints: ['Read the login page carefully — everything you need is printed on it.', 'Demo accounts in production are real accounts with real access.', 'Use the demo owner email and password shown under the login form.'],
    lesson: 'Published or default credentials are an open door: anyone who reads the page owns the account.',
    impact: 'A live directory account can be taken over by any visitor, letting them edit listings, read leads and post as the business.',
    report: { title: 'Working Demo Credentials Disclosed on Login Page', severity: 'High', remediation: 'Remove demo accounts and printed credentials from production; rotate any exposed passwords.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset', how: 'Reset tokens follow a formula derived from the user id (HD<id>-<id*137+42>). Compute a token for a victim who never requested one and take over the account.',
    hints: ['Request a reset for your own account and study the token format.', 'The token mixes the user id with simple arithmetic — it is the same for everyone with that id.', 'Compute HD<id>-<id*137+42> for the victim’s id and submit it at /reset without ever using /forgot for them.'],
    lesson: 'Reset tokens must be long, random and single-use; a formula an attacker can compute is no secret at all.',
    impact: 'Any registered owner’s account can be seized in seconds, giving attackers their listings, reviews and customer inquiries.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), expire them quickly and invalidate after use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering Grants Admin', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin', how: 'The admin area trusts the client-set hx_role cookie instead of the server-side account role. Set hx_role=admin on a normal account and open /admin.',
    hints: ['Inspect the cookies the app sets after login — one of them sounds like a role.', 'The server believes the cookie more than its own database.', 'With any normal login, change the hx_role cookie value to admin and visit /admin.'],
    lesson: 'Authorisation decisions must be made server-side from trusted session data, never from client-controlled cookies.',
    impact: 'Every registered user becomes an admin: they can dump accounts, disable owners and rewrite the whole directory.',
    report: { title: 'Admin Authorisation Based on Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record on every request; never trust role cookies.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register', how: 'Register a new account with a 1–3 character password; the app accepts it.',
    hints: ['Try registering with the shortest password you can think of.', 'There is no length or complexity check at all.', 'A password like "a" is accepted and the account works immediately.'],
    lesson: 'Password policy is the first line of defence; accepting trivial passwords guarantees weak accounts.',
    impact: 'Owner accounts protected by one-letter passwords fall to the first guessing attempt, handing over their business listings.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and check passwords against known-breached lists.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Admin Role at Registration', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register', how: 'Add a role=admin field to the registration request; the server copies it onto the new account.',
    hints: ['The registration form only shows name/email/password — the server may accept more fields.', 'What field name would the user object use for its privilege level?', 'Submit the registration with an extra role=admin field and then check your profile.'],
    lesson: 'Binding request bodies directly to data models lets clients set fields they should never touch.',
    impact: 'Anyone can mint themselves an admin account and take over the entire directory platform.',
    report: { title: 'Mass Assignment Allows Privilege Escalation at Registration', severity: 'Critical', remediation: 'Whitelist bindable fields per endpoint; assign roles only through privileged server-side flows.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    where: 'POST /register (rendered in /admin and profiles)', how: 'Register with an HTML/JS payload as the display name; it is stored and rendered unescaped.',
    hints: ['Your display name is shown back on several pages, including admin views.', 'Try a name that is not really a name — something with angle brackets.', 'Register with a name like <script>alert(1)</script> and it is stored verbatim.'],
    lesson: 'Stored XSS turns a profile field into a persistent attack on every viewer, including admins.',
    impact: 'An attacker’s script runs in the browsers of directory admins and visitors, enabling session theft and defacement.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output and validate/sanitise profile fields server-side.' } },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile', how: 'The profile update applies changes with no anti-CSRF marker. Submit it without the hx_origin field and the change still goes through.',
    hints: ['Legit forms carry a hidden hx_origin field — what happens if a request simply omits it?', 'A cross-site form cannot read the marker, but a missing check means it does not need to.', 'POST to /profile while logged in, leaving out hx_origin, and the new name is saved anyway.'],
    lesson: 'State-changing endpoints need unguessable anti-CSRF tokens tied to the session.',
    impact: 'A malicious page visited by a logged-in owner silently rewrites their profile and contact details.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on all state-changing requests and verify Origin/Referer.' } },

  /* ---- Search & Discovery ---- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'SQL Injection in Search Leaks Draft Listings', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    where: 'GET /search?q=', how: 'Inject an OR-tautology into the search term; the result set expands to every listing, including unpublished drafts.',
    hints: ['Search is powered by the same string-built query style as login.', 'A normal search only shows published listings — what would an always-true condition show?', "Search for ' OR '1'='1 and look for a listing that never appears in normal results."],
    lesson: 'Injection in search exposes data the UI deliberately hides, not just the data on the page.',
    impact: 'Unpublished businesses, draft launches and internal listings leak to anyone, tipping off competitors.',
    report: { title: 'SQL Injection in Search Exposes Unpublished Listings', severity: 'High', remediation: 'Parameterise search queries and enforce published-only filtering in the data layer.' } },
  { id: 'search-xss', feature: 'Search & Discovery', name: 'Reflected XSS in Search', owasp: 'A03:2021 – Injection', difficulty: 'Beginner',
    where: 'GET /search?q=', how: 'The search term is echoed unescaped in the results heading; submit a script payload as the query.',
    hints: ['Look at the "Results for:" line after a search.', 'Your input comes back exactly as typed — including markup.', 'Search for <script>alert(1)</script> and view the page source of the heading.'],
    lesson: 'Reflected input must be encoded for the context it lands in, especially HTML.',
    impact: 'Attackers craft search links that run script in victims’ browsers — a classic phishing and session-theft vector.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode reflected parameters and deploy a restrictive Content-Security-Policy.' } },

  /* ---- Listings & Claims ---- */
  { id: 'claim-owned', feature: 'Listings & Claims', name: 'Claim Another Owner’s Listing Without Verification', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /listings/:id/claim', how: 'The claim flow transfers ownership of ANY listing to whoever clicks claim — no proof of ownership is checked, even for listings that already have an owner.',
    hints: ['The pharmacy listing is unclaimed and claiming it is legitimate. Try a listing that already has an owner.', 'Does the server ever ask you to prove the business is yours?', 'Log in as one owner and claim a listing owned by a different owner — it becomes yours.'],
    lesson: 'Ownership-transfer flows are high-value targets and must verify entitlement out-of-band.',
    impact: 'A rival can steal a business’s directory listing in one click, rewrite its phone number and divert all its customers.',
    report: { title: 'Listing Claim Flow Allows Takeover of Owned Listings', severity: 'Critical', remediation: 'Require verified proof of ownership (domain/postal verification) and manual review for already-owned listings.' } },
  { id: 'edit-idor', feature: 'Listings & Claims', name: 'Edit a Competitor’s Listing (Broken Access Control)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'POST /listings/:id/edit', how: 'The edit endpoint never checks that the editor owns the listing. Change another owner’s listing details.',
    hints: ['Listing ids are sequential — open the edit page of a listing that is not yours.', 'The page loads and saves for anyone who is logged in.', 'Edit Bob’s listing while logged in as Alice and the changes persist.'],
    lesson: 'Every object-level action needs an ownership check on the server, not just a hidden button.',
    impact: 'Competitors can sabotage listings — wrong phone numbers, fake closures, defaced descriptions — destroying trust and revenue.',
    report: { title: 'Missing Ownership Check Allows Editing Any Listing', severity: 'High', remediation: 'Enforce per-object authorisation on every read/write of listing data.' } },
  { id: 'draft-idor', feature: 'Listings & Claims', name: 'Unpublished Draft Listing Served by Direct URL', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /listings/:id', how: 'Draft (unpublished) listings are hidden from search and home, but the detail page serves them to anyone who guesses the id.',
    hints: ['Listings have small sequential ids. One id never appears anywhere in the UI.', 'Hidden from lists does not mean hidden from direct requests.', 'Visit /listings/5 directly — a draft salon page renders with its contact details.'],
    lesson: 'Visibility flags must be enforced on the detail endpoint, not only in listing queries.',
    impact: 'Pre-launch businesses and their contact details leak before they choose to go public.',
    report: { title: 'Unpublished Listings Accessible by Direct URL (IDOR)', severity: 'Medium', remediation: 'Check publication status and ownership on the detail endpoint; return 404 for drafts to non-owners.' } },

  /* ---- Reviews ---- */
  { id: 'review-stars', feature: 'Reviews', name: 'Rating Manipulation via Out-of-Range Stars', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    where: 'POST /listings/:id/review', how: 'The review form offers 1–5 stars, but the server accepts any number. Submit stars=100 and the average rating explodes.',
    hints: ['The dropdown limits you to 5 — the server does not.', 'Ratings feed the average shown on the listing; what would an extreme value do?', 'POST a review with stars=100 and watch the listing’s average.'],
    lesson: 'Client-side constraints are cosmetic; ranges must be validated server-side.',
    impact: 'Fake ratings destroy the directory’s credibility and let scammers outrank honest businesses.',
    report: { title: 'Review Rating Accepts Out-of-Range Values', severity: 'Medium', remediation: 'Validate rating ranges (1–5) server-side and reject anything else.' } },
  { id: 'review-delete', feature: 'Reviews', name: 'Delete Another User’s Review (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'POST /reviews/:id/delete', how: 'The delete endpoint does not verify authorship. Delete a review written by someone else.',
    hints: ['Review ids appear in the page markup.', 'Whose reviews can you see delete buttons for — and whose can you actually delete?', 'POST to /reviews/1/delete while logged in as a different user; the review disappears.'],
    lesson: 'Destructive actions need the same ownership checks as edits.',
    impact: 'Businesses can erase negative reviews or rivals can erase positive ones, corrupting the review system.',
    report: { title: 'Missing Authorisation on Review Deletion', severity: 'Medium', remediation: 'Verify review authorship (or moderator role) before deletion.' } },
  { id: 'review-xss', feature: 'Reviews', name: 'Stored XSS in Review Text', owasp: 'A03:2021 – Injection', difficulty: 'Intermediate',
    where: 'POST /listings/:id/review (rendered on the listing page)', how: 'Review text is rendered raw on the public listing page. Post a review containing a script payload.',
    hints: ['Reviews are public content rendered for every visitor.', 'Try markup in the review body, not just plain text.', 'A review containing <script>alert(1)</script> is stored and served back unescaped.'],
    lesson: 'Any user content rendered as HTML is an XSS sink unless encoded.',
    impact: 'Every visitor of a popular listing runs attacker script — drive-by malware, fake payment forms and session theft follow.',
    report: { title: 'Stored Cross-Site Scripting in Reviews', severity: 'High', remediation: 'Encode review output, sanitise input and add a Content-Security-Policy.' } },

  /* ---- Lead Inquiries ---- */
  { id: 'inquiry-list-idor', feature: 'Lead Inquiries', name: 'Inquiry List of Another Owner’s Listing Exposed', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /listings/:id/inquiries', how: 'The per-listing inquiry inbox is served to any logged-in user, not just the listing owner.',
    hints: ['Owners have an inbox of customer inquiries per listing, under a predictable URL.', 'Try opening the inbox of a listing you do not own.', 'GET /listings/1/inquiries as Bob shows Alice’s customer leads.'],
    lesson: 'Collection endpoints need the same object-level authorisation as single-object endpoints.',
    impact: 'A business’s entire pipeline of customer leads — names, emails, requests — leaks to competitors.',
    report: { title: 'Broken Access Control on Listing Inquiry Inbox', severity: 'High', remediation: 'Restrict inquiry endpoints to the listing owner (or admins) server-side.' } },
  { id: 'inquiry-idor', feature: 'Lead Inquiries', name: 'Read Another Owner’s Lead Inquiry (IDOR)', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /inquiries/:id', how: 'Individual inquiry pages are served by sequential id with no ownership check.',
    hints: ['Inquiry ids are small sequential numbers.', 'You can read your own inquiries — can you read id 1 and 2 regardless of owner?', 'Open /inquiries/1 as a user who does not own that listing.'],
    lesson: 'Sequential ids plus missing authorisation equals full data exposure, one request at a time.',
    impact: 'Private customer messages and contact details are harvested lead by lead.',
    report: { title: 'Insecure Direct Object Reference on Lead Inquiries', severity: 'High', remediation: 'Check inquiry ownership through its parent listing on every access; use unguessable ids as defence-in-depth.' } },

  /* ---- Premium & Placement ---- */
  { id: 'premium-tamper', feature: 'Premium & Placement', name: 'Premium Placement Price Tampering', owasp: 'A04:2021 – Insecure Design', difficulty: 'Beginner',
    where: 'POST /listings/:id/premium', how: 'The upgrade price travels in the request and the server trusts it. Pay $1 (or $0) instead of $49 and premium activates.',
    hints: ['The premium page states $49 — where does that number go when you submit?', 'Prices sent by the client are suggestions, not truth.', 'Submit the premium form with amount=1 and the listing turns premium.'],
    lesson: 'Prices must be recomputed server-side from the catalogue, never accepted from the client.',
    impact: 'The directory’s paid placement revenue evaporates — everyone gets premium for a dollar.',
    report: { title: 'Client-Side Price Tampering on Premium Upgrade', severity: 'High', remediation: 'Determine prices server-side and verify payment amounts with the payment provider.' } },
  { id: 'premium-coupon', feature: 'Premium & Placement', name: 'Single-Use 100%-Off Coupon Redeemed Repeatedly', owasp: 'A04:2021 – Insecure Design', difficulty: 'Intermediate',
    where: 'POST /listings/:id/premium', how: 'Coupon DIR100 is meant to be single-use, but redemption is never recorded. Use it on two different listings.',
    hints: ['The premium page mentions a launch coupon: DIR100 for 100% off.', 'Single-use must be enforced somewhere — check whether it is.', 'Apply DIR100 to one listing, then apply it again to a second listing; both go premium free.'],
    lesson: 'Coupon state is a server-side invariant; if redemption is not recorded and enforced, "single-use" is fiction.',
    impact: 'A leaked promo code becomes unlimited free premium placement for everyone, forever.',
    report: { title: 'Single-Use Coupon Can Be Redeemed Unlimited Times', severity: 'Medium', remediation: 'Record redemptions atomically and reject previously used single-use codes.' } },

  /* ---- Admin Panel ---- */
  { id: 'admin-bac', feature: 'Admin Panel', name: 'Admin User Dump Served to Any Logged-In User', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Beginner',
    where: 'GET /admin/users.json', how: 'A JSON endpoint meant for admins returns every account including passwords, checking only that *someone* is logged in.',
    hints: ['Admin tooling often lives under /admin — including data endpoints.', 'Being logged in is not the same as being an admin.', 'As Carol (a plain member), fetch /admin/users.json and read all credentials.'],
    lesson: 'APIs and JSON endpoints need the same role checks as HTML admin pages.',
    impact: 'Full credential disclosure for every business owner on the platform — total compromise in one request.',
    report: { title: 'Admin Data Endpoint Missing Role Authorisation (Full Credential Dump)', severity: 'Critical', remediation: 'Enforce admin role checks on all admin endpoints and never expose password fields.' } },
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin Disable-User Action', owasp: 'A01:2021 – Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /admin/users/:id/disable', how: 'The destructive disable-user action performs no CSRF-marker check. Submit it without hx_origin and the account is disabled.',
    hints: ['Powerful actions without tokens can be triggered cross-site.', 'Compare the admin action form with the profile form — which marker is missing?', 'POST /admin/users/4/disable with an admin session and no hx_origin field; Carol is disabled.'],
    lesson: 'Privileged state changes are prime CSRF targets and need token + origin verification.',
    impact: 'A tricked admin disables business owners’ accounts just by visiting a malicious page.',
    report: { title: 'Missing CSRF Protection on Admin Account Disable', severity: 'High', remediation: 'Require CSRF tokens on all admin actions and re-confirm destructive operations.' } },

  /* ---- Platform & API ---- */
  { id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated /api/debug Data Dump', owasp: 'A05:2021 – Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /api/debug', how: 'A leftover debug endpoint dumps users (with passwords), listings and inquiries to anyone, no login required.',
    hints: ['Debug and diagnostics endpoints are often left behind in production.', 'This one answers even with no cookies at all.', 'Fetch /api/debug in a fresh session and read the full data dump.'],
    lesson: 'Debug surfaces must never ship to production; if they do, they must be authenticated and audited.',
    impact: 'One unauthenticated request hands attackers every account credential and customer lead on the platform.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full Database Dump', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth.' } },
  { id: 'api-token', feature: 'Platform & API', name: 'Weak API Token — Base64 of Email Accepted', owasp: 'A07:2021 – Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/my-inquiries with X-Api-Token header', how: 'The API accepts base64(email) as a bearer token. Forge a token for any owner and read their inquiries with no session.',
    hints: ['API tokens should be unguessable. This one is derived from something public.', 'What is the most predictable encoding of an email address?', "Send X-Api-Token as base64 of alice@test.local with no cookies — her inquiries come back."],
    lesson: 'Tokens must be high-entropy secrets; encoding is not encryption and identifiers are not credentials.',
    impact: 'Anyone who knows an owner’s email address — printed on their listing — owns their API identity.',
    report: { title: 'Predictable API Token (Base64 of Email) Allows Impersonation', severity: 'High', remediation: 'Issue random, revocable API keys, store only hashes and scope them per account.' } }
];

/* --------------------------- helpers ------------------------------ */
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe/i;
function hasPayload(s) { return typeof s === 'string' && XSS_RE.test(s); }
function pass(id) {
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (TESTS.every(t => state.tests[t.id])) {
      state.completedAt = new Date().toISOString();
      state.keyRevealed = true;
    }
    saveState();
  }
}
function attempt(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featuresSummary() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (state.tests[t.id]) out[t.feature].done++;
  }
  return out;
}
function progress() {
  const total = TESTS.length;
  const done = TESTS.filter(t => state.tests[t.id]).length;
  return { lab: LAB_NAME, number: LAB_NUMBER, total, done, pct: total ? Math.floor(done / total * 100) : 0, features: featuresSummary(), complete: done === total };
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function currentUser(req) {
  const c = parseCookies(req);
  const uid = sessions.get(c.sid);
  return users.find(u => u.id === uid) || null;
}
function resetTokenFor(id) { return 'HD' + id + '-' + (id * 137 + 42); }

/* ------- completion-key shards (region: completion surfaces) ----- *
 * The completion key exists ONLY as base64-of-reversed pieces here;  *
 * it is assembled at runtime and revealed only at 100% completion.   */
const COMPLETION_SHARDS = ["TC1YSA==","LTEwMQ==","MTE0Ug==","S0VLTQ==","U0hNLQ==","SlhISw==","Mg=="];
function assembleCompletionKey() {
  return COMPLETION_SHARDS.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ----------------------------- UI --------------------------------- */
const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:10px;font-family:system-ui;font-size:13px;z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.35)">
  <div style="padding:8px 12px;background:#1f2937;border-radius:10px 10px 0 0;font-weight:600">Hexa Lab Coach — LAB ${LAB_NUMBER}</div>
  <div id="hxlog" style="height:170px;overflow-y:auto;padding:8px 12px"></div>
  <form id="hxform" style="display:flex;border-top:1px solid #374151">
    <input id="hxinput" autocomplete="off" placeholder="Ask the coach…" style="flex:1;background:#111827;color:#e5e7eb;border:0;padding:9px 12px;outline:none">
    <button style="background:#2563eb;color:#fff;border:0;padding:0 14px;cursor:pointer">Send</button>
  </form>
</div>
<script>
(function(){
  var log=document.getElementById('hxlog'),form=document.getElementById('hxform'),inp=document.getElementById('hxinput');
  function add(who,text){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  add('Coach','Hi! I am your Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what to try next, how many tests a feature has, or for help after you have tried a feature at least 3 times.');
  form.addEventListener('submit',function(e){e.preventDefault();var m=inp.value.trim();if(!m)return;inp.value='';add('You',m);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
      .then(function(r){return r.json();}).then(function(j){add('Coach',j.reply||'No reply.');})
      .catch(function(){add('Coach','Coach unreachable right now.');});
  });
})();
</script>`;

function layout(req, title, body) {
  const p = progress();
  const bar = `<div style="background:#1f2937;color:#e5e7eb;padding:8px 16px;font-family:system-ui;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <img src="/logo.png" alt="HexaCyberLab" style="height:28px">
    <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
    <span>${p.done}/${p.total} tests · ${p.pct}%</span>
    <span style="flex:1;min-width:120px;background:#374151;border-radius:6px;height:10px;overflow:hidden"><span style="display:block;height:100%;width:${p.pct}%;background:linear-gradient(90deg,#2563eb,#7c3aed)"></span></span>
    <a style="color:#93c5fd" href="/tests">Mission Board</a>
    <a style="color:#93c5fd" href="/">Directory</a>
    <a style="color:#93c5fd" href="/complete">Completion</a>
  </div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — LAB ${LAB_NUMBER} ${LAB_NAME}</title></head>
<body style="margin:0;font-family:system-ui;background:#f9fafb;color:#111827">${bar}
<main style="max-width:920px;margin:0 auto;padding:20px">${body}</main>${CHAT_WIDGET}</body></html>`;
}
function gatePage(req) {
  const body = `<h1>LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h1>
  <p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
  <form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${PREV_LAB}" style="padding:8px;width:320px;max-width:90%">
  <button style="padding:8px 16px">Unlock</button></form>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
<body style="margin:0;font-family:system-ui;background:#f9fafb"><main style="max-width:720px;margin:40px auto;padding:20px">${body}</main>${CHAT_WIDGET}</body></html>`;
}

/* ------------------------- chatbot (§6) --------------------------- */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'sign in']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile']],
  ['Search & Discovery', ['search']],
  ['Listings & Claims', ['listing', 'claim', 'edit a listing', 'draft']],
  ['Reviews', ['review', 'rating', 'stars']],
  ['Lead Inquiries', ['inquir', 'lead']],
  ['Premium & Placement', ['premium', 'coupon', 'placement']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'debug', 'platform', 'token']]
];
function coachReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  const p = progress();
  // key requests first
  if (/(key|unlock|next lab)/.test(m) && /(completion|next|give|what|share|tell|reveal)/.test(m)) {
    if (p.complete && state.keyRevealed) {
      return 'You completed LAB ' + LAB_NUMBER + ' — congratulations! The completion key (which unlocks the next lab) is: ' + assembleCompletionKey();
    }
    return 'I do not have the completion key yet — I only receive it when this lab reaches 100%. Right now you are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). Finish every test and I will be able to share it.';
  }
  // attribution
  if (/(who (built|made|created)|founder|who is md|jony)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  // counts / map — the map is public
  if (/(how many|which|list|what (tests|vulnerabilities|features))/.test(m)) {
    const feat = FEATURE_KEYS.find(([f, keys]) => keys.some(k => m.includes(k)));
    if (feat) {
      const list = TESTS.filter(t => t.feature === feat[0]);
      return 'Feature "' + feat[0] + '" has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat[0]] || 0) + '.';
    }
    const fs2 = featuresSummary();
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + Object.keys(fs2).length + ' features and ' + p.total + ' tests total: ' +
      Object.entries(fs2).map(([f, v]) => f + ' (' + v.done + '/' + v.total + ')').join(', ') + '. Current progress: ' + p.pct + '%.';
  }
  // progress / next step
  if (/(progress|next|start|begin|stuck|help)/.test(m) && !/(how|solve|do i|exploit|hack|bypass)/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'You are at ' + p.pct + '% (' + p.done + '/' + p.total + ' tests). ' + (next
      ? 'A good next target: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). See the Mission Board at /tests for its hints.'
      : 'Everything is complete — visit /complete for your summary and certificate.');
  }
  // how-to guidance — locked behind 3 genuine attempts on that feature
  const feat = FEATURE_KEYS.find(([f, keys]) => keys.some(k => m.includes(k)));
  if (feat || /(how|solve|exploit|bypass|hack|do i)/.test(m)) {
    const f = feat ? feat[0] : null;
    if (!f) return 'Tell me which feature you want help with — for example: "how do I solve the login tests?" I can guide you once you have tried that feature at least 3 times.';
    const list = TESTS.filter(t => t.feature === f);
    const open = list.filter(t => !state.tests[t.id]);
    const tries = state.attempts[f] || 0;
    if (open.length === 0) return 'You have already completed every test in "' + f + '". Nice work!';
    if (tries >= 3) {
      return 'Step by step for "' + f + '" (you have tried ' + tries + ' times, so guidance is unlocked): ' +
        open.map((t, i) => (i + 1) + ') ' + t.name + ' — ' + t.hints[2]).join(' ');
    }
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ask me how many tests a feature has, what to try next, or for step-by-step help on a feature after at least 3 genuine tries. Your progress: ' + p.pct + '% (' + p.done + '/' + p.total + '). The Mission Board is at /tests.';
}

/* --------------------- tiny SQL-ish evaluator --------------------- *
 * The login query is genuinely built by string concatenation and     *
 * evaluated, which is exactly why injection works here.             */
function evalCond(cond, u) {
  cond = cond.trim();
  let mm = cond.match(/^(\w+)\s*=\s*'([^']*)'$/); if (mm) return String(u[mm[1]] == null ? '' : u[mm[1]]) === mm[2];
  mm = cond.match(/^'([^']*)'\s*=\s*'([^']*)'$/); if (mm) return mm[1] === mm[2];
  mm = cond.match(/^'([^']*)'\s*=\s*(\w+)$/); if (mm) return mm[1] === String(u[mm[2]] == null ? '' : u[mm[2]]);
  mm = cond.match(/^(\w+)\s*=\s*(\w+)$/); if (mm) return String(u[mm[1]] == null ? '' : u[mm[1]]) === String(u[mm[2]] == null ? '' : u[mm[2]]);
  return false;
}
function evalQuery(q, u) {
  const cut = q.indexOf('--'); if (cut >= 0) q = q.slice(0, cut);
  return q.split(/\s+OR\s+/i).some(branch => branch.split(/\s+AND\s+/i).every(c => evalCond(c, u)));
}
function findUserByLogin(email, password) {
  const q = "email = '" + email + "' AND password = '" + password + "'";
  for (const u of users) { if (!u.disabled && evalQuery(q, u)) return u; }
  return null;
}

/* --------------------------- pages -------------------------------- */
function listingCard(l) {
  const rs = reviews.filter(r => r.listingId === l.id);
  const avg = rs.length ? (rs.reduce((a, r) => a + r.stars, 0) / rs.length) : 0;
  return `<div style="border:1px solid #d1d5db;border-radius:8px;padding:14px;margin:10px 0;background:#fff">
    <a href="/listings/${l.id}" style="font-size:18px;font-weight:700;color:#1d4ed8">${esc(l.name)}</a>
    ${l.premium ? '<span style="background:#f59e0b;color:#fff;padding:2px 8px;border-radius:10px;font-size:12px">PREMIUM</span>' : ''}
    <div style="color:#6b7280">${esc(l.category)} · ★ ${avg ? avg.toFixed(1) : '—'} (${rs.length} reviews)</div>
    <p>${esc(l.description)}</p></div>`;
}
function homePage(req) {
  const cats = [...new Set(listings.filter(l => l.published).map(l => l.category))];
  const body = `<h1>HexaDirectory — Local Business Directory</h1>
  <form method="GET" action="/search"><input name="q" placeholder="Search businesses…" style="padding:8px;width:300px;max-width:80%">
  <button style="padding:8px 14px">Search</button></form>
  <p>Categories: ${cats.map(c => esc(c)).join(' · ')}</p>
  ${listings.filter(l => l.published).map(listingCard).join('')}`;
  return layout(req, 'Home', body);
}
function listingPage(req, l, user) {
  const rs = reviews.filter(r => r.listingId === l.id);
  const avg = rs.length ? (rs.reduce((a, r) => a + r.stars, 0) / rs.length) : 0;
  const owner = users.find(u => u.id === l.ownerId);
  const body = `<h1>${esc(l.name)} ${l.premium ? '★ PREMIUM' : ''}</h1>
  <p><b>Category:</b> ${esc(l.category)} · <b>Rating:</b> ★ ${avg ? avg.toFixed(1) : '—'} (${rs.length} reviews)${l.published ? '' : ' · <b style="color:#b91c1c">UNPUBLISHED DRAFT</b>'}</p>
  <p>${esc(l.description)}</p>
  <p><b>Phone:</b> ${esc(l.phone)} · <b>Contact:</b> ${esc(l.contactEmail)} · <b>Owner:</b> ${owner ? esc(owner.name) : 'Unclaimed'}</p>
  <h2>Reviews</h2>
  ${rs.map(r => { const a = users.find(u => u.id === r.authorId); return `<div style="border-bottom:1px solid #e5e7eb;padding:8px 0"><b>${a ? a.name : 'user'}</b> — ★ ${r.stars}<br>${r.text}
    <form method="POST" action="/reviews/${r.id}/delete" style="display:inline"><button>Delete review</button></form></div>`; }).join('') || '<p>No reviews yet.</p>'}
  ${user ? `<h3>Write a review</h3><form method="POST" action="/listings/${l.id}/review">
    <label>Stars <input name="stars" type="number" value="5" style="width:60px"></label>
    <input name="text" placeholder="Your review" style="width:320px;max-width:80%;padding:6px"><button>Post review</button></form>` : '<p><a href="/login">Log in</a> to review.</p>'}
  <h3>Send an inquiry to this business</h3>
  <form method="POST" action="/listings/${l.id}/inquire">
    <input name="fromName" placeholder="Your name" required> <input name="fromEmail" placeholder="Your email" required>
    <input name="message" placeholder="Message" style="width:300px;max-width:80%"><button>Send inquiry</button></form>
  <h3>Owner tools</h3>
  <p>
    <a href="/listings/${l.id}/edit">Edit listing</a> ·
    <a href="/listings/${l.id}/inquiries">View inquiries</a> ·
    <a href="/listings/${l.id}/premium">Premium placement</a>
  </p>
  <form method="POST" action="/listings/${l.id}/claim"><button>Claim this listing</button></form>`;
  return layout(req, l.name, body);
}

/* --------------------------- server ------------------------------- */
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { return resolve(JSON.parse(data || '{}')); } catch (e) { return resolve({}); } }
      const out = {};
      for (const pair of data.split('&')) { if (!pair) continue; const i = pair.indexOf('='); out[decodeURIComponent(pair.slice(0, i)).replace(/\+/g, ' ')] = decodeURIComponent(pair.slice(i + 1)).replace(/\+/g, ' '); }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, loc, extra) {
  res.writeHead(302, Object.assign({ Location: loc }, extra || {}));
  res.end();
}
function setSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  return { 'Set-Cookie': [
    'sid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_origin=same-site; Path=/'
  ] };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const pathname = url.pathname;
    const method = req.method;

    if (pathname === '/logo.png') {
      try { const buf = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    if (pathname === '/api/progress' && method === 'GET') return send(res, 200, JSON.stringify(progress(), null, 2), 'application/json');
    if (pathname === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      let reply; try { reply = coachReply(b.message); } catch (e) { reply = 'The coach hit a snag — try the Mission Board at /tests.'; }
      return send(res, 200, JSON.stringify({ reply }), 'application/json');
    }
    if (pathname === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      const given = String((b && b.key) || '');
      if (given && given === assembleEntryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, 'Invalid key.');
    }
    // Platform API — deliberately reachable without a session
    if (pathname === '/api/debug' && method === 'GET') {
      attempt('Platform & API'); pass('api-debug');
      return send(res, 200, JSON.stringify({ users, listings, inquiries }, null, 2), 'application/json');
    }
    if (pathname === '/api/my-inquiries' && method === 'GET') {
      attempt('Platform & API');
      const tok = req.headers['x-api-token'] || '';
      let email = '';
      try { email = Buffer.from(tok, 'base64').toString('utf8'); } catch (e) { /* ignore */ }
      const u = users.find(x => x.email === email);
      if (u) { pass('api-token'); const mine = inquiries.filter(i => { const l = listings.find(x => x.id === i.listingId); return l && l.ownerId === u.id; }); return send(res, 200, JSON.stringify({ owner: u.email, inquiries: mine }, null, 2), 'application/json'); }
      return send(res, 401, JSON.stringify({ error: 'bad token' }), 'application/json');
    }

    // ---- lock gate ----
    if (!state.unlocked) return send(res, 200, gatePage(req));

    const user = currentUser(req);
    const body = (method === 'POST') ? await readBody(req) : {};

    /* ------------------------- auth ------------------------- */
    if (pathname === '/login' && method === 'GET') {
      return send(res, 200, layout(req, 'Login', `<h1>Log in</h1>
      <form method="POST" action="/login"><input name="email" placeholder="Email" style="padding:8px"> <input name="password" type="password" placeholder="Password" style="padding:8px"><button style="padding:8px 14px">Log in</button></form>
      <p style="background:#fef3c7;padding:10px;border-radius:6px">Demo owner account (for trying the directory): <b>alice@test.local</b> / <b>alice123</b></p>
      <p><a href="/forgot">Forgot password?</a> · <a href="/register">Register</a></p>`));
    }
    if (pathname === '/login' && method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || ''), password = String(body.password || '');
      enumProbes.add(email);
      const known = users.find(u => u.email === email);
      if (known) enumSawKnown = true; else enumSawUnknown = true;
      if (enumProbes.size >= 5 && enumSawKnown && enumSawUnknown) pass('auth-enum');
      const u = findUserByLogin(email, password);
      if (u) {
        if (password !== u.password) pass('auth-sqli');
        if (email === 'alice@test.local' && password === 'alice123') pass('auth-demo');
        return redirect(res, '/', setSession(res, u));
      }
      loginFailures[email] = (loginFailures[email] || 0) + 1;
      if (loginFailures[email] >= 10) pass('auth-brute');
      const msg = known ? 'Incorrect password for that account.' : 'No account found for that email.';
      return send(res, 200, layout(req, 'Login', `<h1>Log in</h1><p style="color:#b91c1c">${msg}</p>
      <form method="POST" action="/login"><input name="email" placeholder="Email" style="padding:8px"> <input name="password" type="password" placeholder="Password" style="padding:8px"><button style="padding:8px 14px">Log in</button></form>
      <p><a href="/forgot">Forgot password?</a></p>`));
    }
    if (pathname === '/logout') {
      const c = parseCookies(req); sessions.delete(c.sid);
      return redirect(res, '/login', { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    }
    if (pathname === '/forgot' && method === 'GET') {
      return send(res, 200, layout(req, 'Forgot password', `<h1>Forgot password</h1>
      <form method="POST" action="/forgot"><input name="email" placeholder="Email" style="padding:8px"><button style="padding:8px 14px">Send reset link</button></form>`));
    }
    if (pathname === '/forgot' && method === 'POST') {
      attempt('Login & Authentication');
      const email = String(body.email || '');
      enumProbes.add(email);
      const u = users.find(x => x.email === email);
      if (u) { enumSawKnown = true; resetIssued[u.id] = resetTokenFor(u.id); }
      else enumSawUnknown = true;
      if (enumProbes.size >= 5 && enumSawKnown && enumSawUnknown) pass('auth-enum');
      const msg = u ? 'Reset link sent — check your inbox. (Training build: your token is ' + resetIssued[u.id] + ')' : 'No account found for that email.';
      return send(res, 200, layout(req, 'Forgot password', `<h1>Forgot password</h1><p>${msg}</p><p><a href="/reset">Enter reset token</a></p>`));
    }
    if (pathname === '/reset' && method === 'GET') {
      return send(res, 200, layout(req, 'Reset password', `<h1>Reset password</h1>
      <form method="POST" action="/reset"><input name="email" placeholder="Email" style="padding:8px"> <input name="token" placeholder="Reset token" style="padding:8px"> <input name="newpassword" type="password" placeholder="New password" style="padding:8px"><button style="padding:8px 14px">Reset</button></form>`));
    }
    if (pathname === '/reset' && method === 'POST') {
      attempt('Login & Authentication');
      const u = users.find(x => x.email === String(body.email || ''));
      if (u && String(body.token || '') === resetTokenFor(u.id)) {
        if (resetIssued[u.id] !== String(body.token)) pass('auth-reset');
        u.password = String(body.newpassword || 'changed123');
        delete resetIssued[u.id];
        return send(res, 200, layout(req, 'Reset password', '<h1>Password updated</h1><p><a href="/login">Log in</a> with your new password.</p>'));
      }
      return send(res, 200, layout(req, 'Reset password', '<h1>Reset password</h1><p style="color:#b91c1c">Invalid token.</p>'));
    }

    /* --------------------- registration ---------------------- */
    if (pathname === '/register' && method === 'GET') {
      return send(res, 200, layout(req, 'Register', `<h1>Create your account</h1>
      <form method="POST" action="/register"><input name="name" placeholder="Display name" style="padding:8px"> <input name="email" placeholder="Email" style="padding:8px"> <input name="password" type="password" placeholder="Password" style="padding:8px"><button style="padding:8px 14px">Register</button></form>`));
    }
    if (pathname === '/register' && method === 'POST') {
      attempt('Registration & Profile');
      const pw = String(body.password || '');
      const nu = { id: nextUserId++, name: String(body.name || 'New User'), email: String(body.email || ''), password: pw, role: 'member', disabled: false };
      if (body.role) { nu.role = String(body.role); if (nu.role === 'admin') pass('reg-mass'); }
      if (pw.length > 0 && pw.length <= 3) pass('reg-weak');
      if (hasPayload(nu.name)) pass('reg-xss');
      users.push(nu);
      return redirect(res, '/', setSession(res, nu));
    }
    if (pathname === '/profile' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      return send(res, 200, layout(req, 'Profile', `<h1>Your profile</h1>
      <p><b>Name:</b> ${user.name}</p><p><b>Email:</b> ${esc(user.email)}</p><p><b>Role:</b> ${esc(user.role)}</p>
      <form method="POST" action="/profile"><input type="hidden" name="hx_origin" value="same-site">
      <input name="name" value="${esc(user.name)}" style="padding:8px"><button style="padding:8px 14px">Update profile</button></form>
      <p><a href="/logout">Log out</a></p>`));
    }
    if (pathname === '/profile' && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Registration & Profile');
      const marked = body.hx_origin === 'same-site';
      if (body.name) user.name = String(body.name);
      if (!marked) pass('profile-csrf');
      return redirect(res, '/profile');
    }

    /* ------------------------- search ------------------------ */
    if (pathname === '/search' && method === 'GET') {
      attempt('Search & Discovery');
      const q = url.searchParams.get('q') || '';
      const injected = /'\s*or\s/i.test(q) || /or\s+1\s*=\s*1/i.test(q) || /'\s*=\s*'/.test(q);
      let results;
      if (injected) { results = listings.slice(); if (results.some(l => !l.published)) pass('search-sqli'); }
      else results = listings.filter(l => l.published && (l.name.toLowerCase().includes(q.toLowerCase()) || l.category.toLowerCase().includes(q.toLowerCase())));
      if (hasPayload(q)) pass('search-xss');
      return send(res, 200, layout(req, 'Search', `<h1>Results for: ${q}</h1>${results.map(listingCard).join('') || '<p>No businesses found.</p>'}`));
    }

    /* ------------------------ listings ----------------------- */
    let mm;
    if ((mm = pathname.match(/^\/listings\/(\d+)$/)) && method === 'GET') {
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      attempt('Listings & Claims');
      if (!l.published && (!user || user.id !== l.ownerId)) pass('draft-idor');
      return send(res, 200, listingPage(req, l, user));
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/claim$/)) && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Listings & Claims');
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      if (l.ownerId !== null && l.ownerId !== user.id) pass('claim-owned');
      l.ownerId = user.id;
      return redirect(res, '/listings/' + l.id);
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/edit$/))) {
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      if (!user) return redirect(res, '/login');
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Edit listing', `<h1>Edit listing</h1>
        <form method="POST" action="/listings/${l.id}/edit"><input type="hidden" name="hx_origin" value="same-site">
        <p>Name <input name="name" value="${esc(l.name)}" style="width:280px"></p>
        <p>Category <input name="category" value="${esc(l.category)}"></p>
        <p>Phone <input name="phone" value="${esc(l.phone)}"></p>
        <p>Description <input name="description" value="${esc(l.description)}" style="width:340px"></p>
        <button>Save changes</button></form>`));
      }
      attempt('Listings & Claims');
      if (user.id !== l.ownerId && user.role !== 'admin') pass('edit-idor');
      if (body.name) l.name = String(body.name);
      if (body.category) l.category = String(body.category);
      if (body.phone) l.phone = String(body.phone);
      if (body.description) l.description = String(body.description);
      return redirect(res, '/listings/' + l.id);
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/premium$/))) {
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      if (!user) return redirect(res, '/login');
      if (method === 'GET') {
        return send(res, 200, layout(req, 'Premium placement', `<h1>Premium placement — ${esc(l.name)}</h1>
        <p>Premium listings appear first and carry the PREMIUM badge. Price: <b>$${PREMIUM_PRICE}</b> one-off.</p>
        <p>Launch offer: coupon <b>DIR100</b> = 100% off, single-use.</p>
        <form method="POST" action="/listings/${l.id}/premium">
        <input name="amount" value="${PREMIUM_PRICE}" style="width:80px"> <input name="coupon" placeholder="Coupon code"> <button>Activate premium</button></form>`));
      }
      attempt('Premium & Placement');
      const coupon = String(body.coupon || '');
      const amount = Number(body.amount);
      if (coupon === 'DIR100') {
        if (usedCoupons.has('DIR100')) pass('premium-coupon');
        usedCoupons.add('DIR100');
        l.premium = true;
      } else if (!Number.isNaN(amount) && amount < PREMIUM_PRICE) {
        pass('premium-tamper');
        l.premium = true;
      } else if (!Number.isNaN(amount) && amount >= PREMIUM_PRICE) {
        l.premium = true;
      }
      return redirect(res, '/listings/' + l.id);
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/review$/)) && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Reviews');
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      const stars = Number(body.stars);
      const text = String(body.text || '');
      if (!Number.isNaN(stars) && (stars > 5 || stars < 1)) pass('review-stars');
      if (hasPayload(text)) pass('review-xss');
      reviews.push({ id: nextReviewId++, listingId: l.id, authorId: user.id, stars: Number.isNaN(stars) ? 5 : stars, text });
      return redirect(res, '/listings/' + l.id);
    }
    if ((mm = pathname.match(/^\/reviews\/(\d+)\/delete$/)) && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Reviews');
      const r = reviews.find(x => x.id === Number(mm[1]));
      if (r) {
        if (r.authorId !== user.id) pass('review-delete');
        reviews = reviews.filter(x => x.id !== r.id);
        return redirect(res, '/listings/' + r.listingId);
      }
      return redirect(res, '/');
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/inquire$/)) && method === 'POST') {
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      inquiries.push({ id: nextInquiryId++, listingId: l.id, fromName: String(body.fromName || ''), fromEmail: String(body.fromEmail || ''), message: String(body.message || '') });
      return send(res, 200, layout(req, 'Inquiry sent', '<h1>Thanks — your inquiry was sent to the business.</h1><p><a href="/">Back to directory</a></p>'));
    }
    if ((mm = pathname.match(/^\/listings\/(\d+)\/inquiries$/)) && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Lead Inquiries');
      const l = listings.find(x => x.id === Number(mm[1]));
      if (!l) return send(res, 404, 'Listing not found.');
      if (user.id !== l.ownerId) pass('inquiry-list-idor');
      const mine = inquiries.filter(i => i.listingId === l.id);
      return send(res, 200, layout(req, 'Inquiries', `<h1>Inquiries for ${esc(l.name)}</h1>
      ${mine.map(i => `<p><a href="/inquiries/${i.id}">#${i.id}</a> — ${esc(i.fromName)} (${esc(i.fromEmail)}): ${esc(i.message)}</p>`).join('') || '<p>No inquiries yet.</p>'}`));
    }
    if ((mm = pathname.match(/^\/inquiries\/(\d+)$/)) && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Lead Inquiries');
      const inq = inquiries.find(x => x.id === Number(mm[1]));
      if (!inq) return send(res, 404, 'Inquiry not found.');
      const l = listings.find(x => x.id === inq.listingId);
      if (!l || l.ownerId !== user.id) pass('inquiry-idor');
      return send(res, 200, layout(req, 'Inquiry', `<h1>Inquiry #${inq.id}</h1>
      <p><b>From:</b> ${esc(inq.fromName)} (${esc(inq.fromEmail)})</p><p><b>For listing:</b> ${l ? esc(l.name) : '?'}</p><p>${esc(inq.message)}</p>`));
    }

    /* ------------------------- admin ------------------------- */
    if (pathname === '/admin' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Admin Panel');
      const c = parseCookies(req);
      if (c.hx_role === 'admin') {
        if (user.role !== 'admin') pass('auth-cookie');
        return send(res, 200, layout(req, 'Admin', `<h1>Admin panel</h1>
        <p>Welcome, admin. User management data: <a href="/admin/users.json">/admin/users.json</a></p>
        ${users.map(u => `<p>${u.id}. ${u.name} — ${esc(u.email)} — role ${esc(u.role)} ${u.disabled ? '(DISABLED)' : ''}
          <form method="POST" action="/admin/users/${u.id}/disable" style="display:inline"><button>Disable user</button></form></p>`).join('')}`));
      }
      return send(res, 403, layout(req, 'Forbidden', '<h1>403 — Admins only</h1>'));
    }
    if (pathname === '/admin/users.json' && method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Admin Panel');
      if (user.role !== 'admin') pass('admin-bac');
      return send(res, 200, JSON.stringify(users, null, 2), 'application/json');
    }
    if ((mm = pathname.match(/^\/admin\/users\/(\d+)\/disable$/)) && method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Admin Panel');
      const target = users.find(u => u.id === Number(mm[1]));
      if (body.hx_origin !== 'same-site') pass('admin-csrf');
      if (target) target.disabled = true;
      return redirect(res, '/admin');
    }

    /* ----------------------- lab pages ----------------------- */
    if (pathname === '/' && method === 'GET') return send(res, 200, homePage(req));
    if (pathname === '/tests' && method === 'GET') {
      const fs2 = featuresSummary();
      const groups = Object.keys(fs2).map(f => {
        const list = TESTS.filter(t => t.feature === f);
        return `<h2>${esc(f)} <small style="color:#6b7280">(${fs2[f].done}/${fs2[f].total} done · ${fs2[f].attempts} attempts)</small></h2>` +
          list.map(t => `<div style="border:1px solid #d1d5db;border-radius:8px;padding:12px;margin:8px 0;background:#fff">
            <b>${state.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</b> <span style="color:#6b7280">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
            <details><summary style="cursor:pointer;color:#1d4ed8">Hints</summary>
            <ol>${t.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details></div>`).join('');
      }).join('');
      const p = progress();
      return send(res, 200, layout(req, 'Mission Board', `<h1>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
      <p>${p.done}/${p.total} tests complete (${p.pct}%). Tests complete by DOING the exploit — the server detects the real effect.</p>${groups}`));
    }
    if (pathname === '/complete/name' && method === 'POST') {
      if (body.name) { state.testerName = String(body.name).slice(0, 60); saveState(); }
      return redirect(res, '/complete');
    }
    if (pathname === '/complete' && method === 'GET') {
      const p = progress();
      if (!p.complete) {
        const left = TESTS.filter(t => !state.tests[t.id]);
        return send(res, 200, layout(req, 'Completion', `<h1>Not complete yet</h1>
        <p>Progress: ${p.done}/${p.total} (${p.pct}%). Remaining tests:</p>
        <ul>${left.map(t => `<li>${esc(t.name)} — ${esc(t.feature)}</li>`).join('')}</ul>
        <p>See the <a href="/tests">Mission Board</a> for hints.</p>`));
      }
      const fs2 = featuresSummary();
      const key = assembleCompletionKey();
      const bodyHtml = `<h1>LAB ${LAB_NUMBER} — ${LAB_NAME} COMPLETE 🎉</h1>
      <h2>1) Features in this lab</h2><p>${Object.keys(fs2).length} features.</p>
      <h2>2) Vulnerabilities per feature</h2><ul>${Object.entries(fs2).map(([f, v]) => `<li>${esc(f)}: ${v.total}</li>`).join('')}</ul>
      <h2>3) Ways testing was done (${p.total} techniques)</h2><ul>${TESTS.map(t => `<li>${esc(t.name)}</li>`).join('')}</ul>
      <h2>4) What you learned</h2><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
      <h2>5) What this means for a real client</h2><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
      <h2>6) Writing it in a real report</h2><ul>${TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)} — Remediation: ${esc(t.report.remediation)}</li>`).join('')}</ul>
      <h2>Your completion key</h2>
      <p style="font-size:20px;background:#ecfdf5;border:1px solid #10b981;padding:12px;border-radius:8px"><b>${key}</b></p>
      <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it. Keep it safe.</p>
      <form method="POST" action="/complete/name"><input name="name" placeholder="Your name for the certificate" value="${esc(state.testerName)}" style="padding:8px">
      <button style="padding:8px 14px">Save name</button></form>
      <p><a href="/certificate">View your certificate</a></p>`;
      return send(res, 200, layout(req, 'Complete', bodyHtml));
    }
    if (pathname === '/certificate' && method === 'GET') {
      const p = progress();
      if (!p.complete) return send(res, 200, layout(req, 'Certificate', '<h1>Certificate locked</h1><p>Complete 100% of the tests first — see <a href="/complete">Completion</a>.</p>'));
      const name = state.testerName || (user ? user.name : 'HexaCyberLab Tester');
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      const fcount = Object.keys(featuresSummary()).length;
      return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#f3f4f6;margin:0;padding:30px}
      .card{max-width:720px;margin:0 auto;background:#fff;border:3px solid #1f2937;border-radius:12px;padding:36px;text-align:center}</style></head>
      <body><div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:64px">
      <h1 style="margin:10px 0">Certificate of Completion</h1>
      <p>This certifies that</p><h2 style="margin:6px 0">${esc(name)}</h2>
      <p>has completed 100% of the security tests in <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b><br>(${p.total} tests across ${fcount} features)</p>
      <p>${date}</p><p style="color:#4b5563">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      <button onclick="window.print()">Print</button></div></body></html>`);
    }

    return send(res, 404, layout(req, 'Not found', '<h1>404 — Not found</h1>'));
  } catch (e) {
    try { send(res, 200, layout(req, 'Oops', '<h1>Something went sideways, but the lab is still up.</h1><p><a href="/">Home</a></p>')); } catch (e2) { /* socket gone */ }
  }
});

/* ------------------------- doc generation ------------------------ */
function genDocs() {
  const byFeature = {};
  for (const t of TESTS) { (byFeature[t.feature] = byFeature[t.feature] || []).push(t); }
  let vuln = '# HexaDirectory (LAB 100) — Vulnerability Map\n\nThe complete map of scored tests in this lab, grouped by feature. Every entry is a real, working flaw in the app; detection is server-side, on the exploit\'s real effect.\n';
  for (const [f, list] of Object.entries(byFeature)) {
    vuln += '\n## ' + f + '\n';
    for (const t of list) vuln += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Difficulty:** ' + t.difficulty + '\n- **Location:** ' + t.where + '\n- **Exploitation outline:** ' + t.how + '\n- **Impact:** ' + t.impact + '\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaDirectory (LAB 100) — Practice Guide\n\nChallenges grouped by feature, then difficulty. Work them in the app; the Mission Board at /tests mirrors this guide. Help from the Lab Coach for a feature unlocks after 3 genuine attempts on that feature.\n';
  for (const [f, list] of Object.entries(byFeature)) {
    guide += '\n## ' + f + '\n';
    for (const t of list.slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### ' + t.name + ' (' + t.difficulty + ')\n- **Objective:** Make the "' + t.name + '" test flip to done on the Mission Board by performing the real exploit at ' + t.where + '.\n- **Hints:**\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaDirectory (LAB 100) — Fix & Retest\n\nFor every scored test: the secure implementation and the regression check that proves the fix. After fixing, re-run the exploit — it must fail — and re-run the normal user flow — it must still work.\n';
  for (const t of TESTS) {
    fix += '\n## ' + t.report.title + '\n- **Severity:** ' + t.report.severity + '\n- **Location:** ' + t.where + '\n- **Secure implementation:** ' + t.report.remediation + '\n- **Regression test:** Re-attempt the original exploit (' + t.how + ') — it must no longer succeed, and the test must not flip on a fresh progress state. Then verify the legitimate flow still works end-to-end.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from', TESTS.length, 'tests.');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
server.listen(PORT, HOST, () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT));
