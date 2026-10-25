# HexaSupport — Vulnerable Customer-Support SaaS Practice Lab

⏱ **Estimated time:** ~3h 25m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**LAB 18 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaSupport is an **intentionally vulnerable** training application. It contains real, working security flaws (ticket IDOR, internal-note leakage, role spoofing, SLA tampering and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, ticket, note and SLA is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working customer-support SaaS in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the helpdesk** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout with **customer, agent and supervisor** roles; forgot/reset password
- **Support tickets** with categories of work: priorities (Low → Critical), statuses, and **SLA timers** with breach flags
- Customers open and track their own tickets
- Agents work a **queue** (tickets assigned to them + unassigned), reply, assign and close
- **Internal agent notes** on tickets (staff-only information)
- **Canned responses** — shared reply templates owned by agents and the supervisor
- Ticket **search**, a customer directory, and file **attachments** on tickets
- **Supervisor admin panel**: all accounts and the SLA target settings
- A small **API** (`/api/tickets`, `/api/customers`)

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 18 opens only with the **completion key from Lab 17**:

1. Start the server (below) and open http://127.0.0.1:3027 — you will see the lock screen.
2. Paste Lab 17's completion key and click **Unlock Lab 18**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 19's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **25 scored security tests** across **7 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3027/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a foreign ticket served, an internal note rendered to a customer, a tampered SLA applied…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated at runtime — not part of the source). Close the lab and come back tomorrow — you resume from the same % (e.g. 40%), never from zero. Delete `progress.json` to reset the lab to its locked, fresh state.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 19. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js LTS (v20+). No npm install — zero dependencies.

```bash
cd hexasupport-vuln-lab
node server.js
# open http://127.0.0.1:3027
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3027
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Supervisor | sup@hexasupport.local | Super@123 |
| Agent | agent@hexasupport.local | Agent@123 |
| Agent | ravi@hexasupport.local | Ravi@123 |
| Customer | nadia@hexasupport.local | User@123 |
| Customer | omar@hexasupport.local | User@123 |

(One more account exists in the seed data — finding it is one of the tests.)

## Reset

- **Progress reset:** delete `progress.json` and restart — the lab returns to its locked fresh state.
- **Business data reset:** just restart the server — tickets, users and canned responses reseed in memory. Files added under `uploads/` by attachment tests can be deleted (keep `.gitkeep`).

## Files

- `server.js` — the whole app + lab system
- `VULNERABILITIES.md` — the 25 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 25 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created at runtime; delete to reset)
- `uploads/` — ticket attachments uploaded during testing

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3027`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3027` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
