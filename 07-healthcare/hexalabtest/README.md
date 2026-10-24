# HexaLabTest — LAB 64 of 110 (Category 7: Healthcare & Wellness)

An intentionally vulnerable **diagnostic laboratory platform** for hands-on web security practice: patient / doctor / lab-technician / admin accounts, a priced test catalog, test orders, sample-status tracking, technician result entry, doctor-reviewed reports, and home sample-collection bookings.

> ⚠️ **LOCAL TRAINING ONLY.** Every patient, result and record is fake seed data. Run it only on your own machine (`127.0.0.1:3073`). Never deploy it to a server or the internet.

## Run it

```bash
node server.js            # then open http://127.0.0.1:3073
# or
docker compose up --build
```

Zero dependencies — Node 20+ built-ins only. State is in-memory; lab progress persists in `progress.json` (generated at runtime — delete it to reset the lab to a fresh, locked state).

## The lab system

- **Lock gate:** LAB 64 starts locked. Paste the **completion key from Lab 63** on the gate to unlock it (once — it stays unlocked).
- **Mission page (`/tests`):** 26 scored tests across 9 features, grouped by feature, each with OWASP mapping, difficulty and **3 graded hints** revealed one at a time.
- **Tests complete by DOING:** there is no "mark done" button. The server detects the real exploit effect (a bypassed login, a tampered price, a leaked report…) and flips the test.
- **Progress bar & persistence:** the header shows `done/total · %`. Progress and per-feature attempt counts are saved to `progress.json` and **survive restarts** — leave and resume where you stopped.
- **Lab Coach chatbot** (bottom-right, `POST /api/chat`): knows the whole map — test counts and names are free — but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times**. It quotes your real attempt count. It does **not** hold the completion key before 100%.
- **Completion (`/complete`):** at 100% you get the six-section debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus the **completion key for Lab 65**.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.

## How the key chain works

Each lab's completion key is the next lab's entry key. Inside the code a key exists **only as split, encoded shards scattered across `server.js`**, assembled at runtime at the reveal moment — it cannot be read whole from the source, the docs, or the chatbot before the lab is completed.

## Test accounts (fake, training only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexalabtest.local | admin123 |
| Doctor | dr.house@hexalabtest.local | house123 |
| Doctor | dr.reyes@hexalabtest.local | reyes123 |
| Technician | tech.tom@hexalabtest.local | tom123 |
| Technician | tech.tina@hexalabtest.local | tina123 |
| Patient | alice@test.local | alice123 |
| Patient | bob@test.local | bob123 |
| Patient | carol@test.local | carol123 |

## Files

- `server.js` — the whole app + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — the secure implementation + regression check for every test
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `files/` — simulated report files served by the download endpoint
- `progress.json` — generated runtime state (safe to delete; resets the lab)

## Docs

- Spec of the lab system: `lab-progress-certificate-system-spec-2026-10-23.md` / engine spec in the programme workspace.

---

HexaCyberLab — Built by **Md. Jony Hassain**, Founder. Labs are for authorised practice on your own local copy only.
