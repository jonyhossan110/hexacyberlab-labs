# HexaAutoParts — Vulnerable Auto-Parts Store Lab

⏱ **Estimated time:** ~2h 45m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 22
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**LAB 8** of the HexaCyberLab Category-1 (E-commerce & Retail) lab chain.

An **intentionally vulnerable** auto-parts e-commerce application for hands-on web
penetration-testing practice. It is a complete little business: parts catalogue with
vehicle **fitment search**, a **"My Vehicles" garage**, a **VIN lookup** tool, **trade
(garage) vs retail pricing**, **quotes**, cart, checkout, orders, returns, product Q&A,
profile/settings and an admin dashboard — with realistic synthetic data (19 parts with
fitment data, 12 VIN records, seeded users, quotes and orders).

Every vulnerability is rooted in the auto-parts workflow: fitment checks that only
exist in the browser, a VIN registry that hands out owner PII, trade pricing you can
claim by editing a request field, quotes and returns that don't check ownership, and
more. See [VULNERABILITIES.md](VULNERABILITIES.md) for the full registry (22
intentional flaws grouped by feature), [PRACTICE-GUIDE.md](PRACTICE-GUIDE.md) for
graded challenges, and [FIX-AND-RETEST.md](FIX-AND-RETEST.md) for the secure
implementations and regression tests.

## The lab system (new)

- **Sequential lock:** Lab 8 starts **locked**. It opens only with the completion
  key you earned by finishing Lab 7 at 100% (paste it on the gate). Wrong keys are
  rejected with no hints.
- **22 scored tests, auto-detected:** the lab watches for the real effect of each
  exploit and marks the test complete itself — see the mission page at `/tests`,
  with your live % in the header of every page.
- **Graded hints:** every test carries 3 hints (nudge → stronger → near-answer),
  revealed one at a time on the mission page.
- **Lab Assistant (chatbot):** knows all 11 features and 22 tests. It answers
  counts/naming questions freely; step-by-step help for a feature unlocks only
  after **you have tried that feature at least 3 times** (it tracks attempts per
  feature and will tell you the count). Ask it who built the lab.
- **Persistence:** progress and attempts save to **`progress.json`** in this folder
  as you play. Stop the server, reboot, come back tomorrow — you resume exactly
  where you left off. `progress.json` is generated state: deleting it resets the
  lab to its fresh, locked state. (Inside Docker it lives in the container — mount
  a volume if you want it to survive container rebuilds.)
- **Completion:** at 100%, `/complete` gives a six-part debrief — what the lab
  contained, how the testing was done, what you learned, what the findings mean
  for a real client, and how to write each one in a real report — then reveals
  the **key for Lab 9** and issues your **certificate** (`/certificate`, with the
  HexaCyberLab logo — also served at `/logo.png`).
- **Keys are never readable in the source.** Both keys exist only as encoded
  fragments scattered through the application, assembled in memory at the moment
  they are needed. The completion key is assembled only after 100% — not even the
  Lab Assistant can see it before then.

## Run it

```bash
node server.js
# → http://127.0.0.1:3016
```

or with Docker:

```bash
docker compose up --build
# → http://127.0.0.1:3016  (port bound to localhost only)
```

Zero dependencies — Node.js built-ins only (`http`, `crypto`). Node 18+ recommended.

## Test accounts

| Email | Password | Role |
|---|---|---|
| admin@hexaautoparts.local | Admin@123 | admin (dashboard, part & price editing) |
| garage@hexaautoparts.local | Trade@123 | trade (garage pricing) |
| dewan@hexaautoparts.local | User@123 | retail |
| sara@hexaautoparts.local | User@123 | retail |
| omar@hexaautoparts.local | User@123 | retail |

Store reset: **restart the server** — all business data is in-memory and reseeds
on boot. Your *lab progress* does not reset (see Persistence above).

## Safety

- **LOCAL USE ONLY.** Binds `127.0.0.1` only — never deploy this publicly.
- All people, vehicles, VINs, orders and data are synthetic.
- Practice these techniques only on systems you own or are authorised to test.

## Files

| File | Purpose |
|---|---|
| `server.js` | The whole lab: store app + lab system (progress, detection, assistant, keys). |
| `logo.png` | The real HexaCyberLab brand logo, served at `/logo.png`. |
| `README.md` | This file. |
| `VULNERABILITIES.md` | The full 22-flaw registry, grouped by feature. |
| `PRACTICE-GUIDE.md` | The 22 challenges with graded hints + capstone chains. |
| `FIX-AND-RETEST.md` | Secure fix + curl regression test for all 22 flaws. |
| `Dockerfile`, `docker-compose.yml` | Container run (localhost-bound). |
| `progress.json` | *Generated at runtime* — your saved progress/attempts. Not shipped content; delete to reset. |

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3016`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3016` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
