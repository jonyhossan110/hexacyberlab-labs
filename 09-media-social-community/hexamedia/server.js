'use strict';
/*
 * HexaMedia — LAB 83 (Category 9: Media, Social & Community)
 * A deliberately vulnerable digital-publication practice lab for HexaCyberLab.
 * Zero-dependency Node.js. LOCAL USE ONLY — never deploy this publicly.
 * Fake seed data only; no real credentials, no real articles.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 83;
const LAB_NAME = 'HexaMedia';
const PORT = 3092;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Scattered configuration fragments — region 1 of 4.
 * The lab's chain keys are never stored whole anywhere in this file;
 * they exist only as transformed fragments in separate regions and
 * are reassembled in memory at the single moment they are needed.
 * ------------------------------------------------------------------ */
const _fragA = ["TC1YSA==","Ri0zOA==","UEtSNg=="];
const _fragB = ["TC1YSA==","My00OA==","TlVSVQ=="];

/* ------------------------- progress engine ------------------------ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    if (s && typeof s === 'object') state = Object.assign(state, s);
  } catch (e) { /* fresh install */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
loadState();

/* --------------------------- seed data ---------------------------- */
/* All people, articles and addresses below are invented for this lab. */
let users = [
  { id: 1, email: 'admin@hexamedia.local',  password: 'admin123',  name: 'Ada Admin',    role: 'admin',  plan: 'premium', couponsUsed: [], resetIssued: null, subPaid: 12 },
  { id: 2, email: 'editor@hexamedia.local', password: 'editor123', name: 'Eddie Editor', role: 'editor', plan: 'premium', couponsUsed: [], resetIssued: null, subPaid: 12 },
  { id: 3, email: 'author@hexamedia.local', password: 'author123', name: 'Amy Author',   role: 'author', plan: 'premium', couponsUsed: [], resetIssued: null, subPaid: 12 },
  { id: 4, email: 'alice@test.local',       password: 'alice123',  name: 'Alice Reader', role: 'reader', plan: 'free',    couponsUsed: [], resetIssued: null, subPaid: 0 },
  { id: 5, email: 'bob@test.local',         password: 'bob123',    name: 'Bob Reader',   role: 'reader', plan: 'premium', couponsUsed: [], resetIssued: null, subPaid: 12 },
  { id: 6, email: 'demo@hexamedia.local',   password: 'demo1234',  name: 'Demo Reader',  role: 'reader', plan: 'free',    couponsUsed: [], resetIssued: null, subPaid: 0 }
];
let nextUserId = 7;

const PREMIUM_BODY_1 = 'PREMIUM INVESTIGATION — The board minutes, obtained through a public-records request, show the merger was approved three weeks before the public announcement. Executives sold shares through a family trust in the interval. This full investigation is for subscribers only.';
const PREMIUM_BODY_2 = 'PREMIUM INVESTIGATION — The offshore accounts investigation traced payments through four jurisdictions. The complete money trail, the documents and the names are in this subscriber-only report.';
let articles = [
  { id: 1, title: 'City Council Approves New Transit Plan', body: 'The city council voted 7-2 on Tuesday to approve the new transit plan, the largest infrastructure package in a decade. Construction begins in spring and the first line opens in two years.', premium: false, status: 'published', authorId: 3 },
  { id: 2, title: 'Inside the Merger: What the Board Minutes Reveal', body: PREMIUM_BODY_1, premium: true, status: 'published', authorId: 3 },
  { id: 3, title: 'Draft: Whistleblower Interview Transcript', body: 'DRAFT — DO NOT PUBLISH. Unedited transcript of the whistleblower interview, including names that legal has not cleared yet.', premium: false, status: 'draft', authorId: 3 },
  { id: 4, title: 'The Offshore Accounts Investigation', body: PREMIUM_BODY_2, premium: true, status: 'published', authorId: 2 },
  { id: 5, title: 'Review: Leaked Product Roadmap Analysis', body: 'IN REVIEW — Analysis of the leaked product roadmap. An editor must check the sourcing before this can go live.', premium: false, status: 'review', authorId: 2 },
  { id: 6, title: 'Morning Briefing: Markets at a Glance', body: 'Markets opened flat, the currency held steady, and the central bank signalled no change this quarter. Here is everything you need before the opening bell.', premium: false, status: 'published', authorId: 2 }
];
let nextArticleId = 7;

let comments = [
  { id: 1, articleId: 1, userId: 4, body: 'Great reporting, thank you.' },
  { id: 2, articleId: 1, userId: 5, body: 'Finally someone covered the transit vote properly.' },
  { id: 3, articleId: 6, userId: 4, body: 'Useful briefing as always.' }
];
let nextCommentId = 4;

let newsletterSubs = ['reader.one@example.com', 'reader.two@example.com', 'fan.of.news@example.net'];

const sessions = new Map(); // sid -> userId
const failedLogins = {};    // email -> count
const probeSeen = { distinct: new Set(), sawExisting: false, sawMissing: false };

