# HexaCloud — LAB 23 (HexaCyberLab Vulnerable Lab Programme)

⏱ **Estimated time:** ~3h 35m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **cloud management console** for hands-on web security training: multi-tenant accounts, virtual resources (servers, storage buckets, databases as simulated records), IAM roles & policies, and billing/usage — with **26 scored security tests across 9 features**.

> ⚠️ **LOCAL TRAINING ONLY.** This application is intentionally insecure. Run it only on your own machine / lab network. Never deploy it to a public server.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Quick start

```bash
node server.js
# → http://127.0.0.1:3032
```

or with Docker:

```bash
docker compose up --build
# → http://127.0.0.1:3032
```

Zero dependencies. Node 20+ recommended. The server binds to 127.0.0.1 only.

## The lab system

- **Numbered labs, sequential unlock.** LAB 23 starts **locked**. Paste the completion key you earned by finishing **Lab 22 at 100%** and the gate lifts permanently for this install.
- **Progress bar.** Every page header shows `LAB 23 · <done>/<total> tests · <pct>%`.
- **/tests — Mission page.** All tests grouped by feature, each with OWASP mapping, difficulty, status, the feature's attempt count, and **3 graded hints** (nudge → stronger → near-answer).
- **Tests complete by DOING.** A test flips to done only when the server observes the real exploit effect (a cross-tenant read, a forged credit actually applied, metadata credentials actually returned…). There are no "mark done" checkboxes.
- **Lab Coach chatbot.** The chat widget (bottom-right) knows the whole map: feature/test counts, names, and your progress. **Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — the coach can see your attempt counts and will tell you honestly how many tries you have so far. Before 100% the coach does **not** have the completion key; at 100% it receives it and can share it.
- **Progress persistence.** State lives in `progress.json` (generated at runtime, safe to delete to restart the lab). Close the server, come back tomorrow — your % and attempts resume exactly where you left them.
- **/complete — debrief.** At 100% you get: total features, per-feature vulnerability counts, the techniques used, what you learned, what each flaw would mean for a real client, how to write each finding in a professional pentest report — and the **completion key for Lab 24**.
- **/certificate.** A printable certificate card with the HexaCyberLab logo, your name (set it on /complete), the lab totals, and the completion date.
- **Keys.** Each lab's completion key is the next lab's entry key. Keys are stored in the code only as encoded fragments scattered across the file and are assembled at runtime only at their reveal moment — searching the source will not hand you a key.

## Test accounts (seeded)

| Tenant | Email | Password | Role |
|---|---|---|---|
| Acme Corp | admin@acme.cloud | admin123 | owner |
| Acme Corp | dev@acme.cloud | dev123 | developer |
| Acme Corp | viewer@acme.cloud | viewer123 | viewer |
| Acme Corp | demo@acme.cloud | demo123 | viewer (demo account) |
| Globex Inc | root@globex.cloud | globex123 | owner |
| Globex Inc | ops@globex.cloud | ops123 | admin |

API keys are shown on the /debug page (that exposure is itself one of the tests).

## What's inside

- `VULNERABILITIES.md` — the complete map: all 26 tests by feature, with OWASP, location, exploitation outline and impact.
- `PRACTICE-GUIDE.md` — challenges grouped by feature and difficulty, each with 3 hints and a measurable objective.
- `FIX-AND-RETEST.md` — the secure implementation and regression test for every finding; practise fixing in a copy, then re-run the exploit to prove it fails.

## Files

`server.js` (the whole app), `logo.png` (real HexaCyberLab logo, served at `/logo.png`), `Dockerfile`, `docker-compose.yml`, the docs above, and `progress.json` (generated state — delete it, plus restart the server, to reset the lab to a fresh, locked state).

## Safety

Intentionally vulnerable. Local use only, on 127.0.0.1. Contains no real credentials — all data, tokens and "secrets" inside are simulated training values.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3032`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3032` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
