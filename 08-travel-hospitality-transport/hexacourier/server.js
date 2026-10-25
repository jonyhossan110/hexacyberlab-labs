'use strict';
/* LAB 77 — HexaCourier. Zero-dependency Node training lab (LOCAL ONLY).
   A courier delivery platform with intentionally vulnerable workflows
   plus the HexaCyberLab lab system (progress, hints, coach, key chain). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3086;
const LAB_NUMBER = 77;
const LAB_NAME = 'HexaCourier';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');

/* ---- courier network tuning constants (region 1) ---- */


/* ================= TESTS registry ================= */
const TESTS = [
 /* ---------- Login & Authentication ---------- */
 { id:'auth-sqli', feature:'Login & Authentication', name:'SQL Injection Login Bypass', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:["The login form builds its query by gluing your input straight into SQL.","Try a quote in the email field and watch how the behaviour changes.","Use email: ' OR '1'='1 with any password — the check ends up comparing the quote logic, not your password."],
   lesson:"String-built SQL queries let an attacker rewrite the login condition and enter as the first account in the table — usually the admin.",
   impact:"On a real courier platform this means instant takeover of the admin account: every customer's name, phone number and home address is exposed.",
   report:{ title:'SQL Injection in Login Form Allows Authentication Bypass', severity:'Critical', remediation:'Use parameterised queries everywhere; never build SQL by string concatenation.' } },
 { id:'auth-brute', feature:'Login & Authentication', name:'Brute Force — No Rate Limiting', owasp:'A07:2021 Authentication Failures', difficulty:'Beginner',
   hints:["Nothing slows you down when a password is wrong.","Script 10+ wrong passwords for one account: no lockout, no CAPTCHA, no delay.","The 10th wrong attempt is processed exactly like the first — the missing throttle is the flaw."],
   lesson:"Without throttling or lockout, an attacker can try millions of passwords against any account.",
   impact:"Customer and courier accounts fall to password guessing, exposing delivery addresses and courier earnings.",
   report:{ title:'Missing Rate Limiting on Login Allows Brute-Force Attacks', severity:'High', remediation:'Add progressive delays, account lockout and CAPTCHA after repeated failed logins.' } },
 { id:'auth-enum', feature:'Login & Authentication', name:'User Enumeration via Login & Forgot-Password', owasp:'A07:2021 Authentication Failures', difficulty:'Beginner',
   hints:["Compare the error for an email that exists with one that does not — on both forms.","The forgot-password form is even more talkative than the login form.","Probe at least 5 different emails; the different answers confirm which accounts exist."],
   lesson:"Different error messages for 'no such user' and 'wrong password' let attackers build a verified list of accounts to target.",
   impact:"Attackers confirm which customers and staff hold accounts, then focus phishing and guessing on real people.",
   report:{ title:'User Enumeration Through Differential Authentication Responses', severity:'Medium', remediation:'Return one generic message for all failed logins and password-reset requests.' } },
 { id:'auth-default', feature:'Login & Authentication', name:'Published Demo Credentials', owasp:'A07:2021 Authentication Failures', difficulty:'Beginner',
   hints:["Read the login page carefully — the site itself hands out a working account.","Demo accounts created for convenience are rarely removed in production.","Sign in with the demo courier credentials printed under the login form."],
   lesson:"Demo and default accounts left active are the first thing an attacker tries — the password is public.",
   impact:"Anyone on the internet can sign in as a courier and see assigned deliveries, customer addresses and COD amounts.",
   report:{ title:'Active Demo Account With Publicly Displayed Credentials', severity:'High', remediation:'Remove demo accounts from production and force unique credentials for every user.' } },
 { id:'auth-reset', feature:'Login & Authentication', name:'Predictable Password-Reset Token', owasp:'A07:2021 Authentication Failures', difficulty:'Intermediate',
   hints:["Look at the shape of a reset token — then look at the account's user id.","The token is computed from something public about the account, not generated randomly.","Token = HC- plus a base36 value derived from the user id (id x 911 + 77). Compute another user's token and reset their password without any email."],
   lesson:"Reset tokens must be random and unguessable; a token derived from the user id can be computed for every account.",
   impact:"Any account — including the admin's — can be taken over by anyone who can guess a numeric user id.",
   report:{ title:'Password Reset Token Is Predictable (Derived From User ID)', severity:'Critical', remediation:'Generate reset tokens with a CSPRNG, store only a hash, and expire them quickly.' } },
 { id:'auth-cookie', feature:'Login & Authentication', name:'Session Role Cookie Tampering', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["After login, inspect the cookies the app sets — your role travels with your browser.","The dispatch console trusts a cookie instead of the server-side account record.","Set the hx_role cookie to dispatcher and open /dispatch — the server never checks your real role."],
   lesson:"Authorisation data must live server-side; a role stored in a client cookie can be edited by the user at will.",
   impact:"Any customer can promote themselves to dispatcher and read the full delivery manifest with every customer's address.",
   report:{ title:'Broken Access Control — Role Stored in a Client-Side Cookie', severity:'High', remediation:'Keep roles in the server-side session record and verify them on every privileged request.' } },

 /* ---------- Registration & Profile ---------- */
 { id:'reg-weak', feature:'Registration & Profile', name:'Weak Password Policy', owasp:'A07:2021 Authentication Failures', difficulty:'Beginner',
   hints:["Try registering with a one-character password.","The form accepts anything — there is no length or complexity check at all.","Create an account with password 'x' — it works, and that is the vulnerability."],
   lesson:"A password policy is the cheapest defence there is; accepting 1-character passwords invites instant guessing.",
   impact:"Customer accounts with trivial passwords are harvested in bulk, leaking addresses and order history.",
   report:{ title:'Weak Password Policy Allows Single-Character Passwords', severity:'Medium', remediation:'Enforce a minimum length of 10+ characters and block commonly used passwords.' } },
 { id:'reg-mass', feature:'Registration & Profile', name:'Mass Assignment — Role & Credit at Registration', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["The registration handler copies more fields from your request than the form shows.","Add fields the form never offered — the server trusts your request body.","Register including role=dispatcher and credit=5000 — you are given both."],
   lesson:"Binding request fields directly onto the account object lets attackers set privileged fields like role and balance.",
   impact:"Attackers mint dispatcher accounts or free credit at signup, bypassing every business control downstream.",
   report:{ title:'Mass Assignment in Registration Allows Role and Credit Injection', severity:'Critical', remediation:'Whitelist exactly the fields a registration may set; assign role and credit server-side only.' } },
 { id:'reg-xss', feature:'Registration & Profile', name:'Stored XSS in Display Name', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:["Your display name is printed back on dashboards and staff screens without escaping.","Put an HTML/JS payload where a name should be, then look at where that name appears.","Register with the name <script>alert(1)</script> — it is stored and rendered raw to staff."],
   lesson:"Any field rendered without output encoding becomes a stored XSS delivery vehicle aimed at staff users.",
   impact:"A malicious 'customer name' executes in the dispatcher's or admin's browser, enabling session theft and actions in their name.",
   report:{ title:'Stored Cross-Site Scripting via Display Name', severity:'High', remediation:'HTML-encode all user-controlled output and add a Content-Security-Policy.' } },
 { id:'reg-csrf', feature:'Registration & Profile', name:'CSRF on Profile Update', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["The profile form carries a hidden marker that pretends to be CSRF protection — check whether the server verifies it.","Submit the profile change from a plain script with no marker and no same-site Origin.","POST /profile with a new phone number and no hx_marker field — the change is accepted anyway."],
   lesson:"State-changing forms need a real, verified anti-CSRF token tied to the session.",
   impact:"A booby-trapped page a logged-in customer visits can silently change their account phone/address — rerouting their deliveries.",
   report:{ title:'Cross-Site Request Forgery on Profile Update', severity:'Medium', remediation:'Require and verify a per-session CSRF token on every state-changing request.' } },

 /* ---------- Pickup Requests & Pricing ---------- */
 { id:'pickup-fee', feature:'Pickup Requests & Pricing', name:'Zone Fee / Price Tampering at Pickup Creation', owasp:'A04:2021 Insecure Design', difficulty:'Beginner',
   hints:["The server should price a pickup from the zone table — check what it actually uses.","Your request can carry its own price field.","Create a pickup for the Remote zone with price=1 — the parcel is booked for 1 instead of the real fee."],
   lesson:"Prices must be computed server-side from the catalogue; a client-supplied price is an invitation to pay almost nothing for anything.",
   impact:"Customers ship heavy parcels across the country for almost nothing — direct revenue loss on every tampered order.",
   report:{ title:'Client-Supplied Price Trusted at Pickup Creation', severity:'High', remediation:'Ignore client pricing fields; compute fees server-side from zone and weight.' } },
 { id:'pickup-weight', feature:'Pickup Requests & Pricing', name:'Negative Weight Accepted (Quantity Tampering)', owasp:'A04:2021 Insecure Design', difficulty:'Intermediate',
   hints:["Weight feeds the fee formula — what happens below zero?","The form validates the zone but never the weight range.","Create a pickup with weightKg=-5 — it is accepted and drags the total below the zone fee."],
   lesson:"Numeric inputs need range validation; negative quantities invert business math.",
   impact:"Negative weights create zero or negative shipping charges and corrupt billing and courier-pay calculations.",
   report:{ title:'Missing Range Validation Allows Negative Parcel Weight', severity:'Medium', remediation:'Validate weight as a positive number within business limits on the server.' } },
 { id:'pickup-idor', feature:'Pickup Requests & Pricing', name:"IDOR — View Another Customer's Parcel", owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["Parcel pages use a simple numeric id.","You only ever see your own parcels in the list — but the detail page never checks ownership.","Open /parcels/<id> for an id that is not yours — another customer's addresses and COD amount are shown."],
   lesson:"Every object access must verify that the requester owns (or is assigned to) that object.",
   impact:"Anyone can harvest customers' home addresses, phone numbers and what they are shipping — a serious privacy breach.",
   report:{ title:'Insecure Direct Object Reference on Parcel Details', severity:'High', remediation:'Check ownership or assignment on every parcel read and write.' } },
 { id:'pickup-cancel', feature:'Pickup Requests & Pricing', name:"Cancel Another Customer's Pickup", owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["Cancelling is just a POST with the parcel id.","The cancel endpoint checks that you are logged in — nothing more.","POST /parcels/<id>/cancel for someone else's parcel — it is cancelled."],
   lesson:"State-changing actions need the same ownership checks as reads — destructive ones even more.",
   impact:"A competitor or prankster can cancel strangers' deliveries, destroying trust and revenue.",
   report:{ title:"Broken Access Control Allows Cancelling Other Customers' Pickups", severity:'High', remediation:'Verify the session user owns the parcel before allowing cancellation.' } },

 /* ---------- Delivery Jobs & Assignment ---------- */
 { id:'job-selfassign', feature:'Delivery Jobs & Assignment', name:'Customer Assigns Delivery Jobs (Dispatcher Function)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["Assignment is meant for dispatchers — find the endpoint the dispatch page uses.","The server never asks what role you hold when you call it directly.","As a customer, POST /jobs/<id>/assign with a courierId — the job is assigned on your word."],
   lesson:"Function-level authorisation must be enforced on the server for every privileged action, not merely hidden in the UI.",
   impact:"Customers can steer any parcel to any courier — enabling theft rings where a fake courier 'delivers' parcels to themselves.",
   report:{ title:'Missing Function-Level Authorisation on Job Assignment', severity:'High', remediation:'Require the dispatcher/admin role server-side for assignment actions.' } },
 { id:'job-deliver-customer', feature:'Delivery Jobs & Assignment', name:'Customer Marks Own Parcel Delivered (Courier Endpoint)', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["Delivery confirmation is a courier action — but who does the endpoint actually check?","Call the courier's deliver endpoint while signed in as the customer.","POST /jobs/<id>/deliver with a receiver name — the parcel becomes 'delivered'."],
   lesson:"Role checks must guard workflow transitions; a customer completing their own delivery breaks the chain of custody.",
   impact:"Customers can fake completed deliveries, claim refunds for 'never received' parcels, and corrupt courier pay records.",
   report:{ title:'Broken Access Control — Customer Can Confirm Delivery', severity:'High', remediation:'Restrict delivery confirmation to the assigned courier and verify the assignment.' } },
 { id:'job-wrong-courier', feature:'Delivery Jobs & Assignment', name:'Courier Delivers a Job Assigned to Another Courier', owasp:'A01:2021 Broken Access Control', difficulty:'Intermediate',
   hints:["The deliver endpoint checks that you are a courier — but not that the job is yours.","Sign in as one courier and complete a job from another courier's list.","Deliver a parcel whose courierId is a different courier — it succeeds."],
   lesson:"Being *a* courier is not enough; the action must be tied to *the assigned* courier.",
   impact:"Couriers can steal each other's jobs and earnings, and parcels change hands with no accountable handler.",
   report:{ title:'Missing Assignment Check Allows Cross-Courier Delivery', severity:'Medium', remediation:'Verify parcel.courierId equals the session courier on pickup/deliver actions.' } },
 { id:'job-pod-idor', feature:'Delivery Jobs & Assignment', name:'IDOR — Proof of Delivery of Another Job', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["Proof-of-delivery pages carry the receiver's name and signature code.","Like the parcel page, the POD page trusts the id in the URL.","Open /pod/<id> for a parcel that is not yours — the receiver details are exposed."],
   lesson:"Delivery evidence is sensitive personal data and needs the same ownership checks as the parcel itself.",
   impact:"Strangers can learn who received a parcel and when — enabling targeted scams against recipients.",
   report:{ title:'Insecure Direct Object Reference on Proof of Delivery', severity:'Medium', remediation:"Restrict POD views to the parcel's customer, its assigned courier, and staff." } },

 /* ---------- COD & Payments ---------- */
 { id:'cod-forge', feature:'COD & Payments', name:'COD Amount Forgery After Booking', owasp:'A04:2021 Insecure Design', difficulty:'Intermediate',
   hints:["The cash-on-delivery amount is fixed at booking — or is it?","There is an endpoint that updates it, and it asks no questions.","POST /parcels/<id>/cod with a new codAmount — the courier will collect whatever you set."],
   lesson:"Financial fields must be immutable after booking, or changeable only by authorised roles with an audit trail.",
   impact:"COD amounts can be shrunk so couriers collect almost nothing, or inflated to extort recipients — direct cash loss.",
   report:{ title:'Cash-on-Delivery Amount Editable After Booking', severity:'High', remediation:'Lock COD at creation; allow changes only by staff roles with an audit trail.' } },
 { id:'cod-settle', feature:'COD & Payments', name:'COD Marked Collected for Less Than the Amount Due', owasp:'A04:2021 Insecure Design', difficulty:'Intermediate',
   hints:["Collection should require the full COD amount.","The collect endpoint marks the parcel settled for whatever number it is given.","POST /parcels/<id>/cod-collect with amount=1 on a large COD parcel — the books say 'collected'."],
   lesson:"Payment state transitions must verify that the settled amount equals the amount due.",
   impact:"Couriers or customers can close COD debts for pennies while the cash disappears — reconciliation never balances.",
   report:{ title:'COD Settlement Accepts Partial Amount as Fully Collected', severity:'High', remediation:'Only mark COD collected when the received amount equals the amount due; log discrepancies.' } },

 /* ---------- Courier Earnings & Manifest ---------- */
 { id:'earn-idor', feature:'Courier Earnings & Manifest', name:"IDOR — Another Courier's Earnings", owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["Earnings pages are per-courier and use the courier's id in the URL.","Your own earnings link works — so does everyone else's.","Open /couriers/<otherId>/earnings — their delivered jobs and pay are listed for you."],
   lesson:"Per-user financial views must be bound to the session user, never to a URL parameter.",
   impact:"Couriers' income data leaks to competitors and colleagues — privacy and labour-relations damage.",
   report:{ title:'Insecure Direct Object Reference on Courier Earnings', severity:'Medium', remediation:'Serve earnings only for the session courier (staff roles excepted).' } },
 { id:'manifest-leak', feature:'Courier Earnings & Manifest', name:'Dispatch Manifest Exposed to Customers', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["The daily manifest lists every parcel, sender, recipient and address.","It is a staff page — but the server hands it to anyone signed in.","As a customer, open /manifest — the whole day's deliveries are yours to read."],
   lesson:"Sensitive staff reports need role checks on the server, not just hidden links.",
   impact:"A full manifest leak exposes every customer's name, phone and address for the day — a bulk privacy breach.",
   report:{ title:'Sensitive Data Exposure — Dispatch Manifest Served to Customers', severity:'Critical', remediation:'Restrict the manifest to dispatcher/admin roles and audit access to it.' } },

 /* ---------- Search & Tracking ---------- */
 { id:'search-sqli', feature:'Search & Tracking', name:'SQL Injection in Parcel Tracking Search', owasp:'A03:2021 Injection', difficulty:'Intermediate',
   hints:["Tracking search glues your text into a query the same way the login form does.","A quote in the tracking code changes the query's meaning.","Search with ' OR '1'='1 — every parcel in the system is returned."],
   lesson:"Every input that reaches a query needs parameterisation — search boxes included.",
   impact:"Attackers dump the entire parcel database: customers, addresses, phone numbers and COD values.",
   report:{ title:'SQL Injection in Tracking Search Returns All Parcels', severity:'Critical', remediation:'Parameterise all queries and validate tracking-code formats.' } },
 { id:'search-xss', feature:'Search & Tracking', name:'Reflected XSS in Tracking Search', owasp:'A03:2021 Injection', difficulty:'Beginner',
   hints:["Your search text is echoed back on the results page.","It is echoed without any encoding.","Search for <script>alert(1)</script> — the payload comes back raw in the page."],
   lesson:"Reflected input must be encoded on output, even on 'harmless' search pages.",
   impact:"Attack links sent to staff execute scripts in their browsers — session theft and actions performed as the victim.",
   report:{ title:'Reflected Cross-Site Scripting in Tracking Search', severity:'Medium', remediation:'HTML-encode reflected values and deploy a Content-Security-Policy.' } },

 /* ---------- Admin Panel ---------- */
 { id:'admin-bac', feature:'Admin Panel', name:'Admin Console Open to Any Signed-In User', owasp:'A01:2021 Broken Access Control', difficulty:'Beginner',
   hints:["The admin link is hidden from customers — the page itself is not protected.","Just type the URL directly.","Open /admin while signed in as a customer — the user list, roles and passwords are served."],
   lesson:"Hiding a link is not access control; every privileged page must check the role on the server.",
   impact:"Every registered user can read all accounts and passwords — total platform compromise from a free signup.",
   report:{ title:'Broken Access Control on Admin Console', severity:'Critical', remediation:'Enforce admin role checks on every admin route and never display stored passwords.' } },

 /* ---------- Platform & API ---------- */
 { id:'api-debug', feature:'Platform & API', name:'Unauthenticated Debug Endpoint Dumps All Data', owasp:'A05:2021 Security Misconfiguration', difficulty:'Beginner',
   hints:["Leftover debug routes are a classic production accident.","This one needs no login at all.","Open /api/debug in a private window — the full user and parcel data comes back as JSON."],
   lesson:"Debug and diagnostic endpoints must never ship to production; if they exist, they need authentication and auditing.",
   impact:"The entire customer and staff database is downloadable by anyone on the internet, with no account needed.",
   report:{ title:'Unauthenticated Debug Endpoint Exposes Full Database', severity:'Critical', remediation:'Remove debug endpoints from production builds entirely.' } },
];

