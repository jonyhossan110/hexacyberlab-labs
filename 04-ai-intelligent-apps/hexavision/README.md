# HexaVision — LAB 33 of 110 (Category 4: AI & Intelligent Applications)

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

An image-AI platform — user accounts, image uploads (simulated content), AI analysis jobs (simulated, deterministic results), public/private galleries, collections with share links, API access and a credit system — built as a **complete, intentionally vulnerable training lab** for the HexaCyberLab lab series.

> ⚠️ **LOCAL TRAINING ONLY.** This app is deliberately vulnerable. Run it only on your own machine (it binds 127.0.0.1), never deploy it publicly, and never use these techniques on systems you do not own or have written permission to test.

## Run it

```bash
node server.js          # → http://127.0.0.1:3042
# or
docker compose up       # one-command setup
```

Requires Node 20+ (zero dependencies — nothing to install).

## The lab system

- **Lock gate:** HexaVision is Lab 33. It starts locked — paste the **completion key from Lab 32** to unlock it. A wrong key is rejected (403). The unlock persists.
- **Progress (100% = all 26 tests):** every page header shows your score. Tests pass **only by performing the exploit** — server-side detection watches the real effect; there are no "mark done" buttons.
- **/tests (Mission page):** all tests grouped by feature, each with OWASP, difficulty, status and 3 graded hints.
- **Lab Coach chatbot:** knows every test. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** (it quotes your real attempt count). It does **not** have the completion key until you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated state — delete it to reset the lab to a fresh, locked state). Quitting and reopening resumes exactly where you left off.
- **/complete:** at 100%, a six-section debrief (features, per-feature counts, testing methods, lessons, real-client impact, report writing) plus your **completion key for Lab 34**.
- **/certificate:** a printable completion card with the HexaCyberLab logo and your name.
- **Keys:** completion keys are never stored in plain text — each exists only as encoded fragments scattered through the code, assembled at runtime at the reveal moment.

## Test accounts (seeded)

| Account | Password | Notes |
|---|---|---|
| admin@hexavision.local | admin123 | Platform admin (Enterprise) |
| alice@hexavision.local | alice123 | Pro user — owns private gallery 1, collection 1, job 1 |
| bob@hexavision.local | bob123 | Free user |
| carol@hexavision.local | carol123 | Free user — owns private gallery 4, collection 3 |
| demo@hexavision.local | demo1234 | Leftover demo account (one of the findings) |

## What is inside

- `26 scored tests across 9 features` — see VULNERABILITIES.md for the full map and PRACTICE-GUIDE.md for challenges with graded hints.
- FIX-AND-RETEST.md — the secure implementation + regression check for every test.
- All AI "analysis" is simulated and deterministic — no real model calls, no real image processing; uploads are simulated content strings.
- `progress.json` is runtime state and is git-ignored.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab HexaCyberLab vulnerable-lab programme.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3042`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3042` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
