'use strict';
/* ============================================================
   LAB 90 — HexaCommunity (Category 9: Media, Social & Community)
   A membership community platform: member directory, private
   groups, events with RSVPs, resource library, discussion
   spaces, member tiers, admin/moderator roles.
   Zero-dependency Node.js. LOCAL-ONLY practice lab.
   Binds 127.0.0.1:3099. All seed data is fake.
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3099;
const LAB_NUMBER = 90;
const LAB_NAME = 'HexaCommunity';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const FILES_DIR = path.join(DIR, 'files');

/* ---- key material A (part 1 of 2) ---- */
const _eA = ['TC1YSA==', 'Ni0wOQ==', 'UFhBRA=='];
const _cA = ['TC1YSA==', 'My0xOQ==', 'TUFGMw=='];
function _rev(s) { return s.split('').reverse().join(''); }
function _asm(a, b) { return a.concat(b).map(x => _rev(Buffer.from(x, 'base64').toString('utf8'))).join(''); }

/* ---------------- seed data (all fake) ---------------- */
let DB = null;
function seed() {
  DB = {
    users: [
      { id: 1, email: 'admin@hexacommunity.local', password: 'Admin123!', name: 'Ada Admin', role: 'admin', tier: 'premium', priv: false, listed: true, phone: '+1-555-0101', bio: 'Community administrator.', banned: false, demo: false },
      { id: 2, email: 'mod@hexacommunity.local', password: 'Mod12345', name: 'Moe Moderator', role: 'moderator', tier: 'premium', priv: false, listed: true, phone: '+1-555-0102', bio: 'Moderator on duty.', banned: false, demo: false },
      { id: 3, email: 'alice@test.local', password: 'alice123', name: 'Alice Member', role: 'member', tier: 'premium', priv: false, listed: true, phone: '+1-555-0103', bio: 'Premium member, loves events.', banned: false, demo: false },
      { id: 4, email: 'bob@test.local', password: 'bob123', name: 'Bob Member', role: 'member', tier: 'free', priv: true, listed: true, phone: '+1-555-0199', bio: 'Private profile — contact details are members-only-secret.', banned: false, demo: false },
      { id: 5, email: 'carol@test.local', password: 'carol123', name: 'Carol Member', role: 'member', tier: 'free', priv: false, listed: true, phone: '+1-555-0105', bio: 'Free tier member.', banned: false, demo: false },
      { id: 6, email: 'dave@test.local', password: 'dave123', name: 'Dave Member', role: 'member', tier: 'free', priv: false, listed: true, phone: '+1-555-0106', bio: 'Free tier member.', banned: false, demo: false },
      { id: 7, email: 'demo@hexacommunity.local', password: 'demo1234', name: 'Demo Member', role: 'member', tier: 'free', priv: false, listed: true, phone: '+1-555-0107', bio: 'Published demo account.', banned: false, demo: true },
      { id: 8, email: 'hidden@test.local', password: 'hidden123', name: 'Hidden Hannah', role: 'member', tier: 'free', priv: true, listed: false, phone: '+1-555-0188', bio: 'Unlisted member — should never appear in search.', banned: false, demo: false }
    ],
    groups: [
      { id: 1, name: 'Founders Circle', priv: true, approval: true, members: [1, 3], posts: [
        { id: 1, authorId: 3, body: 'Founders-only: Q3 revenue notes and hiring plans.' },
        { id: 2, authorId: 1, body: 'Confidential roadmap discussion for circle members.' }
      ]},
      { id: 2, name: 'Open Lounge', priv: false, approval: false, members: [1, 2, 3, 4, 5, 6], posts: [
        { id: 3, authorId: 3, body: 'Welcome to the lounge — introduce yourself!' },
        { id: 4, authorId: 5, body: 'Anyone joining the meetup this weekend?' }
      ]}
    ],
    events: [
      { id: 1, name: 'Premium Mastermind Session', tierOnly: 'premium', capacity: 20 },
      { id: 2, name: 'Community Meetup', tierOnly: null, capacity: 2 }
    ],
    rsvps: [
      { id: 1, eventId: 2, userId: 5 },
      { id: 2, eventId: 2, userId: 6 }
    ],
    resources: [
      { id: 1, name: 'Community Playbook', tier: 'free', file: 'playbook.txt', desc: 'Getting-started guide for every member.' },
      { id: 2, name: 'Premium Growth Vault', tier: 'premium', file: 'vault.txt', desc: 'Premium-only growth playbooks and templates.' }
    ],
    threads: [
      { id: 1, authorId: 3, title: 'Best tools for community managers?', posts: [
        { authorId: 3, body: 'What tools does everyone use to run their community?' },
        { authorId: 5, body: 'A shared calendar plus this portal works for us.' }
      ]},
      { id: 2, authorId: 4, title: 'Introduce yourself', posts: [
        { authorId: 4, body: 'Hi all, Bob here. Keeping a low profile.' }
      ]}
    ],
    issuedTokens: {},
    nextUserId: 9, nextPostId: 5, nextRsvpId: 3, nextThreadId: 3
  };
}
seed();

/* ---------------- progress state ---------------- */
let state;
function freshState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false,
           extra: { fails: {}, forgotProbes: [], loginProbes: [] } };
}
function loadState() {
  try { state = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); if (!state.extra) state = Object.assign(freshState(), state); }
  catch (e) { state = freshState(); }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) {} }
loadState();

/* ---------------- tiny string-built SQL evaluator ----------------
   The app "builds queries by string concatenation" — this evaluator
   parses the resulting WHERE clause (AND/OR/= /LIKE, string & number
   literals, -- comments) and evaluates it against a row. That is what
   makes the injection tests real: the injected text changes the query. */
