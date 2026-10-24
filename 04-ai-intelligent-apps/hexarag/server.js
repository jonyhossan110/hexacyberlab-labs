'use strict';
/* HexaRAG — LAB 36 — a deliberately vulnerable RAG (retrieval-augmented generation) platform.
   LOCAL-ONLY training lab. Zero-dependency Node. Simulated deterministic retrieval — no real model calls. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3045;
const HOST = '127.0.0.1';
const LAB_NUMBER = 36;
const LAB_NAME = 'HexaRAG';
const BASE = __dirname;
const DATA_DIR = path.join(BASE, 'data');
const PROGRESS_FILE = path.join(BASE, 'progress.json');

/* ---- key material, region 1 of 3 (transformed shards only) ---- */
const _eA = ['TC1YSA==', 'US02Mw==', 'MU9ZQg=='];
const _cA = ['TC1YSA==', 'Ti03Mw=='];

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
/* seed downloadable files */
const SEED_FILES = {
  'refund-policy.txt': 'HexaRAG customer export — Refund Policy summary: refunds within 30 days, original payment method, 5 business days.',
  'onboarding-checklist.txt': 'Client onboarding checklist: verify identity, sign MSA, provision workspace, invite team.',
  'index-manifest.txt': 'Index manifest: collections c1..c4 chunked and embedded (simulated).'
};
for (const [n, c] of Object.entries(SEED_FILES)) {
  const p = path.join(DATA_DIR, n);
  if (!fs.existsSync(p)) { try { fs.writeFileSync(p, c); } catch (e) {} }
}

/* ============================ seed data ============================ */
let nextUserId = 100;
let nextDocId = 100;
const users = [
  { id: 1, email: 'admin@hexarag.local', password: 'Admin123!', name: 'Platform Admin', role: 'admin', workspaceId: null, wsRole: null },
  { id: 2, email: 'sarah@acme.io', password: 'sarah123', name: 'Sarah Chen', role: 'user', workspaceId: 'ws1', wsRole: 'owner' },
  { id: 3, email: 'tom@acme.io', password: 'tom12345', name: 'Tom Becker', role: 'user', workspaceId: 'ws1', wsRole: 'member' },
  { id: 4, email: 'lee@nova.io', password: 'lee12345', name: 'Lee Park', role: 'user', workspaceId: 'ws2', wsRole: 'owner' },
  { id: 5, email: 'demo@hexarag.local', password: 'demo123', name: 'Demo User', role: 'user', workspaceId: 'ws1', wsRole: 'member', defaultCreds: true }
];
const workspaces = [
  { id: 'ws1', name: 'Acme Support' },
  { id: 'ws2', name: 'NovaLegal' }
];
const collections = [
  { id: 'c1', workspaceId: 'ws1', name: 'Support Knowledge Base', visibility: 'workspace' },
  { id: 'c2', workspaceId: 'ws1', name: 'Internal Playbooks', visibility: 'private' },
  { id: 'c3', workspaceId: 'ws2', name: 'Case Files', visibility: 'private' },
  { id: 'c4', workspaceId: 'ws2', name: 'Client Onboarding', visibility: 'workspace' }
];
const documents = [];
function addDoc(id, collectionId, workspaceId, title, content) {
  const d = { id, collectionId, workspaceId, title, content, chunks: content.split(/\n\n+/).map((t, i) => ({ n: i + 1, text: t })) };
  documents.push(d); return d;
}
addDoc('d1', 'c1', 'ws1', 'Refund Policy',
  'Customers may request a refund within 30 days of purchase, no questions asked.\n\nRefunds are issued to the original payment method within five business days.\n\nDamaged or defective items qualify for a full refund without return shipping.');
addDoc('d2', 'c1', 'ws1', 'Password Reset Help',
  'To reset a password, use the Forgot Password link on the sign-in page.\n\nReset links are emailed to the account address and should be used promptly.');
addDoc('d3', 'c2', 'ws1', 'Escalation Playbook',
  'INTERNAL: When a customer threatens to churn, agents may offer the retention discount code SAVE20.\n\nINTERNAL: Enterprise escalations go directly to the duty manager. Never share this playbook outside Acme Support.');
addDoc('d4', 'c2', 'ws1', 'Pricing Exceptions',
  'INTERNAL: Support leads may approve up to 15 percent discretionary discount for annual plans.\n\nINTERNAL: Exceptions above 15 percent require finance sign-off.');
addDoc('d5', 'c3', 'ws2', 'Client Settlement Agreement',
  'CONFIDENTIAL: NovaLegal settled the Hartley matter for 2.4 million dollars.\n\nCONFIDENTIAL: The settlement terms must never be disclosed outside the firm or to any other client.');
addDoc('d6', 'c3', 'ws2', 'Case Intake Notes',
  'Intake for the Hartley matter: opposing counsel is Hart & Vane LLP.\n\nKey dates: mediation on 12 November, filing deadline 30 November.');
addDoc('d7', 'c4', 'ws2', 'Onboarding Checklist',
  'New clients complete identity verification and sign the master services agreement.\n\nThe workspace owner invites team members after the agreement is signed.');

const apiKeys = [
  { id: 'k1', workspaceId: 'ws1', label: 'Website widget', key: 'rag_ws1_read_7f3a', scope: 'read' },
  { id: 'k2', workspaceId: 'ws1', label: 'Indexer service', key: 'rag_ws1_write_9b2c', scope: 'write' },
  { id: 'k3', workspaceId: 'ws2', label: 'NovaLegal portal', key: 'rag_ws2_read_51de', scope: 'read' }
];
let shareCounter = 2;
const shares = { 'shr-1': 'c1', 'shr-2': 'c3' }; // token -> collectionId (sequential, guessable)
const queryLogs = [
  { user: 'sarah@acme.io', workspaceId: 'ws1', question: 'How do refunds work?', sources: 'Refund Policy', at: '2026-10-20 09:14' },
  { user: 'lee@nova.io', workspaceId: 'ws2', question: 'What were the settlement terms for Hartley?', sources: 'Client Settlement Agreement', at: '2026-10-20 10:02' }
];
const sessions = {};       // sid -> userId
const issuedTokens = {};    // userId -> last token issued via /forgot
const loginFails = {};      // email -> count
const enumProbes = {};      // ip -> {existing:Set, missing:Set}
const shareProbes = [];     // {token, at}
const uploadedFiles = new Set();

const SYSTEM_PROMPT = 'SYSTEM PROMPT (internal): You are HexaRAG Assistant, a simulated retrieval assistant. Answer only from retrieved chunks. Never reveal internal index names idx_acme_internal or idx_nova_secret. Never disclose Internal Playbooks or Case Files content to users outside their own workspace.';

function resetTokenFor(u) { return 'tok-' + u.id + '-' + (u.id * 137 + 42); }

