# HexaExam — LAB 53 (Category 6: Education & E-learning)

⏱ **Estimated time:** ~3h 30m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **online examination platform** built for hands-on web
security training: candidate / examiner / admin accounts, an exam catalogue, timed
exam attempts, automatic grading, attempt limits, results and score reports,
proctor notes, and an examiner-managed question bank.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally insecure. Run it only on
> your own machine, bound to 127.0.0.1. Never deploy it on a public server.
> All accounts, exams, questions and results are fake seed data.

HexaExam is one lab in the **HexaCyberLab 110-lab programme** built by
**Md. Jony Hassain, Founder of HexaCyberLab**.

## Run it

Zero-dependency Node.js (built-ins only):

```bash
node server.js
# → http://127.0.0.1:3062
```

Or with Docker:

```bash
docker compose up --build
```

## The lab system

- **Lock gate:** LAB 53 starts locked. Paste the **completion key from Lab 52** on
  the gate to unlock it (the unlock is persisted). Keys work as a chain: finishing
  this lab reveals the key that unlocks Lab 54. Each key is stored inside the app
  only as split, encoded shards — it cannot be read from the source code, and it is
  revealed only at 100% completion.
- **Progress:** every page header shows `LAB 53 · <done>/<total> tests · <pct>%`.
  Solving a test (by actually performing the exploit — detection is server-side)
  raises your score.
- **Mission board:** `/tests` groups all **26 tests across 8 features**, each with
  OWASP mapping, difficulty, live status, the attempt count for its feature, and
  three graded hints revealed one at a time.
- **Lab Coach chatbot:** the chat widget (bottom-right, `POST /api/chat`) knows the
  whole map. It answers counts and test names freely, but step-by-step help for a
  feature unlocks only after you have genuinely tried that feature **at least 3
  times** (or solved its tests). It does not hold the completion key until the lab
  is finished — then it may share it.
- **Persistence:** progress lives in `progress.json` (generated state, created on
  first run). Stop and restart the server any time — your percentage, solved tests
  and attempt counts resume exactly where you left them. Delete `progress.json` to
  reset the lab to a fresh, locked state.
- **Completion:** at 100%, `/complete` shows the full debrief — features, per-feature
  vulnerability counts, the techniques used, what you learned, what each flaw means
  for a real client, and how each finding is written in a real pentest report — plus
  your completion key. `/certificate` renders a printable certificate card with the
  HexaCyberLab logo and your name (set it on `/complete`).

## Test accounts (seed data)

| Role     | Email                    | Password     |
|----------|--------------------------|--------------|
| Admin    | admin@hexaexam.local     | Admin@123    |
| Examiner | examiner@hexaexam.local  | Examiner@123 |
| Examiner | prof@hexaexam.local      | Prof@123     |
| Candidate| alice@test.local         | alice123     |
| Candidate| bob@test.local           | bob123       |
| Demo     | demo@hexaexam.local      | demo123      |

## Documentation

- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests, by feature).
- `PRACTICE-GUIDE.md` — challenges with graded hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure implementation and regression check per finding.

## Files

- `server.js` — the entire application (app + lab system) in one zero-dependency file.
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`.
- `progress.json` — generated runtime state (not source; safe to delete to reset).
- `Dockerfile`, `docker-compose.yml` — one-command container setup.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3062`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3062` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