/* ================= progress engine ================= */
let progress = { unlocked:false, testerName:'', tests:{}, attempts:{}, completedAt:null, keyRevealed:false };
try {
  if (fs.existsSync(PROGRESS_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    progress = Object.assign(progress, loaded);
  }
} catch (e) { /* start fresh on a corrupt state file */ }
function saveProgress() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 1)); } catch (e) {} }
function doneCount() { return TESTS.filter(t => progress.tests[t.id]).length; }
function pct() { return Math.floor(doneCount() * 100 / TESTS.length); }
function pass(id) {
  if (!progress.tests[id]) {
    progress.tests[id] = true;
    if (doneCount() >= TESTS.length && !progress.completedAt) {
      progress.completedAt = new Date().toISOString();
      progress.keyRevealed = true;
    }
    saveProgress();
  }
}
function attempt(feature) { progress.attempts[feature] = (progress.attempts[feature] || 0) + 1; saveProgress(); }
function featureList() { const out = []; for (const t of TESTS) if (!out.includes(t.feature)) out.push(t.feature); return out; }

/* ---- zone table (server-side pricing truth) ---- */
const ZONES = [
  { id:'Z1', name:'Inside City', fee:60 },
  { id:'Z2', name:'Suburb', fee:100 },
  { id:'Z3', name:'Nationwide', fee:180 },
  { id:'Z4', name:'Remote Island', fee:300 },
];
function zoneById(id) { return ZONES.find(z => z.id === id) || ZONES[0]; }
function feeFor(zoneId, weightKg) { return zoneById(zoneId).fee + 20 * Number(weightKg || 0); }

