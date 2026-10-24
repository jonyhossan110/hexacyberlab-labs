# LAB 51 — HexaLearn

An online learning platform (courses, enrollments, lesson progress, quizzes, certificates, instructor payouts) built **deliberately vulnerable** for authorised, local-only web security training. Part of the HexaCyberLab 110-lab programme (Category 6: Education & E-learning), built by **Md. Jony Hassain, Founder of HexaCyberLab**.

> ⚠️ **Local-only training lab.** Run it only on your own machine/lab network. Never deploy it to a public server. All accounts, courses and money are fake seed data.

## Run it

```bash
node server.js          # → http://127.0.0.1:3060
# or
docker compose up       # one-command Docker setup
```

Zero dependencies — Node.js built-ins only (Node 18+).

## The lab system

- **Sequential unlock:** LAB 51 starts locked. Paste the **completion key from Lab 50** on the gate to unlock it. Keys are never stored in plain text anywhere in this folder — each key exists only as split, encoded pieces inside `server.js`, assembled in memory at the moment of verification/reveal.
- **Mission board (`/tests`):** 26 scored tests across 10 features, grouped by feature, each with OWASP mapping, difficulty, and 3 graded hints that reveal one at a time.
- **Tests pass by DOING:** a test flips to done only when the server detects the real exploit effect (a bypassed login, a forged completion, a tampered price…). There is no "mark done" button.
- **Progress & persistence:** `GET /api/progress` reports done/total/%/per-feature attempts. State lives in `progress.json` (generated at runtime, safe to delete to reset) — your % and the unlock survive restarts; delete `progress.json` to start completely fresh.
- **Lab Coach chatbot:** on every page (bottom right). It knows the full test map and your real attempt counts. Step-by-step guidance for a feature unlocks only after **3 genuine attempts** on that feature; before that it refuses and tells you how many times you have tried. It does **not** hold the completion key — it only receives it when you reach 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature vulnerability counts, the ways you tested, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus your **completion key**, which unlocks Lab 52.
- **Certificate (`/certificate`):** at 100%, a printable certificate card with the HexaCyberLab logo and your name (set it on `/complete`).

## Test accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexalearn.local | admin123 |
| Instructor | irene@hexalearn.local | teach123 |
| Instructor | henry@hexalearn.local | teach456 |
| Student | alice@hexalearn.local | alice123 |
| Student | bob@hexalearn.local | bob123 |
| Demo (advertised on the login page) | demo@hexalearn.local | demo1234 |

Coupon code in the catalogue: `WELCOME50` (intended single-use per student).

## Files

- `server.js` — the whole app + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the full vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression check per finding
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state** (progress/attempts/unlock), not source

MIT © Md. Jony Hassain / HexaCyberLab
