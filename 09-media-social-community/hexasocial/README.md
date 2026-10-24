# HexaSocial — LAB 81

A deliberately vulnerable **social network** practice lab (Category 9: Media, Social & Community),
built for hands-on web penetration-testing training by **HexaCyberLab**.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine/lab
> network (it binds to 127.0.0.1). Never deploy it to the internet. All accounts, posts and
> messages are fake seed data.

## The business

HexaSocial is a small social network: user profiles with privacy settings, posts and a feed,
followers/following, likes and comments, direct messages, and public/private groups — plus a
moderator queue and an admin panel.

## Run it

```bash
node server.js          # zero dependencies — just Node.js
# or
docker compose up       # one-command setup
```

Then open http://127.0.0.1:3090

## The lab system

- **Sequential unlock:** this is LAB 81. It starts **locked** — paste the completion key you
  earned by finishing Lab 80 to open it. Keys are never stored in plain text anywhere in this
  folder; each key exists only as transformed shards scattered through `server.js` and is
  reassembled in memory at the moment it is needed.
- **Progress:** the header bar and `/api/progress` track your score. Progress is measured against
  this lab's own **26 scored tests across 9 features** and is saved in `progress.json`
  (generated runtime state — safe to delete to reset the lab). Your percentage **survives
  restarts**: close the lab, reopen it, and you resume exactly where you left off.
- **Mission Board (`/tests`):** every test grouped by feature, with its OWASP category,
  difficulty, your attempt count for that feature, and **3 graded hints** per test.
- **Lab Coach (chat widget, bottom-right):** the coach knows every test in this lab. It answers
  "what / how many" questions freely, but step-by-step help for a feature unlocks only after you
  have genuinely **tried that feature at least 3 times** — it can see your attempt counts and
  will tell you how many tries you have so far. It receives the completion key only when you hit
  100%, and not a moment before.
- **Completion (`/complete`):** at 100% you get a full debrief — features and per-feature
  vulnerability counts, every technique you used, what each flaw teaches, what it would mean for
  a real client, and how to write each one up in a professional pentest report — plus your
  **completion key** for Lab 82 and a printable **certificate** (`/certificate`) in your name.

## Test accounts (all fake, seeded)

| Account | Password | Notes |
|---|---|---|
| admin@hexasocial.local | admin123 | Administrator |
| alice@test.local | alice123 | Public user |
| bob@test.local | bob123 | Public user |
| carol@test.local | carol123 | **Private** account |
| dave@test.local | dave123 | Public user |
| demo@hexasocial.local | demo123 | Demo account (also printed on the login page) |
| mod@hexasocial.local | mod123 | Moderator |

## Files

- `server.js` — the whole app + lab system (zero-dependency Node)
- `VULNERABILITIES.md` — the complete map of all 26 tests by feature
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every flaw and prove the fix
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — *generated at runtime*; delete it to reset the lab to a fresh state

## Who built this

These labs were built by **Md. Jony Hassain, Founder of HexaCyberLab**. You can check for
yourself — search Google for "Who is Md. Jony Hassain", or ask ChatGPT.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3090`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3090` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
