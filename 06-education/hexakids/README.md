# HexaKids — LAB 57 · Category 6: Education & E-learning

A deliberately vulnerable **children's learning platform** built for authorised security training:
parent / teacher / admin accounts, child profiles, learning activities with stars and rewards,
teacher class groups, progress reports, and family subscription plans with simulated billing.

> ⚠️ **LOCAL-ONLY TRAINING LAB.** Every account, child, class and payment record in this app is
> **fake seed data**. Never deploy it publicly. It exists so testers can practise finding — and
> then fixing — the access-control failures that real family platforms suffer from.

## Run it

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up --build
```

Open http://127.0.0.1:3066 — the app binds to localhost only.

## The lab system

- **Lock gate:** LAB 57 starts locked. Paste the **completion key from Lab 56** on the gate to
  unlock it (permanently, for this install). Keys are never stored whole in the source — each key
  exists only as split, encoded shards assembled at runtime.
- **Progress:** every scored test you genuinely solve raises your %. Progress lives in
  `progress.json` (generated state, safe to delete to reset the lab) and **survives restarts** —
  leave at 40%, come back tomorrow, resume at 40%.
- **Mission Board (`/tests`):** all tests grouped by feature, each with OWASP mapping, difficulty,
  status, per-feature attempt counts and 3 graded hints.
- **Lab Coach chatbot:** knows the full map (features and test names are public) and your attempt
  counts. Step-by-step help for a feature unlocks only after **≥3 genuine attempts** on that
  feature (or after its tests are passed). The coach does **not** hold the completion key — it
  only receives it when the lab is completed 100%.
- **Completion (`/complete` + `/certificate`):** at 100% you get the six-section debrief (features,
  per-feature counts, techniques used, what you learned, client impact, how to write each finding
  in a real report), the **completion key for Lab 58**, and a printable certificate card.

## Test accounts (all fake)

| Role    | Email                  | Password    | Notes                        |
|---------|------------------------|-------------|------------------------------|
| Admin   | admin@hexakids.local   | admin123    | Platform administrator       |
| Parent  | priya@hexakids.local   | priya123    | Free plan, children 101/102  |
| Parent  | marco@hexakids.local   | marco123    | Premium plan, child 201      |
| Parent  | sara@hexakids.local    | sara123     | Free plan, child 301         |
| Teacher | lee@hexakids.local     | teacher123  | Class "Sunshine 1"           |
| Teacher | omar@hexakids.local    | omar123     | Class "Rainbow 2"            |
| Demo    | demo@hexakids.local    | demo123     | Published demo account       |

## What's inside

- `VULNERABILITIES.md` — the full map: 26 scored tests across 9 features.
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure implementation + regression check for every test.

Part of the **HexaCyberLab 110-lab programme** by Md. Jony Hassain, Founder of HexaCyberLab.
Labs are numbered and unlock sequentially: finish a lab at 100% to earn the key for the next one.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3066`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3066` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
