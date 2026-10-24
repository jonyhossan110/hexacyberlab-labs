# HexaProject — Vulnerable Project-Management Practice Lab

**LAB 13 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaProject is an **intentionally vulnerable** training application. It contains real, working security flaws (SQL injection login bypass, cross-project IDOR, role escalation, stored XSS and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` only. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, project, task and file is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working project-management platform in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the workspace** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout, forgot-password + token reset, user profiles
- **Projects** with owners and per-project roles: **owner / manager / member / viewer**
- **Tasks** with assignees, statuses and priorities; **milestones** with due dates
- **Comments** on tasks; **file attachments** per project plus a file-download endpoint
- Team management: add members, change roles, remove members
- Global **search** across projects and tasks
- A small JSON **API** and a platform **Admin** panel

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 13 opens only with the **completion key from Lab 12 (HexaCRM)**:

1. Start the server (below) and open http://127.0.0.1:3022 — you will see the lock screen.
2. Paste Lab 12's completion key and click **Unlock Lab 13**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 14's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **27 scored security tests** across **10 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it (the login feature alone carries SQLi bypass, brute force, enumeration, default credentials, a predictable reset token, and cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3022/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (another team's project served to an outsider, a viewer editing a task, a forged reset token…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder (generated state — safe to delete; deleting it resets progress and re-locks the lab). Close the lab and come back tomorrow — you resume from the same %.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach (bottom-right) that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you your current try count — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 14. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js 20 or newer. Download: https://nodejs.org

```bash
cd hexaproject-vuln-lab
node server.js
# open http://127.0.0.1:3022
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3022
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Platform admin | admin@hexaproject.local | Admin@123 | Full /admin access |
| Project owner | pm@hexaproject.local | Manager@123 | Owns project 1 "Website Redesign" |
| Manager | dev@hexaproject.local | User@123 | Manager on project 1 |
| Member | sara@hexaproject.local | User@123 | Member of project 1; owns private project 2 |
| Viewer | victor@hexaproject.local | User@123 | Read-only viewer on project 1 |
| Demo | demo@hexaproject.local | demo123 | Seeded demo account (still active!) |

Seed data: Project 1 "Website Redesign" (owner pm, manager dev, member sara, viewer victor; 2 tasks, 1 milestone, 1 file) and Project 2 "Payments Migration" (private — only sara; 1 task, 1 confidential file).

## Reset

- **Progress reset:** delete `progress.json` and restart — the lab re-locks and progress returns to 0%.
- **Workspace reset:** just restart the server — all business data is in memory and re-seeds.

## Files

- `server.js` — the whole app + lab system (intentional flaws are marked `// VULN(<type>): ...`)
- `VULNERABILITIES.md` — the 27 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 27 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created; delete to reset)
- `attachments/` — on-disk files for the download endpoint (auto-created at boot)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.
