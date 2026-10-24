# HexaElectro — Vulnerable Electronics Shop (Practice Lab)

> ⚠️ **SAFETY WARNING — INTENTIONALLY VULNERABLE APPLICATION**
> HexaElectro contains deliberate security vulnerabilities for **local, authorised
> penetration-testing practice only**. It binds to `127.0.0.1` by design.
> **Never deploy it publicly, never expose it to a network, and never use real data.**
> All users, products, serial numbers and orders are synthetic.

## Overview

HexaElectro is a complete electronics-store web application — catalogue (phones,
laptops, TVs, tablets, audio, wearables, cameras, gaming), cart, checkout, orders
with per-unit **serial numbers**, a **Warranty Centre** (serial registration, serial
lookup, warranty claims), a **Trade-In** flow (condition grade → checkout credit),
support tickets, invoice uploads, customer profiles, and an admin dashboard
(products, orders, inventory, claims, tickets).

Its business workflows carry realistic, business-specific vulnerabilities:
trade-in value tampering, warranty-claim IDOR, serial-number enumeration,
warranty-extension parameter tampering, flash-sale race conditions, and more —
see `VULNERABILITIES.md` (27 documented flaws — the lab's full test registry).

## The lab system (LAB 3 of the HexaCyberLab series)

HexaElectro is **Lab 3** of 10. It is wrapped in a training system:

- **🔒 Locked gate.** The lab starts locked. Paste the **completion key from
  Lab 2** on the gate to unlock it (permanently, for this install). There is no
  other way in.
- **Progress (0–100%).** The lab has **27 scored tests** across 11 features
  (Authentication, Registration & Profile, Catalogue & Search, Cart & Checkout,
  Orders, Trade-In, Warranty Centre, Support Tickets, Invoices, Admin Panel,
  APIs & Platform). A test completes only when the server observes the real
  exploit succeed — there is no "mark done". The header shows your live
  progress; `GET /api/progress` returns it as JSON.
- **Missions page (`/tests`).** Every test with its OWASP class, difficulty,
  your attempt count for its feature, and **3 graded hints** beside it.
- **Chatbot.** The in-lab assistant (bottom-right) knows the whole map. It
  answers counts and test names freely, but **step-by-step guidance for a
  feature unlocks only after you have genuinely tried that feature at least
  3 times** — it counts your attempts and will tell you the number. It does
  not have the completion key until you finish the lab. Ask it who built
  these labs.
- **Completion (`/complete`).** At 100% you get the full debrief: features and
  per-feature vulnerability counts, every technique you used, what you
  learned, what each flaw would mean on a real client's website, and how
  each finding is written in a real pentest report — plus the **completion
  key that unlocks Lab 4**.
- **Certificate (`/certificate`).** A printable completion card with the
  HexaCyberLab logo and your name.
- **Persistence.** Your progress, attempts, unlock state and certificate
  name are saved in **`progress.json`** (generated at runtime — not part of
  the source) and **survive restarts**: leave at 40%, come back tomorrow,
  resume at 40%. The shop's business data (below) is separate.

## Run it

Zero dependencies — Node.js 20+ only:

```bash
node server.js
# → http://127.0.0.1:3011
```

Or with Docker:

```bash
docker compose up --build
# → http://127.0.0.1:3011
```

**Reset:** stop and restart the process (`Ctrl+C`, run again). The shop's
business data is in-memory and re-seeded at startup — but **lab progress is
not reset by a restart** (it lives in `progress.json`). To reset progress
and re-lock the lab, delete `progress.json` and restart. Docker:
`docker compose down && docker compose up`.

## Test accounts

| Role     | Email                     | Password   |
|----------|---------------------------|------------|
| Admin    | admin@hexaelectro.local  | Admin@123  |
| Customer | nadia@hexaelectro.local  | User@123   |
| Customer | tanvir@hexaelectro.local  | User@123   |
| Customer | rahim@hexaelectro.local   | User@123   |

Seeded devices: Nadia owns serials `HE100001` (Aurora X5) and `HE100004` (SoundMax,
warranty expired 2025-12-01); Tanvir owns `HE100002` (VoltBook Air); Rahim owns
`HE100003` (CineView 55"). `HE100010` and `HE100011` are unregistered store stock.
Serials are sequential — see what that means in `VULNERABILITIES.md`.

Coupon codes: `ELECTRO10` (10% off), `WELCOME15` (15% off).

## Files

| File                 | Purpose                                             |
|----------------------|-----------------------------------------------------|
| `server.js`          | The whole application + lab system (one file, Node built-ins only) |
| `logo.png`           | The real HexaCyberLab brand logo (gate + certificate) |
| `progress.json`      | Generated at runtime — unlock state, progress, attempts. Delete to reset/re-lock |
| `VULNERABILITIES.md` | All 27 intentional flaws: location, steps, impact   |
| `PRACTICE-GUIDE.md`  | All 27 challenges from the test registry, grouped by feature, with graded hints |
| `FIX-AND-RETEST.md`  | Secure implementation + regression test per flaw    |
| `Dockerfile`         | node:20-alpine image                                |
| `docker-compose.yml` | One-command local run, mapped to 127.0.0.1:3011     |

## Safety & scope

- Local-only defaults; no external network calls; no real credentials anywhere.
- Synthetic data only. Isolated: runs standalone, shares nothing with other labs.
- For training with HexaShop / HexaSaaS / HexaAPI / HexaAI in the HexaCyberLab lab series.
