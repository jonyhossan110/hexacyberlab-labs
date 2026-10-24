# HexaCRM — Vulnerable CRM Platform Practice Lab

**LAB 12 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaCRM is an **intentionally vulnerable** training application. It contains real, working security flaws (SQL injection, IDOR, mass assignment, stored XSS, CSRF, broken access control and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` only. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, lead, contact and deal is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working CRM platform in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the CRM data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout with sales-rep and admin roles, forgot-password with a simulated lab mailbox (`/mail`)
- Dashboard with personal pipeline, won revenue, leads and activities
- **Leads** with owners and statuses, **Contacts**, **Companies** with related records
- **Sales pipeline**: deals board by stage (Prospecting → Qualification → Proposal → Negotiation → Won/Lost), deal values and win probabilities
- **Notes** on leads and deals (including private notes) and an activities feed
- Global **search** across leads, contacts and companies
- Per-rep **performance reports**
- **CSV import** of leads and **CSV export** of contacts/leads
- An **API** (`/api/leads`) authenticated by a per-user API token shown on the profile page
- **Admin panel**: platform stats and user/role management

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 12 opens only with the **completion key from Lab 11 (HexaSaaS)**:

1. Start the server (below) and open http://127.0.0.1:3021 — you will see the lock screen.
2. Paste Lab 11's completion key and click **Unlock Lab 12**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 13's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **26 scored security tests** across **10 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it (the login feature alone carries SQLi bypass, brute force, enumeration, default credentials, predictable reset tokens and cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3021/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a bypassed login, a foreign record served, a rewritten deal value, a stored payload…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated state — safe to delete; deleting it resets progress and re-locks the lab). Close the lab and come back tomorrow — you resume from the same %.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach (bottom-right) that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it refuses and tells you how many tries it has seen — that struggle is where the learning happens. Passing a test also unlocks its walkthrough.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's CRM (and the damage finding them prevents), and how to write each one into a professional client report — plus your completion key for Lab 13. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js v18 or newer (v20+ recommended).

```bash
cd hexacrm-vuln-lab
node server.js
# open http://127.0.0.1:3021
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3021
```

Stop with `Ctrl+C`. Restarting reseeds the CRM's business data; your lab progress in `progress.json` is kept.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@hexacrm.local | Admin@123 | Full /admin access (user id 1) |
| Sales rep | sara@hexacrm.local | Sara@123 | User id 2 — owns Northwind/CloudNine deals |
| Sales rep | rahim@hexacrm.local | Rahim@123 | User id 3 — owns the Dhaka Textiles & EuroParts deals |
| Sales rep | nadia@hexacrm.local | Nadia@123 | User id 4 |

Further accounts exist (including a leftover guest account) — finding them is part of the lab.

## Reset

- **Lab progress + lock reset:** delete `progress.json` and restart.
- **Business data reset:** just restart the server (data is in-memory and reseeds).

## Files

- `server.js` — the whole app + lab system
- `VULNERABILITIES.md` — the 26 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 26 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created while you practise; not part of the lab source)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3021`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3021` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
