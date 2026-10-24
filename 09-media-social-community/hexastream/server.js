'use strict';
/*
 * HexaStream — LAB 84 (Category 9: Media, Social & Community)
 * A deliberately vulnerable video-streaming practice lab.
 * Zero-dependency Node.js. LOCAL USE ONLY — never deploy publicly.
 * Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 84;
const LAB_NAME = 'HexaStream';
const PREV_LAB = 83;
const PORT = 3093;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');
const PREMIUM_PRICE = 12; // USD / month — the server-side price truth

/* ------------------------------------------------------------------ *
 * Key material (part 1 of 2). The lab keys never appear in this file *
 * as plain text. They live only as transformed fragments, scattered *
 * across the file and reassembled at runtime when needed.           *
 * ------------------------------------------------------------------ */
const _kA1 = ["TC1YSA==","My00OA==","TlVSVQ=="];
const _kA2 = ["TC1YSA==","SS01OA==","SkpBSg=="];

/* ============================ Progress engine ============================ */
function freshProgress() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
let P;
try { P = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (!P || typeof P !== 'object' || !P.tests) P = freshProgress(); }
catch (e) { P = freshProgress(); }
function save() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(P, null, 2)); } catch (e) {} }
function doneCount() { return TESTS.reduce((n, t) => n + (P.tests[t.id] ? 1 : 0), 0); }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!P.tests[id]) {
    P.tests[id] = true;
    if (isComplete() && !P.completedAt) { P.completedAt = new Date().toISOString(); P.keyRevealed = true; }
    save();
  }
}
function attempt(feature) { P.attempts[feature] = (P.attempts[feature] || 0) + 1; save(); }
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    out[t.feature] = out[t.feature] || { total: 0, done: 0, attempts: P.attempts[t.feature] || 0 };
    out[t.feature].total++;
    if (P.tests[t.id]) out[t.feature].done++;
  }
  for (const f of Object.keys(out)) out[f].attempts = P.attempts[f] || 0;
  return out;
}

/* ============================ Seed data (all fake) ============================ */
const users = [
  { id: 1, name: 'Hexa Admin',        email: 'admin@hexastream.local', password: 'admin123', role: 'admin',   tier: 'premium' },
  { id: 2, name: 'Alice Viewer',      email: 'alice@test.local',       password: 'alice123', role: 'user',    tier: 'premium' },
  { id: 3, name: 'Bob Viewer',        email: 'bob@test.local',         password: 'bob123',   role: 'user',    tier: 'free' },
  { id: 4, name: 'Carol Creator',     email: 'carol@test.local',       password: 'carol123', role: 'creator', tier: 'premium' },
  { id: 5, name: 'Demo Account',      email: 'demo@hexastream.local',  password: 'demo123',  role: 'user',    tier: 'free' }
];
let nextUserId = 6;
const videos = [
  { id: 1, title: 'Nebula Drift',            ownerId: 4, tier: 'free',    listed: true,  desc: 'A slow journey through a simulated nebula. Free for everyone.' },
  { id: 2, title: 'Deep Sea Code',           ownerId: 1, tier: 'premium', listed: true,  desc: 'Premium documentary: the engineers who cable the oceans.' },
  { id: 3, title: 'The Last Server',         ownerId: 1, tier: 'premium', listed: true,  desc: 'Premium thriller about the final data centre on Earth.' },
  { id: 4, title: 'Cooking with APIs',       ownerId: 4, tier: 'free',    listed: true,  desc: 'Carol cooks a three-course meal, one REST call at a time.' },
  { id: 5, title: 'Internal Screener — Unreleased Cut', ownerId: 1, tier: 'premium', listed: false, desc: 'UNLISTED internal screener. Not published anywhere on the site.' },
  { id: 6, title: 'Mountain Light',          ownerId: 4, tier: 'free',    listed: true,  desc: 'Sunrise over the high passes, shot on a phone.' }
];
let nextVideoId = 7;
let comments = [
  { id: 1, videoId: 1, userId: 2, text: 'Beautiful opening shot!' },
  { id: 2, videoId: 1, userId: 3, text: 'Watched this twice already.' },
  { id: 3, videoId: 2, userId: 2, text: 'The cable-ship chapter is incredible.' }
];
let nextCommentId = 4;
const watchlists = { 2: [1, 2], 3: [3], 4: [2] };   // userId -> [videoId]
let historyLog = [                                     // {userId, videoId}
  { userId: 2, videoId: 1 }, { userId: 2, videoId: 2 }, { userId: 3, videoId: 1 }
];
const uploads = new Map();        // filename -> {by, content, type}
const sessions = new Map();       // sid -> userId
const issuedTokens = new Set();   // playback tokens the server genuinely issued
const usedCoupons = new Map();    // userId -> Set of coupon codes
const resetIssued = new Set();    // userIds for whom a reset was actually requested
const loginFails = new Map();     // userId -> failed login count
const forgotProbes = new Set();   // distinct emails probed on /forgot

