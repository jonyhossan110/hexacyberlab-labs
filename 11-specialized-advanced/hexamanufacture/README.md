# LAB 104 — HexaManufacture 🏭

A complete **manufacturing ERP** training lab: production lines, work orders, raw-materials inventory, purchase orders, quality checks, machine maintenance and suppliers — built as a deliberately vulnerable practice application for authorised security training.

> ⚠️ **LOCAL USE ONLY.** This app contains intentional, real vulnerabilities. Run it only on your own machine / lab network (it binds `127.0.0.1`). Never deploy it publicly, never use real data. All accounts and data are fake.

Part of the **HexaCyberLab 110-lab programme** — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Quick start

```bash
node server.js
# → http://127.0.0.1:3113
```

Or with Docker:

```bash
docker compose up --build
```

Zero dependencies — pure Node.js (built-ins only). In-memory seed data resets on restart; your *progress* does not (see below).

## The lock gate

Labs are numbered and unlock **in sequence**. Lab 104 starts locked: paste the **completion key you earned by finishing Lab 103 at 100%**. A wrong key is rejected; the correct key lifts the gate permanently for this install (and survives restarts).

How keys work (mechanism only): each lab's completion key is split into encoded shards scattered through its code and assembled only at the moment of reveal — it never appears whole in the source, and the Lab Coach does not have it until you reach 100%.

## The lab system

- **Progress:** every test you solve raises your score. Progress is `solved / 26` and shows in the header of every page and at `GET /api/progress`.
- **Mission Board (`/tests`):** all 26 scored tests grouped by feature, each with **3 graded hints** revealed one at a time, plus your attempt count per feature.
- **Feature-complete coverage:** every feature carries *all* the vulnerability techniques that apply to it — the Login feature alone covers SQL injection bypass, brute force, user enumeration, published demo credentials, a predictable reset token, and role-cookie tampering. The total test count (26) is the 100% denominator.
- **Lab Coach (chat, bottom-right):** knows every feature and test. It answers map questions (names and counts) freely, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** (tracked server-side). Asked earlier, it refuses and tells you your real attempt count. It reveals the completion key **only after 100%**.
- **Persistence:** progress is stored in `progress.json` (generated at runtime, safe to delete to reset). Quit and come back — you resume from your saved %, never zero.
- **Completion (`/complete`):** at 100% you get the full debrief — total features, per-feature vulnerability counts, every testing technique used, what you learned, what each flaw would mean for a real client, and how each finding is written in a real pentest report — plus your **completion key** for Lab 105.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo, your name, and the lab stats.

## Test accounts (fake, training only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexamanufacture.local | admin123 |
| Manager | manager@hexamanufacture.local | manager123 |
| QC | qc@hexamanufacture.local | qc123 |
| Operator | operator@hexamanufacture.local | operator123 |
| Operator | bob@hexamanufacture.local | bob123 |
| Technician | tech@hexamanufacture.local | tech123 |

## Files

- `server.js` — the whole app + lab system (zero-dependency)
- `VULNERABILITIES.md` — the complete map of all 26 scored tests
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — how each flaw is fixed and regression-tested
- `progress.json` — **generated runtime state** (git-ignored; delete to reset the lab to a fresh, locked state)

## License

MIT © Md. Jony Hassain / HexaCyberLab — for authorised training use.