/* ---- regional depot config (region 2) ---- */


/* ================= seed data (all fake) ================= */
let nextUserId = 8, nextParcelId = 7;
const users = [
  { id:1, name:'HQ Admin', email:'admin@hexacourier.local', password:'admin123', role:'admin', phone:'0100000001', address:'HexaCourier HQ', credit:0 },
  { id:2, name:'Dana Dispatcher', email:'dispatch@hexacourier.local', password:'dispatch123', role:'dispatcher', phone:'0100000002', address:'Depot Office', credit:0 },
  { id:3, name:'Rahim Courier', email:'rahim@hexacourier.local', password:'courier123', role:'courier', phone:'0100000003', address:'Depot A', credit:0 },
  { id:4, name:'Selina Courier', email:'selina@hexacourier.local', password:'courier123', role:'courier', phone:'0100000004', address:'Depot B', credit:0 },
  { id:5, name:'Demo Courier', email:'demo@hexacourier.local', password:'demo123', role:'courier', phone:'0100000005', address:'Depot A', credit:0 },
  { id:6, name:'Alice Rahman', email:'alice@test.local', password:'alice123', role:'customer', phone:'0171000006', address:'12 Lake Road, Dhaka', credit:0 },
  { id:7, name:'Bob Karim', email:'bob@test.local', password:'bob123', role:'customer', phone:'0171000007', address:'8 Hill Street, Chattogram', credit:0 },
];
const parcels = [
  { id:1, tracking:'HX77-5001', customerId:6, courierId:3, recipientName:'Karim Uddin', recipientPhone:'0172000001', fromAddr:'12 Lake Road, Dhaka', toAddr:'44 River View, Narayanganj', zoneId:'Z1', weightKg:2, fee:100, codAmount:500, codOriginal:500, codCollected:500, codStatus:'collected', status:'delivered', podReceiver:'Karim Uddin', podCode:'POD-1001' },
  { id:2, tracking:'HX77-5002', customerId:6, courierId:3, recipientName:'Nusrat Jahan', recipientPhone:'0172000002', fromAddr:'12 Lake Road, Dhaka', toAddr:'9 College Gate, Gazipur', zoneId:'Z2', weightKg:1, fee:120, codAmount:0, codOriginal:0, codCollected:null, codStatus:'none', status:'in_transit', podReceiver:'', podCode:'' },
  { id:3, tracking:'HX77-5003', customerId:7, courierId:4, recipientName:'Tanvir Hasan', recipientPhone:'0172000003', fromAddr:'8 Hill Street, Chattogram', toAddr:'71 Sea Beach Road, Cox\u2019s Bazar', zoneId:'Z3', weightKg:3, fee:240, codAmount:1200, codOriginal:1200, codCollected:null, codStatus:'pending', status:'assigned', podReceiver:'', podCode:'' },
  { id:4, tracking:'HX77-5004', customerId:7, courierId:null, recipientName:'Farhana Akter', recipientPhone:'0172000004', fromAddr:'8 Hill Street, Chattogram', toAddr:'3 Tea Garden Lane, Sylhet', zoneId:'Z3', weightKg:1, fee:200, codAmount:0, codOriginal:0, codCollected:null, codStatus:'none', status:'requested', podReceiver:'', podCode:'' },
  { id:5, tracking:'HX77-5005', customerId:6, courierId:4, recipientName:'Imran Hossain', recipientPhone:'0172000005', fromAddr:'12 Lake Road, Dhaka', toAddr:'27 University Road, Rajshahi', zoneId:'Z3', weightKg:2, fee:220, codAmount:0, codOriginal:0, codCollected:null, codStatus:'none', status:'delivered', podReceiver:'Imran Hossain', podCode:'POD-1005' },
  { id:6, tracking:'HX77-5006', customerId:7, courierId:3, recipientName:'Sharmin Sultana', recipientPhone:'0172000006', fromAddr:'8 Hill Street, Chattogram', toAddr:'15 Port Road, Khulna', zoneId:'Z3', weightKg:4, fee:260, codAmount:750, codOriginal:750, codCollected:null, codStatus:'pending', status:'picked', podReceiver:'', podCode:'' },
];
function userById(id) { return users.find(u => u.id === Number(id)); }
function userByEmail(email) { return users.find(u => u.email === String(email || '').toLowerCase()); }
function parcelById(id) { return parcels.find(p => p.id === Number(id)); }

