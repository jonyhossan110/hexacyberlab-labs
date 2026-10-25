'use strict';
/* ============================================================================
   HexaTax — LAB 49 of 110 (Category 5: Finance, Payments & Insurance)
   A deliberately vulnerable tax-preparation platform for HexaCyberLab
   security training. LOCAL USE ONLY. Zero-dependency Node.js.
   Business app: taxpayer accounts, tax returns with income/deduction
   fields, server-side tax calculation, document uploads, preparer and
   reviewer roles, filing-status workflow (draft > submitted > prepared >
   filed), exports and a token API.
   The lab system (progress, hints, chatbot, key chain, certificate) is
   layered on top; see README.md.
   ========================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3058;
const HOST = '127.0.0.1';
const LAB_NUMBER = 49;
const LAB_NAME = 'HexaTax';
const ROOT = __dirname;
const DOCS_DIR = path.join(ROOT, 'docs');
const PROGRESS_FILE = path.join(ROOT, 'progress.json');

/* ---- key material, region 1 of 2 (entry key shards; assembled on demand) - */

function _unshard(parts) {
  return parts.map(p => Buffer.from(p, 'base64').toString('utf8').split('').reverse().join('')).join('');
}
const ENTRY_KEY_SHA256 = 'ff193cf26bb5193b1c542663178e117d2dcf4c377d54bd7d85efa6143d185c4f';
function entryKeyMatches(given) { const c = require('node:crypto'); const h = c.createHash('sha256').update(String(given == null ? '' : given)).digest('hex'); try { return c.timingSafeEqual(Buffer.from(h), Buffer.from(ENTRY_KEY_SHA256)); } catch (e) { return h === ENTRY_KEY_SHA256; } }
/* Entry key check is hash-only: this lab's source no longer contains its entry key. */

/* ============================================================================
   TESTS REGISTRY — one entry per scored vulnerability test.
   A test passes ONLY when the server observes the real exploit effect.
   ========================================================================== */
