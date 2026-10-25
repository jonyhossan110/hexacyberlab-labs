'use strict';
/*
 * HexaForum — LAB 82 (Category 9: Media, Social & Community)
 * A deliberately vulnerable discussion-forum practice lab.
 * Zero-dependency Node.js. LOCAL USE ONLY — never deploy publicly.
 * Business: boards/categories, threads, posts, roles (member/moderator/admin),
 * moderation actions, private boards, reputation points, private messages.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const LAB_NAME = 'HexaForum';
const LAB_NUMBER = 82;
const PORT = 3091;
const ROOT = __dirname;
const PROGRESS_FILE = path.join(ROOT, 'progress.json');
const LOGO_FILE = path.join(ROOT, 'logo.png');

// --- key shard region A (entry key, first half) ---


// ---------------------------------------------------------------------------
// Seed data (all fake, in-memory)
// ---------------------------------------------------------------------------
let nextUserId = 6, nextThreadId = 7, nextPostId = 9, nextPmId = 5;
const DB = {
  users: [
    { id: 1, email: 'admin@hexaforum.local', name: 'Forum Admin', password: 'Adm1n!Hexa82', role: 'admin', rep: 500, banned: false, bio: 'Site administrator.' },
    { id: 2, email: 'alice@hexaforum.local', name: 'Alice', password: 'alice123', role: 'member', rep: 42, banned: false, bio: 'Long-time member.' },
    { id: 3, email: 'bob@hexaforum.local', name: 'Bob', password: 'bob123', role: 'member', rep: 17, banned: false, bio: 'Loves hot threads.' },
    { id: 4, email: 'mod@hexaforum.local', name: 'Demo Moderator', password: 'mod123', role: 'moderator', rep: 120, banned: false, bio: 'Demo moderation account.' },
    { id: 5, email: 'carol@hexaforum.local', name: 'Carol', password: 'carol123', role: 'member', rep: 8, banned: false, bio: 'New here.' }
  ],
  boards: [
    { id: 1, name: 'General Discussion', desc: 'Talk about anything.', private: false },
    { id: 2, name: 'Announcements', desc: 'Official news from the team.', private: false },
    { id: 3, name: 'Staff Lounge', desc: 'Moderators and admins only.', private: true }
  ],
  threads: [
    { id: 1, boardId: 1, authorId: 2, title: 'Welcome to HexaForum!', hidden: false, locked: false, pinned: false },
    { id: 2, boardId: 1, authorId: 3, title: 'Best mechanical keyboards?', hidden: false, locked: false, pinned: false },
    { id: 3, boardId: 2, authorId: 1, title: 'Scheduled maintenance this weekend', hidden: false, locked: false, pinned: false },
    { id: 4, boardId: 3, authorId: 1, title: 'STAFF ONLY: ban list review and spam wave plan', hidden: false, locked: false, pinned: false },
    { id: 5, boardId: 3, authorId: 4, title: 'STAFF ONLY: suspected alt accounts', hidden: false, locked: false, pinned: false },
    { id: 6, boardId: 1, authorId: 3, title: 'REMOVED: leaked password dump thread', hidden: true, locked: false, pinned: false }
  ],
  posts: [
    { id: 1, threadId: 1, authorId: 2, body: 'Hello everyone, glad to be here!' },
    { id: 2, threadId: 1, authorId: 3, body: 'Welcome Alice!' },
    { id: 3, threadId: 2, authorId: 3, body: 'I swear by tactile switches. Fight me.' },
    { id: 4, threadId: 3, authorId: 1, body: 'We will be down Sunday 02:00-03:00 UTC.' },
    { id: 5, threadId: 4, authorId: 1, body: 'Internal note: we banned 14 spam accounts this week. Do not share outside staff.' },
    { id: 6, threadId: 5, authorId: 4, body: 'Internal: bob-alt-2 looks like a duplicate of a banned user.' },
    { id: 7, threadId: 6, authorId: 3, body: 'This thread was removed by the moderators.' },
    { id: 8, threadId: 2, authorId: 2, body: 'Linear switches are smoother, honestly.' }
  ],
  pms: [
    { id: 1, fromId: 2, toId: 3, body: 'Hi Bob, can you share the meetup address?' },
    { id: 2, fromId: 3, toId: 2, body: 'Sure — sending it tonight, keep it between us.' },
    { id: 3, fromId: 1, toId: 4, body: 'Staff note: watch the keyboard thread, it is heating up.' },
    { id: 4, fromId: 5, toId: 2, body: 'Alice, my private note: my backup email is carol-backup@example.com' }
  ],
  issuedTokens: {},      // email -> token actually issued via /forgot
  failedLogins: {},      // email -> count
  enumProbes: {},        // ip -> Set of emails probed with differential responses
  voteCounts: {}         // "userId:postId" -> count
};
const sessions = new Map(); // sid -> userId
let sidSeq = 1000;

// ---------------------------------------------------------------------------
// TESTS registry — the heart of the lab system
// ---------------------------------------------------------------------------
const TESTS = [
{ id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
  hints: ['The login form builds its database query by gluing your input straight into the SQL string.', "Try a classic tautology in the email field, e.g. something that makes the WHERE clause always true.", "Use admin@hexaforum.local' OR '1'='1 as the email with any password — the query matches the first user (the admin) and logs you in as them."],
  lesson: 'String-built SQL queries let an attacker rewrite the login logic itself and become the first matching account — usually the admin.',
  impact: 'On a real forum this hands an attacker the admin account in seconds: full control of members, private boards and private messages.',
  report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
{ id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
  hints: ['Nothing slows you down when a password guess fails.', 'Write down one account email and just keep guessing passwords.', 'Submit 10+ wrong passwords for alice@hexaforum.local — every attempt is still processed, with no lockout, delay or CAPTCHA.'],
  lesson: 'Without throttling, lockout or MFA, an attacker can try unlimited passwords against any account until one works.',
  impact: 'Members with weak passwords get taken over silently; a hijacked moderator account can then be used to attack the whole community.',
  report: { title: 'Missing Brute-Force Protection on Login (No Rate Limiting or Lockout)', severity: 'High', remediation: 'Rate-limit login attempts per account and IP, add progressive delays / lockout and offer MFA.' } },
{ id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
  hints: ['Compare the error message for an email that exists with one that does not.', 'The forgot-password form answers differently too.', 'Probe at least 5 different emails across /login and /forgot and diff the responses — "No account found" vs "Incorrect password" tells you exactly which emails are registered.'],
  lesson: 'Different error messages for "no such user" and "wrong password" turn the login form into a free member-directory lookup.',
  impact: 'Attackers first harvest a list of valid member emails, then aim password spraying and phishing precisely at real accounts.',
  report: { title: 'User Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message ("Invalid email or password") for every failed login and reset request.' } },
{ id: 'auth-default', feature: 'Login & Authentication', name: 'Published Demo Moderator Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
  hints: ['The login page itself is generous with information.', 'Scroll the login page — a demo account is advertised to every visitor.', 'Log in with the published demo moderator credentials shown on the login page (mod@hexaforum.local) — a privileged account protected only by a password everyone can read.'],
  lesson: 'Demo and default accounts on production systems are real accounts — if their credentials are public, so is the access they grant.',
  impact: 'Anyone on the internet can sign in as a moderator: read the staff board, private messages metadata and abuse moderation powers.',
  report: { title: 'Demo Moderator Account with Publicly Published Credentials', severity: 'High', remediation: 'Remove demo/default accounts from production, or force a unique strong password and disable them after onboarding.' } },
{ id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
  hints: ['Request a reset for your own account and study the token format.', 'The token seems to be built from something you already know about the user.', 'Tokens look like HF<id>-<id x 137 + 42>. Bob is user 3, so compute HF3-453 and POST it to /reset without ever requesting a reset for Bob — then log in with your new password.'],
  lesson: 'Reset tokens must be unguessable random secrets; a token derived from a public user id is just a password-change form for attackers.',
  impact: 'Any member account — including staff — can be taken over by anyone who knows the victim\'s user id, which the forum displays everywhere.',
  report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (at least 128 bits), expire them quickly and invalidate after use.' } },
{ id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into the Moderation Console', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['The /mod console decides who is staff by reading something your browser sends.', 'Inspect your cookies — one of them sounds like a job title.', 'As a plain member, set the cookie hx_role=moderator (or admin) and visit /mod — the console trusts the client-supplied cookie instead of the server-side account role.'],
  lesson: 'Authorization data must live server-side. A role stored in a client cookie is a role the client can simply rewrite.',
  impact: 'Every registered member can promote themselves to moderator and read staff-only areas and wield moderation tools.',
  report: { title: 'Client-Side Role Cookie Trusted for Authorization (Privilege Escalation)', severity: 'High', remediation: 'Store roles server-side in the session record; never trust client-supplied role claims.' } },
{ id: 'reg-weakpw', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
  hints: ['Try registering with the shortest password the form will take.', 'There is no minimum length or complexity check at all.', 'Register a new account with a 1-character password — it is accepted immediately.'],
  lesson: 'A password policy is the cheapest defence a site owns; accepting 1-character passwords makes every account brute-forceable.',
  impact: 'Client members pick trivial passwords, and combined with no rate limiting their accounts fall in bulk.',
  report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and block known-breached passwords.' } },
{ id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Reputation at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['The registration handler binds more form fields than the form shows.', 'What fields does a user record have? role, rep... what if you just POST them?', 'Add role=moderator and reputation=9999 to the /register POST — the new account is created as a moderator with 9,999 reputation.'],
  lesson: 'Binding a whole request body onto a database record lets attackers set fields the UI never offered — roles, balances, reputation.',
  impact: 'Attackers mint their own moderator accounts and maxed-out reputation, destroying trust in the forum\'s ranking and moderation.',
  report: { title: 'Mass Assignment in Registration Allows Privilege and Reputation Forgery', severity: 'High', remediation: 'Whitelist the exact fields a request may set (email, name, password) and assign role/reputation server-side.' } },
{ id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
  hints: ['Your display name is printed on member lists and admin pages — exactly as you typed it.', 'What happens if your "name" is actually HTML?', 'Register (or rename yourself) with a display name like <script>alert(1)</script> or <img src=x onerror=alert(1)> — it is stored and rendered raw to everyone, including admins.'],
  lesson: 'Any user-controlled field that is rendered without output encoding becomes a stored XSS delivery vehicle.',
  impact: 'An attacker\'s script runs in the browsers of members and admins who view the member list — session theft and admin actions follow.',
  report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Contextually encode all user output and add a Content-Security-Policy as defence in depth.' } },
{ id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['Your profile update form has no anti-CSRF token.', 'The app sets a benign hx_origin marker cookie on its own pages — a genuine browser request carries it, a forged cross-site one does not.', 'POST to /profile/update with only your session cookie and NO hx_origin marker (e.g. from a raw curl request) — the name change is accepted, proving a malicious site could do the same to a logged-in victim.'],
  lesson: 'State-changing forms without CSRF tokens can be submitted by any website the victim visits while logged in.',
  impact: 'A booby-trapped page silently renames members or swaps their details — combined with stored XSS fields this becomes account-level sabotage.',
  report: { title: 'Missing CSRF Protection on Profile Update', severity: 'Medium', remediation: 'Require a per-session CSRF token on every state-changing form and verify Origin/Referer.' } },
{ id: 'board-private', feature: 'Boards & Threads', name: 'Private Staff Board Readable by Any Member', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
  hints: ['Boards have ids. One of them is labelled staff-only.', 'The board page checks that you are logged in — nothing more.', 'As a plain member, open /board/3 (Staff Lounge) directly — internal threads about ban lists and alt accounts are served to you.'],
  lesson: 'Hiding a link in the UI is not access control; every object must check the requester\'s role server-side.',
  impact: 'Internal staff discussions — ban plans, suspected users, moderation strategy — leak to the very members being discussed.',
  report: { title: 'Broken Access Control on Private Board (Staff Lounge)', severity: 'High', remediation: 'Enforce role checks on the server for every board, thread and post read.' } },
{ id: 'thread-hidden', feature: 'Boards & Threads', name: 'Hidden (Removed) Thread Still Readable by Direct URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
  hints: ['Moderators "removed" a thread about a leaked password dump. Removed from the listing — but is it gone?', 'Thread ids are sequential. The removed one sits between the visible ones.', 'Open /thread/6 directly as a member — the hidden thread is still fully served; only the listing hides it.'],
  lesson: 'Soft-deleting by hiding from listings leaves the content one guessed URL away from anyone.',
  impact: 'Content moderators removed for safety (leaks, abuse, legal risk) stays publicly reachable, defeating the moderation action entirely.',
  report: { title: 'Hidden Threads Accessible via Direct URL (Insecure Direct Object Reference)', severity: 'Medium', remediation: 'Check the hidden/moderation state and the requester\'s role on every thread read.' } },
{ id: 'thread-edit-idor', feature: 'Boards & Threads', name: 'Edit Another User\'s Post (Post IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['The edit form only appears on your own posts. The endpoint behind it is less picky.', 'Post ids are sequential — note one that belongs to Bob.', 'POST to /post/3/edit as Alice with a new body — Bob\'s post is rewritten, because the endpoint never checks authorship.'],
  lesson: 'Every object-mutating endpoint must verify that the session user owns (or may moderate) that exact object.',
  impact: 'Members can rewrite or deface anyone\'s posts, plant malicious content under trusted names and rewrite history in disputes.',
  report: { title: 'Insecure Direct Object Reference Allows Editing Other Users\' Posts', severity: 'High', remediation: 'Verify ownership (or a moderation role) on the server before applying any edit.' } },
{ id: 'thread-storedxss', feature: 'Boards & Threads', name: 'Stored XSS in Post Body', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
  hints: ['Post bodies are printed back to every reader of the thread.', 'Try posting something that is more than text.', 'Reply in any thread with a body containing <script>alert(1)</script> or an <img onerror> payload — it is stored and served raw to every reader.'],
  lesson: 'Forum posts are the classic stored-XSS carrier: one post executes in the browser of everyone who opens the thread.',
  impact: 'A single malicious reply can steal session cookies of hundreds of members — and of any moderator who opens the thread to review it.',
  report: { title: 'Stored Cross-Site Scripting in Forum Posts', severity: 'High', remediation: 'Encode post bodies on output (or sanitise with a strict allowlist) and deploy a Content-Security-Policy.' } },
{ id: 'search-sqli', feature: 'Search', name: 'SQL Injection in Forum Search Leaks Private Threads', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
  hints: ['Normal search politely hides the private board and removed threads.', 'The search box feeds the same string-built query style as the login form.', "Search for ' OR '1'='1 — the tautology makes the query match everything, including Staff Lounge and hidden threads that normal search never shows."],
  lesson: 'Injection in search is doubly dangerous: it bypasses both the query logic and the visibility rules layered on top of it.',
  impact: 'Private staff threads and moderator-removed content become searchable by any member — confidentiality and moderation both fail at once.',
  report: { title: 'SQL Injection in Search Exposes Private and Hidden Threads', severity: 'High', remediation: 'Parameterise the search query and apply board-visibility filters in the data layer, not the presentation layer.' } },
{ id: 'search-xss', feature: 'Search', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
  hints: ['The results page politely repeats what you searched for.', 'It repeats it without encoding it.', 'Search for <script>alert(1)</script> — the payload is reflected raw into the results page heading.'],
  lesson: 'Reflected input is still user input: echoing a query into HTML without encoding executes attacker script in the victim\'s browser.',
  impact: 'A crafted search link sent to a member or moderator runs script in their session when clicked — a reliable phishing-to-takeover bridge.',
  report: { title: 'Reflected Cross-Site Scripting via Search Query', severity: 'Medium', remediation: 'HTML-encode all reflected values and validate search input.' } },
{ id: 'rep-self', feature: 'Reputation & Voting', name: 'Self-Upvoting Your Own Posts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
  hints: ['The vote button politely disappears on your own posts. The endpoint does not check.', 'Find one of your own post ids.', 'POST to /post/<your post id>/vote with value=1 as its author — your reputation increases.'],
  lesson: 'Business rules ("you cannot vote for yourself") must be enforced server-side; hiding the button is not enforcement.',
  impact: 'Members inflate their own reputation at will, corrupting the trust ranking the community and its moderators rely on.',
  report: { title: 'Missing Server-Side Check Allows Self-Voting', severity: 'Low', remediation: 'Reject votes where voter == author on the server.' } },
{ id: 'rep-amount', feature: 'Reputation & Voting', name: 'Vote Amount Tampering (Arbitrary Reputation)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['A vote is worth 1 point. That number travels in your request.', 'What if the request asks for more?', 'POST a vote with value=999 — the author\'s reputation jumps by 999. The server trusts the client-supplied amount completely.'],
  lesson: 'Scores, prices and amounts must be computed server-side; any number a client supplies is a number the client controls.',
  impact: 'Reputation — the forum\'s trust currency — becomes worthless: anyone can crown themselves (or nuke a rival with a negative amount).',
  report: { title: 'Client-Supplied Vote Value Trusted (Reputation Tampering)', severity: 'Medium', remediation: 'Fix vote weight server-side (±1) and ignore any client-sent amount.' } },
{ id: 'rep-repeat', feature: 'Reputation & Voting', name: 'Repeat Voting on the Same Post', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
  hints: ['Nothing remembers that you already voted.', 'Just press the same endpoint again.', 'Vote on the same post two or more times — every request adds reputation again; there is no one-vote-per-user record.'],
  lesson: 'One-action-per-user invariants need a server-side record; without one, idempotency is whatever the client feels like.',
  impact: 'Small groups can brigade any member to the top (or bottom) of the reputation ladder with a simple repeat-request script.',
  report: { title: 'Missing One-Vote-Per-User Enforcement Allows Vote Stuffing', severity: 'Medium', remediation: 'Store votes uniquely per (user, post) and reject duplicates.' } },
{ id: 'pm-idor', feature: 'Private Messages', name: 'Read Another User\'s Private Message (PM IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
  hints: ['Private messages have sequential ids in their URLs.', 'The reader page never asks whether you are the sender or the recipient.', 'As Alice, open /pm/4 — Carol\'s private message (including her backup email) is served to you.'],
  lesson: '"Private" is an authorization property, not a URL pattern: every object read must check participation/ownership.',
  impact: 'Every private conversation on the forum — personal details, contact info, staff notes — is readable by every member.',
  report: { title: 'Insecure Direct Object Reference Exposes Private Messages', severity: 'High', remediation: 'Allow PM reads only when the session user is the sender or the recipient.' } },
{ id: 'pm-spoof', feature: 'Private Messages', name: 'Send a PM Spoofed as Another User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['The send form decides who the message is "from". So does the request body, apparently.', 'What extra field might the handler trust?', 'POST to /pm/send with a from field naming another user (e.g. the admin\'s id or email) — the message is stored and delivered as if they sent it.'],
  lesson: 'Identity of the actor must come from the authenticated session, never from request parameters.',
  impact: 'Members can impersonate the admin in private messages — the perfect channel for scamming other members ("send me your password to verify your account").',
  report: { title: 'Sender Spoofing in Private Messages via Client-Supplied From Field', severity: 'High', remediation: 'Derive the sender exclusively from the server-side session.' } },
{ id: 'mod-bac', feature: 'Moderation & Admin', name: 'Member Performs Moderation Action (Pin Thread)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['Pinning a thread is a moderator action. The button is hidden from members.', 'The endpoint behind the button does not ask who you are.', 'As a plain member, POST to /thread/<id>/pin — the thread is pinned. No role check exists on the server.'],
  lesson: 'Every privileged action endpoint must authorize the caller itself; UI hiding is decoration, not security.',
  impact: 'Any member can pin, promote or manipulate threads — vandalising the forum\'s front page and undermining the moderation team.',
  report: { title: 'Missing Authorization on Moderation Action (Pin Thread)', severity: 'Medium', remediation: 'Require a moderator/admin role server-side for all moderation endpoints.' } },
{ id: 'mod-csrf', feature: 'Moderation & Admin', name: 'CSRF on Admin User-Ban Action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
  hints: ['Banning a user is a single POST with no anti-CSRF token.', 'The app\'s own pages carry the hx_origin marker cookie; a forged cross-site request would not.', 'As the admin, POST to /admin/ban with only the session cookie and NO hx_origin marker — the ban is applied, proving any site the admin visits could ban users through their browser.'],
  lesson: 'Privileged actions without CSRF tokens turn the admin\'s browser into an attacker-controlled remote control.',
  impact: 'A malicious link or page visited by the admin can ban members (or worse) with the admin\'s own authority — no password needed.',
  report: { title: 'Missing CSRF Protection on Administrative Ban Action', severity: 'Medium', remediation: 'Add per-session CSRF tokens to all administrative forms and verify request origin.' } },
{ id: 'admin-bac', feature: 'Moderation & Admin', name: 'Admin Panel Open to Any Logged-In Member', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
  hints: ['The /admin URL is easy to guess. Guessing is all it takes.', 'The panel checks that *someone* is logged in. Anyone.', 'Log in as a plain member and open /admin — the full user list, including passwords and roles, is served.'],
  lesson: 'An admin route must verify an admin role on every request; "logged in" and "is staff" are very different checks.',
  impact: 'Every member can read all credentials and account data — total compromise of the community from a single ordinary account.',
  report: { title: 'Broken Access Control on Admin Panel Exposes All User Credentials', severity: 'Critical', remediation: 'Enforce admin-role authorization server-side on every admin route; never render password data.' } },
{ id: 'api-token', feature: 'Platform & API', name: 'API Token Is Just Base64 of Your Email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
  hints: ['The JSON API authenticates with an X-Api-Token header. Its format is embarrassingly guessable.', 'Take a member\'s email address. Encode it. That is the whole attack.', 'Send GET /api/mydata with header X-Api-Token set to base64(victim email) and no session cookie — the API returns that user\'s data.'],
  lesson: 'A token that is a reversible encoding of a public identifier is not a credential — it is a label anyone can print.',
  impact: 'Anyone who knows (or guesses) a member\'s email gets full API access to their data without ever knowing a password.',
  report: { title: 'Weak API Authentication — Token Derived from Public Email', severity: 'High', remediation: 'Issue random, secret API tokens per user, store them hashed and allow revocation.' } },
{ id: 'api-debug', feature: 'Platform & API', name: 'Unauthenticated Debug Endpoint Dumps All Users', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
  hints: ['Developers love leaving diagnostic endpoints behind.', 'Try the obvious debugging path on the API.', 'Open /api/debug with no login at all — it returns every user record, including passwords, roles and reputation.'],
  lesson: 'Debug and diagnostic endpoints shipped to production are unauthenticated backdoors with a friendly name.',
  impact: 'The entire member database — credentials included — is downloadable by anyone on the internet in one request.',
  report: { title: 'Exposed Debug Endpoint Leaks Full User Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; require admin auth and audit access to any diagnostics.' } }
];

// ---------------------------------------------------------------------------
// Progress engine + persistence
// ---------------------------------------------------------------------------
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const p = JSON.parse(raw); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch (e) { /* fresh */ }
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {} }
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length && TESTS.length > 0; }
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (isComplete()) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function featureStats() {
  const out = {};
  for (const t of TESTS) {
    if (!out[t.feature]) out[t.feature] = { total: 0, done: 0, attempts: progress.attempts[t.feature] || 0 };
    out[t.feature].total++; if (progress.tests[t.id]) out[t.feature].done++;
  }
  for (const f of Object.keys(out)) out[f].attempts = progress.attempts[f] || 0;
  return out;
}
loadProgress();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function userById(id) { return DB.users.find(u => u.id === Number(id)); }
function userByEmail(email) { return DB.users.find(u => u.email === String(email || '').toLowerCase()); }
function parseCookies(req) { const out = {}; const h = req.headers.cookie || ''; for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } return out; }
function sessionUser(req) { const c = parseCookies(req); if (c.sid && sessions.has(c.sid)) return userById(sessions.get(c.sid)); return null; }
function hasMarker(req) { const c = parseCookies(req); return Object.prototype.hasOwnProperty.call(c, 'hx_origin'); }
const XSS_RE = /(<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img[^>]*onerror|javascript\s*:)/i;
const SQLI_RE = /('\s*(or|and)\s*'?\d+'?\s*=\s*'?\d+)|('\s*(or|and)\s+[^=]*=[^=]*)|(--\s*$)|('\s*--)|(\bunion\b\s+\bselect\b)/i;
function resetTokenFor(u) { return 'HF' + u.id + '-' + (u.id * 137 + 42); }

