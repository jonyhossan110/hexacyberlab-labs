# HexaAI — Vulnerabilities Map (LAB 31)

HexaAI's scored registry: **26 tests across 8 features**. The tests expand the lab's original 18 vulnerability groups (OWASP Top 10 for LLM Applications, 2025) into individually scored, server-detected challenges, and add the platform-authentication coverage (brute force, user enumeration) the app exposes. Every test completes only when the server observes the real exploit effect — never by self-declaration. The original group map remains in `DESIGN.md` / `BUILD-TESTS.md` and the in-app `/lab-guide`.

## Login & Authentication

### Brute Force — No Login Throttling or Lockout
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Location:** POST /login · POST /api/auth/login
- **What it is:** Login endpoints need rate limiting, progressive delays and lockout/alerting; without them, password guessing is free and silent.
- **Impact:** Attackers can guess employee passwords at full speed until one works — then they own that account and everything it can reach.
- **Report title:** Missing Brute-Force Protection on Login (Medium)
- **Fix:** Rate-limit login attempts per account and IP, add progressive delays/lockout, alert on repeated failures, require MFA.

### User Enumeration — Login Answers Differ for Real Accounts
- **OWASP:** A07 Authentication Failures · **Difficulty:** Beginner · **Location:** POST /login · POST /api/auth/login
- **What it is:** Authentication errors must be identical whether or not the account exists; differing answers hand attackers a targeting list.
- **Impact:** An attacker first harvests which email addresses have accounts, then focuses password attacks only on real users.
- **Report title:** Account Enumeration via Differential Login Responses (Medium)
- **Fix:** Return one generic invalid-credentials error for all failed logins, with identical timing and status codes.

## AI Chat & Prompt Security

### Direct Prompt Injection — an Override Reveals the Escalation Codes
- **OWASP:** LLM01 Prompt Injection · **Difficulty:** Beginner · **Location:** POST /api/chat
- **What it is:** Instructions in a prompt are not a security boundary: anything the model can read, a persuasive user can make it say.
- **Impact:** A customer-facing bot can be talked into leaking the internal codes and notes it was configured with — by any customer, in plain language.
- **Report title:** Prompt Injection — Confidential Instructions Disclosed via Instruction Override (High)
- **Fix:** Never place secrets in prompts; enforce confidentiality in code (output filtering/DLP); treat the model as untrusted.

### System Prompt Leakage — the Assembled Prompt Includes the Other Tenant’s Note
- **OWASP:** LLM07 System Prompt Leakage · **Difficulty:** Beginner · **Location:** POST /api/chat
- **What it is:** Assume the system prompt WILL leak: it must contain no secrets and no other tenant’s data, ever.
- **Impact:** One tenant can extract the other tenant’s confidential handling notes simply by asking the bot to repeat its instructions.
- **Report title:** System Prompt Leakage with Cross-Tenant Data in Shared Prompt Assembly (High)
- **Fix:** Assemble per-tenant context with strict isolation; keep secrets and cross-tenant data out of prompts; filter prompt fragments from output.

### Cross-Tenant Disclosure — the "Live Context" Feed Narrates Both Companies
- **OWASP:** LLM02 Sensitive Information Disclosure · **Difficulty:** Beginner · **Location:** POST /api/chat (live context)
- **What it is:** Every context source fed to a model must be tenant-scoped at assembly time, exactly like a database query.
- **Impact:** Staff of one company can read the other company’s customers, orders and patient activity just by asking the support bot.
- **Report title:** Cross-Tenant Data Disclosure via Unscoped AI Context Feed (High)
- **Fix:** Scope all context assembly per tenant; add cross-tenant fixtures and assertions to tests for every data source the model reads.

### Memorised PII — the Model Regurgitates Training Records Verbatim
- **OWASP:** LLM02 Sensitive Information Disclosure · **Difficulty:** Beginner · **Location:** POST /api/chat
- **What it is:** Models memorise their training data: raw PII in training sets becomes PII the model will repeat to anyone who asks.
- **Impact:** Customer card details and patient diagnoses baked into training data can be extracted verbatim by ordinary users.
- **Report title:** Training-Data PII Regurgitation (High)
- **Fix:** De-identify and minimise training data; run extraction (canary) tests before release; add output-side PII detection.

