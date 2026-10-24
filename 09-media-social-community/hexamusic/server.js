'use strict';
/* HexaMusic — LAB 86 — music streaming platform (intentionally vulnerable training lab).
   Zero-dependency Node.js. LOCAL USE ONLY. All data is fake seed data. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const LAB_NUMBER = 86;
const LAB_NAME = 'HexaMusic';
const PORT = 3095;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');
const PREMIUM_PRICE = 9.99;
const PROMO_CODE = 'HEXAFREE';

const _m1 = ["TC1YSA==","VC02OA=="]; // catalogue sync fragments (part 1 of 3)

/* ================= seed data (all fake) ================= */
const users = [
  { id: 1, name: 'Maya Admin', email: 'admin@hexamusic.local', password: 'admin123', role: 'admin', tier: 'premium', artistId: null },
  { id: 2, name: 'Nova Reverb', email: 'nova@hexamusic.local', password: 'nova123', role: 'artist', tier: 'premium', artistId: 'A1' },
  { id: 3, name: 'Echo Park', email: 'echo@hexamusic.local', password: 'echo123', role: 'artist', tier: 'premium', artistId: 'A2' },
  { id: 4, name: 'Alice Rivers', email: 'alice@test.local', password: 'alice123', role: 'listener', tier: 'free', artistId: null },
  { id: 5, name: 'Bob Stone', email: 'bob@test.local', password: 'bob123', role: 'listener', tier: 'premium', artistId: null },
  { id: 6, name: 'Demo Listener', email: 'demo@hexamusic.local', password: 'demo123', role: 'listener', tier: 'free', artistId: null }
];
let nextUserId = 7;

const artists = {
  A1: { id: 'A1', name: 'Nova Reverb', earnings: 1240 },
  A2: { id: 'A2', name: 'Echo Park', earnings: 860 }
};

const tracks = [
  { id: 1, title: 'Midnight Circuit', artistId: 'A1', album: 'Neon Roads', premium: false, released: true, royaltyRate: 0.12, label: 'HexaWave Records', isrc: 'FAKE-0001', plays: 1520 },
  { id: 2, title: 'Golden Hour', artistId: 'A1', album: 'Neon Roads', premium: true, released: true, royaltyRate: 0.15, label: 'HexaWave Records', isrc: 'FAKE-0002', plays: 986 },
  { id: 3, title: 'Secret Demo (Unreleased)', artistId: 'A1', album: 'Vault Sessions', premium: false, released: false, royaltyRate: 0.12, label: 'HexaWave Records', isrc: 'FAKE-0003', plays: 3 },
  { id: 4, title: 'Static Bloom', artistId: 'A2', album: 'Garden Noise', premium: false, released: true, royaltyRate: 0.10, label: 'Indie North', isrc: 'FAKE-0004', plays: 764 },
  { id: 5, title: 'Paywall Anthem', artistId: 'A2', album: 'Garden Noise', premium: true, released: true, royaltyRate: 0.18, label: 'Indie North', isrc: 'FAKE-0005', plays: 431 }
];

const _m4 = ["TC1YSA==","NS03OA=="]; // label catalogue codes (part 1 of 3)

const playlists = [
  { id: 1, ownerId: 4, name: 'Alice Secret Mix', private: true, trackIds: [1, 4] },
  { id: 2, ownerId: 5, name: 'Bob Public Mix', private: false, trackIds: [2, 5] },
  { id: 3, ownerId: 4, name: 'Alice Morning Mix', private: false, trackIds: [1, 2] }
];

const sessions = new Map();       // sid -> { userId, marker }
const failCounts = new Map();     // email -> consecutive failed logins (never throttled: the flaw)
const forgotProbes = new Set();   // distinct emails probed on /forgot
const issuedTokens = new Set();   // email:token pairs actually issued by /forgot
const promoRedeemed = new Map();  // userId -> times promo redeemed

function resetTokenFor(user) { return 'HM' + user.id + '-' + (user.id * 137 + 42); }

/* ================= TESTS registry ================= */
const F = {
  AUTH: 'Login & Authentication',
  REG: 'Registration & Profile',
  SEARCH: 'Search & Catalogue',
  PLAY: 'Playlists',
  TRACK: 'Tracks & Streaming',
  ROY: 'Artists & Royalties',
  BILL: 'Premium & Billing',
  ADMIN: 'Admin Panel',
  PLAT: 'Platform & API'
};

