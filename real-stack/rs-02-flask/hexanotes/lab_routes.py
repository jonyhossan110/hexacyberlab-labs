"""The lab pages — brief, tests, guide, code review, logs, complete.
These are the training layer wrapped around the HexaNotes product,
mirroring RS-01's structure."""
import os

from flask import Blueprint, render_template, request

from .applog import hn_log
from .auth import current_user
from .config import BASE_DIR, LOG_FILE
from .db import query
from .progress import load_progress, pass_test, save_progress
from .seed import md5
from .tests_def import TESTS

bp = Blueprint('lab', __name__, url_prefix='/lab')

REVIEW_FILES = [
    ('hexanotes/config.py',
     'Debug mode is switched ON in committed config, and the secret key is '
     'a hardcoded string. The Werkzeug console this enables is reachable '
     'over HTTP, PIN and all.'),
    ('hexanotes/auth.py',
     'The session cookie is base64 of the user id — no signature, no '
     'server-side record. Whoever presents a number IS that user. '
     'Passwords are checked against an unsalted MD5 hash.'),
    ('hexanotes/app_routes.py',
     'Nearly everything lives here: the greeting is rendered with '
     'render_template_string around user input (SSTI); search glues the '
     'query into SQL; note view never checks ownership (IDOR); shared '
     'note bodies are rendered with escaping off (stored XSS); the '
     'download joins the filename straight onto the folder (traversal); '
     'the profile POST has no CSRF token; registration and invites take '
     'the role straight from the form (mass assignment); and login '
     'honours any "next" URL, including other domains (open redirect).'),
    ('hexanotes/db.py',
     'One sqlite3 helper for the whole app — and because search builds '
     'raw SQL strings elsewhere, parameterisation here does not save it.'),
    ('app.py',
     'The entry point: the Werkzeug development server is the production '
     'server, debugger attached. Fine on a laptop in 2021; a disaster '
     'anywhere else.'),
    ('.env',
     'The file the attachment download must never reach: the app secret '
     'and the (fictional) mail password, committed by accident.'),
]

FIXES = [
    ('SSTI — never template user input',
     'Vulnerable:  render_template_string("Welcome, " + name)\n'
     'Fixed:       keep templates in files; pass values as variables —\n'
     '             render_template("greet.html", name=name). The engine\n'
     '             then treats input as data, never as template code.'),
    ('Debug console',
     'Vulnerable:  app.run(debug=True) in the deployed app.\n'
     'Fixed:       debug=False outside local development, a real WSGI\n'
     '             server (gunicorn/waitress), and never expose the dev\n'
     '             server to a network.'),
    ('SQL injection',
     'Vulnerable:  "... LIKE \'%" + q + "%\'" string-glued queries.\n'
     'Fixed:       parameterised queries everywhere (execute(sql, (?,)))\n'
     '             — the driver, not the developer, handles quoting.'),
    ('IDOR',
     'Vulnerable:  SELECT * FROM notes WHERE id = ?\n'
     'Fixed:       ... WHERE id = ? AND owner_id = ? (the session user),\n'
     '             or an explicit sharing check before any read.'),
    ('Stored XSS',
     'Vulnerable:  {{ note.body | safe }} in the shared-note template.\n'
     'Fixed:       drop the |safe filter and let Jinja autoescape; if\n'
     '             rich text is a feature, sanitise with an allow-list\n'
     '             (e.g. bleach) at write time.'),
    ('Session cookie',
     'Vulnerable:  cookie = base64(user_id), unsigned and trusted.\n'
     'Fixed:       use Flask\'s signed session with a long random\n'
     '             SECRET_KEY from the environment — or server-side\n'
     '             sessions. Never trust a client-supplied identity.'),
    ('Path traversal',
     'Vulnerable:  send_file(os.path.join(ATTACHMENTS, name)).\n'
     'Fixed:       look downloads up by id in the database, serve with\n'
     '             send_from_directory, and verify the resolved path\n'
     '             stays inside the attachments folder.'),
    ('CSRF',
     'Vulnerable:  a POST that only checks the session cookie.\n'
     'Fixed:       a per-session CSRF token in every state-changing\n'
     '             form (Flask-WTF CSRFProtect), verified server-side,\n'
     '             plus SameSite cookies as defence in depth.'),
    ('Open redirect',
     'Vulnerable:  redirect(request.args["next"]) unchecked.\n'
     'Fixed:       only allow relative paths: parse the target and\n'
     '             reject anything with a host, or keep an allow-list.'),
    ('Password storage',
     'Vulnerable:  hashlib.md5(password) — unsalted, billions/sec.\n'
     'Fixed:       werkzeug.security.generate_password_hash() (scrypt)\n'
     '             or argon2/bcrypt, per-user salt built in, and force\n'
     '             a reset for existing MD5-hashed accounts.'),
    ('Mass assignment',
     'Vulnerable:  role = form.get("role") straight into the INSERT.\n'
     'Fixed:       build records from an explicit allow-list of fields;\n'
     '             privileged fields (role) are set server-side only,\n'
     '             and role changes require an existing admin.'),
]


