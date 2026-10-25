# RS-02 — HexaNotes: Flask Note-Taking SaaS

**Real Stack Milestone 02** (after core Lab 20) · Python · Flask · Jinja2 · SQLite · multi-file

A believable shared-notes SaaS written the way a two-person startup ships
in a hurry: a small package, Jinja2 templates, sqlite3 from the stdlib, a
hardcoded secret, the Werkzeug debugger still on — and twelve scored
security tests that are detected server-side as you perform them.

## Run it

Through the Hexa Gateway (recommended): start RS-02 from the dashboard.
Standalone:

```bash
bash run.sh
# first start creates .venv and installs Flask, then serves on
# http://localhost:3202  (port comes from the PORT env var)
```

Needs Python 3 with pip. The database (`notes.db`) is created and seeded
on first run. Delete `notes.db` + `progress.json` to reset (or use the
gateway's Reset button).

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@hexanotes.example | HexaAdmin#2024! |
| Admin | priya.nair@example.com | PaperTrail!9 |
| User | marcus.webb@example.net | Sunflower!23 |
| User | elena.petrova@example.org | BlueWhale#7 |

…plus 6 more users in the seed. Passwords are stored as **unsalted MD5** —
one of the product's many problems, and fair game for your report (the
Complete page lets you prove a crack). Notes are seeded too: team-shared
notes, a leadership roadmap draft, and private notes (a salary-negotiation
prep among them) that nobody but their owners should be able to read.

## Layout (the point of a real-stack lab)

```
run.sh               venv + pip install flask, then runs the app
app.py               entry point — the Werkzeug dev server IS the server
hexanotes/
  config.py          debug ON, hardcoded secret key, paths
  db.py              sqlite3 helper — schema trigger + queries
  seed.py            realistic users + notes, MD5-hashed passwords
  auth.py            the homemade session cookie (base64 of the user id)
  progress.py        the lab's scoring (progress.json, same shape as
                     the core labs and RS-01)
  applog.py          application log — read it on the Logs page
  app_routes.py      the product: notes, search, profile, invites, admin
  lab_routes.py      the lab pages + the report/crack submissions
  tests_def.py       the 12 tests and their hints
templates/           Jinja2 — product pages + lab/ pages (brief, tests,
                     guide, review, logs, complete)
static/style.css
attachments/         note attachments — the download feature's folder
  uploads/           user uploads land here
ssti_marker.txt      a proof token the template engine should never print
.env                 the file the download feature must never reach
```

## The 12 tests

SSTI to RCE · Werkzeug debug console · SQL injection in search · IDOR on
notes · stored XSS in a shared note · guessable session cookie (base64
user id) · attachment download traversal · CSRF on the profile form ·
open redirect on login `next` · MD5 password storage (crack-and-submit) ·
mass assignment of the role field · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