const TESTS = [
  {
    "id": "auth-sqli",
    "feature": "Login & Authentication",
    "name": "SQL Injection Login Bypass",
    "owasp": "A03:2021 Injection",
    "difficulty": "Beginner",
    "hints": [
      "The login form builds its user lookup by joining your input straight into a query string.",
      "Try a classic tautology in the email field, something that makes the WHERE clause always true.",
      "Use admin' OR '1'='1 as the email with any password - the query matches the first user in the table, the admin."
    ],
    "lesson": "String-built queries let an attacker rewrite the login logic itself; parameterized queries make input data, never code.",
    "impact": "On a real tax platform this means anyone can walk in as the administrator without a password and reach every client return, bank detail and identity number stored inside.",
    "report": { "title": "SQL Injection in Login Form Allows Full Authentication Bypass", "severity": "Critical", "remediation": "Use parameterized queries for all database access and add a regression test with injection payloads on every form." }
  },
  {
    "id": "auth-brute",
    "feature": "Login & Authentication",
    "name": "No Brute-Force Protection on Login",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Beginner",
    "hints": [
      "Count how many wrong passwords the login accepts for one account.",
      "Nothing slows you down or locks the account, even after many failures.",
      "Submit 10 or more wrong passwords for bob@hexatax.local - the tenth is still processed like the first."
    ],
    "lesson": "Without throttling or lockout, passwords fall to patient guessing; rate limits and lockouts make online guessing impractical.",
    "impact": "Attackers can guess weak client passwords overnight; on a tax platform one guessed account exposes full income and banking data.",
    "report": { "title": "Missing Rate Limiting and Account Lockout on Login", "severity": "High", "remediation": "Add progressive delays, lockout after repeated failures, and alerting on password-spraying patterns." }
  },
  {
    "id": "auth-enum",
    "feature": "Login & Authentication",
    "name": "User Enumeration via Login and Reset Responses",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Beginner",
    "hints": [
      "Compare the exact wording of the login error for a real account and an invented one.",
      "The forgot-password form answers differently too - one confirms the mail was sent, the other admits there is no account.",
      "Try alice@hexatax.local with a wrong password, then nobody@hexatax.local - the two messages tell you which accounts exist."
    ],
    "lesson": "Different error messages for real and fake accounts hand attackers a verified target list.",
    "impact": "Criminals harvest the client list of a tax firm and aim phishing and credential stuffing exactly at real customers.",
    "report": { "title": "Account Enumeration Through Divergent Authentication Error Messages", "severity": "Medium", "remediation": "Return one generic message for all failed logins and reset requests regardless of account existence." }
  },
  {
    "id": "auth-default",
    "feature": "Login & Authentication",
    "name": "Default Administrator Credentials",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Beginner",
    "hints": [
      "Fresh installs often keep the vendor-supplied admin password.",
      "The admin mailbox follows the platform naming pattern you see on the login page.",
      "Try admin@hexatax.local with the password admin123 - it was never changed after setup."
    ],
    "lesson": "Default credentials are public knowledge; every deployment must force a change at first login.",
    "impact": "Anyone on the internet can own the whole platform with a password printed in a thousand setup guides.",
    "report": { "title": "Default Credentials Active on the Administrator Account", "severity": "Critical", "remediation": "Force a unique admin password at installation and disable any vendor default accounts." }
  },
  {
    "id": "auth-reset",
    "feature": "Login & Authentication",
    "name": "Predictable Password Reset Token",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Intermediate",
    "hints": [
      "Ask for a reset link and study the reset form - the token is derived from something public about the account.",
      "The derivation uses a fast, unsalted, well-known hash of the account email address.",
      "The token is the MD5 hash of the account email - compute md5 of carol@hexatax.local and use it on the reset form to set a new password."
    ],
    "lesson": "Reset tokens must be random and single-use; anything derivable from public data is an account-takeover shortcut.",
    "impact": "An attacker who knows a client email can reset the password and take over the account, returns and refund destination included.",
    "report": { "title": "Password Reset Token Predictable (MD5 of Email Address)", "severity": "High", "remediation": "Generate reset tokens from a CSPRNG, store only a hash, expire them quickly and make them single-use." }
  },
  {
    "id": "auth-cookie",
    "feature": "Login & Authentication",
    "name": "Session Role Cookie Tampering",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "After login, inspect the cookies the app trusts.",
      "One cookie repeats your role - and the server believes the copy you send back.",
      "Set the hx_role cookie to admin and open /admin - the server never checks the role stored on your account."
    ],
    "lesson": "Authorization data must live server-side; anything the client can edit will be edited.",
    "impact": "Any low-privilege client account becomes an administrator, with access to every taxpayer record on the platform.",
    "report": { "title": "Broken Access Control - Role Trusted from a Client-Side Cookie", "severity": "Critical", "remediation": "Keep roles in the server-side session record and ignore role data supplied by the client." }
  },
  {
    "id": "reg-weakpw",
    "feature": "Registration & Profile",
    "name": "Weak Password Policy at Registration",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Beginner",
    "hints": [
      "Register a test account and see how short a password the form accepts.",
      "There is effectively no minimum length or complexity rule.",
      "Create an account with the single-character password a - it is accepted immediately."
    ],
    "lesson": "Password policy is a security control: short passwords fall to brute force in seconds.",
    "impact": "Clients who pick tiny passwords hand attackers their tax records, identity numbers and bank details.",
    "report": { "title": "Registration Accepts Single-Character Passwords", "severity": "Medium", "remediation": "Enforce a minimum length of at least 10 characters and screen against common-password lists." }
  },
  {
    "id": "reg-massassign",
    "feature": "Registration & Profile",
    "name": "Mass Assignment - Role Granted at Registration",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "The registration form only shows name, email and password - but the handler binds more fields than it shows.",
      "Add a field the form never offered and see if the account quietly gains it.",
      "Register with an extra role field set to preparer (or isAdmin set to true) - the new account is created with that power."
    ],
    "lesson": "Bind only whitelisted fields; auto-binding whole request bodies lets clients grant themselves privileges.",
    "impact": "A stranger can self-register as a preparer or admin and operate inside the firm tooling from minute one.",
    "report": { "title": "Mass Assignment Allows Self-Granting of Privileged Roles", "severity": "High", "remediation": "Whitelist assignable fields per endpoint and set roles only through administrative workflows." }
  },
  {
    "id": "reg-xss",
    "feature": "Registration & Profile",
    "name": "Stored XSS in Display Name",
    "owasp": "A03:2021 Injection",
    "difficulty": "Beginner",
    "hints": [
      "Your display name is rendered on the dashboard and in staff views without escaping.",
      "Put markup in the name and watch where it appears.",
      "Set your display name to a script payload such as <script>alert(1)</script> and reload the dashboard - it is stored and rendered as code."
    ],
    "lesson": "Every stored field is code in someone else browser unless it is encoded on output.",
    "impact": "A malicious client name can run scripts in the preparer browser, stealing sessions and opening other client files.",
    "report": { "title": "Stored Cross-Site Scripting in the Profile Display Name", "severity": "High", "remediation": "Contextually encode all user-supplied values on output and add a Content Security Policy." }
  },
  {
    "id": "reg-csrf",
    "feature": "Registration & Profile",
    "name": "CSRF on Profile Update",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "The profile form changes your account with a plain POST and no anti-CSRF token.",
      "The app marks its own requests with an origin cookie - watch what happens when a POST arrives without it.",
      "Send the profile update with a cross-site Origin header (or with no hx_origin cookie) - the change is applied anyway."
    ],
    "lesson": "State-changing requests need unforgeable tokens; cookies alone ride along with forged requests.",
    "impact": "A booby-trapped web page can silently rewrite a victim profile while they are logged in, including contact data used for refunds.",
    "report": { "title": "Missing CSRF Protection on Profile Update", "severity": "Medium", "remediation": "Add per-session CSRF tokens to all state-changing forms and validate Origin headers." }
  },
  {
    "id": "ret-idor",
    "feature": "Tax Returns",
    "name": "Return IDOR Exposes Another Taxpayer File",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Beginner",
    "hints": [
      "Open one of your own returns and look at how its address names it.",
      "Return numbers are sequential - and the page never asks whether the file is yours.",
      "While logged in as one taxpayer, open return 1003, which belongs to another client - full income, TIN and bank details are served."
    ],
    "lesson": "Every object fetch must check ownership; predictable identifiers plus missing checks equal total data exposure.",
    "impact": "Any client can read every other client tax return - income, identity numbers and bank accounts - a reportable breach on day one.",
    "report": { "title": "Insecure Direct Object Reference on Tax Return Detail Page", "severity": "Critical", "remediation": "Enforce per-object ownership or role checks on every return access and use unguessable identifiers." }
  },
  {
    "id": "ret-calc",
    "feature": "Tax Returns",
    "name": "Calculation Tampering via Hidden Tax Field",
    "owasp": "A04:2021 Insecure Design",
    "difficulty": "Intermediate",
    "hints": [
      "The return form shows a computed tax - but the save handler trusts more than the visible fields.",
      "Add a field the real form never shows and see which number the server stores.",
      "When saving a return, add a computedTax field with value 1 - the stored tax becomes 1 and the refund explodes, whatever the income says."
    ],
    "lesson": "Money math must be recomputed server-side from source figures; never accept a client-supplied result.",
    "impact": "Clients can fabricate refunds by naming their own tax bill - direct financial fraud against the platform and the tax authority.",
    "report": { "title": "Server Trusts Client-Supplied Tax Calculation (Hidden Field Tampering)", "severity": "Critical", "remediation": "Ignore all client-supplied computed values and recompute tax server-side from validated inputs." }
  },
  {
    "id": "ret-deduction",
    "feature": "Tax Returns",
    "name": "Deduction Cap Not Enforced",
    "owasp": "A04:2021 Insecure Design",
    "difficulty": "Intermediate",
    "hints": [
      "The return form states a rule: charity deductions are capped at 60 percent of total income.",
      "Rules written in help text are not enforced anywhere in the save handler.",
      "Save a return whose charity deduction is larger than the total income - it is accepted and produces a giant refund."
    ],
    "lesson": "Business rules must be enforced in code on the server, not described in page text.",
    "impact": "Inflated deductions manufacture refunds the client is not entitled to - fraud exposure for the firm and its customers.",
    "report": { "title": "Missing Server-Side Validation of Deduction Limits", "severity": "High", "remediation": "Validate every deduction against its statutory cap server-side and reject out-of-range returns." }
  },
  {
    "id": "ret-status",
    "feature": "Tax Returns",
    "name": "Filing Status Bypass - Skipping Preparer and Reviewer",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "A return normally moves draft, then submitted, then prepared, then filed - each step by a different role.",
      "The save handler accepts a status value from the request body, from anyone who owns the draft.",
      "Edit your own draft and add a status field set to filed - the return is filed instantly, with no preparer preparation and no reviewer approval."
    ],
    "lesson": "Workflow state must transition only through role-checked actions, never through editable fields.",
    "impact": "Unreviewed, possibly fabricated returns get filed in the firm name - regulatory and fraud fallout lands on the business.",
    "report": { "title": "Workflow Bypass - Taxpayer Can Set Return Status Directly to Filed", "severity": "High", "remediation": "Remove status from user-editable fields and drive transitions through role-checked workflow endpoints." }
  },
  {
    "id": "ret-edit-filed",
    "feature": "Tax Returns",
    "name": "Filed Returns Can Still Be Edited",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "A filed return should be locked forever - the figures went to the tax authority.",
      "Open one of your filed returns from last year and try the edit form anyway.",
      "Save changes to the wages of a return whose status is filed - the locked record quietly changes."
    ],
    "lesson": "Immutability of finalized records is a control: once filed, corrections need a formal amendment flow.",
    "impact": "Filed figures can be rewritten after submission, destroying the audit trail and exposing the firm to severe penalties.",
    "report": { "title": "Missing Immutability Control - Filed Tax Returns Remain Editable", "severity": "High", "remediation": "Block edits on filed returns and route corrections through a tracked amendment workflow." }
  },
  {
    "id": "doc-idor",
    "feature": "Documents",
    "name": "Document Download IDOR",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Beginner",
    "hints": [
      "Your W-2 and 1099 documents live behind numbered download links.",
      "The numbers are sequential and ownership is never checked on download.",
      "As one taxpayer, download document 2002 - it belongs to another client and contains their income statement."
    ],
    "lesson": "Attachments carry the same sensitivity as the records they belong to and need the same ownership checks.",
    "impact": "Identity documents and income statements of every client can be harvested one number at a time.",
    "report": { "title": "Insecure Direct Object Reference on Document Downloads", "severity": "High", "remediation": "Check document ownership against the session on every download." }
  },
  {
    "id": "doc-upload",
    "feature": "Documents",
    "name": "Unrestricted HTML Upload Served Inline",
    "owasp": "A05:2021 Security Misconfiguration",
    "difficulty": "Intermediate",
    "hints": [
      "The upload form accepts any file type, not just the documents it asks for.",
      "Upload something that is not a document at all and then open its raw view.",
      "Upload an .html file containing a script payload and open its raw link - it is served as a web page from the platform origin."
    ],
    "lesson": "Uploads must be type-checked and served as inert downloads, never as active content from your origin.",
    "impact": "Attackers host phishing pages and script payloads on the trusted tax platform domain, aimed at staff and clients.",
    "report": { "title": "Unrestricted File Upload - HTML Files Served Inline from the Application Origin", "severity": "High", "remediation": "Whitelist allowed types, verify content, store outside the web root and serve with Content-Disposition attachment." }
  },
  {
    "id": "doc-traversal",
    "feature": "Documents",
    "name": "Path Traversal in Document Viewer",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "The document viewer takes a file name and reads it from the documents folder.",
      "Nothing stops the name from walking out of that folder.",
      "Ask the viewer for ../server.js - it returns the application source code."
    ],
    "lesson": "Never build file paths from raw user input; resolve and confine paths to an allowed directory.",
    "impact": "Source code and configuration leak first; from there attackers map every other weakness in the platform.",
    "report": { "title": "Path Traversal in Document Viewer Exposes Application Source", "severity": "High", "remediation": "Canonicalize requested paths, confine them to the documents directory and serve files by ID instead." }
  },
  {
    "id": "search-sqli",
    "feature": "Search & Exports",
    "name": "SQL Injection in Return Search",
    "owasp": "A03:2021 Injection",
    "difficulty": "Intermediate",
    "hints": [
      "The return search matches records with a hand-built query, just like the login.",
      "A search term that makes the WHERE clause always true returns more than your own files.",
      "Search for ' OR '1'='1 while logged in as a taxpayer - every client return appears in the results."
    ],
    "lesson": "Search boxes are query builders too; every input that reaches a query needs parameterization.",
    "impact": "One search string dumps the entire client book - every income, TIN and bank detail the firm holds.",
    "report": { "title": "SQL Injection in Return Search Returns All Taxpayer Records", "severity": "Critical", "remediation": "Parameterize the search query and scope results to the requester role and ownership." }
  },
  {
    "id": "search-xss",
    "feature": "Search & Exports",
    "name": "Reflected XSS in Search",
    "owasp": "A03:2021 Injection",
    "difficulty": "Beginner",
    "hints": [
      "The results page repeats your search term at the top, exactly as typed.",
      "Markup in the term comes back as markup in the page.",
      "Search for a script payload such as <script>alert(1)</script> - it is reflected unescaped into the results page."
    ],
    "lesson": "Reflected input must be encoded on output, even in something as small as a results heading.",
    "impact": "A crafted search link sent to a preparer runs script in their session, opening the client files they can reach.",
    "report": { "title": "Reflected Cross-Site Scripting in Return Search", "severity": "Medium", "remediation": "Encode the search term on output and deploy a Content Security Policy." }
  },
  {
    "id": "export-leak",
    "feature": "Search & Exports",
    "name": "Taxpayer Export Downloads Every Client Record",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "The export button promises a CSV of your returns.",
      "Compare what lands in the file with what you actually own.",
      "As any taxpayer, download the export - it contains every client return, with TINs and bank accounts, not just yours."
    ],
    "lesson": "Bulk endpoints need the same scoping as single-record views - they are the highest-value target in the app.",
    "impact": "One click exfiltrates the entire client database in spreadsheet form, ready for identity theft.",
    "report": { "title": "Excessive Data Exposure - Export Endpoint Returns All Taxpayer Records to Any User", "severity": "Critical", "remediation": "Scope exports to the requester own records unless the role is admin, and log all exports." }
  },
  {
    "id": "admin-csrf",
    "feature": "Admin Panel",
    "name": "User Deactivation by Simple GET Link (CSRF)",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "In the admin panel, deactivating a user is not a form with a token - it is a plain link.",
      "State changes that ride on GET can be triggered by an image tag on any website the admin visits.",
      "While an admin is logged in, visiting the deactivate link for a user disables that account immediately - no confirmation, no token."
    ],
    "lesson": "State changes require POST plus a CSRF token; a GET that changes state is an attack waiting for a browser.",
    "impact": "An attacker can trick the logged-in admin into disabling staff and client accounts, sabotaging the firm at filing deadline.",
    "report": { "title": "State-Changing GET Endpoint Allows CSRF Deactivation of User Accounts", "severity": "High", "remediation": "Convert admin actions to token-protected POSTs and require confirmation for destructive actions." }
  },
  {
    "id": "admin-pii",
    "feature": "Admin Panel",
    "name": "Compliance Audit Page Skips the Admin Role Check",
    "owasp": "A01:2021 Broken Access Control",
    "difficulty": "Intermediate",
    "hints": [
      "The /admin home checks your role. Not every page under /admin does.",
      "One sub-page only asks whether you are logged in - and it prints the most sensitive table in the app.",
      "As a normal taxpayer, open /admin/audit - every account, its plaintext password and TIN are listed."
    ],
    "lesson": "Authorization must be enforced on every route, not just the landing page of an admin area.",
    "impact": "Any registered user can read every password and identity number on the platform - total compromise in one click.",
    "report": { "title": "Missing Authorization on Admin Audit Page Exposes Passwords and TINs", "severity": "Critical", "remediation": "Apply the admin role check centrally to all /admin routes and never display stored passwords." }
  },
  {
    "id": "api-weak-token",
    "feature": "Platform & API",
    "name": "Predictable API Token Returns All Returns",
    "owasp": "A07:2021 Identification and Authentication Failures",
    "difficulty": "Intermediate",
    "hints": [
      "The API documentation page proudly shows how your token is built.",
      "It is just your email address, encoded - anyone can mint a token for anyone else.",
      "Call /api/returns with api_key set to hxt_ followed by the base64 of any user email, with no login at all - every return comes back as JSON."
    ],
    "lesson": "API tokens must be unguessable random secrets, scoped per user; encoding is not encryption and not a secret.",
    "impact": "The whole client book leaks through the API to anyone who knows a staff email address - no password ever needed.",
    "report": { "title": "Predictable API Token (Base64 of Email) Grants Full Data Access", "severity": "Critical", "remediation": "Issue random per-user API secrets, scope responses to the token owner and support revocation." }
  },
  {
    "id": "platform-debug",
    "feature": "Platform & API",
    "name": "Unauthenticated Debug Endpoint Leaks User Table",
    "owasp": "A05:2021 Security Misconfiguration",
    "difficulty": "Beginner",
    "hints": [
      "Development leftovers often survive into the deployed build.",
      "One short, well-known path returns diagnostics meant only for developers.",
      "Open /debug with no login at all - it dumps the configuration and the full user table including passwords."
    ],
    "lesson": "Debug surfaces are production vulnerabilities; remove them or lock them behind admin auth before release.",
    "impact": "A single public URL hands attackers every credential on the platform, no skill required.",
    "report": { "title": "Unauthenticated Debug Endpoint Exposes Configuration and All User Passwords", "severity": "Critical", "remediation": "Remove debug endpoints from production builds and gate diagnostics behind admin authentication." }
  }
];
/*__TESTS_END__*/
const TEST_BY_ID = {};
for (const t of TESTS) TEST_BY_ID[t.id] = t;
const FEATURES = [];
for (const t of TESTS) if (!FEATURES.includes(t.feature)) FEATURES.push(t.feature);