const TESTS = [
  { id: 'auth-sqli', feature: F.AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /login', how: 'Inject an OR-tautology into the email field so the string-built query matches a user without the real password.',
    hints: ['The login query is built by string concatenation — think about closing the quote.', "Try an email that turns the WHERE clause into something that is always true.", "Email: ' OR '1'='1' --  with any password logs you in as the first user."],
    lesson: 'String-built SQL queries let an attacker rewrite the query logic itself; parameterised queries make user input data, never code.',
    impact: 'On a real streaming service this means instant takeover of any account — including admin — without knowing a single password.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all database access and add a WAF rule for injection patterns.' } },
  { id: 'auth-brute', feature: F.AUTH, name: 'No Brute-Force Protection on Login', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /login', how: 'Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no lockout, delay or CAPTCHA.',
    hints: ['Count how many wrong passwords you can try in a row.', 'There is no lockout, no delay and no CAPTCHA — nothing slows you down.', 'Script 10 failed logins for alice@test.local; the 10th is still processed normally.'],
    lesson: 'Without rate limiting or lockout, weak passwords fall to automated guessing in minutes.',
    impact: 'Attackers can crack customer accounts at scale, hijack listening accounts and pivot to payment details.',
    report: { title: 'Missing Brute-Force Protection on Authentication Endpoint', severity: 'High', remediation: 'Add progressive delays, account lockout and CAPTCHA after repeated failures, plus breached-password screening.' } },
  { id: 'auth-enum', feature: F.AUTH, name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /forgot and POST /login', how: 'Probe several email addresses; existing and non-existing accounts produce clearly different responses.',
    hints: ['Compare the forgot-password answer for a real account and an invented one.', 'The messages differ — one confirms the account exists.', 'Probe 5+ different emails on /forgot and note which ones are confirmed as real accounts.'],
    lesson: 'Different error messages for "no such account" vs "wrong password" hand attackers a free list of valid users to target.',
    impact: 'Attackers harvest valid customer emails, then aim phishing and credential-stuffing at accounts that definitely exist.',
    report: { title: 'Account Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic response for all login and password-reset outcomes regardless of account existence.' } },
  { id: 'auth-demo', feature: F.AUTH, name: 'Demo Credentials Published on the Login Page', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'GET /login (credentials printed on the page)', how: 'Use the demo email/password printed on the login page to sign in.',
    hints: ['Read the login page carefully — it is unusually helpful.', 'A working demo account is printed right on the page.', 'Sign in with the demo@hexamusic.local credentials shown on /login.'],
    lesson: 'Published or default credentials are the first thing attackers try — they turn a locked door into an open one.',
    impact: 'Anyone on the internet can walk into a working account, and demo accounts often share passwords with real systems.',
    report: { title: 'Working Demo Credentials Disclosed on Public Login Page', severity: 'High', remediation: 'Remove published credentials, disable demo accounts in production and enforce unique strong passwords.' } },
  { id: 'auth-reset', feature: F.AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'POST /reset', how: 'The reset token is derived from the user id by a simple formula; compute a valid token for an account that never requested a reset and take it over.',
    hints: ['Request a reset for an account you control and study the token format.', 'The token is just the user id run through simple arithmetic.', 'Token = HM<id>-<id*137+42>. Compute it for bob (id 5) and POST /reset without ever using /forgot for him.'],
    lesson: 'Reset tokens must be long, random and single-use — anything derivable from public data is an account-takeover shortcut.',
    impact: 'An attacker who knows a victim\u2019s user id can reset their password and own the account in seconds.',
    report: { title: 'Password Reset Tokens Are Predictable', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (128+ bits), expire them quickly and invalidate after use.' } },
  { id: 'auth-cookie', feature: F.AUTH, name: 'Role Cookie Tampering (hx_role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /admin', how: 'The admin gate trusts a client-set hx_role cookie instead of the server-side session role; set hx_role=admin in your browser and open /admin as a normal listener.',
    hints: ['Look at the cookies the app sets after login.', 'One cookie carries your role — and the server trusts it blindly.', 'As any listener, set the cookie hx_role=admin and visit /admin.'],
    lesson: 'Authorization decisions must come from server-side session state, never from values the client can edit.',
    impact: 'Any customer can promote themselves to admin in seconds and reach user data and destructive actions.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles only from the server-side session record; ignore role data supplied by the client.' } },
  { id: 'reg-weakpw', feature: F.REG, name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
    where: 'POST /register', how: 'Register an account with a 1-character password; the app accepts it.',
    hints: ['Try registering with the shortest password you can think of.', 'There is no minimum length or complexity check at all.', 'Register with password "a" — it is accepted.'],
    lesson: 'A password policy is the cheapest defence there is; without one, users pick passwords that fall instantly.',
    impact: 'Customer accounts protected by one-character passwords are trivially guessed, exposing profiles and payment methods.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length of 10+ characters and screen against known breached passwords.' } },
  { id: 'reg-mass', feature: F.REG, name: 'Mass Assignment — Free Premium Tier / Role at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /register', how: 'Add extra fields (tier=premium or role=artist) to the registration POST; the server copies them straight onto the new account.',
    hints: ['The registration form only shows name/email/password — but the server accepts more.', 'What happens if you tell the server which tier you would like?', 'POST /register with extra fields tier=premium (or role=artist) and check your new account.'],
    lesson: 'Binding request bodies directly to data models lets clients set fields that should only ever be server-controlled.',
    impact: 'Attackers self-grant premium subscriptions for free, or register as artists/admins and walk into privileged areas.',
    report: { title: 'Mass Assignment Allows Privilege and Tier Escalation at Registration', severity: 'High', remediation: 'Whitelist bindable fields per endpoint; never accept role, tier or balance from the client.' } },
  { id: 'reg-xss', feature: F.REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'POST /register or POST /profile (display name)', how: 'Put an HTML/JS payload in your display name; it is stored and rendered unescaped on profile and playlist pages.',
    hints: ['Your display name is shown on several pages — is it encoded there?', 'Try a name that is also a small piece of HTML.', 'Register with the name <script>alert(1)</script> and view your profile.'],
    lesson: 'Every stored field is future HTML for someone else\u2019s browser; output encoding is what keeps data from becoming code.',
    impact: 'Attackers plant scripts that run for other users and staff — stealing sessions, defacing pages and driving phishing.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user-supplied output and validate input; add a Content-Security-Policy header.' } },
  { id: 'reg-csrf', feature: F.REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /profile', how: 'Submit a profile change without the hx_marker token (as a cross-site form would); the change is applied anyway.',
    hints: ['Legitimate forms carry a hidden hx_marker field — what if it is simply absent?', 'The server never actually verifies the marker.', 'POST /profile with a new name and no hx_marker field; the change still applies.'],
    lesson: 'State-changing requests need an unguessable per-session token the server actually checks.',
    impact: 'A malicious page a victim visits can silently rewrite their profile, email or settings in the background.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Issue per-session anti-CSRF tokens and verify them on every state-changing request.' } },
  { id: 'search-sqli', feature: F.SEARCH, name: 'SQL Injection in Track Search', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    where: 'GET /search?q=', how: 'Inject into the search term so the query returns every track — including the unreleased one that normal search hides.',
    hints: ['Search results are built from your input with string concatenation.', 'An always-true condition makes the catalogue dump everything.', "Search for ' OR '1'='1 and watch the unreleased demo appear."],
    lesson: 'Search boxes are database inputs too; injection there leaks the whole catalogue, not just matches.',
    impact: 'Unreleased tracks, internal catalogue data and pricing can be dumped by anyone — a direct leak of the company\u2019s assets.',
    report: { title: 'SQL Injection in Catalogue Search Leaks Unreleased Content', severity: 'High', remediation: 'Use parameterised queries for search and return only published content by default.' } },
  { id: 'search-xss', feature: F.SEARCH, name: 'Reflected XSS in Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    where: 'GET /search?q=', how: 'Put a script payload in the search term; it is reflected unescaped into the results page heading.',
    hints: ['Your search term is echoed back on the results page.', 'Check whether the echo is encoded — it is not.', 'Search for <script>alert(1)</script> and view the page source.'],
    lesson: 'Reflected input must be encoded on output, every time, even in "harmless" places like headings.',
    impact: 'Crafted links run scripts in victims\u2019 browsers — session theft and convincing phishing hosted on the real site.',
    report: { title: 'Reflected Cross-Site Scripting in Search Results', severity: 'Medium', remediation: 'Encode reflected parameters on output and deploy a Content-Security-Policy.' } },
  { id: 'pl-idor', feature: F.PLAY, name: 'Private Playlist IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /playlist/<id>', how: 'Open another user\u2019s private playlist by guessing its numeric id; ownership is never checked.',
    hints: ['Playlist ids are small sequential numbers.', 'Privacy is a flag in the data — is it enforced?', 'Log in as Bob and open /playlist/1 (Alice\u2019s private mix).'],
    lesson: 'Every object access needs an ownership check; sequential ids without one are an open filing cabinet.',
    impact: 'Private customer data — playlists reveal taste, habits and sometimes identity — is exposed to anyone who can count.',
    report: { title: 'Insecure Direct Object Reference Exposes Private Playlists', severity: 'High', remediation: 'Check object ownership on every request and use unguessable identifiers.' } },
  { id: 'pl-modify', feature: F.PLAY, name: 'Modify Another User\u2019s Playlist', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /playlist/<id>/add', how: 'Add a track to a playlist you do not own; the endpoint never verifies ownership.',
    hints: ['Reading was not the only thing missing a check…', 'The add-track endpoint trusts the playlist id in the URL.', 'As Bob, POST a trackId to /playlist/1/add (Alice\u2019s playlist).'],
    lesson: 'Write endpoints need the same ownership checks as read endpoints — attackers tamper, not just peek.',
    impact: 'Attackers can vandalise or weaponise other customers\u2019 content, destroying trust in the platform.',
    report: { title: 'Missing Ownership Check Allows Tampering With Other Users\u2019 Playlists', severity: 'High', remediation: 'Authorise every mutation against the object owner server-side.' } },
  { id: 'pl-share', feature: F.PLAY, name: 'Predictable Playlist Share Token', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /share/share-<id>', how: 'Share links are just "share-" plus the playlist id; construct the link for a private playlist you were never given.',
    hints: ['Look at the format of a share link for your own playlist.', 'The "secret" token is the playlist id with a prefix.', 'Open /share/share-1 to reach Alice\u2019s private playlist without her link.'],
    lesson: 'A capability URL is only a capability if the token is unguessable; predictable tokens are public URLs.',
    impact: 'Every "shared privately" playlist is effectively public — private customer content leaks at scale.',
    report: { title: 'Predictable Share Tokens Expose Private Playlists', severity: 'Medium', remediation: 'Generate share tokens with a CSPRNG and allow owners to revoke them.' } },
  { id: 'trk-premium', feature: F.TRACK, name: 'Premium Track Streamed by a Free Account', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /stream/<id>', how: 'As a free-tier listener, stream a premium-only track; the stream endpoint never checks your tier.',
    hints: ['The catalogue marks some tracks Premium — is the stream itself gated?', 'The paywall is only a label on the page.', 'Log in as Alice (free) and open /stream/2 (Golden Hour, premium).'],
    lesson: 'Paywalls must be enforced at the resource, not hidden in the UI; anything the server serves, the client can take.',
    impact: 'The entire premium catalogue can be consumed for free — the subscription business model collapses.',
    report: { title: 'Missing Tier Check Allows Free Accounts to Stream Premium Content', severity: 'High', remediation: 'Enforce subscription tier server-side on every stream/download request.' } },
  { id: 'trk-unreleased', feature: F.TRACK, name: 'Unreleased Track Accessible by Direct ID', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /track/<id>', how: 'Open the track page for an unreleased track by its id as an ordinary listener; the release flag is not enforced.',
    hints: ['Search hides unreleased tracks — but hiding is not blocking.', 'Track ids are sequential; one of them is not released yet.', 'As Alice, open /track/3 — the unreleased Secret Demo.'],
    lesson: 'Unpublished content needs the same access control as private content; direct URLs bypass every listing filter.',
    impact: 'Unreleased music leaks before launch — killing premiere deals, marketing plans and artist trust.',
    report: { title: 'Unreleased Content Accessible via Direct Object Reference', severity: 'High', remediation: 'Enforce release status and ownership on every content fetch.' } },
  { id: 'trk-traversal', feature: F.TRACK, name: 'Path Traversal in Track Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'GET /download?file=', how: 'Use ../ sequences in the file parameter to escape the downloads folder and read server files.',
    hints: ['The file parameter is joined to a folder path without cleaning.', 'Classic dot-dot sequences walk up the tree.', 'Request /download?file=../server.js and read the source.'],
    lesson: 'User-controlled file paths must be normalised and confined to an allow-listed directory.',
    impact: 'Attackers read source code, configuration and secrets from the server — often the first step to full compromise.',
    report: { title: 'Directory Traversal in Download Endpoint Exposes Server Files', severity: 'Critical', remediation: 'Normalise paths, enforce a base-directory prefix check and serve files by id, not by name.' } },
  { id: 'trk-token', feature: F.TRACK, name: 'Weak Stream Token — base64(email)', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
    where: 'GET /api/stream/<id>?token=', how: 'The API accepts a "token" that is just the base64 of a user\u2019s email; forge one and stream with no session at all.',
    hints: ['The mobile API uses a token — see if you can figure out its format from your own.', 'It decodes to something you already know.', 'base64-encode bob@test.local and call /api/stream/2?token=<that> with no cookies.'],
    lesson: 'Tokens must be unguessable secrets issued by the server — encoding an identifier is not authentication.',
    impact: 'Anyone can impersonate any user to the API with nothing but their email address.',
    report: { title: 'API Stream Token Is a Guessable Encoding of the User Email', severity: 'High', remediation: 'Issue random, expiring, server-side session/API tokens and verify them on each call.' } },
  { id: 'roy-tamper', feature: F.ROY, name: 'Royalty & Licensing Tampering on Another Artist\u2019s Track', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    where: 'POST /artist/track/<id>/royalty', how: 'As one artist, change the royalty rate and licensing label of a track owned by a different artist; only the artist role is checked, never ownership.',
    hints: ['The artist console checks that you are AN artist — not THE artist.', 'Track ids in the royalty endpoint are not tied to your catalogue.', 'As Echo Park (A2), POST a new rate to /artist/track/1/royalty (Nova\u2019s track).'],
    lesson: 'Role checks are not ownership checks; financial metadata needs object-level authorisation.',
    impact: 'Royalty rates and licensing terms are money — tampering diverts artist income and creates legal liability.',
    report: { title: 'Artists Can Modify Royalty and Licensing Data of Other Artists', severity: 'Critical', remediation: 'Authorise royalty/licensing changes against track ownership and require approval workflows for financial metadata.' } },
  { id: 'roy-idor', feature: F.ROY, name: 'Artist Earnings IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /artist/earnings?artist=<id>', how: 'Ask for another artist\u2019s earnings by changing the artist parameter; the figures are served without an ownership check.',
    hints: ['Your earnings page takes an artist parameter.', 'Try asking for the other artist\u2019s id.', 'As Nova (A1), open /artist/earnings?artist=A2.'],
    lesson: 'Financial figures are sensitive business data; query parameters are not authorisation.',
    impact: 'Competitors and attackers can map exactly what every artist earns — ammunition for poaching and extortion.',
    report: { title: 'Insecure Direct Object Reference Exposes Artist Earnings', severity: 'Medium', remediation: 'Derive the artist identity from the session; never accept it as a client parameter.' } },
  { id: 'bill-price', feature: F.BILL, name: 'Premium Upgrade Price Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'POST /upgrade', how: 'The upgrade form posts an amount the server trusts; submit amount=0 and get Premium for free.',
    hints: ['The price travels from your browser to the server — who verifies it?', 'Edit the amount field before submitting.', 'POST /upgrade with amount=0 and check your tier.'],
    lesson: 'Prices belong on the server; any amount arriving from the client is a claim, not a fact.',
    impact: 'Every customer can self-upgrade for free — direct, immediate revenue loss.',
    report: { title: 'Client-Side Price Tampering Allows Free Premium Upgrades', severity: 'High', remediation: 'Compute prices server-side from the plan catalogue and verify payment with the provider.' } },
  { id: 'bill-promo', feature: F.BILL, name: 'Single-Use Promo Code Can Be Reused', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /upgrade/promo', how: 'Redeem the single-use code HEXAFREE twice; it is never marked as consumed, so it keeps granting Premium.',
    hints: ['A "single-use" code that nobody crosses off the list…', 'Redeem HEXAFREE once — then simply redeem it again.', 'POST /upgrade/promo with code HEXAFREE two times as the same user.'],
    lesson: 'One-time codes must be atomically consumed at redemption; checking existence is not the same as spending.',
    impact: 'One leaked promo code becomes unlimited free Premium for everyone who hears about it.',
    report: { title: 'Single-Use Promotional Code Is Not Consumed on Redemption', severity: 'Medium', remediation: 'Mark codes redeemed in the same transaction that grants the benefit and enforce uniqueness.' } },
  { id: 'adm-bac', feature: F.ADMIN, name: 'Admin User List Open to Any Logged-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    where: 'GET /admin/users', how: 'Open the admin user list as a normal listener; the page only checks that you are logged in, and it prints every password.',
    hints: ['Admin pages are just URLs — try the user list directly.', 'This endpoint checks login, not role.', 'As Alice, open /admin/users.'],
    lesson: 'Every administrative route needs an explicit role check; "logged in" is not "authorised".',
    impact: 'Full customer list with passwords is exposed to any registered user — a complete account database leak.',
    report: { title: 'Broken Access Control Exposes Admin User List With Passwords', severity: 'Critical', remediation: 'Require the admin role for all /admin routes and never display stored passwords.' } },
  { id: 'adm-csrf', feature: F.ADMIN, name: 'CSRF on Admin Track Deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    where: 'POST /admin/track/delete', how: 'As admin, delete a track with a POST that carries no hx_marker token; the destructive action succeeds anyway.',
    hints: ['Destructive admin actions are plain POSTs.', 'The anti-CSRF marker is displayed but never verified here either.', 'POST /admin/track/delete with an id and no marker, using the admin session.'],
    lesson: 'The more destructive the action, the more it needs CSRF protection and confirmation.',
    impact: 'One malicious page in an admin\u2019s browser can delete catalogue content with the admin\u2019s own privileges.',
    report: { title: 'Cross-Site Request Forgery on Administrative Track Deletion', severity: 'High', remediation: 'Verify anti-CSRF tokens on all admin mutations and add confirmation for destructive actions.' } },
  { id: 'plat-debug', feature: F.PLAT, name: 'Unauthenticated /api/debug Data Dump', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    where: 'GET /api/debug', how: 'Fetch the debug endpoint with no session at all; it dumps every user including passwords.',
    hints: ['Developers leave diagnostic endpoints behind…', 'No login is needed for this one.', 'Open /api/debug in a fresh browser with no cookies.'],
    lesson: 'Debug and diagnostic endpoints must never reach production — they bypass every other control at once.',
    impact: 'One URL hands an attacker the entire user database — the worst single leak a service can have.',
    report: { title: 'Unauthenticated Debug Endpoint Dumps Full User Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and gate diagnostics behind admin auth and network restrictions.' } }
];

