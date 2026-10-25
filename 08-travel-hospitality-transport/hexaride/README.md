# HexaRide — LAB 74

⏱ **Estimated time:** ~2h 50m (guided pace) · 🎚 **Difficulty:** Beginner · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 8: Travel, Hospitality & Transport** · HexaCyberLab 110-Lab Programme

A deliberately vulnerable **ride-hailing simulator**: rider/driver/admin accounts, trip requests with distance-based fare estimates, automatic driver assignment, a trip status flow, wallet payments, driver earnings and payouts, promo codes and ratings. Built for hands-on web security practice (OWASP Top 10).

> ⚠️ **LOCAL USE ONLY.** The app is intentionally insecure. Run it only on your own machine/lab network. All accounts, people, places and money are fake seed data. Nothing connects to any real ride-hailing or payment service.

## Quick start

```bash
node server.js          # zero dependencies — just Node.js 18+
# or
docker compose up --build
```

Open http://127.0.0.1:3083

## The Lab System

- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 73** to unlock it. The gate lifts permanently for your install.
- **Progress:** every solved test raises your progress %. The header bar shows `done/total` on every page; `GET /api/progress` returns the same data as JSON.
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each with 3 graded hints and your per-feature attempt counts.
- **Detection is real:** tests complete only when the exploit actually succeeds and the server observes its effect (an IDOR read, a tampered fare being stored, a wallet actually moving…). There is no "mark done" button.
- **Lab Coach chatbot:** the chat widget (bottom-right) knows the full test map and your progress. It answers counts and names freely, but **step-by-step help for a feature unlocks only after ≥3 genuine attempts on that feature** — it can see your attempt counts and quotes them truthfully. It does **not** hold the completion key before you finish: ask early and it will refuse.
- **Persistence:** progress lives in `progress.json` (generated state — safe to delete to reset the lab; deleting it re-locks the lab and zeroes progress). Restart the server any time: your % and attempts resume exactly where you left them.
- **Completion (`/complete`):** at 100% you get the six-part debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write it in a real pentest report — plus the **completion key** for the next lab.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.
- **Keys:** each lab's entry/completion keys exist inside the code only as split, encoded shards scattered through `server.js`, assembled at runtime — a key can never be read whole from the source, the docs, or the chatbot before its reveal moment.

## Test accounts (unchanged training accounts)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexaride.local | admin123 |
| Rider | alice@test.local | alice123 |
| Rider | bob@test.local | bob123 |
| Driver | dave@test.local | dave123 |
| Driver | erin@test.local | erin123 |

## What to practise

See **VULNERABILITIES.md** for the full map (26 tests by feature), **PRACTICE-GUIDE.md** for challenges with hints and measurable objectives, and **FIX-AND-RETEST.md** for the secure implementation + regression test for every finding.

Highlights: SQL injection login bypass, predictable password-reset tokens, role-cookie tampering, fare & distance tampering, trip IDOR (routes of other riders), promo stacking / single-use reuse / retroactive promo refunds, wallet top-up forgery, negative payments, driver earnings IDOR, payouts above balance, rating manipulation, an admin panel with no access control, and a debug endpoint that dumps every account.

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md`, `PRACTICE-GUIDE.md`, `FIX-AND-RETEST.md` — generated from the in-code TESTS registry (`node server.js --gen-docs`)
- `Dockerfile`, `docker-compose.yml` — one-command container run (port 3083)
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — **generated at runtime** (your progress state); not source code

## Safety

Binds to `127.0.0.1` only. Never deploy this app publicly. Passwords are stored in plaintext **on purpose** (it is part of what the labs teach) — never reuse these credentials anywhere else.

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3083`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3083` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
