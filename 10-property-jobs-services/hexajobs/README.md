# HexaJobs — LAB 93 of the HexaCyberLab Lab Programme

**Category 10: Property, Jobs & Professional Services** · Port **3102** · Zero-dependency Node.js

HexaJobs is a deliberately vulnerable **job portal**: job listings, employers, job seekers,
applications, CV uploads, application status workflows and employer plans. It is a training
lab for web penetration testing — **local use only, never deploy it publicly**.

## Quick start

```bash
# Option A — Node (22+ recommended)
node server.js
# → http://127.0.0.1:3102

# Option B — Docker
docker compose up --build
```

The server binds to `127.0.0.1` only. All data is in-memory fake seed data and resets
when the process restarts (progress does not — see below).

## The Lab System (read this first)

- **Sequential unlock:** Lab 93 starts **locked**. Paste the completion key you earned by
  finishing Lab 92 at 100% into the gate form. The correct key lifts the gate permanently
  for this install (the unlock survives restarts).
- **Progress:** every page header shows `LAB 93 · done/total tests · %`. Progress is stored
  in `progress.json` in this folder (generated runtime state — safe to delete to reset the
  lab to a fresh, locked state). Closing and reopening the lab resumes your exact %.
- **Mission Board (`/tests`):** all **26 scored tests across 9 features**, each with 3 graded
  hints. Tests flip to done only when the server observes the real exploit effect — never by
  clicking.
- **Lab Coach (chat widget, `POST /api/chat`):** knows every feature and test. Step-by-step
  how-to help for a feature unlocks only after you have genuinely tried that feature at
  least **3 times** (it quotes your real attempt count). It does not have the completion key
  until you reach 100%.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature
  vulnerability counts, techniques used, lessons, client impact, and how to write each
  finding in a real pentest report — plus the **completion key for Lab 94** and your
  **certificate** (`/certificate`, printable, with the HexaCyberLab logo).

## Test accounts (seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexajobs.local | admin123 |
| Employer (TechCorp, free plan) | hr@techcorp.local | employer123 |
| Employer (FoodHub, basic plan) | jobs@foodhub.local | employer123 |
| Seeker | alice@test.local | alice123 |
| Seeker | bob@test.local | bob123 |
| Demo seeker (printed on the login page) | demo@hexajobs.local | demo123 |

## What to practise

26 tests in 9 features — Login & Authentication, Registration & Profile, Job Search,
Job Listings, Applications, CVs & Files, Employer Plans & Billing, Admin Panel, and
Platform & API. Highlights: SQLi login bypass, predictable reset tokens, role-cookie
tampering, application/CV IDORs, applying "as" another user, self-promotion to *hired*,
unrestricted CV upload, path traversal, plan price tampering and an unauthenticated
debug dump. Full map: `VULNERABILITIES.md` · Challenges & hints: `PRACTICE-GUIDE.md` ·
Fixes & regression checks: `FIX-AND-RETEST.md`.

## Safety

Intentionally vulnerable. Bind stays on localhost; seed data is fake; there are no real
credentials. Do not expose this app to any network you do not fully control.

---
HexaCyberLab — Built by Md. Jony Hassain, Founder.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3102`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3102` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
