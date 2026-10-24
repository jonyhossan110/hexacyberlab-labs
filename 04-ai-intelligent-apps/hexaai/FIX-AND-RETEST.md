# HexaAI — Fix & Retest (LAB 31)

For every scored test: the secure implementation that closes the flaw, and the regression check that proves it stays closed. Retest method for all entries: repeat the original exploit from `PRACTICE-GUIDE.md` against the fixed build — it must fail — then run the feature's legitimate flow and confirm it still works.

## Login & Authentication

### Missing Brute-Force Protection on Login
- **Severity:** Medium · **Test:** Brute Force — No Login Throttling or Lockout (POST /login · POST /api/auth/login)
- **Fix:** Rate-limit login attempts per account and IP, add progressive delays/lockout, alert on repeated failures, require MFA.
- **Retest:** re-run the exploit for "Brute Force — No Login Throttling or Lockout" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Account Enumeration via Differential Login Responses
- **Severity:** Medium · **Test:** User Enumeration — Login Answers Differ for Real Accounts (POST /login · POST /api/auth/login)
- **Fix:** Return one generic invalid-credentials error for all failed logins, with identical timing and status codes.
- **Retest:** re-run the exploit for "User Enumeration — Login Answers Differ for Real Accounts" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## AI Chat & Prompt Security

### Prompt Injection — Confidential Instructions Disclosed via Instruction Override
- **Severity:** High · **Test:** Direct Prompt Injection — an Override Reveals the Escalation Codes (POST /api/chat)
- **Fix:** Never place secrets in prompts; enforce confidentiality in code (output filtering/DLP); treat the model as untrusted.
- **Retest:** re-run the exploit for "Direct Prompt Injection — an Override Reveals the Escalation Codes" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### System Prompt Leakage with Cross-Tenant Data in Shared Prompt Assembly
- **Severity:** High · **Test:** System Prompt Leakage — the Assembled Prompt Includes the Other Tenant’s Note (POST /api/chat)
- **Fix:** Assemble per-tenant context with strict isolation; keep secrets and cross-tenant data out of prompts; filter prompt fragments from output.
- **Retest:** re-run the exploit for "System Prompt Leakage — the Assembled Prompt Includes the Other Tenant’s Note" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Cross-Tenant Data Disclosure via Unscoped AI Context Feed
- **Severity:** High · **Test:** Cross-Tenant Disclosure — the "Live Context" Feed Narrates Both Companies (POST /api/chat (live context))
- **Fix:** Scope all context assembly per tenant; add cross-tenant fixtures and assertions to tests for every data source the model reads.
- **Retest:** re-run the exploit for "Cross-Tenant Disclosure — the "Live Context" Feed Narrates Both Companies" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Training-Data PII Regurgitation
- **Severity:** High · **Test:** Memorised PII — the Model Regurgitates Training Records Verbatim (POST /api/chat)
- **Fix:** De-identify and minimise training data; run extraction (canary) tests before release; add output-side PII detection.
- **Retest:** re-run the exploit for "Memorised PII — the Model Regurgitates Training Records Verbatim" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Premium Model Access Not Authorised Server-Side
- **Severity:** Medium · **Test:** Model Tampering — the Premium Model Is Chosen by a Client Parameter (POST /api/chat (model field))
- **Fix:** Authorise the requested model against the caller’s plan server-side on every request; apply identical context minimisation to all tiers.
- **Retest:** re-run the exploit for "Model Tampering — the Premium Model Is Chosen by a Client Parameter" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Stored XSS via Unencoded AI Output in Conversation Views
- **Severity:** High · **Test:** Improper Output Handling — Bot Output Rendered as Raw HTML (XSS via the Bot) (POST /api/chat · GET /conversations/:id)
- **Fix:** Render all model output with textContent / output encoding; sanitise if markup is ever required; add a CSP.
- **Retest:** re-run the exploit for "Improper Output Handling — Bot Output Rendered as Raw HTML (XSS via the Bot)" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### No Input Size or Token Budget Limits on AI Chat
- **Severity:** Medium · **Test:** Unbounded Consumption — Giant Prompts Accepted Without Any Limit (POST /api/chat)
- **Fix:** Enforce max prompt size and per-request token budgets; per-tenant cost quotas with alerting; rate-limit expensive modes.
- **Retest:** re-run the exploit for "Unbounded Consumption — Giant Prompts Accepted Without Any Limit" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## Documents, RAG & Files

