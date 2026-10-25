<?php
/* The 12 scored tests of RS-01, with a field hint for each. */
return [
    ['id' => 'sqli-login',      'name' => 'SQL Injection — login bypass',                'hint' => 'The login query is glued together. A classic quote-and-comment payload in the email field walks straight in.'],
    ['id' => 'sqli-union',      'name' => 'SQL Injection — UNION extraction',            'hint' => 'The product id is numeric and unquoted. UNION SELECT the users table into the product fields.'],
    ['id' => 'idor-order',      'name' => 'IDOR — read another customer\'s order',       'hint' => 'Order details never check ownership. Walk the id parameter while logged in as a customer.'],
    ['id' => 'xss-stored',      'name' => 'Stored XSS in a product review',              'hint' => 'Reviews are printed raw. Leave a review that carries markup and open the product page.'],
    ['id' => 'xss-reflected',   'name' => 'Reflected XSS in search',                     'hint' => 'The search term is echoed into the results page unescaped.'],
    ['id' => 'upload-shell',    'name' => 'Unrestricted avatar upload — web shell',      'hint' => 'Avatars keep their filename and land in /uploads/, where PHP files execute. Upload code, then visit it.'],
    ['id' => 'path-traversal',  'name' => 'Path traversal in the download feature',      'hint' => 'The file parameter is joined straight onto the folder. Climb out with ../ and read the app\'s secrets.'],
    ['id' => 'csrf-transfer',   'name' => 'CSRF — balance transfer without a token',     'hint' => 'The transfer form has no token. Fire the POST from another origin (or with no Referer) while the victim is logged in.'],
    ['id' => 'type-juggling',   'name' => 'PHP type juggling — loose == promo check',    'hint' => 'The staff promo compares your input to a magic 0e… hash with ==. In PHP, the number 0 equals any 0e… numeric string.'],
    ['id' => 'info-disclosure', 'name' => 'backup.sql left in the web root',             'hint' => 'Developers leave presents. Ask the server for the obvious filenames.'],
    ['id' => 'brute-force',     'name' => 'No login rate limiting',                      'hint' => 'Fail a login ten times for one account. Nothing slows down, nothing locks.'],
    ['id' => 'report',          'name' => 'Mini report — one professional finding',     'hint' => 'On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix.'],
];
