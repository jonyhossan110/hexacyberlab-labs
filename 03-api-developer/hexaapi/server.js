'use strict';
// HexaAPI — Deliberately Vulnerable API Platform Lab (LOCAL ONLY)
// Run: node server.js  -> http://localhost:3030
// WARNING: Never deploy publicly. For authorized local pentest practice only.
// Every intentional flaw is marked with a  // VULN(<n>):  comment, numbered to
// match VULNERABILITIES.md (groups 1-18, OWASP API Security Top 10 2023).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = 3030;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'api.db');
const PUBLIC_DIR = path.join(ROOT, 'public');
// VULN(2): the JWT signing secret is a guessable word, hard-coded in source —
// and it leaks again at /api/v2/debug/config (VULN(9)). Anyone who reads it
// can mint a token for any user, including the platform operator.
const JWT_SECRET = 'secret123';

function md5(s){ return crypto.createHash('md5').update(String(s)).digest('hex'); }
// VULN(weak-crypto): passwords stored as unsalted MD5 (same bad pattern as the sibling labs)
function esc(s){ if(s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function b64e(o){ return Buffer.from(JSON.stringify(o)).toString('base64'); }
function b64d(s){ try{ return JSON.parse(Buffer.from(String(s),'base64').toString()); }catch(e){ return null; } }
function b64url(buf){ return Buffer.from(buf).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromB64url(s){ return Buffer.from(String(s).replace(/-/g,'+').replace(/_/g,'/'),'base64'); }
function now(){ return Math.floor(Date.now()/1000); }

// ---------- Tokens (JWT-like, hand-rolled) ----------
function signToken(user){
  const header = { alg:'HS256', typ:'JWT' };
  // VULN(14): tokens live for TEN YEARS. There is no revocation list, so logout
  // and password changes cannot kill a token either (see /auth/logout).
  const payload = { uid:user.id, company_id:user.company_id, role:user.role, is_admin:user.is_admin?1:0,
                    iat:now(), exp:now() + 10*365*24*3600 };
  const h = b64url(Buffer.from(JSON.stringify(header)));
  const p = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+p).digest());
  return h+'.'+p+'.'+sig;
}
function verifyToken(tok){
  const parts = String(tok||'').split('.');
  if(parts.length !== 3) return null;
  const header = b64d(parts[0].replace(/-/g,'+').replace(/_/g,'/'));
  const payload = b64d(parts[1].replace(/-/g,'+').replace(/_/g,'/'));
  if(!header || !payload || !payload.uid) return null;
  // VULN(2): alg=none is accepted — an UNSIGNED token with any payload is trusted.
  if(header.alg === 'none') return payload;
  const expect = b64url(crypto.createHmac('sha256', JWT_SECRET).update(parts[0]+'.'+parts[1]).digest());
  if(expect !== parts[2]) return null;
  // VULN(14): exp is never checked — even a long-expired token is accepted.
  return payload;
}

// ---------- DB ----------
const db = new DatabaseSync(DB_PATH);
db.exec(`
CREATE TABLE IF NOT EXISTS companies(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT,slug TEXT UNIQUE,plan TEXT DEFAULT 'Growth',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,email TEXT UNIQUE,password TEXT,name TEXT,role TEXT DEFAULT 'user',is_admin INTEGER DEFAULT 0,ssn_last4 TEXT,internal_notes TEXT,otp_code TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,user_id INTEGER,item TEXT,amount REAL,status TEXT DEFAULT 'pending',note TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS invoices(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,order_id INTEGER,amount REAL,status TEXT DEFAULT 'unpaid',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS apikeys(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,user_id INTEGER,label TEXT,key TEXT UNIQUE,scope TEXT DEFAULT 'read',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS coupons(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,discount INTEGER,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS webhooks(id INTEGER PRIMARY KEY AUTOINCREMENT,company_id INTEGER,url TEXT,event TEXT DEFAULT 'order.paid',created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT,msg TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
`);
function logMsg(m){ try{ db.prepare('INSERT INTO logs(msg) VALUES(?)').run(m); }catch(e){} }

function seed(){
  const c = db.prepare('SELECT COUNT(*) c FROM companies').get();
  if(c.c > 0) return;
  const insC = db.prepare('INSERT INTO companies(name,slug,plan) VALUES(?,?,?)');
  const nimbus = insC.run('Nimbus Retail','nimbus','Growth').lastInsertRowid;
  const vertex = insC.run('Vertex Health','vertex','Enterprise').lastInsertRowid;
  const insU = db.prepare('INSERT INTO users(company_id,email,password,name,role,is_admin,ssn_last4,internal_notes) VALUES(?,?,?,?,?,?,?,?)');
  const nina  = insU.run(nimbus,'nina@nimbus.test', md5('nina123'), 'Nina Park','admin',0,'4417','Nimbus account owner. Billing contact.').lastInsertRowid;
  const omar  = insU.run(nimbus,'omar@nimbus.test', md5('omar123'), 'Omar Haddad','user',0,'9021','Support engineer. No special handling.').lastInsertRowid;
  const vince = insU.run(vertex,'vince@vertex.test',md5('vince123'),'Vince Aldana','admin',0,'3355','Vertex account owner.').lastInsertRowid;
  const wren  = insU.run(vertex,'wren@vertex.test', md5('wren123'), 'Wren Okafor','user',0,'7789','CONFIDENTIAL — clinician account under internal review; do not expose outside Vertex.').lastInsertRowid;
  insU.run(null,'root@hexaapi.local', md5('root123'), 'Platform Operator','operator',1,'0000','Platform operator account (HexaAPI staff).');
  // Orders — IDs are global and sequential across companies (guess the neighbour's)
  const insO = db.prepare('INSERT INTO orders(company_id,user_id,item,amount,status,note) VALUES(?,?,?,?,?,?)');
  const o1 = insO.run(nimbus,nina,'POS terminals ×10',4990,'paid','Flagship store rollout.').lastInsertRowid;
  insO.run(nimbus,omar,'Barcode scanners ×25',1250,'pending','Warehouse B restock.');
  const o3 = insO.run(vertex,vince,'Patient monitors ×40',18200,'paid','CONFIDENTIAL — ward 6 fleet renewal, Vertex Health internal pricing.').lastInsertRowid;
  insO.run(vertex,wren,'Telehealth licences ×120',3600,'pending','Quarterly licence true-up.');
  // Invoices
  const insI = db.prepare('INSERT INTO invoices(company_id,order_id,amount,status) VALUES(?,?,?,?)');
  insI.run(nimbus,o1,4990,'paid');
  insI.run(vertex,o3,18200,'unpaid');
  // API keys — VULN(13): the pattern is hx_live_<company-slug>_<seq>. If you have seen
  // one company's key you can write down every company's first key from memory.
  const insK = db.prepare('INSERT INTO apikeys(company_id,user_id,label,key,scope) VALUES(?,?,?,?,?)');
  insK.run(nimbus,nina,'Nimbus reporting key (read-only)','hx_live_nimbus_0001','read');
  insK.run(nimbus,nina,'Nimbus automation key','hx_live_nimbus_0002','write');
  insK.run(vertex,vince,'Vertex reporting key (read-only)','hx_live_vertex_0001','read');
  // Coupons — one live code in a small numeric space, brute-forceable (VULN(7))
  db.prepare('INSERT INTO coupons(code,discount,active) VALUES(?,?,1)').run('SAVE-1042',25);
  db.prepare('INSERT INTO coupons(code,discount,active) VALUES(?,?,1)').run('WELCOME10',10);
  // One seeded outgoing webhook for Nimbus
  db.prepare('INSERT INTO webhooks(company_id,url,event,created_by) VALUES(?,?,?,?)')
    .run(nimbus,'https://hooks.nimbus.test/events','order.paid',nina);
  logMsg('seeded');
}
seed();

// ---------- Serializers ----------
// VULN(3): the API returns the FULL user record — password hash, SSN fragment and
// staff-only internal notes — on every endpoint that touches a user. The web UI
// never shows these fields; the API hands them to anyone who asks.
function userJson(u){
  if(!u) return null;
  return { id:u.id, company_id:u.company_id, email:u.email, name:u.name, role:u.role,
           is_admin:u.is_admin?1:0, password_hash:u.password, ssn_last4:u.ssn_last4,
           internal_notes:u.internal_notes, created_at:u.created_at };
}
function orderJson(o){
  if(!o) return null;
  return { id:o.id, company_id:o.company_id, user_id:o.user_id, item:o.item, amount:o.amount,
           status:o.status, note:o.note, created_at:o.created_at };
}
function invoiceJson(i){
  if(!i) return null;
  return { id:i.id, company_id:i.company_id, order_id:i.order_id, amount:i.amount, status:i.status, created_at:i.created_at };
}
function userById(id){ return db.prepare('SELECT * FROM users WHERE id=?').get(id) || null; }
function companyById(id){ return id==null ? null : (db.prepare('SELECT * FROM companies WHERE id=?').get(id) || null); }

// ---------- HTTP helpers ----------
function readRaw(req){
  return new Promise(resolve=>{
    let data='';
    req.on('data',ch=>{ data+=ch; if(data.length>5e6){ req.destroy(); } });
    req.on('end',()=>resolve(data));
  });
}
function parseForm(raw){ const o={}; new URLSearchParams(raw).forEach((v,k)=>{ o[k]=v; }); return o; }
function send(res,code,body,type){
  res.writeHead(code,{'Content-Type':type||'text/html; charset=utf-8'});
  res.end(body);
}
function sendJson(res,code,obj){ send(res,code,JSON.stringify(obj,null,2),'application/json; charset=utf-8'); }
function redirect(res,to){ res.writeHead(302,{Location:to}); res.end(); }
function cookiesOf(req){
  const o={}; String(req.headers.cookie||'').split(';').forEach(p=>{ const i=p.indexOf('='); if(i>0) o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim()); });
  return o;
}

// ---------- Auth resolution (token OR api key OR web session) ----------
function keyLookup(key){
  if(!key || !String(key).startsWith('hx_live_')) return null;
  const k = db.prepare('SELECT * FROM apikeys WHERE key=?').get(String(key));
  if(!k) return null;
  const u = userById(k.user_id);
  // VULN(13): API keys never expire and the stored scope is NEVER consulted —
  // a key labelled "read-only" can call DELETE exactly like a write key.
  return u ? { user:u, via:'apikey', key:k } : null;
}
function authOf(req,url){
  const auth = String(req.headers['authorization']||'');
  if(auth.startsWith('Bearer ')){
    const tok = auth.slice(7).trim();
    const byKey = keyLookup(tok);
    if(byKey){ noteKeyUse(req, byKey.key); return byKey; }
    const payload = verifyToken(tok);
    if(payload){ const u = userById(payload.uid); if(u){ noteTokenUse(req, tok, payload); return { user:u, via:'token' }; } }
    return null;
  }
  // VULN(13): API keys are also accepted in the URL query string (?api_key=),
  // so they land in server logs, browser history and referrer headers.
  if(url && url.searchParams.get('api_key')){
    const byKey = keyLookup(url.searchParams.get('api_key'));
    if(byKey){ noteKeyUrl(); noteKeyUse(req, byKey.key); return byKey; }
  }
  const sess = b64d(cookiesOf(req).hexaapi_session||'');
  if(sess && sess.uid){ const u = userById(sess.uid); if(u) return { user:u, via:'session' }; }
  return null;
}
function setSession(res,user){
  res.setHeader('Set-Cookie','hexaapi_session=' + encodeURIComponent(b64e({uid:user.id})) + '; Path=/');
}
function requireApi(req,res,url){
  const a = authOf(req,url);
  if(!a){ sendJson(res,401,{error:'unauthorized'}); return null; }
  return a;
}
function requireWeb(req,res){
  const sess = b64d(cookiesOf(req).hexaapi_session||'');
  const u = sess && sess.uid ? userById(sess.uid) : null;
  if(!u){ redirect(res,'/login'); return null; }
  return u;
}

