<?php
$defs = require __DIR__ . '/tests_def.php';
require_once __DIR__ . '/../layout.php';
require_once __DIR__ . '/../db.php'; // the crack check reads the live admin hash
$p = rs_progress(); $done = (array)$p['tests'];
$total = count($defs); $n = count(array_filter($done));
$crackMsg = ''; $reportMsg = '';

/* --- crack submit: the plaintext of the admin's MD5 --- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'crack') {
    $given = trim($_POST['cracked'] ?? '');
    $st = db()->prepare("SELECT passhash FROM users WHERE username = 'admin'");
    $st->execute(); $hash = $st->fetchColumn();
    if ($given !== '' && $hash && md5($given) === $hash) {
        rs_pass('password-crack');
        $crackMsg = '✅ Correct — that is the admin\'s password. The MD5 fell, exactly as documented.';
    } else {
        rs_attempt('crack');
        $crackMsg = 'Not the admin\'s password. Get the hash first (UNION dump or the backup), then crack it offline — it is in every common wordlist.';
    }
    $p = rs_progress(); $done = (array)$p['tests']; $n = count(array_filter($done));
}

/* --- the full audit report: summary + 3 findings (RS-01 minimums each) --- */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'report') {
    $summary = trim($_POST['summary'] ?? '');
    $findings = [];
    $okAll = strlen($summary) >= 50;
    for ($i = 1; $i <= 3; $i++) {
        $f = ['title' => trim($_POST["f{$i}_title"] ?? ''), 'severity' => $_POST["f{$i}_severity"] ?? '',
              'evidence' => trim($_POST["f{$i}_evidence"] ?? ''), 'impact' => trim($_POST["f{$i}_impact"] ?? ''),
              'fix' => trim($_POST["f{$i}_fix"] ?? '')];
        if (!(strlen($f['title']) >= 8 && $f['severity'] !== '' && strlen($f['evidence']) >= 30 && strlen($f['impact']) >= 20 && strlen($f['fix']) >= 20)) $okAll = false;
        $findings[] = $f;
    }
    if ($okAll) {
        $p2 = rs_progress(); $p2['report'] = ['summary' => $summary, 'findings' => $findings, 'at' => date('c')];
        rs_save($p2); rs_pass('report');
        $reportMsg = '✅ Audit report filed — that is the report test passed.';
        $p = rs_progress(); $done = (array)$p['tests']; $n = count(array_filter($done));
    } else $reportMsg = 'The report needs more substance: an executive summary of 50+ characters and three complete findings (title 8+, severity, evidence 30+, impact 20+, fix 20+ each).';
}

lab_head('Complete');
echo '<h1>🏁 RS-11 Capstone — ' . $n . '/' . $total . ' tests</h1>';
if ($n < $total) {
    echo '<p>Not complete yet. Still open:</p><ul>';
    foreach ($defs as $t) if (empty($done[$t['id']])) echo '<li>' . htmlspecialchars($t['name']) . '</li>';
    echo '</ul><p><a href="/lab/tests">Open the test list with hints</a></p>';
} else {
    echo '<div class="cert"><h2>🎓 Real Stack Capstone RS-11 — Complete</h2>' .
    '<p>A full legacy audit: black-box exploitation, a complete admin chain, source review, and a professional report.</p>' .
    '<p>Completion code: <b>' . rs_completion_code() . '</b></p></div>' .
    '<h2>Remediation roadmap — what BrightTravel should do, in order</h2>' .
    '<div class="fix"><b>P0 — this week (stop the bleeding)</b><pre>1. Take backup.sql and config.old out of the web root; rotate the database
   master password (it is in both, and in the config the LFI can read).
2. Delete or rename the installer account (siteadmin) and force-reset every
   password; the MD5 hashes must be treated as public.
3. Move uploads out of the executed path and block PHP under uploads/.</pre></div>' .
    '<div class="fix"><b>P1 — this month (fix the classes, not the instances)</b><pre>4. Prepared statements everywhere a value meets SQL (login, search, ids).
5. Password storage: password_hash()/password_verify(); rehash on login.
6. session_regenerate_id() at every privilege change; HttpOnly+Secure cookies.
7. Ownership check on every object lookup (bookings first — guest PII).
8. CSRF tokens on every state change; state changes over POST, never GET.
9. htmlspecialchars() on all output — the guestbook is the visible symptom.</pre></div>' .
    '<div class="fix"><b>P2 — this quarter (stop it recurring)</b><pre>10. Retire the ?show= include pattern for an allow-list of page names.
11. Validate import URLs server-side (scheme + destination allow-list);
    fetch with a dedicated, no-internal-network service.
12. Turn debug off in production; centralise logging and actually read it.
13. Plan the rebuild: a 2009 codebase can be patched, but its habits cannot.</pre></div>' .
    '<h2>Business impact — what BrightTravel was risking</h2>' .
    '<p>One GET downloaded the entire customer database. The admin password was a dictionary word under MD5. Any customer could read any guest\'s phone number and booking notes — including a key-box code written in plain text. In business language: a reportable personal-data breach, regulator and card-scheme attention, and the end of the "lovely people" reputation the guestbook describes — all of it reachable by a single auditor in an afternoon, which means it was reachable by anyone.</p>';
}
echo '<h2>🔓 Crack submit — the admin\'s MD5</h2>' . ($crackMsg ? '<p class="ok">' . $crackMsg . '</p>' : '') .
'<p class="muted">Recover the admin account\'s MD5 (UNION dump or the backup), crack it offline, and prove it here. Submitting the correct plaintext passes the password-crack test.</p>' .
'<form method="post" class="form"><input type="hidden" name="do" value="crack">' .
'<label>Admin password (plaintext)<input name="cracked" placeholder="the word the hash opens to"></label><button>Submit cracked password</button></form>';

echo '<h2>✍ Full audit report — the engagement deliverable</h2>' . ($reportMsg ? '<p class="ok">' . $reportMsg . '</p>' : '') .
'<p class="muted">Adapted for the capstone: an executive summary plus <b>three</b> findings, each held to the RS-01 minimums (title 8+, evidence 30+, impact 20+, fix 20+).</p>' .
'<form method="post" class="form"><input type="hidden" name="do" value="report">' .
'<label>Executive summary — for the owner, in plain business language<textarea name="summary" required></textarea></label>';
for ($i = 1; $i <= 3; $i++) {
    echo '<fieldset style="border:1px solid #d8d2c2;border-radius:10px;padding:12px"><legend><b>Finding ' . $i . '</b></legend>' .
    '<label>Title<input name="f' . $i . '_title" placeholder="e.g. SQL Injection in the login form allows full authentication bypass" required></label>' .
    '<label>Severity<select name="f' . $i . '_severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>' .
    '<label>Evidence — what you sent and what came back<textarea name="f' . $i . '_evidence" required></textarea></label>' .
    '<label>Business impact — money, customers, trust<textarea name="f' . $i . '_impact" required></textarea></label>' .
    '<label>Recommended fix<textarea name="f' . $i . '_fix" required></textarea></label></fieldset>';
}
echo '<button>Submit audit report</button></form>';
lab_foot();
