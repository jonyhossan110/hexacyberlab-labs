# HexaSmartHome — LAB 102 of 110 (Category 11: Specialized & Advanced Business Systems)

A deliberately vulnerable **smart-home simulator** built for local, authorised security practice: homes, rooms, simulated devices (door locks, lights, thermostats, cameras), household members with permission levels, invite codes, scenes & automations and activity logs — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion summary and certificate).

> ⚠️ **Local training only.** This app is intentionally insecure. Run it only on your own machine (it binds `127.0.0.1`), never deploy it publicly, and never use real data. All accounts, homes and devices are fake seed data, and every "device" is simulated inside the app — nothing real is controlled.

## Run it

```bash
# Option A — plain Node (no dependencies)
node server.js

# Option B — Docker
docker compose up --build
```

Then open http://127.0.0.1:3111

## First start: the lock gate

Lab 102 starts **locked**. Paste the **completion key from Lab 101** into the gate to unlock it. The key chain works like this: every lab's completion key is the next lab's entry key. Keys are never stored in this repository in readable form — inside `server.js` each key exists only as scattered, encoded fragments that the app assembles in memory at the moment it is needed (entry key only when you unlock; completion key only when the lab reaches 100%). The Lab Coach does not know the completion key until you finish the lab.

## Test accounts (fake, local only)

| Email | Password | Role / story |
|---|---|---|
| admin@hexasmart.local | admin123 | platform admin |
| alice@test.local | alice123 | owner of Maple House (home 1) |
| bob@test.local | bob123 | owner of Cedar Flat (home 2) and the unlisted Lake Villa (home 3) |
| carol@test.local | carol123 | member of Maple House; holds a guest invite (INV-2-1) to Cedar Flat |
| dave@test.local | dave123 | guest (view-only) in Maple House |
| demo@hexasmart.local | demo1234 | demo account — credentials also printed on the login page (that is one of the tests) |

Seed story: Maple House has a front-door lock (device 1), lights, a camera and a thermostat. Dave may look but must not touch. Bob's Hall Cam (device 7) watches his entrance. One home — Lake Villa — is unlisted and never appears in normal search results.

## The lab system

- **Progress bar** in the header of every page: tests done / total and %.
- **`/tests` — Mission Board:** all 26 scored tests grouped by feature, each with OWASP mapping, difficulty, status, the feature's attempt count, and **3 graded hints** revealed one at a time.
- **Tests flip only by doing.** Every test is detected server-side when the exploit's real effect happens (a session created, a stranger's door unlocked, a private log served…). There are no "mark done" buttons. Repeat successes are harmless.
- **Lab Coach** (chat panel, bottom-right, `POST /api/chat`): knows the full test map and your progress. Step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** — before that the coach refuses and tells you how many tries it has seen. Ask it who built the labs. It only learns the completion key when you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated state — it is in `.gitignore`). Restart the server and your %, attempts and unlock survive. Delete `progress.json` to reset the lab to a fresh, locked state.
- **`/complete`** — at 100%: the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) and your **completion key** for Lab 103.
- **`/certificate`** — at 100%: a printable certificate card with the HexaCyberLab logo and your name (set it on `/complete`).

## Docs in this folder

- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives (mirrors `/tests`).
- `FIX-AND-RETEST.md` — the secure fix and a regression check for every test.

(The three docs are generated from the TESTS registry in `server.js` via `node server.js --gen-docs`, so their counts can never drift from the app.)

## Safety

Local-only by design: binds `127.0.0.1`, zero dependencies, no external calls, all data fake and in-memory (only `progress.json` persists). Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab HexaCyberLab practice programme.