/* ============================ TESTS registry ============================ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_SEARCH = 'Search & Library';
const F_PLAY = 'Playback & Tokens';
const F_WL = 'Watchlists & History';
const F_MEM = 'Membership & Payments';
const F_COM = 'Comments';
const F_CRE = 'Creator Studio';
const F_ADM = 'Admin & Platform';

const TESTS = [
  /* ---------------- Login & Authentication ---------------- */
  { id: 'auth-sqli', feature: F_AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner', location: 'POST /login',
    hints: ['The login form builds its database query by gluing your input straight into the SQL string.', 'Try closing the email string early and commenting out the rest of the query.', "Use admin@hexastream.local' -- as the email, with any password."],
    lesson: 'String-built SQL queries let an attacker rewrite the login logic itself — no valid password is needed when the query can be bent.',
    impact: 'On a real streaming service this hands an attacker the admin account: full control of the catalogue, user accounts and billing settings.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: F_AUTH, name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner', location: 'POST /login',
    hints: ['Count how the login responds to repeated wrong passwords for one account.', 'Nothing slows you down, locks the account, or asks for a CAPTCHA — even after many failures.', 'Fail 10 logins in a row for bob@test.local; the 10th is still processed normally.'],
    lesson: 'Without rate limiting or lockout, password guessing is free and unlimited — weak passwords always fall eventually.',
    impact: 'Attackers can grind through password lists against real subscriber accounts, leading to account takeovers and stolen payment details.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add progressive rate limiting, temporary lockout and alerting on repeated failed logins per account and per IP.' } },
  { id: 'auth-enum', feature: F_AUTH, name: 'Account Enumeration via Login & Reset Responses', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner', location: 'POST /login · POST /forgot',
    hints: ['Compare the exact wording of errors for accounts that exist vs accounts that do not.', 'The forgot-password form is even more talkative than the login form.', 'Probe the forgot form with 5 different email addresses and watch the two different answers.'],
    lesson: 'Different error messages for "no such account" and "wrong password" turn your own forms into a free list of valid accounts.',
    impact: 'Attackers first harvest which email addresses hold accounts, then aim password attacks only at real targets — far more efficient and quieter.',
    report: { title: 'User Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("If the account exists, we sent a link") for every authentication and reset outcome.' } },
  { id: 'auth-default', feature: F_AUTH, name: 'Published Demo Credentials Grant a Real Account', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner', location: 'GET /login · POST /login',
    hints: ['Read the login page carefully — it tries to be helpful to new visitors.', 'A working username and password are printed right on the page.', 'Sign in with the demo credentials shown on the login page.'],
    lesson: 'Demo and default credentials printed in public are real credentials — anything they can reach is effectively public.',
    impact: 'Anyone on the internet can walk into the demo account, and demo accounts often share data, privileges or billing with production.',
    report: { title: 'Valid Demo Credentials Published on the Login Page', severity: 'Medium', remediation: 'Remove demo credentials from production pages and disable default/demo accounts outside isolated demo environments.' } },
  { id: 'auth-reset', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate', location: 'POST /reset',
    hints: ['Your numeric account ID is shown on your profile page. Reset tokens look suspiciously structured.', 'A token looks like HS<id>-<a number derived from the id>. Do the maths for small IDs.', 'For user id N the token is HS + N + "-" + (N*137+42). Compute Bob\'s (id 3) and reset his password without ever requesting a reset.'],
    lesson: 'A secret that can be computed from a public identifier is not a secret — reset tokens must be long, random and single-use.',
    impact: 'Anyone who can see a user ID (often public) can reset that user\'s password and take over the account, including admins.',
    report: { title: 'Password-Reset Tokens Are Predictable From the User ID', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), store them hashed, expire them quickly and make them single-use.' } },
  { id: 'auth-cookie', feature: F_AUTH, name: 'Role Cookie Tampering Opens the Creator Studio', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', location: 'GET /creator',
    hints: ['After logging in, inspect the cookies the site sets. One of them describes your role.', 'The Creator Studio trusts that cookie instead of checking your account on the server.', 'Log in as Bob, change the hx_role cookie to creator, then open /creator.'],
    lesson: 'Authorization data stored on the client can be edited by the client — roles must be read from server-side session state, never from cookies.',
    impact: 'Any free viewer can promote themselves to creator (or admin) in the browser and reach consoles meant for staff only.',
    report: { title: 'Authorization Role Taken From a Client-Controlled Cookie', severity: 'High', remediation: 'Store the role only in the server-side session record and re-check it on every privileged request.' } },

  /* ---------------- Registration & Profile ---------------- */
  { id: 'reg-weakpw', feature: F_REG, name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner', location: 'POST /register',
    hints: ['The registration form claims to care about security. Test that claim.', 'Try the shortest password the form will accept.', 'Register a new account with the password "a".'],
    lesson: 'A password policy that accepts one character is no policy at all — credential stuffing and guessing become trivial.',
    impact: 'Subscribers pick guessable passwords, and one breached account often means a reused password elsewhere too.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and screen new passwords against known-breached password lists.' } },
  { id: 'reg-mass', feature: F_REG, name: 'Mass Assignment — Role & Tier Set at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', location: 'POST /register',
    hints: ['The registration handler copies more of your request body into the new account than the form shows.', 'Accounts have role and tier fields. What happens if you submit them yourself?', 'Register with extra fields role=creator and tier=premium in the POST body.'],
    lesson: 'Binding a whole request body to a database record lets attackers set fields the UI never offered — including role and billing tier.',
    impact: 'Attackers mint themselves premium, creator or even admin accounts for free, bypassing payment and vetting entirely.',
    report: { title: 'Mass Assignment Allows Privilege and Tier Escalation at Registration', severity: 'High', remediation: 'Whitelist the exact fields registration may set (name, email, password) and assign role/tier only in server-side code.' } },
  { id: 'reg-xss', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner', location: 'POST /register · POST /profile → video pages',
    hints: ['Display names are printed back on video pages next to comments — without escaping.', 'Put markup, not just text, into a name.', 'Register or rename yourself with a name containing <script>alert(1)</script> and view a video page.'],
    lesson: 'Any user-controlled string that is stored and later rendered unescaped becomes stored XSS — it fires in other users\' browsers.',
    impact: 'Attackers can hijack viewer sessions, deface pages, or run actions as other users — including admins who merely open a page.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied output and validate names against an allowlist of characters.' } },
  { id: 'reg-csrf', feature: F_REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', location: 'POST /profile',
    hints: ['The profile form relies on a cookie marker the server sets — but never actually checks it on the way in.', 'A state-changing POST that arrives without the site\'s own marker should be rejected. It is not.', 'Send a POST to /profile with your session cookie but WITHOUT the hx_origin cookie and change your name.'],
    lesson: 'State-changing endpoints that never verify an anti-CSRF token/marker can be triggered by any website the victim visits while logged in.',
    impact: 'Attackers silently change victims\' profile data (and on other flows, emails or passwords) from a malicious page.',
    report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as defence in depth.' } },

  /* ---------------- Search & Library ---------------- */
  { id: 'search-sqli', feature: F_SEARCH, name: 'SQL Injection in Video Search Leaks Unlisted Titles', owasp: 'A03:2021 Injection', difficulty: 'Intermediate', location: 'GET /search?q=',
    hints: ['Search builds its query the same careless way login does.', 'A search that always returns TRUE would list the whole catalogue — including what is not published.', "Search for ' OR '1'='1 and look for a title that appears nowhere in the library."],
    lesson: 'Injection in search reaches data the interface was never meant to show — "hidden" rows are not protected rows.',
    impact: 'Unreleased content, internal screeners and embargoed titles leak before launch, destroying release and licensing plans.',
    report: { title: 'SQL Injection in Search Exposes Unlisted Content', severity: 'High', remediation: 'Parameterise search queries and enforce listing/visibility filters in the query itself, not just in the UI.' } },
  { id: 'search-xss', feature: F_SEARCH, name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner', location: 'GET /search?q=',
    hints: ['The results page repeats your search term back to you at the top.', 'It repeats it exactly as typed — markup and all.', 'Search for <script>alert(1)</script> and view the page source of the heading.'],
    lesson: 'Reflecting user input into a page without encoding is reflected XSS — the payload rides a link straight into a victim\'s browser.',
    impact: 'Crafted search links can steal sessions or run actions for any logged-in viewer who clicks them.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected input and deploy a restrictive Content-Security-Policy.' } },

  /* ---------------- Playback & Tokens ---------------- */
  { id: 'play-premium', feature: F_PLAY, name: 'Premium Playback Granted by a Client-Supplied Tier Parameter', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', location: 'GET /watch/:id?tier=',
    hints: ['Free accounts are told a video is premium-only. The watch endpoint asks the request — not your account — what tier you are.', 'Try telling the watch URL that you are premium.', 'As Bob (free), open /watch/2?tier=premium.'],
    lesson: 'Entitlement checks must read the server-side account record; a parameter the client supplies is a suggestion, not a fact.',
    impact: 'Every free user can stream the entire paid catalogue — the subscription business simply stops earning.',
    report: { title: 'Premium Entitlement Checked Against a Client-Supplied Parameter', severity: 'Critical', remediation: 'Derive entitlements exclusively from the authenticated account record on the server for every playback request.' } },
  { id: 'play-token', feature: F_PLAY, name: 'Forged Playback Token Accepted', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate', location: 'GET /stream/:id?token=',
    hints: ['Watch a video you are entitled to and inspect its stream URL. The token is just base64 text.', 'Decode it — the format is stream:<videoId>:<userId>. Nothing is signed.', 'Craft base64 of "stream:3:3" yourself and open /stream/3?token=<your token> without ever being issued one.'],
    lesson: 'An unsigned, predictable token is a label, not a credential — anyone who can guess the format can mint valid-looking tokens.',
    impact: 'Attackers generate stream URLs for any title and share them publicly, bypassing accounts and paywalls at scale.',
    report: { title: 'Playback Tokens Are Unsigned and Forgeable', severity: 'High', remediation: 'Sign playback tokens (HMAC) with a server secret, bind them to user, video and a short expiry.' } },
  { id: 'play-unlisted', feature: F_PLAY, name: 'Unlisted Video Reachable by Direct Sequential ID', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'GET /video/:id',
    hints: ['Video IDs are small sequential numbers, and the video page never checks whether a title is listed.', 'The library shows 5 titles. The catalogue has 6 rows.', 'Open /video/5 directly.'],
    lesson: '"Unlisted" is a display setting, not access control — if the object endpoint does not check, sequential IDs expose everything.',
    impact: 'Unreleased and internal content is one guessed number away from anyone, no account or exploit tooling needed.',
    report: { title: 'Unlisted Content Accessible by Direct Object Reference', severity: 'Medium', remediation: 'Enforce listing/visibility checks on the object endpoint and use unguessable IDs for unlisted content.' } },

  /* ---------------- Watchlists & History ---------------- */
  { id: 'wl-view', feature: F_WL, name: 'Watchlist IDOR — View Another User\'s Watchlist', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'GET /watchlist?user=',
    hints: ['Your watchlist page quietly accepts a user parameter.', 'It never checks that the list you asked for is yours.', 'Open /watchlist?user=2 while logged in as Bob.'],
    lesson: 'Object endpoints must verify ownership on the server for every request — hiding a parameter is not protection.',
    impact: 'Viewing habits of every subscriber are exposed: profiling, stalking and targeted phishing material.',
    report: { title: 'Insecure Direct Object Reference in Watchlist View', severity: 'Medium', remediation: 'Ignore client-supplied user identifiers; serve only the authenticated user\'s own watchlist.' } },
  { id: 'hist-view', feature: F_WL, name: 'Watch History IDOR — View Another User\'s History', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'GET /history?user=',
    hints: ['History has the same user-parameter habit as the watchlist.', 'Someone else\'s full viewing record is one parameter away.', 'Open /history?user=2 while logged in as Bob.'],
    lesson: 'The same broken pattern usually repeats across sibling endpoints — find one IDOR and audit them all.',
    impact: 'Complete viewing histories leak, a sensitive behavioural record for every subscriber.',
    report: { title: 'Insecure Direct Object Reference in Watch History', severity: 'Medium', remediation: 'Scope all history queries to the authenticated user on the server side.' } },
  { id: 'wl-remove', feature: F_WL, name: 'Remove Items From Another User\'s Watchlist', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate', location: 'POST /watchlist/remove',
    hints: ['Removing an item accepts a user field — and believes it.', 'A state-changing IDOR is worse than a read-only one.', 'POST /watchlist/remove with videoId=2 and user=2 while logged in as Bob, then check Alice\'s list.'],
    lesson: 'Write-side IDORs let attackers vandalise or manipulate other users\' data, not just read it.',
    impact: 'Attackers can wipe or alter every subscriber\'s saved lists — support chaos and data-loss complaints follow.',
    report: { title: 'State-Changing IDOR in Watchlist Removal', severity: 'Medium', remediation: 'Derive the list owner from the session and verify ownership before any mutation.' } },

  /* ---------------- Membership & Payments ---------------- */
  { id: 'mem-price', feature: F_MEM, name: 'Premium Upgrade Price Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate', location: 'POST /membership/upgrade',
    hints: ['The upgrade form posts an amount field, and the server trusts it as the price paid.', 'Premium costs $12. The server never compares your amount to $12.', 'Upgrade with amount=1 in the POST body and check your tier.'],
    lesson: 'Prices are server-side facts. Any price, discount or total that arrives from the client must be recomputed, never trusted.',
    impact: 'Attackers (and ordinary users) upgrade for $1 or $0 — direct, silent revenue loss.',
    report: { title: 'Client-Supplied Price Trusted in Membership Upgrade', severity: 'High', remediation: 'Recompute the charge server-side from the plan catalogue and verify the payment amount before granting the tier.' } },
  { id: 'mem-coupon', feature: F_MEM, name: 'Single-Use Coupon Can Be Reused (FREEMONTH)', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner', location: 'POST /membership/upgrade',
    hints: ['FREEMONTH is advertised as single-use per account. The server records the use — somewhere it never looks again.', 'Apply it, finish the upgrade, then apply it a second time.', 'POST two upgrades with coupon=FREEMONTH; the second free month should be refused but is granted.'],
    lesson: 'Business rules like "single use" only exist if the server enforces them on every transaction, not just displays them.',
    impact: 'Coupon codes leak once and are reused forever — promotions become permanent free premium.',
    report: { title: 'Single-Use Coupon Redemption Not Enforced', severity: 'Medium', remediation: 'Record redemptions in a transaction and reject any code already redeemed by the account.' } },

  /* ---------------- Comments ---------------- */
  { id: 'com-xss', feature: F_COM, name: 'Stored XSS in Comments', owasp: 'A03:2021 Injection', difficulty: 'Beginner', location: 'POST /comment → GET /video/:id',
    hints: ['Comments are printed on the video page exactly as stored.', 'A comment is just text — until it contains markup.', 'Post a comment containing <script>alert(1)</script> on any video and reload its page.'],
    lesson: 'Stored XSS in comments fires for every viewer of the page — one comment, many victims, including staff.',
    impact: 'Attackers run scripts in subscribers\' and moderators\' browsers: session theft, fake payment forms, defacement.',
    report: { title: 'Stored Cross-Site Scripting in Video Comments', severity: 'High', remediation: 'Encode comment text on render and sanitise with a proven library; add a Content-Security-Policy.' } },
  { id: 'com-delete', feature: F_COM, name: 'Delete Another User\'s Comment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'POST /comment/delete',
    hints: ['The delete endpoint asks for a comment id and nothing else.', 'Ownership is never compared with your session.', 'Delete comment id 1 (Alice\'s) while logged in as Bob.'],
    lesson: 'Every mutation endpoint needs an ownership check — the delete button being hidden in your UI does not protect the endpoint.',
    impact: 'Anyone can erase other users\' comments: censorship, harassment cover-ups and review manipulation.',
    report: { title: 'Missing Ownership Check on Comment Deletion', severity: 'Medium', remediation: 'Verify the comment belongs to the session user (or a moderator) before deleting.' } },

  /* ---------------- Creator Studio ---------------- */
  { id: 'up-html', feature: F_CRE, name: 'Unrestricted Upload — HTML/SVG "Video" Stored & Served', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Intermediate', location: 'POST /creator/upload → GET /files/:name',
    hints: ['The upload form accepts any file and the site serves it back under its own domain, with its content type intact.', 'A "video" does not have to be a video file at all.', 'Upload a file named evil.html containing a script payload, then open /files/evil.html.'],
    lesson: 'If uploads are served from the app domain without type restrictions, an upload feature is a stored-XSS hosting plan.',
    impact: 'Attackers host phishing and script payloads on the trusted streaming domain itself.',
    report: { title: 'Unrestricted File Upload of HTML/SVG Served From the Application Domain', severity: 'High', remediation: 'Allowlist media types, verify file signatures, rename uploads, and serve them from a separate cookieless domain with safe Content-Type.' } },
  { id: 'creator-edit', feature: F_CRE, name: 'Edit Another Creator\'s Video Metadata', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'POST /creator/edit',
    hints: ['The edit endpoint trusts the videoId in the form and never asks who owns the video.', 'Carol owns videos 1 and 4. Video 2 belongs to someone else.', 'As Carol, POST /creator/edit with videoId=2 and a new title.'],
    lesson: 'Creator tools must check object ownership per request — a creator role is not a licence to edit the whole catalogue.',
    impact: 'Rival creators (or one compromised account) can retitle and deface every video on the platform.',
    report: { title: 'Missing Ownership Check on Video Metadata Editing', severity: 'Medium', remediation: 'Verify video.ownerId equals the session user (or admin) before applying metadata changes.' } },

  /* ---------------- Admin & Platform ---------------- */
  { id: 'admin-bac', feature: F_ADM, name: 'Admin Console Open to Any Signed-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner', location: 'GET /admin',
    hints: ['The admin console URL is guessable, and the page never checks your role on the server.', 'You only need to be logged in — as anyone.', 'Log in as Bob and open /admin.'],
    lesson: 'A page that exists but is "not linked" is still a page. Server-side role checks are the only real door.',
    impact: 'The full user list — emails and passwords — is visible to every subscriber: a complete account-takeover kit.',
    report: { title: 'Broken Access Control on Admin Console', severity: 'Critical', remediation: 'Enforce an admin role check on the server for every admin route and never render credential material.' } },
  { id: 'plat-debug', feature: F_ADM, name: 'Unauthenticated /api/debug Exposes All Accounts', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner', location: 'GET /api/debug',
    hints: ['Developers leave diagnostic endpoints behind. This one needs no login at all.', 'Try the classic debugging path on the API.', 'Open /api/debug in a private window with no session.'],
    lesson: 'Debug endpoints shipped to production hand attackers the entire user table — often including passwords.',
    impact: 'One unauthenticated request dumps every account: instant mass account takeover and a reportable data breach.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes User Credentials', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and require admin authentication plus IP allowlisting for diagnostics.' } }
];

