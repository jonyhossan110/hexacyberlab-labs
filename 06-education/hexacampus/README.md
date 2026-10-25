# HexaCampus — LAB 55 (Category 6: Education & E-learning)

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A complete, **deliberately vulnerable** university student portal built for authorised security training: student/faculty/admin accounts, course registration, grades & GPA, transcripts, class data, tuition fee statements and payments, faculty grade entry, document uploads and downloads.

> ⚠️ **LOCAL ONLY.** Run it only on your own machine/lab network. It is intentionally insecure. All people, grades, fees and documents are fake seed data. Never deploy it publicly.

Part of the HexaCyberLab 110-lab programme — built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Run it

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up --build
```

Then open http://127.0.0.1:3064 (binds to localhost only).

## The lab system

- **Sequential unlock (Labs 2+):** the lab starts locked. Paste the **completion key earned in Lab 54** on the gate to unlock it. Completing this lab 100% reveals the key for Lab 56.
- **Key protection:** each key exists only as split, encoded fragments scattered through `server.js`. It is assembled in memory only at the moment it is needed (unlock check, or the 100% reveal). No key value appears in any document or source literal.
- **Progress %:** 26 scored tests across 8 features. A test flips to DONE **only when the exploit genuinely succeeds** (detected server-side) — there is no "mark done" button.
- **Mission page `/tests`:** tests grouped by feature, each with OWASP mapping, difficulty, your attempt count for that feature, and **3 graded hints** revealed one at a time.
- **Lab Coach chatbot:** the chat widget (bottom-right) knows the full test map and your real progress. It answers counts and names freely, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — it counts your real attempts and quotes the number back. It does **not** hold the completion key before 100%; at 100% it can share it. Ask it "who built this" for attribution.
- **Persistence:** progress is stored in `progress.json` (generated runtime state, git-ignored). Stop and restart the server any time — your %, solved tests and attempt counts resume exactly where you left them. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion `/complete`:** at 100% you get the full debrief — features and per-feature vulnerability counts, every technique used, what you learned, what each flaw would mean for a real client, and how to write each finding in a professional report — plus the completion key.
- **Certificate `/certificate`:** a printable completion card with the HexaCyberLab logo, your name (set it on `/complete`), the lab, test/feature counts and the completion date.

## Test accounts (seeded, fake)

| Account | Password | Role |
|---|---|---|
| admin@hexacampus.edu | admin123 | admin (default password — itself a test finding) |
| prof.reyes@hexacampus.edu | faculty123 | faculty |
| alice@student.hexacampus.edu | alice123 | student |
| bob@student.hexacampus.edu | bob123 | student |
| carol@student.hexacampus.edu | carol123 | student |
| demo@hexacampus.edu | demo | student (demo account) |

## Files

- `server.js` — the whole app + lab system (zero-dependency Node)
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature)
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints
- `FIX-AND-RETEST.md` — secure implementation + regression retest for every finding
- `Dockerfile`, `docker-compose.yml` — one-command container setup
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`)
- `progress.json` — generated at runtime; your saved progress (safe to delete to reset)

## Safety

Local-only by design: the server binds `127.0.0.1`, contains no real credentials or data, and makes no external calls. Practise only on this lab or systems you are authorised to test.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3064`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3064` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
