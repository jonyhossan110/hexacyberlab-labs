# HexaCraft — Vulnerable Handmade Marketplace Lab (LAB 7)

HexaCraft is a **deliberately vulnerable** handmade-goods marketplace (independent
sellers, commissions, reviews, payouts) built for hands-on web security practice.
It follows the same lab standard as HexaShop / HexaSaaS / HexaAPI / HexaAI:
one zero-dependency Node.js file, in-memory synthetic data, server-rendered pages.

## 🔒 LAB 7 — it starts locked

HexaCraft is **Lab 7** in the HexaCyberLab sequence. On first run it shows only
a lock gate: paste the **completion key from Lab 6** (earned by finishing Lab 6
at 100%) to unlock it. The unlock is remembered. The key itself is never stored
or printed anywhere whole in this app — it exists only as encoded fragments
inside `server.js` and is assembled in memory only when needed.

## The lab system

- **22 security tests** across 9 features (see `VULNERABILITIES.md` for the full
  registry, grouped by feature).
- **Progress (0–100%)**: the lab *detects each successful exploit itself* — there
  is no "mark done" button. The header of every page shows your progress bar.
- **Mission page (`/tests`)**: every test grouped by feature, with its OWASP
  category, difficulty, the number of attempts you've made on that feature, and
  **3 graded hints** per test that you reveal one at a time.
- **Lab Assistant (chatbot)**: the chat widget (bottom-right) knows the whole
  lab — feature/test counts, your progress, and step-by-step walkthroughs. But
  guidance is **locked by attempts**: it will only walk you through a feature
  after you've genuinely tried that feature **at least 3 times** (it keeps
  count and tells you how many tries you have). It does **not** have the
  completion key — it only receives it when you finish the lab at 100%.
- **Persistence / resume**: progress, attempts and the unlock live in
  **`progress.json`** (generated at first run — safe to inspect). Restart the
  server any time: shop data re-seeds, but your progress resumes exactly where
  you left it. Delete `progress.json` for a completely fresh, locked lab.
- **Completion (`/complete`)**: at 100% you get the full summary — the lab's
  features and per-feature vulnerability counts, the ways you tested, what you
  learned, what each flaw would mean for a real client, and how to write each
  finding in a real pentest report — plus the **completion key for Lab 8** and
  your **certificate** (`/certificate`, with the HexaCyberLab logo; enter your
  name on the completion page).

> ⚠️ **SAFETY WARNING** — This application is **intentionally insecure**.
> Run it **locally only** (it binds `127.0.0.1`), never deploy it to a server,
> never expose it to a network, and never enter real credentials or real data.
> All users, shops, products and bank details are fake/synthetic.

## What it is

A complete marketplace business app:

- Buyer / seller / admin roles, register + login + logout, cookie sessions
- Marketplace catalogue: **15 handmade products across 3 seller shops**
- Shop pages, product pages with reviews
- Seller dashboard: own products (CRUD), orders containing their products,
  sales stats, commission rate, payout settings, shop settings
- Cart, checkout (with coupons), orders, order completion
- Admin dashboard: all sellers, commissions, orders, disputes

## Run it

```bash
# Option 1 — plain Node (18+), no dependencies, nothing to install
node server.js

# Option 2 — Docker
docker compose up --build
```

Then open **http://127.0.0.1:3015** — first run shows the Lab 7 lock gate
(see above).

**Reset:** restart the server to re-seed the shop data (users, products, orders).
Your **progress is NOT reset** by a restart — it persists in `progress.json`.
For a full factory reset (progress + lock), stop the server, delete
`progress.json`, and start again.

## Test accounts

| Role   | Email                    | Password    |
|--------|--------------------------|-------------|
| Admin  | admin@hexacraft.local    | `Admin@123` |
| Seller | shopa@hexacraft.local    | `Seller@123` | (Clay & Thread)
| Seller | shopb@hexacraft.local    | `Seller@123` | (Woodland Crafts)
| Seller | shopc@hexacraft.local    | `Seller@123` | (Paper Bloom Studio)
| Buyer  | ruma@hexacraft.local     | `User@123`  |
| Buyer  | karim@hexacraft.local    | `User@123`  |
| Buyer  | sara@hexacraft.local     | `User@123`  |

## Files

| File                | Purpose |
|---------------------|---------|
| `server.js`         | The whole lab (app + planted vulnerabilities + lab system) |
| `VULNERABILITIES.md`| The full 22-test registry by feature: location, steps, impact |
| `PRACTICE-GUIDE.md` | Every challenge with objective + graded hints, grouped by feature |
| `FIX-AND-RETEST.md` | Secure implementation + regression test per flaw |
| `logo.png`          | The HexaCyberLab logo (header + certificate) |
| `progress.json`     | **Generated at runtime** — progress, attempts, unlock state |
| `Dockerfile`, `docker-compose.yml` | Container run, still bound to 127.0.0.1 only |

## Coupons (synthetic)

`CRAFT10` = 10% off · `ARTISAN5` = 5% off

## Rules of the lab

- Local-only, synthetic data, no real credentials — ever.
- Practice only against this app on your own machine.
- Restart = clean shop data, persistent progress — experiment freely.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3015`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3015` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
