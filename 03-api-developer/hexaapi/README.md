# HexaAPI — Deliberately Vulnerable API Platform Lab (LAB 21)

HexaCyberLab's API-security practice lab, now **LAB 21** of the 110-lab programme: an **API platform with a developer portal** — a REST API (v2 current, v1 legacy) plus a small GraphQL endpoint, serving two client companies, wrapped in a portal UI with docs, an explorer, an API-keys page and an admin console. Business focus: API keys, endpoints, quotas and usage metering for developer accounts.

**18 intentional vulnerability groups** covering the **OWASP API Security Top 10 (2023)** — led by BOLA (API1), broken authentication (API2), excessive data exposure / mass assignment (API3), BFLA (API5), SSRF (API7), improper inventory (API9) and unsafe consumption (API10) — plus GraphQL flaws, API-key failures, token-lifecycle flaws, parameter pollution, an export leak, registration enumeration and forged webhooks. Every flaw is marked in the code with a `// VULN(<n>):` comment, numbered to match `VULNERABILITIES.md` and the in-app `/lab-guide`.

> ⚠️ **LOCAL ONLY — NEVER deploy publicly.** This app is deliberately insecure. Run it on your own machine, practise on it, learn from it. Nothing in it is a real service.

## The lab system (LAB 21)

- **Locked until you earn it:** this lab opens only with the **completion key from Lab 20**. Paste it on the gate page; the lab stays unlocked for that install afterwards.
- **25 scored tests across 8 features** (Authentication & Tokens 4 · Registration & Accounts 4 · Object Access (BOLA) 3 · Admin & Function Access 2 · API Keys 3 · Data Exposure & Exports 3 · Integrations & Webhooks 3 · Platform & Inventory 3). Tests complete by DOING — the server detects the real exploit effect; there is no "mark done" button. Full map: `VULNERABILITIES.md`; challenges + hints: `PRACTICE-GUIDE.md`; fixes + retests: `FIX-AND-RETEST.md`.
- **Progress bar + /tests mission page:** every page shows "LAB 21 · done/total · %". The /tests page groups tests by feature with 3 graded hints each.
- **Lab Coach chatbot** (bottom-right on every page): knows the whole map and your real attempt counts. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature. It does not have the completion key until you finish 100%.
- **Persistence:** progress lives in `progress.json` (generated state — created on first run, listed in .gitignore). Stop and restart the server any time; your % and unlock state resume exactly where you left them.
- **At 100%:** /complete shows the full debrief (features, per-feature counts, techniques, lessons, client impact, how to write each finding in a real report) plus the **completion key that unlocks Lab 22**, and /certificate renders your printable certificate (name saved on /complete).

## Run it

```bash
node server.js
# → http://localhost:3030   (binds 127.0.0.1 only)
```

Or with Docker: `docker compose up --build` (publishes 127.0.0.1:3030 only).

Zero dependencies — plain Node.js 22+ (uses the built-in `node:sqlite`). The database (`api.db`) is created and seeded automatically on first start.

**Reset the lab:** stop the server, delete `api.db` and `progress.json`, start again. Everything (accounts you registered, orders you marked paid, users you deleted, progress and unlock state) returns to the fresh seed state.

## Seeded accounts (lab only — printed here on purpose)

Passwords are always *first name + 123*:

| Email | Password | Who | Company |
|---|---|---|---|
| nina@nimbus.test | nina123 | Nina Park — company **admin** | Nimbus Retail (company 1) |
| omar@nimbus.test | omar123 | Omar Haddad — plain user | Nimbus Retail |
| vince@vertex.test | vince123 | Vince Aldana — company **admin** | Vertex Health (company 2) |
| wren@vertex.test | wren123 | Wren Okafor — plain user | Vertex Health |
| root@hexaapi.local | root123 | Platform operator (staff) | — (platform) |

Object IDs are **global and sequential across companies** — Nimbus's orders are #1–2, Vertex's are #3–4; users run 1–5 in the order above. Guessing the neighbour's ID is the whole point of group 1.

## Seeded API keys

Keys follow a pattern: `hx_live_<company-slug>_<seq>`.

| Key | Owner | Labelled scope |
|---|---|---|
| hx_live_nimbus_0001 | nina (Nimbus) | read |
| hx_live_nimbus_0002 | nina (Nimbus) | write |
| hx_live_vertex_0001 | vince (Vertex) | read |

If the pattern is this predictable, what is Vertex's *second* key likely to be — and Nimbus's third? (Group 13.)

## First API calls

```bash
# Log in as Omar (plain user, Nimbus) and keep the token
TOKEN=$(curl -s -X POST http://localhost:3030/api/v2/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"omar@nimbus.test","password":"omar123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')

# Your own company's orders — fine so far
curl -s http://localhost:3030/api/v2/orders -H "Authorization: Bearer $TOKEN"

# Now the lab's first lesson: order #3 belongs to Vertex Health
curl -s http://localhost:3030/api/v2/orders/3 -H "Authorization: Bearer $TOKEN"
```

Work through `PRACTICE-GUIDE.md` feature by feature — BOLA first. `VULNERABILITIES.md` is the hint/fix map. The portal's own `/docs` page lists only the *public* v2 surface — part of the exercise is finding what it doesn't list.
