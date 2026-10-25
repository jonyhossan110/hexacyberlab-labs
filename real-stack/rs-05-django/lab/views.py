"""The lab pages — brief, tests, guide, code review, logs, complete.
The training layer wrapped around the HexaClinic product, mirroring
RS-01 and RS-02."""
import os

from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from django.shortcuts import render

from clinic import progress
from clinic.applog import LOG_FILE
from clinic.progress import completion_code, load_progress, save_progress
from clinic.tests_def import TESTS

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REVIEW_FILES = [
    ('hexaclinic/settings.py',
     'The project settings are a museum: DEBUG = True, a hardcoded '
     'SECRET_KEY from the first commit, ALLOWED_HOSTS wide open, and '
     'PASSWORD_HASHERS with MD5 first "until the migration finishes" — '
     'so every password in the portal is an MD5 hash.'),
    ('clinic/views.py',
     'Nearly everything lives here: record search glues input into a '
     'raw() query (SQL injection beside the ORM); the record view '
     'never checks ownership (IDOR); the portal login writes auth '
     'keys into the existing session without cycling it (fixation); '
     'the appointment cancel is @csrf_exempt; the media download '
     'joins paths unchecked (traversal); and the record importer '
     'fetches any URL server-side (SSRF).'),
    ('templates/record_detail.html',
     'The record thread renders the doctor\'s note and every message '
     'with the |safe filter — Django\'s autoescaping, the framework\'s '
     'main XSS defence, switched off by hand.'),
    ('clinic/forms.py',
     'AccountForm is a ModelForm on User whose fields include is_staff. '
     'Written for the staff console, reused on the patient profile '
     'page — bind-everything mass assignment.'),
    ('clinic/seed.py',
     'The seeded clinic, including the installer\'s admin account: '
     'username admin, password admin123, created on day one and never '
     'changed. The /admin/ panel trusts it completely.'),
]

FIXES = [
    ('Raw SQL beside the ORM',
     'Vulnerable:  MedicalRecord.objects.raw("... LIKE \'%" + q + "%\'")\n'
     'Fixed:       use the ORM (title__icontains=q) or, where raw SQL is\n'
     '             truly needed, parameters: raw("... LIKE %s", [q]) —\n'
     '             never string-built SQL.'),
    ('DEBUG=True',
     'Vulnerable:  DEBUG = True in the deployed settings.\n'
     'Fixed:       DEBUG = False outside development, secrets from the\n'
     '             environment, ALLOWED_HOSTS naming real hosts, and\n'
     '             error pages that tell strangers nothing.'),
    ('IDOR on records',
     'Vulnerable:  get_object_or_404(MedicalRecord, pk=pk) — for anyone.\n'
     'Fixed:       scope the queryset to the requester: patients get\n'
     '             MedicalRecord.objects.filter(patient=request.user);\n'
     '             staff access is a deliberate, logged decision.'),
    ('XSS via |safe',
     'Vulnerable:  {{ message.body|safe }}\n'
     'Fixed:       let Django autoescape (the default). If rich text is\n'
     '             a real requirement, sanitise with an allow-list\n'
     '             (e.g. bleach) before storage — never trust |safe.'),
    ('CSRF exemption',
     'Vulnerable:  @csrf_exempt on a state-changing view.\n'
     'Fixed:       remove the exemption and put {% csrf_token %} in the\n'
     '             form. Fix the client that "cannot" send tokens; do\n'
     '             not disarm the framework for it.'),
    ('Mass assignment',
     'Vulnerable:  ModelForm fields include is_staff, used on a public\n'
     '             profile page.\n'
     'Fixed:       one form per audience; privilege fields only in\n'
     '             staff-only forms behind staff-only views, and audit\n'
     '             changes to them.'),
    ('Path traversal',
     'Vulnerable:  os.path.join(MEDIA_ROOT, name) served unchecked.\n'
     'Fixed:       take os.path.basename(name), resolve the final path\n'
     '             and require it to stay inside MEDIA_ROOT; better,\n'
     '             look files up by id in the database.'),
    ('MD5 password hasher',
     'Vulnerable:  PASSWORD_HASHERS = [MD5PasswordHasher, ...]\n'
     'Fixed:       restore Django\'s default (PBKDF2, or Argon2), let\n'
     '             hashes upgrade transparently at next login, and\n'
     '             force a reset for privileged accounts.'),
    ('Session fixation',
     'Vulnerable:  a hand-rolled login that keeps the existing session\n'
     '             key.\n'
     'Fixed:       use django.contrib.auth.login(), which cycles the\n'
     '             key on authentication; if you must hand-roll, call\n'
     '             request.session.cycle_key() yourself.'),
    ('SSRF importer',
     'Vulnerable:  urllib.request.urlopen(user_supplied_url)\n'
     'Fixed:       allow-list the hosts that may be imported from,\n'
     '             block private/loopback ranges, resolve DNS before\n'
     '             connecting, and keep internal endpoints unreachable\n'
     '             from the application tier.'),
    ('Default credentials',
     'Vulnerable:  admin / admin123 on /admin/, unchanged since install.\n'
     'Fixed:       unique, strong admin credentials from a password\n'
     '             manager, MFA for staff, and rename or restrict the\n'
     '             admin path on the network level where possible.'),
]


