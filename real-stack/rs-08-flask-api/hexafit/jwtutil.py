"""Hand-rolled JSON Web Tokens (HS256), the way the founders wrote them
before anyone suggested using a library: base64url(header).base64url(
payload).base64url(HMAC-SHA256). The signing secret lives in config.py
and is the product's own name — see the jwt-weak test.
"""
import base64
import hashlib
import hmac
import json
import time

from .config import JWT_SECRET


def _b64e(raw):
    return base64.urlsafe_b64encode(raw).decode().rstrip('=')


def _b64d(text):
    return base64.urlsafe_b64decode(text + '=' * (-len(text) % 4))


def encode(payload, secret=JWT_SECRET):
    header = {'alg': 'HS256', 'typ': 'JWT'}
    p = dict(payload)
    p.setdefault('iat', int(time.time()))
    p.setdefault('exp', int(time.time()) + 3600 * 24)
    signing_input = '%s.%s' % (
        _b64e(json.dumps(header, separators=(',', ':')).encode()),
        _b64e(json.dumps(p, separators=(',', ':')).encode()))
    sig = hmac.new(secret.encode(), signing_input.encode(),
                   hashlib.sha256).digest()
    return signing_input + '.' + _b64e(sig)


def decode(token, secret=JWT_SECRET):
    """Verify signature and expiry. Raises ValueError on any problem."""
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError('not a JWT')
    header = json.loads(_b64d(parts[0]))
    if header.get('alg') != 'HS256':
        raise ValueError('unexpected alg')
    signing_input = parts[0] + '.' + parts[1]
    expected = hmac.new(secret.encode(), signing_input.encode(),
                        hashlib.sha256).digest()
    try:
        given = _b64d(parts[2])
    except Exception:
        raise ValueError('bad signature encoding')
    if not hmac.compare_digest(expected, given):
        raise ValueError('signature mismatch')
    payload = json.loads(_b64d(parts[1]))
    if payload.get('exp', 0) < int(time.time()):
        raise ValueError('token expired')
    return payload


def token_fingerprint(token):
    return hashlib.sha256(token.encode()).hexdigest()
