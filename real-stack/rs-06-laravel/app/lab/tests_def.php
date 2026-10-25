<?php
/* The 12 scored tests of RS-06, with a field hint for each. */
return [
    ['id' => 'mass-assignment', 'name' => 'Mass assignment — guarded=[] model fill',      'hint' => 'The profile update fills the User model straight from the request, and this model guards nothing. Fields the form never shows — plan, is_admin — are accepted too.'],
    ['id' => 'blade-xss',       'name' => 'Unescaped {!! !!} Blade-style output XSS',     'hint' => 'One view prints a stored field with the raw {!! !!} syntax instead of {{ }}. Client notes are treated as "trusted HTML" — see whose screen they land on.'],
    ['id' => 'sqli-raw',        'name' => 'Raw query SQL Injection',                      'hint' => 'Client search runs a raw query with the term glued in. The workspace scope lives in the same string — break the quotes and the scope goes with it.'],
    ['id' => 'idor-invoice',    'name' => 'IDOR — another client\'s invoice',            'hint' => 'Invoice pages check that you are signed in, never which workspace the invoice belongs to. Walk the ids across accounts.'],
    ['id' => 'csrf-missing',    'name' => 'Route missing CSRF middleware',              'hint' => 'Almost every form carries the _token. One state-changing invoice action was wired without it. Find it, then fire it cross-site style — no token, no Referer.'],
    ['id' => 'debug-exposure',  'name' => 'APP_DEBUG error page leaks env',               'hint' => 'APP_DEBUG is on in production. Make the app throw — a certain report export is obliging — and read what the error page prints.'],
    ['id' => 'upload-attachment','name' => 'Attachment upload without validation',       'hint' => 'Invoice attachments accept any file, keep the name, and land in web-reachable storage where PHP runs. Upload one, then visit it.'],
    ['id' => 'path-traversal',  'name' => 'Invoice PDF download traversal',              'hint' => 'The export download joins your file parameter onto the storage folder. Climb out with ../ and read what the app itself reads.'],
    ['id' => 'brute-force',     'name' => 'Login throttle disabled',                     'hint' => 'The login throttle was "temporarily" disabled. Fail ten logins on one account — nothing slows down, nothing locks.'],
    ['id' => 'api-token',       'name' => 'Plaintext API token exposed in profile',      'hint' => 'Tokens are stored in plaintext and rendered on a page where colleagues can see them. Find another user\'s token and use it against /api/invoices.'],
    ['id' => 'open-redirect',   'name' => 'Open redirect on intended URL',                'hint' => 'Login honours an "intended" destination a little too literally. Get it to send a freshly logged-in user somewhere that is not this site.'],
    ['id' => 'report',          'name' => 'Mini report — one professional finding',       'hint' => 'On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix.'],
];