### Model Tampering — the Premium Model Is Chosen by a Client Parameter
- **OWASP:** LLM02 Sensitive Information Disclosure (Broken Access Control) · **Difficulty:** Beginner · **Location:** POST /api/chat (model field)
- **What it is:** Entitlements must be authorised server-side on every request; hiding an option in the UI is not access control.
- **Impact:** Free-plan customers can use the paid premium model at will — and its larger context exposes more internal data.
- **Report title:** Premium Model Access Not Authorised Server-Side (Medium)
- **Fix:** Authorise the requested model against the caller’s plan server-side on every request; apply identical context minimisation to all tiers.

### Improper Output Handling — Bot Output Rendered as Raw HTML (XSS via the Bot)
- **OWASP:** LLM05 Improper Output Handling · **Difficulty:** Intermediate · **Location:** POST /api/chat · GET /conversations/:id
- **What it is:** Model output is untrusted input everywhere it lands — above all in HTML, where it must be encoded as text.
- **Impact:** An attacker stores a script inside a chat transcript; any staff member who opens that conversation runs it in their browser.
- **Report title:** Stored XSS via Unencoded AI Output in Conversation Views (High)
- **Fix:** Render all model output with textContent / output encoding; sanitise if markup is ever required; add a CSP.

### Unbounded Consumption — Giant Prompts Accepted Without Any Limit
- **OWASP:** LLM10 Unbounded Consumption · **Difficulty:** Beginner · **Location:** POST /api/chat
- **What it is:** AI endpoints need input-size limits and per-request token budgets, or cost itself becomes the denial-of-service.
- **Impact:** Anyone with a login can burn thousands of dollars of AI usage with oversized prompts — no cap ever pushes back.
- **Report title:** No Input Size or Token Budget Limits on AI Chat (Medium)
- **Fix:** Enforce max prompt size and per-request token budgets; per-tenant cost quotas with alerting; rate-limit expensive modes.

## Documents, RAG & Files

### RAG Tenant Isolation Failure — Retrieval Has No Tenant Filter
- **OWASP:** LLM08 Vector and Embedding Weaknesses · **Difficulty:** Beginner · **Location:** POST /api/ask
- **What it is:** Vector-store queries need tenant metadata filters enforced in the query itself — embeddings are tenant data.
- **Impact:** One company can question the other company’s internal playbooks and clinical protocols through the friendly Q&A box.
- **Report title:** Cross-Tenant Retrieval in RAG (Missing Tenant Filter) (High)
- **Fix:** Enforce tenant filters in the vector-store query; authorise every chunk per tenant; test retrieval with cross-tenant fixtures.

### Document & Chunk IDOR — Read Any Tenant’s Documents by ID
- **OWASP:** LLM08 Vector and Embedding Weaknesses · **Difficulty:** Beginner · **Location:** GET /api/documents/:id · /api/documents/:id/chunks · GET /documents/:id
- **What it is:** Every object read must be authorised against the caller’s tenant; sequential IDs make missing checks trivially enumerable.
- **Impact:** All internal documents of every customer company can be downloaded one ID at a time by any signed-in user.
- **Report title:** Broken Object-Level Authorisation on Documents and Chunks (IDOR) (High)
- **Fix:** Authorise document and chunk reads per tenant/owner on every request; use unguessable IDs as defence-in-depth.

### Indirect Prompt Injection — a Poisoned Document Hijacks Q&A Answers
- **OWASP:** LLM01 Prompt Injection · **Difficulty:** Intermediate · **Location:** POST /api/ask (seeded community FAQ)
- **What it is:** Retrieved content is data, never instructions — unreviewed content must never reach the model as directive-shaped text.
- **Impact:** An attacker plants one document and every customer asking about that topic is sent to a phishing page by the company’s own bot.
- **Report title:** Indirect Prompt Injection via Poisoned Knowledge Document (High)
- **Fix:** Strip/neutralise directive-shaped content in retrieved text; delimit data from instructions; moderate community submissions before indexing.

### Indirect Prompt Injection — the Summariser Obeys the Page It Reads
- **OWASP:** LLM01 Prompt Injection · **Difficulty:** Intermediate · **Location:** POST /api/summarise
- **What it is:** Any feature that feeds outside text to a model inherits prompt injection — fetching and summarising is an attack surface.
- **Impact:** Attackers hide instructions in web pages and documents so the company’s own summariser publishes the attacker’s words as its output.
- **Report title:** Indirect Prompt Injection in Summarisation of Untrusted Content (Medium)
- **Fix:** Treat fetched content as data only; strip comments and directive-shaped lines before processing; never let source text redefine the task.

