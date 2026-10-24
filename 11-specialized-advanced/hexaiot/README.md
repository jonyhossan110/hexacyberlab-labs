# HexaIoT — LAB 101

**Category 11: Specialized & Advanced Business Systems** · Port **3110** · Zero-dependency Node.js

A deliberately vulnerable **IoT device management platform** for hands-on web security practice: a device registry with owners, simulated telemetry, remote commands, firmware releases, device groups with share links, and alerts — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion certificate).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine / lab network (it binds `127.0.0.1`). Never deploy it to the internet. All accounts, devices and data are fake, and all device behaviour is simulated in-app — no real network or device calls are made.

## Quick start

```bash
node server.js          # http://127.0.0.1:3110
# or
docker compose up --build
```

Requires Node.js 20+ (no npm packages needed).

## Test accounts (fake, local only)

| Role   | Email                 | Password  |
|--------|-----------------------|-----------|
| Admin  | admin@hexaiot.local   | admin123  |
| Owner  | alice@test.local      | alice123  |
| Owner  | bob@test.local        | bob123    |
| Viewer | carol@test.local      | carol123  |

## The lab system

- **Progress:** every solved test raises your score. Progress is `done / total` — this lab has **26 scored tests across 9 features**. The header bar on every page shows your live percentage.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3 graded hints (nudge → stronger → near-answer) and the attempt count for that feature.
- **Detection is real:** tests flip to done only when the server observes the exploit's actual effect (an IDOR serving someone else's object, a tampered value being accepted, a payload being stored…). There is no "mark done" button.
- **Lab Coach (chat widget, bottom-right):** knows every test in the lab. It will list features, counts and test names freely — but step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** (it quotes your real attempt count). It never reveals the completion key before 100%.
- **Lock gate:** LAB 101 starts locked. Paste the **completion key from Lab 100** to unlock it. The gate lifts permanently for that install.
- **Persistence:** progress is stored in `progress.json` in this folder (generated state — it is in `.gitignore`). Stop and restart the server at any time; your percentage, attempts and unlock state resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh state.
- **Completion:** at 100%, `/complete` shows the full debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write it in a real pentest report — followed by the **completion key** for the next lab.
- **Certificate:** `/certificate` renders a printable certificate card with the HexaCyberLab logo and your tester name (set it on `/complete`).

## Key mechanism

Labs are chained: Lab N's completion key unlocks Lab N+1. Keys are unguessable strings kept in a private master list held by the lab author. Inside this app a key never appears as a plain string anywhere in the code or docs: each key is split into pieces, every piece is transformed (base64 of the reversed piece), and the pieces are scattered in different regions of `server.js`. A small assembler rebuilds a key only at the moment it is needed — the entry key inside the unlock check, the completion key only after progress reaches 100% (for `/complete`, the certificate context, and the coach).

## Docs in this folder

- `VULNERABILITIES.md` — the complete vulnerability map: every test, grouped by feature, with OWASP mapping, location and exploitation outline.
- `PRACTICE-GUIDE.md` — challenges grouped by feature and difficulty, with objectives and graded hints.
- `FIX-AND-RETEST.md` — for every finding: the report title, severity, secure implementation, and a regression test.

All three are generated from the test registry in `server.js` (`node server.js --gen-docs`), so they cannot drift from the app.

## Built by

HexaCyberLab — Md. Jony Hassain, Founder. These labs are for authorised, local security training only.
