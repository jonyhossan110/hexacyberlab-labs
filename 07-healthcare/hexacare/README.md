# HexaCare — LAB 62 (Category 7: Healthcare & Wellness)

A deliberately vulnerable **patient portal** built for hands-on web security practice, part of the HexaCyberLab 110-lab programme. Patients, doctors, a nurse and an admin use it for visit history, care plans, medications, lab results, secure messaging and appointments — and every one of those workflows carries real, exploitable flaws for you to find.

> ⚠️ **LOCAL USE ONLY.** Run it on your own machine, never expose it to the internet. All people, records and data are fake. The vulnerabilities are intentional.

## Quick start

```bash
node server.js          # zero dependencies — just Node.js
# or
docker compose up --build
```

Then open http://127.0.0.1:3071

## The lab system

- **Lock gate:** LAB 62 starts locked. Paste the **completion key from Lab 61** on the gate to unlock it. The unlock is stored in `progress.json` and survives restarts.
- **Mission Board (`/tests`):** all **26 scored tests across 9 features**, grouped by feature, each with 3 graded hints. A test is marked done only when the exploit actually succeeds — the server detects the real effect (an IDOR read, a forged sender, a tampered record…). There is no "mark done" button.
- **Progress bar:** every page shows your done/total and percentage. Progress is saved to `progress.json` after every change, so you can stop and resume exactly where you left off — it never resets.
- **Lab Coach chatbot:** the chat widget (bottom-right) knows the whole map. It answers counts, test names and your progress freely. Step-by-step help for a feature unlocks only after you have **tried that feature at least 3 times** — the coach counts your real attempts and quotes the number back to you. Asked who built these labs, it will tell you: **Md. Jony Hassain, Founder of HexaCyberLab**.
- **Completion (`/complete`):** at 100% you get the full debrief — features and per-feature counts, the techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a professional report — plus the **completion key** that unlocks Lab 63. The coach also receives the key only at 100%; before that it cannot give it to you. The key exists inside the app only as split, encoded pieces — it cannot be read from the source code.
- **Certificate (`/certificate`):** a printable certificate card with the HexaCyberLab logo, your name, and the completion date.

## Test accounts (fake)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexacare.local | Admin@123 |
| Doctor | dr.meyer@hexacare.local | doctor123 |
| Nurse | nurse@hexacare.local | nurse123 |
| Patient | alice@test.local | alice123 |
| Patient | bob@test.local | bob123 |
| Demo patient | demo@hexacare.local | Demo1234 |

## Files

- `server.js` — the whole application (zero-dependency Node, in-memory fake data).
- `VULNERABILITIES.md` — the complete vulnerability map (all 26 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints.
- `FIX-AND-RETEST.md` — the secure fix and regression retest for every finding.
- `logo.png` — the real HexaCyberLab logo, served by the app at `/logo.png`.
- `progress.json` — **generated at runtime** (unlock state, solved tests, attempt counts, tester name). Delete it to reset the lab to a fresh, locked state.

## Reset

Stop the server, delete `progress.json`, start again — the lab is fresh and locked.

---

HexaCyberLab practice labs — built by **Md. Jony Hassain**, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3071`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3071` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