/* ------------------------------------------------------------------ *
 * Key material (part 2 of 2) + runtime assembler.                    *
 * ------------------------------------------------------------------ */
const _kB1 = ["LU5BVA==","NTJNMA==","VkVBTw=="];
const _kB2 = ["LTRGWg==","UUZEMA==","V1k3Mw=="];
function _unshard(parts) {
  return parts.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
function entryKey() { return _unshard(_kA1.concat(_kB1)); }
function completionKey() { return _unshard(_kA2.concat(_kB2)); }

/* ============================ HTTP helpers ============================ */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const XSS_RE = /(<script|<svg|<img|onerror\s*=|onload\s*=|javascript:)/i;
const INJ_RE = /(('|")\s*(or|and)\s+)|(--)|(\bunion\b\s+\bselect\b)|('\s*=\s*')/i;

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
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      } else {
        const out = {};
        for (const pair of data.split('&')) {
          if (!pair) continue;
          const i = pair.indexOf('=');
          const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
          const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
          out[k] = v;
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function sendHtml(req, res, code, body) {
  const cookies = ['hx_origin=hexastream; Path=/; SameSite=Lax'];
  if (req._sid) cookies.push('sid=' + req._sid + '; Path=/; HttpOnly; SameSite=Lax');
  if (req._role !== undefined) cookies.push('hx_role=' + req._role + '; Path=/; SameSite=Lax');
  if (req._clearSid) cookies.push('sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0');
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookies });
  res.end(body);
}
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj, null, 2));
}
function redirectTo(req, res, to) {
  const cookies = [];
  if (req._sid) cookies.push('sid=' + req._sid + '; Path=/; HttpOnly; SameSite=Lax');
  if (req._role !== undefined) cookies.push('hx_role=' + req._role + '; Path=/; SameSite=Lax');
  if (req._clearSid) cookies.push('sid=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0');
  res.writeHead(302, { Location: to, 'Set-Cookie': cookies });
  res.end();
}
function currentUser(req) {
  const sid = req._cookies.sid;
  if (!sid || !sessions.has(sid)) return null;
  return users.find(u => u.id === sessions.get(sid)) || null;
}
function loginUser(req, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  req._sid = sid;
  req._role = user.role;
}