### Unrestricted Upload — Any File Type, Any Size, Straight into the Store
- **OWASP:** LLM08 Vector and Embedding Weaknesses · **Difficulty:** Beginner · **Location:** POST /api/documents · POST /documents
- **What it is:** Uploads need allowlisted types, size caps, generated filenames and storage outside the app directory.
- **Impact:** Attackers can plant executables and oversized files on the server through a feature meant for text playbooks.
- **Report title:** Unrestricted File Upload (Type and Size) into the Document Store (Medium)
- **Fix:** Allowlist file types, cap sizes, store uploads outside the app directory under generated names, scan content.

### Path Traversal — the Download Endpoint Reads the App’s Own Files
- **OWASP:** LLM08 / CWE-22 Path Traversal · **Difficulty:** Beginner · **Location:** GET /api/documents/download?name=
- **What it is:** User input must never name a filesystem path; resolve paths and jail them to the intended directory.
- **Impact:** Anyone can read the application’s configuration and source code off the server, harvesting the secrets inside.
- **Report title:** Path Traversal in Document Download (High)
- **Fix:** Resolve and prefix-check download paths (path.resolve + jail), serve files by ID from a registry, never by raw name.

## AI Agent Tools

### Excessive Agency — the Agent Refunds Another Company’s Order
- **OWASP:** LLM06 Excessive Agency · **Difficulty:** Beginner · **Location:** POST /api/agent
- **What it is:** AI tools must enforce the same authorisation as the UI: the model proposes, code disposes.
- **Impact:** A support agent (or anyone steering the bot) can move money out of another company’s accounts by conversation alone.
- **Report title:** Agent Tool Missing Ownership Authorisation (Cross-Tenant Refund) (Critical)
- **Fix:** Enforce per-tenant ownership inside every tool; require confirmation and dual control for irreversible financial actions.

### Excessive Agency — Refund Amounts Far Above the Order Value
- **OWASP:** LLM06 Excessive Agency · **Difficulty:** Beginner · **Location:** POST /api/agent
- **What it is:** Financial tools need hard caps tied to server-side records, not numbers parsed from a conversation.
- **Impact:** A single persuasive chat can refund a hundred times what a customer ever paid — direct, immediate financial loss.
- **Report title:** Agent Refund Without Amount Cap or Approval Threshold (Critical)
- **Fix:** Cap refunds at the order amount from server records; human approval above thresholds; full audit logging.

### Excessive Agency — Customer Lookup Returns the Other Tenant’s Records
- **OWASP:** LLM06 Excessive Agency · **Difficulty:** Beginner · **Location:** POST /api/agent
- **What it is:** Lookup tools leak whatever they can reach; scope them to the caller’s tenant and minimise returned fields.
- **Impact:** Patient records and confidential internal notes are one friendly question away from a competitor’s support desk.
- **Report title:** Agent Customer Lookup Without Tenant Scoping (Confidential Notes Exposed) (High)
- **Fix:** Scope lookups per tenant; exclude internal/secret fields from tool output; log all lookups.

## Knowledge & Templates

### Knowledge Poisoning — "Teach the Bot" Publishes into the Shared KB
- **OWASP:** LLM04 Data and Model Poisoning · **Difficulty:** Beginner · **Location:** POST /api/teach · POST /teach
- **What it is:** Knowledge changes are code changes for an AI’s behaviour: they need review, scoping and audit, not instant global publish.
- **Impact:** One malicious lesson rewrites the policy every customer of every company hears — including an attacker’s contact address.
- **Report title:** Unreviewed, Platform-Wide Knowledge Base Poisoning (High)
- **Fix:** Route suggestions through review/approval; scope knowledge per tenant by default; version and audit all knowledge changes.

### Template Injection — a Shared Template Is Rendered into the System Role
- **OWASP:** LLM01 Prompt Injection · **Difficulty:** Intermediate · **Location:** POST /api/templates · POST /api/chat (template_id)
- **What it is:** User-controlled content must never be rendered into the system role; templates are data and belong in the user/context channel.
- **Impact:** One company can silently rewrite how the bot answers another company’s customers — a second-order injection that persists.
- **Report title:** Cross-Tenant Template Injection into the System Prompt (High)
- **Fix:** Render templates into the user role only; scope template libraries per tenant; scan template bodies for directive-shaped text.

## Ask Your Data (Analytics)

