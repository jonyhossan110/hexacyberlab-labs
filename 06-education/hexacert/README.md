# HexaCert — LAB 59 (Category 6: Education & E-learning)

⏱ **Estimated time:** ~3h 35m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **certification body platform** built for hands-on web
security practice: candidate / proctor / admin accounts, online exam booking and
taking, issued credentials with a **public certificate verification page**,
credential renewals, and exam vouchers sold to training partners.

> **LOCAL TRAINING ONLY.** Run it on your own machine. Every account, exam,
> certificate and voucher is fake seed data. Never deploy this app publicly.
> Built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Quick start

```bash
node server.js          # zero dependencies, Node 20+
# or
docker compose up --build
```

Open <http://127.0.0.1:3068> — the app binds to localhost only.

## The lab system

- **Locked start:** LAB 59 begins locked. Paste the **completion key earned in
  Lab 58** on the gate page to unlock it (permanently, for this install). Keys
  are unguessable, are stored only as split encoded pieces inside the code, and
  are revealed inside a lab only when that lab is completed 100%.
- **Progress:** every page header shows your progress (done/total tests and %).
  `GET /api/progress` returns the same state as JSON.
- **Mission board:** `/tests` lists every scored test grouped by feature, with
  its OWASP category, difficulty, **3 graded hints**, and your per-feature
  attempt counts. Tests complete **by doing the exploit** — server-side
  detection sees the real effect; there is no "mark done" button.
- **Lab Coach chatbot:** the chat widget (bottom-right of every page) knows the
  lab's features and test names. Step-by-step help for a feature unlocks only
  after you have **genuinely tried that feature at least 3 times** — the coach
  counts your real attempts and quotes the number back. The coach does **not**
  have the completion key until you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated runtime state,
  safe to delete to restart the lab). Stop and restart the server any time —
  you resume exactly where you left off, never back at zero.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature vulnerability counts, techniques used, what you learned, what
  each flaw means for a real client, and how to write each finding in a real
  pentest report) and reveals the **completion key for Lab 60**.
  `/certificate` renders your printable certificate card with the HexaCyberLab
  logo and your name.

## Demo accounts (all fake)

| Role      | Email                  | Password    |
|-----------|------------------------|-------------|
| Admin     | admin@hexacert.local   | admin123    |
| Proctor   | proctor@hexacert.local | proctor123  |
| Candidate | alice@test.local       | alice123    |
| Candidate | bob@test.local         | bob123      |
| Candidate | carol@test.local       | carol123    |

## Files

- `server.js` — the whole app (zero-dependency Node, in-memory seed data)
- `VULNERABILITIES.md` — the complete map of all scored tests, by feature
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — the secure fix and regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — generated at runtime; your saved progress (gitignored)

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3068`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3068` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
