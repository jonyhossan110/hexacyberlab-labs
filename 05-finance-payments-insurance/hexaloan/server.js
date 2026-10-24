'use strict';
/* ============================================================================
   HexaLoan — LAB 46 of 110 (Category 5: Finance, Payments & Insurance)
   A deliberately vulnerable loan-platform training lab for HexaCyberLab.
   Zero-dependency Node.js. LOCAL USE ONLY — bind 127.0.0.1, fake data only.
   ==========================================================================*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LAB_NUMBER = 46;
const LAB_NAME = 'HexaLoan';
const PORT = 3055;
const HOST = '127.0.0.1';
const DIR = __dirname;
const PROGRESS_FILE = path.join(DIR, 'progress.json');
const MAX_LOAN = 50000; // platform cap shown on the application form

/* --- key material: stored ONLY as base64-of-reversed shards, scattered --- */
const ENTRY_SHARDS = ["TC1YSA==","Wi02NA==","RlpWTg==","LVBWTA==","Q1FTWg==","SElZTA=="];
function assembleKey(shards) {
  return shards.map(s => [...Buffer.from(s, 'base64').toString('utf8')].reverse().join('')).join('');
}
function entryKey() { return assembleKey(ENTRY_SHARDS); }

/* ============================ TESTS registry ============================ */
const TESTS = [
  /* ---- Login & Authentication ---- */
  { id: 'auth-sqli', feature: 'Login & Authentication', name: 'SQL Injection Login Bypass', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['The login form builds its query by gluing your input straight into a string.', "Try a classic tautology in the email field, e.g. something with ' OR '1'='1.", "Use email: ' OR '1'='1' -- with any password — the query matches the first user (the admin)."],
    lesson: 'String-built queries let an attacker rewrite the login logic itself; parameterised queries make input data, never code.',
    impact: 'On a real lending site this is instant account takeover — an attacker logs in as an administrator without any password and reaches every borrower record.',
    report: { title: 'SQL Injection in Login Form Allows Authentication Bypass', severity: 'Critical', remediation: 'Use parameterised queries / prepared statements everywhere; never concatenate user input into SQL.' } },
  { id: 'auth-brute', feature: 'Login & Authentication', name: 'Brute Force — No Rate Limit or Lockout', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Keep guessing passwords for one account — does anything ever slow you down?', 'Count the failures: 5, 10, 20… the form never locks or delays.', 'Submit 10+ wrong passwords for alice@test.local in a row; every attempt is still processed.'],
    lesson: 'Without throttling, lockout or CAPTCHA, password guessing is free and unlimited — weak passwords fall quickly.',
    impact: 'Attackers can grind through password lists against borrower and staff accounts at full speed until one works.',
    report: { title: 'Missing Brute-Force Protection on Login', severity: 'High', remediation: 'Add progressive delays, account lockout and CAPTCHA after repeated failures; alert on credential-stuffing patterns.' } },
  { id: 'auth-enum', feature: 'Login & Authentication', name: 'User Enumeration via Login & Reset Responses', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Compare the error for an email that exists with one that does not.', '“No account found” vs “Incorrect password” tells you exactly which emails are registered.', 'Try a wrong password for alice@test.local, then any password for nobody@test.local — the messages differ.'],
    lesson: 'Different error messages for “no such user” and “wrong password” hand attackers a verified list of accounts to target.',
    impact: 'Attackers can confirm which borrowers and staff have accounts, then focus phishing and password attacks only on real targets.',
    report: { title: 'Account Enumeration via Differential Authentication Responses', severity: 'Medium', remediation: 'Return one generic “invalid credentials” message for all failed logins and reset requests.' } },
  { id: 'auth-default', feature: 'Login & Authentication', name: 'Weak / Default Demo Credentials', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Every platform ships with a demo account. What password would a demo use?', 'Think product demos: demo@… and the most predictable password in the world.', 'Log in with demo@hexaloan.local / password — a seeded demo account with a dictionary password.'],
    lesson: 'Default and demo accounts with guessable passwords are a standing backdoor in production systems.',
    impact: 'Anyone on the internet can walk into a live borrower account using credentials printed in countless breach lists.',
    report: { title: 'Default Demo Account with Weak Password Enabled in Production', severity: 'High', remediation: 'Remove demo/default accounts before launch; enforce strong unique passwords for every seeded account.' } },
  { id: 'auth-reset', feature: 'Login & Authentication', name: 'Predictable Password-Reset Token', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Intermediate',
    hints: ['Request a reset and look at the pattern of the token the “email” would contain.', 'The token is built from something public about the account — its numeric id.', 'Token = RST-<userId>-<userId*73+11>. Alice is user 4, so her token is RST-4-303. Compute it and reset her password.'],
    lesson: 'Reset tokens must be long, random and single-use; a formula based on a user id is guessable by anyone.',
    impact: 'An attacker can reset any borrower’s or officer’s password knowing only their account id — full takeover without touching their inbox.',
    report: { title: 'Predictable Password Reset Token Enables Account Takeover', severity: 'Critical', remediation: 'Generate reset tokens with a CSPRNG (≥128 bits), store hashed, expire within 30–60 minutes, single use.' } },
  { id: 'auth-cookie', feature: 'Login & Authentication', name: 'Session Role Cookie Tampering', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['After login, inspect the cookies the app sets. One of them describes WHO you are.', 'The server trusts a client-side cookie for your role instead of checking its own records.', 'Set the hx_role cookie to admin and visit /admin — the gate believes your browser, not the database.'],
    lesson: 'Authorisation data must live server-side; any role stored in a client cookie can simply be edited.',
    impact: 'Any borrower can promote themselves to platform admin by editing one cookie — full control of rates, users and approvals.',
    report: { title: 'Privilege Escalation via Client-Controlled Role Cookie', severity: 'Critical', remediation: 'Derive roles from the server-side session record on every request; never trust client-supplied role values.' } },

  /* ---- Registration & Profile ---- */
  { id: 'reg-weak', feature: 'Registration & Profile', name: 'Weak Password Policy at Registration', owasp: 'A07:2021 Identification & Authentication Failures', difficulty: 'Beginner',
    hints: ['Register a new account and see how short a password you can get away with.', 'There is no length or complexity check at all.', 'Register with the one-character password “x” — the account is created happily.'],
    lesson: 'Password policy is set at registration; accepting 1-character passwords guarantees weak accounts exist.',
    impact: 'Borrowers who choose tiny passwords are compromised in seconds by guessing — and their loan data goes with them.',
    report: { title: 'No Minimum Password Strength Enforced at Registration', severity: 'Medium', remediation: 'Require ≥10–12 characters, screen against breached-password lists, and encourage passphrases.' } },
  { id: 'reg-mass', feature: 'Registration & Profile', name: 'Mass Assignment — Credit Score & Role via Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The profile form shows name and phone. The handler is less picky than the form.', 'Profile update applies every field you POST, including ones never rendered.', 'POST /profile with creditScore=850 (or role=officer) added — your verified financial profile changes instantly.'],
    lesson: 'Binding request bodies directly to records lets clients write fields the UI never offered — including trust fields like credit score.',
    impact: 'A borrower can inflate their own verified credit score or grant themselves a staff role, poisoning every downstream lending decision.',
    report: { title: 'Mass Assignment Allows Modification of Credit Score and Role', severity: 'High', remediation: 'Whitelist updatable fields per endpoint; never bind raw request bodies to data models.' } },
  { id: 'reg-xss', feature: 'Registration & Profile', name: 'Stored XSS in Display Name', owasp: 'A03:2021 Injection', difficulty: 'Beginner',
    hints: ['Your display name is shown to staff in the approval queue. Is it escaped there?', 'Put an HTML/JS payload where your name goes and see how it renders for others.', 'Set your display name to <script>alert(1)</script> (or an <img onerror> payload) — it is stored and rendered raw in the staff dashboard.'],
    lesson: 'Any user-controlled string rendered without encoding becomes stored XSS for everyone who views it — here, the loan officers.',
    impact: 'A borrower can run JavaScript in a loan officer’s browser, hijacking the staff session and approving loans from the inside.',
    report: { title: 'Stored Cross-Site Scripting via Display Name', severity: 'High', remediation: 'Context-encode all user output; add a Content-Security-Policy as defence in depth.' } },
  { id: 'reg-csrf', feature: 'Registration & Profile', name: 'CSRF on Profile Update', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['Profile changes need only your session cookie — no anti-CSRF token anywhere.', 'The app sets an hx_origin marker cookie on its own pages; a cross-site POST will not have it.', 'From a “foreign” origin (or with no marker cookie), POST a name change to /profile — it is applied silently.'],
    lesson: 'State-changing forms without CSRF tokens can be driven by any website the victim visits while logged in.',
    impact: 'A malicious page a borrower visits can rewrite their profile (and contact details) without them ever seeing the loan site.',
    report: { title: 'Cross-Site Request Forgery on Profile Update', severity: 'Medium', remediation: 'Require per-session CSRF tokens on all state-changing requests and verify Origin/Referer.' } },

  /* ---- Loan Applications ---- */
  { id: 'app-idor', feature: 'Loan Applications', name: 'Application IDOR — Other Borrowers’ Financial Data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Your application lives at /loans/<id>. What stops you changing the number?', 'Ownership is never checked when an application is served.', 'Log in as Bob and open /loans/1 — Alice’s application, income and credit score are all displayed.'],
    lesson: 'Every object read must verify the requester owns it (or has a staff need); sequential ids make unchecked reads trivially enumerable.',
    impact: 'Every borrower’s income, credit score and borrowing history can be scraped by any other customer — a serious privacy and regulatory breach.',
    report: { title: 'Insecure Direct Object Reference Exposes Loan Applications', severity: 'High', remediation: 'Enforce per-object ownership/authorisation checks on every read; use unguessable ids as defence in depth.' } },
  { id: 'app-elig', feature: 'Loan Applications', name: 'Eligibility Tampering — Declared Income & Credit Score Trusted', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The application form pre-fills YOUR income and credit score — and lets you edit them.', 'Eligibility is decided from the numbers in the request, not from your verified profile.', 'As Bob (real score 610, income 42000) apply with creditScore=760 and income=95000 — the platform declares you eligible.'],
    lesson: 'Decisions that move money must be computed from server-side verified data, never from client-declared figures.',
    impact: 'Uncreditworthy borrowers can make themselves “eligible” by typing better numbers — the lender books bad loans it believes are safe.',
    report: { title: 'Loan Eligibility Determined from Client-Supplied Income and Credit Score', severity: 'Critical', remediation: 'Compute eligibility exclusively from verified server-side profile/credit-bureau data; treat form values as claims to verify.' } },
  { id: 'app-amount', feature: 'Loan Applications', name: 'Loan Amount Above Platform Cap Accepted', owasp: 'A04:2021 Insecure Design', difficulty: 'Beginner',
    hints: ['The form says the platform cap is $50,000. Is that enforced anywhere but the label?', 'Client-side limits are decorations. POST a bigger number.', 'Create an application with amount=250000 — it is accepted and stored despite the $50,000 cap.'],
    lesson: 'Limits that exist only in the UI do not exist; every business rule must be re-checked on the server.',
    impact: 'Oversized applications enter the pipeline and, combined with any approval weakness, become oversized real loans.',
    report: { title: 'Server Fails to Enforce Maximum Loan Amount', severity: 'Medium', remediation: 'Validate amount ranges server-side on create and edit; reject values outside policy.' } },
  { id: 'app-status', feature: 'Loan Applications', name: 'Application Status Forgery — Self-Disbursement', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['A convenience endpoint lets owners “update status”. It trusts whatever status you send.', 'Draft → submitted is the intended step. The endpoint does not restrict the target state.', 'POST /loans/<your draft id>/status with status=disbursed — your unreviewed loan jumps straight to paid-out.'],
    lesson: 'Workflow state machines must be enforced server-side with allowed transitions per role; a free-form status field is a forgery kit.',
    impact: 'A borrower can mark their own application disbursed without verification or approval — the money pipeline believes money moved.',
    report: { title: 'Borrower Can Forge Loan Status, Including Disbursed', severity: 'Critical', remediation: 'Implement a server-side state machine; only staff actions may advance a loan past submission.' } },

  /* ---- Approval Workflow ---- */
  { id: 'appr-self', feature: 'Approval Workflow', name: 'Self-Approval of Own Loan Application', owasp: 'A01:2021 Broken Access Control', difficulty: 'Advanced',
    hints: ['Approval is a staff action — but what does the approval endpoint actually check?', 'Combine what you know: how does the app decide you are “staff”?', 'As a borrower, set hx_role=officer, get your loan verified, then POST /staff/loans/<your id>/approve — you approved your own loan.'],
    lesson: 'Segregation of duties must be enforced on the server: the applicant and the approver can never be the same identity.',
    impact: 'A borrower approving their own application defeats the entire credit process — loans issue with zero independent review.',
    report: { title: 'Missing Segregation of Duties Allows Self-Approval of Loans', severity: 'Critical', remediation: 'Server-side role checks plus an explicit rule that approver ≠ applicant on every approval action.' } },
  { id: 'appr-skip', feature: 'Approval Workflow', name: 'Verification Step Skipped Before Approval', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The workflow is submit → verify → approve. Does approve actually require the verify step?', 'Try approving a loan that is still only “submitted”.', 'As the officer, POST /staff/loans/3/approve while loan 3 was never verified — approval succeeds anyway.'],
    lesson: 'Multi-step workflows must check the current state at every step; a later step that ignores earlier ones makes the earlier ones theatre.',
    impact: 'Income/identity verification can be bypassed entirely, so loans are approved on unverified declarations.',
    report: { title: 'Approval Endpoint Does Not Require Prior Verification Step', severity: 'High', remediation: 'Enforce workflow state transitions server-side; approve only from the verified state.' } },
  { id: 'appr-double', feature: 'Approval Workflow', name: 'Rejected Loan Can Be Approved Afterwards', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['A rejected application should be final. Is it?', 'The approve action never looks at the current status before overwriting it.', 'As the officer, approve loan 6 — it was already rejected, yet it flips to approved.'],
    lesson: 'Terminal states must be terminal; status overwrites without precondition checks resurrect dead decisions.',
    impact: 'Loans a credit officer already declined can be silently revived and funded, undoing risk decisions after the fact.',
    report: { title: 'Approval Allowed from Terminal Rejected State', severity: 'High', remediation: 'Whitelist source states for each transition; rejected/closed loans require a brand-new application.' } },

  /* ---- Repayments ---- */
  { id: 'rp-idor', feature: 'Repayments', name: 'Repayment Schedule IDOR', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Schedules live under the loan URL: /loans/<id>/schedule.', 'Like the application itself, the schedule read skips the ownership check.', 'As Alice, open /loans/5/schedule — Carol’s full repayment schedule is shown.'],
    lesson: 'Child resources inherit the parent’s sensitivity; schedules reveal balances, due dates and payment behaviour.',
    impact: 'Competitors and snoops can map any borrower’s debt position and payment history — prime material for fraud and extortion.',
    report: { title: 'Insecure Direct Object Reference Exposes Repayment Schedules', severity: 'High', remediation: 'Check ownership on every nested resource read, not just the parent object.' } },
  { id: 'rp-payless', feature: 'Repayments', name: 'Underpayment Marked as Paid in Full', owasp: 'A04:2021 Insecure Design', difficulty: 'Intermediate',
    hints: ['The repayment form has a “settle in full” convenience flag. Who verifies the amount?', 'Pay a tiny amount but claim the installment is settled.', 'On your disbursed loan, POST a repayment of amount=1 with settleFull=true — the $1,250 installment is marked PAID.'],
    lesson: 'Payment state must be derived from verified amounts received, never from a client-supplied “paid in full” flag.',
    impact: 'Borrowers can extinguish installments for pennies, quietly writing off the lender’s money one schedule line at a time.',
    report: { title: 'Installment Marked Paid Without Full Payment', severity: 'Critical', remediation: 'Compute installment status from recorded payment totals server-side; ignore client settlement flags.' } },
  { id: 'rp-forgery', feature: 'Repayments', name: 'Forged Settlement Amount Closes the Loan', owasp: 'A04:2021 Insecure Design', difficulty: 'Advanced',
    hints: ['The “settle loan” action asks how much was paid — and believes the answer.', 'Your real payments are tracked separately from the number you declare at settlement.', 'POST /loans/<your id>/settle with paidAmount equal to the full loan amount while you have actually paid almost nothing — the loan closes as SETTLED.'],
    lesson: 'Ledger truth must come from the payment system’s own records; a client-declared total is not evidence of payment.',
    impact: 'An entire loan can be discharged on paper with no money received — direct, total loss of the principal.',
    report: { title: 'Loan Settlement Trusts Client-Declared Paid Amount', severity: 'Critical', remediation: 'Close loans only when server-recorded payments cover principal + interest; reconcile with the payment provider.' } },

  /* ---- Documents ---- */
  { id: 'doc-idor', feature: 'Documents', name: 'Document IDOR — Others’ Income Proofs', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['Documents download from /documents/<id>/download with sequential ids.', 'The download handler never asks whose document it is.', 'As Bob, download document 1 — Alice’s payslip, with her salary, is served to you.'],
    lesson: 'Uploaded evidence files are among the most sensitive objects in a lending app; every download needs an ownership check.',
    impact: 'Payslips, bank statements and tax returns of every borrower can be harvested — identity-theft kits, complete in one request each.',
    report: { title: 'Insecure Direct Object Reference Exposes Borrower Documents', severity: 'High', remediation: 'Authorise every file download against the owner/staff role; log access to sensitive documents.' } },
  { id: 'doc-upload', feature: 'Documents', name: 'Unrestricted Upload — HTML Served from Platform Origin', owasp: 'A03:2021 Injection', difficulty: 'Intermediate',
    hints: ['The document upload accepts any “file”. What does it do with an .html one?', 'Uploaded content is re-served from the platform’s own origin with its real content type.', 'Upload a document named proof.html containing a script payload, then open /uploads/proof.html — it runs as platform HTML.'],
    lesson: 'Uploads must be type-checked, renamed, and served from a separate domain or as downloads — never as active content on the app origin.',
    impact: 'Attackers host phishing pages and script payloads on the lender’s real domain, inheriting its trust and users’ sessions.',
    report: { title: 'Unrestricted File Upload Allows Stored HTML/JS on Application Origin', severity: 'High', remediation: 'Whitelist file types, verify content, store outside web root, serve with Content-Disposition: attachment.' } },

  /* ---- Admin Panel ---- */
  { id: 'adm-csrf', feature: 'Admin Panel', name: 'CSRF on Platform Settings (APR Change)', owasp: 'A01:2021 Broken Access Control', difficulty: 'Intermediate',
    hints: ['The admin settings form changes the platform APR. It carries no CSRF token.', 'A cross-site POST riding an admin session will lack the hx_origin marker.', 'While “logged in as admin”, POST /admin/settings {apr: 0.1} from a foreign origin — the platform rate changes.'],
    lesson: 'Admin actions are the highest-value CSRF targets; tokens and origin checks are mandatory there most of all.',
    impact: 'One malicious page view by an admin can slash (or spike) the interest rate applied to every new loan on the platform.',
    report: { title: 'Cross-Site Request Forgery on Platform Interest-Rate Settings', severity: 'High', remediation: 'CSRF tokens on all admin mutations, SameSite=Lax/Strict cookies, and Origin verification.' } },

  /* ---- Platform & API ---- */
  { id: 'api-dump', feature: 'Platform & API', name: 'Unauthenticated API Export of All Borrower Data', owasp: 'A01:2021 Broken Access Control', difficulty: 'Beginner',
    hints: ['APIs often hide a debug or export route. Try /api/admin/export.', 'No session, no token — the route simply never checks.', 'GET /api/admin/export with no cookies at all — every user, income, credit score and loan is returned as JSON.'],
    lesson: 'Every route needs an explicit authorisation decision; “nobody links to it” is not access control.',
    impact: 'The entire borrower database — financial profiles included — is one unauthenticated request away from any attacker.',
    report: { title: 'Unauthenticated Administrative Data Export Endpoint', severity: 'Critical', remediation: 'Require authenticated admin authorisation on export/debug routes; remove them from production builds.' } },
  { id: 'api-weak', feature: 'Platform & API', name: 'API Token Derived from Public Email Address', owasp: 'A02:2021 Cryptographic Failures', difficulty: 'Intermediate',
    hints: ['Your API token is shown in your profile area. Look at its structure — it is not random.', 'It is a simple encoding of something everyone knows about the account.', "Bob's token is hx_ + base64(bob@test.local). Compute it and call /api/loans with header X-API-Key — his loans come back."],
    lesson: 'API credentials must be high-entropy secrets; an encoding of a public identifier is not a secret at all.',
    impact: 'Anyone who knows a borrower’s email — public information — owns their API access and full loan data.',
    report: { title: 'Predictable API Keys Derived from Email Addresses', severity: 'High', remediation: 'Issue random 256-bit API tokens, store hashed, support rotation and revocation.' } },
];
const TOTAL = TESTS.length;
const FEATURES = [...new Set(TESTS.map(t => t.feature))];

