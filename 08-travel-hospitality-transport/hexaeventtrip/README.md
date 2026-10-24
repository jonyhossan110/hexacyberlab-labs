# HexaEventTrip — LAB 79

A deliberately vulnerable **event-travel platform** (event ticket + hotel + transfer packages, group
reservations, seat/room allocations, organizer dashboards, payment instalments) built for hands-on
web penetration-testing practice.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally insecure. Run it only on your own machine
> or an isolated lab network. Never deploy it to a public server. All accounts, events and bookings
> are fake seed data.

Part of the **HexaCyberLab 110-lab programme** — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Quick start

```bash
node server.js
# or
docker compose up --build
```

Open http://127.0.0.1:3088 — the lab starts **locked**.

## The lab system

- **Sequential unlock:** Lab 79 opens with the **completion key from Lab 78**. Paste it at the gate;
  it stays unlocked for that install. Finishing Lab 79 at 100% reveals the key for Lab 80.
  Keys are never stored whole in the source — each exists only as encoded fragments scattered
  through `server.js`, assembled in memory only at the moment of verification or reveal.
- **Progress:** every solved test raises your score (26 scored tests across 9 features). The header
  bar shows `done/total · %` on every page, and the **Mission Board** at `/tests` groups tests by
  feature with status, attempt counts and 3 graded hints per test.
- **Persistence:** progress lives in `progress.json` (generated state, created on first run).
  Restart the server any time — your %, attempts and unlock state resume exactly where you left them.
  Delete `progress.json` to reset the lab to a fresh, locked state.
- **Lab Coach chatbot:** the widget on every page knows the full test map (names and counts are
  public). Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature —
  the coach counts your real tries and refuses earlier, quoting your attempt count. The coach does not
  hold the completion key until the lab is 100% complete.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques,
  lessons, real-client impact, and how to write each finding in a pentest report), reveals the
  completion key, and links your printable **certificate** at `/certificate`.

## Demo accounts (intentionally weak — part of the exercise)

| Email | Password | Role |
|---|---|---|
| admin@hexaeventtrip.local | admin123 | admin |
| olivia@hexaeventtrip.local | olivia123 | organizer |
| omar@hexaeventtrip.local | omar123 | organizer |
| tom@hexaeventtrip.local | tom123 | traveller |
| tina@hexaeventtrip.local | tina123 | traveller |
| ben@hexaeventtrip.local | ben123 | traveller |

## Files

- `server.js` — the whole application (zero dependencies, Node built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how each flaw is fixed properly, with regression tests
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — generated at runtime (your progress); safe to delete to reset

## Safety

Binds to `127.0.0.1:3088` only. No external calls, no real payment processing, no real personal data.
