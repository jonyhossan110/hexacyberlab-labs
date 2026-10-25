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
echo '<h1>🏁 RS-01 — ' . $n . '/' . $total . ' tests</h1>';
if ($n < $total) {
    echo '<p>Not complete yet. Still open:</p><ul>';
    foreach ($defs as $t) if (empty($done[$t['id']])) echo '<li>' . htmlspecialchars($t['name']) . '</li>';
    echo '</ul><p><a href="/lab/tests">Open the test list with hints</a></p>';
} else {
    echo '<div class="cert"><h2>🎓 Real Stack Milestone RS-01 — Complete</h2>' .
    '<p>Plain PHP, tested like a professional: black-box first, code review second, one finding written up.</p>' .
    '<p>Completion code: <b>' . rs_completion_code() . '</b></p></div>' .
    '<h2>Fix-the-code debrief</h2>' .
    '<div class="fix"><b>SQL injection</b><pre>Vulnerable:  "... WHERE email = \'$email\' AND password = \'$pass\'"
Fixed:       prepared statements — $st = $pdo->prepare("... WHERE email = ? AND password = ?");
             passwords hashed with password_hash(), compared with password_verify().</pre></div>' .
    '<div class="fix"><b>XSS (stored + reflected)</b><pre>Vulnerable:  echo $reviewBody;  echo $searchTerm;
Fixed:       echo htmlspecialchars($value, ENT_QUOTES, \'UTF-8\'); on EVERY output, no exceptions.</pre></div>' .
    '<div class="fix"><b>IDOR</b><pre>Vulnerable:  SELECT * FROM orders WHERE id = ?
Fixed:       SELECT * FROM orders WHERE id = ? AND user_id = ?  (the session user)</pre></div>' .
    '<div class="fix"><b>Upload → shell</b><pre>Vulnerable:  original filename into a folder where PHP executes.
Fixed:       random names, an extension/MIME allow-list, and serve uploads from a
             folder (or domain) where code never executes.</pre></div>' .
    '<div class="fix"><b>CSRF</b><pre>Vulnerable:  a POST that only checks the session cookie.
Fixed:       a per-session token in every state-changing form, verified server-side.</pre></div>' .
    '<div class="fix"><b>Type juggling</b><pre>Vulnerable:  if ($given == $storedHash)
Fixed:       strict comparison (===) or hash_equals(), and never compare secrets loosely.</pre></div>' .
    '<h2>Business impact — what NordKart was risking</h2>' .
    '<p>Every customer account was one UNION query away from a full dump; any logged-in customer could read any order; a single uploaded file would have handed over the whole server. In business language: a breach notification to every customer, regulator attention, and a dead brand — from flaws that took an afternoon to find and a day to fix.</p>';
}
echo '<h2>✍ Mini report — one professional finding</h2>' . ($reportMsg ? '<p class="ok">' . $reportMsg . '</p>' : '') .
'<form method="post" class="form"><input type="hidden" name="do" value="report">' .
'<label>Finding title<input name="title" placeholder="e.g. SQL Injection in the login form allows full authentication bypass" required></label>' .
'<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>' .
'<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>' .
'<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>' .
'<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>';
layout_foot();
