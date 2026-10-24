# HexaRAG — LAB 36 (Category 4: AI & Intelligent Applications)

A deliberately vulnerable **RAG (retrieval-augmented generation) platform** for hands-on web security training: workspaces (tenants), document collections, document indexing with simulated chunking, a query/chat interface with **simulated deterministic retrieval + answers (no real model calls)**, API keys with scopes, public share links, query logs and an admin console — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

> ⚠️ **Local-only training lab.** It contains deliberate vulnerabilities. Run it only on your own machine / lab network. Never deploy it publicly.

## Run it

```bash
node server.js          # → http://127.0.0.1:3045
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only. Binds `127.0.0.1:3045`.

## The lab system

- **Sequential unlock:** this is Lab 36. It starts locked — paste the **completion key from Lab 35** on the gate to open it. Wrong keys are rejected.
- **Progress:** 25 scored security tests across 6 features. The header bar and `/api/progress` show your percentage; progress grows only when an exploit **actually succeeds** (detected server-side, never by self-declaring).
- **`/tests` — Mission page:** every test grouped by feature, with OWASP mapping, difficulty, status, per-feature attempt counts, and **3 graded hints** per test.
- **Lab Coach chatbot:** knows the whole map. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** (it quotes your real attempt count). It never reveals the completion key before 100%.
- **Persistence:** state lives in `progress.json` (generated at runtime, safe to delete to reset the lab). Progress, unlock state and attempts survive restarts.
- **Completion:** at 100%, `/complete` shows a six-section debrief (features, per-feature counts, techniques used, lessons, client impact, and how to write each finding in a real pentest report), reveals the **Lab 37 completion key**, and `/certificate` renders a printable certificate with the HexaCyberLab logo.
- **Keys** are never stored in plain text anywhere: they exist only as transformed shards scattered through `server.js` and are assembled in memory only at the unlock/reveal moment.

## Test accounts (seeded)

| Account | Password | Role |
|---|---|---|
| admin@hexarag.local | Admin123! | Platform admin |
| sarah@acme.io | sarah123 | Acme Support — workspace owner |
| tom@acme.io | tom12345 | Acme Support — member |
| lee@nova.io | lee12345 | NovaLegal — workspace owner |
| demo@hexarag.local | demo123 | Demo member |

Seeded API keys are visible on the in-app **API Keys** page.

## Coverage (25 tests, 6 features)

- **Login & Authentication (6):** SQLi login bypass, brute force, user enumeration, default demo credentials, predictable reset token, role-cookie tampering.
- **Registration & Profile (4):** weak password policy, mass assignment to admin, stored XSS in display name, profile CSRF.
- **Collections & Documents (5):** collection IDOR, document IDOR, cross-workspace document deletion, download path traversal, HTML upload served inline.
- **Retrieval & AI Answers (3):** cross-workspace retrieval leakage, poisoned document hijacking answers (indirect prompt injection), system-prompt disclosure.
- **API Keys & Sharing (4):** sequential share-token enumeration, read-key scope abuse, API-key BOLA across workspaces, cross-tenant query-log exposure.
- **Admin & Platform (3):** user deletion via GET (admin CSRF), debug endpoint secret dump, unauthenticated API document read.

Full map: `VULNERABILITIES.md` · Challenges & hints: `PRACTICE-GUIDE.md` · Fixes & regression tests: `FIX-AND-RETEST.md`.

## Files

`server.js` (the whole app + lab system) · `logo.png` (real HexaCyberLab logo, served at `/logo.png`) · `data/` (seeded + uploaded files) · `Dockerfile`, `docker-compose.yml` · `progress.json` is generated state (git-ignored).

## Reset

Stop the server and delete `progress.json`, then start again — the lab returns to its locked, 0% state.
