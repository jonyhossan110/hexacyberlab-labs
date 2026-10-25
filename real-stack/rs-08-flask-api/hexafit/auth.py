"""Bearer-token authentication for the API.

Login issues a hand-rolled HS256 JWT (jwtutil.py) and records a hash of
every issued token in the issued_tokens table. Authorization trusts the
token's CLAIMS (role / is_admin) rather than the database row — so a
token whose claims were edited is exactly as powerful as it says it is,
as long as the signature checks out. The signature secret is the weak
part: see config.py.
"""
import functools

from flask import g, jsonify, request

from . import jwtutil
from .applog import hf_log
from .db import query_one
from .progress import pass_test


def issue_token(user):
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'role': 'admin' if user['is_admin'] else 'user',
        'is_admin': bool(user['is_admin']),
        'is_premium': bool(user['is_premium']),
    }
    token = jwtutil.encode(payload)
    from .db import execute
    import time
    execute('INSERT OR REPLACE INTO issued_tokens (token_hash, user_id, '
            'created_ts) VALUES (?, ?, ?)',
            (jwtutil.token_fingerprint(token), user['id'], time.time()))
    return token


def _authenticate():
    """Resolve the bearer token. Returns (user_row, claims) or (None, None).
    A token that verifies but was never issued by login, and that carries
    admin claims, is precisely the jwt-weak test."""
    if getattr(g, '_auth_resolved', False):
        return g._auth_user, g._auth_claims
    g._auth_resolved = True
    g._auth_user, g._auth_claims = None, None
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None, None
    token = header[len('Bearer '):].strip()
    try:
        claims = jwtutil.decode(token)
    except Exception:
        return None, None
    user = query_one('SELECT * FROM users WHERE id = ?',
                     (claims.get('sub'),))
    if user is None:
        return None, None
    issued = query_one('SELECT token_hash FROM issued_tokens WHERE '
                       'token_hash = ?',
                       (jwtutil.token_fingerprint(token),))
    if issued is None and (claims.get('is_admin') or
                           claims.get('role') == 'admin'):
        pass_test('jwt-weak')
        hf_log('JWT accepted that login never issued, with admin claims, '
               'as %s' % user['email'])
    g._auth_user, g._auth_claims = user, claims
    return user, claims


def auth_required(view):
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        user, claims = _authenticate()
        if user is None:
            return jsonify({'error': 'missing or invalid bearer token'}), 401
        g.api_user = dict(user)
        g.claims = claims
        return view(*args, **kwargs)
    return wrapper


def admin_required(view):
    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        user, claims = _authenticate()
        if user is None:
            return jsonify({'error': 'missing or invalid bearer token'}), 401
        g.api_user = dict(user)
        g.claims = claims
        # The check reads the token's claims, not the database — a forged
        # claim set is a forged permission set.
        if not (claims.get('is_admin') or claims.get('role') == 'admin'):
            return jsonify({'error': 'admin only'}), 403
        return view(*args, **kwargs)
    return wrapper