// ---------- Docs / lab-guide data ----------
// VULN(10): the docs list ONLY v2. The still-live /api/v1/* and the
// /api/v2/internal/* endpoints appear in no documentation anywhere.
const DOCS = [
  ['POST','/api/v2/auth/login','Exchange email + password for a bearer token'],
  ['POST','/api/v2/auth/register','Create a user (and optionally a company)'],
  ['POST','/api/v2/auth/logout','Log out'],
  ['GET','/api/v2/auth/me','Current user profile'],
  ['POST','/api/v2/auth/request-otp','Request a 4-digit login OTP'],
  ['POST','/api/v2/auth/verify-otp','Verify an OTP, returns a token'],
  ['GET','/api/v2/users','List users'],
  ['GET','/api/v2/users/:id','Get one user'],
  ['PATCH','/api/v2/users/:id','Update a user (use "me" for yourself)'],
  ['DELETE','/api/v2/users/:id','Delete a user'],
  ['GET','/api/v2/users/export.csv','Export users as CSV'],
  ['GET','/api/v2/orders','List orders'],
  ['GET','/api/v2/orders/:id','Get one order'],
  ['POST','/api/v2/orders','Create an order'],
  ['GET','/api/v2/invoices','List invoices'],
  ['GET','/api/v2/invoices/:id','Get one invoice'],
  ['POST','/api/v2/coupons/redeem','Redeem a coupon code'],
  ['GET','/api/v2/admin/users','Admin: all users (admin function)'],
  ['GET','/api/v2/admin/stats','Admin: platform statistics (admin function)'],
  ['POST','/api/v2/integrations/fetch-url','Fetch a URL server-side and return its body'],
  ['POST','/api/v2/integrations/import-users','Import users from a remote JSON feed'],
  ['POST','/api/v2/webhooks','Register an outgoing webhook'],
  ['POST','/api/v2/webhooks/test','Send a test webhook to a URL'],
  ['POST','/api/v2/webhooks/receive','Incoming webhook receiver (payment events)'],
  ['GET','/api/v2/reports/run','Run a usage report'],
  ['POST','/graphql','GraphQL endpoint'],
];
const GROUPS = [
  [1,'BOLA — object IDs are the only lock','API1','GET /api/v2/orders/:id, /users/:id, /invoices/:id with another company\u2019s token'],
  [2,'Broken authentication — no rate limit, weak + leaked JWT secret, alg=none','API2','Script 50 logins; read /api/v2/debug/config; forge a signed token; send an unsigned alg=none token'],
  [3,'Excessive data exposure — full user records from the API (API3a)','API3','GET /api/v2/users/:id and compare with what the portal shows'],
  [4,'Mass assignment — role / company_id / is_admin from the request body (API3b)','API3','POST /api/v2/auth/register and PATCH /api/v2/users/me with extra fields'],
  [5,'Unrestricted resource consumption — uncapped limits, expensive reports','API4','?limit=100000 on list endpoints; GET /api/v2/reports/run'],
  [6,'BFLA — admin functions without an admin check; X-Admin header trust','API5','DELETE a user as a plain user; GET /api/v2/admin/users; GET /api/v2/admin/stats with X-Admin: true'],
  [7,'Sensitive business flows — coupon + OTP brute force, no throttling','API6','Loop coupon codes SAVE-1000…; brute the 4-digit OTP'],
  [8,'SSRF — URL fetcher and webhook test reach internal endpoints','API7','POST /api/v2/integrations/fetch-url at http://127.0.0.1:3030/internal/secret'],
  [9,'Misconfiguration — CORS reflection, stack-trace errors, /debug/config, no security headers','API8','Send an Origin header; send malformed JSON; open /api/v2/debug/config logged out'],
  [10,'Improper inventory — /api/v1 still live (no auth on reads), undocumented /internal/*','API9','GET /api/v1/orders with no token at all; GET /api/v2/internal/metrics'],
  [11,'Unsafe consumption — import feed trusted verbatim','API10','Serve a JSON feed with role/is_admin set; import it'],
  [12,'GraphQL — introspection on, cross-company queries, role mutation','API8/API1','POST /graphql { __schema }; query user(id:); mutation updateUserRole'],
  [13,'API key failures — no expiry, no scope enforcement, keys in URLs, predictable pattern','API2','Use the read-only key to DELETE; predict hx_live_vertex_0001; ?api_key='],
  [14,'Token lifecycle — 10-year tokens, logout/password-change never revoke','API2','Reuse a token after logout and after a password change'],
  [15,'Parameter pollution — ?company_id= override on list endpoints','API1','GET /api/v2/orders?company_id=2 with a company-1 token'],
  [16,'Export leak — users CSV contains every company','API3','GET /api/v2/users/export.csv'],
  [17,'Enumeration + no verification at registration','API2/API6','Register an existing email; note the exact error'],
  [18,'Forged webhooks — payment events accepted without a signature','API8','POST /api/v2/webhooks/receive to mark a pending order paid'],
  ['★','Capstone — chain: debug leak → forged operator token → full export','—','Combine groups 2, 10 and 16 into one platform takeover'],
];