function tokenize(sql) {
  const toks = []; let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }
    if (c === '-' && sql[i + 1] === '-') { break; } // -- comment to end
    if (c === "'") {
      let s = ''; i++;
      while (i < sql.length) {
        if (sql[i] === "'") { if (sql[i + 1] === "'") { s += "'"; i += 2; } else { i++; break; } }
        else { s += sql[i]; i++; }
      }
      toks.push({ t: 'str', v: s }); continue;
    }
    if (c === '=') { toks.push({ t: 'op', v: '=' }); i++; continue; }
    if (/[0-9]/.test(c)) { let n = ''; while (i < sql.length && /[0-9.]/.test(sql[i])) { n += sql[i]; i++; } toks.push({ t: 'num', v: parseFloat(n) }); continue; }
    if (/[A-Za-z_]/.test(c)) { let w = ''; while (i < sql.length && /[A-Za-z0-9_]/.test(sql[i])) { w += sql[i]; i++; } toks.push({ t: 'word', v: w }); continue; }
    i++;
  }
  return toks;
}
function likeMatch(value, pattern) {
  const re = new RegExp('^' + String(pattern).split('').map(ch => ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('') + '$', 'i');
  return re.test(String(value));
}
function evalWhere(where, row) {
  const toks = tokenize(where); let p = 0;
  function operand() {
    const tk = toks[p++];
    if (!tk) return '';
    if (tk.t === 'str' || tk.t === 'num') return tk.v;
    if (tk.t === 'word') { const v = row[tk.v]; return v === undefined ? '' : v; }
    return '';
  }
  function cmp() {
    const a = operand(); const op = toks[p++]; const b = operand();
    if (op && op.t === 'word' && /^like$/i.test(op.v)) return likeMatch(a, b);
    return String(a) === String(b);
  }
  function andExpr() { let r = cmp(); while (toks[p] && toks[p].t === 'word' && /^and$/i.test(toks[p].v)) { p++; const r2 = cmp(); r = r && r2; } return r; }
  function orExpr() { let r = andExpr(); while (toks[p] && toks[p].t === 'word' && /^or$/i.test(toks[p].v)) { p++; const r2 = andExpr(); r = r || r2; } return r; }
  try { return !!orExpr(); } catch (e) { return false; }
}
const XSS_PAT = /(<\s*script|onerror\s*=|onload\s*=|<\s*svg|<\s*img[^>]*onerror|javascript\s*:|<\s*iframe)/i;
const INJ_PAT = /('\s*(or|and)\s|--|'\s*=\s*'|union\s+select)/i;

/* ---------------- TESTS registry ---------------- */
const TESTS = [
 /* ---- Login & Authentication (6) ---- */
 { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
   where: 'POST /login', how: 'Submit a login whose email or password contains a SQL tautology so the string-built query matches the first account without its real password.',
   hints: ['The login builds its query by gluing your input straight into a string.', "Try a quote followed by OR and a condition that is always true.", "Email: ' OR '1'='1' -- with any password logs you in as the first account."],
   lesson: 'String-built SQL queries let an attacker rewrite the login logic itself — the database ends up checking a condition the developer never wrote.',
   impact: 'On a real community site this hands an attacker the first account in the table — usually the administrator — with no password at all: full control of members, groups and moderation.',
   report: { title: 'SQL Injection in Login Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements for all authentication lookups and never concatenate user input into SQL.' },
   fix: 'Replace the concatenated query with a parameterised lookup and compare a salted password hash (bcrypt/argon2) server-side.' },
 { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
   where: 'POST /login', how: 'Submit 10+ wrong passwords for one account; the app keeps accepting attempts with no throttle, delay or lockout.',
   hints: ['Pick one account and keep guessing wrong passwords.', 'Count the failures — does anything slow down or lock at 5? At 10?', 'Ten failed attempts for the same account are still processed instantly: the missing throttle is the flaw.'],
   lesson: 'Without throttling, every password is only as strong as the attacker\'s patience and wordlist.',
   impact: 'Attackers can grind through common-password lists against real member accounts — one weak password means a hijacked identity inside the community.',
   report: { title: 'Login Endpoint Has No Brute-Force Protection', severity: 'High', remediation: 'Rate-limit and progressively delay failed logins per account and per IP, add lockout/backoff and alerting.' },
   fix: 'Track failed attempts per account/IP, enforce exponential backoff and CAPTCHA after a small threshold, and log the events.' },
 { id: 'enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
   where: 'POST /login and POST /forgot', how: 'Compare responses for existing vs non-existing emails — they differ, so probing 5+ addresses reveals which ones are registered.',
   hints: ['Try a real member email and a made-up one on the forgot-password form.', 'Notice the two responses say different things.', 'Probe at least 5 distinct addresses; the differing answers build a confirmed member list.'],
   lesson: 'Different error messages for "no such account" and "wrong password" turn your login page into a free member-directory oracle.',
   impact: 'Attackers harvest a verified list of member emails — the perfect targeting list for phishing and password spraying against the community.',
   report: { title: 'Authentication Responses Allow Account Enumeration', severity: 'Medium', remediation: 'Return one generic message for all login and reset outcomes regardless of whether the account exists.' },
   fix: 'Use identical generic responses and timing for existing and non-existing accounts on login and password reset.' },
 { id: 'demo-creds', feature: 'Login & Authentication', name: 'Published Demo Credentials', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
   where: 'Login page / POST /login', how: 'The login page publishes a working demo account. Sign in with it — a live, real account anyone on the internet can use.',
   hints: ['Read the login page carefully — it advertises a demo account.', 'Demo accounts are real accounts with real sessions.', 'Sign in with the demo email and password printed on the login page.'],
   lesson: 'A demo account printed on the login page is a standing invitation: shared, never-rotated credentials with a real session behind them.',
   impact: 'Anyone can walk in through the front door with the published demo login and act inside the community as a "member" — spam, scraping and social engineering included.',
   report: { title: 'Working Demo Credentials Published on the Login Page', severity: 'Medium', remediation: 'Remove demo credentials from production, or isolate demo accounts in a separate read-only demo environment.' },
   fix: 'Delete the published demo account from production data and never print working credentials on public pages.' },
 { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
   where: 'POST /reset', how: 'Reset tokens are derived from the user id with simple arithmetic. Compute another member\'s token and reset their password without ever requesting a reset.',
   hints: ['Request a reset for your own account and study the token format.', 'The token contains the user id and a number derived from it.', 'token = HC<id>-<(id*137+42) mod 100000>. Compute Bob\'s (id 4) and POST it to /reset — no email needed.'],
   lesson: 'A reset token is a password-equivalent: if it can be computed from public data like a user id, the reset flow is an account-takeover feature.',
   impact: 'An attacker who can see member ids (the directory shows them) can reset ANY member\'s password — including moderators — and take over the account silently.',
   report: { title: 'Password Reset Tokens Are Predictable', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG (≥128 bits), store only a hash, expire them quickly and bind them to a single use.' },
   fix: 'Issue random single-use tokens with short expiry, stored hashed, and invalidate all sessions after a reset.' },
 { id: 'role-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into the Moderator Console', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'GET /mod', how: 'The moderator console trusts a client-supplied hx_role cookie over the server-side session role. Set it as a plain member and walk in.',
   hints: ['The moderator console checks something your browser controls.', 'Look at the cookies the app uses — one of them names a role.', 'Set the cookie hx_role=admin (or moderator) as a plain member and open /mod.'],
   lesson: 'Authorization data stored on the client is a suggestion, not a control — the server must be the only source of role truth.',
   impact: 'Every member can promote themselves to moderator by editing a cookie: banning rivals, reading private groups and abusing moderation tools.',
   report: { title: 'Moderator Console Trusts a Client-Controlled Role Cookie', severity: 'High', remediation: 'Derive roles only from the server-side session record; never trust role values supplied by the client.' },
   fix: 'Remove the cookie-based role check; authorize /mod strictly from the session user\'s stored role.' },

 /* ---- Registration & Profile (4) ---- */
 { id: 'weak-password', feature: 'Registration & Profile', name: 'No Password Policy — 1-Character Passwords', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Beginner',
   where: 'POST /register', how: 'Register a new account with a 1-character password. It is accepted.',
   hints: ['Create a fresh account and give it the shortest password possible.', 'Does the form complain about length at all?', 'A single character — even "x" — becomes a working password.'],
   lesson: 'A password policy is the cheapest control there is; skipping it invites trivially guessable accounts.',
   impact: 'Members who choose 1-character passwords can be guessed in seconds, and every hijacked account erodes trust in the whole community.',
   report: { title: 'Registration Accepts 1-Character Passwords', severity: 'Medium', remediation: 'Enforce a minimum length (≥10) and screen new passwords against breached-password lists.' },
   fix: 'Validate password length and strength server-side at registration and password change.' },
 { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Self-Assign Admin Role / Premium Tier', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'POST /register', how: 'Registration binds every submitted field onto the new account. Add role=admin or tier=premium to the POST and the account is created with them.',
   hints: ['The register endpoint copies your form fields onto the account object.', 'What fields exist on an account that the form never shows?', 'Add role=admin (or tier=premium) to the registration POST and inspect your new account.'],
   lesson: 'Binding request data straight onto model objects lets attackers write fields the UI never offered — roles, tiers, balances.',
   impact: 'Self-service admin creation is game over: the attacker owns the community, its member data and its moderation tools from minute one.',
   report: { title: 'Registration Allows Mass Assignment of Role and Tier', severity: 'Critical', remediation: 'Whitelist exactly the fields a registrant may set; assign role and tier server-side only.' },
   fix: 'Build the account from an explicit allow-list (name, email, password) and default role/tier server-side.' },
 { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
   where: 'POST /register and POST /profile → member directory', how: 'Put an HTML/JS payload in the display name; it is stored and rendered unescaped to everyone who browses the directory or profile.',
   hints: ['Display names are shown all over the site — directory, posts, profiles.', 'What happens if your name contains HTML?', 'Register or rename with a name like <script>alert(1)</script> and view the directory.'],
   lesson: 'Any stored field rendered without encoding is a stored XSS waiting for a victim — names and bios are classic carriers.',
   impact: 'One malicious member name executes script in every visitor\'s browser — session theft, defacement and phishing from inside a trusted page.',
   report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user-supplied values on output and validate/sanitise profile fields on input.' },
   fix: 'HTML-encode display names (and all user content) at render time; add a Content-Security-Policy as defence in depth.' },
 { id: 'csrf-profile', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'POST /profile', how: 'The profile update has no anti-CSRF token. A state-changing POST without the app\'s own hx_origin marker is accepted.',
   hints: ['The app sets an hx_origin marker cookie on its own pages — forms rely on it being present, but the server never checks.', 'Send the profile POST from outside the site\'s own flow (no marker cookie).', 'POST /profile with a new name and no hx_origin cookie: the change is accepted anyway.'],
   lesson: 'State-changing endpoints without CSRF tokens let any website a member visits silently rewrite their profile.',
   impact: 'Attackers can vandalise or weaponise member profiles (names, bios with phishing links) simply by getting members to open a page.',
   report: { title: 'Profile Update Lacks CSRF Protection', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token (or verify the origin marker) on every state-changing POST.' },
   fix: 'Generate a per-session CSRF token, embed it in forms, and reject state changes that arrive without it.' },

 /* ---- Member Directory (3) ---- */
 { id: 'private-profile-leak', feature: 'Member Directory', name: 'Private Profile Contact Leak via Direct URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'GET /member/:id', how: 'Members who marked their profile private still have their email and phone rendered to any logged-in member who opens /member/<id> directly.',
   hints: ['Bob\'s profile is marked private — the directory hides his contact details.', 'Profiles also live at predictable /member/<id> URLs.', 'Open Bob\'s direct profile URL (id 4) as another member: email and phone are printed anyway.'],
   lesson: 'Privacy flags that only hide data in the listing but not on the object page are decoration — the object endpoint must enforce them.',
   impact: 'Members who explicitly chose privacy get their personal email and phone harvested anyway — a GDPR-style breach of trust and possibly of law.',
   report: { title: 'Private Member Contact Details Exposed via Profile URL', severity: 'High', remediation: 'Enforce the privacy flag on the profile endpoint: owner, admins or nobody — and minimise the fields returned.' },
   fix: 'Check the privacy flag server-side on every profile read and omit contact fields for private profiles.' },
 { id: 'search-sqli', feature: 'Member Directory', name: 'SQL Injection in Directory Search Dumps Unlisted Members', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
   where: 'GET /directory?q=', how: 'The member search concatenates q into a LIKE query. Injecting a tautology plus a comment returns every account — including the unlisted member the search is supposed to hide.',
   hints: ['Search builds its query the same string-built way as login.', 'A normal search only returns listed members — one member is deliberately unlisted.', "Search for: ' OR '1'='1' -- and look for the member who never appears in normal results."],
   lesson: 'Search boxes are SQL entry points too; one injection here dumps the entire member table, hidden rows included.',
   impact: 'The full member list — including unlisted and private members — can be exfiltrated through the search box, defeating every privacy control at once.',
   report: { title: 'SQL Injection in Member Search Exposes Unlisted Accounts', severity: 'High', remediation: 'Parameterise the search query and keep the listed/visibility filter in server-side code, not in the injectable string.' },
   fix: 'Use a parameterised LIKE with escaped wildcards and apply the listed filter outside the user-controlled fragment.' },
 { id: 'reflected-xss', feature: 'Member Directory', name: 'Reflected XSS in Directory Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
   where: 'GET /directory?q=', how: 'The search term is reflected into the results heading without encoding. Put a script payload in q and it comes straight back in the page.',
   hints: ['The results page repeats your search term back to you.', 'Is that reflection encoded?', 'Search for <script>alert(1)</script> and view the page source.'],
   lesson: 'Reflecting input without encoding turns a harmless search link into a script-delivery URL.',
   impact: 'Attackers send members a crafted search link that runs script in their session — credential theft and actions taken as the victim.',
   report: { title: 'Reflected Cross-Site Scripting in Member Search', severity: 'Medium', remediation: 'HTML-encode the reflected search term (and all reflected input) on output.' },
   fix: 'Encode q when rendering the results heading and add CSP headers.' },

 /* ---- Private Groups (3) ---- */
 { id: 'private-group-access', feature: 'Private Groups', name: 'Private Group Content Served to Non-Members', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'GET /group/:id', how: 'The Founders Circle is a private group, but its page — posts included — is served to any logged-in member, member of the group or not.',
   hints: ['The group list marks Founders Circle as private.', 'Private is apparently only a label.', 'Open /group/1 as Bob (not a member): the confidential posts are all there.'],
   lesson: 'Confidentiality must be enforced on the content endpoint, not just implied by a "private" badge in the UI.',
   impact: 'Everything members share in "private" groups — plans, revenue notes, personal updates — is readable by the entire community.',
   report: { title: 'Private Group Content Accessible to Non-Members', severity: 'High', remediation: 'Check group membership server-side before serving any private group content.' },
   fix: 'Authorize group reads against the membership list; non-members get a 403 and no content.' },
 { id: 'group-join-bypass', feature: 'Private Groups', name: 'Private Group Join Without Moderator Approval', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'POST /group/:id/join', how: 'Joining an approval-required group trusts a client-supplied approved flag. Send approved=1 with the join and you are a member instantly.',
   hints: ['Joining Founders Circle normally goes to a moderator for approval.', 'The join endpoint reads more than your user id from the request.', 'POST the join with approved=1 in the body — membership is granted on the spot.'],
   lesson: 'Workflow state (approved/pending) must live server-side; a client-supplied approval flag is self-authorization.',
   impact: 'The approval process — the whole point of a vetted private group — is theatre: anyone can self-approve into the most sensitive spaces.',
   report: { title: 'Group Join Approval Can Be Forged by the Client', severity: 'High', remediation: 'Record joins as pending server-side; only a moderator action may flip them to approved.' },
   fix: 'Ignore client-supplied approval state; create a pending request that only moderators can approve.' },
 { id: 'group-post-idor', feature: 'Private Groups', name: 'Delete Another Member\'s Group Post (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'POST /grouppost/:id/delete', how: 'The group-post delete endpoint never checks authorship. Delete a post written by someone else by guessing its id.',
   hints: ['Group posts have small sequential ids.', 'The delete button is shown to authors — but the endpoint does not care who calls it.', 'POST /grouppost/3/delete as Bob: Alice\'s lounge post is gone.'],
   lesson: 'Every object-level action needs an ownership check; hiding the button is not authorization.',
   impact: 'Any member can vandalise group conversations by deleting other people\'s posts — harassment and content destruction with no trace.',
   report: { title: 'Missing Ownership Check on Group Post Deletion (IDOR)', severity: 'Medium', remediation: 'Verify the caller is the post author (or a moderator) before deleting.' },
   fix: 'Authorize deletions server-side against post.authorId or a moderation role.' },

 /* ---- Events & RSVPs (3) ---- */
 { id: 'members-only-rsvp', feature: 'Events & RSVPs', name: 'Free Tier RSVPs to a Premium-Only Event', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'POST /event/:id/rsvp', how: 'The Premium Mastermind is premium-tier only, but the RSVP endpoint never checks tier. A free member RSVPs successfully.',
   hints: ['Event 1 is labelled premium-only.', 'Labels are not checks — try the endpoint.', 'RSVP to event 1 as Bob (free tier): the seat is yours.'],
   lesson: 'Tier gating must be enforced where the resource is granted — the RSVP endpoint — not just displayed in the UI.',
   impact: 'The entire paid tier loses its value: every premium event is open to free members who call the endpoint directly.',
   report: { title: 'Premium-Only Event RSVP Does Not Verify Member Tier', severity: 'Medium', remediation: 'Check the member\'s tier server-side before accepting an RSVP to a tier-restricted event.' },
   fix: 'Enforce tier restrictions in the RSVP handler, not in the page template.' },
 { id: 'capacity-overbook', feature: 'Events & RSVPs', name: 'Event Capacity Overbooking', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
   where: 'POST /event/:id/rsvp', how: 'The Community Meetup is capped at 2 seats and already full, but the RSVP endpoint never counts. RSVP anyway and the attendee list grows past capacity.',
   hints: ['Event 2 shows 2/2 seats taken.', 'Full is apparently also just a label.', 'RSVP to event 2: the booking is accepted and attendance exceeds the cap.'],
   lesson: 'Business invariants (capacity) must be checked at write time on the server; UI counters do not stop extra writes.',
   impact: 'Venues get over-filled, paid seats are oversold, and organisers face refunds and angry members — a business-logic failure, not just a bug.',
   report: { title: 'Event RSVP Does Not Enforce Capacity', severity: 'Medium', remediation: 'Atomically check current attendance against capacity inside the RSVP transaction.' },
   fix: 'Count confirmed RSVPs server-side and reject new ones once capacity is reached.' },
 { id: 'rsvp-cancel-idor', feature: 'Events & RSVPs', name: 'Cancel Another Member\'s RSVP (IDOR)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'POST /rsvp/:id/cancel', how: 'RSVP cancel takes a bare id with no ownership check. Cancel Carol\'s meetup seat from your own account.',
   hints: ['RSVPs have small sequential ids — Carol\'s meetup RSVP is id 1.', 'Your own "My RSVPs" page only lists yours, but the endpoint is open.', 'POST /rsvp/1/cancel as Alice: Carol\'s seat is cancelled.'],
   lesson: 'Identifiers are not authorization. Any id-addressable action must verify the object belongs to the caller.',
   impact: 'Members can sabotage each other — cancelling seats at sold-out events — a nasty harassment and denial-of-service vector inside the community.',
   report: { title: 'Missing Ownership Check on RSVP Cancellation (IDOR)', severity: 'Medium', remediation: 'Verify the RSVP belongs to the caller (or a moderator) before cancelling.' },
   fix: 'Authorize cancellations against rsvp.userId server-side.' },

 /* ---- Resource Library (2) ---- */
 { id: 'premium-download', feature: 'Resource Library', name: 'Free Tier Downloads Premium Resources', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'GET /resource/:id/download', how: 'The Premium Growth Vault is premium-only, but the download endpoint serves its file to any logged-in member who asks.',
   hints: ['Resource 2 is marked premium.', 'The detail page hides the button for free members — the endpoint does not hide anything.', 'As Bob (free), open /resource/2/download and read the vault file.'],
   lesson: 'Download endpoints are the resource. If they do not check the tier, the paywall is a screenshot, not a control.',
   impact: 'All premium content leaks to free members — the subscription model collapses and paying members feel cheated.',
   report: { title: 'Premium Resource Download Lacks Tier Enforcement', severity: 'Medium', remediation: 'Verify the member\'s tier on every premium download request.' },
   fix: 'Authorize downloads server-side against resource.tier and the caller\'s tier.' },
 { id: 'path-traversal', feature: 'Resource Library', name: 'Path Traversal in Resource Download Reads Server Files', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'GET /resource/:id/download?file=', how: 'The download handler joins the file parameter onto the files folder without sanitising. ../ sequences escape the folder and read arbitrary files — including server.js.',
   hints: ['The download accepts a file parameter.', 'Filenames with ../ climb out of the files directory.', 'Use file=../server.js on any download URL and read the application source.'],
   lesson: 'User-controlled file paths must be canonicalised and confined; string-joining a folder and a filename is an open door.',
   impact: 'Attackers read source code, configuration and any file the server can see — the first step to full server compromise.',
   report: { title: 'Path Traversal in Resource Download', severity: 'High', remediation: 'Resolve the requested path, verify it stays inside the files directory, and serve files by id, not by name.' },
   fix: 'Map resource ids to fixed filenames server-side and reject any resolved path outside the files directory.' },

 /* ---- Discussions (2) ---- */
 { id: 'stored-xss-post', feature: 'Discussions', name: 'Stored XSS in Discussion Posts', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
   where: 'POST /discussion/:id/reply → thread view', how: 'Discussion replies are stored and rendered raw. Post a script payload as a reply; it is served to everyone who opens the thread.',
   hints: ['Discussion bodies are rendered exactly as written.', 'What if a reply contains HTML?', 'Reply with <script>alert(1)</script> and reopen the thread.'],
   lesson: 'Rich community content is stored-XSS ground zero: every renderer must encode, every time.',
   impact: 'A single post infects the whole thread — every reader\'s session is exposed to theft and impersonation.',
   report: { title: 'Stored Cross-Site Scripting in Discussion Replies', severity: 'High', remediation: 'HTML-encode discussion content on render and sanitise any allowed markup.' },
   fix: 'Encode post bodies at render time; store text, render escaped.' },
 { id: 'thread-delete-bac', feature: 'Discussions', name: 'Delete Another Member\'s Discussion Thread', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'POST /discussion/:id/delete', how: 'Thread deletion checks nothing about authorship. Any member can delete any thread by id.',
   hints: ['Threads have sequential ids; Alice started thread 1.', 'The UI only offers delete to the author — the endpoint offers it to everyone.', 'POST /discussion/1/delete as Bob: Alice\'s thread disappears.'],
   lesson: 'Destructive actions need server-side ownership checks — UI-only restrictions are bypassed with one request.',
   impact: 'Trolls can wipe the community\'s discussion history thread by thread — pure vandalism with real community damage.',
   report: { title: 'Missing Ownership Check on Thread Deletion', severity: 'Medium', remediation: 'Only the thread author or a moderator may delete a thread; verify server-side.' },
   fix: 'Authorize deletion against thread.authorId or a moderation role.' },

 /* ---- Admin & Moderation (2) ---- */
 { id: 'admin-panel-bac', feature: 'Admin & Moderation', name: 'Admin Panel Served to Regular Members', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
   where: 'GET /admin', how: 'The admin panel — full member list with emails — is served to any signed-in user who opens /admin directly, whatever their role.',
   hints: ['Admin pages are linked only for admins, but the URL is guessable.', 'Try the obvious path as a plain member.', 'Open /admin as Bob: the full member list renders.'],
   lesson: 'URL secrecy is not access control. Every privileged page must check the role on the server.',
   impact: 'Every member can enumerate the entire community — names, emails, tiers, ban status — prime material for spam and targeted attacks.',
   report: { title: 'Admin Panel Accessible to Non-Admin Members', severity: 'High', remediation: 'Require the admin role server-side for every /admin route.' },
   fix: 'Add an admin-only authorization check to the panel handler.' },
 { id: 'admin-csrf', feature: 'Admin & Moderation', name: 'CSRF on Admin Ban Action', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
   where: 'POST /admin/ban', how: 'The admin ban endpoint has no anti-CSRF protection. A ban POST without the app\'s hx_origin marker still executes.',
   hints: ['Admin actions are state-changing POSTs — do they verify origin?', 'The marker cookie exists, but is it checked here?', 'As admin, POST /admin/ban for a user with no hx_origin cookie: the ban goes through.'],
   lesson: 'Privileged actions without CSRF tokens let attackers ride the admin\'s browser to ban members and worse.',
   impact: 'One malicious page visit by the admin can ban arbitrary members — attackers weaponise the admin\'s own session.',
   report: { title: 'Admin Ban Action Lacks CSRF Protection', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all admin state-changing actions.' },
   fix: 'Issue per-session CSRF tokens and verify them on every admin POST.' },

 /* ---- Platform & API (1) ---- */
 { id: 'weak-api-token', feature: 'Platform & API', name: 'API Token Is Just Base64 of the Member Email', owasp: 'A07:2021 Identification and Authentication Failures', difficulty: 'Intermediate',
   where: 'GET /api/members', how: 'The member API "authenticates" with a token that is simply base64(email) — a public value. Forge anyone\'s token and read the full member list without any session.',
   hints: ['The API expects an X-Api-Token header.', 'Tokens here are an encoding, not a secret — of something public.', 'Send X-Api-Token: base64 of alice@test.local with no cookies at all; the member list is yours.'],
   lesson: 'An API token must be an unguessable secret. Encoding a public identifier is obfuscation, not authentication.',
   impact: 'Anyone who knows (or guesses) a member email — they are in the directory — owns a working API key to the entire member database.',
   report: { title: 'API Authentication Token Is a Guessable Encoding of the Email', severity: 'High', remediation: 'Issue random, high-entropy API tokens, store them hashed, and scope them per member.' },
   fix: 'Replace email-derived tokens with random secrets verified server-side.' }
];

const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);
const TEST_BY_ID = {}; for (const t of TESTS) TEST_BY_ID[t.id] = t;

function totalDone() { return Object.keys(state.tests).filter(k => state.tests[k]).length; }
function pass(id) {
  if (!TEST_BY_ID[id] || state.tests[id]) return;
  state.tests[id] = true;
  if (totalDone() === TESTS.length && !state.completedAt) {
    state.completedAt = new Date().toISOString();
    state.keyRevealed = true;
  }
  saveState();
}
function attempt(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function pct() { return Math.floor(totalDone() / TESTS.length * 100); }
function resetTokenFor(u) { return 'HC' + u.id + '-' + ((u.id * 137 + 42) % 100000); }

/* ---- key material B (part 2 of 2) ---- */
const _eB = ['LTBVUw==', 'UFBTVA==', 'TEpFWg=='];
const _cB = ['LVk3Tg==', 'NzlZTw==', 'WlIwSg=='];
function entryKey() { return _asm(_eA, _eB); }
function completionKey() { return _asm(_cA, _cB); }

/* ---------------- HTTP plumbing ---------------- */
const sessions = new Map();
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function readBody(req) {
  return new Promise(res => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return res(JSON.parse(d || '{}')); } catch (e) { return res({}); } }
      const o = {}; for (const [k, v] of new URLSearchParams(d)) o[k] = v; res(o);
    });
    req.on('error', () => res({}));
  });
}
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function userOf(req) {
  const sid = parseCookies(req).hx_session;
  if (sid && sessions.has(sid)) return DB.users.find(u => u.id === sessions.get(sid)) || null;
  return null;
}
function startSession(res, userId) {
  const sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  sessions.set(sid, userId);
  res.setHeader('Set-Cookie', 'hx_session=' + sid + '; Path=/; HttpOnly');
}
function page(res, req, title, body, status) {
  const u = userOf(req);
  const done = totalDone(), p = pct();
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaCommunity</title>' +
  '<style>body{font-family:system-ui,Arial,sans-serif;margin:0;background:#f6f3ee;color:#222}header{background:#1d2733;color:#fff;padding:12px 20px}header a{color:#ffd98a;margin-right:14px;text-decoration:none}nav a{color:#cfe3ff;margin-right:12px;text-decoration:none}.bar{background:#3a4656;height:10px;border-radius:5px;margin-top:8px}.bar>i{display:block;height:10px;border-radius:5px;background:#e8a33d}main{max-width:920px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:16px;margin:12px 0}input,textarea,select{padding:7px;margin:4px 0;width:100%;box-sizing:border-box}button{background:#1d2733;color:#fff;border:0;padding:8px 14px;border-radius:5px;cursor:pointer}.tag{background:#eef;padding:2px 7px;border-radius:8px;font-size:12px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}</style></head><body>' +
  '<header><img src="/logo.png" alt="HexaCyberLab" style="height:28px;vertical-align:middle"> <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b>' +
  '<div>LAB ' + LAB_NUMBER + ' · ' + done + '/' + TESTS.length + ' tests · ' + p + '%</div><div class="bar"><i style="width:' + p + '%"></i></div>' +
  '<nav style="margin-top:8px"><a href="/">Home</a><a href="/directory">Directory</a><a href="/groups">Groups</a><a href="/events">Events</a><a href="/resources">Resources</a><a href="/discussions">Discussions</a><a href="/tests">Mission Board</a>' +
  (u ? '<a href="/profile">Profile (' + esc(u.email) + ')</a><a href="/logout">Logout</a>' : '<a href="/login">Login</a><a href="/register">Register</a>') + '</nav></header>' +
  '<main>' + body + '</main>' + chatWidget() + '</body></html>';
  res.writeHead(status || 200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=site; Path=/' });
  res.end(html);
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #999;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-family:system-ui">' +
  '<div style="background:#1d2733;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0"><b>Lab Coach</b> — HexaCommunity</div>' +
  '<div id="hxlog" style="height:180px;overflow:auto;padding:8px;font-size:13px"></div>' +
  '<div style="display:flex;gap:6px;padding:8px"><input id="hxmsg" style="flex:1;padding:6px" placeholder="Ask the coach..."><button onclick="hxSend()">Send</button></div>' +
  '<script>async function hxSend(){var m=document.getElementById("hxmsg");var log=document.getElementById("hxlog");if(!m.value)return;log.innerHTML+="<div><b>You:</b> "+m.value.replace(/</g,"&lt;")+"</div>";var r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m.value})});var j=await r.json();log.innerHTML+="<div><b>Coach:</b> "+j.reply.replace(/</g,"&lt;")+"</div>";m.value="";log.scrollTop=1e6;}</script></div>';
}
function gatePage(res) {
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head><body style="font-family:system-ui;max-width:560px;margin:60px auto;padding:0 16px">' +
  '<img src="/logo.png" alt="HexaCyberLab" style="height:40px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
  '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
  '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="width:100%;padding:9px"><br><br><button style="padding:9px 18px">Unlock Lab ' + LAB_NUMBER + '</button></form>' +
  chatWidget() + '</body></html>';
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function json(res, obj, status) { res.writeHead(status || 200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

/* ---------------- Lab Coach (POST /api/chat) ---------------- */
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'sign in', 'signin', 'reset', 'brute', 'sql', 'enumerat', 'cookie', 'demo cred']],
  ['Registration & Profile', ['register', 'registration', 'sign up', 'signup', 'profile', 'mass assignment', 'password policy']],
  ['Member Directory', ['directory', 'member list', 'search member', 'private profile', 'privacy']],
  ['Private Groups', ['group', 'private group', 'join', 'approval']],
  ['Events & RSVPs', ['event', 'rsvp', 'seat', 'capacity', 'meetup', 'mastermind']],
  ['Resource Library', ['resource', 'library', 'download', 'vault', 'playbook', 'traversal', 'file']],
  ['Discussions', ['discussion', 'thread', 'post', 'reply']],
  ['Admin & Moderation', ['admin', 'moderat', 'ban', 'panel']],
  ['Platform & API', ['api', 'token', 'endpoint']]
];
function coachReply(msgRaw) {
  const msg = String(msgRaw || '').toLowerCase();
  const done = totalDone(), complete = done === TESTS.length;
  if (/(who built|who made|who created|founder|who is behind)/.test(msg)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/key/.test(msg) && /(completion|next|unlock|lab 91|give|what|share|tell)/.test(msg)) {
    if (complete && state.keyRevealed) return 'You earned it — the completion key for LAB ' + LAB_NUMBER + ' (it unlocks Lab ' + (LAB_NUMBER + 1) + ') is: ' + completionKey();
    return 'I do not have the completion key yet — it is only revealed to me when this lab is completed 100%. Right now you are at ' + done + '/' + TESTS.length + ' tests (' + pct() + '%). Finish every test and I will share it.';
  }
  if (/progress|how am i|score|status/.test(msg)) {
    return 'Your progress: ' + done + '/' + TESTS.length + ' tests complete (' + pct() + '%). Open the Mission Board at /tests to see what is left.';
  }
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) { feature = f; break; }
  if (/(how many|list|which|what).*(vulnerab|test|features)|features/.test(msg) || (feature && /(how many|list|which|what tests|vulnerab)/.test(msg))) {
    if (feature) {
      const ts = TESTS.filter(t => t.feature === feature);
      return 'The "' + feature + '" feature has ' + ts.length + ' tests: ' + ts.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '. The map is public — the how-to is earned after 3 real tries.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' + FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Ask me about any feature by name.';
  }
  const wantsHow = /(how|help|guide|step|exploit|hack|solve|do i|bypass|attack)/.test(msg);
  if (feature && wantsHow) {
    const ts = TESTS.filter(t => t.feature === feature);
    const open = ts.filter(t => !state.tests[t.id]);
    if (!open.length) return 'You have already completed every test in "' + feature + '". Nicely done — pick another feature from the Mission Board.';
    const att = state.attempts[feature] || 0;
    if (att >= 3 || open.length === 0) {
      return 'Step by step for "' + feature + '" — you have tried ' + att + ' time(s), so the coach is unlocked:\n' + open.map(t => '• ' + t.name + ': ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (/^(hi|hello|hey|start)/.test(msg) || msg.length < 3) {
    return 'Welcome to LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '! This lab has ' + TESTS.length + ' security tests across ' + FEATURES.length + ' features. You are at ' + done + '/' + TESTS.length + ' (' + pct() + '%). Open /tests for the Mission Board, try each feature at least 3 times, then ask me how to solve it.';
  }
  if (feature) {
    const ts = TESTS.filter(t => t.feature === feature);
    const att = state.attempts[feature] || 0;
    return '"' + feature + '" has ' + ts.length + ' tests and you have tried it ' + att + ' time(s). Ask me "how do I solve the ' + feature + ' tests" once you have 3 real tries and I will guide you step by step.';
  }
  return 'I can explain the features and test counts freely, and I unlock step-by-step help for a feature after you have tried it at least 3 times. See the Mission Board at /tests, or ask me things like "how many tests in Private Groups?" or "how do I solve the login tests?".';
}

/* ---------------- routes ---------------- */
async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  const p = u.pathname;
  const cookies = parseCookies(req);
  try {
    if (p === '/logo.png') {
      const data = fs.readFileSync(path.join(DIR, 'logo.png'));
      res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(data);
    }
    if (p === '/api/progress') {
      const feats = {};
      for (const f of FEATURES) feats[f] = { total: TESTS.filter(t => t.feature === f).length, done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
      return json(res, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: totalDone(), pct: pct(), features: feats, complete: totalDone() === TESTS.length });
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const b = await readBody(req);
      return json(res, { reply: coachReply(b.message) });
    }
    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      const given = String(b.key || '');
      const want = entryKey();
      let same = given.length === want.length;
      for (let i = 0; i < want.length; i++) if (given[i] !== want[i]) same = false;
      if (same) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>403 — Wrong key.</h1><p>That is not the completion key from Lab ' + (LAB_NUMBER - 1) + '.</p>');
    }
    if (!state.unlocked) return gatePage(res);

    const user = userOf(req);

    /* ---------- home ---------- */
    if (p === '/' && req.method === 'GET') {
      return page(res, req, 'Home', '<h1>HexaCommunity</h1><p>One membership community: a member directory, private groups, events with RSVPs, a resource library and discussion spaces. Tiers: <span class="tag">free</span> <span class="tag">premium</span> · Roles: member, moderator, admin.</p>' +
        '<div class="card"><b>Explore:</b> <a href="/directory">Member Directory</a> · <a href="/groups">Groups</a> · <a href="/events">Events</a> · <a href="/resources">Resource Library</a> · <a href="/discussions">Discussions</a></div>' +
        '<div class="card"><b>Your mission:</b> ' + TESTS.length + ' security tests across ' + FEATURES.length + ' features. Current progress: ' + totalDone() + '/' + TESTS.length + ' (' + pct() + '%). Open the <a href="/tests">Mission Board</a>.</div>');
    }

    /* ---------- auth ---------- */
    if (p === '/login' && req.method === 'GET') {
      return page(res, req, 'Login', '<h1>Member Login</h1><form method="POST" action="/login"><input name="email" placeholder="Email"><input name="password" type="password" placeholder="Password"><button>Login</button></form>' +
        '<p><a href="/forgot">Forgot password?</a></p>' +
        '<div class="card"><b>Just looking?</b> Try the demo account — email: <b>demo@hexacommunity.local</b> · password: <b>demo1234</b></div>' +
        '<div class="card">Seeded member accounts (for local practice): alice@test.local / alice123 (premium) · bob@test.local / bob123 (free, private) · carol@test.local / carol123 · dave@test.local / dave123 · mod@hexacommunity.local / Mod12345 · admin@hexacommunity.local / Admin123!</div>');
    }
    if (p === '/login' && req.method === 'POST') {
      attempt('Login & Authentication');
      const b = await readBody(req);
      const email = String(b.email || ''), password = String(b.password || '');
      const where = "email = '" + email + "' AND password = '" + password + "'";
      const matched = DB.users.filter(r => evalWhere(where, r))[0];
      const exact = DB.users.find(r => r.email === email && r.password === password);
      if (matched) {
        if (!exact) pass('sqli-login');
        if (matched.demo) pass('demo-creds');
        startSession(res, matched.id);
        return redirect(res, '/');
      }
      const exists = DB.users.some(r => r.email === email);
      if (!state.extra.loginProbes.includes(email)) { state.extra.loginProbes.push(email); saveState(); }
      if (!state.extra.forgotProbes.includes(email)) { /* login probes counted separately below */ }
      const probeSet = new Set([...state.extra.loginProbes, ...state.extra.forgotProbes]);
      if (probeSet.size >= 5) pass('enumeration');
      const ex = state.extra; ex.fails[email] = (ex.fails[email] || 0) + 1; saveState();
      if (ex.fails[email] >= 10) pass('brute-force');
      return page(res, req, 'Login failed', '<h1>Login failed</h1><p>' + (exists ? 'Wrong password for this account.' : 'No account with that email exists here.') + '</p><p><a href="/login">Back to login</a></p>');
    }
    if (p === '/logout') {
      const sid = cookies.hx_session; if (sid) sessions.delete(sid);
      return redirect(res, '/login');
    }
    if (p === '/forgot' && req.method === 'GET') {
      return page(res, req, 'Forgot password', '<h1>Forgot password</h1><form method="POST" action="/forgot"><input name="email" placeholder="Your account email"><button>Send reset link</button></form>');
    }
    if (p === '/forgot' && req.method === 'POST') {
      attempt('Login & Authentication');
      const b = await readBody(req);
      const email = String(b.email || '');
      const target = DB.users.find(r => r.email === email);
      if (!state.extra.forgotProbes.includes(email)) { state.extra.forgotProbes.push(email); saveState(); }
      const probeSet = new Set([...state.extra.loginProbes, ...state.extra.forgotProbes]);
      if (probeSet.size >= 5) pass('enumeration');
      if (!target) return page(res, req, 'Forgot password', '<h1>No account found</h1><p>There is no member account registered with that email address.</p>');
      const token = resetTokenFor(target);
      DB.issuedTokens[target.id] = token;
      return page(res, req, 'Forgot password', '<h1>Reset email sent</h1><p>A password reset email is on its way to ' + esc(email) + '.</p><div class="card">(Simulated inbox) Your reset link: <a href="/reset?email=' + encodeURIComponent(email) + '&token=' + token + '">/reset?email=' + esc(email) + '&amp;token=' + token + '</a></div>');
    }
    if (p === '/reset' && req.method === 'GET') {
      return page(res, req, 'Reset password', '<h1>Reset password</h1><form method="POST" action="/reset"><input name="email" placeholder="Email" value="' + esc(u.searchParams.get('email') || '') + '"><input name="token" placeholder="Reset token" value="' + esc(u.searchParams.get('token') || '') + '"><input name="newpassword" type="password" placeholder="New password"><button>Set new password</button></form>');
    }
    if (p === '/reset' && req.method === 'POST') {
      attempt('Login & Authentication');
      const b = await readBody(req);
      const target = DB.users.find(r => r.email === String(b.email || ''));
      if (!target) return page(res, req, 'Reset password', '<h1>Reset failed</h1><p>No such account.</p>');
      const token = String(b.token || '');
      if (token === resetTokenFor(target)) {
        if (DB.issuedTokens[target.id] !== token) pass('reset-token'); // computed, never issued
        target.password = String(b.newpassword || 'changed123');
        delete DB.issuedTokens[target.id];
        return page(res, req, 'Reset password', '<h1>Password updated</h1><p>You can now <a href="/login">log in</a> with the new password.</p>');
      }
      return page(res, req, 'Reset password', '<h1>Reset failed</h1><p>That reset token is not valid.</p>');
    }
    if (p === '/mod' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Login & Authentication');
      const cookieRole = cookies.hx_role || '';
      if (user.role === 'moderator' || user.role === 'admin') {
        return page(res, req, 'Moderator Console', '<h1>Moderator Console</h1><div class="card">Welcome, ' + esc(user.name) + '. Pending group approvals: none. Reports queue: empty.</div>');
      }
      if (cookieRole === 'moderator' || cookieRole === 'admin') {
        pass('role-cookie');
        return page(res, req, 'Moderator Console', '<h1>Moderator Console</h1><div class="card">Welcome. (This console accepted a role taken from your browser cookie.) Group approvals and reports would live here.</div>');
      }
      return page(res, req, 'Forbidden', '<h1>403</h1><p>Moderators only.</p>', 403);
    }

    /* ---------- registration & profile ---------- */
    if (p === '/register' && req.method === 'GET') {
      return page(res, req, 'Register', '<h1>Join HexaCommunity</h1><form method="POST" action="/register"><input name="name" placeholder="Display name"><input name="email" placeholder="Email"><input name="password" type="password" placeholder="Password"><button>Create account</button></form>');
    }
    if (p === '/register' && req.method === 'POST') {
      attempt('Registration & Profile');
      const b = await readBody(req);
      const nu = { id: DB.nextUserId++, email: String(b.email || ''), password: String(b.password || ''), name: String(b.name || 'New Member'),
        role: b.role ? String(b.role) : 'member', tier: b.tier ? String(b.tier) : 'free',
        priv: false, listed: true, phone: String(b.phone || ''), bio: '', banned: false, demo: false };
      DB.users.push(nu);
      if (nu.password.length === 1) pass('weak-password');
      if (nu.role !== 'member' || nu.tier === 'premium') pass('mass-assignment');
      if (XSS_PAT.test(nu.name)) pass('stored-xss-profile');
      startSession(res, nu.id);
      return redirect(res, '/');
    }
    if (p === '/profile' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      return page(res, req, 'Profile', '<h1>Your profile</h1><div class="card">Name: ' + user.name + '<br>Email: ' + esc(user.email) + '<br>Role: ' + esc(user.role) + ' · Tier: ' + esc(user.tier) + '<br>Bio: ' + esc(user.bio || '') + '</div>' +
        '<form method="POST" action="/profile"><input name="name" placeholder="Display name" value="' + esc(user.name) + '"><input name="bio" placeholder="Bio" value="' + esc(user.bio || '') + '"><button>Save profile</button></form>');
    }
    if (p === '/profile' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Registration & Profile');
      const b = await readBody(req);
      if (!cookies.hx_origin) pass('csrf-profile');
      if (b.name !== undefined) user.name = String(b.name);
      if (b.bio !== undefined) user.bio = String(b.bio);
      if (XSS_PAT.test(user.name)) pass('stored-xss-profile');
      return redirect(res, '/profile');
    }

    /* ---------- member directory ---------- */
    if (p === '/directory' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Member Directory');
      const q = u.searchParams.get('q');
      let rows;
      if (q !== null && q !== '') {
        const where = "name LIKE '%" + q + "%' AND listed = 1";
        rows = DB.users.filter(r => evalWhere(where, r));
        if (rows.some(r => !r.listed)) pass('search-sqli');
        if (XSS_PAT.test(q)) pass('reflected-xss');
      } else {
        rows = DB.users.filter(r => r.listed);
      }
      const heading = q ? '<h2>Results for: ' + q + '</h2>' : ''; // reflected raw on purpose: the reflected-XSS flaw
      const list = rows.map(r => '<tr><td>' + r.name + '</td><td><span class="tag">' + esc(r.tier) + '</span></td><td><a href="/member/' + r.id + '">View profile</a></td></tr>').join('');
      return page(res, req, 'Member Directory', '<h1>Member Directory</h1><form method="GET" action="/directory"><input name="q" placeholder="Search members by name"><button>Search</button></form>' + heading +
        '<table><tr><th>Member</th><th>Tier</th><th></th></tr>' + list + '</table><p>Private members keep their contact details hidden.</p>');
    }
    if (p.startsWith('/member/') && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Member Directory');
      const target = DB.users.find(r => r.id === parseInt(p.split('/')[2], 10));
      if (!target) return page(res, req, 'Not found', '<h1>404</h1><p>No such member.</p>', 404);
      if (target.priv && user.id !== target.id && user.role !== 'admin') pass('private-profile-leak');
      return page(res, req, 'Member profile', '<h1>' + target.name + '</h1><div class="card">Email: ' + esc(target.email) + '<br>Phone: ' + esc(target.phone || '') + '<br>Tier: ' + esc(target.tier) + ' · Role: ' + esc(target.role) + '<br>Bio: ' + esc(target.bio || '') + '<br>Profile visibility: ' + (target.priv ? 'PRIVATE' : 'public') + '</div>');
    }

    /* ---------- groups ---------- */
    if (p === '/groups' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Private Groups');
      const list = DB.groups.map(g => '<div class="card"><b><a href="/group/' + g.id + '">' + esc(g.name) + '</a></b> ' + (g.priv ? '<span class="tag">PRIVATE</span>' : '<span class="tag">public</span>') + ' · ' + g.members.length + ' members</div>').join('');
      return page(res, req, 'Groups', '<h1>Groups</h1>' + list);
    }
    if (p.startsWith('/group/') && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Private Groups');
      const g = DB.groups.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!g) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      const isMember = g.members.includes(user.id);
      if (g.priv && !isMember && user.role !== 'admin') pass('private-group-access');
      const posts = g.posts.map(gp => { const a = DB.users.find(x => x.id === gp.authorId); return '<div class="card"><b>' + (a ? a.name : '?') + ':</b> ' + esc(gp.body) + ' <form method="POST" action="/grouppost/' + gp.id + '/delete" style="display:inline"><button>Delete post</button></form></div>'; }).join('');
      const joinBox = isMember ? '<p>You are a member of this group.</p>' : '<form method="POST" action="/group/' + g.id + '/join"><button>Request to join</button></form>';
      const postBox = isMember ? '<form method="POST" action="/group/' + g.id + '/post"><textarea name="body" placeholder="Write to the group..."></textarea><button>Post</button></form>' : '';
      return page(res, req, g.name, '<h1>' + esc(g.name) + '</h1>' + (g.priv ? '<p><span class="tag">PRIVATE GROUP</span></p>' : '') + joinBox + postBox + posts);
    }
    if (p.startsWith('/group/') && p.endsWith('/join') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Private Groups');
      const b = await readBody(req);
      const g = DB.groups.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!g) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      if (g.members.includes(user.id)) return redirect(res, '/group/' + g.id);
      if (g.priv && g.approval) {
        if (b.approved === '1' || b.approved === 'true' || b.approved === 'yes') {
          g.members.push(user.id); pass('group-join-bypass');
          return redirect(res, '/group/' + g.id);
        }
        return page(res, req, 'Join requested', '<h1>Request sent</h1><p>Your request to join ' + esc(g.name) + ' is pending moderator approval.</p>');
      }
      g.members.push(user.id);
      return redirect(res, '/group/' + g.id);
    }
    if (p.startsWith('/group/') && p.endsWith('/post') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Private Groups');
      const b = await readBody(req);
      const g = DB.groups.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!g) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      g.posts.push({ id: DB.nextPostId++, authorId: user.id, body: String(b.body || '') });
      return redirect(res, '/group/' + g.id);
    }
    if (p.startsWith('/grouppost/') && p.endsWith('/delete') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Private Groups');
      const pid = parseInt(p.split('/')[2], 10);
      for (const g of DB.groups) {
        const idx = g.posts.findIndex(x => x.id === pid);
        if (idx >= 0) {
          if (g.posts[idx].authorId !== user.id && user.role !== 'moderator' && user.role !== 'admin') pass('group-post-idor');
          g.posts.splice(idx, 1);
          return redirect(res, '/group/' + g.id);
        }
      }
      return page(res, req, 'Not found', '<h1>404</h1>', 404);
    }

    /* ---------- events & RSVPs ---------- */
    if (p === '/events' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Events & RSVPs');
      const list = DB.events.map(e => {
        const att = DB.rsvps.filter(r => r.eventId === e.id);
        const mine = att.filter(r => r.userId === user.id);
        return '<div class="card"><b>' + esc(e.name) + '</b> ' + (e.tierOnly ? '<span class="tag">' + esc(e.tierOnly) + ' only</span>' : '<span class="tag">all tiers</span>') + ' · Seats: ' + att.length + '/' + e.capacity +
          '<form method="POST" action="/event/' + e.id + '/rsvp"><button>RSVP</button></form>' +
          mine.map(r => 'Your RSVP #' + r.id + ' <form method="POST" action="/rsvp/' + r.id + '/cancel" style="display:inline"><button>Cancel my RSVP</button></form>').join('') + '</div>';
      }).join('');
      const all = DB.rsvps.map(r => { const u2 = DB.users.find(x => x.id === r.userId); const e2 = DB.events.find(x => x.id === r.eventId); return '<tr><td>#' + r.id + '</td><td>' + (e2 ? esc(e2.name) : '') + '</td><td>' + (u2 ? esc(u2.email) : '') + '</td></tr>'; }).join('');
      return page(res, req, 'Events', '<h1>Events</h1>' + list + '<h2>All RSVPs</h2><table><tr><th>RSVP</th><th>Event</th><th>Member</th></tr>' + all + '</table>');
    }
    if (p.startsWith('/event/') && p.endsWith('/rsvp') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Events & RSVPs');
      const e = DB.events.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!e) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      if (e.tierOnly === 'premium' && user.tier !== 'premium') pass('members-only-rsvp');
      const count = DB.rsvps.filter(r => r.eventId === e.id).length;
      DB.rsvps.push({ id: DB.nextRsvpId++, eventId: e.id, userId: user.id });
      if (count + 1 > e.capacity) pass('capacity-overbook');
      return redirect(res, '/events');
    }
    if (p.startsWith('/rsvp/') && p.endsWith('/cancel') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Events & RSVPs');
      const rid = parseInt(p.split('/')[2], 10);
      const idx = DB.rsvps.findIndex(r => r.id === rid);
      if (idx >= 0) {
        if (DB.rsvps[idx].userId !== user.id) pass('rsvp-cancel-idor');
        DB.rsvps.splice(idx, 1);
      }
      return redirect(res, '/events');
    }

    /* ---------- resource library ---------- */
    if (p === '/resources' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Resource Library');
      const list = DB.resources.map(r => '<div class="card"><b><a href="/resource/' + r.id + '">' + esc(r.name) + '</a></b> <span class="tag">' + esc(r.tier) + '</span><br>' + esc(r.desc) + '</div>').join('');
      return page(res, req, 'Resource Library', '<h1>Resource Library</h1>' + list);
    }
    if (p.startsWith('/resource/') && p.endsWith('/download') && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Resource Library');
      const r = DB.resources.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!r) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      const fname = u.searchParams.get('file') || r.file;
      const resolved = path.resolve(FILES_DIR, fname);
      if (!resolved.startsWith(FILES_DIR)) pass('path-traversal');
      if (r.tier === 'premium' && user.tier !== 'premium' && resolved.startsWith(FILES_DIR)) pass('premium-download');
      let data;
      try { data = fs.readFileSync(resolved); } catch (e) { return page(res, req, 'Not found', '<h1>404</h1><p>File not found.</p>', 404); }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(data);
    }
    if (p.startsWith('/resource/') && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Resource Library');
      const r = DB.resources.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!r) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      const btn = (r.tier === 'premium' && user.tier !== 'premium')
        ? '<p><span class="tag">premium</span> Upgrade to premium to download this resource.</p>'
        : '<p><a href="/resource/' + r.id + '/download?file=' + encodeURIComponent(r.file) + '"><button>Download</button></a></p>';
      return page(res, req, r.name, '<h1>' + esc(r.name) + '</h1><div class="card">' + esc(r.desc) + '<br>Tier: ' + esc(r.tier) + '</div>' + btn);
    }

    /* ---------- discussions ---------- */
    if (p === '/discussions' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Discussions');
      const list = DB.threads.map(t => { const a = DB.users.find(x => x.id === t.authorId); return '<div class="card"><b><a href="/discussion/' + t.id + '">' + esc(t.title) + '</a></b> by ' + (a ? a.name : '?') + ' · ' + t.posts.length + ' posts</div>'; }).join('');
      return page(res, req, 'Discussions', '<h1>Discussions</h1>' + list + '<h2>Start a thread</h2><form method="POST" action="/discussions"><input name="title" placeholder="Thread title"><textarea name="body" placeholder="Opening post"></textarea><button>Create thread</button></form>');
    }
    if (p === '/discussions' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Discussions');
      const b = await readBody(req);
      if (XSS_PAT.test(String(b.body || ''))) pass('stored-xss-post');
      const t = { id: DB.nextThreadId++, authorId: user.id, title: String(b.title || 'Untitled'), posts: [{ authorId: user.id, body: String(b.body || '') }] };
      DB.threads.push(t);
      return redirect(res, '/discussion/' + t.id);
    }
    if (p.startsWith('/discussion/') && p.endsWith('/reply') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Discussions');
      const b = await readBody(req);
      const t = DB.threads.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!t) return page(res, req, 'Not found', '<h1>404</h1>', 404);
      if (XSS_PAT.test(String(b.body || ''))) pass('stored-xss-post');
      t.posts.push({ authorId: user.id, body: String(b.body || '') });
      return redirect(res, '/discussion/' + t.id);
    }
    if (p.startsWith('/discussion/') && p.endsWith('/delete') && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Discussions');
      const tid = parseInt(p.split('/')[2], 10);
      const idx = DB.threads.findIndex(x => x.id === tid);
      if (idx >= 0) {
        if (DB.threads[idx].authorId !== user.id && user.role !== 'moderator' && user.role !== 'admin') pass('thread-delete-bac');
        DB.threads.splice(idx, 1);
      }
      return redirect(res, '/discussions');
    }
    if (p.startsWith('/discussion/') && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Discussions');
      const t = DB.threads.find(x => x.id === parseInt(p.split('/')[2], 10));
      if (!t) return page(res, req, 'Not found', '<h1>404</h1><p>No such thread.</p>', 404);
      const posts = t.posts.map(dp => { const a = DB.users.find(x => x.id === dp.authorId); return '<div class="card"><b>' + (a ? a.name : '?') + ':</b> ' + dp.body + '</div>'; }).join('');
      return page(res, req, t.title, '<h1>' + esc(t.title) + '</h1>' + posts +
        '<form method="POST" action="/discussion/' + t.id + '/reply"><textarea name="body" placeholder="Reply..."></textarea><button>Reply</button></form>' +
        '<form method="POST" action="/discussion/' + t.id + '/delete"><button>Delete thread</button></form>');
    }

    /* ---------- admin & moderation ---------- */
    if (p === '/admin' && req.method === 'GET') {
      if (!user) return redirect(res, '/login');
      attempt('Admin & Moderation');
      if (user.role === 'member') pass('admin-panel-bac');
      const rows = DB.users.map(x => '<tr><td>' + x.id + '</td><td>' + x.name + '</td><td>' + esc(x.email) + '</td><td>' + esc(x.role) + '</td><td>' + esc(x.tier) + '</td><td>' + (x.banned ? 'BANNED' : 'active') + '</td><td><form method="POST" action="/admin/ban"><input type="hidden" name="userId" value="' + x.id + '"><button>Ban</button></form></td></tr>').join('');
      return page(res, req, 'Admin Panel', '<h1>Admin Panel</h1><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Tier</th><th>Status</th><th></th></tr>' + rows + '</table>');
    }
    if (p === '/admin/ban' && req.method === 'POST') {
      if (!user) return redirect(res, '/login');
      attempt('Admin & Moderation');
      if (user.role !== 'admin') return page(res, req, 'Forbidden', '<h1>403</h1><p>Admins only.</p>', 403);
      const b = await readBody(req);
      if (!cookies.hx_origin) pass('admin-csrf');
      const target = DB.users.find(x => x.id === parseInt(b.userId, 10));
      if (target) target.banned = true;
      return redirect(res, '/admin');
    }

    /* ---------- platform API ---------- */
    if (p === '/api/members' && req.method === 'GET') {
      attempt('Platform & API');
      const token = req.headers['x-api-token'] || u.searchParams.get('token') || '';
      let decoded = '';
      try { decoded = Buffer.from(String(token), 'base64').toString('utf8'); } catch (e) {}
      const owner = DB.users.find(x => x.email === decoded);
      if (!owner) return json(res, { error: 'invalid api token' }, 401);
      if (!user || user.email !== decoded) pass('weak-api-token');
      return json(res, { members: DB.users.map(x => ({ id: x.id, name: x.name, email: x.email, tier: x.tier, role: x.role, phone: x.phone, priv: x.priv })) });
    }

    /* ---------- mission board / complete / certificate ---------- */
    if (p === '/tests' && req.method === 'GET') {
      let html = '<h1>Mission Board — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + totalDone() + '/' + TESTS.length + ' tests complete (' + pct() + '%). Tests flip to done only when the exploit really works — server-side.</p>';
      for (const f of FEATURES) {
        html += '<h2>' + esc(f) + '</h2><p>Attempts on this feature: ' + (state.attempts[f] || 0) + '</p>';
        for (const t of TESTS.filter(x => x.feature === f)) {
          html += '<div class="card"><b>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</b> <span class="tag">' + esc(t.owasp) + '</span> <span class="tag">' + esc(t.difficulty) + '</span>' +
            t.hints.map((h, i) => '<details><summary>Hint ' + (i + 1) + '</summary>' + esc(h) + '</details>').join('') + '</div>';
        }
      }
      return page(res, req, 'Mission Board', html);
    }
    if (p === '/complete' && req.method === 'GET') {
      if (totalDone() !== TESTS.length) {
        const left = TESTS.filter(t => !state.tests[t.id]).map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('');
        return page(res, req, 'Not complete yet', '<h1>Not yet — ' + totalDone() + '/' + TESTS.length + ' (' + pct() + '%)</h1><p>Remaining tests:</p><ul>' + left + '</ul>');
      }
      const perF = FEATURES.map(f => '<li><b>' + esc(f) + '</b>: ' + TESTS.filter(t => t.feature === f).length + ' vulnerabilities</li>').join('');
      const ways = TESTS.map(t => '<li>' + esc(t.name) + ' — ' + esc(t.owasp) + '</li>').join('');
      const learned = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.lesson) + '</li>').join('');
      const client = TESTS.map(t => '<li><b>' + esc(t.name) + ':</b> ' + esc(t.impact) + '</li>').join('');
      const reportSec = TESTS.map(t => '<li><b>' + esc(t.report.title) + '</b> — Severity: ' + esc(t.report.severity) + ' — Remediation: ' + esc(t.report.remediation) + '</li>').join('');
      return page(res, req, 'Lab complete', '<h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': 100% complete</h1>' +
        '<h2>1) Features in this lab</h2><p>Total features: ' + FEATURES.length + '</p>' +
        '<h2>2) Vulnerabilities per feature</h2><ul>' + perF + '</ul>' +
        '<h2>3) How testing was done — ' + TESTS.length + ' techniques</h2><ul>' + ways + '</ul>' +
        '<h2>4) What you learned</h2><ul>' + learned + '</ul>' +
        '<h2>5) What this means for a real client</h2><ul>' + client + '</ul>' +
        '<h2>6) Writing it in a real report</h2><ul>' + reportSec + '</ul>' +
        '<div class="card"><h2>Your completion key (unlocks Lab ' + (LAB_NUMBER + 1) + ')</h2><p style="font-size:20px"><b>' + completionKey() + '</b></p></div>' +
        '<form method="POST" action="/complete/name"><input name="name" placeholder="Your name for the certificate" value="' + esc(state.testerName) + '"><button>Save name</button></form>' +
        '<p><a href="/certificate">View your certificate</a></p>');
    }
    if (p === '/complete/name' && req.method === 'POST') {
      const b = await readBody(req);
      state.testerName = String(b.name || '').slice(0, 80); saveState();
      return redirect(res, '/complete');
    }
    if (p === '/certificate' && req.method === 'GET') {
      if (totalDone() !== TESTS.length) return page(res, req, 'Certificate', '<h1>Certificate locked</h1><p>Complete 100% of the tests first — you are at ' + pct() + '%.</p>');
      const name = state.testerName || (user ? user.name : 'Community Tester');
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{button{display:none}}body{font-family:Georgia,serif;background:#eee}.cert{max-width:720px;margin:40px auto;background:#fff;border:3px solid #1d2733;border-radius:12px;padding:36px;text-align:center}</style></head><body>' +
      '<div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:64px"><h1>Certificate of Completion</h1>' +
      '<p>This certifies that</p><h2>' + esc(name) + '</h2>' +
      '<p>has completed 100% of the security tests in <b>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</b> (' + TESTS.length + ' tests across ' + FEATURES.length + ' features)</p>' +
      '<p>Completed on ' + esc(date) + '</p><p><i>HexaCyberLab — Built by Md. Jony Hassain, Founder</i></p>' +
      '<button onclick="window.print()">Print certificate</button></div></body></html>';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    return page(res, req, 'Not found', '<h1>404</h1><p>Page not found.</p>', 404);
  } catch (e) {
    try { res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Internal error — the lab stays up. Try again.'); } catch (e2) {}
  }
}

/* ---------------- docs generation (from the registry) ---------------- */
function genDocs() {
  const T = TESTS;
  let vuln = '# HexaCommunity — Vulnerabilities (complete test map)\n\nLAB 90 — HexaCommunity (Category 9: Media, Social & Community). ' + T.length + ' scored tests across ' + FEATURES.length + ' features. Every test flips only on server-side detection of the real exploit effect.\n';
  for (const f of FEATURES) {
    vuln += '\n## ' + f + '\n';
    for (const t of T.filter(x => x.feature === f)) vuln += '\n### ' + t.name + '\n- OWASP: ' + t.owasp + '\n- Difficulty: ' + t.difficulty + '\n- Location: ' + t.where + '\n- Exploitation outline: ' + t.how + '\n- Impact: ' + t.impact + '\n';
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let prac = '# HexaCommunity — Practice Guide\n\nChallenges grouped by feature, then difficulty. Each challenge mirrors the /tests Mission Board. Objective for every challenge: make its test flip to done on the Mission Board by producing the real effect described.\n';
  for (const f of FEATURES) {
    prac += '\n## ' + f + '\n';
    for (const t of T.filter(x => x.feature === f).sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      prac += '\n### [' + t.difficulty + '] ' + t.name + '\n- Objective: ' + t.how + '\n- Hints:\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), prac);
  let fix = '# HexaCommunity — Fix & Retest Guide\n\nFor every test: the finding as it appears in a real report, the secure implementation, and the regression check.\n';
  for (const t of T) {
    fix += '\n## ' + t.report.title + '\n- Severity: ' + t.report.severity + '\n- Feature: ' + t.feature + ' (' + t.where + ')\n- Remediation: ' + t.report.remediation + '\n- Secure implementation: ' + t.fix + '\n- Regression test: Repeat the original exploit (' + t.how + ') — it must now fail, and the test must stay un-passed on a fresh progress file.\n';
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated for ' + T.length + ' tests');
}

if (process.argv.includes('--gen-docs')) { genDocs(); process.exit(0); }

const server = http.createServer((req, res) => { handle(req, res).catch(() => { try { res.writeHead(500); res.end('error'); } catch (e) {} }); });
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT));
}
module.exports = { TESTS, FEATURES, entryKey, completionKey };
