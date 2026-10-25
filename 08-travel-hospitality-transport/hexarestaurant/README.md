# HexaRestaurant — LAB 80 of 110

⏱ **Estimated time:** ~2h 50m (guided pace) · 🎚 **Difficulty:** Beginner · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

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

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3089`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3089` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