/* ============================================================================
   SEED DATA — a complete little tax practice. All people and figures fake.
   ========================================================================== */
const ROLES = ['taxpayer', 'preparer', 'reviewer', 'admin'];
let nextUserId = 100;
let nextUploadId = 3001;

const users = [
  { id: 1, name: 'Ada Admin',     email: 'admin@hexatax.local', password: 'admin123', role: 'admin',    tin: '900-11-0001', bank: 'HQ Operating ****1000', phone: '555-0100', active: true },
  { id: 2, name: 'Priya Patel',   email: 'priya@hexatax.local', password: 'priya123', role: 'preparer', tin: '900-22-0002', bank: 'Payroll ****2000',     phone: '555-0102', active: true },
  { id: 3, name: 'Ravi Rahman',   email: 'ravi@hexatax.local',  password: 'ravi123',  role: 'reviewer', tin: '900-33-0003', bank: 'Payroll ****3000',     phone: '555-0103', active: true },
  { id: 4, name: 'Alice Anders',  email: 'alice@hexatax.local', password: 'alice123', role: 'taxpayer', tin: '123-45-6789', bank: 'Checking ****4821',   phone: '555-0114', active: true },
  { id: 5, name: 'Bob Becker',    email: 'bob@hexatax.local',   password: 'bob123',   role: 'taxpayer', tin: '234-56-7890', bank: 'Checking ****7734',   phone: '555-0115', active: true },
  { id: 6, name: 'Carol Costa',   email: 'carol@hexatax.local', password: 'carol123', role: 'taxpayer', tin: '345-67-8901', bank: 'Savings ****2098',    phone: '555-0116', active: true }
];

function computeTruth(r) {
  const income = (+r.wages || 0) + (+r.business || 0) + (+r.other || 0);
  const deductions = (+r.dedMortgage || 0) + (+r.dedCharity || 0) + (+r.dedEducation || 0);
  const taxable = Math.max(0, income - deductions);
  let tax;
  if (taxable <= 10000) tax = taxable * 0.10;
  else if (taxable <= 40000) tax = 1000 + (taxable - 10000) * 0.12;
  else tax = 4600 + (taxable - 40000) * 0.22;
  tax = Math.round(tax * 100) / 100;
  return { income, deductions, taxable, tax, refund: Math.round(((+r.withholding || 0) - tax) * 100) / 100 };
}

function makeReturn(id, ownerId, year, filing, wages, business, other, dedMortgage, dedCharity, dedEducation, withholding, status) {
  const r = { id, ownerId, year, filing, wages, business, other, dedMortgage, dedCharity, dedEducation, withholding, status, tax: 0 };
  r.tax = computeTruth(r).tax;
  return r;
}
const returns = [
  makeReturn(1001, 4, 2025, 'Married filing jointly', 62000, 0, 1200, 5400, 800, 600, 7100, 'prepared'),
  makeReturn(1002, 4, 2024, 'Married filing jointly', 58000, 0, 900, 5100, 500, 0, 6600, 'filed'),
  makeReturn(1003, 5, 2025, 'Single', 48000, 9500, 0, 0, 1500, 1200, 5900, 'submitted'),
  makeReturn(1004, 5, 2024, 'Single', 45500, 8200, 300, 0, 900, 0, 5400, 'filed'),
  makeReturn(1005, 6, 2025, 'Head of household', 91000, 0, 2400, 7800, 2000, 1500, 12100, 'draft')
];
let nextReturnId = 1006;

const SEED_DOC_FILES = {
  'w2-alice-2025.txt': 'FORM W-2 Wage and Tax Statement 2025\nEmployer: Northwind Traders LLC\nEmployee: Alice Anders  TIN 123-45-6789\nWages: 62000  Federal withholding: 7100\n',
  'w2-bob-2025.txt': 'FORM W-2 Wage and Tax Statement 2025\nEmployer: Becker Logistics Inc\nEmployee: Bob Becker  TIN 234-56-7890\nWages: 48000  Federal withholding: 5900\n',
  '1099-carol-2025.txt': 'FORM 1099-INT Interest Income 2025\nPayer: Harbor Savings Bank\nRecipient: Carol Costa  TIN 345-67-8901\nInterest income: 2400\n'
};
const documents = [
  { id: 2001, ownerId: 4, returnId: 1001, name: 'W-2 2025 - Alice Anders', file: 'w2-alice-2025.txt' },
  { id: 2002, ownerId: 5, returnId: 1003, name: 'W-2 2025 - Bob Becker', file: 'w2-bob-2025.txt' },
  { id: 2003, ownerId: 6, returnId: 1005, name: '1099-INT 2025 - Carol Costa', file: '1099-carol-2025.txt' }
];
const uploads = []; // {id, ownerId, returnId, filename, content}

function seedDocFiles() {
  try {
    if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
    for (const [name, content] of Object.entries(SEED_DOC_FILES)) {
      const p = path.join(DOCS_DIR, name);
      if (!fs.existsSync(p)) fs.writeFileSync(p, content);
    }
  } catch (e) { /* lab keeps running even if docs dir is read-only */ }
}

/* ============================================================================
   PROGRESS ENGINE + PERSISTENCE
   ========================================================================== */
function freshState() {
  return { unlocked: false, testerName: '', tests: {}, attempts: {}, completedAt: null, keyRevealed: false };
}
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
  try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2)); } catch (e) { /* ignore */ }
}
function doneCount() { return TESTS.filter(t => state.tests[t.id]).length; }
function isComplete() { return doneCount() === TESTS.length; }
function pct() { return Math.floor(doneCount() / TESTS.length * 100); }
function pass(testId) {
  if (!TEST_BY_ID[testId]) return;
  if (!state.tests[testId]) {
    state.tests[testId] = true;
    if (isComplete() && !state.completedAt) state.completedAt = new Date().toISOString();
    saveState();
  }
}
function bump(feature) {
  state.attempts[feature] = (state.attempts[feature] || 0) + 1;
  saveState();
}
function attemptsOf(feature) { return state.attempts[feature] || 0; }

/* ============================================================================
   SESSIONS + SMALL HELPERS
   ========================================================================== */
