# HexaAgency — LAB 96 (Category 10: Property, Jobs & Professional Services)

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **agency management platform** — clients, projects,
contracts, invoices, team members/roles, client portals, deliverables and time
tracking — built for authorised, **local-only** web security training as part of
the HexaCyberLab 110-lab programme.

> ⚠️ **Intentionally insecure.** Every flaw in this app is there on purpose for
> practice. Run it only on your own machine, bound to localhost. Never deploy it
> to a network, a server, or the internet.

## Quick start

```bash
node server.js            # or: docker compose up --build
# then open http://127.0.0.1:3105
```

- Zero dependencies — Node.js built-ins only (Node 20+).
- Binds `127.0.0.1:3105` only. All data is fake and held in memory.

## The lab system

- **Lock gate:** Lab 96 starts locked. Paste the **completion key from Lab 95**
  to unlock it; the gate then stays lifted for this install.
- **Progress:** every page header shows `LAB 96 · <done>/26 tests · <pct>%`.
  Progress is scored by **doing** — a test only flips when the exploit's real
  effect happens on the server, never by clicking a button.
- **Mission Board (`/tests`):** all 26 scored tests grouped by feature, each
  with 3 graded hints and the attempts counter for its feature.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the full test map and
  your progress. Step-by-step help for a feature unlocks only after **3 genuine
  attempts** on that feature (or when its tests are done). Asked earlier, it
  refuses and tells you how many times you have tried. The coach does **not**
  have the completion key before you finish — it only receives it at 100%.
- **Persistence:** state lives in `progress.json` (generated at runtime,
  git-ignored). Restart the server and your %, attempts and unlock survive.
  Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete` + `/certificate`):** at 100% you get the six-section
  debrief (features, per-feature counts, techniques used, lessons, client
  impact, report writing), the **completion key for Lab 97**, and a printable
  certificate with the HexaCyberLab logo.

The completion key itself is never stored as a plain string anywhere in this
folder: it is split into transformed shards scattered through `server.js` and
reassembled only at the moment it is earned.

## Scored tests — 26 across 8 features

| Feature | Tests |
|---|---|
| Login & Authentication | 6 |
| Registration & Profile | 4 |
| Search | 2 |
| Clients & Client Portal | 3 |
| Projects | 3 |
| Contracts & Invoices | 4 |
| Deliverables & Files | 2 |
| Admin Panel | 2 |

See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for the
challenges, and `FIX-AND-RETEST.md` for the secure implementations.

## Test accounts (fake, local only)

| Email | Password | Role |
|---|---|---|
| admin@hexaagency.local | admin123 | admin |
| pm@hexaagency.local | pm12345 | manager |
| dev@hexaagency.local | dev12345 | staff |
| alice@acme.local | alice123 | client (Acme, client 1) |
| bob@globex.local | bob12345 | client (Globex, client 2) |
| demo@hexaagency.local | demo1234 | staff (demo) |

## Files

- `server.js` — the whole app + lab system (single file)
- `VULNERABILITIES.md` / `PRACTICE-GUIDE.md` / `FIX-AND-RETEST.md` — generated
  from the test registry in `server.js` (`node server.js --gen-docs`)
- `files/` — fake deliverable documents served by the download feature
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — generated runtime state (not part of the release)

---

HexaCyberLab — labs built by Md. Jony Hassain, Founder of HexaCyberLab.
For authorised training only.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3105`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3105` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
