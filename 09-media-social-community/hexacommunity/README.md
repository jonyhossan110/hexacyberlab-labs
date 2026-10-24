# LAB 90 — HexaCommunity

**HexaCommunity** is a deliberately vulnerable membership-community platform built for
hands-on web penetration-testing practice: a member directory, private groups, events
with RSVPs, a resource library, discussion spaces, member tiers (free / premium) and
admin / moderator roles.

> ⚠️ **LOCAL-ONLY practice lab.** Run it only on your own machine or an isolated lab
> network. Never deploy it to the public internet. All accounts and data are fake seeds.

## Quick start

```bash
node server.js          # zero dependencies — Node.js 20+ only
# open http://127.0.0.1:3099
```

Or with Docker:

```bash
docker compose up --build
```

## The gate

This is **Lab 90** in the HexaCyberLab numbered series. It starts **locked**: paste the
**completion key from Lab 89** on the gate to open it. Finish all 26 tests and the lab
reveals the completion key that unlocks Lab 91.

Keys are never stored in plain text in this repository — each key is split into 6
encoded shards scattered through `server.js` and reassembled only in memory at the
moment it is needed (entry key at unlock time; completion key only at 100%).

## How the lab system works

- **Progress bar & Mission Board (`/tests`)** — every page shows your progress.
  `/tests` lists all **26 scored tests across 9 features**, grouped by feature, each
  with its OWASP mapping, difficulty, your attempt count for that feature, and three
  graded hints.
- **Tests pass by DOING** — a test flips to done only when the server observes the real
  effect of the exploit (a session created by injection, another member's object
  served, an attendee count over capacity…). There is no "mark done" button.
- **Lab Coach (chat widget, bottom-right)** — the coach knows every test. It answers
  counts and test names freely, but step-by-step help for a feature unlocks only after
  you have genuinely tried that feature **at least 3 times** (it quotes your real
  attempt count). It does not have the completion key until you reach 100% — then it
  will share it.
- **Persistence** — progress lives in `progress.json` (generated state, safe to
  delete). Restart the server and you resume exactly where you left off; delete the
  file to reset the lab to a fresh, locked state.
- **Completion (`/complete`)** — at 100% you get the full debrief: features and
  per-feature vulnerability counts, the techniques used, what you learned, what each
  flaw means for a real client, how to write each finding in a real pentest report —
  plus the completion key.
- **Certificate (`/certificate`)** — a printable certificate card with the
  HexaCyberLab logo once you hit 100%.

## Test accounts (seeded, fake)

| Account | Password | Notes |
|---|---|---|
| admin@hexacommunity.local | Admin123! | administrator |
| mod@hexacommunity.local | Mod12345 | moderator |
| alice@test.local | alice123 | premium member |
| bob@test.local | bob123 | free member, **private** profile |
| carol@test.local | carol123 | free member |
| dave@test.local | dave123 | free member |
| demo@hexacommunity.local | demo1234 | published demo account |

(One more member exists but is deliberately *unlisted* — finding her is part of a test.)

## Files

- `server.js` — the whole application + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete test map (generated from the registry in `server.js`)
- `PRACTICE-GUIDE.md` — challenges by feature & difficulty, with hints and objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test for every finding
- `files/` — the resource-library files the app serves
- `progress.json` — **generated runtime state** (created on first run; delete to reset)

## Safety

- Binds **127.0.0.1 only**. In-memory fake data; nothing leaves your machine.
- Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab
  HexaCyberLab practice series.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3099`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3099` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
