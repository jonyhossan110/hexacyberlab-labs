# RS-04 — HexaDesk: Express SaaS

**Real Stack Milestone 04** (after core Lab 40) · Node.js · Express · SQLite · multi-file

A believable helpdesk SaaS written the way real startups write Express:
routers per feature, server-rendered pages beside a JWT-authenticated API,
a hand-rolled token verifier, two seeded customer workspaces — and twelve
scored security tests that are detected server-side as you perform them.

## Run it

Through the Hexa Gateway (recommended): start RS-04 from the dashboard.
Standalone:

```bash
bash run.sh
# open http://localhost:3204
```

`run.sh` runs `npm install` on first start (only dependency: **express**)
and then `node server.js`. The port comes from `$PORT` (default 3204).
Data lives in `data.sqlite` (Node's built-in `node:sqlite`), created and
seeded on first run. Delete `data.sqlite` + `progress.json` to reset (or
use the gateway's Reset button).

## Seeded accounts

Two workspaces (tenants), so IDOR crosses a real boundary:

| Workspace | Role | Email | Password |
|---|---|---|---|
| Northwind Traders | admin | amelia.hart@northwind.example | Harbour#Light9 |
| Northwind Traders | agent | priya.nair@northwind.example | Monsoon!Tea4 |
| Northwind Traders | agent | tom.becker@northwind.example | Alpine#Desk7 |
| Northwind Traders | viewer | sara.lindqvist@northwind.example | Fjord!View3 |
| Globex Support Co | admin | jonas.weber@globex.example | Waldweg#9 |
| Globex Support Co | agent | aisha.rahman@globex.example | Nordlys!6 |
| Globex Support Co | agent | noah.berg@globex.example | Tromso!Night1 |

Passwords are stored in **plaintext** — one of the app's many problems,
and fair game for your report. Logging in also mints your API JWT (shown
on the dashboard); the admin API is `GET /api/admin/users`.

## Layout (the point of a real-stack lab)

```
server.js           entry point — middleware, routers, error handler
run.sh              npm install (first run) + node server.js, port from $PORT
app/config.js       configuration (debug on, JWT secret is the word "secret")
app/db.js           node:sqlite schema + realistic two-tenant seed data
app/jwt.js          hand-rolled HS256 sign/verify — read verify() carefully
app/auth.js         cookie sessions + issued-token tracking
app/progress.js     the lab's scoring (progress.json, same shape as core labs)
app/log.js          application log — read it on the Logs page afterwards
app/layout.js       page chrome + the lab bar      app/views.js  templates
routes/auth.js      login (next redirect, no throttle), register, dashboard
routes/projects.js  projects — tenant check missing on the detail page
routes/tickets.js   tickets, raw-rendered comments, link-preview fetcher
routes/profile.js   profile update that saves every field you send
routes/settings.js  workspace settings, no CSRF token
routes/billing.js   coupon redemption with a slow gateway gap
routes/files.js     downloads from files/ — the traversal starts here
routes/admin.js     /api/me, /api/token, /api/admin/users (JWT role trust)
routes/debug.js     the /debug route staging forgot to remove
routes/lab.js       brief, tests, guide, code review, logs, complete + report
files/              downloadable onboarding guide + sample export
.env                the file the download feature must never reach
```

## Data store — an honest note

This lab uses **Node's built-in `node:sqlite`** (synchronous `DatabaseSync`,
stable in Node 22.5+/24), so SQLite is real — the same SQL, the same file
semantics — with zero extra native dependencies to install. Queries use
prepared statements; RS-04's flaws live in auth, tenancy and logic instead.

## The 12 tests

JWT weak secret / alg confusion · cross-workspace project IDOR · stored
XSS in a ticket comment · SSRF link-preview fetcher · mass assignment on
profile update · download path traversal · settings CSRF · open redirect
after login · /debug exposure · no login rate limiting · coupon race
condition · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
