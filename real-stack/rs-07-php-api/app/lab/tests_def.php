<?php
/* The 12 scored tests of RS-07, with a field hint for each. */
return [
    ['id' => 'token-forgery',   'name' => 'Weak API token — predictable / forgeable',      'hint' => 'Tokens are not random secrets — look closely at the shape of the one login hands you, work out the recipe, then cook a token for an account that has never logged in and use it.'],
    ['id' => 'bola',            'name' => 'BOLA — another user\'s account object',         'hint' => 'Your token opens your account by id. The API checks that you are logged in — never whose id you asked for. Walk the account ids.'],
    ['id' => 'mass-assignment', 'name' => 'Mass assignment — balance via profile update',  'hint' => 'The profile update trusts the JSON field names you send — including one the profile screen never shows, tied directly to your wallet.'],
    ['id' => 'sqli-filter',     'name' => 'SQL Injection in an API filter',                'hint' => 'The transactions search glues a query parameter into its SQL. Make the filter return money movements that are not yours — or data that was never transactions at all.'],
    ['id' => 'excessive-data',  'name' => 'Excessive data exposure in responses',          'hint' => 'Some user responses carry far more than a client needs — including the very secrets several other tests are hunting. Read a full response body.'],
    ['id' => 'otp-brute',       'name' => 'No rate limit on OTP verification',             'hint' => 'Request a code, then guess. The verify endpoint never slows down and never locks — land the right 4-digit code after at least ten wrong ones.'],
    ['id' => 'ssrf-webhook',    'name' => 'Webhook URL SSRF',                              'hint' => 'Webhook test pings make the SERVER fetch your URL, from inside. Point one at an address only the server can reach, then read the delivery result.'],
    ['id' => 'cors-misconfig',  'name' => 'CORS reflects any origin with credentials',     'hint' => 'Call the API with a foreign Origin header and read the response headers carefully: what is reflected back, and what rides along with it?'],
    ['id' => 'stored-xss',      'name' => 'Stored XSS via API into the web view',          'hint' => 'Your display name is data in the API — and HTML in the dashboard. Set it through the API, then open the dashboard and look at what renders.'],
    ['id' => 'method-confusion','name' => 'State change over GET / method confusion',      'hint' => 'One state-changing endpoint answers more methods than it should. A plain GET link should never move money — check whether one here does.'],
    ['id' => 'race-transfer',   'name' => 'Race condition — double-spend a transfer',      'hint' => 'The balance is checked when a transfer is authorized — not when it is captured. Authorize first, capture afterwards, and make the maths break.'],
    ['id' => 'report',          'name' => 'Mini report — one professional finding',       'hint' => 'On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix.'],
];