/* ============================ progress state ============================ */
let state = { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
function loadState() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const s = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      if (s && typeof s === 'object') state = Object.assign(state, s);
    }
  } catch (e) { /* corrupt state -> start fresh */ }
}
function saveState() { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 1)); } catch (e) {} }
function pass(id) {
  if (!TESTS.find(t => t.id === id)) return;
  if (!state.tests[id]) { state.tests[id] = true; saveState(); }
}
function bump(feature) { state.attempts[feature] = (state.attempts[feature] || 0) + 1; saveState(); }
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TOTAL; }
loadState();

/* completion-key shards: second half of the key material, kept far from the entry shards */
const COMP_SHARDS_A = ["TC1YSA==","Ti03NA==","TTdNSw=="];

/* ============================ seed data (fake) ============================ */
const users = [
  { id: 1, name: 'Platform Admin', email: 'admin@hexaloan.local', password: 'admin123', role: 'admin', annualIncome: 0, creditScore: 0 },
  { id: 2, name: 'Olivia Officer', email: 'officer@hexaloan.local', password: 'officer123', role: 'officer', annualIncome: 0, creditScore: 0 },
  { id: 3, name: 'Victor Verifier', email: 'verifier@hexaloan.local', password: 'verify123', role: 'verifier', annualIncome: 0, creditScore: 0 },
  { id: 4, name: 'Alice Borrower', email: 'alice@test.local', password: 'alice123', role: 'borrower', annualIncome: 85000, creditScore: 720 },
  { id: 5, name: 'Bob Borrower', email: 'bob@test.local', password: 'bob123', role: 'borrower', annualIncome: 42000, creditScore: 610 },
  { id: 6, name: 'Carol Borrower', email: 'carol@test.local', password: 'carol123', role: 'borrower', annualIncome: 120000, creditScore: 780 },
  { id: 7, name: 'Demo User', email: 'demo@hexaloan.local', password: 'password', role: 'borrower', annualIncome: 30000, creditScore: 580 },
];
let nextUserId = 8;
const loans = [
  { id: 1, ownerId: 4, amount: 15000, purpose: 'Home renovation', termMonths: 12, declaredIncome: 85000, declaredScore: 720, eligible: true, status: 'approved', verified: true, realPaid: 0 },
  { id: 2, ownerId: 4, amount: 8000, purpose: 'Debt consolidation', termMonths: 12, declaredIncome: 85000, declaredScore: 720, eligible: true, status: 'submitted', verified: false, realPaid: 0 },
  { id: 3, ownerId: 5, amount: 5000, purpose: 'Used car', termMonths: 24, declaredIncome: 42000, declaredScore: 610, eligible: false, status: 'submitted', verified: false, realPaid: 0 },
  { id: 4, ownerId: 5, amount: 3000, purpose: 'Emergency expenses', termMonths: 6, declaredIncome: 42000, declaredScore: 610, eligible: false, status: 'draft', verified: false, realPaid: 0 },
  { id: 5, ownerId: 6, amount: 25000, purpose: 'Business equipment', termMonths: 12, declaredIncome: 120000, declaredScore: 780, eligible: true, status: 'disbursed', verified: true, realPaid: 0 },
  { id: 6, ownerId: 6, amount: 9000, purpose: 'Travel', termMonths: 12, declaredIncome: 120000, declaredScore: 780, eligible: true, status: 'rejected', verified: true, realPaid: 0 },
];
let nextLoanId = 7;
const installments = []; // {id, loanId, n, amount, status, paidAmount}
let nextInstId = 1;
function makeSchedule(loan) {
  const per = Math.round(loan.amount / loan.termMonths);
  for (let i = 1; i <= loan.termMonths; i++) installments.push({ id: nextInstId++, loanId: loan.id, n: i, amount: per, status: 'due', paidAmount: 0 });
}
makeSchedule(loans[4]); // Carol's disbursed loan
const documents = [
  { id: 1, ownerId: 4, loanId: 1, name: 'alice-payslip.pdf', content: 'PAYSLIP — Alice Borrower. Employer: Northwind Traders. Gross annual salary: $85,000. Net monthly: $5,430. (FAKE seed document)' },
  { id: 2, ownerId: 5, loanId: 3, name: 'bob-bank-statement.pdf', content: 'BANK STATEMENT — Bob Borrower. Account ****2211. Average balance: $1,240. Salary credit: $3,500/mo from Metro Retail. (FAKE seed document)' },
  { id: 3, ownerId: 6, loanId: 5, name: 'carol-tax-return.pdf', content: 'TAX RETURN SUMMARY — Carol Borrower. Declared income: $120,000. Tax paid: $21,300. (FAKE seed document)' },
];
let nextDocId = 4;
const uploads = {}; // name -> {content, type}
const settings = { apr: 12.5 };
const sessions = new Map(); // sid -> userId
const loginFails = {};      // email -> consecutive failure count
const enumProbe = {};       // ip -> {hit:bool, miss:bool}

