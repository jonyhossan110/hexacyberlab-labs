# LAB 86 — HexaMusic

⏱ **Estimated time:** ~3h 25m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 28
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **music streaming platform** built for hands-on web penetration-testing practice. Part of the HexaCyberLab 110-lab programme (Category 9: Media, Social & Community).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine/lab network. Never deploy it publicly. All accounts, tracks and data are fake seed data. All "audio" is simulated — no real media files exist.

## The business app

HexaMusic is a small streaming service: listener accounts (free/premium tiers), artist accounts, albums and tracks (including premium-only and unreleased tracks), playlists (public/private, share links), artist royalty & licensing metadata, artist earnings, premium upgrades and promo codes, and an admin panel.

## Quick start

```bash
node server.js          # http://127.0.0.1:3095
```

or with Docker:

```bash
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## Test accounts (fake, lab-only)

| Email | Password | Role / Tier |
|---|---|---|
| admin@hexamusic.local | admin123 | admin / premium |
| nova@hexamusic.local | nova123 | artist A1 (Nova Reverb) |
| echo@hexamusic.local | echo123 | artist A2 (Echo Park) |
| alice@test.local | alice123 | listener / free |
| bob@test.local | bob123 | listener / premium |
| demo@hexamusic.local | demo123 | listener / free (also printed on the login page — that is one of the flaws) |

## The lab system

- **Lock gate:** the lab starts locked. Paste the **completion key from Lab 85** to unlock it. The key you earn here at 100% unlocks Lab 87. Keys never appear in the source as plain text — each is split into encoded shards scattered through the code and assembled only at the moment of verification/reveal.
- **Progress:** 26 scored tests across 9 features. A test flips to done only when the server detects the *real effect* of the exploit (an IDOR actually serving someone else's object, a tampered price actually being accepted, …). There is no "mark done" button.
- **Mission Board (`/tests`):** every test grouped by feature, with status, per-feature attempt counts, and 3 graded hints per test.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the whole map and your progress. It answers counts and test names freely, but step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature (or when the feature is complete). It does **not** have the completion key until you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated at runtime — it is in `.gitignore`). Stop and restart the server any time; your % and attempt counts resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus your completion key.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.

## Docs

- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure implementation and retest for every finding.

(The three docs are generated from the test registry in `server.js` via `node server.js --gen-docs`, so they can never drift from the app.)

## Files

`server.js` (the whole app) · `README.md` · `VULNERABILITIES.md` · `PRACTICE-GUIDE.md` · `FIX-AND-RETEST.md` · `Dockerfile` · `docker-compose.yml` · `logo.png` (the real HexaCyberLab logo) · `progress.json` (generated state — do not commit).

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3095`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3095` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
