# HexaFleet — LAB 75 (Category 8: Travel, Hospitality & Transport)

⏱ **Estimated time:** ~3h 35m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **fleet management platform** built for hands-on web
penetration-testing practice: vehicle registry, driver assignments, trip logs
with mileage, fuel expenses, and maintenance work orders. All data is fake
seed data. **Local use only — never deploy this publicly.**

Part of the HexaCyberLab 110-lab programme, built by **Md. Jony Hassain,
Founder of HexaCyberLab**.

## Run it

```bash
node server.js          # http://127.0.0.1:3084
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## The lab system

- **Lock gate:** this lab starts locked. Paste the **completion key from
  Lab 74** to unlock it. The key mechanism: each lab's completion key unlocks
  the next lab; keys are never stored as plain text anywhere in the code —
  they exist only as split, encoded shards assembled at runtime.
- **Progress:** 26 scored tests across 9 features. Tests complete by *doing*
  the exploit — server-side detection watches the real effect (an IDOR read,
  a tampered mileage actually stored, an approval actually granted). There is
  no "mark done" button.
- **Mission Board:** `/tests` lists every test grouped by feature, with your
  status, per-feature attempt counts, and 3 graded hints per test.
- **Lab Coach chatbot:** on every page (bottom right) and at `POST /api/chat`.
  It answers counts and test names freely. **Step-by-step help for a feature
  unlocks only after you have genuinely tried that feature at least 3 times**
  — the coach counts your attempts and quotes the real number. It receives
  the completion key only when the lab hits 100%, and will share it only
  then.
- **Persistence:** progress lives in `progress.json` (generated state — safe
  to delete to reset the lab). Stop and restart the server any time; your
  percentage and attempts resume exactly where you left them.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature counts, techniques, lessons, client impact, and how to write
  each finding in a real pentest report), reveals the completion key for
  Lab 76, and links to your `/certificate`.

## Test accounts (unchanged seed accounts)

| Role          | Email                    | Password   |
|---------------|--------------------------|------------|
| Admin         | admin@hexafleet.local    | admin123   |
| Fleet manager | manager@hexafleet.local  | manager123 |
| Driver        | karim@hexafleet.local    | karim123   |
| Driver        | sara@hexafleet.local     | sara123    |
| Mechanic      | rafi@hexafleet.local     | rafi123    |
| Demo          | demo@hexafleet.local     | demo123    |

(Yes — weak/default credentials and a printed demo account are among the
intentional findings.)

## Files

- `server.js` — the whole app + lab system (zero-dependency Node)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — secure implementations + regression tests
- `docs/` — simulated vehicle documents served by the app
- `progress.json` — generated at runtime (your progress; git-ignored)

## Safety

Binds to 127.0.0.1 only. Every account, vehicle and record is invented.
Do not expose this app to any network you do not fully control.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3084`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3084` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