/* ============================ helpers ============================ */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function hasPayload(s) { return /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|<iframe|javascript:/i.test(String(s || '')); }
function apiTokenFor(u) { return 'hx_' + Buffer.from(u.email, 'utf8').toString('base64'); }
function resetTokenFor(u) { return 'RST-' + u.id + '-' + (u.id * 73 + 11); }
function eligibleCalc(income, score, amount) { return score >= 650 && amount <= income * 0.5; }
function userById(id) { return users.find(u => u.id === id); }
function loanById(id) { return loans.find(l => l.id === Number(id)); }
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); });
  return out;
}
function sessionUser(req) {
  const c = parseCookies(req);
  if (c.hx_session && sessions.has(c.hx_session)) return userById(sessions.get(c.hx_session));
  return null;
}
function effectiveRole(req, user) {
  const c = parseCookies(req);
  if (c.hx_role) return c.hx_role; // VULNERABLE: role trusted from a client cookie
  return user ? user.role : 'guest';
}
function isCrossSite(req) {
  const o = req.headers.origin || req.headers.referer || '';
  if (o && !/127\.0\.0\.1:3055|localhost:3055/.test(o)) return true;
  const c = parseCookies(req);
  return !c.hx_origin; // app pages set the hx_origin marker cookie; foreign posts lack it
}
function readBody(req) {
  return new Promise(res => {
    let d = '';
    req.on('data', ch => { d += ch; if (d.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { return res(JSON.parse(d || '{}')); } catch (e) { return res({}); } }
      const out = {};
      new URLSearchParams(d).forEach((v, k) => { out[k] = v; });
      res(out);
    });
    req.on('error', () => res({}));
  });
}
function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/html; charset=utf-8' });
  res.end(body);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function setSessionCookie(res, user) {
  const sid = crypto.randomBytes(16).toString('hex');
  sessions.set(sid, user.id);
  res.setHeader('Set-Cookie', [
    'hx_session=' + sid + '; Path=/; HttpOnly',
    'hx_role=' + user.role + '; Path=/',           // role mirrored into a client cookie (the flaw)
    'hx_origin=site; Path=/',
  ]);
  return sid;
}