const sessions = new Map(); // sid -> userId
const loginFails = {};      // email -> consecutive failed logins (never locks: the flaw)
const enumSeen = {};        // ip -> {exists, missing}
const pendingReset = {};    // email -> token

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
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
    req.on('data', c => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(data || '{}')); return; } catch (e) { resolve({}); return; }
      }
      const out = {};
      for (const pair of data.split('&')) {
        if (!pair) continue;
        const i = pair.indexOf('=');
        const k = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
        const v = decodeURIComponent((i < 0 ? '' : pair.slice(i + 1)).replace(/\+/g, ' '));
        out[k] = v;
      }
      resolve(out);
    });
    req.on('error', () => resolve({}));
  });
}
function sessionUser(req) {
  const cookies = parseCookies(req);
  const sid = cookies.hx_session;
  if (!sid || !sessions.has(sid)) return null;
  const user = users.find(u => u.id === sessions.get(sid));
  if (!user) return null;
  // FLAW (auth-cookie): the effective role is trusted from the client cookie.
  const role = cookies.hx_role && ROLES.includes(cookies.hx_role) ? cookies.hx_role : user.role;
  return { user, role, cookies };
}
function apiTokenFor(user) { return 'hxt_' + Buffer.from(user.email, 'utf8').toString('base64'); }
function csrfSuspect(req, cookies) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return true; } catch (e) { return true; }
  }
  if (!cookies.hx_origin) return true;
  return false;
}
const XSS_PATTERN = /<script|onerror\s*=|onload\s*=|<svg|<img[^>]*onerror|javascript:/i;
const INJ_PATTERN = /(?:'|")\s*(?:or|and)\s+(?:'|")?[\w]+(?:'|")?\s*=\s*(?:'|")?[\w]+(?:'|")?|union\s+select|'\s*--/i;

/* Deliberately naive login lookup: the query is built by string joining and
   a tautology in the input makes the WHERE clause match the first row. */
function fakeSqlLogin(email, password) {
  const query = "SELECT * FROM users WHERE email = '" + email + "' AND password = '" + password + "'";
  if (INJ_PATTERN.test(email) || INJ_PATTERN.test(password)) {
    return { user: users[0], viaInjection: true, query };
  }
  const user = users.find(u => u.email === String(email).toLowerCase());
  if (!user) return { error: 'No account found for that email address.', missing: true, query };
  if (!user.active) return { error: 'This account has been deactivated.', user, query };
  if (user.password !== password) return { error: 'Incorrect password for this account.', exists: true, query };
  return { user, query };
}
function userById(id) { return users.find(u => u.id === +id); }
function returnById(id) { return returns.find(r => r.id === +id); }

/* ============================================================================
   HTML RENDERING
   ========================================================================== */
const CHAT_WIDGET = `
<div id="hxchat" style="position:fixed;right:16px;bottom:16px;width:320px;max-width:92vw;background:#101828;color:#e6edf3;border:1px solid #2b3a55;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:inherit;z-index:9999">
  <div style="padding:10px 12px;border-bottom:1px solid #2b3a55;font-weight:600">Lab Coach — HexaTax</div>
  <div id="hxlog" style="height:210px;overflow-y:auto;padding:10px 12px;font-size:13px;line-height:1.45"></div>
  <form id="hxform" style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid #2b3a55">
    <input id="hxmsg" autocomplete="off" placeholder="Ask the coach..." style="flex:1;padding:7px 9px;border-radius:8px;border:1px solid #2b3a55;background:#0b1220;color:#e6edf3">
    <button style="padding:7px 12px;border-radius:8px;border:0;background:#2563eb;color:#fff;cursor:pointer">Send</button>
  </form>
</div>
<script>
(function(){
  var log=document.getElementById('hxlog'),form=document.getElementById('hxform'),msg=document.getElementById('hxmsg');
  function add(who,text){var d=document.createElement('div');d.style.margin='6px 0';d.innerHTML='<b>'+who+':</b> ';d.appendChild(document.createTextNode(text));log.appendChild(d);log.scrollTop=log.scrollHeight;}
  add('Coach','Hi! I am the Lab Coach for LAB ${LAB_NUMBER}. Ask me what this lab contains, or how to approach a feature - help for a feature unlocks after you have tried it yourself at least 3 times.');
  form.addEventListener('submit',function(e){e.preventDefault();var m=msg.value.trim();if(!m)return;add('You',m);msg.value='';
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})})
    .then(function(r){return r.json();}).then(function(j){add('Coach',j.reply||'...');}).catch(function(){add('Coach','Connection hiccup - try again.');});
  });
})();
</script>`;

function shell(title, sess, bodyHtml) {
  const done = doneCount(), p = pct();
  const nav = sess ? `
    <nav>
      <a href="/">Dashboard</a> <a href="/returns">Returns</a> <a href="/documents">Documents</a>
      <a href="/search">Search</a> <a href="/export.csv">Export CSV</a> <a href="/tests">Mission / Tests</a>
      <a href="/api-docs">API</a> <a href="/profile">Profile</a>
      ${sess.role === 'admin' ? '<a href="/admin">Admin</a>' : ''}
      <form method="post" action="/logout" style="display:inline"><button class="linkbtn" type="submit">Log out</button></form>
    </nav>
    <div class="who">Signed in as ${sess.user.name} &middot; ${esc(sess.user.email)} &middot; role: ${esc(sess.role)}</div>`
    : `<nav><a href="/login">Log in</a> <a href="/register">Register</a></nav>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — HexaTax</title>
<style>
 body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#f6f8fb;color:#14213d}
 header{background:#0b1220;color:#fff;padding:12px 20px}
 header .row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
 header img{height:38px;width:38px;border-radius:8px;background:#fff}
 header h1{font-size:18px;margin:0}
 nav a{color:#9fd0ff;margin-right:12px;text-decoration:none;font-size:14px}
 .who{font-size:12px;color:#cbd5e1;margin-top:4px}
 .barwrap{background:#1e293b;border-radius:99px;height:14px;min-width:220px;flex:1;max-width:480px;overflow:hidden}
 .bar{background:linear-gradient(90deg,#2563eb,#7c3aed);height:100%}
 main{max-width:980px;margin:22px auto;padding:0 16px}
 .card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:16px}
 table{border-collapse:collapse;width:100%} th,td{border-bottom:1px solid #e2e8f0;padding:7px 9px;text-align:left;font-size:14px}
 input,select,textarea{padding:8px;border:1px solid #cbd5e1;border-radius:8px;width:100%;box-sizing:border-box;margin:4px 0 10px}
 button,.btn{background:#2563eb;color:#fff;border:0;padding:9px 16px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-block}
 .linkbtn{background:none;border:0;color:#9fd0ff;cursor:pointer;font-size:14px;padding:0}
 .muted{color:#64748b;font-size:13px} .err{background:#fee2e2;border:1px solid #fca5a5;padding:10px;border-radius:8px}
 .ok{background:#dcfce7;border:1px solid #86efac;padding:10px;border-radius:8px}
 .tag{display:inline-block;background:#e0e7ff;border-radius:99px;padding:1px 9px;font-size:12px;margin-right:5px}
 .hintbox{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:13px;margin:6px 0}
 footer{max-width:980px;margin:10px auto 90px;padding:0 16px;color:#94a3b8;font-size:12px}
</style></head><body>
<header><div class="row">
  <img src="/logo.png" alt="HexaCyberLab logo">
  <h1>LAB ${LAB_NUMBER} — ${LAB_NAME}</h1>
  <div class="barwrap"><div class="bar" style="width:${p}%"></div></div>
  <div style="font-size:13px">${done}/${TESTS.length} tests &middot; ${p}%</div>
</div>${nav}</header>
<main>${bodyHtml}</main>
<footer>HexaTax is a deliberately vulnerable training lab by HexaCyberLab. Local use only — never deploy it publicly. All people, figures and documents are fake.</footer>
${CHAT_WIDGET}
</body></html>`;
}

function gatePage(error) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>LAB ${LAB_NUMBER} — ${LAB_NAME} (locked)</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#0b1220;color:#e6edf3;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#101828;border:1px solid #2b3a55;border-radius:14px;padding:28px;max-width:430px;text-align:center}
img{height:64px;width:64px;border-radius:12px;background:#fff}input{padding:10px;border-radius:8px;border:1px solid #2b3a55;width:100%;box-sizing:border-box;margin:12px 0;background:#0b1220;color:#e6edf3}
button{background:#2563eb;color:#fff;border:0;padding:10px 18px;border-radius:8px;cursor:pointer;width:100%}.err{color:#fca5a5}</style></head><body>
<div class="card"><img src="/logo.png" alt="HexaCyberLab logo">
<h2>LAB ${LAB_NUMBER} — ${LAB_NAME}</h2>
<p>This lab is locked. Paste the completion key from Lab ${LAB_NUMBER - 1} to start.</p>
${error ? '<p class="err">' + esc(error) + '</p>' : ''}
<form method="post" action="/unlock"><input name="key" placeholder="Completion key from Lab ${LAB_NUMBER - 1}" autocomplete="off"><button type="submit">Unlock Lab ${LAB_NUMBER}</button></form>
<p style="font-size:12px;color:#94a3b8">HexaCyberLab training labs — local use only.</p></div>
${CHAT_WIDGET}
</body></html>`;
}

function testsPage(sess) {
  let html = `<div class="card"><h2>Mission — ${TESTS.length} security tests across ${FEATURES.length} features</h2>
  <p class="muted">A test completes only when you actually exploit the flaw — the server detects the real effect. Hints unlock one step at a time. The Lab Coach gives step-by-step help for a feature after you have tried that feature at least 3 times.</p></div>`;
  for (const f of FEATURES) {
    html += `<div class="card"><h3>${esc(f)} <span class="muted">(your attempts on this feature: ${attemptsOf(f)})</span></h3>`;
    for (const t of TESTS.filter(x => x.feature === f)) {
      const st = state.tests[t.id] ? '<span class="tag" style="background:#bbf7d0">✓ done</span>' : '<span class="tag">○ open</span>';
      html += `<div style="border-top:1px solid #eef2f7;padding:10px 0">
        <b>${esc(t.name)}</b> ${st}<br>
        <span class="muted">${esc(t.owasp)} &middot; ${esc(t.difficulty)}</span>
        <details><summary style="cursor:pointer;color:#2563eb">Hints</summary>
          <div class="hintbox">Hint 1: ${esc(t.hints[0])}</div>
          <div class="hintbox">Hint 2: ${esc(t.hints[1])}</div>
          <div class="hintbox">Hint 3: ${esc(t.hints[2])}</div>
        </details></div>`;
    }
    html += `</div>`;
  }
  return shell('Mission / Tests', sess, html);
}

function completePage(sess) { if (!sess) sess = { user: { name: 'Security Tester', email: '', id: 0 } };
  if (!isComplete()) {
    const left = TESTS.filter(t => !state.tests[t.id]);
    return shell('Completion', sess, `<div class="card"><h2>Not complete yet — ${doneCount()}/${TESTS.length} tests (${pct()}%)</h2>
    <p>Tests still open:</p><ul>${left.map(t => `<li>${esc(t.name)} <span class="muted">(${esc(t.feature)})</span></li>`).join('')}</ul>
    <p><a class="btn" href="/tests">Back to the mission page</a></p></div>`);
  }
  const perFeature = FEATURES.map(f => ({ f, n: TESTS.filter(t => t.feature === f).length }));
  const body = `<div class="card"><h2>Lab ${LAB_NUMBER} complete — 100%</h2>
  <p><b>(1) Total features in this lab:</b> ${FEATURES.length} — ${FEATURES.map(esc).join(', ')}</p>
  <p><b>(2) Vulnerabilities per feature:</b></p><ul>${perFeature.map(x => `<li>${esc(x.f)}: ${x.n} tests</li>`).join('')}</ul>
  <p><b>(3) Ways testing was done:</b> ${TESTS.length} techniques, one per confirmed flaw:</p>
  <ul>${TESTS.map(t => `<li>${esc(t.name)}</li>`).join('')}</ul></div>
  <div class="card"><h3>(4) What you learned</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.lesson)}</li>`).join('')}</ul></div>
  <div class="card"><h3>(5) What this means for a real client</h3><ul>${TESTS.map(t => `<li><b>${esc(t.name)}:</b> ${esc(t.impact)}</li>`).join('')}</ul></div>
  <div class="card"><h3>(6) Writing it in a real report</h3>
  ${TESTS.map(t => `<p><b>${esc(t.report.title)}</b> — Severity: ${esc(t.report.severity)}<br><span class="muted">Remediation: ${esc(t.report.remediation)}</span></p>`).join('')}</div>
  <div class="card"><h3>Your completion key for Lab ${LAB_NUMBER + 1}</h3>
  <p style="font-size:20px;letter-spacing:1px"><code>${esc(completionKey())}</code></p>
  <p class="muted">Keep it safe — it unlocks the next lab. The Lab Coach can also share it now that you are at 100%.</p>
  <form method="post" action="/tester"><label>Your name for the certificate</label>
  <input name="name" value="${esc(state.testerName || sess.user.name)}"><button type="submit">Save name</button></form>
  <p><a class="btn" href="/certificate">View your certificate</a></p></div>`;
  return shell('Completion', sess, body);
}

