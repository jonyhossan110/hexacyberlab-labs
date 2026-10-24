# HexaAuction — LAB 99 (Category 10: Property, Jobs & Professional Services)

A deliberately vulnerable **online auction platform** built for hands-on web security practice:
listings, bids, reserve prices, sellers, watchlists, settlements and a winner flow — plus the full
HexaCyberLab lab system (progress, hints, Lab Coach, sequential unlock keys, certificate).

> **LOCAL-ONLY training software.** Every account, listing and payment is fake seed data.
> Never deploy this app publicly. It is intentionally insecure.

## Run it

```bash
node server.js          # binds 127.0.0.1:3108
# or
docker compose up       # same port
```

Open http://127.0.0.1:3108 — the lab starts **locked** (see below).

## The lab system

- **Sequential unlock:** LAB 99 opens only with the **completion key from Lab 98**. Paste it into the
  gate form. The gate stays lifted for that install afterwards.
- **Progress:** every solved test raises your % (26 scored tests across 8 features). Progress lives in
  `progress.json` (generated at runtime — safe to delete to reset the lab to a fresh state) and
  **survives restarts**.
- **Mission Board (`/tests`):** all tests grouped by feature, each with 3 graded hints revealed one
  at a time. Tests pass only when the exploit actually works — server-side detection, never a checkbox.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the full map and your progress. Step-by-step
  help for a feature unlocks only after **at least 3 genuine attempts** on that feature — before
  that it refuses and tells you how many tries it has seen. It does **not** hold the completion key:
  it receives it only when you reach 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability
  counts, techniques used, what you learned, what each flaw means for a real client, and how to write
  each finding in a real pentest report — plus the **completion key that unlocks Lab 100**.
- **Certificate (`/certificate`):** a printable card with the HexaCyberLab logo once you hit 100%.

## Test accounts (fake, local only)

| Role   | Email                    | Password  |
|--------|--------------------------|-----------|
| Admin  | admin@hexaauction.local  | admin123  |
| Seller | alice@test.local         | alice123  |
| Bidder | bob@test.local           | bob123    |
| Bidder | carol@test.local         | carol123  |

## Files

- `server.js` — the whole app + lab system (zero-dependency Node.js)
- `VULNERABILITIES.md` — the complete vulnerability map (26 tests by feature)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — how to fix each flaw and retest the fix
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — **generated runtime state**, not source; listed in `.gitignore`

## About

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab HexaCyberLab
practice programme. Keys are a chain: each lab's completion key unlocks the next lab. Key values
never appear in this repository — they are reconstructed at runtime from scattered encoded shards
and revealed only at 100% completion.
