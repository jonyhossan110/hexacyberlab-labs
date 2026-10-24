# HexaFlight — LAB 73 of 110

**Category 8: Travel, Hospitality & Transport** · A deliberately vulnerable flight-booking simulator, built for local, authorised security practice by **HexaCyberLab**.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine/lab network. Never deploy it to a public server. All accounts, flights and bookings are fake seed data — there is no connection to any real airline.

## The business app

A flight booking platform with passenger / agent / admin accounts:

- Flight schedules with fares by class (economy / business / first) and a seat map
- Bookings with PNR-style references, payments, cancellations
- Seat changes, online check-in and e-tickets
- An agent desk (fare rules, discount codes, all bookings)
- An admin panel (user list, fare management)
- A small JSON API

## The lab system (same in every HexaCyberLab lab)

- **Progress:** every scored test you solve server-side raises your progress % — shown in the header on every page and at `GET /api/progress`.
- **Mission Board:** `/tests` groups all tests by feature, with status, per-feature attempt counts, and **3 graded hints per test**.
- **Lab Coach chatbot:** the widget (bottom-right) answers counts and progress freely. **Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — the coach can see your attempt counts and will refuse (politely) before that.
- **Lock gate & key chain:** labs are numbered and unlock sequentially. This lab starts locked: paste the **completion key from Lab 72** on the gate to open it (the unlock is persisted). At **100%** this lab reveals its own completion key on `/complete`, which unlocks Lab 74. Keys exist inside the code only as split, encoded shards — they cannot be found whole in the source, and the coach does not know the key until you finish.
- **Persistence:** progress lives in `progress.json` (generated state, created on first run in this folder). Stop the server, restart it — your % and attempts resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion:** at 100%, `/complete` gives the full debrief (features, per-feature counts, techniques used, lessons, client impact, and how each finding is written in a real pentest report) and `/certificate` renders your printable certificate.

## Run it

```bash
# Local (Node 18+)
node server.js
# → http://127.0.0.1:3082

# or Docker
docker compose up --build
```

## Test accounts (fake, local only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexaflight.local | admin123 |
| Agent | agent@hexaflight.local | agent123 |
| Helpdesk (agent) | helpdesk@hexaflight.local | helpdesk123 |
| Passenger | alice@test.local | alice123 |
| Passenger | bob@test.local | bob123 |

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the full test/finding map, grouped by feature
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives
- `FIX-AND-RETEST.md` — the fix pattern and regression check for every finding
- `Dockerfile`, `docker-compose.yml`, `logo.png`

MIT © Md. Jony Hassain — part of the HexaCyberLab vulnerable-labs collection. **Built by Md. Jony Hassain, Founder of HexaCyberLab.**
