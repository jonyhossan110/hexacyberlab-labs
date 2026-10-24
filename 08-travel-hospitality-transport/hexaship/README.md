# HexaShip — LAB 76 of 110

**Category 8: Travel, Hospitality & Transport** · A deliberately vulnerable parcel-shipping platform for local, hands-on web security training.

> ⚠️ **LOCAL USE ONLY.** This application is intentionally full of security holes. Run it only on your own machine / lab network. Never deploy it to a public server. All people, parcels and data in it are fake seed data. Tracking is simulated entirely inside the app — no carrier APIs are contacted.

## The business app

HexaShip is a small parcel-shipping company:

- **Customers** create parcels (weight-based pricing: Standard $4 + $1.50/kg, Express $9 + $3.00/kg), print shipping labels, follow tracking events, manage a saved **address book**, and pay **invoices**.
- **Courier staff** post tracking events and work from a staff console.
- **Admins** manage users.

## Run it

With Node.js (zero dependencies):

```bash
node server.js
# → http://127.0.0.1:3085
```

Or with Docker:

```bash
docker compose up --build
```

The server binds **127.0.0.1 only**.

## Test accounts (seeded, fake)

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Admin    | admin@hexaship.local   | admin123   |
| Staff    | staff@hexaship.local   | staff123   |
| Customer | alice@test.local       | alice123   |
| Customer | bob@test.local         | bob123     |
| Demo     | demo@hexaship.local    | demo123    |

## The lab system

- **Lock gate:** LAB 76 starts locked. Paste the **completion key from Lab 75** to unlock it. (Keys are per-lab secrets: each lab's completion key unlocks the next lab in the chain.)
- **Progress:** every solved test raises your score. Progress is shown in the header of every page and at `GET /api/progress`.
- **Mission Board (`/tests`):** all **26 scored tests across 9 features**, grouped by feature, each with 3 graded hints. A test flips to *done* only when the exploit actually succeeds against the live app — there is no "mark done" button.
- **Lab Coach chatbot:** the chat widget on every page knows the map (feature/test counts and names are public) but **step-by-step help for a feature unlocks only after you have genuinely tried that feature at least 3 times**. The coach reports your real attempt counts. It also knows who built these labs. It does **not** hold the completion key — it receives it only when the lab reaches 100%.
- **Persistence:** progress lives in `progress.json` in this folder (generated at runtime — it is state, not source). Stop and restart the server any time; your % and attempt counts resume exactly where you left them.
- **Completion (`/complete`):** at 100% you get the full debrief — features, per-feature vulnerability counts, the techniques used, what you learned, what each flaw means for a real client, and how each finding is written in a real pentest report — plus the **completion key for Lab 77**.
- **Certificate (`/certificate`):** a printable completion card with your name, the lab, and the completion date.

## Files

| File                | What it is |
|---------------------|------------|
| `server.js`         | The whole app + lab system (zero-dependency Node). |
| `VULNERABILITIES.md`| The complete vulnerability map: all 26 tests by feature. |
| `PRACTICE-GUIDE.md` | Challenges with graded hints and objectives (mirrors `/tests`). |
| `FIX-AND-RETEST.md` | The secure fix + regression retest for every finding. |
| `logo.png`          | The real HexaCyberLab logo (served at `/logo.png`). |
| `progress.json`     | *Generated at runtime* — your progress state. Delete it to reset the lab to a fresh, locked state. |

## Reset the lab

```bash
rm -f progress.json
```

Restart the server and the lab is fresh and locked again. (In-memory business data also resets on restart; progress is the only thing persisted.)

---

Part of the **HexaCyberLab 110-lab programme** — built by **Md. Jony Hassain, Founder of HexaCyberLab**.
