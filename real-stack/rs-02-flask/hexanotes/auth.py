"""Authentication, the homemade way.

The founders did not trust Flask's session docs, so they invented their
own cookie: base64 of the user id. It is not signed, not encrypted, and
not checked against anything — whoever presents a number IS that user.
A second cookie (hn_via) marks sessions that came through the real login
form, which is how the lab can tell a forged cookie from a genuine one.
"""
import base64

from flask import g, make_response, redirect, request

from .applog import hn_log
from .db import query_one
from .progress import pass_test

COOKIE = 'hn_session'
VIA = 'hn_via'


def _b64(user_id):
    return base64.urlsafe_b64encode(str(user_id).encode()).decode().rstrip('=')


def current_user():
    if getattr(g, '_user_resolved', False):
        return g.user
    g._user_resolved = True
    g.user = None
    g.forged_session = False
    raw = request.cookies.get(COOKIE)
    if raw:
        try:
            padded = raw + '=' * (-len(raw) % 4)
            user_id = int(base64.urlsafe_b64decode(padded).decode())
        except Exception:
            user_id = None
        if user_id is not None:
            row = query_one('SELECT * FROM users WHERE id = ?', (user_id,))
            if row is not None:
                g.user = dict(row)
                via = request.cookies.get(VIA)
                if via != raw:
                    # A valid session cookie with no matching login marker:
                    # this identity was assembled by hand, not by the form.
                    g.forged_session = True
    return g.user


def check_forged_session():
    """Called once per request from the app factory."""
    user = current_user()
    if user and getattr(g, 'forged_session', False):
        pass_test('session-cookie')
        hn_log('SESSION forged cookie accepted as %s (no login marker)'
               % user['email'])


def login_response(user_id, target):
    resp = make_response(redirect(target))
    value = _b64(user_id)
    resp.set_cookie(COOKIE, value, httponly=True)
    resp.set_cookie(VIA, value, httponly=True)
    return resp


def logout_response():
    resp = make_response(redirect('/'))
    resp.delete_cookie(COOKIE)
    resp.delete_cookie(VIA)
    return resp
