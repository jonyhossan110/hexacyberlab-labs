# HexaDirectory — LAB 100

⏱ **Estimated time:** ~3h (guided pace) · 🎚 **Difficulty:** Beginner · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 10: Property, Jobs & Professional Services** · Port **3109** · Zero-dependency Node.js

A deliberately vulnerable **business directory** for hands-on web security practice: business listings with owners, listing claims, customer reviews, lead inquiries, paid premium placement, categories and search — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion certificate).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine / lab network (it binds `127.0.0.1`). Never deploy it to the internet. All accounts, businesses and data are fake.

## Quick start

```bash
node server.js          # http://127.0.0.1:3109
# or
docker compose up --build
```

Requires Node.js 20+ (no npm packages needed).

## Test accounts (fake, local only)

| Role   | Email                        | Password  |
|--------|------------------------------|-----------|
| Admin  | admin@hexadirectory.local    | admin123  |
| Owner  | alice@test.local             | alice123  |
| Owner  | bob@test.local               | bob123    |
| Member | carol@test.local             | carol123  |
| Owner  | dave@test.local              | dave123   |

## The lab system

- **Progress:** every page header shows `LAB 100 · <done>/<total> tests · <pct>%`. Progress is measured by the Mission Board at **`/tests`**.
- **Tests complete by DOING:** each of the 26 scored tests flips only when the server detects the real effect of the exploit — never by clicking "done".
- **Hints:** every test on `/tests` carries 3 graded hints (nudge → stronger → near-answer).
- **Lab Coach:** the chat widget (bottom-right, `POST /api/chat`) knows the full map. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature — before that, the coach refuses and tells you how many times you have tried. Ask it who built the labs!
- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 99** on the gate to unlock it (once — the gate then stays lifted for this install).
- **Persistence:** progress lives in `progress.json` (generated runtime state — safe to delete; deleting it resets the lab to a fresh, locked state). Your % and attempts survive restarts.
- **Completion:** at 100%, **`/complete`** shows the full debrief (features, per-feature vulnerability counts, techniques used, what you learned, what it means for a real client, and how each finding is written in a real pentest report) plus your **completion key**, which unlocks Lab 101. **`/certificate`** renders a printable certificate with the name you save on `/complete`.
- **Keys:** completion keys are unguessable and are never stored whole in the code — each exists only as encoded shards scattered through `server.js`, assembled in memory at reveal time. Before 100%, even the Lab Coach does not have the key.

## Files

- `server.js` — the whole app + lab system (built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives (generated)
- `FIX-AND-RETEST.md` — secure implementation + regression test for every finding (generated)
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated at runtime**; not part of the source

## Reset

Stop the server, delete `progress.json`, start again — the lab is fresh and locked.

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3109`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3109` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
