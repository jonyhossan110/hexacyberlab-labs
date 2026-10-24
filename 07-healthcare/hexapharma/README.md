# HexaPharma — LAB 63 · HexaCyberLab Practice Labs

**Category 7: Healthcare & Wellness** · Port **3072** · Zero-dependency Node.js

HexaPharma is a complete online pharmacy — customer / pharmacist / admin accounts, a medicine catalog (OTC + prescription-only), prescription upload with a pharmacist verification workflow, cart & checkout, orders, refills and delivery addresses — built **intentionally vulnerable** for hands-on web security practice. All people, medicines, prescriptions and orders are fake seed data. Nothing connects to any real pharmacy or service.

> ⚠️ **Local practice only.** Run it on your own machine, bound to `127.0.0.1`. Never deploy it to a public server.

## Run it

```bash
node server.js          # → http://127.0.0.1:3072
# or
docker compose up --build
```

## The lab system

- **Lock gate:** Lab 63 starts locked. Paste the **completion key from Lab 62** to unlock it (the key chain: finishing a lab 100% reveals the key that unlocks the next lab). Keys are never printed in this repo — inside `server.js` each key exists only as split, encoded shards, assembled at runtime.
- **Progress:** every page header shows `done/total tests · %`. Progress is stored in `progress.json` (generated at runtime, safe to delete to restart the lab) and **survives restarts** — leave at 40%, come back, resume at 40%.
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each with 3 graded hints revealed one at a time. A test passes only when the exploit **actually succeeds** — the server detects the real effect. There is no "mark done" button.
- **Lab Coach chatbot** (bottom-right on every page): knows the full map — ask how many tests a feature has, or what your progress is. Step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least 3 times** (the coach can see your attempt counts and quotes them). The coach does **not** hold the completion key before 100% — it receives it only when the lab is complete.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the ways testing was done, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus the **completion key for Lab 64**.
- **Certificate (`/certificate`):** at 100%, a printable certificate card with the HexaCyberLab logo and your name.

## Test accounts (all fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexapharma.local | admin123 |
| Pharmacist | pharm@hexapharma.local | pharm123 |
| Customer | alice@hexapharma.local | alice123 |
| Customer | bob@hexapharma.local | bob123 |
| Customer | carol@hexapharma.local | carol123 |
| Demo (printed on the login page — itself one of the tests) | demo@hexapharma.local | demo1234 |

Alice has a verified prescription for Metformin; Carol has one for Atorvastatin; Bob's Amoxicillin prescription is pending verification.

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints
- `FIX-AND-RETEST.md` — the secure fix + regression retest for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `files/` — simulated downloadable documents
- `progress.json` — **generated runtime state** (progress/attempts); not source, delete to reset

## Safety

Binds `127.0.0.1` only. Contains deliberately vulnerable code for education — keep it off the internet and out of production, always.

---

HexaCyberLab — Built by **Md. Jony Hassain**, Founder. Labs are numbered in category order; Lab 63 is unlocked by Lab 62's completion key and its own completion key unlocks Lab 64.
