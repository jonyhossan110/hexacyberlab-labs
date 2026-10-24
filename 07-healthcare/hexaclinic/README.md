# HexaClinic — LAB 61 (Category 7: Healthcare & Wellness)

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
