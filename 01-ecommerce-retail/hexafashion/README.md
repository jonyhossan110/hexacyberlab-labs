# HexaFashion — Vulnerable Fashion E-Commerce Practice Lab

**LAB 2 of the HexaCyberLab practice-lab series.**

> ⚠️ **SAFETY WARNING — READ FIRST**
> HexaFashion is an **intentionally vulnerable** training application. It contains real, working security flaws (price tampering, IDOR, stored XSS, role tampering and more) **by design**, so you can practise finding and fixing them.
> - **Local use only.** It binds to `127.0.0.1` by default. **Never deploy it publicly**, never port-forward it, never put it on a shared/cloud server.
> - **All data is synthetic.** Every user, product, order and gift-card code is fake. No real credentials are used anywhere.
> - Practise only on this lab or on systems you own / are authorised to test.

## What it is

A complete, working fashion e-commerce store in **one zero-dependency Node.js file** (`server.js` — Node built-ins only, no npm packages, no external network calls). Business data lives in memory and is seeded at startup, so **restarting the server resets the shop** — but your **lab progress is saved** (see below) and resumes where you left off.

Business features:

- Register / login / logout with customer and admin roles
- Product catalogue: 12 live fashion products with **sizes S/M/L/XL, per-size stock and XL surcharges**, plus 2 hidden draft products
- Product search (with a deliberately naive query builder) and product reviews
- **Wishlist**, cart, checkout with coupons and gift cards
- Orders list, order detail and printable invoice
- **Returns flow**: customer requests a return → refund is approved → status updates
- Profile/settings page with avatar upload, a file-download endpoint, and a small API
- Admin dashboard: products, all orders, returns queue, customers

## 🔒 This lab starts LOCKED — the lab key system

The HexaCyberLab labs run **in order**. Lab 2 opens only with the **completion key from Lab 1 (HexaShop)**:

1. Start the server (below) and open http://127.0.0.1:3010 — you will see the lock screen.
2. Paste Lab 1's completion key and click **Unlock Lab 2**. The unlock is permanent for this install (it is stored in `progress.json`).
3. Completing **this** lab 100% reveals **Lab 3's key** on the completion page.

Keys are unguessable and are never written anywhere in plain form — each key exists inside the app only as small transformed fragments scattered through the code, assembled at the moment they are needed (entry key at unlock time; completion key only at 100%). There is no shortcut: the only way to the next lab is through this one.

## 🎯 The test & progress system

- **24 scored security tests** across **10 features** — every vulnerability in `VULNERABILITIES.md` is a test, and the coverage is feature-complete: each feature carries the full set of techniques that apply to it.
- Open **🎯 Tests** (or http://127.0.0.1:3010/tests) to see them grouped by feature, with difficulty, OWASP category and **3 graded hints per test** (reveal them one at a time).
- **Tests complete by DOING.** There is no "mark done" button — the server detects the exploit actually succeeding (a tampered order total, an IDOR read, a stored payload…) and ticks the test off itself.
- The header shows your live progress: `LAB 2 · n/24 tests · %`. At **100%** the lab is complete: the **🏁 Complete** page gives you the full summary (features and vulnerability counts, the techniques you used, what you learned, what each finding would mean for a real client, and how to write it in a real pentest report), the **key for Lab 3**, and a printable **certificate of completion** with the HexaCyberLab logo and your name.
- **Progress persists.** Tests, attempts and unlock state are saved in `progress.json` (generated runtime state — do not edit/commit it; it is already covered by `.gitignore`). Close the lab, come back tomorrow, restart the server — you resume from your saved %. Delete `progress.json` to reset progress to a fresh, locked lab.

## 💬 The Lab Assistant (chatbot)

Every lab has a built-in assistant (bottom-right 💬 on every page). It knows this lab's features, tests and your progress, and it enforces Jony's rule:

- **The map is free:** ask it how many tests a feature has, what they are called, or how you are doing.
- **Step-by-step help is locked per feature:** the assistant only guides you through a feature's tests after you have **genuinely tried that feature at least 3 times** (it tracks attempts per feature and will tell you your count). Before that it refuses — politely — and sends you back to try.
- **The completion key is secret until 100%:** the assistant does not even receive the key until the lab is complete, so it cannot leak it early. After 100% it can tell you the key.
- Ask it *"who built this?"* — it knows.

## Run it

**Option 1 — Node directly (Node 18+):**

```bash
cd hexafashion-vuln-lab
node server.js
```

**Option 2 — Docker Compose (one command):**

```bash
cd hexafashion-vuln-lab
docker compose up --build
```

Then open: **http://127.0.0.1:3010**

Stop with `Ctrl+C` (Node) or `docker compose down` (Docker).

## Test accounts

| Role     | Email                       | Password   | Notes                                             |
|----------|-----------------------------|------------|---------------------------------------------------|
| Admin    | `admin@hexafashion.local` | `Admin@123`| Full admin dashboard access                       |
| Customer | `aisha@hexafashion.local`  | `User@123` | Has order **#1001** and one wishlist item         |
| Customer | `karim@hexafashion.local`  | `User@123` | Has order **#1002** and pending return **#501**   |

Useful seed facts: coupons `WELCOME10` (10%), `FASHION20` (20%), `VIP50` (50%). Gift cards were issued sequentially from `HF-1000` to `HF-1009`.

## Documentation

| File                  | Contents                                                                 |
|-----------------------|--------------------------------------------------------------------------|
| `VULNERABILITIES.md`  | All 24 intentional vulnerabilities (= the 24 tests), grouped by feature: where they live, how to exploit them step by step, and the business impact |
| `PRACTICE-GUIDE.md`   | Hands-on challenges for every test, grouped by feature, with the same 3 graded hints and measurable learning objectives |
| `FIX-AND-RETEST.md`   | The secure implementation for every flaw, a regression test that proves the fix, and remediation notes |

## Reset

- **Shop data** (orders, returns, uploads, changed passwords): restart the server.
- **Lab progress** (tests, attempts, unlock): delete `progress.json` next to `server.js`, then restart — the lab returns to its locked, fresh state.

## License / version

Lab version 2.0 (2026-10-23) — rebuilt with the HexaCyberLab lab system (progress, hints, assistant, keys, certificate). Part of the HexaCyberLab practice-lab series, built by **Md. Jony Hassain, Founder of HexaCyberLab**. Synthetic training material; free to use locally for education.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3010`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3010` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
