# HexaBookStore — LAB 9 · Vulnerable Bookstore Practice Lab

> ⚠️ **SAFETY WARNING — INTENTIONALLY VULNERABLE**
> This is a deliberately insecure training application. It contains real,
> working vulnerabilities on purpose. Run it **locally only**, on a machine
> and network you control. **Never deploy it to a public server, never put
> real data in it, and never reuse its passwords anywhere else.** All users,
> books, orders and prices are synthetic.

HexaBookStore is a complete online bookstore — catalogue with editions
(Paperback / Hardcover / Collector / Ebook), cart and checkout, a personal
digital **Library** with an ebook reader, **preorders** with locked prices,
a **gift-a-book** flow, reviews, profiles with avatar upload, sample-chapter
downloads and an admin dashboard. It is built to teach how vulnerabilities
grow out of a *specific business's* workflow: digital goods, edition
pricing, price locks and gifting are exactly where this store's
vulnerabilities live.

HexaBookStore is **LAB 9** of the HexaCyberLab lab programme (10 numbered
labs, completed in order). It carries the full lab system: **26 scored
tests**, a progress engine, per-test hints, a lab assistant (chatbot), a
sequential unlock key, and a completion certificate.

## Quick start (one command)

```bash
node server.js
```

Then open **http://127.0.0.1:3017**

No dependencies, no build step — Node.js built-ins only. Business data
(users, orders, libraries, reviews, carts) lives in memory and resets when
the server restarts. **Your test progress does NOT reset** — it is saved in
`progress.json` (see below) and resumes where you left off.

> 🔒 **LAB 9 starts LOCKED.** The first thing you see is a key gate: paste
> the completion key you earned by finishing **Lab 8 (HexaAutoParts) at
> 100%**. The unlock is remembered — you only paste it once per install.

### Docker

```bash
docker compose up --build
```

Same address: http://127.0.0.1:3017 (the compose file maps the port on
127.0.0.1 only).

## The lab system

- **Progress bar** — every page header shows `LAB 9 · n/26 tests · %`.
  A test completes **only when the server observes the exploit actually
  succeed** (an IDOR page really served, a tampered price really charged,
  a payload really stored…). There is no "mark done" button.
- **`/tests` — Mission page** — all 26 tests grouped by feature, with
  status, difficulty, the attempts counter per feature, and **3 graded
  hints per test**, revealed one at a time.
- **Lab assistant (chatbot)** — the 💬 panel on every page (or
  `POST /api/chat`). It knows the lab's features and test counts, reports
  your progress truthfully, and will guide you through a feature's tests
  **only after you have genuinely tried that feature at least 3 times** —
  it counts your attempts itself. Ask it who built these labs.
- **The key** — finishing Lab 9 at 100% reveals the **completion key for
  Lab 10** on the completion page. The key exists inside the app only as
  encoded fragments scattered through the code; it is assembled at the
  moment of completion — not before — and the chatbot receives it only
  then, too. Before 100%, asking the assistant for the key gets a refusal.
- **`/complete`** — at 100%: the completion summary (features and
  per-feature vulnerability counts, the ways testing was done, what you
  learned, what each finding means for a real client, and how to write it
  in a real report), the Lab 10 key, and your certificate name form.
- **`/certificate`** — a printable certificate card with the HexaCyberLab
  logo: your name, LAB 9, 26 tests across 10 features, completion date.
- **Persistence** — `progress.json` (created beside `server.js`) stores
  the unlock, passed tests, per-feature attempts and completion state.
  Restart the server any time; your % is exactly where you left it.

## Test accounts

| Role     | Email                        | Password   |
|----------|------------------------------|------------|
| Admin    | admin@hexabookstore.local    | `Admin@123` |
| Customer | priya@hexabookstore.local    | `User@123`  |
| Customer | omar@hexabookstore.local     | `User@123`  |
| Customer | lena@hexabookstore.local     | `User@123`  |
| Customer | marco@hexabookstore.local    | `User@123`  |

Seed state you can use immediately:

- **Priya** owns *The Clockwork Archive* (Ebook) and *The Last Cartographer* (Paperback).
- **Omar** owns *The Silent Compiler* (Ebook) and *The Midnight Ledger* (Hardcover).
- **Lena** owns *The Quantum Garden* (Ebook).
- Coupons: `WELCOME10` (10%), `STACK20` (20%), `BOOKWORM5` (5%).

## What's inside

- `server.js` — the whole application (zero-dependency Node.js), including
  the lab system (test registry, detection hooks, progress engine, chatbot).
- `VULNERABILITIES.md` — all 26 intentional vulnerabilities grouped by
  feature: location, exploitation steps, business impact, OWASP mapping.
- `PRACTICE-GUIDE.md` — the 26 challenges grouped by feature and
  difficulty, each with its 3 hints and a measurable objective.
- `FIX-AND-RETEST.md` — the secure implementation for every flaw, the
  regression test, and the remediation explanation.
- `logo.png` — the HexaCyberLab logo, served at `/logo.png` (header +
  certificate).
- `samples/` — free sample chapters, served by the `/sample` download.
- `Dockerfile`, `docker-compose.yml` — containerised run.
- `progress.json` — **generated at runtime** (your saved progress). Not
  part of the source; delete it to reset the lab system (see Reset).

## The 26 tests (summary, by feature)

- **Login & Authentication (6):** SQLi login bypass · brute force with no
  rate limiting · account enumeration via reset · default/demo credentials
  · predictable reset token · role tampering via unsigned cookie
- **Registration & Profile (4):** mass assignment of `role` · stored XSS
  via display name · 1-character passwords accepted · CSRF on profile/gift
- **Search, Catalogue & Reviews (3):** injection search leaking the hidden
  staff listing · reflected XSS in search · stored XSS in reviews
- **Cart & Coupons (2):** coupon stacking + unlimited reuse · negative /
  absurd quantity tampering
- **Checkout & Orders (3):** price tampering · edition-upgrade flaw ·
  order IDOR
- **Preorders (1):** preorder price-lock bypass
- **Library, Ebooks & Gifts (3):** ebook download without purchase ·
  library IDOR · gift duplication from any library
- **Files & Downloads (2):** unrestricted avatar upload (stored HTML) ·
  path traversal in sample downloads
- **Admin Panel (1):** data export (`/admin/export`) open to any customer
- **Platform & Hardening (1):** missing security headers

The original 14 flaws of the first HexaBookStore build are all still here;
the rebuild added 12 more so that **every feature carries every technique
that applies to it**, and wrapped them in the lab system.

## Reset

- **Business data** (orders, libraries, carts, avatars, registered users):
  restart the server.
- **Lab progress** (unlock, %, attempts, certificate state): delete
  `progress.json` and restart — Lab 9 returns to its fresh, locked state.

## Troubleshooting

- **Port already in use:** something else owns 3017. Stop it, or run
  `PORT=3020 node server.js` and browse to that port instead.
- **Still locked after pasting the key:** keys are case-sensitive and are
  revealed only at 100% on the previous lab's completion page — copy it
  exactly, no spaces.
- **Progress looks wrong after an exploit:** progress is scored by
  server-side observation — if the exploit didn't actually succeed, the
  test is still open. Check `/api/progress` for the live state.
- **Docker container can't be reached:** the app binds `127.0.0.1` by
  default; inside Docker the image sets `HOST=0.0.0.0` and compose still
  publishes the port on your loopback only.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3017`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3017` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
