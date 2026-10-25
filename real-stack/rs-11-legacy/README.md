# RS-11 — BrightTravel: Legacy PHP Audit (Capstone)

**Real Stack Milestone 11** (after core Lab 110) · legacy PHP · page-per-file · MD5 era · multi-file

The capstone. BrightTravel is a fictional Brighton travel agency whose site
has survived since 2009: page-per-file scripts, `include`-based header and
footer, `mysql_*`-era queries ported to PDO without changing a single one,
MD5 password hashes, a `register_globals`-era `extract($_GET)`, an installer
account nobody deleted, and a database backup in the web root. Fourteen
scored tests are detected server-side as you perform them — including the
full chain from low-privilege user to admin panel.

## Run it

Through the Hexa Gateway (recommended): start RS-11 from the dashboard.
Standalone:

```bash
php -S 127.0.0.1:3211 -t public router.php
# open http://localhost:3211
```

Needs only PHP 8+ (with `pdo_sqlite`). The database (`data.sqlite`) is
created and seeded on first run. Delete `data.sqlite` + `progress.json`
(or use the gateway's Reset button) to reset. For the SSRF test against a
loopback **HTTP** target, either point the import at another local service
(e.g. the gateway itself) or start with `PHP_CLI_SERVER_WORKERS=4`; the
`file://` import path works under any setup.

## Accounts provided by the engagement letter

| Role | Username | Password |
|---|---|---|
| Staff (low-privilege) | tom.clerk | Harbour!2012 |
| Customer | priya.sharma | Monsoon#44 |

Admin credentials are **not** provided — reaching the admin panel is part
of the test. (The site also still holds the 2009 installer's account and an
admin whose password is a bare MD5 of a very common word. Both are findings,
not documentation.)

## Layout (the point of a real-stack lab)

```
router.php          dev-server stand-in for the old Apache config
                    (leftovers served, PHP executes in /uploads/)
public/             page-per-file, exactly like 2009: index.php, search.php,
                    hotel.php, package.php, booking.php, bookings.php,
                    guestbook.php, login.php, register.php, account.php,
                    admin.php, page.php (?show= include), pages/ fragments
public/backup.sql   the full database dump, in the web root (test: backup-exposure)
public/config.old   the pre-port config copy, also in the web root
inc/config.php      the real config — master DB password + a canary marker
inc/common.php      session bootstrap on every page (never regenerates ids)
inc/db.php          PDO + schema + realistic seed data (MD5 passwords)
inc/progress.php    the lab's scoring (progress.json, same shape as core labs)
inc/log.php         the home-grown application log — read it on the Logs page
inc/lab/…           brief (engagement letter), tests, guide, code review,
                    logs, complete (crack submit + full audit report)
uploads/            holiday-photo uploads — PHP executes in this folder
backup.sql          the lab-root copy of the same forgotten dump
```

## The 14 tests

SQLi login bypass · UNION extraction (full user dump) · LFI via the page
parameter · upload-to-shell · stored XSS in the guestbook · CSRF admin
creation via GET · IDOR on bookings · default installer credentials ·
web-root backup + config exposure · MD5 crack (submit the admin's plaintext
on the Complete page) · session fixation · SSRF in the photo import ·
**admin takeover** (the chain: reach the panel through an exploit path) ·
the **full audit report**.

**Capstone adaptation:** the report test is the real deliverable — an
executive summary (50+ characters) plus **three** findings, each held to
the RS-01 minimums (title 8+, evidence 30+, impact 20+, fix 20+).

Work **black-box first**; the Code Review page is your second pass, written
as genuine audit notes.
