# HexaInsurance — LAB 47

⏱ **Estimated time:** ~3h 5m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **insurance portal** built for authorised, local-only
security training. It is LAB 47 of the HexaCyberLab lab programme
(Category 5: Finance, Payments & Insurance).

> ⚠️ **Local-only training software.** It contains intentional vulnerabilities.
> Run it only on your own machine/lab network. Never deploy it publicly.

## The business

HexaInsurance is a working insurance portal with:

- **Policyholder accounts** (customers, agents, a platform admin)
- **Policies** with coverage limits, premiums and renewal pricing
- **Claims** submission with incident details and **evidence uploads**
  (simulated file records)
- **Renewals** with per-policy renewal premiums
- An **agent claims-review queue** with approve/reject decisions
- An **admin console** for account management
- A JSON **partner API**

## Run it

```bash
node server.js
# → http://127.0.0.1:3056  (binds localhost only)
```

or with Docker:

```bash
docker compose up --build
```

Requires Node.js 20+ (zero dependencies — nothing to install).

## Test accounts

| Role       | Email                    | Password  |
|------------|--------------------------|-----------|
| Admin      | admin@hexainsure.local   | admin123  |
| Agent      | agent@hexainsure.local   | agent123  |
| Customer   | alice@test.local         | alice123  |
| Customer   | bob@test.local           | bob123    |
| Customer   | carol@test.local         | carol123  |
| Demo       | demo@hexainsure.local    | demo123   |

## The lab system

- **Lock gate:** the lab starts locked. Paste the **completion key from
  Lab 46** to unlock it. Each lab's completion key unlocks the next lab.
- **Progress:** 25 scored security tests across 8 features
  (Login & Authentication (6) · Registration & Profile (4) · Policies & Coverage (4) · Claims (4) · Renewals & Billing (2) · Agent Portal (2) · Admin Panel (1) · Platform & API (2)).
  Your percentage grows only when an exploit genuinely succeeds — tests are
  detected server-side, never by ticking a box.
- **/tests — Mission page:** every test grouped by feature, with its OWASP
  category, difficulty, status, per-feature attempt counts, and 3 graded
  hints revealed one at a time.
- **Lab Coach chatbot:** knows the full test map. It answers counts and test
  names freely, but step-by-step guidance for a feature unlocks only after
  you have made **at least 3 genuine attempts** on that feature (or passed
  its tests). It does not receive the completion key until you reach 100%.
- **Persistence:** progress is stored in `progress.json` (generated state,
  safe to delete to reset the lab). Stop and restart the server any time —
  your percentage and unlock state are exactly where you left them.
- **/complete:** at 100% you get the full debrief — features and per-feature
  vulnerability counts, every technique used, what you learned, what each
  flaw means for a real client, and how to write it in a real pentest
  report — plus the **completion key for Lab 48**.
- **/certificate:** a printable completion certificate with the
  HexaCyberLab logo and your name.
- **Keys:** completion keys never appear as plain text in the code. Each is
  split into encoded shards scattered through `server.js` and assembled
  only at its reveal moment.

## Reset

Delete `progress.json` and restart the server — the lab returns to its
fresh, locked state.

## Files

- `server.js` — the whole application (business app + lab system)
- `VULNERABILITIES.md` — the complete vulnerability map (all 25 tests)
- `PRACTICE-GUIDE.md` — hands-on challenges with hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix every flaw and verify the fix
- `Dockerfile` / `docker-compose.yml` — one-command local setup
- `logo.png` — the HexaCyberLab logo, served at `/logo.png`

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the
110-lab HexaCyberLab training programme.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3056`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3056` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
