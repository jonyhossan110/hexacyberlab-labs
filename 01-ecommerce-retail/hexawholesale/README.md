# HexaWholesale — Vulnerable B2B Wholesale Practice Lab

> ⚠️ **SAFETY WARNING — INTENTIONALLY VULNERABLE.**
> This application is deliberately insecure. It is a local training lab for learning manual web penetration testing (OWASP / WSTG style). Run it **only on your own machine**, bound to `127.0.0.1`. **Never deploy it to a server, LAN, or the internet.** All companies, people, prices and data are synthetic. No real credentials are used.

## LAB 10 of the HexaCyberLab lab programme

HexaWholesale is **Lab 10** in the numbered HexaCyberLab series (Category 1 — E-commerce & Retail). The labs run **in order**: a lab only opens after the previous lab has been completed 100%.

### 🔒 This lab starts LOCKED

On first run you will see only the lock gate. **Paste the completion key you earned at 100% in Lab 9** to unlock HexaWholesale. The unlock is remembered (see *Progress & persistence* below). Lab 10 is the final lab of the category: completing it 100% earns the **Category-1 Master Key**.

## What it is

HexaWholesale simulates a B2B wholesale ordering platform:

- **Product catalogue** with bulk pricing tiers (qty 1 / 10 / 50 / 200 → lower unit prices)
- **Companies (tenants)** — each company should only see its own purchase orders, invoices and negotiated prices
- **Roles** — company *buyer*, company *approver*, and platform *admin*
- **Purchase-order workflow** — buyer creates a PO → submits it → an approver approves it → an invoice is issued
- **Company credit limits** — orders are supposed to be blocked beyond the company's limit
- **Negotiated per-company pricing**, PO notes, rebate codes, company settings, invoices (view/download), and a platform admin dashboard

The business logic contains **24 intentional vulnerabilities** across 7 features, each rooted in the wholesale workflow (approval separation-of-duties, tenant isolation, tier pricing, credit control, negotiated pricing…). See `VULNERABILITIES.md` for the full map.

## The lab system

