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

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3107`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3107` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
