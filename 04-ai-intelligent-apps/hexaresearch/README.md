# HexaResearch — LAB 34 of 110 (HexaCyberLab Lab Programme)

An **intentionally vulnerable** AI research assistant, built for hands-on web penetration-testing practice. **Local use only — never deploy this publicly.**

## The business app
HexaResearch is a research workspace: user accounts, research projects with private notebooks, a sources library (add sources by pasting text or by URL — the server fetches the URL), AI-generated summary reports (SIMULATED deterministic model — no real model calls) with citations, public share links for reports, and team spaces.

## Quick start
- Node (zero dependencies): `node server.js` → http://127.0.0.1:3043
- Docker: `docker compose up --build` → http://127.0.0.1:3043

## The lab system
- **Lock gate:** this lab starts locked. Paste the completion key earned in Lab 33 to unlock it (the gate stays lifted once unlocked on this install).
- **Progress:** every page header shows your score. Progress is **25 scored tests across 10 features**; a test completes only when the exploit genuinely succeeds server-side — never by clicking.
- **/tests** — the mission page: tests grouped by feature, status, attempts, and 3 graded hints per test.
- **Lab Coach chatbot** (bottom-right, every page): knows the full map, answers counts freely, and gives step-by-step help for a feature **only after you have genuinely tried that feature at least 3 times**. It receives the completion key only when you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated at runtime; safe to delete to reset the lab — the lock gate returns and progress goes back to 0%). Restarting the server resumes exactly where you left off.
- **/complete** at 100%: the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) and your **completion key for Lab 35**.
- **/certificate** at 100%: a printable completion certificate with the HexaCyberLab logo and your name.

## Test accounts (seeded)
| Email | Password | Role |
|---|---|---|
| alice@hexaresearch.local | alice123 | Researcher |
| bob@hexaresearch.local | bob123 | Researcher |
| carol@hexaresearch.local | carol123 | Viewer |
| admin@hexaresearch.local | *(find it — see the tests)* | Admin |

## Files
- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (25 tests)
- `PRACTICE-GUIDE.md` — challenges, hints and objectives
- `FIX-AND-RETEST.md` — secure implementations + regression checks per test
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo
- `progress.json` — generated runtime state (git-ignored)

Built by Md. Jony Hassain, Founder of HexaCyberLab.
