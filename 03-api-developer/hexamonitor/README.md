# HexaMonitor — LAB 27 (Category 3: API & Developer Platforms)

⏱ **Estimated time:** ~3h 40m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

An uptime / website-monitoring SaaS — accounts, monitors, alert rules, maintenance windows, incidents, public status pages, integrations and a JSON API — built as a **local-only, intentionally vulnerable** training lab for the HexaCyberLab lab programme.

> ⚠️ **LOCAL ONLY.** This app contains deliberate vulnerabilities. It binds `127.0.0.1:3036` and must never be deployed or exposed to a network.

## Run it

```bash
node server.js          # http://127.0.0.1:3036
# or
docker compose up --build
```

Zero dependencies — plain Node.js (18+). No database; data is seeded in memory on every boot.

## Test accounts

| Email | Password | Role / Account |
|---|---|---|
| ada@northbeam.test | ada-pass-1 | Admin — Northbeam Retail |
| omar@northbeam.test | omar-pass-1 | Operator — Northbeam Retail |
| vera@northbeam.test | vera-pass-1 | Viewer — Northbeam Retail |
| ben@pixelport.test | ben-pass-1 | Admin — PixelPort Studio |
| nia@pixelport.test | nia-pass-1 | Operator — PixelPort Studio |
| root@hexamonitor.test | *(vendor default — find it)* | Platform administrator |

API keys are shown on each account's Integrations page.

## The lab system

- **Lock gate:** LAB 27 starts locked. Paste the **completion key from Lab 26** on the gate to unlock it (once per install; the unlock persists).
- **Progress:** every page header shows `LAB 27 · done/total tests · pct%`. Tests complete **by doing the exploit** — server-side detection hooks watch the real effect (a cross-tenant object served, a forged token accepted, an internal host fetched by the simulated checker). There is no "mark done" button.
- **Mission page:** `/tests` lists all 26 scored tests grouped by feature, each with OWASP mapping, difficulty, attempt count and 3 graded hints revealed one at a time.
- **Lab Coach chatbot:** the widget on every page knows the full test map (names and counts are free). **Step-by-step help for a feature unlocks only after ≥3 genuine attempts on that feature** (or once one of its tests is passed) — the coach quotes your real attempt count when it refuses.
- **Completion:** at 100%, `/complete` renders the full debrief — features, per-feature vulnerability counts, techniques used, lessons, client impact, and how each finding is written in a real pentest report — followed by the **completion key for Lab 28**. `/certificate` renders a printable certificate with the HexaCyberLab logo.
- **Keys:** the entry and completion keys are never stored in plain form anywhere in this folder. They exist only as encoded fragments scattered through `server.js`, reassembled in memory at the moment of use; the coach receives the completion key only after the lab is completed.
- **Persistence:** progress lives in `progress.json` (generated at runtime, git-ignored). Restart the server and your percentage, attempts and unlock state resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.

## Docs

- `VULNERABILITIES.md` — the complete map: all 26 tests by feature, with location, exploitation outline and impact.
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure implementation and regression check for every finding.

The three docs are generated from the TESTS registry in `server.js` (`node server.js --docs`).

## Safety

Simulated network only: the monitor checker and webhook tester never touch the real network. URLs resolve inside the app against a virtual map of fake public sites and fake internal services (cloud metadata, ops console, agent config) so SSRF can be practised with zero real-world risk. All data is fictional.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3036`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3036` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
