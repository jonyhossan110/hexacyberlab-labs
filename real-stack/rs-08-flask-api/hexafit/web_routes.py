"""The small server-rendered companion site: a landing page that documents
the API, and the public web profile page members link to from Strava and
Instagram. The profile page is rendered with Jinja2 — and the bio is
printed with escaping switched off, because "members kept asking for
links in their bios". That is the xss-profile test.
"""
import os

from flask import (Blueprint, render_template, send_from_directory)

from .config import AVATARS
from .db import query, query_one
from .progress import pass_test
from .applog import hf_log

bp = Blueprint('web', __name__)


@bp.route('/')
def index():
    return render_template('index.html')


@bp.route('/profile/<int:uid>')
def profile(uid):
    user = query_one('SELECT * FROM users WHERE id = ?', (uid,))
    if user is None:
        return render_template('profile.html', user=None), 404
    workouts = query('SELECT * FROM workouts WHERE user_id = ? '
                     'ORDER BY performed_on DESC LIMIT 5', (uid,))
    html = render_template('profile.html', user=dict(user),
                           workouts=workouts)
    bio = user['bio'] or ''
    # Stored XSS is only real when the markup is actually served raw to
    # a viewer — so the pass is recorded here, at render time.
    if '<' in bio and bio in html:
        pass_test('xss-profile')
        hf_log('PROFILE raw bio markup served for user %s' % user['email'])
    return html


@bp.route('/avatars/<path:name>')
def avatar(name):
    return send_from_directory(AVATARS, name)
