# HexaTravel — LAB 71

**Category 8: Travel, Hospitality & Transport** · HexaCyberLab 110-lab programme
Built by Md. Jony Hassain, Founder of HexaCyberLab.

A deliberately vulnerable travel-booking platform for authorised, local-only
security training: traveller/agent/admin accounts, holiday packages with
itineraries and per-person pricing, reservations with simulated payment,
booking management, travel documents, discount vouchers and package reviews.
All data is fake seed data. **Never deploy this app publicly.**

## Run it

```bash
node server.js            # → http://127.0.0.1:3080
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only. Binds 127.0.0.1 only.

## The lab system

- **Lock gate:** this lab starts locked. Paste the completion key earned in
  Lab 70 to unlock it (`POST /unlock`). The unlock is persisted.
- **Progress:** 26 scored tests across 8 features. A test passes only when the
  exploit actually succeeds — the server detects the real effect, never a
  checkbox. Progress lives in `progress.json` (generated at runtime, safe to
  delete to reset the lab) and survives restarts.
- **Mission Board:** `/tests` lists every test grouped by feature, with its
  OWASP mapping, difficulty, your attempt counts, and 3 graded hints per test.
- **Lab Coach chatbot:** on every page. It knows the full test map and your
  progress. Step-by-step help for a feature unlocks only after you have
  genuinely tried that feature at least 3 times. The completion key is kept
  secret — even from the coach — until the lab is 100% complete.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature vulnerability counts, techniques used, lessons, client impact,
  and how each finding is written in a real pentest report), reveals the
  completion key for the next lab, and links to your `/certificate`.

## Test accounts (seeded, fake)

| Role      | Email                   | Password  |
|-----------|-------------------------|-----------|
| Admin     | admin@hexatravel.local  | admin123  |
| Agent     | agent@hexatravel.local  | agent123  |
| Traveller | alice@test.local        | alice123  |
| Traveller | bob@test.local           | bob123    |
| Traveller | carol@test.local        | carol123  |

## Files

- `server.js` — the whole app + lab system (single file)
- `VULNERABILITIES.md` — all 26 tests grouped by feature
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — secure fix + regression check for every test
- `files/` — seeded travel-document files used by the download features
- `progress.json` — generated runtime state (git-ignored)

The key mechanism: each lab's entry and completion keys exist only as split,
encoded shards scattered through `server.js`, assembled in memory at the
moment they are needed. No key value appears in any file or doc.
