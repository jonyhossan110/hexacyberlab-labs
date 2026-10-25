# RS-08 — HexaFit: Flask REST API

**Real Stack Milestone 08** (after core Lab 80) · Python · Flask REST API · JWT · SQLite · multi-file

A believable fitness-tracking API written the way startups ship APIs:
JSON endpoints, bearer-token auth, a points economy worth real money —
and twelve scored security tests that are detected server-side as you
perform them. There is almost no UI: you test this one with Burp
Repeater or curl, like a real API engagement. A small server-rendered
companion site (landing page + public member profiles) rides along.

## Run it

Through the Hexa Gateway (recommended): start RS-08 from the dashboard.
Standalone:

```bash
bash run.sh
# first start creates .venv and installs Flask, then serves on
# http://localhost:3208  (port comes from the PORT env var)
```

Needs Python 3 with pip. The database (`hexafit.db`) is created and
seeded on first run. Delete `hexafit.db` + `progress.json` to reset (or
use the gateway's Reset button).

## Authentication — hand-rolled JWT

Tokens are **hand-rolled HS256 JWTs** (`hexafit/jwtutil.py`, stdlib
`hmac`/`hashlib` — no PyJWT), issued by `POST /api/auth/login` and sent
as `Authorization: Bearer <token>`. The signing secret is in
`hexafit/config.py`. Read it during your Code Review pass and ask
yourself how long it would survive a dictionary.

## Seeded accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@hexafit.example | AdminStride#1 | is_admin, premium, 5000 pts |
| Premium | marco.ruiz@example.com | TrailRun!42 | premium, **150 points** |
| Member | sara.lindqvist@example.se | MorningMiles#7 | 340 pts |
| Member | ken.watanabe@example.jp | SushiPower!3 | 90 pts |
| Member | aisha.bello@example.ng | DesertRose#9 | 720 pts |
| Member | lena.fischer@example.de | RiverStone#2 | 100 pts |

…plus 2 more members in the seed, each with a realistic workout history.
Passwords are stored as bare unsalted SHA-256 — and the API's user
serializer happily prints the hashes. Both facts are fair game.

## Endpoint map

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register → token |
| POST | `/api/auth/login` | Login → token |
| GET | `/api/auth/me` | Own record |
| GET | `/api/users` · `/api/users/<id>` | Member directory / record |
| GET | `/api/users/search?name=` | Search members |
| PATCH | `/api/users/me` | Update own profile (JSON) |
| POST | `/api/users/me/avatar` | Import avatar from `{"url": …}` |
| GET | `/api/users/<id>/workouts` | A member's workouts |
| GET · POST | `/api/workouts` | List / log own workouts |
| GET | `/api/workouts/<id>` | One own workout |
| GET | `/api/workouts/export?file=` | Download an export |
| POST | `/api/rewards/redeem` | Redeem points (`protein-box` 100 · `gym-towel` 250 · `premium-month` 1000) |
| GET | `/api/admin/stats` | Admin-only statistics |
| GET | `/profile/<id>` | Public web profile (companion site) |

## Layout (the point of a real-stack lab)

```
run.sh               venv + pip install flask, then runs the app
app.py               entry point — threaded Werkzeug dev server
hexafit/
  config.py          the JWT secret, reward catalogue, paths
  jwtutil.py         hand-rolled HS256 encode/decode (stdlib only)
  auth.py            bearer auth; authorization trusts token claims;
                     login-issued tokens are recorded in issued_tokens
  db.py              sqlite3 helper
  seed.py            realistic members + workouts, SHA-256 passwords
  api_routes.py      the product: every endpoint above
  web_routes.py      companion site — profile page prints bio raw
  lab_routes.py      the lab pages + the report submission
  progress.py        the lab's scoring (progress.json, same shape as
                     the core labs, RS-01 and RS-02)
  applog.py          application log — read it on the Logs page
  tests_def.py       the 12 tests and their hints
templates/           Jinja2 — landing, profile, lab/ pages (brief,
                     tests, guide, review, logs, complete)
static/style.css
exports/             workout export files — the download feature's folder
avatars/             fetched avatar files are stored here
export_marker.txt    an internal key file at the lab root — the export
                     download should never reach it (or the .env)
.env                 production values, committed by accident
```

## The 12 tests

JWT weak secret (crack + forge admin) · BOLA on workout records · SQL
injection in user search · mass assignment of the premium/admin flags ·
serializer exposes every user field (incl. password hash) · SSRF via
the avatar URL importer · stored XSS in the companion web profile ·
login brute force with no throttling · export download traversal ·
verbose API errors leaking internals · race condition redeeming points
twice · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
