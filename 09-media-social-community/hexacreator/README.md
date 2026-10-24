# HexaCreator — LAB 87

A deliberately vulnerable **creator platform** (Patreon-style: creator pages, membership tiers, members-only posts, earnings and payouts) built for hands-on web security practice. Zero-dependency Node.js — no `npm install` needed.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine (it binds `127.0.0.1`), never deploy it publicly, and never put real data in it. All accounts, names and figures are fake seed data.

Part of the HexaCyberLab practice-lab programme — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Run it

```bash
node server.js          # then open http://127.0.0.1:3096
```

or with Docker:

```bash
docker compose up --build
```

Requires Node.js 20+.

## The lab system

- **Sequential unlock:** Labs are numbered and chained. LAB 87 starts **locked** — paste the completion key you earned at 100% in **Lab 86** to open it. Your own completion key for Lab 88 is revealed only when you reach 100% here. Each key is stored in the code only as encoded fragments scattered across the source and is assembled in memory at the moment it is needed — it never appears in plain form in any file or page before its reveal.
- **Progress:** every solved test raises your score. Progress = solved tests ÷ total tests (26). The header shows `LAB 87 · done/total · %` on every page, and `GET /api/progress` returns the same data as JSON.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3 graded hints beside it.
- **Lab Coach (chat widget):** knows every feature and test. It answers counts and test names freely, but step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** — it counts your real attempts. It does not have the completion key before you reach 100%, so it cannot give it away early.
- **Persistence:** progress, attempts and unlock state live in `progress.json` (generated at first run — safe to delete to reset the lab to a fresh, locked state). Restarting the server resumes exactly where you left off.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature vulnerability counts, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a professional report — plus your completion key and a printable **certificate** (`/certificate`) with the HexaCyberLab logo.

## Test accounts (fake seed data)

| Email | Password | Role |
|---|---|---|
| admin@hexacreator.local | admin123 | admin |
| creator@hexacreator.local | creator123 | creator (Nova Creates) |
| pixel@hexacreator.local | pixel123 | creator (PixelForge) |
| hidden@hexacreator.local | hidden123 | creator (Secret Studio, unlisted) |
| demo@hexacreator.local | demo123 | fan |
| alice@hexacreator.local | alice123 | fan (has a membership) |
| bob@hexacreator.local | bob123 | fan |

## Files

- `server.js` — the whole app (business logic + lab system)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every finding and prove the fix
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state**, created on first run; not source