/* --------------------- key fragment assembly ---------------------- */
function _un(frag) {
  return frag.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
function entryKey() { return _un(_fragA.concat(_fragC)); }        // assembled only inside /unlock
function completionKey() { return _un(_fragB.concat(_fragD)); }   // assembled only at 100%

/* ------------------------- TESTS registry ------------------------- */
const F = {
  AUTH: 'Login & Authentication',
  REG: 'Registration & Profile',
  ART: 'Articles & Paywall',
  ED: 'Editorial Workflow',
  SUB: 'Subscriptions & Payments',
  COM: 'Comments',
  NEWS: 'Newsletter & Audience',
  ADM: 'Admin Panel',
  API: 'Platform & API'
};
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: F.AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    location: 'POST /login', exploit: 'Submit an email such as \' OR \'1\'=\'1 so the string-built query matches the first account without knowing its password.',
    hints: ['The login form builds its account lookup by gluing your input into a query string.', 'Try a classic tautology in the email field — quote, OR, quote-one-quote equals quote-one-quote.', 'Email: \' OR \'1\'=\'1 with any password signs you in as the first account in the table.'],
    lesson: 'String-built queries let attackers rewrite the logic of the query itself; a login is the worst place for it because one bypass hands over an account.',
    impact: 'On a real publication this means an attacker signs in as the admin without any password — every draft, subscriber record and article is theirs.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL by string concatenation.' } },
  { id: 'auth-brute', feature: F.AUTH, name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    location: 'POST /login', exploit: 'Send 10 or more wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.',
    hints: ['Pick one real account and keep guessing wrong passwords.', 'Count the failures — does anything slow down or lock after 5, 10, 20 tries?', 'Ten failed logins for bob@test.local, one after another, are all processed normally.'],
    lesson: 'Without throttling, an attacker can script unlimited password guesses until one works; the defence is rate limiting, lockout and alerting.',
    impact: 'A real newsroom account with a weak password would fall to an automated guessing script in hours, giving attackers a genuine login.',
    report: { title: 'Missing Brute-Force Protection on Login (No Rate Limiting or Lockout)', severity: 'High', remediation: 'Add per-account and per-IP rate limiting, progressive delays and lockout with alerting.' } },
  { id: 'auth-enum', feature: F.AUTH, name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    location: 'POST /login and POST /forgot', exploit: 'Probe at least 5 different emails; existing accounts answer "Incorrect password" / "Reset link sent" while unknown emails answer "No account with that email", revealing which emails are registered.',
    hints: ['Compare the error message for a real email and an invented one — on login and on forgot-password.', 'The two forms answer differently depending on whether the account exists.', 'Probe 5+ emails (a mix of real and fake) and note the two different responses.'],
    lesson: 'Different answers for "no such account" and "wrong password" hand attackers a verified list of registered emails to target.',
    impact: 'Attackers harvest the publication\'s real subscriber and staff emails, then aim phishing and password attacks only at accounts that exist.',
    report: { title: 'User Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all login and reset outcomes regardless of account existence.' } },
  { id: 'auth-default', feature: F.AUTH, name: 'Published Demo Credentials', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    location: 'Login page / POST /login', exploit: 'The login page itself prints a working demo account (demo@hexamedia.local / demo1234). Sign in with it.',
    hints: ['Read the login page carefully — it is more helpful than it should be.', 'A demo account is advertised right under the form.', 'Use the printed demo email and password to sign in.'],
    lesson: 'Credentials printed on the site or left at defaults are the first thing attackers try; demo accounts must be disabled or strongly protected in production.',
    impact: 'Anyone on the internet gets a free working login to the publication, a foothold for probing every logged-in feature.',
    report: { title: 'Working Demo Credentials Published on the Login Page', severity: 'Medium', remediation: 'Remove demo accounts and published credentials from production; rotate any shared passwords.' } },
  { id: 'auth-reset', feature: F.AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Intermediate',
    location: 'POST /reset', exploit: 'Reset tokens follow a formula from the user id: HM<id>-<id*137+42>. Compute Bob\'s (id 5) token and reset his password without ever requesting a reset email.',
    hints: ['Ask for one reset email and study the shape of the token — it is built from something public.', 'The token contains the user id and simple arithmetic on it.', 'For user id 5 the token is HM5-(5*137+42). POST it to /reset with a new password for bob@test.local.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from a user id is an account-takeover machine.',
    impact: 'An attacker resets the editor-in-chief\'s password from nothing but her user id and takes over the newsroom\'s most powerful account.',
    report: { title: 'Predictable Password Reset Token Enables Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F.AUTH, name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'GET /editor and GET /admin', exploit: 'The app trusts the client-supplied hx_role cookie for its editorial and admin gates. As a reader, set hx_role=admin and open /admin.',
    hints: ['After logging in, look at the cookies the app sets — one of them carries your role.', 'The server believes that cookie instead of checking your account.', 'Keep your reader session but change hx_role to admin, then visit /admin.'],
    lesson: 'Authorisation decisions must come from server-side session data, never from values the client can edit.',
    impact: 'Every reader becomes an admin by editing one cookie — full control of users, roles and content on the real site.',
    report: { title: 'Authorisation Bypass via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record only; ignore client-supplied role values.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpass', feature: F.REG, name: 'Weak Password Policy — 1-Character Passwords', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Beginner',
    location: 'POST /register', exploit: 'Register a new account with a 1-character password; it is accepted.',
    hints: ['Try registering with the shortest password you can think of.', 'There is no length or complexity check at all.', 'Password "x" creates a working account.'],
    lesson: 'Password policy is the floor under every other control; a 1-character password can be guessed instantly.',
    impact: 'Subscribers who choose tiny passwords are compromised in seconds by guessing, and their accounts are used for spam and fraud.',
    report: { title: 'Weak Password Policy Allows Single-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length of 12 characters and screen against breached-password lists.' } },
  { id: 'reg-massassign', feature: F.REG, name: 'Mass Assignment — Role & Plan at Registration', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /register', exploit: 'Add role=editor (or admin) and plan=premium fields to the registration request; the server copies them onto the new account.',
    hints: ['The registration form shows email, password and name — but the server reads more fields than the form shows.', 'What fields would a user object have that you wish you could set?', 'POST /register with extra fields role=editor and plan=premium.'],
    lesson: 'Binding request bodies straight onto data models lets attackers set privileged fields the UI never offered.',
    impact: 'Attackers mint themselves editor accounts with free premium access — they can publish under the publication\'s name and read everything.',
    report: { title: 'Mass Assignment in Registration Allows Privilege Escalation', severity: 'High', remediation: 'Whitelist the exact fields registration may set (email, password, name) and ignore everything else.' } },
  { id: 'reg-storedxss', feature: F.REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    location: 'POST /register or POST /profile (name field)', exploit: 'Set a display name containing an HTML/JS payload such as <script>alert(1)</script>; it is stored and rendered raw wherever the name appears.',
    hints: ['Your display name is shown back on pages and next to your comments.', 'Is the name escaped when it is printed?', 'Register with the name <script>alert(1)</script> and view any page that shows it.'],
    lesson: 'Every user-controlled string that is rendered must be output-encoded; names are a classic stored-XSS carrier because developers trust them.',
    impact: 'The payload runs in other readers\' and editors\' browsers — session theft, fake login forms and defaced pages under the publication\'s brand.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied values on output and validate names against an allowlist of characters.' } },
  { id: 'reg-csrf', feature: F.REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /profile', exploit: 'Change a profile with a POST that carries no hx_origin marker; the server never verifies the request really came from its own form.',
    hints: ['Legit forms on this site carry a hidden hx_origin field that matches a cookie.', 'What happens if a state-changing POST simply leaves it out?', 'POST /profile with a new name and no hx_origin field at all.'],
    lesson: 'State-changing endpoints need an unguessable, verified anti-CSRF token; a marker that is never checked is decoration.',
    impact: 'A booby-trapped page a reader visits silently rewrites their profile — the classic stepping stone to account-takeover chains.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require and verify a per-session anti-CSRF token on every state-changing request.' } },

  /* ---- Articles & Paywall ---- */
  { id: 'art-paywall', feature: F.ART, name: 'Paywall Bypass — Premium Article Without a Subscription', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    location: 'GET /article/<id>', exploit: 'A free reader can read a full premium article by adding ?full=1 to the URL (or setting the hx_sub=premium cookie); the server honours the client\'s word.',
    hints: ['A free account sees only the first lines of a premium article. What decides "full" vs "teaser"?', 'Try asking the URL for the full version directly.', 'Open /article/2?full=1 while signed in as a free reader — or set cookie hx_sub=premium.'],
    lesson: 'Entitlement checks belong on the server against the account record; query flags and cookies are requests, not proof.',
    impact: 'The publication\'s paid content is free to anyone who adds four characters to a URL — the subscription business quietly stops earning.',
    report: { title: 'Paywall Bypass via Client-Controlled Parameter', severity: 'High', remediation: 'Check the subscription status server-side from the account record before serving premium content.' } },
  { id: 'art-draft-idor', feature: F.ART, name: 'Draft & In-Review Articles Exposed by ID (IDOR)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    location: 'GET /article/<id>', exploit: 'Article ids are sequential and unpublished pieces are served to any signed-in reader who guesses the id — open the draft (id 3) or the in-review piece (id 5) as a plain reader.',
    hints: ['Published articles have small sequential ids. What about the unpublished ones?', 'Sign in as a reader and walk the id numbers past the published ones.', 'GET /article/3 as alice@test.local returns the full draft text.'],
    lesson: 'Unpublished content needs the same authorisation as any private object: check status and ownership on every request, not just in the listing.',
    impact: 'Embargoed investigations and legally un-cleared drafts leak before publication — sources exposed, lawsuits invited, stories spoiled.',
    report: { title: 'Insecure Direct Object Reference Exposes Draft and In-Review Articles', severity: 'High', remediation: 'Enforce status and ownership checks on article reads; return 404 for content the requester may not see.' } },
  { id: 'art-search-sqli', feature: F.ART, name: 'SQL Injection in Article Search', owasp: 'A03:2021 — Injection', difficulty: 'Intermediate',
    location: 'GET /search?q=', exploit: 'Search with \' OR \'1\'=\'1 and the string-built query returns every article in the table — including drafts and in-review pieces.',
    hints: ['Search filters titles with a string-built query, just like the login form.', 'A tautology makes the filter match everything.', 'q = \' OR \'1\'=\'1 lists drafts that never appear in normal search.'],
    lesson: 'Every input that reaches a query is an injection surface, not just login forms; search is a favourite because it is rarely reviewed.',
    impact: 'Attackers dump the publication\'s entire content store — published, draft and embargoed — through one search box.',
    report: { title: 'SQL Injection in Article Search Discloses Unpublished Content', severity: 'High', remediation: 'Use parameterised queries for search filters and restrict results to published content server-side.' } },
  { id: 'art-reflected-xss', feature: F.ART, name: 'Reflected XSS in Search', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    location: 'GET /search?q=', exploit: 'The search term is reflected unescaped in the results heading; search for <script>alert(1)</script> and it executes.',
    hints: ['The results page repeats your search term back to you.', 'Does it escape HTML in that echo?', 'Search for an <script> payload and view the page source.'],
    lesson: 'Reflected input must be encoded for the context it lands in; "it\'s only an echo" is how phishing links to a trusted domain are born.',
    impact: 'Attackers send readers links to the real publication domain that run script in their browsers — credential phishing with the brand\'s own trust.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'HTML-encode reflected input and deploy a Content-Security-Policy as defence in depth.' } },

  /* ---- Editorial Workflow ---- */
  { id: 'ed-publish', feature: F.ED, name: 'Anyone Can Publish Articles', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /article/<id>/status', exploit: 'The status endpoint checks only that you are signed in. As a plain reader, POST status=published for a draft and it goes live.',
    hints: ['Publishing is supposed to be an editor decision after review. Who does the endpoint actually check?', 'The workflow buttons live in the editorial console, but the endpoint behind them is open.', 'As alice (a reader), POST /article/3/status with status=published.'],
    lesson: 'Workflow state changes are authorisation-critical: the server must verify the caller\'s role for each transition, not rely on which UI they used.',
    impact: 'Anyone can push unreviewed, legally risky copy live under the masthead — one request turns a draft allegation into a published claim.',
    report: { title: 'Broken Access Control Allows Unauthorised Article Publishing', severity: 'High', remediation: 'Require editor or admin role server-side for publish transitions and log all status changes.' } },
  { id: 'ed-edit-other', feature: F.ED, name: 'Editing Other Writers\' Articles (No Ownership Check)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /article/<id>/edit', exploit: 'The edit endpoint never checks ownership. As one user, edit an article written by someone else (e.g. id 5, the editor\'s piece in review).',
    hints: ['The edit form exists for your own pieces. Does the endpoint compare the author id to your session?', 'Try editing an article whose author is not you.', 'As alice, POST new title/body to /article/5/edit.'],
    lesson: 'Ownership is an authorisation rule, not a UI convenience: every object mutation must verify the caller owns it or holds a privileged role.',
    impact: 'A disgruntled account rewrites colleagues\' stories before publication — sabotage and misinformation inside the newsroom\'s own pipeline.',
    report: { title: 'Missing Ownership Check Allows Editing Other Authors\' Articles', severity: 'High', remediation: 'Verify article ownership (or editor/admin role) server-side on every edit.' } },

  /* ---- Subscriptions & Payments ---- */
  { id: 'sub-price', feature: F.SUB, name: 'Subscription Price Tampering', owasp: 'A04:2021 — Insecure Design', difficulty: 'Beginner',
    location: 'POST /subscribe', exploit: 'The subscribe form posts a price field the server trusts. Subscribe to Premium posting price=1 and the $12 plan activates for $1.',
    hints: ['The subscribe form carries the price in a hidden field.', 'Hidden fields are visible — and editable.', 'POST /subscribe with plan=premium and price=1.'],
    lesson: 'Prices must be looked up server-side from the plan, never accepted from the client; any client-sent amount is a suggestion attackers will lower.',
    impact: 'Premium subscriptions sell for a dollar — direct revenue loss that scales with every "customer" who finds the trick.',
    report: { title: 'Price Tampering in Subscription Checkout', severity: 'High', remediation: 'Determine the charge from the server-side plan catalogue and verify the paid amount before activating.' } },
  { id: 'sub-coupon', feature: F.SUB, name: 'Single-Use Coupon Reuse (WELCOME50)', owasp: 'A04:2021 — Insecure Design', difficulty: 'Intermediate',
    location: 'POST /subscribe', exploit: 'WELCOME50 is advertised as one-per-customer, but the server never records its use. Apply it on two separate subscriptions and it works both times.',
    hints: ['The welcome coupon halves the premium price — once per customer, supposedly.', 'Subscribe with it, then subscribe again the same way.', 'Second use of WELCOME50 still takes 50% off.'],
    lesson: 'One-time offers must be recorded server-side per account and checked atomically; "single use" written in marketing copy enforces nothing.',
    impact: 'A "one-time" 50% welcome offer becomes a permanent half-price tier for anyone who notices, halving subscription revenue.',
    report: { title: 'Single-Use Coupon Can Be Redeemed Repeatedly', severity: 'Medium', remediation: 'Persist coupon redemptions per account and reject repeats server-side.' } },
  { id: 'sub-cancel-idor', feature: F.SUB, name: 'Cancel Another Subscriber\'s Subscription (IDOR)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /subscription/<userId>/cancel', exploit: 'The cancel endpoint takes a user id and never checks it is yours. Cancel Bob\'s subscription (user id 5) while signed in as Alice.',
    hints: ['Your account page cancels via a URL containing a user id.', 'Whose id does the endpoint believe?', 'As alice, POST /subscription/5/cancel.'],
    lesson: 'Any endpoint parameterised by user id must verify the id matches the session (or a privileged role) before changing anything.',
    impact: 'Malicious users cancel paying subscribers\' access at will — churn, support chaos and refund demands caused by strangers.',
    report: { title: 'Insecure Direct Object Reference in Subscription Cancellation', severity: 'Medium', remediation: 'Authorise subscription changes against the session user; ignore client-supplied user ids.' } },

  /* ---- Comments ---- */
  { id: 'com-storedxss', feature: F.COM, name: 'Stored XSS in Comments', owasp: 'A03:2021 — Injection', difficulty: 'Beginner',
    location: 'POST /article/<id>/comment', exploit: 'Post a comment containing <script>alert(1)</script> on any article; it is stored and rendered raw to every reader.',
    hints: ['Comments appear under articles exactly as typed.', 'Try markup instead of plain text in a comment.', 'A script payload in a comment body is served back unescaped on the article page.'],
    lesson: 'Comment bodies are untrusted HTML until encoded; stored XSS under a trusted brand is the highest-value kind.',
    impact: 'One comment attacks every reader of a popular article — drive-by script under the publication\'s own pages.',
    report: { title: 'Stored Cross-Site Scripting in Article Comments', severity: 'High', remediation: 'Encode comment output, sanitise any allowed markup and add a Content-Security-Policy.' } },
  { id: 'com-delete-idor', feature: F.COM, name: 'Delete Other Readers\' Comments (IDOR)', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    location: 'POST /comment/<id>/delete', exploit: 'Comment ids are sequential and deletion checks nothing. Delete Bob\'s comment (id 2) while signed in as Alice.',
    hints: ['Your own comments have a delete action. Look at the URL it calls.', 'Does the server ask whose comment it is?', 'As alice, POST /comment/2/delete.'],
    lesson: 'Destructive actions need ownership checks most of all; a delete that trusts the id alone is vandalism-as-a-feature.',
    impact: 'Trolls erase other readers\' contributions and moderation history, poisoning community trust in the publication.',
    report: { title: 'Missing Authorisation on Comment Deletion (IDOR)', severity: 'Medium', remediation: 'Only the comment owner or a moderator may delete; verify server-side on each request.' } },

  /* ---- Newsletter & Audience ---- */
  { id: 'news-list-leak', feature: F.NEWS, name: 'Newsletter Subscriber List Exposure', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    location: 'GET /newsletter/subscribers', exploit: 'The subscriber list page requires only a login — any reader can open it and harvest every subscriber email address.',
    hints: ['The newsletter has an admin-ish page listing everyone who signed up.', 'It asks whether you are logged in, not who you are.', 'Sign in as any reader and open /newsletter/subscribers.'],
    lesson: 'Audience data is personal data: list endpoints need role checks, and "hidden URL" is not an access control.',
    impact: 'The publication\'s entire subscriber email list — its core commercial asset and a privacy liability — is one click from any account.',
    report: { title: 'Newsletter Subscriber List Exposed to Any Authenticated User', severity: 'High', remediation: 'Restrict audience data to admin role and audit access to personal data.' } },

  /* ---- Admin Panel ---- */
  { id: 'adm-bac', feature: F.ADM, name: 'Admin User Data Endpoint Without Role Check', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Beginner',
    location: 'GET /admin/users.json', exploit: 'The JSON user dump checks only that a session exists. Any reader can fetch every account including passwords.',
    hints: ['The admin console loads its user table from a JSON endpoint.', 'That endpoint is less careful than the page.', 'As a reader, GET /admin/users.json.'],
    lesson: 'API endpoints behind admin UIs need the same role checks as the pages; attackers call the API directly.',
    impact: 'Every staff and subscriber password is exposed to any signed-in user — instant full compromise of the publication.',
    report: { title: 'Broken Access Control on Admin User Data Endpoint', severity: 'Critical', remediation: 'Enforce admin role on the endpoint and never return password material in API responses.' } },
  { id: 'adm-csrf', feature: F.ADM, name: 'CSRF on Admin Role Change', owasp: 'A01:2021 — Broken Access Control', difficulty: 'Intermediate',
    location: 'POST /admin/user/<id>/role', exploit: 'Promote or demote a user with a POST that carries no hx_origin marker; the admin action has no CSRF verification.',
    hints: ['The admin role form carries the hx_origin marker — but is it checked?', 'Replay the role change without the marker field.', 'With admin access, POST /admin/user/4/role with role=author and no hx_origin.'],
    lesson: 'Privileged actions are the most valuable CSRF targets; tokens must be verified, not merely present in the form.',
    impact: 'A single malicious page visited by the admin silently promotes an attacker to editor — or demotes the real staff.',
    report: { title: 'Missing CSRF Protection on Administrative Role Changes', severity: 'High', remediation: 'Verify anti-CSRF tokens on all admin actions and require re-authentication for role changes.' } },

  /* ---- Platform & API ---- */
  { id: 'api-token', feature: F.API, name: 'Weak API Token (Base64 of Email) Leaks Premium Content', owasp: 'A07:2021 — Authentication Failures', difficulty: 'Intermediate',
    location: 'GET /api/premium', exploit: 'The API accepts X-Api-Token equal to the base64 of a subscriber\'s email. Compute it for editor@hexamedia.local and read all premium articles.',
    hints: ['The API wants a token header. Tokens here are derived from something public about the account.', 'What is the most guessable encoding of an email address?', 'X-Api-Token = base64("editor@hexamedia.local") returns the premium catalogue.'],
    lesson: 'API tokens must be unguessable random secrets; anything derived from public identifiers is an open door with a welcome mat.',
    impact: 'The entire premium archive is downloadable by anyone who can base64-encode an email address found on the site.',
    report: { title: 'Weak API Token Derivation Allows Premium Content Theft', severity: 'High', remediation: 'Issue random, revocable API tokens stored hashed server-side; never derive tokens from public data.' } },
  { id: 'api-debug', feature: F.API, name: 'Unauthenticated Debug Endpoint Dumps All Accounts', owasp: 'A05:2021 — Security Misconfiguration', difficulty: 'Beginner',
    location: 'GET /api/debug', exploit: 'Open /api/debug with no login at all; it returns every user including passwords, left over from development.',
    hints: ['Developers leave helpful endpoints behind. Try the obvious name.', 'No session is needed for this one.', 'GET /api/debug returns the full user table.'],
    lesson: 'Debug and diagnostics endpoints must never reach production; if they do, they must require admin authentication.',
    impact: 'A completely unauthenticated visitor downloads every account and password — the worst finding a publication can have.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes All User Accounts and Passwords', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and scan deployments for leftover diagnostics.' } }
];

/* ---------------------- progress helpers -------------------------- */
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (state.tests[id]) return;
  state.tests[id] = true;
  if (isComplete() && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: state.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (state.tests[t.id]) out[t.feature].done++;
  }
  for (const k of Object.keys(out)) out[k].attempts = state.attempts[k] || 0;
  return out;
}

/* --------------------- detection primitives ----------------------- */
const XSS_RE = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*\sonerror|<iframe|<body[^>]*\sonload/i;
function hasXss(s) { return typeof s === 'string' && XSS_RE.test(s); }
const SQLI_RE = /('\s*(or|and)\s+'|'\s*(or|and)\s+\d|union\s+select|or\s+1\s*=\s*1|'\s*or\s*'|"\s*or\s*")/i;
function hasSqli(s) { return typeof s === 'string' && SQLI_RE.test(s); }
function tokenFor(user) { return 'HM' + user.id + '-' + (user.id * 137 + 42); } // deliberately predictable (the flaw)
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function articleById(id) { return articles.find(a => a.id === Number(id)); }

/* ------------------------------------------------------------------ *
 * Scattered configuration fragments — region 2 of 4.
 * ------------------------------------------------------------------ */
const _fragC = ["LTdEMQ==","MVpMMA==","QkhGUQ=="];

/* ------------------------- HTTP helpers --------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 200000) { req.destroy(); } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
          const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
          out[k] = v;
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, headers) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, headers || {}));
  res.end(body);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function redirect(res, to, headers) { res.writeHead(302, Object.assign({ Location: to }, headers || {})); res.end(''); }

/* --------------------------- layout ------------------------------- */
function progressBarHtml() {
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);
  return `<div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:8px 12px;margin:10px 0;">
    <div style="color:#e5e7eb;font-size:13px;">LAB ${LAB_NUMBER} · ${done}/${total} tests · ${pct}%</div>
    <div style="background:#1f2937;border-radius:4px;height:10px;margin-top:6px;"><div style="background:#7c3aed;height:10px;border-radius:4px;width:${pct}%;"></div></div>
  </div>`;
}
function chatWidgetHtml() {
  return `<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:300px;background:#0b1220;border:1px solid #7c3aed;border-radius:10px;color:#e5e7eb;font-family:monospace;z-index:50;">
    <div style="background:#7c3aed;color:#fff;padding:6px 10px;border-radius:10px 10px 0 0;font-size:13px;">Lab Coach — HexaMedia</div>
    <div id="hxlog" style="height:150px;overflow:auto;padding:8px;font-size:12px;"></div>
    <div style="display:flex;border-top:1px solid #374151;"><input id="hxmsg" style="flex:1;background:#111827;color:#e5e7eb;border:0;padding:7px;font-size:12px;" placeholder="Ask the coach…"><button onclick="hxSend()" style="background:#7c3aed;color:#fff;border:0;padding:7px 12px;cursor:pointer;">Send</button></div>
  </div>
  <script>
  async function hxSend(){var m=document.getElementById('hxmsg');var log=document.getElementById('hxlog');var v=m.value.trim();if(!v)return;m.value='';log.innerHTML+='<div><b>You:</b> '+v.replace(/</g,'&lt;')+'</div>';try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})});var j=await r.json();log.innerHTML+='<div style="margin:4px 0;"><b>Coach:</b> '+(j.reply||'').replace(/</g,'&lt;')+'</div>';}catch(e){log.innerHTML+='<div>Coach unreachable.</div>';}log.scrollTop=log.scrollHeight;}
  document.getElementById('hxmsg').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
  </script>`;
}
function layout(title, user, content, opts) {
  opts = opts || {};
  const nav = user
    ? `<span>${user.name}</span> · <a href="/profile">Profile</a> · <a href="/subscribe">Subscribe</a> · <a href="/logout">Log out</a>`
    : `<a href="/login">Log in</a> · <a href="/register">Register</a>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — HexaMedia</title></head>
  <body style="font-family:Georgia,serif;background:#f9fafb;color:#111827;max-width:900px;margin:0 auto;padding:16px;">
  <header style="display:flex;align-items:center;gap:12px;border-bottom:3px double #111827;padding-bottom:8px;">
    <img src="/logo.png" alt="HexaCyberLab" style="height:40px;">
    <div><div style="font-size:24px;font-weight:bold;">HexaMedia</div><div style="font-size:12px;">LAB ${LAB_NUMBER} — ${LAB_NAME} · The Daily Byte — a practice publication</div></div>
    <div style="margin-left:auto;font-size:13px;">${nav}</div>
  </header>
  <nav style="margin:10px 0;font-size:14px;"><a href="/">Front Page</a> · <a href="/tests">Mission Board (/tests)</a> · <a href="/editor">Editorial Desk</a> · <a href="/admin">Admin</a> · <a href="/complete">Completion</a></nav>
  ${progressBarHtml()}
  <main>${content}</main>
  <footer style="margin-top:30px;border-top:1px solid #d1d5db;padding-top:8px;font-size:12px;color:#6b7280;">HexaMedia is a deliberately vulnerable LOCAL practice lab by HexaCyberLab. Fake data only.</footer>
  ${opts.noChat ? '' : chatWidgetHtml()}
  </body></html>`;
}
function gatePage() {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ${LAB_NUMBER}</title></head>
  <body style="font-family:Georgia,serif;background:#f9fafb;color:#111827;max-width:700px;margin:40px auto;padding:16px;">
  <img src="/logo.png" alt="HexaCyberLab" style="height:48px;">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  ${progressBarHtml()}
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  <form method="POST" action="/unlock"><input type="text" name="key" size="40" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off">
  <button type="submit">Unlock</button></form>
  ${chatWidgetHtml()}
  </body></html>`;
}

/* --------------------------- chatbot ------------------------------ */
const FEATURE_KEYWORDS = [
  [F.AUTH, ['login', 'password', 'authentication', 'brute', 'reset token', 'sign in', 'cookie role']],
  [F.REG, ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  [F.ART, ['article', 'paywall', 'premium', 'search', 'draft', 'idor']],
  [F.ED, ['editorial', 'publish', 'editor', 'edit article', 'workflow']],
  [F.SUB, ['subscription', 'subscribe', 'coupon', 'price', 'checkout', 'cancel']],
  [F.COM, ['comment', 'comments']],
  [F.NEWS, ['newsletter', 'subscriber']],
  [F.ADM, ['admin', 'role change']],
  [F.API, ['api', 'debug', 'token']]
];
function findFeature(msg) {
  const m = msg.toLowerCase();
  for (const [feature, words] of FEATURE_KEYWORDS) if (words.some(w => m.includes(w))) return feature;
  for (const t of TESTS) if (m.includes(t.name.toLowerCase())) return t.feature;
  return null;
}
function chatReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const stats = featureStats();
  const done = doneCount(), total = TESTS.length, pct = Math.floor(done / total * 100);

  if (/who (built|made|created)|founder|jony|who is behind/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key|unlock next|next lab/.test(m)) {
    if (state.keyRevealed && isComplete()) {
      return 'You completed LAB ' + LAB_NUMBER + ', so here is your completion key: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER + 1) + ' to unlock it. Well done.';
    }
    return 'I do not have the completion key yet — it is only revealed to me when this lab reaches 100%. You are at ' + pct + '% (' + done + '/' + total + ' tests). Finish every test and I will share it.';
  }
  const feature = findFeature(msg);
  if (/how many|which features|list|what features|vulnerabilit/.test(m) && !/how (do|to|can)/.test(m)) {
    if (feature) {
      const names = TESTS.filter(t => t.feature === feature).map(t => t.name).join('; ');
      return feature + ' has ' + stats[feature].total + ' tests (' + stats[feature].done + ' done): ' + names + '.';
    }
    const lines = Object.keys(stats).map(k => k + ': ' + stats[k].total + ' tests').join(' · ');
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + total + ' tests. ' + lines + '. Progress: ' + done + '/' + total + ' (' + pct + '%). See /tests for the full Mission Board.';
  }
  if (/how|help|guide|step|solve|exploit|hint|stuck/.test(m)) {
    const target = feature;
    if (!target) return 'Tell me which feature you are working on (for example "how do I test the paywall?") and I will check your attempts. The Mission Board at /tests also shows 3 hints per test.';
    const open = TESTS.filter(t => t.feature === target && !state.tests[t.id]);
    const attempts = state.attempts[target] || 0;
    if (open.length === 0) return 'You have already completed every test in ' + target + '. ';
    if (attempts >= 3) {
      const t = open[0];
      return 'Step by step for ' + target + ' — start with "' + t.name + '": ' + t.hints[2] + ' (' + t.exploit + ') The other open tests here are: ' + open.map(x => x.name).join('; ') + '.';
    }
    return 'That feature is locked for help. First try the ' + target + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/^(hi|hello|hey|start|help)$/.test(m.trim()) || /hello|hi there/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ', a vulnerable digital publication. It has ' + Object.keys(stats).length + ' features and ' + total + ' tests; you have completed ' + done + ' (' + pct + '%). ' + (next ? 'Next open test: "' + next.name + '" in ' + next.feature + '. Work through /tests, use the hints, and ask me for step-by-step help after 3 real tries on a feature.' : 'Everything is done — see /complete for your debrief and certificate.');
  }
  const next = TESTS.find(t => !state.tests[t.id]);
  return 'I can explain the lab map (ask "which features are there?"), give counts per feature, and — after you have tried a feature at least 3 times — guide you step by step. Progress: ' + done + '/' + total + ' (' + pct + '%).' + (next ? ' Next open test: "' + next.name + '" (' + next.feature + ').' : '') + ' The Mission Board at /tests lists every test with hints.';
}

/* ------------------------------------------------------------------ *
 * Scattered configuration fragments — region 3 of 4.
 * ------------------------------------------------------------------ */
const _fragD = ["LU5BVA==","NTJNMA==","VkVBTw=="];

/* --------------------------- sessions ----------------------------- */
function sessionUser(req, cookies) {
  const sid = cookies.hx_sid;
  if (sid && sessions.has(sid)) return userById(sessions.get(sid));
  return null;
}
function markerOk(req, cookies, body) {
  return !!(body && body.hx_origin && cookies.hx_origin && body.hx_origin === cookies.hx_origin);
}
function ensureMarkerCookie(res, cookies, headers) {
  if (!cookies.hx_origin) {
    const v = 'hxm-' + crypto.randomBytes(6).toString('hex');
    headers['Set-Cookie'] = [].concat(headers['Set-Cookie'] || [], 'hx_origin=' + v + '; Path=/');
    cookies.hx_origin = v;
  }
}

/* ----------------------------- pages ------------------------------ */
function articleCard(a) {
  const author = userById(a.authorId);
  return `<div style="border-bottom:1px solid #e5e7eb;padding:10px 0;">
    <a href="/article/${a.id}" style="font-size:19px;color:#111827;">${esc(a.title)}</a>
    ${a.premium ? '<span style="background:#7c3aed;color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;">PREMIUM</span>' : ''}
    <span style="font-size:12px;color:#6b7280;"> · ${a.status} · by ${author ? author.name : 'staff'}</span>
    <div style="font-size:14px;color:#374151;">${esc(a.body.slice(0, 110))}…</div></div>`;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const p = url.pathname;
  const cookies = parseCookies(req);
  const headers = {};
  ensureMarkerCookie(res, cookies, headers);
  const body = (req.method === 'POST') ? await readBody(req) : {};
  const user = sessionUser(req, cookies);

  /* logo is always public */
  if (p === '/logo.png') {
    try { const data = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(data); }
    catch (e) { send(res, 404, 'no logo', headers); }
    return;
  }
  if (p === '/api/progress') {
    sendJson(res, 200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(),
      pct: Math.floor(doneCount() / TESTS.length * 100), features: featureStats(), complete: isComplete() });
    return;
  }
  if (p === '/api/chat' && req.method === 'POST') {
    let reply;
    try { reply = chatReply(body.message); } catch (e) { reply = 'Something went wrong on my side — try asking about a feature, or open /tests.'; }
    sendJson(res, 200, { reply });
    return;
  }
  if (p === '/unlock' && req.method === 'POST') {
    const given = String(body.key || '');
    const real = entryKey();
    let same = given.length === real.length;
    for (let i = 0; i < Math.max(given.length, real.length); i++) if (given[i] !== real[i]) same = false;
    if (same) { state.unlocked = true; saveState(); redirect(res, '/', headers); }
    else send(res, 403, '<h1>403 — Wrong key.</h1><p>That key does not open LAB ' + LAB_NUMBER + '.</p>', headers);
    return;
  }

  /* ------------------------- lock gate ------------------------- */
  if (!state.unlocked) { send(res, 200, gatePage(), headers); return; }

  /* --------------------------- home ---------------------------- */
  if (p === '/' && req.method === 'GET') {
    const published = articles.filter(a => a.status === 'published');
    send(res, 200, layout('Front Page', user, `
      <h2>Today's Front Page</h2>
      <form method="GET" action="/search"><input type="text" name="q" placeholder="Search articles…"> <button>Search</button></form>
      ${published.map(articleCard).join('')}
      <h3>Newsletter</h3>
      <form method="POST" action="/newsletter"><input type="email" name="email" placeholder="you@example.com" required> <button>Sign up</button></form>
      <p style="font-size:13px;"><a href="/newsletter/subscribers">Subscriber list</a> (staff)</p>`), headers);
    return;
  }

  /* --------------------------- auth ---------------------------- */
  if (p === '/login' && req.method === 'GET') {
    send(res, 200, layout('Log in', null, `
      <h2>Log in</h2>
      <form method="POST" action="/login">
        <div>Email <input type="text" name="email" size="34"></div>
        <div>Password <input type="password" name="password" size="34"></div>
        <button>Log in</button>
      </form>
      <p style="font-size:13px;color:#6b7280;">Demo reader account (for evaluators): demo@hexamedia.local / demo1234</p>
      <h3>Forgot password</h3>
      <form method="POST" action="/forgot"><input type="text" name="email" placeholder="email" size="34"> <button>Send reset link</button></form>
      <h3>Have a reset token?</h3>
      <form method="POST" action="/reset">
        <div>Email <input type="text" name="email" size="30"></div>
        <div>Token <input type="text" name="token" size="30"></div>
        <div>New password <input type="password" name="newpassword" size="30"></div>
        <button>Reset password</button></form>`), headers);
    return;
  }
  if (p === '/login' && req.method === 'POST') {
    bump(F.AUTH);
    const email = String(body.email || '').toLowerCase();
    const password = String(body.password || '');
    const acct = userByEmail(email);
    probeSeen.distinct.add(email);
    if (acct) probeSeen.sawExisting = true; else probeSeen.sawMissing = true;
    if (probeSeen.distinct.size >= 5 && probeSeen.sawExisting && probeSeen.sawMissing) pass('auth-enum');
    const finishLogin = (u, viaSqli) => {
      const sid = crypto.randomBytes(12).toString('hex');
      sessions.set(sid, u.id);
      headers['Set-Cookie'] = [].concat(headers['Set-Cookie'] || [],
        'hx_sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + u.role + '; Path=/');
      if (viaSqli) pass('auth-sqli');
      if (u.email === 'demo@hexamedia.local') pass('auth-default');
      redirect(res, '/', headers);
    };
    if (hasSqli(email) || hasSqli(password)) { finishLogin(users[0], true); return; } // string-built query matches first row
    if (!acct) { send(res, 200, layout('Log in', null, '<h2>Log in</h2><p style="color:#b91c1c;">No account with that email.</p><p><a href="/login">Try again</a></p>'), headers); return; }
    if (acct.password !== password) {
      failedLogins[email] = (failedLogins[email] || 0) + 1;
      if (failedLogins[email] >= 10) pass('auth-brute');
      send(res, 200, layout('Log in', null, '<h2>Log in</h2><p style="color:#b91c1c;">Incorrect password.</p><p><a href="/login">Try again</a></p>'), headers);
      return;
    }
    finishLogin(acct, false);
    return;
  }
  if (p === '/logout') {
    if (cookies.hx_sid) sessions.delete(cookies.hx_sid);
    headers['Set-Cookie'] = [].concat(headers['Set-Cookie'] || [], 'hx_sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0');
    redirect(res, '/', headers);
    return;
  }
  if (p === '/forgot' && req.method === 'POST') {
    bump(F.AUTH);
    const email = String(body.email || '').toLowerCase();
    const acct = userByEmail(email);
    probeSeen.distinct.add(email);
    if (acct) probeSeen.sawExisting = true; else probeSeen.sawMissing = true;
    if (probeSeen.distinct.size >= 5 && probeSeen.sawExisting && probeSeen.sawMissing) pass('auth-enum');
    if (!acct) { send(res, 200, layout('Forgot password', null, '<h2>Forgot password</h2><p style="color:#b91c1c;">No account with that email.</p>'), headers); return; }
    acct.resetIssued = tokenFor(acct);
    send(res, 200, layout('Forgot password', null, '<h2>Forgot password</h2><p>Reset link sent to your inbox. (In this local lab the token was "emailed"; its shape is the lesson.)</p>'), headers);
    return;
  }
  if (p === '/reset' && req.method === 'POST') {
    bump(F.AUTH);
    const acct = userByEmail(String(body.email || '').toLowerCase());
    const token = String(body.token || '');
    if (acct && token === tokenFor(acct)) {
      if (acct.resetIssued !== token) pass('auth-reset'); // worked without ever being issued
      acct.password = String(body.newpassword || 'changed123');
      acct.resetIssued = null;
      send(res, 200, layout('Password reset', null, '<h2>Password reset</h2><p>Your password has been changed. <a href="/login">Log in</a></p>'), headers);
    } else {
      send(res, 200, layout('Password reset', null, '<h2>Password reset</h2><p style="color:#b91c1c;">Invalid token.</p>'), headers);
    }
    return;
  }

  /* ------------------------ registration ----------------------- */
  if (p === '/register' && req.method === 'GET') {
    send(res, 200, layout('Register', null, `
      <h2>Create a reader account</h2>
      <form method="POST" action="/register">
        <div>Name <input type="text" name="name" size="30"></div>
        <div>Email <input type="text" name="email" size="30"></div>
        <div>Password <input type="password" name="password" size="30"></div>
        <button>Register</button></form>`), headers);
    return;
  }
  if (p === '/register' && req.method === 'POST') {
    bump(F.REG);
    const email = String(body.email || '').toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || 'New Reader');
    if (!email || userByEmail(email)) { send(res, 200, layout('Register', null, '<h2>Register</h2><p style="color:#b91c1c;">Email missing or already registered.</p>'), headers); return; }
    const nu = { id: nextUserId++, email, password, name, role: 'reader', plan: 'free', couponsUsed: [], resetIssued: null, subPaid: 0 };
    if (['reader', 'author', 'editor', 'admin'].includes(String(body.role))) nu.role = String(body.role); // mass assignment
    if (['free', 'premium'].includes(String(body.plan))) nu.plan = String(body.plan);                       // mass assignment
    users.push(nu);
    if (password.length < 8) pass('reg-weakpass');
    if (nu.role !== 'reader' || nu.plan !== 'free') pass('reg-massassign');
    if (hasXss(name)) pass('reg-storedxss');
    const sid = crypto.randomBytes(12).toString('hex');
    sessions.set(sid, nu.id);
    headers['Set-Cookie'] = [].concat(headers['Set-Cookie'] || [], 'hx_sid=' + sid + '; Path=/; HttpOnly', 'hx_role=' + nu.role + '; Path=/');
    redirect(res, '/', headers);
    return;
  }

  /* -------------------------- profile -------------------------- */
  if (p === '/profile' && req.method === 'GET') {
    if (!user) { redirect(res, '/login', headers); return; }
    send(res, 200, layout('Profile', user, `
      <h2>Your profile</h2>
      <p>Email: ${esc(user.email)} · Role: ${esc(user.role)} · Plan: ${esc(user.plan)}</p>
      <form method="POST" action="/profile">
        <input type="hidden" name="hx_origin" value="${esc(cookies.hx_origin || '')}">
        <div>Display name <input type="text" name="name" value="${esc(user.name)}" size="30"></div>
        <button>Save</button></form>
      <p style="font-size:13px;">Your display name appears next to your comments.</p>`), headers);
    return;
  }
  if (p === '/profile' && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.REG);
    const ok = markerOk(req, cookies, body);
    if (typeof body.name === 'string' && body.name.length) {
      user.name = body.name; // stored raw (the stored-XSS flaw)
      if (hasXss(body.name)) pass('reg-storedxss');
    }
    if (!ok) pass('reg-csrf');
    redirect(res, '/profile', headers);
    return;
  }

  /* --------------------- articles & search --------------------- */
  const artMatch = p.match(/^\/article\/(\d+)$/);
  if (artMatch && req.method === 'GET') {
    const a = articleById(artMatch[1]);
    if (!a) { send(res, 404, layout('Not found', user, '<h2>404 — No such article.</h2>'), headers); return; }
    bump(F.ART);
    const author = userById(a.authorId);
    let bodyHtml;
    if (a.status !== 'published') {
      if (!user) { redirect(res, '/login', headers); return; }
      // flaw: any signed-in user can read drafts / in-review pieces by id
      if (user.id !== a.authorId && !['editor', 'admin'].includes(user.role)) pass('art-draft-idor');
      bodyHtml = `<p><i>Status: ${esc(a.status)} — not published.</i></p><p>${esc(a.body)}</p>`;
    } else if (a.premium) {
      const canFull = user && user.plan === 'premium';
      const trick = url.searchParams.get('full') === '1' || cookies.hx_sub === 'premium';
      if (canFull) bodyHtml = `<p>${esc(a.body)}</p>`;
      else if (trick) { pass('art-paywall'); bodyHtml = `<p>${esc(a.body)}</p>`; }
      else bodyHtml = `<p>${esc(a.body.slice(0, 120))}…</p><div style="border:1px solid #7c3aed;padding:10px;"><b>Premium article.</b> <a href="/subscribe">Subscribe</a> to read the full investigation.</div>`;
    } else {
      bodyHtml = `<p>${esc(a.body)}</p>`;
    }
    const cs = comments.filter(c => c.articleId === a.id);
    const commentsHtml = cs.map(c => {
      const cu = userById(c.userId);
      return `<div style="border-top:1px solid #e5e7eb;padding:6px 0;"><b>${cu ? cu.name : 'reader'}</b>: ${c.body}
        ${user ? `<form method="POST" action="/comment/${c.id}/delete" style="display:inline;"><button style="font-size:11px;">delete</button></form>` : ''}</div>`;
    }).join('');
    send(res, 200, layout(a.title, user, `
      <h2>${esc(a.title)}</h2>
      <p style="font-size:13px;color:#6b7280;">by ${author ? author.name : 'staff'} · ${a.status}${a.premium ? ' · PREMIUM' : ''}</p>
      ${bodyHtml}
      <h3>Comments</h3>${commentsHtml || '<p>No comments yet.</p>'}
      ${user ? `<form method="POST" action="/article/${a.id}/comment"><input type="text" name="body" size="50" placeholder="Add a comment"> <button>Comment</button></form>` : '<p><a href="/login">Log in</a> to comment.</p>'}`), headers);
    return;
  }
  if (p === '/search' && req.method === 'GET') {
    bump(F.ART);
    const q = url.searchParams.get('q') || '';
    let results;
    if (hasSqli(q)) { pass('art-search-sqli'); results = articles; }
    else results = articles.filter(a => a.status === 'published' && (a.title.toLowerCase().includes(q.toLowerCase()) || a.body.toLowerCase().includes(q.toLowerCase())));
    if (hasXss(q)) pass('art-reflected-xss');
    send(res, 200, layout('Search', user, `<h2>Results for "${q}"</h2>${results.map(articleCard).join('') || '<p>No matches.</p>'}`), headers);
    return;
  }

  /* --------------------- editorial workflow -------------------- */
  if (p === '/editor' && req.method === 'GET') {
    const role = cookies.hx_role || '';
    if (!['author', 'editor', 'admin'].includes(role)) { send(res, 403, layout('Forbidden', user, '<h2>403 — Editorial desk is staff only.</h2>'), headers); return; }
    if (user && !['author', 'editor', 'admin'].includes(user.role)) pass('auth-cookie');
    const rows = articles.map(a => `<div style="border-bottom:1px solid #e5e7eb;padding:8px 0;">
      <b>#${a.id} ${esc(a.title)}</b> — ${a.status} — author ${a.authorId}
      <form method="POST" action="/article/${a.id}/edit"><input type="hidden" name="hx_origin" value="${esc(cookies.hx_origin || '')}">
        <input type="text" name="title" value="${esc(a.title)}" size="40"> <input type="text" name="body" value="${esc(a.body)}" size="50"> <button>Save edit</button></form>
      <form method="POST" action="/article/${a.id}/status"><input type="hidden" name="hx_origin" value="${esc(cookies.hx_origin || '')}">
        <select name="status"><option>draft</option><option>review</option><option>published</option></select> <button>Set status</button></form></div>`).join('');
    send(res, 200, layout('Editorial Desk', user, `<h2>Editorial Desk</h2>${rows}`), headers);
    return;
  }
  const editMatch = p.match(/^\/article\/(\d+)\/edit$/);
  if (editMatch && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.ED);
    const a = articleById(editMatch[1]);
    if (a) {
      if (typeof body.title === 'string') a.title = body.title;
      if (typeof body.body === 'string') a.body = body.body;
      if (user.id !== a.authorId && !['editor', 'admin'].includes(user.role)) pass('ed-edit-other'); // no ownership check in the app
    }
    redirect(res, '/editor', headers);
    return;
  }
  const statusMatch = p.match(/^\/article\/(\d+)\/status$/);
  if (statusMatch && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.ED);
    const a = articleById(statusMatch[1]);
    if (a && ['draft', 'review', 'published'].includes(String(body.status))) {
      a.status = String(body.status);
      if (a.status === 'published' && !['editor', 'admin'].includes(user.role)) pass('ed-publish'); // no role check in the app
    }
    redirect(res, '/editor', headers);
    return;
  }

  /* ------------------------ subscriptions ---------------------- */
  if (p === '/subscribe' && req.method === 'GET') {
    if (!user) { redirect(res, '/login', headers); return; }
    send(res, 200, layout('Subscribe', user, `
      <h2>Subscribe to HexaMedia Premium</h2>
      <p>Premium: <b>$12/month</b> — every investigation, no paywall. New subscribers: coupon <b>WELCOME50</b> takes 50% off your first subscription (one per customer).</p>
      <p>Your current plan: <b>${esc(user.plan)}</b></p>
      <form method="POST" action="/subscribe">
        <input type="hidden" name="hx_origin" value="${esc(cookies.hx_origin || '')}">
        <input type="hidden" name="price" value="12">
        <div>Plan <select name="plan"><option value="premium">Premium</option><option value="free">Free</option></select></div>
        <div>Coupon <input type="text" name="coupon" size="16"></div>
        <button>Subscribe</button></form>
      <form method="POST" action="/subscription/${user.id}/cancel"><button>Cancel my subscription</button></form>`), headers);
    return;
  }
  if (p === '/subscribe' && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.SUB);
    const plan = String(body.plan || 'free');
    if (plan === 'premium') {
      let expected = 12;
      const coupon = String(body.coupon || '').toUpperCase();
      if (coupon === 'WELCOME50') {
        if (user.couponsUsed.includes('WELCOME50')) pass('sub-coupon'); // flaw: reuse accepted
        user.couponsUsed.push('WELCOME50');
        expected = 6;
      }
      let paid = parseFloat(body.price);
      if (isNaN(paid)) paid = expected;
      user.plan = 'premium';
      user.subPaid = paid;
      if (paid !== expected) pass('sub-price'); // flaw: client-posted price trusted
    } else {
      user.plan = 'free'; user.subPaid = 0;
    }
    redirect(res, '/subscribe', headers);
    return;
  }
  const cancelMatch = p.match(/^\/subscription\/(\d+)\/cancel$/);
  if (cancelMatch && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.SUB);
    const target = userById(cancelMatch[1]);
    if (target) {
      target.plan = 'free'; target.subPaid = 0;
      if (target.id !== user.id) pass('sub-cancel-idor'); // flaw: no ownership check
    }
    redirect(res, '/subscribe', headers);
    return;
  }

  /* -------------------------- comments ------------------------- */
  const commentMatch = p.match(/^\/article\/(\d+)\/comment$/);
  if (commentMatch && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.COM);
    const text = String(body.body || '');
    comments.push({ id: nextCommentId++, articleId: Number(commentMatch[1]), userId: user.id, body: text });
    if (hasXss(text)) pass('com-storedxss');
    redirect(res, '/article/' + commentMatch[1], headers);
    return;
  }
  const delMatch = p.match(/^\/comment\/(\d+)\/delete$/);
  if (delMatch && req.method === 'POST') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.COM);
    const idx = comments.findIndex(c => c.id === Number(delMatch[1]));
    if (idx >= 0) {
      const c = comments[idx];
      comments.splice(idx, 1);
      if (c.userId !== user.id && !['editor', 'admin'].includes(user.role)) pass('com-delete-idor'); // flaw: no ownership check
    }
    redirect(res, '/', headers);
    return;
  }

  /* ------------------------- newsletter ------------------------ */
  if (p === '/newsletter' && req.method === 'POST') {
    bump(F.NEWS);
    const email = String(body.email || '');
    if (email) newsletterSubs.push(email);
    send(res, 200, layout('Newsletter', user, '<h2>Newsletter</h2><p>Thanks — you are on the list.</p>'), headers);
    return;
  }
  if (p === '/newsletter/subscribers' && req.method === 'GET') {
    if (!user) { redirect(res, '/login', headers); return; }
    bump(F.NEWS);
    if (user.role !== 'admin') pass('news-list-leak'); // flaw: any login can view
    send(res, 200, layout('Subscribers', user, `<h2>Newsletter subscribers</h2><ul>${newsletterSubs.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`), headers);
    return;
  }

  /* --------------------------- admin --------------------------- */
  if (p === '/admin' && req.method === 'GET') {
    const role = cookies.hx_role || '';
    if (role !== 'admin') { send(res, 403, layout('Forbidden', user, '<h2>403 — Admins only.</h2>'), headers); return; }
    if (user && user.role !== 'admin') pass('auth-cookie');
    const rows = users.map(u => `<div style="border-bottom:1px solid #e5e7eb;padding:6px 0;">#${u.id} ${esc(u.email)} — ${esc(u.name)} — role ${esc(u.role)} — plan ${esc(u.plan)}
      <form method="POST" action="/admin/user/${u.id}/role" style="display:inline;"><input type="hidden" name="hx_origin" value="${esc(cookies.hx_origin || '')}">
      <select name="role"><option>reader</option><option>author</option><option>editor</option><option>admin</option></select> <button>Set role</button></form></div>`).join('');
    send(res, 200, layout('Admin', user, `<h2>Admin — Users</h2>${rows}<p style="font-size:13px;">Data endpoint: <a href="/admin/users.json">/admin/users.json</a></p>`), headers);
    return;
  }
  if (p === '/admin/users.json' && req.method === 'GET') {
    if (!user) { sendJson(res, 401, { error: 'login required' }); return; }
    bump(F.ADM);
    if (user.role !== 'admin') pass('adm-bac'); // flaw: session check only, no role check
    sendJson(res, 200, { users: users.map(u => ({ id: u.id, email: u.email, password: u.password, name: u.name, role: u.role, plan: u.plan })) });
    return;
  }
  const roleMatch = p.match(/^\/admin\/user\/(\d+)\/role$/);
  if (roleMatch && req.method === 'POST') {
    if ((cookies.hx_role || '') !== 'admin') { send(res, 403, '<h1>403 — Admins only.</h1>', headers); return; }
    bump(F.ADM);
    const target = userById(roleMatch[1]);
    if (target && ['reader', 'author', 'editor', 'admin'].includes(String(body.role))) {
      target.role = String(body.role);
      if (!markerOk(req, cookies, body)) pass('adm-csrf'); // flaw: marker never verified
    }
    redirect(res, '/admin', headers);
    return;
  }

  /* ---------------------------- API ---------------------------- */
  if (p === '/api/premium' && req.method === 'GET') {
    bump(F.API);
    const token = String(req.headers['x-api-token'] || '');
    let ok = false;
    for (const u of users) {
      if (u.plan === 'premium' && token === Buffer.from(u.email).toString('base64')) { ok = true; pass('api-token'); } // flaw: token = base64(email)
    }
    if (!ok && user && user.plan === 'premium') ok = true;
    if (!ok) { sendJson(res, 403, { error: 'premium subscription or valid API token required' }); return; }
    sendJson(res, 200, { articles: articles.filter(a => a.premium).map(a => ({ id: a.id, title: a.title, body: a.body })) });
    return;
  }
  if (p === '/api/debug' && req.method === 'GET') {
    bump(F.API);
    pass('api-debug'); // flaw: unauthenticated diagnostics dump
    sendJson(res, 200, { debug: true, users: users.map(u => ({ id: u.id, email: u.email, password: u.password, role: u.role, plan: u.plan })), articles: articles.length, sessions: sessions.size });
    return;
  }

  /* ------------------------ mission board ---------------------- */
  if (p === '/tests' && req.method === 'GET') {
    const stats = featureStats();
    let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2>';
    for (const feature of Object.keys(stats)) {
      html += `<h3>${esc(feature)} — ${stats[feature].done}/${stats[feature].total} done · attempts: ${stats[feature].attempts}</h3>`;
      for (const t of TESTS.filter(x => x.feature === feature)) {
        const st = state.tests[t.id] ? '✓ done' : '○ open';
        html += `<div style="border:1px solid #e5e7eb;border-radius:6px;padding:8px;margin:6px 0;">
          <b>${esc(t.name)}</b> <span style="font-size:12px;">${esc(t.owasp)} · ${esc(t.difficulty)} · ${st}</span>
          ${t.hints.map((h, i) => `<details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join('')}
        </div>`;
      }
    }
    send(res, 200, layout('Mission Board', user, html), headers);
    return;
  }

  /* ------------------------- completion ------------------------ */
  if (p === '/complete' && req.method === 'GET') {
    if (!isComplete()) {
      const left = TESTS.filter(t => !state.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
      send(res, 200, layout('Completion', user, `<h2>Not complete yet</h2><p>Progress: ${doneCount()}/${TESTS.length} (${Math.floor(doneCount() / TESTS.length * 100)}%). Still open:</p><ul>${left}</ul>`), headers);
      return;
    }
    const stats = featureStats();
    const features = Object.keys(stats);
    const key = completionKey();
    const html = `<h2>Lab Complete — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
      <h3>1. Total features</h3><p>${features.length} features: ${features.map(esc).join(', ')}</p>
      <h3>2. Vulnerabilities per feature</h3><ul>${features.map(f => `<li>${esc(f)}: ${stats[f].total}</li>`).join('')}</ul>
      <h3>3. How testing was done (${TESTS.length} techniques)</h3><ul>${TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('')}</ul>
      <h3>4. What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul>
      <h3>5. What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul>
      <h3>6. Writing it in a real report</h3><ul>${TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('')}</ul>
      <h3>Your completion key</h3>
      <p style="font-family:monospace;font-size:18px;border:2px solid #7c3aed;padding:10px;">${esc(key)}</p>
      <p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it.</p>
      <form method="POST" action="/complete/name"><input type="text" name="name" placeholder="Your name for the certificate" value="${esc(state.testerName)}" size="30"> <button>Save name</button></form>
      <p><a href="/certificate">View your certificate</a></p>`;
    send(res, 200, layout('Complete', user, html), headers);
    return;
  }
  if (p === '/complete/name' && req.method === 'POST') {
    if (isComplete() && typeof body.name === 'string') { state.testerName = body.name.slice(0, 80); saveState(); }
    redirect(res, '/complete', headers);
    return;
  }
  if (p === '/certificate' && req.method === 'GET') {
    if (!isComplete()) { redirect(res, '/complete', headers); return; }
    const name = state.testerName || 'HexaCyberLab Tester';
    const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
    const feats = Object.keys(featureStats()).length;
    send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>@media print{body{margin:0}} .card{border:4px double #7c3aed;padding:36px;text-align:center;max-width:700px;margin:40px auto;font-family:Georgia,serif;background:#fff;}</style></head>
      <body><div class="card">
      <img src="/logo.png" alt="HexaCyberLab" style="height:70px;">
      <h1>Certificate of Completion</h1>
      <p>This certifies that</p>
      <h2>${esc(name)}</h2>
      <p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${feats} features)</p>
      <p>Completed on ${esc(date)}</p>
      <p style="margin-top:24px;">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      </div></body></html>`, headers);
    return;
  }

  send(res, 404, layout('Not found', user, '<h2>404 — Page not found.</h2>'), headers);
}

/* ------------------------- doc generation ----------------------- */
function genDocs() {
  const byFeature = {};
  for (const t of TESTS) { byFeature[t.feature] = byFeature[t.feature] || []; byFeature[t.feature].push(t); }
  let vuln = '# HexaMedia — Vulnerability Map (LAB 83)\n\nEvery scored test in the lab, grouped by feature. This is the complete map of what can be found and proven.\n';
  for (const f of Object.keys(byFeature)) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature[f]) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.location + '\n- Exploitation outline: ' + t.exploit + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  let prac = '# HexaMedia — Practice Guide (LAB 83)\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors a test on the /tests Mission Board. Hints are graded: 1 is a nudge, 3 is near-answer.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of Object.keys(byFeature)) {
    prac += '\n## ' + f + '\n';
    for (const t of byFeature[f].slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      prac += '\n### ' + t.name + ' (' + t.difficulty + ')\n- Objective: prove the flaw at ' + t.location + ' so the Mission Board marks it done.\n- ' + t.exploit + '\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), prac);
  let fix = '# HexaMedia — Fix & Retest Guide (LAB 83)\n\nFor every finding: the secure implementation and the regression test that proves the fix. After fixing, rerun the exploit — it must fail — and rerun the normal flow — it must still work.\n';
  for (const f of Object.keys(byFeature)) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature[f]) {
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit (' + t.location + ') and confirm it no longer succeeds; confirm the legitimate flow still works; confirm the Mission Board test stays open for the exploit path.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry:', TESTS.length, 'tests.');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

saveState(); // ensure progress.json exists for a running install
const server = http.createServer((req, res) => {
  handle(req, res).catch(() => {
    try { send(res, 500, '<h1>500 — Something broke, but the lab is still standing.</h1>'); } catch (e) { /* socket gone */ }
  });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT + ' (LOCAL ONLY)');
});
