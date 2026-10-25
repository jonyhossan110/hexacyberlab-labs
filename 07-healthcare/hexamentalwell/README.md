# HexaMentalWell — LAB 69 (Category 7: Healthcare & Wellness)

⏱ **Estimated time:** ~3h 35m (guided pace) · 🎚 **Difficulty:** Advanced · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A deliberately vulnerable **mental-wellness platform** built for local, authorised security training:
client / therapist / admin accounts, **private journal entries**, therapy session booking, mood tracking,
therapist notes and session payments. The security theme is access control around highly private records —
exactly what a real wellness-app audit looks for.

> ⚠️ **LOCAL USE ONLY.** Run it on your own machine/lab network. Never deploy this app to the public
> internet. Every person, journal and note in the seed data is **fake**.

Part of the **HexaCyberLab 110-lab programme** by **Md. Jony Hassain, Founder of HexaCyberLab**.

## Run it

```bash
node server.js          # zero dependencies, Node 18+
# or
docker compose up       # one-command Docker setup
```

Open http://127.0.0.1:3078 — the server binds to localhost only.

## The lab system

- **Sequential unlock:** this is LAB 69. It starts **locked** — paste the completion key you earned by
  finishing LAB 68 to unlock it. Finishing this lab 100% reveals the key for LAB 70.
- **Progress:** every page header shows `done/total tests · %`. Progress is stored in `progress.json`
  (generated at runtime — safe to delete to reset the lab to a fresh, locked state) and **survives
  restarts**: leave at 40%, come back later, resume at 40%.
- **Mission Board (`/tests`):** all 26 scored tests grouped by feature, each with 3 graded hints.
  A test flips to done **only when the exploit actually succeeds** on the server — there is no
  "mark done" button.
- **Lab Coach chatbot:** knows every feature and test. Step-by-step help for a feature unlocks only
  after you have genuinely **tried that feature at least 3 times** (it quotes your real attempt
  count). It does not hold the completion key until the lab is 100% complete.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature counts,
  techniques used, what you learned, what each flaw means for a real client, and how to write each
  finding in a real pentest report — plus the completion key and your **certificate** (`/certificate`).

## Test accounts (seed data, all fake)

| Role      | Email                        | Password      |
|-----------|------------------------------|---------------|
| Client    | emma@client.local            | emma123       |
| Client    | liam@client.local            | liam123       |
| Client    | noah@client.local            | noah123       |
| Client    | ava@client.local             | ava123        |
| Therapist | dr.reyes@mentalwell.local    | therapist123  |
| Therapist | dr.okafor@mentalwell.local   | therapist123  |
| Admin     | admin@mentalwell.local       | admin123      |

## Coverage (26 tests, 9 features)

- **Login & Authentication (6)** — SQLi bypass, brute force, user enumeration, demo credentials,
  predictable reset token, role-cookie tampering
- **Registration & Profile (4)** — weak password policy, mass assignment, stored XSS, profile CSRF
- **Journals & Privacy (4)** — journal IDOR, therapist reading unassigned clients' journals,
  bulk journal export IDOR, support-tool journal leak
- **Mood Tracking (2)** — mood-history IDOR, forged mood entries
- **Sessions & Booking (3)** — session-notes exposure, booking for another client, cancelling
  another client's session
- **Payments (2)** — amount tampering, unverified mark-paid endpoint
- **Therapist Directory (2)** — search SQLi (full user dump), reflected XSS
- **Support & Admin (1)** — CSRF on admin deactivation
- **Platform & API (2)** — unauthenticated `/api/debug` credential dump, forgeable API token

See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for challenges with hints, and
`FIX-AND-RETEST.md` for the secure implementation of every flaw.

## Files

`server.js` (the whole app) · `README.md` · `VULNERABILITIES.md` · `PRACTICE-GUIDE.md` ·
`FIX-AND-RETEST.md` · `Dockerfile` · `docker-compose.yml` · `logo.png` · `progress.json` (generated)

## License

MIT © Md. Jony Hassain (HexaCyberLab). Training use only — you are responsible for using this lab
legally and only on systems you own or are authorised to test.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3078`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3078` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
