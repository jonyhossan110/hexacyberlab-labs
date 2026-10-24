# HexaWorkspace — Vulnerable Collaboration Suite Practice Lab

**LAB 17 of the HexaCyberLab practice-lab series** (Category 2: SaaS & Business Platforms).

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaWorkspace is an **intentionally vulnerable** training application. It contains real, working security flaws (broken access control, IDOR, stored XSS, privilege escalation, predictable tokens and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` only. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, workspace, file and token is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working collaboration suite in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the business data** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout, forgot-password & reset flow, user profiles with API tokens
- **Workspaces** with members and roles (owner / editor / viewer)
- **Folders and text files** with a virtual path per file and a raw-download endpoint
- **Per-file sharing**: access grants to individual users + public **share links** (revocable)
- **Comments** on files, file **uploads** served back under `/uploads/`
- Admin panel (user management, comment moderation) and a small JSON API

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 17 opens only with the **completion key from Lab 16**:

1. Start the server (below) and open http://127.0.0.1:3026 — you will see the lock screen.
2. Paste Lab 16's completion key and click **Unlock Lab 17**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 18's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **25 scored security tests** across **9 features** — every vulnerability in `VULNERABILITIES.md` is a test, and coverage is feature-complete: each feature carries the full set of techniques that apply to it (the login feature alone is tested for SQL injection, brute force, enumeration, default credentials, predictable reset tokens and cookie tampering).
- Open **🎯 Tests** (or http://127.0.0.1:3026/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a viewer editing a file, an IDOR read of another team's file, a revoked share link still serving…) and ticks the test off itself.
- The header bar shows your live progress: tests done / total and %.
- **Progress persists.** State is stored in `progress.json` in this folder (generated at runtime — delete it to reset the lab to a fresh, locked state). Business data is re-seeded on every restart.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach (bottom-right) that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it refuses, telling you how many tries it has seen. Passing all of a feature's tests also unlocks its guidance.
- It does **not** hold the completion key before 100% — at 100% it will share it.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques used, what you learned, what these findings would mean on a real client's platform (and the damage they prevent), and how to write each one into a professional client report — plus your completion key for Lab 18. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js LTS (v18+; built-ins only).

```bash
cd hexaworkspace-vuln-lab
node server.js
# open http://127.0.0.1:3026
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3026
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Site admin | admin@hexaworkspace.local | Admin@123 | Runs the /admin panel |
| Olivia Owner | olivia@acme.test | Owner@123 | Owner of workspace 1 (Acme HQ) |
| Emma Editor | emma@acme.test | Editor@123 | Editor in Acme HQ |
| Victor Viewer | victor@acme.test | Viewer@123 | Viewer (read-only) in Acme HQ |
| Oscar Outsider | oscar@globex.test | Oscar@123 | Owner of workspace 2 (Globex) — not an Acme member |
| Guest Demo | guest@hexaworkspace.local | guest123 | Shipped demo account — itself one of the findings |

Seeded content: Acme HQ holds `acme/projects/roadmap-2027.txt` and the confidential `acme/finance/salary-band-q4.txt` (with a live share link); Globex holds `globex/strategy/globex-takeover-plan.txt`.

## Reset

- **Progress reset:** delete `progress.json` and restart — the lab returns to its locked, 0% state.
- **Business data reset:** just restart the server — users, files, comments and grants are re-seeded. (Accounts created or deleted while testing exist only until the next restart; progress in `progress.json` is unaffected.)

## Files

- `server.js` — the whole app + lab system
- `README.md` — this guide
- `VULNERABILITIES.md` — all 25 scored tests by feature: OWASP, where, how, impact
- `PRACTICE-GUIDE.md` — the 25 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each flaw and verify the fix
- `logo.png` — the HexaCyberLab brand logo (header + certificate)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — your saved progress (auto-created at runtime; safe to delete)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3026`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3026` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