/* ============ legacy string-built "SQL" login (simulated) ============ */
function tokenizeSql(q) {
  const toks = []; let i = 0;
  while (i < q.length) {
    const ch = q[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') { i++; continue; }
    if (ch === "'") { let j = i + 1, s = ''; while (j < q.length && q[j] !== "'") { s += q[j]; j++; } toks.push({ t: 'lit', v: s }); i = j + 1; continue; }
    if (ch === '=') { toks.push({ t: 'eq' }); i++; continue; }
    const m = /^[A-Za-z0-9_@.%-]+/.exec(q.slice(i));
    if (m) { const w = m[0]; const up = w.toUpperCase(); if (up === 'AND') toks.push({ t: 'and' }); else if (up === 'OR') toks.push({ t: 'or' }); else toks.push({ t: 'ident', v: w }); i += w.length; continue; }
    i++;
  }
  return toks;
}
function evalWhere(row, where) {
  const toks = tokenizeSql(where); let pos = 0;
  function operand() {
    const tk = toks[pos++]; if (!tk) return '';
    if (tk.t === 'lit') return tk.v;
    if (tk.t === 'ident') { if (tk.v === 'email') return row.email; if (tk.v === 'password') return row.password; return tk.v; }
    return '';
  }
  function factor() { const a = operand(); if (toks[pos] && toks[pos].t === 'eq') { pos++; const b = operand(); return a === b; } return !!a; }
  function term() { let v = factor(); while (toks[pos] && toks[pos].t === 'and') { pos++; v = factor() && v; } return v; }
  function expr() { let v = term(); while (toks[pos] && toks[pos].t === 'or') { pos++; v = term() || v; } return v; }
  try { return expr(); } catch (e) { return false; }
}
function legacyLoginQuery(email, password) {
  const q = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  const where = q.split(' WHERE ')[1];
  for (const u of users) { if (evalWhere(u, where)) return u; }
  return null;
}

/* ============================ TESTS registry ============================ */
const F_AUTH = 'Login & Authentication';
const F_REG = 'Registration & Profile';
const F_DOCS = 'Collections & Documents';
const F_RAG = 'Retrieval & AI Answers';
const F_API = 'API Keys & Sharing';
const F_ADM = 'Admin & Platform';
const TESTS = [
  { id: 'sqli-login', feature: F_AUTH, name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The legacy SSO login builds its query by gluing your input straight into the string.', "Try a quote in the password field and see how the query logic changes.", "Password: ' OR '1'='1 with the admin email — the OR makes the check true without the real password."],
    lesson: 'String-built queries let attacker input change the query logic itself; parameterised queries make input data-only.',
    impact: 'On a client RAG platform this means an attacker signs in as an administrator without any password and reads every indexed document.',
    report: { title: 'SQL Injection in Legacy Login (Authentication Bypass)', severity: 'Critical', remediation: 'Use parameterised queries everywhere; never concatenate user input into SQL.' },
    where: 'POST /login (legacy query path)', how: "Submit the admin email with password ' OR '1'='1 — the evaluated WHERE clause becomes true and a session is issued." },
  { id: 'brute-force', feature: F_AUTH, name: 'Brute Force — No Rate Limiting', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Nothing slows you down when a password guess fails.', 'Script ten wrong passwords for one account and watch what does not happen.', 'After 10 failed logins for the same account the platform still processes attempts — no lockout, no CAPTCHA.'],
    lesson: 'Without throttling or lockout, credential guessing is limited only by attacker patience.',
    impact: 'Attackers can grind through password lists against a client\u2019s workspace owners until one works.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Rate-limit and lock out after repeated failures; add MFA for owners/admins.' },
    where: 'POST /login', how: 'Fail 10 logins for one account; the 10th failure is still processed with no throttle.' },
  { id: 'user-enumeration', feature: F_AUTH, name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for a real account with the error for an address that does not exist.', 'The forgot-password flow answers differently too.', 'Login with sarah@acme.io + wrong password vs nobody@nowhere.io — one says "wrong password", the other "no account found".'],
    lesson: 'Different responses for existing vs non-existing accounts hand attackers a valid-account list for targeted attacks.',
    impact: 'Attackers confirm which client staff have accounts, then aim phishing and password spraying precisely at them.',
    report: { title: 'Account Enumeration via Divergent Auth Responses', severity: 'Medium', remediation: 'Return one generic message for all auth failures and reset requests.' },
    where: 'POST /login and POST /forgot', how: 'Probe one existing and one non-existing email; the responses differ, confirming which accounts exist.' },
  { id: 'default-creds', feature: F_AUTH, name: 'Default Demo Credentials Still Active', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Seeded demo accounts are famous for surviving into production.', 'The demo address follows the product name.', 'demo@hexarag.local with password demo123 signs straight in.'],
    lesson: 'Default and demo credentials are public knowledge; if they work, the attacker needs no exploit at all.',
    impact: 'Anyone on the internet can try the vendor demo login on a client deployment and walk into a live workspace.',
    report: { title: 'Default Demo Account Enabled with Weak Password', severity: 'High', remediation: 'Remove demo accounts from production; force unique credentials at setup.' },
    where: 'POST /login', how: 'Sign in as demo@hexarag.local / demo123 — the seeded demo account is active.' },
  { id: 'reset-token', feature: F_AUTH, name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Authentication Failures', difficulty: 'Intermediate',
    hints: ['Ask for one reset token and study its shape.', 'The token is derived from something public about the account, plus simple arithmetic.', 'Tokens look like tok-<id>-<id times 137 plus 42>. Compute one for another user without ever requesting a reset.'],
    lesson: 'Reset tokens must be long, random and single-use; anything derivable from public data is an account-takeover machine.',
    impact: 'An attacker computes a reset token for the workspace owner and takes over the account — and every document in it.',
    report: { title: 'Predictable Password Reset Tokens', severity: 'High', remediation: 'Generate reset tokens with a CSPRNG, expire them quickly, single use only.' },
    where: 'POST /reset', how: 'Compute tok-<id>-<id*137+42> for a victim and reset their password without any email being sent.' },
  { id: 'cookie-tamper', feature: F_AUTH, name: 'Role Cookie Tampering (Client-Side Role)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After signing in, look at the cookies the app trusts.', 'One cookie carries your role — and the server believes the browser.', 'Set the hx_role cookie to admin and open /admin.'],
    lesson: 'Authorization data must live server-side; anything stored in a cookie can be edited by the user.',
    impact: 'Any low-privilege user becomes platform admin by editing a cookie — full control of a client\u2019s deployment.',
    report: { title: 'Privilege Escalation via Role Stored in a Cookie', severity: 'Critical', remediation: 'Keep roles in the server-side session; never trust client-supplied role values.' },
    where: 'GET /admin with hx_role cookie', how: 'Sign in as a normal user, set hx_role=admin, and the admin console opens.' },

  { id: 'weak-password', feature: F_REG, name: 'Weak Password Policy (1-Character Passwords)', owasp: 'A07:2021 Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and be as lazy as possible with the password.', 'There is no minimum length at all.', 'A one-character password like "a" is accepted.'],
    lesson: 'Password policy is the cheapest control there is; without it users choose guessable passwords.',
    impact: 'Client workspaces fill with one-character and dictionary passwords that fall to the first guessing attempt.',
    report: { title: 'No Minimum Password Strength Enforced', severity: 'Medium', remediation: 'Enforce a minimum length and block common/breached passwords at registration.' },
    where: 'POST /register', how: 'Register with a 1-character password — the account is created.' },
  { id: 'mass-assignment', feature: F_REG, name: 'Mass Assignment — Role Set at Registration', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The registration form shows three fields, but the server reads the whole request body.', 'What happens if you submit a field the form never offered?', 'Add role=admin to the registration POST and the new account is created as an administrator.'],
    lesson: 'Bind only whitelisted fields from requests; blindly assigning the whole body hands attackers the privileged columns.',
    impact: 'Attackers register themselves as platform admins on a client deployment in a single request.',
    report: { title: 'Mass Assignment Allows Self-Registration as Admin', severity: 'Critical', remediation: 'Whitelist assignable fields server-side; set roles explicitly in code, never from input.' },
    where: 'POST /register', how: 'Submit role=admin with the registration; the created account has the admin role.' },
  { id: 'stored-xss-profile', feature: F_REG, name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to teammates on the Team page.', 'It is rendered exactly as typed.', 'Set your display name to a script payload and open /team — the payload is stored and served raw.'],
    lesson: 'Any user-controlled text rendered without encoding becomes stored XSS for every viewer.',
    impact: 'An attacker plants a script in a shared workspace that runs in teammates\u2019 browsers — session theft and actions in their name.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user content on output; add a Content-Security-Policy.' },
    where: 'POST /profile, viewed on GET /team', how: 'Save a display name containing a script payload; it is stored and rendered unescaped.' },
  { id: 'profile-csrf', feature: F_REG, name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile updates accept a plain POST with no anti-CSRF token.', 'A request from another origin — or without the app\u2019s own marker cookie — is still applied.', 'POST /profile with an evil Origin header and a new display name; the change is saved.'],
    lesson: 'State-changing forms need unguessable tokens tied to the session; cookies alone are sent automatically by browsers.',
    impact: 'A malicious page a client user visits can silently rewrite their profile — the classic stepping stone to account abuse.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and verify Origin.' },
    where: 'POST /profile', how: 'Submit a profile change with a cross-site Origin (or no marker cookie); it is applied.' },

  { id: 'collection-idor', feature: F_DOCS, name: 'Collection IDOR — Another Workspace\u2019s Collection', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Collections have simple ids in the URL.', 'The page checks that you are signed in — but not whose collection it is.', 'Sign in as Acme and open /collections/c3, a NovaLegal collection.'],
    lesson: 'Every object read must check ownership against the caller\u2019s workspace, not just authentication.',
    impact: 'One client workspace reads a competitor firm\u2019s entire knowledge base by changing an id in the URL.',
    report: { title: 'Insecure Direct Object Reference on Collections', severity: 'High', remediation: 'Authorise every object access against the session\u2019s workspace.' },
    where: 'GET /collections/:id', how: 'Open another workspace\u2019s collection id while signed in; its documents are listed.' },
  { id: 'document-idor', feature: F_DOCS, name: 'Document IDOR — Read Another Workspace\u2019s Document', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Documents have simple ids too.', 'The confidential ones are the interesting ones.', 'Open /documents/d5 — NovaLegal\u2019s settlement agreement — while signed in as Acme.'],
    lesson: 'Document-level checks matter as much as collection-level ones; attackers enumerate ids.',
    impact: 'Confidential client documents — contracts, settlements, playbooks — leak to any authenticated user of another workspace.',
    report: { title: 'Insecure Direct Object Reference on Documents', severity: 'High', remediation: 'Check document ownership on every read, including chunk/API responses.' },
    where: 'GET /documents/:id', how: 'Open another workspace\u2019s document id; full content and chunks are served.' },
  { id: 'doc-delete-idor', feature: F_DOCS, name: 'Cross-Workspace Document Deletion', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Reading across workspaces works. What about destroying?', 'The delete action performs the same missing check.', 'POST /documents/d6/delete as Acme — a NovaLegal document disappears.'],
    lesson: 'Write and delete paths need the same ownership checks as reads; destructive IDOR is data loss, not just leakage.',
    impact: 'A malicious user deletes a client firm\u2019s indexed documents, wiping their knowledge base.',
    report: { title: 'Missing Authorisation on Document Deletion (Cross-Tenant)', severity: 'High', remediation: 'Authorise destructive actions against object ownership; log and confirm deletions.' },
    where: 'POST /documents/:id/delete', how: 'Delete a document belonging to another workspace; it is removed.' },
  { id: 'upload-traversal', feature: F_DOCS, name: 'Path Traversal in File Download', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The download endpoint takes a file name.', 'It joins the name to the data folder without cleaning it.', 'Request /download?file=../server.js and read the application source.'],
    lesson: 'User-controlled paths must be normalised and confined to an allowed directory.',
    impact: 'Attackers read server source and configuration off a client deployment — the map to every other weakness.',
    report: { title: 'Path Traversal in Download Endpoint', severity: 'High', remediation: 'Resolve paths and verify they stay inside the intended directory; use allow-lists.' },
    where: 'GET /download?file=', how: 'Request ../server.js; the resolved path escapes the data folder and the source is served.' },
  { id: 'html-upload', feature: F_DOCS, name: 'HTML Upload Served Inline (Stored XSS via File)', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['Uploads accept any file type, and files are served back from the app\u2019s own origin.', 'An .html file comes back with an HTML content type.', 'Upload evil.html with a script, then open /files/evil.html — it executes in the app origin.'],
    lesson: 'Uploaded files must be type-checked, stored safely and served with safe content types / disposition.',
    impact: 'Attackers host phishing and script pages on the client\u2019s own trusted domain, executed in signed-in users\u2019 browsers.',
    report: { title: 'Unrestricted HTML Upload Served from Application Origin', severity: 'High', remediation: 'Allow-list file types, serve uploads as attachments from a separate domain.' },
    where: 'POST /collections/:id/upload then GET /files/:name', how: 'Upload an .html file containing a script; it is later served as text/html from the app origin.' },

  { id: 'cross-workspace-retrieval', feature: F_RAG, name: 'Cross-Workspace Retrieval Leakage', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The Ask page lets you choose a collection — but the server never checks that the collection is yours.', 'Post a query naming the other firm\u2019s private collection.', 'Ask about "settlement" with collectionId c3 as an Acme user; the answer is built from NovaLegal\u2019s confidential chunks.'],
    lesson: 'In RAG systems the retrieval layer is an authorization boundary: the index must be filtered by tenant before ranking.',
    impact: 'This is the core RAG nightmare — a client asks a question and the AI answers from another client\u2019s confidential documents.',
    report: { title: 'Retrieval Returns Chunks from Other Tenants\u2019 Collections', severity: 'Critical', remediation: 'Filter retrieval strictly by the caller\u2019s tenant/collection ACL before ranking chunks.' },
    where: 'POST /query with collectionId', how: 'Query another workspace\u2019s collection; the generated answer cites its chunks as sources.' },
  { id: 'poisoned-document', feature: F_RAG, name: 'Poisoned Document Hijacks AI Answers', owasp: 'A03:2021 Injection', difficulty: 'Advanced',
    hints: ['The answer builder trusts instructional text inside retrieved documents.', 'Index a document containing an instruction marker and wording that matches your question.', 'Upload a doc with [[INSTRUCTION: ...]] and query for its keywords — the assistant repeats the attacker\u2019s text as its answer.'],
    lesson: 'Retrieved content is untrusted input; an assistant must never treat document text as instructions (indirect prompt injection).',
    impact: 'Anyone who can add a document — a support vendor, a rogue employee — controls what the client\u2019s AI tells customers.',
    report: { title: 'Indirect Prompt Injection via Indexed Document', severity: 'High', remediation: 'Treat retrieved text as data, screen instruction-like content, and never let chunks override system behaviour.' },
    where: 'POST /collections/:id/upload then POST /query', how: 'A document containing an [[INSTRUCTION: ...]] marker is indexed; a matching query makes the answer repeat the attacker text.' },
  { id: 'system-prompt-leak', feature: F_RAG, name: 'System Prompt Disclosure via Query Parameter', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The query API has a debug-flavoured parameter the UI never shows.', 'Ask for the JSON format and add includeSystem=1.', 'The response JSON gains a system field containing the internal prompt, including secret index names.'],
    lesson: 'Debug affordances in production APIs leak the system prompt — and with it the guardrails and internal naming attackers probe.',
    impact: 'Attackers learn exactly how the client\u2019s assistant is instructed and which internal collections exist, then craft targeted extraction queries.',
    report: { title: 'System Prompt Exposed via Query API Parameter', severity: 'Medium', remediation: 'Remove debug parameters from production; never return system prompts to clients.' },
    where: 'POST /query?includeSystem=1 (JSON)', how: 'Request a JSON answer with includeSystem=1; the internal system prompt is included in the response.' },

  { id: 'share-token-enum', feature: F_API, name: 'Guessable Share Links — Sequential Tokens', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Shared collections get public links. Look at the token pattern.', 'shr-1, shr-2... what do you think shr-3 will be?', 'Probe five different share tokens quickly; sequential ids make every shared collection enumerable.'],
    lesson: 'Public links must use long random tokens; sequential ids turn "shared with a link" into "published to everyone".',
    impact: 'Anyone can walk through a client\u2019s shared collections — including the legal firm\u2019s case files shared "temporarily".',
    report: { title: 'Enumerable Public Share Tokens', severity: 'High', remediation: 'Use cryptographically random share tokens (128-bit+) with expiry and revocation.' },
    where: 'GET /shared/:token', how: 'Probe 5 distinct sequential share tokens within a minute; the pattern exposes other workspaces\u2019 shared collections.' },
  { id: 'apikey-scope-abuse', feature: F_API, name: 'Read-Only API Key Can Index Documents', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['API keys carry scopes. Does the write endpoint actually check them?', 'The website widget key is read-only. Try writing with it.', 'POST /api/documents with the read key rag_ws1_read_7f3a and a new document — it is indexed.'],
    lesson: 'Scopes must be enforced on every endpoint; a scope that is only displayed, not checked, is decoration.',
    impact: 'A leaked read-only key — the kind embedded in public websites — becomes full write access to the client\u2019s knowledge base.',
    report: { title: 'API Key Scope Not Enforced on Write Endpoint', severity: 'High', remediation: 'Enforce key scopes server-side on every API route; deny by default.' },
    where: 'POST /api/documents with a read-scope key', how: 'Index a new document using the read-only website-widget key; the write succeeds.' },
  { id: 'apikey-bola', feature: F_API, name: 'API Keys of Another Workspace Disclosed (BOLA)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The API keys settings page takes a workspace parameter.', 'It never checks the workspace is yours.', 'Open /settings/api-keys?workspace=ws2 as Acme and read NovaLegal\u2019s live key secrets.'],
    lesson: 'Settings and admin-style listings are high-value BOLA targets: they hand out credentials, not just data.',
    impact: 'One workspace steals another firm\u2019s API keys and can read or poison their index through the official API.',
    report: { title: 'Broken Object-Level Authorisation Exposes Other Tenants\u2019 API Keys', severity: 'Critical', remediation: 'Scope every settings query to the session\u2019s workspace; mask secrets after creation.' },
    where: 'GET /settings/api-keys?workspace=', how: 'Request another workspace\u2019s key list; full key secrets are returned.' },
  { id: 'query-log-exposure', feature: F_API, name: 'Query Logs Expose Every Workspace\u2019s Questions', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The query log page is meant for workspace admins reviewing their own team.', 'It shows everyone\u2019s questions instead.', 'Open /settings/query-logs as a regular member; NovaLegal\u2019s questions — including the settlement query — are listed.'],
    lesson: 'Logs and analytics are sensitive data: user questions reveal intentions, clients and matters.',
    impact: 'A law-firm client\u2019s confidential questions ("settlement terms for Hartley") are visible to a different company\u2019s staff.',
    report: { title: 'Cross-Tenant Exposure of Query Logs', severity: 'High', remediation: 'Scope log views to the caller\u2019s workspace and role; treat prompts as confidential data.' },
    where: 'GET /settings/query-logs', how: 'Open the log page as a normal member; entries from another workspace are shown.' },

  { id: 'admin-get-delete', feature: F_ADM, name: 'User Deletion via GET (Admin CSRF)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['In the admin console, deleting a user is a link, not a form.', 'A state change on GET needs no token and no confirmation.', 'As admin, GET /admin/users/<id>/delete removes the account immediately — an attacker page could fire it in an admin\u2019s browser.'],
    lesson: 'State changes require POST + CSRF token + confirmation; GET endpoints that mutate are CSRF by design.',
    impact: 'One malicious link opened by a platform admin deletes user accounts on the client\u2019s deployment.',
    report: { title: 'State-Changing GET Endpoint Deletes Users (CSRF)', severity: 'High', remediation: 'Use POST/DELETE with CSRF tokens and confirmation for destructive admin actions.' },
    where: 'GET /admin/users/:id/delete', how: 'Call the delete URL with a plain GET as an admin; the user is deleted.' },
  { id: 'debug-exposure', feature: F_ADM, name: 'Debug Endpoint Dumps Keys & System Prompt', owasp: 'A05:2021 Security Misconfiguration', difficulty: 'Beginner',
    hints: ['Developers leave diagnostic routes behind. This one is at the obvious path.', 'Any signed-in user can open it — admin or not.', 'GET /debug returns every workspace\u2019s API keys and the internal system prompt as JSON.'],
    lesson: 'Debug endpoints must be removed or admin-gated before production; they concentrate the most sensitive data in one URL.',
    impact: 'A single URL hands any user every API key and the assistant\u2019s internal instructions on a client deployment.',
    report: { title: 'Unauthenticated-Privilege Debug Endpoint Exposes Secrets', severity: 'Critical', remediation: 'Remove debug routes from production or restrict them to admins with audit logging.' },
    where: 'GET /debug', how: 'Open /debug as a non-admin user; API keys and the system prompt are returned.' },
  { id: 'unauth-api-doc', feature: F_ADM, name: 'Unauthenticated API Document Read', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['The API document route validates a key only when one is presented.', 'What happens when no key and no session are sent at all?', 'GET /api/documents/d5 with no credentials returns the confidential settlement document\u2019s chunks.'],
    lesson: 'Authentication must be deny-by-default: "no credentials" is a failure case, not a pass.',
    impact: 'The internet can read indexed client documents through the API without any account at all.',
    report: { title: 'Missing Authentication on API Document Endpoint', severity: 'Critical', remediation: 'Require and validate authentication on every API route; deny by default.' },
    where: 'GET /api/documents/:id', how: 'Request a document\u2019s chunks with no session and no API key; the content is returned.' }
];

