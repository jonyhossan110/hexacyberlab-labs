"""Lab progress — same contract as the core HexaCyberLab labs and RS-01:
progress.json { unlocked, tests:{id:true}, attempts:{}, completedAt }."""
import datetime
import hashlib
import json
import os

from .config import BASE_DIR

TOTAL = 12
PROGRESS_FILE = os.path.join(BASE_DIR, 'progress.json')


def load_progress():
    if os.path.isfile(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE) as f:
                data = json.load(f)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {'unlocked': True, 'tests': {}, 'attempts': {},
            'keyRevealed': False, 'completedAt': None}


def save_progress(p):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(p, f, indent=2)


def pass_test(test_id):
    p = load_progress()
    tests = p.setdefault('tests', {})
    if tests.get(test_id):
        return
    tests[test_id] = True
    if len([v for v in tests.values() if v]) >= TOTAL and not p.get('completedAt'):
        p['completedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    save_progress(p)


def attempt(key):
    p = load_progress()
    a = p.setdefault('attempts', {})
    a[key] = a.get(key, 0) + 1
    save_progress(p)
    return a[key]


def done_count():
    return len([v for v in load_progress().get('tests', {}).values() if v])


def completion_code():
    if done_count() < TOTAL:
        return None
    digest = hashlib.sha256(b'rs-02-flask:hexanotes').hexdigest()[:10].upper()
    return 'RS02-' + digest
