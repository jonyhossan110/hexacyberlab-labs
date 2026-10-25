# HexaInvoice — Vulnerable Invoicing SaaS Practice Lab

⏱ **Estimated time:** ~3h 45m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**LAB 15 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaInvoice is an **intentionally vulnerable** training application. It contains real, working security flaws (invoice tampering, forged payment status, cross-account IDOR, broken exports and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every firm, client, invoice and password is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working invoicing SaaS in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the business data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Two firms (multi-tenant): **BrightLedger Accounting** and **PixelCFO Services**, each with its own clients and invoices
- Roles: firm **owner** (accountant), **staff**, **client viewer** (sees one client's invoices), platform **admin**
- Clients with contacts and addresses
- Invoices with line items from a services catalogue, tax rates, discounts, due dates, and statuses (draft / sent / paid / overdue)
- Payments and printable receipts
- **Recurring templates** that generate invoices on a cycle
- Invoice search, CSV export of all invoices, and a small JSON API (`/api/invoices`, `X-API-Key`)
- Admin console with user management

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 15 opens only with the **completion key from Lab 14 (HexaHR)**:

1. Start the server (below) and open http://127.0.0.1:3024 — you will see the lock screen.
2. Paste Lab 14's completion key and click **Unlock Lab 15**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 16's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **26 scored security tests** across **9 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3024/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a forged paid status, a cross-account invoice read, a $1 "settlement"…) and ticks the test off itself.
- **Progress persists.** Your score, per-feature attempt counts and unlock state live in `progress.json` in this folder (generated state — safe to delete to reset the lab to its fresh, locked state). Close the lab at 40% and you resume at 40%.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing all of a feature's tests also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 16. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js 20+ (any current LTS). No `npm install` — zero dependencies.

```bash
cd hexainvoice-vuln-lab
node server.js
# open http://127.0.0.1:3024
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3024
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Firm owner (BrightLedger) | owner@hexainvoice.local | Owner@123 | Full access, account 1 |
| Staff (BrightLedger) | staff@hexainvoice.local | Staff@123 | Day-to-day invoicing |
| Client viewer (NovaTech) | viewer@novatech.local | Viewer@123 | Should see only NovaTech's invoices |
| Firm owner (PixelCFO) | owner@pixelcfo.local | Pixel@123 | The *other* firm, account 2 |
| Platform admin | admin@hexainvoice.local | *(see VULNERABILITIES.md — finding it is a test)* | User management |

Services catalogue (server-side price truth): Bookkeeping (monthly) $300 · VAT return filing $150 · Payroll processing $200 · Audit support (per hour) $120. Standard VAT is 15%; firm policy caps discounts at 20%.

## Reset

Delete `progress.json` and restart — the lab returns to its fresh, locked state at 0%.

## Files

- `server.js` — the whole app + lab system (intentional flaws are marked `// VULN(...)` comments)
- `VULNERABILITIES.md` — the 26 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 26 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress + unlock state (auto-created; delete to reset)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3024`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3024` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
