# LAB 92 — HexaRentals

A deliberately vulnerable **rental property management platform** (landlords, tenants, leases, rent payments, deposits, maintenance requests) built for authorised, local-only web-security training. Part of the HexaCyberLab 110-lab programme.

> ⚠️ **Local-only.** This app contains intentional vulnerabilities. It binds to `127.0.0.1` only. Never deploy it publicly, never expose it to a network, and use it only for training you are authorised to do.

## Run it

```bash
node server.js            # http://127.0.0.1:3101
# or
docker compose up --build
```

Requires Node.js 20+ (zero dependencies — built-ins only).

## The lab system

- **Progress:** every page header shows `LAB 92 · <done>/26 tests · <pct>%`. Progress is earned by *doing*: each test flips to done only when the server observes the real exploit succeed — never by clicking "mark done".
- **Mission Board (`/tests`):** all 26 scored tests grouped by feature, each with 3 graded hints (nudge → stronger → near-answer) and the live attempt count for its feature.
- **Lab Coach (chat widget, bottom-right):** knows the lab's full map (features, test names, counts) and your progress. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature — before that it refuses and tells you how many tries it has seen. Ask it who built the labs.
- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 91** to unlock it. At 100% this lab reveals its own completion key (on `/complete`, and the coach can then share it) which unlocks Lab 93.
- **Keys** are never stored as plain text anywhere in the lab: each exists only as transformed fragments scattered through the code and is assembled in memory at the moment it is needed.
- **Persistence:** progress lives in `progress.json` (generated state — delete it to reset the lab to a fresh, locked state). Your percentage, attempts and unlock survive server restarts.
- **Completion (`/complete`):** at 100% you get a six-section debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus the completion key.
- **Certificate (`/certificate`):** a printable completion card with your name (set it on `/complete`).

## Test accounts (fake, local only)

| Role     | Email                    | Password  |
|----------|--------------------------|-----------|
| Admin    | admin@hexarentals.local  | admin123  |
| Landlord | larry@hexarentals.local  | larry123  |
| Landlord | laura@hexarentals.local  | laura123  |
| Tenant   | alice@test.local         | alice123  |
| Tenant   | bob@test.local           | bob123    |
| Tenant   | carol@test.local         | carol123  |

## Files

- `server.js` — the whole app + lab system (zero-dependency Node).
- `VULNERABILITIES.md` — the complete vulnerability map, generated from the test registry.
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives, generated from the registry.
- `FIX-AND-RETEST.md` — the secure implementation + regression retest for every finding.
- `Dockerfile`, `docker-compose.yml` — one-command local setup.
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`).
- `progress.json` — generated runtime state (not shipped; safe to delete to reset).

## Regenerating the docs

```bash
node server.js --gen-docs
```

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3101`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3101` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