/* ============================ page chrome ============================ */
function progressBar() {
  const done = doneCount(), pct = Math.floor(done / TOTAL * 100);
  return '<div style="background:#111827;color:#e5e7eb;padding:8px 16px;font-family:monospace">' +
    '<img src="/logo.png" alt="HexaCyberLab" style="height:22px;vertical-align:middle"> ' +
    '<strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong> · ' + done + '/' + TOTAL + ' tests · ' + pct + '%' +
    '<div style="background:#374151;height:8px;border-radius:4px;margin-top:6px"><div style="background:#7c3aed;height:8px;border-radius:4px;width:' + pct + '%"></div></div></div>';
}
function chatWidget() {
  return '<div id="hxchat" style="position:fixed;right:14px;bottom:14px;width:320px;font-family:sans-serif;z-index:99">' +
    '<div style="background:#111827;color:#fff;padding:8px 12px;border-radius:10px 10px 0 0;cursor:pointer" onclick="var b=document.getElementById(\'hxchatbody\');b.style.display=b.style.display===\'none\'?\'block\':\'none\'">💬 Lab Coach</div>' +
    '<div id="hxchatbody" style="display:none;background:#fff;border:1px solid #ddd;border-top:none;border-radius:0 0 10px 10px;padding:10px">' +
    '<div id="hxchatlog" style="height:180px;overflow:auto;font-size:13px;margin-bottom:8px"></div>' +
    '<input id="hxchatin" placeholder="Ask the Lab Coach…" style="width:72%;padding:6px"><button onclick="hxSend()" style="padding:6px 10px">Send</button></div></div>' +
    '<script>function hxSend(){var i=document.getElementById("hxchatin"),l=document.getElementById("hxchatlog");var m=i.value;i.value="";l.innerHTML+="<div><b>You:</b> "+m.replace(/</g,"&lt;")+"</div>";fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:m})}).then(r=>r.json()).then(j=>{l.innerHTML+="<div><b>Coach:</b> "+j.reply.replace(/</g,"&lt;")+"</div>";l.scrollTop=l.scrollHeight;});}document.getElementById("hxchatin").addEventListener("keydown",function(e){if(e.key==="Enter")hxSend();});</script>';
}
function page(req, title, body) {
  const u = sessionUser(req);
  const nav = u
    ? '<a href="/">Dashboard</a> · <a href="/loans">My Loans</a> · <a href="/documents">Documents</a> · <a href="/profile">Profile</a> · <a href="/tests">Mission Tests</a> · <a href="/logout">Logout (' + esc(u.name) + ')</a>'
    : '<a href="/login">Login</a> · <a href="/register">Register</a> · <a href="/tests">Mission Tests</a>';
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) + ' — HexaLoan</title></head>' +
    '<body style="font-family:sans-serif;margin:0;background:#f8fafc;color:#0f172a">' + progressBar() +
    '<div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 16px">' + nav + '</div>' +
    '<main style="max-width:960px;margin:0 auto;padding:20px 16px">' + body + '</main>' + chatWidget() + '</body></html>';
}
function gatePage() {
  return '<!doctype html><html><head><meta charset="utf-8"><title>Locked — LAB ' + LAB_NUMBER + '</title></head>' +
    '<body style="font-family:sans-serif;background:#0f172a;color:#e5e7eb;text-align:center;padding:60px 20px">' +
    '<img src="/logo.png" style="height:64px"><h1>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</h1>' +
    '<p>This lab is locked. Paste the completion key from Lab ' + (LAB_NUMBER - 1) + ' to start.</p>' +
    '<form method="POST" action="/unlock"><input name="key" placeholder="Completion key from Lab ' + (LAB_NUMBER - 1) + '" style="padding:10px;width:320px;border-radius:6px;border:1px solid #475569">' +
    ' <button style="padding:10px 18px;border-radius:6px;background:#7c3aed;color:#fff;border:none">Unlock</button></form>' + chatWidget() + '</body></html>';
}

/* ============================ chatbot ============================ */
function completionKey() { return assembleKey(COMP_SHARDS_A.concat(COMP_SHARDS_B)); }
const FEATURE_KEYS = [
  ['Login & Authentication', ['login', 'auth', 'password', 'brute', 'reset token', 'enumeration', 'cookie']],
  ['Registration & Profile', ['register', 'registration', 'profile', 'sign up', 'signup', 'mass assignment']],
  ['Loan Applications', ['application', 'apply', 'eligibility', 'eligible', 'loan amount']],
  ['Approval Workflow', ['approval', 'approve', 'verification', 'verify', 'workflow', 'reject']],
  ['Repayments', ['repay', 'repayment', 'schedule', 'installment', 'settle', 'settlement']],
  ['Documents', ['document', 'upload', 'payslip', 'file']],
  ['Admin Panel', ['admin', 'settings', 'apr', 'interest rate']],
  ['Platform & API', ['api', 'export', 'token', 'platform']],
];
function chatReply(raw) {
  const msg = String(raw || '');
  const m = msg.toLowerCase();
  const done = doneCount(), pct = Math.floor(done / TOTAL * 100);
  if (/(who built|who made|who created|founder|built this|made this)/.test(m)) {
    return "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
  }
  if (/(completion key|the key|next lab.*key|key please|give.*key)/.test(m)) {
    if (isComplete() && state.keyRevealed) return 'You earned it — the completion key for this lab is: ' + completionKey() + ' — paste it into the next lab to unlock it.';
    return "I don't have the completion key yet — I only receive it when this lab is completed. Right now you're at " + pct + '% (' + done + '/' + TOTAL + ' tests). Finish every test and I\'ll be able to share it.';
  }
  let feature = null;
  for (const [f, keys] of FEATURE_KEYS) { if (keys.some(k => m.includes(k))) { feature = f; break; } }
  if (feature && /(how many|count|list|which|what tests|vulnerabilit)/.test(m)) {
    const ts = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + ts.length + ' tests: ' + ts.map(t => t.name + (state.tests[t.id] ? ' ✓' : '')).join('; ') + '. Full details and hints are on the /tests page.';
  }
  if (feature && /(how|help|guide|step|solve|do i|exploit|attack)/.test(m)) {
    const att = state.attempts[feature] || 0;
    const ts = TESTS.filter(t => t.feature === feature);
    const allPassed = ts.every(t => state.tests[t.id]);
    if (att >= 3 || allPassed) {
      const lines = ts.filter(t => !state.tests[t.id]).map(t => '• ' + t.name + ': ' + t.hints[2]);
      if (!lines.length) return 'You have already completed every test in ' + feature + '. Great work!';
      return 'Step by step for ' + feature + ':\n' + lines.join('\n');
    }
    return "That feature is locked for help. First try the " + feature + " tests yourself at least 3 times — I can see you've tried " + att + " time(s) so far. After 3 real tries, ask me again and I'll guide you step by step.";
  }
  if (/(progress|status|score|how am i)/.test(m)) {
    return 'You are at ' + pct + '% — ' + done + ' of ' + TOTAL + ' tests complete across ' + FEATURES.length + ' features. Open /tests to see what is left.';
  }
  if (feature) {
    const ts = TESTS.filter(t => t.feature === feature);
    return feature + ' has ' + ts.length + ' tests (' + ts.filter(t => state.tests[t.id]).length + ' done). Ask me “how” questions about it after at least 3 tries, or check /tests for hints.';
  }
  const next = TESTS.find(t => !state.tests[t.id]);
  return "Hi, I'm the Lab Coach for LAB " + LAB_NUMBER + ' — ' + LAB_NAME + '. This lab has ' + FEATURES.length + ' features and ' + TOTAL + ' tests; you are at ' + pct + '%. ' +
    (next ? 'A good next target: “' + next.name + '” (' + next.feature + '). ' : 'Everything is complete! ') +
    'Ask me how many tests a feature has, or ask for step-by-step help — help unlocks after 3 real tries on that feature.';
}

