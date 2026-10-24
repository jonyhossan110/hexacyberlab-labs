# HexaStream — LAB 84 of 110

**Category 9: Media, Social & Community** · Port **3093** · Zero-dependency Node.js

HexaStream is a complete (simulated) video-streaming platform — video library, channels,
watchlists, watch history, free/premium memberships, comments and a creator studio — built
as a deliberately vulnerable, **local-only** practice lab for web penetration testing.

> ⚠️ **SAFETY:** This application is intentionally insecure. Run it only on your own
> machine / lab network. Never deploy it publicly. All accounts, videos and data are fake.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab programme.

## Run it

```bash
node server.js          # http://127.0.0.1:3093
# or
docker compose up --build
```

Requires Node 20+. No npm install — built-ins only.

## Test accounts (fake, local only)

| Email | Password | Role | Tier |
|---|---|---|---|
| admin@hexastream.local | admin123 | admin | premium |
| alice@test.local | alice123 | user | premium |
| bob@test.local | bob123 | user | free |
| carol@test.local | carol123 | creator | premium |
| demo@hexastream.local | demo123 | user | free |

## The lab system

- **Sequential unlock:** LAB 84 starts locked. Paste the **completion key earned in Lab 83**
  on the gate to open it (permanently, for this install). Keys are unguessable; each key
  exists inside the code only as encoded fragments scattered across the file, reassembled
  in memory at the moment of verification — no key value appears anywhere in the source
  or docs.
- **Progress:** `/tests` is the Mission Board — 26 scored tests across 9 features, each with
  3 graded hints. Tests complete only when the server detects the real exploit effect
  (never a checkbox). Progress = tests done / 26.
- **Persistence:** state lives in `progress.json` (generated at runtime, listed in
  `.gitignore`). Restart the server and your % and attempt counts resume exactly where
  you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Lab Coach:** the chat widget (bottom-right, `POST /api/chat`) knows the full test map
  and your progress. It answers "what does this feature contain" freely, but step-by-step
  help for a feature unlocks only after you have genuinely tried that feature **at least
  3 times** (it quotes your real attempt count). It receives the completion key only when
  the lab hits 100% — before that it cannot share it, because it does not have it.
- **Completion:** at 100%, `/complete` shows the full debrief — features, per-feature
  vulnerability counts, techniques used, what you learned, the client-language impact of
  every flaw, and how each finding is written in a real pentest report — plus your
  completion key for Lab 85 and a printable **certificate** at `/certificate` (set your
  name on `/complete` first).

## Files

- `server.js` — the whole application + lab system (single file, built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges by feature and difficulty, with hints and objectives
- `FIX-AND-RETEST.md` — the secure fix and regression test for every finding
- `Dockerfile` / `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`

Regenerate the three docs from the registry at any time with `node server.js --gen-docs`.

## The 26 tests (9 features)

Login & Authentication 6 · Registration & Profile 4 · Search & Library 2 ·
Playback & Tokens 3 · Watchlists & History 3 · Membership & Payments 2 ·
Comments 2 · Creator Studio 2 · Admin & Platform 2.
