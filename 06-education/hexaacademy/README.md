# HexaAcademy — Vulnerable Online Course Academy Practice Lab

**LAB 52 of the HexaCyberLab practice-lab series** (Category 6: Education & E-learning).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaAcademy is an **intentionally vulnerable** training application. It contains real, working security flaws (checkout price tampering, stackable and reusable coupons, certificates issued without completing a course, instructor payout fraud, forged admin sessions and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every student, instructor, course, payment and certificate is fake seed data. **Nothing connects to any real school or payment processor.** No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working online course academy in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the business data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- A course **catalogue** with categories, lesson counts and an unpublished **draft course**
- **Course bundles** (priced sets of courses) with their own checkout
- **Simulated checkout** with discount **coupons** (multi-use and single-use codes)
- **Enrollments** with per-lesson watching, progress tracking, **refunds** and course **certificates**
- **Instructor profiles** (public pages), an instructor **earnings dashboard** (70% revenue share) and **payout requests**
- Roles: **student**, **instructor**, platform **admin** — an admin panel with user deactivation
- A small JSON API (`/api/enrollments`, `X-API-Key`) and self-service registration, profile, forgot/reset password

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 52 opens only with the **completion key from Lab 51 (HexaLearn)**:

1. Start the server (below) and open http://127.0.0.1:3061 — you will see the lock screen.
2. Paste Lab 51's completion key and click **Unlock Lab 52**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 53's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **26 scored security tests** across **8 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3061/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a $199 course bought for $1, a certificate issued at 0% progress, a payout larger than the instructor's balance…) and ticks the test off itself.
- **Progress persists.** Your score, per-feature attempt counts and unlock state live in `progress.json` in this folder (generated state — safe to delete to reset the lab to its fresh, locked state). Close the lab at 40% and you resume at 40%.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing all of a feature's tests also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 53. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js 20+ (any current LTS). No `npm install` — zero dependencies.

```bash
cd hexaacademy-vuln-lab
node server.js
```

Then open http://127.0.0.1:3061

**Docker (optional):**

```bash
docker compose up --build
```

## Test accounts (all fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexaacademy.local | admin123 | Platform admin (default credentials — one of the tests) |
| prof@hexaacademy.local | Prof@123 | Instructor — Dr. Maya Chen (Web Security Fundamentals, JavaScript for Beginners) |
| diego@hexaacademy.local | Diego@123 | Instructor — Diego Alvarez (Python API Bootcamp, Advanced Burp Suite Mastery) |
| alice@hexaacademy.local | Alice@123 | Student — enrolled in Web Security Fundamentals (4/10 lessons) |
| bob@hexaacademy.local | Bob@1234 | Student — completed Python API Bootcamp, certificate issued |
| carol@hexaacademy.local | Carol@123 | Student — enrolled in JavaScript for Beginners (0/8 lessons) |

Coupon codes seeded for practice: `WELCOME50` (50% off, multi-use), `STUDENT20` (20% off, multi-use), `VIP100` (100% off, single-use launch code).

## Files

- `server.js` — the whole app + lab system (single file)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — 26 challenges with objectives, hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each flaw and regression-test the fix
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the HexaCyberLab logo (served at /logo.png)
- `progress.json` — **generated at runtime** (your progress); delete it to reset the lab

---

HexaCyberLab — Built by **Md. Jony Hassain**, Founder. Lab 52 of 110.
