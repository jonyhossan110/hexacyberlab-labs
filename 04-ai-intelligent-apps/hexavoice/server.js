'use strict';
/*
 * HexaVoice — LAB 37 of 110 (Category 4: AI & Intelligent Applications)
 * HexaCyberLab vulnerable practice lab. LOCAL ONLY. Zero-dependency Node.
 * A voice-AI platform: accounts, recordings, simulated transcripts, speakers,
 * sharing links, API access, usage minutes & billing — with a full lab system
 * (key gate, progress, hints, Lab Coach chatbot, completion + certificate).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3046;
const LAB_NUMBER = 37;
const LAB_NAME = 'HexaVoice';
const PREV_LAB = 36;
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const LOGO_FILE = path.join(DIR, 'logo.png');

/* ------------------------------------------------------------------ *
 * Key material. Each key lives ONLY as encoded shards scattered in
 * different regions of this file (see also the shard blocks further
 * below). A shard = base64 of the reversed key piece. One small
 * assembler rebuilds a key at runtime, only at its reveal moment.
 * ------------------------------------------------------------------ */

const COMPLETION_SHARDS_A = [
    'TC1YSA==',
    'MS04Mw==',
    'WExUNg=='
  ];
function unshard(list) {
  return list.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
// (further shard blocks are declared in later regions of this file)

/* ------------------------------------------------------------------ *
 * TESTS registry — the heart of the lab system.
 * ------------------------------------------------------------------ */
const TESTS = [
  // ---- Login & Authentication ----
  { id: 'sqli-login', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The legacy SSO login builds its query by gluing your input straight into the string.', "Try a quote followed by a condition that is always true, e.g. in the email field.", "Email: ' OR '1'='1  (or admin@hexavoice.local'-- ) with any password signs you in as the first matched user."],
    lesson: 'String-built queries let attacker input change the meaning of the query itself; parameterised queries keep data and code separate.',
    impact: 'On a real client site this means anyone can sign in as an administrator without a password — full account takeover of the platform and every customer recording on it.',
    report: { title: 'SQL Injection in legacy SSO login allows authentication bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' },
    guide: "Step by step: 1) Open the login page and choose the 'Legacy SSO sign-in' form. 2) In the email field type: ' OR '1'='1  3) Type anything as the password and submit. The glued-together query becomes true for the first row, so you are signed in without knowing any password. The variant admin@hexavoice.local'-- comments out the password check entirely." },
  { id: 'brute-force', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limiting or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing the same account\'s password — watch whether anything ever slows you down.', 'Script 10 or more wrong passwords for alice@hexavoice.local in a row.', 'The 10th wrong password is processed exactly like the first: no delay, no CAPTCHA, no lockout. That missing throttle is the finding.'],
    lesson: 'Without throttling, lockout or MFA, an attacker can try unlimited passwords until one works.',
    impact: 'A client\'s users with weak passwords would be taken over by automated guessing; the business learns about it only after customer data leaks.',
    report: { title: 'No rate limiting or account lockout on login enables brute-force attacks', severity: 'High', remediation: 'Add progressive delays/lockout after repeated failures, MFA, and breached-password screening.' },
    guide: 'Step by step: 1) Pick a real account, e.g. alice@hexavoice.local. 2) Submit a wrong password 10 times in a row (script it with curl if you like). 3) Notice every attempt is answered instantly with the same error — nothing locks, slows or challenges you. The test completes when the 10th failure is still processed normally.' },
  { id: 'user-enumeration', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', 'Try alice@hexavoice.local with a wrong password, then nobody@nowhere.test with any password.', 'The two answers differ ("wrong password" vs "no account"), and Forgot Password differs too — that difference is an account-existence oracle.'],
    lesson: 'Different error messages for "no such user" and "wrong password" let attackers build a list of valid accounts to attack.',
    impact: 'Attackers can confirm which of a client\'s customers have accounts, then focus phishing and password attacks only on real targets.',
    report: { title: 'Login and password-reset responses reveal whether an account exists', severity: 'Medium', remediation: 'Return one generic message ("invalid credentials" / "if the account exists…") for every outcome.' },
    guide: 'Step by step: 1) Log in as alice@hexavoice.local with a wrong password — note the exact message. 2) Log in as ghost@nowhere.test — note the different message. 3) Do the same pair on Forgot Password. Because the answers differ, anyone can test whether an email is registered. The test completes once you have probed both an existing and a non-existing account.' },
  { id: 'default-creds', feature: 'Login & Authentication', name: 'Default Demo Credentials Still Active', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Seeded demo accounts are famous for surviving into production.', 'The login page footer names the demo mailbox. Guess the obvious demo password.', 'demo@hexavoice.local / demo1234 signs straight in — a shipped default credential.'],
    lesson: 'Demo and default accounts are the first thing attackers try; they must be removed or forced to change password before go-live.',
    impact: 'A forgotten demo login on a client platform is a free, legitimate-looking way in — no exploit needed, and it often bypasses monitoring.',
    report: { title: 'Default demo account with a guessable password is active', severity: 'High', remediation: 'Delete demo/default accounts before launch; force unique credentials for every seeded account.' },
    guide: 'Step by step: 1) Read the demo hint in the login page footer. 2) Sign in with demo@hexavoice.local and the password demo1234. 3) You are in with a credential anyone could guess — that is the finding. The test completes on the successful demo login.' },
  { id: 'reset-token', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Reset tokens should be random. Ask what this one is derived from.', 'Request a reset for your own account and inspect the link pattern in the flow. The token looks like rst- followed by a short hash.', 'The token is a deterministic FNV hash of the email address only — compute it for any victim email and POST it to /reset without ever requesting a reset.'],
    lesson: 'A reset token derived predictably from public data (the email) is not a secret — anyone can mint one for any account.',
    impact: 'Anyone who knows a customer\'s email address can reset their password and take the account, including the recordings and billing details inside it.',
    report: { title: 'Password-reset tokens are predictable (derived from the email address)', severity: 'High', remediation: 'Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use.' },
    guide: 'Step by step: 1) The forgot-password flow "emails" a link containing rst-<number>. 2) That number is just an FNV-1a hash of the email — no randomness, no secret. 3) Compute the same hash for a victim email (e.g. alice@hexavoice.local) yourself and POST email+token+new password to /reset WITHOUT using Forgot Password first. The password changes — token predicted, account taken.' },
  { id: 'cookie-tamper', feature: 'Login & Authentication', name: 'Session Cookie Role Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, look at the cookies the app sets. One of them describes your role — in plain text.', 'The admin area trusts that cookie instead of the server-side session.', 'Set the hv_role cookie to admin (browser devtools or curl) and open /admin.'],
    lesson: 'Authorisation decisions must be made from server-side session data, never from values the client can edit.',
    impact: 'Any signed-in customer can promote themselves to platform admin by editing a cookie — deleting users and reading every transcript on the service.',
    report: { title: 'Admin authorisation trusts a client-editable role cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record only; ignore role claims in cookies or request data.' },
    guide: 'Step by step: 1) Log in as a normal user and inspect cookies: hv_role holds your role in plain text. 2) Change hv_role to admin. 3) Open /admin — the gate checks the cookie, not your real account role, so the admin console opens. The test completes when the admin area is served to an account whose real role is not admin.' },

  // ---- Registration & Profile ----
  { id: 'weak-password', feature: 'Registration & Profile', name: 'Weak Password Policy (1-character passwords)', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a fresh account and see how little password it demands.', 'Try a password of a single character.', 'The account is created with password "x" — there is effectively no password policy at all.'],
    lesson: 'A registration flow that accepts trivial passwords manufactures brute-forceable accounts.',
    impact: 'Customers who choose "1" or "a" as a password hand attackers an easy way into their recordings and payment details.',
    report: { title: 'Registration accepts single-character passwords (no password policy)', severity: 'Medium', remediation: 'Enforce a minimum length (12+) and screen against known-breached passwords at registration and reset.' },
    guide: 'Step by step: 1) Open Register. 2) Create an account with the password set to a single character, e.g. x. 3) The account is created and you can log in with it. The test completes the moment a too-short password is accepted.' },
  { id: 'mass-assignment', feature: 'Registration & Profile', name: 'Mass Assignment — Role & Plan via Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The register endpoint binds the whole request body onto the new user record.', 'Add fields the form never shows — think role and plan.', 'POST /register with extra fields role=admin and plan=enterprise: the new account is created with both.'],
    lesson: 'Binding request data directly onto models lets attackers set privileged fields the UI never offered.',
    impact: 'Attackers mint their own admin accounts or free enterprise plans — privilege escalation and revenue loss in a single request.',
    report: { title: 'Registration allows mass assignment of role and plan fields', severity: 'Critical', remediation: 'Whitelist the exact fields a request may set (name, email, password); assign role/plan server-side only.' },
    guide: 'Step by step: 1) Send a registration POST (curl works) with the normal fields PLUS role=admin and plan=enterprise. 2) The server copies every field onto the new user. 3) Log in — you hold an admin, enterprise account you were never granted. The test completes when a privileged field survives registration.' },
  { id: 'stored-xss-profile', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is rendered on the dashboard, speaker pages and the admin user list — as raw HTML.', 'Put a markup payload in the name field of your profile.', 'Saving a name like <script>alert(1)</script> (or an <svg onload> payload) stores it, and it executes in other users\' browsers.'],
    lesson: 'Any user-controlled string rendered without output encoding becomes stored XSS when other people view it.',
    impact: 'An attacker\'s booby-trapped profile name can steal session cookies or act as the admin who views it — one bad signup can compromise staff accounts.',
    report: { title: 'Stored cross-site scripting via display name', severity: 'High', remediation: 'Context-encode all user output; add a Content-Security-Policy as defence in depth.' },
    guide: 'Step by step: 1) Go to Profile (or register) and set your display name to <svg onload=alert(1)>. 2) Save. 3) The name is stored raw and rendered unescaped wherever it appears — including the admin user list. The test completes when the payload is stored in the profile.' },
  { id: 'profile-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Legit profile forms carry a hidden marker that matches a cookie the app set on its own pages.', 'A state-changing POST that arrives WITHOUT that marker is still accepted.', 'POST /profile as a logged-in user with no hx_marker field (curl with your session cookie) — the change is applied anyway.'],
    lesson: 'State-changing requests need an unguessable anti-CSRF token tied to the session; cookies alone are sent automatically by browsers.',
    impact: 'A malicious page a customer visits while logged in can silently change their profile, email or password — account takeover by drive-by.',
    report: { title: 'Profile update lacks CSRF protection', severity: 'Medium', remediation: 'Require a per-session anti-CSRF token on every state-changing request and verify Origin/Referer as a backstop.' },
    guide: 'Step by step: 1) Note the hidden hx_marker field in the real profile form — it mirrors the hx_origin cookie. 2) Using curl with your session cookie, POST /profile with a new display name but NO hx_marker. 3) The change is applied even though the request could have come from any website. The test completes when a marker-less POST changes the profile.' },

  // ---- Recordings & Transcripts ----
  { id: 'recording-idor', feature: 'Recordings & Transcripts', name: 'Recording IDOR — Read Another User\'s Recording', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Recording pages live at /recordings/<number> and the numbers are sequential.', 'Log in as one user and open a recording id that belongs to someone else.', 'No ownership check is done: bob can open alice\'s private recording page and read the full transcript.'],
    lesson: 'Every object access must check that the object belongs to (or is shared with) the requester — hiding the link is not protection.',
    impact: 'Voice recordings are deeply personal — calls, interviews, medical and legal dictations. One changed digit exposes a customer\'s private audio and transcript.',
    report: { title: 'Insecure direct object reference on recording pages exposes other users\' recordings', severity: 'High', remediation: 'Check ownership/sharing on every recording read; return 404 for objects the user may not see.' },
    guide: 'Step by step: 1) Log in as bob@hexavoice.local and note his recording ids on the dashboard. 2) Change the URL to a lower id belonging to alice, e.g. /recordings/1. 3) Her private recording page — title, speakers and full transcript — is served to you. The test completes when a recording owned by someone else is served.' },
  { id: 'media-predictable', feature: 'Recordings & Transcripts', name: 'Private Recording Served via Predictable Media URL', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The "audio" for a recording is served from /media/<id> — a plain sequential number.', 'That endpoint does not even ask you to log in.', 'Open /media/1 in a private window (no session): the private recording\'s audio stub and transcript are served.'],
    lesson: 'Media endpoints need the same authorisation as the pages that link to them; predictable URLs are public URLs.',
    impact: 'Anyone on the internet can enumerate /media/1, /media/2, … and harvest every customer\'s "private" recordings without an account at all.',
    report: { title: 'Unauthenticated predictable media URLs expose private recordings', severity: 'Critical', remediation: 'Require authorisation on media delivery and use unguessable, signed URLs for private content.' },
    guide: 'Step by step: 1) Log out (or use a fresh browser profile). 2) Browse to /media/1. 3) The server hands over the private recording\'s content — no login, no ownership check, and the id is just a sequence number. The test completes when private media is served to someone who is not the owner.' },
  { id: 'transcript-edit', feature: 'Recordings & Transcripts', name: 'Transcript Edited by Non-Owner', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The transcript editor posts to /recordings/<id>/transcript.', 'Ownership is checked when viewing some things — but not when writing this one.', 'As bob, POST a new transcript for alice\'s recording id 1. It saves.'],
    lesson: 'Write paths need the same ownership checks as read paths; a missing check on the save endpoint silently undoes all the others.',
    impact: 'Attackers (or rivals) can rewrite the official transcript of a client\'s call — falsified records, wrong invoices, legal exposure — without the owner noticing.',
    report: { title: 'Transcript update endpoint lacks ownership authorisation', severity: 'High', remediation: 'Authorise the owner (or an explicit editor role) on every mutation endpoint, and log transcript changes.' },
    guide: 'Step by step: 1) Log in as bob. 2) POST to /recordings/1/transcript with a replacement transcript (recording 1 belongs to alice). 3) Open the recording — your text replaced hers. The test completes when a non-owner\'s edit is stored.' },
  { id: 'reflected-xss-search', feature: 'Recordings & Transcripts', name: 'Reflected XSS in Recording Search', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The recordings search echoes your query back into the results page.', 'It echoes it as HTML, not as text.', 'Search for <script>alert(1)</script> and view the page source — the payload comes back unescaped.'],
    lesson: 'Reflected input must be output-encoded; a search box is a classic injection point into other users\' browsers.',
    impact: 'A crafted search link sent to a client\'s staff runs script in their session — phishing, session theft or actions taken as them.',
    report: { title: 'Reflected cross-site scripting in recording search', severity: 'Medium', remediation: 'Encode the query as text when reflecting it; deploy a restrictive Content-Security-Policy.' },
    guide: 'Step by step: 1) In Recordings, search for <svg onload=alert(1)>. 2) The results page prints your query back without encoding, so the markup becomes live HTML. The test completes when the payload is reflected unescaped.' },

  // ---- Sharing Links ----
  { id: 'share-enumeration', feature: 'Sharing Links', name: 'Share-Link Enumeration (Sequential Tokens)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Share links look like /share/shr-1001 — the token is just a counter.', 'Counters can be walked: shr-1001, shr-1002, shr-1003…', 'Probe at least 5 different share tokens quickly and watch them resolve to real recordings.'],
    lesson: 'Capability URLs only work as access control when the token is unguessable; a sequence number is not a secret.',
    impact: 'Every "anyone with the link" recording a client ever shared can be harvested by walking the counter — private meetings and interviews leak wholesale.',
    report: { title: 'Share tokens are sequential and enumerable', severity: 'High', remediation: 'Use cryptographically random, long tokens for share links; rate-limit token lookups.' },
    guide: 'Step by step: 1) Create or notice a share link: /share/shr-1001. 2) Change the number up and down — shr-1002, shr-1003, shr-1004, shr-1005. 3) Each resolves to somebody\'s shared recording. The test completes once 5 distinct tokens have been probed in a short window.' },
  { id: 'share-others-recording', feature: 'Sharing Links', name: 'Share Link Created for Someone Else\'s Recording', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The "create share link" action is POST /recordings/<id>/share.', 'It never asks whether the recording is yours.', 'As bob, create a share link for alice\'s private recording 1 — then open the link. Her private recording is now public-by-link.'],
    lesson: 'Actions that publish data need ownership checks most of all — creating the share is itself the disclosure.',
    impact: 'Any user can publicly expose another customer\'s private recording and send the link anywhere — a one-click data breach.',
    report: { title: 'Users can create public share links for recordings they do not own', severity: 'Critical', remediation: 'Only the owner may share a recording; log share creation and let owners revoke links.' },
    guide: 'Step by step: 1) Log in as bob. 2) POST /recordings/1/share (recording 1 is alice\'s private one). 3) A working /share/shr-… link is created for a recording you do not own. The test completes when the foreign share link exists.' },

  // ---- Speakers ----
  { id: 'speaker-idor', feature: 'Speakers', name: 'Speaker Profile IDOR — Private Voiceprint Notes', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Speaker pages live at /speakers/<number> with sequential ids.', 'A speaker profile holds private notes about that voice.', 'As bob, open /speakers/1 — alice\'s speaker notes are shown to you.'],
    lesson: 'Secondary objects (speakers, attachments, notes) are forgotten in access-control reviews — they need the same ownership checks as headline objects.',
    impact: 'Private speaker notes can identify who said what in sensitive calls; leaking them de-anonymises a client\'s confidential conversations.',
    report: { title: 'Speaker profiles (with private notes) accessible by any user', severity: 'Medium', remediation: 'Scope speaker reads to the owning account; audit all secondary-object endpoints for ownership checks.' },
    guide: 'Step by step: 1) Log in as bob and open your own speaker page to learn the URL shape. 2) Change the id to 1. 3) Alice\'s speaker profile and her private voiceprint notes are served. The test completes when another user\'s speaker is served.' },
  { id: 'speaker-edit', feature: 'Speakers', name: 'Rename Another User\'s Speaker', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Renaming posts to /speakers/<id>/rename.', 'Try it on a speaker id that is not yours.', 'As bob, rename alice\'s speaker 1. The new name is saved.'],
    lesson: 'Write endpoints on secondary objects are classic IDOR territory — test every mutation, not just the reads.',
    impact: 'Tampered speaker labels corrupt the record of who said what — in legal, HR or journalistic recordings that destroys trust in the transcript itself.',
    report: { title: 'Speaker rename endpoint lacks ownership authorisation', severity: 'Medium', remediation: 'Authorise ownership on speaker mutations; keep an audit trail of label changes.' },
    guide: 'Step by step: 1) Log in as bob. 2) POST /speakers/1/rename with a new name (speaker 1 belongs to alice). 3) The rename is saved. The test completes when a non-owner\'s rename succeeds.' },

  // ---- Usage & Billing ----
  { id: 'usage-tamper', feature: 'Usage & Billing', name: 'Usage-Minute Manipulation (Client-Supplied Duration)', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['Transcribing a recording charges your monthly minutes.', 'The charge is computed from a "minutes" value in the request — which you control.', 'POST /recordings/<yours>/transcribe with minutes=0 for a long recording: usage barely moves.'],
    lesson: 'Billing quantities must be measured server-side; a client-supplied usage figure is an invitation to free service.',
    impact: 'Customers (or attackers in stolen accounts) can transcribe unlimited audio while reporting zero minutes — direct revenue loss that scales silently.',
    report: { title: 'Transcription billing trusts client-supplied minute counts', severity: 'High', remediation: 'Measure duration server-side from the actual media; ignore client-supplied usage figures.' },
    guide: 'Step by step: 1) Pick one of your own long recordings and note your used minutes on Billing. 2) POST /recordings/<id>/transcribe with minutes=0 in the body. 3) The transcript is generated but your usage is charged 0 instead of the real duration. The test completes when the charged minutes are less than the recording\'s true minutes.' },
  { id: 'price-tamper', feature: 'Usage & Billing', name: 'Plan Upgrade Price Tampering', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The upgrade form posts the plan AND its price to /billing/upgrade.', 'Prices belong on the server, not in the request.', 'POST plan=enterprise with price=0 — the account becomes Enterprise and is charged nothing.'],
    lesson: 'Never trust prices, totals or discounts sent by the client; look them up server-side at purchase time.',
    impact: 'Anyone can upgrade to the top plan for free — the client\'s premium tier becomes worthless and paying customers feel cheated.',
    report: { title: 'Plan upgrade accepts client-supplied price (free enterprise upgrade)', severity: 'High', remediation: 'Resolve prices from the server-side catalogue by plan id; reject client-supplied amounts.' },
    guide: 'Step by step: 1) Send POST /billing/upgrade with plan=enterprise and price=0 (curl with your session). 2) Your account is now on the Enterprise plan. 3) The server charged the price you sent instead of the catalogue price. The test completes when the plan changes at a tampered price.' },

  // ---- API Access ----
  { id: 'weak-api-key', feature: 'API Access', name: 'Predictable API Key Derived from Email', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['API keys look like hv_ followed by base64. Base64 of what?', 'Decode your own key from the API page and compare it with your account details.', 'The key is simply hv_ + base64(email). Mint alice\'s key yourself and call the API as her — without ever opening her API page.'],
    lesson: 'API keys must be random secrets; deriving them from public identifiers makes them public too.',
    impact: 'Anyone who knows a customer\'s email address owns their API access — recordings can be pulled programmatically, at scale, invisibly.',
    report: { title: 'API keys are predictable (base64 of the account email)', severity: 'Critical', remediation: 'Issue random, high-entropy API keys; store hashes; allow rotation and revocation.' },
    guide: 'Step by step: 1) Look at the key format on the API page: hv_<base64>. 2) Base64-encode alice@hexavoice.local yourself and prefix hv_. 3) Call GET /api/recordings with header x-api-key set to your minted key — you receive her data. The test completes when a never-issued, self-derived key authenticates.' },
  { id: 'api-bola', feature: 'API Access', name: 'API BOLA — Foreign Recording via API', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['GET /api/recordings lists YOUR recordings. GET /api/recordings/<id> is less careful.', 'Use your own valid key, but ask for a recording id that is not yours.', 'Bob\'s key + recording id 1 returns alice\'s recording and transcript as JSON.'],
    lesson: 'APIs need per-object authorisation exactly like web pages — BOLA is the #1 API vulnerability for a reason.',
    impact: 'Through the API, an attacker can script the download of every recording on the platform — bulk theft instead of one page at a time.',
    report: { title: 'Broken object-level authorisation in the recordings API (BOLA/IDOR)', severity: 'High', remediation: 'Check object ownership for the API key\'s account on every API object read.' },
    guide: 'Step by step: 1) Get your own API key from the API page. 2) Call GET /api/recordings/1 with YOUR key (recording 1 is alice\'s). 3) The API returns her recording including the transcript. The test completes when the API serves a recording the key owner does not own.' },

  // ---- Webhooks & Integrations ----
  { id: 'webhook-ssrf', feature: 'Webhooks & Integrations', name: 'Webhook SSRF to Internal Services (simulated)', owasp: 'A10:2021 Server-Side Request Forgery', difficulty: 'Advanced',
    hints: ['The webhook "test" button makes the server fetch your URL and shows you the response.', 'Point it back at the platform itself — its own admin/debug surfaces.', 'Set the webhook URL to http://127.0.0.1:3046/debug and press test: internal-only data comes back in the response.'],
    lesson: 'Any server-side fetch of a user-supplied URL must be allow-listed and blocked from internal address ranges, or the server becomes a proxy into the private network.',
    impact: 'Attackers can make a client\'s server call internal admin panels and cloud metadata endpoints — a foothold behind the firewall from a settings page.',
    report: { title: 'Webhook test fetch allows SSRF to internal addresses', severity: 'High', remediation: 'Validate webhook URLs, block private/loopback ranges and metadata IPs, and resolve-then-pin DNS.' },
    guide: 'Step by step: 1) Open Webhooks and save the URL http://127.0.0.1:3046/debug. 2) Press "Send test". 3) The platform fetches its own internal debug endpoint and shows you the internal-only response — the server was tricked into requesting itself. (Simulated in-app: no real outbound request leaves the lab.) The test completes when internal content is returned.' },

  // ---- Admin Panel ----
  { id: 'admin-csrf', feature: 'Admin Panel', name: 'CSRF on Admin User Deletion (GET)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Admin user deletion is a plain GET link: /admin/users/delete?id=<n>.', 'GETs need no token at all — a browser will fire one from any page via an <img> tag.', 'While signed in as admin, simply visit the delete URL for the demo user. The account is gone.'],
    lesson: 'State changes must never ride on GET, and always need CSRF tokens — admin actions most of all.',
    impact: 'One malicious image tag on a page an admin views can delete customer accounts — destructive CSRF with real data loss.',
    report: { title: 'Admin user deletion is a tokenless GET request (CSRF)', severity: 'High', remediation: 'Make destructive actions POST-only with anti-CSRF tokens and re-authentication for critical operations.' },
    guide: 'Step by step: 1) Sign in as admin@hexavoice.local / admin123. 2) Visit /admin/users/delete?id=4 (the demo user). 3) The account is deleted by a bare GET — no confirmation, no token. The test completes when the deletion executes.' },

  // ---- Platform & Data Exposure ----
  { id: 'data-exposure', feature: 'Platform & Data Exposure', name: 'Debug Endpoint Dumps All Users & Passwords', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Development leftovers love obvious paths.', 'Try /debug — no login required.', 'The endpoint returns every user, including plaintext passwords, as JSON.'],
    lesson: 'Debug and diagnostic endpoints must never ship to production — they bypass every other control at once.',
    impact: 'One forgotten URL hands out every customer\'s password — instant, total compromise of the whole service.',
    report: { title: 'Public /debug endpoint exposes all user records including passwords', severity: 'Critical', remediation: 'Remove debug endpoints from production builds; gate diagnostics behind admin auth and network restrictions.' },
    guide: 'Step by step: 1) In any browser state (even logged out), open /debug. 2) The full user table — emails, roles, plans and plaintext passwords — is returned. The test completes when the dump is fetched.' },
  { id: 'security-headers', feature: 'Platform & Data Exposure', name: 'Missing HTTP Security Headers', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Inspect the response headers of any page (curl -I).', 'Look for Content-Security-Policy, X-Frame-Options, X-Content-Type-Options…', 'None of them are set — pages can be framed and MIME-sniffed. The test completes when a normal page is served without them.'],
    lesson: 'Baseline security headers are cheap defence in depth against clickjacking, sniffing and injected content.',
    impact: 'Without headers, a client\'s site can be embedded in phishing frames and its uploads sniffed as executable content — small gaps that make other attacks easier.',
    report: { title: 'Missing HTTP security headers on all responses', severity: 'Low', remediation: 'Set Content-Security-Policy, X-Frame-Options/frame-ancestors, X-Content-Type-Options and Referrer-Policy globally.' },
    guide: 'Step by step: 1) Unlock the lab and open the dashboard. 2) The page is served with no Content-Security-Policy, no X-Frame-Options and no X-Content-Type-Options (check with curl -I if you like). The test completes on the first ordinary page load inside the lab.' },
];

