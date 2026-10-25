'use strict';
/*
 * HexaSocial — LAB 81 (Category 9: Media, Social & Community)
 * A deliberately vulnerable social-network training lab.
 * LOCAL USE ONLY. Zero-dependency Node.js. Binds 127.0.0.1:3090.
 * All data is fake, in-memory seed data. Built by Md. Jony Hassain, Founder of HexaCyberLab.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NAME = 'HexaSocial';
const LAB_NUMBER = 81;
const PORT = 3090;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * UI theme fragments (harmless constants used by the page renderer)  *
 * ------------------------------------------------------------------ */
const THEME = { accent: '#7c5cff', accent2: '#2ea6ff', bg: '#0f1220', card: '#171b30', text: '#e8eaf6', muted: '#9aa3c7' };
           // renderer cache key parts (1/3)
const NAV_LINKS = [['/', 'Feed'], ['/search', 'Search'], ['/messages', 'Messages'], ['/groups', 'Groups'], ['/tests', 'Mission Board'], ['/complete', 'Debrief']];

/* ------------------------------------------------------------------ *
 * Seed data (all fake)                                               *
 * ------------------------------------------------------------------ */
let nextUserId = 100, nextPostId = 100, nextCommentId = 100, nextConvId = 100, nextGroupId = 100, nextMsgId = 100;

const users = [
  { id: 1, email: 'admin@hexasocial.local', password: 'admin123', name: 'Site Admin', role: 'admin', isPrivate: false, verified: true, fakeFollowers: 0, bio: 'I run HexaSocial.' },
  { id: 2, email: 'alice@test.local', password: 'alice123', name: 'Alice Rivers', role: 'user', isPrivate: false, verified: false, fakeFollowers: 0, bio: 'Photographer & coffee fan.' },
  { id: 3, email: 'bob@test.local', password: 'bob123', name: 'Bob Stone', role: 'user', isPrivate: false, verified: false, fakeFollowers: 0, bio: 'Climber. Occasionally online.' },
  { id: 4, email: 'carol@test.local', password: 'carol123', name: 'Carol Wren', role: 'user', isPrivate: true, verified: false, fakeFollowers: 0, bio: 'Private account. Close friends only.' },
  { id: 5, email: 'dave@test.local', password: 'dave123', name: 'Dave Kim', role: 'user', isPrivate: false, verified: false, fakeFollowers: 0, bio: 'Indie game dev.' },
  { id: 6, email: 'demo@hexasocial.local', password: 'demo123', name: 'Demo Dana', role: 'user', isPrivate: false, verified: false, fakeFollowers: 0, bio: 'Demo account shown on the login page.' },
  { id: 7, email: 'mod@hexasocial.local', password: 'mod123', name: 'Molly Mod', role: 'moderator', isPrivate: false, verified: true, fakeFollowers: 0, bio: 'Community moderator.' },
];

const posts = [
  { id: 1, authorId: 2, body: 'Sunrise over the harbour this morning. No filter needed.', visibility: 'public' },
  { id: 2, authorId: 3, body: 'Finally topped the red route at the climbing gym!', visibility: 'public' },
  { id: 3, authorId: 4, body: 'Diary entry: thinking of quitting my job next month. Please keep this between us.', visibility: 'private' },
  { id: 4, authorId: 4, body: 'For my followers only: early photos from the studio session.', visibility: 'followers' },
  { id: 5, authorId: 5, body: 'Shipping my game demo next week — wish me luck!', visibility: 'public' },
  { id: 6, authorId: 2, body: 'Followers-only sneak peek of the new gallery.', visibility: 'followers' },
];

// follow edges: {from, to, status: 'following' | 'pending'}
let follows = [
  { from: 3, to: 2, status: 'following' },
  { from: 2, to: 3, status: 'following' },
  { from: 5, to: 2, status: 'following' },
  { from: 2, to: 4, status: 'following' }, // Alice is an approved follower of Carol
];

let comments = [
  { id: 1, postId: 1, authorId: 3, body: 'Beautiful shot, Alice!' },
  { id: 2, postId: 2, authorId: 2, body: 'Congrats Bob, that route is brutal.' },
  { id: 3, postId: 5, authorId: 2, body: 'Rooting for you, Dave!' },
];

let likes = [ { postId: 1, userId: 3 }, { postId: 1, userId: 5 }, { postId: 2, userId: 2 } ];

let conversations = [
  { id: 1, participants: [3, 4], messages: [
    { id: 1, from: 3, body: 'Hey Carol, did you get the studio keys back?' },
    { id: 2, from: 4, body: 'Yes — and please do not share my new address with anyone.' },
  ]},
  { id: 2, participants: [2, 3], messages: [
    { id: 3, from: 2, body: 'Climbing on Saturday?' },
    { id: 4, from: 3, body: 'In. Bringing the new rope.' },
  ]},
];

const groups = [
  { id: 1, name: 'Harbour Photographers', isPrivate: false, ownerId: 2, members: [{ userId: 2, role: 'admin' }, { userId: 3, role: 'member' }], posts: [{ authorId: 2, body: 'Golden hour meetup this Friday at the pier.' }] },
  { id: 2, name: 'Studio Inner Circle', isPrivate: true, ownerId: 4, members: [{ userId: 4, role: 'admin' }], posts: [{ authorId: 4, body: 'SECRET: the unreleased pricing sheet is linked in the group drive.' }] },
];

const sessions = new Map();        // sid -> userId
const issuedResetTokens = {};      // userId -> token actually issued via /forgot
const loginFailures = {};          // email -> failed login count
const probedEmails = new Set();    // distinct emails probed via login/forgot (enumeration detection)
           // renderer cache key parts (2/3)

function userById(id) { return users.find(u => u.id === Number(id)) || null; }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()) || null; }
function resetTokenFor(id) { return 'HXS-' + id + '-' + ((id * 137 + 42) % 100000); }
function followerCount(uid) { return follows.filter(f => f.to === uid && f.status === 'following').length + (userById(uid) ? userById(uid).fakeFollowers : 0); }
function isFollowing(from, to) { return follows.some(f => f.from === from && f.to === to && f.status === 'following'); }

