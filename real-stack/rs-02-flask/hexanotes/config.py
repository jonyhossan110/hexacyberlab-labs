"""HexaNotes configuration — copied from the founders' laptops in 2021."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The Werkzeug debugger is enabled in the deployed app. The PIN is printed
# in the server console output at startup — and the console is reachable
# over HTTP. This is the "debug-console" test, and a real-world classic.
DEBUG = True

# Hardcoded and committed to git. A real Flask session would be signed with
# this; HexaNotes later bolted on a homemade cookie instead (see auth.py).
SECRET_KEY = 'hexanotes-dev-secret-2019'

DATABASE = os.path.join(BASE_DIR, 'notes.db')
ATTACHMENTS = os.path.join(BASE_DIR, 'attachments')
LOG_FILE = os.path.join(BASE_DIR, 'logs', 'app.log')
