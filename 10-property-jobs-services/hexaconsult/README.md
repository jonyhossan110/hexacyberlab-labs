# HexaConsult — LAB 98 (Category 10: Property, Jobs & Professional Services)

A deliberately vulnerable **consulting platform** built for HexaCyberLab hands-on web security training: consultants with expertise profiles and hourly rates, client appointments/booking, engagements with milestones, report/deliverable downloads, and invoices — wrapped in the full HexaCyberLab Lab System (progress, Mission Board, Lab Coach, sequential unlock keys, certificate).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally vulnerable. Run it only on your own machine/lab network. Never deploy it to a public server. All accounts, data and money are fake.

## Quick start

```bash
node server.js            # zero dependencies, Node 18+
# or
docker compose up --build
```

Open http://127.0.0.1:3107 — the lab starts **locked**. Paste the completion key you earned at 100% in **Lab 97** to unlock it. Completing this lab at 100% reveals the key for Lab 99.

## The Lab System

- **Progress:** `GET /api/progress` reports done/total per feature. Progress is saved in `progress.json` (generated runtime state — safe to delete to reset the lab; it is git-ignored).
- **Mission Board:** `/tests` lists every scored test grouped by feature, with status and **3 graded hints** per test. A test flips to done only when the real exploit effect happens on the server — never by clicking.
- **Lab Coach:** the chat widget (bottom-right, `POST /api/chat`) knows the whole map and your progress. Step-by-step help for a feature unlocks only after you have genuinely **tried that feature at least 3 times** (the coach quotes your real attempt count). The coach does **not** hold the completion key — it receives it only when you reach 100%.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) plus the completion key, and `/certificate` renders your printable certificate with the HexaCyberLab logo.

## Test accounts (fake, seeded)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexaconsult.local | admin123 |
| Consultant | sara@hexaconsult.local | sara123 |
| Consultant | tom@hexaconsult.local | tom123 |
| Consultant (unlisted) | ghost@hexaconsult.local | ghost123 |
| Client | alice@test.local | alice123 |
| Client | bob@test.local | bob123 |
| Client | carol@test.local | carol123 |

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives (generated)
- `FIX-AND-RETEST.md` — secure implementations + regression retests (generated)
- `files/` — seeded client deliverables
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`

Docs are regenerated with `node server.js --gen-docs` so counts can never drift from the code.

## About

HexaConsult is Lab 98 of the 110-lab HexaCyberLab programme, built by **Md. Jony Hassain, Founder of HexaCyberLab**.