/* ---- key material, region 2 of 3 (transformed shards only) ---- */
const _eB = ['LUpMWQ=='];
const _cB = ['Q09BQw==', 'LTZUQQ=='];

function unshard(parts) { return parts.map(s => Buffer.from(s, 'base64').toString('utf8').split('').reverse().join('')).join(''); }
function entryKey() { return unshard([].concat(_eA, _eB, _eC)); }
function completionKey() { return unshard([].concat(_cA, _cB, _cC)); }

/* ============================ progress engine ============================ */
let progress = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadProgress() {
  try { const raw = fs.readFileSync(PROGRESS_FILE, 'utf8'); const p = JSON.parse(raw); if (p && typeof p === 'object') progress = Object.assign(progress, p); } catch (e) {}
  if (!progress.tests) progress.tests = {};
  if (!progress.attempts) progress.attempts = {};
}
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); } catch (e) {} }
loadProgress();
function pass(id) { if (!TESTS.some(t => t.id === id)) return; if (!progress.tests[id]) { progress.tests[id] = true; const done = TESTS.filter(t => progress.tests[t.id]).length; if (done === TESTS.length) { progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; } saveProgress(); } }
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function featuresList() { const out = []; for (const t of TESTS) if (!out.includes(t.feature)) out.push(t.feature); return out; }