### Output → SQL — "Ask Your Data" Executes Model-Written SQL
- **OWASP:** LLM05 Improper Output Handling · **Difficulty:** Beginner · **Location:** POST /api/ask-data
- **What it is:** Never execute model-produced SQL against real data; let the model choose between fixed, parameterised, allow-listed queries.
- **Impact:** Any user can dump the entire user database — emails and password hashes — through a chat box labelled analytics.
- **Report title:** Arbitrary SQL Execution via AI Analytics Feature (Critical)
- **Fix:** Fixed allow-listed parameterised queries only; read-only scoped DB role; validate generated queries against an AST allowlist.

## Conversations

### Chat History IDOR — Any Conversation Readable by ID
- **OWASP:** LLM02 Sensitive Information Disclosure · **Difficulty:** Beginner · **Location:** GET /api/conversations/:id · GET /conversations/:id
- **What it is:** Conversation reads must be authorised by owner and tenant on every fetch; transcripts inherit every leak the bot ever made.
- **Impact:** Private support conversations — and any secrets the bot revealed in them — are readable by every other user.
- **Report title:** Broken Object-Level Authorisation on Conversation History (High)
- **Fix:** Authorise conversation reads by owner (and tenant) on every fetch; unguessable IDs as defence-in-depth only.

## Platform, API & Supply Chain

### Unbounded Consumption — the Deep-Research Loop Runs Exactly as Long as You Say
- **OWASP:** LLM10 Unbounded Consumption · **Difficulty:** Beginner · **Location:** POST /api/research
- **What it is:** Agent loops need hard iteration caps, wall-clock limits and per-tenant budgets enforced in code.
- **Impact:** One API call can run up hundreds of dollars of AI spend; scripted, it is a financial denial-of-service.
- **Report title:** Uncapped Agent Loop (Unbounded Consumption) (Medium)
- **Fix:** Cap loop iterations and wall-clock; enforce per-tenant cost quotas and alerting on expensive modes.

### Leaked AI Provider Key — Printed in Public JS, and the Key Alone Logs In
- **OWASP:** LLM02 Sensitive Information Disclosure · **Difficulty:** Beginner · **Location:** GET /developer · POST /api/chat (Authorization: Bearer)
- **What it is:** Provider keys live server-side only, and must never double as user credentials; the API needs its own auth.
- **Impact:** Anyone who views a public page owns a master credential that impersonates an admin on the chat API.
- **Report title:** AI Provider Key Exposed in Client Code and Accepted as Authentication (Critical)
- **Fix:** Keep provider keys server-side; separate API authentication from provider credentials; rotate and scope keys; log key usage.

### Misinformation — Compliance Summaries Stamped VERIFIED with Zero Checks
- **OWASP:** LLM09 Misinformation · **Difficulty:** Beginner · **Location:** POST /api/compliance
- **What it is:** A verification label must be earned by an actual verification pipeline; AI summaries are unverified drafts until then.
- **Impact:** False claims can be laundered into verified marketing copy, exposing the company to regulators and customer harm.
- **Report title:** Unverified AI Output Presented as Fact-Checked (Misinformation) (Medium)
- **Fix:** Gate the VERIFIED label behind real source checking and human review; label AI summaries as unverified drafts.

### Supply Chain — a Plugin-Pack Import Installs a Persistent System Addendum
- **OWASP:** LLM03 Supply Chain · **Difficulty:** Intermediate · **Location:** POST /api/packs/import · POST /packs/import
- **What it is:** Third-party AI extensions are supply chain: vet and sign them, install at lowest privilege, and keep a kill switch.
- **Impact:** One imported helper pack permanently bends every customer conversation of the company toward the attacker’s site.
- **Report title:** Unsigned Third-Party Pack Installed as System-Level Instructions (High)
- **Fix:** Vet and sign packs; install instructions at the lowest privilege (never system role); review diffs before activation; per-pack kill switch and audit trail.

## The lab system around the flaws

- **Sequential unlock:** LAB 31 opens only with LAB 30's completion key (entered on the lock gate). Finishing all 26 tests reveals LAB 31's own completion key on `/complete` — it unlocks LAB 32. Keys exist in `server.js` only as encoded shards, assembled at runtime; no key value appears in any file.
- **Progress:** solved tests raise the lab percentage; state persists in `progress.json` across restarts.
- **Lab Coach:** the in-app chatbot knows every test by name; step-by-step help for a feature unlocks only after ≥3 genuine attempts on that feature.
- **Standing note:** the seeded accounts are *documented in the README and on the login page* — in a real report, "default/documented credentials" is itself a critical finding. That is deliberate here: this is a lab, and the printed passwords are how you get in.