/* ------------------------------------------------------------------ *
 * Second shard region (the remaining pieces of both keys live here,
 * far from the first region; neither array alone reveals anything).
 * ------------------------------------------------------------------ */

const COMPLETION_SHARDS_B = [
    'LUZCNQ==',
    'TUdHTA==',
    'U0xDVw=='
  ];
const ENTRY_KEY_SHA256 = '3c72a8b58660f3e03b4bf83ae1e8e8c437285b6113da0f96bccb1612c3cb3054';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return unshard(COMPLETION_SHARDS_A.concat(COMPLETION_SHARDS_B)); }

/* ------------------------------------------------------------------ *
 * Seed data (in-memory; recreated fresh on every boot).
 * ------------------------------------------------------------------ */
let nextUserId = 100;
let nextRecId = 100;
let nextSpeakerId = 100;
let nextShareN = 1003;
const users = [
  { id: 1, name: 'HexaVoice Admin', email: 'admin@hexavoice.local', password: 'admin123', role: 'admin', plan: 'enterprise', minutesUsed: 12 },
  { id: 2, name: 'Alice Rahman', email: 'alice@hexavoice.local', password: 'alice123', role: 'user', plan: 'pro', minutesUsed: 140 },
  { id: 3, name: 'Bob Karim', email: 'bob@hexavoice.local', password: 'bob12345', role: 'user', plan: 'free', minutesUsed: 25 },
  { id: 4, name: 'Demo User', email: 'demo@hexavoice.local', password: 'demo1234', role: 'user', plan: 'free', minutesUsed: 3 },
  { id: 5, name: 'Carol Mendes', email: 'carol@hexavoice.local', password: 'carol123', role: 'user', plan: 'pro', minutesUsed: 87 },
];
const PLAN_MINUTES = { free: 60, pro: 600, enterprise: 100000 };
const PLAN_PRICE = { free: 0, pro: 12, enterprise: 49 };
let recordings = [
  { id: 1, ownerId: 2, title: 'Alice — Investor Call (CONFIDENTIAL)', durationSec: 2700, isPrivate: true, speakers: 'Alice Rahman, Investor', transcript: 'ALICE PRIVATE TRANSCRIPT: Q3 numbers are not public yet. We agreed the term sheet stays confidential until signing. Revenue grew 41% and the bridge loan closes Friday.', transcribed: true },
  { id: 2, ownerId: 3, title: 'Bob — Team Standup Notes', durationSec: 900, isPrivate: false, speakers: 'Bob Karim, Team', transcript: 'Standup: sprint goals reviewed, deploy moved to Thursday, Bob to draft the release notes.', transcribed: true },
  { id: 3, ownerId: 2, title: 'Alice — Doctor Dictation (PRIVATE)', durationSec: 1500, isPrivate: true, speakers: 'Alice Rahman', transcript: 'ALICE PRIVATE DICTATION: Patient follow-up notes, strictly personal. Blood pressure stable, continue current medication, review in six weeks.', transcribed: false },
  { id: 4, ownerId: 5, title: 'Carol — Client Interview', durationSec: 3300, isPrivate: true, speakers: 'Carol Mendes, Client', transcript: 'Interview transcript: the client describes internal restructuring plans that are not yet announced.', transcribed: true },
  { id: 5, ownerId: 3, title: 'Bob — Podcast Draft', durationSec: 2100, isPrivate: false, speakers: 'Bob Karim, Guest', transcript: 'Podcast draft conversation about building a small studio on a budget.', transcribed: false },
  { id: 6, ownerId: 5, title: 'Carol — Legal Consultation (PRIVATE)', durationSec: 1950, isPrivate: true, speakers: 'Carol Mendes, Lawyer', transcript: 'CAROL PRIVATE: privileged legal consultation about the contract dispute. Do not distribute.', transcribed: true },
];
let speakers = [
  { id: 1, ownerId: 2, name: 'Alice (self)', notes: 'ALICE PRIVATE VOICEPRINT NOTES: speaker diarisation profile A-1; voice sample enrolled 2026-09-14; do not share.' },
  { id: 2, ownerId: 3, name: 'Bob (self)', notes: 'Bob voiceprint notes: enrolled 2026-09-20.' },
  { id: 3, ownerId: 5, name: 'Carol (self)', notes: 'Carol voiceprint notes: enrolled 2026-10-02.' },
];
let shares = [
  { token: 'shr-1001', recordingId: 2, createdBy: 3 },
  { token: 'shr-1002', recordingId: 5, createdBy: 3 },
];
const webhooks = {}; // userId -> url
const issuedApiKeys = new Set();
const issuedResetTokens = new Set();
const loginFailures = {}; // email -> count
const enumProbes = {}; // sessionKey -> {existing:bool, missing:bool}
const shareProbes = {}; // sessionKey -> {tokens:Set, windowStart:ts}