- **Mission page (`/tests`)** — every security test, grouped by feature, with its status and **3 graded hints** per test.
- **Tests complete by doing** — there is no "mark as done" button. The lab watches its own vulnerable flows and detects each successful exploit itself (an IDOR that actually serves another tenant's PO, a price that actually lands below the honest price, and so on).
- **Progress %** — shown in the header of every page (`LAB 10 · n/24 tests · pct%`) and via `GET /api/progress`. Solving tests one by one raises the percentage.
- **Progress & persistence** — your percentage, per-feature attempt counts and unlock state are saved to **`progress.json`** in this folder (generated at runtime — it is state, not source). Exit at 40%, come back tomorrow, restart the server: you resume at 40%. To reset the *lab system* to a fresh, locked state, delete `progress.json`. (The business data — POs, passwords, companies — lives in memory and still resets on server restart, as before.)
- **Lab Assistant (chatbot)** — the 💬 widget on every page knows this lab: which features exist, how many tests each carries, and your current progress. **Key-lock rule:** step-by-step guidance for a feature unlocks only after you have genuinely **tried that feature at least 3 times** — the assistant counts attempts per feature and will tell you to go and try first. Hints on the mission page are always available.
- **Completion** — at **100%** the lab takes you to a debrief page (`/complete`): what the lab contained (features and per-feature vulnerability counts), the techniques you used, what you learned, what each finding would mean on a real client's website, and how to write it in a real penetration-test report. The page reveals the **Category-1 Master Key** — the key itself is never present in the source code or anywhere in the site; it is assembled only at 100% (before that, not even the chatbot has it).
- **Certificate** — also at 100%: a printable certificate card (`/certificate`) with the HexaCyberLab logo, your name, and the lab you completed.

## Run it (one command)

```bash
cd hexawholesale-vuln-lab
node server.js
```

Then open: **http://127.0.0.1:3018**

No dependencies, no npm install, no build step — plain Node.js (built-ins only).

### Docker (optional)

```bash
docker compose up --build
```

Same address: http://127.0.0.1:3018 (published on localhost only). Note: `progress.json` lives inside the container in this mode; remove the container to reset the lab system.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Platform admin | `admin@hexawholesale.local` | `Admin@123` |
| Company A — buyer | `a-buyer@hexawholesale.local` | `User@123` |
| Company A — approver | `a-approver@hexawholesale.local` | `User@123` |
| Company B — buyer | `b-buyer@hexawholesale.local` | `User@123` |
| Company B — approver | `b-approver@hexawholesale.local` | `User@123` |
| Company C — buyer | `c-buyer@hexawholesale.local` | `User@123` |

Companies: **A** = Acme Distribution Ltd (credit limit $50,000) · **B** = Baltic Wholesale GmbH ($75,000) · **C** = Crescent Trading Co ($30,000).

Seed data includes 14 products (one hidden/internal), pre-existing POs `1001–1004` and invoices `2001` (Company A) and `2002` (Company B).

## Reset

- **Business data** (POs, users, passwords): in memory only — **restart the server** to reset to the seed state.
- **Lab-system progress** (unlock, %, attempts, certificate name): stored in `progress.json` and survives restarts on purpose. Delete `progress.json` (server stopped) for a completely fresh, locked lab.

## Files

| File | Purpose |
|---|---|
| `server.js` | The whole application + lab system (zero-dependency Node.js) |
| `logo.png` | The HexaCyberLab logo (header, gate, certificate) |
| `VULNERABILITIES.md` | All 24 intentional flaws grouped by feature: location, exploitation, business impact |
| `PRACTICE-GUIDE.md` | Hands-on challenges per feature with hints and measurable objectives |
| `FIX-AND-RETEST.md` | How each flaw should be fixed, plus a regression test per flaw |
| `progress.json` | **Generated at runtime** — your saved progress (safe to delete to reset the lab system) |
| `Dockerfile`, `docker-compose.yml` | Optional container run (localhost only) |

## Troubleshooting

- **Port already in use** — another lab may be running; stop it, or check `3018` is free. HexaWholesale always uses 3018.
- **Still locked after pasting the key** — check for stray spaces; the key must match exactly. The unlock is saved, so you only paste it once per install.
- **Login loops back** — allow cookies for `127.0.0.1` in your browser/proxy (sessions are cookie-based; Burp users: keep cookies enabled).
- **Data looks changed** — someone practised on it. Restart the server to reset the business data.

## ⬢ Gateway tools for this lab

Run this lab through the **Hexa Gateway** (from the project root: `start.ps1` on Windows, `./start.sh` on Linux/Kali, or `node gateway/server.js`) and you get, inside the lab itself:

- **🖥 Terminal** — a real Kali-style shell in a new tab, aimed at this lab
- **🐛 Payload Debugger** (`/hexa/debugger`) — paste a failed payload and learn *why* it failed
- **📖 Real Case** (`/hexa/case-study`) — the real breach behind this lab's vulnerability classes
- **📟 Live console** — watch every request hit the server and every test pass, in real time

## 🧰 Testing with Burp Suite

Target: `http://localhost:3018`

1. Start Burp Suite → **Proxy** → confirm the listener on `127.0.0.1:8080` is running.
2. Click **Open browser** in Burp and open `http://localhost:3018` — every request now lands in **Proxy → HTTP history**. (The labs are plain HTTP on localhost, so no CA certificate setup is needed for them.)
3. Right-click a request → **Send to Repeater** to edit and resend it by hand (change IDs, prices, roles), or **Send to Intruder** to automate attempts such as login brute force.
4. Full walkthrough with worked examples: [BURP-SUITE-GUIDE.md](../../BURP-SUITE-GUIDE.md) in the project root.
