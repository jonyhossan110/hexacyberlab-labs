# HexaEventTrip — LAB 79

⏱ **Estimated time:** ~3h 15m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

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

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3088`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3088` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
