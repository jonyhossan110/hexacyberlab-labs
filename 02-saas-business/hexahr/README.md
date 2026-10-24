# HexaHR — Vulnerable HR Management Practice Lab

**LAB 14 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaHR is an **intentionally vulnerable** training application. It contains real, working security flaws (payroll IDOR, leave self-approval, mass assignment, cookie role tampering and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` only. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every employee, salary, bank detail and leave request is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working HR management system in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data is seeded in memory at startup, so **restarting the server resets the company data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Employee directory with search — 8 active staff across 4 departments, plus restricted records
- Employee records: title, department, phone, home address, date of birth
- **Payroll**: individual payslips (salary breakdown + full bank details) and department payroll listings for managers
- **Leave management**: requests with manager approval workflow
- Roles: **HR admin / manager / employee**, enforced (badly) throughout
- Profile self-service: details, password change, document/avatar upload
- An employee API (`/api/employees`, `/api/export`) with API docs
- HR admin panel with employee deactivation
- A documents area (employee handbook)

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 14 opens only with the **completion key from Lab 13 (HexaProject)**:

1. Start the server (below) and open http://127.0.0.1:3023 — you will see the lock screen.
2. Paste Lab 13's completion key and click **Unlock Lab 14**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 15's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **24 scored security tests** across **8 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it (the login feature alone is tested for SQLi bypass, brute force, enumeration, default creds, predictable reset tokens and cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3023/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a colleague's payslip served to you, your own leave approved by you, a salary you edited yourself…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated at runtime — it is not source code). Close the lab and come back tomorrow — you resume from the same %, never from zero. Deleting `progress.json` resets the lab to its fresh, locked state.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse, quoting how many times you have tried — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's HR system (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 15. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js LTS (v18+, tested on v20+). Download: https://nodejs.org

```bash
cd hexahr-vuln-lab
node server.js
# open http://127.0.0.1:3023
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3023
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| HR admin | hana@hexahr.local | HrBoss#2024 | Full /admin access, all payroll |
| Manager | miguel@hexahr.local | Manager@123 | Engineering manager |
| Manager | sara@hexahr.local | Sara@1234 | Sales manager |
| Employee | alice@hexahr.local | Alice@123 | Engineering |
| Employee | bob@hexahr.local | Bob@12345 | Sales |
| Employee | carol@hexahr.local | Carol@123 | Sales |
| Employee | dave@hexahr.local | dave123 | Finance — **default password, never changed** |
| Employee | tom@hexahr.local | Tom@12345 | Engineering |

## Reset

- **Lab reset:** delete `progress.json` and restart — the gate returns and progress is 0%.
- **Company data reset:** just restart the server — business data is in-memory seed data.

## Burp Suite setup (for practice)

1. Start Burp Suite → Proxy: listener `127.0.0.1:8080` (default).
2. Point your practice browser's proxy at `127.0.0.1:8080`.
3. Browse http://127.0.0.1:3023 normally — traffic appears in Burp Proxy → HTTP history.
4. Scope: add `http://127.0.0.1:3023` so you only test the lab. The session cookie is plain base64 JSON — Decoder is your friend.

## Files

- `server.js` — the whole app + lab system (intentional flaws are marked `// VULN(<type>): ...`)
- `VULNERABILITIES.md` — the 24 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 24 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `docs/handbook.txt` — the employee handbook served by the documents feature
- `progress.json` — your saved progress (generated at runtime; delete to reset)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.
