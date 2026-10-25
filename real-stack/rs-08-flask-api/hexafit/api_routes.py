"""The HexaFit REST API — JSON in, JSON out, JWT bearer auth.

Written fast by a small team that trusted the client: object ids are
taken from the URL and never checked against the caller (BOLA), one
search endpoint glues its parameter into SQL, the user serializer
returns every column it has, registration and profile update apply
whatever fields the client sends, avatars are fetched from any URL,
exports are served by filename, points redemption checks-then-acts
across a slow "payment" pause, and login never slows anyone down.
"""
import os
import re
import time
import urllib.parse
import urllib.request

from flask import Blueprint, g, jsonify, request

from .applog import hf_log
from .auth import admin_required, auth_required, issue_token
from .config import AVATARS, EXPORTS, REWARDS
from .db import execute, query, query_one
from .progress import attempt as count_attempt, pass_test
from .seed import hash_pw

bp = Blueprint('api', __name__, url_prefix='/api')

# Every column a client may write through registration / profile update.
# The list was "temporary" in sprint 3. It includes the privileged ones.
WRITABLE_USER_FIELDS = ('name', 'bio', 'avatar_url', 'points',
                        'is_premium', 'is_admin')
HEX64 = re.compile(r'^[0-9a-f]{64}$')
LOCAL_HOSTS = ('127.0.0.1', 'localhost', '0.0.0.0', '::1')


def serialize_user(row):
    """The one serializer the whole API uses. It returns the full row —
    password hash, points, flags, everything — for every caller."""
    return dict(row)


def _json_body():
    return request.get_json(silent=True) or {}


def _detect_data_exposure(rows, requester_id):
    """Pass the test only when another user's password hash is actually
    in the payload about to be served."""
    for r in rows:
        if r.get('id') != requester_id and r.get('password_hash'):
            pass_test('data-exposure')
            hf_log('SERIALIZER served full user rows incl. password '
                   'hashes to user %s' % requester_id)
            return


# ---------------------------------------------------------------- auth

@bp.route('/auth/register', methods=['POST'])
def register():
    data = _json_body()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'email and password are required'}), 400
    if query_one('SELECT id FROM users WHERE email = ?', (email,)):
        return jsonify({'error': 'email already registered'}), 409
    # Mass assignment, textbook style: the record is built from whatever
    # the client submitted, filtered only by "is it a column".
    fields = {'email': email, 'password_hash': hash_pw(password),
              'name': data.get('name') or email.split('@')[0],
              'bio': '', 'avatar_url': '', 'avatar_file': '',
              'is_admin': 0, 'is_premium': 0, 'points': 0}
    for key in WRITABLE_USER_FIELDS:
        if key in data:
            fields[key] = data[key]
    cols = ', '.join(fields.keys())
    marks = ', '.join('?' for _ in fields)
    uid = execute('INSERT INTO users (%s) VALUES (%s)' % (cols, marks),
                  tuple(fields.values()))
    user = query_one('SELECT * FROM users WHERE id = ?', (uid,))
    if (data.get('is_premium') and user['is_premium']) or \
            (data.get('is_admin') and user['is_admin']):
        pass_test('mass-assignment')
        hf_log('REGISTER mass-assigned privileged flags for %s' % email)
    hf_log('REGISTER %s' % email)
    return jsonify({'token': issue_token(user),
                    'user': serialize_user(user)}), 201


@bp.route('/auth/login', methods=['POST'])
def login():
    data = _json_body()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    user = query_one('SELECT * FROM users WHERE email = ?', (email,))
    if user is None or user['password_hash'] != hash_pw(password):
        # Failures are counted — and that is all that happens. No lock,
        # no delay, no CAPTCHA: the door never gets heavier to push.
        n = count_attempt('login:' + email.lower())
        hf_log('LOGIN fail %s (attempt %d)' % (email, n))
        if n >= 10:
            pass_test('brute-force')
        return jsonify({'error': 'invalid email or password'}), 401
    hf_log('LOGIN ok %s' % email)
    return jsonify({'token': issue_token(user),
                    'user': serialize_user(user)})


@bp.route('/auth/me')
@auth_required
def me():
    return jsonify({'user': serialize_user(g.api_user)})


# ---------------------------------------------------------------- users

@bp.route('/users')
@auth_required
def list_users():
    rows = [serialize_user(r) for r in query('SELECT * FROM users '
                                              'ORDER BY id')]
    _detect_data_exposure(rows, g.api_user['id'])
    return jsonify({'users': rows})


