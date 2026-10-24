# HexaRestaurant — LAB 80 of 110

**Category 8: Travel, Hospitality & Transport** · Port **3089** · Zero-dependency Node.js · **LOCAL USE ONLY**

A complete, deliberately vulnerable restaurant platform built for hands-on web security practice: diner / staff / manager accounts, a menu with search, table bookings, food orders with payments, loyalty points, reviews, a kitchen queue and a manager console — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, certificate).

> ⚠️ This app is intentionally insecure. Run it only on your own machine, bound to 127.0.0.1. All data is fake seed data. Never deploy it publicly.

## Run it

```bash
node server.js          # http://127.0.0.1:3089
# or
docker compose up       # same port
```

Requires Node.js 18+ (no npm install — zero dependencies).

## The lab system

- **Sequential unlock:** LAB 80 starts locked. Paste the completion key you earned at 100% in **Lab 79** to unlock it (the gate lifts permanently for that install; a wrong key gets a 403).
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each with OWASP mapping, difficulty and **3 graded hints** revealed one at a time.
- **Progress:** every solved test raises your % (shown in the header progress bar). Progress, attempts and unlock state persist in `progress.json` (generated at runtime — safe to delete to reset the lab) and survive restarts. Resume any time; it never resets on its own.
- **Lab Coach (chat widget, `POST /api/chat`):** answers questions about the lab, test counts and your progress. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** (the coach quotes your real attempt count). The completion key is a secret the coach does **not** hold until the lab is at 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature vulnerability counts, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus the **completion key** that unlocks Lab 81.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.
- **Keys** exist inside the app only as split, encoded shards scattered through the code; they are never written in plain form anywhere in this package, and are revealed only at the moments described above.

## Test accounts (seeded, fake)

| Role | Email | Password |
|---|---|---|
| Manager | manager@hexarestaurant.local | manager123 |
| Diner | alice@diner.local | alice123 |
| Diner | bob@diner.local | bob123 |
| Staff | staff@hexarestaurant.local | staff123 |
| Demo diner | demo@diner.local | demo123 |

## What's inside

- `server.js` — the whole app (business platform + lab system), zero dependencies.
- `VULNERABILITIES.md` — the complete map: all 26 tests by feature, with impact and remediation.
- `PRACTICE-GUIDE.md` — 26 challenges with objectives and graded hints.
- `FIX-AND-RETEST.md` — the secure fix and regression retest for every test.
- `Dockerfile`, `docker-compose.yml` — one-command local run.
- `logo.png` — the real HexaCyberLab logo, served by the app at `/logo.png`.
- `progress.json` — generated runtime state (not shipped; created on first run).

## The 8 features under test

Login & Authentication (6) · Registration & Profile (4) · Menu & Search (2) · Table Bookings (4) · Orders & Payments (4) · Reviews & Loyalty (3) · Staff & Manager (2) · Platform & API (1) = **26 tests**.

Built by Md. Jony Hassain, Founder of HexaCyberLab — part of the 110-lab HexaCyberLab practice programme.
