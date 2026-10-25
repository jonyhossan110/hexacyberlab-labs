# HexaClinic — LAB 61 (Category 7: Healthcare & Wellness)

⏱ **Estimated time:** ~3h 15m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **clinic management system** built for authorised, local-only web security training. Patients, doctors and reception staff share one portal: appointment booking, doctor schedules, medical records, prescriptions and visit billing — with **26 scored security tests** across **9 features**, each one a real, working vulnerability derived from clinic workflows.

> ⚠️ **Local use only.** Run it on your own machine/lab network. Never deploy it to the internet. All patients, doctors and medical records are invented seed data — there is no real health information in this app.

Part of the **HexaCyberLab 110-lab programme** by Md. Jony Hassain, Founder of HexaCyberLab. Labs are numbered and unlock in sequence: finishing Lab 60 gives you the key that opens this lab, and finishing this lab gives you the key for Lab 62.

## Run it

```bash
node server.js
# → http://127.0.0.1:3070
```

or with Docker:

```bash
docker compose up --build
```

Zero dependencies — Node.js built-ins only (Node 20+ recommended).

## Test accounts (seed data)

| Role          | Email                          | Password    |
|---------------|--------------------------------|-------------|
| Admin         | admin@hexaclinic.local         | admin123    |
| Doctor        | dr.rahman@hexaclinic.local     | doctor123   |
| Doctor        | dr.smith@hexaclinic.local      | doctor123   |
| Receptionist  | desk@hexaclinic.local          | desk123     |
| Patient       | patient@hexaclinic.local       | patient123  |
| Patient       | karim@hexaclinic.local         | karim123    |

## The lab system

- **Progress:** every page header shows your score — `done/total tests · %`. Progress is earned only by actually performing each exploit; detection is server-side, based on the exploit's real effect (an IDOR read, a settled-for-$1 bill, a forged prescription…), never by clicking "done".
- **Mission Board (`/tests`):** all 26 tests grouped by feature, each with OWASP mapping, difficulty, your per-feature attempt count, and **3 graded hints** (nudge → stronger → near-answer).
- **Lab Coach chatbot:** a rule-based coach lives in the bottom-right of every page. It freely tells you the map (features, test counts, test names) and your progress. **Step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — the coach counts your real attempts and quotes the number back to you. Ask it who built these labs.
- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 60** to unlock it; the gate then stays lifted for this install. The key mechanism: each lab's completion key is the next lab's entry key. Inside the code, keys exist only as split, encoded shards scattered across the source — they cannot be found whole, and the coach does not receive the completion key until you reach 100%.
- **Persistence:** state is kept in `progress.json` (generated at first run — it is runtime state, not source). Stop the server, restart it, and your %, completed tests, attempts and unlock all resume exactly where you left off. Delete `progress.json` to reset the lab to a fresh, locked state.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the techniques used, what you learned, what each flaw would mean for a real client, and how each finding is written in a professional pentest report — plus your **completion key** for Lab 62.
- **Certificate (`/certificate`):** a printable certificate card with the HexaCyberLab logo, your name, and the completion date.

## Files

| File                 | Contents |
|----------------------|----------|
| `server.js`          | The whole app + lab system (zero-dependency Node). |
| `VULNERABILITIES.md` | The complete map: all 26 tests by feature, with exploitation outline and business impact. |
| `PRACTICE-GUIDE.md`  | Challenges by feature/difficulty with hints and measurable objectives. |
| `FIX-AND-RETEST.md`  | The secure implementation + regression check for every finding. |
| `Dockerfile`, `docker-compose.yml` | One-command local setup. |
| `logo.png`           | The real HexaCyberLab logo (served at `/logo.png`). |

## Safety

Bind is `127.0.0.1` only. There are no real credentials, no external calls, and no real medical data. Intended solely for learning web application security on your own system.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3070`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3070` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
