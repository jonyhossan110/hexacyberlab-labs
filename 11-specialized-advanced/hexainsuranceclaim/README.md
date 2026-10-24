# LAB 107 — HexaInsuranceClaim

An **intentionally vulnerable** insurance claims processing platform for hands-on web penetration-testing practice. Category 11 — Specialized & Advanced Business Systems, part of the HexaCyberLab 110-lab programme.

> ⚠️ **Local training only.** Run it on your own machine/lab network. It is deliberately insecure. Never deploy it to a public server. All data is fake seed data.

## The business app

HexaClaim Insurance: policyholders hold Auto/Home/Health policies, file claims, upload evidence and track payouts. Adjusters review and approve claims and release payouts. Admins manage users. Features include login/registration, password reset, claim search, an adjuster console, document downloads, an admin panel and a JSON API.

## Run it

Zero-dependency Node.js (built-ins only):

```bash
node server.js          # http://127.0.0.1:3116
```

or with Docker:

```bash
docker compose up --build
```

## Test accounts

| Role | Email | Password |
|---|---|---|
| Administrator | admin@hexaclaim.local | admin123 |
| Adjuster | adjuster@hexaclaim.local | adjuster123 |
| Policyholder | alice@test.local | alice123 |
| Policyholder | bob@test.local | bob123 |
| Policyholder | carol@test.local | carol123 |

## The lab system

- **Progress:** every solved test raises your percentage (header bar on every page). Tests are scored only when the exploit's real effect happens on the server — there are no "mark done" buttons.
- **Mission Board (`/tests`):** all 26 tests across 8 features, each with 3 graded hints revealed one at a time, plus the live attempt count per feature.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the full test map and your progress. Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times — before that it refuses and tells you how many tries you have made. It also knows who built these labs.
- **Lock gate:** this lab starts locked. Paste the completion key you earned at 100% in Lab 106 to unlock it. `POST /unlock` verifies the key.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the techniques used, what you learned, what it means for a real client, and how to write each finding in a real pentest report — plus the **completion key** that unlocks Lab 108.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo once you reach 100%.
- **Persistence:** progress is stored in `progress.json` in this folder (generated runtime state — it is git-ignored). Stop and restart the server and you resume exactly where you left off, attempts included.
- **Keys:** each lab's unlock/completion keys are unguessable and are never stored as plain text anywhere in this package — they exist inside `server.js` only as encoded shards scattered through the code, are assembled only at the moment they are needed, and the completion key is revealed only at 100% (the Lab Coach does not have it before then).

## Files

- `server.js` — the whole app + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives (generated)
- `FIX-AND-RETEST.md` — secure fix + regression test for every finding (generated)
- `Dockerfile`, `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `docs/` — public documents served by the app

Regenerate the three docs after editing the registry: `node server.js --gen-docs`.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.
