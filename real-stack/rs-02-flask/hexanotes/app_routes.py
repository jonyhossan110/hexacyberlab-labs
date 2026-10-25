"""HexaNotes application routes — the product itself.

Kept in one file the way a two-person startup would. The flaws in here are
the lab: each is commented the way the original developer would have
justified it, and each detection fires only when the action's result
actually happens (RS-01 style).
"""
import hashlib
import os
import re

from flask import (Blueprint, abort, redirect, render_template,
                   render_template_string, request, send_file)

from .applog import hn_log
from .auth import current_user, login_response, logout_response
from .config import ATTACHMENTS, BASE_DIR
from .db import execute, query, query_one
from .progress import attempt, pass_test
from .seed import md5

bp = Blueprint('app', __name__)

SSTI_TOKEN = 'HEXANOTES-SSTI-PROOF-7f3a'
MARKUP = ('<script', 'onerror', '<svg', '<img', '<iframe', '<details',
          '<math', '<body', '<video', 'onload', 'onclick')


def _hostport():
    host = request.host or ''
    return host


@bp.route('/', methods=['GET', 'POST'])
def index():
    user = current_user()
    if user:
        return redirect('/dashboard')
    greeting = None
    err = None
    if request.method == 'POST':
        name = request.form.get('name', '')
        # The greeting is assembled as a string and rendered as a template,
        # because the founder wanted "smart greetings". User input inside
        # render_template_string is server-side template injection.
        tpl = ('<h2>Welcome, ' + name + ' 👋</h2>'
               '<p>HexaNotes is where your team\'s thinking lives. '
               'Start free — no card, no fuss.</p>')
        try:
            rendered = render_template_string(tpl)
        except Exception as exc:  # debug-style: the error is shown, not hidden
            rendered = None
            err = 'Template error: %s' % exc
        if rendered is not None:
            greeting = rendered
            evaluated = ('{{' in name or '{%' in name) and rendered != tpl
            if SSTI_TOKEN in rendered or evaluated:
                pass_test('ssti')
                hn_log('SSTI greeting template evaluated attacker input')
    return render_template('index.html', greeting=greeting, err=err)


@bp.route('/login', methods=['GET', 'POST'])
def login():
    user = current_user()
    if user:
        return redirect('/dashboard')
    next_url = request.values.get('next', '/dashboard')
    msg = ''
    if request.method == 'POST':
        email = request.form.get('email', '')
        password = request.form.get('password', '')
        row = query_one('SELECT * FROM users WHERE email = ?',
                        (email,))
        if row is not None and row['password_hash'] == md5(password):
            hn_log('LOGIN ok %s' % email)
            # The "next" target is honoured without any validation —
            # an absolute URL leaves the site entirely (open redirect).
            if next_url.startswith('http://') or \
                    next_url.startswith('https://') or \
                    next_url.startswith('//'):
                pass_test('open-redirect')
                hn_log('LOGIN redirect honoured external next=%s' % next_url)
            return login_response(row['id'], next_url)
        attempt('login:' + email.lower())
        hn_log('LOGIN fail %s' % email)
        msg = 'Invalid email or password.'
    return render_template('login.html', msg=msg, next_url=next_url)


@bp.route('/register', methods=['GET', 'POST'])
def register():
    user = current_user()
    if user:
        return redirect('/dashboard')
    msg = ''
    if request.method == 'POST':
        form = dict(request.form)
        name = form.get('name', '').strip()
        email = form.get('email', '').strip().lower()
        password = form.get('password', '')
        # The insert is built from whatever the form carried. The visible
        # form has three fields; nothing stops a fourth (role) arriving.
        role = form.get('role', 'user')
        if role not in ('user', 'admin'):
            role = 'user'
        if not name or not email or not password:
            msg = 'All fields are required.'
        elif query_one('SELECT id FROM users WHERE email = ?', (email,)):
            msg = 'That email is already registered.'
        else:
            uid = execute(
                'INSERT INTO users (name, email, password_hash, role, bio) '
                'VALUES (?,?,?,?,?)',
                (name, email, md5(password), role, ''))
            hn_log('REGISTER %s role=%s' % (email, role))
            if role == 'admin' and 'role' in form:
                pass_test('mass-assignment')
                hn_log('MASS-ASSIGN role=admin accepted at registration')
            return login_response(uid, '/dashboard')
    return render_template('register.html', msg=msg)


