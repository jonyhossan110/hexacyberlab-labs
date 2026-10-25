# HexaPodcast — LAB 85

⏱ **Estimated time:** ~3h 10m (guided pace) · 🎚 **Difficulty:** Beginner · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 9: Media, Social & Community** · Port **3094** · Zero-dependency Node.js

A complete, deliberately vulnerable podcast platform for hands-on security training: shows, episodes, creators, listeners, subscriptions, premium episodes, creator analytics, episode comments/ratings and creator payouts — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion summary and certificate).

> **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine/lab network. Never deploy it publicly. All accounts, shows and payment data are fake seed data held in memory; audio playback is simulated in-app.

## Run it

```bash
node server.js
# → http://127.0.0.1:3094
```

Or with Docker:

```bash
docker compose up --build
```

Requires Node 20+ (no npm packages — built-ins only).

## The lock gate

Labs are numbered and unlock **sequentially**. LAB 85 starts locked: paste the **completion key from Lab 84** on the gate to start. The key is verified exactly; a correct key lifts the gate permanently for that install (stored in `progress.json`).

## The lab system

- **Progress bar** — every page header shows `LAB 85 · done/total tests · pct%`. Progress = scored tests completed by *doing* the exploit; the server detects the real effect (a session granted, an object served to the wrong user, a price accepted below catalogue truth…). There is no "mark done" button.
- **Mission Board (`/tests`)** — all tests grouped by feature, with status, per-feature attempt counts and a **Hints** control that reveals three graded hints (nudge → stronger → near-answer) one at a time.
- **Lab Coach (chat widget)** — knows every test in the lab. It answers counts and test names freely, but step-by-step help for a feature unlocks only after you have made **at least 3 genuine attempts** on that feature — it quotes your real attempt count when it refuses. Ask it who built the labs.
- **Persistence** — state lives in `progress.json` in this folder (generated at first boot; listed in `.gitignore`). Quit and restart any time: your % and attempt counts resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete`)** — at 100% you get the full debrief: total features, per-feature vulnerability counts, the ways testing was done, what you learned, what each flaw means for a real client, and how each finding is written in a real pentest report — followed by the **completion key** for the next lab.
- **Certificate (`/certificate`)** — a printable completion card with the HexaCyberLab logo and your tester name (set it on `/complete`).
- **Keys** — completion keys are unguessable and are never stored as plain text anywhere in the code or docs; each key exists only as encoded fragments scattered through the source, assembled in memory at the moment of verification or reveal. The coach receives the key only once the lab is at 100% — before that it cannot share what it does not have.

## Test accounts (fake, local only)

| Role     | Email                      | Password   |
|----------|----------------------------|------------|
| Admin    | admin@hexapodcast.local    | admin123   |
| Creator  | creator@hexapodcast.local  | creator123 |
| Creator  | maya@hexapodcast.local     | maya123    |
| Listener (Premium) | alice@test.local | alice123   |
| Listener (Free)    | bob@test.local   | bob123     |

## What is inside

26 scored tests across 9 features — see `VULNERABILITIES.md` for the complete map, `PRACTICE-GUIDE.md` for challenges with hints and objectives, and `FIX-AND-RETEST.md` for the secure implementation and retest of every finding. The three docs are generated from the app's test registry (`node server.js --gen-docs`) so they can never drift from the code.

## Files

- `server.js` — the whole app + lab system (single file, no dependencies)
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `progress.json` — **generated runtime state** (not source; safe to delete to reset)

---

HexaCyberLab — Built by Md. Jony Hassain, Founder. Part of the 110-lab HexaCyberLab practice programme.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3094`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3094` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