/* ============================ Page chrome ============================ */
function progressBarHtml() {
  const total = TESTS.length, done = doneCount();
  const pct = Math.floor(done * 100 / total);
  return '<div style="background:#111827;border:1px solid #374151;border-radius:8px;padding:8px 12px;margin:10px 0">' +
    '<div style="font-size:13px;color:#e5e7eb">LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + pct + '%</div>' +
    '<div style="background:#374151;border-radius:4px;height:10px;margin-top:6px"><div style="background:#22c55e;height:10px;border-radius:4px;width:' + pct + '%"></div></div></div>';
}
function layout(req, title, content) {
  const user = currentUser(req);
  const nav = user
    ? '<a href="/">Library</a> · <a href="/search">Search</a> · <a href="/watchlist">Watchlist</a> · <a href="/history">History</a> · <a href="/membership">Membership</a> · <a href="/creator">Creator Studio</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Board</a> · <a href="/complete">Complete</a> · ' + esc(user.name) + ' (' + esc(user.tier) + ') · <a href="/logout">Logout</a>'
    : '<a href="/">Library</a> · <a href="/search">Search</a> · <a href="/tests">Mission Board</a> · <a href="/login">Login</a> · <a href="/register">Register</a>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaStream</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;background:#0b1220;color:#e5e7eb;margin:0 auto;max-width:920px;padding:16px}a{color:#60a5fa}input,textarea,select{background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:6px;margin:4px 0}button{background:#2563eb;color:#fff;border:0;border-radius:6px;padding:7px 14px;cursor:pointer}.card{background:#111827;border:1px solid #374151;border-radius:8px;padding:12px;margin:10px 0}table{border-collapse:collapse}td,th{border:1px solid #374151;padding:5px 9px}code{background:#1f2937;padding:2px 6px;border-radius:4px}details{margin:4px 0}</style></head><body>' +
    '<header><div style="display:flex;align-items:center;gap:10px"><img src="/logo.png" alt="HexaCyberLab" style="height:38px"><h1 style="font-size:19px;margin:0">LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1></div>' +
    '<nav style="margin:8px 0;font-size:14px">' + nav + '</nav>' + progressBarHtml() + '</header>' +
    content + chatWidgetHtml() + '</body></html>';
}
function chatWidgetHtml() {
  return '<div id="coach" style="position:fixed;right:14px;bottom:14px;width:300px;background:#111827;border:1px solid #374151;border-radius:10px;padding:10px;font-size:13px">' +
    '<b>Lab Coach</b><div id="coachlog" style="height:110px;overflow:auto;margin:6px 0"></div>' +
    '<input id="coachmsg" placeholder="Ask the coach…" style="width:68%"> <button onclick="coachSend()">Ask</button>' +
    '<script>async function coachSend(){var m=document.getElementById("coachmsg");var log=document.getElementById("coachlog");var t=m.value;m.value="";log.innerHTML+="<div><b>You:</b> "+t.replace(/</g,"&lt;")+"</div>";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t})});var j=await r.json();log.innerHTML+="<div><b>Coach:</b> "+j.reply.replace(/</g,"&lt;")+"</div>";}catch(e){log.innerHTML+="<div><b>Coach:</b> (offline)</div>";}log.scrollTop=1e6;}</script></div>';
}
function gatePage(req, res, msg) {
  const body = '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head>' +
    '<body style="font-family:system-ui,Arial;background:#0b1220;color:#e5e7eb;max-width:640px;margin:40px auto;padding:16px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:44px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + PREV_LAB + ' to start.</p>' +
    (msg ? '<p style="color:#f87171">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + PREV_LAB + '" style="width:70%;padding:8px"> <button style="padding:8px 14px">Unlock</button></form>' +
    chatWidgetHtml() + '</body></html>';
  sendHtml(req, res, 200, body);
}

/* ============================ Business routes ============================ */
function homePage(req, res) {
  const user = currentUser(req);
  const cards = videos.filter(v => v.listed).map(v =>
    '<div class="card"><b><a href="/video/' + v.id + '">' + esc(v.title) + '</a></b> ' +
    (v.tier === 'premium' ? '<span style="color:#fbbf24">[PREMIUM]</span>' : '<span style="color:#34d399">[FREE]</span>') +
    '<br><small>' + esc(v.desc) + '</small></div>').join('');
  sendHtml(req, res, 200, layout(req, 'Library',
    '<h2>Video Library</h2><p>Welcome to HexaStream, the (deliberately vulnerable) streaming platform of LAB ' + LAB_NUMBER + '.</p>' + cards +
    (user ? '' : '<p><a href="/login">Login</a> to watch, build a watchlist and more.</p>')));
}

function sqliLoginUser(email, password) {
  // Simulates a string-built SQL query: WHERE email = '<email>' AND password = '<password>'
  const inj = /('|")|(--)|(#)|(\bor\b)|(\bunion\b)/i;
  if (!inj.test(email) && !inj.test(password)) return null;
  const prefix = String(email).split("'")[0].split('"')[0].trim();
  let user = users.find(u => u.email === prefix);
  if (!user && /or\s+('?\d+'?\s*=\s*'?\d+|'[^']*'\s*=\s*'[^']*')/i.test(email + ' ' + password)) user = users[0];
  return user || null;
}

async function loginHandler(req, res) {
  if (req.method === 'GET') {
    return sendHtml(req, res, 200, layout(req, 'Login',
      '<h2>Login</h2><form method="POST" action="/login">Email <input name="email" size="30"><br>Password <input name="password" type="password" size="30"><br><button>Login</button></form>' +
      '<div class="card"><b>Just visiting?</b> Try the demo account — email: demo@hexastream.local · password: demo123</div>' +
      '<p><a href="/forgot">Forgot your password?</a></p>'));
  }
  const b = await readBody(req);
  attempt(F_AUTH);
  const email = String(b.email || ''), password = String(b.password || '');
  const user = users.find(u => u.email === email);
  if (user && user.password === password) {
    loginUser(req, user);
    if (user.email === 'demo@hexastream.local') pass('auth-default');
    return redirectTo(req, res, '/');
  }
  const su = sqliLoginUser(email, password);
  if (su) { loginUser(req, su); pass('auth-sqli'); return redirectTo(req, res, '/'); }
  let msg;
  if (user) {
    const n = (loginFails.get(user.id) || 0) + 1;
    loginFails.set(user.id, n);
    if (n >= 10) pass('auth-brute');
    msg = 'Wrong password for this account.';
  } else {
    msg = 'No account exists for that email address.';
  }
  sendHtml(req, res, 200, layout(req, 'Login', '<h2>Login</h2><p style="color:#f87171">' + esc(msg) + '</p><p><a href="/login">Try again</a></p>'));
}

async function registerHandler(req, res) {
  if (req.method === 'GET') {
    return sendHtml(req, res, 200, layout(req, 'Register',
      '<h2>Register</h2><form method="POST" action="/register">Name <input name="name" size="30"><br>Email <input name="email" size="30"><br>Password <input name="password" type="password" size="30"><br><button>Create account</button></form>'));
  }
  const b = await readBody(req);
  attempt(F_REG);
  const name = String(b.name || 'New User'), email = String(b.email || '');
  const password = String(b.password || '');
  if (!email || users.some(u => u.email === email)) {
    return sendHtml(req, res, 200, layout(req, 'Register', '<p style="color:#f87171">That email is missing or already registered.</p><p><a href="/register">Back</a></p>'));
  }
  const user = { id: nextUserId++, name, email, password, role: 'user', tier: 'free' };
  // MASS ASSIGNMENT FLAW: extra body fields are copied straight onto the account.
  if (b.role && ['user', 'creator', 'admin'].includes(b.role)) user.role = b.role;
  if (b.tier && ['free', 'premium'].includes(b.tier)) user.tier = b.tier;
  if (user.role !== 'user' || user.tier !== 'free') pass('reg-mass');
  if (password.length < 4) pass('reg-weakpw');
  if (XSS_RE.test(name)) pass('reg-xss');
  users.push(user);
  loginUser(req, user);
  redirectTo(req, res, '/');
}

async function forgotHandler(req, res) {
  if (req.method === 'GET') {
    return sendHtml(req, res, 200, layout(req, 'Forgot password',
      '<h2>Forgot password</h2><form method="POST" action="/forgot">Email <input name="email" size="30"><br><button>Send reset link</button></form>'));
  }
  const b = await readBody(req);
  attempt(F_AUTH);
  const email = String(b.email || '');
  forgotProbes.add(email);
  if (forgotProbes.size >= 5) pass('auth-enum');
  const user = users.find(u => u.email === email);
  if (!user) {
    return sendHtml(req, res, 200, layout(req, 'Forgot password', '<p style="color:#f87171">No account found for that email address.</p>'));
  }
  resetIssued.add(user.id);
  const token = 'HS' + user.id + '-' + (user.id * 137 + 42);
  sendHtml(req, res, 200, layout(req, 'Forgot password',
    '<p>Reset link sent. <small>(Lab mail preview — token: <code>' + token + '</code>)</small></p>' +
    '<form method="POST" action="/reset">Email <input name="email" value="' + esc(email) + '"><br>Token <input name="token" size="30"><br>New password <input name="newpassword" type="password"><br><button>Reset password</button></form>'));
}

async function resetHandler(req, res) {
  const b = await readBody(req);
  attempt(F_AUTH);
  const user = users.find(u => u.email === String(b.email || ''));
  if (!user) return sendHtml(req, res, 200, layout(req, 'Reset', '<p style="color:#f87171">No such account.</p>'));
  const expected = 'HS' + user.id + '-' + (user.id * 137 + 42);
  if (String(b.token || '') === expected) {
    if (!resetIssued.has(user.id)) pass('auth-reset');
    user.password = String(b.newpassword || 'changed123');
    return sendHtml(req, res, 200, layout(req, 'Reset', '<p>Password updated. <a href="/login">Login</a></p>'));
  }
  sendHtml(req, res, 200, layout(req, 'Reset', '<p style="color:#f87171">Invalid token.</p>'));
}

function logoutHandler(req, res) {
  const sid = req._cookies.sid;
  if (sid) sessions.delete(sid);
  req._clearSid = true;
  redirectTo(req, res, '/');
}

async function profileHandler(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  if (req.method === 'GET') {
    return sendHtml(req, res, 200, layout(req, 'Profile',
      '<h2>Your profile</h2><p>Account ID: <b>' + user.id + '</b><br>Email: ' + esc(user.email) + '<br>Role: ' + esc(user.role) + '<br>Tier: ' + esc(user.tier) + '</p>' +
      '<form method="POST" action="/profile">Display name <input name="name" value="' + esc(user.name) + '" size="30"><br><button>Save</button></form>'));
  }
  const b = await readBody(req);
  attempt(F_REG);
  // CSRF FLAW: the hx_origin marker is set on our pages but never verified here.
  if (!req._cookies.hx_origin) pass('reg-csrf');
  if (b.name) { user.name = String(b.name); if (XSS_RE.test(user.name)) pass('reg-xss'); }
  redirectTo(req, res, '/profile');
}

function searchHandler(req, res, url) {
  const q = url.searchParams.get('q') || '';
  attempt(F_SEARCH);
  let results;
  if (INJ_RE.test(q)) {
    results = videos.slice(); // injection: WHERE clause always true → whole table, incl. unlisted
    if (results.some(v => !v.listed)) pass('search-sqli');
  } else {
    results = videos.filter(v => v.listed && v.title.toLowerCase().includes(q.toLowerCase()));
  }
  if (XSS_RE.test(q)) pass('search-xss');
  const items = results.map(v => '<div class="card"><b><a href="/video/' + v.id + '">' + esc(v.title) + '</a></b>' + (v.listed ? '' : ' <span style="color:#f87171">[UNLISTED]</span>') + '</div>').join('');
  // FLAW: q is reflected unescaped in the heading.
  sendHtml(req, res, 200, layout(req, 'Search',
    '<h2>Search</h2><form method="GET" action="/search"><input name="q" size="34" value="' + esc(q) + '"> <button>Search</button></form>' +
    '<p>Results for: ' + q + '</p>' + (items || '<p>No results.</p>')));
}

function videoPage(req, res, id) {
  const video = videos.find(v => v.id === id);
  if (!video) return sendHtml(req, res, 404, layout(req, 'Not found', '<h2>Video not found</h2>'));
  const user = currentUser(req);
  if (!video.listed && (!user || (user.id !== video.ownerId && user.role !== 'admin'))) pass('play-unlisted');
  const owner = users.find(u => u.id === video.ownerId);
  const vcomments = comments.filter(c => c.videoId === id).map(c => {
    const author = users.find(u => u.id === c.userId);
    // FLAW: comment text and author name rendered raw (stored XSS sink).
    return '<div class="card"><b>' + (author ? author.name : 'unknown') + '</b>: ' + c.text +
      (user ? ' <form method="POST" action="/comment/delete" style="display:inline"><input type="hidden" name="id" value="' + c.id + '"><button>Delete</button></form>' : '') + '</div>';
  }).join('');
  sendHtml(req, res, 200, layout(req, video.title,
    '<h2>' + esc(video.title) + '</h2><p>' + esc(video.desc) + '</p>' +
    '<p>Tier: ' + esc(video.tier) + ' · Uploaded by ' + (owner ? owner.name : 'unknown') + '</p>' +
    '<p><a href="/watch/' + video.id + '"><button>▶ Watch</button></a></p>' +
    (user ? '<form method="POST" action="/watchlist/add"><input type="hidden" name="videoId" value="' + video.id + '"><button>Add to my watchlist</button></form>' : '') +
    '<h3>Comments</h3>' + (vcomments || '<p>No comments yet.</p>') +
    (user ? '<form method="POST" action="/comment"><input type="hidden" name="videoId" value="' + video.id + '"><input name="text" size="50" placeholder="Write a comment"> <button>Post comment</button></form>' : '<p><a href="/login">Login</a> to comment.</p>')));
}

function watchPage(req, res, id, url) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const video = videos.find(v => v.id === id);
  if (!video) return sendHtml(req, res, 404, layout(req, 'Not found', '<h2>Video not found</h2>'));
  attempt(F_PLAY);
  let entitled = user.tier === 'premium' || video.tier === 'free';
  // FLAW: a client-supplied tier parameter is believed instead of the account record.
  if (!entitled && url.searchParams.get('tier') === 'premium') { entitled = true; pass('play-premium'); }
  if (!entitled) {
    return sendHtml(req, res, 200, layout(req, 'Premium only',
      '<h2>' + esc(video.title) + '</h2><p>This is a <b>premium</b> video and your account is on the <b>' + esc(user.tier) + '</b> tier.</p><p><a href="/membership">Upgrade to Premium</a></p>'));
  }
  const token = Buffer.from('stream:' + video.id + ':' + user.id, 'utf8').toString('base64');
  issuedTokens.add(token);
  historyLog.push({ userId: user.id, videoId: video.id });
  sendHtml(req, res, 200, layout(req, 'Watching ' + video.title,
    '<h2>' + esc(video.title) + '</h2><div class="card" style="text-align:center;padding:34px">▶ NOW PLAYING (simulated)<br><small>Stream endpoint: <a href="/stream/' + video.id + '?token=' + token + '">/stream/' + video.id + '?token=' + token + '</a></small></div>'));
}

function streamHandler(req, res, id, url) {
  const video = videos.find(v => v.id === id);
  if (!video) return sendJson(res, 404, { error: 'no such video' });
  attempt(F_PLAY);
  const token = url.searchParams.get('token') || '';
  let decoded = '';
  try { decoded = Buffer.from(token, 'base64').toString('utf8'); } catch (e) { decoded = ''; }
  // FLAW: any correctly formatted, unsigned token is accepted — no signature, no issuance check.
  if (decoded === 'stream:' + video.id + ':' + (decoded.split(':')[2] || '') && decoded.split(':').length === 3) {
    if (!issuedTokens.has(token)) pass('play-token');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('SIMULATED VIDEO STREAM for "' + video.title + '" (video id ' + video.id + ')');
  }
  sendJson(res, 403, { error: 'invalid playback token' });
}

/* ================= Watchlists & History (IDOR family) ================= */
function watchlistPage(req, res, url) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  attempt(F_WL);
  let targetId = user.id;
  const asked = url.searchParams.get('user');
  if (asked && Number(asked) !== user.id) { targetId = Number(asked); pass('wl-view'); } // FLAW: no ownership check
  const target = users.find(u => u.id === targetId);
  const list = (watchlists[targetId] || []).map(vid => {
    const v = videos.find(x => x.id === vid);
    return v ? '<div class="card"><a href="/video/' + v.id + '">' + esc(v.title) + '</a> <form method="POST" action="/watchlist/remove" style="display:inline"><input type="hidden" name="videoId" value="' + v.id + '"><input type="hidden" name="user" value="' + targetId + '"><button>Remove</button></form></div>' : '';
  }).join('');
  sendHtml(req, res, 200, layout(req, 'Watchlist',
    '<h2>Watchlist of ' + esc(target ? target.name : 'unknown') + '</h2>' + (list || '<p>Empty.</p>')));
}
async function watchlistAdd(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const b = await readBody(req);
  attempt(F_WL);
  watchlists[user.id] = watchlists[user.id] || [];
  const vid = Number(b.videoId);
  if (vid && !watchlists[user.id].includes(vid)) watchlists[user.id].push(vid);
  redirectTo(req, res, '/watchlist');
}
async function watchlistRemove(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const b = await readBody(req);
  attempt(F_WL);
  const targetId = b.user ? Number(b.user) : user.id;
  if (targetId !== user.id) pass('wl-remove'); // FLAW: mutates another user's list
  watchlists[targetId] = (watchlists[targetId] || []).filter(v => v !== Number(b.videoId));
  redirectTo(req, res, '/watchlist?user=' + targetId);
}
function historyPage(req, res, url) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  attempt(F_WL);
  let targetId = user.id;
  const asked = url.searchParams.get('user');
  if (asked && Number(asked) !== user.id) { targetId = Number(asked); pass('hist-view'); } // FLAW: no ownership check
  const target = users.find(u => u.id === targetId);
  const items = historyLog.filter(h => h.userId === targetId).map(h => {
    const v = videos.find(x => x.id === h.videoId);
    return v ? '<div class="card">' + esc(v.title) + '</div>' : '';
  }).join('');
  sendHtml(req, res, 200, layout(req, 'History',
    '<h2>Watch history of ' + esc(target ? target.name : 'unknown') + '</h2>' + (items || '<p>Nothing watched yet.</p>')));
}

/* ================= Membership & Payments ================= */
function membershipPage(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  sendHtml(req, res, 200, layout(req, 'Membership',
    '<h2>Membership</h2><p>Your tier: <b>' + esc(user.tier) + '</b></p>' +
    '<div class="card"><b>Premium — $' + PREMIUM_PRICE + '/month</b><br>All premium titles, creator extras.<br>' +
    'Coupon hint: launch code <code>FREEMONTH</code> gives one free month — single use per account.' +
    '<form method="POST" action="/membership/upgrade">Amount (USD) <input name="amount" value="' + PREMIUM_PRICE + '" size="6"> Coupon <input name="coupon" size="12"> <button>Upgrade</button></form></div>'));
}
async function membershipUpgrade(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const b = await readBody(req);
  attempt(F_MEM);
  const coupon = String(b.coupon || '').trim().toUpperCase();
  let due = PREMIUM_PRICE;
  if (coupon === 'FREEMONTH') {
    const used = usedCoupons.get(user.id) || new Set();
    if (used.has(coupon)) pass('mem-coupon'); // FLAW: reuse is granted instead of rejected
    used.add(coupon);
    usedCoupons.set(user.id, used);
    due = 0;
  }
  const amount = b.amount === undefined || b.amount === '' ? due : Number(b.amount);
  // FLAW: the client-supplied amount is trusted as the amount paid.
  if (due > 0 && amount < due) pass('mem-price');
  user.tier = 'premium';
  redirectTo(req, res, '/membership');
}

/* ================= Comments ================= */
async function commentPost(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const b = await readBody(req);
  attempt(F_COM);
  const text = String(b.text || '');
  if (XSS_RE.test(text)) pass('com-xss'); // stored raw; rendered raw on the video page
  comments.push({ id: nextCommentId++, videoId: Number(b.videoId), userId: user.id, text });
  redirectTo(req, res, '/video/' + Number(b.videoId));
}
async function commentDelete(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  const b = await readBody(req);
  attempt(F_COM);
  const c = comments.find(x => x.id === Number(b.id));
  if (c) {
    if (c.userId !== user.id) pass('com-delete'); // FLAW: no ownership check
    comments = comments.filter(x => x.id !== c.id);
    return redirectTo(req, res, '/video/' + c.videoId);
  }
  redirectTo(req, res, '/');
}

/* ================= Creator Studio ================= */
function creatorGate(req) {
  // FLAW: the gate reads the client-controlled hx_role cookie, not the server-side account.
  const user = currentUser(req);
  const cookieRole = req._cookies.hx_role || (user ? user.role : null);
  if (user && (cookieRole === 'creator' || cookieRole === 'admin')) {
    if (user.role !== 'creator' && user.role !== 'admin') pass('auth-cookie');
    return user;
  }
  return null;
}
function creatorPage(req, res) {
  const user = creatorGate(req);
  if (!user) {
    if (!currentUser(req)) return redirectTo(req, res, '/login');
    return sendHtml(req, res, 403, layout(req, 'Creator Studio', '<h2>Creator Studio</h2><p>Creators only. Your role does not open this console.</p>'));
  }
  const mine = videos.filter(v => v.ownerId === user.id).map(v => '<div class="card">' + esc(v.title) + ' (id ' + v.id + ')</div>').join('');
  const all = videos.map(v => v.id + ': ' + esc(v.title) + ' (owner ' + v.ownerId + ')').join('<br>');
  sendHtml(req, res, 200, layout(req, 'Creator Studio',
    '<h2>Creator Studio</h2><h3>Your videos</h3>' + (mine || '<p>None.</p>') +
    '<div class="card"><b>Upload a video</b><form method="POST" action="/creator/upload">File name <input name="filename" size="24"> <br>File content <textarea name="content" rows="3" cols="50"></textarea><br><button>Upload</button></form></div>' +
    '<div class="card"><b>Edit video metadata</b><br><small>Catalogue: <br>' + all + '</small><form method="POST" action="/creator/edit">Video ID <input name="videoId" size="5"> New title <input name="title" size="30"> <button>Save</button></form></div>'));
}
async function creatorUpload(req, res) {
  const user = creatorGate(req);
  if (!user) return sendHtml(req, res, 403, layout(req, 'Upload', '<p>Creators only.</p>'));
  const b = await readBody(req);
  attempt(F_CRE);
  const name = String(b.filename || 'upload.bin').replace(/[^\w.\-]/g, '_');
  uploads.set(name, { by: user.id, content: String(b.content || ''), type: name.split('.').pop().toLowerCase() });
  redirectTo(req, res, '/creator');
}
function fileServe(req, res, name) {
  const f = uploads.get(name);
  if (!f) return sendHtml(req, res, 404, layout(req, 'Not found', '<h2>File not found</h2>'));
  attempt(F_CRE);
  if (f.type === 'html' || f.type === 'htm' || f.type === 'svg') pass('up-html'); // stored & served from the app domain
  res.writeHead(200, { 'Content-Type': f.type === 'svg' ? 'image/svg+xml' : 'text/html; charset=utf-8' });
  res.end(f.content);
}
async function creatorEdit(req, res) {
  const user = creatorGate(req);
  if (!user) return sendHtml(req, res, 403, layout(req, 'Edit', '<p>Creators only.</p>'));
  const b = await readBody(req);
  attempt(F_CRE);
  const v = videos.find(x => x.id === Number(b.videoId));
  if (v) {
    if (v.ownerId !== user.id) pass('creator-edit'); // FLAW: no ownership check
    if (b.title) v.title = String(b.title);
  }
  redirectTo(req, res, '/creator');
}

/* ================= Admin & Platform ================= */
function adminPage(req, res) {
  const user = currentUser(req);
  if (!user) return redirectTo(req, res, '/login');
  attempt(F_ADM);
  if (user.role !== 'admin') pass('admin-bac'); // FLAW: console served to any signed-in user
  const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.password) + '</td><td>' + esc(u.role) + '</td><td>' + esc(u.tier) + '</td></tr>').join('');
  sendHtml(req, res, 200, layout(req, 'Admin',
    '<h2>Admin Console</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Tier</th></tr>' + rows + '</table>'));
}
function debugHandler(req, res) {
  attempt(F_ADM);
  pass('plat-debug'); // FLAW: unauthenticated full dump
  sendJson(res, 200, { users, videos, comments, watchlists });
}

