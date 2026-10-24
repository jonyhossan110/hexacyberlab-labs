# HexaSupply — LAB 103

A deliberately vulnerable **supply chain management platform** (suppliers, purchase orders, shipments, inventory, warehouses, approvals, supplier invoices) built for hands-on web penetration-testing practice. Part of the HexaCyberLab 110-lab programme.

> ⚠️ **LOCAL ONLY.** Run it on your own machine/lab network only. Never deploy it publicly — it contains intentional vulnerabilities. All data is fake seed data.

## Run it

- Node (zero dependencies): `node server.js` → http://127.0.0.1:3112
- Docker: `docker compose up --build` → http://127.0.0.1:3112

Requires Node.js 20+ if run directly.

## The lab system

- **Lock gate:** Lab 103 starts locked. Paste the **completion key from Lab 102** to unlock it (`POST /unlock`). The gate stays lifted permanently for that install.
- **Progress:** every page header shows `LAB 103 · <done>/26 tests · <pct>%`. Progress is measured against this lab's own 26 scored tests across 9 features.
- **Mission Board (`/tests`):** all tests grouped by feature, each with status, the feature's attempt count, and 3 graded hints revealed one at a time.
- **Attempts & the Lab Coach:** a rule-based coach lives in the corner of every page (`POST /api/chat`). It answers feature/test counts freely, but step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** (it quotes your real attempt count). It does **not** have the completion key until you reach 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, what you learned, the client-language impact of each flaw, and how each finding is written in a real pentest report — plus the **completion key** for Lab 104.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo and your name (set it on `/complete`).
- **Persistence:** progress is stored in `progress.json` in this folder (generated state — safe to delete to reset the lab to a fresh, locked state). Your % survives restarts; it never resets on its own.

## How the completion key is stored

The key never appears as a plain string anywhere in the code or docs. It is split into pieces, each piece transformed, and the pieces are scattered in different regions of `server.js`; a small assembler rebuilds it only at the moment it is earned (100%) or when an entered key must be checked at the gate.

## Test accounts (fake, local only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexasupply.local | admin123 |
| Buyer | buyer@hexasupply.local | buyer123 |
| Approver | approver@hexasupply.local | approve123 |
| Supplier (Acme) | sam@acme-supply.test | supplier123 |
| Supplier (Globex) | gina@globex.test | supplier123 |
| Demo (published on the login page — itself a finding) | demo@hexasupply.local | demo123 |

## Files

- `server.js` — the whole app (zero-dependency Node.js, in-memory seed data)
- `VULNERABILITIES.md` — the complete vulnerability map (generated from the test registry)
- `PRACTICE-GUIDE.md` — challenges with graded hints (generated from the registry)
- `FIX-AND-RETEST.md` — secure implementation + regression test per finding
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — generated at runtime; your saved progress (delete to reset)

## Docs

Regenerate the three registry docs after editing the TESTS registry with: `node server.js --gen-docs`

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.
