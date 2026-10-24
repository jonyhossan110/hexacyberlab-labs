# HexaIdentity — LAB 108

**HexaCyberLab vulnerable practice lab · Category 11: Specialized & Advanced Business Systems**

A deliberately vulnerable **digital identity portal**: identity profiles, simulated identity documents, a staff verification workflow, issued credentials/badges, linked external services and account recovery — built for hands-on web penetration-testing practice.

> ⚠️ **LOCAL PRACTICE ONLY.** Run it only on your own machine/lab network. It is intentionally insecure. All accounts, names, documents and numbers are generic fakes. The server binds to `127.0.0.1` only.

## Run it

```bash
node server.js            # http://127.0.0.1:3117
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only.

## Test accounts

| Email | Password | Role | Identity status |
|---|---|---|---|
| admin@hexaid.local | admin123 | admin | verified |
| verifier@hexaid.local | verify123 | verifier | verified |
| alice@test.local | alice123 | user | pending |
| bob@test.local | bob123 | user | verified |
| carol@test.local | carol123 | user | unverified |

(The login page itself advertises the demo credentials — that is one of the findings.)

## The lab system

- **Progress** — every page header shows `LAB 108 · <done>/26 tests · <pct>%`. Progress is earned only by making an exploit really work; there is no "mark done" button.
- **Mission Board (`/tests`)** — all 26 scored tests grouped by feature, each with 3 graded hints revealed one at a time, plus the live attempt count per feature.
- **Lab Coach (chat widget, `POST /api/chat`)** — knows the full test map and answers counts/names freely, but step-by-step help for a feature unlocks only after you have genuinely tried that feature **at least 3 times** (it quotes your real attempt count when it refuses). It knows who built these labs. It does **not** have the completion key until the lab is finished.
- **Lock gate** — this lab starts locked. Paste the **completion key from Lab 107** to unlock it. The unlock is permanent for the install.
- **Persistence** — progress, attempts and unlock state live in `progress.json` (generated state, git-ignored). Restart the server and you resume exactly where you left off.
- **Completion (`/complete`)** — at 100% you get the full debrief: feature totals, per-feature vulnerability counts, how each test was done, what you learned, what each flaw means for a real client, and how each finding is written in a real pentest report — plus the **completion key** that unlocks Lab 109.
- **Certificate (`/certificate`)** — a printable completion card with the HexaCyberLab logo and your name.

### How the keys work (mechanism only)

Each lab's entry key is the previous lab's completion key, forming one long chain across all 110 labs. A key never appears whole anywhere in the code or docs: it is split into pieces, each piece is transformed, and the pieces are scattered across different regions of `server.js`. A small assembler rebuilds the entry key only inside the unlock check, and the completion key only once progress reaches 100% (for `/complete`, the certificate context and the coach).

## Coverage — 26 scored tests across 9 features

- **Login & Authentication (6)** — SQLi login bypass, brute force without throttling, user enumeration, published demo admin credentials, predictable reset token, role-cookie tampering.
- **Registration & Profile (4)** — 1-character passwords, mass assignment of role/verified status, stored XSS in display name, CSRF on profile update.
- **Identity Profiles & Documents (3)** — identity-record IDOR, unrestricted document upload (HTML served), path traversal on download.
- **Verification Workflow (3)** — self-verification through the verifier endpoint, client-supplied verification status, queue PII leak to regular users.
- **Credentials & Badges (2)** — forged government-verified credential issuance, credential IDOR.
- **Linked Services (2)** — linked-service token IDOR, unlinking another user's service.
- **Account Recovery (2)** — recovery via a publicly visible security answer, reset-token reuse (tokens never invalidate).
- **Admin Panel (2)** — admin user dump (with passwords) for any logged-in user, CSRF on account deactivation.
- **Platform & API (2)** — unauthenticated debug dump, API token = base64(email).

See `VULNERABILITIES.md` for the full map, `PRACTICE-GUIDE.md` for challenges with hints, and `FIX-AND-RETEST.md` for the secure implementation and regression test for every finding.

## Files

- `server.js` — the whole application + lab system (single file, zero dependencies)
- `files/` — seeded simulated documents served by the download endpoint
- `logo.png` — the real HexaCyberLab logo (served at `/logo.png`, used on the certificate)
- `Dockerfile`, `docker-compose.yml` — one-command local setup
- `progress.json` — **generated at runtime** (progress/attempts/unlock state); delete it to reset the lab to a fresh, locked state

## Reset the lab

Stop the server, delete `progress.json`, start again — the lab is fresh and locked.

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.