/* ============================ auth routes ============================ */
function loginPage(req, err) {
  return page(req, 'Login', '<h1>Welcome to HexaLoan</h1><p>Loans from $500 to $' + MAX_LOAN.toLocaleString() + ' at ' + settings.apr + '% APR.</p>' +
    (err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/login"><p><label>Email <input name="email" style="padding:8px;width:280px"></label></p>' +
    '<p><label>Password <input name="password" type="password" style="padding:8px;width:280px"></label></p>' +
    '<button style="padding:9px 20px;background:#7c3aed;color:#fff;border:none;border-radius:6px">Log in</button></form>' +
    '<p><a href="/forgot">Forgot password?</a> · <a href="/register">Open an account</a></p>' +
    '<p style="color:#64748b;font-size:13px">Seed accounts: alice@test.local/alice123 · bob@test.local/bob123 · carol@test.local/carol123 · officer@hexaloan.local/officer123 · verifier@hexaloan.local/verify123 · admin@hexaloan.local/admin123</p>');
}
async function handleLogin(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const email = String(b.email || ''), pw = String(b.password || '');
  const ip = req.socket.remoteAddress || 'x';
  enumProbe[ip] = enumProbe[ip] || { hit: false, miss: false };
  // VULNERABLE: "query" built by string concatenation — a tautology pattern bypasses the password check
  const inj = /'\s*or\s*'?\d+'?\s*=\s*'?\d+/i.test(email) || /'\s*or\s*'?\d+'?\s*=\s*'?\d+/i.test(pw) || /'\s*or\s*'[^']*'\s*=\s*'[^']*'/i.test(email);
  if (inj) {
    const admin = users[0];
    setSessionCookie(res, admin);
    pass('auth-sqli');
    return redirect(res, '/');
  }
  const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (!u) {
    enumProbe[ip].miss = true;
    if (enumProbe[ip].hit) pass('auth-enum');
    return send(res, 200, loginPage(req, 'No account found for that email.'));
  }
  enumProbe[ip].hit = true;
  if (enumProbe[ip].miss) pass('auth-enum');
  if (u.password !== pw) {
    loginFails[u.email] = (loginFails[u.email] || 0) + 1;
    if (loginFails[u.email] >= 10) pass('auth-brute'); // 10th failure still processed — no throttle anywhere
    return send(res, 200, loginPage(req, 'Incorrect password for this account.'));
  }
  loginFails[u.email] = 0;
  if (u.email === 'demo@hexaloan.local' && pw === 'password') pass('auth-default');
  setSessionCookie(res, u);
  return redirect(res, '/');
}
function registerPage(req, err) {
  return page(req, 'Register', '<h1>Open a HexaLoan account</h1>' + (err ? '<p style="color:#b91c1c">' + esc(err) + '</p>' : '') +
    '<form method="POST" action="/register"><p><label>Full name <input name="name" style="padding:8px;width:280px"></label></p>' +
    '<p><label>Email <input name="email" style="padding:8px;width:280px"></label></p>' +
    '<p><label>Password <input name="password" type="password" style="padding:8px;width:280px"></label></p>' +
    '<p><label>Annual income ($) <input name="annualIncome" type="number" value="50000" style="padding:8px;width:280px"></label></p>' +
    '<button style="padding:9px 20px;background:#7c3aed;color:#fff;border:none;border-radius:6px">Register</button></form>');
}
async function handleRegister(req, res) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const email = String(b.email || '');
  if (!email || users.find(x => x.email.toLowerCase() === email.toLowerCase())) return send(res, 200, registerPage(req, 'That email is already registered or invalid.'));
  const pw = String(b.password || '');
  const u = { id: nextUserId++, name: String(b.name || 'New User'), email, password: pw, role: 'borrower', annualIncome: Number(b.annualIncome) || 0, creditScore: 640 };
  users.push(u);
  if (pw.length < 8) pass('reg-weak'); // accepted anyway — no policy at all
  if (hasPayload(u.name)) pass('reg-xss');
  setSessionCookie(res, u);
  return redirect(res, '/');
}
function forgotPage(req, msg) {
  return page(req, 'Forgot password', '<h1>Reset your password</h1>' + (msg ? '<p>' + esc(msg) + '</p>' : '') +
    '<form method="POST" action="/forgot"><p><label>Email <input name="email" style="padding:8px;width:280px"></label></p>' +
    '<button style="padding:9px 20px">Send reset link</button></form>' +
    '<h3>Use a reset token</h3><form method="POST" action="/reset"><p><label>Email <input name="email" style="padding:8px;width:240px"></label></p>' +
    '<p><label>Token <input name="token" style="padding:8px;width:240px"></label></p>' +
    '<p><label>New password <input name="newpassword" type="password" style="padding:8px;width:240px"></label></p>' +
    '<button style="padding:9px 20px">Reset password</button></form>');
}
async function handleForgot(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const u = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
  if (!u) return send(res, 200, forgotPage(req, 'No account with that email address.'));
  return send(res, 200, forgotPage(req, 'If the address matches an account, a reset email is on its way.'));
}
async function handleReset(req, res) {
  const b = await readBody(req);
  bump('Login & Authentication');
  const u = users.find(x => x.email.toLowerCase() === String(b.email || '').toLowerCase());
  if (u && String(b.token || '') === resetTokenFor(u)) {
    u.password = String(b.newpassword || 'changed123');
    pass('auth-reset');
    return send(res, 200, forgotPage(req, 'Password updated. You can log in now.'));
  }
  return send(res, 200, forgotPage(req, 'That reset token is not valid.'));
}
function profilePage(req, u) {
  return page(req, 'Profile', '<h1>Your profile</h1>' +
    '<p><strong>' + u.name + '</strong> (' + esc(u.email) + ') — role: ' + esc(u.role) + '</p>' + // name rendered UNESCAPED on purpose (stored XSS)
    '<p>Verified annual income: $' + u.annualIncome + ' · Verified credit score: ' + u.creditScore + '</p>' +
    '<p>Your API token: <code>' + esc(apiTokenFor(u)) + '</code></p>' +
    '<h3>Update profile</h3><form method="POST" action="/profile"><p><label>Display name <input name="name" value="' + esc(u.name) + '" style="padding:8px;width:280px"></label></p>' +
    '<p><label>Phone <input name="phone" value="' + esc(u.phone || '') + '" style="padding:8px;width:280px"></label></p>' +
    '<button style="padding:9px 20px">Save</button></form>');
}
async function handleProfile(req, res, u) {
  const b = await readBody(req);
  bump('Registration & Profile');
  const before = { creditScore: u.creditScore, role: u.role };
  if (b.name !== undefined) u.name = String(b.name);
  if (b.phone !== undefined) u.phone = String(b.phone);
  // VULNERABLE: every other posted field is applied too (mass assignment)
  if (b.creditScore !== undefined) u.creditScore = Number(b.creditScore);
  if (b.annualIncome !== undefined) u.annualIncome = Number(b.annualIncome);
  if (b.role !== undefined) u.role = String(b.role);
  if (u.creditScore !== before.creditScore || u.role !== before.role) pass('reg-mass');
  if (hasPayload(u.name)) pass('reg-xss');
  if (isCrossSite(req)) pass('reg-csrf');
  return redirect(res, '/profile');
}