/* ------------------------------------------------------------------ *
 * TESTS registry — the heart of the lab system                       *
 * ------------------------------------------------------------------ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a string.', "Try an email that closes the quote and adds an always-true condition.", "Example shape: admin@hexasocial.local' OR '1'='1' -- (any password)."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself, bypassing the password check entirely.',
    impact: 'On a real client site this means anyone can sign in as the administrator without knowing any password — full account takeover in seconds.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries everywhere and never build SQL with string concatenation.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Pick one real account and keep guessing its password.', 'Notice the server never slows down, CAPTCHAs, or locks the account.', 'Ten wrong passwords in a row for the same account proves the point.'],
    lesson: 'Without throttling or lockout, an attacker can try unlimited passwords until one works.',
    impact: 'Attackers can grind through password lists against a client\u2019s real users and eventually walk in through the front door.',
    report: { title: 'Missing Rate Limiting and Account Lockout on Login', severity: 'High', remediation: 'Add progressive delays, lockout after repeated failures, and alerting on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Forgot-Password Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error message for an email that exists vs one that does not.', 'The forgot-password form answers differently too.', 'Probe at least five different email addresses and watch the responses split into two kinds.'],
    lesson: 'Different error messages for "no such account" and "wrong password" reveal exactly which email addresses are registered.',
    impact: 'Attackers harvest a client\u2019s real user list and aim phishing and password attacks only at accounts that exist.',
    report: { title: 'User Enumeration Through Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic message for all failed logins and password-reset requests.' } },
  { id: 'auth-demo', feature: 'Login & Authentication', name: 'Demo / Default Credentials Published on the Login Page', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Read the login page carefully — it is surprisingly generous.', 'A working demo account is printed right there for visitors.', 'Just sign in with the published demo email and password.'],
    lesson: 'Demo and default accounts left active in production are pre-made doors for attackers.',
    impact: 'Anyone on the internet can sign in to a live client account using credentials the site itself advertises.',
    report: { title: 'Active Demo Account with Credentials Published on Login Page', severity: 'High', remediation: 'Remove demo/default accounts from production or disable them and rotate their passwords.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset for your own account and study the token format.', 'The token is derived from something public and guessable about the account.', 'Compute the token for a DIFFERENT account (it is based on the user id) and reset their password without ever requesting it.'],
    lesson: 'Reset tokens must be long, random, and single-use — anything derived from the user id can be computed by an attacker.',
    impact: 'An attacker who knows a victim\u2019s user id can reset their password and take over the account without touching their inbox.',
    report: { title: 'Predictable Password Reset Token Allows Account Takeover', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG (at least 128 bits), expire them quickly, and make them single-use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Role Cookie Tampering into the Moderator Queue', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets — one of them states your role.', 'The /moderator page trusts that cookie instead of the server-side account.', 'Edit the cookie value to moderator and reload /moderator as a normal user.'],
    lesson: 'Authorization data must live on the server; anything stored client-side can be edited by the user.',
    impact: 'Ordinary users can promote themselves to moderator on a client\u2019s platform and read or act on private moderation data.',
    report: { title: 'Client-Side Role Cookie Trusted for Authorization (Privilege Escalation)', severity: 'High', remediation: 'Determine roles from the server-side session record on every request; never trust role cookies.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weakpass', feature: 'Registration & Profile', name: 'Weak Password Policy — 1-Character Passwords Accepted', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a fresh account and try the shortest password imaginable.', 'There is no minimum length or complexity check at all.', 'A single-character password is accepted.'],
    lesson: 'A password policy that accepts anything guarantees weak credentials across the user base.',
    impact: 'Client users end up with passwords that fall to the first guesses of any automated attack.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Enforce a minimum length (12+ recommended) and block common/breached passwords.' } },
  { id: 'reg-massassign', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Follower Count at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form only shows a few fields, but the server copies across whatever you POST.', 'Add fields the form never offered, like role or followers.', 'POST /register with role=admin (or a large followers value) and check what your new account became.'],
    lesson: 'Binding request bodies directly to data models lets attackers set privileged fields the UI never exposed.',
    impact: 'Attackers self-register as administrators — or inflate their follower counts — on a client\u2019s platform from day one.',
    report: { title: 'Mass Assignment in Registration Allows Privilege and Metric Manipulation', severity: 'High', remediation: 'Whitelist exactly the fields a request may set; assign roles and counters server-side only.' } },
  { id: 'reg-storedxss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on profiles and feeds exactly as typed.', 'Register (or rename) with a name containing an HTML/JS payload.', 'Use a payload like <script>alert(1)</script> or <svg onload=alert(1)> as the display name.'],
    lesson: 'User-controlled text that is stored and rendered unescaped executes in other people\u2019s browsers.',
    impact: 'An attacker\u2019s profile can run scripts in the browsers of every visitor — stealing sessions and defacing a client\u2019s community.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user content on output and validate input server-side.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The app sets an hx_origin marker cookie on its own pages — but never checks it.', 'Make a profile-update POST without that marker (e.g. plain curl with only your session cookie).', 'If the change sticks, a malicious page could have made the same request from your browser.'],
    lesson: 'State-changing requests without an anti-CSRF token can be forged by any site the victim visits.',
    impact: 'Attackers can silently rewrite a client user\u2019s profile, bio, or settings while they browse an unrelated page.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on all state-changing requests and verify Origin/Referer.' } },

  /* ---- Search & Discovery ---- */
  { id: 'search-sqli', feature: 'Search & Discovery', name: 'SQL Injection in People Search Dumps Private Accounts', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Search normally first: private accounts are hidden and emails are masked.', 'The search box feeds the same string-built query style as the login form.', "Try a query like ' OR '1'='1 and see whose records come back."],
    lesson: 'Injection in a search feature leaks whatever the underlying query can reach, not just what the UI shows.',
    impact: 'Private members\u2019 names and email addresses can be dumped in bulk from a client\u2019s community.',
    report: { title: 'SQL Injection in Search Exposes Private User Records', severity: 'High', remediation: 'Parameterise the search query and enforce privacy filters in the data layer, not the UI.' } },
  { id: 'search-reflectedxss', feature: 'Search & Discovery', name: 'Reflected XSS in Search Results', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The results page repeats your search term back to you.', 'It repeats it without any encoding.', 'Search for a payload like <svg onload=alert(1)> and view the page source.'],
    lesson: 'Echoing request input into HTML without encoding turns a link into a script-delivery vehicle.',
    impact: 'Attackers send crafted search links that run scripts in a client user\u2019s browser under the site\u2019s own domain.',
    report: { title: 'Reflected Cross-Site Scripting in Search', severity: 'Medium', remediation: 'HTML-encode all reflected input and add a Content-Security-Policy header.' } },

  /* ---- Posts & Feed ---- */
  { id: 'post-idor-read', feature: 'Posts & Feed', name: 'IDOR — Read Private & Followers-Only Posts', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Posts have simple sequential ids in their URLs.', 'The post page never checks the post\u2019s visibility against you.', 'Open /post/3 (a private diary post) or /post/4 (followers-only) while signed in as someone who should not see them.'],
    lesson: 'Sequential ids plus missing ownership checks expose every object in the system.',
    impact: 'Private posts and followers-only content on a client\u2019s network can be read by complete strangers.',
    report: { title: 'Insecure Direct Object Reference Exposes Private Posts', severity: 'High', remediation: 'Check the requester\u2019s relationship to each object\u2019s visibility on every read.' } },
  { id: 'post-idor-edit', feature: 'Posts & Feed', name: 'IDOR — Edit Another User\u2019s Post', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The edit endpoint trusts the post id in the request.', 'It never asks whether the post belongs to you.', 'POST /post/2/edit with a new body while signed in as a different user.'],
    lesson: 'Write endpoints need the same ownership checks as read endpoints — often they are forgotten.',
    impact: 'Attackers can rewrite other people\u2019s posts on a client\u2019s platform, planting scams or defamation under a trusted name.',
    report: { title: 'Missing Ownership Check Allows Editing Other Users\u2019 Posts', severity: 'High', remediation: 'Verify object ownership server-side before any update.' } },
  { id: 'post-idor-delete', feature: 'Posts & Feed', name: 'IDOR — Delete Another User\u2019s Post', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Deletion is just another POST with a post id.', 'Like edit, it performs no ownership check.', 'POST /post/5/delete as a different user and watch the post disappear.'],
    lesson: 'Destructive actions are the highest-value IDOR targets and must be authorized per object.',
    impact: 'A single request can erase a client community\u2019s content — posts, announcements, evidence — with no recovery path.',
    report: { title: 'Missing Ownership Check Allows Deleting Other Users\u2019 Posts', severity: 'High', remediation: 'Verify object ownership server-side before any destructive action.' } },
  { id: 'post-storedxss', feature: 'Posts & Feed', name: 'Stored XSS in Post Body', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Post bodies are rendered raw into everyone\u2019s feed.', 'Write a post containing an HTML/JS payload.', 'A payload like <svg onload=alert(1)> in a new post is stored and served to all viewers.'],
    lesson: 'Feed content is the highest-reach stored-XSS surface on any social platform.',
    impact: 'One malicious post can execute scripts for every follower who scrolls past it on a client\u2019s network.',
    report: { title: 'Stored Cross-Site Scripting in Post Body', severity: 'High', remediation: 'Encode post bodies on output and sanitise any allowed markup.' } },

  /* ---- Social Graph ---- */
  { id: 'graph-forced-follow', feature: 'Social Graph', name: 'Forced Follow — Follow Action Forged for Another User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The follow endpoint accepts an optional "from" field in the POST body.', 'The server trusts it instead of using your session.', 'POST /follow with to=<you> and from=<a victim\u2019s id> — the victim now "follows" you.'],
    lesson: 'The acting user must always come from the session, never from request parameters.',
    impact: 'Attackers can manufacture followers and fake social proof, or implicate victims in follows they never made.',
    report: { title: 'Follow Action Trusts Client-Supplied Actor Id (Forced Follow)', severity: 'Medium', remediation: 'Derive the actor exclusively from the authenticated session; ignore actor fields in request bodies.' } },
  { id: 'graph-private-bypass', feature: 'Social Graph', name: 'Private-Account Follow Approval Bypass', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Following a private account normally creates a pending request.', 'The follow endpoint also honours an "approved" field from the request.', 'POST /follow to Carol (id 4) with approved=1 and you are instantly an approved follower.'],
    lesson: 'Workflow states must be set by the party who owns the decision — here, the account being followed.',
    impact: 'Private accounts on a client\u2019s platform can be silently infiltrated, exposing content shared with close friends only.',
    report: { title: 'Follow-Approval Workflow Bypass for Private Accounts', severity: 'High', remediation: 'Create follow requests as pending server-side; only the target account can approve them.' } },

  /* ---- Comments & Likes ---- */
  { id: 'comment-idor-delete', feature: 'Comments & Likes', name: 'IDOR — Delete Another User\u2019s Comment', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Comment deletion is a POST with a comment id.', 'No check ties the comment to your account.', 'POST /comment/1/delete while signed in as someone else.'],
    lesson: 'Every object-level action — read, edit, delete — needs its own authorization check.',
    impact: 'Attackers can censor discussions and remove evidence of abuse on a client\u2019s platform at will.',
    report: { title: 'Missing Ownership Check Allows Deleting Other Users\u2019 Comments', severity: 'Medium', remediation: 'Verify comment ownership (or moderator role) server-side before deletion.' } },
  { id: 'like-forgery', feature: 'Comments & Likes', name: 'Like Forgery — Like Recorded as Another User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The like endpoint accepts an optional userId in the POST body.', 'It records the like under whoever you name.', 'POST /like for a post with userId set to another user\u2019s id.'],
    lesson: 'Engagement actions must be attributed to the session user only.',
    impact: 'Like counts — a trust and ranking signal on a client\u2019s platform — can be inflated or framed onto innocent users.',
    report: { title: 'Like Action Trusts Client-Supplied User Id (Engagement Forgery)', severity: 'Medium', remediation: 'Attribute likes to the session user server-side and enforce one like per user per post.' } },

  /* ---- Direct Messages ---- */
  { id: 'dm-idor-read', feature: 'Direct Messages', name: 'IDOR — Read Other People\u2019s Private Conversations', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Conversation URLs carry a simple numeric id.', 'The messages page never checks that you are a participant.', 'Open /messages/1 while signed in as Alice — that conversation is between Bob and Carol.'],
    lesson: 'Private messaging is the most sensitive IDOR surface there is; participant checks are non-negotiable.',
    impact: 'Every private conversation on a client\u2019s platform can be read by any signed-in user — a catastrophic privacy breach.',
    report: { title: 'Insecure Direct Object Reference Exposes Private Direct Messages', severity: 'Critical', remediation: 'Verify the requester is a conversation participant on every message read and write.' } },
  { id: 'dm-send-as-other', feature: 'Direct Messages', name: 'Send a Direct Message as Another User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['The send endpoint accepts an optional "from" field.', 'It files the message under whoever you name, participant or not.', 'POST /messages/2/send with from=3 and a body — Bob appears to have written it.'],
    lesson: 'Message authorship must come from the session; trusting a from-field enables perfect impersonation.',
    impact: 'Attackers can impersonate any user in private messages — ideal for fraud and social engineering inside a client\u2019s community.',
    report: { title: 'Direct Message Sender Spoofing via Client-Supplied From Field', severity: 'High', remediation: 'Set the sender from the authenticated session and verify conversation participation.' } },

  /* ---- Groups ---- */
  { id: 'group-join-private', feature: 'Groups', name: 'Join a Private Group Without Approval', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Private groups are supposed to be invite/approval only.', 'The join endpoint forgets to enforce that for private groups.', 'POST /groups/2/join as an outsider and you are immediately a member of the Studio Inner Circle.'],
    lesson: 'Membership gates must be enforced in the join action itself, not just hidden in the UI.',
    impact: 'Closed communities on a client\u2019s platform — support groups, paid circles — can be entered by anyone.',
    report: { title: 'Private Group Join Lacks Approval Enforcement', severity: 'High', remediation: 'For private groups, create a pending request that only the group owner/admin can approve.' } },
  { id: 'group-feed-idor', feature: 'Groups', name: 'Read a Private Group\u2019s Posts as a Non-Member', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['A group\u2019s page shows its posts to whoever asks.', 'Membership is never checked on the read path.', 'Open /group/2 while signed in as a non-member and read the Inner Circle\u2019s secret post.'],
    lesson: 'Hiding a link is not access control; the data endpoint must check membership every time.',
    impact: 'Everything shared inside a client\u2019s private groups can leak to the whole platform.',
    report: { title: 'Private Group Content Served Without Membership Check', severity: 'High', remediation: 'Check group membership server-side before serving any group content.' } },

  /* ---- Admin & Platform ---- */
  { id: 'admin-bac', feature: 'Admin & Platform', name: 'Admin Panel Open to Any Signed-In User', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Try the obvious administration URL while signed in as a normal user.', 'There is no role check on it at all.', 'Open /admin as Alice and browse the full user table, passwords included.'],
    lesson: 'Admin routes must verify the role on the server for every single request.',
    impact: 'Any registered user reaches the client\u2019s control panel and its full user/password listing — total platform compromise.',
    report: { title: 'Broken Access Control on Admin Panel (No Role Verification)', severity: 'Critical', remediation: 'Enforce an admin-role check server-side on all administrative routes.' } },
  { id: 'platform-debug', feature: 'Admin & Platform', name: 'Unauthenticated /api/debug Dumps All User Records', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers love leaving a debug endpoint behind.', 'This one needs no login at all.', 'Fetch /api/debug in a fresh browser with no cookies and read every account, passwords included.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every other control.',
    impact: 'The entire user database of a client\u2019s platform is one unauthenticated request away from any attacker.',
    report: { title: 'Unauthenticated Debug Endpoint Exposes Full User Database', severity: 'Critical', remediation: 'Remove debug endpoints from production builds and require admin auth for diagnostics.' } },
];
const TEST_BY_ID = {}; TESTS.forEach(t => TEST_BY_ID[t.id] = t);
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ------------------------------------------------------------------ *
 * Progress engine + persistence (§4)                                 *
 * ------------------------------------------------------------------ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const p = JSON.parse(raw); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch (e) { /* fresh */ }
  FEATURES.forEach(f => { if (typeof progress.attempts[f] !== 'number') progress.attempts[f] = 0; });
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {} }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function isComplete() { return doneCount() === TESTS.length; }
function pass(id) {
  if (!TEST_BY_ID[id] || progress.tests[id]) return;
  progress.tests[id] = true;
  if (isComplete() && !progress.completedAt) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
  saveProgress();
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
loadProgress();

/* ------------------------------------------------------------------ *
 * Key material — stored ONLY as transformed shards, scattered        *
 * through this file and reassembled at runtime (§7).                 *
 * ------------------------------------------------------------------ */
           // renderer cache key parts (3/3)
function _unshard(parts) { return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '486d394b7a972bfd38bff95d041ac8c392cfd65caecb634ccdf72f71c5e585ae';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
const _fragD = ['TC1YSA==', 'RS0yOA=='];           // certificate watermark parts (1/3)
const _fragE = ['VzhVWA==', 'LTlXTg=='];           // certificate watermark parts (2/3)
const _fragF = ['QVVIQw==', 'U1dJVA=='];           // certificate watermark parts (3/3)
function completionKey() { return _unshard([].concat(_fragD, _fragE, _fragF)); }

/* ------------------------------------------------------------------ *
 * HTTP helpers                                                       *
 * ------------------------------------------------------------------ */
function parseCookies(req) {
  const out = {}; const raw = req.headers.cookie || '';
  raw.split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const ct = (req.headers['content-type'] || '');
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } return; }
      const out = {}; new URLSearchParams(data).forEach((v, k) => out[k] = v); resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function sessionUser(req) { const sid = parseCookies(req).hx_session; if (sid && sessions.has(sid)) return userById(sessions.get(sid)); return null; }
function startSession(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  // NOTE (intentional flaw): the role is ALSO mirrored into a client-editable cookie, and /moderator trusts it.
  res.setHeader('Set-Cookie', [`hx_session=${sid}; Path=/; HttpOnly`, `hx_role=${user.role}; Path=/`]);
}
const XSS_RE = /<script|onerror=|onload=|<svg|<img[^>]*onerror|<iframe|javascript:/i;
function hasXSS(s) { return XSS_RE.test(String(s || '')); }
function looksLikeSQLi(s) { const v = String(s || '').toLowerCase(); return v.includes("'") && (/or\s+('?1'?\s*=\s*'?1|1\s*=\s*1|true)/.test(v) || v.includes('--') || v.includes('/*') || /union\s+select/.test(v)); }

/* ------------------------------------------------------------------ *
 * Page layout (§5)                                                   *
 * ------------------------------------------------------------------ */
function layout(req, title, content) {
  const done = doneCount(), p = pct();
  const u = sessionUser(req);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — HexaSocial (LAB ${LAB_NUMBER})</title>
<style>body{background:${THEME.bg};color:${THEME.text};font-family:system-ui,Arial,sans-serif;margin:0}
header{background:${THEME.card};padding:10px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header img{height:34px} a{color:${THEME.accent2}} .bar{background:#33395e;border-radius:6px;height:12px;width:220px;display:inline-block;vertical-align:middle}
.bar>i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,${THEME.accent},${THEME.accent2});width:${p}%}
main{max-width:920px;margin:22px auto;padding:0 16px} .card{background:${THEME.card};border-radius:10px;padding:16px;margin:12px 0}
input,textarea,select{background:#0d1022;color:${THEME.text};border:1px solid #33395e;border-radius:6px;padding:7px;margin:3px 0}
button{background:${THEME.accent};color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}
.mut{color:${THEME.muted}} .pill{border:1px solid #33395e;border-radius:20px;padding:2px 9px;font-size:12px}
#hxchat{position:fixed;right:14px;bottom:14px;width:320px;background:${THEME.card};border:1px solid #33395e;border-radius:10px;padding:10px;z-index:50}
#hxchatlog{height:150px;overflow:auto;font-size:13px;margin-bottom:8px;white-space:pre-wrap}</style></head>
<body><header><img src="/logo.png" alt="HexaCyberLab"><strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
<span>Progress: ${done}/${TESTS.length} tests · ${p}% <span class="bar"><i></i></span></span>
<nav>${NAV_LINKS.map(l => `<a href="${l[0]}">${l[1]}</a>`).join(' · ')}</nav>
<span class="mut">${u ? 'Signed in as ' + u.name + ' (' + u.email + ')' + ' · <a href="/logout">Logout</a>' : '<a href="/login">Login</a>'}</span></header>
<main>${content}</main>
<div id="hxchat"><strong>Lab Coach</strong><div id="hxchatlog">Hi! I am the HexaSocial Lab Coach. Ask me what this lab contains, or how to approach a feature (after you have tried it yourself 3 times).</div>
<form id="hxchatform"><input id="hxchatin" style="width:70%" placeholder="Ask the coach..." autocomplete="off"><button>Send</button></form></div>
<script>var f=document.getElementById('hxchatform');f.addEventListener('submit',function(e){e.preventDefault();var inp=document.getElementById('hxchatin');var log=document.getElementById('hxchatlog');var msg=inp.value;inp.value='';log.textContent+='\n\nYou: '+msg;fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})}).then(function(r){return r.json()}).then(function(j){log.textContent+='\n\nCoach: '+j.reply;log.scrollTop=log.scrollHeight;});});</script>
</body></html>`;
}
function gatePage(req) {
  return layout(req, 'Locked', `<div class="card"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME} is locked</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" style="width:60%"><button>Unlock</button></form></div>`);
}

/* ------------------------------------------------------------------ *
 * Lab Coach chatbot (§6)                                             *
 * ------------------------------------------------------------------ */
function featureFromMessage(m) {
  const t = m.toLowerCase();
  const map = [
    ['Login & Authentication', ['login', 'authentication', 'password', 'brute', 'reset token', 'sign in', 'signin', 'cookie']],
    ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'csrf']],
    ['Search & Discovery', ['search', 'discovery']],
    ['Posts & Feed', ['post', 'feed']],
    ['Social Graph', ['follow', 'social graph', 'graph']],
    ['Comments & Likes', ['comment', 'like']],
    ['Direct Messages', ['message', 'dm', 'direct message', 'conversation']],
    ['Groups', ['group']],
    ['Admin & Platform', ['admin', 'debug', 'platform']],
  ];
  for (const [f, keys] of map) if (keys.some(k => t.includes(k))) return f;
  return null;
}
function chatReply(message) {
  const m = String(message || '');
  const t = m.toLowerCase();
  if (/who (built|made|created|developed)|founder|who is behind/.test(t)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/\bkey\b|unlock next|completion code/.test(t)) {
    if (isComplete() && progress.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — well earned. The completion key (which unlocks the next lab) is: ' + completionKey();
    return 'I do not have the completion key yet — it is only revealed to me when this lab reaches 100%. Right now you are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and I will be able to share it.';
  }
  const f = featureFromMessage(m);
  if (f && /how|guide|help|step|do i|attack|exploit|solve/.test(t)) {
    const fTests = TESTS.filter(x => x.feature === f);
    const open = fTests.filter(x => !progress.tests[x.id]);
    if (progress.attempts[f] >= 3 || open.length === 0) {
      if (open.length === 0) return 'You have already completed every ' + f + ' test. Excellent work.';
      const lines = open.map(x => '• ' + x.name + ' — Step by step: ' + x.hints[2] + ' (' + x.lesson + ')');
      return 'Step by step for ' + f + ':\n' + lines.join('\n');
    }
    return 'That feature is locked for help. First try the ' + f + ' tests yourself at least 3 times — I can see you\'ve tried ' + (progress.attempts[f] || 0) + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (f && /how many|count|which|list|vulnerabilit|tests/.test(t)) {
    const fTests = TESTS.filter(x => x.feature === f);
    return f + ' has ' + fTests.length + ' tests: ' + fTests.map(x => x.name + (progress.tests[x.id] ? ' (done)' : '')).join('; ') + '.';
  }
  if (/how many|how much|progress|status|score/.test(t)) {
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features (' + FEATURES.join(', ') + '). Your progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).';
  }
  if (/next|what should|where/.test(t)) {
    const next = TESTS.find(x => !progress.tests[x.id]);
    if (!next) return 'Everything is complete — visit /complete for your debrief and certificate.';
    return 'Next open test: "' + next.name + '" in ' + next.feature + ' (' + next.difficulty + '). See the Mission Board at /tests — each test shows 3 graded hints. Remember: I can only give step-by-step help for a feature after you have tried it at least 3 times.';
  }
  return 'I can tell you what this lab contains (ask about a feature, e.g. "how many tests in Login & Authentication?"), what to try next, or — after you have tried a feature at least 3 times — give step-by-step guidance. The full map is on the Mission Board at /tests.';
}

/* ------------------------------------------------------------------ *
 * Page renderers (deliberately render user content RAW — that is     *
 * the vulnerability these labs teach)                                *
 * ------------------------------------------------------------------ */
function loginPage(req, msg) {
  return layout(req, 'Login', `<div class="card"><h2>Sign in to HexaSocial</h2>
${msg ? '<p style="color:#ff8a8a">' + msg + '</p>' : ''}
<form method="POST" action="/login"><input name="email" placeholder="Email" style="width:60%"><br>
<input name="password" type="password" placeholder="Password" style="width:60%"><br><button>Sign in</button></form>
<p class="mut">New here? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password</a></p>
<p class="pill">Try the demo account — email: demo@hexasocial.local · password: demo123</p>
<p class="mut">Seeded accounts (password = name123): alice@test.local, bob@test.local, carol@test.local (private), dave@test.local.</p></div>`);
}
function registerPage(req, msg) {
  return layout(req, 'Register', `<div class="card"><h2>Create your HexaSocial account</h2>
${msg ? '<p>' + msg + '</p>' : ''}
<form method="POST" action="/register"><input name="name" placeholder="Display name" style="width:60%"><br>
<input name="email" placeholder="Email" style="width:60%"><br>
<input name="password" type="password" placeholder="Password" style="width:60%"><br><button>Register</button></form></div>`);
}
function feedPage(req) {
  const u = sessionUser(req);
  const cards = posts.map(p => { const a = userById(p.authorId); return `<div class="card"><strong>${a ? a.name : '?'}</strong> <span class="pill">${p.visibility}</span>
<p>${p.body}</p><p class="mut"><a href="/post/${p.id}">Open post #${p.id}</a> · ${likes.filter(l => l.postId === p.id).length} likes · ${comments.filter(c => c.postId === p.id).length} comments</p></div>`; }).join('');
  return layout(req, 'Feed', `<div class="card"><h2>Your feed</h2>
<form method="POST" action="/post"><input name="body" placeholder="Share something..." style="width:70%">
<select name="visibility"><option>public</option><option>followers</option><option>private</option></select><button>Post</button></form></div>${cards}`);
}
function profilePage(req, target) {
  const u = sessionUser(req);
  const theirPosts = posts.filter(p => p.authorId === target.id);
  return layout(req, 'Profile', `<div class="card"><h2>${target.name}</h2>
<p class="mut">${target.email} · ${target.isPrivate ? 'Private account' : 'Public account'} · ${followerCount(target.id)} followers · role: ${target.role}</p>
<p>${target.bio || ''}</p>
${u && u.id !== target.id ? `<form method="POST" action="/follow"><input type="hidden" name="to" value="${target.id}"><button>Follow</button></form>` : ''}
${u && u.id === target.id ? `<h3>Update profile</h3><form method="POST" action="/profile/update"><input name="name" value="${target.name}" style="width:50%"><br><textarea name="bio" rows="2" cols="50">${target.bio || ''}</textarea><br><button>Save</button></form>` : ''}
</div><h3>Posts</h3>${theirPosts.map(p => `<div class="card"><span class="pill">${p.visibility}</span><p>${p.body}</p><p class="mut"><a href="/post/${p.id}">Open post #${p.id}</a></p></div>`).join('') || '<p class="mut">No posts yet.</p>'}`);
}
function postPage(req, p) {
  const a = userById(p.authorId);
  const cs = comments.filter(c => c.postId === p.id);
  return layout(req, 'Post', `<div class="card"><strong>${a ? a.name : '?'}</strong> <span class="pill">${p.visibility}</span><p>${p.body}</p>
<p class="mut">${likes.filter(l => l.postId === p.id).length} likes</p>
<form method="POST" action="/like"><input type="hidden" name="postId" value="${p.id}"><button>Like</button></form>
<form method="POST" action="/post/${p.id}/edit"><input name="body" value="" placeholder="Edit this post..." style="width:60%"><button>Edit</button></form>
<form method="POST" action="/post/${p.id}/delete"><button>Delete post</button></form></div>
<h3>Comments</h3>${cs.map(c => { const ca = userById(c.authorId); return `<div class="card"><strong>${ca ? ca.name : '?'}</strong><p>${c.body}</p><form method="POST" action="/comment/${c.id}/delete"><button>Delete comment</button></form></div>`; }).join('')}
<div class="card"><form method="POST" action="/comment"><input type="hidden" name="postId" value="${p.id}"><input name="body" placeholder="Write a comment..." style="width:60%"><button>Comment</button></form></div>`);
}
function messagesPage(req) {
  const u = sessionUser(req);
  const list = conversations.map(c => `<div class="card"><a href="/messages/${c.id}">Conversation #${c.id}</a> — participants: ${c.participants.map(id => (userById(id) || {}).name).join(' & ')} · ${c.messages.length} messages</div>`).join('');
  return layout(req, 'Messages', `<h2>Direct messages</h2>${list}`);
}
function conversationPage(req, c) {
  return layout(req, 'Conversation', `<div class="card"><h2>Conversation #${c.id}</h2>
${c.messages.map(m2 => { const a = userById(m2.from); return `<p><strong>${a ? a.name : '?'}:</strong> ${m2.body}</p>`; }).join('')}
<form method="POST" action="/messages/${c.id}/send"><input name="body" placeholder="Type a message..." style="width:60%"><button>Send</button></form></div>`);
}
function groupsPage(req) {
  return layout(req, 'Groups', `<h2>Groups</h2>` + groups.map(g => `<div class="card"><a href="/group/${g.id}">${g.name}</a> <span class="pill">${g.isPrivate ? 'private' : 'public'}</span> <span class="mut">${g.members.length} members</span>
<form method="POST" action="/groups/${g.id}/join"><button>Join group</button></form></div>`).join(''));
}
function groupPage(req, g) {
  return layout(req, 'Group', `<div class="card"><h2>${g.name}</h2><p class="mut">${g.isPrivate ? 'Private group' : 'Public group'} · members: ${g.members.map(m2 => (userById(m2.userId) || {}).name).join(', ')}</p>
${g.posts.map(p => { const a = userById(p.authorId); return `<div class="card"><strong>${a ? a.name : '?'}</strong><p>${p.body}</p></div>`; }).join('')}</div>`);
}
function adminPage(req) {
  const rows = users.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${x.email}</td><td>${x.password}</td><td>${x.role}</td><td>${x.isPrivate ? 'private' : 'public'}</td></tr>`).join('');
  return layout(req, 'Admin', `<div class="card"><h2>Admin panel — all users</h2><table border="1" cellpadding="6" cellspacing="0"><tr><th>id</th><th>name</th><th>email</th><th>password</th><th>role</th><th>privacy</th></tr>${rows}</table></div>`);
}
function moderatorPage(req) {
  return layout(req, 'Moderator', `<div class="card"><h2>Moderator queue</h2><p>Reported content awaiting review:</p>
<p>• Post #2 flagged for spam (reporter notes contain internal case ref MOD-7731).</p><p>• User dave@test.local flagged for impersonation review.</p></div>`);
}
function testsPage(req) {
  const sections = FEATURES.map(f => {
    const ft = TESTS.filter(t => t.feature === f);
    const rows = ft.map(t => `<div class="card"><strong>${progress.tests[t.id] ? '✓' : '○'} ${t.name}</strong>
<span class="pill">${t.owasp}</span> <span class="pill">${t.difficulty}</span> <span class="mut">attempts on this feature: ${progress.attempts[f] || 0}</span>
<details><summary>Hint 1</summary><p>${t.hints[0]}</p><details><summary>Hint 2</summary><p>${t.hints[1]}</p><details><summary>Hint 3</summary><p>${t.hints[2]}</p></details></details></details></div>`).join('');
    return `<h3>${f} (${ft.filter(t => progress.tests[t.id]).length}/${ft.length})</h3>${rows}`;
  }).join('');
  return layout(req, 'Mission Board', `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2><p class="mut">${doneCount()}/${TESTS.length} tests · ${pct()}%</p>${sections}`);
}
function completePage(req) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${t.name} (${t.feature})</li>`).join('');
    return layout(req, 'Debrief', `<div class="card"><h2>Not yet complete</h2><p>Progress: ${doneCount()}/${TESTS.length} (${pct()}%). Still to solve:</p><ul>${left}</ul></div>`);
  }
  const perFeature = FEATURES.map(f => { const ft = TESTS.filter(t => t.feature === f); return `<li><strong>${f}</strong>: ${ft.length} vulnerabilities</li>`; }).join('');
  const ways = TESTS.map(t => `<li>${t.name} — ${t.owasp}</li>`).join('');
  const learned = TESTS.map(t => `<li><strong>${t.name}:</strong> ${t.lesson}</li>`).join('');
  const client = TESTS.map(t => `<li><strong>${t.name}:</strong> ${t.impact}</li>`).join('');
  const report = TESTS.map(t => `<li><strong>${t.report.title}</strong> [${t.report.severity}] — Fix: ${t.report.remediation}</li>`).join('');
  return layout(req, 'Debrief', `<div class="card"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}: Completion Debrief</h2>
<h3>1. Total features in this lab</h3><p>${FEATURES.length} features</p>
<h3>2. Vulnerabilities per feature</h3><ul>${perFeature}</ul>
<h3>3. How testing was done (${TESTS.length} techniques)</h3><ul>${ways}</ul>
<h3>4. What you learned</h3><ul>${learned}</ul>
<h3>5. What this means for a real client</h3><ul>${client}</ul>
<h3>6. Writing it in a real report</h3><ul>${report}</ul>
<h3>Your completion key</h3><p>Lab complete at 100%. The completion key — which unlocks Lab ${LAB_NUMBER + 1} — is:</p>
<p style="font-size:20px"><strong>${completionKey()}</strong></p>
<form method="POST" action="/complete/name"><input name="testerName" placeholder="Your name for the certificate" value="${progress.testerName || ''}"><button>Save name</button></form>
<p><a href="/certificate">View your certificate</a></p></div>`);
}
function certificatePage(req) {
  if (!isComplete()) return layout(req, 'Certificate', `<div class="card"><h2>Certificate locked</h2><p>Complete 100% of the tests first (${pct()}% so far).</p></div>`);
  const name = progress.testerName || 'HexaSocial Tester';
  const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
<style>body{font-family:Georgia,serif;background:#f4f1ea}@media print{body{background:#fff}}.cert{max-width:720px;margin:40px auto;background:#fff;border:3px double #7c5cff;padding:36px;text-align:center}img{height:70px}</style></head>
<body><div class="cert"><img src="/logo.png" alt="HexaCyberLab"><h1>Certificate of Completion</h1>
<p>This certifies that</p><h2>${name}</h2>
<p>has completed 100% of the security tests in LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${FEATURES.length} features)</p>
<p>Completed on ${date}</p><p><em>HexaCyberLab — Built by Md. Jony Hassain, Founder</em></p></div></body></html>`;
}

