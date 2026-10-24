# HexaExpense — LAB 50 of 110

**Category 5: Finance, Payments & Insurance** · HexaCyberLab vulnerable practice labs

HexaExpense is a complete, deliberately vulnerable **expense-management platform**:
two tenant companies, employees with managers and finance staff, expense claims with
receipt records, a manager-approval workflow, reimbursement payments, category
budgets and policy limits, reports with CSV export, and a receipt file vault.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally insecure. It binds to
> 127.0.0.1 and must never be deployed on a public network or with real data.

## Run it

```bash
node server.js            # http://127.0.0.1:3059
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## The lab system

- **Sequential unlock:** this lab starts locked. Paste the **completion key from
  Lab 49** to open it. Keys are never stored in plain form anywhere in this folder —
  they exist only as encoded fragments inside the code and are assembled at runtime.
- **Progress:** 26 scored tests across 9 features. Tests complete only when the real
  exploit succeeds (detected server-side) — there is no "mark done" button. The
  header shows your live score, and `/api/progress` exposes it as JSON.
- **Mission page (`/tests`):** every test with its OWASP mapping, difficulty, status,
  per-feature attempt counter, and **3 graded hints**.
- **Lab Coach chatbot:** ask about progress or test counts any time. Step-by-step
  guidance for a feature unlocks only after **≥ 3 genuine attempts** on that feature
  (the coach quotes your real attempt count). The coach receives the completion key
  only when the lab hits 100%.
- **Persistence:** state lives in `progress.json` (generated at runtime — delete it
  to reset the lab). Progress, attempts and the unlock survive server restarts.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature
  vulnerability counts, techniques used, lessons, client impact, and how to write each
  finding into a real penetration-test report — plus the **completion key for Lab 51**
  and a printable **certificate** (`/certificate`) with the HexaCyberLab logo.

## Test accounts (seeded)

| Email | Password | Role | Company |
|---|---|---|---|
| alice@acme.test | alice123 | employee | Acme Corp |
| bob@acme.test | bob123 | manager | Acme Corp |
| fiona@acme.test | fiona123 | finance | Acme Corp |
| adam@acme.test | admin123 | admin | Acme Corp |
| demo@acme.test | demo123 | employee (default/demo) | Acme Corp |
| carol@globex.test | carol123 | employee | Globex Ltd |
| dave@globex.test | dave123 | manager | Globex Ltd |
| erin@globex.test | erin123 | finance | Globex Ltd |

Policy facts used by the challenges: Meals budget cap is **$400 per employee per
month**; managers may approve claims up to **$500**.

## Files

- `server.js` — the whole application + lab system (single file, zero-dependency)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature)
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression check for every test
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state**, not source; safe to delete

## Safety

Binds 127.0.0.1 only · no real credentials (all data is fictional seed data) ·
no external calls · reset any time by deleting `progress.json`.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.
