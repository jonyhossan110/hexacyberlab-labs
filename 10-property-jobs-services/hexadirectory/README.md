# HexaDirectory — LAB 100

**Category 10: Property, Jobs & Professional Services** · Port **3109** · Zero-dependency Node.js

A deliberately vulnerable **business directory** for hands-on web security practice: business listings with owners, listing claims, customer reviews, lead inquiries, paid premium placement, categories and search — plus the full HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, completion certificate).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your own machine / lab network (it binds `127.0.0.1`). Never deploy it to the internet. All accounts, businesses and data are fake.

## Quick start

```bash
node server.js          # http://127.0.0.1:3109
# or
docker compose up --build
```

Requires Node.js 20+ (no npm packages needed).

## Test accounts (fake, local only)

| Role   | Email                        | Password  |
|--------|------------------------------|-----------|
| Admin  | admin@hexadirectory.local    | admin123  |
| Owner  | alice@test.local             | alice123  |
| Owner  | bob@test.local               | bob123    |
| Member | carol@test.local             | carol123  |
| Owner  | dave@test.local              | dave123   |

## The lab system

- **Progress:** every page header shows `LAB 100 · <done>/<total> tests · <pct>%`. Progress is measured by the Mission Board at **`/tests`**.
- **Tests complete by DOING:** each of the 26 scored tests flips only when the server detects the real effect of the exploit — never by clicking "done".
- **Hints:** every test on `/tests` carries 3 graded hints (nudge → stronger → near-answer).
- **Lab Coach:** the chat widget (bottom-right, `POST /api/chat`) knows the full map. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature — before that, the coach refuses and tells you how many times you have tried. Ask it who built the labs!
- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 99** on the gate to unlock it (once — the gate then stays lifted for this install).
- **Persistence:** progress lives in `progress.json` (generated runtime state — safe to delete; deleting it resets the lab to a fresh, locked state). Your % and attempts survive restarts.
- **Completion:** at 100%, **`/complete`** shows the full debrief (features, per-feature vulnerability counts, techniques used, what you learned, what it means for a real client, and how each finding is written in a real pentest report) plus your **completion key**, which unlocks Lab 101. **`/certificate`** renders a printable certificate with the name you save on `/complete`.
- **Keys:** completion keys are unguessable and are never stored whole in the code — each exists only as encoded shards scattered through `server.js`, assembled in memory at reveal time. Before 100%, even the Lab Coach does not have the key.

## Files

- `server.js` — the whole app + lab system (built-ins only)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives (generated)
- `FIX-AND-RETEST.md` — secure implementation + regression test for every finding (generated)
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated at runtime**; not part of the source

## Reset

Stop the server, delete `progress.json`, start again — the lab is fresh and locked.

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.