### Cross-Tenant Retrieval in RAG (Missing Tenant Filter)
- **Severity:** High · **Test:** RAG Tenant Isolation Failure — Retrieval Has No Tenant Filter (POST /api/ask)
- **Fix:** Enforce tenant filters in the vector-store query; authorise every chunk per tenant; test retrieval with cross-tenant fixtures.
- **Retest:** re-run the exploit for "RAG Tenant Isolation Failure — Retrieval Has No Tenant Filter" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Broken Object-Level Authorisation on Documents and Chunks (IDOR)
- **Severity:** High · **Test:** Document & Chunk IDOR — Read Any Tenant’s Documents by ID (GET /api/documents/:id · /api/documents/:id/chunks · GET /documents/:id)
- **Fix:** Authorise document and chunk reads per tenant/owner on every request; use unguessable IDs as defence-in-depth.
- **Retest:** re-run the exploit for "Document & Chunk IDOR — Read Any Tenant’s Documents by ID" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Indirect Prompt Injection via Poisoned Knowledge Document
- **Severity:** High · **Test:** Indirect Prompt Injection — a Poisoned Document Hijacks Q&A Answers (POST /api/ask (seeded community FAQ))
- **Fix:** Strip/neutralise directive-shaped content in retrieved text; delimit data from instructions; moderate community submissions before indexing.
- **Retest:** re-run the exploit for "Indirect Prompt Injection — a Poisoned Document Hijacks Q&A Answers" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Indirect Prompt Injection in Summarisation of Untrusted Content
- **Severity:** Medium · **Test:** Indirect Prompt Injection — the Summariser Obeys the Page It Reads (POST /api/summarise)
- **Fix:** Treat fetched content as data only; strip comments and directive-shaped lines before processing; never let source text redefine the task.
- **Retest:** re-run the exploit for "Indirect Prompt Injection — the Summariser Obeys the Page It Reads" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Unrestricted File Upload (Type and Size) into the Document Store
- **Severity:** Medium · **Test:** Unrestricted Upload — Any File Type, Any Size, Straight into the Store (POST /api/documents · POST /documents)
- **Fix:** Allowlist file types, cap sizes, store uploads outside the app directory under generated names, scan content.
- **Retest:** re-run the exploit for "Unrestricted Upload — Any File Type, Any Size, Straight into the Store" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Path Traversal in Document Download
- **Severity:** High · **Test:** Path Traversal — the Download Endpoint Reads the App’s Own Files (GET /api/documents/download?name=)
- **Fix:** Resolve and prefix-check download paths (path.resolve + jail), serve files by ID from a registry, never by raw name.
- **Retest:** re-run the exploit for "Path Traversal — the Download Endpoint Reads the App’s Own Files" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## AI Agent Tools

### Agent Tool Missing Ownership Authorisation (Cross-Tenant Refund)
- **Severity:** Critical · **Test:** Excessive Agency — the Agent Refunds Another Company’s Order (POST /api/agent)
- **Fix:** Enforce per-tenant ownership inside every tool; require confirmation and dual control for irreversible financial actions.
- **Retest:** re-run the exploit for "Excessive Agency — the Agent Refunds Another Company’s Order" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Agent Refund Without Amount Cap or Approval Threshold
- **Severity:** Critical · **Test:** Excessive Agency — Refund Amounts Far Above the Order Value (POST /api/agent)
- **Fix:** Cap refunds at the order amount from server records; human approval above thresholds; full audit logging.
- **Retest:** re-run the exploit for "Excessive Agency — Refund Amounts Far Above the Order Value" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Agent Customer Lookup Without Tenant Scoping (Confidential Notes Exposed)
- **Severity:** High · **Test:** Excessive Agency — Customer Lookup Returns the Other Tenant’s Records (POST /api/agent)
- **Fix:** Scope lookups per tenant; exclude internal/secret fields from tool output; log all lookups.
- **Retest:** re-run the exploit for "Excessive Agency — Customer Lookup Returns the Other Tenant’s Records" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## Knowledge & Templates