const _m5 = ["TjZVVA==","LUhEWg=="]; // royalty table fragments (part 2 of 3)

/* ================= progress engine ================= */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (s && typeof s === 'object') state = Object.assign(state, s);
    }
  } catch (e) { /* corrupt state file: start fresh rather than crash */ }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) { /* ignore */ }
}
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
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
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

/* ================= helpers ================= */
const _m2 = ["U1U2MA==","LThXNQ=="]; // catalogue sync fragments (part 2 of 3)

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function xssPayload(v) {
  return /<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img[^>]*onerror|<\s*iframe|javascript:/i.test(String(v || ''));
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
function parseBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
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
          const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
          out[k] = v;
        }
        resolve(out);
      }
    });
    req.on('error', () => resolve({}));
  });
}
function sessionOf(req) {
  const c = parseCookies(req);
  const s = c.hx_sid && sessions.get(c.hx_sid);
  return s ? { sid: c.hx_sid, userId: s.userId, marker: s.marker } : null;
}
function userOf(req) {
  const s = sessionOf(req);
  if (!s) return null;
  return users.find(u => u.id === s.userId) || null;
}
function newSession(res, user) {
  const sid = 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36);
  const marker = 'mk' + Math.floor(Math.random() * 1e12).toString(36);
  sessions.set(sid, { userId: user.id, marker });
  res.setHeader('Set-Cookie', [
    'hx_sid=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',
    'hx_marker=' + marker + '; Path=/'
  ]);
  return sid;
}

