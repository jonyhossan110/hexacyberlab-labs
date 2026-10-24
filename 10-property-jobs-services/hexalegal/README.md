# HexaLegal — LAB 97 of 110

**Category 10: Property, Jobs & Professional Services** · Port **3106** · Local-only training lab

HexaLegal is a deliberately vulnerable legal-services portal built for authorised security training: clients track their matters, documents, appointments and invoices, while attorneys manage assigned cases. Every vulnerability in it is intentional, detectable, and documented — the point of the lab is to find them, prove them, and learn how they would be fixed in a real client report.

> ⚠️ **SAFETY:** This application is intentionally insecure. Run it **only locally** (it binds `127.0.0.1`), never deploy it publicly, and never use real data. All accounts, cases, documents and amounts are fake and simulated.

## Quick start

```bash
# Option 1 — Docker
docker compose up --build
# then open http://127.0.0.1:3106

# Option 2 — plain Node (v18+, zero dependencies)
node server.js
```

## First run: unlocking the lab

Labs are numbered and unlock **sequentially**. LAB 97 starts locked: every page shows a gate asking for the **completion key from Lab 96**. Paste that key once and the gate lifts permanently for this install (the state is stored in `progress.json`). Completing this lab to 100% reveals LAB 97's own completion key, which unlocks Lab 98.

**Key mechanism (no values are ever printed here):** a key never appears as a plain string anywhere in the source or docs. Each key is split into pieces, every piece is transformed (reversed + base64), and the pieces are scattered in different regions of `server.js`. A small assembler rebuilds a key only at the moment it is needed — the entry key inside unlock verification, and the completion key only once progress reaches 100% (completion page, certificate flow, and the Lab Coach's unlocked knowledge).

## The lab system

- **Progress:** every solved test raises your completion %. Progress = solved tests / total tests, shown in the header of every page (`LAB 97 · x/26 tests · y%`) and via `GET /api/progress`.
- **Mission Board (`/tests`):** all tests grouped by feature, each with its OWASP reference, difficulty, your attempt count for that feature, and **3 graded hints** revealed one at a time.
- **Detection, not checkboxes:** a test flips to done only when the exploit's real effect is observed server-side (an IDOR actually serves another client's record, a tampered payment actually settles the invoice, …). There is no "mark done" button.
- **Attempts:** requests that exercise a feature's attack surface are counted per feature and persist.
- **Lab Coach (chat widget, `POST /api/chat`):** knows the full test map and your progress. It will tell you test names and counts freely, but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times** — it quotes your real attempt count when it refuses. It does not have the completion key before 100%; nobody does. Ask it who built these labs.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the ways testing was done, what you learned, what each flaw means for a real client, and how each finding is written in a real pentest report — plus the completion key and a name form for your certificate.
- **Certificate (`/certificate`):** a printable card with the HexaCyberLab logo, your name, the lab, and the completion date.
- **Persistence:** progress, attempts, unlock state, and your certificate name live in `progress.json` in this folder. Close the lab, restart it, come back tomorrow — you resume exactly where you left off. Delete `progress.json` to reset the lab to a fresh state.

## What's inside

A complete legal-services portal: registration and profiles, case/matter records with confidential attorney notes, case documents (view, download, upload), appointments with attorney slots, invoices with payments, an attorney console, an admin panel, case search, and a small JSON API — with **26 scored security tests across 9 features**:

| Feature | Tests |
|---|---|
| Login & Authentication | 6 |
| Registration & Profile | 4 |
| Search & Discovery | 2 |
| Cases & Matters | 3 |
| Documents & Files | 3 |
| Appointments | 2 |
| Billing & Invoices | 2 |
| Admin Panel | 2 |
| Platform & API | 2 |

See **VULNERABILITIES.md** for the complete map, **PRACTICE-GUIDE.md** for the challenges with hints, and **FIX-AND-RETEST.md** for how every finding is fixed and regression-tested.

## Test accounts (fake, local only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexalegal.local | admin123 |
| Attorney | ava@hexalegal.local | ava123 |
| Attorney | liam@hexalegal.local | liam123 |
| Client | client.one@example.local | client123 |
| Client | client.two@example.local | client123 |
| Demo client | demo@hexalegal.local | demo123 |

## Files

| File | Purpose |
|---|---|
| `server.js` | The entire application + lab system (zero dependencies) |
| `README.md` | This file |
| `VULNERABILITIES.md` | All 26 tests by feature (generated from the in-code registry) |
| `PRACTICE-GUIDE.md` | Challenges with graded hints and objectives (generated) |
| `FIX-AND-RETEST.md` | Secure implementation + regression retest per finding (generated) |
| `Dockerfile` / `docker-compose.yml` | One-command local setup |
| `logo.png` | The real HexaCyberLab logo (served at `/logo.png`) |
| `files/` | Simulated case documents used by the app |
| `progress.json` | **Generated runtime state** — created on first run, safe to delete to reset |

Regenerate the three registry docs after changing tests: `node server.js --gen-docs`.

---

HexaCyberLab — labs built by **Md. Jony Hassain, Founder of HexaCyberLab**. For authorised training use only.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3106`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3106` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
