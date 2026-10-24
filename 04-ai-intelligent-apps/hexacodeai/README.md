# HexaCodeAI — LAB 39 of 110 (Category 4: AI & Intelligent Applications)

A complete, intentionally vulnerable **AI coding assistant** for local security practice: developer accounts, connected repositories (simulated records), AI-generated patches (simulated, deterministic, inert text — **never executed**), a snippet library, team workspaces and usage quotas.

> ⚠️ LOCAL ONLY. This app is deliberately insecure. It binds to 127.0.0.1. Never deploy it, never expose it to a network, never type a real password or real code into it. All "code", "keys" and "credentials" inside are simulated training data.

## Run it

```bash
node server.js          # http://127.0.0.1:3048
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## The lab system

- **Progress:** every solved test raises your score; progress = tests passed / 25. The header bar and `/tests` (Mission page) track it live, and `GET /api/progress` returns it as JSON.
- **Hints:** every test on `/tests` carries 3 graded hints (nudge → stronger → near-answer).
- **Lab Coach chatbot:** the widget on every page knows the full test map. Step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** (attempts are counted server-side and shown truthfully). Before 100% the Coach does **not** have the completion key and will refuse to share it.
- **Lock gate:** this lab starts locked. Paste the completion key earned at 100% in Lab 38 to unlock it. A wrong key is rejected with 403.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques used, lessons, client impact, report writing) and reveals the completion key for Lab 40. `/certificate` renders a printable certificate with the HexaCyberLab logo.
- **Persistence:** progress, attempts and unlock state live in `progress.json` (generated at runtime — safe to delete to restart the lab fresh).
- Keys exist only as encoded shards inside `server.js`; they are never written in plain form anywhere.

## Test accounts (simulated)

| Email | Password | Notes |
|---|---|---|
| admin@hexacodeai.local | Sup3r#Admin9 | Platform admin, Pro |
| alice@hexacodeai.local | alice123 | Alpha Team owner, Free (4/5 generations used) |
| bob@hexacodeai.local | bob123 | Alpha Team member |
| carol@hexacodeai.local | carol123 | Beta Lab owner, Pro |
| dave@hexacodeai.local | dave123 | Alpha Team viewer |
| demo@hexacodeai.local | demo123 | Demo account |
| eve@hexacodeai.local | eve123 | No workspace memberships |

## Files

`server.js` (the whole app), `logo.png` (HexaCyberLab logo), `Dockerfile`, `docker-compose.yml`, `VULNERABILITIES.md` (the full test map), `PRACTICE-GUIDE.md` (challenges + hints), `FIX-AND-RETEST.md` (how each flaw should be fixed and retested).

Built by Md. Jony Hassain, Founder of HexaCyberLab.
