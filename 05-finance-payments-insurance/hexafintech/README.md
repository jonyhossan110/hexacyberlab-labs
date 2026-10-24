# HexaFintech — LAB 44 of 110

**Category 5: Finance, Payments & Insurance** · HexaCyberLab vulnerable-lab series

A complete (and deliberately vulnerable) fintech platform: user financial profiles, a linked-accounts
overview (simulated banks), virtual cards, internal transfers, spending analytics, and a
sharing/permissions system that grants view-only or full access to accountants and family members —
plus a JSON API. All data is fake seed data. **For authorised local training only — never deploy
this publicly.**

## Run it

```bash
node server.js            # zero dependencies, Node 18+
# or
docker compose up         # binds 127.0.0.1:3053
```

Open http://127.0.0.1:3053

## The lab system

- **Sequential unlock:** this lab starts **locked**. Paste the completion key you earned at 100% in
  Lab 43 (HexaBank) to open it. Keys are never stored as plain text in the code — each key lives only
  as encoded fragments scattered through `server.js` and is assembled in memory at the moment it is
  needed.
- **Progress:** every page header shows your progress (done/total tests and %). Progress is stored in
  `progress.json` (generated at runtime — safe to delete to reset the lab to a fresh, locked state)
  and **survives restarts**.
- **Mission page:** `/tests` lists all **26 scored tests across 9 features**, grouped by feature, each
  with OWASP mapping, difficulty, per-feature attempt counts and 3 graded hints. A test flips to done
  only when its exploit genuinely succeeds — detection is server-side, on the real effect.
- **Lab Coach chatbot:** the chat widget (bottom-right) knows the full test map and your progress.
  It answers counts and names freely, but step-by-step help for a feature unlocks only after you have
  **genuinely tried that feature at least 3 times** (it quotes your real attempt count). It does not
  hold the completion key — it receives it only when you reach 100%.
- **Completion:** at 100% the `/complete` page opens the debrief — features, per-feature vulnerability
  counts, techniques used, what you learned, what each flaw means for a real client, and how to write
  every finding in a real pentest report — plus your **completion key for Lab 45** and a printable
  **certificate** (`/certificate`) with the HexaCyberLab logo.

## Test accounts (seeded, fake)

| Email | Password | Role |
|---|---|---|
| admin@hexafintech.local | admin123 | Platform admin |
| alice@hexafintech.local | alice123 | User (grants Carol view access) |
| bob@hexafintech.local | bob123 | User (invited by Alice) |
| carol@hexafintech.local | carol123 | User (accountant, view-only grantee) |
| demo@hexafintech.local | demo123 | Demo user |

## Files

- `server.js` — the entire lab (app + lab system), zero dependencies
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives
- `FIX-AND-RETEST.md` — the secure fix and regression check for every test
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — generated runtime state (not source; delete to reset)

## Safety

Binds **127.0.0.1 only**. Contains intentional vulnerabilities for training on your own machine.
Contains no real credentials, no real card numbers, and no real financial data.