/* Tiny evaluator for the string-built login query (the app genuinely builds SQL by concatenation). */
function evalCmp(cmp, row) {
  const m = cmp.match(/^(.+?)\s*=\s*(.+)$/);
  if (!m) return false;
  const val = s => {
    s = s.trim();
    if (/^'.*'$/.test(s)) return s.slice(1, -1);
    if (s in row) return String(row[s]);
    return s;
  };
  return val(m[1]) === val(m[2]);
}
function evalWhere(where, row) {
  const ci = where.indexOf('--');
  if (ci >= 0) where = where.slice(0, ci);
  return where.split(/\s+OR\s+/i).some(g => g.split(/\s+AND\s+/i).every(c => evalCmp(c.trim(), row)));
}
function findUserByQuery(email, password) {
  const where = "email='" + email + "' AND password='" + password + "'";
  return users.find(u => evalWhere(where, u)) || null;
}

/* ================= layout ================= */
function layout(req, title, bodyHtml) {
  const total = TESTS.length, done = doneCount();
  const pct = Math.floor(done / total * 100);
  const user = userOf(req);
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaMusic</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0e0f13;color:#e8e8ec}' +
    'header{background:#171922;padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}' +
    'header img{height:34px}header a{color:#9ecbff;text-decoration:none;margin-right:10px}' +
    '.bar{width:220px;height:10px;background:#333;border-radius:5px;overflow:hidden;display:inline-block;vertical-align:middle}' +
    '.bar i{display:block;height:100%;background:#7c5cff}main{padding:20px;max-width:920px;margin:0 auto}' +
    'input,select,textarea{background:#1d2029;color:#eee;border:1px solid #444;border-radius:6px;padding:7px;margin:3px 0}' +
    'button,.btn{background:#7c5cff;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer;text-decoration:none;display:inline-block}' +
    '.card{background:#171922;border:1px solid #2a2d3a;border-radius:10px;padding:14px;margin:10px 0}' +
    '.muted{color:#9aa}.ok{color:#6f6}.warn{color:#fc6}table{border-collapse:collapse}td,th{border:1px solid #333;padding:5px 9px;text-align:left}' +
    '#chatbox{position:fixed;right:14px;bottom:14px;width:320px;background:#171922;border:1px solid #444;border-radius:10px;padding:10px;z-index:99}' +
    '#chatlog{max-height:180px;overflow:auto;font-size:13px;margin-bottom:6px;white-space:pre-wrap}</style></head><body>' +
    '<header><img src="/logo.png" alt="HexaCyberLab"><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + pct + '% <span class="bar"><i style="width:' + pct + '%"></i></span></span>' +
    '<nav><a href="/">Home</a><a href="/tests">Mission Board</a><a href="/search">Search</a>' +
    (user ? '<a href="/profile">Profile (' + esc(user.email) + ')</a><a href="/artist">Artist Console</a><a href="/upgrade">Upgrade</a><a href="/logout">Logout</a>'
          : '<a href="/login">Login</a><a href="/register">Register</a>') +
    '</nav></header><main>' + bodyHtml + '</main>' +
    '<div id="chatbox"><strong>Lab Coach</strong><div id="chatlog"></div>' +
    '<input id="chatin" placeholder="Ask the coach…" style="width:70%"><button onclick="sendChat()">Send</button></div>' +
    '<script>async function sendChat(){var i=document.getElementById("chatin");var log=document.getElementById("chatlog");' +
    'var msg=i.value;i.value="";log.textContent+="You: "+msg+"\\n";' +
    'var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg})});' +
    'var j=await r.json();log.textContent+="Coach: "+j.reply+"\\n";log.scrollTop=log.scrollHeight;}</script>' +
    '</body></html>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title></head><body style="font-family:system-ui;background:#0e0f13;color:#eee;padding:30px">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:40px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" size="40"><button type="submit">Unlock</button></form>' +
    '<div id="chatbox" style="margin-top:30px;border:1px solid #444;border-radius:10px;padding:10px;max-width:420px"><strong>Lab Coach</strong><div id="chatlog" style="white-space:pre-wrap;font-size:13px"></div>' +
    '<input id="chatin" placeholder="Ask the coach…" style="width:70%"><button onclick="sendChat()">Send</button></div>' +
    '<script>async function sendChat(){var i=document.getElementById("chatin");var log=document.getElementById("chatlog");var msg=i.value;i.value="";log.textContent+="You: "+msg+"\\n";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg})});var j=await r.json();log.textContent+="Coach: "+j.reply+"\\n";}</script>' +
    '</body></html>';
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }

