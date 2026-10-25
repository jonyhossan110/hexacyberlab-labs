"""HexaFit configuration — committed to git in the first week, never revisited."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The JSON Web Token signing secret. It is the product's own name: short,
# guessable, and in every dictionary an attacker would try first. Tokens
# are hand-rolled HS256 (see jwtutil.py) — no library ever warned anyone.
JWT_SECRET = 'hexafit'
JWT_ALGORITHM = 'HS256'

# Verbose API errors: exceptions are returned to the client as JSON with
# the full traceback and a slice of config, "to help the mobile team
# debug". They are still on in production.
VERBOSE_ERRORS = True

DATABASE = os.path.join(BASE_DIR, 'hexafit.db')
EXPORTS = os.path.join(BASE_DIR, 'exports')
AVATARS = os.path.join(BASE_DIR, 'avatars')
LOG_FILE = os.path.join(BASE_DIR, 'logs', 'app.log')

# Reward catalogue: name -> points cost.
REWARDS = {
    'protein-box': 100,
    'gym-towel': 250,
    'premium-month': 1000,
}
