<?php
$defs = require __DIR__ . '/tests_def.php';
$p = rs_progress(); $done = (array)$p['tests'];
$total = count($defs); $n = count(array_filter($done));
$reportMsg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'report') {
    $title = trim($_POST['title'] ?? ''); $sev = $_POST['severity'] ?? '';
    $ev = trim($_POST['evidence'] ?? ''); $imp = trim($_POST['impact'] ?? ''); $fix = trim($_POST['fix'] ?? '');
    if (strlen($title) >= 8 && $sev !== '' && strlen($ev) >= 30 && strlen($imp) >= 20 && strlen($fix) >= 20) {
        $p2 = rs_progress(); $p2['report'] = ['title' => $title, 'severity' => $sev, 'evidence' => $ev, 'impact' => $imp, 'fix' => $fix, 'at' => date('c')];
        rs_save($p2); rs_pass('report');
        $reportMsg = '✅ Finding recorded — that is the report test passed.';
        $p = rs_progress(); $done = (array)$p['tests']; $n = count(array_filter($done));
    } else $reportMsg = 'The finding needs more substance: a clear title, a severity, real evidence (30+ characters), the business impact (20+) and a concrete fix (20+).';
}
layout_head('Complete');
echo '<h1>🏁 RS-03 — ' . $n . '/' . $total . ' tests</h1>';
if ($n < $total) {
    echo '<p>Not complete yet. Still open:</p><ul>';
    foreach ($defs as $t) if (empty($done[$t['id']])) echo '<li>' . htmlspecialchars($t['name']) . '</li>';
    echo '</ul><p><a href="/lab/tests">Open the test list with hints</a></p>';
} else {
    echo '<div class="cert"><h2>🎓 Real Stack Milestone RS-03 — Complete</h2>' .
    '<p>WordPress-style, tested like a professional: plugins first, core second, one finding written up.</p>' .
    '<p>Completion code: <b>' . rs_completion_code() . '</b></p></div>' .
    '<h2>Fix-the-code debrief</h2>' .
    '<div class="fix"><b>Plugin SQL injection (admin-ajax)</b><pre>Vulnerable:  "... WHERE body LIKE \'%$term%\'" — and no capability check at all.
Fixed:       prepared statements, and begin every admin-ajax handler with a
             capability check (current_user_can) — most real plugin CVEs are
             exactly this pair of omissions.</pre></div>' .
    '<div class="fix"><b>Stored XSS via shortcode</b><pre>Vulnerable:  the badge handler prints its content and attributes raw.
Fixed:       escape on output — esc_html() for content, esc_attr() for
             attributes — inside the shortcode too. Shortcodes are output,
             and all output gets escaped.</pre></div>' .
    '<div class="fix"><b>Local file inclusion</b><pre>Vulnerable:  include $templatesDir . $_GET[\'template\'];
Fixed:       an allow-list of template names (grid, list) mapped to files in
             code; never let user input become any part of a file path.</pre></div>' .
    '<div class="fix"><b>Upload extension bypass</b><pre>Vulnerable:  final-extension check in the app, multi-extension execution
             in the server — each looked fine alone.
Fixed:       validate the real file type (wp_check_filetype_and_ext /
             finfo), randomise stored names, and serve uploads from a
             location where code never executes.</pre></div>' .
    '<div class="fix"><b>User enumeration + REST exposure</b><pre>Vulnerable:  ?author=N redirects to slugs; /wp-json/wp/v2/users returns
             emails and roles anonymously.
Fixed:       block author-id redirects, return only public fields from the
             API (never email), and treat usernames as public — so make
             passwords and reset flows strong accordingly.</pre></div>' .
    '<div class="fix"><b>XML-RPC brute force</b><pre>Vulnerable:  unlimited multicall credential guesses, clear success oracle.
Fixed:       disable xmlrpc if unused (it usually is), otherwise rate-limit
             and alert on it, enforce strong passwords, and prefer app
             passwords with scoped permissions.</pre></div>' .
    '<div class="fix"><b>Settings CSRF</b><pre>Vulnerable:  a settings POST that trusts the session cookie alone.
Fixed:       a nonce in the form (wp_nonce_field) verified on save
             (check_admin_referer) — plus the capability check the plugin
             also skipped.</pre></div>' .
    '<div class="fix"><b>Privilege escalation</b><pre>Vulnerable:  profile save applies $_POST[\'role\'].
Fixed:       never read role from the request; role changes go through one
             admin-only path guarded by current_user_can(\'promote_users\').</pre></div>' .
    '<div class="fix"><b>Object injection</b><pre>Vulnerable:  unserialize(base64_decode($_COOKIE[\'wp_prefs\']))
Fixed:       never unserialize user input. Store preferences as JSON, or
             sign the cookie (HMAC) and verify before trusting a byte.</pre></div>' .
    '<div class="fix"><b>debug.log + version disclosure</b><pre>Vulnerable:  WP_DEBUG on in production, log file inside wp-content,
             readme.html announcing the exact version.
Fixed:       WP_DEBUG off (or log outside the web root), remove readme.html,
             and keep the core and plugins updated so the version matters less.</pre></div>' .
    '<h2>Business impact — what WanderPress was risking</h2>' .
    '<p>A subscriber account — the kind anyone can register in thirty seconds — was one hidden form field away from administrator. From there: every reader\u{2019}s email from the REST route, the editors\u{2019} inboxes through the plugin search, and a foothold file in uploads. In business language: a defaced front page, a mailing list in someone else\u{2019}s hands, a breach notification to every subscriber, and a brand built on trust explaining itself. Every flaw here is a flaw that has really emptied real WordPress sites.</p>';
}
echo '<h2>✍ Mini report — one professional finding</h2>' . ($reportMsg ? '<p class="ok">' . $reportMsg . '</p>' : '') .
'<form method="post" class="form"><input type="hidden" name="do" value="report">' .
'<label>Finding title<input name="title" placeholder="e.g. Subscriber-to-administrator privilege escalation via the profile role parameter" required></label>' .
'<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>' .
'<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>' .
'<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>' .
'<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>';
layout_foot();