/* ================= sessions & helpers ================= */
const sessions = new Map();
const loginFails = {};           // email -> failed login count
const enumProbes = new Set();    // distinct emails probed via failed login / forgot
const issuedResetTokens = new Set(); // userIds that genuinely requested a reset
function newSid() { return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2); }
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(part => {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}
function getSession(req) {
  const c = parseCookies(req);
  const s = c.hx_session && sessions.get(c.hx_session);
  if (!s) return { cookies: c, session: null, user: null };
  return { cookies: c, session: s, user: userById(s.userId) || null };
}
function sqliPat(s) { return /(('|")\s*(or|and)\s+)|union\s+select|--/i.test(String(s || '')); }
function xssPat(s) { return /<script|<svg|<img[^>]*onerror|onerror\s*=|onload\s*=|<iframe/i.test(String(s || '')); }
function tokenFor(user) { return 'HC-' + (user.id * 911 + 77).toString(36).toUpperCase(); }
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': (type || 'text/html') + '; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(d));
    req.on('error', () => resolve(''));
  });
}
function parseBody(req, raw) {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('application/json')) { try { return JSON.parse(raw || '{}'); } catch (e) { return {}; } }
  const o = {};
  try { new URLSearchParams(raw).forEach((v, k) => { o[k] = v; }); } catch (e) {}
  return o;
}

/* ---- hub routing table (region 3) ---- */


/* ================= HTML shell ================= */
function chatWidget() {
  return `<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;background:#fff;border:1px solid #ccd;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.25);font-family:Arial,sans-serif;z-index:50">
  <div style="background:#23233a;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;font-weight:bold">Lab Coach — LAB ${LAB_NUMBER}</div>
  <div id="hxlog" style="height:180px;overflow:auto;padding:8px;font-size:13px;white-space:pre-wrap"></div>
  <div style="display:flex;border-top:1px solid #eee"><input id="hxin" style="flex:1;border:0;padding:8px;font-size:13px" placeholder="Ask the coach..."><button onclick="hxSend()" style="border:0;background:#4a4ae0;color:#fff;padding:8px 12px;cursor:pointer">Send</button></div>
</div>
<script>
function hxAdd(who,txt){var l=document.getElementById('hxlog');var d=document.createElement('div');d.style.margin='4px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(txt));l.appendChild(d);l.scrollTop=l.scrollHeight;}
function hxSend(){var i=document.getElementById('hxin');var v=i.value;i.value='';if(!v)return;hxAdd('You',v);fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:v})}).then(function(r){return r.json();}).then(function(j){hxAdd('Coach',j.reply||'...');}).catch(function(){hxAdd('Coach','(connection error)');});}
document.getElementById('hxin').addEventListener('keydown',function(e){if(e.key==='Enter')hxSend();});
</script>`;
}
function headerHTML(user) {
  const d = doneCount(), t = TESTS.length, p = pct();
  return `<div style="background:#14141d;color:#fff;padding:10px 16px;font-family:Arial,sans-serif">
  <img src="/logo.png" style="height:34px;vertical-align:middle"> <b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b>
  <span style="margin-left:14px">${d}/${t} tests · ${p}%</span>
  <div style="background:#333;height:8px;border-radius:4px;margin-top:6px"><div style="background:#5ad15a;height:8px;border-radius:4px;width:${p}%"></div></div>
  <nav style="margin-top:8px;font-size:14px">
    <a style="color:#9fd" href="/">Dashboard</a> ·
    <a style="color:#9fd" href="/parcels">Parcels</a> ·
    <a style="color:#9fd" href="/pickups/new">New Pickup</a> ·
    <a style="color:#9fd" href="/jobs">Delivery Jobs</a> ·
    <a style="color:#9fd" href="/track">Track</a> ·
    <a style="color:#9fd" href="/manifest">Manifest</a> ·
    <a style="color:#9fd" href="/dispatch">Dispatch</a> ·
    <a style="color:#9fd" href="/admin">Admin</a> ·
    <a style="color:#9fd" href="/tests">Mission Board</a> ·
    <a style="color:#9fd" href="/profile">Profile</a> ·
    <a style="color:#9fd" href="/complete">Completion</a> ·
    <a style="color:#f99" href="/logout">Logout</a>
    ${user ? `<span style="float:right">Signed in as ${user.name} (${user.role})</span>` : ''}
  </nav></div>`;
}
function page(user, title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} · LAB ${LAB_NUMBER} — ${LAB_NAME}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f4f4f8">${headerHTML(user)}
<div style="max-width:900px;margin:18px auto;background:#fff;border:1px solid #dde;border-radius:10px;padding:20px">${body}</div>
${chatWidget()}</body></html>`;
}
function gatePage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} · Locked</title></head>
<body style="margin:0;background:#14141d;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:12px;padding:28px;text-align:center">
<img src="/logo.png" style="height:56px"><h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${msg ? `<p style="color:#c00">${msg}</p>` : ''}
<form method="POST" action="/unlock"><input name="key" style="padding:9px;width:80%" placeholder="Completion key from Lab ${LAB_NUMBER - 1}"><br><br>
<button style="padding:10px 22px">Unlock LAB ${LAB_NUMBER}</button></form></div>
${chatWidget()}</body></html>`;
}

/* ================= app pages ================= */
function loginPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Login · ${LAB_NAME}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f8"><div style="max-width:420px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:10px;padding:24px">
<img src="/logo.png" style="height:44px"><h2>${LAB_NAME} — Sign in</h2>
${msg ? `<p style="color:#c00">${msg}</p>` : ''}
<form method="POST" action="/login"><label>Email</label><br><input name="email" style="width:100%;padding:8px"><br><br>
<label>Password</label><br><input name="password" type="password" style="width:100%;padding:8px"><br><br>
<button style="padding:10px 20px">Sign in</button></form>
<p style="font-size:13px;background:#eef;padding:8px;border-radius:6px">Demo courier account — email: <b>demo@hexacourier.local</b> · password: <b>demo123</b></p>
<p style="font-size:13px">New here? <a href="/register">Create an account</a> · <a href="/forgot">Forgot password</a></p>
</div></body></html>`;
}
function registerPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Register · ${LAB_NAME}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f8"><div style="max-width:420px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:10px;padding:24px">
<h2>Create your ${LAB_NAME} account</h2>${msg ? `<p style="color:#c00">${msg}</p>` : ''}
<form method="POST" action="/register"><label>Full name</label><br><input name="name" style="width:100%;padding:8px"><br><br>
<label>Email</label><br><input name="email" style="width:100%;padding:8px"><br><br>
<label>Password</label><br><input name="password" type="password" style="width:100%;padding:8px"><br><br>
<label>Phone</label><br><input name="phone" style="width:100%;padding:8px"><br><br>
<button style="padding:10px 20px">Register</button></form>
<p style="font-size:13px">Already registered? <a href="/login">Sign in</a></p></div></body></html>`;
}
function forgotPage(msg) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset password · ${LAB_NAME}</title></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f8"><div style="max-width:420px;margin:60px auto;background:#fff;border:1px solid #dde;border-radius:10px;padding:24px">
<h2>Forgot password</h2>${msg ? `<p>${msg}</p>` : ''}
<form method="POST" action="/forgot"><label>Email</label><br><input name="email" style="width:100%;padding:8px"><br><br>
<button style="padding:10px 20px">Send reset token</button></form>
<hr><h3>Have a token?</h3>
<form method="POST" action="/reset"><label>Email</label><br><input name="email" style="width:100%;padding:8px"><br><br>
<label>Reset token</label><br><input name="token" style="width:100%;padding:8px"><br><br>
<label>New password</label><br><input name="password" type="password" style="width:100%;padding:8px"><br><br>
<button style="padding:10px 20px">Set new password</button></form>
</div></body></html>`;
}
function parcelRow(p) {
  const cust = userById(p.customerId), cour = p.courierId ? userById(p.courierId) : null;
  return `<tr><td><a href="/parcels/${p.id}">${p.tracking}</a></td><td>${cust ? cust.name : '?'}</td><td>${p.recipientName}</td><td>${p.toAddr}</td><td>${zoneById(p.zoneId).name}</td><td>${p.weightKg} kg</td><td>${p.fee}</td><td>${p.codAmount}</td><td>${p.status}</td><td>${cour ? cour.name : '—'}</td><td>${p.status === 'delivered' ? `<a href="/pod/${p.id}">POD</a>` : ''}</td></tr>`;
}
function parcelTable(list) {
  return `<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%">
<tr><th>Tracking</th><th>Customer</th><th>Recipient</th><th>To</th><th>Zone</th><th>Weight</th><th>Fee</th><th>COD</th><th>Status</th><th>Courier</th><th></th></tr>
${list.map(parcelRow).join('')}</table>`;
}
function dashboardPage(user) {
  let mine;
  if (user.role === 'customer') mine = parcels.filter(p => p.customerId === user.id);
  else if (user.role === 'courier') mine = parcels.filter(p => p.courierId === user.id);
  else mine = parcels;
  return page(user, 'Dashboard', `<h2>Welcome, ${user.name}</h2>
