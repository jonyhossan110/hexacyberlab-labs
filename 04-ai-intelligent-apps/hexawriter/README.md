# HexaWriter — LAB 32 of 110

⏱ **Estimated time:** ~3h 10m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 4: AI & Intelligent Applications** · Port **3041** · Zero-dependency Node.js · Local lab only

HexaWriter is a complete AI writing SaaS — user accounts, documents & projects, simulated AI generation
(deterministic, in-app — no real model calls, no external network), templates with hidden system prompts,
brand voices, team workspaces with roles, and a word-credit billing system. It is **intentionally
vulnerable** and ships with the full HexaCyberLab lab system.

## Run it

```bash
node server.js          # http://127.0.0.1:3041
# or
docker compose up       # same address
```

Requires Node.js 18+. No npm install — built-ins only.

## Test accounts

| Account | Password | Notes |
|---|---|---|
| admin@hexawriter.local | admin123 | Platform admin (default credentials — a scored flaw) |
| alice@hexawriter.local | alice123 | Pro plan, owns the "Alice Studio" workspace |
| bob@hexawriter.local | bob123 | Free plan, his own workspace |
| carol@hexawriter.local | carol123 | Editor in Alice Studio |
| dave@hexawriter.local | dave123 | Viewer in Alice Studio |

## The lab system

- **Lock gate** — Lab 32 starts locked. Paste the completion key earned at 100% in Lab 31 to unlock it.
  Wrong keys are rejected; the gate lifts permanently for that install once unlocked.
- **Progress** — 26 scored tests across 7 features. Progress % = tests passed ÷ 26. Tests pass **only**
  when the exploit really succeeds (server-side detection) — never by clicking "done".
- **`/tests` — Mission page** — every test grouped by feature, with OWASP mapping, difficulty, status,
  per-feature attempt counts, and 3 graded hints per test (nudge → stronger → near-answer).
- **Lab Coach chatbot** — on every page (bottom-right). It answers counts and test names freely, but
  step-by-step help for a feature unlocks only after you have **genuinely tried that feature at least
  3 times** — it quotes your real attempt count. It never reveals the completion key before 100%
  (it does not have it until then), and it knows who built these labs.
- **Persistence** — progress lives in `progress.json` (generated runtime state, created on first run).
  Stop the server, restart it, and your %, attempts and unlock state resume exactly where you left them.
- **`/complete`** — at 100%: the six-section debrief (features, per-feature counts, techniques used,
  what you learned, what it means for a real client, how to write each finding in a real report),
  the **completion key for Lab 33**, and the name form for your certificate.
- **`/certificate`** — a printable completion card with the real HexaCyberLab logo, your name,
  the test/feature counts, and the completion date.
- **Completion key security** — the entry and completion keys exist in the code only as encoded
  fragments scattered across `server.js`; they are assembled in memory at the moment they are needed
  and never stored or printed in plain form anywhere in this folder.

## The tests (26)

| Feature | Tests |
|---|---|
| Login & Authentication | 6 — SQLi bypass, brute force, enumeration, default creds, predictable reset token, role-cookie tampering |
| Registration & Profile | 4 — weak password policy, mass assignment, stored XSS in display name, profile CSRF |
| Documents | 4 — read IDOR, edit IDOR, export IDOR, stored XSS in title/body |
| AI Generation & Templates | 4 — system-prompt leak via API, prompt injection, credit bypass, top-up tampering |
| Workspaces & Teams | 3 — cross-workspace access, member→owner escalation, settings tampering |
| Brand Voices & Sharing | 2 — brand-voice IDOR, guessable share token |
| API & Admin | 3 — derivable API key, admin delete via GET, debug page data exposure |

Full map: [VULNERABILITIES.md](VULNERABILITIES.md) · Challenges & hints: [PRACTICE-GUIDE.md](PRACTICE-GUIDE.md) ·
Fixes & regression checks: [FIX-AND-RETEST.md](FIX-AND-RETEST.md)

## Safety

Local-only training lab. Binds 127.0.0.1. Contains intentionally vulnerable code and fake seeded data —
never deploy it on a network, never point it at real users, and never reuse its patterns in production.

## Credits

HexaCyberLab lab programme — built by Md. Jony Hassain, Founder of HexaCyberLab.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3041`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3041` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
