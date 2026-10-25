# HexaTranslate — LAB 38 of 110

⏱ **Estimated time:** ~3h 20m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 25
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

**Category 4: AI & Intelligent Applications** · HexaCyberLab vulnerable lab series

HexaTranslate is a deliberately vulnerable **translation SaaS**: user accounts, translation
projects, a shared translation memory, glossaries / term bases, a reviewer workflow,
character credits and team roles. Translations are **simulated** with deterministic
in-app word mappings — there are no real model calls and no external network access.
The application exists to be attacked, locally, for training.

> ⚠️ **LOCAL ONLY.** Run it on your own machine (127.0.0.1). Never deploy it publicly.

## Quick start

```bash
node server.js            # http://127.0.0.1:3047/
# or
docker compose up --build # same address
```

Requires Node.js 18+ (zero dependencies — nothing to install).

## The lab system

- **Sequential unlock:** this is Lab 38. It starts **locked** — paste the completion key
  you earned at 100% in **Lab 37 (HexaVoice)** on the gate page to open it. Keys are never
  written in plain form anywhere in this folder; each key exists only as encoded fragments
  inside `server.js` and is assembled in memory at the moment it is needed.
- **Progress:** every page header shows `LAB 38 · done/25 tests · pct%`. Progress is
  measured against the lab's 25 scored security tests across 9 features.
- **Mission page (`/tests`):** all tests grouped by feature, each with its OWASP mapping,
  difficulty, your attempt count for that feature, and 3 graded hints (nudge → stronger →
  near-answer).
- **Tests complete by doing:** a test flips only when the server observes the real exploit
  effect (a foreign object actually served, a poisoned memory entry actually used, a
  balance actually moved) — never by clicking.
- **Lab Coach chatbot** (bottom-right on every page, works even while locked):
  - answers feature/test counts and test names freely;
  - gives **step-by-step help for a feature only after you have genuinely tried that
    feature at least 3 times** (it quotes your real attempt count when refusing);
  - **does not have the completion key** until you reach 100% — then it can share it;
  - knows who built these labs — ask it.
- **Persistence:** progress lives in `progress.json` (generated at runtime, safe to delete
  to reset the lab). Stop and restart the server at any point — your % and attempts are
  exactly where you left them.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature
  vulnerability counts, the techniques you used, what you learned, what each flaw means
  for a real client, how to write each finding in a real pentest report — plus the
  **completion key for Lab 39**.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab logo
  and your name.

## Test accounts (seeded)

| Email | Password | Role | Notes |
|---|---|---|---|
| admin@hexatranslate.local | admin123 | admin | platform admin |
| lena@hexatranslate.local | lena2024 | lead | owns projects 101, 104 + glossary 201 |
| marco@hexatranslate.local | marco2024 | member | owns project 102 |
| rita@hexatranslate.local | review2024 | reviewer | assigned reviewer of review 301 |
| viktor@hexatranslate.local | viewer2024 | viewer | |
| tara@hexatranslate.local | *(see VULNERABILITIES — default credential test)* | member | |
| omar@outsider.test | omar2024 | member | owns project 103 + glossary 202 |
| demo@demo.local | *(see VULNERABILITIES — default credential test)* | member | demo account |

## Files

- `server.js` — the whole lab (app + lab system), zero-dependency Node.
- `VULNERABILITIES.md` — the complete vulnerability map (25 tests by feature).
- `PRACTICE-GUIDE.md` — challenges with objectives and graded hints.
- `FIX-AND-RETEST.md` — how each flaw is fixed properly, and how to retest the fix.
- `Dockerfile`, `docker-compose.yml` — one-command local run.
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`).

## Reset

Delete `progress.json` and restart — the lab returns to a fresh, locked state.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3047`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3047` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
