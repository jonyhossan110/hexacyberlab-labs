# LAB 95 — HexaFreelance

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **freelance marketplace** built for hands-on web security practice:
clients post jobs, freelancers send proposals, contracts run on milestones, and payments sit in
(simulated) escrow until milestones are approved and released.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine,
> never expose it to a network or the internet.

## Quick start

```bash
node server.js          # http://127.0.0.1:3104
# or
docker compose up --build
```

Requires Node.js 20+ (no dependencies — built-ins only).

## The lab system

- **Lock gate:** LAB 95 starts locked. Paste the **completion key from Lab 94** on the gate
  (`POST /unlock`) to open it. The gate lifts permanently for that install.
- **Progress:** every page header shows `LAB 95 · <done>/26 tests · <pct>%`. Progress is stored in
  `progress.json` (generated runtime state — safe to delete to reset the lab) and **survives restarts**.
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each
  with 3 graded hints. A test flips to ✓ only when the exploit really succeeds on the server —
  there is no "mark done" button.
- **Attempts:** using a feature's flows (logins, searches, proposal views, milestone actions…)
  counts as attempts on that feature, shown on the Mission Board and quoted by the coach.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the whole map. It lists a feature's tests
  freely, but step-by-step help for a feature unlocks only after **you have tried that feature at
  least 3 times** (or finished its tests). It does **not** hold the completion key until you reach
  100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature counts,
  the techniques used, what you learned, what each flaw means for a real client, and how to write
  each finding in a real pentest report — plus the **Lab 95 completion key** for Lab 96.
- **Certificate (`/certificate`):** a printable completion card with your name once you hit 100%.
- **Keys:** the entry and completion keys are stored only as scattered encoded fragments inside
  `server.js`; they never appear as plain text in any file or page before the reveal moment.

## Test accounts (local lab only)

| Role       | Email                          | Password  |
|------------|--------------------------------|-----------|
| Admin      | admin@hexafreelance.local      | admin123  |
| Client     | carol@client.local             | carol123  |
| Client     | dave@client.local              | dave123   |
| Freelancer | alice@free.local               | alice123  |
| Freelancer | bob@free.local                 | bob123    |
| Demo       | demo@hexafreelance.local       | demo123   |

Seed data (fake, in memory): 4 jobs (one invite-only), 3 proposals, 2 contracts with milestones,
reviews and messages. Restarting the server resets business data but keeps your lab progress.

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with graded hints and objectives
- `FIX-AND-RETEST.md` — the secure fix and regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — **generated at runtime** (your progress); deleting it resets the lab

## Regenerating the docs

```bash
node server.js --gen-docs
```

Rebuilds VULNERABILITIES.md, PRACTICE-GUIDE.md and FIX-AND-RETEST.md from the TESTS registry in
`server.js`, so the documentation can never drift from the code.

---

HexaCyberLab lab series — LAB 95 of 110. Built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3104`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3104` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
