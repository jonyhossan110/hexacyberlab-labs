# HexaForum — LAB 82 of 110

**Category 9: Media, Social & Community** · Port **3091** · Zero-dependency Node.js

A complete, deliberately vulnerable **discussion forum** built for hands-on web
penetration-testing practice: boards/categories, threads and posts, member /
moderator / admin roles, moderation actions, a private staff board, reputation
points and private messages — every feature carrying its full set of realistic
vulnerabilities.

> ⚠️ **LOCAL USE ONLY.** This lab is intentionally insecure. Run it only on
> your own machine / lab network. Never deploy it to a public server.

## Quick start

```bash
node server.js          # then open http://127.0.0.1:3091
# or
docker compose up       # same thing, in a container
```

No `npm install` — Node.js built-ins only (Node 18+ recommended).

## The lab system

- **Sequential unlock:** this is Lab 82. It starts **locked** — paste the
  completion key you earned by finishing **Lab 81 (HexaSocial)** on the gate
  page. The key is verified exactly; a wrong key is rejected with no hints.
- **Progress:** every page header shows `LAB 82 · <done>/<total> tests · <pct>%`.
  Progress is your score: pass tests by *actually performing* each exploit —
  the server detects the real effect (an IDOR read, a tampered vote, a forged
  cookie reaching a gated page…). There are no "mark done" buttons.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3
  graded hints (nudge → stronger → near-answer) and the attempt count for its
  feature.
- **Lab Coach (chat widget, bottom-right):** knows every feature and test.
  Step-by-step help for a feature unlocks only after you have genuinely tried
  that feature **at least 3 times** — before that it refuses and tells you how
  many tries it has seen. It does **not** hold the completion key until you
  reach 100%.
- **Persistence:** progress is stored in `progress.json` in this folder
  (generated state — safe to delete to restart the lab from 0% with the lock
  gate back on). Restarting the server never resets your score.
- **Completion (`/complete`):** at 100% you get the full debrief — features and
  per-feature vulnerability counts, the techniques you used, what you learned,
  what each flaw means for a real client, and how to write each one into a
  professional pentest report — plus the **completion key for Lab 83**.
- **Certificate (`/certificate`):** a printable completion card with the real
  HexaCyberLab logo, your name and the completion date.

## Test accounts (all fake, seeded in memory)

| Email | Password | Role |
|---|---|---|
| admin@hexaforum.local | Adm1n!Hexa82 | admin |
| mod@hexaforum.local | mod123 | moderator (demo credentials are also published on the login page — that is one of the findings) |
| alice@hexaforum.local | alice123 | member |
| bob@hexaforum.local | bob123 | member |
| carol@hexaforum.local | carol123 | member |

## What's inside

- `VULNERABILITIES.md` — the complete map: all 26 tests grouped by feature,
  with OWASP mapping, exploitation outline and impact.
- `PRACTICE-GUIDE.md` — challenges by feature and difficulty, with hints and
  measurable objectives (mirrors `/tests`).
- `FIX-AND-RETEST.md` — for every finding: the secure implementation and the
  regression test to prove the fix.

## Reset

Delete `progress.json` and restart the server — the lab returns to a fresh,
locked state.

## About

The HexaCyberLab lab series was built by **Md. Jony Hassain, Founder of
HexaCyberLab** — 110 local-only practice labs with a sequential key chain:
each lab's completion key unlocks the next.
