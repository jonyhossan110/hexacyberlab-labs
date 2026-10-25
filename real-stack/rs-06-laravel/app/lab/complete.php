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
echo '<h1>🏁 RS-06 — ' . $n . '/' . $total . ' tests</h1>';
if ($n < $total) {
    echo '<p>Not complete yet. Still open:</p><ul>';
    foreach ($defs as $t) if (empty($done[$t['id']])) echo '<li>' . htmlspecialchars($t['name']) . '</li>';
    echo '</ul><p><a href="/lab/tests">Open the test list with hints</a></p>';
} else {
    echo '<div class="cert"><h2>🎓 Real Stack Milestone RS-06 — Complete</h2>' .
    '<p>A Laravel-style SaaS, tested like a professional: black-box first, code review second, one finding written up.</p>' .
    '<p>Completion code: <b>' . rs_completion_code() . '</b></p></div>' .
    '<h2>Fix-the-code debrief</h2>' .
    '<div class="fix"><b>Mass assignment</b><pre>Vulnerable:  protected $guarded = [];  +  $user->fill($request->all());
Fixed:       an explicit $fillable = [\'name\', \'email\', \'company\'] on the model,
             and validate the request — plan/role changes belong in an admin-only flow.</pre></div>' .
    '<div class="fix"><b>Blade raw output</b><pre>Vulnerable:  {!! $client->notes !!}
Fixed:       {{ $client->notes }} (escaped) by default; raw output only after a
             real sanitiser, for content that genuinely needs HTML.</pre></div>' .
    '<div class="fix"><b>SQL injection (raw query)</b><pre>Vulnerable:  "... LIKE \'%$q%\'" glued into DB::raw-style SQL.
Fixed:       bindings — where(\'name\', \'like\', "%$q%") or ? placeholders — so input
             can never become SQL structure, and the tenancy scope cannot be escaped.</pre></div>' .
    '<div class="fix"><b>IDOR / tenancy</b><pre>Vulnerable:  Invoice::find($id) and render.
Fixed:       scope every query to the workspace: ->where(\'workspace_id\', $user->workspace_id)
             or a policy check — 404 for anything that is not yours.</pre></div>' .
    '<div class="fix"><b>CSRF</b><pre>Vulnerable:  one route registered outside the web middleware group.
Fixed:       no state-changing route ever leaves the group; verify the _token on
             every POST, and audit routes with `route:list` reviews.</pre></div>' .
    '<div class="fix"><b>Debug mode & tokens</b><pre>Vulnerable:  APP_DEBUG=true in production; API tokens plaintext and printed in the UI.
Fixed:       APP_DEBUG=false outside local; hash tokens at rest (like passwords),
             show them once at creation, let them expire, never render them in pages.</pre></div>' .
    '<h2>Business impact — what HexaBilling was risking</h2>' .
    '<p>Any customer could promote themselves to platform admin or an enterprise plan from the profile form; any signed-in user could read every other firm\'s invoices; one leaked token handed over a whole workspace\'s billing data. In business language: a multi-tenant SaaS whose tenants can read each other is a breach notification, a regulator conversation, and churn — from flaws a single code review would have caught.</p>';
}
echo '<h2>✍ Mini report — one professional finding</h2>' . ($reportMsg ? '<p class="ok">' . $reportMsg . '</p>' : '') .
'<form method="post" class="form"><input type="hidden" name="do" value="report">' .
'<label>Finding title<input name="title" placeholder="e.g. Mass assignment in profile update allows privilege escalation to platform admin" required></label>' .
'<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>' .
'<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>' .
'<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>' .
'<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>';
layout_foot();
