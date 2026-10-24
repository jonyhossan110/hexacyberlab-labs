# HexaRAG — Vulnerabilities (LAB 36)

The complete map of this lab: **25 scored tests across 6 features**. Every flaw below is a real, working vulnerability in the application, detected server-side when the exploit actually succeeds. HexaRAG is a retrieval-augmented generation platform — workspaces, document collections, simulated indexing/chunking, a query interface with simulated deterministic answers, API keys and shared collections.

## Login & Authentication

### SQL Injection Login Bypass
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /login (legacy query path)
- **Exploitation outline:** Submit the admin email with password ' OR '1'='1 — the evaluated WHERE clause becomes true and a session is issued.
- **Impact:** On a client RAG platform this means an attacker signs in as an administrator without any password and reads every indexed document.

### Brute Force — No Rate Limiting
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Fail 10 logins for one account; the 10th failure is still processed with no throttle.
- **Impact:** Attackers can grind through password lists against a client’s workspace owners until one works.

### User Enumeration via Login & Reset Responses
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login and POST /forgot
- **Exploitation outline:** Probe one existing and one non-existing email; the responses differ, confirming which accounts exist.
- **Impact:** Attackers confirm which client staff have accounts, then aim phishing and password spraying precisely at them.

### Default Demo Credentials Still Active
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /login
- **Exploitation outline:** Sign in as demo@hexarag.local / demo123 — the seeded demo account is active.
- **Impact:** Anyone on the internet can try the vendor demo login on a client deployment and walk into a live workspace.

### Predictable Password-Reset Token
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Intermediate
- **Location:** POST /reset
- **Exploitation outline:** Compute tok-<id>-<id*137+42> for a victim and reset their password without any email being sent.
- **Impact:** An attacker computes a reset token for the workspace owner and takes over the account — and every document in it.

### Role Cookie Tampering (Client-Side Role)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /admin with hx_role cookie
- **Exploitation outline:** Sign in as a normal user, set hx_role=admin, and the admin console opens.
- **Impact:** Any low-privilege user becomes platform admin by editing a cookie — full control of a client’s deployment.

## Registration & Profile

### Weak Password Policy (1-Character Passwords)
- **OWASP:** A07:2021 Authentication Failures
- **Difficulty:** Beginner
- **Location:** POST /register
- **Exploitation outline:** Register with a 1-character password — the account is created.
- **Impact:** Client workspaces fill with one-character and dictionary passwords that fall to the first guessing attempt.

### Mass Assignment — Role Set at Registration
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /register
- **Exploitation outline:** Submit role=admin with the registration; the created account has the admin role.
- **Impact:** Attackers register themselves as platform admins on a client deployment in a single request.

### Stored XSS in Display Name
- **OWASP:** A03:2021 Injection
- **Difficulty:** Beginner
- **Location:** POST /profile, viewed on GET /team
- **Exploitation outline:** Save a display name containing a script payload; it is stored and rendered unescaped.
- **Impact:** An attacker plants a script in a shared workspace that runs in teammates’ browsers — session theft and actions in their name.

### CSRF on Profile Update
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /profile
- **Exploitation outline:** Submit a profile change with a cross-site Origin (or no marker cookie); it is applied.
- **Impact:** A malicious page a client user visits can silently rewrite their profile — the classic stepping stone to account abuse.

## Collections & Documents

### Collection IDOR — Another Workspace’s Collection
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /collections/:id
- **Exploitation outline:** Open another workspace’s collection id while signed in; its documents are listed.
- **Impact:** One client workspace reads a competitor firm’s entire knowledge base by changing an id in the URL.

### Document IDOR — Read Another Workspace’s Document
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /documents/:id
- **Exploitation outline:** Open another workspace’s document id; full content and chunks are served.
- **Impact:** Confidential client documents — contracts, settlements, playbooks — leak to any authenticated user of another workspace.

### Cross-Workspace Document Deletion
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /documents/:id/delete
- **Exploitation outline:** Delete a document belonging to another workspace; it is removed.
- **Impact:** A malicious user deletes a client firm’s indexed documents, wiping their knowledge base.