/* ------------------------------------------------------------------ *
 * Router + vulnerable endpoints with server-side detection (§3)      *
 * ------------------------------------------------------------------ */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    const p = u.pathname;
    const cookies = parseCookies(req);
    const me = sessionUser(req);

    if (p === '/logo.png') { try { const img = fs.readFileSync(LOGO_FILE); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(img); } catch (e) { send(res, 404, 'no logo'); } return; }

    if (p === '/api/chat' && req.method === 'POST') { const b = await readBody(req); send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json'); return; }

    if (p === '/api/progress') {
      const features = {}; FEATURES.forEach(f => { const ft = TESTS.filter(t => t.feature === f); features[f] = { total: ft.length, done: ft.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 }; });
      send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() }), 'application/json'); return;
    }

    if (p === '/unlock' && req.method === 'POST') {
      const b = await readBody(req);
      const given = String(b.key || '');
      if (entryKeyMatches(given)) { progress.unlocked = true; saveProgress(); redirect(res, '/'); }
      else send(res, 403, layout(req, 'Locked', '<div class="card"><h2>Wrong key</h2><p>That key was rejected. Keys are case-sensitive and must be pasted in full.</p><p><a href="/">Back</a></p></div>'));
      return;
    }

    // Set the benign same-site marker cookie on GET pages (the app itself never verifies it — CSRF flaw).
    if (req.method === 'GET' && me) res.setHeader('Set-Cookie', `hx_origin=${crypto.randomBytes(6).toString('hex')}; Path=/`);

    if (!progress.unlocked) { send(res, 200, gatePage(req)); return; }

    /* ---------- public / auth routes ---------- */
    if (p === '/login' && req.method === 'GET') { send(res, 200, loginPage(req, u.searchParams.get('e') ? decodeURIComponent(u.searchParams.get('e')) : '')); return; }
    if (p === '/login' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const email = String(b.email || '').toLowerCase(), password = String(b.password || '');
      probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum');
      let user = null, sqli = false;
      if (looksLikeSQLi(email)) {
        // Simulated string-built query: WHERE email = '<email>' AND password = '<password>'
        const prefix = email.split("'")[0];
        user = userByEmail(prefix) || users[0];
        sqli = true;
      } else {
        const cand = userByEmail(email);
        if (cand && cand.password === password) user = cand;
        else if (cand) {
          loginFailures[email] = (loginFailures[email] || 0) + 1;
          if (loginFailures[email] >= 10) pass('auth-brute');
          redirect(res, '/login?e=' + encodeURIComponent('Incorrect password for that account.')); return;
        } else { redirect(res, '/login?e=' + encodeURIComponent('No account with that email exists.')); return; }
      }
      if (user) {
        if (sqli) pass('auth-sqli');
        if (user.email === 'demo@hexasocial.local') pass('auth-demo');
        startSession(res, user); redirect(res, '/'); return;
      }
      redirect(res, '/login?e=' + encodeURIComponent('Login failed.')); return;
    }
    if (p === '/logout') { const sid = cookies.hx_session; if (sid) sessions.delete(sid); res.setHeader('Set-Cookie', 'hx_session=; Path=/; Max-Age=0'); redirect(res, '/login'); return; }
    if (p === '/register' && req.method === 'GET') { send(res, 200, registerPage(req, '')); return; }
    if (p === '/register' && req.method === 'POST') {
      const b = await readBody(req); attempt('Registration & Profile');
      const email = String(b.email || '').toLowerCase();
      if (!email || userByEmail(email)) { send(res, 200, registerPage(req, 'That email is already registered (or missing).')); return; }
      const nu = { id: nextUserId++, email, password: String(b.password || ''), name: String(b.name || 'New User'), role: 'user', isPrivate: false, verified: false, fakeFollowers: 0, bio: '' };
      // INTENTIONAL FLAW: mass assignment — every posted field is copied onto the new account.
      if (b.role && b.role !== 'user') nu.role = String(b.role);
      if (b.verified) nu.verified = true;
      if (b.followers) nu.fakeFollowers = Number(b.followers) || 0;
      if (b.fakeFollowers) nu.fakeFollowers = Number(b.fakeFollowers) || 0;
      users.push(nu);
      if (nu.password.length <= 3) pass('reg-weakpass');
      if (nu.role !== 'user' || nu.verified || nu.fakeFollowers > 0) pass('reg-massassign');
      if (hasXSS(nu.name)) pass('reg-storedxss');
      startSession(res, nu); redirect(res, '/'); return;
    }
    if (p === '/forgot' && req.method === 'GET') { send(res, 200, layout(req, 'Forgot', `<div class="card"><h2>Forgot password</h2><form method="POST" action="/forgot"><input name="email" placeholder="Email" style="width:60%"><button>Send reset token</button></form><p class="mut">Already have a token? <a href="/reset">Reset your password</a></p></div>`)); return; }
    if (p === '/forgot' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const email = String(b.email || '').toLowerCase(); probedEmails.add(email); if (probedEmails.size >= 5) pass('auth-enum');
      const target = userByEmail(email);
      if (!target) { send(res, 200, layout(req, 'Forgot', '<div class="card"><p>No account with that email exists.</p></div>')); return; }
      const tok = resetTokenFor(target.id); issuedResetTokens[target.id] = tok;
      send(res, 200, layout(req, 'Forgot', `<div class="card"><p>Reset token issued for ${target.email} (in a real app this goes by email): <strong>${tok}</strong></p><p><a href="/reset">Use it here</a></p></div>`)); return;
    }
    if (p === '/reset' && req.method === 'GET') { send(res, 200, layout(req, 'Reset', `<div class="card"><h2>Reset password</h2><form method="POST" action="/reset"><input name="email" placeholder="Email" style="width:60%"><br><input name="token" placeholder="Reset token" style="width:60%"><br><input name="newPassword" type="password" placeholder="New password" style="width:60%"><br><button>Reset</button></form></div>`)); return; }
    if (p === '/reset' && req.method === 'POST') {
      const b = await readBody(req); attempt('Login & Authentication');
      const target = userByEmail(String(b.email || '').toLowerCase());
      if (target && String(b.token || '') === resetTokenFor(target.id)) {
        if (issuedResetTokens[target.id] !== String(b.token)) pass('auth-reset');
        target.password = String(b.newPassword || 'changed123');
        send(res, 200, layout(req, 'Reset', '<div class="card"><p>Password changed. <a href="/login">Sign in</a></p></div>')); return;
      }
      send(res, 200, layout(req, 'Reset', '<div class="card"><p>Invalid token.</p></div>')); return;
    }
    if (p === '/api/debug') { attempt('Admin & Platform'); pass('platform-debug'); send(res, 200, JSON.stringify({ users, posts, follows, note: 'debug build — remove before production' }, null, 2), 'application/json'); return; }

    /* ---------- everything below needs a session ---------- */
    if (!me && p !== '/complete' && p !== '/complete/name' && p !== '/certificate') { redirect(res, '/login'); return; }

    if (p === '/' && req.method === 'GET') { send(res, 200, feedPage(req)); return; }
    if (p === '/profile/update' && req.method === 'POST') {
      const b = await readBody(req); attempt('Registration & Profile');
      if (!cookies.hx_origin) pass('reg-csrf'); // state change arrived without the app's same-site marker
      if (b.name !== undefined) { me.name = String(b.name); if (hasXSS(me.name)) pass('reg-storedxss'); }
      if (b.bio !== undefined) me.bio = String(b.bio);
      redirect(res, '/user/' + me.id); return;
    }
    const userMatch = p.match(/^\/user\/(\d+)$/);
    if (userMatch && req.method === 'GET') { const t = userById(userMatch[1]); if (!t) { send(res, 404, 'no such user'); return; } send(res, 200, profilePage(req, t)); return; }

    if (p === '/search' && req.method === 'GET') {
      attempt('Search & Discovery');
      const q = u.searchParams.get('q') || '';
      let results;
      if (looksLikeSQLi(q)) {
        results = users; // injected query returns every row, private accounts and emails included
        if (results.some(x => x.isPrivate)) pass('search-sqli');
      } else {
        results = users.filter(x => x.name.toLowerCase().includes(q.toLowerCase()) && !x.isPrivate);
      }
      if (hasXSS(q)) pass('search-reflectedxss');
      const html = `<div class="card"><h2>Search people</h2><form method="GET" action="/search"><input name="q" value="${q}" style="width:60%"><button>Search</button></form>
<p>Results for: ${q}</p>${results.map(x => `<p><a href="/user/${x.id}">${x.name}</a> <span class="mut">${x.email}</span></p>`).join('') || '<p class="mut">Nobody found.</p>'}</div>`;
      send(res, 200, layout(req, 'Search', html)); return;
    }

    if (p === '/post' && req.method === 'POST') {
      const b = await readBody(req); attempt('Posts & Feed');
      const np = { id: nextPostId++, authorId: me.id, body: String(b.body || ''), visibility: ['public', 'followers', 'private'].includes(b.visibility) ? b.visibility : 'public' };
      posts.push(np);
      if (hasXSS(np.body)) pass('post-storedxss');
      redirect(res, '/post/' + np.id); return;
    }
    const postMatch = p.match(/^\/post\/(\d+)$/);
    if (postMatch && req.method === 'GET') {
      attempt('Posts & Feed');
      const post = posts.find(x => x.id === Number(postMatch[1]));
      if (!post) { send(res, 404, 'no such post'); return; }
      // INTENTIONAL FLAW: no visibility / ownership check on read.
      if (post.authorId !== me.id && post.visibility === 'private') pass('post-idor-read');
      if (post.authorId !== me.id && post.visibility === 'followers' && !isFollowing(me.id, post.authorId)) pass('post-idor-read');
      send(res, 200, postPage(req, post)); return;
    }
    const postEdit = p.match(/^\/post\/(\d+)\/edit$/);
    if (postEdit && req.method === 'POST') {
      const b = await readBody(req); attempt('Posts & Feed');
      const post = posts.find(x => x.id === Number(postEdit[1]));
      if (post) { if (post.authorId !== me.id) pass('post-idor-edit'); post.body = String(b.body || post.body); if (hasXSS(post.body)) pass('post-storedxss'); }
      redirect(res, '/post/' + postEdit[1]); return;
    }
    const postDel = p.match(/^\/post\/(\d+)\/delete$/);
    if (postDel && req.method === 'POST') {
      await readBody(req); attempt('Posts & Feed');
      const idx = posts.findIndex(x => x.id === Number(postDel[1]));
      if (idx >= 0) { if (posts[idx].authorId !== me.id) pass('post-idor-delete'); posts.splice(idx, 1); }
      redirect(res, '/'); return;
    }

    if (p === '/follow' && req.method === 'POST') {
      const b = await readBody(req); attempt('Social Graph');
      const to = Number(b.to); const target = userById(to);
      // INTENTIONAL FLAW: the acting user is taken from the request body ("from"), not the session.
      const fromId = b.from !== undefined && b.from !== '' ? Number(b.from) : me.id;
      if (target && fromId !== to) {
        let status = 'following';
        if (target.isPrivate && !b.approved) status = 'pending';
        if (target.isPrivate && b.approved) { status = 'following'; pass('graph-private-bypass'); }
        follows = follows.filter(f => !(f.from === fromId && f.to === to));
        follows.push({ from: fromId, to, status });
        if (fromId !== me.id) pass('graph-forced-follow');
      }
      redirect(res, '/user/' + to); return;
    }

    if (p === '/comment' && req.method === 'POST') {
      const b = await readBody(req); attempt('Comments & Likes');
      comments.push({ id: nextCommentId++, postId: Number(b.postId), authorId: me.id, body: String(b.body || '') });
      redirect(res, '/post/' + b.postId); return;
    }
    const commentDel = p.match(/^\/comment\/(\d+)\/delete$/);
    if (commentDel && req.method === 'POST') {
      await readBody(req); attempt('Comments & Likes');
      const idx = comments.findIndex(c => c.id === Number(commentDel[1]));
      if (idx >= 0) { if (comments[idx].authorId !== me.id) pass('comment-idor-delete'); comments.splice(idx, 1); }
      redirect(res, '/'); return;
    }
    if (p === '/like' && req.method === 'POST') {
      const b = await readBody(req); attempt('Comments & Likes');
      const uid = b.userId !== undefined && b.userId !== '' ? Number(b.userId) : me.id;
      if (!likes.some(l => l.postId === Number(b.postId) && l.userId === uid)) likes.push({ postId: Number(b.postId), userId: uid });
      if (uid !== me.id) pass('like-forgery');
      redirect(res, '/post/' + b.postId); return;
    }

    if (p === '/messages' && req.method === 'GET') { send(res, 200, messagesPage(req)); return; }
    const convMatch = p.match(/^\/messages\/(\d+)$/);
    if (convMatch && req.method === 'GET') {
      attempt('Direct Messages');
      const c = conversations.find(x => x.id === Number(convMatch[1]));
      if (!c) { send(res, 404, 'no such conversation'); return; }
      // INTENTIONAL FLAW: no participant check.
      if (!c.participants.includes(me.id)) pass('dm-idor-read');
      send(res, 200, conversationPage(req, c)); return;
    }
    const convSend = p.match(/^\/messages\/(\d+)\/send$/);
    if (convSend && req.method === 'POST') {
      const b = await readBody(req); attempt('Direct Messages');
      const c = conversations.find(x => x.id === Number(convSend[1]));
      if (c) {
        const fromId = b.from !== undefined && b.from !== '' ? Number(b.from) : me.id;
        c.messages.push({ id: nextMsgId++, from: fromId, body: String(b.body || '') });
        if (fromId !== me.id) pass('dm-send-as-other');
      }
      redirect(res, '/messages/' + convSend[1]); return;
    }

    if (p === '/groups' && req.method === 'GET') { send(res, 200, groupsPage(req)); return; }
    const groupJoin = p.match(/^\/groups\/(\d+)\/join$/);
    if (groupJoin && req.method === 'POST') {
      await readBody(req); attempt('Groups');
      const g = groups.find(x => x.id === Number(groupJoin[1]));
      if (g && !g.members.some(m2 => m2.userId === me.id)) {
        g.members.push({ userId: me.id, role: 'member' });
        if (g.isPrivate) pass('group-join-private');
      }
      redirect(res, '/group/' + groupJoin[1]); return;
    }
    const groupMatch = p.match(/^\/group\/(\d+)$/);
    if (groupMatch && req.method === 'GET') {
      attempt('Groups');
      const g = groups.find(x => x.id === Number(groupMatch[1]));
      if (!g) { send(res, 404, 'no such group'); return; }
      // INTENTIONAL FLAW: no membership check on private group content.
      if (g.isPrivate && !g.members.some(m2 => m2.userId === me.id)) pass('group-feed-idor');
      send(res, 200, groupPage(req, g)); return;
    }

    if (p === '/admin' && req.method === 'GET') {
      attempt('Admin & Platform');
      // INTENTIONAL FLAW: any signed-in user reaches the admin panel.
      if (me.role !== 'admin') pass('admin-bac');
      send(res, 200, adminPage(req)); return;
    }
    if (p === '/moderator' && req.method === 'GET') {
      attempt('Login & Authentication');
      const cookieRole = cookies.hx_role || '';
      const allowed = me.role === 'moderator' || me.role === 'admin' || cookieRole === 'moderator' || cookieRole === 'admin';
      if (!allowed) { send(res, 403, layout(req, 'Forbidden', '<div class="card"><h2>Moderators only</h2></div>')); return; }
      if ((cookieRole === 'moderator' || cookieRole === 'admin') && me.role !== 'moderator' && me.role !== 'admin') pass('auth-cookie');
      send(res, 200, moderatorPage(req)); return;
    }

    if (p === '/tests' && req.method === 'GET') { send(res, 200, testsPage(req)); return; }
    if (p === '/complete' && req.method === 'GET') { send(res, 200, completePage(req)); return; }
    if (p === '/complete/name' && req.method === 'POST') { const b = await readBody(req); progress.testerName = String(b.testerName || '').slice(0, 80); saveProgress(); redirect(res, '/complete'); return; }
    if (p === '/certificate' && req.method === 'GET') { send(res, 200, certificatePage(req)); return; }

    send(res, 404, layout(req, 'Not found', '<div class="card"><h2>404 — page not found</h2></div>'));
  } catch (err) {
    try { send(res, 500, 'Something broke, but the server is still up.'); } catch (e) {}
  }
});

