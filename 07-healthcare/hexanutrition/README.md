# LAB 68 — HexaNutrition

A deliberately vulnerable **nutrition coaching platform** for authorised, local security practice — part of the HexaCyberLab 110-lab programme (Category 7: Healthcare & Wellness).

> **SAFETY:** This app is intentionally insecure. Run it locally only (it binds 127.0.0.1). Never deploy it publicly, never add real data. All accounts, clients and health details are fake seed data.

## The business app

Client / nutritionist / admin accounts · personalised meal plans · consultation booking with simulated payment · food logs · progress check-ins (weight & measurements) · a recipe library with premium items · subscription plans with coupons.

## Quick start

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up --build
```

Open http://127.0.0.1:3077

## The lab system

- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 67** to unlock it (the unlock persists across restarts).
- **Progress:** 26 scored tests across 9 features. Each test completes only when the server detects the real exploit effect — never by clicking. Progress lives in `progress.json` (generated at runtime, safe to delete to reset the lab) and survives restarts, so you always resume where you left off.
- **Mission Board:** `/tests` lists every test grouped by feature, with your attempts per feature and 3 graded hints per test.
- **Lab Coach:** the chat widget (bottom-right) knows the map, your progress and your attempt counts. It will only give step-by-step help for a feature after you have genuinely tried that feature **at least 3 times** — and it receives the completion key only when you reach 100%.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature vulnerability counts, techniques used, lessons, real-client impact, and how each finding is written in a real pentest report) plus your completion key, and `/certificate` renders your printable certificate.

## Test accounts (fake seed data)

| Role | Email | Password | Plan |
|---|---|---|---|
| Admin (demo — also published on the login page) | admin@hexanutrition.local | admin123 | premium |
| Nutritionist | nina@hexanutrition.local | nina123 | staff (rate $60) |
| Nutritionist | omar@hexanutrition.local | omar123 | staff (rate $50) |
| Client | alice@test.local | alice123 | premium |
| Client | bob@test.local | bob123 | free |
| Client | carol@test.local | carol123 | free |

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test per finding
- `progress.json` — generated runtime state (your progress); not source code

Built by Md. Jony Hassain, Founder of HexaCyberLab.
