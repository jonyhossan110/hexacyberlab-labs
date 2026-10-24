# HexaDental — LAB 65 · HexaCyberLab Practice Labs

**Category 7: Healthcare & Wellness** · Port **3074** · Zero-dependency Node.js

A deliberately vulnerable **dental clinic platform** for local, authorised security training: patient / dentist / hygienist / admin accounts, appointment booking, treatment plans with itemised costs, clinical records & X-ray files, invoices and payment plans. **All patients and data are invented.** Run it only on your own machine — it is intentionally insecure.

## Run it

```bash
node server.js          # → http://127.0.0.1:3074
# or
docker compose up       # same port, containerised
```

Requires Node.js 18+. No `npm install` — there are no dependencies.

## The lab system

- **Lock gate:** the lab starts locked. Paste the **completion key from Lab 64** on the gate to unlock it (once — the unlock persists).
- **Progress:** every page header shows your progress. Solving a test raises your %; progress is stored in `progress.json` (generated state — safe to delete to reset the lab; it also returns the gate).
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each with **3 graded hints**. A test flips to done only when the exploit actually succeeds server-side — there is no "mark done" button.
- **Lab Coach chatbot** (bottom-right on every page, `POST /api/chat`): knows every feature and test. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** — it quotes your real attempt count. It does not have the completion key until you reach 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus your **completion key**, which unlocks Lab 66.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.
- **Keys** are never stored as plain text anywhere in this folder: each key exists only as split, encoded shards scattered through `server.js`, assembled in memory at the moment they are needed.

## Demo accounts (all fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexadental.local | admin123 |
| Dentist | dr.rahman@hexadental.local | Rahman#2024 |
| Hygienist | sara@hexadental.local | Sara#2024 |
| Patient | alice@test.local | alice123 |
| Patient | bob@test.local | bob123 |

Or register your own patient account.

## What to practise

See **VULNERABILITIES.md** for the full map (26 tests by feature), **PRACTICE-GUIDE.md** for challenges with hints and measurable objectives, and **FIX-AND-RETEST.md** for the secure implementation + regression test for every finding.

## Safety

Local-only by design (binds 127.0.0.1). Never deploy this app to a public server. It exists so testers can learn, in a safe sandbox, how real clinic platforms fail — and how to protect real clients from the same flaws.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.