/* ================= Lab system routes ================= */
async function unlockHandler(req, res) {
  const b = await readBody(req);
  const given = String(b.key || '');
  if (given && given === entryKey()) {
    P.unlocked = true; save();
    return redirectTo(req, res, '/');
  }
  res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>403</h1><p>Invalid key.</p>');
}
function progressApi(req, res) {
  const total = TESTS.length, done = doneCount();
  sendJson(res, 200, {
    lab: LAB_NAME, number: LAB_NUMBER, total, done,
    pct: Math.floor(done * 100 / total), features: featureStats(), complete: isComplete()
  });
}
function testsPage(req, res) {
  const stats = featureStats();
  let html = '<h2>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h2><p>' + TESTS.length + ' scored tests across ' + Object.keys(stats).length + ' features. Tests complete by DOING the exploit — the server detects the real effect.</p>';
  for (const f of Object.keys(stats)) {
    html += '<h3>' + esc(f) + ' <small>(' + stats[f].done + '/' + stats[f].total + ' done · ' + stats[f].attempts + ' attempts)</small></h3>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      const doneFlag = P.tests[t.id];
      html += '<div class="card"><b>' + (doneFlag ? '✓' : '○') + ' ' + esc(t.name) + '</b> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · <small>' + esc(t.location) + '</small>' +
        '<details><summary>Hint 1</summary>' + esc(t.hints[0]) + '</details>' +
        '<details><summary>Hint 2</summary>' + esc(t.hints[1]) + '</details>' +
        '<details><summary>Hint 3</summary>' + esc(t.hints[2]) + '</details></div>';
    }
  }
  sendHtml(req, res, 200, layout(req, 'Mission Board', html));
}
async function completePage(req, res) {
  if (req.method === 'POST') {
    const b = await readBody(req);
    if (b.name) { P.testerName = String(b.name).slice(0, 60); save(); }
    return redirectTo(req, res, '/complete');
  }
  const stats = featureStats();
  const total = TESTS.length, done = doneCount();
  if (!isComplete()) {
    const left = TESTS.filter(t => !P.tests[t.id]).map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('');
    return sendHtml(req, res, 200, layout(req, 'Complete',
      '<h2>Not complete yet</h2><p>' + done + '/' + total + ' tests done (' + Math.floor(done * 100 / total) + '%). Remaining:</p><ul>' + left + '</ul>'));
  }
  const fNames = Object.keys(stats);
  let html = '<h2>Lab Complete — 100%</h2>';
  html += '<h3>1) Total features in this lab</h3><p>' + fNames.length + ' features: ' + fNames.map(esc).join(', ') + '</p>';
  html += '<h3>2) Vulnerabilities per feature</h3><ul>' + fNames.map(f => '<li>' + esc(f) + ': ' + stats[f].total + '</li>').join('') + '</ul>';
  html += '<h3>3) How testing was done (' + total + ' techniques)</h3><ul>' + TESTS.map(t => '<li>' + esc(t.name) + ' <small>(' + esc(t.owasp) + ')</small></li>').join('') + '</ul>';
  html += '<h3>4) What you learned</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  html += '<h3>5) What this means for a real client</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  html += '<h3>6) Writing it in a real report</h3><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  html += '<div class="card"><h3>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h3><code style="font-size:16px">' + esc(completionKey()) + '</code></div>';
  html += '<form method="POST" action="/complete">Your name for the certificate <input name="name" value="' + esc(P.testerName) + '" size="30"> <button>Save name</button></form>';
  html += '<p><a href="/certificate">View your certificate</a></p>';
  sendHtml(req, res, 200, layout(req, 'Complete', html));
}
function certificatePage(req, res) {
  if (!isComplete()) return redirectTo(req, res, '/complete');
  const stats = featureStats();
  const name = P.testerName || 'HexaStream Tester';
  const date = P.completedAt ? new Date(P.completedAt).toDateString() : new Date().toDateString();
  const body = '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title>' +
    '<style>body{font-family:Georgia,serif;background:#f5f0e6;color:#1f2937;display:flex;justify-content:center;padding:30px}.card{background:#fff;border:3px double #b45309;border-radius:10px;padding:38px;max-width:640px;text-align:center}@media print{body{background:#fff}}</style></head><body>' +
    '<div class="card"><img src="/logo.png" alt="HexaCyberLab" style="height:56px"><h1>Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> (' + TESTS.length + ' tests across ' + Object.keys(stats).length + ' features)</p>' +
    '<p>' + esc(date) + '</p><p style="margin-top:22px"><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p></div></body></html>';
  sendHtml(req, res, 200, body);
}

