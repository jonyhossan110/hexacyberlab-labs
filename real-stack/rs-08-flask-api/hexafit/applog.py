"""Application log — the blue team reads this. Every request the app handles
is written here, API calls included, exactly like a real server's log."""
import datetime
import os

from flask import g, request

from .config import LOG_FILE


def hf_log(line):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    who = 'guest'
    user = getattr(g, 'api_user', None)
    if user:
        who = user['email']
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    entry = '[%s] %s %s %s\n' % (stamp, request.remote_addr or '-', who, line)
    with open(LOG_FILE, 'a') as f:
        f.write(entry)
