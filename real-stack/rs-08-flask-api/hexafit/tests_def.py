"""The 12 scored tests of RS-08, with a field hint for each.
Ids and names are fixed by gateway/real-stack-index.json."""
TESTS = [
    {'id': 'jwt-weak',
     'name': 'JWT weak secret — crack and forge admin',
     'hint': 'Login tokens are HS256-signed with a secret the team chose '
             'for being easy to remember. Decode a token, look at what it '
             'claims, work out what signed it — then sign your own, with '
             'grander claims.'},
    {'id': 'bola',
     'name': 'BOLA — another user\'s workout records',
     'hint': 'The API serves workout lists per user id, straight from '
             'the URL. Your token says who you are; nothing checks that '
             'the id you asked for is you.'},
    {'id': 'sqli',
     'name': 'SQL Injection in the API',
     'hint': 'The user search endpoint builds its query around your '
             'input the string way. Quotes survive the trip, and the '
             'users table has columns the search was never meant to '
             'show.'},
    {'id': 'mass-assignment',
     'name': 'Mass assignment — premium flag',
     'hint': 'Registration and profile update build the record from the '
             'JSON you send — all of it, not just the fields the app '
             'documents. Some columns were never meant to be yours to '
             'set.'},
    {'id': 'data-exposure',
     'name': 'Serializer exposes every user field',
     'hint': 'Ask the API about other users and read the whole answer. '
             'The serializer returns the full database row; one of those '
             'fields should never leave the server.'},
    {'id': 'ssrf-avatar',
     'name': 'SSRF — avatar fetch from URL',
     'hint': 'The avatar importer fetches any URL you give it, from the '
             'server\'s network position. The server can reach things '
             'you cannot — starting with itself.'},
    {'id': 'xss-profile',
     'name': 'Stored XSS in the companion web profile',
     'hint': 'The API stores your bio, and the public web profile page '
             'prints it with escaping off. Set the trap through the API; '
             'it fires in the browser of anyone who views the page.'},
    {'id': 'brute-force',
     'name': 'Login brute force, no throttling',
     'hint': 'Fail a login ten times for one account and watch what '
             'doesn\'t happen: no lock, no delay, no challenge. Nothing '
             'stands between an attacker and a long password list.'},
    {'id': 'path-traversal',
     'name': 'Export download traversal',
     'hint': 'Workout exports download by filename, and the filename is '
             'joined straight onto the exports folder. The lab root — '
             'and its .env — is one directory up.'},
    {'id': 'debug-exposure',
     'name': 'Verbose API errors leak internals',
     'hint': 'Make the API trip over its own feet (a malformed id is '
             'enough) and read the error like a document: paths, '
             'tracebacks, and live config values are all in the reply.'},
    {'id': 'race-points',
     'name': 'Race condition — redeem points twice',
     'hint': 'Points redemption checks your balance, pauses, then '
             'deducts. Two requests inside the pause both pass the '
             'check. A premium member with 150 points and a 100-point '
             'reward is the natural place to try.'},
    {'id': 'report',
     'name': 'Mini report — one professional finding',
     'hint': 'On the Complete page, write up one flaw like you would '
             'for a client: title, severity, evidence, impact, fix.'},
]
