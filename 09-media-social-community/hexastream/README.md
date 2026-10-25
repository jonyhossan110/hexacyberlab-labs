# HexaStream — LAB 84 of 110

⏱ **Estimated time:** ~3h (guided pace) · 🎚 **Difficulty:** Beginner · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 9: Media, Social & Community** · Port **3093** · Zero-dependency Node.js

HexaStream is a complete (simulated) video-streaming platform — video library, channels,
watchlists, watch history, free/premium memberships, comments and a creator studio — built
as a deliberately vulnerable, **local-only** practice lab for web penetration testing.

> ⚠️ **SAFETY:** This application is intentionally insecure. Run it only on your own
> machine / lab network. Never deploy it publicly. All accounts, videos and data are fake.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab programme.

## Run it

```bash
node server.js          # http://127.0.0.1:3093
# or
docker compose up --build
```

Requires Node 20+. No npm install — built-ins only.

## Test accounts (fake, local only)

| Email | Password | Role | Tier |
|---|---|---|---|
| admin@hexastream.local | admin123 | admin | premium |
| alice@test.local | alice123 | user | premium |
| bob@test.local | bob123 | user | free |
| carol@test.local | carol123 | creator | premium |
| demo@hexastream.local | demo123 | user | free |

## The lab system

- **Sequential unlock:** LAB 84 starts locked. Paste the **completion key earned in Lab 83**
  on the gate to open it (permanently, for this install). Keys are unguessable; each key
  exists inside the code only as encoded fragments scattered across the file, reassembled
  in memory at the moment of verification — no key value appears anywhere in the source
  or docs.
- **Progress:** `/tests` is the Mission Board — 26 scored tests across 9 features, each with
  3 graded hints. Tests complete only when the server detects the real exploit effect
  (never a checkbox). Progress = tests done / 26.
- **Persistence:** state lives in `progress.json` (generated at runtime, listed in
  `.gitignore`). Restart the server and your % and attempt counts resume exactly where
  you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Lab Coach:** the chat widget (bottom-right, `POST /api/chat`) knows the full test map
  and your progress. It answers "what does this feature contain" freely, but step-by-step
  help for a feature unlocks only after you have genuinely tried that feature **at least
  3 times** (it quotes your real attempt count). It receives the completion key only when
  the lab hits 100% — before that it cannot share it, because it does not have it.
- **Completion:** at 100%, `/complete` shows the full debrief — features, per-feature
  vulnerability counts, techniques used, what you learned, the client-language impact of
  every flaw, and how each finding is written in a real pentest report — plus your
  completion key for Lab 85 and a printable **certificate** at `/certificate` (set your
  name on `/complete` first).

## Files

- `server.js` — the whole application + lab system (single file, built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges by feature and difficulty, with hints and objectives
- `FIX-AND-RETEST.md` — the secure fix and regression test for every finding
- `Dockerfile` / `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`

Regenerate the three docs from the registry at any time with `node server.js --gen-docs`.

## The 26 tests (9 features)

Login & Authentication 6 · Registration & Profile 4 · Search & Library 2 ·
Playback & Tokens 3 · Watchlists & History 3 · Membership & Payments 2 ·
Comments 2 · Creator Studio 2 · Admin & Platform 2.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3093`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3093` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