@bp.route('/users/<int:uid>')
@auth_required
def get_user(uid):
    row = query_one('SELECT * FROM users WHERE id = ?', (uid,))
    if row is None:
        return jsonify({'error': 'no such user'}), 404
    data = serialize_user(row)
    _detect_data_exposure([data], g.api_user['id'])
    return jsonify({'user': data})


@bp.route('/users/search')
@auth_required
def search_users():
    name = request.args.get('name', '')
    # The search the interns wrote: the parameter is glued straight into
    # the SQL string. Parameterised comparison below exists only so the
    # lab can prove the injection changed the results.
    sql = "SELECT * FROM users WHERE name LIKE '%" + name + "%' ORDER BY id"
    conn_rows = query(sql)
    rows = [serialize_user(r) for r in conn_rows]
    clean = query('SELECT * FROM users WHERE name LIKE ? ORDER BY id',
                  ('%' + name + '%',))
    leaked_hash = any(isinstance(v, str) and HEX64.match(v)
                        for r in rows for v in r.values())
    if len(rows) != len(clean) or leaked_hash:
        pass_test('sqli')
        hf_log('SEARCH injection changed results for name=%r' % name)
    _detect_data_exposure(rows, g.api_user['id'])
    return jsonify({'users': rows})


@bp.route('/users/me', methods=['PATCH'])
@auth_required
def update_me():
    data = _json_body()
    before = g.api_user
    updates = {k: data[k] for k in WRITABLE_USER_FIELDS if k in data}
    if not updates:
        return jsonify({'error': 'no updatable fields supplied'}), 400
    sets = ', '.join('%s = ?' % k for k in updates)
    execute('UPDATE users SET %s WHERE id = ?' % sets,
            tuple(updates.values()) + (before['id'],))
    after = query_one('SELECT * FROM users WHERE id = ?', (before['id'],))
    for flag in ('is_premium', 'is_admin'):
        if flag in data and not before[flag] and after[flag]:
            pass_test('mass-assignment')
            hf_log('PROFILE mass-assigned %s for %s'
                   % (flag, before['email']))
    hf_log('PROFILE update %s fields=%s'
           % (before['email'], ','.join(updates.keys())))
    return jsonify({'user': serialize_user(after)})


@bp.route('/users/me/avatar', methods=['POST'])
@auth_required
def avatar_from_url():
    data = _json_body()
    url = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'url is required'}), 400
    # "Import your avatar from anywhere on the internet": the server
    # fetches whatever URL it is given — including its own.
    req = urllib.request.Request(url, headers={'User-Agent': 'HexaFit/1.0'})
    with urllib.request.urlopen(req, timeout=4) as resp:
        status = resp.status
        content = resp.read(2_000_000)
    os.makedirs(AVATARS, exist_ok=True)
    fname = 'u%d_%d.bin' % (g.api_user['id'], int(time.time()))
    with open(os.path.join(AVATARS, fname), 'wb') as f:
        f.write(content)
    execute('UPDATE users SET avatar_file = ?, avatar_url = ? WHERE id = ?',
            (fname, '/avatars/' + fname, g.api_user['id']))
    host = urllib.parse.urlparse(url).hostname or ''
    if host in LOCAL_HOSTS and status == 200 and content:
        pass_test('ssrf-avatar')
        hf_log('AVATAR fetched internal URL %s (%d bytes stored)'
               % (url, len(content)))
    else:
        hf_log('AVATAR fetched %s (%d bytes)' % (url, len(content)))
    return jsonify({'avatar_url': '/avatars/' + fname,
                    'bytes': len(content)})