/* ------------------------------------------------------------------ *
 * Progress engine + persistence (spec §4).
 * ------------------------------------------------------------------ */
const FEATURES = [...new Set(TESTS.map(t => t.feature))];
function freshState() { return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false }; }
let state = freshState();
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      state = Object.assign(freshState(), raw);
    }
  } catch (e) { state = freshState(); }
}
function saveState() {
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* lab keeps running */ }
}
function totalTests() { return TESTS.length; }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === totalTests(); }
function pct() { return Math.floor(doneCount() / totalTests() * 100); }
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) {
    state.tests[id] = true;
    if (isComplete() && !state.completedAt) { state.completedAt = new Date().toISOString(); state.keyRevealed = true; }
    saveState();
  }
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function featureStats() {
  const out = {};
  for (const f of FEATURES) {
    const list = TESTS.filter(t => t.feature === f);
    out[f] = { total: list.length, done: list.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 };
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Small helpers.
 * ------------------------------------------------------------------ */
const sessions = {}; // sid -> userId
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function xssPayload(s) { return /<\s*script|<\s*svg|onerror\s*=|onload\s*=|<\s*img[^>]*on/i.test(String(s || '')); }
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); }
function resetTokenFor(email) { return 'rst-' + fnv(String(email).toLowerCase()); }
function apiKeyFor(user) { return 'hv_' + Buffer.from(user.email).toString('base64'); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } return; }
      const out = {};
      new URLSearchParams(data).forEach((v, k) => { out[k] = v; });
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}