// ================= LAB SYSTEM — TESTS REGISTRY (LAB 21) =================
const LAB_NUMBER = 21;
const LAB_NAME = 'HexaAPI';
const LAB_PREV = 20;
const FEATURES = ['Authentication & Tokens','Registration & Accounts','Object Access (BOLA)','Admin & Function Access','API Keys','Data Exposure & Exports','Integrations & Webhooks','Platform & Inventory'];
const TESTS = [
{ id:'brute-force', feature:'Authentication & Tokens', name:'Brute Force — No Rate Limit on API Login', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["The API login endpoint answers every attempt at full speed — no lockout, no delay, no CAPTCHA.","Script 10+ wrong passwords for omar@nimbus.test against POST /api/v2/auth/login and watch every one get processed.","After 10 accepted failures the lab marks this test — a real attacker just keeps going until the password falls."],
  lesson:'An unthrottled login endpoint makes online password guessing free and quiet; weak passwords fall in minutes.',
  impact:'On a real client API, attackers credential-stuff and brute-force developer accounts — one guessed password hands over the company\u2019s whole API account, keys included.',
  report:{ title:'Missing Rate Limiting on the Authentication Endpoint', severity:'High', remediation:'Add per-account and per-IP throttling with exponential backoff, lockout and alerting on all auth endpoints; require MFA for admin accounts.' } },
{ id:'jwt-forgery', feature:'Authentication & Tokens', name:'JWT Forgery — alg=none & Weak Leaked Secret', owasp:'API2 Broken Authentication', difficulty:'Intermediate',
  hints:["Decode any token (base64) and read its header — then ask what the verifier does when alg is 'none' and the signature is empty.","The signing secret is also a guessable word — and it leaks somewhere in this app (another test finds it).","Build an unsigned token with uid 5 (the platform operator) and call GET /api/v2/auth/me with it."],
  lesson:'Token verification must pin the algorithm, reject unsigned tokens outright, and protect a strong random secret — a hand-rolled verifier gets all three wrong.',
  impact:'Anyone can mint a token as any user — including the platform operator — turning a public API into a full platform takeover with one crafted request.',
  report:{ title:'Broken JWT Verification (alg=none Accepted, Weak Hard-Coded Secret)', severity:'Critical', remediation:'Use a vetted JWT library; pin alg=HS256 (or asymmetric keys), verify signature and expiry on every request, and load a strong random secret from protected configuration.' } },
{ id:'token-lifecycle', feature:'Authentication & Tokens', name:'Token Lifecycle — Logout & Password Change Revoke Nothing', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Log in via the API and save the token. Now POST /api/v2/auth/logout with it — then call /api/v2/auth/me with the SAME token.","Still works? Decode the token and read its exp claim — how many years is this session meant to live?","Change the account password (PATCH /api/v2/users/me) and try the old token once more."],
  lesson:'Stateless tokens without a revocation story cannot be killed: logout and password changes must invalidate outstanding tokens (denylist or token versioning), and lifetimes must be short.',
  impact:'A stolen token on a real platform stays valid for years — even after the victim logs out everywhere and changes their password. Incident response becomes impossible.',
  report:{ title:'Session Tokens Are Never Revoked and Live for 10 Years', severity:'High', remediation:'Short-lived access tokens with refresh rotation; server-side revocation (denylist / token version bumped on logout and password change); always verify exp.' } },
{ id:'otp-bruteforce', feature:'Authentication & Tokens', name:'OTP Brute Force — 4-Digit Code, Unlimited Attempts', owasp:'API6 Unrestricted Access to Sensitive Business Flows', difficulty:'Beginner',
  hints:["Request a login OTP for wren@vertex.test (POST /api/v2/auth/request-otp). The code is only 4 digits.","Fire wrong guesses at /api/v2/auth/verify-otp — count how many the endpoint accepts without slowing down or locking.","After 10 failed attempts the lab marks this test; the full code space is only 10,000 — scriptable in minutes."],
  lesson:'Short codes plus unlimited verification attempts equal no second factor at all; attempt counters and expiry are part of the control, not extras.',
  impact:'Attackers brute-force the OTP of any account whose email they know and walk through the \u2018extra\u2019 security step as if it did not exist.',
  report:{ title:'OTP Verification Has No Attempt Limit', severity:'High', remediation:'Cap verification attempts (e.g. 5), expire codes within minutes, rate-limit requests, and use longer codes for sensitive actions.' } },
{ id:'account-enumeration', feature:'Registration & Accounts', name:'Account Enumeration — Register & Login Oracles', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Register with an email that already exists (nina@nimbus.test) and read the exact error message.","Compare the API login errors for a real email with a wrong password vs an email that does not exist at all.","Different answers = an oracle: attackers harvest the real user list first, then attack only accounts that exist."],
  lesson:'Auth-adjacent endpoints must answer uniformly; a differing response turns registration and login forms into a user-directory lookup.',
  impact:'Attackers enumerate a client\u2019s real developer and customer emails, then target exactly those accounts with phishing, spraying and OTP attacks.',
  report:{ title:'Account Enumeration via Registration and Login Responses', severity:'Medium', remediation:'Return one generic response for registration and login regardless of whether the account exists; verify email before activation.' } },
{ id:'mass-assignment', feature:'Registration & Accounts', name:'Mass Assignment — Privilege Fields in Register & PATCH', owasp:'API3 Broken Object Property Level Authorization', difficulty:'Beginner',
  hints:["The register form shows a few fields — the server binds more than the form shows.","In Burp or curl, POST /api/v2/auth/register with extra JSON fields: role, company_id, is_admin.","Or PATCH /api/v2/users/me with role/is_admin — then read back what stuck."],
  lesson:'Bind only allowlisted fields per endpoint; role, tenant and admin flags must never arrive from the client.',
  impact:'A free signup becomes another company\u2019s admin — or a platform operator — in one request: instant privilege escalation with no exploit tooling at all.',
  report:{ title:'Mass Assignment on Registration and User Update Endpoints', severity:'Critical', remediation:'Strict per-endpoint field allowlists; role/company/admin changes only through dedicated authorised admin flows; reject unexpected privilege fields.' } },
{ id:'weak-password', feature:'Registration & Accounts', name:'Weak Password Policy — 1-Character Passwords Accepted', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Register a new account and try the shortest password the API lets you submit.","There is no policy at all — a single character is accepted.","Every brute-force and credential-stuffing attack gets easier when accounts like this exist."],
  lesson:'A password policy is cheap defence-in-depth: minimum length and breached-password checks remove the weakest tier of accounts.',
  impact:'Users who pick \u2018x\u2019 or \u2018123\u2019 hand attackers their API accounts — and with them, the company\u2019s keys, orders and customer data.',
  report:{ title:'Missing Password Policy at Registration', severity:'Medium', remediation:'Enforce a minimum length (>=10) and block known-breached passwords at registration and password change.' } },
{ id:'stored-xss', feature:'Registration & Accounts', name:'Stored XSS — Script Payload in a User Name Reaches the Admin Console', owasp:'A03 Injection (XSS)', difficulty:'Intermediate',
  hints:["Some user-controlled text is rendered back RAW somewhere staff look. The admin console prints user names without encoding.","Register (or import) a user whose name is an HTML/script payload.","Open /admin as any logged-in user — the payload is served from storage to every viewer of that console."],
  lesson:'Output encoding must be contextual and universal — one unescaped render point poisons every viewer, including staff.',
  impact:'Attackers plant payloads that fire in the browsers of a client\u2019s admins — session theft and actions performed as the victim, launched from a free account.',
  report:{ title:'Stored Cross-Site Scripting via User Display Name', severity:'High', remediation:'Contextual output encoding on all user content at render; sanitise stored rich text; add a Content-Security-Policy.' } },
{ id:'bola-objects', feature:'Object Access (BOLA)', name:'BOLA — Cross-Company Orders, Users & Invoices by ID', owasp:'API1 Broken Object Level Authorization', difficulty:'Beginner',
  hints:["Object IDs are global and sequential across companies. Log in as Omar (Nimbus) and ask for order #3.","Order #3 belongs to Vertex Health — read its note. Users and invoices work the same way: /api/v2/users/4, /api/v2/invoices/2.","Creating works too: POST /api/v2/orders with another company\u2019s company_id in the body."],
  lesson:'Every object fetch must verify the object belongs to the caller\u2019s tenant — the ID in the URL is not an authorisation check.',
  impact:'BOLA is the #1 real-world API breach pattern: one customer reads (and writes) another customer\u2019s orders, invoices and user records — a reportable data breach.',
  report:{ title:'Broken Object Level Authorization on Orders, Users and Invoices', severity:'Critical', remediation:'On every object access, verify the object\u2019s company_id equals the caller\u2019s company from the authenticated token; return 404 on mismatch; add tenant-isolation tests.' } },
{ id:'param-pollution', feature:'Object Access (BOLA)', name:'Parameter Pollution — ?company_id= Overrides Your Tenant', owasp:'API1 Broken Object Level Authorization', difficulty:'Beginner',
  hints:["Your token already says which company you belong to. The list endpoints ALSO listen to a query parameter.","GET /api/v2/orders?company_id=2 with Omar\u2019s company-1 token and compare the rows.","Tenancy must come from the credential — never from a client-supplied parameter."],
  lesson:'Tenant scope is a server-side fact derived from the authenticated identity; client parameters may filter within that scope, never widen it.',
  impact:'Any customer lists another company\u2019s orders, users and invoices in bulk — the list-endpoint version of BOLA, built for scraping.',
  report:{ title:'Client-Supplied Tenant Parameter Honoured on List Endpoints', severity:'High', remediation:'Derive tenancy from the token only; ignore or reject client-supplied tenant parameters; authorise any explicit cross-tenant parameter separately.' } },
{ id:'graphql-bola', feature:'Object Access (BOLA)', name:'GraphQL BOLA — Cross-Company User Resolution', owasp:'API1 Broken Object Level Authorization', difficulty:'Intermediate',
  hints:["The GraphQL endpoint resolves objects with the same missing checks as REST.","POST /graphql with a user(id:) query for a Vertex user (id 4) using Omar\u2019s token.","The resolver never asks which company you belong to — the full record comes back."],
  lesson:'GraphQL resolvers need the same per-object authorisation as REST handlers; a new protocol surface does not inherit the old checks automatically.',
  impact:'Attackers pivot to the less-tested GraphQL surface and pull the same cross-customer data the REST fixes were supposed to protect.',
  report:{ title:'Missing Object-Level Authorization in GraphQL Resolvers', severity:'High', remediation:'Enforce per-field/per-object authorisation in resolvers identical to REST; centralise ownership checks in one service layer.' } },
{ id:'bfla', feature:'Admin & Function Access', name:'BFLA — Admin Functions Without an Admin Check (+ X-Admin Header Trust)', owasp:'API5 Broken Function Level Authorization', difficulty:'Beginner',
  hints:["Admin functions live at /api/v2/admin/* and DELETE /api/v2/users/:id. Ask what the server checks before running them — not what the UI shows.","As plain-user Omar: GET /api/v2/admin/users, or DELETE a throwaway user you registered.","For /api/v2/admin/stats you get 403 — until you add one header the route blindly trusts: X-Admin: true."],
  lesson:'Function-level authorisation must be enforced server-side on every route, and roles must come from the authenticated session — never from client-supplied headers.',
  impact:'A plain customer deletes accounts, lists every user on the platform and reads platform revenue — vandalism, extortion and breach in a handful of requests.',
  report:{ title:'Broken Function Level Authorization on Admin Endpoints', severity:'Critical', remediation:'Server-side role check on every admin function; derive role from the authenticated token only; never trust client role headers; audit admin actions.' } },
{ id:'graphql-mutation', feature:'Admin & Function Access', name:'GraphQL BFLA — Role Mutation for Any Caller', owasp:'API5 Broken Function Level Authorization', difficulty:'Intermediate',
  hints:["The schema (find it via introspection) contains a mutation that changes user roles.","Call updateUserRole as plain-user Omar, on any user id you like.","No admin check, no company check — the role changes. Mutations are functions, and functions need authorisation."],
  lesson:'Every mutation is a privileged function: apply the same role and tenant checks as the equivalent REST endpoint.',
  impact:'Any customer rewrites roles platform-wide — promoting themselves or demoting a client\u2019s admins — through the \u2018modern\u2019 endpoint nobody reviewed.',
  report:{ title:'GraphQL Mutation Missing Function-Level Authorization', severity:'High', remediation:'Require the same role checks in mutations as in REST admin functions; scope targets to the caller\u2019s tenant; log all role changes.' } },
{ id:'api-key-scope', feature:'API Keys', name:'API Key Scope Never Enforced — Read-Only Key Deletes Users', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Nimbus\u2019s first key (see /keys or the README) is labelled read-only. Its scope is stored — find out if anything ever checks it.","Use hx_live_nimbus_0001 as a Bearer token on a WRITE: DELETE a throwaway user you registered.","It works. A \u2018read-only\u2019 key with full write power is just a leaked password waiting to happen."],
  lesson:'Scopes are authorisation decisions: enforce them on every route, or do not pretend they exist.',
  impact:'A read-only key leaked from a dashboard, log or screenshot gives attackers full write and delete access — far beyond what the client thought they shared.',
  report:{ title:'API Key Scopes Recorded but Never Enforced', severity:'High', remediation:'Enforce key scope per route (read keys: safe methods only); show keys once, store hashed, support expiry and rotation.' } },
{ id:'api-key-predictable', feature:'API Keys', name:'Predictable API Keys — Pattern Gives Away Every Company\u2019s Keys', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Keys follow a pattern: hx_live_<company-slug>_<sequence>. You have seen Nimbus\u2019s keys — what is Vertex\u2019s first key, from memory alone?","Log in to the portal as Omar, then call /api/v2/auth/me presenting the key you predicted — as Omar, who was never issued it.","Possession is the only check, and the secret is guessable: that is the whole flaw."],
  lesson:'API keys are credentials: they need unguessable random material, not a company name and a counter.',
  impact:'Anyone who has seen ONE key (a screenshot, a doc, a log line) can write down every customer\u2019s keys and impersonate any integration on the platform.',
  report:{ title:'Predictable API Key Format Allows Key Forgery by Pattern', severity:'Critical', remediation:'Generate keys from a CSPRNG (>=128-bit entropy), show once, store hashed; never encode tenant or sequence in the secret.' } },
{ id:'api-key-in-url', feature:'API Keys', name:'API Keys Accepted in the URL Query String', owasp:'API2 Broken Authentication', difficulty:'Beginner',
  hints:["Keys work in the Authorization header — try them somewhere they should never be accepted.","GET /api/v2/auth/me?api_key=<your-key> with no header at all.","URLs land in server logs, browser history, proxies and Referer headers — every one of those is a key leak."],
  lesson:'Credentials belong in headers, never URLs; servers must reject query-string keys so they cannot leak through logs and history.',
  impact:'Working keys end up in analytics, log files and third-party referrers — silent, permanent credential exposure for every integration.',
  report:{ title:'API Keys Accepted via URL Query String', severity:'Medium', remediation:'Accept keys only via the Authorization header; reject and log query-string credentials; rotate any key observed in a URL.' } },
{ id:'excessive-data', feature:'Data Exposure & Exports', name:'Excessive Data Exposure — Full User Records incl. Password Hashes', owasp:'API3 Broken Object Property Level Authorization', difficulty:'Beginner',
  hints:["Compare what the portal SHOWS about a user with what the API RETURNS for the same user.","GET /api/v2/users/4 as Omar and read every field: password_hash, ssn_last4, internal_notes.","The UI never displays these — the API hands them to any authenticated caller."],
  lesson:'Serializers must be per-endpoint allowlists; returning the database row \u2018because it is convenient\u2019 leaks credentials and PII by default.',
  impact:'Every customer can harvest password hashes (unsalted MD5 — crackable) and staff-only notes about other companies\u2019 users: credential theft plus a privacy breach.',
  report:{ title:'Excessive Data Exposure in User Serialisation', severity:'High', remediation:'Serialise per-endpoint allowlists (id, name, email, role); never return password hashes, SSN fragments or internal fields; hash passwords with a slow salted KDF.' } },
{ id:'export-leak', feature:'Data Exposure & Exports', name:'Export Leak — Users CSV Contains Every Company', owasp:'API3 Broken Object Property Level Authorization', difficulty:'Beginner',
  hints:["Exports are bulk data — ask whose rows the users export really contains.","GET /api/v2/users/export.csv as Omar and count the companies in the file.","Nimbus, Vertex AND the platform operator — with hashes and SSN fragments. Bulk endpoints need tenant scoping most of all."],
  lesson:'Exports must be scoped to the caller\u2019s tenant and minimised to business-necessary fields; treat bulk export as a privileged, logged function.',
  impact:'One request downloads the client\u2019s entire user base — every company on the platform — ready-made for credential cracking and targeted phishing.',
  report:{ title:'Cross-Tenant Data Leak in the Users CSV Export', severity:'High', remediation:'Scope exports to the caller\u2019s company; export only necessary fields; require admin role and audit-log every export.' } },
{ id:'debug-config', feature:'Data Exposure & Exports', name:'Debug Config — JWT Secret & Internals, No Auth', owasp:'API8 Security Misconfiguration', difficulty:'Beginner',
  hints:["Debug surfaces ship in builds more often than anyone admits. This API has one — the docs do not list it, the path is guessable: /api/v2/debug/config.","Open it logged out. Read what it prints about the token system.","It hands you the signing secret — the master key for the JWT forgery test."],
  lesson:'Debug and diagnostics endpoints must never ship reachable in production; if retained, they need hard authentication and network restrictions.',
  impact:'One unauthenticated request hands attackers the token-signing secret — every account on the platform forgeable from that moment on.',
  report:{ title:'Unauthenticated Debug Endpoint Disclosing the JWT Secret', severity:'Critical', remediation:'Remove debug endpoints from production builds; if retained, require admin auth + IP allowlist; rotate any secret ever exposed.' } },
{ id:'ssrf', feature:'Integrations & Webhooks', name:'SSRF — URL Fetcher & Webhook Tester Reach Internal Endpoints', owasp:'API7 Server Side Request Forgery', difficulty:'Intermediate',
  hints:["Two features fetch URLs server-side: POST /api/v2/integrations/fetch-url and the webhook tester. Neither allowlists anything.","Point fetch-url at the app\u2019s OWN internal vault: http://127.0.0.1:3030/internal/secret.","The server fetches it \u2018from inside\u2019 and returns the body — including the JWT secret. Who made that request, your browser or the server?"],
  lesson:'Any server-side URL fetch needs scheme/host allowlisting and private-range blocking after DNS resolution — otherwise it is an internal-network proxy.',
  impact:'Attackers reach cloud metadata (credentials), internal admin panels and localhost services that were never meant to be public — from a customer account.',
  report:{ title:'Server-Side Request Forgery in Integration URL Fetchers', severity:'High', remediation:'Allowlist permitted hosts and schemes; block loopback/private/link-local ranges post-resolution; disable or re-validate redirects; fetch via an egress proxy.' } },
{ id:'unsafe-import', feature:'Integrations & Webhooks', name:'Unsafe Consumption — Import Feed Creates Privileged Accounts', owasp:'API10 Unsafe Consumption of APIs', difficulty:'Intermediate',
  hints:["The user-import integration trusts a remote JSON feed. Host a tiny feed yourself (any static server) with one user object.","Set role, company_id and is_admin in the feed — fields a feed should never control.","Import it as Omar (POST /api/v2/integrations/import-users), then log in as the imported user. Third-party data just became privileged accounts."],
  lesson:'Third-party data is untrusted input: validate against a strict schema and never import privilege fields — assign least-privilege defaults instead.',
  impact:'Anyone who can influence a feed (or point the importer at their own) mints admin accounts inside a client\u2019s tenant — supply-chain account takeover.',
  report:{ title:'User Import Trusts Feed Data Verbatim (Privilege Fields Accepted)', severity:'Critical', remediation:'Validate feeds against a strict schema; strip role/is_admin/company fields; require admin approval for imported accounts; least-privilege defaults.' } },
{ id:'forged-webhook', feature:'Integrations & Webhooks', name:'Forged Webhooks — Payment Events Accepted Without a Signature', owasp:'API8 Security Misconfiguration', difficulty:'Beginner',
  hints:["Order #2 is pending. The incoming webhook receiver flips orders to paid — ask what proof it demands from the sender.","POST /api/v2/webhooks/receive with {order_id: 2, status: 'paid'} — no signature, no secret, no auth header.","Re-read order #2 (and its invoice). Financial state changed on an unsigned stranger\u2019s say-so."],
  lesson:'Webhook receivers must verify an HMAC signature and a replay window per endpoint secret; webhook-driven state changes are financial transactions.',
  impact:'Attackers mark unpaid orders paid — free goods and falsified revenue — with a single unsigned POST anyone on the internet can send.',
  report:{ title:'Incoming Payment Webhooks Accepted Without Signature Verification', severity:'Critical', remediation:'Verify HMAC signature + timestamp/replay window on every incoming webhook; sign outgoing deliveries; log and alert on webhook state changes.' } },
{ id:'improper-inventory', feature:'Platform & Inventory', name:'Improper Inventory — Legacy v1 Live Without Auth + Undocumented /internal/*', owasp:'API9 Improper Inventory Management', difficulty:'Beginner',
  hints:["The docs list only v2. Old versions rarely die — try /api/v1/orders with NO Authorization header at all.","Then try the undocumented v2 internal routes with Omar\u2019s ordinary token: /api/v2/internal/metrics and /api/v2/internal/users/export.","Shadow surfaces carry none of the current version\u2019s fixes — and all of its data."],
  lesson:'Maintain a full API inventory: retire or fully secure old versions, and keep internal endpoints on a separate, access-controlled interface.',
  impact:'Attackers skip the hardened current API entirely and read every company\u2019s data through the forgotten legacy version or \u2018internal\u2019 routes.',
  report:{ title:'Legacy API Version and Internal Endpoints Exposed Without Controls', severity:'Critical', remediation:'Version inventory + deprecation plan; retire or secure v1; internal endpoints on a separate interface requiring staff auth — never customer credentials.' } },
{ id:'resource-consumption', feature:'Platform & Inventory', name:'Unrestricted Resource Consumption — Uncapped Limits & Expensive Reports', owasp:'API4 Unrestricted Resource Consumption', difficulty:'Beginner',
  hints:["List endpoints honour ?limit= — ask how high it goes (register a crowd of users first, then try limit=100000).","The usage report is worse: GET /api/v2/reports/run?months=120 and read rows_scanned in the response.","No page cap, no cost budget, no timeout — the client chooses how much work the server does."],
  lesson:'Every list needs a server-side page cap and every expensive operation a cost budget; unbounded client-chosen work is a denial-of-service feature.',
  impact:'One request can scan millions of rows or dump whole tables — attackers (or one buggy integration) take the client\u2019s API down or scrape it dry.',
  report:{ title:'Missing Resource Limits on List and Reporting Endpoints', severity:'Medium', remediation:'Enforce a server-side max page size (e.g. 100); cap report windows, add query timeouts and cost budgets; cache or queue expensive reports.' } },
{ id:'graphql-introspection', feature:'Platform & Inventory', name:'GraphQL Introspection — Full Schema Disclosed to Any Caller', owasp:'API8 Security Misconfiguration', difficulty:'Beginner',
  hints:["GraphQL introspection is a developer convenience — in production it is a map of everything, including the sensitive bits.","POST /graphql with an introspection query ({ __schema { ... } }) using any ordinary token.","The schema names the sensitive user fields AND the role mutation — the attacker\u2019s shopping list, gift-wrapped."],
  lesson:'Introspection belongs in development; production GraphQL needs it disabled, plus depth/cost limits and per-field authorisation.',
  impact:'Attackers enumerate the client\u2019s entire data model and every privileged operation in one request, then target the weakest resolver.',
  report:{ title:'GraphQL Introspection Enabled in Production', severity:'Medium', remediation:'Disable introspection outside development; add query depth/cost limits; per-field authorisation in resolvers.' } }
];
const TEST_BY_ID = {}; for(const t of TESTS) TEST_BY_ID[t.id] = t;
const XSS_RE = /<\s*script|on\w+\s*=|<\s*svg|<\s*iframe|javascript\s*:/i;
const INTERNAL_RE = /(localhost|127\.|0\.0\.0\.0|\[::1\]|169\.254\.|192\.168\.|10\.\d+\.|172\.(1[6-9]|2\d|3[01])\.)/i;
// ================= END REGISTRY =================