/* ============================ loans ============================ */
function loanRow(l) {
  const o = userById(l.ownerId);
  return '<tr><td><a href="/loans/' + l.id + '">#' + l.id + '</a></td><td>' + esc(o ? o.name : '?') + '</td><td>$' + l.amount.toLocaleString() + '</td><td>' + esc(l.purpose) + '</td><td>' + l.status + '</td><td>' + (l.eligible ? 'Eligible' : 'Not eligible') + '</td></tr>';
}
function loansPage(req, u) {
  const mine = loans.filter(l => l.ownerId === u.id);
  return page(req, 'My Loans', '<h1>My loan applications</h1>' +
    '<p><a href="/loans/new">➕ New application</a></p>' +
    '<table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>ID</th><th>Borrower</th><th>Amount</th><th>Purpose</th><th>Status</th><th>Decision</th></tr>' +
    mine.map(loanRow).join('') + '</table>');
}
function newLoanPage(req, u) {
  return page(req, 'New application', '<h1>New loan application</h1><p>Platform cap: $' + MAX_LOAN.toLocaleString() + ' · APR ' + settings.apr + '%</p>' +
    '<form method="POST" action="/loans"><p><label>Amount ($) <input name="amount" type="number" value="10000" max="' + MAX_LOAN + '" style="padding:8px;width:240px"></label></p>' +
    '<p><label>Purpose <input name="purpose" value="Personal loan" style="padding:8px;width:240px"></label></p>' +
    '<p><label>Term (months) <input name="termMonths" type="number" value="12" style="padding:8px;width:240px"></label></p>' +
    '<p><label>Declared annual income ($) <input name="income" type="number" value="' + u.annualIncome + '" style="padding:8px;width:240px"></label></p>' +
    '<p><label>Declared credit score <input name="creditScore" type="number" value="' + u.creditScore + '" style="padding:8px;width:240px"></label></p>' +
    '<button style="padding:9px 20px;background:#7c3aed;color:#fff;border:none;border-radius:6px">Submit application</button></form>');
}
async function handleCreateLoan(req, res, u) {
  const b = await readBody(req);
  bump('Loan Applications');
  const amount = Number(b.amount) || 0;
  const dIncome = Number(b.income), dScore = Number(b.creditScore);
  // VULNERABLE: eligibility decided from client-declared figures, amount cap never checked server-side
  const elig = eligibleCalc(dIncome, dScore, amount);
  const truthElig = eligibleCalc(u.annualIncome, u.creditScore, amount);
  const l = { id: nextLoanId++, ownerId: u.id, amount, purpose: String(b.purpose || 'Loan'), termMonths: Math.min(60, Math.max(1, Number(b.termMonths) || 12)), declaredIncome: dIncome, declaredScore: dScore, eligible: elig, status: 'submitted', verified: false, realPaid: 0 };
  loans.push(l);
  if (elig && !truthElig && (dIncome !== u.annualIncome || dScore !== u.creditScore)) pass('app-elig');
  if (amount > MAX_LOAN) pass('app-amount');
  return redirect(res, '/loans/' + l.id);
}
function loanDetailPage(req, u, l) {
  const o = userById(l.ownerId);
  const mine = l.ownerId === u.id;
  let actions = '';
  if (mine && l.status === 'draft') actions += '<form method="POST" action="/loans/' + l.id + '/status"><input type="hidden" name="status" value="submitted"><button>Submit for review</button></form> ';
  if (mine && l.status === 'approved') actions += '<form method="POST" action="/loans/' + l.id + '/disburse" style="display:inline"><button>Disburse funds</button></form> ';
  if (l.status === 'disbursed') actions += '<a href="/loans/' + l.id + '/schedule">View repayment schedule</a>';
  return page(req, 'Loan #' + l.id, '<h1>Loan application #' + l.id + '</h1>' +
    '<p>Borrower: ' + esc(o ? o.name : '?') + ' (' + esc(o ? o.email : '') + ')</p>' +
    '<p>Amount: <strong>$' + l.amount.toLocaleString() + '</strong> · Purpose: ' + esc(l.purpose) + ' · Term: ' + l.termMonths + ' months</p>' +
    '<p>Declared income: $' + l.declaredIncome.toLocaleString() + ' · Declared credit score: ' + l.declaredScore + '</p>' +
    '<p>Status: <strong>' + l.status + '</strong> · Verified: ' + (l.verified ? 'yes' : 'no') + ' · Eligibility: ' + (l.eligible ? 'Eligible' : 'Not eligible') + '</p>' + actions);
}
function schedulePage(req, u, l) {
  const rows = installments.filter(i => i.loanId === l.id).map(i =>
    '<tr><td>' + i.n + '</td><td>$' + i.amount.toLocaleString() + '</td><td>' + i.status + '</td><td>$' + (i.paidAmount || 0).toLocaleString() + '</td>' +
    (i.status !== 'paid' && l.ownerId === u.id ? '<td><form method="POST" action="/loans/' + l.id + '/repay"><input type="hidden" name="installmentId" value="' + i.id + '"><input name="amount" type="number" value="' + i.amount + '" style="width:90px"> <label><input type="checkbox" name="settleFull" value="true"> settle in full</label> <button>Pay</button></form></td>' : '<td></td>') + '</tr>').join('');
  return page(req, 'Schedule', '<h1>Repayment schedule — loan #' + l.id + '</h1>' +
    '<p>Total actually paid so far: $' + l.realPaid.toLocaleString() + ' of $' + l.amount.toLocaleString() + '</p>' +
    '<table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>#</th><th>Amount due</th><th>Status</th><th>Paid</th><th></th></tr>' + rows + '</table>' +
    (l.ownerId === u.id && l.status === 'disbursed' ? '<h3>Settle the whole loan</h3><form method="POST" action="/loans/' + l.id + '/settle"><label>Total paid amount ($) <input name="paidAmount" type="number" style="padding:7px"></label> <button>Settle loan</button></form>' : ''));
}

/* ============================ staff / approval ============================ */
function staffPage(req, u) {
  const rows = loans.map(l => {
    const o = userById(l.ownerId);
    return '<tr><td>#' + l.id + '</td><td>' + (o ? o.name : '?') + '</td><td>$' + l.amount.toLocaleString() + '</td><td>' + l.status + '</td><td>' + (l.verified ? 'yes' : 'no') + '</td>' +
      '<td><form method="POST" action="/staff/loans/' + l.id + '/verify" style="display:inline"><button>Verify</button></form> ' +
      '<form method="POST" action="/staff/loans/' + l.id + '/approve" style="display:inline"><button>Approve</button></form> ' +
      '<form method="POST" action="/staff/loans/' + l.id + '/reject" style="display:inline"><button>Reject</button></form></td></tr>';
  }).join('');
  return page(req, 'Staff queue', '<h1>Approval queue</h1><p>Signed in as ' + u.name + ' (effective role: ' + esc(effectiveRole(req, u)) + ')</p>' +
    '<table border="1" cellpadding="7" cellspacing="0" style="border-collapse:collapse;background:#fff"><tr><th>ID</th><th>Borrower</th><th>Amount</th><th>Status</th><th>Verified</th><th>Actions</th></tr>' + rows + '</table>');
}

/* ============================ documents ============================ */
function docsPage(req, u) {
  const mine = documents.filter(d => d.ownerId === u.id);
  return page(req, 'Documents', '<h1>My documents</h1>' +
    '<ul>' + mine.map(d => '<li>' + esc(d.name) + ' — <a href="/documents/' + d.id + '/download">download</a></li>').join('') + '</ul>' +
    '<h3>Upload a document</h3><form method="POST" action="/documents/upload"><p><label>File name <input name="name" placeholder="income-proof.pdf" style="padding:8px;width:260px"></label></p>' +
    '<p><label>Content <input name="content" placeholder="file contents (simulated upload)" style="padding:8px;width:360px"></label></p>' +
    '<button style="padding:9px 20px">Upload</button></form><p style="color:#64748b;font-size:13px">Uploaded files are served under /uploads/&lt;name&gt;.</p>');
}