/* ================= chatbot (Lab Coach) ================= */
const _m6 = ["RlNCRA==","V1RUQw=="]; // coach knowledge fragments (part 3 of 3)
function assembleCompletion() {
  const parts = [].concat(_m4, _m5, _m6);
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYWORDS = [
  [F.AUTH, /login|password|auth|reset|brute|enumerat|cookie|sign.?in/i],
  [F.REG, /regist|profile|sign.?up|display name|mass assign/i],
  [F.SEARCH, /search|catalog/i],
  [F.PLAY, /playlist|share/i],
  [F.TRACK, /track|stream|download|premium track|unreleased|traversal|token/i],
  [F.ROY, /royalt|licens|earning|artist/i],
  [F.BILL, /premium|billing|promo|upgrade|price/i],
  [F.ADMIN, /admin|delete/i],
  [F.PLAT, /debug|api|platform/i]
];
function chatReply(message) {
  const msg = String(message || '');
  const low = msg.toLowerCase();
  if (/who (built|made|created)|founder|jony|hassain|hexacyberlab/.test(low)) return ATTRIBUTION;
  if (/key|unlock next|next lab/.test(low)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — here is your completion key: ' + assembleCompletion() + ' Paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — it is only revealed to me when this lab reaches 100%. You are at ' + Math.floor(doneCount() / TESTS.length * 100) + '% right now. Keep solving tests on the Mission Board (/tests).';
  }
  let feature = null;
  for (const [f, re] of FEATURE_KEYWORDS) if (re.test(msg)) { feature = f; break; }
  const stats = featureStats();
  if (/how many|count|list|which (tests|vulnerabilities|features)/.test(low)) {
    if (feature) {
      const names = TESTS.filter(t => t.feature === feature).map(t => (state.tests[t.id] ? '✓ ' : '○ ') + t.name).join('; ');
      return feature + ' has ' + stats[feature].total + ' tests (' + stats[feature].done + ' done): ' + names + '. The map is public — the step-by-step help unlocks after 3 genuine attempts on the feature.';
    }
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + TESTS.length + ' tests: ' +
      Object.keys(stats).map(f => f + ' (' + stats[f].total + ')').join(', ') + '. Progress: ' + doneCount() + '/' + TESTS.length + '.';
  }
  if (/progress|what next|next test|where (do|should) i start|help me start/.test(low) || !feature) {
    if (feature && /how|guide|step|solve|do it|exploit/.test(low)) { /* fall through to how-to below */ }
    else {
      const next = TESTS.find(t => !state.tests[t.id]);
      return 'You have completed ' + doneCount() + ' of ' + TESTS.length + ' tests (' + Math.floor(doneCount() / TESTS.length * 100) + '%).' +
        (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '. Open /tests for hints, or ask me how to solve a feature after 3 genuine attempts on it.' : ' Everything is done — visit /complete for your debrief and certificate.');
    }
  }
  if (feature) {
    const att = state.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !state.tests[t.id]);
    if (att >= 3 || open.length === 0) {
      if (open.length === 0) return 'All ' + feature + ' tests are already complete. Well done.';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.how + ' (' + t.where + ')').join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step. The Mission Board at /tests also has graded hints for every test.';
  }
  return 'I can explain the lab, count tests per feature, and — after 3 genuine attempts on a feature — guide you step by step. Try /tests for the Mission Board and graded hints.';
}

