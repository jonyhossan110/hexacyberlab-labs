# RS-07 — HexaPay: PHP REST API

**Real Stack Milestone 07** (after core Lab 70) · PHP 8 · REST API · bearer tokens · PDO/SQLite · multi-file

A believable payments/wallet API written the way real MVP APIs are written:
bearer-token auth, JSON in and out, a small companion web dashboard — and
twelve scored security tests that are detected server-side as you perform
them. This is an API-first lab: bring curl and Burp Suite, not a mouse.

## Run it

Through the Hexa Gateway (recommended): start RS-07 from the dashboard.
Standalone:

```bash
php -S 127.0.0.1:3207 -t public router.php
# API discovery:  http://localhost:3207/api
# Web view:       http://localhost:3207/
```

Needs only PHP 8+ (with `pdo_sqlite`). The database (`data.sqlite`) is
created and seeded on first run. Delete `data.sqlite` + `progress.json` to
reset (or use the gateway's Reset button).

## Seeded accounts

| Role | Email | Password | Wallet |
|---|---|---|---|
| Customer | priya.nair@example.in | Monsoon!24 | €4,820.55 |
| Customer | diego.fuentes@example.es | Andes#2023 | €1,930.20 |
| Customer | yuki.tanaka@example.jp | Sakura!2024 | €9,350.75 |
| Admin (ops) | ingrid.voss@example.no | Fjord!Ops22 | €15,000.00 |

…plus 6 more customers in the seed. Passwords are stored as **bare
SHA-256** — fast to crack if they ever leak, and part of the audit.

## Endpoint map

| Method & path | What it does |
|---|---|
| `POST /api/register` | Create user + wallet (€250 bonus), returns a token |
| `POST /api/login` | Email + password → bearer token |
| `GET /api/me` · `PATCH /api/me` | Read / update your profile |
| `GET /api/users` · `GET /api/users/{id}` | The user directory |
| `GET /api/accounts/{id}` | One wallet: owner, label, balance |
| `GET /api/accounts/{id}/transactions` | Money movements of one account |
| `GET /api/transactions?filter=&sort=` | Search your transactions |
| `POST /api/transfers` | Send money — or `{"mode":"authorize"}` to hold for capture |
| `POST /api/transfers/{id}/capture` | Capture an authorized transfer |
| `POST /api/otp/request` · `POST /api/otp/verify` | 4-digit SMS phone verification |
| `POST /api/webhooks` · `GET /api/webhooks/{id}` · `POST /api/webhooks/{id}/ping` | Webhook URLs, async test-ping deliveries |

The companion web view (`/`, `/login`, `/register`, `/dashboard`) logs in
through the same token issuance and calls `/api/me` from the browser —
it exists because one of the API's data fields becomes HTML there.

## Layout (the point of a real-stack lab)

```
router.php            dev-server router (static files, dotfile guard)
public/index.php      front controller — /api/* is JSON, the rest is HTML
app/config.php        configuration (debug on, the token recipe documented)
app/db.php            PDO + schema + realistic seed data
app/api.php           token issuance/verification + CORS handling
app/api_handlers.php  every API endpoint
app/fetch_worker.php  async webhook delivery worker (CLI, spawned per ping)
app/auth.php          web-view session helpers     app/layout.php  page chrome + lab bar
app/progress.php      the lab's scoring (progress.json, same shape as core labs)
app/log.php           application log — read it on the Logs page afterwards
app/pages/…           the web view: home, login, register, dashboard
app/lab/…             brief, tests, guide, code review, logs, complete + report
.env                  the file that should never have been committed
```

## The 12 tests

Forgeable API token (derived, never issued) · BOLA on account objects ·
mass assignment of the wallet balance · SQL injection in the transactions
filter · excessive data exposure (password hashes + tokens in responses) ·
OTP verification with no rate limit · webhook SSRF to internal addresses ·
CORS reflecting any origin with credentials · stored XSS from the API into
the dashboard · state change over GET · authorize/capture double-spend ·
one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
