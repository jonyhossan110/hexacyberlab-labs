# HexaVoice — LAB 37 of 110 · HexaCyberLab Practice Labs

A complete, intentionally vulnerable **voice-AI platform**: user accounts, recordings with
simulated transcripts, speakers with private voiceprint notes, sharing links, a token API,
usage minutes and plan billing, webhooks and an admin console.

> ⚠️ **LOCAL USE ONLY.** This lab is deliberately vulnerable. Run it only on your own machine
> (it binds 127.0.0.1). Never deploy it to a public server.

## Run it

```bash
node server.js            # http://127.0.0.1:3046
# or
docker compose up --build
```

## Test accounts

| Account | Password | Role / Plan |
|---|---|---|
| admin@hexavoice.local | admin123 | admin / enterprise |
| alice@hexavoice.local | alice123 | user / pro |
| bob@hexavoice.local | bob12345 | user / free |
| carol@hexavoice.local | carol123 | user / pro |
| demo@hexavoice.local | demo1234 | user / free (default-credential test) |

## The lab system

- **Progress:** 26 scored security tests across 10 features. Your score is
  done/total — a test completes only when the server detects the real exploit effect.
- **/tests (Mission page):** every test grouped by feature, with 3 graded hints each.
- **Lab Coach chatbot:** knows the map and your attempt counts. Step-by-step help for a feature
  unlocks only after you have genuinely tried that feature **at least 3 times**.
- **Lock gate:** this lab starts locked. Paste the **completion key from Lab 36** to open it.
  Keys are never stored in plain text — each is split into encoded shards scattered through the code.
- **Persistence:** progress lives in `progress.json` (generated at runtime, safe to delete to reset).
  Restart the server and you resume exactly where you left off.
- **Completion:** at 100%, `/complete` shows the full debrief (features, per-feature counts,
  techniques, lessons, client impact, report writing) and reveals the completion key for the next
  lab. `/certificate` renders a printable certificate with the HexaCyberLab logo.

## Test map (26 tests)

- **Login & Authentication** — 6 tests: SQL Injection Login Bypass; Brute Force — No Rate Limiting or Lockout; User Enumeration via Login & Reset Responses; Default Demo Credentials Still Active; Predictable Password-Reset Token; Session Cookie Role Tampering
- **Registration & Profile** — 4 tests: Weak Password Policy (1-character passwords); Mass Assignment — Role & Plan via Registration; Stored XSS in Display Name; CSRF on Profile Update
- **Recordings & Transcripts** — 4 tests: Recording IDOR — Read Another User's Recording; Private Recording Served via Predictable Media URL; Transcript Edited by Non-Owner; Reflected XSS in Recording Search
- **Sharing Links** — 2 tests: Share-Link Enumeration (Sequential Tokens); Share Link Created for Someone Else's Recording
- **Speakers** — 2 tests: Speaker Profile IDOR — Private Voiceprint Notes; Rename Another User's Speaker
- **Usage & Billing** — 2 tests: Usage-Minute Manipulation (Client-Supplied Duration); Plan Upgrade Price Tampering
- **API Access** — 2 tests: Predictable API Key Derived from Email; API BOLA — Foreign Recording via API
- **Webhooks & Integrations** — 1 tests: Webhook SSRF to Internal Services (simulated)
- **Admin Panel** — 1 tests: CSRF on Admin User Deletion (GET)
- **Platform & Data Exposure** — 2 tests: Debug Endpoint Dumps All Users & Passwords; Missing HTTP Security Headers

Full details: [VULNERABILITIES.md](VULNERABILITIES.md) · Challenges: [PRACTICE-GUIDE.md](PRACTICE-GUIDE.md) · Fixes: [FIX-AND-RETEST.md](FIX-AND-RETEST.md)

Built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3046`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3046` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
