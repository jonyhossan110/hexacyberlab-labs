<?php
/* Code Review — written like real audit notes over the legacy source. */
$notes = [
    'public/login.php'    => 'AUDIT NOTE — concatenated login query (SQLi); passwords MD5\'d before comparison which limits password-field injection but not username injection; session id not regenerated on success (fixation); no throttling. Severity: Critical.',
    'public/search.php'   => 'AUDIT NOTE — the LIKE query is built from raw input; UNION SELECT maps cleanly onto the five hotel columns and the users table obliges, MD5 hashes included. Also reflects the search term unescaped. Severity: Critical.',
    'public/page.php'     => 'AUDIT NOTE — include() of a user-named file with zero sanitisation. ../ walks straight out of pages/ to inc/config.php; the config\'s canary constant proves the read. Any readable .php on the box is includable. Severity: High.',
    'public/guestbook.php'=> 'AUDIT NOTE — entries stored and echoed raw, name and message both. Stored XSS for every future visitor, including staff. Severity: High.',
    'public/booking.php'  => 'AUDIT NOTE — booking fetched by id alone; the owner is never compared with the session user. Full guest PII (names, phones, notes incl. a key-box code) readable by any customer. Severity: High.',
    'public/account.php'  => 'AUDIT NOTE — photo upload: original filename, no type check, into uploads/ which the server executes. Upload-to-shell in one request. Severity: Critical.',
    'public/admin.php'    => 'AUDIT NOTE — three findings in one file: user creation is a tokenless GET (CSRF to a brand-new admin); the photo import fetches arbitrary URLs server-side (SSRF, file:// included); the user table prints every MD5 hash "for support". Severity: Critical.',
    'public/hotel.php'    => 'AUDIT NOTE — extract($_GET) survives from the register_globals era and the id goes unquoted into SQL. Variable overwrite plus injection in a single page. Severity: High.',
    'inc/config.php'      => 'AUDIT NOTE — debug on in production, the database master password in a file that an LFI can include, and a .old copy of this config sitting in the web root (see config.old). Severity: High.',
    'public/backup.sql'   => 'AUDIT NOTE — a full database dump in the web root: every user, every MD5, every booking. One GET. Severity: Critical.',
    'inc/common.php'      => 'AUDIT NOTE — session_start() everywhere, regeneration nowhere; the issued-id ledger kept here is the only reason the fixation is even visible. Booking data access relies entirely on per-page checks that booking.php forgot. Severity: Medium (systemic).',
    'router.php'          => 'AUDIT NOTE — the dev-server stand-in for the old Apache config: it faithfully reproduces the two decisions that hurt — PHP executes in uploads/, and leftover files in the web root are served to anyone.',
];
$file = $_GET['f'] ?? '';
require_once __DIR__ . '/../layout.php';
lab_head('Code Review');
echo '<h1>🔍 Code Review — the auditor\'s second pass</h1><p class="muted">These are working audit notes, not a tutorial: each file\'s note states the finding and its severity the way it would land in the report. Open a file to read the source behind the note.</p>';
foreach ($notes as $f => $note) {
    if ($file === $f) {
        $code = file_get_contents(LAB_ROOT . '/' . $f);
        echo '<h2>' . htmlspecialchars($f) . '</h2><div class="src">' . highlight_string($code, true) . '</div><p>' . htmlspecialchars($note) . '</p>';
    } else {
        echo '<div class="review"><a href="/lab/review?f=' . urlencode($f) . '"><b>' . htmlspecialchars($f) . '</b></a><p class="muted">' . htmlspecialchars($note) . '</p></div>';
    }
}
lab_foot();
