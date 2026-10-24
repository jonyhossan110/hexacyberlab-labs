# HexaHire — LAB 94 · HexaCyberLab Practice Labs

**Category 10: Property, Jobs & Professional Services**

HexaHire is a deliberately vulnerable **recruitment SaaS** (applicant tracking system):
companies (tenants), recruiters and hiring managers, candidates, pipeline stages,
interviews, scorecards, offers and candidate documents. It exists so security testers
can practise real web vulnerabilities against a realistic business workflow.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally insecure. Run it only on
> your own machine / lab network. Never deploy it publicly. All people, companies and
> data in it are fake.

## Run it

```bash
node server.js            # http://127.0.0.1:3103
# or
docker compose up --build
```

Zero dependencies — Node.js built-ins only. Binds `127.0.0.1` only.

## The lab system

- **Sequential unlock (key gate):** Lab 94 starts locked. Paste the **completion key
  from Lab 93** into the gate to open it. The gate stays lifted for that install.
- **Progress:** every solved test raises your percentage. Progress is stored in
  `progress.json` (generated runtime state — safe to delete to reset the lab) and
  **survives restarts**: leave at 40%, come back, resume at 40%.
- **Mission Board (`/tests`):** all **26 scored tests across 9 features**, grouped by
  feature, each with 3 graded hints. Tests complete **by doing** — the server detects
  the real exploit effect; there is no "mark done" button.
- **Lab Coach (chat widget, bottom right):** knows every test. Step-by-step help for a
  feature unlocks only after you have **genuinely tried that feature at least 3 times**
  (it quotes your real attempt count). Ask it who built these labs.
- **Completion (`/complete`):** at 100% you get the full debrief — per-feature counts,
  what you learned, what each flaw means for a real client, and how to write it in a
  real pentest report — plus the **completion key** that unlocks Lab 95.
- **Certificate (`/certificate`):** a printable completion card with the HexaCyberLab
  logo once you reach 100%.
- **Keys:** each lab's keys exist only as transformed fragments scattered through the
  code and are assembled in memory at the moment they are needed — the completion key
  is not present anywhere, in any readable form, before you earn it.

## Test accounts (fake, local only)

| Email | Password | Role | Company |
|---|---|---|---|
| admin@novatech.local | adminpass1 | Admin | NovaTech |
| rita@novatech.local | rita123 | Recruiter | NovaTech |
| henry@novatech.local | henry123 | Hiring Manager | NovaTech |
| ben@brightlabs.local | ben123 | Admin | BrightLabs |
| rachel@brightlabs.local | rachel123 | Recruiter | BrightLabs |
| demo@hexahire.local | demo123 | Recruiter (demo) | NovaTech |

## Files

- `server.js` — the whole application + lab system (single file, zero dependencies)
- `VULNERABILITIES.md` — the complete map of all 26 tests, generated from the registry
- `PRACTICE-GUIDE.md` — challenges with hints and measurable objectives
- `FIX-AND-RETEST.md` — how to fix every finding and regression-test the fix
- `files/` — seeded candidate CV files (fake) used by the document features
- `logo.png` — the real HexaCyberLab logo, served at `/logo.png`
- `progress.json` — **generated at runtime** (your progress); deleting it resets the lab

## Docs regeneration

`VULNERABILITIES.md`, `PRACTICE-GUIDE.md` and `FIX-AND-RETEST.md` are generated from
the TESTS registry in `server.js` so counts can never drift:

```bash
node server.js --gen-docs
```

---

HexaCyberLab — Built by Md. Jony Hassain, Founder.
