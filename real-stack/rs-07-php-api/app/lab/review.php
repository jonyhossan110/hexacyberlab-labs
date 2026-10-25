<?php
/* Code Review mode — second pass. Real source, with the flaws annotated. */
$notes = [
    'app/api.php'          => 'The token scheme: a token is "hp_" . md5(email) — derived from a public value, not random. api_auth() even accepts a correctly derived token that was never issued (token forgery). hp_cors() reflects any Origin back with credentials allowed (CORS misconfiguration).',
    'app/api_handlers.php' => 'The endpoint layer: /api/accounts/{id} checks login, never ownership (BOLA). PATCH /api/me maps client field names straight onto the user row — role included — and applies a balance field onto the wallet (mass assignment). The transactions search glues filter and sort into SQL (injection). hp_user_public() responses carry password hashes and tokens (excessive data). OTP verify has no attempt cap (brute force). Transfers check balance at authorize time and never re-check at capture (race), and the capture route also answers GET (method confusion).',
    'app/fetch_worker.php' => 'The webhook delivery worker fetches any URL it is given — private ranges, localhost, even non-HTTP schemes — with no allow-list or egress rules (SSRF). Deliveries are async, like real webhook systems.',
    'app/pages/dashboard.php' => 'The web view prints display names — settable through the API — without escaping, in the welcome line and the contact directory (stored XSS). JSON data became HTML.',
    'app/db.php'           => 'Passwords are stored as bare SHA-256: a fast hash, so any leaked hash falls to GPU cracking in minutes. Real systems use a slow, salted KDF (password_hash / Argon2id).',
    'public/index.php'     => 'The front controller: CORS headers are applied to every API response, verbose errors are on (debug), and the route table shows capture answering both POST and GET.',
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
