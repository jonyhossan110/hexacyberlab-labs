# HexaCreator — LAB 87

⏱ **Estimated time:** ~3h 5m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **creator platform** (Patreon-style: creator pages, membership tiers, members-only posts, earnings and payouts) built for hands-on web security practice. Zero-dependency Node.js — no `npm install` needed.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine (it binds `127.0.0.1`), never deploy it publicly, and never put real data in it. All accounts, names and figures are fake seed data.

Part of the HexaCyberLab practice-lab programme — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Run it

```bash
node server.js          # then open http://127.0.0.1:3096
```

or with Docker:

```bash
docker compose up --build
```

Requires Node.js 20+.

## The lab system

- **Sequential unlock:** Labs are numbered and chained. LAB 87 starts **locked** — paste the completion key you earned at 100% in **Lab 86** to open it. Your own completion key for Lab 88 is revealed only when you reach 100% here. Each key is stored in the code only as encoded fragments scattered across the source and is assembled in memory at the moment it is needed — it never appears in plain form in any file or page before its reveal.
- **Progress:** every solved test raises your score. Progress = solved tests ÷ total tests (26). The header shows `LAB 87 · done/total · %` on every page, and `GET /api/progress` returns the same data as JSON.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3 graded hints beside it.
- **Lab Coach (chat widget):** knows every feature and test. It answers counts and test names freely, but step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** — it counts your real attempts. It does not have the completion key before you reach 100%, so it cannot give it away early.
- **Persistence:** progress, attempts and unlock state live in `progress.json` (generated at first run — safe to delete to reset the lab to a fresh, locked state). Restarting the server resumes exactly where you left off.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature vulnerability counts, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a professional report — plus your completion key and a printable **certificate** (`/certificate`) with the HexaCyberLab logo.

## Test accounts (fake seed data)

| Email | Password | Role |
|---|---|---|
| admin@hexacreator.local | admin123 | admin |
| creator@hexacreator.local | creator123 | creator (Nova Creates) |
| pixel@hexacreator.local | pixel123 | creator (PixelForge) |
| hidden@hexacreator.local | hidden123 | creator (Secret Studio, unlisted) |
| demo@hexacreator.local | demo123 | fan |
| alice@hexacreator.local | alice123 | fan (has a membership) |
| bob@hexacreator.local | bob123 | fan |

## Files

- `server.js` — the whole app (business logic + lab system)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every finding and prove the fix
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state**, created on first run; not source

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3096`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3096` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