<p>Role: <b>${user.role}</b> · Credit balance: <b>${user.credit || 0}</b></p>
<h3>${user.role === 'courier' ? 'Your delivery jobs' : user.role === 'customer' ? 'Your parcels' : 'All parcels'}</h3>
${parcelTable(mine)}
<p><a href="/pickups/new">Book a new pickup</a> · <a href="/track">Track a parcel</a></p>`);
}
function parcelsPage(user) {
  const list = (user.role === 'customer') ? parcels.filter(p => p.customerId === user.id)
    : (user.role === 'courier') ? parcels.filter(p => p.courierId === user.id) : parcels;
  return page(user, 'Parcels', `<h2>Parcels</h2>${parcelTable(list)}`);
}
function parcelDetailPage(user, p) {
  const cust = userById(p.customerId), cour = p.courierId ? userById(p.courierId) : null;
  return page(user, 'Parcel ' + p.tracking, `<h2>Parcel ${p.tracking}</h2>
<table cellpadding="6" style="font-size:14px">
<tr><td><b>Customer</b></td><td>${cust ? cust.name + ' (' + cust.email + ', ' + cust.phone + ')' : '?'}</td></tr>
<tr><td><b>Recipient</b></td><td>${p.recipientName} (${p.recipientPhone})</td></tr>
<tr><td><b>From</b></td><td>${p.fromAddr}</td></tr>
<tr><td><b>To</b></td><td>${p.toAddr}</td></tr>
<tr><td><b>Zone / Weight</b></td><td>${zoneById(p.zoneId).name} · ${p.weightKg} kg</td></tr>
<tr><td><b>Fee</b></td><td>${p.fee} (zone truth: ${feeFor(p.zoneId, p.weightKg)})</td></tr>
<tr><td><b>COD</b></td><td>${p.codAmount} · status: ${p.codStatus}${p.codCollected != null ? ' · collected: ' + p.codCollected : ''}</td></tr>
<tr><td><b>Status</b></td><td>${p.status}</td></tr>
<tr><td><b>Courier</b></td><td>${cour ? cour.name : 'unassigned'}</td></tr>
${p.status === 'delivered' ? `<tr><td><b>Proof of delivery</b></td><td><a href="/pod/${p.id}">View POD (${p.podCode})</a></td></tr>` : ''}
</table>
<h3>Actions</h3>
<form method="POST" action="/parcels/${p.id}/cancel" style="display:inline"><button>Cancel this pickup</button></form>
<form method="POST" action="/jobs/${p.id}/assign" style="display:inline">Assign to courier id <input name="courierId" size="3"> <button>Assign</button></form>
<form method="POST" action="/jobs/${p.id}/deliver" style="display:inline">Receiver name <input name="podReceiver" size="12"> <button>Mark delivered</button></form>
<form method="POST" action="/parcels/${p.id}/cod" style="display:inline">New COD amount <input name="codAmount" size="6"> <button>Update COD</button></form>
<form method="POST" action="/parcels/${p.id}/cod-collect" style="display:inline">COD collected amount <input name="amount" size="6"> <button>Mark COD collected</button></form>`);
}
function pickupFormPage(user) {
  const opts = ZONES.map(z => `<option value="${z.id}">${z.name} — base fee ${z.fee} (+20/kg)</option>`).join('');
  return page(user, 'New Pickup', `<h2>Book a pickup</h2>
<form method="POST" action="/pickups">
<label>Recipient name</label><br><input name="recipientName" style="width:60%;padding:7px"><br><br>
<label>Recipient phone</label><br><input name="recipientPhone" style="width:60%;padding:7px"><br><br>
<label>Pickup address</label><br><input name="fromAddr" style="width:80%;padding:7px" value="${user.address}"><br><br>
<label>Delivery address</label><br><input name="toAddr" style="width:80%;padding:7px"><br><br>
<label>Zone</label><br><select name="zoneId" style="padding:7px">${opts}</select><br><br>
<label>Weight (kg)</label><br><input name="weightKg" value="1" style="padding:7px"><br><br>
<label>Cash on delivery (COD) amount</label><br><input name="codAmount" value="0" style="padding:7px"><br><br>
<button style="padding:10px 20px">Book pickup</button></form>`);
}
function jobsPage(user) {
  const list = user.role === 'courier' ? parcels.filter(p => p.courierId === user.id) : parcels;
  const rows = list.map(p => `<tr><td>${p.tracking}</td><td>${p.recipientName}</td><td>${p.toAddr}</td><td>${p.status}</td><td>${p.codAmount}</td>
<td><form method="POST" action="/jobs/${p.id}/deliver">Receiver <input name="podReceiver" size="10"> <button>Deliver</button></form></td></tr>`).join('');
  return page(user, 'Delivery Jobs', `<h2>Delivery jobs</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%">
<tr><th>Tracking</th><th>Recipient</th><th>To</th><th>Status</th><th>COD</th><th>Action</th></tr>${rows}</table>`);
}
function podPage(user, p) {
  return page(user, 'Proof of Delivery', `<h2>Proof of delivery — ${p.tracking}</h2>
<table cellpadding="6" style="font-size:14px">
<tr><td><b>POD code</b></td><td>${p.podCode}</td></tr>
<tr><td><b>Received by</b></td><td>${p.podReceiver}</td></tr>
<tr><td><b>Recipient</b></td><td>${p.recipientName} (${p.recipientPhone})</td></tr>
<tr><td><b>Delivered to</b></td><td>${p.toAddr}</td></tr>
<tr><td><b>COD collected</b></td><td>${p.codCollected != null ? p.codCollected : '—'}</td></tr>
</table>`);
}
function earningsPage(viewer, courier) {
  const jobs = parcels.filter(p => p.courierId === courier.id && p.status === 'delivered');
  const total = jobs.reduce((s, p) => s + Math.round(p.fee * 0.4), 0);
  const rows = jobs.map(p => `<tr><td>${p.tracking}</td><td>${p.recipientName}</td><td>${p.fee}</td><td>${Math.round(p.fee * 0.4)}</td></tr>`).join('');
  return page(viewer, 'Courier Earnings', `<h2>Earnings — ${courier.name}</h2>
<p>Couriers earn 40% of the delivery fee per completed job.</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px">
<tr><th>Tracking</th><th>Recipient</th><th>Fee</th><th>Earned</th></tr>${rows}</table>
<p><b>Total earnings: ${total}</b></p>`);
}
function manifestPage(user) {
  return page(user, 'Dispatch Manifest', `<h2>Daily dispatch manifest</h2>
<p>All parcels in the network today, with sender and recipient contact details.</p>${parcelTable(parcels)}`);
}
function dispatchPage(user) {
  const unassigned = parcels.filter(p => !p.courierId);
  const rows = parcels.map(p => `<tr><td>${p.tracking}</td><td>${p.status}</td><td>${p.courierId ? (userById(p.courierId) || {}).name : '—'}</td>
<td><form method="POST" action="/jobs/${p.id}/assign">Courier id <input name="courierId" size="3"> <button>Assign</button></form></td></tr>`).join('');
  return page(user, 'Dispatch Console', `<h2>Dispatch console</h2>
