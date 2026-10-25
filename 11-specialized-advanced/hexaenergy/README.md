# HexaEnergy — LAB 106

⏱ **Estimated time:** ~3h 45m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 11 · Specialized & Advanced Business Systems**

A deliberately vulnerable **energy utility platform** for hands-on web penetration-testing practice: customers, meters, usage readings, tariffs, billing/invoices, payments, service connections and support tickets.

> ⚠️ **LOCAL TRAINING LAB ONLY.** This application is intentionally insecure. Run it only on your own machine / local network. Never deploy it to a public server. All data is fake and held in memory.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.

---

## Quick start

### With Node.js (≥ 18)

```bash
node server.js
```

Then open <http://127.0.0.1:3115>

### With Docker

```bash
docker compose up --build
```

Then open <http://127.0.0.1:3115>

The server binds to `127.0.0.1` only.

---

## The lock gate

Labs in this series are numbered and unlock **sequentially**. HexaEnergy is **Lab 106**, so it starts locked: every page shows only the gate. Paste the **completion key you earned by finishing Lab 105** into the gate form and the lab unlocks permanently for this install (the unlock state is saved in `progress.json`).

Keys are never stored in plain text anywhere in this repository — each key exists only as encoded fragments scattered through `server.js` and is reassembled in memory at the moment it is needed.

## The lab system

- **Progress (100% per lab):** the header on every page shows `LAB 106 · <done>/26 tests · <pct>%`. A test flips to done **only when the exploit really works** — detection is server-side, based on the actual effect (a session created, a foreign object served, a bill settled for $1…). There are no "mark done" buttons.
- **Mission Board — `/tests`:** all **26 tests across 8 features**, grouped by feature, each with its OWASP category, difficulty, current status and the number of attempts logged against that feature.
- **Hints beside every test:** each test carries 3 graded hints (nudge → stronger → near-answer) on the Mission Board.
- **Lab Coach (chat widget, bottom-right):** a rule-based, fully offline coach that knows every feature and test. It will tell you test *names and counts* freely, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — it quotes your real attempt count when it refuses. It does **not** have the completion key before you finish: the key is only revealed at 100%.
- **Progress persistence:** state lives in `progress.json` (generated at runtime — do not commit it). Stop the server, come back tomorrow, and your % and attempt counts are exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion — `/complete`:** at 100% you get the full debrief: the features, vulnerabilities per feature, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus your **completion key for Lab 107**.
- **Certificate — `/certificate`:** at 100%, a printable certificate card with the HexaCyberLab logo and your name (set it on `/complete`).

## Features & tests (26)

| Feature | Tests |
|---|---|
| Login & Authentication | 6 |
| Registration & Profile | 4 |
| Meters & Readings | 5 |
| Search & Catalogue | 2 |
| Billing & Invoices | 3 |
| Connections & Support | 2 |
| Admin Panel | 2 |
| Platform & API | 2 |

Full map: see `VULNERABILITIES.md`. Challenges with hints: `PRACTICE-GUIDE.md`. Fixes and retests: `FIX-AND-RETEST.md`.

## Test accounts (fake, local only)

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@hexaenergy.local | admin123 | admin |
| Alice | alice@test.local | alice123 | customer |
| Bob | bob@test.local | bob123 | customer |
| Demo | demo@hexaenergy.local | demo123 | customer |
| Rita | rita@hexaenergy.local | rita123 | meterreader |

## Files

| File | Purpose |
|---|---|
| `server.js` | The whole lab (app + lab system), zero dependencies |
| `README.md` | This file |
| `VULNERABILITIES.md` | Complete vulnerability map (generated from the test registry) |
| `PRACTICE-GUIDE.md` | Challenges with graded hints (generated) |
| `FIX-AND-RETEST.md` | Secure implementation + regression test per finding (generated) |
| `Dockerfile`, `docker-compose.yml` | One-command local setup |
| `logo.png` | The real HexaCyberLab logo, served at `/logo.png` |
| `progress.json` | *Generated at runtime* — progress state; delete to reset. Not part of the source. |

## Regenerating the docs

```bash
node server.js --gen-docs
```

The three map/guide documents are generated from the `TESTS` registry inside `server.js`, so counts can never drift.

## License / safety

For authorized security training only, on systems you own. Do not expose this lab to the internet.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3115`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3115` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
