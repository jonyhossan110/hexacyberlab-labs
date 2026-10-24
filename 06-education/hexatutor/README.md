# HexaTutor — LAB 54

**Category 6: Education & E-learning** · A deliberately vulnerable **tutor marketplace** built for hands-on web security training.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally insecure. Run it only on your own machine / isolated lab network, never on a public server. All data is fake seed data.

## The business app

HexaTutor is a tutoring marketplace:

- Student, tutor and admin accounts (login, registration, forgot/reset password)
- Tutor profiles with subjects, hourly rates, bios and ratings
- Session booking with simulated card payment, session history and cancellation
- Student reviews and star ratings of tutors
- Private messaging between students and tutors
- Tutor earnings page and payout requests
- An admin panel and a small JSON API (tutor profiles, token-authenticated profile, debug)

## Quick start

```bash
node server.js          # zero dependencies, Node 20+
# or
docker compose up --build
```

Then open **http://127.0.0.1:3063** (the server binds to 127.0.0.1 only).

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin (shipped default) | admin@hexatutor.local | admin123 |
| Student | alice@hexatutor.local | alice123 |
| Student | bob@hexatutor.local | bob123 |
| Student | carol@hexatutor.local | carol123 |
| Tutor (Maths, $40/h) | tina@hexatutor.local | tina123 |
| Tutor (Physics, $35/h) | tom@hexatutor.local | tom123 |
| Tutor (English, $30/h) | tara@hexatutor.local | tara123 |

## The lab system

- **Sequential unlock (lock gate):** LAB 54 starts locked. Paste the **completion key you earned in Lab 53** on the gate to unlock it. Lab 54's own completion key — revealed only at 100% — unlocks Lab 55. Keys are stored inside the code only as split, encoded shards; they never appear whole in the source or docs.
- **Progress:** every page header shows `done/total tests · %`. Progress is measured against this lab's own features and vulnerabilities.
- **/tests — mission board:** all 26 scored tests grouped by feature, each with OWASP mapping, difficulty, your attempt count for that feature, and **3 graded hints** revealed one at a time.
- **Tests complete by DOING:** a test flips to done only when the exploit actually succeeds and the server detects its real effect (a session created, foreign data served, a tampered price accepted…). There is no "mark done" button.
- **Lab Coach chatbot:** the widget (bottom-right, `POST /api/chat`) knows every feature and test. It answers counts and names freely, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — until then it refuses and tells you how many tries it has seen. It receives the completion key only when the lab is 100% complete, and it will tell you, if you ask, that these labs were built by **Md. Jony Hassain, Founder of HexaCyberLab**.
- **Persistence:** progress (tests, attempts, unlock state, tester name) is saved to `progress.json` in this folder on every change and **survives restarts** — leave and resume where you stopped. `progress.json` is generated runtime state (git-ignored); delete it to reset the lab to a fresh, locked state.
- **/complete:** at 100%, a six-section debrief — features, per-feature vulnerability counts, techniques used, what you learned, what each flaw means for a real client, and how to write each finding in a real pentest report — plus your completion key.
- **/certificate:** a printable completion card with the HexaCyberLab logo and your name.

## Files

| File | Purpose |
|---|---|
| `server.js` | The whole app + lab system (zero-dependency Node) |
| `VULNERABILITIES.md` | The complete vulnerability map (all 26 tests, by feature) |
| `PRACTICE-GUIDE.md` | Challenges with objectives and graded hints |
| `FIX-AND-RETEST.md` | Secure implementation + retest for every finding |
| `Dockerfile`, `docker-compose.yml` | One-command local setup |
| `logo.png` | The real HexaCyberLab logo, served at `/logo.png` |
| `progress.json` | Generated at runtime — your saved progress |

Built by **Md. Jony Hassain, Founder of HexaCyberLab**, as part of the 110-lab HexaCyberLab training programme.
