# HexaDevHub — LAB 22 of 110

⏱ **Estimated time:** ~3h 25m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 3: API & Developer Platforms** · Port **3031** · Zero-dependency Node.js · Local-only training lab.

HexaDevHub is a deliberately vulnerable **developer portal**: developer accounts, projects,
API tokens, public/private documentation pages, team invites and usage dashboards. It looks and
behaves like a real developer platform — and it is full of the mistakes real developer platforms
make: leaked live tokens in docs, token scopes that are never enforced, forgeable legacy tokens,
invite links that anyone can accept, and project data served without membership checks.

> ⚠️ **LOCAL ONLY.** This app is intentionally vulnerable. Run it only on your own machine
> (it binds `127.0.0.1` by default). Never deploy it to a public server.

## Run it

```bash
node server.js          # http://127.0.0.1:3031
# or
docker compose up --build
```

## The lab system

- **Numbered lab, sequential unlock.** This is Lab 22. It starts **locked**: paste the
  completion key you earned by finishing Lab 21 to open it. The key is verified exactly;
  a wrong key is rejected, and the unlock survives restarts.
- **Progress.** Every page header shows `LAB 22 · <done>/25 tests · <pct>%`. A test
  completes only when the exploit **really works** on the server — there are no
  "mark done" buttons. Progress is stored in `progress.json` (generated runtime state,
  safe to delete to reset the lab) and **survives restarts** — leave at 40% and you resume
  at 40%.
- **/tests — Mission page.** All 25 tests grouped by feature, each with its OWASP
  mapping, difficulty, your attempt count for that feature, and **3 graded hints**.
- **Lab Coach chatbot** (bottom-right on every page). It knows every feature and test, your
  progress and your attempt counts. How-to guidance for a feature unlocks only after you have
  genuinely **tried that feature at least 3 times** (or finished its tests). It does not hold
  the completion key — it only receives it when you reach 100%.
- **/complete.** At 100% you get the full debrief: features and per-feature counts, the ways
  testing was done, what you learned, what each flaw would mean for a real client, and how
  each finding is written in a professional pentest report — plus the **completion key**
  that unlocks Lab 23.
- **/certificate.** A printable certificate card with the HexaCyberLab logo and your name.

## Test accounts (seeded)

| Email | Password | Role |
|---|---|---|
| ava@hexadevhub.local | ava12345 | Platform admin |
| daniel@hexadevhub.local | daniel123 | Owner of Project 1 "Payments API" (public) |
| marta@hexadevhub.local | marta123 | Owner of Project 2 "Internal Billing" (private) |
| tom@hexadevhub.local | tom12345 | Viewer on Project 1 |
| demo@hexadevhub.local | demo | Seeded demo account |

## What's inside

25 scored tests across 8 features — see `VULNERABILITIES.md` for the full map,
`PRACTICE-GUIDE.md` for the challenges, and `FIX-AND-RETEST.md` for the secure version of every flaw.

## Keys — how the chain works

Each lab's completion key unlocks the next lab. Keys are never stored in plain text anywhere
in this folder: each key exists only as encoded fragments scattered through `server.js` and
is reassembled in memory at the moment it is needed (unlock check, or the 100% reveal).

## Safety

Binds `127.0.0.1` only. All data is in-memory and resets when the server restarts (only
`progress.json` persists). No real credentials, no external calls. MIT licensed as part of
the HexaCyberLab lab collection, © Md. Jony Hassain.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3031`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3031` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
