# HexaLoan — LAB 46 of 110 (Category 5: Finance, Payments & Insurance)

A complete, deliberately vulnerable **loan platform** built for hands-on web penetration-testing practice: borrower accounts, loan applications with income/credit fields, an eligibility decision, a staff verification → approval workflow, repayment schedules, and document uploads (simulated records). All data is fake seed data. **Local use only.**

## Run it

```bash
node server.js          # http://127.0.0.1:3055
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only. The server binds 127.0.0.1 only.

## The lab system

- **Sequential unlock:** this lab starts locked. Paste the completion key earned in Lab 45 to open it. A wrong key is rejected with 403; the unlock persists across restarts.
- **Progress:** 25 scored tests across 8 features (Login & Authentication, Registration & Profile, Loan Applications, Approval Workflow, Repayments, Documents, Admin Panel, Platform & API). A test completes only when its exploit actually succeeds server-side — never by clicking. The header bar and `/api/progress` show live progress.
- **Mission page:** `/tests` lists every test with its OWASP mapping, difficulty, per-feature attempt counts, and 3 graded hints.
- **Lab Coach chatbot:** knows the full test map and your real attempt counts. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature. It receives the completion key only when the lab reaches 100%.
- **Persistence:** progress lives in `progress.json` (generated at runtime — delete it to reset the lab to a fresh, locked state). Reopening the lab resumes from your saved %.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) plus the completion key for Lab 47, and `/certificate` renders a printable certificate with the HexaCyberLab logo.

## Test accounts (seeded, fake)

| Account | Password | Role |
|---|---|---|
| admin@hexaloan.local | admin123 | Platform admin |
| officer@hexaloan.local | officer123 | Loan officer (approvals) |
| verifier@hexaloan.local | verify123 | Verifier |
| alice@test.local | alice123 | Borrower — income $85,000, score 720 |
| bob@test.local | bob123 | Borrower — income $42,000, score 610 |
| carol@test.local | carol123 | Borrower — income $120,000, score 780 |
| demo@hexaloan.local | *(find it — see the tests)* | Borrower |

## Files

- `server.js` — the whole application + lab system (single file)
- `VULNERABILITIES.md` — the complete vulnerability map (25 tests)
- `PRACTICE-GUIDE.md` — challenges with graded hints
- `FIX-AND-RETEST.md` — secure implementation + regression check per test
- `Dockerfile` / `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo
- `progress.json` — generated runtime state (not part of the source)

## Safety

Training software with intentional vulnerabilities. Run it only locally, never expose it to a network, and never enter real personal or financial data.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3055`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3055` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
