# HexaTelemed — LAB 66 · HexaCyberLab Practice Labs

A deliberately vulnerable **telemedicine platform** for hands-on web security training: patient/doctor/admin accounts, video-consultation booking (simulated sessions with join links), consultation fees, doctor consultation notes, e-prescriptions and refills, follow-up scheduling, and doctor availability management.

> ⚠️ **Local training only.** Every account, patient and record is fake seed data. There are no real video calls and no real patients. Never deploy this app publicly.

## Run it

```bash
node server.js          # zero dependencies, Node 20+
# or
docker compose up       # builds and runs the same server
```

Then open http://127.0.0.1:3075

## The lab system

- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 65** on the gate to unlock it (once — the unlock persists).
- **Progress:** the header shows your score at all times (LAB 66 · done/total · %). Solving a test = making the exploit's real effect happen; the server detects it. There is no "mark done" button.
- **Mission Board (`/tests`):** all **26 tests across 8 features**, grouped by feature, each with OWASP mapping, difficulty, your attempt counts, and 3 graded hints.
- **Lab Coach (chat widget, bottom right):** knows the full test map and your progress. Step-by-step help for a feature unlocks only after **3 genuine attempts** on that feature — the coach counts your tries and tells you the truth about the count. The coach does **not** hold the completion key until you reach 100%.
- **Persistence:** progress is stored in `progress.json` (generated at runtime, safe to delete to reset). Restart the server and you resume exactly where you left off.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, techniques used, lessons, client impact, and how to write each finding in a real pentest report — plus your **completion key for Lab 67** and a printable **certificate** (`/certificate`) with the HexaCyberLab logo.
- **Keys:** each lab's keys exist only as split, encoded pieces inside the code and are assembled in memory at the moment they are needed. They never appear whole in the source or docs.

## Test accounts (fake)

| Role    | Email                        | Password   |
| ------- | ---------------------------- | ---------- |
| Admin   | admin@hexatelemed.local     | admin123   |
| Doctor  | drpatel@hexatelemed.local   | doctor123  |
| Doctor  | drsmith@hexatelemed.local   | doctor123  |
| Patient | alice@test.local            | alice123   |
| Patient | bob@test.local              | bob123     |
| Patient | carol@test.local            | carol123   |

## Files

- `server.js` — the complete app + lab system (zero dependencies)
- `VULNERABILITIES.md` — the full vulnerability map (all 26 tests)
- `PRACTICE-GUIDE.md` — challenges with hints and objectives
- `FIX-AND-RETEST.md` — the secure fix and regression check for every test
- `Dockerfile` / `docker-compose.yml` — one-command container run
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — generated runtime state (progress, attempts, unlock); delete to reset the lab

## Part of the series

Lab 66 of the HexaCyberLab 110-lab programme (Category 7: Healthcare & Wellness), built by **Md. Jony Hassain, Founder of HexaCyberLab**. Labs unlock in sequence: finishing Lab 65 gives you the key that starts this one, and finishing this one gives you the key for Lab 67.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3075`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3075` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
