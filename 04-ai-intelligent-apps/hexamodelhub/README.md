# HexaModelHub — LAB 40 (Category 4: AI & Intelligent Applications)

⏱ **Estimated time:** ~3h 30m (guided pace) · 🎚 **Difficulty:** Intermediate · 🧪 **Scored tests:** 26
📖 **Real-world case for this lab's bugs:** [TalkTalk: SQL Injection on Forgotten Pages](https://thehackernews.com/2016/10/talktalk-data-breach.html) — TalkTalk (UK) (2015)

A complete AI model platform — publisher accounts, model listings with versions and file manifests, API keys with usage quotas, a simulated-inference playground, model cards, and download/like stats — rebuilt as a **local-only, intentionally vulnerable** training lab with the full HexaCyberLab lab system: scored tests, graded hints, a Lab Coach chatbot, sequential key unlock, progress persistence, a completion debrief and a certificate.

> ⚠️ **Local use only.** This app is deliberately insecure. It binds to 127.0.0.1 (port **3049**). Never deploy it publicly, never expose the port, and never reuse its credentials anywhere else.

## Run it

```bash
# Option A — Node (zero dependencies, Node 20+)
node server.js          # → http://127.0.0.1:3049

# Option B — Docker (one command)
docker compose up --build
```

## The lab system

- **Lock gate:** Lab 40 starts locked. Paste the **completion key from Lab 39** into the gate to unlock it (the unlock persists across restarts). Wrong keys are rejected with no hints.
- **Progress:** every page header shows your progress (done/total tests and %). Progress is stored in `progress.json` (generated at runtime — it is state, not source) and **survives restarts**: leave at 40%, come back, resume at 40%.
- **Mission page:** `/tests` lists all 26 tests grouped by feature, each with OWASP mapping, difficulty, status, the feature's attempt count, and **3 graded hints** (nudge → stronger → near-answer).
- **Scored by doing:** a test flips to done only when the server observes the exploit's real effect (a private object actually served, a counter actually moved, a forged session actually accepted…). There is no "mark done" button.
- **Lab Coach chatbot:** knows the full test map and your progress. It answers counts/names freely, and gives step-by-step help for a feature **only after you have genuinely tried that feature at least 3 times** (it quotes your real attempt count when refusing). It does not have the completion key until you reach 100%.
- **Completion:** at 100%, `/complete` shows the full debrief — features, per-feature vulnerability counts, the techniques used, what you learned, what each flaw would mean for a real client, and how to write each finding in a professional report — plus the **completion key for Lab 41**. `/certificate` renders a printable certificate with your name.
- **Key mechanism:** both keys live in the code only as ≥5 encoded shards scattered across `server.js`, assembled at runtime at the reveal moment. No key value appears in plain form anywhere in this folder or docs.

## Test accounts (seeded)

| Account | Password | Role / plan | Notes |
|---|---|---|---|
| admin@modelhub.local | admin123 | admin / enterprise | Platform administrator |
| nova@ailabs.io | nova123 | publisher / pro | Owns NovaLLM-7B (private), NovaChat-13B, OpenTranslate-mini |
| pixel@mlworks.io | pixel123 | publisher / pro | Owns PixelVision-2, PixelMed-Classifier (private) |
| demo@freemail.io | demo123 | user / free | Demo account; owns the free-tier API key (quota 10) |

## What's inside

- `server.js` — the whole app + lab engine (zero-dependency Node).
- `VULNERABILITIES.md` — the complete map: all 26 tests by feature, with OWASP, exploitation outline and impact.
- `PRACTICE-GUIDE.md` — 26 challenges with graded hints and measurable objectives.
- `FIX-AND-RETEST.md` — the secure implementation + regression test for every finding.
- `logo.png` — the HexaCyberLab logo, served at `/logo.png` and used on the certificate.
- `Dockerfile`, `docker-compose.yml` — one-command local setup (host port bound to 127.0.0.1 only).

The playground's inference is **simulated and deterministic** — no real model is ever called, no external network access is made.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3049`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3049` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
