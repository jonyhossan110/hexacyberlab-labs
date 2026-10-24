# HexaAuth — LAB 29 of 110 (Category 3: API & Developer Platforms)

A deliberately vulnerable **identity / authentication platform** for hands-on web penetration-testing practice. HexaAuth hosts identity for tenant applications: developer teams register apps, configure simulated OAuth clients, SSO and MFA, and manage the end users who sign in to those apps. **Local use only — never deploy this publicly.**

## Run it

```bash
node server.js          # http://127.0.0.1:3038  (Node 18+, zero dependencies)
# or
docker compose up --build
```

## The lock gate

Lab 29 starts **locked**. Paste the completion key you earned by finishing **Lab 28 (HexaDataHub)** into the gate to unlock it. Progress is stored in `progress.json` (generated state — safe to delete to reset the lab to a fresh, locked state; your % and attempts survive restarts until then).

## The lab system

- **Progress:** every scored test you solve raises your % (header bar + `GET /api/progress`). 100% = all 24 tests.
- **Mission page:** `/tests` lists every test by feature, with status, per-feature attempt counts and 3 graded hints per test.
- **Lab Coach chatbot:** on every page (bottom right). It answers map questions freely (features, counts, test names). Step-by-step help for a feature unlocks only after you have **tried that feature at least 3 times** — it quotes your real attempt count. It will **not** reveal the completion key before 100%.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts, techniques, lessons, client impact, report writing) and your **completion key for Lab 30 (HexaPackage)**. `/certificate` renders your printable certificate once you save your name on `/complete`.

## Test accounts

Console (developer) accounts:

| Email | Password | Role / owns |
|---|---|---|
| admin@hexaauth.local | Admin@123 | Platform admin |
| dev@acme.local | Dev@123 | Owns app 1 — Acme Portal |
| dev@globex.local | Dev@123 | Owns app 2 — Globex HR |
| dev@initech.local | Dev@123 | Owns app 3 — Initech Docs |
| demo@hexaauth.local | demo123 | Demo account |

End users (sign in at `/enduser/login?app=<client_id>`):

| App (client_id) | Email | Password | Notes |
|---|---|---|---|
| Acme Portal (`acme_web`) | alice@acme.example | alice123 | |
| Acme Portal (`acme_web`) | bob@acme.example | bob123 | |
| Globex HR (`globex_hr`) | carol@globex.example | carol123 | MFA on, authenticator code `246810`, app requires MFA |
| Globex HR (`globex_hr`) | dave@globex.example | dave123 | |
| Initech Docs (`initech_docs`) | erin@initech.example | erin123 | |

Globex HR also has SSO enabled for the `globex.example` domain (`/sso/login?client_id=globex_hr`).

## What's inside

24 scored tests across 8 features — Login & Authentication (6), Registration & Profile (4), Tenant Apps & Clients (3), OAuth Flow (3), End Users & MFA (3), SSO Configuration (2), Admin Panel (1), Platform & API (2) — including redirect-URI prefix bypass, forgeable access tokens, authorization-code reuse, guessable app API keys, SSO assertion/config attacks and MFA bypass. Full map: `VULNERABILITIES.md`. Challenges: `PRACTICE-GUIDE.md`. Fixes: `FIX-AND-RETEST.md`.

## Safety

Binds `127.0.0.1` only. All data is in-memory seed data (restart resets the business data, never your lab progress). No real credentials anywhere. For authorised practice on your own machine only.

---

HexaCyberLab practice labs — built by **Md. Jony Hassain, Founder of HexaCyberLab**.