// --- key shard region B (entry key, second half) ---

function assembleKey(parts) { return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '5eb4e5a011d38c67c2410eb2d3aa26b2fa4f123da72a961b57edb4f0267a75c1';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------
function header(req, title) {
  const total = totalTests(), done = doneCount(), pct = total ? Math.floor(done * 100 / total) : 0;
  const u = sessionUser(req);
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — ' + LAB_NAME + '</title>' +
    '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#0f1420;color:#e8ecf4}header{background:#161d2e;padding:10px 18px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}header a{color:#9fd0ff;text-decoration:none}main{max-width:900px;margin:0 auto;padding:20px}input,textarea,select,button{background:#1c2536;color:#e8ecf4;border:1px solid #3a4763;border-radius:6px;padding:7px 10px}button{cursor:pointer;background:#2f6fd0;border-color:#2f6fd0;color:#fff}a{color:#9fd0ff}.card{background:#161d2e;border:1px solid #2c3752;border-radius:10px;padding:14px 16px;margin:12px 0}.bar{height:10px;background:#2c3752;border-radius:5px;overflow:hidden;min-width:160px}.bar>i{display:block;height:100%;background:linear-gradient(90deg,#4da3ff,#9b6bff)}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #2c3752;padding:6px 8px;text-align:left}.muted{color:#93a1ba}details{margin:6px 0}</style></head><body>' +
    '<header><img src="/logo.png" alt="HexaCyberLab" style="height:34px"><strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong>' +
    '<span>LAB ' + LAB_NUMBER + ' · ' + done + '/' + total + ' tests · ' + pct + '%</span><span class="bar"><i style="width:' + pct + '%"></i></span>' +
    '<nav><a href="/">Boards</a> · <a href="/tests">Mission Board</a> · <a href="/members">Members</a> · <a href="/search">Search</a>' + (u ? ' · <a href="/pm">Messages</a> · <a href="/profile">Profile (' + u.name + ')</a> · <a href="/logout">Log out</a>' : ' · <a href="/login">Log in</a> · <a href="/register">Register</a>') + '</nav></header><main>';
}
function footer(req) {
  return '</main>' + chatWidget() + '</body></html>';
}
function chatWidget() {
  return '<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;background:#161d2e;border:1px solid #3a4763;border-radius:10px;padding:10px;z-index:50">' +
    '<strong>Lab Coach</strong><div id="coachlog" style="height:150px;overflow:auto;font-size:13px;margin:8px 0"></div>' +
    '<input id="coachin" placeholder="Ask the coach..." style="width:68%"><button id="coachbtn">Send</button></div>' +
    '<script>var log=document.getElementById("coachlog");function add(w,t){var d=document.createElement("div");d.innerHTML="<b>"+w+":</b> ";d.appendChild(document.createTextNode(t));log.appendChild(d);log.scrollTop=log.scrollHeight;}' +
    'async function ask(){var v=document.getElementById("coachin").value;if(!v)return;add("You",v);document.getElementById("coachin").value="";try{var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:v})});var j=await r.json();add("Coach",j.reply);}catch(e){add("Coach","Coach unavailable.");}}' +
    'document.getElementById("coachbtn").onclick=ask;document.getElementById("coachin").addEventListener("keydown",function(e){if(e.key==="Enter")ask();});</script>';
}
function gatePage() {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</title></head><body style="font-family:system-ui;background:#0f1420;color:#e8ecf4">' +
    '<div style="max-width:520px;margin:60px auto;background:#161d2e;border:1px solid #2c3752;border-radius:10px;padding:24px">' +
    '<img src="/logo.png" style="height:44px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="width:70%;padding:8px"> <button style="padding:8px 14px">Unlock</button></form>' +
    '</div>' + chatWidget() + '</body></html>';
}
function send(res, code, body, type) { res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' }); res.end(body); }
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function readBody(req) { return new Promise(resolve => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) d = d.slice(0, 1e6); }); req.on('end', () => resolve(d)); req.on('error', () => resolve('')); }); }
function parseBody(raw, ctype) {
  if ((ctype || '').includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  const out = {}; for (const pair of (raw || '').split('&')) { if (!pair) continue; const i = pair.indexOf('='); const k = i < 0 ? pair : pair.slice(0, i); const v = i < 0 ? '' : pair.slice(i + 1); try { out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (e) { out[k] = v; } } return out;
}

// --- key shard region C (completion key, first half) ---
const _CA = ["LVhI","Ri0zOEw=","UEtSNg=="];

// ---------------------------------------------------------------------------
// Auth handlers
// ---------------------------------------------------------------------------
function loginPage(req, msg) {
  return header(req, 'Log in') + '<h1>Log in to ' + LAB_NAME + '</h1>' + (msg ? '<p style="color:#ff9c9c">' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/login"><p>Email <input name="email" size="34"></p><p>Password <input name="password" type="password" size="34"></p><button>Log in</button></form>' +
    '<div class="card"><strong>Try the demo moderator account</strong><br>Email: mod@hexaforum.local<br>Password: mod123<br><span class="muted">Published here so evaluators can explore moderation. What could go wrong?</span></div>' +
    '<div class="card"><strong>Forgot your password?</strong><form method="POST" action="/forgot"><input name="email" placeholder="Your email" size="34"> <button>Send reset link</button></form></div>' + footer(req);
}
function doLogin(req, res, body) {
  attempt('Login & Authentication');
  const email = String(body.email || ''), password = String(body.password || '');
  const ip = req.socket.remoteAddress || 'local';
  if (SQLI_RE.test(email) || SQLI_RE.test(password)) {
    const admin = DB.users[0];
    const sid = 's' + (++sidSeq) + Date.now();
    sessions.set(sid, admin.id);
    pass('auth-sqli');
    res.writeHead(302, { 'Set-Cookie': 'sid=' + sid + '; Path=/; HttpOnly', Location: '/' }); res.end(); return;
  }
  const u = userByEmail(email);
  if (!u) {
    if (!DB.enumProbes[ip]) DB.enumProbes[ip] = new Set();
    DB.enumProbes[ip].add(email.toLowerCase());
    if (DB.enumProbes[ip].size >= 5) pass('auth-enum');
    return send(res, 200, loginPage(req, 'No account found for that email.'));
  }
  if (u.password !== password) {
    DB.failedLogins[u.email] = (DB.failedLogins[u.email] || 0) + 1;
    if (DB.failedLogins[u.email] >= 10) pass('auth-brute');
    if (!DB.enumProbes[ip]) DB.enumProbes[ip] = new Set();
    DB.enumProbes[ip].add(email.toLowerCase());
    if (DB.enumProbes[ip].size >= 5) pass('auth-enum');
    return send(res, 200, loginPage(req, 'Incorrect password for that account.'));
  }
  const sid = 's' + (++sidSeq) + Date.now();
  sessions.set(sid, u.id);
  if (u.id === 4) pass('auth-default');
  res.writeHead(302, { 'Set-Cookie': 'sid=' + sid + '; Path=/; HttpOnly', Location: '/' }); res.end();
}
function doForgot(req, res, body) {
  attempt('Login & Authentication');
  const ip = req.socket.remoteAddress || 'local';
  const u = userByEmail(body.email);
  if (!u) {
    if (!DB.enumProbes[ip]) DB.enumProbes[ip] = new Set();
    DB.enumProbes[ip].add(String(body.email || '').toLowerCase());
    if (DB.enumProbes[ip].size >= 5) pass('auth-enum');
    return send(res, 200, header(req, 'Forgot password') + '<p>No account found for that email address.</p>' + footer(req));
  }
  const token = resetTokenFor(u);
  DB.issuedTokens[u.email] = token;
  return send(res, 200, header(req, 'Forgot password') + '<p>Reset link sent. For this demo your token is: <b>' + esc(token) + '</b></p><form method="POST" action="/reset"><input type="hidden" name="email" value="' + esc(u.email) + '"><p>Token <input name="token" size="20"></p><p>New password <input name="newpassword" type="password"></p><button>Reset password</button></form>' + footer(req));
}
function doReset(req, res, body) {
  attempt('Login & Authentication');
  const u = userByEmail(body.email);
  if (!u) return send(res, 200, header(req, 'Reset') + '<p>No such account.</p>' + footer(req));
  if (String(body.token || '') === resetTokenFor(u)) {
    const wasIssued = DB.issuedTokens[u.email] === String(body.token || '');
    u.password = String(body.newpassword || 'changed123');
    delete DB.issuedTokens[u.email];
    if (!wasIssued) pass('auth-reset');
    return send(res, 200, header(req, 'Reset') + '<p>Password updated. You can now log in.</p>' + footer(req));
  }
  return send(res, 200, header(req, 'Reset') + '<p>Invalid token.</p>' + footer(req));
}

// ---------------------------------------------------------------------------
// Registration & profile
// ---------------------------------------------------------------------------
function registerPage(req, msg) {
  return header(req, 'Register') + '<h1>Create your account</h1>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/register"><p>Email <input name="email" size="34"></p><p>Display name <input name="name" size="34"></p><p>Password <input name="password" type="password" size="34"></p><button>Register</button></form>' + footer(req);
}
function doRegister(req, res, body) {
  attempt('Registration & Profile');
  const email = String(body.email || '').toLowerCase();
  if (!email || userByEmail(email)) return send(res, 200, registerPage(req, 'That email is already registered or invalid.'));
  const u = { id: nextUserId++, email, name: String(body.name || 'New Member'), password: String(body.password || ''), role: 'member', rep: 0, banned: false, bio: '' };
  if (String(u.password).length < 4) pass('reg-weakpw');
  // VULNERABLE: mass assignment — every posted field is bound onto the record.
  if (body.role && ['member', 'moderator', 'admin'].includes(String(body.role))) u.role = String(body.role);
  if (body.reputation !== undefined && !isNaN(parseInt(body.reputation, 10))) u.rep = parseInt(body.reputation, 10);
  if (body.rep !== undefined && !isNaN(parseInt(body.rep, 10))) u.rep = parseInt(body.rep, 10);
  if ((u.role !== 'member' && body.role) || u.rep > 0) pass('reg-massassign');
  if (XSS_RE.test(u.name)) pass('reg-storedxss');
  DB.users.push(u);
  const sid = 's' + (++sidSeq) + Date.now();
  sessions.set(sid, u.id);
  res.writeHead(302, { 'Set-Cookie': 'sid=' + sid + '; Path=/; HttpOnly', Location: '/' }); res.end();
}
function profilePage(req, u, msg) {
  return header(req, 'Profile') + '<h1>Your profile</h1>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/profile/update"><p>Display name <input name="name" value="' + esc(u.name) + '" size="34"></p><p>Bio <input name="bio" value="' + esc(u.bio || '') + '" size="50"></p><button>Save profile</button></form>' +
    '<p class="muted">Role: ' + esc(u.role) + ' · Reputation: ' + u.rep + '</p>' + footer(req);
}
function doProfileUpdate(req, res, u, body) {
  attempt('Registration & Profile');
  if (!hasMarker(req)) pass('reg-csrf'); // VULNERABLE: no CSRF token; the app only "expects" its own marker cookie.
  if (body.name !== undefined) { u.name = String(body.name); if (XSS_RE.test(u.name)) pass('reg-storedxss'); }
  if (body.bio !== undefined) u.bio = String(body.bio);
  return send(res, 200, profilePage(req, u, 'Profile saved.'));
}

// ---------------------------------------------------------------------------
// Boards, threads, posts
// ---------------------------------------------------------------------------
function homePage(req) {
  const rows = DB.boards.map(b => '<tr><td><a href="/board/' + b.id + '">' + esc(b.name) + '</a>' + (b.private ? ' <span class="muted">(staff only)</span>' : '') + '</td><td>' + esc(b.desc) + '</td></tr>').join('');
  return header(req, 'Boards') + '<h1>Boards</h1><table>' + rows + '</table>' + footer(req);
}
function boardPage(req, board) {
  const threads = DB.threads.filter(t => t.boardId === board.id && !t.hidden);
  const rows = threads.map(t => '<tr><td>' + (t.pinned ? '📌 ' : '') + '<a href="/thread/' + t.id + '">' + esc(t.title) + '</a></td><td>' + esc((userById(t.authorId) || {}).name || '?') + '</td></tr>').join('');
  return header(req, board.name) + '<h1>' + esc(board.name) + '</h1><table>' + rows + '</table>' +
    '<div class="card"><strong>New thread</strong><form method="POST" action="/thread"><input type="hidden" name="boardId" value="' + board.id + '"><p>Title <input name="title" size="50"></p><p>Body <input name="body" size="50"></p><button>Post thread</button></form></div>' + footer(req);
}
function threadPage(req, t, u) {
  const posts = DB.posts.filter(p => p.threadId === t.id);
  const html = posts.map(p => { const a = userById(p.authorId) || {}; return '<div class="card"><b>' + a.name + '</b> <span class="muted">(rep ' + (a.rep || 0) + ')</span><p>' + p.body + '</p>' +
    '<form method="POST" action="/post/' + p.id + '/vote" style="display:inline"><input type="hidden" name="value" value="1"><button>▲ Upvote</button></form> ' +
    (u && a.id === u.id ? '<a href="/post/' + p.id + '/edit">Edit</a>' : '') + '</div>'; }).join('');
  return header(req, t.title) + '<h1>' + esc(t.title) + '</h1>' + html +
    '<div class="card"><strong>Reply</strong><form method="POST" action="/post"><input type="hidden" name="threadId" value="' + t.id + '"><p><textarea name="body" rows="3" cols="60"></textarea></p><button>Post reply</button></form></div>' + footer(req);
}

// ---------------------------------------------------------------------------
// Search, votes, PMs, moderation, admin, API
// ---------------------------------------------------------------------------
function doSearch(req, res, q) {
  attempt('Search');
  let results;
  if (SQLI_RE.test(q)) {
    results = DB.threads.slice(); // VULNERABLE: tautology matches everything, incl. private + hidden.
    if (results.some(t => { const b = DB.boards.find(x => x.id === t.boardId); return (b && b.private) || t.hidden; })) pass('search-sqli');
  } else {
    results = DB.threads.filter(t => !t.hidden && !(DB.boards.find(b => b.id === t.boardId) || {}).private && t.title.toLowerCase().includes(q.toLowerCase()));
  }
  if (XSS_RE.test(q) && String(q).match(/<\s*script|onerror|onload|<\s*svg/i)) pass('search-xss');
  const rows = results.map(t => '<tr><td><a href="/thread/' + t.id + '">' + esc(t.title) + '</a></td></tr>').join('');
  // VULNERABLE: the query is reflected unescaped.
  return send(res, 200, header(req, 'Search') + '<h1>Search results for ' + q + '</h1><form method="GET" action="/search"><input name="q" size="40"> <button>Search</button></form><table>' + rows + '</table>' + footer(req));
}
function doVote(req, res, u, postId, body) {
  attempt('Reputation & Voting');
  const p = DB.posts.find(x => x.id === Number(postId));
  if (!p) return send(res, 404, 'No such post');
  const author = userById(p.authorId);
  let value = parseInt(body.value, 10); if (isNaN(value)) value = 1;
  const key = u.id + ':' + p.id;
  DB.voteCounts[key] = (DB.voteCounts[key] || 0) + 1;
  if (author) author.rep += value; // VULNERABLE: client-supplied amount, no self/repeat checks.
  if (p.authorId === u.id) pass('rep-self');
  if (Math.abs(value) > 1) pass('rep-amount');
  if (DB.voteCounts[key] >= 2) pass('rep-repeat');
  return redirect(res, '/thread/' + p.threadId);
}
function pmListPage(req, u) {
  const mine = DB.pms.filter(m => m.fromId === u.id || m.toId === u.id);
  const rows = mine.map(m => '<tr><td><a href="/pm/' + m.id + '">Message #' + m.id + '</a></td><td>from ' + esc((userById(m.fromId) || {}).name || '?') + ' to ' + esc((userById(m.toId) || {}).name || '?') + '</td></tr>').join('');
  return header(req, 'Messages') + '<h1>Your private messages</h1><table>' + rows + '</table>' +
    '<div class="card"><strong>Send a message</strong><form method="POST" action="/pm/send"><p>To (email) <input name="to" size="34"></p><p>Message <input name="body" size="50"></p><button>Send</button></form></div>' + footer(req);
}
function doPmSend(req, res, u, body) {
  attempt('Private Messages');
  const to = userByEmail(body.to);
  if (!to) return send(res, 200, pmListPage(req, u));
  let fromId = u.id;
  if (body.from !== undefined && String(body.from) !== '') {
    const spoof = userByEmail(body.from) || userById(body.from);
    if (spoof && spoof.id !== u.id) { fromId = spoof.id; pass('pm-spoof'); } // VULNERABLE: client-supplied sender.
  }
  DB.pms.push({ id: nextPmId++, fromId, toId: to.id, body: String(body.body || '') });
  return redirect(res, '/pm');
}
function modPage(req) {
  const rows = DB.threads.map(t => '<tr><td>' + esc(t.title) + '</td><td>' + (t.pinned ? 'pinned' : '') + '</td><td><form method="POST" action="/thread/' + t.id + '/pin"><button>Pin</button></form></td></tr>').join('');
  return header(req, 'Moderation console') + '<h1>Moderation console</h1><p class="muted">Staff only.</p><table>' + rows + '</table>' + footer(req);
}
function adminPage(req) {
  const rows = DB.users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.password) + '</td><td>' + esc(x.role) + '</td><td>' + x.rep + '</td><td>' + (x.banned ? 'BANNED' : '') + '</td><td><form method="POST" action="/admin/ban"><input type="hidden" name="userId" value="' + x.id + '"><button>Ban</button></form></td></tr>').join('');
  return header(req, 'Admin') + '<h1>Admin panel — all users</h1><table><tr><th>id</th><th>name</th><th>email</th><th>password</th><th>role</th><th>rep</th><th>status</th><th></th></tr>' + rows + '</table>' + footer(req);
}
function membersPage(req) {
  const rows = DB.users.map(x => '<tr><td>' + x.name + '</td><td>' + esc(x.role) + '</td><td>' + x.rep + '</td></tr>').join('');
  return header(req, 'Members') + '<h1>Members</h1><table><tr><th>name</th><th>role</th><th>reputation</th></tr>' + rows + '</table>' + footer(req);
}

// ---------------------------------------------------------------------------
// Mission Board, completion, certificate
// ---------------------------------------------------------------------------
function testsPage(req, res) {
  const stats = featureStats();
  let html = header(req, 'Mission Board') + '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + doneCount() + '/' + totalTests() + ' tests complete · ' + Math.floor(doneCount() * 100 / totalTests()) + '%</p>';
  for (const f of Object.keys(stats)) {
    html += '<h2>' + esc(f) + ' <span class="muted">(' + stats[f].done + '/' + stats[f].total + ' · attempts on this feature: ' + stats[f].attempts + ')</span></h2>';
    for (const t of TESTS.filter(x => x.feature === f)) {
      const st = progress.tests[t.id] ? '✓ done' : '○ open';
      html += '<div class="card"><strong>' + esc(t.name) + '</strong> — ' + esc(t.owasp) + ' · ' + esc(t.difficulty) + ' · ' + st +
        '<details><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
    }
  }
  return send(res, 200, html + footer(req));
}
// --- key shard region D (completion key, second half) ---
const _CB = ["TDAtN0Qx","SEZRMVo=","Qg=="];
function completionKey() { return assembleKey(_CA.concat(_CB)); }
function completePage(req) {
  if (!isComplete()) {
    return header(req, 'Not yet') + '<h1>Not complete yet</h1><p>You have finished ' + doneCount() + ' of ' + totalTests() + ' tests (' + Math.floor(doneCount() * 100 / totalTests()) + '%). The completion summary, your certificate and the key for the next lab unlock at 100%.</p><p>Still open:</p><ul>' +
      TESTS.filter(t => !progress.tests[t.id]).map(t => '<li>' + esc(t.feature) + ' — ' + esc(t.name) + '</li>').join('') + '</ul>' + footer(req);
  }
  const stats = featureStats();
  const feats = Object.keys(stats);
  let html = header(req, 'Lab complete') + '<h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' COMPLETE</h1>';
  html += '<h2>1) Total features in this lab</h2><p>' + feats.length + ' features, ' + totalTests() + ' tests.</p>';
  html += '<h2>2) Vulnerabilities per feature</h2><ul>' + feats.map(f => '<li>' + esc(f) + ': ' + stats[f].total + '</li>').join('') + '</ul>';
  html += '<h2>3) How testing was done</h2><p>' + doneCount() + ' techniques completed:</p><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
  html += '<h2>4) What you learned</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  html += '<h2>5) What this means for a real client</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  html += '<h2>6) Writing it in a real report</h2><ul>' + TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  html += '<div class="card"><h2>Your completion key for Lab ' + (LAB_NUMBER + 1) + '</h2><p style="font-size:20px"><b>' + esc(completionKey()) + '</b></p>' +
    '<form method="POST" action="/complete/name"><p>Your name for the certificate: <input name="testerName" value="' + esc(progress.testerName || '') + '"> <button>Save name</button></p></form>' +
    '<p><a href="/certificate">View your certificate</a></p></div>';
  return html + footer(req);
}
function certificatePage(req, u) {
  if (!isComplete()) return header(req, 'Certificate') + '<p>Certificates unlock at 100% completion.</p>' + footer(req);
  const name = progress.testerName || (u ? u.name : 'HexaCyberLab Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  const fcount = Object.keys(featureStats()).length;
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#eee}.card{max-width:640px;margin:40px auto;background:#fff;border:3px double #2f6fd0;border-radius:12px;padding:36px;text-align:center}</style></head><body>' +
    '<div class="card"><img src="/logo.png" style="height:64px"><h1>Certificate of Completion</h1><p>This certifies that</p><h2>' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' (' + totalTests() + ' tests across ' + fcount + ' features)</p>' +
    '<p>' + esc(date) + '</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p><button onclick="window.print()">Print</button></div></body></html>';
}

// ---------------------------------------------------------------------------
// Lab Coach (POST /api/chat)
// ---------------------------------------------------------------------------
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = {
  'Login & Authentication': ['login', 'password', 'auth', 'brute', 'reset token', 'enumerat', 'cookie', 'sign in'],
  'Registration & Profile': ['regist', 'profile', 'sign up', 'mass assign', 'display name'],
  'Boards & Threads': ['board', 'thread', 'post', 'hidden', 'private board', 'edit'],
  'Search': ['search'],
  'Reputation & Voting': ['reputation', 'vote', 'voting', 'upvote', 'points'],
  'Private Messages': ['private message', 'pm', 'message', 'inbox', 'spoof'],
  'Moderation & Admin': ['moderat', 'admin', 'pin', 'ban', 'csrf'],
  'Platform & API': ['api', 'debug', 'token', 'platform']
};
function coachReply(message) {
  const m = String(message || '');
  const low = m.toLowerCase();
  if (/(who (built|made|created)|who is the founder|founder|jony|hexacyberlab)/.test(low)) return ATTRIBUTION;
  if (low.includes('key') && /(completion|next|unlock|lab\s*83|give|what)/.test(low)) {
    if (isComplete() && progress.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' — well earned. Your completion key for Lab ' + (LAB_NUMBER + 1) + ' is: ' + completionKey();
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at " + Math.floor(doneCount() * 100 / totalTests()) + '% (' + doneCount() + '/' + totalTests() + ' tests). Finish every test and I will share it.';
  }
  let feature = null;
  for (const f of Object.keys(FEATURE_KEYS)) { if (FEATURE_KEYS[f].some(k => low.includes(k))) { feature = f; break; } }
  if (feature && /(how many|count|list|which|what)/.test(low) && !/(how to|how do|exploit|hack|bypass|attack|guide|help me|steps)/.test(low)) {
    const list = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name).join('; ') + '.';
  }
  if (feature && /(how|exploit|hack|bypass|attack|guide|help|steps|do it)/.test(low)) {
    const attempts = progress.attempts[feature] || 0;
    const open = TESTS.filter(t => t.feature === feature && !progress.tests[t.id]);
    if (attempts >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every test in ' + feature + '. Excellent work.';
      return 'Step by step for ' + feature + ':\n' + open.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + attempts + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/(how many|total|features|tests)/.test(low)) {
    const stats = featureStats();
    return 'LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ' has ' + Object.keys(stats).length + ' features and ' + totalTests() + ' tests in total: ' + Object.keys(stats).map(f => f + ' (' + stats[f].total + ')').join(', ') + '. You have completed ' + doneCount() + ' so far.';
  }
  if (/(hi|hello|hey|start|begin|help)/.test(low)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + Object.keys(featureStats()).length + ' features and ' + totalTests() + ' tests. Your progress: ' + doneCount() + '/' + totalTests() + ' (' + Math.floor(doneCount() * 100 / totalTests()) + '%).' + (next ? ' A good next step: "' + next.name + '" in ' + next.feature + ' — see the Mission Board at /tests for hints.' : ' Everything is complete — visit /complete for your summary and certificate.');
  }
  if (/(progress|status|score|percent)/.test(low)) return 'Your progress: ' + doneCount() + '/' + totalTests() + ' tests (' + Math.floor(doneCount() * 100 / totalTests()) + '%). Open the Mission Board at /tests for the full picture.';
  return 'I can help with this lab: ask me how many tests a feature has (e.g. "how many tests in Search"), or — after you have tried a feature at least 3 times — ask "how do I exploit the ' + 'Login & Authentication' + ' tests" and I will guide you step by step. The Mission Board at /tests always shows your progress and the graded hints.';
}

// ---------------------------------------------------------------------------
// Doc generation (node server.js --gen-docs)
// ---------------------------------------------------------------------------
function genDocs() {
  const feats = Object.keys(featureStats());
  let vuln = '# ' + LAB_NAME + ' — Vulnerabilities (LAB ' + LAB_NUMBER + ')\n\nComplete map of every scored test in this lab, grouped by feature. ' + totalTests() + ' tests across ' + feats.length + ' features.\n';
  let prac = '# ' + LAB_NAME + ' — Practice Guide (LAB ' + LAB_NUMBER + ')\n\nChallenges grouped by feature, then difficulty. Each challenge has 3 graded hints and a measurable objective: the test flips to done on the Mission Board (/tests) only when the real exploit effect happens server-side.\n';
  let fix = '# ' + LAB_NAME + ' — Fix & Retest Guide (LAB ' + LAB_NUMBER + ')\n\nFor every test: the report entry, the secure implementation, and the regression retest.\n';
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of feats) {
    const list = TESTS.filter(t => t.feature === f);
    vuln += '\n## ' + f + ' (' + list.length + ')\n';
    prac += '\n## ' + f + '\n';
    fix += '\n## ' + f + '\n';
    for (const t of list) {
      vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Exploitation outline: ' + t.hints[2] + '\n- Impact: ' + t.impact + '\n';
      fix += '\n### ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Secure implementation: ' + t.report.remediation + '\n- Regression test: re-run the original exploit steps from the Practice Guide — the test must no longer flip and the vulnerable effect must be gone, while the legitimate feature still works.\n';
    }
    for (const t of list.slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      prac += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: make the "' + t.name + '" test flip to done on /tests by performing the real exploit.\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(ROOT, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(ROOT, 'PRACTICE-GUIDE.md'), prac);
  fs.writeFileSync(path.join(ROOT, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated for LAB ' + LAB_NUMBER + ' ' + LAB_NAME + ': ' + totalTests() + ' tests, ' + feats.length + ' features.');
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const method = req.method;
    res.setHeader('Set-Cookie', 'hx_origin=1; Path=/'); // benign marker the app sets on its own pages
    if (p === '/logo.png') { try { const buf = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(buf); } catch (e) { return send(res, 404, 'no logo'); } }
    if (p === '/api/progress') {
      const stats = featureStats();
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: Math.floor(doneCount() * 100 / totalTests()), features: stats, complete: isComplete() }, null, 2), 'application/json');
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = parseBody(await readBody(req), req.headers['content-type']);
      let reply; try { reply = coachReply(body.message); } catch (e) { reply = 'I hit a snag — try the Mission Board at /tests for hints.'; }
      return send(res, 200, JSON.stringify({ reply }), 'application/json');
    }
    if (p === '/unlock' && method === 'POST') {
      const body = parseBody(await readBody(req), req.headers['content-type']);
      const given = String(body.key || '');
      if (entryKeyMatches(given)) { progress.unlocked = true; saveProgress(); return redirect(res, '/'); }
      return send(res, 403, gatePage());
    }
    if (!progress.unlocked) return send(res, 200, gatePage());

    const user = sessionUser(req);
    // ---- public / auth routes ----
    if (p === '/login' && method === 'GET') return send(res, 200, loginPage(req, ''));
    if (p === '/login' && method === 'POST') return doLogin(req, res, parseBody(await readBody(req), req.headers['content-type']));
    if (p === '/forgot' && method === 'POST') return doForgot(req, res, parseBody(await readBody(req), req.headers['content-type']));
    if (p === '/reset' && method === 'POST') return doReset(req, res, parseBody(await readBody(req), req.headers['content-type']));
    if (p === '/register' && method === 'GET') return send(res, 200, registerPage(req, ''));
    if (p === '/register' && method === 'POST') return doRegister(req, res, parseBody(await readBody(req), req.headers['content-type']));
    if (p === '/logout') { const c = parseCookies(req); if (c.sid) sessions.delete(c.sid); return redirect(res, '/login'); }
    if (p === '/tests') { testsPage(req, res); return; }
    if (p === '/complete') return send(res, 200, completePage(req));
    if (p === '/complete/name' && method === 'POST') { const b = parseBody(await readBody(req), req.headers['content-type']); progress.testerName = String(b.testerName || ''); saveProgress(); return redirect(res, '/complete'); }
    if (p === '/certificate') return send(res, 200, certificatePage(req, user));
    if (p === '/api/debug') { attempt('Platform & API'); pass('api-debug'); return send(res, 200, JSON.stringify({ users: DB.users, boards: DB.boards }, null, 2), 'application/json'); }
    if (p === '/api/mydata') {
      attempt('Platform & API');
      const tok = String(req.headers['x-api-token'] || '');
      let email = ''; try { email = Buffer.from(tok, 'base64').toString('utf8'); } catch (e) {}
      const tu = userByEmail(email);
      if (tu && !user) { pass('api-token'); return send(res, 200, JSON.stringify({ user: { id: tu.id, email: tu.email, name: tu.name, role: tu.role, rep: tu.rep }, threads: DB.threads.filter(t => t.authorId === tu.id), pms: DB.pms.filter(m => m.fromId === tu.id || m.toId === tu.id) }, null, 2), 'application/json'); }
      if (tu) return send(res, 200, JSON.stringify({ user: { id: tu.id, email: tu.email } }), 'application/json');
      return send(res, 401, JSON.stringify({ error: 'bad token' }), 'application/json');
    }
    // ---- everything below needs a login ----
    if (!user) return redirect(res, '/login');
    if (p === '/') return send(res, 200, homePage(req));
    if (p === '/members') return send(res, 200, membersPage(req));
    if (p === '/profile' && method === 'GET') return send(res, 200, profilePage(req, user, ''));
    if (p === '/profile/update' && method === 'POST') return doProfileUpdate(req, res, user, parseBody(await readBody(req), req.headers['content-type']));
    let m;
    if ((m = p.match(/^\/board\/(\d+)$/)) && method === 'GET') {
      attempt('Boards & Threads');
      const b = DB.boards.find(x => x.id === Number(m[1])); if (!b) return send(res, 404, 'No such board');
      if (b.private && user.role === 'member') pass('board-private'); // VULNERABLE: private board served to any logged-in user.
      return send(res, 200, boardPage(req, b));
    }
    if ((m = p.match(/^\/thread\/(\d+)$/)) && method === 'GET') {
      attempt('Boards & Threads');
      const t = DB.threads.find(x => x.id === Number(m[1])); if (!t) return send(res, 404, 'No such thread');
      if (t.hidden && user.role === 'member') pass('thread-hidden'); // VULNERABLE: hidden thread served by direct URL.
      return send(res, 200, threadPage(req, t, user));
    }
    if (p === '/thread' && method === 'POST') {
      attempt('Boards & Threads');
      const b = parseBody(await readBody(req), req.headers['content-type']);
      const t = { id: nextThreadId++, boardId: Number(b.boardId) || 1, authorId: user.id, title: String(b.title || 'Untitled'), hidden: false, locked: false, pinned: false };
      DB.threads.push(t);
      DB.posts.push({ id: nextPostId++, threadId: t.id, authorId: user.id, body: String(b.body || '') });
      if (XSS_RE.test(String(b.body || ''))) pass('thread-storedxss');
      return redirect(res, '/thread/' + t.id);
    }
    if (p === '/post' && method === 'POST') {
      attempt('Boards & Threads');
      const b = parseBody(await readBody(req), req.headers['content-type']);
      const post = { id: nextPostId++, threadId: Number(b.threadId) || 1, authorId: user.id, body: String(b.body || '') };
      DB.posts.push(post);
      if (XSS_RE.test(post.body)) pass('thread-storedxss');
      return redirect(res, '/thread/' + post.threadId);
    }
    if ((m = p.match(/^\/post\/(\d+)\/edit$/)) && method === 'GET') {
      const post = DB.posts.find(x => x.id === Number(m[1])); if (!post) return send(res, 404, 'No such post');
      return send(res, 200, header(req, 'Edit post') + '<form method="POST" action="/post/' + post.id + '/edit"><p><textarea name="body" rows="4" cols="60">' + esc(post.body) + '</textarea></p><button>Save</button></form>' + footer(req));
    }
    if ((m = p.match(/^\/post\/(\d+)\/edit$/)) && method === 'POST') {
      attempt('Boards & Threads');
      const b = parseBody(await readBody(req), req.headers['content-type']);
      const post = DB.posts.find(x => x.id === Number(m[1])); if (!post) return send(res, 404, 'No such post');
      if (post.authorId !== user.id) pass('thread-edit-idor'); // VULNERABLE: no authorship check.
      post.body = String(b.body || '');
      if (XSS_RE.test(post.body)) pass('thread-storedxss');
      return redirect(res, '/thread/' + post.threadId);
    }
    if ((m = p.match(/^\/post\/(\d+)\/vote$/)) && method === 'POST') return doVote(req, res, user, m[1], parseBody(await readBody(req), req.headers['content-type']));
    if (p === '/search') return doSearch(req, res, u.searchParams.get('q') || '');
    if (p === '/pm' && method === 'GET') return send(res, 200, pmListPage(req, user));
    if ((m = p.match(/^\/pm\/(\d+)$/)) && method === 'GET') {
      attempt('Private Messages');
      const msg = DB.pms.find(x => x.id === Number(m[1])); if (!msg) return send(res, 404, 'No such message');
      if (msg.fromId !== user.id && msg.toId !== user.id) pass('pm-idor'); // VULNERABLE: PM served to non-participants.
      return send(res, 200, header(req, 'Message') + '<div class="card"><p><b>From:</b> ' + esc((userById(msg.fromId) || {}).name || '?') + '</p><p><b>To:</b> ' + esc((userById(msg.toId) || {}).name || '?') + '</p><p>' + esc(msg.body) + '</p></div>' + footer(req));
    }
    if (p === '/pm/send' && method === 'POST') return doPmSend(req, res, user, parseBody(await readBody(req), req.headers['content-type']));
    if ((m = p.match(/^\/thread\/(\d+)\/pin$/)) && method === 'POST') {
      attempt('Moderation & Admin');
      const t = DB.threads.find(x => x.id === Number(m[1])); if (!t) return send(res, 404, 'No such thread');
      t.pinned = true; // VULNERABLE: no role check on a moderation action.
      if (user.role === 'member') pass('mod-bac');
      return redirect(res, '/thread/' + t.id);
    }
    if (p === '/mod' && method === 'GET') {
      attempt('Moderation & Admin');
      const c = parseCookies(req);
      const cookieRole = String(c.hx_role || '');
      if (['moderator', 'admin'].includes(cookieRole)) { // VULNERABLE: trusts the client cookie, not the account.
        if (user.role === 'member') pass('auth-cookie');
        return send(res, 200, modPage(req));
      }
      if (['moderator', 'admin'].includes(user.role)) return send(res, 200, modPage(req));
      return send(res, 403, header(req, 'Forbidden') + '<p>Staff only.</p>' + footer(req));
    }
    if (p === '/admin' && method === 'GET') {
      attempt('Moderation & Admin');
      if (user.role === 'member') pass('admin-bac'); // VULNERABLE: panel served to any logged-in user.
      return send(res, 200, adminPage(req));
    }
    if (p === '/admin/ban' && method === 'POST') {
      attempt('Moderation & Admin');
      const b = parseBody(await readBody(req), req.headers['content-type']);
      const target = userById(b.userId);
      if (target) target.banned = true; // VULNERABLE: no role check, no CSRF token.
      if (!hasMarker(req)) pass('mod-csrf');
      return redirect(res, '/admin');
    }
    return send(res, 404, header(req, 'Not found') + '<p>Page not found.</p>' + footer(req));
  } catch (e) {
    try { send(res, 200, '<!DOCTYPE html><html><body><p>Something went wrong, but the lab is still up. Try /tests.</p></body></html>'); } catch (e2) {}
  }
});

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }
loadProgress();
server.listen(PORT, '127.0.0.1', () => { console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://127.0.0.1:' + PORT); });
