# HexaGrocery — LAB 6 · Vulnerable Grocery Delivery Lab

An **intentionally vulnerable** grocery delivery web app for hands-on web security practice, part of the HexaCyberLab lab programme. Business flows: product catalogue (fresh food, dairy & eggs, pantry, household), delivery **slots with limited hourly capacity**, cart, checkout with delivery fee and coupons, **live orders**, a **substitution flow** (an out-of-stock item is swapped by the picker and the customer is charged per the substitution rules), an address book, delivery notes, and customer / picker / admin roles.

> ## ⚠️ SAFETY WARNING
> This app is **deliberately insecure**. Run it **locally only** (it binds `127.0.0.1`), never deploy it, never expose it to the internet or an untrusted LAN, never enter real credentials or real data. All users, products and orders are **synthetic**.

## The lab system (progress, hints, chatbot, keys, certificate)

This is **Lab 6** of a numbered programme — labs are completed **in order**.

- **🔒 Locked at first start.** The lab opens with a gate asking for the **completion key from Lab 5**. Paste it once; the lab stays unlocked on this machine afterwards. (The key mechanism: each lab's 100%-completion key unlocks the next lab. Keys are never printed in these docs.)
- **🎯 22 tests, 100% progress.** The header of every page shows your score. Open **`/tests`** (the Mission page) for the full map: tests grouped by feature, each with its OWASP category, difficulty, and status. Progress = tests genuinely completed ÷ 22.
- **Tests complete by DOING.** There is no "mark done" button — the server watches the vulnerable flows and ticks a test only when the exploit actually succeeds (a tampered price is billed, another customer's order is served, a slot is overbooked…).
- **💡 Hints beside every test.** Each test on `/tests` carries 3 graded hints, revealed one at a time.
- **💬 Lab Coach (chatbot).** The chat widget (bottom-right) knows the whole lab: feature/test counts, your progress, and what to try next. **Help lock:** step-by-step guidance for a feature unlocks only after you have **genuinely tried that feature at least 3 times** — the coach counts your attempts per feature, and before 3 tries it will refuse and tell you to go try first. The coach does **not** have the completion key until you reach 100%.
- **💾 Progress persists.** Your %, per-test status and attempt counts are saved in `progress.json` (generated at runtime — do not edit it by hand). Restart the server, reboot the machine: you resume exactly where you left off. Business data (orders, carts, wallets) is in-memory and *does* reset on restart; your lab progress does not.
- **🏁 At 100%:** `/complete` shows your full summary — features and per-feature vulnerability counts, every technique you used, what you learned, what each flaw would mean on a real client's website, and how each finding is written in a real penetration-test report — plus the **completion key for Lab 7** and your **certificate** (`/certificate`, printable card with the HexaCyberLab logo; enter your name on the completion page first).

## Run it (one command)

```bash
node server.js
# → http://127.0.0.1:3014
```

Or with Docker:

```bash
docker compose up --build
# → http://127.0.0.1:3014  (host port is bound to 127.0.0.1 only)
```

No npm install, no external network — a single zero-dependency `server.js` using only Node.js built-ins.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hexagrocery.local` | `Admin@123` |
| Customer | `monir@hexagrocery.local` | `User@123` (wallet $25) |
| Customer | `ela@hexagrocery.local` | `User@123` (wallet $40) |
| Picker/Driver | `picker@hexagrocery.local` | `Picker@123` |

Coupons: `FRESH10` (10%), `GROCERY20` (20%), `WELCOME15` (15%).
Slot **10:00 – 11:00** (id 3) starts **FULL** (2/2) — the capacity-bypass target. Slot **11:00 – 12:00** (id 4) is the race target.
Product **Premium Avocados 4pc** (id 19) is out of stock — the substitution target.

## Files

- `server.js` — the whole app: business logic, the lab system, and the vulnerabilities (flagged in comments)
- `logo.png` — the HexaCyberLab logo shown in the header and on the certificate
- `VULNERABILITIES.md` — all 22 intentional flaws, grouped by feature: OWASP, location, exploitation, business impact
- `PRACTICE-GUIDE.md` — all 22 challenges grouped by feature and difficulty, with hints and measurable objectives
- `FIX-AND-RETEST.md` — secure implementation + regression test for every flaw
- `Dockerfile`, `docker-compose.yml` — container run, port mapped to `127.0.0.1:3014` only
- `progress.json` — **generated at runtime**: your unlock state, completed tests, attempt counts (safe to delete — see Reset)

## Reset

- **Business data** (orders, bookings, wallets, carts): stop the server (Ctrl+C) and start it again — seed state returns. Progress is *not* affected.
- **Lab progress / lock**: delete `progress.json` while the server is stopped, then start it — the lab returns to its fresh, locked state (0%, gate on).

## Who built this

The HexaCyberLab lab programme was built by **Md. Jony Hassain**, Founder of HexaCyberLab. Ask the Lab Coach "who built this?" — it will tell you the same, and how to verify it.
