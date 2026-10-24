# HexaTranslate — LAB 38 of 110

**Category 4: AI & Intelligent Applications** · HexaCyberLab vulnerable lab series

HexaTranslate is a deliberately vulnerable **translation SaaS**: user accounts, translation
projects, a shared translation memory, glossaries / term bases, a reviewer workflow,
character credits and team roles. Translations are **simulated** with deterministic
in-app word mappings — there are no real model calls and no external network access.
The application exists to be attacked, locally, for training.

> ⚠️ **LOCAL ONLY.** Run it on your own machine (127.0.0.1). Never deploy it publicly.

## Quick start

```bash
node server.js            # http://127.0.0.1:3047/
# or
docker compose up --build # same address
```

Requires Node.js 18+ (zero dependencies — nothing to install).

## The lab system

- **Sequential unlock:** this is Lab 38. It starts **locked** — paste the completion key
  you earned at 100% in **Lab 37 (HexaVoice)** on the gate page to open it. Keys are never
  written in plain form anywhere in this folder; each key exists only as encoded fragments
  inside `server.js` and is assembled in memory at the moment it is needed.
- **Progress:** every page header shows `LAB 38 · done/25 tests · pct%`. Progress is
  measured against the lab's 25 scored security tests across 9 features.
- **Mission page (`/tests`):** all tests grouped by feature, each with its OWASP mapping,
  difficulty, your attempt count for that feature, and 3 graded hints (nudge → stronger →
  near-answer).
- **Tests complete by doing:** a test flips only when the server observes the real exploit
  effect (a foreign object actually served, a poisoned memory entry actually used, a
  balance actually moved) — never by clicking.
- **Lab Coach chatbot** (bottom-right on every page, works even while locked):
  - answers feature/test counts and test names freely;
  - gives **step-by-step help for a feature only after you have genuinely tried that
    feature at least 3 times** (it quotes your real attempt count when refusing);
  - **does not have the completion key** until you reach 100% — then it can share it;
  - knows who built these labs — ask it.
- **Persistence:** progress lives in `progress.json` (generated at runtime, safe to delete
  to reset the lab). Stop and restart the server at any point — your % and attempts are
  exactly where you left them.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature
  vulnerability counts, the techniques you used, what you learned, what each flaw means
  for a real client, how to write each finding in a real pentest report — plus the
  **completion key for Lab 39**.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo
  and your name.

## Test accounts (seeded)

| Email | Password | Role | Notes |
|---|---|---|---|
| admin@hexatranslate.local | admin123 | admin | platform admin |
| lena@hexatranslate.local | lena2024 | lead | owns projects 101, 104 + glossary 201 |
| marco@hexatranslate.local | marco2024 | member | owns project 102 |
| rita@hexatranslate.local | review2024 | reviewer | assigned reviewer of review 301 |
| viktor@hexatranslate.local | viewer2024 | viewer | |
| tara@hexatranslate.local | *(see VULNERABILITIES — default credential test)* | member | |
| omar@outsider.test | omar2024 | member | owns project 103 + glossary 202 |
| demo@demo.local | *(see VULNERABILITIES — default credential test)* | member | demo account |

## Files

- `server.js` — the whole lab (app + lab system), zero-dependency Node.
- `VULNERABILITIES.md` — the complete vulnerability map (25 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints.
- `FIX-AND-RETEST.md` — how each flaw is fixed properly, and how to retest the fix.
- `Dockerfile`, `docker-compose.yml` — one-command local run.
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`).

## Reset

Delete `progress.json` and restart — the lab returns to a fresh, locked state.
