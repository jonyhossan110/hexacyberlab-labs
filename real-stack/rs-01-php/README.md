# RS-01 — HexaKart / NordKart: Plain PHP Store

**Real Stack Milestone 01** (after core Lab 10) · PHP 8 · PDO/SQLite · multi-file

A believable Scandinavian home-goods shop written the way real small shops
are written in plain PHP: a front controller, page scripts, a config file,
an `.env` someone committed, a database backup someone forgot — and twelve
scored security tests that are detected server-side as you perform them.

## Run it

Through the Hexa Gateway (recommended): start RS-01 from the dashboard.
Standalone:

```bash
php -S 127.0.0.1:3201 -t public router.php
# open http://localhost:3201
```

Needs only PHP 8+ (with `pdo_sqlite`). The database (`data.sqlite`) is
created and seeded on first run. Delete `data.sqlite` + `progress.json` to
reset (or use the gateway's Reset button).

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | ingrid@nordkart.example | Fjord!Admin22 |
| Customer | lars.pettersen@example.no | Sommer2023! |
| Customer | amelia.hart@example.co.uk | Teatime!42 |
| Manager | tomasz.kral@example.pl | Gdansk!22 |

…plus 8 more customers in the seed. Passwords are stored in **plaintext** —
one of the shop's many problems, and fair game for your report.

## Layout (the point of a real-stack lab)

```
router.php          dev-server router (static files, /uploads handling)
public/index.php    front controller — every dynamic request lands here
public/backup.sql   a full backup left in the web root (test: info-disclosure)
app/config.php      configuration (debug on, old DB password still inside)
app/db.php          PDO + schema + realistic seed data
app/auth.php        session helpers        app/layout.php   page chrome + lab bar
app/progress.php    the lab's scoring (progress.json, same shape as core labs)
app/log.php         application log — read it on the Logs page afterwards
app/pages/…         the shop: home, shop, product, login, account, orders, download
app/lab/…           brief, tests, guide, code review, logs, complete + report
files/              downloadable invoices (the traversal starts here)
uploads/            avatar uploads — PHP executes in this folder (by "accident")
.env                the file the download feature must never reach
```

## The 12 tests

SQLi login bypass · UNION extraction · IDOR on orders · stored XSS ·
reflected XSS · upload-to-shell · path traversal · CSRF transfer · PHP
type juggling (loose `==` promo) · web-root backup disclosure · no login
rate limiting · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
