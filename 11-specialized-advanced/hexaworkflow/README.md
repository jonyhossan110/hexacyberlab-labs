# HexaWorkflow — LAB 109

**Category 11: Specialized & Advanced Business Systems · Port 3118 · LOCAL USE ONLY**

HexaWorkflow is a deliberately vulnerable workflow-automation platform (workflows, triggers,
actions, run history, integrations/API keys, team workspaces, roles and templates) built for
hands-on web penetration-testing practice. It is one of the 110 HexaCyberLab training labs.

> ⚠️ **WARNING:** This application is intentionally insecure. It contains real, working
> vulnerabilities. Run it **only locally** (it binds 127.0.0.1), never on a public server,
> never with real data.

## Quick start

```bash
# Option A — plain Node (v18+, zero dependencies)
node server.js

# Option B — Docker
docker compose up --build
```

Then open <http://127.0.0.1:3118>.

## The lab system

- **Sequential unlock (gate):** the lab starts locked. Paste the **completion key you earned in
  Lab 108** to unlock it. The gate then stays lifted for this install.
- **Progress:** every solved test raises your score — `done / 26 tests` and a percentage are
  shown in the header of every page and at `GET /api/progress`. Tests pass **only** when the
  exploit actually succeeds server-side; there is no "mark done" button.
- **Mission Board (`/tests`):** all 26 scored tests grouped by feature, each with OWASP mapping,
  difficulty, per-feature attempt counts, and **3 graded hints** revealed one at a time.
- **Feature-complete coverage:** each feature carries every applicable technique. Login &
  Authentication alone covers SQLi bypass, brute force, user enumeration, published demo
  credentials, a predictable reset token, and role-cookie tampering — plus the business-specific
  flaws of an automation platform: cross-workspace workflow IDOR, running other workspaces'
  workflows, export leaks, run-log IDOR, private-template reuse, API-key exposure/rotation abuse,
  a webhook-tester SSRF, base64(email) API authentication, workspace role escalation, an open
  admin panel, CSRF on admin actions, and an unauthenticated debug dump.
- **Lab Coach (chat widget, bottom-right, `POST /api/chat`):** the coach knows the full test map
  and answers counts/names freely, but **step-by-step help for a feature unlocks only after you
  have genuinely tried that feature at least 3 times** (it quotes your real attempt count).
  The coach does not have the completion key until you finish the lab.
- **Persistence:** progress lives in `progress.json` in this folder (generated state — listed in
  `.gitignore`). Stop and restart the server any time; your percentage and attempts resume
  exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete`):** at 100% you get the full debrief — feature totals, per-feature
  vulnerability counts, how testing was done, what you learned, what each flaw means for a real
  client, and how to write each finding in a real pentest report — plus the **completion key**
  that unlocks Lab 110.
- **Certificate (`/certificate`):** a printable certificate card (with the HexaCyberLab logo)
  naming you, the lab, and the completion date.

## Test accounts (fake seed data)

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@hexaworkflow.local | admin123 | platform admin |
| Alice | alice@test.local | alice123 | editor, workspace 1 (Acme Ops) owner |
| Bob | bob@test.local | bob123 | editor, workspace 2 (Globex Labs) owner |
| Carol | carol@test.local | carol123 | viewer, workspace 1 member |
| Dave (demo) | dave@test.local | demo123 | viewer, workspace 2 member |

## Files

- `server.js` — the whole application (zero-dependency Node.js).
- `VULNERABILITIES.md` — the full vulnerability map (all 26 tests, generated from the registry).
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives (generated).
- `FIX-AND-RETEST.md` — secure implementation + regression test per finding (generated).
- `Dockerfile`, `docker-compose.yml` — one-command container setup.
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`, used on the certificate).

Regenerate the three docs after changing the test registry: `node server.js --gen-docs`.

## Completion keys

Keys are never stored whole anywhere in this package: each key exists only as encoded shards
scattered through `server.js` and is assembled in memory at verification/reveal time. The docs
describe the mechanism only — no key values or shards appear here.

---

HexaCyberLab — Built by Md. Jony Hassain, Founder. For authorized local training only.
