# HexaForms — Vulnerable Form-Builder SaaS Practice Lab

**LAB 20 of the HexaCyberLab practice-lab series.**

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaForms is an **intentionally vulnerable** training application. It contains real, working security flaws (IDOR on responses and exports, private-form access tampering, stored XSS into the owner's dashboard, unrestricted uploads and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, form, response and attachment is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working form-builder SaaS in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the app** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout with user and admin roles, plus a seeded demo account
- **Workspaces & teams**: form owners and team members share a workspace
- **Form templates** (Contact, Job Application, Event Registration, Customer Feedback) → create your own forms
- **Published forms** with public links (`/f/<slug>`) and **public / private access settings**; drafts stay unpublished
- **Submissions / responses** with optional file attachments, a response inbox per form, and **CSV export**
- Asset downloads, a small **API** (`/api/forms` with a per-user token), profile & plan management, and an **admin panel** (user roles, user export)

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 20 opens only with the **completion key from Lab 19 (HexaBooking)**:

1. Start the server (below) and open http://127.0.0.1:3029 — you will see the lock screen.
2. Paste Lab 19's completion key and click **Unlock Lab 20**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 21's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **24 scored security tests** across **7 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it (login alone carries SQLi bypass, brute force, enumeration, default credentials, a predictable reset token, and cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3029/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a cross-workspace response read, a private form flipped public, an export served to a non-member…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated state — safe to delete to reset the lab to its locked, fresh state). Close the lab and come back tomorrow — you resume from the same %, never from zero.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 21. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js 20 or newer. Download: https://nodejs.org

```bash
cd hexaforms-vuln-lab
node server.js
# open http://127.0.0.1:3029
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3029
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@hexaforms.local | Admin@123 | Full /admin access |
| Form owner | nabila@hexaforms.local | Owner@123 | Owns workspace "Nabila Studio" (forms 1 & 3) |
| Form owner | rafi@hexaforms.local | Owner@123 | Owns workspace "Rafi Ventures" (forms 2 & 4) |
| Team member | tanvir@hexaforms.local | Member@123 | Member of Nabila Studio |
| Demo | demo@hexaforms.local | demo123 | Seeded demo account (default credentials) |

Seeded forms: **Customer Feedback Survey** (public), **Job Application — Designer** (public, has a CV attachment), **Internal HR Salary Review** (**private**, confidential responses), **Wholesale Partner Intake** (draft).

## Reset

- **Lab reset:** delete `progress.json` and restart — the lab returns to its locked, fresh state.
- **App data reset:** just restart the server — all business data is in memory and re-seeds.

## Files

- `server.js` — the whole app + lab system (intentional flaws are marked with `// NOTE (vuln)` comments)
- `assets/` — downloadable form assets served by the app
- `VULNERABILITIES.md` — the 24 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 24 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created; delete to reset)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.
