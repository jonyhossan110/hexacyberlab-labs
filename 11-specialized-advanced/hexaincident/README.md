# HexaIncident — LAB 110 (Final Lab)

Category 11: Specialized & Advanced Business Systems · Port 3119 · Zero-dependency Node.js

HexaIncident is a complete incident management platform: incident reports with
severity/status workflow, team-based assignments, evidence attachments,
audit trails and postmortems. It is intentionally vulnerable — a training lab
for web penetration testing practice.

> ⚠️ **LOCAL USE ONLY.** Run it only on your own machine/lab network. It is
> deliberately insecure. Never deploy it to a public server.

## The lab system

- **Progress:** every vulnerability is a scored *test* (26 tests across
  9 features). Tests complete only when the server detects the real exploit
  effect — there is no "mark done" button. The header shows
  `LAB 110 · <done>/<total> tests · <pct>%` on every page.
- **Mission Board:** `/tests` groups all tests by feature, with status,
  per-feature attempt counts, and 3 graded hints per test.
- **Lab Coach:** the chat widget (bottom-right) answers questions about the
  lab's map, counts and your progress. Step-by-step help for a feature
  unlocks only after you have genuinely tried that feature **at least
  3 times** — the coach can see your attempt counts and will refuse (politely)
  before that. The coach does **not** hold the completion key until the lab
  is 100% complete.
- **Lock gate:** this lab starts locked. Paste the **completion key from
  Lab 109 (HexaWorkflow)** into the gate to unlock it, permanently for this
  install.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature counts, techniques, lessons, client impact, and how each
  finding is written in a real pentest report) and reveals this lab's
  completion key — the **Grandmaster key**, the final key of the 110-lab
  chain. `/certificate` renders a printable certificate with the
  HexaCyberLab logo.
- **Persistence:** progress, attempts and unlock state live in
  `progress.json` (generated at runtime — safe to delete to reset the lab;
  deleting it re-locks the gate and returns progress to 0%). Restarting the
  server resumes exactly where you left off.

### How the keys work (mechanism only)

Lab N's completion key is Lab N+1's entry key. Keys are never stored as
plain text anywhere in the code or docs: each key is split into pieces,
each piece is transformed, and the pieces are scattered across different
parts of `server.js`. A small assembler rebuilds a key only at the moment
it is needed (entry key inside unlock verification; completion key only
once progress reaches 100%).

## Run it

```bash
node server.js            # http://127.0.0.1:3119
# or
docker compose up --build
```

Requires Node.js 20+. No dependencies to install.

## Test accounts (fake, lab-only)

| Account | Email | Password | Role | Team |
|---|---|---|---|---|
| Ada Admin | admin@hexaincident.local | admin123 | admin | Command |
| Alice Responder | alice@hexaincident.local | alice123 | responder | SOC |
| Bob Responder | bob@hexaincident.local | bob123 | responder | Infra |
| Carol Viewer | carol@hexaincident.local | carol123 | viewer | SOC |
| Demo Dan | demo@hexaincident.local | demo123 | responder | Infra |

## Files

- `server.js` — the whole application + lab system
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test per finding
- `files/` — seeded (fake) evidence files served by the download endpoint
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — generated runtime state (not shipped; created on first run)

## Built by

HexaCyberLab — labs built by Md. Jony Hassain, Founder of HexaCyberLab.
Part of the 110-lab HexaCyberLab vulnerable-lab programme. For authorised
training and practice only.
