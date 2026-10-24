# HexaBank — Vulnerable Banking Simulator Practice Lab

**LAB 43 of the HexaCyberLab practice-lab series** (Category 5: Finance, Payments & Insurance).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaBank is an **intentionally vulnerable** training application. It contains real, working security flaws (transfers out of other customers' accounts, money creation via negative amounts, forged admin sessions, a credential-dumping debug endpoint and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every customer, account, balance, loan and password is fake seed data. **Nothing connects to any real bank, and no real money exists anywhere in this app.** No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working banking simulator in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the business data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Customer accounts: **Savings** and **Current** accounts with balances and transaction ledgers
- Printable **statements** per account plus **CSV statement export**
- **Transfers** between accounts (with a published $5,000 daily limit policy)
- **Payees** (saved beneficiaries) with add/delete
- **Loan summaries** (home / personal / auto) with a staff rate-adjustment function
- Roles: **customer**, **staff (teller)**, platform **admin** — a staff console and an admin panel with account freeze
- A small JSON API (`/api/accounts`, `X-API-Key`) and self-service registration, profile, forgot/reset password

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 43 opens only with the **completion key from Lab 42 (HexaPay)**:

1. Start the server (below) and open http://127.0.0.1:3052 — you will see the lock screen.
2. Paste Lab 42's completion key and click **Unlock Lab 43**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 44's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **26 scored security tests** across **8 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3052/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (money leaving someone else's account, a $6,000 transfer beating the $5,000 limit, a customer rewriting their own loan rate…) and ticks the test off itself.
- **Progress persists.** Your score, per-feature attempt counts and unlock state live in `progress.json` in this folder (generated state — safe to delete to reset the lab to its fresh, locked state). Close the lab at 40% and you resume at 40%.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing all of a feature's tests also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 44. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js 20+ (any current LTS). No `npm install` — zero dependencies.

```bash
cd hexabank-vuln-lab
node server.js
```

Then open http://127.0.0.1:3052

**Docker (optional):**

```bash
docker compose up --build
```

## Test accounts (all fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexabank.local | admin123 | Platform admin (default credentials — one of the tests) |
| teller@hexabank.local | Teller@123 | Staff / teller |
| alice@hexabank.local | Alice@123 | Customer — accounts HB-100101 (Savings), HB-100102 (Current) |
| bob@hexabank.local | Bob@1234 | Customer — account HB-100201 (Savings) |
| carol@hexabank.local | Carol@123 | Customer (premium) — accounts HB-100301 (Current), HB-100302 (Savings) |
| dave@hexabank.local | Dave@123 | Customer — account HB-100401 (Current) |

## Files

- `server.js` — the whole app + lab system (single file)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — 26 challenges with objectives, hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each flaw and regression-test the fix
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the HexaCyberLab logo (served at /logo.png)
- `progress.json` — **generated at runtime** (your progress); delete it to reset the lab

---

HexaCyberLab — Built by **Md. Jony Hassain**, Founder. Lab 43 of 110.
