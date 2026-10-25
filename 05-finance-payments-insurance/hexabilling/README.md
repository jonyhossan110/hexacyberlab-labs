# HexaBilling — LAB 48 of 110

⏱ **Estimated time:** ~4h 10m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A complete **recurring-billing platform** — business accounts, subscription plans, customers, invoices, usage metering, coupons and saved payment methods — built as an intentionally vulnerable, **local-only** training lab for the HexaCyberLab 110-lab programme.

> ⚠️ **SAFETY:** This application is deliberately insecure. Run it ONLY on your own machine / local network. It binds to `127.0.0.1` and must never be deployed publicly.

## Run it

```bash
node server.js            # http://127.0.0.1:3057
# or
docker compose up --build # same address
```

Zero dependencies — Node.js built-ins only. All business data is in-memory and reseeds on restart; your **lab progress persists** in `progress.json` (generated runtime state — safe to delete to reset the lab).

## The business

Two seeded businesses compete on one platform:

| Business | Owner login | Plan |
|---|---|---|
| Northbeam Studio | `owner@northbeam.test` / `North123!` | Starter |
| PixelForge LLC | `owner@pixelforge.test` / `Pixel123!` | Growth |

More accounts: `staff@northbeam.test` / `Staff123!` (Northbeam staff), `demo@hexabilling.local` / `demo1234` (Demo Bakery owner), and a platform admin whose credentials you will want to review as part of the lab (`admin@hexabilling.local`).

Features: subscription plans (Starter $29 / Growth $79 / Scale $199, per-seat billing), a 14-day trial, account credit & proration, coupons (platform + per-business), usage metering billed per unit, customer records with cards on file, invoices with public share links, a JSON billing API, and a platform admin console.

## The lab system

- **Locked gate:** LAB 48 opens with the completion key earned in LAB 47. A wrong key is rejected (403); the right key unlocks permanently for that install.
- **Progress:** every scored test you genuinely exploit raises your completion %. The header bar and `GET /api/progress` show `done/26`. Progress and attempts survive restarts (`progress.json`).
- **Mission page:** `/tests` groups all 26 tests by feature, each with OWASP mapping, difficulty and **3 graded hints**.
- **Lab Coach chatbot:** knows the whole map. Names and counts are free; **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** (the coach counts your attempts truthfully). The coach receives the completion key only when you reach 100% — asking early gets a refusal.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) and your **completion key for LAB 49**. `/certificate` prints your certificate card with the HexaCyberLab logo.
- **Keys:** each lab's entry/completion keys are never stored in plain form anywhere in this folder — they exist only as encoded fragments scattered through the code and are assembled in memory at the moment they are needed.

## Scored tests (26)

- **Login & Authentication** — 6 tests
- **Registration & Profile** — 4 tests
- **Subscriptions & Plans** — 4 tests
- **Coupons** — 3 tests
- **Usage Metering** — 2 tests
- **Invoices** — 3 tests
- **Customers & Payments** — 2 tests
- **Platform & API** — 2 tests

Full map: `VULNERABILITIES.md` · Challenges: `PRACTICE-GUIDE.md` · Fixes: `FIX-AND-RETEST.md`.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder. For authorized security training only.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3057`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3057` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
