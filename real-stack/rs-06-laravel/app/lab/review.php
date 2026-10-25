<?php
/* Code Review mode — second pass. Real source, with the flaws annotated. */
$notes = [
    'app/Models/User.php'              => 'protected $guarded = [] — every column is mass-assignable. Client.php next door shows the correct pattern ($fillable) that this model skipped.',
    'app/Controllers/ProfileController.php' => 'update() passes the whole request ($request->all(), minus the token) into User::fill(). Post is_admin=1 or plan=enterprise and it simply applies — that is the mass-assignment test.',
    'app/Views/clients/show.blade.php' => 'Client notes are printed with {!! !!} — Blade\'s RAW echo. Anything stored in notes executes on the viewer\'s screen (stored XSS).',
    'app/Controllers/ClientController.php'  => 'index() builds one raw SQL string with the search term glued in — and the workspace scope is inside the same string, so injection escapes the tenancy. (show() and the notes update use bound parameters: contrast them.)',
    'app/Controllers/InvoiceController.php' => 'Four flaws: show() never checks the invoice\'s workspace (IDOR); pdf() joins the file parameter onto storage/invoices/ (traversal); attach() stores any file under its original name with zero validation (upload); void() trusts a route registered without CSRF middleware.',
    'app/routes.php'                   => 'The route list. Every POST is CSRF-verified by the router\'s web group — except /invoices/{id}/void, registered with csrf => false "temporarily".',
    'app/Controllers/AuthController.php'    => 'The login throttle is commented out — failures are counted for the log, never blocked (brute force). The post-login "intended" redirect is used verbatim, even off-site (open redirect).',
    'app/Views/team.blade.php'         => 'The team page prints every member\'s plaintext API token "to help debug integrations". Tokens also sit unhashed in the users table and never expire.',
    'app/Controllers/ApiController.php'     => 'The API accepts any valid Bearer token — so a token read off the team page is a full key to that workspace\'s invoices. Detection fires when the caller is not the token\'s owner.',
    'public/index.php'                 => 'With APP_DEBUG=true the catch block renders an Ignition-style page dumping the entire .env — APP_KEY, DB password, mail password. Trigger it via /reports/export.',
    '.env'                             => 'APP_DEBUG=true in production, and the APP_KEY sits beside the credentials an attacker needs. In the wild this file is the first thing scanners ask for.',
    'router.php'                       => 'The dev router executes PHP files under /storage/attachments/ like a classic storage symlink into the web root — that is what turns the upload into code execution.',
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