/* ------------------------------------------------------------------ *
 * HTML layout — header progress bar + Lab Coach widget on every page.
 * ------------------------------------------------------------------ */
function chatWidget() {
  return `<div id="coach" style="position:fixed;right:14px;bottom:14px;width:320px;max-width:92vw;background:#111827;color:#e5e7eb;border:1px solid #7c3aed;border-radius:12px;font-family:system-ui;z-index:99;box-shadow:0 8px 30px rgba(0,0,0,.45)">
  <div style="padding:8px 12px;background:linear-gradient(90deg,#2563eb,#7c3aed);border-radius:12px 12px 0 0;font-weight:700">🎙️ Lab Coach — HexaVoice</div>
  <div id="coachLog" style="height:180px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>
  <form id="coachForm" style="display:flex;border-top:1px solid #374151">
    <input id="coachIn" autocomplete="off" placeholder="Ask the coach…" style="flex:1;background:#0b1220;color:#e5e7eb;border:0;padding:9px;font-size:13px">
    <button style="background:#7c3aed;color:#fff;border:0;padding:9px 14px;cursor:pointer">Send</button>
  </form></div>
<script>
var log=document.getElementById('coachLog');
function add(who,txt){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}
add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what this lab contains, or how to approach a feature (help unlocks after 3 tries on that feature).');
document.getElementById('coachForm').addEventListener('submit',function(e){e.preventDefault();var v=document.getElementById('coachIn').value;if(!v)return;add('You',v);document.getElementById('coachIn').value='';fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json()}).then(function(j){add('Coach',j.reply)}).catch(function(){add('Coach','(connection hiccup — try again)')});});
</script>`;
}
function layout(user, title, bodyHtml) {
  const d = doneCount(), t = totalTests(), p = pct();
  const nav = user ? `<nav style="display:flex;gap:12px;flex-wrap:wrap;font-size:14px">
    <a href="/">Dashboard</a><a href="/recordings">Recordings</a><a href="/speakers">Speakers</a>
    <a href="/billing">Usage &amp; Billing</a><a href="/webhooks">Webhooks</a><a href="/api">API</a>
    <a href="/profile">Profile</a><a href="/tests">Mission (/tests)</a>
    ${(user.role === 'admin') ? '<a href="/admin">Admin</a>' : ''}<a href="/logout">Logout</a></nav>` : '';
  const nameHtml = user ? `<span>🎙️ ${user.name}</span>` : ''; // display name rendered raw on purpose (stored-XSS test surface)
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaVoice LAB ${LAB_NUMBER}</title>
<style>body{font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:0}a{color:#93c5fd}input,select,textarea{background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:7px}button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:8px 14px;cursor:pointer}.card{background:#111827;border:1px solid #1f2937;border-radius:10px;padding:16px;margin:12px 0}table{border-collapse:collapse}td,th{border:1px solid #374151;padding:6px 10px}</style></head>
<body>
<header style="background:#0f172a;border-bottom:2px solid #7c3aed;padding:10px 16px">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <img src="/logo.png" alt="HexaCyberLab" style="height:34px">
    <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong>
    <span style="font-size:13px">${d}/${t} tests · ${p}%</span>
    <span style="flex:1;min-width:120px;background:#1f2937;border-radius:6px;height:12px;overflow:hidden"><span style="display:block;height:100%;width:${p}%;background:linear-gradient(90deg,#2563eb,#7c3aed)"></span></span>
    ${nameHtml}
  </div>
  <div style="margin-top:8px">${nav}</div>
</header>
<main style="max-width:980px;margin:0 auto;padding:18px">${bodyHtml}</main>
${chatWidget()}
</body></html>`;
}
function gatePage(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} locked</title>
<style>body{font-family:system-ui;background:#0b1220;color:#e5e7eb;margin:0}input{background:#111827;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:8px}button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:9px 16px;cursor:pointer}</style></head>
<body><main style="max-width:560px;margin:60px auto;text-align:center;padding:20px">
<img src="/logo.png" style="height:64px" alt="HexaCyberLab">
<h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
<p>This lab is locked. Paste the completion key from Lab ${PREV_LAB} to start.</p>
${msg ? `<p style="color:#fca5a5">${esc(msg)}</p>` : ''}
<form method="POST" action="/unlock"><input name="key" size="34" placeholder="Completion key from Lab ${PREV_LAB}" autocomplete="off">
<button type="submit">Unlock</button></form>
<p style="font-size:13px;color:#9ca3af">HexaCyberLab practice labs — local use only.</p></main>
${chatWidget()}
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * Lab Coach chatbot (spec §6) — rule-based, registry knowledge only.
 * ------------------------------------------------------------------ */
const FEATURE_KEYWORDS = {
  'Login & Authentication': ['login', 'auth', 'password', 'reset', 'brute', 'sqli', 'sql', 'cookie', 'session', 'enumerat'],
  'Registration & Profile': ['register', 'registration', 'signup', 'sign up', 'profile', 'mass assignment', 'weak password'],
  'Recordings & Transcripts': ['recording', 'transcript', 'media', 'audio', 'search', 'idor'],
  'Sharing Links': ['share', 'sharing', 'link', 'token'],
  'Speakers': ['speaker', 'voiceprint'],
  'Usage & Billing': ['usage', 'minute', 'billing', 'price', 'plan', 'upgrade', 'transcribe'],
  'API Access': ['api', 'key', 'bola'],
  'Webhooks & Integrations': ['webhook', 'ssrf', 'integration'],
  'Admin Panel': ['admin', 'delete user', 'csrf'],
  'Platform & Data Exposure': ['debug', 'header', 'exposure', 'platform', 'dump'],
};
function findFeature(msg) {
  const m = msg.toLowerCase();
  let best = null, bestScore = 0;
  for (const f of FEATURES) {
    let score = 0;
    if (m.includes(f.toLowerCase())) score += 5;
    for (const k of (FEATURE_KEYWORDS[f] || [])) if (m.includes(k)) score += 2;
    for (const t of TESTS.filter(x => x.feature === f)) if (m.includes(t.name.toLowerCase())) score += 4;
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return bestScore > 0 ? best : null;
}
function coachReply(message) {
  const msg = String(message || '');
  const m = msg.toLowerCase();
  const st = featureStats();
  if (/(who (built|made|created)|founder|md\.? jony|hexacyberlab)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|next lab.*key|the key|unlock key)/.test(m)) {
    if (isComplete() && state.keyRevealed) return 'You completed LAB ' + LAB_NUMBER + '! The completion key is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return 'I do not have the completion key yet — I only receive it when this lab is completed (100%). Right now you are at ' + pct() + '%. Finish the tests and I will share it.';
  }
  if (/(how many|list|which|what).*(feature|test|vulnerab)/.test(m) || m.includes('features')) {
    const feat = findFeature(msg);
    if (feat) {
      const list = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + list.length + ' test(s): ' + list.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '. Attempts so far on this feature: ' + (state.attempts[feat] || 0) + '.';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + FEATURES.length + ' features and ' + totalTests() + ' tests: ' + FEATURES.map(f => f + ' (' + st[f].done + '/' + st[f].total + ')').join(' · ') + '. Progress: ' + doneCount() + '/' + totalTests() + ' (' + pct() + '%).';
  }
  if (/(progress|status|score|how am i)/.test(m)) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Progress: ' + doneCount() + '/' + totalTests() + ' tests (' + pct() + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' Everything is done — see /complete!');
  }
  if (/(how|help|guide|step|solve|do the|attack|exploit)/.test(m)) {
    const feat = findFeature(msg);
    if (!feat) return 'Tell me which feature you mean — one of: ' + FEATURES.join(', ') + '. Or open /tests to see every test and its hints.';
    const tries = state.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !state.tests[t.id]);
    const firstOpen = open[0] || TESTS.find(t => t.feature === feat);
    if (tries >= 3 || (firstOpen && state.tests[firstOpen.id])) {
      const t = firstOpen;
      return 'Guidance for "' + t.name + '" (' + feat + '): ' + t.guide;
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + tries + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  const feat = findFeature(msg);
  if (feat) {
    const list = TESTS.filter(t => t.feature === feat);
    return feat + ': ' + list.length + ' test(s) — ' + list.map(t => t.name).join('; ') + '. Attempts so far: ' + (state.attempts[feat] || 0) + '. Ask me "how" after 3 tries and I will guide you. Hints are also on /tests.';
  }
  return 'I can tell you what this lab contains (ask about a feature), your progress, and — after you have tried a feature at least 3 times — step-by-step guidance. The map is on /tests. This lab has ' + totalTests() + ' tests across ' + FEATURES.length + ' features.';
}

/* ------------------------------------------------------------------ *
 * Pages.
 * ------------------------------------------------------------------ */
function loginPage(msg) {
  return layout(null, 'Login', `<h1>🎙️ HexaVoice — voice AI that transcribes for you</h1>
  <p>Record, transcribe and share conversations. Simulated transcripts, real workflows.</p>
  ${msg ? `<p style="color:#fca5a5">${esc(msg)}</p>` : ''}
  <div class="card"><h3>Sign in</h3>
  <form method="POST" action="/login">
    <p><input name="email" size="32" placeholder="email" required></p>
    <p><input name="password" type="password" size="32" placeholder="password" required></p>
    <button>Sign in</button></form>
  <p style="font-size:13px"><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p></div>
  <div class="card"><h3>Legacy SSO sign-in (deprecated)</h3>
  <form method="POST" action="/login/legacy">
    <p><input name="email" size="32" placeholder="email"></p>
    <p><input name="password" type="password" size="32" placeholder="password"></p>
    <button>Sign in via legacy SSO</button></form></div>
  <p style="font-size:12px;color:#9ca3af">Demo mailbox: demo@hexavoice.local (demo password is the obvious one).</p>`);
}
function registerPage(msg) {
  return layout(null, 'Register', `<h1>Create your HexaVoice account</h1>
  ${msg ? `<p style="color:#fca5a5">${esc(msg)}</p>` : ''}
  <div class="card"><form method="POST" action="/register">
  <p><input name="name" size="32" placeholder="display name" required></p>
  <p><input name="email" size="32" placeholder="email" required></p>
  <p><input name="password" type="password" size="32" placeholder="password" required></p>
  <button>Register</button></form></div>`);
}
function dashboardPage(user) {
  const mine = recordings.filter(r => r.ownerId === user.id);
  const quota = PLAN_MINUTES[user.plan] || 60;
  const rows = mine.map(r => `<tr><td><a href="/recordings/${r.id}">${esc(r.title)}</a></td><td>${Math.round(r.durationSec / 60)} min</td><td>${r.isPrivate ? 'Private' : 'Shared'}</td><td>${r.transcribed ? 'Ready' : 'Pending'}</td></tr>`).join('');
  return layout(user, 'Dashboard', `<h1>Welcome back</h1>
  <div class="card"><b>Plan:</b> ${esc(user.plan)} · <b>Minutes used:</b> ${user.minutesUsed} / ${quota} · <b>Role:</b> ${esc(user.role)}</div>
  <div class="card"><h3>Your recordings</h3><table><tr><th>Title</th><th>Length</th><th>Visibility</th><th>Transcript</th></tr>${rows || '<tr><td colspan=4>None yet</td></tr>'}</table>
  <p><a href="/recordings">Browse all recordings</a> · <a href="/tests">Mission page</a></p></div>`);
}
function testsPage(user) {
  const st = featureStats();
  let html = `<h1>Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1><p>${doneCount()}/${totalTests()} tests complete (${pct()}%). Hints reveal one at a time. Help from the Lab Coach unlocks after 3 attempts on a feature.</p>`;
  for (const f of FEATURES) {
    html += `<div class="card"><h3>${esc(f)} — ${st[f].done}/${st[f].total} done · ${st[f].attempts} attempt(s)</h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const done = state.tests[t.id];
      html += `<div style="border-top:1px solid #1f2937;padding:8px 0">
        <span>${done ? '✓' : '○'}</span> <b>${esc(t.name)}</b> <span style="color:#9ca3af;font-size:12px">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
        <div><button type="button" onclick="var s=this.parentNode.nextElementSibling;s.style.display='block';var h=s.querySelectorAll('.hint');for(var i=0;i<h.length;i++){if(h[i].style.display==='none'){h[i].style.display='block';break;}}">Hint</button></div>
        <div style="display:none">${t.hints.map(h => `<p class="hint" style="display:none;color:#fbbf24">💡 ${esc(h)}</p>`).join('')}</div>
      </div>`;
    }
    html += `</div>`;
  }
  return layout(user, 'Mission', html);
}