/* ============================ http helpers ============================ */
function parseCookies(req) { const out = {}; const h = req.headers.cookie || ''; for (const part of h.split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } return out; }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function xssPayload(s) { return /(<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe|javascript:)/i.test(String(s || '')); }
function isCsrf(req, cookies) { const o = req.headers.origin || req.headers.referer || ''; if (o && !o.includes('127.0.0.1:' + PORT) && !o.includes('localhost:' + PORT)) return true; if (!cookies.hx_origin) return true; return false; }
function currentUser(req) { const c = parseCookies(req); const sid = c.hx_session; if (sid && sessions[sid]) { const u = users.find(x => x.id === sessions[sid]); if (u) return u; } return null; }
function effectiveRole(req, user) { const c = parseCookies(req); return c.hx_role || (user ? user.role : 'user'); }
function readBody(req) { return new Promise(res => { let d = ''; req.on('data', c => { d += c; if (d.length > 2e6) req.destroy(); }); req.on('end', () => res(d)); req.on('error', () => res('')); }); }
function parseForm(raw) { const out = {}; for (const [k, v] of new URLSearchParams(raw)) out[k] = v; return out; }
function parseAny(raw) { const t = (raw || '').trim(); if (t.startsWith('{')) { try { return JSON.parse(t); } catch (e) {} } return parseForm(raw); }
function retrieve(question, cols) {
  const words = String(question || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
  const scored = [];
  for (const col of cols) for (const d of documents.filter(x => x.collectionId === col.id)) for (const ch of d.chunks) {
    const text = ch.text.toLowerCase(); let score = 0; for (const w of words) if (text.includes(w)) score++;
    if (score > 0) scored.push({ doc: d, chunk: ch, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

/* ============================ UI ============================ */
function progressBar() {
  const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
  return `<div style="margin:8px 0"><strong>LAB ${LAB_NUMBER} · ${done}/${total} tests · ${pct}%</strong>
  <div style="background:#e5e7eb;height:12px;border-radius:6px;overflow:hidden"><div style="background:#7c3aed;height:12px;width:${pct}%"></div></div></div>`;
}
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#111827;color:#f9fafb;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:system-ui;z-index:50">
  <div style="padding:10px 14px;font-weight:700;border-bottom:1px solid #374151">🤖 Lab Coach — ${LAB_NAME}</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:10px 14px;font-size:13px;line-height:1.45"></div>
  <div style="display:flex;gap:6px;padding:10px"><input id="hxin" style="flex:1;padding:8px;border-radius:8px;border:1px solid #374151;background:#1f2937;color:#fff" placeholder="Ask the Lab Coach…"><button id="hxbtn" style="padding:8px 12px;border:0;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer">Send</button></div></div>
  <script>
  var log=document.getElementById('hxlog');
  function add(who,txt){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<strong>'+who+':</strong> ';d.appendChild(document.createTextNode(txt));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me what to test, or how a feature works after you have tried it yourself.');
  async function send(){var inp=document.getElementById('hxin');var m=inp.value.trim();if(!m)return;inp.value='';add('You',m);try{var r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});var j=await r.json();add('Coach',j.reply);}catch(e){add('Coach','Chat is unavailable right now.');}}
  document.getElementById('hxbtn').onclick=send;document.getElementById('hxin').addEventListener('keydown',function(e){if(e.key==='Enter')send();});
  </script>`;
}
function layout(user, title, body) {
  const nav = user ? `<nav style="display:flex;gap:14px;flex-wrap:wrap;margin:10px 0">
    <a href="/dashboard">Dashboard</a><a href="/collections">Collections</a><a href="/query">Ask the AI</a><a href="/team">Team</a>
    <a href="/settings/api-keys">API Keys</a><a href="/settings/query-logs">Query Logs</a><a href="/tests">Tests</a><a href="/profile">Profile</a>
    ${effectiveRole({ headers: {} }, user) === 'admin' || user.role === 'admin' ? '' : ''}<a href="/admin">Admin</a><a href="/logout">Logout (${esc(user.name)})</a></nav>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — ${LAB_NAME}</title></head>
  <body style="font-family:system-ui;max-width:960px;margin:0 auto;padding:18px;color:#111827">
  <header style="display:flex;align-items:center;gap:12px"><img src="/logo.png" alt="HexaCyberLab" style="height:44px"><div><h1 style="margin:0;font-size:22px">LAB ${LAB_NUMBER} — ${LAB_NAME}</h1><div style="color:#6b7280;font-size:13px">Retrieval-Augmented Generation Platform · HexaCyberLab training lab</div></div></header>
  ${progressBar()}${nav}<main>${body}</main>${chatWidget()}
  <footer style="margin-top:28px;color:#9ca3af;font-size:12px">HexaCyberLab — Built by Md. Jony Hassain, Founder. Local training lab only — contains deliberate vulnerabilities.</footer>
  </body></html>`;
}
function gatePage(msg) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (locked)</title></head>
  <body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:18px">
  <img src="/logo.png" style="height:52px"><h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
  ${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/unlock"><input name="key" style="width:100%;padding:10px" placeholder="Paste the completion key from Lab ${LAB_NUMBER - 1}"><button style="margin-top:10px;padding:10px 18px">Unlock</button></form>
  ${chatWidget()}</body></html>`;
}
function loginPage(msg) {
  return `<h2>Sign in to ${LAB_NAME}</h2>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/login"><label>Email<br><input name="email" style="width:320px;padding:8px"></label><br><br>
  <label>Password<br><input name="password" type="password" style="width:320px;padding:8px"></label><br><br><button style="padding:9px 18px">Sign in</button></form>
  <p><a href="/forgot">Forgot password?</a> · <a href="/register">Create an account</a></p>
  <p style="color:#6b7280;font-size:13px">Demo accounts: sarah@acme.io / sarah123 (Acme owner) · tom@acme.io / tom12345 · lee@nova.io / lee12345 (NovaLegal owner) · admin@hexarag.local / Admin123!</p>`;
}
function registerPage(msg) {
  return `<h2>Create your ${LAB_NAME} account</h2>${msg ? `<p style="color:#b91c1c">${esc(msg)}</p>` : ''}
  <form method="POST" action="/register"><label>Full name<br><input name="name" style="width:320px;padding:8px"></label><br><br>
  <label>Email<br><input name="email" style="width:320px;padding:8px"></label><br><br>
  <label>Password<br><input name="password" type="password" style="width:320px;padding:8px"></label><br><br><button style="padding:9px 18px">Register</button></form>`;
}

/* ---- key material, region 3 of 3 (transformed shards only) ---- */
const _eC = ['WDZNVw==', 'T0s4Sw=='];
const _cC = ['NUFUMA==', 'SURBSA=='];

/* ============================ chatbot ============================ */
const CHAT_KEYS = [
  [F_AUTH, ['login', 'auth', 'sign in', 'brute', 'reset token', 'password']],
  [F_REG, ['register', 'registration', 'profile', 'sign up', 'display name']],
  [F_DOCS, ['collection', 'document', 'upload', 'download', 'file']],
  [F_RAG, ['retrieval', 'query', 'answer', 'ask', 'rag', 'poison', 'system prompt', 'ai']],
  [F_API, ['api', 'share', 'sharing', 'shared', 'logs']],
  [F_ADM, ['admin', 'debug', 'platform', 'delete user']]
];
function chatReply(message) {
  const low = String(message || '').toLowerCase();
  const total = TESTS.length, done = doneCount();
  if (/(who\s+(built|made|created|developed)|founder|jony|built this|made this)/.test(low)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (low.includes('key') && /(completion|next|unlock|give|share|what)/.test(low)) {
    if (progress.keyRevealed && done === total) return 'You completed the lab — here is the completion key for the next lab: ' + completionKey();
    return 'I do not have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at ' + done + '/' + total + ' tests. Finish every test and ask me again.';
  }
  let feature = null;
  for (const [f, keys] of CHAT_KEYS) { if (keys.some(k => low.includes(k))) { feature = f; break; } }
  if (!feature) { for (const t of TESTS) { if (low.includes(t.name.toLowerCase().split(' ')[0]) && low.length > 3) { /* weak match, ignore */ } } }
  const asksCount = /(how many|which|list|what tests|what vulnerabilit|tests in|features)/.test(low);
  if (asksCount) {
    if (feature) { const ts = TESTS.filter(t => t.feature === feature); return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name).join('; ') + '. You have tried this feature ' + (progress.attempts[feature] || 0) + ' time(s) so far.'; }
    return 'This lab has ' + featuresList().length + ' features and ' + total + ' tests: ' + featuresList().map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. Your progress: ' + done + '/' + total + ' (' + Math.floor(done / total * 100) + '%). Open /tests to see every mission and its hints.';
  }
  if (feature) {
    const att = progress.attempts[feature] || 0;
    const ts = TESTS.filter(t => t.feature === feature);
    if (att >= 3 || ts.every(t => progress.tests[t.id])) {
      return 'Step by step for ' + feature + ':\n' + ts.map(t => '• ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
  }
  const next = TESTS.find(t => !progress.tests[t.id]);
  return 'I can explain the lab map (ask "how many tests in Login?"), or guide you on a feature after you have tried it 3 times. ' + (next ? 'A good next target: "' + next.name + '" in ' + next.feature + ' — see /tests for its hints.' : 'Everything is complete — open /complete for your key and certificate.');
}

/* ============================ server ============================ */
const server = http.createServer(async (req, res) => {
  const jar = [];
  function send(code, body, type, headers) { jar.push('hx_origin=hexarag; Path=/'); const h = { 'Content-Type': (type || 'text/html') + '; charset=utf-8', 'Set-Cookie': jar }; if (headers) Object.assign(h, headers); res.writeHead(code, h); res.end(body); }
  function redirect(loc) { jar.push('hx_origin=hexarag; Path=/'); res.writeHead(302, { Location: loc, 'Set-Cookie': jar }); res.end(); }
  function json(code, obj) { send(code, JSON.stringify(obj, null, 2), 'application/json'); }
  try {
    const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
    const p = u.pathname;
    const cookies = parseCookies(req);
    const user = currentUser(req);

    if (p === '/logo.png' && req.method === 'GET') { try { const img = fs.readFileSync(path.join(BASE, 'logo.png')); jar.push('hx_origin=hexarag; Path=/'); res.writeHead(200, { 'Content-Type': 'image/png', 'Set-Cookie': jar }); res.end(img); } catch (e) { send(404, 'not found', 'text/plain'); } return; }
    if (p === '/api/chat' && req.method === 'POST') { const b = parseAny(await readBody(req)); json(200, { reply: chatReply(b.message) }); return; }
    if (p === '/unlock' && req.method === 'POST') {
      const b = parseAny(await readBody(req));
      if (String(b.key || '').trim() === entryKey()) { progress.unlocked = true; saveProgress(); redirect('/login'); }
      else { res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': ['hx_origin=hexarag; Path=/'] }); res.end(gatePage('That key was not accepted. Check the completion key from the previous lab and try again.')); }
      return;
    }
    if (!progress.unlocked) { if (req.method === 'GET') { send(200, gatePage()); } else { send(403, 'This lab is locked. Unlock it first.', 'text/plain'); } return; }

    /* ---- public / auth pages ---- */
    if (p === '/login' && req.method === 'GET') { send(200, layout(null, 'Sign in', loginPage(u.searchParams.get('m') === 'bad' ? 'Sign-in failed.' : ''))); return; }
    if (p === '/login' && req.method === 'POST') {
      const b = parseForm(await readBody(req)); attempt(F_AUTH);
      const email = String(b.email || ''), password = String(b.password || '');
      const legit = users.find(x => x.email === email && x.password === password);
      const startSession = (usr) => { const sid = crypto.randomBytes(12).toString('hex'); sessions[sid] = usr.id; jar.push('hx_session=' + sid + '; Path=/; HttpOnly'); jar.push('hx_role=' + usr.role + '; Path=/'); redirect('/dashboard'); };
      if (legit) { if (legit.defaultCreds && password === 'demo123') pass('default-creds'); startSession(legit); return; }
      const inj = legacyLoginQuery(email, password);
      if (inj) { pass('sqli-login'); startSession(inj); return; }
      loginFails[email] = (loginFails[email] || 0) + 1;
      if (loginFails[email] >= 10) pass('brute-force');
      const ip = req.socket.remoteAddress || 'x';
      const ep = enumProbes[ip] || (enumProbes[ip] = { existing: new Set(), missing: new Set() });
      if (users.some(x => x.email === email)) ep.existing.add(email); else ep.missing.add(email);
      if (ep.existing.size && ep.missing.size) pass('user-enumeration');
      const exists = users.some(x => x.email === email);
      send(200, layout(null, 'Sign in', loginPage(exists ? 'Wrong password for this account.' : 'No account found for that email.')));
      return;
    }
    if (p === '/logout') { const sid = cookies.hx_session; if (sid) delete sessions[sid]; jar.push('hx_session=; Path=/; Max-Age=0'); jar.push('hx_role=; Path=/; Max-Age=0'); redirect('/login'); return; }
    if (p === '/register' && req.method === 'GET') { send(200, layout(null, 'Register', registerPage())); return; }
    if (p === '/register' && req.method === 'POST') {
      const b = parseForm(await readBody(req)); attempt(F_REG);
      if (users.some(x => x.email === b.email)) { send(200, layout(null, 'Register', registerPage('That email is already registered.'))); return; }
      const nu = { id: nextUserId++, email: String(b.email || ''), password: String(b.password || ''), name: String(b.name || 'New User'), role: b.role === 'admin' ? 'admin' : 'user', workspaceId: 'ws1', wsRole: 'member' };
      users.push(nu);
      if (String(b.password || '').length < 4) pass('weak-password');
      if (nu.role === 'admin') pass('mass-assignment');
      const sid = crypto.randomBytes(12).toString('hex'); sessions[sid] = nu.id; jar.push('hx_session=' + sid + '; Path=/; HttpOnly'); jar.push('hx_role=' + nu.role + '; Path=/');
      redirect('/dashboard'); return;
    }
    if (p === '/forgot' && req.method === 'GET') { send(200, layout(null, 'Forgot password', '<h2>Forgot password</h2><form method="POST" action="/forgot"><label>Email<br><input name="email" style="width:320px;padding:8px"></label><br><br><button style="padding:9px 18px">Send reset link</button></form>')); return; }
    if (p === '/forgot' && req.method === 'POST') {
      const b = parseForm(await readBody(req)); attempt(F_AUTH);
      const usr = users.find(x => x.email === b.email);
      const ip = req.socket.remoteAddress || 'x';
      const ep = enumProbes[ip] || (enumProbes[ip] = { existing: new Set(), missing: new Set() });
      if (usr) { ep.existing.add(usr.email); issuedTokens[usr.id] = resetTokenFor(usr); } else ep.missing.add(String(b.email || ''));
      if (ep.existing.size && ep.missing.size) pass('user-enumeration');
      send(200, layout(null, 'Forgot password', usr ? '<h2>Reset link sent</h2><p>A reset link was sent to ' + esc(usr.email) + '.</p><p style="color:#6b7280;font-size:13px">(Demo build: the emailed token is <code>' + esc(issuedTokens[usr.id]) + '</code> — use it on the <a href="/reset">reset page</a>.)</p>' : '<h2>Not found</h2><p>No account found for that email.</p>'));
      return;
    }
    if (p === '/reset' && req.method === 'GET') { send(200, layout(null, 'Reset password', '<h2>Reset password</h2><form method="POST" action="/reset"><label>Email<br><input name="email" style="width:320px;padding:8px"></label><br><br><label>Reset token<br><input name="token" style="width:320px;padding:8px"></label><br><br><label>New password<br><input name="newpassword" type="password" style="width:320px;padding:8px"></label><br><br><button style="padding:9px 18px">Reset password</button></form>')); return; }
    if (p === '/reset' && req.method === 'POST') {
      const b = parseForm(await readBody(req)); attempt(F_AUTH);
      const usr = users.find(x => x.email === b.email);
      if (usr && String(b.token || '') === resetTokenFor(usr)) {
        const wasIssued = issuedTokens[usr.id] === String(b.token || '');
        usr.password = String(b.newpassword || 'changed123'); delete issuedTokens[usr.id];
        if (!wasIssued) pass('reset-token');
        send(200, layout(null, 'Reset password', '<h2>Password updated</h2><p>You can now <a href="/login">sign in</a> with your new password.</p>'));
      } else send(200, layout(null, 'Reset password', '<h2>Invalid token</h2><p>That reset token was not accepted.</p>'));
      return;
    }
    if (p.startsWith('/shared/')) {
      const token = decodeURIComponent(p.slice(8)); attempt(F_API);
      shareProbes.push({ token, at: Date.now() });
      const recent = shareProbes.filter(x => Date.now() - x.at < 60000);
      if (new Set(recent.map(x => x.token)).size >= 5) pass('share-token-enum');
      const colId = shares[token]; const col = collections.find(c => c.id === colId);
      if (!col) { send(404, layout(null, 'Shared link', '<h2>Shared link not found</h2>'), 'text/html'); return; }
      const docs = documents.filter(d => d.collectionId === col.id);
      send(200, layout(null, 'Shared collection', '<h2>Shared collection: ' + esc(col.name) + '</h2><p style="color:#6b7280">Read-only public link</p><ul>' + docs.map(d => '<li><strong>' + esc(d.title) + '</strong><br><span style="color:#374151">' + esc(d.chunks[0] ? d.chunks[0].text : '') + '</span></li>').join('') + '</ul>'));
      return;
    }
    if (p === '/api/documents' && req.method === 'POST') {
      attempt(F_API);
      const k = apiKeys.find(x => x.key === req.headers['x-api-key']);
      if (!k) { json(401, { error: 'invalid api key' }); return; }
      const b = parseAny(await readBody(req));
      const col = collections.find(c => c.id === b.collectionId);
      if (!col) { json(404, { error: 'collection not found' }); return; }
      const d = addDoc('d' + (++nextDocId), col.id, col.workspaceId, String(b.title || 'API document'), String(b.content || ''));
      if (k.scope === 'read') pass('apikey-scope-abuse');
      json(200, { ok: true, id: d.id });
      return;
    }
    const apiDoc = p.match(/^\/api\/documents\/(.+)$/);
    if (apiDoc && req.method === 'GET') {
      attempt(F_ADM);
      const doc = documents.find(d => d.id === decodeURIComponent(apiDoc[1]));
      if (!doc) { json(404, { error: 'not found' }); return; }
      const keyOk = apiKeys.some(x => x.key === req.headers['x-api-key']);
      if (!user && !keyOk) pass('unauth-api-doc');
      json(200, { id: doc.id, title: doc.title, collection: doc.collectionId, chunks: doc.chunks });
      return;
    }
    if (p === '/api/progress') { const feats = {}; for (const f of featuresList()) { const ts = TESTS.filter(t => t.feature === f); feats[f] = { total: ts.length, done: ts.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 }; } json(200, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: Math.floor(doneCount() / TESTS.length * 100), features: feats, complete: doneCount() === TESTS.length }); return; }

    /* ---- everything below needs a signed-in user ---- */
    if (!user) { redirect('/login'); return; }

    if (p === '/' || p === '/dashboard') {
      const mine = collections.filter(c => c.workspaceId === user.workspaceId);
      const ws = workspaces.find(w => w.id === user.workspaceId);
      send(200, layout(user, 'Dashboard', `<h2>${esc(ws ? ws.name : 'Platform')} workspace</h2>
      <p>Signed in as ${esc(user.email)} (${esc(user.wsRole || user.role)}). Your RAG workspace indexes documents into collections and answers questions from them — simulated retrieval, no real model.</p>
      <h3>Your collections</h3><ul>${mine.map(c => `<li><a href="/collections/${c.id}">${esc(c.name)}</a> — ${documents.filter(d => d.collectionId === c.id).length} documents</li>`).join('')}</ul>
      <p><a href="/query">Ask the AI a question →</a></p>`));
      return;
    }
    if (p === '/collections' && req.method === 'GET') {
      const mine = collections.filter(c => c.workspaceId === user.workspaceId);
      send(200, layout(user, 'Collections', '<h2>Collections</h2><ul>' + mine.map(c => `<li><a href="/collections/${c.id}">${esc(c.name)}</a> (${esc(c.visibility)}) — ${documents.filter(d => d.collectionId === c.id).length} documents</li>`).join('') + '</ul><h3>New collection</h3><form method="POST" action="/collections"><input name="name" placeholder="Collection name" style="padding:8px;width:280px"> <button style="padding:8px 14px">Create</button></form>'));
      return;
    }
    if (p === '/collections' && req.method === 'POST') { const b = parseForm(await readBody(req)); collections.push({ id: 'c' + (++nextDocId), workspaceId: user.workspaceId, name: String(b.name || 'Untitled'), visibility: 'workspace' }); redirect('/collections'); return; }
    const colMatch = p.match(/^\/collections\/(.+)$/);
    if (colMatch && req.method === 'GET') {
      attempt(F_DOCS);
      const col = collections.find(c => c.id === decodeURIComponent(colMatch[1]));
      if (!col) { send(404, layout(user, 'Not found', '<h2>Collection not found</h2>')); return; }
      if (col.workspaceId !== user.workspaceId) pass('collection-idor');
      const docs = documents.filter(d => d.collectionId === col.id);
      send(200, layout(user, 'Collection', `<h2>${esc(col.name)}</h2><p style="color:#6b7280">Workspace: ${esc((workspaces.find(w => w.id === col.workspaceId) || {}).name || '')} · ${esc(col.visibility)}</p>
      <ul>${docs.map(d => `<li><a href="/documents/${d.id}">${esc(d.title)}</a> <form method="POST" action="/documents/${d.id}/delete" style="display:inline"><button>Delete</button></form></li>`).join('') || '<li>No documents yet.</li>'}</ul>
      <h3>Index a document</h3><form method="POST" action="/collections/${col.id}/upload"><label>File name<br><input name="filename" placeholder="notes.txt" style="padding:8px;width:280px"></label><br><br><label>Content<br><textarea name="content" rows="5" style="width:100%"></textarea></label><br><button style="padding:8px 14px">Upload &amp; index</button></form>
      <h3>Share</h3><form method="POST" action="/collections/${col.id}/share"><button style="padding:8px 14px">Create public share link</button></form>`));
      return;
    }
    const upMatch = p.match(/^\/collections\/(.+)\/upload$/);
    if (upMatch && req.method === 'POST') {
      attempt(F_DOCS);
      const col = collections.find(c => c.id === decodeURIComponent(upMatch[1]));
      if (!col) { send(404, 'not found', 'text/plain'); return; }
      const b = parseForm(await readBody(req));
      const fname = String(b.filename || 'upload.txt');
      try { fs.writeFileSync(path.join(DATA_DIR, fname), String(b.content || '')); uploadedFiles.add(fname); } catch (e) {}
      addDoc('d' + (++nextDocId), col.id, col.workspaceId, fname, String(b.content || ''));
      redirect('/collections/' + col.id); return;
    }
    const shMatch = p.match(/^\/collections\/(.+)\/share$/);
    if (shMatch && req.method === 'POST') {
      attempt(F_API);
      const token = 'shr-' + (++shareCounter); shares[token] = decodeURIComponent(shMatch[1]);
      send(200, layout(user, 'Share link', '<h2>Share link created</h2><p>Anyone with this link can read the collection:</p><p><a href="/shared/' + token + '">/shared/' + token + '</a></p>'));
      return;
    }
    const docMatch = p.match(/^\/documents\/(.+)$/);
    if (docMatch && req.method === 'GET') {
      attempt(F_DOCS);
      const doc = documents.find(d => d.id === decodeURIComponent(docMatch[1]));
      if (!doc) { send(404, layout(user, 'Not found', '<h2>Document not found</h2>')); return; }
      if (doc.workspaceId !== user.workspaceId) pass('document-idor');
      send(200, layout(user, 'Document', `<h2>${esc(doc.title)}</h2><p style="color:#6b7280">Collection: ${esc((collections.find(c => c.id === doc.collectionId) || {}).name || '')} · indexed in ${doc.chunks.length} chunk(s)</p>` + doc.chunks.map(ch => `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin:8px 0"><strong>Chunk ${ch.n}</strong><br>${esc(ch.text)}</div>`).join('')));
      return;
    }
    const delMatch = p.match(/^\/documents\/(.+)\/delete$/);
    if (delMatch && req.method === 'POST') {
      attempt(F_DOCS);
      const idx = documents.findIndex(d => d.id === decodeURIComponent(delMatch[1]));
      if (idx >= 0) { if (documents[idx].workspaceId !== user.workspaceId) pass('doc-delete-idor'); documents.splice(idx, 1); }
      redirect('/collections'); return;
    }
    if (p === '/download') {
      attempt(F_DOCS);
      const file = u.searchParams.get('file') || '';
      const resolved = path.resolve(DATA_DIR, file);
      let data = null; try { data = fs.readFileSync(resolved, 'utf8'); } catch (e) {}
      if (data === null) { send(404, 'file not found', 'text/plain'); return; }
      if (!resolved.startsWith(path.resolve(DATA_DIR))) pass('upload-traversal');
      send(200, data, 'text/plain'); return;
    }
    const fileMatch = p.match(/^\/files\/(.+)$/);
    if (fileMatch && req.method === 'GET') {
      attempt(F_DOCS);
      const name = decodeURIComponent(fileMatch[1]);
      let data = null; try { data = fs.readFileSync(path.join(DATA_DIR, name)); } catch (e) {}
      if (data === null) { send(404, 'file not found', 'text/plain'); return; }
      const ext = path.extname(name).toLowerCase();
      const mime = ext === '.html' ? 'text/html' : ext === '.svg' ? 'image/svg+xml' : 'text/plain';
      if (uploadedFiles.has(name) && (ext === '.html' || ext === '.svg')) pass('html-upload');
      jar.push('hx_origin=hexarag; Path=/'); res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8', 'Set-Cookie': jar }); res.end(data); return;
    }
    if (p === '/query' && req.method === 'GET') {
      const mine = collections.filter(c => c.workspaceId === user.workspaceId);
      send(200, layout(user, 'Ask the AI', `<h2>Ask the AI</h2><p>Answers are generated from retrieved document chunks (simulated).</p>
      <form method="POST" action="/query"><label>Question<br><input name="question" style="width:100%;padding:8px"></label><br><br>
      <label>Collection<br><select name="collectionId"><option value="">All my collections</option>${mine.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><br><br>
      <button style="padding:9px 18px">Ask</button></form>`));
      return;
    }
    if (p === '/query' && req.method === 'POST') {
      attempt(F_RAG);
      const b = parseAny(await readBody(req));
      const question = String(b.question || '');
      const colId = String(b.collectionId || u.searchParams.get('collectionId') || '');
      const includeSystem = String(b.includeSystem || u.searchParams.get('includeSystem') || '') === '1';
      const wantJson = String(b.format || u.searchParams.get('format') || '') === 'json' || includeSystem;
      const cols = colId ? collections.filter(c => c.id === colId) : collections.filter(c => c.workspaceId === user.workspaceId);
      const results = retrieve(question, cols);
      let poisonedText = null;
      for (const r of results) { const m = r.chunk.text.match(/\[\[INSTRUCTION:\s*([^\]]+)\]\]/i); if (m) { poisonedText = m[1].trim(); break; } }
      const answer = poisonedText || (results.length ? 'Based on the retrieved sources: "' + results[0].chunk.text + '"' : 'I could not find anything relevant in the selected collections.');
      if (results.some(r => r.doc.workspaceId !== user.workspaceId)) pass('cross-workspace-retrieval');
      if (poisonedText) pass('poisoned-document');
      queryLogs.push({ user: user.email, workspaceId: user.workspaceId, question, sources: results.map(r => r.doc.title).join(', ') || '—', at: new Date().toISOString().slice(0, 16).replace('T', ' ') });
      if (includeSystem) pass('system-prompt-leak');
      if (wantJson) { const out = { answer, sources: results.map(r => ({ document: r.doc.title, collection: (collections.find(c => c.id === r.doc.collectionId) || {}).name || '' })) }; if (includeSystem) out.system = SYSTEM_PROMPT; json(200, out); return; }
      send(200, layout(user, 'Answer', `<h2>Answer</h2><div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px">${esc(answer)}</div>
      <h3>Sources</h3><ul>${results.map(r => `<li>${esc(r.doc.title)} — chunk ${r.chunk.n}</li>`).join('') || '<li>None</li>'}</ul><p><a href="/query">Ask another question</a></p>`));
      return;
    }
    if (p === '/team') {
      const members = users.filter(x => x.workspaceId === user.workspaceId);
      send(200, layout(user, 'Team', '<h2>Team</h2><ul>' + members.map(m => `<li>${m.name} — ${esc(m.email)} (${esc(m.wsRole || '')})</li>`).join('') + '</ul>'));
      return;
    }
    if (p === '/profile' && req.method === 'GET') { send(200, layout(user, 'Profile', `<h2>Your profile</h2><form method="POST" action="/profile"><label>Display name<br><input name="name" value="${esc(user.name)}" style="width:320px;padding:8px"></label><br><br><button style="padding:9px 18px">Save</button></form>`)); return; }
    if (p === '/profile' && req.method === 'POST') {
      const b = parseForm(await readBody(req)); attempt(F_REG);
      if (isCsrf(req, cookies)) pass('profile-csrf');
      if (xssPayload(b.name)) pass('stored-xss-profile');
      user.name = String(b.name || user.name);
      redirect('/team'); return;
    }
    if (p === '/settings/api-keys') {
      attempt(F_API);
      const ws = u.searchParams.get('workspace') || user.workspaceId;
      const keys = apiKeys.filter(k => k.workspaceId === ws);
      if (ws !== user.workspaceId && keys.length) pass('apikey-bola');
      send(200, layout(user, 'API keys', `<h2>API keys — ${esc((workspaces.find(w => w.id === ws) || {}).name || ws)}</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Label</th><th>Key</th><th>Scope</th></tr>${keys.map(k => `<tr><td>${esc(k.label)}</td><td><code>${esc(k.key)}</code></td><td>${esc(k.scope)}</td></tr>`).join('')}</table>`));
      return;
    }
    if (p === '/settings/query-logs') {
      attempt(F_API);
      if (queryLogs.some(l => l.workspaceId !== user.workspaceId)) pass('query-log-exposure');
      send(200, layout(user, 'Query logs', '<h2>Query logs (all workspaces)</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>When</th><th>User</th><th>Workspace</th><th>Question</th><th>Sources</th></tr>' + queryLogs.map(l => `<tr><td>${esc(l.at)}</td><td>${esc(l.user)}</td><td>${esc((workspaces.find(w => w.id === l.workspaceId) || {}).name || l.workspaceId)}</td><td>${esc(l.question)}</td><td>${esc(l.sources)}</td></tr>`).join('') + '</table>'));
      return;
    }
    if (p === '/admin' && req.method === 'GET') {
      attempt(F_ADM);
      if (effectiveRole(req, user) !== 'admin') { send(403, layout(user, 'Admin', '<h2>Admin only</h2><p>Your role does not allow access to the admin console.</p>')); return; }
      if (user.role !== 'admin') pass('cookie-tamper');
      send(200, layout(user, 'Admin', '<h2>Admin console</h2><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Action</th></tr>' + users.map(x => `<tr><td>${x.id}</td><td>${esc(x.email)}</td><td>${esc(x.name)}</td><td>${esc(x.role)}</td><td><a href="/admin/users/${x.id}/delete">Delete</a></td></tr>`).join('') + '</table>'));
      return;
    }
    const admDel = p.match(/^\/admin\/users\/(\d+)\/delete$/);
    if (admDel && req.method === 'GET') {
      attempt(F_ADM);
      if (effectiveRole(req, user) !== 'admin') { send(403, 'admin only', 'text/plain'); return; }
      const idx = users.findIndex(x => x.id === Number(admDel[1]));
      if (idx >= 0) { users.splice(idx, 1); pass('admin-get-delete'); }
      redirect('/admin'); return;
    }
    if (p === '/debug') {
      attempt(F_ADM);
      if (user.role !== 'admin') pass('debug-exposure');
      json(200, { app: LAB_NAME, workspaces, apiKeys, system: SYSTEM_PROMPT, note: 'Debug build — do not ship.' });
      return;
    }
    if (p === '/tests') {
      const total = TESTS.length, done = doneCount(), pct = Math.floor(done / total * 100);
      let html = `<h2>Mission — security tests</h2><p>${done}/${total} complete · ${pct}% · Attempts are counted per feature; the Lab Coach unlocks step-by-step help after 3 tries on a feature.</p>`;
      for (const f of featuresList()) {
        const ts = TESTS.filter(t => t.feature === f);
        html += `<h3>${esc(f)} <span style="color:#6b7280">(${ts.filter(t => progress.tests[t.id]).length}/${ts.length} · attempts: ${progress.attempts[f] || 0})</span></h3>`;
        for (const t of ts) {
          html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin:8px 0"><strong>${progress.tests[t.id] ? '✓' : '○'} ${esc(t.name)}</strong> <span style="color:#6b7280">${esc(t.owasp)} · ${esc(t.difficulty)}</span>
          <details><summary>Hints</summary><ol><li>${esc(t.hints[0])}<details><summary>More help</summary><ol start="2"><li>${esc(t.hints[1])}<details><summary>Almost the answer</summary><ol start="3"><li>${esc(t.hints[2])}</li></ol></details></li></ol></details></li></ol></details></div>`;
        }
      }
      send(200, layout(user, 'Tests', html)); return;
    }
    if (p === '/complete') {
      const total = TESTS.length, done = doneCount();
      if (done < total) { send(200, layout(user, 'Complete', `<h2>Not yet complete</h2><p>${done}/${total} tests done. Remaining:</p><ul>${TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${esc(t.name)} (${esc(t.feature)})</li>`).join('')}</ul>`)); return; }
      const perFeature = featuresList().map(f => { const ts = TESTS.filter(t => t.feature === f); return `<li><strong>${esc(f)}</strong>: ${ts.length} vulnerabilities</li>`; }).join('');
      const ways = TESTS.map(t => `<li>${esc(t.name)} — ${esc(t.owasp)}</li>`).join('');
      const learned = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.lesson)}</li>`).join('');
      const client = TESTS.map(t => `<li><strong>${esc(t.name)}:</strong> ${esc(t.impact)}</li>`).join('');
      const report = TESTS.map(t => `<li><strong>${esc(t.report.title)}</strong> — Severity: ${esc(t.report.severity)} — Fix: ${esc(t.report.remediation)}</li>`).join('');
      send(200, layout(user, 'Complete', `<h2>🎉 Lab complete — 100%</h2>
      <h3>1) Total features in this lab</h3><p>${featuresList().length} features, ${total} tests.</p>
      <h3>2) Vulnerabilities per feature</h3><ul>${perFeature}</ul>
      <h3>3) How testing was done (${total} ways)</h3><ul>${ways}</ul>
      <h3>4) What you learned</h3><ul>${learned}</ul>
      <h3>5) What this means for a real client</h3><ul>${client}</ul>
      <h3>6) Writing it in a real report</h3><ul>${report}</ul>
      <h3>Your completion key (unlocks Lab ${LAB_NUMBER + 1})</h3>
      <p style="font-size:20px;background:#f5f3ff;border:1px solid #7c3aed;border-radius:8px;padding:14px"><code>${esc(completionKey())}</code></p>
      <form method="POST" action="/complete/name"><label>Your name for the certificate<br><input name="name" value="${esc(progress.testerName || user.name)}" style="width:320px;padding:8px"></label> <button style="padding:9px 16px">Save &amp; view certificate</button></form>
      <p><a href="/certificate">Go to your certificate →</a></p>`));
      return;
    }
    if (p === '/complete/name' && req.method === 'POST') { const b = parseForm(await readBody(req)); progress.testerName = String(b.name || ''); saveProgress(); redirect('/certificate'); return; }
    if (p === '/certificate') {
      if (doneCount() < TESTS.length) { send(200, layout(user, 'Certificate', '<h2>Certificate locked</h2><p>Complete 100% of the tests first.</p>')); return; }
      const name = progress.testerName || user.name || 'HexaCyberLab Tester';
      const date = progress.completedAt ? new Date(progress.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      send(200, `<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER}</title><style>@media print{button{display:none}}</style></head>
      <body style="font-family:Georgia,serif;background:#f9fafb;padding:30px"><div style="max-width:720px;margin:0 auto;background:#fff;border:3px solid #7c3aed;border-radius:14px;padding:36px;text-align:center">
      <img src="/logo.png" style="height:64px"><h1 style="margin:10px 0">Certificate of Completion</h1>
      <p>This certifies that</p><h2 style="color:#7c3aed">${esc(name)}</h2>
      <p>has completed 100% of the security tests in <strong>LAB ${LAB_NUMBER} — ${LAB_NAME}</strong><br>(${TESTS.length} tests across ${featuresList().length} features)</p>
      <p>Completed on ${esc(date)}</p><hr style="border-color:#e5e7eb">
      <p style="font-weight:700">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
      <button onclick="window.print()">Print</button></div></body></html>`);
      return;
    }
    send(404, layout(user, 'Not found', '<h2>404 — page not found</h2>'));
  } catch (e) { try { send(500, 'server error', 'text/plain'); } catch (x) {} }
});

module.exports = { TESTS };
if (require.main === module) { server.listen(PORT, HOST, () => console.log(LAB_NAME + ' lab listening on http://' + HOST + ':' + PORT)); }
