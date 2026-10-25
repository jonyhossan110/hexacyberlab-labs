<?php
/* Code Review mode — second pass. Real source, with the flaws annotated. */
$notes = [
    'wp-content/plugins/hexa-contact/hexa-contact.php' => 'Two of the most common real-world WordPress plugin flaws in one file: the admin-ajax search glues the term into a LIKE query (SQL injection) and never checks the caller\u{2019}s capability; the settings save has no nonce at all (CSRF).',
    'wp-content/plugins/hexa-gallery/hexa-gallery.php' => 'The [badge] shortcode builds HTML from raw attribute and content (stored XSS through comments), and hg_include_template() includes whatever file path the template parameter names (LFI). The gallery grid itself escapes properly — care in one function, none in the next.',
    'app/pages/admin.php'   => 'The media library upload checks only the FINAL extension of the filename. Combined with the uploads server\u{2019}s behaviour (see router.php), a name like shell.php.bak is both accepted and executed.',
    'router.php'            => 'Serves wp-content/debug.log to anyone (test: debug-log) and executes uploads when any name segment is .php — the classic Apache multi-extension behaviour the upload check never accounted for.',
    'app/rest.php'          => 'The wp/v2 users route returns email addresses and roles to anonymous visitors. A stock core exposes ids and slugs here; this build exposes the keys to password resets as well.',
    'app/xmlrpc.php'        => 'system.multicall tries batches of credentials with per-account counting but no lockout, delay or alerting — brute force at API speed. Correct passwords are distinguishable in the replies, which makes it an oracle too.',
    'app/pages/profile.php' => 'The profile save applies a role straight from the POST body. The form never shows a role field — the handler trusts one anyway (privilege escalation).',
    'app/prefs.php'         => 'HexaPress_Prefs is the gadget class: its __wakeup fires during unserialize(). On real sites a class like this — with a file write or a delete inside — is what turns a serialized cookie into code execution.',
    'public/index.php'      => 'Three core behaviours live here: unserialize() on the wp_prefs cookie (object injection), the ?author=N canonical redirect that leaks slugs (user enumeration), and WP_DEBUG-style full error output.',
    'wp-config.php'         => 'Database password and salts in plain text, WP_DEBUG true — and the file was committed to a repository in 2022. If the LFI reaches it on a noisier stack (or a backup copy exists), the site is over.',
    'public/readme.html'    => 'Announces the exact core version to anyone who asks — free fingerprinting, the first thing WPScan reports.',
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
