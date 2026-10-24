# HexaAgri — LAB 105 of 110

**Category 11: Specialized & Advanced Business Systems** · HexaCyberLab vulnerable practice labs

HexaAgri is a complete agriculture management platform — farms, crops & fields, harvest inventory, a produce market with sales orders & invoices, equipment & maintenance approvals, farm workers, and subsidy applications — built **intentionally vulnerable** for hands-on web penetration-testing practice.

> ⚠️ **LOCAL USE ONLY.** Run it on your own machine/lab network. Every account, farm and record is fake seed data. Never deploy it publicly.

## Quick start

```bash
node server.js          # http://127.0.0.1:3114
# or
docker compose up --build
```

Requires Node.js 20+ (no dependencies — built-ins only). HexaAgri binds `127.0.0.1` by default; set `HOST=0.0.0.0` only inside a container/VM you control.

## The lab system

- **Sequential unlock:** LAB 105 starts locked. Paste the **completion key from Lab 104** on the gate to unlock it (form field or `POST /unlock`). The key chain runs through all 110 labs: each lab's completion key unlocks the next lab.
- **Progress:** every solved test raises your % on the header progress bar. State lives in `progress.json` (generated at runtime — it is in `.gitignore`; delete it to reset the lab to a fresh, locked state). Progress **persists across restarts** — reopening resumes exactly where you stopped.
- **Mission Board (`/tests`):** all **26 scored tests across 9 features**, grouped by feature, each with 3 graded hints revealed one at a time.
- **Tests complete by DOING:** a test flips to done only when the exploit's real effect happens server-side (a session created by injection, another farm's record served, phantom stock stored, an approval granted by the wrong role…) — never by clicking "mark done".
- **Lab Coach (chat widget, `POST /api/chat`):** knows every feature and test. Step-by-step help for a feature unlocks only after you have **tried that feature at least 3 times** — before that it refuses and tells you your real attempt count. Ask it who built the labs.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, lessons, client-impact translation, and how each finding is written in a real pentest report — plus the **completion key for Lab 106** (shown only at 100%; the Coach receives it only then, too).
- **Certificate (`/certificate`):** a printable card with the HexaCyberLab logo once you reach 100%. Save your name on `/complete` first.
- **Key security (by design):** keys never appear as plain text anywhere in the code or docs. Each key is split into 7 shards (base64 of reversed pieces) scattered across `server.js` and reassembled only at the moment of verification/reveal.

## Test accounts (fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexaagri.local | AgriAdmin#1 | Admin |
| alice@greenvalley.local | alice123 | Farm owner — Green Valley Farm |
| bob@sunridge.local | bob123 | Farm owner — Sunridge Acres |
| wally@greenvalley.local | wally123 | Worker — Green Valley Farm |
| mira@hexaagri.local | mira123 | Manager |
| nursery@greenvalley.local | sprout123 | Demo owner (published on the login page — that is one of the tests) |

## What's inside

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete map: all 26 tests by feature, OWASP, exploitation outline, impact
- `PRACTICE-GUIDE.md` — challenges by feature & difficulty with graded hints and objectives
- `FIX-AND-RETEST.md` — for every finding: report title, severity, secure implementation, regression retest
- `Dockerfile` / `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)

The three registry docs are generated from the TESTS registry in `server.js` (`node server.js --gen-docs`) so their counts can never drift from the app.

## Built by

HexaCyberLab — founded by **Md. Jony Hassain**. Local-only training software; use it to learn how real business-logic and access-control flaws work, how to prove them with evidence, and how to write them up for a client.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3114`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3114` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
