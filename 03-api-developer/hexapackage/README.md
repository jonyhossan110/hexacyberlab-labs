# HexaPackage — LAB 30 of 110 (Category 3: API & Developer Platforms)

⏱ **Estimated time:** ~3h 15m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

An **intentionally vulnerable** software package registry for hands-on web security practice.
Publishers hold accounts, own packages with maintainers, publish immutable-in-theory versions,
manage publish tokens (read/publish scopes) and watch download statistics.

> ⚠️ **LOCAL USE ONLY.** Zero-dependency Node.js, binds `127.0.0.1:3039` only. All data is
> synthetic and in-memory (restart resets the app). Never deploy this anywhere.

## Run it
```bash
node server.js          # then open http://127.0.0.1:3039
# or: docker compose up --build
```

## The Lab System
- **Sequential unlock:** this lab starts locked. Paste the completion key earned in Lab 29
  into the gate (`POST /unlock`). Keys are never stored whole in the code — they are split into
  encoded shards scattered through `server.js` and assembled only at verification/reveal time.
- **Progress:** 25 scored tests across 8 features. A test passes only when the server
  detects the real exploit effect — never by clicking. Watch progress in the header bar or `GET /api/progress`.
- **Mission page:** `/tests` groups every test by feature, with 3 graded hints each.
- **Lab Coach chatbot:** on every page. It answers counts/names freely, but step-by-step guidance
  for a feature unlocks only after **3 genuine attempts** on that feature. The completion key is
  revealed to the coach (and on `/complete`) only at 100%.
- **Persistence:** progress lives in `progress.json` (generated state — do not commit). Restart
  the server and your % and attempt counts resume exactly where you left them.
- **Completion:** at 100%, `/complete` shows the six-section debrief (features, per-feature counts,
  techniques, lessons, client impact, report writing), the Lab 31 key, and `/certificate`
  renders a printable certificate with the HexaCyberLab logo.

## Test accounts (synthetic)
| Email | Password | Role |
|---|---|---|
| admin@hexapackages.local | Admin@123 | admin |
| priya@hexapackages.local | Priya@123 | publisher (owns dataforge, internal-tools) |
| marco@hexapackages.local | Marco@123 | publisher (owns swiftcache, webutils) |
| sara@hexapackages.local | Sara@123 | publisher (maintainer of dataforge) |
| demo@hexapackages.local | demo123 | user (documented default) |

Seeded API token for the demo account (read scope): shown on its token page in-app.

## Files
- `server.js` — the whole lab (app + lab system), zero dependencies
- `VULNERABILITIES.md` — the full test map by feature · `PRACTICE-GUIDE.md` — challenges & hints
- `FIX-AND-RETEST.md` — secure implementation + regression check per test
- `progress.json` — generated runtime state (not committed)

Built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3039`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3039` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
