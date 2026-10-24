# HexaWebhook — LAB 26 of 110

**Category 3: API & Developer Platforms** · A webhook delivery service — projects, endpoints, event subscriptions, delivery attempts with retries, delivery logs and signing secrets.

> ⚠️ **INTENTIONALLY VULNERABLE — local training lab only.** Never deploy this app to a public server. It binds to `127.0.0.1` only and its "delivery engine" is simulated in-app: it never makes a real network request.

## Run it

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up       # one-command setup
```

Open http://127.0.0.1:3035 — the lab starts **locked**. Paste the completion key you earned at 100% in **Lab 25 (HexaGit)** to unlock it. Wrong keys are rejected with 403; a correct key unlocks the lab permanently for that install.

## The business app

- **Projects** — group endpoints per product (seeded: *Acme Billing*, *ShopFront*).
- **Endpoints** — destination URLs with event subscriptions and per-endpoint **signing secrets**.
- **Delivery engine (simulated)** — "Send a test event" creates a delivery with a payload, an HMAC-style signature, retries and a recorded response body. Deliveries are simulated inside the app so SSRF findings can be practised safely without touching real hosts.
- **Delivery logs** — full payload, response body and signature per delivery; CSV export; replay.
- **Admin console** — user management (disable accounts), platform counts.
- **API** — Bearer-token JSON API (`/api/projects`), plus whatever else the developers left behind…

## Test accounts (seeded)

| Email | Password | Role |
|---|---|---|
| admin@hexawebhook.local | admin123 | admin |
| dev@hexawebhook.local | dev123 | member (owns Acme Billing) |
| sara@hexawebhook.local | sara123 | member (owns ShopFront) |
| demo@hexawebhook.local | demo | member (demo account) |

## The lab system

- **26 scored tests across 8 features** — Login & Authentication (6), Registration & Profile (4), Projects (2), Endpoints & SSRF (4), Subscriptions (2), Deliveries & Logs (3), Admin Panel (2), Platform & API (3). See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for challenges and graded hints, `FIX-AND-RETEST.md` for the secure implementation of every finding.
- **Progress** — every test completes by *doing* the exploit (the server detects the real effect; there is no "mark done"). The header shows `done/total · %` on every page; the Mission page at `/tests` groups tests by feature with 3 graded hints each.
- **Lab Coach chatbot** — knows the whole map (features, counts, test names) and your progress. Step-by-step help for a feature unlocks only after **≥3 genuine attempts** on that feature (or when its tests are passed). It does **not** have the completion key until you reach 100%.
- **Persistence** — progress is stored in `progress.json` (generated state, safe to delete to reset the lab) and survives restarts: leave at 40%, come back, resume at 40%.
- **Completion** — at 100% the `/complete` page shows the full debrief (features, per-feature counts, ways tested, lessons, client impact, report writing) and reveals the **completion key for Lab 27**; `/certificate` renders your printable certificate with the HexaCyberLab logo. Keys are never stored in plain form — in `server.js` each key exists only as encoded shards scattered across the file, assembled at runtime.
- **Reset** — delete `progress.json` and restart: the gate returns and progress is 0%.

## Files

`server.js` (the whole app) · `README.md` · `VULNERABILITIES.md` · `PRACTICE-GUIDE.md` · `FIX-AND-RETEST.md` · `Dockerfile` · `docker-compose.yml` · `logo.png` · `progress.json` (generated at runtime)

---

Part of the **HexaCyberLab 110-lab programme** — built by **Md. Jony Hassain, Founder of HexaCyberLab**.
