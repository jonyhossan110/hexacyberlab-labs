# RS-06 — HexaBilling: Laravel-style Invoicing SaaS

**Real Stack Milestone 06** (after core Lab 60) · PHP 8 · Laravel-style MVC ·
Blade-style templates · PDO/SQLite · multi-file

A believable invoicing SaaS for freelancers and small firms — workspaces,
clients, invoices, payments, a team page and an API — structured the way a
Laravel application is structured: a front controller, a route list,
controllers, models with mass assignment, and Blade-style views. Twelve
scored security tests are detected server-side as you perform them.

> **Honest note:** this is a Laravel-**style** mini-MVC written in plain
> PHP — a pocket router, a pocket Blade renderer (`{{ }}` escaped,
> `{!! !!}` raw), and Eloquent-flavoured models — not the full Laravel
> framework. The shapes, conventions and failure modes are Laravel's;
> the code has zero dependencies so the lab runs anywhere PHP 8 does.

## Run it

Through the Hexa Gateway (recommended): start RS-06 from the dashboard.
Standalone:

```bash
php -S 127.0.0.1:3206 -t public router.php
# open http://localhost:3206
```

Needs only PHP 8+ (with `pdo_sqlite`). The database (`data.sqlite`) is
created and seeded on first run. Delete `data.sqlite` + `progress.json` to
reset (or use the gateway's Reset button).

## Seeded accounts

| Role | Email | Password | Workspace |
|---|---|---|---|
| Owner | mara@brightpath.example | Studio!Owner7 | Brightpath Studio AS (pro) |
| Accountant | tomas@brightpath.example | Ledger#2024 | Brightpath Studio AS |
| Viewer | ingrid@brightpath.example | Viewer!Pass3 | Brightpath Studio AS |
| Owner | henrik@fjellmedia.example | Fjell!Media8 | Fjell Media AS (free) |
| Accountant | sara@fjellmedia.example | Konto#Sun42 | Fjell Media AS |
| Owner | lucia@casaverde.example | Verde!Casa6 | Casa Verde Interiors (pro) |
| Accountant | marco@casaverde.example | Fattura#911 | Casa Verde Interiors |

Passwords are stored in **plaintext** and API tokens sit unhashed in the
users table — two of this app's many problems, and fair game for your report.

## Layout (the point of a real-stack lab)

```
router.php            dev-server router (static files, /storage/attachments handling)
public/index.php      front controller — every dynamic request lands here
.env                  APP_DEBUG=true, APP_KEY, DB & mail passwords (the debug test reads this)
app/bootstrap.php     framework bootstrap (autoload-by-require)
app/config.php        config built from .env, like Laravel's config/*.php
app/Router.php        tiny router: verbs, {param}, auth + CSRF middleware concepts
app/routes.php        routes/web.php — the route list (one route is outside the CSRF group)
app/View.php          pocket Blade: {{ }} escaped, {!! !!} raw, @if/@foreach
app/Model.php         mass assignment: $fillable / $guarded, fill() and save()
app/Models/User.php   guarded = [] — the mass-assignment flaw lives here
app/Models/Client.php the same mechanic done right ($fillable), for contrast
app/Controllers/…     Auth, Dashboard, Client, Invoice, Profile, Team, Api, Report
app/Views/…           Blade-style templates for every page
app/db.php            PDO + schema + realistic multi-tenant seed
app/progress.php      the lab's scoring (progress.json, same shape as core labs)
app/log.php           application log — read it on the Logs page afterwards
app/lab/…             brief, tests, guide, code review, logs, complete + report
storage/invoices/     invoice "PDF exports" (the traversal starts here)
storage/attachments/  invoice attachments — PHP executes in this folder (by "accident")
```

## The 12 tests

Mass assignment (guarded=[]) · unescaped `{!! !!}` Blade output · raw-query
SQL injection · IDOR across workspaces · one route missing CSRF middleware ·
APP_DEBUG env-leaking error page · unvalidated attachment upload · invoice
download path traversal · disabled login throttle · plaintext API token
exposure · open redirect on the intended URL · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
