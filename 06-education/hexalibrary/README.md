# HexaLibrary — LAB 56

A deliberately vulnerable **digital library platform** built for hands-on web
security practice. Part of the HexaCyberLab 110-lab programme
(Category 6: Education & E-learning).

> ⚠️ **LOCAL USE ONLY.** This app is intentionally insecure. Run it only on
> your own machine / lab network (it binds to 127.0.0.1). Never deploy it to
> the public internet. All accounts, books and fees are fake seed data.

## The business

HexaLibrary is a digital lending library:

- **Members** borrow ebooks from a catalog with **licensed copy counts**
- **Borrowing** runs on 14-day loans, a **3 active loan** member cap,
  due-date extensions of **at most 7 days**, and **$0.50/day late fees**
- Fully-loaned titles have a **reservation queue** (first come, first served)
- **Librarians** manage the catalog; an **admin** oversees all members
- Every member has a private **reading history**

## Run it

```bash
node server.js          # http://127.0.0.1:3065
```

or with Docker:

```bash
docker compose up --build
```

## Seed accounts

| Role      | Email                        | Password   |
|-----------|------------------------------|------------|
| Admin     | admin@hexalibrary.local      | admin123   |
| Librarian | librarian@hexalibrary.local  | lib12345   |
| Member    | alice@hexalibrary.local      | alice123   |
| Member    | bob@hexalibrary.local        | bob12345   |
| Member    | carol@hexalibrary.local      | carol123   |
| Demo      | demo@hexalibrary.local       | demo       |

Seed state worth knowing: Alice already holds the maximum 3 active loans;
Bob holds the only licensed copy of *The Silent Stack*; Carol and Demo are
queued for it; Alice owes a $2.00 late fee and Bob owes $3.50.

## The lab system

- **Lock gate.** The lab starts locked. It opens with the **completion key
  earned in Lab 55**, pasted into the gate form. A key is never written whole
  anywhere in this codebase — inside the app each key exists only as split,
  encoded pieces that are reassembled in memory at the moment of use. The
  completion key for the next lab is revealed only at 100%, on the completion
  page and by the Lab Coach.
- **Progress.** Every scored test you solve raises your percentage. Progress
  is tracked per test on the **Mission Board** (`/tests`) and via
  `GET /api/progress`.
- **Hints.** Every test carries 3 graded hints (nudge → stronger →
  near-answer), revealed one at a time beside the test on `/tests`.
- **Lab Coach chatbot.** A rule-based coach lives on every page. It freely
  tells you the map (features, test names, counts) and your progress, but
  **step-by-step help for a feature unlocks only after you have genuinely
  tried that feature at least 3 times** — it quotes your real attempt count
  when it refuses. It never invents vulnerabilities that are not in the lab.
  Ask it who built these labs.
- **Persistence.** Progress lives in `progress.json` in this folder
  (generated state — safe to delete to reset the lab). Stop the server,
  restart it, and your percentage and attempt counts are right where you
  left them. Delete `progress.json` (with the server stopped) to reset the
  lab to a fresh, locked state.
- **Completion.** At 100%, `/complete` gives the full debrief — per-feature
  counts, what you learned, what each flaw means for a real client, and how
  each finding is written in a real pentest report — plus your completion
  key and a printable **certificate** at `/certificate`.

## Files

| File                | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `server.js`         | The whole app + lab system (zero dependencies)      |
| `VULNERABILITIES.md`| Every scored test, grouped by feature               |
| `PRACTICE-GUIDE.md` | Challenges with hints and measurable objectives     |
| `FIX-AND-RETEST.md` | The secure fix + regression test for every test     |
| `docs/`             | Simulated ebook files served by the download routes |
| `logo.png`          | The real HexaCyberLab logo (served at `/logo.png`)  |
| `progress.json`     | Generated at runtime — your saved progress          |

## Safety

Bind address is `127.0.0.1` only. There are no real credentials, no real
payments and no external calls. Keys and tokens in this lab are fake and
exist only to teach the patterns.

---

HexaCyberLab — labs built by **Md. Jony Hassain, Founder of HexaCyberLab**.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3065`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3065` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
