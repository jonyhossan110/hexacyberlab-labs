"""The 12 scored tests of RS-05, with a field hint for each.
Ids and names are fixed by gateway/real-stack-index.json."""
TESTS = [
    {'id': 'orm-sqli',
     'name': 'Raw SQL injection beside the ORM',
     'hint': 'Record search was written before the team learned the ORM, '
             'and it still builds its query by gluing your words into a '
             'raw() call. Quotes are not filtered, and other patients\' '
             'records are one clause away.'},
    {'id': 'debug-page',
     'name': 'DEBUG=True error page leaks settings',
     'hint': 'This portal never stopped being a development build. '
             'Make it crash — a record URL with something that is not a '
             'number is a good start — and read what Django tells '
             'strangers for free.'},
    {'id': 'idor-record',
     'name': 'IDOR — another patient\'s record',
     'hint': 'Record URLs are plain numbers, and the record view never '
             'asks whose record it is. Walk the id while logged in as a '
             'patient.'},
    {'id': 'xss-safe-filter',
     'name': 'XSS via |safe template filter',
     'hint': 'The care team wanted formatting in record messages, so '
             'the template renders them with the |safe filter. Leave '
             'markup in a record message and have someone else open '
             'the record.'},
    {'id': 'csrf-exempt',
     'name': 'csrf_exempt endpoint changes state',
     'hint': 'Cancelling an appointment kept failing the clinic\'s old '
             'mobile app, so a developer exempted it from CSRF checks '
             'entirely. Fire the cancel POST with no token and no '
             'Referer while the victim is logged in.'},
    {'id': 'mass-assignment',
     'name': 'ModelForm mass assignment (is_staff)',
     'hint': 'One ModelForm serves both the staff console and your '
             'profile page — and it includes a field that was never '
             'meant for patients. The profile form renders every field '
             'it is given.'},
    {'id': 'path-traversal',
     'name': 'Media download traversal',
     'hint': 'The results download joins your filename straight onto '
             'the media folder. The project\'s own files — settings, '
             'the .env — live a few levels up.'},
    {'id': 'password-storage',
     'name': 'Weak password hasher configured (MD5)',
     'hint': 'Settings put the MD5 hasher first "until the migration '
             'finishes", and your profile page helpfully shows your '
             'stored hash for the legacy sync. Crack one offline and '
             'submit the plaintext on the Complete page.'},
    {'id': 'session-fixation',
     'name': 'Session not rotated at login',
     'hint': 'The portal\'s hand-rolled login sets the user into '
             'whatever session already exists and never cycles the '
             'key. Note your sessionid cookie before you log in, then '
             'compare it afterwards.'},
    {'id': 'ssrf-import',
     'name': 'SSRF — import record from URL',
     'hint': '"Import a record from another clinic" fetches any URL '
             'the server can reach — including the portal\'s own '
             'unlinked internal health-export endpoint on this same '
             'host and port.'},
    {'id': 'default-credentials',
     'name': 'Admin panel with default credentials',
     'hint': 'The Django admin sits at the usual address. The account '
             'created by the installer on day one was never renamed or '
             'given a real password — try the pair every runbook starts '
             'with.'},
    {'id': 'report',
     'name': 'Mini report — submit one professional finding',
     'hint': 'On the Complete page, write up one flaw like you would '
             'for a client: title, severity, evidence, impact, fix.'},
]
