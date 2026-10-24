# HexaResearchLab — LAB 60

**Category 6: Education & E-learning** · HexaCyberLab vulnerable-lab programme
An intentionally vulnerable **academic research portal**: researcher, reviewer and editor
accounts, paper submissions with manuscript files, a double-blind peer-review workflow
(assigned reviewers, scores, comments), reviewer invitations, editorial decisions, and a
journal issue in preparation. All data is fake seed data.

> ⚠️ **LOCAL USE ONLY.** This application is deliberately insecure. Run it only on your own
> machine / lab network (it binds to 127.0.0.1). Never deploy it to a public server.

## Run it

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up --build
```

Then open <http://127.0.0.1:3069>.

## The lab system

- **Lock gate:** LAB 60 starts locked. Paste the **completion key from Lab 59** on the gate
  to unlock it (once — the unlock is remembered). A wrong key gets a 403.
- **Progress:** every page header shows your progress bar. Passing tests raises your %;
  progress is the fraction of the lab's **26 scored tests** you have completed *by actually
  performing the exploit* — tests are detected server-side, there is no "mark done" button.
- **Mission board:** `/tests` groups all 26 tests by feature, shows status and attempts, and
  gives **3 graded hints** per test.
- **Lab Coach chatbot** (bottom-right of every page): it knows the map (features, test names,
  counts) and your real attempt counts. **Step-by-step help for a feature unlocks only after
  you have genuinely tried that feature at least 3 times.** It does not hold the completion
  key until you reach 100% — asking early gets a polite refusal.
- **Persistence:** state lives in `progress.json` (generated at runtime; safe to delete to
  reset the lab to a fresh, locked state). Stop the server, restart it — your % and attempts
  resume exactly where you left them.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts,
  techniques used, lessons, client impact, and how each finding is written in a real pentest
  report), reveals the **completion key** that unlocks Lab 61, and links to your
  **certificate** at `/certificate` (set your name on `/complete` first).
- **Keys** exist inside the code only as split, encoded shards and are reconstructed at
  runtime at the reveal moment; they never appear as plain text in the source or docs.

## Test accounts (seeded)

| Account | Password | Role |
|---|---|---|
| admin@hexaresearchlab.local | admin123 | admin |
| editor@hexaresearchlab.local | editor123 | editor |
| alice@hexaresearchlab.local | alice123 | researcher (author of papers 1 & 3) |
| bob@hexaresearchlab.local | bob123 | researcher (author of papers 2 & 4) |
| carol@hexaresearchlab.local | carol123 | reviewer (assigned to paper 1) |
| dave@hexaresearchlab.local | dave123 | reviewer (assigned to paper 2, invited to paper 3) |
| demo@hexaresearchlab.local | demo123 | demo account (advertised on the login page) |

## Files

- `server.js` — the whole application + lab system (TESTS registry inside)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every finding and regression-test the fix
- `files/` — manuscript + supplementary seed files · `data/` — internal editorial notes
- `progress.json` — **generated runtime state** (not source; delete to reset)

Built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3069`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3069` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
