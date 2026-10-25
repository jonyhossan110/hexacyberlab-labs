# HexaMart — Vulnerable Supermarket Practice Lab · LAB 4

⏱ **Estimated time:** ~3h 10m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 23
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

> ⚠️ **SAFETY WARNING — INTENTIONALLY VULNERABLE APPLICATION**
> HexaMart contains deliberate security flaws for hands-on practice.
> Run it **locally only** (it binds to `127.0.0.1`), never deploy it to a
> server, never expose it to a network, and never use real data in it.
> All users, products, orders and money in this lab are **synthetic**.

## What it is

HexaMart is **Lab 4** of the HexaCyberLab lab programme (Category 1 —
E-commerce & Retail, in the same family as HexaShop, HexaSaaS, HexaAPI and
HexaAI). It is a complete supermarket / grocery superstore web app — catalogue
by aisle, bulk-order pricing tiers, cart, checkout, orders and receipts, a
loyalty programme (earn / redeem / transfer points), a supplier inventory
console, and a store-manager (admin) dashboard — with **23 intentional
security tests** rooted in supermarket workflows, covering every feature of
the app: authentication, registration & profile, search, reviews, cart,
checkout, orders & receipts, loyalty, the supplier console, the admin panel
and a leftover data-exposure API.

**Tech:** one zero-dependency Node.js file (`server.js`, built-ins only — no
npm install, no external network). Server-rendered HTML, cookie sessions,
in-memory business data, plus a small on-disk progress file (see below).

## Run it (one command)

```bash
node server.js
```

or with Docker:

```bash
docker compose up --build
```

Then open: **http://127.0.0.1:3012**

## 🔒 The lab is locked — you need the Lab 3 key

Labs run **in order**. HexaMart starts locked: every page shows an unlock
gate asking for the **completion key from Lab 3 (HexaElectro)**. Finish Lab 3
at 100% and its completion page shows you the key; paste it into the gate
once and this lab stays unlocked on this machine. (The key itself is never
written down in any file here — by design, it only exists as encoded
fragments inside the labs and is assembled in memory at the moment it is
needed.)

## The lab system — how testing works

- **Progress to 100%.** Every page header shows your progress:
  `LAB 4 · n/23 tests · %`. The **Mission page at `/tests`** lists all 23
  tests grouped by feature, each with its OWASP category and difficulty.
- **Tests complete by DOING.** There is no "mark as done" button. The lab
  watches the application server-side and completes a test only when the
  exploit actually succeeds (an IDOR really serves someone else's receipt,
  a tampered price really lands on an order, …).
- **Hints beside every test.** Each test on `/tests` has three graded hints —
  a nudge, a stronger pointer, and a near-answer — revealed one at a time.
- **Hexa, the in-lab assistant.** The chat widget (bottom-right) knows the
  lab: feature and test counts, your progress, what to try next. Its
  **step-by-step help for a feature is locked until you have genuinely tried
  that feature at least 3 times** — it counts your attempts per feature and
  will tell you how many you still need. Ask it who built all this; it knows.
- **Completion.** At 100% the `/complete` page gives you the full summary:
  the lab's features and per-feature vulnerability counts, the techniques
  you used, what you learned, what each finding would mean for a real
  client, and how each is written in a real penetration-test report. It also
  shows your **completion key for Lab 5** and links to your printable
  **certificate** (`/certificate`, with the HexaCyberLab logo).
- **Progress persists.** Your tests, attempts, unlock state and (at 100%)
  completion are saved in **`progress.json`** next to `server.js`. You can
  stop the server, come back tomorrow, and resume exactly where you left
  off — the shop's business data resets to seed on restart, your progress
  does not.

**Full reset:** stop the server and delete `progress.json` (the shop data
resets on every restart anyway). The lab returns to its locked, 0% state.

## Test accounts

| Role          | Email                     | Password    | Notes                              |
|---------------|---------------------------|-------------|------------------------------------|
| Store manager | `admin@hexamart.local`    | `Admin@123` | Admin dashboard, all orders/users  |
| Supplier      | `supplier@hexamart.local` | `Supply@123`| Supplier inventory console         |
| Customer      | `rahim@example.com`       | `User@123`  | 240 loyalty points, order #2       |
| Customer      | `sara@example.com`        | `User@123`  | 1,320 loyalty points, orders #1, #3|
| Customer      | `tanvir@example.com`      | `User@123`  | 75 loyalty points                  |

New registrations start as customers with 100 welcome points.

## Features

- Product catalogue: 24 grocery products across 8 aisles, live stock counts
- Bulk pricing tiers: 10+ units 5% off · 25+ 10% off · 50+ 15% off
- Cart, checkout, orders and printable receipts
- Loyalty programme: earn 1 pt per $1, redeem 100 pts = $1 store credit, transfer points between accounts
- Supplier console: update product prices and stock
- Admin dashboard: revenue, all orders, all users
- Product reviews, product search, password reset, profile/settings

## The tests (23)

See **VULNERABILITIES.md** for the full map — all 23 tests grouped by
feature, each with OWASP category, location, exploitation outline and
business impact. Highlights: SQL-injection login bypass, brute force,
user enumeration, predictable reset tokens, loyalty points tampering and
theft-by-transfer, bulk-tier / price / coupon abuse at checkout, overselling,
order & receipt IDOR, supplier broken access control, cookie role tampering,
stored & reflected XSS, CSRF, mass assignment, and an unauthenticated
customer-data API.

## Practice path

1. **`/tests`** in the app — the live mission list with hints.
2. **PRACTICE-GUIDE.md** — the same challenges on paper, grouped by feature and difficulty, with measurable objectives.
3. **VULNERABILITIES.md** — confirm each finding properly.
4. **FIX-AND-RETEST.md** — secure implementations, regression tests and remediation notes for every flaw.

## Files

| File                | Purpose                                                        |
|---------------------|----------------------------------------------------------------|
| `server.js`         | The whole app + the lab system (zero-dependency Node.js)       |
| `logo.png`          | The HexaCyberLab logo (header + certificate)                   |
| `README.md`         | This file                                                      |
| `VULNERABILITIES.md`| All 23 intentional flaws, grouped by feature                   |
| `PRACTICE-GUIDE.md` | Graded hands-on challenges with hints                          |
| `FIX-AND-RETEST.md` | Fixes + regression tests per flaw                              |
| `Dockerfile`        | `node:20-alpine` image                                         |
| `docker-compose.yml`| Maps `127.0.0.1:3012` only                                     |
| `progress.json`     | **Generated at runtime** — unlock state, tests, attempts, completion. Not source; delete it for a full reset. |

## Licence / version

Lab release v2.0 (2026-10-23) — rebuilt with the full HexaCyberLab lab
system (progress, hints, assistant, sequential key unlock, certificate,
persistence). For authorised local practice and training only.
HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3012`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3012` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
