# LAB 77 — HexaCourier

A deliberately vulnerable **courier delivery service** built for hands-on web security practice — part of the HexaCyberLab 110-lab programme.

> ⚠️ **LOCAL TRAINING ONLY.** Run it on your own machine/lab network. Never deploy it to the internet. All people, parcels and data in the app are fake seed data.

## What the business does

HexaCourier takes pickup requests from customers, prices them by delivery zone and weight, assigns delivery jobs to couriers, tracks parcels, handles cash-on-delivery (COD) amounts, records proof of delivery, and pays couriers a share of each fee. Roles: **customer**, **courier**, **dispatcher**, **admin**.

## Quick start

```bash
node server.js          # http://127.0.0.1:3086
# or
docker compose up --build
```

## Test accounts (seeded, fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexacourier.local | admin123 |
| Dispatcher | dispatch@hexacourier.local | dispatch123 |
| Courier | rahim@hexacourier.local | courier123 |
| Courier | selina@hexacourier.local | courier123 |
| Demo courier | demo@hexacourier.local | demo123 |
| Customer | alice@test.local | alice123 |
| Customer | bob@test.local | bob123 |

## The lab system

- **Progress:** the lab has **26 scored tests across 9 features**. A test completes only when the server detects the *real effect* of the exploit — there is no "mark done" button. The header bar shows `<done>/<total> tests · <pct>%` on every page.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3 graded hints (nudge → stronger → near-answer) and the attempt count for that feature.
- **Lab Coach (chat widget):** the coach freely answers *what* exists (feature/test counts and names) and your progress. Step-by-step *how-to* help for a feature unlocks only after you have genuinely **tried that feature at least 3 times** (the coach can see the real attempt counter and quotes it). Ask it who built the labs.
- **Lock gate:** this lab starts locked. It opens with the **completion key from Lab 76**. The key is never written anywhere in this package — inside the code it exists only as split, encoded shards, and it is revealed in full only at 100% completion.
- **Persistence:** progress lives in `progress.json` (generated at first run — delete it to reset the lab to a fresh, locked state). Your percentage and attempt counts survive server restarts; reopening the lab resumes where you left off.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, what you learned, what each flaw means for a real client, and how each finding is written in a professional pentest report — plus the completion key that unlocks Lab 78.
- **Certificate (`/certificate`):** at 100%, a printable certificate card with the HexaCyberLab logo and your name (set it on the completion page).

## Files

- `server.js` — the whole app + lab system (zero-dependency Node.js, built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with objectives and hints
- `FIX-AND-RETEST.md` — how to fix every flaw, and the regression test for each fix
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — *generated runtime state* (not part of the challenge; safe to delete to reset)

## Safety

Binds to `127.0.0.1` only. No real credentials, no real data, no external calls. Built by **Md. Jony Hassain, Founder of HexaCyberLab**.
