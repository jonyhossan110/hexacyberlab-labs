# HexaMedia — LAB 83

⏱ **Estimated time:** ~3h 5m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 9: Media, Social & Community** · Port **3092** · Zero-dependency Node.js

HexaMedia ("The Daily Byte") is a deliberately vulnerable digital-publication
practice lab: articles, authors and editors, a premium paywall, subscriptions,
comments, a newsletter and a full editorial workflow (draft → review →
published) — built to be broken, locally, for learning.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on
> your own machine / lab network. Never deploy it publicly. All people,
> articles, emails and data in the seed are fake.

## Start it

```bash
node server.js          # http://127.0.0.1:3092
# or
docker compose up --build
```

Requires Node.js 20+ (no npm packages — built-ins only).

## The lock gate

Labs are numbered and unlock in sequence. LAB 83 starts **locked**: every page
shows the gate until you paste the **completion key from Lab 82**. The key is
verified exactly; a wrong key gets a 403. Once unlocked, the lab stays unlocked
for that install (the state persists in `progress.json`).

At **100%** this lab reveals its own completion key on `/complete` — that key
unlocks **Lab 84**.

### How keys are stored (mechanism only)

No key ever appears whole in the source code or docs. Each key exists only as
six transformed fragments (base64 of reversed pieces) scattered in different
regions of `server.js`, reassembled in memory only at the moment of use: the
entry key inside the unlock check, the completion key only when progress hits
100%. The Lab Coach chatbot likewise only "learns" the completion key at 100%.

## The lab system

- **Progress** — every scored test you genuinely exploit raises your score.
  Progress % = solved / total. It **persists across restarts** in
  `progress.json` (generated state; safe to delete to reset the lab to fresh —
  the lock gate returns).
- **`/tests` — Mission Board** — all 26 tests grouped by feature, each with
  OWASP mapping, difficulty, status, the attempt count for its feature, and
  **3 graded hints**.
- **Lab Coach chatbot** (bottom-right, every page) — knows the full map: which
  features exist, how many tests each has, test names, and your progress.
  **Step-by-step help for a feature unlocks only after you have genuinely
  tried that feature at least 3 times** (it counts real attempts and quotes
  your count back to you). Ask it who built the labs.
- **`/complete`** — at 100%: the full debrief (features, per-feature counts,
  techniques used, what you learned, what each flaw means for a real client,
  and how to write each finding in a real pentest report), your completion key,
  and a name form for the certificate.
- **`/certificate`** — a printable certificate card with the HexaCyberLab logo.

## Test accounts (seeded, fake)

| Email | Password | Role | Plan |
|---|---|---|---|
| admin@hexamedia.local | admin123 | admin | premium |
| editor@hexamedia.local | editor123 | editor | premium |
| author@hexamedia.local | author123 | author | premium |
| alice@test.local | alice123 | reader | free |
| bob@test.local | bob123 | reader | premium |
| demo@hexamedia.local | demo1234 | reader | free |

## Files

- `server.js` — the whole app + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with graded hints and objectives
- `FIX-AND-RETEST.md` — the secure implementation + regression test per finding
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state** (created on first run; delete
  to reset; listed in `.gitignore`)

Documentation (VULNERABILITIES / PRACTICE-GUIDE / FIX-AND-RETEST) is generated
from the TESTS registry inside `server.js` via `node server.js --gen-docs`,
so counts can never drift from the app.

## Reset

```bash
# stop the server, then:
rm progress.json
```

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3092`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3092` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
