"""Application log — the blue team reads this. Every request the app
handles is written here, exactly like a real server's log."""
import datetime
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE = os.path.join(BASE_DIR, 'logs', 'app.log')


def hc_log(request, line):
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    who = 'guest'
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'is_authenticated', False):
        who = user.email or user.username
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    entry = '[%s] %s %s %s\n' % (stamp, request.META.get('REMOTE_ADDR', '-'),
                                 who, line)
    try:
        with open(LOG_FILE, 'a') as f:
            f.write(entry)
    except OSError:
        pass
