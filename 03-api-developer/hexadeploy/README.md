# HexaDeploy — LAB 24 of 110

**HexaCyberLab vulnerable lab · Category 3: API & Developer Platforms**
A deliberately vulnerable **deployment platform** — projects, build pipelines (simulated),
environments (development / staging / production), environment secrets, deploy history,
webhooks and team roles — built for hands-on web penetration-testing practice.

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. It binds to `127.0.0.1` only.
> Never deploy it to a server, a shared network, or the public internet.

## Run it

```bash
node server.js          # http://127.0.0.1:3033
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## The lab system

- **Sequential unlock:** this lab starts **locked**. Paste the completion key earned by
  finishing **Lab 23 (HexaCloud)** at 100% to open it. The key is verified without hints:
  a wrong key gets a plain refusal (403) and the lab stays locked.
- **Progress:** every page header shows `LAB 24 — HexaDeploy` and your progress
  (`done/26 tests · pct%`). Tests complete **by doing** — the server detects the real
  exploit effect; there is no "mark done" button.
- **/tests — Mission page:** all 26 tests grouped by feature, with OWASP category,
  difficulty, your attempt count per feature, and **3 graded hints** per test.
- **Lab Coach chatbot** (bottom-right, `POST /api/chat`): knows every feature and test.
  Step-by-step help for a feature unlocks only after you have **tried that feature at
  least 3 times** — before that it refuses and tells you your real attempt count.
  It does **not** hold the completion key until you reach 100%.
- **Persistence:** progress lives in `progress.json` (generated runtime state, git-ignored).
  Stop the server, restart it — your %, passed tests, attempts and the unlock all survive.
- **/complete:** at 100% you get the full debrief — features and per-feature counts, the
  techniques used, what you learned, what each flaw would mean for a real client, how to
  write each finding in a real pentest report — plus the **completion key** that unlocks Lab 25.
- **/certificate:** a printable certificate card with the real HexaCyberLab logo and your name.
- **Key mechanism:** keys never appear in plain form anywhere in this app. Each key exists
  only as split, encoded fragments scattered through the code, assembled in memory at the
  moment of verification or reveal.

## Test accounts

| Email | Password | Notes |
|---|---|---|
| admin@hexadeploy.local | Admin@123 | Platform admin |
| devops@hexadeploy.local | Manager@123 | Owner of Nebula Storefront & Cloudcart API |
| dev@hexadeploy.local | User@123 | Developer on Nebula Storefront |
| qa@hexadeploy.local | User@123 | Viewer on Nebula Storefront, developer on Cloudcart API |
| victor@hexadeploy.local | User@123 | Owner of DataSync Worker |
| demo@hexadeploy.local | demo123 | Demo account |

Project roles: **owner** and **developer** may deploy to production; **viewer** is read-only
— in theory. Finding where that theory breaks is the lab.

## Files

- `server.js` — the whole app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature)
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints
- `FIX-AND-RETEST.md` — how to fix each flaw and regression-test the fix
- `progress.json` — **generated** runtime state (delete it to reset the lab to a fresh, locked state)

Built by **Md. Jony Hassain, Founder of HexaCyberLab**.