<p>${unassigned.length} unassigned parcel(s).</p>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%">
<tr><th>Tracking</th><th>Status</th><th>Courier</th><th>Assign</th></tr>${rows}</table>`);
}
function adminPage(user) {
  const rows = users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.password}</td><td>${u.role}</td><td>${u.phone}</td><td>${u.credit || 0}</td></tr>`).join('');
  return page(user, 'Admin Console', `<h2>Admin console</h2>
<table border="1" cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%">
<tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Phone</th><th>Credit</th></tr>${rows}</table>`);
}
function trackPage(user, q, results) {
  return page(user, 'Track a Parcel', `<h2>Track a parcel</h2>
<form method="GET" action="/track"><input name="q" style="padding:8px;width:60%" value="${q || ''}" placeholder="Tracking code or recipient name"> <button style="padding:8px 16px">Search</button></form>
${q !== null && q !== undefined ? `<h3>Results for: ${q}</h3>${results.length ? parcelTable(results) : '<p>No parcels found.</p>'}` : ''}
`);
}
function profilePage(user, session, msg) {
  return page(user, 'Profile', `<h2>Your profile</h2>${msg ? `<p style="color:#070">${msg}</p>` : ''}
<form method="POST" action="/profile">
<input type="hidden" name="hx_marker" value="${session ? session.marker : ''}">
<label>Display name</label><br><input name="name" style="width:60%;padding:7px" value="${user.name}"><br><br>
<label>Phone</label><br><input name="phone" style="width:60%;padding:7px" value="${user.phone}"><br><br>
<label>Address</label><br><input name="address" style="width:80%;padding:7px" value="${user.address}"><br><br>
<button style="padding:10px 20px">Save changes</button></form>`);
}
function testsPage(user) {
  const groups = featureList().map(f => {
    const items = TESTS.filter(t => t.feature === f);
    const att = progress.attempts[f] || 0;
    const rows = items.map(t => {
      const done = !!progress.tests[t.id];
      return `<div style="border:1px solid #dde;border-radius:8px;padding:10px;margin:8px 0">
<b>${done ? '✓' : '○'} ${t.name}</b> <span style="color:#666">· ${t.owasp} · ${t.difficulty}</span>
<details><summary>Hints</summary><ol><li>${t.hints[0]}</li></ol>
<details><summary>Stronger hint</summary><ol start="2"><li>${t.hints[1]}</li></ol>
<details><summary>Near-answer</summary><ol start="3"><li>${t.hints[2]}</li></ol></details></details></details></div>`;
    }).join('');
    return `<h3>${f} <span style="color:#666;font-size:13px">(${items.filter(t => progress.tests[t.id]).length}/${items.length} done · ${att} attempt(s) on this feature)</span></h3>${rows}`;
  }).join('');
  return page(user, 'Mission Board', `<h2>Mission Board — LAB ${LAB_NUMBER} ${LAB_NAME}</h2>
<p>${doneCount()}/${TESTS.length} tests complete (${pct()}%). Tests complete by DOING the exploit — the server detects the real effect.</p>${groups}`);
}
function completePage(user) {
  const feats = featureList();
  if (doneCount() < TESTS.length) {
    const left = TESTS.filter(t => !progress.tests[t.id]).map(t => `<li>${t.name} <span style="color:#666">(${t.feature})</span></li>`).join('');
    return page(user, 'Completion', `<h2>Not complete yet</h2>
<p>${doneCount()}/${TESTS.length} tests done (${pct()}%). Remaining:</p><ul>${left}</ul>`);
  }
  const perFeature = feats.map(f => {
    const items = TESTS.filter(t => t.feature === f);
    return `<tr><td>${f}</td><td>${items.length}</td></tr>`;
  }).join('');
  const techniques = TESTS.map((t, i) => `<li>${i + 1}. ${t.name}</li>`).join('');
  const lessons = TESTS.map(t => `<li><b>${t.name}:</b> ${t.lesson}</li>`).join('');
  const impacts = TESTS.map(t => `<li><b>${t.name}:</b> ${t.impact}</li>`).join('');
  const reports = TESTS.map(t => `<li><b>${t.report.title}</b> — Severity: ${t.report.severity}. Remediation: ${t.report.remediation}</li>`).join('');
  return page(user, 'Lab Complete', `<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}: 100% complete</h2>
<h3>1) Total features in this lab</h3><p>${feats.length} features: ${feats.join(', ')}</p>
<h3>2) Vulnerabilities per feature</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>Feature</th><th>Tests</th></tr>${perFeature}</table>
<h3>3) How testing was done (${TESTS.length} ways)</h3><ol>${techniques}</ol>
<h3>4) What you learned</h3><ul>${lessons}</ul>
<h3>5) What this means for a real client</h3><ul>${impacts}</ul>
<h3>6) Writing it in a real report</h3><ul>${reports}</ul>
<h3>Your completion key</h3>
<p style="font-size:18px;background:#eef;padding:12px;border-radius:8px"><b>${completionKey()}</b></p>
<p>Paste this key into Lab ${LAB_NUMBER + 1} to unlock it.</p>
<form method="POST" action="/tester-name">Your name for the certificate: <input name="name" value="${progress.testerName || ''}"> <button>Save name</button></form>
<p><a href="/certificate">View your certificate</a></p>`);
}
function certificatePage(user) {
  const name = progress.testerName || (user ? user.name : 'Security Tester');
  const date = progress.completedAt ? new Date(progress.completedAt).toDateString() : new Date().toDateString();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate · LAB ${LAB_NUMBER}</title>
<style>@media print{body{background:#fff}}</style></head>
<body style="font-family:Georgia,serif;background:#e8e8f0;margin:0">
<div style="max-width:720px;margin:40px auto;background:#fff;border:3px solid #23233a;border-radius:14px;padding:36px;text-align:center">
<img src="/logo.png" style="height:64px">
<h1 style="margin:10px 0">Certificate of Completion</h1>
<p>This certifies that</p><h2 style="margin:6px 0">${name}</h2>
<p>has completed 100% of the security tests in</p>
<h3>LAB ${LAB_NUMBER} — ${LAB_NAME} (${TESTS.length} tests across ${featureList().length} features)</h3>
<p>Completed on ${date}</p>
<p style="margin-top:24px;color:#444">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
</div></body></html>`;
}

/* ---- south hub config (region 4) ---- */
const _CA = ["TC1YSA==", "MS04Nw=="];
function _unshard(s) { return Buffer.from(s, 'base64').toString('utf8').split('').reverse().join(''); }
const ENTRY_KEY_SHA256 = '728f248b16b78db238cf5e308ac714a4eaf3051bdc9067d676d5395d3bc3d908';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */
function completionKey() { return _CA.concat(_CB, _CC).map(_unshard).join(''); }

/* ================= Lab Coach (chatbot) ================= */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'brute', 'reset token', 'enumerat', 'password']],
  ['Registration & Profile', ['regist', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Pickup Requests & Pricing', ['pickup', 'price', 'pricing', 'zone', 'fee', 'weight']],
  ['Delivery Jobs & Assignment', ['job', 'assign', 'deliver', 'delivery', 'proof', 'pod']],
  ['COD & Payments', ['cod', 'cash on delivery', 'cash']],
  ['Courier Earnings & Manifest', ['earning', 'manifest', 'payout']],
  ['Search & Tracking', ['search', 'track']],
  ['Admin Panel', ['admin']],
  ['Platform & API', ['api', 'debug', 'platform']],
];
function matchFeature(msg) {
  for (const [f, keys] of FEATURE_KEYS) if (keys.some(k => msg.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '').toLowerCase();
  const done = doneCount(), total = TESTS.length;
  if (msg.includes('who built') || msg.includes('who made') || msg.includes('who created') || msg.includes('founder') || msg.includes('who is jony') || msg.includes('who is md')) {
    return ATTRIBUTION;
  }
  if (msg.includes('key')) {
    if (progress.keyRevealed && done >= total) {
      return 'Congratulations — LAB ' + LAB_NUMBER + ' is 100% complete, so I can share it now. The completion key is: ' + completionKey();
    }
    return "I don't have the completion key yet — I only receive it when this lab is completed 100%. Right now you are at " + done + '/' + total + ' tests (' + pct() + '%). Finish all the tests and ask me again.';
  }
  const feat = matchFeature(msg);
  if (/how many|count|list|which (features|tests)|what tests/.test(msg)) {
    if (feat) {
      const items = TESTS.filter(t => t.feature === feat);
      return feat + ' has ' + items.length + ' tests: ' + items.map(t => t.name).join('; ') + '. (' + items.filter(t => progress.tests[t.id]).length + ' done)';
    }
    return 'LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' has ' + total + ' tests across ' + featureList().length + ' features: ' +
      featureList().map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') + '. You have completed ' + done + '/' + total + '.';
  }
  if (/progress|score|my status|how am i/.test(msg)) {
    const next = TESTS.find(t => !progress.tests[t.id]);
    return 'You have completed ' + done + ' of ' + total + ' tests (' + pct() + '%).' + (next ? ' Next open test: "' + next.name + '" in ' + next.feature + '.' : ' The lab is complete — see /complete for your key and certificate.');
  }
  if (/how|solve|guide|step|exploit|bypass|help me/.test(msg)) {
    if (!feat) return 'Tell me which feature you are working on (for example "how do I solve the Pickup Requests & Pricing tests?"). Remember the rule: I can only guide you step by step on a feature after you have genuinely tried it at least 3 times.';
    const att = progress.attempts[feat] || 0;
    const open = TESTS.filter(t => t.feature === feat && !progress.tests[t.id]);
    if (att >= 3 || open.length === 0) {
      const list = (open.length ? open : TESTS.filter(t => t.feature === feat));
      return 'Step by step for ' + feat + ':\n' + list.map((t, i) => (i + 1) + '. ' + t.name + ' — ' + t.hints[2]).join('\n');
    }
    return 'That feature is locked for help. First try the ' + feat + ' tests yourself at least 3 times — I can see you\'ve tried ' + att + ' time(s) so far. After 3 real tries, ask me again and I\'ll guide you step by step.';
  }
  if (feat) {
    const items = TESTS.filter(t => t.feature === feat);
    return feat + ' has ' + items.length + ' tests: ' + items.map(t => t.name).join('; ') + '. Attempts so far on this feature: ' + (progress.attempts[feat] || 0) + '. Ask me "how do I solve the ' + feat + ' tests?" once you have tried at least 3 times.';
  }
  if (/^(hi|hello|hey|salut)/.test(msg)) {
    return 'Hello! I am the Lab Coach for LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + total + ' tests across ' + featureList().length + ' features. You have completed ' + done + '/' + total + '. Ask me how many tests a feature has, ask for your progress, or — after 3 real tries on a feature — ask me how to solve it.';
  }
  return 'I can help with LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ': ask how many tests a feature has (the map is public), ask for your progress, or ask how to solve a feature\'s tests — that unlocks after you have tried that feature at least 3 times. The full mission board is on the /tests page.';
}

/* ---- west depot config (region 5) ---- */
const _CB = ["UkJSSw==", "LVVINA=="];

/* ================= router ================= */
async function handle(req, res) {
  const u = new URL(req.url, 'http://127.0.0.1:' + PORT);
  const p = u.pathname;
  const method = req.method;
  const { cookies, session, user } = getSession(req);

  if (p === '/logo.png') {
    try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
    catch (e) { return send(res, 404, 'no logo'); }
  }
  if (p === '/api/progress' && method === 'GET') {
    const features = {};
    for (const f of featureList()) {
      const items = TESTS.filter(t => t.feature === f);
      features[f] = { total: items.length, done: items.filter(t => progress.tests[t.id]).length, attempts: progress.attempts[f] || 0 };
    }
    return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: doneCount() >= TESTS.length }, null, 1), 'application/json');
  }
  if (p === '/api/chat' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    return send(res, 200, JSON.stringify({ reply: chatReply(body.message) }), 'application/json');
  }
  if (p === '/unlock' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    if (entryKeyMatches(String(body.key || ''))) {
      progress.unlocked = true; saveProgress();
      return redirect(res, '/');
    }
    return send(res, 403, gatePage('That key was not accepted.'));
  }

  /* ---- lock gate ---- */
  if (!progress.unlocked) return send(res, 200, gatePage(''));

  /* ---- platform debug (no login, by design of the flaw) ---- */
  if (p === '/api/debug' && method === 'GET') {
    pass('api-debug');
    return send(res, 200, JSON.stringify({ users, parcels }, null, 1), 'application/json');
  }

  /* ---- auth pages ---- */
  if (p === '/login' && method === 'GET') return send(res, 200, loginPage(''));
  if (p === '/register' && method === 'GET') return send(res, 200, registerPage(''));
  if (p === '/forgot' && method === 'GET') return send(res, 200, forgotPage(''));
  if (p === '/logout') { if (session) sessions.delete(cookies.hx_session); return redirect(res, '/login'); }

  if (p === '/login' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Login & Authentication');
    const email = String(body.email || '').toLowerCase(), pw = String(body.password || '');
    const startSession = (usr) => {
      const sid = newSid();
      sessions.set(sid, { userId: usr.id, marker: newSid() });
      res.setHeader('Set-Cookie', ['hx_session=' + sid + '; Path=/', 'hx_role=' + usr.role + '; Path=/', 'hx_origin=ok; Path=/']);
    };
    if (sqliPat(email) || sqliPat(pw)) { pass('auth-sqli'); startSession(users[0]); return redirect(res, '/'); }
    const usr = userByEmail(email);
    if (!usr) {
      enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      return send(res, 200, loginPage('No account found for that email.'));
    }
    if (usr.password !== pw) {
      loginFails[email] = (loginFails[email] || 0) + 1;
      if (loginFails[email] >= 10) pass('auth-brute');
      enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
      return send(res, 200, loginPage('Incorrect password for this account.'));
    }
    if (usr.email === 'demo@hexacourier.local') pass('auth-default');
    startSession(usr);
    return redirect(res, '/');
  }
  if (p === '/register' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Registration & Profile');
    const email = String(body.email || '').toLowerCase();
    if (!email || userByEmail(email)) return send(res, 200, registerPage('That email is already registered (or empty).'));
    const nu = {
      id: nextUserId++, name: String(body.name || 'New User'), email,
      password: String(body.password || ''), role: body.role ? String(body.role) : 'customer',
      phone: String(body.phone || ''), address: String(body.address || ''), credit: Number(body.credit || 0),
    };
    users.push(nu);
    if (nu.password.length < 8) pass('reg-weak');
    if (nu.role !== 'customer' || nu.credit > 0) pass('reg-mass');
    if (xssPat(nu.name)) pass('reg-xss');
    const sid = newSid();
    sessions.set(sid, { userId: nu.id, marker: newSid() });
    res.setHeader('Set-Cookie', ['hx_session=' + sid + '; Path=/', 'hx_role=' + nu.role + '; Path=/', 'hx_origin=ok; Path=/']);
    return redirect(res, '/');
  }
  if (p === '/forgot' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Login & Authentication');
    const email = String(body.email || '').toLowerCase();
    enumProbes.add(email); if (enumProbes.size >= 5) pass('auth-enum');
    const usr = userByEmail(email);
    if (usr) { issuedResetTokens.add(usr.id); return send(res, 200, forgotPage('Reset instructions sent to your email.')); }
    return send(res, 200, forgotPage('No account with that email exists.'));
  }
  if (p === '/reset' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Login & Authentication');
    const usr = userByEmail(String(body.email || '').toLowerCase());
    if (usr && String(body.token || '') === tokenFor(usr)) {
      if (!issuedResetTokens.has(usr.id)) pass('auth-reset');
      usr.password = String(body.password || 'changed123');
      issuedResetTokens.delete(usr.id);
      return send(res, 200, loginPage('Password changed — please sign in.'));
    }
    return send(res, 200, forgotPage('Invalid reset token.'));
  }

  /* ---- completion pages: no login needed (the completion key and certificate must stay reachable even if the session is gone) ---- */
  if (p === '/complete' && method === 'GET') return send(res, 200, completePage(user));
  if (p === '/certificate' && method === 'GET') {
    if (doneCount() < TESTS.length) return redirect(res, '/complete');
    return send(res, 200, certificatePage(user));
  }
  if (p === '/tester-name' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    progress.testerName = String(body.name || '').slice(0, 60);
    saveProgress();
    return redirect(res, '/complete');
  }

  /* ---- everything below needs a signed-in user ---- */
  if (!user) return redirect(res, '/login');

  if (p === '/' && method === 'GET') return send(res, 200, dashboardPage(user));
  if (p === '/parcels' && method === 'GET') return send(res, 200, parcelsPage(user));
  if (p === '/pickups/new' && method === 'GET') return send(res, 200, pickupFormPage(user));
  if (p === '/pickups' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Pickup Requests & Pricing');
    const zoneId = ZONES.some(z => z.id === body.zoneId) ? body.zoneId : 'Z1';
    const weight = Number(body.weightKg);
    const priceGiven = body.price !== undefined && body.price !== '';
    const fee = priceGiven ? Number(body.price) : feeFor(zoneId, weight);
    const cod = Number(body.codAmount || 0);
    const np = {
      id: nextParcelId++, tracking: 'HX77-' + (5000 + nextParcelId), customerId: user.id, courierId: null,
      recipientName: String(body.recipientName || ''), recipientPhone: String(body.recipientPhone || ''),
      fromAddr: String(body.fromAddr || user.address), toAddr: String(body.toAddr || ''),
      zoneId, weightKg: weight, fee, codAmount: cod, codOriginal: cod, codCollected: null,
      codStatus: cod > 0 ? 'pending' : 'none', status: 'requested', podReceiver: '', podCode: '',
    };
    parcels.push(np);
    if (Number.isFinite(weight) && weight < 0) pass('pickup-weight');
    if (fee !== feeFor(zoneId, weight)) pass('pickup-fee');
    return redirect(res, '/parcels/' + np.id);
  }
  const mParcel = p.match(/^\/parcels\/(\d+)$/);
  if (mParcel && method === 'GET') {
    const par = parcelById(mParcel[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('Pickup Requests & Pricing');
    if (user.role === 'customer' && par.customerId !== user.id) pass('pickup-idor');
    return send(res, 200, parcelDetailPage(user, par));
  }
  const mCancel = p.match(/^\/parcels\/(\d+)\/cancel$/);
  if (mCancel && method === 'POST') {
    await readBody(req);
    const par = parcelById(mCancel[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('Pickup Requests & Pricing');
    if (user.role === 'customer' && par.customerId !== user.id) pass('pickup-cancel');
    par.status = 'cancelled';
    return redirect(res, '/parcels');
  }
  const mCod = p.match(/^\/parcels\/(\d+)\/cod$/);
  if (mCod && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    const par = parcelById(mCod[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('COD & Payments');
    par.codAmount = Number(body.codAmount || 0);
    if (par.codAmount !== par.codOriginal) pass('cod-forge');
    return redirect(res, '/parcels/' + par.id);
  }
  const mCodCollect = p.match(/^\/parcels\/(\d+)\/cod-collect$/);
  if (mCodCollect && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    const par = parcelById(mCodCollect[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('COD & Payments');
    const amt = Number(body.amount || 0);
    par.codCollected = amt; par.codStatus = 'collected';
    if (amt < par.codAmount) pass('cod-settle');
    return redirect(res, '/parcels/' + par.id);
  }
  if (p === '/jobs' && method === 'GET') return send(res, 200, jobsPage(user));
  const mAssign = p.match(/^\/jobs\/(\d+)\/assign$/);
  if (mAssign && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    const par = parcelById(mAssign[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('Delivery Jobs & Assignment');
    par.courierId = Number(body.courierId) || par.courierId;
    if (par.status === 'requested') par.status = 'assigned';
    if (user.role === 'customer') pass('job-selfassign');
    return redirect(res, '/jobs');
  }
  const mDeliver = p.match(/^\/jobs\/(\d+)\/deliver$/);
  if (mDeliver && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    const par = parcelById(mDeliver[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('Delivery Jobs & Assignment');
    if (user.role === 'customer') pass('job-deliver-customer');
    else if (user.role === 'courier' && par.courierId !== user.id) pass('job-wrong-courier');
    par.status = 'delivered';
    par.podReceiver = String(body.podReceiver || 'Receiver');
    par.podCode = 'POD-' + (1000 + par.id);
    if (par.codAmount > 0) { par.codCollected = par.codAmount; par.codStatus = 'collected'; }
    return redirect(res, '/jobs');
  }
  const mPod = p.match(/^\/pod\/(\d+)$/);
  if (mPod && method === 'GET') {
    const par = parcelById(mPod[1]);
    if (!par) return send(res, 404, 'Parcel not found');
    attempt('Delivery Jobs & Assignment');
    if (par.status !== 'delivered') return send(res, 200, page(user, 'POD', '<h2>No proof of delivery yet for this parcel.</h2>'));
    if ((user.role === 'customer' && par.customerId !== user.id) || (user.role === 'courier' && par.courierId !== user.id)) pass('job-pod-idor');
    return send(res, 200, podPage(user, par));
  }
  const mEarn = p.match(/^\/couriers\/(\d+)\/earnings$/);
  if (mEarn && method === 'GET') {
    const cour = userById(mEarn[1]);
    if (!cour || cour.role !== 'courier') return send(res, 404, 'Courier not found');
    attempt('Courier Earnings & Manifest');
    if (user.id !== cour.id && user.role !== 'admin' && user.role !== 'dispatcher') pass('earn-idor');
    return send(res, 200, earningsPage(user, cour));
  }
  if (p === '/manifest' && method === 'GET') {
    attempt('Courier Earnings & Manifest');
    if (user.role === 'customer') pass('manifest-leak');
    return send(res, 200, manifestPage(user));
  }
  if (p === '/dispatch' && method === 'GET') {
    const realOk = ['dispatcher', 'admin'].includes(user.role);
    const cookieOk = ['dispatcher', 'admin'].includes(String(cookies.hx_role || ''));
    if (!realOk && !cookieOk) return send(res, 403, page(user, 'Forbidden', '<h2>Dispatchers only.</h2>'));
    if (!realOk && cookieOk) pass('auth-cookie');
    return send(res, 200, dispatchPage(user));
  }
  if (p === '/admin' && method === 'GET') {
    attempt('Admin Panel');
    if (user.role !== 'admin') pass('admin-bac');
    return send(res, 200, adminPage(user));
  }
  if (p === '/track' && method === 'GET') {
    const q = u.searchParams.get('q');
    if (q === null) return send(res, 200, trackPage(user, null, null));
    attempt('Search & Tracking');
    let results;
    if (sqliPat(q)) { pass('search-sqli'); results = parcels; }
    else {
      const ql = q.toLowerCase();
      results = parcels.filter(x => x.tracking.toLowerCase().includes(ql) || x.recipientName.toLowerCase().includes(ql));
    }
    if (xssPat(q)) pass('search-xss');
    return send(res, 200, trackPage(user, q, results));
  }
  if (p === '/profile' && method === 'GET') return send(res, 200, profilePage(user, session, ''));
  if (p === '/profile' && method === 'POST') {
    const body = parseBody(req, await readBody(req));
    attempt('Registration & Profile');
    if (body.name) user.name = String(body.name);
    if (body.phone) user.phone = String(body.phone);
    if (body.address) user.address = String(body.address);
    if (xssPat(user.name)) pass('reg-xss');
    const markerOk = !!(body.hx_marker && session && body.hx_marker === session.marker);
    const origin = String(req.headers.origin || req.headers.referer || '');
    const originOk = origin.includes('127.0.0.1:' + PORT);
    if (!markerOk && !originOk) pass('reg-csrf');
    return send(res, 200, profilePage(user, session, 'Profile saved.'));
  }
  if (p === '/tests' && method === 'GET') return send(res, 200, testsPage(user));

  return send(res, 404, 'Not found');
}

/* ---- airport depot config (region 6) ---- */
const _CC = ["VVJHUw==", "UlJSMw=="];

/* ================= docs generation (from the registry) ================= */
if (process.argv.includes('--gen-docs')) {
  const byFeature = {};
  for (const t of TESTS) { (byFeature[t.feature] = byFeature[t.feature] || []).push(t); }
  let vuln = '# HexaCourier — Vulnerability Map (LAB 77)\n\n' +
    'Total: ' + TESTS.length + ' scored tests across ' + featureList().length + ' features. Every entry is a live, working flaw in this local training app. Tests flip to done only when the server detects the real exploit effect (see /tests in the app).\n';
  for (const f of featureList()) {
    vuln += '\n## ' + f + '\n';
    for (const t of byFeature[f]) {
      vuln += '\n### ' + t.name + '\n- **OWASP:** ' + t.owasp + '\n- **Difficulty:** ' + t.difficulty + '\n- **Where:** the ' + f + ' flow of HexaCourier.\n- **Exploitation outline:** ' + t.hints[2] + '\n- **Impact:** ' + t.impact + '\n- **Report severity:** ' + t.report.severity + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'VULNERABILITIES.md'), vuln);
  const rank = { Beginner: 0, Intermediate: 1, Advanced: 2 };
  let guide = '# HexaCourier — Practice Guide (LAB 77)\n\nChallenges grouped by feature, then difficulty. Each challenge is scored on the /tests Mission Board: it completes only when the exploit actually works.\n';
  for (const f of featureList()) {
    guide += '\n## ' + f + '\n';
    for (const t of byFeature[f].slice().sort((a, b) => rank[a.difficulty] - rank[b.difficulty])) {
      guide += '\n### [' + t.difficulty + '] ' + t.name + '\n- **Objective:** make the "' + t.name + '" test flip to done on /tests by performing the real exploit.\n- **Hints:**\n  1. ' + t.hints[0] + '\n  2. ' + t.hints[1] + '\n  3. ' + t.hints[2] + '\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'PRACTICE-GUIDE.md'), guide);
  let fix = '# HexaCourier — Fix & Retest Guide (LAB 77)\n\nFor every scored test: the secure implementation, and the regression test that proves the fix.\n';
  for (const f of featureList()) {
    fix += '\n## ' + f + '\n';
    for (const t of byFeature[f]) {
      fix += '\n### ' + t.report.title + ' (' + t.report.severity + ')\n- **Fix:** ' + t.report.remediation + '\n- **Retest:** repeat the original exploit — ' + t.hints[2] + ' After the fix, the attempt must fail (access denied, server-computed value used, or generic error) and the test must no longer flip in a fresh fixed build. Also re-run the legitimate flow to confirm it still works for real users.\n';
    }
  }
  fs.writeFileSync(path.join(DIR, 'FIX-AND-RETEST.md'), fix);
  console.log('docs generated:', TESTS.length, 'tests,', featureList().length, 'features');
  process.exit(0);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(() => { try { send(res, 500, 'Server error'); } catch (e) {} });
});
server.listen(PORT, '127.0.0.1', () => {
  console.log('LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + ' listening on http://127.0.0.1:' + PORT);
});
