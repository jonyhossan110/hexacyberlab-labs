# HexaSkill — LAB 58 (Category 6: Education & E-learning)

A deliberately vulnerable **skills-training platform** built for authorised, local-only
security practice. Part of the **HexaCyberLab 110-lab programme**.

> ⚠️ **Local use only.** This app contains intentional vulnerabilities. Run it only on
> your own machine / lab network. Never deploy it to the public internet. All accounts,
> companies and data are fake seed data.

## The business app

HexaSkill lets learners follow **skill paths** (ordered modules), take **module
assessments**, earn **digital badges** on path completion, publish **portfolios**, and
join **team/company training groups** whose leads track progress. Employers can verify
badges on a public verification page. Roles: learner, assessor, admin.

## Quick start

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up --build
```

Open <http://127.0.0.1:3067>. The server binds **127.0.0.1 only**.

## Test accounts (fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexaskill.local | admin123 | admin |
| sara@hexaskill.local | sara123 | assessor |
| alice@hexaskill.local | alice123 | learner (Team 1 lead) |
| bob@hexaskill.local | bob123 | learner (Team 1 member, private portfolio) |
| carol@hexaskill.local | carol123 | learner (Team 2 lead) |
| demo@hexaskill.local | demo123 | learner (demo) |

## The lab system

- **Lock gate:** Labs are numbered and unlock in sequence. LAB 58 starts locked —
  paste the **completion key earned in Lab 57** on the gate to open it. Wrong keys
  are rejected (403). The unlock is permanent for that install.
- **Progress:** every solved test raises your score. Progress = solved tests / total
  tests. The header bar on every page shows `done/total · %`.
- **Mission board — `/tests`:** all tests grouped by feature, each with OWASP mapping,
  difficulty, your attempt count for that feature, and **3 graded hints** revealed
  one at a time.
- **Lab Coach chatbot:** the widget (bottom-right) answers counts and test names
  freely. **How-to coaching for a feature unlocks only after you have genuinely tried
  that feature at least 3 times** — the coach quotes your real attempt count when it
  refuses. The coach does **not** hold the completion key until the lab is at 100%.
- **Persistence:** progress lives in `progress.json` (generated state, created at
  runtime next to `server.js`). Quit and restart any time — you resume exactly where
  you left off, attempts included. Delete `progress.json` to reset the lab to fresh.
- **Completion — `/complete`:** at 100% you get a six-section debrief (features,
  per-feature counts, techniques used, lessons, client impact, and how each finding is
  written in a real pentest report), your **completion key** for Lab 59, and a
  name form for the certificate.
- **Certificate — `/certificate`:** a printable completion card with the HexaCyberLab
  logo once you reach 100%.

## Key mechanism (no key values in the docs, ever)

Each lab's entry key equals the previous lab's completion key. Inside `server.js` a
key exists **only as ≥6 encoded shards scattered across separate regions of the
file**, assembled in memory at the moment of verification or reveal. It never appears
as a plain string in the code, the docs, or any response before its reveal moment.

## Files

- `server.js` — the whole app (zero-dependency Node)
- `VULNERABILITIES.md` — the complete test map, grouped by feature
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives
- `FIX-AND-RETEST.md` — the secure implementation + regression test for every finding
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — *generated at runtime; not part of the source*

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.
