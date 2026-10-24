# HexaPay — LAB 41 · HexaCyberLab Lab Programme

> ⚠️ **TRAINING LAB — INTENTIONALLY VULNERABLE. LOCAL USE ONLY.**
> HexaPay is a fictional payment gateway seeded with fake people, fake banks and fake money.
> It binds to `127.0.0.1` only. **Never deploy it publicly or on a shared network.**

**Lab 41 of 110** · Category 5 — Finance, Payments & Insurance · Port **3050** · Zero-dependency Node.js (built-ins only)

HexaPay simulates a small payment gateway: merchant accounts, hosted payment links/checkout,
transactions with receipts, refunds, webhooks with signing secrets, API keys with scopes,
balances and payouts — plus a platform admin. Every workflow works end-to-end, and every
workflow carries realistic, business-derived vulnerabilities for hands-on testing
(26 scored tests across 9 features).

## Quick start

```bash
node server.js            # → http://127.0.0.1:3050
# or
docker compose up --build # → same address, containerised
```

## The lab system

- **Lock gate** — the lab starts locked. Paste the **completion key from Lab 40 (HexaModelHub)**
  to unlock it. A wrong key is rejected (403); the unlock persists across restarts.
- **Progress** — each scored test you actually exploit flips to done (detection is server-side,
  on the real exploit effect — never a checkbox). The header bar and `/api/progress`
  show `done/total`, percentage and per-feature attempts.
- **`/tests` — Mission page** — every test grouped by feature, with OWASP mapping, difficulty
  and **3 graded hints** revealed one at a time.
- **Lab Coach chatbot** — on every page (bottom-right). It knows the full test map and your
  progress, but step-by-step help for a feature unlocks **only after ≥3 genuine attempts**
  on that feature (or once one of its tests is passed). It quotes your real attempt counts,
  and it does **not** hold the completion key until you reach 100%.
- **Persistence** — progress lives in `progress.json` (generated state, safe to delete to
  reset the lab). Restart the server and your % and attempts are still there.
- **`/complete`** — at 100%: a six-section debrief (features, per-feature counts, techniques used,
  what you learned, what it means for a real client, how to write each finding in a report),
  your **completion key** for Lab 42, and the certificate name form.
- **`/certificate`** — a printable completion certificate with the HexaCyberLab logo.

### How the keys work (mechanism only)

Each lab's entry key is the previous lab's completion key. Keys are **never stored as plain
text anywhere in this folder**: each key exists only as a set of encoded shards scattered
through `server.js`, reassembled in memory at the moment of use (unlock check / completion
reveal). The docs describe the mechanism only — no key value or shard appears in any document.

## Test accounts (all fake)

| Account | Password | Role |
|---|---|---|
| admin@hexapay.local | admin123 | Platform admin (shipped defaults — see the tests) |
| maya@novashop.test | maya123 | NovaShop owner (merchant m1) |
| leo@novashop.test | leo123 | NovaShop staff |
| ivan@pixelmart.test | ivan123 | PixelMart owner (merchant m2) |
| sara@pixelmart.test | sara123 | PixelMart staff |

Seeded business data: NovaShop balance $1,240 · PixelMart balance $860 · links L-1001 ($250),
L-1002 ($40), L-2001 ($120), L-2002 ($300) · transactions 1001–1005 (1005 already fully refunded).

## Reset the lab

Stop the server and delete `progress.json` — the lab returns to its locked, 0% state.
The in-memory business data re-seeds on every boot.

## Files

`server.js` (the whole app + lab system) · `VULNERABILITIES.md` (the complete test map) ·
`PRACTICE-GUIDE.md` (challenges with hints & objectives) · `FIX-AND-RETEST.md` (secure fix +
regression check per test) · `Dockerfile` / `docker-compose.yml` · `logo.png` (HexaCyberLab logo)

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — part of the 110-lab HexaCyberLab programme.