// ================= LAB SYSTEM — PROGRESS ENGINE (LAB 21) =================
const PROGRESS_PATH = path.join(ROOT, 'progress.json');
let progress = { unlocked:false, testerName:'', tests:{}, attempts:{}, completedAt:null, keyRevealed:false, flags:{} };
try{
  if(fs.existsSync(PROGRESS_PATH)){
    const p = JSON.parse(fs.readFileSync(PROGRESS_PATH,'utf8'));
    if(p && typeof p === 'object') progress = Object.assign(progress, p);
  }
}catch(e){}
if(!progress.tests) progress.tests = {};
if(!progress.attempts) progress.attempts = {};
if(!progress.flags) progress.flags = {};
function saveProgress(){ try{ fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 1)); }catch(e){} }
saveProgress();
function isComplete(){ return TESTS.every(t=>progress.tests[t.id]); }
function doneCount(){ return TESTS.filter(t=>progress.tests[t.id]).length; }
function pctDone(){ return TESTS.length ? Math.floor(doneCount()/TESTS.length*100) : 0; }
function pass(id){
  if(TEST_BY_ID[id] && !progress.tests[id]){
    progress.tests[id] = true;
    if(isComplete()){ if(!progress.completedAt) progress.completedAt = new Date().toISOString(); progress.keyRevealed = true; }
    saveProgress();
  }
}
function attempt(feature){ if(FEATURES.includes(feature)){ progress.attempts[feature] = (progress.attempts[feature]||0)+1; saveProgress(); } }
function progressSummary(){
  const features = {};
  for(const f of FEATURES){
    const ts = TESTS.filter(t=>t.feature===f);
    features[f] = { total: ts.length, done: ts.filter(t=>progress.tests[t.id]).length, attempts: progress.attempts[f]||0 };
  }
  return { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pctDone(), features, complete: isComplete() };
}
// Key material exists ONLY as encoded shards, scattered across this file (spec section 7).
// Entry-key shards live here (region 1); completion-key shards live near the bottom of server.js (region 2).

