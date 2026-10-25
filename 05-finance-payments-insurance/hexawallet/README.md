# HexaWallet — LAB 42 (Category 5: Finance, Payments & Insurance)

⏱ **Estimated time:** ~3h 15m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A complete **digital wallet** web application — user accounts, wallet balances (simulated seed money), transfers between users, card top-ups, transaction history, linked cards, bank withdrawals and KYC identity records — built as a deliberately vulnerable training lab for the HexaCyberLab 110-lab programme.

> ⚠️ **LOCAL-ONLY.** Intentionally vulnerable. Run it only on your own machine (it binds `127.0.0.1`). All money, cards, people and ID numbers are simulated. Never deploy it publicly.

## Run it

```bash
node server.js          # zero dependencies — just Node 20+
# or
docker compose up       # one-command Docker setup
```

Open http://127.0.0.1:3051

## The lab system

- **Sequential unlock:** this is Lab 42. It starts locked — paste the **completion key earned in Lab 41** to open it. A wrong key is rejected (403) with no hints.
- **Progress:** every page header shows your score. Progress is measured against this lab's own features and their full vulnerability coverage — **25 scored tests across 8 features**. Tests complete only when the exploit actually succeeds on the live app (detected server-side); there is no "mark done".
- **`/tests` mission board:** every test with its OWASP mapping, difficulty, your per-feature attempt counts, and 3 graded hints per test.
- **Lab Coach chatbot:** knows the whole test map and your attempt counts. Step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times**. The completion key is kept secret — even from the chatbot — until you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated state, safe to delete to reset). Restarting the server resumes exactly where you left off — it never resets to zero.
- **At 100%:** `/complete` shows the full debrief (features, per-feature vulnerability counts, techniques used, what you learned, the client meaning of each flaw, and how to write each one in a real pentest report), reveals the **completion key that unlocks Lab 43**, and links to your **`/certificate`** — a printable completion card.

## Test accounts (simulated)

| Account | Password | Notes |
|---|---|---|
| admin@hexawallet.local | admin123 | Wallet administrator |
| alice@test.local | alice123 | Verified user, $1,250.50 |
| bob@test.local | bob123 | Verified user, $340.00 |
| carol@test.local | carol123 | **KYC unverified**, $85.25 |
| demo@hexawallet.local | demo123 | Seeded demo account |

## Layout

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (25 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every flaw and regression-test the fix
- `Dockerfile` / `docker-compose.yml` — container setup
- `progress.json` — generated progress state (created at runtime)

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3051`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3051` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
