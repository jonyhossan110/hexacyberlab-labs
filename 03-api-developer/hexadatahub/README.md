# HexaDataHub — LAB 28 (Category 3: API & Developer Platforms)

⏱ **Estimated time:** ~3h 45m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **data platform** built for authorised, local-only security training:
workspaces (multi-tenant), datasets, file imports (CSV / JSON / XML), exports, public share links
and a token-authenticated API — wrapped in the full HexaCyberLab lab system (progress, hints,
Lab Coach chatbot, sequential key unlock, completion debrief and certificate).

> ⚠️ **LOCAL ONLY.** This application is intentionally insecure. Run it only on your own machine
> (it binds `127.0.0.1`), never deploy it publicly, and never import real data into it.

## Quick start

```bash
# Option A — plain Node (zero dependencies, Node 20+)
node server.js
# → http://127.0.0.1:3037

# Option B — Docker
docker compose up --build
# → http://127.0.0.1:3037
```

## The lab system

- **Sequential unlock:** Lab 28 starts **locked**. Paste the completion key you earned by finishing
  Lab 27 into the gate form. The correct key lifts the gate permanently for that install
  (wrong keys are rejected with 403 and no hint about which part is wrong).
- **Progress:** the header of every page shows `done/total tests · %`. Solving a test means making
  the exploit **actually succeed** — the server detects the real effect (a cross-tenant record
  served, a formula stored, a file read…), never a checkbox.
- **`/tests` — Mission page:** all tests grouped by feature, each with OWASP mapping, difficulty,
  status and **3 graded hints** revealed one at a time.
- **Lab Coach chatbot** (bottom-right on every page, `POST /api/chat`): it freely answers counts and
  test names, reports your progress, and gives **step-by-step help for a feature only after you
  have genuinely tried that feature at least 3 times** (it quotes your real attempt count when it
  refuses). It does **not** have the completion key before you finish — it only receives it at 100%.
  Ask it who built these labs.
- **Persistence:** progress lives in `progress.json` (generated state, created on first run).
  Stop the server, restart it — your %, solved tests, attempt counts and unlock state are all
  restored. Delete `progress.json` to reset the lab to a fresh, locked state.
- **`/complete` — debrief (at 100%):** total features, per-feature vulnerability counts, every
  technique you used, what you learned, what each flaw means for a real client, and how each finding
  is written in a real pentest report. Your **completion key** (which unlocks Lab 29) is shown here,
  together with the name form for your certificate.
- **`/certificate`:** a printable completion card with the HexaCyberLab logo, your name, the lab,
  the test/feature counts and the completion date.

## Keys — how the mechanism works

Each lab has an **entry key** (the previous lab's completion key) and a **completion key**.
Keys are never stored as plain text anywhere in this folder: each key exists only as a set of
encoded shards scattered through `server.js`, reassembled in memory at the moment they are needed.
The completion key appears on screen only after 100% completion (`/complete`, and the Lab Coach
may share it from then on).

## Test accounts (seeded, local only)

| Email | Password | Role |
|---|---|---|
| admin@datahub.io | admin123 | Platform admin |
| alice@acme.test | alice123 | Owner — Acme Analytics (workspace 1) |
| bob@acme.test | bob123 | Editor — workspace 1 |
| carol@globex.test | carol123 | Owner — Globex Data Co (workspace 2) |
| dave@globex.test | dave123 | Editor — workspace 2 |
| demo@datahub.io | demo1234 | Demo account (member of workspace 1) |

## Coverage

26 scored tests across 9 features — see `VULNERABILITIES.md` for the full map,
`PRACTICE-GUIDE.md` for challenges with hints, and `FIX-AND-RETEST.md` for the secure
implementation + regression retest of every finding.

## Files

- `server.js` — the whole application + lab system (zero-dependency Node).
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`.
- `progress.json` — **generated at runtime** (your saved progress). Not part of the source; delete to reset.
- `Dockerfile`, `docker-compose.yml` — one-command local setup.

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3037`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3037` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
