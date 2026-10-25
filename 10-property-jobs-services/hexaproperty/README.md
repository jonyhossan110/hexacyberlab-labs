# HexaProperty — LAB 91

⏱ **Estimated time:** ~3h 5m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 10: Property, Jobs & Professional Services** · Port **3100** · Zero-dependency Node.js

A complete, deliberately vulnerable **real estate portal** for hands-on web security practice:
property listings (active / draft / sold), owners and agents, buyer inquiries with private contact
details, saved searches with budget alerts, viewing appointments, featured (paid) listings and an
admin panel — wrapped in the full HexaCyberLab lab system.

> **LOCAL-ONLY.** This application is intentionally insecure. Run it only on your own machine or an
> isolated lab network. Never deploy it publicly. All people, properties and data are fake.

## Run it

```bash
node server.js            # http://127.0.0.1:3100
# or
docker compose up --build
```

Requires Node.js 20+ (no npm install — zero dependencies).

## The lock gate

Labs are numbered and unlock **in sequence**. Lab 91 starts locked: every page shows only the gate.
Paste the **completion key you earned at 100% in Lab 90** into the gate form and the lab opens
permanently for this install.

**How the keys work (mechanism only):** each lab carries two keys — the entry key that opens it and
the completion key it awards at 100%. A completion key is the next lab's entry key. Keys are never
stored as plain text anywhere in the code or docs: each one is split into multiple encoded shards
scattered across `server.js` and reassembled only at the moment it is needed (unlock check, or the
100% reveal). Before 100%, not even the Lab Coach has the completion key.

## The lab system

- **Progress bar** — every page header shows `LAB 91 · done/total tests · %`.
- **Mission Board (`/tests`)** — all 26 scored tests grouped by feature, each with OWASP mapping,
  difficulty, status, your attempt count for that feature, and **3 graded hints**.
- **Tests complete by DOING** — a test flips to DONE only when the server observes the real effect
  of the exploit (a draft listing actually served, an order actually repriced, an account actually
  taken over). There is no "mark done" button.
- **Lab Coach (chat widget, `POST /api/chat`)** — knows every test. It answers counts and test names
  freely, but **step-by-step help for a feature unlocks only after 3 genuine attempts** on that
  feature; before that it tells you how many times you have tried. It refuses to reveal the completion
  key before 100% — and it knows who built these labs.
- **Persistence** — progress is stored in `progress.json` (generated runtime state, git-ignored).
  Close the lab, restart it, and you resume from your saved % and attempt counts.
- **Completion (`/complete`)** — at 100%: the full debrief (features, per-feature vulnerability
  counts, techniques used, what you learned, what each flaw means for a real client, and how to write
  each finding in a real pentest report), then your **completion key** for Lab 92.
- **Certificate (`/certificate`)** — at 100%: a printable certificate card with the HexaCyberLab
  logo, your name (set it on `/complete`), the test/feature counts and the completion date.

## Test accounts (all fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexaproperty.local | admin123 |
| Owner | olivia@hexaproperty.local | olivia123 |
| Owner | omar@hexaproperty.local | omar123 |
| Agent | adam@hexaproperty.local | adam123 |
| Buyer (demo, shown on the login page) | bella@hexaproperty.local | bella123 |
| Buyer | ben@hexaproperty.local | ben123 |

## Files

- `server.js` — the whole application (app + lab system), zero dependencies
- `VULNERABILITIES.md` — the complete map: all 26 tests by feature
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives (mirrors `/tests`)
- `FIX-AND-RETEST.md` — the secure implementation and regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — **generated at runtime** (your progress); delete it to reset the lab to fresh

Regenerate the three registry docs after editing the TESTS registry: `node server.js --gen-docs`.

---
HexaCyberLab practice labs — built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3100`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3100` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
