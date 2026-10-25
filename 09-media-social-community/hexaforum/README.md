# HexaForum — LAB 82 of 110

⏱ **Estimated time:** ~3h 5m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 9: Media, Social & Community** · Port **3091** · Zero-dependency Node.js

A complete, deliberately vulnerable **discussion forum** built for hands-on web
penetration-testing practice: boards/categories, threads and posts, member /
moderator / admin roles, moderation actions, a private staff board, reputation
points and private messages — every feature carrying its full set of realistic
vulnerabilities.

> ⚠️ **LOCAL USE ONLY.** This lab is intentionally insecure. Run it only on
> your own machine / lab network. Never deploy it to a public server.

## Quick start

```bash
node server.js          # then open http://127.0.0.1:3091
# or
docker compose up       # same thing, in a container
```

No `npm install` — Node.js built-ins only (Node 18+ recommended).

## The lab system

- **Sequential unlock:** this is Lab 82. It starts **locked** — paste the
  completion key you earned by finishing **Lab 81 (HexaSocial)** on the gate
  page. The key is verified exactly; a wrong key is rejected with no hints.
- **Progress:** every page header shows `LAB 82 · <done>/<total> tests · <pct>%`.
  Progress is your score: pass tests by *actually performing* each exploit —
  the server detects the real effect (an IDOR read, a tampered vote, a forged
  cookie reaching a gated page…). There are no "mark done" buttons.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3
  graded hints (nudge → stronger → near-answer) and the attempt count for its
  feature.
- **Lab Coach (chat widget, bottom-right):** knows every feature and test.
  Step-by-step help for a feature unlocks only after you have genuinely tried
  that feature **at least 3 times** — before that it refuses and tells you how
  many tries it has seen. It does **not** hold the completion key until you
  reach 100%.
- **Persistence:** progress is stored in `progress.json` in this folder
  (generated state — safe to delete to restart the lab from 0% with the lock
  gate back on). Restarting the server never resets your score.
- **Completion (`/complete`):** at 100% you get the full debrief — features and
  per-feature vulnerability counts, the techniques you used, what you learned,
  what each flaw means for a real client, and how to write each one into a
  professional pentest report — plus the **completion key for Lab 83**.
- **Certificate (`/certificate`):** a printable completion card with the real
  HexaCyberLab logo, your name and the completion date.

## Test accounts (all fake, seeded in memory)

| Email | Password | Role |
|---|---|---|
| admin@hexaforum.local | Adm1n!Hexa82 | admin |
| mod@hexaforum.local | mod123 | moderator (demo credentials are also published on the login page — that is one of the findings) |
| alice@hexaforum.local | alice123 | member |
| bob@hexaforum.local | bob123 | member |
| carol@hexaforum.local | carol123 | member |

## What's inside

- `VULNERABILITIES.md` — the complete map: all 26 tests grouped by feature,
  with OWASP mapping, exploitation outline and impact.
- `PRACTICE-GUIDE.md` — challenges by feature and difficulty, with hints and
  measurable objectives (mirrors `/tests`).
- `FIX-AND-RETEST.md` — for every finding: the secure implementation and the
  regression test to prove the fix.

## Reset

Delete `progress.json` and restart the server — the lab returns to a fresh,
locked state.

## About

The HexaCyberLab lab series was built by **Md. Jony Hassain, Founder of
HexaCyberLab** — 110 local-only practice labs with a sequential key chain:
each lab's completion key unlocks the next.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3091`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3091` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