function asmKey(parts){ return parts.map(s=>Buffer.from(s,'base64').toString().split('').reverse().join('')).join(''); }
const ENTRY_KEY_SHA256 = '271f4a27fa1e0ffe1ec044a571cd11935d6ff2086c5540479ca8e5f007d66641';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey(){ return asmKey(COMPLETION_SHARDS); }
// ---- Detection helpers (server-side, on the real exploit effect) ----
const BF_MAP = new Map(); // email -> [timestamps of failed logins]
function noteLoginFail(email){
  const now = Date.now();
  const a = (BF_MAP.get(email)||[]).filter(t=>now-t<300000); a.push(now); BF_MAP.set(email, a);
  if(a.length>=10) pass('brute-force');
}
const OTP_MAP = new Map(); // email -> [timestamps of failed OTP verifies]
function noteOtpFail(email){
  const now = Date.now();
  const a = (OTP_MAP.get(email)||[]).filter(t=>now-t<300000); a.push(now); OTP_MAP.set(email, a);
  if(a.length>=10) pass('otp-bruteforce');
}
function noteExposure(caller, target){
  if(caller && target && target.id !== caller.id && !caller.is_admin) pass('excessive-data');
}
function noteTokenUse(req, tok, payload){
  if(!progress.unlocked || !payload) return;
  try{
    const hdr = b64d(String(tok).split('.')[0].replace(/-/g,'+').replace(/_/g,'/'));
    if(hdr && hdr.alg === 'none') pass('jwt-forgery');
  }catch(e){}
  const th = md5(String(tok));
  if((progress.flags.out||[]).includes(th)) pass('token-lifecycle');
  const pv = (progress.flags.pwdVer||{})[payload.uid];
  if(pv && payload.iat && payload.iat <= pv) pass('token-lifecycle');
}
function noteKeyUse(req, keyRec){
  if(!progress.unlocked || !keyRec) return;
  const sess = b64d(cookiesOf(req).hexaapi_session||'');
  if(sess && sess.uid && Number(sess.uid) !== Number(keyRec.user_id)) pass('api-key-predictable');
}
function noteKeyUrl(){ if(progress.unlocked) pass('api-key-in-url'); }
// ================= LAB SYSTEM — CHROME (header bar + chatbot widget) =================
function labBar(){
  const pc = pctDone();
  return `<div style="background:#111827;color:#e5e7eb;padding:8px 16px;display:flex;align-items:center;gap:14px;font-family:system-ui;font-size:13px">
    <img src="/logo.png" alt="HexaCyberLab" style="height:26px;width:26px;border-radius:6px">
    <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
    <span>${doneCount()}/${TESTS.length} tests · ${pc}%</span>
    <span style="flex:1;background:#374151;border-radius:99px;height:8px;overflow:hidden"><span style="display:block;height:100%;width:${pc}%;background:linear-gradient(90deg,#4f46e5,#06b6d4)"></span></span>
    <a href="/tests" style="color:#93c5fd">&#127919; Tests</a>
  </div>`;
}
function labWidget(){
  return `<div id="hx-chat" style="position:fixed;right:16px;bottom:16px;width:330px;max-width:94vw;z-index:9999;font-family:system-ui">
    <button id="hx-chat-btn" style="float:right;background:#4f46e5;color:#fff;border:0;border-radius:99px;padding:10px 16px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)">&#129302; Lab Coach</button>
    <div id="hx-chat-box" style="display:none;clear:both;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden;margin-top:8px">
      <div style="background:#111827;color:#fff;padding:10px 12px;font-weight:700">Lab Coach — LAB ${LAB_NUMBER} ${LAB_NAME}</div>
      <div id="hx-chat-log" style="height:230px;overflow:auto;padding:10px;font-size:13px;line-height:1.45"></div>
      <form id="hx-chat-form" style="display:flex;border-top:1px solid #e5e7eb">
        <input id="hx-chat-in" autocomplete="off" placeholder="Ask about a test or feature..." style="flex:1;border:0;padding:10px;font-size:13px">
        <button style="background:#4f46e5;color:#fff;border:0;padding:0 14px;font-weight:700;cursor:pointer">Send</button>
      </form>
    </div></div>
<script>
(function(){ var btn=document.getElementById('hx-chat-btn'), box=document.getElementById('hx-chat-box'), log=document.getElementById('hx-chat-log'), form=document.getElementById('hx-chat-form'), inp=document.getElementById('hx-chat-in'), greeted=false;
function add(who,txt){ var d=document.createElement('div'); d.style.margin='6px 0'; d.innerHTML='<b>'+who+':</b> '; d.appendChild(document.createTextNode(txt)); log.appendChild(d); log.scrollTop=log.scrollHeight; }
btn.onclick=function(){ box.style.display=(box.style.display==='none')?'block':'none'; if(!greeted && box.style.display==='block'){ greeted=true; add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER} — ${LAB_NAME}. Ask me how many tests a feature has, or how to do a test by name. Step-by-step help unlocks after you have genuinely tried a feature at least 3 times.'); } };
form.onsubmit=function(e){ e.preventDefault(); var m=inp.value.trim(); if(!m) return; inp.value=''; add('You',m);
  fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})}).then(function(r){return r.json();}).then(function(j){ add('Coach',(j&&j.reply)||'...'); }).catch(function(){ add('Coach','Connection error — is the lab running?'); }); };
})();
</script>`;
}
// ================= LAB SYSTEM — PAGES =================
function gatePage(err){
  return layout(null,'Locked',`${pubHead()}
  <div class="auth"><h1>&#128274; LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <p>This lab is locked. Paste the completion key from Lab ${LAB_PREV} to start.</p>
  ${err?`<p class="err">${esc(err)}</p>`:''}
  <form method="POST" action="/unlock"><label>Completion key from Lab ${LAB_PREV} <input name="key" required></label>
  <button class="btn big" style="width:100%">Unlock Lab ${LAB_NUMBER}</button></form>
  <p class="hint">The labs in this series run in order: complete Lab ${LAB_PREV} 100% and its completion page shows the key that opens this lab. The Lab Coach (bottom-right) works while locked — ask it how the system works.</p></div>`);
}
function testsPage(user, q){
  const hm = String((q && q.get('h'))||'').match(/^([a-z0-9-]+):(\d)$/);
  const openId = hm ? hm[1] : null, openLvl = hm ? Number(hm[2]) : 0;
  let html = `<h1>&#127919; Mission — LAB ${LAB_NUMBER} ${LAB_NAME}</h1>
  <p><b>${doneCount()}/${TESTS.length} tests complete · ${pctDone()}%</b> · Attempts are counted per feature. The Lab Coach unlocks step-by-step help for a feature after 3 genuine attempts on it. Tests complete by DOING — the server detects the real exploit effect.</p>`;
  for(const f of FEATURES){
    const ts = TESTS.filter(t=>t.feature===f);
    if(!ts.length) continue;
    const att = progress.attempts[f]||0;
    html += `<h2>${esc(f)} <small>(${ts.filter(t=>progress.tests[t.id]).length}/${ts.length} done · ${att} attempt${att===1?'':'s'})</small></h2>`;
    for(const t of ts){
      const done = !!progress.tests[t.id];
      let hintsHtml = '';
      if(openId===t.id && openLvl>0){ for(let i=0;i<Math.min(openLvl,3);i++) hintsHtml += `<p class="hint">&#128161; Hint ${i+1}: ${esc(t.hints[i])}</p>`; }
      const nextLvl = (openId===t.id ? openLvl : 0)+1;
      const hintLink = nextLvl<=3 ? `<a class="btn small" href="/tests?h=${t.id}:${nextLvl}">${openId===t.id?'Next hint':'Show hint 1'}</a>` : '<span class="hint">All 3 hints shown</span>';
      html += `<div class="card"><h3>${done?'&#9989;':'&#11036;'} ${esc(t.name)}</h3>
        <p class="hint">${esc(t.owasp)} · ${esc(t.difficulty)} · Feature: ${esc(f)} · Attempts on this feature: ${att}</p>${hintsHtml}<p>${hintLink}</p></div>`;
    }
  }
  if(isComplete()) html += `<p><a class="btn big" href="/complete">🏁 Open your completion debrief</a></p>`;
  return layout(user,'Mission',html);
}
function completePage(user){
  if(!isComplete()){
    const left = TESTS.filter(t=>!progress.tests[t.id]);
    return layout(user,'Completion',`<h1>🏁 Completion debrief</h1>
    <p>You are at <b>${pctDone()}%</b> (${doneCount()}/${TESTS.length} tests). The debrief, the completion key and the certificate unlock at 100%.</p>
    <h2>Still open (${left.length})</h2><ul>${left.map(t=>`<li>${esc(t.name)} <span class="hint">(${esc(t.feature)})</span></li>`).join('')}</ul>
    <p><a class="btn" href="/tests">Open the mission page</a></p>`);
  }
  const feats = FEATURES.filter(f=>TESTS.some(t=>t.feature===f));
  const perF = feats.map(f=>{ const ts=TESTS.filter(t=>t.feature===f); return `<tr><td>${esc(f)}</td><td>${ts.length}</td><td>${ts.length}</td><td>${progress.attempts[f]||0}</td></tr>`; }).join('');
  const techniques = TESTS.map(t=>`<li>${esc(t.name)}</li>`).join('');
  const lessons = TESTS.map(t=>`<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('');
  const impacts = TESTS.map(t=>`<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('');
  const reports = TESTS.map(t=>`<li><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}. Remediation: ${esc(t.report.remediation)}</li>`).join('');
  return layout(user,'Lab complete!',`
  <h1>🏁 LAB ${LAB_NUMBER} — ${LAB_NAME} COMPLETE</h1>
  <p>You completed <b>${TESTS.length} security tests</b> across <b>${feats.length} features</b>. Every test was detected by the server from the real exploit effect — nothing was self-declared.</p>
  <h2>1 · This lab in numbers</h2>
  <p>Total features: <b>${feats.length}</b> · Total scored tests: <b>${TESTS.length}</b> · Completed: <b>${doneCount()}</b> (100%)</p>
  <h2>2 · Vulnerabilities per feature</h2>
  <table><tr><th>Feature</th><th>Tests in feature</th><th>Completed</th><th>Your attempts</th></tr>${perF}</table>
  <h2>3 · How you tested it — ${TESTS.length} techniques</h2><ul>${techniques}</ul>
  <h2>4 · What you learned</h2><ul>${lessons}</ul>
  <h2>5 · What this means for a real client</h2><ul>${impacts}</ul>
  <h2>6 · Writing it in a real report</h2><ul>${reports}</ul>
  <h2>Your completion key</h2>
  <p>Lab ${LAB_NUMBER+1} starts locked. Paste this key there to open it:</p>
  <p class="mono" style="font-size:18px;background:#eef2ff;padding:12px;border-radius:8px">${completionKey()}</p>
  <h2>Your certificate</h2>
  <form method="POST" action="/complete-name"><label>Name for the certificate <input name="name" value="${esc(progress.testerName || (user ? user.name : ''))}"></label> <button class="btn">Save name</button></form>
  <p><a class="btn" href="/certificate">🏆 View your certificate</a></p>`);
}
function certificatePage(user){
  if(!isComplete()){
    return layout(user,'Certificate',`<h1>🏆 Certificate</h1><p>Certificates unlock at 100%. You are at ${pctDone()}%.</p><p><a class="btn" href="/tests">Continue the mission</a></p>`);
  }
  const name = progress.testerName || (user ? user.name : '') || 'Tester';
  const date = progress.completedAt ? String(progress.completedAt).slice(0,10) : '';
  const fcount = FEATURES.filter(f=>TESTS.some(t=>t.feature===f)).length;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#f3f4f6;margin:0;padding:40px}.cert{max-width:760px;margin:0 auto;background:#fff;border:3px double #4f46e5;border-radius:8px;padding:48px;text-align:center}@media print{body{background:#fff;padding:0}}</style></head><body>
  <div class="cert"><img src="/logo.png" alt="HexaCyberLab" style="height:84px">
  <h1 style="margin:10px 0">Certificate of Completion</h1>
  <p>This certifies that</p><h2 style="font-size:30px;margin:6px 0">${esc(name)}</h2>
  <p>has completed 100% of the security tests in</p>
  <h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${fcount} features)</h3>
  <p>Completed: ${esc(date)}</p>
  <p style="margin-top:28px;font-weight:bold">HexaCyberLab — Built by Md. Jony Hassain, Founder</p></div>
  <p style="text-align:center"><a href="/complete">&larr; Back to the completion summary</a></p></body></html>`;
}
// ================= LAB SYSTEM — LAB COACH CHATBOT =================
const CHAT_KEYS = [
  ['brute-force',['brute','rate limit','password guessing','lockout','throttl']],
  ['jwt-forgery',['jwt','alg','forge','unsigned','signing secret','secret123','token forgery']],
  ['token-lifecycle',['logout','revoke','revocation','token still works','token lifecycle','10 year','expiry','expired token','password change token']],
  ['otp-bruteforce',['otp','one-time','verification code','4-digit','four digit']],
  ['account-enumeration',['enumerat','account exists','which emails exist','user not found']],
  ['mass-assignment',['mass assignment','extra field','hidden field','is_admin']],
  ['weak-password',['weak password','password policy','short password','1-char','one character','single character']],
  ['stored-xss',['xss','script payload','stored cross','name payload','admin console payload']],
  ['bola-objects',['bola','idor','order id','invoice id','other company','another company','cross-company object']],
  ['param-pollution',['company_id','param','pollution','tenant override','list override']],
  ['graphql-bola',['graphql user','graphql bola','graphql idor','resolver']],
  ['bfla',['bfla','admin function','delete user','admin users','x-admin','function level']],
  ['graphql-mutation',['mutation','updateuserrole','role mutation','graphql role']],
  ['api-key-scope',['scope','read-only key','read key','readonly']],
  ['api-key-predictable',['predict','pattern key','guessable key','hx_live','key pattern']],
  ['api-key-in-url',['api_key','key in url','query string key','key in the url']],
  ['excessive-data',['excessive','password_hash','password hash','ssn','internal notes','data exposure','full record']],
  ['export-leak',['export','csv']],
  ['debug-config',['debug','config leak','secret leak']],
  ['ssrf',['ssrf','fetch-url','fetch url','webhook test','internal secret','server-side request']],
  ['unsafe-import',['import','feed','unsafe consumption']],
  ['forged-webhook',['forged webhook','webhook signature','webhook receive','payment event','unsigned webhook']],
  ['improper-inventory',['v1','legacy','internal endpoint','internal/','inventory','old version','undocumented']],
  ['resource-consumption',['limit','quota','resource consumption','expensive report','rows_scanned','reports/run','denial']],
  ['graphql-introspection',['introspection','__schema','schema']]
];
function chatReply(raw){
  const m = String(raw||'').toLowerCase();
  if(/who (built|made|created)|founder|jony|who is behind/.test(m))
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  if(m.includes('key') && /(completion|next|unlock|give|what|share|tell|reveal|lab)/.test(m)){
    if(isComplete()) return 'You completed LAB ' + LAB_NUMBER + ' at 100% — here is your completion key: ' + completionKey() + ' — paste it into Lab ' + (LAB_NUMBER+1) + ' to unlock it.';
    return "I don't have the completion key yet — nobody does. It is only released to me when this lab is completed 100%. You are at " + pctDone() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and I will share it.';
  }
  if(/progress|score|how am i|status|percent|how far/.test(m)){
    const left = TESTS.filter(t=>!progress.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pctDone() + '%). ' + (left.length ? ('Next open test: "' + left[0].name + '" in ' + left[0].feature + '.') : 'Everything is complete — open /complete for your debrief and certificate.');
  }
  const fmatch = FEATURES.find(f=>m.includes(f.toLowerCase()));
  if(/(how many|list|which|features|tests|vulnerabilit|what is in|contents)/.test(m)){
    if(fmatch){
      const ts = TESTS.filter(t=>t.feature===fmatch);
      return fmatch + ' has ' + ts.length + ' tests: ' + ts.map(t=>t.name).join('; ') + '. Ask me how to do one by name — step-by-step guidance unlocks after 3 attempts on that feature (you have ' + (progress.attempts[fmatch]||0) + ' so far).';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + TESTS.length + ' tests across ' + FEATURES.length + ' features: ' + FEATURES.map(f=>f + ' (' + TESTS.filter(t=>t.feature===f).length + ')').join(', ') + '. Open /tests for the full mission map with graded hints.';
  }
  let test = null;
  for(const pair of CHAT_KEYS){ if(pair[1].some(k=>m.includes(k))){ test = TEST_BY_ID[pair[0]]; break; } }
  if(!test){
    for(const t of TESTS){
      const words = t.name.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>4);
      if(words.some(w=>m.includes(w))){ test = t; break; }
    }
  }
  if(test){
    if(progress.tests[test.id]) return 'You already completed "' + test.name + '". How it works, for your notes: ' + test.hints.join(' ');
    const att = progress.attempts[test.feature]||0;
    if(att>=3) return 'Step by step for "' + test.name + '" (' + test.feature + '): ' + test.hints.map((h,i)=>'(' + (i+1) + ') ' + h).join(' ');
    return "That feature is locked for help. First try the " + test.feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
  }
  if(fmatch){
    const ts = TESTS.filter(t=>t.feature===fmatch);
    return fmatch + ': ' + ts.length + ' tests, ' + ts.filter(t=>progress.tests[t.id]).length + ' done, ' + (progress.attempts[fmatch]||0) + ' attempt(s) so far. Ask me about a specific test by name for guidance.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ask how many tests a feature has, ask about a specific test by name, or open /tests for the mission map and graded hints. Step-by-step guidance unlocks after 3 genuine attempts on a feature.';
}
// ================= END LAB SYSTEM ENGINE =================


// ---------- Layout ----------
function layout(user,title,body){
  let side = '';
  if(user){
    const comp = companyById(user.company_id);
    side = `<aside class="side">
      <div class="ws-box">
        <div class="ws-name">${comp ? esc(comp.name) : 'Platform'}</div>
        <div class="ws-plan">${esc(user.role)} · ${user.is_admin ? 'operator' : 'company account'}</div>
      </div>
      <nav>
        <a href="/dashboard">🏠 Dashboard</a>
        <a href="/docs">📖 API Docs</a>
        <a href="/explorer">🧭 Explorer</a>
        <a href="/keys">🔑 API Keys</a>
        <a href="/admin">🛡️ Admin Console</a>
        <a href="/lab-guide">🧪 Lab Guide</a>
        <a href="/logout">🚪 Logout</a>
      </nav>
      <div class="side-user">${esc(user.name)}<br><small>${esc(user.email)}</small></div>
    </aside>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaAPI</title><link rel="stylesheet" href="/style.css"></head>
<body>${labBar()}${user ? `<div class="shell">${side}<main class="main">` : '<main class="pub">'}${body}</main>${user ? '</div>' : ''}${labWidget()}</body></html>`;
}
function pubHead(){
  return `<div class="pub-head"><div class="logo">Hexa<span>API</span></div>
  <nav><a href="/docs">API Docs</a><a href="/explorer">Explorer</a><a href="/lab-guide">Lab Guide</a><a href="/login">Log in</a><a class="btn" href="/register">Get API access</a></nav></div>`;
}
function landing(){
  return layout(null,'Developer Portal',`${pubHead()}
  <section class="hero"><h1>One API behind every product.</h1>
  <p>HexaAPI powers orders, users, invoices and integrations for the Nimbus Retail and Vertex Health product families — one platform, one token, every endpoint.</p>
  <p><a class="btn big" href="/docs" style="background:#fff;color:#4f46e5">Read the API docs</a>
  <a class="btn big" href="/register">Get API access</a></p></section>
  <div class="plan-grid">
    <div class="plan-card"><h3>REST v2</h3><p>Users, orders, invoices, coupons, webhooks and reports — JSON over HTTPS, bearer-token auth.</p></div>
    <div class="plan-card hot"><h3>GraphQL</h3><p>A flexible GraphQL endpoint with introspection enabled for easy exploration.</p></div>
    <div class="plan-card"><h3>API Keys</h3><p>Long-lived keys for server-to-server integrations. One key, full platform access.</p></div>
  </div>
  <div class="warn">🧪 <strong>Practice lab notice:</strong> this is HexaCyberLab's deliberately vulnerable API training platform. It runs locally only and every flaw in it is intentional — see the <a href="/lab-guide">Lab Guide</a>.</div>`);
}
function loginPage(err){
  return layout(null,'Log in',`${pubHead()}
  <div class="auth"><h1>HexaAPI</h1><h2>Developer sign in</h2>
  ${err ? `<p class="err">${esc(err)}</p>` : ''}
  <form method="POST" action="/login">
    <label>Email<input name="email" type="email" required></label>
    <label>Password<input name="password" type="password" required></label>
    <button class="btn big" style="width:100%">Log in</button>
  </form>
  <p class="hint">Demo accounts (lab only): nina@nimbus.test / nina123 (Nimbus admin) · omar@nimbus.test / omar123 · vince@vertex.test / vince123 · wren@vertex.test / wren123 · root@hexaapi.local / root123 (operator)</p>
  <p class="hint">No account? <a href="/register">Register</a> · API login: <span class="mono">POST /api/v2/auth/login</span></p></div>`);
}
function registerPage(err){
  return layout(null,'Register',`${pubHead()}
  <div class="auth"><h1>HexaAPI</h1><h2>Create your developer account</h2>
  ${err ? `<p class="err">${esc(err)}</p>` : ''}
  <form method="POST" action="/register">
    <label>Full name<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>Password<input name="password" type="password" required></label>
    <label>Company name (optional — creates a new company)<input name="company_name"></label>
    <button class="btn big" style="width:100%">Register</button>
  </form>
  <p class="hint">Accounts are active immediately — no email verification step.</p></div>`);
}
function docsPage(user){
  const rows = DOCS.map(d=>`<tr><td><span class="m m${d[0]}">${d[0]}</span></td><td class="mono">${esc(d[1])}</td><td>${esc(d[2])}</td></tr>`).join('');
  return layout(user,'API Docs',`<h1>📖 API Docs — v2</h1>
  <p>Base URL: <span class="mono">http://localhost:3030</span> · Auth: <span class="mono">Authorization: Bearer &lt;token&gt;</span> from <span class="mono">POST /api/v2/auth/login</span>, or a long-lived API key.
  These pages document the <strong>current v2 API</strong>. (Anything not listed here is not part of the public API surface.)</p>
  <table><tr><th>Method</th><th>Endpoint</th><th>Description</th></tr>${rows}</table>
  <h2>Example</h2>
  <pre>curl -X POST http://localhost:3030/api/v2/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"omar@nimbus.test","password":"omar123"}'

curl http://localhost:3030/api/v2/orders \\
  -H 'Authorization: Bearer &lt;token&gt;'</pre>`);
}
function explorerPage(user){
  const rows = DOCS.map(d=>`<tr><td><span class="m m${d[0]}">${d[0]}</span></td><td class="mono">${esc(d[1])}</td><td>${esc(d[2])}</td></tr>`).join('');
  return layout(user,'Explorer',`<h1>🧭 API Explorer</h1>
  <p>Every public v2 endpoint, in one place. Point Burp or curl at them and watch what each one trusts.
  Tip for the lab: the interesting endpoints are the ones that take an <span class="mono">:id</span> or a <span class="mono">?company_id=</span>.</p>
  <table><tr><th>Method</th><th>Endpoint</th><th>What it does</th></tr>${rows}</table>
  <h2>Consoles in this portal</h2>
  <div class="grid">
    <div class="card"><h3>🔑 API Keys</h3><p>Your company's long-lived keys.</p><a class="btn small" href="/keys">Open</a></div>
    <div class="card"><h3>🛡️ Admin Console</h3><p>Platform-wide users and statistics.</p><a class="btn small" href="/admin">Open</a></div>
    <div class="card"><h3>🧪 Lab Guide</h3><p>The intended flaw map and exercise order.</p><a class="btn small" href="/lab-guide">Open</a></div>
  </div>`);
}
function dashboardPage(user){
  const comp = companyById(user.company_id);
  const orders = user.company_id==null ? db.prepare('SELECT COUNT(*) c FROM orders').get().c
    : db.prepare('SELECT COUNT(*) c FROM orders WHERE company_id=?').get(user.company_id).c;
  const keys = user.company_id==null ? db.prepare('SELECT COUNT(*) c FROM apikeys').get().c
    : db.prepare('SELECT COUNT(*) c FROM apikeys WHERE company_id=?').get(user.company_id).c;
  return layout(user,'Dashboard',`<h1>🏠 Dashboard</h1>
  <div class="stats">
    <div class="stat"><b>${esc(comp ? comp.name : 'Platform')}</b><span>workspace</span></div>
    <div class="stat"><b>${orders}</b><span>orders visible</span></div>
    <div class="stat"><b>${keys}</b><span>API keys</span></div>
    <div class="stat"><b>${esc(user.role)}</b><span>your role</span></div>
  </div>
  <h2>Get a token</h2>
  <pre>curl -X POST http://localhost:3030/api/v2/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"${esc(user.email)}","password":"&lt;your password&gt;"}'</pre>
  <p>Then call any endpoint from the <a href="/docs">docs</a> with <span class="mono">Authorization: Bearer &lt;token&gt;</span>,
  or use a long-lived key from the <a href="/keys">API Keys</a> page. The <a href="/lab-guide">Lab Guide</a> lists what to try on each one.</p>`);
}
function keysPage(user,msg){
  const keys = user.company_id==null ? db.prepare('SELECT * FROM apikeys ORDER BY id').all()
    : db.prepare('SELECT * FROM apikeys WHERE company_id=? ORDER BY id').all(user.company_id);
  const rows = keys.map(k=>`<tr><td>${k.id}</td><td>${esc(k.label)}</td><td class="mono">${esc(k.key)}</td><td>${esc(k.scope)}</td><td>${esc(k.created_at||'')}</td></tr>`).join('');
  return layout(user,'API Keys',`<h1>🔑 API Keys</h1>
  ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
  <p>Long-lived keys for server integrations. Keys do not expire. Treat them like passwords —
  although note they follow a simple pattern: <span class="mono">hx_live_&lt;company&gt;_&lt;number&gt;</span>.</p>
  <table><tr><th>#</th><th>Label</th><th>Key</th><th>Scope</th><th>Created</th></tr>${rows}</table>
  <h2>Create a key</h2>
  <form method="POST" action="/keys" class="inline">
    <input name="label" placeholder="Label" required>
    <select name="scope"><option value="read">read</option><option value="write">write</option></select>
    <button class="btn">Create key</button>
  </form>`);
}
function adminPage(user){
  // VULN(6): the admin console renders platform-wide data for ANY logged-in
  // session — the same missing function-level check as the /api/v2/admin routes.
  // User names are also printed RAW here (see VULN(11): imported feed data is
  // rendered verbatim, so a markup payload in an imported name fires for staff).
  const companies = db.prepare('SELECT * FROM companies ORDER BY id').all();
  const users = db.prepare('SELECT * FROM users ORDER BY id').all();
  const urows = users.map(u=>`<tr><td>${u.id}</td><td>${u.name}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td><td>${u.company_id==null?'—':u.company_id}</td><td class="mono">${esc(u.password)}</td><td>${esc(u.ssn_last4||'')}</td></tr>`).join('');
  const crows = companies.map(c=>`<tr><td>${c.id}</td><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td>${esc(c.plan)}</td></tr>`).join('');
  const orders = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'").get().s;
  return layout(user,'Admin Console',`<h1>🛡️ Admin Console</h1>
  <div class="stats"><div class="stat"><b>${users.length}</b><span>users (all companies)</span></div>
  <div class="stat"><b>${companies.length}</b><span>companies</span></div>
  <div class="stat"><b>${orders}</b><span>orders</span></div>
  <div class="stat"><b>$${revenue}</b><span>paid volume</span></div></div>
  <h2>Companies</h2><table><tr><th>#</th><th>Name</th><th>Slug</th><th>Plan</th></tr>${crows}</table>
  <h2>All users — every company</h2>
  <table><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Company</th><th>Password hash</th><th>SSN last4</th></tr>${urows}</table>
  <p class="hint">Data endpoints behind this console: <span class="mono">GET /api/v2/admin/users</span> · <span class="mono">GET /api/v2/admin/stats</span></p>`);
}
function labGuidePage(user){
  const rows = GROUPS.map(g=>`<tr><td>${g[0]}</td><td><strong>${esc(g[1])}</strong></td><td>${esc(g[2])}</td><td>${esc(g[3])}</td></tr>`).join('');
  return layout(user,'Lab Guide',`<h1>🧪 Lab Guide — HexaAPI</h1>
  <p>This platform is deliberately vulnerable. Work the groups in <span class="mono">PRACTICE-GUIDE.md</span> order — BOLA first, it is the #1 API flaw class in the real world.
  Group numbers match <span class="mono">VULNERABILITIES.md</span> and the <span class="mono">// VULN(n)</span> markers in server.js.</p>
  <table><tr><th>#</th><th>Flaw area</th><th>OWASP API 2023</th><th>Where to look</th></tr>${rows}</table>`);
}

