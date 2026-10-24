# HexaSaaS — Deliberately Vulnerable Multi-Tenant SaaS Lab

> ⚠️ **WARNING — LOCAL PRACTICE ONLY. NEVER deploy, host, or expose this app on a public server or the internet.** It is intentionally full of security vulnerabilities (cross-tenant data leaks, privilege escalation, SQL injection, SSRF, XSS) for your own authorized manual pentesting practice on your own machine — like OWASP Juice Shop / DVWA. Anyone who can reach it can attack every "tenant" in it. Run it only on localhost.

**LAB 11 of the HexaCyberLab 110-lab series** (Category 2: SaaS & Business Platforms).

A realistic, modern **multi-tenant B2B SaaS** — workspaces (tenants), team roles, projects, tasks, files, mock billing, API keys, webhooks and a platform super-admin panel — that genuinely works end-to-end, and is vulnerable by design so you can practise the flaws that actually hit SaaS products: **tenant isolation failures first**, then privilege escalation, billing logic, invites and API keys, plus the classics.

This is Jony's second practice lab, after HexaShop (e-commerce). It runs on **port 3020**.

**Zero dependencies.** Pure Node.js built-ins. No `npm install`.

## The lab system (how scoring works)

- **Locked at start.** The lab opens with a key gate: paste the **completion key from Lab 10** to unlock. Nothing else is reachable until then.
- **26 scored tests across 9 features**, listed on `/tests` with three graded hints each. Tests are **detected by the server from the real exploit effect** — there is no "mark as done" button.
- **Progress bar** in the header of every page; progress is stored in `progress.json` and **survives restarts**. Delete `progress.json` to reset your lab progress (this also re-locks the lab).
- **Lab Coach chatbot** (bottom-right on every page): it knows every test, quotes your real attempt counts, and unlocks step-by-step help for a feature only after you have genuinely tried that feature **3 times**. It never has the completion key before you finish.
- **At 100%**: `/complete` gives the full debrief — per-feature vulnerability counts, the techniques you used, what you learned, the client impact of each flaw, how to write each one in a real report — plus the **completion key for Lab 12** and a printable **certificate** at `/certificate` with the HexaCyberLab logo.
- The in-app `/lab-guide` page remains available as the flaw-area map while you work.

## Requirements
- Node.js **v22+** (uses `node:sqlite`; tested on v24). Download: https://nodejs.org

## Run
```bash
cd hexasaas-vuln-lab
node server.js
# open http://localhost:3020
```

## Run with Docker
```bash
docker compose up --build
# open http://localhost:3020  (mapped to 127.0.0.1 only — local by design)
```

## Reset
- **Lab progress:** delete `progress.json` and restart.
- **All data:** delete `saas.db` (and `progress.json`) and restart — seed data is recreated automatically on first run.
Both files are runtime state created next to `server.js`; neither is part of the lab package.

## Seeded accounts (lab only — first name + 123 pattern)

**Acme Inc — Free plan, 3 seats** (already has 4 members — the seat limit is never enforced)
| Email | Password | Role |
|---|---|---|
| alice@acme.test | alice123 | Owner |
| carol@acme.test | carol123 | Admin |
| dave@acme.test | dave123 | Member |
| erin@acme.test | erin123 | Viewer |

**Globex Ltd — Pro plan, 10 seats**
| Email | Password | Role |
|---|---|---|
| bob@globex.test | bob123 | Owner |
| frank@globex.test | frank123 | Admin |
| grace@globex.test | grace123 | Member |

**Platform**
| Email | Password | Role |
|---|---|---|
| admin@hexasaas.local | admin123 | Super-admin (no tenant) |

Seeded data also includes: projects and tasks in both tenants (Globex project #4 "Internal CRM" is marked confidential), files with share tokens `sh_1001`–`sh_1004` (one holds Globex salary bands, one a customer list), invoices with IDs sequential across tenants, one API key per tenant (`hsk_acme_read_1111` read-only, `hsk_globex_write_2222`), a Globex webhook, and one pending Acme invite for henry@acme.test.

## Apps hub — category modules
The **Apps** page (sidebar, `/apps`) adds one module per SaaS category from `SAAS-CATEGORIES-MAP.md`, each seeded for **both** tenants and each carrying its category's headline flaw (see `VULNERABILITIES.md`):

CRM (cross-tenant deal IDOR + API export) · People/HR (full-record API: salaries + bank details) · Finance (pay a $125k invoice with $1) · Campaigns (audience export + guessable `unsub_<id>`) · Support Desk (ticket IDOR) · Team Chat (channel IDOR, raw-rendered messages) · Docs (public `doc_<id>` share tokens) · Store (order price tampering) · Analytics (report-builder SQLi + public `dash_<tenant_id>`) · Bookings (appointment IDOR + cross-tenant cancel) · AI Assistant (prompt injection leaks every tenant's secrets; summariser SSRF) · Clinic (patient + lab-report IDOR) · Wallet (**negative transfer creates money**) · Contracts (download cross-tenant; anyone can mark "Signed") · Properties (IDOR *write* — edit another landlord's listing) · Reservations (rate tampering + IDOR) · Academy/LMS (premium paywall bypass; certificates from URL parameters) · Shipments (public `trk_<id>` tracking leaks recipient PII) · Studio (health notes cross-tenant) · Salon (whole appointment book via `?tenant_id=`) · Vuln Scanner (scanner SSRF + cross-tenant reports).

Module mechanics worth knowing: all module records live in one `items` table with **global sequential IDs** (guessing neighbours is part of the lesson), and every module also answers on the JSON API at `/api/apps/<slug>` (and `/api/apps/<slug>/<id>`) with the caller's Bearer token — scoped, of course, by whatever `tenant_id` you feel like passing. Wallets start at Acme $5,000 / Globex $12,000 on a fresh seed.

## Practising with Burp Suite
1. Start the lab, set your browser proxy to Burp (127.0.0.1:8080), and log in as **dave@acme.test** (Member).
2. Work the challenges in `PRACTICE-GUIDE.md` in order — tenant isolation first.
3. High-value Burp habits for this lab: **compare two sessions side by side** (log in as alice in a second browser/profile; replay alice's requests with dave's cookie in Repeater and watch tenant checks disappear), **decode the `hexasaas_session` cookie** in Decoder (it is plain base64 JSON — edit, re-encode, resend), and **watch the API in Repeater** with `Authorization: Bearer` tokens from `POST /api/login`.
4. Watch your score climb on `/tests` — and ask the Lab Coach when you are stuck (after 3 real tries).

## Files in this folder
- `server.js` — the whole app + lab system; every intentional flaw is marked `// VULN(<type>):`
- `logo.png` — the real HexaCyberLab brand logo (certificate + header)
- `public/style.css` — styling
- `Dockerfile`, `docker-compose.yml` — one-command local run on port 3020
- `README.md` — this file
- `VULNERABILITIES.md` — the full scored registry: 26 tests by feature, with locations, exploitation, impact and fixes
- `PRACTICE-GUIDE.md` — the 26 challenges in order, each with a measurable objective and 3 graded hints
- `FIX-AND-RETEST.md` — the secure fix + regression check for every scored test
- `DESIGN.md` — what the lab is and why (approved design)
- `BUILD-TESTS.md` / `BUILD-TESTS-V2.md` — the original build self-tests (v1 platform + v2 modules)
- `SAAS-CATEGORIES-MAP.md` — the 22-category SaaS map (features · typical vulnerabilities · the module that teaches each)
- `progress.json`, `saas.db` — **generated at runtime** (your progress + the seeded database); delete to reset; never ship them

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3020`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3020` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
