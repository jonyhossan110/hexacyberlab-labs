# HexaTax — LAB 49 of 110

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 5: Finance, Payments & Insurance** · Port **3058** · Zero-dependency Node.js · Local training use only

HexaTax is a complete tax-preparation platform: taxpayer accounts, tax returns with income and
deduction fields, a server-side tax calculation, document uploads (W-2 / 1099 records), preparer and
reviewer roles, a filing workflow (draft → submitted → prepared → filed), CSV exports and a token API.
It is deliberately vulnerable: **25 scored security tests across 7 features**, every one derived
from how a real tax platform can be abused — return IDOR that exposes other taxpayers' financial
data, calculation tampering through hidden fields, deduction and refund manipulation, preparer-step
bypass, other people's documents, export leakage, and more.

## Quick start

```bash
node server.js          # → http://127.0.0.1:3058
# or
docker compose up --build
```

The server binds to 127.0.0.1 only. **Never deploy this lab publicly.**

## The lab system

- **Lock gate:** Lab 49 starts locked. Paste the completion key you earned in Lab 48 to unlock it.
  Keys are a chain — finishing this lab reveals the key for Lab 50 on the completion page.
- **Progress:** every page header shows your score. A test completes only when the server detects
  the real exploit effect — never by clicking. Progress is stored in `progress.json` (generated
  state) and survives restarts; delete that file to reset the lab to a fresh, locked state.
- **Mission page:** `/tests` groups all 25 tests by feature, each with 3 graded hints.
- **Lab Coach chatbot:** on every page. It answers counts and test names freely, but step-by-step
  help for a feature unlocks only after you have tried that feature yourself at least **3 times**.
  It does not have the completion key until you reach 100%.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, what
  you learned, the client impact of every flaw, and how each finding is written in a real pentest
  report), your completion key, and a printable certificate at `/certificate`.

## Test accounts (all fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexatax.local | admin123 |
| Preparer | priya@hexatax.local | priya123 |
| Reviewer | ravi@hexatax.local | ravi123 |
| Taxpayer | alice@hexatax.local | alice123 |
| Taxpayer | bob@hexatax.local | bob123 |
| Taxpayer | carol@hexatax.local | carol123 |

## Features and test counts

- **Login & Authentication:** 6 tests
- **Registration & Profile:** 4 tests
- **Tax Returns:** 5 tests
- **Documents:** 3 tests
- **Search & Exports:** 3 tests
- **Admin Panel:** 2 tests
- **Platform & API:** 2 tests

See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for the challenges, and
`FIX-AND-RETEST.md` for how each flaw is fixed and regression-tested in a real engagement.

*HexaTax is part of the HexaCyberLab lab programme built by Md. Jony Hassain, Founder of HexaCyberLab.
All people, figures, TINs, bank details and documents in this lab are fake.*

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3058`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3058` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
