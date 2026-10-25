# HexaAnalytics — Vulnerable Analytics Platform Practice Lab

⏱ **Estimated time:** ~3h 45m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**LAB 16 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaAnalytics is an **intentionally vulnerable** training application. It contains real, working security flaws (cross-account IDOR, share-link token guessing, report-builder injection, cookie-based privilege escalation and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, dataset, dashboard and report is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working multi-tenant analytics platform in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the business data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout with **admin**, **analyst** and **viewer** roles across two companies (tenants)
- **Dashboards** with KPI totals and metric tables per account
- **Datasets** with raw row views and **CSV / JSON exports**
- A **report builder**: pick a dataset, filter by region/channel, group results, save the report (optionally private)
- **Saved reports** with **shareable links**, an embed route, and link revocation
- **Scheduled reports** (daily / weekly / monthly) per account
- An **admin console** with a platform user directory API
- A JSON API (`/api/datasets`) authenticated by API key

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 16 opens only with the **completion key from Lab 15 (HexaInvoice)**:

1. Start the server (below) and open http://127.0.0.1:3025 — you will see the lock screen.
2. Paste Lab 15's completion key and click **Unlock Lab 16**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 17's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **25 scored security tests** across **9 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it (the login feature alone is tested six ways: injection bypass, brute force, enumeration, default credentials, predictable reset token, cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3025/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a cross-account export, a guessed share token, a forged admin cookie…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated state — safe to delete; deleting it resets progress to 0% and re-locks the lab). Close the lab and come back tomorrow — you resume from the same %.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 17. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js v20 or newer. Download: https://nodejs.org

```bash
cd hexaanalytics-vuln-lab
node server.js
# open http://127.0.0.1:3025
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3025
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@hexaanalytics.local | Admin@123 | Platform administrator |
| Analyst | nadia@hexaanalytics.local | User@123 | Northwind Retail (account 1) |
| Viewer | vera@hexaanalytics.local | User@123 | Northwind Retail — read-only role |
| Analyst | omar@hexaanalytics.local | User@123 | Globex Media (account 2) |
| Analyst | demo@hexaanalytics.local | demo123 | Seeded demo account |

Seeded content includes: 3 datasets (Retail Sales Q3, Globex Campaign Metrics, Website Traffic), 2 dashboards, 2 saved reports (one of them Globex's **private** revenue report, with a share link already issued), and 2 scheduled reports.

## Reset

- **Progress reset:** delete `progress.json` and restart — the lab returns to its locked, 0% state.
- **Business data reset:** restart the server — all in-memory data re-seeds.

## Files

- `server.js` — the whole app + lab system (intentional flaws are commented `// VULN: ...`)
- `VULNERABILITIES.md` — the 25 scored tests by feature: location, impact, severity, fix
- `PRACTICE-GUIDE.md` — the 25 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created; delete to reset)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3025`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3025` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