/* ================= Lab Coach (chatbot) ================= */
const FEATURE_KEYS = [
  [F_AUTH, ['login', 'log in', 'auth', 'password', 'brute', 'reset', 'cookie', 'enumerat']],
  [F_REG, ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  [F_SEARCH, ['search', 'library']],
  [F_PLAY, ['playback', 'play', 'stream', 'token', 'watch']],
  [F_WL, ['watchlist', 'history']],
  [F_MEM, ['membership', 'upgrade', 'coupon', 'price', 'payment', 'premium']],
  [F_COM, ['comment']],
  [F_CRE, ['creator', 'upload', 'studio']],
  [F_ADM, ['admin', 'debug', 'platform']]
];
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function chatReply(message) {
  const m = ' ' + String(message || '').toLowerCase() + ' ';
  const stats = featureStats();
  const total = TESTS.length, done = doneCount();
  if (/(who built|who made|who created|founder|jony|hassain|who is behind)/.test(m)) return ATTRIBUTION;
  if (/\bkey\b/.test(m) || /unlock next/.test(m)) {
    if (isComplete() && P.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + completionKey() + ' — it unlocks the next lab.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + done + '/' + total + ' tests (' + Math.floor(done * 100 / total) + '%). Finish every test on /tests and the key will be revealed.';
  }
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) { if (keys.some(k => m.includes(k))) { feature = f; break; } }
  const howto = /(how|help|guide|step|exploit|hack|solve|do i|start)/.test(m);
  if (feature) {
    const list = TESTS.filter(t => t.feature === feature);
    const names = list.map(t => (P.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ');
    if (!howto) {
      return feature + ' has ' + list.length + ' tests: ' + names + '. Attempts so far on this feature: ' + (stats[feature].attempts || 0) + '. Ask me "how do I test ' + feature + '" after you have tried it yourself.';
    }
    const attempts = stats[feature].attempts || 0;
    const allPassed = list.every(t => P.tests[t.id]);
    if (attempts >= 3 || allPassed) {
      const steps = list.filter(t => !P.tests[t.id]).map(t => '• ' + t.name + ': ' + t.hints[2]).join(' ');
      return 'Step by step for ' + feature + ' — ' + (steps || 'every test in this feature is already done. Well played.') + ' Full map: /tests.';
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(how many|tests|features|total)/.test(m)) {
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + total + ' tests across ' + Object.keys(stats).length + ' features: ' +
      Object.keys(stats).map(f => f + ' (' + stats[f].total + ')').join(', ') + '. You have completed ' + done + '/' + total + '.';
  }
  if (/(next|progress|start|begin|stuck)/.test(m)) {
    const nxt = TESTS.find(t => !P.tests[t.id]);
    return 'Progress: ' + done + '/' + total + ' tests (' + Math.floor(done * 100 / total) + '%). ' +
      (nxt ? 'Next open test: ' + nxt.name + ' (' + nxt.feature + ', ' + nxt.difficulty + '). Work it on the live app, then check /tests.' : 'Everything is done — see /complete for your key and certificate.');
  }
  if (/(hi|hello|hey|coach)/.test(m)) {
    return 'Hello! I am the HexaStream Lab Coach. This lab has ' + total + ' tests across ' + Object.keys(stats).length + ' features, and you have completed ' + done + '. Ask me what a feature contains, or try a feature 3 times and ask me how to test it.';
  }
  return 'I can tell you what each feature contains, your progress, and — after you have genuinely tried a feature at least 3 times — step-by-step guidance for it. See the full map on /tests, and remember hints sit beside every test.';
}
async function chatHandler(req, res) {
  const b = await readBody(req);
  sendJson(res, 200, { reply: chatReply(b.message) });
}

/* ================= Doc generation (from the registry) ================= */
function genDocs() {
  const byFeature = {};
  for (const t of TESTS) { byFeature[t.feature] = byFeature[t.feature] || []; byFeature[t.feature].push(t); }
  let vuln = '# HexaStream (LAB ' + LAB_NUMBER + ') — Vulnerability Map\n\nThe complete map of the ' + TESTS.length + ' scored tests, grouped by feature. Every item is a real, working flaw in the app; the server detects the exploit effect itself.\n';
  for (const f of Object.keys(byFeature)) {
    vuln += '\n## ' + f + ' (' + byFeature[f].length + ')\n';
    for (const t of byFeature[f]) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.location + '\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaStream (LAB ' + LAB_NUMBER + ') — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge is measurable: it is complete exactly when the server observes the exploit effect and the test flips to done on /tests (progress persists across restarts).\n';
  for (const f of Object.keys(byFeature)) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature[f].slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: demonstrate this flaw against the live app at ' + t.location + '; the Mission Board flips it to done when the server sees the real effect.\n- Hint 1: ' + t.hints[0] + '\n- Hint 2: ' + t.hints[1] + '\n- Hint 3: ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaStream (LAB ' + LAB_NUMBER + ') — Fix & Retest\n\nFor every scored test: the report entry, the secure implementation, and the regression test that proves the fix.\n';
  for (const f of Object.keys(byFeature)) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature[f]) {
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: repeat the original exploit (' + t.location + ') after the fix — it must fail, and the test on /tests must no longer flip for that behaviour while legitimate use still works.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests.');
}

/* ================= Router ================= */
const server = http.createServer(async (req, res) => {
  try {
    req._cookies = parseCookies(req);
    const url = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = url.pathname;
    // Always-available endpoints (gate + system)
    if (p === '/logo.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return res.end(fs.readFileSync(LOGO_FILE));
    }
    if (p === '/unlock' && req.method === 'POST') return unlockHandler(req, res);
    if (p === '/api/chat' && req.method === 'POST') return chatHandler(req, res);
    if (p === '/api/progress' && req.method === 'GET') return progressApi(req, res);
    if (!P.unlocked) return gatePage(req, res);
    // App routes
    if (p === '/') return homePage(req, res);
    if (p === '/login') return loginHandler(req, res);
    if (p === '/register') return registerHandler(req, res);
    if (p === '/forgot') return forgotHandler(req, res);
    if (p === '/reset' && req.method === 'POST') return resetHandler(req, res);
    if (p === '/logout') return logoutHandler(req, res);
    if (p === '/profile') return profileHandler(req, res);
    if (p === '/search') return searchHandler(req, res, url);
    let m;
    if ((m = p.match(/^\/video\/(\d+)$/))) return videoPage(req, res, Number(m[1]));
    if ((m = p.match(/^\/watch\/(\d+)$/))) return watchPage(req, res, Number(m[1]), url);
    if ((m = p.match(/^\/stream\/(\d+)$/))) return streamHandler(req, res, Number(m[1]), url);
    if (p === '/watchlist' && req.method === 'GET') return watchlistPage(req, res, url);
    if (p === '/watchlist/add' && req.method === 'POST') return watchlistAdd(req, res);
    if (p === '/watchlist/remove' && req.method === 'POST') return watchlistRemove(req, res);
    if (p === '/history' && req.method === 'GET') return historyPage(req, res, url);
    if (p === '/membership' && req.method === 'GET') return membershipPage(req, res);
    if (p === '/membership/upgrade' && req.method === 'POST') return membershipUpgrade(req, res);
    if (p === '/comment' && req.method === 'POST') return commentPost(req, res);
    if (p === '/comment/delete' && req.method === 'POST') return commentDelete(req, res);
    if (p === '/creator' && req.method === 'GET') return creatorPage(req, res);
    if (p === '/creator/upload' && req.method === 'POST') return creatorUpload(req, res);
    if (p === '/creator/edit' && req.method === 'POST') return creatorEdit(req, res);
    if ((m = p.match(/^\/files\/(.+)$/))) return fileServe(req, res, decodeURIComponent(m[1]));
    if (p === '/admin' && req.method === 'GET') return adminPage(req, res);
    if (p === '/api/debug' && req.method === 'GET') return debugHandler(req, res);
    if (p === '/tests' && req.method === 'GET') return testsPage(req, res);
    if (p === '/complete') return completePage(req, res);
    if (p === '/certificate' && req.method === 'GET') return certificatePage(req, res);
    sendHtml(req, res, 404, layout(req, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) {
    try { sendJson(res, 500, { error: 'internal error' }); } catch (e2) {}
  }
});

if (process.argv.includes('--gen-docs')) {
  genDocs();
} else {
  server.listen(PORT, '127.0.0.1', () => {
    console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
  });
}
