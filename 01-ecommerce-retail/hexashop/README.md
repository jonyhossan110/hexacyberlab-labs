# HexaShop — Vulnerable E-Commerce Practice Lab

**LAB 1 of the HexaCyberLab practice-lab series.**

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaShop is an **intentionally vulnerable** training application. It contains real, working security flaws (SQL injection, XSS, IDOR, price tampering and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, product, order and coupon is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working e-commerce store in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). The shop's business data lives in a local SQLite file (`shop.db`, created automatically on first run). Your **lab progress is saved separately** (see below) and resumes where you left off.

Business features:

- Register / login / logout with customer and admin roles
- Product catalogue with categories, brands, search and sorting
- Product reviews and ratings
- Cart, checkout with coupons, wallet and gift cards
- Orders and invoices
- Profile with avatar upload (file and URL)
- API tokens, debug/info endpoints
- Admin dashboard: products, orders, users, URL import and XML product import, ping tool

## 🎯 The test & progress system

- **25 scored security tests** across **10 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3000/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a tampered order total, an IDOR read, a stored payload…) and ticks the test off itself.
- The header bar on every page shows your live progress: tests done / total and %.
- Progress is stored in `progress.json` in this folder. Close the lab and come back tomorrow — you resume from the same % (e.g. 40%), never from zero. Deleting `progress.json` resets progress (and re-locks nothing here — Lab 1 is the entry lab).

## 🔑 The lab key system — this is Lab 1

The HexaCyberLab labs run **in order**, and **HexaShop is the first lab — it starts open**, no key needed.

Completing **this** lab 100% reveals the **completion key for Lab 2 (HexaFashion)** on the completion page (`/complete`). Paste that key into Lab 2's lock screen to start it. Each lab's completion key unlocks the next, and Lab 10's completion yields the Category-1 master key.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (the completion key exists in full only once you reach 100%). There is no shortcut: the only way to the next lab is through this one.

## 🤖 The Lab Coach chatbot

Every page carries a built-in coach that knows this lab's features, test counts and techniques.

- Ask it what a feature contains, how many tests remain, or who built the labs — it answers freely.
- **How-to guidance is locked per feature until you have genuinely tried that feature at least 3 times.** Ask earlier and it will refuse and tell you to try first — that struggle is where the learning happens. Passing a test also unlocks its guidance.
- It does **not** hold the completion key before 100% — asking early gets a refusal. At 100% it will share the key.

## 🏆 Completion

At 100% the lab opens `/complete`: a debrief with total features, per-feature vulnerability counts, the techniques you used, what you learned, what these findings would mean on a real client's website (and the damage they prevent), and how to write each one into a professional client report — plus your completion key. From there, `/certificate` renders a printable completion certificate with the HexaCyberLab logo and your name.

## Run it

**Requirements:** Node.js v22 or newer (HexaShop uses the built-in `node:sqlite`). Download: https://nodejs.org

```bash
cd hexashop-vuln-lab
node server.js
# open http://127.0.0.1:3000
```

**Or with Docker:**

```bash
docker compose up
# open http://127.0.0.1:3000
```

Stop with `Ctrl+C`.

## Test accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@hexashop.local | admin123 | Full /admin access |
| Customer | alice@test.local | alice123 | 2 past orders, wallet $120 |
| Customer | bob@test.local | bob123 | 1 past order, wallet $45 |

Coupons: `WELCOME10` (10%), `HEXA20` (20%), `FLASH30` (30%). Gift cards exist in a guessable series — find them (see VULNERABILITIES.md).

## Reset

- **Progress reset:** delete `progress.json` and restart.
- **Shop data reset:** delete `shop.db` and restart — a fresh seeded DB is created automatically. Also clear `uploads/` for a fully clean lab.

## Burp Suite setup (for practice)

1. Start Burp Suite → Proxy: listener `127.0.0.1:8080` (default).
2. Point your practice browser's proxy at `127.0.0.1:8080`.
3. Browse http://127.0.0.1:3000 normally — traffic appears in Burp Proxy → HTTP history.
4. Scope: add `http://127.0.0.1:3000` so you only test the lab.

## Files

- `server.js` — the whole app + lab system (every intentional flaw is marked `// VULN(<type>): ...`)
- `public/style.css` — UI styling
- `VULNERABILITIES.md` — the 25 scored tests by feature: impact, severity, fix
- `PRACTICE-GUIDE.md` — the 25 challenges with graded hints and walkthroughs
- `FIX-AND-RETEST.md` — how to fix each finding and verify the fix
- `logo.png` — the HexaCyberLab brand logo (certificate + header)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `shop.db` — SQLite DB (auto-created on first run; safe to delete)
- `progress.json` — your saved progress (auto-created; delete to reset)
- `uploads/` — uploaded files (intentionally unsafe)

---

Built by **Md. Jony Hassain, Founder of HexaCyberLab** — for hands-on web penetration-testing practice.
