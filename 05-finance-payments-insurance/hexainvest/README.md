# HexaInvest — LAB 45 (HexaCyberLab Lab Programme)

An investment simulator with intentionally planted vulnerabilities, built for hands-on web penetration-testing practice. **Local-only: never deploy this publicly.** Every price, balance and trade is simulated fake data inside the app — there are no real market feeds and no real money.

## The business app
Investor accounts, cash balances, portfolios with holdings and average cost, a simulated market (8 listed symbols with an in-app price feed), buy/sell order execution with cancellable orders, watchlists with notes, per-investor performance reports with CSV export, an admin panel with an investor-credit action, and a small JSON API.

## Run it
- Direct: `node server.js` → http://127.0.0.1:3054
- Docker: `docker compose up --build` → http://127.0.0.1:3054

Requires Node 20+ (zero dependencies).

## Test accounts (seeded)
| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@hexainvest.local | admin123 | admin |
| Alice | alice@test.local | alice123 | investor |
| Bob | bob@test.local | bob123 | investor |
| Carol | carol@test.local | carol123 | investor |

## The lab system
- **Lock gate:** this lab starts locked. Paste the completion key earned in Lab 44 to unlock it (the key mechanism is described in the programme spec — key values are never written in any doc).
- **Progress:** 25 scored tests across 8 features. Tests complete only when the exploit's real effect happens server-side — there is no "mark done" button. The header bar and /api/progress show done/total and %.
- **/tests (Mission page):** every test grouped by feature with OWASP mapping, difficulty, status, per-feature attempt counts and 3 graded hints.
- **Lab Coach chatbot:** knows the full test map and your progress. Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times (it quotes your real attempt count). It does not hold the completion key — it receives it only when the lab reaches 100%.
- **Persistence:** state lives in progress.json (generated at runtime, git-ignored). Progress, attempts and the unlock survive restarts; delete progress.json to reset the lab to a fresh, locked state.
- **/complete:** at 100% — per-feature vulnerability counts, how testing was done, lessons, client-impact translation, report-writing entries, and the completion key that unlocks Lab 46.
- **/certificate:** at 100% — a printable certificate card with the HexaCyberLab logo and your tester name.

## Files
- `server.js` — the whole app + lab system (zero-dependency Node)
- `VULNERABILITIES.md` — the full vulnerability map (25 tests)
- `PRACTICE-GUIDE.md` — challenges with graded hints and objectives
- `FIX-AND-RETEST.md` — secure implementation + regression check per test
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at /logo.png)

Built by Md. Jony Hassain, Founder of HexaCyberLab.
