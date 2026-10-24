# HexaRAG — Fix & Retest Guide (LAB 36)

For every scored test: the secure implementation and the regression check that proves the fix. Retest method for all items: repeat the original exploit from PRACTICE-GUIDE.md — it must fail — then confirm the legitimate workflow still works.

## Login & Authentication

### SQL Injection in Legacy Login (Authentication Bypass) (Critical)
- **Fix:** Use parameterised queries everywhere; never concatenate user input into SQL.
- **Regression test:** Re-run the exploit (POST /login (legacy query path)). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Missing Brute-Force Protection on Login (High)
- **Fix:** Rate-limit and lock out after repeated failures; add MFA for owners/admins.
- **Regression test:** Re-run the exploit (POST /login). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Account Enumeration via Divergent Auth Responses (Medium)
- **Fix:** Return one generic message for all auth failures and reset requests.
- **Regression test:** Re-run the exploit (POST /login and POST /forgot). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Default Demo Account Enabled with Weak Password (High)
- **Fix:** Remove demo accounts from production; force unique credentials at setup.
- **Regression test:** Re-run the exploit (POST /login). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Predictable Password Reset Tokens (High)
- **Fix:** Generate reset tokens with a CSPRNG, expire them quickly, single use only.
- **Regression test:** Re-run the exploit (POST /reset). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Privilege Escalation via Role Stored in a Cookie (Critical)
- **Fix:** Keep roles in the server-side session; never trust client-supplied role values.
- **Regression test:** Re-run the exploit (GET /admin with hx_role cookie). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

## Registration & Profile

### No Minimum Password Strength Enforced (Medium)
- **Fix:** Enforce a minimum length and block common/breached passwords at registration.
- **Regression test:** Re-run the exploit (POST /register). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Mass Assignment Allows Self-Registration as Admin (Critical)
- **Fix:** Whitelist assignable fields server-side; set roles explicitly in code, never from input.
- **Regression test:** Re-run the exploit (POST /register). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Stored Cross-Site Scripting via Display Name (High)
- **Fix:** Context-encode all user content on output; add a Content-Security-Policy.
- **Regression test:** Re-run the exploit (POST /profile, viewed on GET /team). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Cross-Site Request Forgery on Profile Update (Medium)
- **Fix:** Require per-session CSRF tokens on all state-changing requests and verify Origin.
- **Regression test:** Re-run the exploit (POST /profile). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

## Collections & Documents

### Insecure Direct Object Reference on Collections (High)
- **Fix:** Authorise every object access against the session’s workspace.
- **Regression test:** Re-run the exploit (GET /collections/:id). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Insecure Direct Object Reference on Documents (High)
- **Fix:** Check document ownership on every read, including chunk/API responses.
- **Regression test:** Re-run the exploit (GET /documents/:id). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Missing Authorisation on Document Deletion (Cross-Tenant) (High)
- **Fix:** Authorise destructive actions against object ownership; log and confirm deletions.
- **Regression test:** Re-run the exploit (POST /documents/:id/delete). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Path Traversal in Download Endpoint (High)
- **Fix:** Resolve paths and verify they stay inside the intended directory; use allow-lists.
- **Regression test:** Re-run the exploit (GET /download?file=). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Unrestricted HTML Upload Served from Application Origin (High)
- **Fix:** Allow-list file types, serve uploads as attachments from a separate domain.
- **Regression test:** Re-run the exploit (POST /collections/:id/upload then GET /files/:name). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

## Retrieval & AI Answers

### Retrieval Returns Chunks from Other Tenants’ Collections (Critical)
- **Fix:** Filter retrieval strictly by the caller’s tenant/collection ACL before ranking chunks.
- **Regression test:** Re-run the exploit (POST /query with collectionId). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Indirect Prompt Injection via Indexed Document (High)
- **Fix:** Treat retrieved text as data, screen instruction-like content, and never let chunks override system behaviour.
- **Regression test:** Re-run the exploit (POST /collections/:id/upload then POST /query). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### System Prompt Exposed via Query API Parameter (Medium)
- **Fix:** Remove debug parameters from production; never return system prompts to clients.
- **Regression test:** Re-run the exploit (POST /query?includeSystem=1 (JSON)). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

## API Keys & Sharing

### Enumerable Public Share Tokens (High)
- **Fix:** Use cryptographically random share tokens (128-bit+) with expiry and revocation.
- **Regression test:** Re-run the exploit (GET /shared/:token). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### API Key Scope Not Enforced on Write Endpoint (High)
- **Fix:** Enforce key scopes server-side on every API route; deny by default.
- **Regression test:** Re-run the exploit (POST /api/documents with a read-scope key). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Broken Object-Level Authorisation Exposes Other Tenants’ API Keys (Critical)
- **Fix:** Scope every settings query to the session’s workspace; mask secrets after creation.
- **Regression test:** Re-run the exploit (GET /settings/api-keys?workspace=). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Cross-Tenant Exposure of Query Logs (High)
- **Fix:** Scope log views to the caller’s workspace and role; treat prompts as confidential data.
- **Regression test:** Re-run the exploit (GET /settings/query-logs). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

## Admin & Platform

### State-Changing GET Endpoint Deletes Users (CSRF) (High)
- **Fix:** Use POST/DELETE with CSRF tokens and confirmation for destructive admin actions.
- **Regression test:** Re-run the exploit (GET /admin/users/:id/delete). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Unauthenticated-Privilege Debug Endpoint Exposes Secrets (Critical)
- **Fix:** Remove debug routes from production or restrict them to admins with audit logging.
- **Regression test:** Re-run the exploit (GET /debug). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.

### Missing Authentication on API Document Endpoint (Critical)
- **Fix:** Require and validate authentication on every API route; deny by default.
- **Regression test:** Re-run the exploit (GET /api/documents/:id). Expected after fix: the attack no longer produces its effect and the corresponding lab test can no longer be passed on a fresh instance, while normal use of the feature still succeeds.