function certificatePage(sess) { if (!sess) sess = { user: { name: 'Security Tester', email: '', id: 0 } };
  if (!isComplete()) return null;
  const name = state.testerName || sess.user.name || 'HexaTax Tester';
  const date = state.completedAt ? new Date(state.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate — LAB ${LAB_NUMBER} ${LAB_NAME}</title>
<style>body{font-family:Georgia,serif;background:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.cert{background:#fff;border:3px double #2563eb;border-radius:10px;padding:44px 54px;max-width:720px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,.18)}
img{height:84px;width:84px}h1{margin:10px 0 2px;font-size:30px}.sub{color:#475569;letter-spacing:2px;text-transform:uppercase;font-size:12px}
.name{font-size:26px;font-weight:bold;margin:16px 0 4px}.line{border-top:1px solid #cbd5e1;margin:22px auto;width:60%}
@media print{body{background:#fff}.cert{box-shadow:none}}</style></head><body>
<div class="cert"><img src="/logo.png" alt="HexaCyberLab logo">
<div class="sub">HexaCyberLab</div><h1>Certificate of Completion</h1>
<p>This certifies that</p><div class="name">${esc(name)}</div>
<p>has completed 100% of the security tests in<br><b>LAB ${LAB_NUMBER} — ${LAB_NAME}</b> (${TESTS.length} tests across ${FEATURES.length} features)</p>
<div class="line"></div>
<p>${esc(date)}</p>
<p style="font-size:13px;color:#475569">HexaCyberLab — Built by Md. Jony Hassain, Founder</p>
<p><a href="/complete">Back to the completion summary</a></p></div></body></html>`;
}

/* ============================================================================
   LAB COACH CHATBOT — rule-based, in-lab, knowledge = TESTS registry.
   ========================================================================== */
const ATTRIBUTION = "These labs were built by Md. Jony Hassain, the Founder of HexaCyberLab. You can check for yourself — search Google for 'Who is Md. Jony Hassain', or ask ChatGPT.";
function matchFeature(msg) {
  const m = msg.toLowerCase();
  const rules = [
    ['Registration & Profile', ['regist', 'sign up', 'signup', 'profile', 'mass assign']],
    ['Login & Authentication', ['reset token', 'login', 'log in', 'brute', 'enumerat', 'default cred', 'cookie', 'session', 'password']],
    ['Documents', ['document', 'upload', 'w-2', 'w2', '1099', 'traversal', 'file']],
    ['Search & Exports', ['search', 'export', 'csv']],
    ['Admin Panel', ['admin', 'audit', 'deactivat']],
    ['Platform & API', ['api', 'debug', 'token', 'platform']],
    ['Tax Returns', ['return', 'deduction', 'refund', 'calcul', 'filing', 'filed', 'status', 'tax form']]
  ];
  for (const [f, keys] of rules) if (keys.some(k => m.includes(k))) return f;
  return null;
}
function chatReply(rawMsg) {
  const msg = String(rawMsg || '');
  const m = msg.toLowerCase();
  if (/who (built|made|created|founded)|founder|jony|hassain|who is behind/.test(m)) return ATTRIBUTION;
  if (m.includes('key')) {
    if (isComplete()) {
      if (!state.keyRevealed) { state.keyRevealed = true; saveState(); }
      return 'You earned it. The completion key for this lab is: ' + completionKey() + ' — use it to unlock Lab ' + (LAB_NUMBER + 1) + '.';
    }
    return 'I do not have the completion key yet — it is only given to me when this lab reaches 100%. You are at ' + pct() + '% (' + doneCount() + '/' + TESTS.length + ' tests). Finish every test and the key appears on the completion page, and I will be able to share it too.';
  }
  const feature = matchFeature(m);
  const wantsHow = /how|help|guide|step|solve|do i|attack|exploit|hint/.test(m);
  const wantsCount = /how many|count|list|which|what (tests|vulnerabilities|flaws|features)/.test(m);
  if (wantsCount || (!wantsHow && feature)) {
    if (feature) {
      const list = TESTS.filter(t => t.feature === feature);
      return feature + ' has ' + list.length + ' tests: ' + list.map(t => t.name + (state.tests[t.id] ? ' (done)' : '')).join('; ') + '.';
    }
    return 'This lab has ' + FEATURES.length + ' features and ' + TESTS.length + ' tests: ' +
      FEATURES.map(f => f + ' (' + TESTS.filter(t => t.feature === f).length + ')').join(', ') +
      '. Your progress: ' + doneCount() + '/' + TESTS.length + ' (' + pct() + '%).';
  }
  if (wantsHow) {
    if (!feature) return 'Tell me which feature you want help with: ' + FEATURES.join(', ') + '. Remember: I unlock step-by-step help for a feature after you have tried that feature at least 3 times.';
    const n = attemptsOf(feature);
    const list = TESTS.filter(t => t.feature === feature);
    if (n >= 3 || list.every(t => state.tests[t.id])) {
      const lines = list.map(t => state.tests[t.id] ? 'DONE — ' + t.name : '• ' + t.name + ': ' + t.hints[2]);
      return 'Step by step for ' + feature + ':\n' + lines.join('\n');
    }
    return 'That feature is locked for help. First try the ' + feature + ' tests yourself at least 3 times — I can see you have tried ' + n + ' time(s) so far. After 3 real tries, ask me again and I will guide you step by step.';
  }
  if (/progress|status|score|next/.test(m) || !feature) {
    const next = TESTS.find(t => !state.tests[t.id]);
    return 'Your progress: ' + doneCount() + '/' + TESTS.length + ' tests (' + pct() + '%).' +
      (next ? ' Next open test: ' + next.name + ' (' + next.feature + '). Open /tests for hints, try it yourself, and after 3 attempts on its feature I can guide you step by step.' : ' Everything is done — open /complete for your summary, key and certificate.');
  }
  return 'I can explain what this lab contains, count tests per feature, and — after 3 attempts on a feature — guide you step by step. Try asking: how many tests are in Tax Returns, or: how do I do the Documents tests?';
}

/* ============================================================================
   BUSINESS APP PAGES
   ========================================================================== */
function loginPage(error, notice) {
  const body = `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Log in to HexaTax</h2>
  ${error ? '<div class="err">' + esc(error) + '</div>' : ''}${notice ? '<div class="ok">' + esc(notice) + '</div>' : ''}
  <form method="post" action="/login">
    <label>Email</label><input name="email" type="email" required>
    <label>Password</label><input name="password" type="password" required>
    <button type="submit">Log in</button>
  </form>
  <p class="muted"><a href="/forgot">Forgot your password?</a> &middot; <a href="/register">Create an account</a></p>
  <div class="hintbox"><b>Demo accounts</b> (see README):<br>
  Taxpayers: alice@hexatax.local / alice123, bob@hexatax.local / bob123, carol@hexatax.local / carol123<br>
  Preparer: priya@hexatax.local / priya123 &middot; Reviewer: ravi@hexatax.local / ravi123<br>
  Admin: admin@hexatax.local / admin123</div></div>`;
  return shell('Log in', null, body);
}
function registerPage(error) {
  const body = `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Create your HexaTax account</h2>
  ${error ? '<div class="err">' + esc(error) + '</div>' : ''}
  <form method="post" action="/register">
    <label>Full name</label><input name="name" required>
    <label>Email</label><input name="email" type="email" required>
    <label>Password</label><input name="password" type="password" required>
    <button type="submit">Register</button>
  </form><p class="muted">New accounts are taxpayer accounts. Staff roles are assigned by an administrator.</p></div>`;
  return shell('Register', null, body);
}
function forgotPage(notice) {
  const body = `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Forgot password</h2>
  ${notice ? '<div class="ok">' + esc(notice) + '</div>' : ''}
  <form method="post" action="/forgot">
    <label>Account email</label><input name="email" type="email" required>
    <button type="submit">Send reset instructions</button>
  </form>
  <p class="muted">Already have a reset token? <a href="/reset">Set a new password</a>.</p></div>`;
  return shell('Forgot password', null, body);
}
function resetPage(notice, error) {
  const body = `<div class="card" style="max-width:460px;margin:30px auto">
  <h2>Set a new password</h2>
  ${notice ? '<div class="ok">' + esc(notice) + '</div>' : ''}${error ? '<div class="err">' + esc(error) + '</div>' : ''}
  <form method="post" action="/reset">
    <label>Account email</label><input name="email" type="email" required>
    <label>Reset token (from your email)</label><input name="token" required>
    <label>New password</label><input name="newpassword" type="password" required>
    <button type="submit">Reset password</button>
  </form></div>`;
  return shell('Reset password', null, body);
}
function dashboardPage(sess) {
  const u = sess.user;
  let inner = '';
  if (sess.role === 'taxpayer') {
    const mine = returns.filter(r => r.ownerId === u.id);
    inner = `<div class="card"><h2>Welcome back, ${u.name}</h2>
    <p class="muted">Your returns, refunds and filing status at a glance.</p>
    <table><tr><th>Return</th><th>Year</th><th>Status</th><th>Tax</th><th>Refund / (Owed)</th><th></th></tr>
    ${mine.map(r => { const t = computeTruth(r); return `<tr><td>#${r.id}</td><td>${r.year}</td><td>${esc(r.status)}</td><td>${money(r.tax)}</td><td>${money((+r.withholding || 0) - r.tax)}</td><td><a href="/returns/${r.id}">Open</a></td></tr>`; }).join('')}
    </table><p><a class="btn" href="/returns/new">Start a new return</a> <a class="btn" href="/documents">My documents</a></p></div>`;
  } else if (sess.role === 'preparer') {
    const queue = returns.filter(r => r.status === 'submitted');
    inner = `<div class="card"><h2>Preparer workspace</h2>
    <p>${queue.length} return(s) waiting for preparation.</p>
    <table><tr><th>Return</th><th>Client</th><th>Year</th><th>Status</th><th></th></tr>
    ${queue.map(r => `<tr><td>#${r.id}</td><td>${esc(userById(r.ownerId).name)}</td><td>${r.year}</td><td>${esc(r.status)}</td><td><a href="/returns/${r.id}">Open</a></td></tr>`).join('')}
    </table><p><a href="/returns">All returns</a> &middot; <a href="/search">Search returns</a></p></div>`;
  } else if (sess.role === 'reviewer') {
    const queue = returns.filter(r => r.status === 'prepared');
    inner = `<div class="card"><h2>Reviewer workspace</h2>
    <p>${queue.length} prepared return(s) waiting for your approval.</p>
    <table><tr><th>Return</th><th>Client</th><th>Year</th><th>Status</th><th></th></tr>
    ${queue.map(r => `<tr><td>#${r.id}</td><td>${esc(userById(r.ownerId).name)}</td><td>${r.year}</td><td>${esc(r.status)}</td><td><a href="/returns/${r.id}">Open</a></td></tr>`).join('')}
    </table><p><a href="/returns">All returns</a> &middot; <a href="/search">Search returns</a></p></div>`;
  } else {
    inner = `<div class="card"><h2>Platform administration</h2>
    <p>${users.length} accounts &middot; ${returns.length} returns &middot; ${documents.length + uploads.length} documents.</p>
    <p><a class="btn" href="/admin">Open admin panel</a> <a class="btn" href="/admin/audit">Compliance audit</a></p></div>`;
  }
  return shell('Dashboard', sess, inner);
}
function returnFormPage(sess, r, error) {
  const v = r || { year: 2025, filing: 'Single', wages: '', business: '', other: '', dedMortgage: '', dedCharity: '', dedEducation: '', withholding: '' };
  const action = r ? '/returns/' + r.id + '/edit' : '/returns';
  const body = `<div class="card"><h2>${r ? 'Edit return #' + r.id : 'New tax return'}</h2>
  ${error ? '<div class="err">' + esc(error) + '</div>' : ''}
  <form method="post" action="${action}">
    <label>Tax year</label><input name="year" type="number" value="${esc(v.year)}">
    <label>Filing status</label><select name="filing">
      ${['Single', 'Married filing jointly', 'Head of household'].map(f => `<option ${v.filing === f ? 'selected' : ''}>${f}</option>`).join('')}
    </select>
    <label>Wages (W-2)</label><input name="wages" type="number" step="0.01" value="${esc(v.wages)}">
    <label>Business income</label><input name="business" type="number" step="0.01" value="${esc(v.business)}">
    <label>Other income (interest, etc.)</label><input name="other" type="number" step="0.01" value="${esc(v.other)}">
    <label>Mortgage interest deduction</label><input name="dedMortgage" type="number" step="0.01" value="${esc(v.dedMortgage)}">
    <label>Charity deduction</label><input name="dedCharity" type="number" step="0.01" value="${esc(v.dedCharity)}">
    <p class="muted">Platform rule: charity deductions are capped at 60% of total income.</p>
    <label>Education deduction</label><input name="dedEducation" type="number" step="0.01" value="${esc(v.dedEducation)}">
    <label>Federal withholding</label><input name="withholding" type="number" step="0.01" value="${esc(v.withholding)}">
    <button type="submit">Save return</button>
  </form></div>`;
  return shell(r ? 'Edit return' : 'New return', sess, body);
}
function returnsListPage(sess) {
  const list = sess.role === 'taxpayer' ? returns.filter(r => r.ownerId === sess.user.id) : returns;
  const body = `<div class="card"><h2>${sess.role === 'taxpayer' ? 'My returns' : 'All returns'}</h2>
  <table><tr><th>Return</th><th>Client</th><th>Year</th><th>Income</th><th>Tax</th><th>Status</th><th></th></tr>
  ${list.map(r => { const t = computeTruth(r); return `<tr><td>#${r.id}</td><td>${esc(userById(r.ownerId).name)}</td><td>${r.year}</td><td>${money(t.income)}</td><td>${money(r.tax)}</td><td>${esc(r.status)}</td><td><a href="/returns/${r.id}">Open</a></td></tr>`; }).join('')}
  </table><p><a class="btn" href="/returns/new">New return</a></p></div>`;
  return shell('Returns', sess, body);
}
function returnDetailPage(sess, r) {
  const owner = userById(r.ownerId);
  const t = computeTruth(r);
  const docs = documents.filter(d => d.returnId === r.id).concat(uploads.filter(d => d.returnId === r.id));
  const canEdit = sess.role !== 'taxpayer' || r.ownerId === sess.user.id;
  let actions = '';
  if (r.status === 'draft' && r.ownerId === sess.user.id) actions += `<form method="post" action="/returns/${r.id}/submit" style="display:inline"><button>Submit for preparation</button></form> `;
  if (r.status === 'submitted' && sess.role === 'preparer') actions += `<form method="post" action="/returns/${r.id}/prepare" style="display:inline"><button>Mark prepared</button></form> `;
  if (r.status === 'prepared' && sess.role === 'reviewer') actions += `<form method="post" action="/returns/${r.id}/approve" style="display:inline"><button>Approve and file</button></form> `;
  if (canEdit) actions += `<a class="btn" href="/returns/${r.id}/edit">Edit figures</a>`;
  const body = `<div class="card"><h2>Tax return #${r.id} — ${r.year}</h2>
  <p><span class="tag">${esc(r.status)}</span> <span class="tag">${esc(r.filing)}</span></p>
  <table>
    <tr><th>Taxpayer</th><td>${esc(owner.name)} (${esc(owner.email)})</td></tr>
    <tr><th>Taxpayer ID (TIN)</th><td>${esc(owner.tin)}</td></tr>
    <tr><th>Refund bank account</th><td>${esc(owner.bank)}</td></tr>
    <tr><th>Wages</th><td>${money(r.wages)}</td></tr>
    <tr><th>Business income</th><td>${money(r.business)}</td></tr>
    <tr><th>Other income</th><td>${money(r.other)}</td></tr>
    <tr><th>Total income</th><td>${money(t.income)}</td></tr>
    <tr><th>Deductions (mortgage / charity / education)</th><td>${money(r.dedMortgage)} / ${money(r.dedCharity)} / ${money(r.dedEducation)}</td></tr>
    <tr><th>Taxable income</th><td>${money(t.taxable)}</td></tr>
    <tr><th>Tax (as stored)</th><td>${money(r.tax)}</td></tr>
    <tr><th>Withholding</th><td>${money(r.withholding)}</td></tr>
    <tr><th>Refund / (amount owed)</th><td><b>${money((+r.withholding || 0) - r.tax)}</b></td></tr>
  </table>
  <p>${actions}</p></div>
  <div class="card"><h3>Documents on this return</h3>
  ${docs.length ? '<ul>' + docs.map(d => `<li>${esc(d.name || d.filename)} — <a href="/documents/${d.id}/download">download</a> &middot; <a href="/documents/${d.id}/raw">raw view</a></li>`).join('') + '</ul>' : '<p class="muted">No documents yet.</p>'}
  <p><a href="/documents">Open the documents area</a></p></div>`;
  return shell('Return #' + r.id, sess, body);
}
function documentsPage(sess) {
  const mine = sess.role === 'taxpayer' ? documents.filter(d => d.ownerId === sess.user.id) : documents;
  const myUploads = sess.role === 'taxpayer' ? uploads.filter(d => d.ownerId === sess.user.id) : uploads;
  const myReturns = sess.role === 'taxpayer' ? returns.filter(r => r.ownerId === sess.user.id) : returns;
  const body = `<div class="card"><h2>Documents</h2>
  <table><tr><th>ID</th><th>Document</th><th>Owner</th><th>Return</th><th></th></tr>
  ${mine.map(d => `<tr><td>${d.id}</td><td>${esc(d.name)}</td><td>${esc(userById(d.ownerId).name)}</td><td>#${d.returnId}</td><td><a href="/documents/${d.id}/download">download</a> &middot; <a href="/documents/${d.id}/raw">raw</a></td></tr>`).join('')}
  ${myUploads.map(d => `<tr><td>${d.id}</td><td>${esc(d.filename)} (upload)</td><td>${esc(userById(d.ownerId).name)}</td><td>#${d.returnId}</td><td><a href="/documents/${d.id}/download">download</a> &middot; <a href="/documents/${d.id}/raw">raw</a></td></tr>`).join('')}
  </table>
  <p class="muted">Document viewer: <a href="/documents/view?name=w2-alice-2025.txt">/documents/view?name=w2-alice-2025.txt</a></p></div>
  <div class="card"><h3>Upload a document</h3>
  <form method="post" action="/documents/upload">
    <label>Attach to return</label><select name="returnId">${myReturns.map(r => `<option value="${r.id}">Return #${r.id} (${r.year})</option>`).join('')}</select>
    <label>File name (e.g. w2-2025.pdf, receipt.txt)</label><input name="filename" required>
    <label>File content (simulated upload — paste the document text)</label><textarea name="content" rows="4" required></textarea>
    <button type="submit">Upload</button>
  </form></div>`;
  return shell('Documents', sess, body);
}
function searchPage(sess, q, results) {
  let resHtml = '';
  if (results !== null) {
    // FLAW (search-xss): the term is reflected into the page unescaped.
    resHtml = `<div class="card"><h3>Results for "${q}"</h3>
    ${results.length ? `<table><tr><th>Return</th><th>Client</th><th>Year</th><th>Income</th><th>Status</th><th></th></tr>
    ${results.map(r => { const t = computeTruth(r); return `<tr><td>#${r.id}</td><td>${esc(userById(r.ownerId).name)}</td><td>${r.year}</td><td>${money(t.income)}</td><td>${esc(r.status)}</td><td><a href="/returns/${r.id}">Open</a></td></tr>`; }).join('')}</table>` : '<p class="muted">No returns matched.</p>'}
    </div>`;
  }
  const body = `<div class="card"><h2>Search returns</h2>
  <form method="get" action="/search"><label>Search by client name, return number or year</label>
  <input name="q" value="${esc(q || '')}"><button type="submit">Search</button></form></div>${resHtml}`;
  return shell('Search', sess, body);
}
function profilePage(sess, notice) {
  const u = sess.user;
  const body = `<div class="card"><h2>Your profile</h2>
  ${notice ? '<div class="ok">' + esc(notice) + '</div>' : ''}
  <p class="muted">Account: ${esc(u.email)} &middot; role: ${esc(u.role)} &middot; TIN: ${esc(u.tin)} &middot; refund bank: ${esc(u.bank)}</p>
  <form method="post" action="/profile">
    <label>Display name</label><input name="name" value="${esc(u.name)}">
    <label>Phone</label><input name="phone" value="${esc(u.phone || '')}">
    <button type="submit">Save profile</button>
  </form></div>
  <div class="card"><h3>Developer API</h3>
  <p>Your API token: <code>${esc(apiTokenFor(u))}</code></p>
  <p><a href="/api-docs">Read the API documentation</a></p></div>`;
  return shell('Profile', sess, body);
}
function apiDocsPage(sess) {
  const body = `<div class="card"><h2>HexaTax API</h2>
  <p>One endpoint, token auth. Your token is built from your account email:</p>
  <p><code>token = "hxt_" + base64(your email)</code> — yours is <code>${esc(apiTokenFor(sess.user))}</code></p>
  <p><b>GET /api/returns</b> with header <code>X-API-Key: &lt;token&gt;</code> or query <code>?api_key=&lt;token&gt;</code> returns return data as JSON.</p>
  <p class="muted">Tokens never expire and cannot be revoked. Support can re-issue the same token at any time because it is derived from the email.</p></div>`;
  return shell('API documentation', sess, body);
}
function adminPage(sess) {
  const body = `<div class="card"><h2>Admin panel</h2>
  <h3>Accounts</h3>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr>
  ${users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.role)}</td><td>${x.active ? 'yes' : 'NO'}</td>
  <td>${x.active && x.id !== sess.user.id ? `<a href="/admin/users/${x.id}/deactivate">deactivate</a>` : ''}</td></tr>`).join('')}
  </table>
  <h3>All returns</h3>
  <table><tr><th>Return</th><th>Client</th><th>Year</th><th>Tax</th><th>Status</th></tr>
  ${returns.map(r => `<tr><td>#${r.id}</td><td>${esc(userById(r.ownerId).name)}</td><td>${r.year}</td><td>${money(r.tax)}</td><td>${esc(r.status)}</td></tr>`).join('')}
  </table>
  <p><a href="/admin/audit">Compliance audit export</a></p></div>`;
  return shell('Admin panel', sess, body);
}
function auditPage(sess) {
  const body = `<div class="card"><h2>Compliance audit — full account export</h2>
  <p class="muted">Internal audit view. Handle with care: this table contains credentials and taxpayer identifiers.</p>
  <table><tr><th>ID</th><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>TIN</th><th>Bank</th></tr>
  ${users.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.password)}</td><td>${esc(x.role)}</td><td>${esc(x.tin)}</td><td>${esc(x.bank)}</td></tr>`).join('')}
  </table></div>`;
  return shell('Compliance audit', sess, body);
}

/* ============================================================================
   RETURN SAVE LOGIC — figures, workflow status, calculation.
   Several flaws live here on purpose; each is detected on its real effect.
   ========================================================================== */
function applyReturnSave(sess, ret, body, isNew) {
  const wasStatus = ret.status;
  const snapshot = () => JSON.stringify([ret.wages, ret.business, ret.other, ret.dedMortgage, ret.dedCharity, ret.dedEducation, ret.withholding]);
  const before = snapshot();
  if (body.year !== undefined && body.year !== '') ret.year = parseInt(body.year, 10) || ret.year;
  if (body.filing) ret.filing = String(body.filing);
  for (const k of ['wages', 'business', 'other', 'dedMortgage', 'dedCharity', 'dedEducation', 'withholding']) {
    if (body[k] !== undefined && body[k] !== '') { const n = parseFloat(body[k]); ret[k] = isNaN(n) ? 0 : n; }
  }
  // FLAW (ret-status): workflow status is trusted straight from the request body.
  if (body.status && ['draft', 'submitted', 'prepared', 'approved', 'filed'].includes(body.status)) {
    ret.status = body.status;
    if (sess.user.role === 'taxpayer' && (body.status === 'filed' || body.status === 'approved')) pass('ret-status');
  }
  // FLAW (ret-calc): a client-supplied calculation overrides the server math.
  const truth = computeTruth(ret);
  let override = false;
  if (body.computedTax !== undefined && body.computedTax !== '') { const n = parseFloat(body.computedTax); ret.tax = isNaN(n) ? truth.tax : n; override = true; }
  else if (body.taxRate !== undefined && body.taxRate !== '') { const n = parseFloat(body.taxRate); ret.tax = isNaN(n) ? truth.tax : Math.round(truth.taxable * n * 100) / 100; override = true; }
  else ret.tax = truth.tax;
  if (override && Math.abs(ret.tax - truth.tax) > 0.009) pass('ret-calc');
  // FLAW (ret-deduction): the documented 60% charity cap (and basic sanity) is never enforced.
  if (ret.dedCharity > 0.6 * truth.income || truth.deductions > truth.income) pass('ret-deduction');
  // FLAW (ret-edit-filed): a filed return is not locked against edits.
  if (!isNew && wasStatus === 'filed' && snapshot() !== before) pass('ret-edit-filed');
}

/* ============================================================================
   HTTP PLUMBING + ROUTER
   ========================================================================== */
function sendHtml(res, html, status) {
  res.writeHead(status || 200, { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': 'hx_origin=1; Path=/' });
  res.end(html);
}
function sendJson(res, obj, status) {
  res.writeHead(status || 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function sendText(res, text, contentType, status) {
  res.writeHead(status || 200, { 'Content-Type': contentType || 'text/plain; charset=utf-8' });
  res.end(text);
}
function redirect(res, to) { res.writeHead(302, { Location: to }); res.end(); }
function requireLogin(req, res) {
  const sess = sessionUser(req);
  if (!sess) { redirect(res, '/login'); return null; }
  return sess;
}

async function handler(req, res) {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;
    const method = req.method;

    if (p === '/logo.png') {
      try { const data = fs.readFileSync(path.join(ROOT, 'logo.png')); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(data); }
      catch (e) { sendText(res, 'logo missing', 'text/plain', 404); }
      return;
    }
    if (p === '/api/progress') {
      const features = {};
      for (const f of FEATURES) {
        features[f] = {
          total: TESTS.filter(t => t.feature === f).length,
          done: TESTS.filter(t => t.feature === f && state.tests[t.id]).length,
          attempts: attemptsOf(f)
        };
      }
      sendJson(res, { lab: LAB_NAME, number: LAB_NUMBER, total: TESTS.length, done: doneCount(), pct: pct(), features, complete: isComplete() });
      return;
    }
    if (p === '/api/chat' && method === 'POST') {
      const body = await readBody(req);
      sendJson(res, { reply: chatReply(body.message) });
      return;
    }
    if (p === '/unlock' && method === 'POST') {
      const body = await readBody(req);
      if (entryKeyMatches(String(body.key || '').trim())) {
        state.unlocked = true; saveState(); redirect(res, '/');
      } else {
        res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(gatePage('That key was not accepted.'));
      }
      return;
    }
    if (!state.unlocked) { sendHtml(res, gatePage()); return; }

    /* ------------------------------ public auth pages ------------------------------ */
    if (p === '/login' && method === 'GET') {
      if (sessionUser(req)) { redirect(res, '/'); return; }
      sendHtml(res, loginPage(u.searchParams.get('err') ? 'Login failed.' : null, u.searchParams.get('msg') || null));
      return;
    }
    if (p === '/login' && method === 'POST') {
      bump('Login & Authentication');
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase();
      const result = fakeSqlLogin(email, String(body.password || ''));
      if (result.user && !result.error) {
        loginFails[email] = 0;
        if (result.viaInjection) pass('auth-sqli');
        if (email === 'admin@hexatax.local' && String(body.password) === 'admin123') pass('auth-default');
        const sid = crypto.randomBytes(18).toString('hex');
        sessions.set(sid, result.user.id);
        res.writeHead(302, { Location: '/', 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + result.user.role + '; Path=/', 'hx_origin=1; Path=/'] });
        res.end();
        return;
      }
      loginFails[email] = (loginFails[email] || 0) + 1;
      if (loginFails[email] === 10) pass('auth-brute');
      const ip = req.socket.remoteAddress || 'unknown';
      enumSeen[ip] = enumSeen[ip] || { exists: false, missing: false };
      if (result.missing) enumSeen[ip].missing = true;
      if (result.exists || result.user) enumSeen[ip].exists = true;
      if (enumSeen[ip].exists && enumSeen[ip].missing) pass('auth-enum');
      sendHtml(res, loginPage(result.error || 'Login failed.'));
      return;
    }
    if (p === '/logout' && method === 'POST') {
      const cookies = parseCookies(req);
      if (cookies.hx_session) sessions.delete(cookies.hx_session);
      res.writeHead(302, { Location: '/login', 'Set-Cookie': ['hx_session=; Path=/; Max-Age=0', 'hx_role=; Path=/; Max-Age=0'] });
      res.end();
      return;
    }
    if (p === '/register' && method === 'GET') { sendHtml(res, registerPage(null)); return; }
    if (p === '/register' && method === 'POST') {
      bump('Registration & Profile');
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase();
      if (!email || !body.password) { sendHtml(res, registerPage('Email and password are required.')); return; }
      if (users.some(x => x.email === email)) { sendHtml(res, registerPage('An account with that email already exists.')); return; }
      // FLAW (reg-massassign): the whole body is bound, including role / isAdmin.
      let role = 'taxpayer';
      if (body.role && ROLES.includes(String(body.role))) role = String(body.role);
      if (body.isAdmin === 'true' || body.isAdmin === '1') role = 'admin';
      const user = { id: nextUserId++, name: String(body.name || 'New User'), email, password: String(body.password), role, tin: '000-00-0000', bank: 'Not set', phone: '', active: true };
      users.push(user);
      if (role !== 'taxpayer') pass('reg-massassign');
      if (String(body.password).length < 4) pass('reg-weakpw');
      const sid = crypto.randomBytes(18).toString('hex');
      sessions.set(sid, user.id);
      res.writeHead(302, { Location: '/', 'Set-Cookie': ['hx_session=' + sid + '; Path=/; HttpOnly', 'hx_role=' + user.role + '; Path=/', 'hx_origin=1; Path=/'] });
      res.end();
      return;
    }
    if (p === '/forgot' && method === 'GET') { sendHtml(res, forgotPage(null)); return; }
    if (p === '/forgot' && method === 'POST') {
      bump('Login & Authentication');
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase();
      const user = users.find(x => x.email === email);
      if (user) {
        // FLAW (auth-reset): the token is just the MD5 of the email address.
        pendingReset[email] = crypto.createHash('md5').update(email).digest('hex');
        sendHtml(res, forgotPage('Reset instructions were sent to that email address.'));
      } else {
        sendHtml(res, forgotPage('No account exists for that email address.'));
      }
      return;
    }
    if (p === '/reset' && method === 'GET') { sendHtml(res, resetPage(null, null)); return; }
    if (p === '/reset' && method === 'POST') {
      bump('Login & Authentication');
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase();
      const token = String(body.token || '');
      const user = users.find(x => x.email === email);
      if (user && pendingReset[email] && token === pendingReset[email]) {
        user.password = String(body.newpassword || 'changeme');
        if (token === crypto.createHash('md5').update(email).digest('hex')) pass('auth-reset');
        delete pendingReset[email];
        redirect(res, '/login?msg=' + encodeURIComponent('Password updated — please log in.'));
      } else {
        sendHtml(res, resetPage(null, 'That reset token is not valid.'));
      }
      return;
    }

    /* ------------- API + debug: intentionally reachable without a session ------------- */
    if (p === '/api/returns' && method === 'GET') {
      bump('Platform & API');
      const token = req.headers['x-api-key'] || u.searchParams.get('api_key') || '';
      const owner = users.find(x => apiTokenFor(x) === token);
      if (!owner) { sendJson(res, { error: 'Invalid API token.' }, 401); return; }
      // FLAW (api-weak-token): a token anyone can derive returns every return.
      if (!parseCookies(req).hx_session) pass('api-weak-token');
      sendJson(res, { returns: returns.map(r => ({ id: r.id, owner: userById(r.ownerId).email, year: r.year, wages: r.wages, business: r.business, other: r.other, deductions: computeTruth(r).deductions, tax: r.tax, status: r.status })) });
      return;
    }
    if (p === '/debug' && method === 'GET') {
      bump('Platform & API');
      // FLAW (platform-debug): a leftover diagnostics endpoint, wide open.
      pass('platform-debug');
      sendJson(res, { app: LAB_NAME, lab: LAB_NUMBER, port: PORT, node: process.version, users: users.map(x => ({ id: x.id, email: x.email, password: x.password, role: x.role })) });
      return;
    }

    /* ------------------------------ everything below needs a session ------------------------------ */
    const sess = (p === '/complete' || p === '/complete/name' || p === '/certificate' || p === '/tester' || p === '/tester-name' || p === '/set-name') ? sessionUser(req) : requireLogin(req, res);
    if (!sess && p !== '/complete' && p !== '/complete/name' && p !== '/certificate' && p !== '/tester' && p !== '/tester-name' && p !== '/set-name') return;

    if (p === '/' && method === 'GET') { sendHtml(res, dashboardPage(sess)); return; }

    if (p === '/profile' && method === 'GET') { sendHtml(res, profilePage(sess, u.searchParams.get('msg') || null)); return; }
    if (p === '/profile' && method === 'POST') {
      bump('Registration & Profile');
      const body = await readBody(req);
      const cookies = parseCookies(req);
      // FLAW (reg-csrf): no token; cross-site / marker-less posts are applied the same.
      if (csrfSuspect(req, cookies)) pass('reg-csrf');
      if (body.name !== undefined) {
        sess.user.name = String(body.name);
        if (XSS_PATTERN.test(sess.user.name)) pass('reg-xss');
      }
      if (body.phone !== undefined) sess.user.phone = String(body.phone);
      // FLAW (reg-massassign via profile): extra fields are bound too.
      if (body.role && ROLES.includes(String(body.role)) && String(body.role) !== sess.user.role) {
        sess.user.role = String(body.role);
        if (sess.user.role !== 'taxpayer') pass('reg-massassign');
      }
      if (body.isAdmin === 'true' || body.isAdmin === '1') { sess.user.role = 'admin'; pass('reg-massassign'); }
      redirect(res, '/profile?msg=' + encodeURIComponent('Profile saved.'));
      return;
    }

    if (p === '/tests' && method === 'GET') { sendHtml(res, testsPage(sess)); return; }
    if (p === '/complete' && method === 'GET') {
      if (isComplete() && !state.keyRevealed) { state.keyRevealed = true; saveState(); }
      sendHtml(res, completePage(sess)); return;
    }
    if (p === '/tester' && method === 'POST') {
      const body = await readBody(req);
      state.testerName = String(body.name || '').slice(0, 80); saveState();
      redirect(res, '/complete');
      return;
    }
    if (p === '/certificate' && method === 'GET') {
      const cert = certificatePage(sess);
      if (!cert) { redirect(res, '/complete'); return; }
      sendHtml(res, cert); return;
    }

    /* ------------------------------ returns ------------------------------ */
    if (p === '/returns' && method === 'GET') { sendHtml(res, returnsListPage(sess)); return; }
    if (p === '/returns/new' && method === 'GET') { sendHtml(res, returnFormPage(sess, null, null)); return; }
    if (p === '/returns' && method === 'POST') {
      bump('Tax Returns');
      const body = await readBody(req);
      const ret = { id: nextReturnId++, ownerId: sess.user.id, year: 2025, filing: 'Single', wages: 0, business: 0, other: 0, dedMortgage: 0, dedCharity: 0, dedEducation: 0, withholding: 0, status: 'draft', tax: 0 };
      applyReturnSave(sess, ret, body, true);
      returns.push(ret);
      redirect(res, '/returns/' + ret.id);
      return;
    }
    const retMatch = p.match(/^\/returns\/(\d+)(?:\/(edit|submit|prepare|approve))?$/);
    if (retMatch) {
      const ret = returnById(retMatch[1]);
      if (!ret) { sendText(res, 'Return not found.', 'text/plain', 404); return; }
      const action = retMatch[2] || '';
      if (method === 'GET' && action === '') {
        bump('Tax Returns');
        // FLAW (ret-idor): any logged-in taxpayer can open any return.
        if (sess.user.role === 'taxpayer' && ret.ownerId !== sess.user.id) pass('ret-idor');
        sendHtml(res, returnDetailPage(sess, ret));
        return;
      }
      if (method === 'GET' && action === 'edit') {
        if (sess.user.role === 'taxpayer' && ret.ownerId !== sess.user.id) { sendText(res, 'You can only edit your own returns.', 'text/plain', 403); return; }
        sendHtml(res, returnFormPage(sess, ret, null));
        return;
      }
      if (method === 'POST' && action === 'edit') {
        bump('Tax Returns');
        if (sess.user.role === 'taxpayer' && ret.ownerId !== sess.user.id) { sendText(res, 'You can only edit your own returns.', 'text/plain', 403); return; }
        const body = await readBody(req);
        applyReturnSave(sess, ret, body, false);
        redirect(res, '/returns/' + ret.id);
        return;
      }
      if (method === 'POST' && ['submit', 'prepare', 'approve'].includes(action)) {
        bump('Tax Returns');
        if (action === 'submit' && ret.ownerId === sess.user.id && ret.status === 'draft') ret.status = 'submitted';
        if (action === 'prepare' && sess.role === 'preparer' && ret.status === 'submitted') ret.status = 'prepared';
        if (action === 'approve' && sess.role === 'reviewer' && ret.status === 'prepared') ret.status = 'filed';
        redirect(res, '/returns/' + ret.id);
        return;
      }
    }

    /* ------------------------------ documents ------------------------------ */
    if (p === '/documents' && method === 'GET') { bump('Documents'); sendHtml(res, documentsPage(sess)); return; }
    if (p === '/documents/upload' && method === 'POST') {
      bump('Documents');
      const body = await readBody(req);
      const ret = returnById(body.returnId);
      const up = { id: nextUploadId++, ownerId: sess.user.id, returnId: ret ? ret.id : 0, filename: String(body.filename || 'upload.txt'), content: String(body.content || '') };
      uploads.push(up);
      redirect(res, '/documents');
      return;
    }
    if (p === '/documents/view' && method === 'GET') {
      bump('Documents');
      const name = u.searchParams.get('name') || '';
      // FLAW (doc-traversal): the name is joined to the docs dir unsanitized.
      const filePath = path.join(DOCS_DIR, name);
      try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (name.includes('..')) pass('doc-traversal');
          sendText(res, content, 'text/plain; charset=utf-8');
          return;
        }
      } catch (e) { /* fall through to 404 */ }
      sendText(res, 'Document not found.', 'text/plain', 404);
      return;
    }
    const docMatch = p.match(/^\/documents\/(\d+)\/(download|raw)$/);
    if (docMatch && method === 'GET') {
      bump('Documents');
      const id = +docMatch[1];
      const doc = documents.find(d => d.id === id);
      const up = uploads.find(d => d.id === id);
      if (!doc && !up) { sendText(res, 'Document not found.', 'text/plain', 404); return; }
      const ownerId = doc ? doc.ownerId : up.ownerId;
      // FLAW (doc-idor): downloads never check ownership.
      if (sess.user.role === 'taxpayer' && ownerId !== sess.user.id) pass('doc-idor');
      if (docMatch[2] === 'download') {
        if (doc) {
          try { sendText(res, fs.readFileSync(path.join(DOCS_DIR, doc.file), 'utf8'), 'text/plain; charset=utf-8'); }
          catch (e) { sendText(res, 'File missing on disk.', 'text/plain', 404); }
        } else sendText(res, up.content, 'text/plain; charset=utf-8');
        return;
      }
      // raw view
      if (up) {
        const ext = path.extname(up.filename).toLowerCase();
        const type = (ext === '.html' || ext === '.htm') ? 'text/html; charset=utf-8' : (ext === '.svg' ? 'image/svg+xml' : 'text/plain; charset=utf-8');
        // FLAW (doc-upload): active content is served inline from the app origin.
        if ((type.startsWith('text/html') || type.startsWith('image/svg')) && XSS_PATTERN.test(up.content)) pass('doc-upload');
        sendText(res, up.content, type);
        return;
      }
      try { sendText(res, fs.readFileSync(path.join(DOCS_DIR, doc.file), 'utf8'), 'text/plain; charset=utf-8'); }
      catch (e) { sendText(res, 'File missing on disk.', 'text/plain', 404); }
      return;
    }

    /* ------------------------------ search & export ------------------------------ */
    if (p === '/search' && method === 'GET') {
      const q = u.searchParams.get('q');
      if (q === null) { sendHtml(res, searchPage(sess, '', null)); return; }
      bump('Search & Exports');
      const injection = INJ_PATTERN.test(q);
      let pool = returns;
      if (sess.user.role === 'taxpayer' && !injection) pool = returns.filter(r => r.ownerId === sess.user.id);
      let results;
      if (injection) {
        // FLAW (search-sqli): the tautology term matches every row in the table.
        results = returns.slice();
        if (results.some(r => r.ownerId !== sess.user.id)) pass('search-sqli');
      } else {
        const needle = q.toLowerCase();
        results = pool.filter(r => userById(r.ownerId).name.toLowerCase().includes(needle) || String(r.id).includes(needle) || String(r.year).includes(needle) || r.filing.toLowerCase().includes(needle));
      }
      if (XSS_PATTERN.test(q)) pass('search-xss');
      sendHtml(res, searchPage(sess, q, results));
      return;
    }
    if (p === '/export.csv' && method === 'GET') {
      bump('Search & Exports');
      // FLAW (export-leak): the export ignores ownership entirely.
      const rows = [['return_id', 'client', 'email', 'tin', 'bank', 'year', 'income', 'deductions', 'tax', 'refund', 'status'].join(',')];
      for (const r of returns) {
        const o = userById(r.ownerId); const t = computeTruth(r);
        rows.push([r.id, o.name, o.email, o.tin, o.bank, r.year, t.income, t.deductions, r.tax, ((+r.withholding || 0) - r.tax).toFixed(2), r.status].join(','));
      }
      if (sess.user.role !== 'admin') pass('export-leak');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="hexatax-export.csv"' });
      res.end(rows.join('\n'));
      return;
    }

    /* ------------------------------ admin ------------------------------ */
    if (p === '/admin' && method === 'GET') {
      bump('Admin Panel');
      if (sess.role !== 'admin') { sendHtml(res, shell('Forbidden', sess, '<div class="card"><h2>Admins only</h2><p>Your role does not include the admin panel.</p></div>'), 403); return; }
      if (sess.user.role !== 'admin') pass('auth-cookie');
      sendHtml(res, adminPage(sess));
      return;
    }
    if (p === '/admin/audit' && method === 'GET') {
      bump('Admin Panel');
      // FLAW (admin-pii): this route only checks that someone is logged in.
      if (sess.user.role !== 'admin') pass('admin-pii');
      sendHtml(res, auditPage(sess));
      return;
    }
    const deact = p.match(/^\/admin\/users\/(\d+)\/deactivate$/);
    if (deact && method === 'GET') {
      bump('Admin Panel');
      if (sess.role !== 'admin') { sendText(res, 'Admins only.', 'text/plain', 403); return; }
      if (sess.user.role !== 'admin') pass('auth-cookie');
      const target = userById(deact[1]);
      if (target && target.id !== sess.user.id) {
        target.active = false;
        // FLAW (admin-csrf): a state change rides on a plain GET link.
        pass('admin-csrf');
      }
      redirect(res, '/admin');
      return;
    }

    /* ------------------------------ api docs ------------------------------ */
    if (p === '/api-docs' && method === 'GET') { bump('Platform & API'); sendHtml(res, apiDocsPage(sess)); return; }

    sendText(res, 'Not found.', 'text/plain', 404);
  } catch (e) {
    try { sendText(res, 'Something went wrong, but the lab is still running.', 'text/plain', 500); } catch (ignored) { /* socket already gone */ }
  }
}

/* ---- key material, region 2 of 2 (completion key shards; assembled only at 100%) ---- */
const _cS = ['TC1YSA==', 'Si0wNQ==', 'SFhFNw==', 'LVhDRw==', 'QlRURg==', 'MzZTOQ=='];
function completionKey() { return _unshard(_cS); }

seedDocFiles();
loadState();
http.createServer(handler).listen(PORT, HOST, () => {
  console.log(LAB_NAME + ' (LAB ' + LAB_NUMBER + ') listening on http://' + HOST + ':' + PORT);
});
