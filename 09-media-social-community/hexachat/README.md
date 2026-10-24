# HexaChat — LAB 89 of 110 (Category 9: Media, Social & Community)

A deliberately vulnerable **messaging app** built for local, authorised security practice: 1:1 direct messages, group chats with roles and permissions, file attachments, message search, user blocking and channel invites — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion summary and certificate).

> ⚠️ **Local training only.** This app is intentionally insecure. Run it only on your own machine (it binds `127.0.0.1`), never deploy it publicly, and never use real data. All accounts, messages and files are fake seed data.

## Run it

```bash
# Option A — plain Node (22+ recommended, no dependencies)
node server.js

# Option B — Docker
docker compose up --build
```

Then open http://127.0.0.1:3098

## First start: the lock gate

Lab 89 starts **locked**. Paste the **completion key from Lab 88** into the gate to unlock it. The key chain works like this: every lab's completion key is the next lab's entry key. Keys are never stored in this repository in readable form — inside `server.js` each key exists only as scattered, encoded fragments that the app assembles in memory at the moment it is needed (entry key only when you unlock; completion key only when the lab reaches 100%). The Lab Coach does not know the completion key until you finish the lab.

## Test accounts (fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexachat.local | admin123 | admin |
| alice@hexachat.local | alice123 | user |
| bob@hexachat.local | bob123 | user |
| carol@hexachat.local | carol123 | user |
| demo@hexachat.local | demo123 | user (credentials also printed on the login page — that is one of the tests) |
| erin@hexachat.local | erin123 | user |

Seed story: Alice↔Bob and Alice↔Carol have DM threads; Bob↔Carol have a **private** thread (conversation 3). Groups: *Weekend Hikers* (public), *Family Secrets* (private — Alice owner, Bob member, invite code needed in theory), *Work Gamers* (public). Alice has blocked Carol. Attachments: three seeded files in `files/` belonging to different owners.

## The lab system

- **Progress bar** in the header of every page: tests done / total and %.
- **`/tests` — Mission Board:** all 26 scored tests grouped by feature, each with OWASP mapping, difficulty, status, the feature's attempt count, and **3 graded hints** revealed one at a time.
- **Tests flip only by doing.** Every test is detected server-side when the exploit's real effect happens (a session created, a private object served, a role changed…). There are no "mark done" buttons. Repeat successes are harmless.
- **Attempts are counted per feature** and persist — the Lab Coach can see them.
- **Lab Coach** (chat widget, bottom-right, endpoint `POST /api/chat`): knows the full test map and answers counts and test names freely. **Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** (or completed it) — before that it refuses and tells you your real attempt count. It refuses to reveal the completion key before 100%. Ask it who built these labs.
  - Endpoint note: HexaChat's own product messages use the web form (`POST /messages`) and the JSON send API (`POST /api/send`), so `/api/chat` was free for the Lab Coach — no `/api/coach` exception was needed.
- **Persistence:** progress lives in `progress.json` in this folder (generated state — do not commit it; it is in `.gitignore`). Stop and restart the server any time: your % and attempts resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **`/complete`:** at 100% you get the full debrief — feature list, per-feature vulnerability counts, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus the **completion key** that unlocks Lab 90.
- **`/certificate`:** a printable certificate card with the real HexaCyberLab logo (also served at `/logo.png`), your name (set it on `/complete`), the test/feature totals and the completion date.

## What is tested (26 tests, 8 features)

Login & Authentication (6) · Registration & Profile (4) · Direct Messages (3) · Groups & Channels (4) · Attachments (3) · Search (2) · Admin Panel (2) · Platform & API (2). See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for challenges with hints, and `FIX-AND-RETEST.md` for the secure implementation of every item.

## Files

`server.js` (the whole app) · `README.md` · `VULNERABILITIES.md`, `PRACTICE-GUIDE.md`, `FIX-AND-RETEST.md` (generated from the TESTS registry in `server.js` via `node server.js --gen-docs`, so counts can never drift) · `Dockerfile` · `docker-compose.yml` · `logo.png` (the real HexaCyberLab logo) · `files/` (seeded attachments) · `progress.json` (generated at runtime).

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.