/* ================= routes ================= */
const FAKE_FILES = {
  'track1.mp3': 'FAKE AUDIO DATA — Midnight Circuit (simulated)',
  'track2.mp3': 'FAKE AUDIO DATA — Golden Hour (simulated)',
  'server.js': '// HEXAMUSIC SERVER SOURCE — simulated secret contents: db password = fake_password_123, internal notes.'
};
function resolveDownload(file) {
  const parts = ('downloads/' + String(file || '')).split('/');
  const stack = [];
  for (const p of parts) {
    if (p === '..') stack.pop();
    else if (p && p !== '.') stack.push(p);
  }
  return stack.join('/');
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const method = req.method;
  const cookies = parseCookies(req);

  if (p === '/logo.png') {
    try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); }
    catch (e) { return send(res, 404, 'no logo'); }
  }
  if (p === '/api/progress') {
    return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features: featureStats(), complete: isComplete() }), 'application/json');
  }
  if (p === '/api/chat' && method === 'POST') {
    const b = await parseBody(req);
    return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
  }
  if (p === '/unlock' && method === 'POST') {
    const b = await parseBody(req);
    const given = String(b.key || '');
    const expected = assembleEntry();
    let same = given.length === expected.length;
    for (let i = 0; i < expected.length; i++) if (given[i] !== expected[i]) same = false;
    if (same) { state.unlocked = true; saveState(); return redirect(res, '/'); }
    return send(res, 403, 'Invalid key.');
  }

  if (!state.unlocked) return send(res, 200, gatePage());

  /* ---- home / catalogue ---- */
  if (p === '/' && method === 'GET') {
    const user = userOf(req);
    const rows = tracks.filter(t => t.released).map(t =>
      '<div class="card"><strong>' + esc(t.title) + '</strong> — ' + esc(artists[t.artistId].name) + ' · ' + esc(t.album) +
      (t.premium ? ' · <span class="warn">PREMIUM</span>' : '') +
      ' <a class="btn" href="/track/' + t.id + '">Open</a> <a class="btn" href="/stream/' + t.id + '">Stream</a></div>').join('');
    return send(res, 200, layout(req, 'Home', '<h1>HexaMusic</h1><p class="muted">Stream fake music. All audio is simulated. ' + (user ? 'Signed in as ' + esc(user.name) + ' (' + esc(user.tier) + ' tier).' : 'Sign in to stream.') + '</p>' + rows));
  }

  /* ---- auth ---- */
  if (p === '/login' && method === 'GET') {
    return send(res, 200, layout(req, 'Login',
      '<h1>Login</h1><form method="POST" action="/login"><input name="email" placeholder="Email" size="30"><br>' +
      '<input name="password" type="password" placeholder="Password" size="30"><br><button>Login</button></form>' +
      '<p class="muted">Try our demo account — email: demo@hexamusic.local · password: demo123</p>' +
      '<p><a href="/forgot">Forgot password?</a></p>'));
  }
  if (p === '/login' && method === 'POST') {
    const b = await parseBody(req);
    attempt(F.AUTH);
    const email = String(b.email || ''), password = String(b.password || '');
    const user = findUserByQuery(email, password);
    if (user) {
      const exact = user.email === email && user.password === password;
      if (!exact && (email.includes("'") || password.includes("'"))) pass('auth-sqli');
      if (user.id === 6) pass('auth-demo');
      failCounts.set(email, 0);
      newSession(res, user);
      return redirect(res, '/');
    }
    const n = (failCounts.get(email) || 0) + 1;
    failCounts.set(email, n);
    if (n >= 10) pass('auth-brute');
    const exists = users.some(u => u.email === email);
    return send(res, 200, layout(req, 'Login', '<h1>Login</h1><p class="warn">' + (exists ? 'Incorrect password for that account.' : 'No account found for that email.') + '</p><p><a href="/login">Try again</a></p>'));
  }
  if (p === '/logout') { const s = sessionOf(req); if (s) sessions.delete(s.sid); return redirect(res, '/'); }
  if (p === '/forgot' && method === 'GET') {
    return send(res, 200, layout(req, 'Forgot password', '<h1>Forgot password</h1><form method="POST" action="/forgot"><input name="email" placeholder="Email" size="30"><button>Send reset link</button></form>'));
  }
  if (p === '/forgot' && method === 'POST') {
    const b = await parseBody(req);
    attempt(F.AUTH);
    const email = String(b.email || '');
    forgotProbes.add(email);
    if (forgotProbes.size >= 5) pass('auth-enum');
    const user = users.find(u => u.email === email);
    if (user) {
      issuedTokens.add(email + ':' + resetTokenFor(user));
      return send(res, 200, layout(req, 'Forgot password', '<p class="ok">Reset link sent to ' + esc(email) + '. (In this lab the token is "emailed" — use the Reset form.)</p><p><a href="/reset">Reset form</a></p>'));
    }
    return send(res, 200, layout(req, 'Forgot password', '<p class="warn">No account with that email exists.</p>'));
  }
  if (p === '/reset' && method === 'GET') {
    return send(res, 200, layout(req, 'Reset password', '<h1>Reset password</h1><form method="POST" action="/reset"><input name="email" placeholder="Email" size="30"><br><input name="token" placeholder="Reset token" size="30"><br><input name="newpassword" type="password" placeholder="New password" size="30"><br><button>Reset</button></form>'));
  }
  if (p === '/reset' && method === 'POST') {
    const b = await parseBody(req);
    attempt(F.AUTH);
    const user = users.find(u => u.email === String(b.email || ''));
    if (user && String(b.token || '') === resetTokenFor(user)) {
      if (!issuedTokens.has(user.email + ':' + String(b.token))) pass('auth-reset');
      user.password = String(b.newpassword || 'changed123');
      return send(res, 200, layout(req, 'Reset password', '<p class="ok">Password reset. <a href="/login">Login</a></p>'));
    }
    return send(res, 200, layout(req, 'Reset password', '<p class="warn">Invalid reset token.</p>'));
  }

  /* ---- registration & profile ---- */
  if (p === '/register' && method === 'GET') {
    return send(res, 200, layout(req, 'Register', '<h1>Register</h1><form method="POST" action="/register"><input name="name" placeholder="Display name" size="30"><br><input name="email" placeholder="Email" size="30"><br><input name="password" type="password" placeholder="Password" size="30"><br><button>Create account</button></form>'));
  }
  if (p === '/register' && method === 'POST') {
    const b = await parseBody(req);
    attempt(F.REG);
    const name = String(b.name || 'New Listener');
    const user = { id: nextUserId++, name, email: String(b.email || ''), password: String(b.password || ''), role: 'listener', tier: 'free', artistId: null };
    if (String(b.password || '').length < 4) pass('reg-weakpw');
    if (b.tier === 'premium' || b.role === 'artist' || b.role === 'admin') {
      if (b.tier === 'premium') user.tier = 'premium';
      if (b.role) { user.role = String(b.role); if (user.role === 'artist') user.artistId = 'A2'; }
      pass('reg-mass');
    }
    if (xssPayload(name)) pass('reg-xss');
    users.push(user);
    newSession(res, user);
    return redirect(res, '/profile');
  }
  if (p === '/profile' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const sess = sessionOf(req);
    return send(res, 200, layout(req, 'Profile',
      '<h1>Profile</h1><div class="card"><p>Name: ' + user.name + '</p><p>Email: ' + esc(user.email) + '</p><p>Role: ' + esc(user.role) + ' · Tier: ' + esc(user.tier) + '</p></div>' +
      '<form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="' + sess.marker + '">' +
      '<input name="name" value="' + esc(user.name) + '" size="30"><button>Update display name</button></form>' +
      '<h2>My playlists</h2>' + playlists.filter(pl => pl.ownerId === user.id).map(pl => '<div class="card"><a href="/playlist/' + pl.id + '">' + esc(pl.name) + '</a>' + (pl.private ? ' (private)' : '') + ' · share link: /share/share-' + pl.id + '</div>').join('')));
  }
  if (p === '/profile' && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.REG);
    const sess = sessionOf(req);
    const newName = String(b.name || user.name);
    if (b.hx_marker !== sess.marker && newName !== user.name) pass('reg-csrf');
    if (xssPayload(newName)) pass('reg-xss');
    user.name = newName;
    return redirect(res, '/profile');
  }

  /* ---- search ---- */
  if (p === '/search' && method === 'GET') {
    const q = url.searchParams.get('q') || '';
    let results = [];
    if (q) {
      attempt(F.SEARCH);
      const injected = q.includes("'") || /union/i.test(q);
      if (injected) {
        results = tracks.slice();
        if (results.some(t => !t.released)) pass('search-sqli');
      } else {
        results = tracks.filter(t => t.released && (t.title + ' ' + t.album).toLowerCase().includes(q.toLowerCase()));
      }
      if (xssPayload(q)) pass('search-xss');
    }
    const rows = results.map(t => '<div class="card"><strong>' + esc(t.title) + '</strong> — ' + esc(artists[t.artistId].name) + (t.released ? '' : ' · <span class="warn">UNRELEASED</span>') + ' <a class="btn" href="/track/' + t.id + '">Open</a></div>').join('');
    return send(res, 200, layout(req, 'Search', '<h1>Search</h1><form method="GET" action="/search"><input name="q" size="34" value="' + esc(q) + '"><button>Search</button></form>' +
      (q ? '<p>Results for: ' + q + '</p>' : '') + rows));
  }

  /* ---- tracks & streaming ---- */
  const trackMatch = p.match(/^\/track\/(\d+)$/);
  if (trackMatch && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.TRACK);
    const t = tracks.find(x => x.id === Number(trackMatch[1]));
    if (!t) return send(res, 404, layout(req, 'Not found', '<h1>Track not found</h1>'));
    const isOwner = user.artistId && user.artistId === t.artistId;
    if (!t.released && !isOwner && user.role !== 'admin') pass('trk-unreleased');
    return send(res, 200, layout(req, t.title,
      '<h1>' + esc(t.title) + '</h1><div class="card"><p>Artist: ' + esc(artists[t.artistId].name) + '</p><p>Album: ' + esc(t.album) + '</p>' +
      '<p>Premium: ' + t.premium + ' · Released: ' + t.released + ' · Plays: ' + t.plays + '</p>' +
      '<p>Label: ' + esc(t.label) + ' · Royalty rate: ' + t.royaltyRate + '</p>' +
      '<p><a class="btn" href="/stream/' + t.id + '">Stream</a> <a class="btn" href="/download?file=track' + t.id + '.mp3">Download</a></p></div>'));
  }
  const streamMatch = p.match(/^\/stream\/(\d+)$/);
  if (streamMatch && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.TRACK);
    const t = tracks.find(x => x.id === Number(streamMatch[1]));
    if (!t) return send(res, 404, 'no track');
    if (t.premium && user.tier !== 'premium') pass('trk-premium');
    t.plays++;
    return send(res, 200, 'STREAMING (simulated audio): ' + t.title + ' — full track served to ' + user.email + ' (' + user.tier + ' tier)', 'text/plain');
  }
  const apiStreamMatch = p.match(/^\/api\/stream\/(\d+)$/);
  if (apiStreamMatch && method === 'GET') {
    attempt(F.TRACK);
    const token = url.searchParams.get('token') || '';
    let decoded = '';
    try { decoded = Buffer.from(token, 'base64').toString('utf8'); } catch (e) { decoded = ''; }
    const tokenUser = users.find(u => u.email === decoded);
    const t = tracks.find(x => x.id === Number(apiStreamMatch[1]));
    if (tokenUser && t) {
      if (!userOf(req)) pass('trk-token');
      return send(res, 200, JSON.stringify({ streaming: t.title, via: 'token', as: tokenUser.email }), 'application/json');
    }
    return send(res, 401, JSON.stringify({ error: 'invalid token' }), 'application/json');
  }
  if (p === '/download' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.TRACK);
    const file = url.searchParams.get('file') || '';
    const resolved = resolveDownload(file);
    if (resolved === 'server.js') { pass('trk-traversal'); return send(res, 200, FAKE_FILES['server.js'], 'text/plain'); }
    const key = resolved.replace(/^downloads\//, '');
    if (FAKE_FILES[key] && key.endsWith('.mp3')) return send(res, 200, FAKE_FILES[key], 'text/plain');
    return send(res, 404, 'file not found');
  }

  /* ---- playlists ---- */
  const plMatch = p.match(/^\/playlist\/(\d+)$/);
  if (plMatch && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.PLAY);
    const pl = playlists.find(x => x.id === Number(plMatch[1]));
    if (!pl) return send(res, 404, layout(req, 'Not found', '<h1>Playlist not found</h1>'));
    if (pl.private && pl.ownerId !== user.id) pass('pl-idor');
    return send(res, 200, layout(req, pl.name, playlistHtml(pl, user)));
  }
  const plAddMatch = p.match(/^\/playlist\/(\d+)\/add$/);
  if (plAddMatch && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.PLAY);
    const pl = playlists.find(x => x.id === Number(plAddMatch[1]));
    if (!pl) return send(res, 404, 'no playlist');
    const tid = Number(b.trackId);
    if (tracks.some(t => t.id === tid) && !pl.trackIds.includes(tid)) {
      pl.trackIds.push(tid);
      if (pl.ownerId !== user.id) pass('pl-modify');
    }
    return redirect(res, '/playlist/' + pl.id);
  }
  const shareMatch = p.match(/^\/share\/share-(\d+)$/);
  if (shareMatch && method === 'GET') {
    attempt(F.PLAY);
    const pl = playlists.find(x => x.id === Number(shareMatch[1]));
    if (!pl) return send(res, 404, 'no playlist');
    const user = userOf(req);
    if (pl.private && (!user || pl.ownerId !== user.id)) pass('pl-share');
    return send(res, 200, layout(req, pl.name, playlistHtml(pl, user)));
  }

  /* ---- artists & royalties ---- */
  if (p === '/artist' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    if (user.role !== 'artist') return send(res, 200, layout(req, 'Artist Console', '<h1>Artist Console</h1><p class="warn">This console is for artist accounts.</p>'));
    const mine = tracks.filter(t => t.artistId === user.artistId);
    const rows = mine.map(t => '<div class="card"><strong>' + esc(t.title) + '</strong> · royalty rate: ' + t.royaltyRate + ' · label: ' + esc(t.label) +
      '<form method="POST" action="/artist/track/' + t.id + '/royalty"><input name="rate" value="' + t.royaltyRate + '" size="6"><input name="label" value="' + esc(t.label) + '" size="18"><button>Update royalty / licensing</button></form></div>').join('');
    return send(res, 200, layout(req, 'Artist Console', '<h1>Artist Console — ' + esc(artists[user.artistId].name) + '</h1>' + rows +
      '<p><a class="btn" href="/artist/earnings?artist=' + user.artistId + '">My earnings</a></p>'));
  }
  const royMatch = p.match(/^\/artist\/track\/(\d+)\/royalty$/);
  if (royMatch && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.ROY);
    const t = tracks.find(x => x.id === Number(royMatch[1]));
    if (!t) return send(res, 404, 'no track');
    if (user.role !== 'artist') return send(res, 403, 'artists only');
    const newRate = parseFloat(b.rate);
    if (!isNaN(newRate)) t.royaltyRate = newRate;
    if (b.label) t.label = String(b.label);
    if (t.artistId !== user.artistId) pass('roy-tamper');
    return redirect(res, '/artist');
  }
  if (p === '/artist/earnings' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.ROY);
    const aId = url.searchParams.get('artist') || user.artistId;
    const a = artists[aId];
    if (!a) return send(res, 404, 'no artist');
    if (user.artistId !== aId) pass('roy-idor');
    return send(res, 200, layout(req, 'Earnings', '<h1>Earnings — ' + esc(a.name) + '</h1><div class="card"><p>Total earnings: $' + a.earnings + '</p><p>Royalty statements and payout history (simulated).</p></div>'));
  }

  /* ---- premium & billing ---- */
  if (p === '/upgrade' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    return send(res, 200, layout(req, 'Upgrade',
      '<h1>Go Premium — $' + PREMIUM_PRICE + '/month</h1>' +
      '<form method="POST" action="/upgrade"><input name="plan" value="premium" type="hidden">' +
      '<label>Amount: <input name="amount" value="' + PREMIUM_PRICE + '"></label><button>Pay &amp; upgrade</button></form>' +
      '<h2>Have a promo code?</h2><form method="POST" action="/upgrade/promo"><input name="code" placeholder="Promo code"><button>Redeem</button></form>'));
  }
  if (p === '/upgrade' && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.BILL);
    const amount = parseFloat(b.amount);
    if (!isNaN(amount) && amount < PREMIUM_PRICE) pass('bill-price');
    user.tier = 'premium';
    return send(res, 200, layout(req, 'Upgrade', '<p class="ok">You are now Premium. Enjoy!</p>'));
  }
  if (p === '/upgrade/promo' && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.BILL);
    if (String(b.code || '') === PROMO_CODE) {
      const n = (promoRedeemed.get(user.id) || 0) + 1;
      promoRedeemed.set(user.id, n);
      if (n >= 2) pass('bill-promo');
      user.tier = 'premium';
      return send(res, 200, layout(req, 'Upgrade', '<p class="ok">Promo applied — you are now Premium.</p>'));
    }
    return send(res, 200, layout(req, 'Upgrade', '<p class="warn">Invalid promo code.</p>'));
  }

  /* ---- admin ---- */
  if (p === '/admin' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.ADMIN);
    if (cookies.hx_role !== 'admin') return send(res, 403, layout(req, 'Admin', '<h1>Admin</h1><p class="warn">Admins only.</p>'));
    if (user.role !== 'admin') pass('auth-cookie');
    const rows = tracks.map(t => '<div class="card">' + esc(t.title) + ' <form method="POST" action="/admin/track/delete" style="display:inline"><input type="hidden" name="id" value="' + t.id + '"><button>Delete track</button></form></div>').join('');
    return send(res, 200, layout(req, 'Admin', '<h1>Admin Panel</h1><p><a href="/admin/users">User list</a></p>' + rows));
  }
  if (p === '/admin/users' && method === 'GET') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    attempt(F.ADMIN);
    if (user.role !== 'admin') pass('adm-bac');
    const rows = users.map(u => '<tr><td>' + u.id + '</td><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.password) + '</td><td>' + esc(u.role) + '/' + esc(u.tier) + '</td></tr>').join('');
    return send(res, 200, layout(req, 'Admin users', '<h1>All users</h1><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role/Tier</th></tr>' + rows + '</table>'));
  }
  if (p === '/admin/track/delete' && method === 'POST') {
    const user = userOf(req);
    if (!user) return redirect(res, '/login');
    const b = await parseBody(req);
    attempt(F.ADMIN);
    if (cookies.hx_role !== 'admin') return send(res, 403, 'admins only');
    const sess = sessionOf(req);
    const idx = tracks.findIndex(t => t.id === Number(b.id));
    if (idx >= 0) {
      tracks.splice(idx, 1);
      if (!b.hx_marker || b.hx_marker !== sess.marker) pass('adm-csrf');
    }
    return redirect(res, '/admin');
  }

  /* ---- platform ---- */
  if (p === '/api/debug' && method === 'GET') {
    attempt(F.PLAT);
    pass('plat-debug');
    return send(res, 200, JSON.stringify({ users, tracks: tracks.length, playlists: playlists.length, note: 'debug dump' }), 'application/json');
  }

  /* ---- mission board ---- */
  if (p === '/tests' && method === 'GET') {
    const stats = featureStats();
    let html = '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + doneCount() + '/' + TESTS.length + ' tests complete.</p>';
    for (const f of Object.keys(stats)) {
      html += '<h2>' + esc(f) + ' <span class="muted">(' + stats[f].done + '/' + stats[f].total + ' · attempts: ' + stats[f].attempts + ')</span></h2>';
      for (const t of TESTS.filter(x => x.feature === f)) {
        html += '<div class="card"><strong>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</strong> · ' + esc(t.owasp) + ' · ' + esc(t.difficulty) +
          '<details><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
      }
    }
    return send(res, 200, layout(req, 'Mission Board', html));
  }

  /* ---- completion ---- */
  if (p === '/complete' && method === 'GET') {
    if (!isComplete()) {
      const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
      return send(res, 200, layout(req, 'Complete', '<h1>Not yet complete</h1><p>Progress: ' + doneCount() + '/' + TESTS.length + ' (' + Math.floor(doneCount() / TESTS.length * 100) + '%). Still open:</p><ul>' + left + '</ul>'));
    }
    const stats = featureStats();
    const feats = Object.keys(stats);
    let html = '<h1>Lab Complete — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1>';
    html += '<h2>1) Features in this lab</h2><p>' + feats.length + ' features.</p>';
    html += '<h2>2) Vulnerabilities per feature</h2><ul>' + feats.map(f => '<li>' + esc(f) + ': ' + stats[f].total + '</li>').join('') + '</ul>';
    html += '<h2>3) Ways testing was done</h2><p>' + TESTS.length + ' techniques completed:</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
    html += '<h2>4) What you learned</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
    html += '<h2>5) What this means for a real client</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('') + '</ul>';
    html += '<h2>6) Writing it in a real report</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
    html += '<h2>Your completion key</h2><div class="card"><code>' + assembleCompletion() + '</code><p class="muted">Paste this key into Lab ' + (LAB_NUMBER + 1) + ' to unlock it.</p></div>';
    html += '<form method="POST" action="/complete/name"><input name="name" placeholder="Your name for the certificate" value="' + esc(state.testerName) + '"><button>Save name</button></form>';
    html += '<p><a class="btn" href="/certificate">View certificate</a></p>';
    return send(res, 200, layout(req, 'Complete', html));
  }
  if (p === '/complete/name' && method === 'POST') {
    const b = await parseBody(req);
    state.testerName = String(b.name || '').slice(0, 80);
    saveState();
    return redirect(res, '/complete');
  }
  if (p === '/certificate' && method === 'GET') {
    if (!isComplete()) return redirect(res, '/complete');
    const user = userOf(req);
    const name = state.testerName || (user ? user.name.replace(/<[^>]*>/g, '') : 'Tester');
    const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
    const feats = Object.keys(featureStats()).length;
    const card = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>body{font-family:Georgia,serif;background:#fff;color:#111;display:flex;justify-content:center;padding:40px}.card{border:3px double #7c5cff;padding:40px;max-width:640px;text-align:center}img{height:60px}@media print{body{padding:0}}</style></head><body><div class="card">' +
      '<img src="/logo.png" alt="HexaCyberLab"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>' +
      '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + TESTS.length + ' tests across ' + feats + ' features)</p>' +
      '<p>' + esc(date) + '</p><p><strong>HexaCyberLab — Built by Md. Jony Hassain, Founder</strong></p></div></body></html>';
    return send(res, 200, card);
  }

  return send(res, 404, layout(req, 'Not found', '<h1>404 — page not found</h1>'));
}