### Path Traversal in File Download
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /download?file=
- **Exploitation outline:** Request ../server.js; the resolved path escapes the data folder and the source is served.
- **Impact:** Attackers read server source and configuration off a client deployment — the map to every other weakness.

### HTML Upload Served Inline (Stored XSS via File)
- **OWASP:** A03:2021 Injection
- **Difficulty:** Intermediate
- **Location:** POST /collections/:id/upload then GET /files/:name
- **Exploitation outline:** Upload an .html file containing a script; it is later served as text/html from the app origin.
- **Impact:** Attackers host phishing and script pages on the client’s own trusted domain, executed in signed-in users’ browsers.

## Retrieval & AI Answers

### Cross-Workspace Retrieval Leakage
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /query with collectionId
- **Exploitation outline:** Query another workspace’s collection; the generated answer cites its chunks as sources.
- **Impact:** This is the core RAG nightmare — a client asks a question and the AI answers from another client’s confidential documents.

### Poisoned Document Hijacks AI Answers
- **OWASP:** A03:2021 Injection
- **Difficulty:** Advanced
- **Location:** POST /collections/:id/upload then POST /query
- **Exploitation outline:** A document containing an [[INSTRUCTION: ...]] marker is indexed; a matching query makes the answer repeat the attacker text.
- **Impact:** Anyone who can add a document — a support vendor, a rogue employee — controls what the client’s AI tells customers.

### System Prompt Disclosure via Query Parameter
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /query?includeSystem=1 (JSON)
- **Exploitation outline:** Request a JSON answer with includeSystem=1; the internal system prompt is included in the response.
- **Impact:** Attackers learn exactly how the client’s assistant is instructed and which internal collections exist, then craft targeted extraction queries.

## API Keys & Sharing

### Guessable Share Links — Sequential Tokens
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /shared/:token
- **Exploitation outline:** Probe 5 distinct sequential share tokens within a minute; the pattern exposes other workspaces’ shared collections.
- **Impact:** Anyone can walk through a client’s shared collections — including the legal firm’s case files shared "temporarily".

### Read-Only API Key Can Index Documents
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** POST /api/documents with a read-scope key
- **Exploitation outline:** Index a new document using the read-only website-widget key; the write succeeds.
- **Impact:** A leaked read-only key — the kind embedded in public websites — becomes full write access to the client’s knowledge base.

### API Keys of Another Workspace Disclosed (BOLA)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /settings/api-keys?workspace=
- **Exploitation outline:** Request another workspace’s key list; full key secrets are returned.
- **Impact:** One workspace steals another firm’s API keys and can read or poison their index through the official API.

### Query Logs Expose Every Workspace’s Questions
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /settings/query-logs
- **Exploitation outline:** Open the log page as a normal member; entries from another workspace are shown.
- **Impact:** A law-firm client’s confidential questions ("settlement terms for Hartley") are visible to a different company’s staff.

## Admin & Platform

### User Deletion via GET (Admin CSRF)
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Intermediate
- **Location:** GET /admin/users/:id/delete
- **Exploitation outline:** Call the delete URL with a plain GET as an admin; the user is deleted.
- **Impact:** One malicious link opened by a platform admin deletes user accounts on the client’s deployment.

### Debug Endpoint Dumps Keys & System Prompt
- **OWASP:** A05:2021 Security Misconfiguration
- **Difficulty:** Beginner
- **Location:** GET /debug
- **Exploitation outline:** Open /debug as a non-admin user; API keys and the system prompt are returned.
- **Impact:** A single URL hands any user every API key and the assistant’s internal instructions on a client deployment.

### Unauthenticated API Document Read
- **OWASP:** A01:2021 Broken Access Control
- **Difficulty:** Beginner
- **Location:** GET /api/documents/:id
- **Exploitation outline:** Request a document’s chunks with no session and no API key; the content is returned.
- **Impact:** The internet can read indexed client documents through the API without any account at all.
