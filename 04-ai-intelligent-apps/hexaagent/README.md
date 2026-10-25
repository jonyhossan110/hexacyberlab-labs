# HexaAgent — LAB 35 (Category 4: AI & Intelligent Applications)

⏱ **Estimated time:** ~3h 45m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

An AI agent platform with user accounts, agents carrying **confidential instructions**, tools with
permission levels, **simulated** task runs (all tool execution is simulated inside the app — no real
commands are run and no external network calls are made), run logs, shared agents and API keys.

Built for **local, authorised security practice only**. Bind: `127.0.0.1:3044`. Zero-dependency Node.js.

## Run it

```bash
node server.js            # http://127.0.0.1:3044
# or
docker compose up --build
```

## The lab system

- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 34** to unlock it.
  Keys are never stored in plain text anywhere — each key exists only as encoded shards inside
  `server.js`, assembled in memory at the moment of verification/reveal.
- **Progress:** every scored vulnerability is a *test* on the **/tests** mission page. Tests complete
  only when the exploit genuinely succeeds (detected server-side) — never by clicking. Progress,
  attempts and unlock state live in `progress.json` (generated at runtime; deleted = fresh lab) and
  survive restarts.
- **Hints:** 3 graded hints beside every test.
- **Lab Coach chatbot:** knows every feature's test map and your progress. Step-by-step help for a
  feature unlocks only after you have **genuinely tried that feature at least 3 times**. It does not
  hold the completion key — it receives it only when you reach 100%.
- **Completion:** at 100%, **/complete** shows the full debrief (features, per-feature counts, what you
  learned, what each flaw means for a real client, how to write it in a pentest report) plus the
  completion key for Lab 36, and **/certificate** renders a printable certificate with the HexaCyberLab
  logo.

## Test accounts

| Email | Password | Role |
|---|---|---|
| admin@hexaagent.local | admin123 | admin |
| alice@hexaagent.local | alice123 | member |
| bob@hexaagent.local | bob123 | member |
| demo@hexaagent.local | demo | member |

## Coverage

26 scored tests across 6 features — see `VULNERABILITIES.md` for the complete map,
`PRACTICE-GUIDE.md` for challenges with hints, and `FIX-AND-RETEST.md` for the secure
implementation + regression check for every test.

## Safety

Local-only practice software with intentional vulnerabilities. Never deploy it publicly, never put
real credentials or data in it. `progress.json` is generated state (git-ignored).

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3044`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3044` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
