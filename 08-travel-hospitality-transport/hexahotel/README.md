# HexaHotel — LAB 72

**HexaCyberLab 110-Lab Programme · Category 8: Travel, Hospitality & Transport**

A deliberately vulnerable hotel booking platform built for authorised, local-only
security training: guest / front-desk / admin accounts, room types with rates and
date-based availability, bookings with simulated payment, extras, check-in /
check-out, invoices — wrapped in the full HexaCyberLab lab system.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on your
> own machine (it binds 127.0.0.1). Never deploy it publicly. All data is fake
> seed data.

## Run it

```bash
node server.js            # http://127.0.0.1:3081
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## Demo accounts

| Role       | Email                  | Password  |
|------------|------------------------|-----------|
| Guest      | alice@test.local       | alice123  |
| Guest      | bob@test.local         | bob123    |
| Front desk | desk@hexahotel.local   | desk123   |

(The admin account exists too — finding its credentials is one of the tests.)

## The lab system

- **Lock gate:** the lab starts locked. Paste the completion key earned in
  Lab 71 to unlock it (POST /unlock). The gate stays lifted for that install.
- **Progress:** your score is `done / total` tests. `GET /api/progress` returns
  the full state as JSON. Progress is stored in **`progress.json`** (generated
  runtime state — deleting it resets the lab to a fresh, locked state) and
  survives server restarts, so you can stop and resume any time.
- **Mission board:** `/tests` lists every scored test grouped by feature, with
  status, per-feature attempt counts, and 3 graded hints per test.
- **Tests pass by DOING:** a test flips only when the exploit actually succeeds
  server-side (an IDOR serves someone else's booking, a tampered total is
  accepted, …). There is no "mark done" button.
- **Lab Coach chatbot:** the chat widget (bottom-right) knows every test.
  Test names and counts are public, but step-by-step help for a feature
  unlocks only after **3 genuine attempts** on that feature — the coach can
  see your attempt counts and quotes them truthfully.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature vulnerability counts, techniques used, what you learned, what
  each flaw means for a real client, and how to write it in a real pentest
  report), reveals the **completion key** for the next lab, and links to
  `/certificate` — a printable certificate card with the HexaCyberLab logo.
- **Keys:** each lab's entry/completion keys exist inside `server.js` only as
  split, encoded shards, assembled at runtime. They never appear in plain text
  in any file or doc. The completion key is revealed only at 100%; the coach
  does not have it before then.

## Docs

- `VULNERABILITIES.md` — the complete map: all scored tests by feature.
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure fix + regression test for every finding.

## Files

`server.js` (the whole app), `logo.png` (the real HexaCyberLab logo),
`Dockerfile`, `docker-compose.yml`. `progress.json` is created at runtime.

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the
110-lab hands-on web-security training programme.