@bp.route('/logout')
def logout():
    return logout_response()


@bp.route('/dashboard')
def dashboard():
    user = current_user()
    if not user:
        return redirect('/login?next=/dashboard')
    mine = query('SELECT * FROM notes WHERE owner_id = ? ORDER BY id DESC',
                 (user['id'],))
    shared = query(
        'SELECT n.*, u.name AS author FROM notes n JOIN users u '
        'ON u.id = n.owner_id WHERE n.shared = 1 AND n.owner_id != ? '
        'ORDER BY n.id DESC', (user['id'],))
    return render_template('dashboard.html', mine=mine, shared=shared)


@bp.route('/search')
def search():
    user = current_user()
    if not user:
        return redirect('/login?next=/search')
    q = request.args.get('q', '')
    rows, err = [], ''
    if q:
        # Search was "optimised" by gluing the words straight into SQL.
        sql = ("SELECT n.*, u.name AS author FROM notes n "
               "JOIN users u ON u.id = n.owner_id "
               "WHERE (n.owner_id = " + str(user['id']) + " OR n.shared = 1) "
               "AND (n.title LIKE '%" + q + "%' OR n.body LIKE '%" + q + "%') "
               "ORDER BY n.id DESC")
        try:
            rows = query(sql)
        except Exception as exc:
            err = 'Database error: %s' % exc
        if "'" in q:
            for r in rows:
                # Private notes of OTHER users in the results = extraction.
                if r['owner_id'] != user['id'] and not r['shared']:
                    pass_test('sqli-search')
                    hn_log('SQLI search returned private notes of others')
                    break
                # UNION-style exfiltration drags a hash into the results.
                for v in dict(r).values():
                    if isinstance(v, str) and \
                            re.fullmatch(r'[0-9a-f]{32}', v or ''):
                        pass_test('sqli-search')
                        hn_log('SQLI search exfiltrated a password hash')
                        break
    return render_template('search.html', q=q, rows=rows, err=err)


@bp.route('/note/new', methods=['GET', 'POST'])
def note_new():
    user = current_user()
    if not user:
        return redirect('/login?next=/note/new')
    if request.method == 'POST':
        title = request.form.get('title', '').strip() or 'Untitled'
        body = request.form.get('body', '')
        shared = 1 if request.form.get('shared') else 0
        attach_name = None
        upload = request.files.get('attachment')
        if upload is not None and upload.filename:
            safe = os.path.basename(upload.filename)
            attach_name = 'up_%d_%s' % (user['id'], safe)
            dest_dir = os.path.join(ATTACHMENTS, 'uploads')
            os.makedirs(dest_dir, exist_ok=True)
            upload.save(os.path.join(dest_dir, attach_name))
        nid = execute(
            'INSERT INTO notes (owner_id, title, body, shared, attach_name) '
            'VALUES (?,?,?,?,?)', (user['id'], title, body, shared, attach_name))
        hn_log('NOTE created #%s shared=%s' % (nid, shared))
        return redirect('/note/%d' % nid)
    return render_template('note_new.html')


@bp.route('/note/<int:nid>')
def note_view(nid):
    user = current_user()
    if not user:
        return redirect('/login?next=/note/%d' % nid)
    # The note is loaded by id alone. Ownership is never compared —
    # any logged-in user can read any note, shared or not (IDOR).
    row = query_one('SELECT n.*, u.name AS author FROM notes n '
                    'JOIN users u ON u.id = n.owner_id WHERE n.id = ?',
                    (nid,))
    if row is None:
        abort(404)
    if row['owner_id'] != user['id'] and not row['shared']:
        pass_test('idor-note')
        hn_log('IDOR note #%s (owner %s) read by %s'
               % (nid, row['owner_id'], user['email']))
    body = row['body'] or ''
    if row['shared'] and row['owner_id'] != user['id'] and \
            any(m in body.lower() for m in MARKUP):
        # The body was rendered with |safe and the markup reached a
        # different user's browser — the stored payload has landed.
        pass_test('xss-stored')
        hn_log('XSS stored payload in shared note #%s viewed by %s'
               % (nid, user['email']))
    return render_template('note_view.html', note=row)