def brief(request):
    return render(request, 'lab/brief.html')


def tests(request):
    p = load_progress()
    done = p.get('tests', {})
    rows = [dict(t, passed=bool(done.get(t['id']))) for t in TESTS]
    return render(request, 'lab/tests.html', {
        'tests_def': rows,
        'done_n': len([v for v in done.values() if v])})


def guide(request):
    return render(request, 'lab/guide.html')


def review(request):
    selected = request.GET.get('f', '')
    code = None
    note = None
    for path, n in REVIEW_FILES:
        if path == selected:
            note = n
            full = os.path.join(BASE_DIR, path)
            if os.path.isfile(full):
                with open(full) as f:
                    code = f.read()
    return render(request, 'lab/review.html', {
        'files': REVIEW_FILES, 'selected': selected,
        'code': code, 'note': note})


def logs(request):
    lines = []
    if os.path.isfile(LOG_FILE):
        with open(LOG_FILE) as f:
            lines = f.readlines()[-120:]
    return render(request, 'lab/logs.html', {'lines': lines})


def complete(request):
    p = load_progress()
    done = p.get('tests', {})
    done_n = len([v for v in done.values() if v])
    report_msg = ''
    crack_msg = ''
    if request.method == 'POST' and request.POST.get('do') == 'crack':
        guess = request.POST.get('plaintext', '').strip()
        hit = None
        if guess:
            # Only accounts actually stored with the MD5 hasher count —
            # the server reproduces the check against the stored hash,
            # exactly as an offline crack would be verified.
            for u in User.objects.filter(password__startswith='md5$'):
                if check_password(guess, u.password):
                    hit = u.email or u.username
                    break
        if hit:
            progress.pass_test('password-storage')
            crack_msg = ('✅ That plaintext matches the stored MD5 hash '
                         'of %s — the password-storage test is passed.'
                         % hit)
        else:
            crack_msg = ('No MD5-hashed account matches that plaintext. '
                         'Keep cracking.')
    if request.method == 'POST' and request.POST.get('do') == 'report':
        title = request.POST.get('title', '').strip()
        sev = request.POST.get('severity', '')
        ev = request.POST.get('evidence', '').strip()
        imp = request.POST.get('impact', '').strip()
        fix = request.POST.get('fix', '').strip()
        if len(title) >= 8 and sev and len(ev) >= 30 and len(imp) >= 20 \
                and len(fix) >= 20:
            p2 = load_progress()
            p2['report'] = {'title': title, 'severity': sev,
                            'evidence': ev, 'impact': imp, 'fix': fix}
            save_progress(p2)
            progress.pass_test('report')
            report_msg = '✅ Finding recorded — that is the report test passed.'
            p = load_progress()
            done = p.get('tests', {})
            done_n = len([v for v in done.values() if v])
        else:
            report_msg = ('The finding needs more substance: a clear '
                          'title (8+ characters), a severity, real '
                          'evidence (30+), the business impact (20+) '
                          'and a concrete fix (20+).')
    rows = [dict(t, passed=bool(done.get(t['id']))) for t in TESTS]
    return render(request, 'lab/complete.html', {
        'tests_def': rows, 'done': done, 'done_n': done_n,
        'total': len(TESTS), 'fixes': FIXES, 'code': completion_code(),
        'report_msg': report_msg, 'crack_msg': crack_msg})