/* ============================ tests / complete / certificate ============================ */
function testsPage(req) {
  const byF = {};
  TESTS.forEach(t => { (byF[t.feature] = byF[t.feature] || []).push(t); });
  let body = '<h1>Mission Tests — LAB ' + LAB_NUMBER + ' ' + LAB_NAME + '</h1><p>' + doneCount() + '/' + TOTAL + ' complete. Hints reveal one at a time. The Lab Coach gives step-by-step help after 3 real tries on a feature.</p>';
  for (const f of FEATURES) {
    body += '<h2>' + esc(f) + ' <small style="color:#64748b">(attempts: ' + (state.attempts[f] || 0) + ')</small></h2>';
    for (const t of byF[f]) {
      body += '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin:8px 0"><strong>' + (state.tests[t.id] ? '✓' : '○') + ' ' + esc(t.name) + '</strong> · ' + esc(t.owasp) + ' · ' + t.difficulty +
        '<details><summary>Hints</summary><ol>' + t.hints.map(h => '<li>' + esc(h) + '</li>').join('') + '</ol></details></div>';
    }
  }
  return page(req, 'Mission Tests', body);
}
function completePage(req) {
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return page(req, 'Not yet', '<h1>Lab not complete yet</h1><p>' + doneCount() + '/' + TOTAL + ' tests done (' + Math.floor(doneCount() / TOTAL * 100) + '%). Remaining:</p><ul>' +
      left.map(t => '<li>' + esc(t.name) + ' (' + esc(t.feature) + ')</li>').join('') + '</ul>');
  }
  if (!state.keyRevealed) { state.keyRevealed = true; state.completedAt = state.completedAt || new Date().toISOString(); saveState(); }
  const byF = {};
  TESTS.forEach(t => { (byF[t.feature] = byF[t.feature] || []).push(t); });
  let body = '<h1>🎉 Lab complete — 100%</h1>';
  body += '<h2>1) Features in this lab</h2><p>' + FEATURES.length + ' features: ' + FEATURES.map(esc).join(', ') + '</p>';
  body += '<h2>2) Vulnerabilities per feature</h2><ul>' + FEATURES.map(f => '<li>' + esc(f) + ': ' + byF[f].length + '</li>').join('') + '</ul>';
  body += '<h2>3) Ways testing was done (' + TOTAL + ' techniques)</h2><ul>' + TESTS.map(t => '<li>' + esc(t.name) + '</li>').join('') + '</ul>';
  body += '<h2>4) What you learned</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.lesson) + '</li>').join('') + '</ul>';
  body += '<h2>5) What this means for a real client</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.name) + ':</strong> ' + esc(t.impact) + '</li>').join('') + '</ul>';
  body += '<h2>6) Writing it in a real report</h2><ul>' + TESTS.map(t => '<li><strong>' + esc(t.report.title) + '</strong> — Severity: ' + t.report.severity + '. Remediation: ' + esc(t.report.remediation) + '</li>').join('') + '</ul>';
  body += '<h2>Your completion key</h2><p style="font-family:monospace;font-size:18px;background:#111827;color:#a5f3fc;padding:12px;border-radius:8px">' + esc(completionKey()) + '</p>';
  body += '<form method="POST" action="/complete"><label>Your name for the certificate <input name="testerName" value="' + esc(state.testerName) + '" style="padding:8px;width:260px"></label> <button>Save name</button></form>';
  body += '<p><a href="/certificate">🏆 View your certificate</a></p>';
  return page(req, 'Lab Complete', body);
}
function certificatePage(req) {
  if (!isComplete()) return page(req, 'Certificate', '<h1>Certificate locked</h1><p>Complete 100% of the tests first.</p>');
  const name = state.testerName || 'HexaCyberLab Tester';
  const date = state.completedAt ? new Date(state.completedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return '<!doctype html><html><head><meta charset="utf-8"><title>Certificate — LAB ' + LAB_NUMBER + '</title><style>@media print{button{display:none}}</style></head>' +
    '<body style="font-family:Georgia,serif;background:#f1f5f9;padding:40px"><div style="max-width:720px;margin:0 auto;background:#fff;border:3px solid #7c3aed;border-radius:14px;padding:36px;text-align:center">' +
    '<img src="/logo.png" style="height:56px"><h1 style="margin:10px 0">Certificate of Completion</h1>' +
    '<p>This certifies that</p><h2 style="color:#7c3aed">' + esc(name) + '</h2>' +
    '<p>has completed 100% of the security tests in <strong>LAB ' + LAB_NUMBER + ' — ' + LAB_NAME + '</strong><br>(' + TOTAL + ' tests across ' + FEATURES.length + ' features)</p>' +
    '<p>Completed on ' + date + '</p><p style="margin-top:26px;color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>' +
    '<button onclick="window.print()">Print</button></div></body></html>';
}
function dashboardPage(req, u) {
  const role = effectiveRole(req, u);
  let body = '<h1>Dashboard</h1><p>Welcome, ' + u.name + '</p><p>Role: ' + esc(u.role) + ' · APR: ' + settings.apr + '%</p>'; // name unescaped (stored XSS surface)
  if (role === 'borrower') body += '<p><a href="/loans">My loan applications</a> · <a href="/loans/new">Apply for a loan</a> · <a href="/documents">My documents</a></p>';
  if (['officer', 'verifier', 'admin'].includes(role)) body += '<p><a href="/staff">Open the approval queue</a></p>';
  if (role === 'admin') body += '<p><a href="/admin">Admin panel</a></p>';
  body += '<p>Progress on this lab: ' + doneCount() + '/' + TOTAL + ' tests — see <a href="/tests">Mission Tests</a>.</p>';
  return page(req, 'Dashboard', body);
}
function adminPage(req) {
  return page(req, 'Admin', '<h1>Admin panel</h1><p>Platform APR: <strong>' + settings.apr + '%</strong></p>' +
    '<form method="POST" action="/admin/settings"><label>New APR (%) <input name="apr" type="number" step="0.1" value="' + settings.apr + '" style="padding:8px"></label> <button>Save settings</button></form>' +
    '<h3>Users</h3><ul>' + users.map(x => '<li>' + esc(x.email) + ' — ' + esc(x.role) + '</li>').join('') + '</ul>');
}

/* ============================ router ============================ */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://' + HOST + ':' + PORT);
    const p = url.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const img = fs.readFileSync(path.join(DIR, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(img); }
      catch (e) { return send(res, 404, 'logo missing'); }
    }
    if (p === '/api/progress') {
      const feats = {};
      FEATURES.forEach(f => { const ts = TESTS.filter(t => t.feature === f); feats[f] = { total: ts.length, done: ts.filter(t => state.tests[t.id]).length, attempts: state.attempts[f] || 0 }; });
      return send(res, 200, JSON.stringify({ lab: LAB_NAME, number: LAB_NUMBER, total: TOTAL, done: doneCount(), pct: Math.floor(doneCount() / TOTAL * 100), features: feats, complete: isComplete() }), 'application/json');
    }
    if (p === '/api/chat' && method === 'POST') {
      const b = await readBody(req);
      return send(res, 200, JSON.stringify({ reply: chatReply(b.message) }), 'application/json');
    }
    if (p === '/unlock' && method === 'POST') {
      const b = await readBody(req);
      if (String(b.key || '') === entryKey()) { state.unlocked = true; saveState(); return redirect(res, '/'); }
      return send(res, 403, gatePage().replace('</form>', '</form><p style="color:#f87171">That key was not accepted.</p>'));
    }
    if (!state.unlocked) return send(res, 200, gatePage());

    const u = sessionUser(req);

    if (p === '/login') { if (method === 'POST') return handleLogin(req, res); return send(res, 200, loginPage(req)); }
    if (p === '/register') { if (method === 'POST') return handleRegister(req, res); return send(res, 200, registerPage(req)); }
    if (p === '/forgot') { if (method === 'POST') return handleForgot(req, res); return send(res, 200, forgotPage(req)); }
    if (p === '/reset' && method === 'POST') return handleReset(req, res);
    if (p === '/logout') {
      const c = parseCookies(req); if (c.hx_session) sessions.delete(c.hx_session);
      res.setHeader('Set-Cookie', ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0']);
      return redirect(res, '/login');
    }
    if (p === '/tests') return send(res, 200, testsPage(req));
    if (p === '/complete') {
      if (method === 'POST') { const b = await readBody(req); if (b.testerName !== undefined) { state.testerName = String(b.testerName).slice(0, 80); saveState(); } return redirect(res, '/complete'); }
      return send(res, 200, completePage(req));
    }
    if (p === '/certificate') return send(res, 200, certificatePage(req));

    /* ---- public API surface (own auth rules) ---- */
    if (p === '/api/admin/export') {
      bump('Platform & API');
      // VULNERABLE: no authentication or authorisation at all
      if (!u) pass('api-dump');
      return send(res, 200, JSON.stringify({ users: users.map(x => ({ id: x.id, name: x.name, email: x.email, role: x.role, annualIncome: x.annualIncome, creditScore: x.creditScore, password: x.password })), loans }), 'application/json');
    }
    if (p === '/api/loans') {
      bump('Platform & API');
      const tok = req.headers['x-api-key'] || url.searchParams.get('key') || '';
      const owner = users.find(x => apiTokenFor(x) === tok);
      if (!owner) return send(res, 401, JSON.stringify({ error: 'invalid API key' }), 'application/json');
      if (!u || u.id !== owner.id) pass('api-weak'); // key derived from a public email — no session needed
      return send(res, 200, JSON.stringify({ borrower: owner.email, loans: loans.filter(l => l.ownerId === owner.id) }), 'application/json');
    }

    if (!u) return redirect(res, '/login');
    const role = effectiveRole(req, u);

    if (p === '/') return send(res, 200, dashboardPage(req, u));
    if (p === '/profile') { if (method === 'POST') return handleProfile(req, res, u); return send(res, 200, profilePage(req, u)); }

    /* ---- loans ---- */
    if (p === '/loans' && method === 'GET') return send(res, 200, loansPage(req, u));
    if (p === '/loans/new') return send(res, 200, newLoanPage(req, u));
    if (p === '/loans' && method === 'POST') return handleCreateLoan(req, res, u);
    let m;
    if ((m = p.match(/^\/loans\/(\d+)$/)) && method === 'GET') {
      bump('Loan Applications');
      const l = loanById(m[1]); if (!l) return send(res, 404, page(req, '404', '<h1>Loan not found</h1>'));
      if (l.ownerId !== u.id && u.role === 'borrower') pass('app-idor'); // served with NO ownership check
      return send(res, 200, loanDetailPage(req, u, l));
    }
    if ((m = p.match(/^\/loans\/(\d+)\/status$/)) && method === 'POST') {
      const b = await readBody(req); bump('Loan Applications');
      const l = loanById(m[1]); if (!l || l.ownerId !== u.id) return send(res, 403, page(req, '403', '<h1>Not your loan</h1>'));
      const target = String(b.status || '');
      if (['draft', 'submitted', 'verified', 'approved', 'rejected', 'disbursed', 'settled'].includes(target)) {
        l.status = target; // VULNERABLE: free-form status — borrower can jump straight to disbursed
        if (target === 'disbursed') { pass('app-status'); if (!installments.some(i => i.loanId === l.id)) makeSchedule(l); }
      }
      return redirect(res, '/loans/' + l.id);
    }
    if ((m = p.match(/^\/loans\/(\d+)\/disburse$/)) && method === 'POST') {
      await readBody(req); bump('Repayments');
      const l = loanById(m[1]); if (!l || l.ownerId !== u.id) return send(res, 403, page(req, '403', '<h1>Not your loan</h1>'));
      if (l.status === 'approved') { l.status = 'disbursed'; if (!installments.some(i => i.loanId === l.id)) makeSchedule(l); }
      return redirect(res, '/loans/' + l.id + '/schedule');
    }
    if ((m = p.match(/^\/loans\/(\d+)\/schedule$/)) && method === 'GET') {
      bump('Repayments');
      const l = loanById(m[1]); if (!l) return send(res, 404, page(req, '404', '<h1>Loan not found</h1>'));
      if (l.ownerId !== u.id && u.role === 'borrower') pass('rp-idor'); // schedule served with NO ownership check
      return send(res, 200, schedulePage(req, u, l));
    }
    if ((m = p.match(/^\/loans\/(\d+)\/repay$/)) && method === 'POST') {
      const b = await readBody(req); bump('Repayments');
      const l = loanById(m[1]); if (!l || l.ownerId !== u.id) return send(res, 403, page(req, '403', '<h1>Not your loan</h1>'));
      const inst = installments.find(i => i.id === Number(b.installmentId) && i.loanId === l.id);
      if (inst) {
        const amt = Number(b.amount) || 0;
        inst.paidAmount = (inst.paidAmount || 0) + amt;
        l.realPaid += amt;
        // VULNERABLE: the client "settle in full" flag — or any payment — closes the installment
        if (b.settleFull === 'true' || inst.paidAmount >= inst.amount) inst.status = 'paid';
        if (inst.status === 'paid' && inst.paidAmount < inst.amount) pass('rp-payless');
      }
      return redirect(res, '/loans/' + l.id + '/schedule');
    }
    if ((m = p.match(/^\/loans\/(\d+)\/settle$/)) && method === 'POST') {
      const b = await readBody(req); bump('Repayments');
      const l = loanById(m[1]); if (!l || l.ownerId !== u.id) return send(res, 403, page(req, '403', '<h1>Not your loan</h1>'));
      const declared = Number(b.paidAmount) || 0;
      // VULNERABLE: settlement trusts the client-declared total instead of recorded payments
      if (declared >= l.amount && l.status === 'disbursed') {
        l.status = 'settled';
        if (l.realPaid < l.amount) pass('rp-forgery');
      }
      return redirect(res, '/loans/' + l.id);
    }

    /* ---- staff / approval workflow ---- */
    if (p === '/staff') {
      if (!['officer', 'verifier', 'admin'].includes(role)) return send(res, 403, page(req, '403', '<h1>Staff only</h1>'));
      return send(res, 200, staffPage(req, u));
    }
    if ((m = p.match(/^\/staff\/loans\/(\d+)\/(verify|approve|reject)$/)) && method === 'POST') {
      await readBody(req); bump('Approval Workflow');
      if (!['officer', 'verifier', 'admin'].includes(role)) return send(res, 403, page(req, '403', '<h1>Staff only</h1>'));
      const l = loanById(m[1]); if (!l) return send(res, 404, page(req, '404', '<h1>Loan not found</h1>'));
      const action = m[2];
      if (action === 'verify') { l.verified = true; if (l.status === 'submitted') l.status = 'verified'; }
      if (action === 'reject') { l.status = 'rejected'; }
      if (action === 'approve') {
        const wasRejected = l.status === 'rejected';
        const wasVerified = !!l.verified;
        l.status = 'approved'; // VULNERABLE: no state preconditions at all
        if (l.ownerId === u.id) pass('appr-self');
        if (!wasVerified) pass('appr-skip');
        if (wasRejected) pass('appr-double');
      }
      return redirect(res, '/staff');
    }

    /* ---- documents ---- */
    if (p === '/documents') return send(res, 200, docsPage(req, u));
    if (p === '/documents/upload' && method === 'POST') {
      const b = await readBody(req); bump('Documents');
      const name = String(b.name || 'file.txt').replace(/[^\w.\-]/g, '_');
      const content = String(b.content || '');
      const ext = (name.split('.').pop() || '').toLowerCase();
      const type = ext === 'html' || ext === 'htm' ? 'text/html' : ext === 'svg' ? 'image/svg+xml' : 'text/plain';
      uploads[name] = { content, type };
      documents.push({ id: nextDocId++, ownerId: u.id, loanId: 0, name, content });
      if ((type === 'text/html' || type === 'image/svg+xml') && hasPayload(content)) pass('doc-upload');
      else if (type === 'text/html') pass('doc-upload');
      return redirect(res, '/documents');
    }
    if ((m = p.match(/^\/uploads\/(.+)$/)) && method === 'GET') {
      const f = uploads[decodeURIComponent(m[1])];
      if (!f) return send(res, 404, 'not found');
      return send(res, 200, f.content, f.type + '; charset=utf-8'); // served as active content from the app origin
    }
    if ((m = p.match(/^\/documents\/(\d+)\/download$/)) && method === 'GET') {
      bump('Documents');
      const d = documents.find(x => x.id === Number(m[1]));
      if (!d) return send(res, 404, page(req, '404', '<h1>Document not found</h1>'));
      if (d.ownerId !== u.id && u.role === 'borrower') pass('doc-idor'); // served with NO ownership check
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + d.name + '"' });
      return res.end(d.content);
    }

    /* ---- admin ---- */
    if (p === '/admin') {
      bump('Admin Panel');
      if (role !== 'admin') return send(res, 403, page(req, '403', '<h1>Admins only</h1>'));
      if (u.role !== 'admin') pass('auth-cookie'); // reached the panel on a forged role cookie
      return send(res, 200, adminPage(req));
    }
    if (p === '/admin/settings' && method === 'POST') {
      const b = await readBody(req); bump('Admin Panel');
      if (role !== 'admin') return send(res, 403, page(req, '403', '<h1>Admins only</h1>'));
      if (u.role !== 'admin') pass('auth-cookie');
      if (b.apr !== undefined && !isNaN(Number(b.apr))) settings.apr = Number(b.apr);
      if (isCrossSite(req)) pass('adm-csrf');
      return redirect(res, '/admin');
    }

    return send(res, 404, page(req, '404', '<h1>Page not found</h1>'));
  } catch (e) {
    try { send(res, 500, 'Server error'); } catch (e2) {}
  }
});

/* completion-key shards: remaining pieces, kept in a separate region from part A */
const COMP_SHARDS_B = ["LTFLRQ==","WTg5NA==","MDc2WA=="];

server.listen(PORT, HOST, () => { console.log('HexaLoan (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT); });