@bp.route('/attachment/<path:name>')
def attachment(name):
    user = current_user()
    if not user:
        return redirect('/login')
    base = os.path.normpath(ATTACHMENTS)
    target = os.path.normpath(os.path.join(base, name))
    looks_traversal = ('..' in name or '/' in name or
                       os.path.basename(name) != name or
                       name.rsplit('.', 1)[-1].lower() in
                       ('env', 'py', 'json', 'db', 'md'))
    if looks_traversal:
        # The filename is joined straight onto the folder and served.
        # ../ climbs out of attachments/ into the app itself.
        if os.path.isfile(target):
            if not target.startswith(base + os.sep):
                pass_test('path-traversal')
                hn_log('TRAVERSAL served %s outside attachments/' % name)
            return send_file(target, as_attachment=True,
                             download_name=os.path.basename(target))
        abort(404)
    if name.startswith('up_'):
        note = query_one('SELECT * FROM notes WHERE attach_name = ?',
                         (name,))
        if note is not None and (note['owner_id'] == user['id']
                                 or note['shared']):
            path = os.path.join(base, 'uploads', name)
            if os.path.isfile(path):
                return send_file(path, as_attachment=True,
                                 download_name=name)
        abort(403)
    # Team files that ship with the workspace fixtures.
    if os.path.isfile(target):
        return send_file(target, as_attachment=True, download_name=name)
    abort(404)


@bp.route('/profile', methods=['GET', 'POST'])
def profile():
    user = current_user()
    if not user:
        return redirect('/login?next=/profile')
    msg = ''
    if request.method == 'POST':
        name = request.form.get('name', user['name'])
        bio = request.form.get('bio', '')
        avatar_url = request.form.get('avatar_url', '')
        website = request.form.get('website', '')
        # No CSRF token exists anywhere in this app. A state-changing
        # POST that arrives with no token, from a foreign origin or with
        # no Referer at all, is a forgery — and it succeeds.
        execute('UPDATE users SET name = ?, bio = ?, avatar_url = ?, '
                'website = ? WHERE id = ?',
                (name, bio, avatar_url, website, user['id']))
        referer = request.headers.get('Referer', '')
        ref_host = re.sub(r'^https?://', '', referer).split('/')[0]
        if not referer or ref_host != _hostport():
            pass_test('csrf-profile')
            hn_log('CSRF profile update accepted (referer=%s)'
                   % (referer or 'none'))
        hn_log('PROFILE updated for %s' % user['email'])
        msg = 'Profile saved.'
        user = dict(query_one('SELECT * FROM users WHERE id = ?',
                              (user['id'],)))
    return render_template('profile.html', msg=msg, profile_user=user)


@bp.route('/invite', methods=['GET', 'POST'])
def invite():
    user = current_user()
    if not user:
        return redirect('/login?next=/invite')
    msg = ''
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        role = request.form.get('role', 'user')
        if role not in ('user', 'admin'):
            role = 'user'
        if not email:
            msg = 'An email is required.'
        elif query_one('SELECT id FROM users WHERE email = ?', (email,)):
            msg = 'That email is already in the workspace.'
        else:
            # Any signed-in user can invite — and the role comes straight
            # from the form. Inviting an "admin" is one request away.
            execute('INSERT INTO users (name, email, password_hash, role, '
                    'bio) VALUES (?,?,?,?,?)',
                    ('Invited teammate', email, md5('Welcome!123'), role,
                     'Invited by %s' % user['email']))
            hn_log('INVITE %s as role=%s by %s' % (email, role,
                                                   user['email']))
            if role == 'admin':
                pass_test('mass-assignment')
                hn_log('MASS-ASSIGN invite created an admin account')
            msg = 'Invitation sent to %s (as %s).' % (email, role)
    return render_template('invite.html', msg=msg)


@bp.route('/admin')
def admin():
    user = current_user()
    if not user:
        return redirect('/login?next=/admin')
    if user['role'] != 'admin':
        return render_template('admin_denied.html'), 403
    users = query('SELECT * FROM users ORDER BY id')
    counts = query_one('SELECT COUNT(*) AS n FROM notes')
    return render_template('admin.html', users=users,
                           note_count=counts['n'])