// ---------- Shared helpers for handlers ----------
// VULN(8): server-side fetch with NO allowlist, NO scheme check, NO private-IP
// blocking. The server happily fetches loopback/internal addresses — including
// this app's own /internal/* endpoints — and returns the body to the caller.
async function fetchUrlText(url,opts){
  const r = await fetch(url, opts || { redirect:'follow' });
  const t = await r.text();
  return { status:r.status, body:t.slice(0,6000) };
}
function registerUser(b){
  const email = String(b.email||'').trim();
  if(!email || !b.password) return { err:400, msg:'email and password are required' };
  // VULN(17): the existence check answers honestly — "account exists" — so the
  // registration endpoint doubles as a perfect account-enumeration oracle.
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if(exists) return { err:409, msg:'account exists' };
  let company_id = null;
  if(b.company_name){
    const slug = String(b.company_name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'company';
    const c = db.prepare('INSERT INTO companies(name,slug,plan) VALUES(?,?,?)').run(String(b.company_name), slug + '-' + Math.floor(Math.random()*100000), 'Growth');
    company_id = Number(c.lastInsertRowid);
  }
  // VULN(4): MASS ASSIGNMENT — role, company_id and is_admin are copied straight
  // from the request body. Register as another company's admin, or as a platform
  // operator, by adding fields the form never shows.
  if(b.company_id !== undefined && b.company_id !== null && b.company_id !== '') company_id = parseInt(b.company_id);
  const role = b.role ? String(b.role) : 'user';
  const is_admin = (b.is_admin===1 || b.is_admin==='1' || b.is_admin===true) ? 1 : 0;
  const id = db.prepare('INSERT INTO users(company_id,email,password,name,role,is_admin,ssn_last4,internal_notes) VALUES(?,?,?,?,?,?,?,?)')
    .run(company_id, email, md5(b.password), String(b.name||email.split('@')[0]), role, is_admin,
         b.ssn_last4 ? String(b.ssn_last4) : null, b.internal_notes ? String(b.internal_notes) : null).lastInsertRowid;
  // LAB SYSTEM detection: the registration just honoured attacker-controlled fields.
  if(b.role !== undefined || b.is_admin !== undefined || (b.company_id !== undefined && b.company_id !== null && b.company_id !== '')) pass('mass-assignment');
  if(String(b.password||'').length < 4) pass('weak-password');
  if(XSS_RE.test(String(b.name||''))) pass('stored-xss');
  // VULN(17): no email verification — the account is fully live the second it is created.
  return { user: userById(Number(id)) };
}

// ---------- Server ----------
const server = http.createServer(async (req,res)=>{
  try{
    const u = new URL(req.url, 'http://localhost:' + PORT);
    const p = u.pathname;
    const m = req.method;
    // VULN(9): CORS reflects ANY Origin back, WITH credentials — any website can
    // read this API with a victim's browser session. (Also note: no security
    // headers are set anywhere in this app — no CSP, no X-Frame-Options, no nosniff.)
    const origin = req.headers.origin;
    if(origin){
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if(m === 'OPTIONS'){
      res.writeHead(204, { 'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': String(req.headers['access-control-request-headers'] || 'Authorization,Content-Type,X-Admin') });
      return res.end();
    }
    let body = {};
    if(m === 'POST' || m === 'PATCH' || m === 'PUT'){
      const raw = await readRaw(req);
      if(raw){
        const ct = String(req.headers['content-type']||'');
        // VULN(9): malformed JSON throws here and the catch block below returns
        // the full stack trace to the caller (verbose errors).
        if(ct.includes('application/json')) body = JSON.parse(raw);
        else body = parseForm(raw);
      }
    }
    const sessUser = ()=>{ const a = authOf(req,u); return a ? a.user : null; };

    // ================= LAB SYSTEM routes (gate first — everything below stays locked until unlock) =================
    if(p === '/logo.png' && m === 'GET'){
      try{ const img = fs.readFileSync(path.join(ROOT,'logo.png')); res.writeHead(200,{'Content-Type':'image/png'}); return res.end(img); }
      catch(e){ return send(res,404,'Not found','text/plain'); }
    }
    if(p === '/unlock' && m === 'POST'){
      if(entryKeyMatches(String(body.key||''))){ progress.unlocked = true; saveProgress(); return redirect(res,'/'); }
      return send(res,403,gatePage('That key was not accepted.'));
    }
    if(p === '/api/progress' && m === 'GET') return sendJson(res,200,progressSummary());
    if(p === '/api/chat' && m === 'POST') return sendJson(res,200,{ reply: chatReply(body.message) });
    if(!progress.unlocked){
      if(p.startsWith('/api/') || p === '/graphql') return sendJson(res,403,{ error:'lab locked — paste the Lab 20 completion key at / to unlock' });
      return send(res,200,gatePage());
    }
    { const _ka = authOf(req,u); if(_ka && _ka.via === 'apikey') attempt('API Keys'); }
    if(p === '/tests' && m === 'GET') return send(res,200,testsPage(sessUser(), u.searchParams));
    if(p === '/complete' && m === 'GET') return send(res,200,completePage(sessUser()));
    if(p === '/complete-name' && m === 'POST'){ progress.testerName = String(body.name||'').slice(0,60); saveProgress(); return redirect(res,'/complete'); }
    if(p === '/certificate' && m === 'GET') return send(res,200,certificatePage(sessUser()));

    // ----- static -----
    if(p === '/style.css' && m === 'GET'){
      return send(res,200, fs.readFileSync(path.join(PUBLIC_DIR,'style.css'),'utf8'), 'text/css; charset=utf-8');
    }
    if(p === '/favicon.ico'){ res.writeHead(204); return res.end(); }

    // ----- public / web portal -----
    if(p === '/' && m === 'GET') return send(res,200, landing());
    if(p === '/login' && m === 'GET') return send(res,200, loginPage());
    if(p === '/login' && m === 'POST'){
      attempt('Authentication & Tokens');
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||''));
      // Distinct errors (which account exists / which field failed) — enumeration aid, see VULN(17).
      if(!user) return send(res,200, loginPage('No account with that email.'));
      if(user.password !== md5(body.password||'')){ noteLoginFail(String(body.email||'')); return send(res,200, loginPage('Wrong password.')); }
      // VULN(2): no rate limiting / lockout / captcha on login — here or on the API.
      setSession(res,user);
      return redirect(res,'/dashboard');
    }
    if(p === '/register' && m === 'GET') return send(res,200, registerPage());
    if(p === '/register' && m === 'POST'){
      attempt('Registration & Accounts');
      const r = registerUser(body);
      if(r.err === 409) pass('account-enumeration');
      if(r.err) return send(res,200, registerPage(r.msg === 'account exists' ? 'That email already has an account — try logging in.' : r.msg));
      return redirect(res,'/login');
    }
    if(p === '/logout' && m === 'GET'){
      res.setHeader('Set-Cookie','hexaapi_session=; Path=/; Max-Age=0');
      return redirect(res,'/');
    }
    if(p === '/docs' && m === 'GET') return send(res,200, docsPage(sessUser()));
    if(p === '/explorer' && m === 'GET') return send(res,200, explorerPage(sessUser()));
    if(p === '/lab-guide' && m === 'GET') return send(res,200, labGuidePage(sessUser()));
    if(p === '/dashboard' && m === 'GET'){
      const user = requireWeb(req,res); if(!user) return;
      return send(res,200, dashboardPage(user));
    }
    if(p === '/keys' && m === 'GET'){
      const user = requireWeb(req,res); if(!user) return;
      return send(res,200, keysPage(user));
    }
    if(p === '/keys' && m === 'POST'){
      const user = requireWeb(req,res); if(!user) return;
      attempt('API Keys');
      const comp = companyById(user.company_id);
      const slug = comp ? comp.slug : 'platform';
      const seq = Number(db.prepare('SELECT COUNT(*) c FROM apikeys WHERE company_id IS ?').get(user.company_id).c) + 1;
      // VULN(13): new keys extend the same predictable pattern (see seed comment).
      const key = 'hx_live_' + slug + '_' + String(seq).padStart(4,'0');
      db.prepare('INSERT INTO apikeys(company_id,user_id,label,key,scope) VALUES(?,?,?,?,?)')
        .run(user.company_id, user.id, String(body.label||'API key'), key, String(body.scope||'read'));
      return redirect(res,'/keys');
    }
    if(p === '/admin' && m === 'GET'){
      const user = requireWeb(req,res); if(!user) return;
      // VULN(6): no function-level check — any logged-in user opens the console.
      if(!user.is_admin && user.role !== 'admin') pass('bfla');
      return send(res,200, adminPage(user));
    }

    // ----- internal endpoints (bound to the same port; "internal" in name only) -----
    if(p === '/internal/secret'){
      // VULN(10): an internal-only vault endpoint served on the public port.
      // The SSRF endpoints (VULN(8)) reach it "from inside" — and so can anyone.
      return sendJson(res,200,{ INTERNAL_ONLY:true, JWT_SECRET, flag:'HEXAAPI{ssrf_reached_the_internal_vault}', db:'api.db' });
    }
    if(p === '/internal/health') return sendJson(res,200,{ ok:true, uptime:process.uptime() });

    // ================= API v2 =================
    if(p === '/api/v2/auth/login' && m === 'POST'){
      attempt('Authentication & Tokens');
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||''));
      if(!user){ pass('account-enumeration'); return sendJson(res,401,{ error:'user not found' }); }
      if(user.password !== md5(body.password||'')){ noteLoginFail(String(body.email||'')); return sendJson(res,401,{ error:'wrong password' }); }
      // VULN(2): NO rate limiting, lockout or delay on this endpoint — the
      // BUILD-TESTS run fires 50 wrong passwords in a row and then logs in.
      return sendJson(res,200,{ token: signToken(user), user: userJson(user) });
    }
    if(p === '/api/v2/auth/register' && m === 'POST'){
      attempt('Registration & Accounts');
      const r = registerUser(body);
      if(r.err === 409) pass('account-enumeration');
      if(r.err) return sendJson(res, r.err, { error: r.msg });
      return sendJson(res,201,{ user: userJson(r.user), token: signToken(r.user) });
    }
    if(p === '/api/v2/auth/logout' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      const _tk = String(req.headers['authorization']||'').replace(/^Bearer\s+/,'').trim();
      if(_tk){ progress.flags.out = progress.flags.out || []; const _th = md5(_tk); if(!progress.flags.out.includes(_th)){ progress.flags.out.push(_th); if(progress.flags.out.length>60) progress.flags.out.shift(); saveProgress(); } }
      // VULN(14): logout revokes NOTHING. Tokens are stateless, there is no
      // denylist — the exact same token keeps working afterwards.
      return sendJson(res,200,{ ok:true, note:'logged out (token remains valid — there is no revocation)' });
    }
    if(p === '/api/v2/auth/me' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      return sendJson(res,200,{ user: userJson(a.user), via: a.via });
    }
    if(p === '/api/v2/auth/request-otp' && m === 'POST'){
      attempt('Authentication & Tokens');
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||''));
      if(!user) return sendJson(res,404,{ error:'user not found' });
      const code = String(Math.floor(1000 + Math.random()*9000));
      db.prepare('UPDATE users SET otp_code=? WHERE id=?').run(code, user.id);
      // VULN(7): a 4-digit OTP, requestable unlimited times, and verify-otp below
      // has no attempt counter — the whole code space (10,000) is scriptable in minutes.
      return sendJson(res,200,{ sent:true, channel:'email' });
    }
    if(p === '/api/v2/auth/verify-otp' && m === 'POST'){
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||''));
      if(!user || !user.otp_code) return sendJson(res,401,{ error:'invalid otp' });
      attempt('Authentication & Tokens');
      if(String(body.code) !== String(user.otp_code)){ noteOtpFail(String(body.email||'')); return sendJson(res,401,{ error:'invalid otp' }); } // VULN(7): unlimited attempts
      return sendJson(res,200,{ token: signToken(user), user: userJson(user) });
    }

    // ----- users -----
    if(p === '/api/v2/users/export.csv' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Data Exposure & Exports');
      if(!a.user.is_admin) pass('export-leak');
      // VULN(16): the export ignores the caller's company entirely — every user
      // of every company, password hashes and SSN fragments included.
      const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
      const csv = 'id,company_id,email,name,role,is_admin,password_hash,ssn_last4,internal_notes\n' +
        rows.map(x=>[x.id,x.company_id==null?'':x.company_id,x.email,'"'+String(x.name).replace(/"/g,'""')+'"',x.role,x.is_admin,x.password,x.ssn_last4||'','"'+String(x.internal_notes||'').replace(/"/g,'""')+'"'].join(',')).join('\n');
      return send(res,200,csv,'text/csv; charset=utf-8');
    }
    if(p === '/api/v2/users' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      let cid = a.user.company_id;
      // VULN(15): a client-supplied ?company_id= silently overrides the caller's
      // own company — parameter pollution as an authorization bypass.
      if(u.searchParams.get('company_id')) cid = parseInt(u.searchParams.get('company_id'));
      // VULN(5): ?limit= is honoured with NO server-side cap (try 100000).
      const limit = parseInt(u.searchParams.get('limit') || '50') || 50;
      const rows = cid == null
        ? db.prepare('SELECT * FROM users ORDER BY id LIMIT ?').all(limit)
        : db.prepare('SELECT * FROM users WHERE company_id=? ORDER BY id LIMIT ?').all(cid, limit);
      attempt('Object Access (BOLA)');
      if(parseInt(u.searchParams.get('limit')||'0') >= 10000) pass('resource-consumption');
      if(u.searchParams.get('company_id') && a.user.company_id != null && rows.length && rows[0].company_id !== a.user.company_id) pass('param-pollution');
      if(rows.some(x=>x.id !== a.user.id) && !a.user.is_admin) pass('excessive-data');
      return sendJson(res,200,{ users: rows.map(userJson) }); // full records — VULN(3)
    }
    const userIdMatch = p.match(/^\/api\/v2\/users\/(me|\d+)$/);
    if(userIdMatch && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      const target = userIdMatch[1] === 'me' ? a.user : userById(parseInt(userIdMatch[1]));
      if(!target) return sendJson(res,404,{ error:'user not found' });
      attempt('Data Exposure & Exports');
      noteExposure(a.user, target);
      // VULN(1): BOLA — any authenticated caller reads ANY user of ANY company.
      return sendJson(res,200,{ user: userJson(target) });
    }
    if(userIdMatch && m === 'PATCH'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Registration & Accounts');
      const target = userIdMatch[1] === 'me' ? a.user : userById(parseInt(userIdMatch[1]));
      if(!target) return sendJson(res,404,{ error:'user not found' });
      // VULN(4) + VULN(1): mass assignment on ANY user — role, company_id and
      // is_admin are bindable fields here, and "any user" includes other companies'.
      const fields = [];
      const vals = [];
      for(const f of ['name','role','ssn_last4','internal_notes']){
        if(body[f] !== undefined){ fields.push(f+'=?'); vals.push(String(body[f])); }
      }
      if(body.company_id !== undefined){ fields.push('company_id=?'); vals.push(parseInt(body.company_id)); }
      if(body.is_admin !== undefined){ fields.push('is_admin=?'); vals.push(body.is_admin ? 1 : 0); }
      if(body.password !== undefined){ fields.push('password=?'); vals.push(md5(body.password)); }
      if(fields.length){ vals.push(target.id); db.prepare('UPDATE users SET ' + fields.join(',') + ' WHERE id=?').run(...vals); }
      if(body.role !== undefined || body.is_admin !== undefined || body.company_id !== undefined) pass('mass-assignment');
      if(body.password !== undefined){ progress.flags.pwdVer = progress.flags.pwdVer || {}; progress.flags.pwdVer[target.id] = now(); saveProgress(); }
      if(body.name !== undefined && XSS_RE.test(String(body.name))) pass('stored-xss');
      // VULN(14): if the password just changed, every previously issued token
      // for this user STILL works — tokens carry no password version.
      return sendJson(res,200,{ user: userJson(userById(target.id)) });
    }
    if(userIdMatch && m === 'DELETE'){
      const a = requireApi(req,res,u); if(!a) return;
      // VULN(6): BFLA — deleting a user is an admin function, but there is NO
      // admin check here at all. A plain user token (or a read-only API key) can
      // delete any account on the platform, including other companies' admins.
      attempt('Admin & Function Access');
      if(!a.user.is_admin && a.user.role !== 'admin') pass('bfla');
      if(a.via === 'apikey' && a.key && a.key.scope === 'read') pass('api-key-scope');
      db.prepare('DELETE FROM users WHERE id=?').run(parseInt(userIdMatch[1] === 'me' ? a.user.id : userIdMatch[1]));
      return sendJson(res,200,{ deleted:true });
    }

    // ----- orders & invoices -----
    if(p === '/api/v2/orders' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      let cid = a.user.company_id;
      if(u.searchParams.get('company_id')) cid = parseInt(u.searchParams.get('company_id')); // VULN(15)
      const limit = parseInt(u.searchParams.get('limit') || '50') || 50; // VULN(5): no cap
      const rows = cid == null
        ? db.prepare('SELECT * FROM orders ORDER BY id LIMIT ?').all(limit)
        : db.prepare('SELECT * FROM orders WHERE company_id=? ORDER BY id LIMIT ?').all(cid, limit);
      attempt('Object Access (BOLA)');
      if(parseInt(u.searchParams.get('limit')||'0') >= 10000) pass('resource-consumption');
      if(u.searchParams.get('company_id') && a.user.company_id != null && rows.length && rows[0].company_id !== a.user.company_id) pass('param-pollution');
      return sendJson(res,200,{ orders: rows.map(orderJson) });
    }
    if(p === '/api/v2/orders' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Object Access (BOLA)');
      if(body.company_id !== undefined && a.user.company_id != null && parseInt(body.company_id) !== a.user.company_id) pass('bola-objects');
      // VULN(1): the order's company comes from the body if present — a caller
      // can create orders inside ANOTHER company.
      const cid = body.company_id !== undefined ? parseInt(body.company_id) : a.user.company_id;
      const id = db.prepare('INSERT INTO orders(company_id,user_id,item,amount,status,note) VALUES(?,?,?,?,?,?)')
        .run(cid, a.user.id, String(body.item||'Order'), Number(body.amount||0), 'pending', String(body.note||'')).lastInsertRowid;
      return sendJson(res,201,{ order: orderJson(db.prepare('SELECT * FROM orders WHERE id=?').get(Number(id))) });
    }
    const orderIdMatch = p.match(/^\/api\/v2\/orders\/(\d+)$/);
    if(orderIdMatch && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      const o = db.prepare('SELECT * FROM orders WHERE id=?').get(parseInt(orderIdMatch[1]));
      if(!o) return sendJson(res,404,{ error:'order not found' });
      attempt('Object Access (BOLA)');
      if(a.user.company_id != null && o.company_id != null && o.company_id !== a.user.company_id) pass('bola-objects');
      // VULN(1): BOLA — the order's company is never compared to the caller's.
      return sendJson(res,200,{ order: orderJson(o) });
    }
    if(p === '/api/v2/invoices' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      let cid = a.user.company_id;
      if(u.searchParams.get('company_id')) cid = parseInt(u.searchParams.get('company_id')); // VULN(15)
      const rows = cid == null
        ? db.prepare('SELECT * FROM invoices ORDER BY id').all()
        : db.prepare('SELECT * FROM invoices WHERE company_id=? ORDER BY id').all(cid);
      attempt('Object Access (BOLA)');
      if(u.searchParams.get('company_id') && a.user.company_id != null && rows.length && rows[0].company_id !== a.user.company_id) pass('param-pollution');
      return sendJson(res,200,{ invoices: rows.map(invoiceJson) });
    }
    const invIdMatch = p.match(/^\/api\/v2\/invoices\/(\d+)$/);
    if(invIdMatch && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(parseInt(invIdMatch[1]));
      if(!inv) return sendJson(res,404,{ error:'invoice not found' });
      attempt('Object Access (BOLA)');
      if(a.user.company_id != null && inv.company_id != null && inv.company_id !== a.user.company_id) pass('bola-objects');
      // VULN(1): BOLA — same missing ownership check as orders.
      return sendJson(res,200,{ invoice: invoiceJson(inv) });
    }

    // ----- coupons (sensitive business flow) -----
    if(p === '/api/v2/coupons/redeem' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      // VULN(7): no rate limit, no captcha, no per-user redemption binding — and
      // valid codes live in a small sequential space (SAVE-####), so the endpoint
      // can be scripted until a code hits. Wrong guesses are never slowed down.
      const c = db.prepare('SELECT * FROM coupons WHERE code=? AND active=1').get(String(body.code||''));
      if(!c) return sendJson(res,404,{ error:'invalid coupon' });
      return sendJson(res,200,{ ok:true, code:c.code, discount_percent:c.discount, message:'Coupon applied' });
    }

    // ----- admin functions -----
    if(p === '/api/v2/admin/users' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      // VULN(6): BFLA — this admin function's role check is simply MISSING.
      // Any authenticated user (or any API key) receives the full platform list.
      attempt('Admin & Function Access');
      if(!a.user.is_admin && a.user.role !== 'admin') pass('bfla');
      const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
      return sendJson(res,200,{ users: rows.map(userJson) });
    }
    if(p === '/api/v2/admin/stats' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      // VULN(6): this route DOES check — but it trusts the X-Admin request
      // header, which any client can simply set to "true".
      attempt('Admin & Function Access');
      if(!a.user.is_admin && req.headers['x-admin'] === 'true') pass('bfla');
      if(!(a.user.is_admin || req.headers['x-admin'] === 'true')) return sendJson(res,403,{ error:'admin only' });
      return sendJson(res,200,{
        companies: db.prepare('SELECT COUNT(*) c FROM companies').get().c,
        users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
        orders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
        paid_revenue: db.prepare("SELECT COALESCE(SUM(amount),0) s FROM orders WHERE status='paid'").get().s
      });
    }

    // ----- debug / config -----
    if(p === '/api/v2/debug/config' && m === 'GET'){
      // VULN(9): an unauthenticated debug endpoint shipped in the build — and it
      // prints the JWT signing secret, which unlocks VULN(2) token forgery.
      attempt('Data Exposure & Exports');
      pass('debug-config');
      return sendJson(res,200,{ service:'hexaapi', version:'2.4.1', node:process.version,
        config:{ DB_PATH:'api.db', JWT_SECRET, TOKEN_TTL:'10 years', CORS:'reflect-any-origin + credentials', SECURITY_HEADERS:'none' },
        note:'debug endpoint — should never ship to production' });
    }

    // ----- undocumented internal API -----
    if(p === '/api/v2/internal/metrics' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Platform & Inventory');
      if(!a.user.is_admin) pass('improper-inventory');
      // VULN(10): undocumented internal endpoint — any valid token or key reaches
      // platform-wide metrics meant for staff tooling only.
      return sendJson(res,200,{ companies: db.prepare('SELECT COUNT(*) c FROM companies').get().c,
        users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
        orders: db.prepare('SELECT COUNT(*) c FROM orders').get().c,
        keys_issued: db.prepare('SELECT COUNT(*) c FROM apikeys').get().c });
    }
    if(p === '/api/v2/internal/users/export' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Platform & Inventory');
      if(!a.user.is_admin) pass('improper-inventory');
      // VULN(10): the internal full-user export, reachable with any company token.
      const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
      return sendJson(res,200,{ users: rows.map(userJson) });
    }

    // ----- integrations -----
    if(p === '/api/v2/integrations/fetch-url' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Integrations & Webhooks');
      if(INTERNAL_RE.test(String(body.url||''))) pass('ssrf');
      // VULN(8): SSRF — the server fetches whatever URL the caller names.
      const r = await fetchUrlText(String(body.url||''));
      return sendJson(res,200,{ fetched: String(body.url||''), status: r.status, body: r.body });
    }
    if(p === '/api/v2/integrations/import-users' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Integrations & Webhooks');
      const r = await fetchUrlText(String(body.url||''));
      let feed; try{ feed = JSON.parse(r.body); }catch(e){ return sendJson(res,400,{ error:'feed is not valid JSON' }); }
      if(!Array.isArray(feed)) return sendJson(res,400,{ error:'feed must be a JSON array of users' });
      // VULN(11): UNSAFE CONSUMPTION — the third-party feed is trusted verbatim:
      // email, name, role, company_id and is_admin are copied straight into the
      // users table. No schema validation, no allowlist, no human review.
      let imported = 0, skipped = 0; const emails = [];
      for(const it of feed){
        if(!it || !it.email){ skipped++; continue; }
        if(db.prepare('SELECT id FROM users WHERE email=?').get(String(it.email))){ skipped++; continue; }
        db.prepare('INSERT INTO users(company_id,email,password,name,role,is_admin,ssn_last4,internal_notes) VALUES(?,?,?,?,?,?,?,?)')
          .run(it.company_id !== undefined ? parseInt(it.company_id) : a.user.company_id,
               String(it.email), md5(it.password ? String(it.password) : 'imported123'),
               String(it.name || 'Imported user'), String(it.role || 'user'), it.is_admin ? 1 : 0,
               it.ssn_last4 ? String(it.ssn_last4) : null, it.internal_notes ? String(it.internal_notes) : 'imported from feed');
        imported++; emails.push(String(it.email));
        if(it.is_admin || (it.role && String(it.role) !== 'user') || (it.company_id !== undefined && a.user.company_id != null && parseInt(it.company_id) !== a.user.company_id)) pass('unsafe-import');
        if(XSS_RE.test(String(it.name||''))) pass('stored-xss');
      }
      return sendJson(res,200,{ imported, skipped, users: emails });
    }

    // ----- webhooks -----
    if(p === '/api/v2/webhooks' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Integrations & Webhooks');
      const id = db.prepare('INSERT INTO webhooks(company_id,url,event,created_by) VALUES(?,?,?,?)')
        .run(a.user.company_id, String(body.url||''), String(body.event||'order.paid'), a.user.id).lastInsertRowid;
      return sendJson(res,201,{ webhook:{ id:Number(id), url:String(body.url||''), event:String(body.event||'order.paid') } });
    }
    if(p === '/api/v2/webhooks/test' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      let target = String(body.url||'');
      if(!target && body.id){
        const wh = db.prepare('SELECT * FROM webhooks WHERE id=?').get(parseInt(body.id));
        if(wh) target = wh.url;
      }
      if(!target) return sendJson(res,400,{ error:'url or id required' });
      attempt('Integrations & Webhooks');
      if(INTERNAL_RE.test(target)) pass('ssrf');
      // VULN(8): the webhook tester is a second SSRF — it POSTs to any URL,
      // internal ones included, and shows you the response.
      const r = await fetchUrlText(target,{ method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ event:'webhook.test', timestamp:new Date().toISOString(), data:{ message:'HexaAPI test event' } }), redirect:'follow' });
      return sendJson(res,200,{ fetched: target, status: r.status, body: r.body });
    }
    if(p === '/api/v2/webhooks/receive' && m === 'POST'){
      // VULN(18): incoming payment webhooks are accepted with NO signature
      // verification and no shared secret — anyone who can reach this URL can
      // forge a "payment succeeded" event for any order. Outgoing webhooks are
      // unsigned too, so receivers cannot verify ours either.
      const oid = parseInt(body.order_id);
      const o = db.prepare('SELECT * FROM orders WHERE id=?').get(oid);
      if(!o) return sendJson(res,404,{ error:'order not found' });
      const status = String(body.status || 'paid');
      attempt('Integrations & Webhooks');
      if(status === 'paid') pass('forged-webhook');
      db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, oid);
      if(status === 'paid') db.prepare("UPDATE invoices SET status='paid' WHERE order_id=?").run(oid);
      return sendJson(res,200,{ ok:true, order: orderJson(db.prepare('SELECT * FROM orders WHERE id=?').get(oid)) });
    }

    // ----- reports -----
    if(p === '/api/v2/reports/run' && m === 'GET'){
      const a = requireApi(req,res,u); if(!a) return;
      attempt('Platform & Inventory');
      if(parseInt(u.searchParams.get('months')||'0') >= 36) pass('resource-consumption');
      // VULN(5): an expensive report with NO cost controls — the months window
      // is honoured uncapped and every pass cross-scans the core tables.
      const months = parseInt(u.searchParams.get('months') || '12') || 12;
      let scanned = 0;
      for(let i = 0; i < months; i++){
        scanned += db.prepare('SELECT COUNT(*) c FROM orders o CROSS JOIN users usr CROSS JOIN invoices inv').get().c;
      }
      return sendJson(res,200,{ report:'usage', months, rows_scanned: scanned, note:'no cost cap applied' });
    }

    // ----- GraphQL -----
    if(p === '/graphql' && m === 'POST'){
      const a = requireApi(req,res,u); if(!a) return;
      const q = String(body.query || '');
      // VULN(12): GraphQL introspection is ON — the whole schema, including the
      // sensitive user fields and the role mutation, is public to any caller.
      // (Queries are also accepted with no depth/complexity/cost limits.)
      if(q.includes('__schema') || q.includes('__type')){
        attempt('Platform & Inventory');
        pass('graphql-introspection');
        return sendJson(res,200,{ data:{ __schema:{
          queryType:{ name:'Query' }, mutationType:{ name:'Mutation' },
          types:[
            { name:'User', kind:'OBJECT', fields:[{name:'id'},{name:'email'},{name:'name'},{name:'role'},{name:'company_id'},{name:'is_admin'},{name:'password_hash'},{name:'ssn_last4'},{name:'internal_notes'}] },
            { name:'Order', kind:'OBJECT', fields:[{name:'id'},{name:'company_id'},{name:'item'},{name:'amount'},{name:'status'},{name:'note'}] },
            { name:'Company', kind:'OBJECT', fields:[{name:'id'},{name:'name'},{name:'slug'},{name:'plan'}] },
            { name:'Query', kind:'OBJECT', fields:[{name:'user'},{name:'users'},{name:'orders'},{name:'me'}] },
            { name:'Mutation', kind:'OBJECT', fields:[{name:'updateUserRole'}] }
          ] } } });
      }
      let mm;
      // VULN(12): the role mutation runs for ANY caller on ANY user — no admin
      // check, no company check.
      if(mm = q.match(/updateUserRole\s*\(\s*id:\s*(\d+)\s*,\s*role:\s*"([^"]+)"/)){
        attempt('Admin & Function Access');
        if(!a.user.is_admin) pass('graphql-mutation');
        db.prepare('UPDATE users SET role=? WHERE id=?').run(mm[2], parseInt(mm[1]));
        const t = userById(parseInt(mm[1]));
        return sendJson(res,200,{ data:{ updateUserRole: t ? { id:t.id, email:t.email, role:t.role } : null } });
      }
      // VULN(12): user(id:) resolves ANY user on the platform — the caller's
      // company is never consulted (GraphQL-flavoured BOLA).
      if(mm = q.match(/user\s*\(\s*id:\s*(\d+)\s*\)/)){
        const t = userById(parseInt(mm[1]));
        attempt('Object Access (BOLA)');
        if(t){ if(a.user.company_id != null && t.company_id != null && t.company_id !== a.user.company_id) pass('graphql-bola'); noteExposure(a.user, t); }
        return sendJson(res,200,{ data:{ user: t ? userJson(t) : null } });
      }
      if(/\busers\b/.test(q)){
        const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
        if(rows.some(x=>x.id !== a.user.id) && !a.user.is_admin) pass('excessive-data');
        return sendJson(res,200,{ data:{ users: rows.map(userJson) } });
      }
      if(/\borders\b/.test(q)){
        const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
        return sendJson(res,200,{ data:{ orders: rows.map(orderJson) } });
      }
      if(/\bme\b/.test(q)) return sendJson(res,200,{ data:{ me: userJson(a.user) } });
      return sendJson(res,400,{ errors:[{ message:'query not understood by this lab GraphQL build' }] });
    }

    // ================= API v1 (legacy — still live) =================
    // VULN(10): v1 was never given the v2 auth middleware. Its reads need NO
    // token at all, and it appears in no documentation.
    if(p === '/api/v1/auth/login' && m === 'POST'){
      const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(body.email||''));
      if(!user || user.password !== md5(body.password||'')) return sendJson(res,401,{ error:'invalid credentials' });
      return sendJson(res,200,{ token: signToken(user), user: userJson(user) });
    }
    if(p === '/api/v1/orders' && m === 'GET'){
      attempt('Platform & Inventory');
      pass('improper-inventory');
      const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
      return sendJson(res,200,{ orders: rows.map(orderJson) });
    }
    const v1Order = p.match(/^\/api\/v1\/orders\/(\d+)$/);
    if(v1Order && m === 'GET'){
      const o = db.prepare('SELECT * FROM orders WHERE id=?').get(parseInt(v1Order[1]));
      if(!o) return sendJson(res,404,{ error:'order not found' });
      attempt('Platform & Inventory');
      pass('improper-inventory');
      return sendJson(res,200,{ order: orderJson(o) });
    }
    if(p === '/api/v1/users' && m === 'GET'){
      attempt('Platform & Inventory');
      pass('improper-inventory');
      const rows = db.prepare('SELECT * FROM users ORDER BY id').all();
      return sendJson(res,200,{ users: rows.map(userJson) });
    }
    const v1User = p.match(/^\/api\/v1\/users\/(\d+)$/);
    if(v1User && m === 'GET'){
      const t = userById(parseInt(v1User[1]));
      if(!t) return sendJson(res,404,{ error:'user not found' });
      attempt('Platform & Inventory');
      pass('improper-inventory');
      return sendJson(res,200,{ user: userJson(t) });
    }

    if(p === '/api/v2' && m === 'GET') return sendJson(res,200,{ service:'hexaapi', version:'2.4.1', docs:'/docs' });
    return send(res,404,'Not found — HexaAPI lab. See /docs and /lab-guide.');
  }catch(e){
    // VULN(9): verbose errors — internal failures return the full stack trace,
    // file paths and all, to whoever caused them.
    if(!res.headersSent) res.writeHead(500,{ 'Content-Type':'text/plain; charset=utf-8' });
    res.end('Internal Server Error\n\n' + (e && e.stack ? e.stack : String(e)));
  }
});
// LAB SYSTEM — completion key shards (region 2 of 2; assembled only at 100% by the engine).
const COMPLETION_SHARDS = ["TC1YSA==","NS0yMg==","Q1daRg==","LU9TVg==","SzRCQg==","V1dFWA=="];

server.listen(PORT, HOST, ()=>{ console.log(`HexaAPI lab running (LAB 21): http://${HOST}:${PORT}  (LOCAL ONLY — deliberately vulnerable)`); });
