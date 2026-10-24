# HexaPackage — LAB 30 of 110 (Category 3: API & Developer Platforms)

An **intentionally vulnerable** software package registry for hands-on web security practice.
Publishers hold accounts, own packages with maintainers, publish immutable-in-theory versions,
manage publish tokens (read/publish scopes) and watch download statistics.

> ⚠️ **LOCAL USE ONLY.** Zero-dependency Node.js, binds `127.0.0.1:3039` only. All data is
> synthetic and in-memory (restart resets the app). Never deploy this anywhere.

## Run it
```bash
node server.js          # then open http://127.0.0.1:3039
# or: docker compose up --build
```

## The Lab System
- **Sequential unlock:** this lab starts locked. Paste the completion key earned in Lab 29
  into the gate (`POST /unlock`). Keys are never stored whole in the code — they are split into
  encoded shards scattered through `server.js` and assembled only at verification/reveal time.
- **Progress:** 25 scored tests across 8 features. A test passes only when the server
  detects the real exploit effect — never by clicking. Watch progress in the header bar or `GET /api/progress`.
- **Mission page:** `/tests` groups every test by feature, with 3 graded hints each.
- **Lab Coach chatbot:** on every page. It answers counts/names freely, but step-by-step guidance
  for a feature unlocks only after **3 genuine attempts** on that feature. The completion key is
  revealed to the coach (and on `/complete`) only at 100%.
- **Persistence:** progress lives in `progress.json` (generated state — do not commit). Restart
  the server and your % and attempt counts resume exactly where you left them.
- **Completion:** at 100%, `/complete` shows the six-section debrief (features, per-feature counts,
  techniques, lessons, client impact, report writing), the Lab 31 key, and `/certificate`
  renders a printable certificate with the HexaCyberLab logo.

## Test accounts (synthetic)
| Email | Password | Role |
|---|---|---|
| admin@hexapackages.local | Admin@123 | admin |
| priya@hexapackages.local | Priya@123 | publisher (owns dataforge, internal-tools) |
| marco@hexapackages.local | Marco@123 | publisher (owns swiftcache, webutils) |
| sara@hexapackages.local | Sara@123 | publisher (maintainer of dataforge) |
| demo@hexapackages.local | demo123 | user (documented default) |

Seeded API token for the demo account (read scope): shown on its token page in-app.

## Files
- `server.js` — the whole lab (app + lab system), zero dependencies
- `VULNERABILITIES.md` — the full test map by feature · `PRACTICE-GUIDE.md` — challenges & hints
- `FIX-AND-RETEST.md` — secure implementation + regression check per test
- `progress.json` — generated runtime state (not committed)

Built by Md. Jony Hassain, Founder of HexaCyberLab.
