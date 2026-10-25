<?php
/* Code Review mode — second pass. Real source, with the flaws annotated. */
$notes = [
    'app/pages/login.php'   => 'The login query is built by string concatenation (SQL injection), and failed logins are never throttled or locked (brute force). Passwords are also compared in plaintext.',
    'app/pages/shop.php'    => 'Search builds a LIKE query by concatenation, and the search term is echoed into the page unescaped (reflected XSS).',
    'app/pages/product.php' => 'The product id is glued unquoted into SQL (UNION extraction), and review bodies are stored and printed raw (stored XSS).',
    'app/pages/order.php'   => 'The order is loaded by id alone; the owner is never compared to the logged-in user (IDOR).',
    'app/pages/account.php' => 'Three flaws: avatar upload keeps the original filename into a web-executed folder; the promo uses loose == against a magic hash (type juggling); the money transfer has no CSRF token.',
    'app/pages/download.php'=> 'The file parameter is joined directly onto the files/ folder — ../ walks out to .env and the config (path traversal).',
    'app/config.php'        => 'Debug left on, a database password from the old server still in the file, and the promo hash is a 0e… magic hash.',
    'public/backup.sql'     => 'A full database backup sitting in the web root, downloadable by anyone (information disclosure).',
    'router.php'            => 'The development router executes PHP files under /uploads/ like a classic misconfigured Apache — that is what turns an upload into a web shell.',
];
$file = $_GET['f'] ?? '';
layout_head('Code Review');
echo '<h1>🔍 Code Review — second pass</h1><p class="muted">On a real engagement you often get the source after (or instead of) black-box testing. Read each file, find the flaw yourself first — the note under each file confirms what was there.</p>';
foreach ($notes as $f => $note) {
    if ($file === $f) {
        $code = file_get_contents(LAB_ROOT . '/' . $f);
        echo '<h2>' . htmlspecialchars($f) . '</h2><div class="src">' . highlight_string($code, true) . '</div><p><b>What was wrong:</b> ' . htmlspecialchars($note) . '</p>';
    } else {
        echo '<div class="review"><a href="/lab/review?f=' . urlencode($f) . '"><b>' . htmlspecialchars($f) . '</b></a><p class="muted">' . htmlspecialchars($note) . '</p></div>';
    }
}
layout_foot();
