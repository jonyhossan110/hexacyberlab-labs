# HexaNewsletter — LAB 88

**Category 9: Media, Social & Community** · Port **3097** · Zero-dependency Node.js

A complete, deliberately vulnerable **newsletter SaaS** built for hands-on web security practice: publications, subscribers, email campaigns, templates, paid subscriptions, subscriber import/export, campaign analytics, and API keys for sending. All "email sending" is simulated inside the app — nothing ever leaves the process. All data is fake seed data.

> ⚠️ **Local practice only.** This app is intentionally insecure. It binds to `127.0.0.1` only. Never deploy it to a server or a public network.

## Run it

```bash
node server.js          # → http://127.0.0.1:3097
# or
docker compose up       # same port, containerised
```

Requires Node.js 20+ (no npm install — zero dependencies).

## The lab system

- **Sequential unlock:** LAB 88 starts locked. Paste the **completion key from Lab 87** on the gate to unlock it (stored in `progress.json`, so the gate stays lifted across restarts). Keys are never stored in plain text anywhere in this folder — each key exists only as encoded shards scattered through `server.js` and is assembled in memory at the moment it is needed.
- **Progress:** every page header shows your progress (`done/total tests · %`). Solving a test means performing the real exploit — the server detects the effect and flips the test. There is no "mark done" button.
- **Mission Board (`/tests`):** all **26 scored tests across 8 features**, grouped by feature, each with 3 graded hints revealed one at a time, plus the attempt counter for its feature.
- **Lab Coach (chat widget, bottom-right):** knows the full test map and your progress. Step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** (or completed its tests). The coach does not have the completion key until you reach 100%.
- **Persistence:** progress, attempts and unlock state live in `progress.json` (generated at first run — do not commit it). Restart the server and you resume exactly where you left off. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete`):** at 100% you get the full debrief — per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write it in a professional report — plus your **completion key**, which unlocks Lab 89.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name.

## Test accounts (fake seed data)

| Role   | Email                  | Password  |
|--------|------------------------|-----------|
| Admin  | admin@hexanews.local   | admin123  |
| Author | alice@hexanews.local   | alice123  |
| Author | bob@hexanews.local     | bob123    |
| Demo   | demo@hexanews.local    | demo      |

## Docs in this folder

- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure pattern and regression check for every test.

`VULNERABILITIES.md`, `PRACTICE-GUIDE.md` and `FIX-AND-RETEST.md` are generated from the test registry in `server.js` (`node server.js --gen-docs`) so the counts can never drift from the app.

## Files

`server.js` (the whole app + lab system) · `logo.png` (the real HexaCyberLab logo, served at `/logo.png`) · `Dockerfile` · `docker-compose.yml` · `progress.json` (generated state — gitignored)

---

HexaCyberLab — Built by Md. Jony Hassain, Founder. For authorised, local, educational testing only.