### Unreviewed, Platform-Wide Knowledge Base Poisoning
- **Severity:** High · **Test:** Knowledge Poisoning — "Teach the Bot" Publishes into the Shared KB (POST /api/teach · POST /teach)
- **Fix:** Route suggestions through review/approval; scope knowledge per tenant by default; version and audit all knowledge changes.
- **Retest:** re-run the exploit for "Knowledge Poisoning — "Teach the Bot" Publishes into the Shared KB" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Cross-Tenant Template Injection into the System Prompt
- **Severity:** High · **Test:** Template Injection — a Shared Template Is Rendered into the System Role (POST /api/templates · POST /api/chat (template_id))
- **Fix:** Render templates into the user role only; scope template libraries per tenant; scan template bodies for directive-shaped text.
- **Retest:** re-run the exploit for "Template Injection — a Shared Template Is Rendered into the System Role" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## Ask Your Data (Analytics)

### Arbitrary SQL Execution via AI Analytics Feature
- **Severity:** Critical · **Test:** Output → SQL — "Ask Your Data" Executes Model-Written SQL (POST /api/ask-data)
- **Fix:** Fixed allow-listed parameterised queries only; read-only scoped DB role; validate generated queries against an AST allowlist.
- **Retest:** re-run the exploit for "Output → SQL — "Ask Your Data" Executes Model-Written SQL" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## Conversations

### Broken Object-Level Authorisation on Conversation History
- **Severity:** High · **Test:** Chat History IDOR — Any Conversation Readable by ID (GET /api/conversations/:id · GET /conversations/:id)
- **Fix:** Authorise conversation reads by owner (and tenant) on every fetch; unguessable IDs as defence-in-depth only.
- **Retest:** re-run the exploit for "Chat History IDOR — Any Conversation Readable by ID" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

## Platform, API & Supply Chain

### Uncapped Agent Loop (Unbounded Consumption)
- **Severity:** Medium · **Test:** Unbounded Consumption — the Deep-Research Loop Runs Exactly as Long as You Say (POST /api/research)
- **Fix:** Cap loop iterations and wall-clock; enforce per-tenant cost quotas and alerting on expensive modes.
- **Retest:** re-run the exploit for "Unbounded Consumption — the Deep-Research Loop Runs Exactly as Long as You Say" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### AI Provider Key Exposed in Client Code and Accepted as Authentication
- **Severity:** Critical · **Test:** Leaked AI Provider Key — Printed in Public JS, and the Key Alone Logs In (GET /developer · POST /api/chat (Authorization: Bearer))
- **Fix:** Keep provider keys server-side; separate API authentication from provider credentials; rotate and scope keys; log key usage.
- **Retest:** re-run the exploit for "Leaked AI Provider Key — Printed in Public JS, and the Key Alone Logs In" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Unverified AI Output Presented as Fact-Checked (Misinformation)
- **Severity:** Medium · **Test:** Misinformation — Compliance Summaries Stamped VERIFIED with Zero Checks (POST /api/compliance)
- **Fix:** Gate the VERIFIED label behind real source checking and human review; label AI summaries as unverified drafts.
- **Retest:** re-run the exploit for "Misinformation — Compliance Summaries Stamped VERIFIED with Zero Checks" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

### Unsigned Third-Party Pack Installed as System-Level Instructions
- **Severity:** High · **Test:** Supply Chain — a Plugin-Pack Import Installs a Persistent System Addendum (POST /api/packs/import · POST /packs/import)
- **Fix:** Vet and sign packs; install instructions at the lowest privilege (never system role); review diffs before activation; per-pack kill switch and audit trail.
- **Retest:** re-run the exploit for "Supply Chain — a Plugin-Pack Import Installs a Persistent System Addendum" — the server must no longer observe the effect (no pass, no leaked data, no state change); confirm the legitimate feature still works for authorised users.

