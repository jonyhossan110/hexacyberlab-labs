# HexaGit — LAB 25 · Category 3: API & Developer Platforms

⏱ **Estimated time:** ~3h 35m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **code-hosting platform** (repositories, branches & files, pull requests, issues, collaborators, invites and API access tokens) built for authorised, local-only web-security training. It is part of the HexaCyberLab 110-lab programme created by **Md. Jony Hassain, Founder of HexaCyberLab**.

> ⚠️ **Intentionally insecure.** For training on your own machine only. Binds `127.0.0.1` — never deploy it publicly or on a shared network.

## Run it

```bash
node server.js          # → http://127.0.0.1:3034
# or
docker compose up       # one-command setup
```

Zero dependencies — plain Node.js (>= 18). No build step, no database; data is seeded in memory on every boot.

## The lab system

- **Numbered, sequentially unlocked labs.** LAB 25 starts **locked**: paste the completion key you earned by finishing LAB 24 (HexaDeploy) into the gate. Wrong keys are rejected; the unlock persists across restarts.
- **Progress (100% = all tests).** The header shows `LAB 25 · <done>/<total> tests · <pct>%` on every page. A test passes **only when its exploit actually succeeds** — detection is server-side, on the real effect (an IDOR read, a merged PR, a forged token…). There is no "mark done" button.
- **Mission page `/tests`** — every test grouped by feature, with OWASP category, difficulty, your attempt count for that feature, and **3 graded hints** per test.
- **Lab Coach chatbot** (bottom-right, every page) — knows the full test map and your real progress. It will name a feature's tests freely, but **step-by-step help for a feature unlocks only after you have tried that feature at least 3 times** — it quotes your actual attempt count. It does **not** know the completion key until you reach 100%.
- **Persistence** — progress, attempts and unlock state live in `progress.json` (generated at runtime; safe to delete to reset the lab to a fresh, locked state). Restarting the server resumes exactly where you left off.
- **Completion** — at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques used, lessons, client impact, and how each finding is written in a real pentest report) and reveals the **completion key** that unlocks LAB 26. `/certificate` renders a printable certificate with the HexaCyberLab logo; set your name on `/complete` first.

## What's inside

**26 scored tests across 10 features** — see `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for the challenges with hints and objectives, and `FIX-AND-RETEST.md` for the secure implementation + regression check for every finding.

Features: Login & Authentication · Registration & Profile · Repositories · Branches & Files · Pull Requests · Issues · Collaborators & Invites · Tokens & API · Search · Admin Panel.

Business-derived flaws include: private-repo IDOR, PR merge with zero approvals, PR self-approval, read-only collaborator self-promotion to admin, invite acceptance by the wrong user, repository transfer hijack, read-only API token performing writes, an API token derivable from the username, and a push to the "protected" main branch.

## Demo accounts

| Username | Password | Notes |
|---|---|---|
| admin | Admin@2024 | Platform admin |
| alice | alice123 | Owns repos 101 (public) & 102 (private) |
| bob | bob123 | Owns 103 (public) & 104 (private) |
| carol | carol123 | Read collaborator on 101 |
| victor | victor123 | Outsider — no repos, no access |
| deploy | deploy | Service account (part of a test) |

Seeded API tokens are listed in the app on the **Tokens** page after login.

## Files

- `server.js` — the whole lab (app + lab system), zero dependencies
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `README.md` · `VULNERABILITIES.md` · `PRACTICE-GUIDE.md` · `FIX-AND-RETEST.md`
- `Dockerfile` · `docker-compose.yml`
- `progress.json` — **generated runtime state** (not source; delete to reset)

## Safety

Local-only by design: the server listens on `127.0.0.1:3034` only, contains no real credentials, and all "secrets" inside are training props. The completion-key mechanism is described in the docs; key values are never printed in any file in this folder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3034`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3034` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