/* ------------------------------------------------------------------ *
 * Doc generation (--gen-docs): the three registry docs are GENERATED *
 * from TESTS so their counts can never drift from the code.          *
 * ------------------------------------------------------------------ */
if (process.argv.includes('--gen-docs')) {
  const byFeature = f => TESTS.filter(t => t.feature === f);
  let vuln = `# HexaSocial — Vulnerability Map (LAB ${LAB_NUMBER})\n\nAll ${TESTS.length} scored tests, grouped by feature. Every entry is a real, working flaw in this app, detected server-side when the exploit actually succeeds.\n`;
  let guide = `# HexaSocial — Practice Guide (LAB ${LAB_NUMBER})\n\nChallenges grouped by feature, then difficulty. Each challenge lists its 3 graded hints and a measurable objective. The in-app Mission Board (/tests) mirrors this guide.\n`;
  let fix = `# HexaSocial — Fix & Retest Guide (LAB ${LAB_NUMBER})\n\nFor every test: the secure implementation and a regression retest that proves the fix.\n`;
  const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  for (const f of FEATURES) {
    vuln += `\n## ${f}\n`;
    guide += `\n## ${f}\n`;
    fix += `\n## ${f}\n`;
    for (const t of byFeature(f)) {
      vuln += `\n### ${t.name}\n- OWASP: ${t.owasp} · Difficulty: ${t.difficulty}\n- What it is: ${t.lesson}\n- Impact: ${t.impact}\n- Report title: "${t.report.title}" (${t.report.severity})\n`;
      fix += `\n### ${t.name}\n- Secure implementation: ${t.report.remediation}\n- Regression test: re-run the original exploit after the fix — the test in /tests must no longer flip, the action must be refused or neutralised, and the legitimate flow must still work.\n`;
    }
    for (const t of byFeature(f).slice().sort((a, b) => order[a.difficulty] - order[b.difficulty])) {
      guide += `\n### ${t.name} (${t.difficulty})\n- Objective: make the "${t.name}" test flip to done on the Mission Board by performing the real exploit against this app (server-side detection only — there is no "mark done" button).\n- Hint 1: ${t.hints[0]}\n- Hint 2: ${t.hints[1]}\n- Hint 3: ${t.hints[2]}\n`;
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('Docs generated from registry: ' + TESTS.length + ' tests across ' + FEATURES.length + ' features.');
  process.exit(0);
}

server.listen(PORT, '127.0.0.1', () => { console.log(`LAB ${LAB_NUMBER} — ${LAB_NAME} listening on http://127.0.0.1:${PORT}`); });
