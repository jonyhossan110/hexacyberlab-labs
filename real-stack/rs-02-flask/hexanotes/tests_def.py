"""The 12 scored tests of RS-02, with a field hint for each.
Ids and names are fixed by gateway/real-stack-index.json."""
TESTS = [
    {'id': 'ssti',
     'name': 'SSTI — Jinja2 template injection to RCE',
     'hint': 'The landing page greets you by name. That greeting is not a '
             'template file — it is assembled as a string, with your name '
             'inside it, and then rendered.'},
    {'id': 'debug-console',
     'name': 'Werkzeug debug mode left enabled',
     'hint': 'A Flask app run with debug on grows an extra route the '
             'developers forgot about. Its PIN is printed in the server '
             'console output — the gateway shows that output. Prove code '
             'execution by writing a file named console_proof.txt into '
             'the app\'s logs folder.'},
    {'id': 'sqli-search',
     'name': 'SQL Injection in note search',
     'hint': 'Search builds its query by gluing your words straight into '
             'the SQL. Quotes are not filtered, and other people\'s '
             'private notes are one clause away.'},
    {'id': 'idor-note',
     'name': 'IDOR — read another user\'s note',
     'hint': 'Note URLs are plain numbers, and the note view never asks '
             'whose note it is. Walk the id while logged in as someone '
             'else.'},
    {'id': 'xss-stored',
     'name': 'Stored XSS in a shared note',
     'hint': 'Shared notes are rendered with Jinja escaping switched off '
             'for the body. Leave markup in a shared note and have it '
             'viewed.'},
    {'id': 'session-cookie',
     'name': 'Guessable session cookie (base64 user id)',
     'hint': 'Look at your session cookie closely. Decode it. It is not '
             'signed — it is barely even dressed up. Become user 1.'},
    {'id': 'path-traversal',
     'name': 'Attachment download traversal',
     'hint': 'The download joins your filename straight onto the '
             'attachments folder. The app\'s own files — its config, its '
             '.env, its source — live one level up.'},
    {'id': 'csrf-profile',
     'name': 'CSRF — profile change without a token',
     'hint': 'The profile form carries no token of any kind. Fire the '
             'POST from another origin (or with no Referer at all) while '
             'the victim is logged in.'},
    {'id': 'open-redirect',
     'name': 'Open redirect on the login next parameter',
     'hint': 'After a successful login the app sends you wherever the '
             '"next" parameter says — anywhere at all, on any domain.'},
    {'id': 'password-storage',
     'name': 'Passwords stored as MD5',
     'hint': 'Find any 32-hex-character password hash inside the app '
             '(your own profile shows yours). MD5 is fast and unsalted: '
             'crack it with any wordlist tool and submit the plaintext '
             'on the Complete page.'},
    {'id': 'mass-assignment',
     'name': 'Mass assignment — role field on registration',
     'hint': 'The register form shows three fields, but the insert is '
             'built from the submitted form as a whole — including '
             'fields the form never displayed.'},
    {'id': 'report',
     'name': 'Mini report — one professional finding',
     'hint': 'On the Complete page, write up one flaw like you would for '
             'a client: title, severity, evidence, impact, fix.'},
]
