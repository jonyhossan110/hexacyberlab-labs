# HexaHealthInsure — LAB 70 of 110

**Category 7: Healthcare & Wellness** · A deliberately vulnerable health-insurance portal, built for local, hands-on web penetration-testing practice.

HexaHealthInsure is a complete (fictional) insurance portal: member / provider (clinic) / adjuster / admin accounts, coverage plans with annual limits, insurance claims, eligibility checks, pre-authorization requests, and provider billing. **All people, plans, claims and money are fake seed data. Nothing connects to any real insurer or service.**

> ⚠️ **Local training only.** This application is intentionally insecure. Run it only on your own machine / lab network, never on a public server.

## Run it

```bash
node server.js
# → http://127.0.0.1:3079
```

Or with Docker:

```bash
docker compose up --build
```

Requires Node.js 20+ (zero dependencies — no `npm install` needed).

## The lab system

- **Lock gate:** LAB 70 starts locked. Paste the **completion key from Lab 69** on the gate page to unlock it. (Keys are a chain: completing a lab 100% reveals the key that unlocks the next lab. Inside the code each key exists only as split, encoded shards scattered through `server.js` — it cannot be found whole in the source, and the Lab Coach does not know it until you finish.)
- **Progress:** the header bar and the **Mission Board** at `/tests` show your score. There are **26 scored tests across 10 features**. A test completes **only when the exploit actually succeeds** and the server detects its real effect — there is no "mark done" button.
- **Hints:** every test on `/tests` has 3 graded hints (nudge → stronger → near-answer).
- **Lab Coach chatbot:** the chat widget (bottom-right of every page) knows the lab's map: test names and counts are public, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — the coach reads your real attempt counters and quotes them. Ask it *"who built this"* for attribution. It receives the completion key only when you reach 100%.
- **Persistence:** your progress (tests passed, attempt counts, unlock state) is saved to `progress.json` in this folder and **survives restarts** — leave and resume any time, it never resets to zero on its own. `progress.json` is generated runtime state (delete it to reset the lab to a fresh, locked state).
- **Completion:** at 100%, `/complete` shows the full debrief — per-feature vulnerability counts, what you learned, what each flaw would mean for a real client, how to write each finding in a professional pentest report, and the **completion key** for Lab 71. `/certificate` renders a printable certificate card with the HexaCyberLab logo.

## Test accounts (fake seed data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexainsure.local | admin123 |
| Adjuster | adjuster@hexainsure.local | adjuster123 |
| Provider (City Clinic) | cityclinic@hexainsure.local | clinic123 |
| Provider (MediCare Center) | medcare@hexainsure.local | medcare123 |
| Member — Gold plan | alice@example.com | alice123 |
| Member — Silver plan | bob@example.com | bob123 |
| Member — Bronze plan | carol@example.com | carol123 |
| Member — Silver plan | dave@example.com | dave123 |

## Files

- `server.js` — the whole application (app + lab system) in one zero-dependency file
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)

## Safety

Binds to `127.0.0.1` only. No real credentials, no external calls, no real health or payment data. Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab HexaCyberLab practice programme.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3079`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3079` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
