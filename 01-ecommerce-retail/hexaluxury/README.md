# HexaLuxury — Vulnerable Luxury Goods Store (Practice Lab)

**LAB 5** of the HexaCyberLab lab programme.

An **intentionally vulnerable** luxury e-commerce application for hands-on web
security practice: product authenticity certificates, a VIP membership programme
with tier pricing and a Private Sale collection, cart/checkout, a concierge
desk, and an admin dashboard — with **23 vulnerabilities** rooted in the
business workflow (VIP tier bypass, certificate forgery & enumeration, private-sale
access control, price tampering, SQL injection, XSS, CSRF, and more), each one a
tracked, auto-detected **test** in the lab system described below.

> ## ⚠️ SAFETY WARNING
> This application is **deliberately insecure**. Run it **locally only**
> (it binds to `127.0.0.1`), never deploy it to a server, never expose it to a
> network, and never enter real credentials or real data. All users, products,
> orders and certificates are **synthetic**. For authorised practice and
> training only.

## Run it

```bash
node server.js
```

or with Docker:

```bash
docker compose up
```

Then open: **http://127.0.0.1:3013**

No dependencies, no build step, no npm install — plain Node.js (built-ins only).

## 🔒 This lab starts LOCKED

Labs in this programme open in order. HexaLuxury is **Lab 5** — on first run it
shows only a lock screen. Paste the **completion key from Lab 4 (HexaMart)** to
unlock it. The unlock is stored, so you only do this once per install.

## The lab system

- **Progress to 100%.** The header bar on every page shows your score:
  `LAB 5 · <done>/<total> tests · <pct>%`. Tests complete **automatically when
  the exploit actually succeeds** — the application detects it server-side.
  There is no "mark done" button.
- **Mission page (`/tests`).** All 23 tests grouped by feature, with status,
  per-feature attempt counters, and **3 graded hints per test** (reveal them one
  at a time).
- **Feature-complete coverage.** Every feature carries every vulnerability
  technique that applies to it — authentication alone has six: SQLi login
  bypass, brute force, user enumeration, predictable reset token, cookie role
  tampering, and no password policy.
- **Lab Assistant (chatbot).** The chat panel (bottom-right) knows the whole
  lab: test counts per feature, your progress, what to try next. **Key-lock
  rule:** step-by-step guidance for a feature unlocks only after you have
  genuinely tried that feature **at least 3 times** — the assistant counts your
  attempts and will tell you to go and try first. It does **not** have the
  completion key until you reach 100%.
- **Completion (`/complete`).** At 100% this page shows the full summary: the
  lab's features and per-feature vulnerability counts, what you learned, what
  each flaw would mean on a real client's website (and the harm the client is
  protected from once it's found and fixed), how each finding is written in a
  real penetration-test report — plus the **completion key for Lab 6**, and your
  **certificate** (`/certificate`, printable card with the HexaCyberLab logo).
- **Progress persists.** Your %, passed tests and attempt counts are saved to
  `progress.json` (generated runtime state, next to `server.js`). Restart the
  server and you resume exactly where you left off — business data resets, your
  progress does not.
- **Reset.** Business data lives in memory: restart the server to restore the
  seed state. To reset the **lab system** (progress, unlock) as well, delete
  `progress.json` and restart.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@hexaluxury.local` | `Admin@123` | Dashboard + concierge inbox |
| VIP customer (Platinum) | `arif@hexaluxury.local` | `User@123` | Sees Private Sale, 10% tier pricing, has orders + certificates |
| Regular customer (Member) | `lena@hexaluxury.local` | `User@123` | No VIP access — your main attack account |

Handy extras: coupon codes `LUXE10` and `BIENVENUE15` at checkout; certificate
serials start at `HLX-1001` (see any product page, or `/verify`).

## What's inside

- **Catalogue + search** — watches, bags, jewellery (12 pieces); VIP-only
  Private Sale pieces; a search page with its own flaws
- **Authenticity certificates** — every piece carries a serial (`HLX-####`) with a
  public verify page; purchases issue new certificates to the buyer
- **VIP programme** — Member / Gold / Platinum tiers, tier pricing, private sales
- **Cart & checkout**, orders, certificates in *My Account*
- **Concierge** message form; **admin dashboard** with inbox
- **Profile & settings** with photo upload and password reset

## Files

| File | Purpose |
|---|---|
| `server.js` | The whole app + lab system (zero-dependency Node.js) |
| `VULNERABILITIES.md` | All 23 tests grouped by feature, with exploitation steps and business impact |
| `PRACTICE-GUIDE.md` | Challenges grouped by feature and difficulty, with hints and measurable objectives |
| `FIX-AND-RETEST.md` | Secure implementation + regression test for every test |
| `logo.png` | The HexaCyberLab logo (header + certificate) |
| `progress.json` | **Generated at runtime** — your saved progress (not source; safe to delete to reset) |
| `Dockerfile`, `docker-compose.yml` | Optional container run (still bound to 127.0.0.1) |

## Rules of the lab

- Practice only against this local instance.
- The point is to *understand* each flaw: exploit it, then read
  `FIX-AND-RETEST.md` and verify the fix pattern.
- These labs were built by **Md. Jony Hassain**, Founder of HexaCyberLab —
  ask the Lab Assistant "who built this?" and it will tell you the same.
