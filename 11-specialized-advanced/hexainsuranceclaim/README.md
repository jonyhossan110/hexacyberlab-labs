# LAB 107 — HexaInsuranceClaim

⏱ **Estimated time:** ~3h 30m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

An **intentionally vulnerable** insurance claims processing platform for hands-on web penetration-testing practice. Category 11 — Specialized & Advanced Business Systems, part of the HexaCyberLab 110-lab programme.

> ⚠️ **Local training only.** Run it on your own machine/lab network. It is deliberately insecure. Never deploy it to a public server. All data is fake seed data.

## The business app

HexaClaim Insurance: policyholders hold Auto/Home/Health policies, file claims, upload evidence and track payouts. Adjusters review and approve claims and release payouts. Admins manage users. Features include login/registration, password reset, claim search, an adjuster console, document downloads, an admin panel and a JSON API.

## Run it

Zero-dependency Node.js (built-ins only):

```bash
node server.js          # http://127.0.0.1:3116
```

or with Docker:

```bash
docker compose up --build
```

## Test accounts

| Role | Email | Password |
|---|---|---|
| Administrator | admin@hexaclaim.local | admin123 |
| Adjuster | adjuster@hexaclaim.local | adjuster123 |
| Policyholder | alice@test.local | alice123 |
| Policyholder | bob@test.local | bob123 |
| Policyholder | carol@test.local | carol123 |

## The lab system

- **Progress:** every solved test raises your percentage (header bar on every page). Tests are scored only when the exploit's real effect happens on the server — there are no "mark done" buttons.
- **Mission Board (`/tests`):** all 26 tests across 8 features, each with 3 graded hints revealed one at a time, plus the live attempt count per feature.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the full test map and your progress. Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times — before that it refuses and tells you how many tries you have made. It also knows who built these labs.
- **Lock gate:** this lab starts locked. Paste the completion key you earned at 100% in Lab 106 to unlock it. `POST /unlock` verifies the key.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the techniques used, what you learned, what it means for a real client, and how to write each finding in a real pentest report — plus the **completion key** that unlocks Lab 108.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo once you reach 100%.
- **Persistence:** progress is stored in `progress.json` in this folder (generated runtime state — it is git-ignored). Stop and restart the server and you resume exactly where you left off, attempts included.
- **Keys:** each lab's unlock/completion keys are unguessable and are never stored as plain text anywhere in this package — they exist inside `server.js` only as encoded shards scattered through the code, are assembled only at the moment they are needed, and the completion key is revealed only at 100% (the Lab Coach does not have it before then).

## Files

- `server.js` — the whole app + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives (generated)
- `FIX-AND-RETEST.md` — secure fix + regression test for every finding (generated)
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `docs/` — public documents served by the app

Regenerate the three docs after editing the registry: `node server.js --gen-docs`.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3116`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3116` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