@bp.route('/brief')
def brief():
    return render_template('lab/brief.html')


@bp.route('/tests')
def tests():
    p = load_progress()
    done = p.get('tests', {})
    return render_template('lab/tests.html', tests_def=TESTS, done=done,
                           done_n=len([v for v in done.values() if v]))


@bp.route('/guide')
def guide():
    return render_template('lab/guide.html')


@bp.route('/review')
def review():
    selected = request.args.get('f', '')
    code = None
    note = None
    for path, n in REVIEW_FILES:
        if path == selected:
            note = n
            full = os.path.join(BASE_DIR, path)
            if os.path.isfile(full):
                with open(full) as f:
                    code = f.read()
    return render_template('lab/review.html', files=REVIEW_FILES,
                           selected=selected, code=code, note=note)


@bp.route('/logs')
def logs():
    lines = []
    if os.path.isfile(LOG_FILE):
        with open(LOG_FILE) as f:
            lines = f.readlines()[-120:]
    return render_template('lab/logs.html', lines=lines)


@bp.route('/complete', methods=['GET', 'POST'])
def complete():
    p = load_progress()
    done = p.get('tests', {})
    done_n = len([v for v in done.values() if v])
    report_msg = ''
    crack_msg = ''
    if request.method == 'POST' and request.form.get('do') == 'crack':
        guess = request.form.get('plaintext', '').strip()
        if guess:
            hashed = md5(guess)
            hit = None
            for u in query('SELECT email FROM users WHERE password_hash = ?',
                           (hashed,)):
                hit = u['email']
                break
            if hit:
                pass_test('password-storage')
                hn_log('MD5 cracked: submitted plaintext matches %s' % hit)
                crack_msg = ('✅ That plaintext matches the stored MD5 of '
                             '%s — the password-storage test is passed.'
                             % hit)
            else:
                crack_msg = ('No account\'s stored hash matches that '
                             'plaintext. Keep cracking.')
    if request.method == 'POST' and request.form.get('do') == 'report':
        title = request.form.get('title', '').strip()
        sev = request.form.get('severity', '')
        ev = request.form.get('evidence', '').strip()
        imp = request.form.get('impact', '').strip()
        fix = request.form.get('fix', '').strip()
        if len(title) >= 8 and sev and len(ev) >= 30 and len(imp) >= 20 \
                and len(fix) >= 20:
            p2 = load_progress()
            p2['report'] = {'title': title, 'severity': sev,
                            'evidence': ev, 'impact': imp, 'fix': fix}
            save_progress(p2)
            pass_test('report')
            report_msg = '✅ Finding recorded — that is the report test passed.'
            p = load_progress()
            done = p.get('tests', {})
            done_n = len([v for v in done.values() if v])
        else:
            report_msg = ('The finding needs more substance: a clear title '
                          '(8+ characters), a severity, real evidence '
                          '(30+), the business impact (20+) and a concrete '
                          'fix (20+).')
    from .progress import completion_code
    return render_template('lab/complete.html', tests_def=TESTS, done=done,
                           done_n=done_n, total=len(TESTS), fixes=FIXES,
                           code=completion_code(), report_msg=report_msg,
                           crack_msg=crack_msg)
