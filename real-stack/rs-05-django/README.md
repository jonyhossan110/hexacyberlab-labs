# RS-05 — HexaClinic: Django Patient Portal

**Real Stack Milestone 05** (after core Lab 50) · Python · Django · SQLite · multi-file

A believable clinic patient portal written in real Django — the framework
teams choose *because* it handles security — by a fictional two-person
team that then overrode its protections one by one: `DEBUG = True`, the
MD5 password hasher promoted to first place, a hand-rolled login that
never rotates the session, a `|safe` filter in the record template, a
`@csrf_exempt` cancel endpoint, a ModelForm that binds `is_staff`, a raw
SQL search beside the ORM, and the installer's `admin/admin123` still
guarding `/admin/`. Twelve scored tests are detected server-side as you
perform them.

## Run it

Through the Hexa Gateway (recommended): start RS-05 from the dashboard.
Standalone:

```bash
bash run.sh
# first start creates .venv and installs Django; then open
# http://localhost:3205   (or $PORT if set)
```

Needs Python 3.10+ and pip. The database (`db.sqlite3`) is created and
seeded on first run. Delete `db.sqlite3` + `progress.json` to reset (or
use the gateway's Reset button).

## Seeded accounts

| Role | Username | Password |
|---|---|---|
| Admin (Django admin) | admin | admin123 |
| Doctor — Cardiology | dr.lindqvist | Rounds!2024 |
| Doctor — Internal medicine | dr.herrera | Cardio#2024 |
| Doctor — Paediatrics | dr.nair | Monsoon!Care3 |
| Receptionist | frontdesk | FrontDesk#2024 |
| Patient | oliver.reed | password123 |
| Patient | amelia.hart | Teatime!42 |

…plus 6 more patients in the seed. Passwords are hashed with **MD5** —
the settings put `MD5PasswordHasher` first, and that is one of the
portal's scored problems.

## Layout (the point of a real-stack lab)

```
run.sh                  venv + pip install + migrate + seed + runserver
manage.py               standard Django entry point
hexaclinic/settings.py  DEBUG on, SECRET_KEY committed, MD5 hasher first
hexaclinic/urls.py      /admin/, /lab/, and the clinic URLconf
clinic/models.py        Profile (role), Appointment, MedicalRecord, RecordMessage
clinic/views.py         the portal — most flaws live here
clinic/forms.py         AccountForm: the ModelForm that binds is_staff
clinic/middleware.py    request log + server-side test detection
clinic/seed.py          the fictional clinic, incl. admin/admin123
clinic/progress.py      the lab's scoring (progress.json, RS-01 contract)
clinic/tests_def.py     the 12 tests with hints
lab/                    the training layer: brief/tests/guide/review/logs/complete
templates/              base (lab bar) + portal pages + lab pages
media/                  patient result files — the traversal starts here
.env                    the file the download feature must never reach
```

## The 12 tests

Raw SQL injection beside the ORM · DEBUG=True error page · IDOR on
patient records · XSS via the `|safe` filter · `@csrf_exempt`
state change · ModelForm mass assignment (`is_staff`) · media download
traversal · MD5 password hasher (crack-and-submit) · session not
rotated at login (fixation) · SSRF record import · default admin
credentials · one professional mini-report.

Work **black-box first**; the Code Review page is your second pass.
The completion code is `RS05-` + the first 10 hex characters of
SHA-256(`rs-05-django:hexaclinic`), upper-cased.