/* ------------------------------------------------------------------ *
 * HTTP server.
 * ------------------------------------------------------------------ */
function send(res, code, body, type, extra) {
  const headers = Object.assign({ 'Content-Type': type || 'text/html; charset=utf-8' }, extra || {});
  res.writeHead(code, headers); res.end(body);
}
function redirect(res, to, extra) { res.writeHead(302, Object.assign({ Location: to }, extra || {})); res.end(); }

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const cookies = parseCookies(req);
    const sid = cookies.hv_session || '';
    const sessUser = sid && sessions[sid] ? users.find(x => x.id === sessions[sid]) : null;
    const setHx = { 'Set-Cookie': 'hx_origin=' + (sid || 'guest') + '; Path=/; HttpOnly' };

    // logo is always public
    if (p === '/logo.png') {
      try { const buf = fs.readFileSync(LOGO_FILE); return send(res, 200, buf, 'image/png'); }
      catch (e) { return send(res, 404, 'no logo'); }
    }
    // progress API + chat stay reachable at the gate (coach answers there too)
    if (p === '/api/progress') {
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: totalTests(), done: doneCount(), pct: pct(), features: featureStats(), complete: isComplete() }), 'application/json');
    }
    if (p === '/api/chat' && req.method === 'POST') {
      const body = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: coachReply(body.message) }), 'application/json');
    }
    // unlock endpoint
    if (p === '/unlock' && req.method === 'POST') {
      const body = await readBody(req);
      const given = String(body.key || '');
      if (entryKeyMatches(given)) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage('That key was not accepted.'));
    }
    // ----- LOCK GATE -----
    if (!state.unlocked) {
      if (p === '/unlock') return send(res, 200, gatePage(''));
      return send(res, 200, gatePage(''));
    }

    const user = sessUser; // may be null (visitor) for the few public routes below

    // ---------- auth ----------
    if (p === '/login' && req.method === 'GET') return send(res, 200, loginPage(''), 'text/html', setHx);
    if (p === '/register' && req.method === 'GET') return send(res, 200, registerPage(''), 'text/html', setHx);
    if (p === '/login' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const email = String(b.email || ''), pw = String(b.password || '');
      const acct = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      const probeKey = 's' + (sid || req.socket.remoteAddress || 'x');
      enumProbes[probeKey] = enumProbes[probeKey] || { existing: false, missing: false };
      if (!acct) { enumProbes[probeKey].missing = true; if (enumProbes[probeKey].existing) pass('user-enumeration'); return send(res, 200, loginPage('No account found for that email address.'), 'text/html', setHx); }
      if (acct.password !== pw) {
        enumProbes[probeKey].existing = true; if (enumProbes[probeKey].missing) pass('user-enumeration');
        loginFailures[acct.email] = (loginFailures[acct.email] || 0) + 1;
        if (loginFailures[acct.email] >= 10) pass('brute-force'); // 10th failure still processed — no throttle anywhere
        return send(res, 200, loginPage('Wrong password for ' + esc(acct.email) + ' (attempt ' + loginFailures[acct.email] + ').'), 'text/html', setHx);
      }
      loginFailures[acct.email] = 0;
      if (acct.email === 'demo@hexavoice.local') pass('default-creds');
      const nsid = crypto.randomBytes(12).toString('hex');
      sessions[nsid] = acct.id;
      return redirect(res, '/', { 'Set-Cookie': ['hv_session=' + nsid + '; Path=/; HttpOnly', 'hv_role=' + acct.role + '; Path=/'] });
    }
    if (p === '/login/legacy' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const email = String(b.email || ''), pw = String(b.password || '');
      // VULNERABLE (simulated): query glued from raw input, then "evaluated".
      const query = "SELECT * FROM users WHERE email='" + email + "' AND password='" + pw + "'";
      let matched = null;
      const comment = email.match(/^(.*?)'\s*--/);
      const orMatch = query.match(/'\s*or\s*'([^']*)'\s*=\s*'([^']*)'/i) || query.match(/'\s*or\s*(\d+)\s*=\s*(\d+)/i);
      if (comment) { matched = users.find(x => x.email.toLowerCase() === comment[1].trim().toLowerCase()) || null; if (matched) pass('sqli-login'); }
      else if (orMatch && orMatch[1] === orMatch[2]) { matched = users[0]; pass('sqli-login'); }
      if (!matched) { const a = users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === pw); if (a) matched = a; }
      if (!matched) return send(res, 200, loginPage('Legacy SSO rejected the sign-in. Query was: ' + esc(query)), 'text/html', setHx);
      const nsid = crypto.randomBytes(12).toString('hex');
      sessions[nsid] = matched.id;
      return redirect(res, '/', { 'Set-Cookie': ['hv_session=' + nsid + '; Path=/; HttpOnly', 'hv_role=' + matched.role + '; Path=/'] });
    }
    if (p === '/logout') { if (sid) delete sessions[sid]; return redirect(res, '/login', { 'Set-Cookie': ['hv_session=; Path=/; Max-Age=0', 'hv_role=; Path=/; Max-Age=0'] }); }
    if (p === '/forgot' && req.method === 'GET') {
      return send(res, 200, layout(null, 'Forgot', `<h1>Forgot password</h1><div class="card">
      <form method="POST" action="/forgot"><p><input name="email" size="32" placeholder="email"></p><button>Send reset link</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/forgot' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const email = String(b.email || '');
      const acct = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      const probeKey = 's' + (sid || req.socket.remoteAddress || 'x');
      enumProbes[probeKey] = enumProbes[probeKey] || { existing: false, missing: false };
      if (!acct) { enumProbes[probeKey].missing = true; if (enumProbes[probeKey].existing) pass('user-enumeration'); return send(res, 200, layout(null, 'Forgot', '<p>No such account exists for that email.</p>'), 'text/html', setHx); }
      enumProbes[probeKey].existing = true; if (enumProbes[probeKey].missing) pass('user-enumeration');
      const token = resetTokenFor(acct.email);
      issuedResetTokens.add(token);
      return send(res, 200, layout(null, 'Forgot', `<p>Reset link "emailed" to ${esc(acct.email)}: <code>/reset?email=${encodeURIComponent(acct.email)}&amp;token=${esc(token)}</code> (simulated outbox — in a real app this would only go to the mailbox).</p>`), 'text/html', setHx);
    }
    if (p === '/reset' && req.method === 'GET') {
      const email = u.searchParams.get('email') || '', token = u.searchParams.get('token') || '';
      return send(res, 200, layout(null, 'Reset', `<h1>Reset password</h1><div class="card">
      <form method="POST" action="/reset"><input type="hidden" name="email" value="${esc(email)}"><input type="hidden" name="token" value="${esc(token)}">
      <p><input name="newpassword" type="password" size="32" placeholder="new password"></p><button>Set new password</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/reset' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Login & Authentication');
      const email = String(b.email || ''), token = String(b.token || '');
      const acct = users.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!acct) return send(res, 200, layout(null, 'Reset', '<p>No such account.</p>'), 'text/html', setHx);
      if (token !== resetTokenFor(acct.email)) return send(res, 200, layout(null, 'Reset', '<p>Invalid or expired token.</p>'), 'text/html', setHx);
      if (!issuedResetTokens.has(token)) pass('reset-token'); // correct token that was never requested = predicted
      acct.password = String(b.newpassword || 'changed123');
      return send(res, 200, layout(null, 'Reset', '<p>Password updated. <a href="/login">Sign in</a></p>'), 'text/html', setHx);
    }
    if (p === '/register' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Registration & Profile');
      const name = String(b.name || 'New User'), email = String(b.email || ''), pw = String(b.password || '');
      if (!email || !pw) return send(res, 200, registerPage('Email and password are required.'), 'text/html', setHx);
      if (users.find(x => x.email.toLowerCase() === email.toLowerCase())) return send(res, 200, registerPage('That email is already registered.'), 'text/html', setHx);
      const nu = { id: nextUserId++, name, email, password: pw, role: 'user', plan: 'free', minutesUsed: 0 };
      if (b.role) nu.role = String(b.role); // mass assignment (vulnerable on purpose)
      if (b.plan) nu.plan = String(b.plan);
      if (b.minutesUsed) nu.minutesUsed = parseInt(b.minutesUsed, 10) || 0;
      users.push(nu);
      if (pw.length < 4) pass('weak-password');
      if (nu.role === 'admin' || nu.plan === 'enterprise') pass('mass-assignment');
      if (xssPayload(name)) pass('stored-xss-profile');
      const nsid = crypto.randomBytes(12).toString('hex');
      sessions[nsid] = nu.id;
      return redirect(res, '/', { 'Set-Cookie': ['hv_session=' + nsid + '; Path=/; HttpOnly', 'hv_role=' + nu.role + '; Path=/'] });
    }

    // everything below needs a signed-in user
    if (!user) {
      if (p === '/debug') { pass('data-exposure'); return send(res, 200, JSON.stringify({ debug: true, users }, null, 2), 'application/json'); }
      if (p.startsWith('/media/')) { /* handled below even for visitors */ }
      else if (p.startsWith('/share/')) { /* handled below even for visitors */ }
      else if (p.startsWith('/api/')) { /* handled below via API key */ }
      else if (p === '/complete' || p === '/complete/name' || p === '/certificate') { /* completion pages stay public */ } else return redirect(res, '/login');
    }

    // ---------- signed-in pages ----------
    if (p === '/') {
      pass('security-headers'); // responses never carry CSP/XFO/etc. — first real page load proves it
      return send(res, 200, dashboardPage(user), 'text/html', setHx);
    }
    if (p === '/tests') return send(res, 200, testsPage(user), 'text/html', setHx);
    if (p === '/debug') { pass('data-exposure'); return send(res, 200, JSON.stringify({ debug: true, users }, null, 2), 'application/json'); }
    if (p === '/profile' && req.method === 'GET') {
      return send(res, 200, layout(user, 'Profile', `<h1>Your profile</h1><div class="card">
      <form method="POST" action="/profile"><input type="hidden" name="hx_marker" value="${esc(cookies.hx_origin || (sid || 'guest'))}">
      <p>Name: <input name="name" size="32" value="${esc(user.name)}"></p>
      <p>Email: <input name="email" size="32" value="${esc(user.email)}"></p>
      <button>Save profile</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/profile' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Registration & Profile');
      const markerOk = b.hx_marker && cookies.hx_origin && String(b.hx_marker) === String(cookies.hx_origin);
      if (!markerOk) pass('profile-csrf'); // state change accepted without the anti-CSRF marker
      if (b.name) { user.name = String(b.name); if (xssPayload(user.name)) pass('stored-xss-profile'); }
      if (b.email) user.email = String(b.email);
      return redirect(res, '/profile');
    }

    // ---------- recordings ----------
    if (p === '/recordings' && req.method === 'GET') {
      const q = u.searchParams.get('q') || '';
      if (q && xssPayload(q)) pass('reflected-xss-search');
      const list = recordings.filter(r => !q || r.title.toLowerCase().includes(q.toLowerCase()));
      const rows = list.map(r => { const o = users.find(x => x.id === r.ownerId); return `<tr><td><a href="/recordings/${r.id}">${esc(r.title)}</a></td><td>${esc(o ? o.name : '?')}</td><td>${Math.round(r.durationSec / 60)} min</td><td>${r.isPrivate ? 'Private' : 'Shared'}</td></tr>`; }).join('');
      return send(res, 200, layout(user, 'Recordings', `<h1>Recordings</h1>
      <form method="GET" action="/recordings"><input name="q" size="34" placeholder="search recordings" value="${q}"></form>
      ${q ? `<p>Results for: ${q}</p>` : ''}
      <table><tr><th>Title</th><th>Owner</th><th>Length</th><th>Visibility</th></tr>${rows}</table>
      <div class="card"><h3>New recording (simulated)</h3>
      <form method="POST" action="/recordings"><p><input name="title" size="40" placeholder="title"></p>
      <p>Minutes: <input name="minutes" size="6" value="10"> <label><input type="checkbox" name="isPrivate" checked> private</label></p>
      <button>Create</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/recordings' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Recordings & Transcripts');
      const mins = Math.max(1, parseInt(b.minutes, 10) || 10);
      const nr = { id: nextRecId++, ownerId: user.id, title: String(b.title || 'Untitled recording'), durationSec: mins * 60, isPrivate: !!b.isPrivate, speakers: user.name, transcript: '(simulated transcript pending)', transcribed: false };
      recordings.push(nr);
      return redirect(res, '/recordings/' + nr.id);
    }
    const recMatch = p.match(/^\/recordings\/(\d+)$/);
    if (recMatch && req.method === 'GET') {
      const rec = recordings.find(r => r.id === parseInt(recMatch[1], 10));
      if (!rec) return send(res, 404, layout(user, '404', '<h1>Recording not found</h1>'), 'text/html', setHx);
      bump('Recordings & Transcripts');
      if (rec.ownerId !== user.id) pass('recording-idor');
      const owner = users.find(x => x.id === rec.ownerId);
      const recShares = shares.filter(s => s.recordingId === rec.id);
      return send(res, 200, layout(user, 'Recording', `<h1>${esc(rec.title)}</h1>
      <div class="card"><p><b>Owner:</b> ${esc(owner ? owner.name : '?')} · <b>Length:</b> ${Math.round(rec.durationSec / 60)} min · <b>Visibility:</b> ${rec.isPrivate ? 'Private' : 'Shared'}</p>
      <p><b>Speakers:</b> ${esc(rec.speakers)}</p>
      <p><audio controls src="/media/${rec.id}"></audio> <span style="font-size:12px">(simulated audio stream: /media/${rec.id})</span></p>
      <h3>Transcript</h3><p>${esc(rec.transcript)}</p></div>
      <div class="card"><h3>Edit transcript</h3>
      <form method="POST" action="/recordings/${rec.id}/transcript"><p><textarea name="transcript" rows="4" cols="70">${esc(rec.transcript)}</textarea></p><button>Save transcript</button></form>
      <form method="POST" action="/recordings/${rec.id}/transcribe" style="margin-top:10px"><input type="hidden" name="minutes" value="${Math.ceil(rec.durationSec / 60)}"><button>Transcribe (uses minutes)</button></form></div>
      <div class="card"><h3>Sharing</h3>
      <form method="POST" action="/recordings/${rec.id}/share"><button>Create share link</button></form>
      ${recShares.map(s => `<p>🔗 /share/${esc(s.token)}</p>`).join('')}</div>`), 'text/html', setHx);
    }
    const trMatch = p.match(/^\/recordings\/(\d+)\/transcript$/);
    if (trMatch && req.method === 'POST') {
      const rec = recordings.find(r => r.id === parseInt(trMatch[1], 10));
      const b = await readBody(req);
      bump('Recordings & Transcripts');
      if (!rec) return send(res, 404, 'not found');
      if (rec.ownerId !== user.id) pass('transcript-edit'); // no ownership check on write (vulnerable)
      rec.transcript = String(b.transcript || rec.transcript); rec.transcribed = true;
      return redirect(res, '/recordings/' + rec.id);
    }
    const tbMatch = p.match(/^\/recordings\/(\d+)\/transcribe$/);
    if (tbMatch && req.method === 'POST') {
      const rec = recordings.find(r => r.id === parseInt(tbMatch[1], 10));
      const b = await readBody(req);
      bump('Usage & Billing');
      if (!rec) return send(res, 404, 'not found');
      const charged = Math.max(0, parseInt(b.minutes, 10) || 0); // client-supplied minutes trusted (vulnerable)
      const actual = Math.ceil(rec.durationSec / 60);
      const owner = users.find(x => x.id === rec.ownerId);
      if (owner) owner.minutesUsed += charged;
      if (charged < actual) pass('usage-tamper');
      rec.transcribed = true;
      return send(res, 200, layout(user, 'Transcribed', `<div class="card"><h3>Transcript ready</h3><p>Charged <b>${charged}</b> minute(s) (recording length: ${actual} min).</p><p><a href="/recordings/${rec.id}">Back to the recording</a></p></div>`), 'text/html', setHx);
    }
    const shMatch = p.match(/^\/recordings\/(\d+)\/share$/);
    if (shMatch && req.method === 'POST') {
      const rec = recordings.find(r => r.id === parseInt(shMatch[1], 10));
      bump('Sharing Links');
      if (!rec) return send(res, 404, 'not found');
      if (rec.ownerId !== user.id) pass('share-others-recording'); // share created for a foreign recording
      const token = 'shr-' + (nextShareN++);
      shares.push({ token, recordingId: rec.id, createdBy: user.id });
      return redirect(res, '/recordings/' + rec.id);
    }
    if (p.startsWith('/media/')) {
      const id = parseInt(p.slice('/media/'.length), 10);
      const rec = recordings.find(r => r.id === id);
      bump('Recordings & Transcripts');
      if (!rec) return send(res, 404, 'no media');
      const requesterId = user ? user.id : 0;
      if (rec.isPrivate && rec.ownerId !== requesterId) pass('media-predictable'); // private media served to non-owner / anonymous
      return send(res, 200, 'SIMULATED AUDIO STREAM for recording #' + rec.id + ' — "' + rec.title + '"\nTranscript: ' + rec.transcript + '\n', 'text/plain');
    }
    if (p.startsWith('/share/')) {
      const token = decodeURIComponent(p.slice('/share/'.length));
      const probeKey = 'sh' + (sid || req.socket.remoteAddress || 'x');
      const now = Date.now();
      if (!shareProbes[probeKey] || now - shareProbes[probeKey].windowStart > 60000) shareProbes[probeKey] = { tokens: new Set(), windowStart: now };
      shareProbes[probeKey].tokens.add(token);
      bump('Sharing Links');
      if (shareProbes[probeKey].tokens.size >= 5) pass('share-enumeration');
      const sh = shares.find(s => s.token === token);
      if (!sh) return send(res, 404, layout(user, 'Share', '<h1>Share link not found</h1>'));
      const rec = recordings.find(r => r.id === sh.recordingId);
      if (!rec) return send(res, 404, 'gone');
      return send(res, 200, layout(user, 'Shared recording', `<h1>${esc(rec.title)}</h1><div class="card">
      <p>Shared via link · ${Math.round(rec.durationSec / 60)} min · Speakers: ${esc(rec.speakers)}</p>
      <h3>Transcript</h3><p>${esc(rec.transcript)}</p></div>`), 'text/html', setHx);
    }

    // ---------- speakers ----------
    if (p === '/speakers') {
      const rows = speakers.filter(s => s.ownerId === user.id).map(s => `<tr><td><a href="/speakers/${s.id}">${esc(s.name)}</a></td></tr>`).join('');
      return send(res, 200, layout(user, 'Speakers', `<h1>Your speakers</h1><table><tr><th>Speaker</th></tr>${rows}</table>`), 'text/html', setHx);
    }
    const spMatch = p.match(/^\/speakers\/(\d+)$/);
    if (spMatch && req.method === 'GET') {
      const sp = speakers.find(s => s.id === parseInt(spMatch[1], 10));
      if (!sp) return send(res, 404, 'not found');
      bump('Speakers');
      if (sp.ownerId !== user.id) pass('speaker-idor');
      return send(res, 200, layout(user, 'Speaker', `<h1>${esc(sp.name)}</h1><div class="card">
      <p><b>Private voiceprint notes:</b> ${esc(sp.notes)}</p>
      <form method="POST" action="/speakers/${sp.id}/rename"><input name="name" size="30" value="${esc(sp.name)}"><button>Rename</button></form></div>`), 'text/html', setHx);
    }
    const spRen = p.match(/^\/speakers\/(\d+)\/rename$/);
    if (spRen && req.method === 'POST') {
      const sp = speakers.find(s => s.id === parseInt(spRen[1], 10));
      const b = await readBody(req);
      bump('Speakers');
      if (!sp) return send(res, 404, 'not found');
      if (sp.ownerId !== user.id) pass('speaker-edit');
      if (b.name) sp.name = String(b.name);
      return redirect(res, '/speakers/' + sp.id);
    }

    // ---------- billing ----------
    if (p === '/billing') {
      const quota = PLAN_MINUTES[user.plan] || 60;
      return send(res, 200, layout(user, 'Billing', `<h1>Usage &amp; Billing</h1>
      <div class="card"><p><b>Plan:</b> ${esc(user.plan)} · <b>Minutes used:</b> ${user.minutesUsed} / ${quota}</p></div>
      <div class="card"><h3>Upgrade plan</h3>
      <form method="POST" action="/billing/upgrade">
      <p><select name="plan"><option value="pro">Pro — $${PLAN_PRICE.pro}/mo</option><option value="enterprise">Enterprise — $${PLAN_PRICE.enterprise}/mo</option></select></p>
      <input type="hidden" name="price" value="${PLAN_PRICE.enterprise}">
      <button>Upgrade</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/billing/upgrade' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Usage & Billing');
      const plan = String(b.plan || 'pro');
      const price = parseFloat(b.price);
      const list = PLAN_PRICE[plan] != null ? PLAN_PRICE[plan] : 0;
      if (!isNaN(price) && price < list) pass('price-tamper'); // server trusts the posted price
      user.plan = plan;
      return redirect(res, '/billing');
    }

    // ---------- API ----------
    if (p === '/api' && req.method === 'GET') {
      const key = apiKeyFor(user);
      issuedApiKeys.add(key); // opening the API page is the legitimate "issuance"
      return send(res, 200, layout(user, 'API', `<h1>API access</h1><div class="card">
      <p>Your API key: <code>${esc(key)}</code></p>
      <p>Endpoints: <code>GET /api/recordings</code> · <code>GET /api/recordings/&lt;id&gt;</code> — send header <code>x-api-key</code>.</p></div>`), 'text/html', setHx);
    }
    if (p.startsWith('/api/') && p !== '/api/progress' && p !== '/api/chat') {
      const key = req.headers['x-api-key'] || u.searchParams.get('key') || '';
      const keyUser = users.find(x => apiKeyFor(x) === key);
      bump('API Access');
      if (!keyUser) return send(res, 401, JSON.stringify({ error: 'invalid api key' }), 'application/json');
      if (!issuedApiKeys.has(key)) pass('weak-api-key'); // a working key that was never issued = derived from the email
      if (p === '/api/recordings') {
        return send(res, 200, JSON.stringify(recordings.filter(r => r.ownerId === keyUser.id).map(r => ({ id: r.id, title: r.title, durationSec: r.durationSec, isPrivate: r.isPrivate }))), 'application/json');
      }
      const apiRec = p.match(/^\/api\/recordings\/(\d+)$/);
      if (apiRec) {
        const rec = recordings.find(r => r.id === parseInt(apiRec[1], 10));
        if (!rec) return send(res, 404, JSON.stringify({ error: 'not found' }), 'application/json');
        if (rec.ownerId !== keyUser.id) pass('api-bola'); // no ownership check in the API (vulnerable)
        return send(res, 200, JSON.stringify({ id: rec.id, ownerId: rec.ownerId, title: rec.title, durationSec: rec.durationSec, isPrivate: rec.isPrivate, speakers: rec.speakers, transcript: rec.transcript }), 'application/json');
      }
      return send(res, 404, JSON.stringify({ error: 'unknown endpoint' }), 'application/json');
    }

    // ---------- webhooks ----------
    if (p === '/webhooks' && req.method === 'GET') {
      return send(res, 200, layout(user, 'Webhooks', `<h1>Webhooks</h1><div class="card">
      <form method="POST" action="/webhooks"><p><input name="url" size="52" placeholder="https://your-server.example/hook" value="${esc(webhooks[user.id] || '')}"></p>
      <button>Save webhook</button></form>
      <form method="POST" action="/webhooks/test" style="margin-top:8px"><button>Send test event</button></form></div>`), 'text/html', setHx);
    }
    if (p === '/webhooks' && req.method === 'POST') {
      const b = await readBody(req);
      bump('Webhooks & Integrations');
      webhooks[user.id] = String(b.url || '');
      return redirect(res, '/webhooks');
    }
    if (p === '/webhooks/test' && req.method === 'POST') {
      bump('Webhooks & Integrations');
      const target = webhooks[user.id] || '';
      let result;
      // SIMULATED in-app fetch — no real outbound request ever leaves the lab.
      if (/127\.0\.0\.1|localhost|169\.254\.|0\.0\.0\.0|\[::1\]/i.test(target) || /\/debug|\/admin/.test(target)) {
        pass('webhook-ssrf');
        result = 'Webhook delivered (simulated). The internal URL responded with INTERNAL-ONLY content: ' + JSON.stringify(users.map(x => ({ email: x.email, role: x.role, plan: x.plan })));
      } else if (target) {
        result = 'Webhook delivered (simulated): ' + esc(target) + ' responded 200 OK with an empty body.';
      } else {
        result = 'No webhook URL saved yet.';
      }
      return send(res, 200, layout(user, 'Webhooks', `<h1>Webhooks</h1><div class="card"><p>${result}</p><p><a href="/webhooks">Back</a></p></div>`), 'text/html', setHx);
    }

    // ---------- admin ----------
    if (p === '/admin' || p.startsWith('/admin/')) {
      bump('Admin Panel');
      const cookieRole = cookies.hv_role || '';
      const isAdmin = cookieRole === 'admin'; // gate trusts the client cookie (vulnerable)
      if (cookieRole === 'admin' && user.role !== 'admin') pass('cookie-tamper');
      if (!isAdmin) return send(res, 403, layout(user, 'Admin', '<h1>403 — admins only</h1>'), 'text/html', setHx);
      if (p === '/admin/users/delete') {
        const id = parseInt(u.searchParams.get('id') || '0', 10);
        const idx = users.findIndex(x => x.id === id);
        if (idx >= 0) { users.splice(idx, 1); pass('admin-csrf'); } // destructive GET, no token, no confirmation
        return redirect(res, '/admin');
      }
      const rows = users.map(x => `<tr><td>${x.id}</td><td>${x.name}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${esc(x.plan)}</td><td><a href="/admin/users/delete?id=${x.id}">delete</a></td></tr>`).join('');
      return send(res, 200, layout(user, 'Admin', `<h1>Admin console</h1><div class="card">
      <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th></th></tr>${rows}</table></div>`), 'text/html', setHx);
    }

    // ---------- completion ----------
    if (p === '/complete') {
      if (!isComplete()) {
        const left = TESTS.filter(t => !state.tests[t.id]);
        return send(res, 200, layout(user, 'Not yet', `<h1>Not complete yet — ${pct()}%</h1>
        <p>${doneCount()}/${totalTests()} tests done. Still open:</p><ul>${left.map(t => `<li>${esc(t.feature)} — ${esc(t.name)}</li>`).join('')}</ul>
        <p><a href="/tests">Back to the mission page</a></p>`), 'text/html', setHx);
      }
      const st = featureStats();
      const featList = FEATURES.map(f => `<li><b>${esc(f)}</b> — ${st[f].total} vulnerabilities</li>`).join('');
      const techList = TESTS.map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('');
      const lessons = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
      const impacts = TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
      const reports = TESTS.map(t => `<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
      return send(res, 200, layout(user, 'Complete', `<h1>🎉 LAB ${LAB_NUMBER} — ${LAB_NAME} complete!</h1>
      <div class="card"><h3>1) Total features in this lab</h3><p>${FEATURES.length} features:</p><ul>${featList}</ul></div>
      <div class="card"><h3>2) Vulnerabilities per feature</h3><ul>${featList}</ul></div>
      <div class="card"><h3>3) How testing was done — ${totalTests()} techniques</h3><ul>${techList}</ul></div>
      <div class="card"><h3>4) What you learned</h3><ul>${lessons}</ul></div>
      <div class="card"><h3>5) What this means for a real client</h3><ul>${impacts}</ul></div>
      <div class="card"><h3>6) Writing it in a real report</h3><ul>${reports}</ul></div>
      <div class="card" style="border-color:#7c3aed"><h3>🔑 Completion key for the next lab</h3>
      <p style="font-size:20px"><code>${esc(completionKey())}</code></p>
      <form method="POST" action="/certificate"><p>Your name for the certificate: <input name="testerName" size="30" value="${esc(state.testerName || (user && user.name))}"> <button>Get my certificate</button></p></form></div>`), 'text/html', setHx);
    }
    if (p === '/certificate' && req.method === 'POST') {
      const b = await readBody(req);
      if (b.testerName) { state.testerName = String(b.testerName); saveState(); }
      return redirect(res, '/certificate');
    }
    if (p === '/certificate') {
      if (!isComplete()) return redirect(res, '/complete');
      const name = state.testerName || (user && user.name);
      const date = state.completedAt ? new Date(state.completedAt).toDateString() : new Date().toDateString();
      return send(res, 200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title>
      <style>body{font-family:Georgia,serif;background:#f3f4f6;display:flex;justify-content:center;padding:30px}.card{background:#fff;border:3px solid #7c3aed;border-radius:14px;max-width:640px;padding:36px;text-align:center;color:#111827}@media print{body{background:#fff}}</style></head>
      <body><div class="card">
      <img src="/logo.png" style="height:70px" alt="HexaCyberLab">
      <h1 style="margin:8px 0">Certificate of Completion</h1>
      <p>This certifies that</p>
      <h2 style="color:#6d28d9">${esc(name)}</h2>
      <p>has completed 100% of the security tests in</p>
      <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${totalTests()} tests across ${FEATURES.length} features)</h3>
      <p>${esc(date)}</p>
      <p style="margin-top:22px;font-size:14px">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      </div></body></html>`, 'text/html', setHx);
    }

    return send(res, 404, layout(user, '404', '<h1>404 — not found</h1>'), 'text/html', setHx);
  } catch (e) {
    try { send(res, 500, 'Something hiccuped — the lab is still running.'); } catch (e2) { /* ignore */ }
  }
});

loadState();
if (require.main === module) {
  server.listen(PORT, '127.0.0.1', () => { console.log('HexaVoice LAB ' + LAB_NUMBER + ' listening on http://127.0.0.1:' + PORT); });
}
module.exports = { TESTS, FEATURES, LAB_NUMBER, LAB_NAME, PORT };
