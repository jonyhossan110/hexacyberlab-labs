# HexaFitness — LAB 67

**Category 7: Healthcare & Wellness** · Port **3076** · Zero-dependency Node.js

A deliberately vulnerable **fitness club platform** built for authorised, local-only security training: member / trainer / admin accounts, membership plans with simulated payments, class schedules & bookings with capacity limits, personal-training sessions paid with credits, member progress tracking, private trainer notes, and guest passes.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. It binds to `127.0.0.1` only, contains fake seed data, and must never be deployed publicly or connected to real services.

## Run it

```bash
node server.js
# or
docker compose up --build
```

Open <http://127.0.0.1:3076>.

## The lab system

- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 66** on the gate page to unlock it (permanently, for this install).
- **Mission Board (`/tests`):** all **26 scored tests** grouped by feature, each with OWASP mapping, difficulty, your per-feature attempt count, and **3 graded hints**. Tests flip to DONE only when the exploit actually succeeds server-side — there is no "mark done" button.
- **Progress bar:** shown in the header of every page (`done/total · %`).
- **Lab Coach chatbot** (bottom-right, `POST /api/chat`): knows the whole test map and your real progress. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** (the coach quotes your true attempt count). It never holds the completion key before you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated state — safe to delete to reset the lab to a fresh, locked state). Restarting the server resumes exactly where you left off.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, lessons, real-client impact, and how each finding is written in a professional pentest report — plus your **completion key**, which unlocks **Lab 68**.
- **Certificate (`/certificate`):** printable completion certificate with the HexaCyberLab logo and your name.

## Test accounts (seeded, fake)

| Role    | Email                     | Password   | Notes              |
|---------|---------------------------|------------|--------------------|
| Admin   | admin@hexafitness.local   | admin123   | also shown as demo |
| Member  | alice@test.local          | alice123   | Premium, 5 PT credits |
| Member  | bob@test.local            | bob123     | Free plan, 0 PT credits |
| Member  | carol@test.local          | carol123   | Premium, 2 PT credits |
| Trainer | tom@hexafitness.local     | trainer123 |                    |
| Trainer | tina@hexafitness.local    | trainer123 |                    |

## Files

- `server.js` — the whole app + lab system (single file, Node built-ins only)
- `VULNERABILITIES.md` — the full vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)

## Keys

Completion keys are never stored in plain form anywhere in this folder: each key exists only as split, transformed fragments inside `server.js`, assembled in memory at the moment it is needed (unlock check, or the 100% reveal). The docs describe the mechanism only — never any key value.

---

HexaCyberLab — Built by **Md. Jony Hassain**, Founder. Local training use only.