function playlistHtml(pl, user) {
  const owner = users.find(u => u.id === pl.ownerId);
  const items = pl.trackIds.map(id => { const t = tracks.find(x => x.id === id); return t ? '<li>' + esc(t.title) + '</li>' : ''; }).join('');
  const addForm = user ? '<form method="POST" action="/playlist/' + pl.id + '/add"><input name="trackId" placeholder="Track ID" size="8"><button>Add track</button></form>' : '';
  return '<h1>' + esc(pl.name) + '</h1><p class="muted">Owner: ' + (owner ? esc(owner.email) : '?') + (pl.private ? ' · private' : ' · public') + '</p><ul>' + items + '</ul>' + addForm;
}

const _m3 = ["M0EyWQ==","N1hTNA=="]; // catalogue sync fragments (part 3 of 3)
function assembleEntry() {
  const parts = [].concat(_m1, _m2, _m3);
  return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}

/* ================= docs generation (from the TESTS registry) ================= */
function genDocs() {
  const feats = {};
  for (const t of TESTS) { feats[t.feature] = feats[t.feature] || []; feats[t.feature].push(t); }
  let vuln = '# HexaMusic (LAB 86) — Vulnerability Map\n\nThe complete map of this lab: every scored test, grouped by feature. Progress is earned only by actually exploiting each flaw — the server detects the real effect.\n';
  for (const f of Object.keys(feats)) {
    vuln += '\n## ' + f + ' (' + feats[f].length + ')\n';
    for (const t of feats[f]) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.where + '\n- Exploitation outline: ' + t.how + '\n- Impact: ' + t.impact + '\n';
  }
  let guide = '# HexaMusic (LAB 86) — Practice Guide\n\nChallenges grouped by feature, each with graded hints and a measurable objective: make the test flip to done on the Mission Board (/tests).\n';
  for (const f of Object.keys(feats)) {
    guide += '\n## ' + f + '\n';
    for (const t of feats[f]) guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: exploit "' + t.name + '" (' + t.where + ') until it shows done on /tests.\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
  }
  let fix = '# HexaMusic (LAB 86) — Fix & Retest Guide\n\nFor every test: the secure implementation and the retest that proves the fix.\n';
  for (const f of Object.keys(feats)) {
    fix += '\n## ' + f + '\n';
    for (const t of feats[f]) fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- Secure implementation / remediation: ' + t.report.remediation + '\n- Retest: repeat the original exploit (' + t.how + ') — it must now fail, and the test condition must be impossible to trigger.\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated:', TESTS.length, 'tests');
}

/* ================= start ================= */
loadState();
if (process.argv.includes('--gen-docs')) {
  genDocs();
} else {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => { try { send(res, 500, 'internal error'); } catch (e) { /* socket gone */ } });
  });
  server.listen(PORT, HOST, () => console.log('LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' listening on http://' + HOST + ':' + PORT));
}
