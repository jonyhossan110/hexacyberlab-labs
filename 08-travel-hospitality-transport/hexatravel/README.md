# HexaTravel — LAB 71

**Category 8: Travel, Hospitality & Transport** · HexaCyberLab 110-lab programme
Built by Md. Jony Hassain, Founder of HexaCyberLab.

A deliberately vulnerable travel-booking platform for authorised, local-only
security training: traveller/agent/admin accounts, holiday packages with
itineraries and per-person pricing, reservations with simulated payment,
booking management, travel documents, discount vouchers and package reviews.
All data is fake seed data. **Never deploy this app publicly.**

## Run it

```bash
node server.js            # → http://127.0.0.1:3080
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only. Binds 127.0.0.1 only.

## The lab system

- **Lock gate:** this lab starts locked. Paste the completion key earned in
  Lab 70 to unlock it (`POST /unlock`). The unlock is persisted.
- **Progress:** 26 scored tests across 8 features. A test passes only when the
  exploit actually succeeds — the server detects the real effect, never a
  checkbox. Progress lives in `progress.json` (generated at runtime, safe to
  delete to reset the lab) and survives restarts.
- **Mission Board:** `/tests` lists every test grouped by feature, with its
  OWASP mapping, difficulty, your attempt counts, and 3 graded hints per test.
- **Lab Coach chatbot:** on every page. It knows the full test map and your
  progress. Step-by-step help for a feature unlocks only after you have
  genuinely tried that feature at least 3 times. The completion key is kept
  secret — even from the coach — until the lab is 100% complete.
- **Completion:** at 100%, `/complete` shows the full debrief (features,
  per-feature vulnerability counts, techniques used, lessons, client impact,
  and how each finding is written in a real pentest report), reveals the
  completion key for the next lab, and links to your `/certificate`.

## Test accounts (seeded, fake)

| Role      | Email                   | Password  |
|-----------|-------------------------|-----------|
| Admin     | admin@hexatravel.local  | admin123  |
| Agent     | agent@hexatravel.local  | agent123  |
| Traveller | alice@test.local        | alice123  |
| Traveller | bob@test.local           | bob123    |
| Traveller | carol@test.local        | carol123  |

## Files

- `server.js` — the whole app + lab system (single file)
- `VULNERABILITIES.md` — all 26 tests grouped by feature
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — secure fix + regression check for every test
- `files/` — seeded travel-document files used by the download features
- `progress.json` — generated runtime state (git-ignored)

The key mechanism: each lab's entry and completion keys exist only as split,
encoded shards scattered through `server.js`, assembled in memory at the
moment they are needed. No key value appears in any file or doc.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3080`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3080` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
