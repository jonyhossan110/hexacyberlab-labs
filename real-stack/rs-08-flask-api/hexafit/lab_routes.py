"""The lab pages — brief, tests, guide, code review, logs, complete.
These are the training layer wrapped around the HexaFit API,
mirroring RS-01 and RS-02."""
import os

from flask import Blueprint, render_template, request

from .applog import hf_log
from .config import BASE_DIR, LOG_FILE
from .progress import load_progress, pass_test, save_progress
from .tests_def import TESTS

bp = Blueprint('lab', __name__, url_prefix='/lab')

REVIEW_FILES = [
    ('hexafit/config.py',
     'The JWT signing secret is the product\'s own name — short, '
     'guessable, committed to git. Verbose error responses are switched '
     'on in the same file.'),
    ('hexafit/jwtutil.py',
     'A hand-rolled HS256 implementation. It verifies correctly — the '
     'weakness is not the math, it is the secret it is fed.'),
    ('hexafit/auth.py',
     'Every login-issued token is recorded in issued_tokens, but '
     'authorization trusts the token\'s claims (is_admin, role) instead '
     'of the database. A self-signed token with grand claims and a '
     'cracked secret is indistinguishable from a real one.'),
    ('hexafit/api_routes.py',
     'Almost everything lives here: per-user workout lists never check '
     'ownership (BOLA); user search glues its parameter into SQL; the '
     'one serializer returns full rows including password_hash; '
     'registration and profile update apply privileged fields straight '
     'from the client JSON (mass assignment); the avatar importer '
     'fetches arbitrary URLs server-side (SSRF); the export download '
     'joins the filename onto its folder (traversal); points '
     'redemption checks the balance, sleeps, then deducts from the '
     'stale read (race); and login counts failures but never acts on '
     'them (brute force).'),
    ('hexafit/web_routes.py',
     'The companion profile page prints the bio with Jinja escaping '
     'off — |safe — so markup stored through the API executes in '
     'viewers\' browsers (stored XSS).'),
    ('hexafit/__init__.py',
     'The global error handler returns tracebacks, absolute file paths '
     'and live config values (including the JWT secret) as JSON to '
     'whoever triggered the error (debug exposure).'),
    ('.env',
     'The production values someone copied to the repo anyway — the '
     'file the export traversal must never reach.'),
]

FIXES = [
    ('JWT — secret strength and claim trust',
     'Vulnerable:  secret = "hexafit"; authorization reads claims.\n'
     'Fixed:       a 32+ byte random secret from the environment (or\n'
     '             asymmetric RS256 with a managed key), short expiry,\n'
     '             and authorization decisions re-checked against the\n'
     '             database — claims are identity hints, not truth.'),
    ('BOLA — check ownership on every object',
     'Vulnerable:  SELECT * FROM workouts WHERE user_id = <url id>\n'
     'Fixed:       ... WHERE user_id = <id from the VERIFIED token>,\n'
     '             or an explicit ownership/role check before any read\n'
     '             of another user\'s objects.'),
    ('SQL injection',
     'Vulnerable:  "... LIKE \'%" + name + "%\'" string-glued queries.\n'
     'Fixed:       parameterised queries everywhere (execute(sql, (?,)))\n'
     '             — the driver, not the developer, handles quoting.'),
    ('Mass assignment',
     'Vulnerable:  record built from the whole request JSON.\n'
     'Fixed:       an explicit allow-list per endpoint (name, bio);\n'
     '             privileged fields (is_admin, is_premium, points)\n'
     '             are set server-side only, by code paths that check\n'
     '             an existing privilege.'),
    ('Excessive data exposure',
     'Vulnerable:  jsonify(dict(row)) — every column, incl. the hash.\n'
     'Fixed:       one serializer per audience with an explicit field\n'
     '             list (id, name, bio, avatar). password_hash and\n'
     '             internal flags never appear in any response.'),
    ('SSRF',
     'Vulnerable:  urlopen(user_supplied_url) from the server.\n'
     'Fixed:       allow-list hosts/schemes, reject private & loopback\n'
     '             ranges (and re-check after DNS resolution), enforce\n'
     '             size/time limits — or fetch via an isolated proxy.'),
    ('Stored XSS',
     'Vulnerable:  {{ user.bio | safe }} in the profile template.\n'
     'Fixed:       drop |safe and let Jinja autoescape; if rich text\n'
     '             is a real feature, sanitise with an allow-list\n'
     '             (e.g. bleach) at write time, and add a CSP.'),
    ('Brute force',
     'Vulnerable:  failures counted, nothing else happens.\n'
     'Fixed:       per-account and per-IP throttling, progressive\n'
     '             delays, temporary lockout or step-up challenge,\n'
     '             and alerting on credential-stuffing patterns.'),
    ('Path traversal',
     'Vulnerable:  open(os.path.join(EXPORTS, name)) unchecked.\n'
     'Fixed:       look exports up by id, serve with\n'
     '             send_from_directory, and verify the resolved path\n'
     '             stays inside the exports folder.'),
    ('Verbose errors',
     'Vulnerable:  500 responses carry tracebacks and config values.\n'
     'Fixed:       a generic error body + correlation id for clients;\n'
     '             full detail goes to server-side logs only. Debug\n'
     '             output is a development setting, never production.'),
    ('Race condition on points',
     'Vulnerable:  read balance -> sleep -> write balance - cost.\n'
     'Fixed:       make the deduction atomic: a single conditional\n'
     '             UPDATE ... SET points = points - ? WHERE id = ?\n'
     '             AND points >= ?, checked by rowcount — or a\n'
     '             transaction with a uniqueness constraint on\n'
     '             redemption, so the second writer loses cleanly.'),
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
                           code=completion_code(), report_msg=report_msg)