@bp.route('/users/<int:uid>/workouts')
@auth_required
def user_workouts(uid):
    # Broken object-level authorization: the id in the URL is trusted.
    # Whose workouts they are is never compared to the caller's token.
    rows = [dict(r) for r in query(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY id', (uid,))]
    if uid != g.api_user['id'] and rows:
        pass_test('bola')
        hf_log('BOLA user %s read %d workouts of user %d'
               % (g.api_user['email'], len(rows), uid))
    return jsonify({'workouts': rows})


# ---------------------------------------------------------------- workouts

@bp.route('/workouts', methods=['GET'])
@auth_required
def my_workouts():
    rows = [dict(r) for r in query(
        'SELECT * FROM workouts WHERE user_id = ? ORDER BY id',
        (g.api_user['id'],))]
    return jsonify({'workouts': rows})


@bp.route('/workouts', methods=['POST'])
@auth_required
def create_workout():
    data = _json_body()
    wid = execute(
        'INSERT INTO workouts (user_id, type, duration_min, calories, '
        'distance_km, notes, performed_on) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (g.api_user['id'], data.get('type') or 'Workout',
         int(data.get('duration_min') or 0), int(data.get('calories') or 0),
         float(data.get('distance_km') or 0), data.get('notes') or '',
         data.get('performed_on') or '2026-10-25'))
    hf_log('WORKOUT created #%d by %s' % (wid, g.api_user['email']))
    row = query_one('SELECT * FROM workouts WHERE id = ?', (wid,))
    return jsonify({'workout': dict(row)}), 201


@bp.route('/workouts/<wid>')
@auth_required
def get_workout(wid):
    # int() conversion of a raw path segment: hand it letters and the
    # exception walks straight into the verbose error handler.
    workout_id = int(wid)
    row = query_one('SELECT * FROM workouts WHERE id = ? AND user_id = ?',
                    (workout_id, g.api_user['id']))
    if row is None:
        return jsonify({'error': 'no such workout'}), 404
    return jsonify({'workout': dict(row)})


@bp.route('/workouts/export')
@auth_required
def export_workouts():
    name = request.args.get('file', '')
    # The export download joins the requested name straight onto the
    # exports folder. Nothing checks what the joined path points at.
    path = os.path.join(EXPORTS, name)
    if not name or not os.path.isfile(path):
        return jsonify({'error': 'no such export file'}), 404
    with open(path, 'rb') as f:
        content = f.read()
    resolved = os.path.realpath(path)
    if not resolved.startswith(os.path.realpath(EXPORTS) + os.sep) \
            and b'HEXAFIT' in content:
        pass_test('path-traversal')
        hf_log('EXPORT traversal served %s' % name)
    hf_log('EXPORT download %s' % name)
    return content, 200, {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="%s"'
                               % os.path.basename(name)}


# ---------------------------------------------------------------- rewards

@bp.route('/rewards/redeem', methods=['POST'])
@auth_required
def redeem():
    data = _json_body()
    item = data.get('item') or ''
    cost = REWARDS.get(item)
    if cost is None:
        return jsonify({'error': 'unknown reward item'}), 400
    user = query_one('SELECT * FROM users WHERE id = ?',
                     (g.api_user['id'],))
    balance = user['points']
    if balance < cost:
        return jsonify({'error': 'not enough points',
                        'points': balance}), 402
    # Check-then-act, with the "payment provider call" in between: the
    # balance is read, the request sleeps, then the deduction is written
    # from the stale read. Two requests in flight both see the old
    # balance, and both redeem.
    time.sleep(0.35)
    new_balance = balance - cost
    execute('UPDATE users SET points = ? WHERE id = ?',
            (new_balance, user['id']))
    execute('INSERT INTO redemptions (user_id, item, cost, balance_before, '
            'created_ts) VALUES (?, ?, ?, ?, ?)',
            (user['id'], item, cost, balance, time.time()))
    hf_log('REDEEM %s by %s (%d pts, balance %d -> %d)'
           % (item, user['email'], cost, balance, new_balance))
    recent = query('SELECT * FROM redemptions WHERE user_id = ? AND '
                   'created_ts > ?', (user['id'], time.time() - 15))
    spent = sum(r['cost'] for r in recent)
    richest_seen = max([r['balance_before'] for r in recent] + [0])
    if new_balance < 0 or (len(recent) >= 2 and spent > richest_seen):
        pass_test('race-points')
        hf_log('RACE double redemption detected for %s: %d redemptions, '
               '%d pts spent against a %d balance'
               % (user['email'], len(recent), spent, richest_seen))
    return jsonify({'redeemed': item, 'cost': cost, 'points': new_balance})


# ---------------------------------------------------------------- admin

@bp.route('/admin/stats')
@admin_required
def admin_stats():
    stats = {
        'users': query_one('SELECT COUNT(*) AS n FROM users')['n'],
        'workouts': query_one('SELECT COUNT(*) AS n FROM workouts')['n'],
        'premium_users': query_one(
            'SELECT COUNT(*) AS n FROM users WHERE is_premium = 1')['n'],
        'points_outstanding': query_one(
            'SELECT COALESCE(SUM(points), 0) AS n FROM users')['n'],
        'redemptions': query_one(
            'SELECT COUNT(*) AS n FROM redemptions')['n'],
    }
    return jsonify({'stats': stats})
