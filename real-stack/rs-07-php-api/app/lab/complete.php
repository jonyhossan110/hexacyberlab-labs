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
echo '<h1>🏁 RS-07 — ' . $n . '/' . $total . ' tests</h1>';
if ($n < $total) {
    echo '<p>Not complete yet. Still open:</p><ul>';
    foreach ($defs as $t) if (empty($done[$t['id']])) echo '<li>' . htmlspecialchars($t['name']) . '</li>';
    echo '</ul><p><a href="/lab/tests">Open the test list with hints</a></p>';
} else {
    echo '<div class="cert"><h2>🎓 Real Stack Milestone RS-07 — Complete</h2>' .
    '<p>A REST API, tested like a professional: tokens interrogated, objects walked, flows raced, one finding written up.</p>' .
    '<p>Completion code: <b>' . rs_completion_code() . '</b></p></div>' .
    '<h2>Fix-the-code debrief</h2>' .
    '<div class="fix"><b>Forgeable tokens</b><pre>Vulnerable:  $token = "hp_" . md5($user->email);   // derivable by anyone
Fixed:       $token = bin2hex(random_bytes(32));    // random, stored hashed,
             checked against the ISSUED record only, revocable, expiring.</pre></div>' .
    '<div class="fix"><b>BOLA</b><pre>Vulnerable:  SELECT * FROM accounts WHERE id = ?
Fixed:       SELECT * FROM accounts WHERE id = ? AND user_id = ?  (the token\'s user)
             — an authorization check on EVERY object access, server-side.</pre></div>' .
    '<div class="fix"><b>Mass assignment</b><pre>Vulnerable:  foreach ($_POST as $k => $v) $user->$k = $v;  (+ a balance field!)
Fixed:       an explicit allow-list: only display_name and phone may be updated
             here; balance changes only through the transfer flow.</pre></div>' .
    '<div class="fix"><b>SQL injection in the filter</b><pre>Vulnerable:  "... AND t.note LIKE \'%$filter%\' ORDER BY $sort"
Fixed:       prepared statements for values, and an allow-list for sort columns
             (identifiers cannot be bound as parameters).</pre></div>' .
    '<div class="fix"><b>Excessive data exposure</b><pre>Vulnerable:  the user serializer returns password_hash and api_token.
Fixed:       a response DTO with exactly the fields the client needs —
             never credentials, never other users\' secrets.</pre></div>' .
    '<div class="fix"><b>OTP brute force</b><pre>Vulnerable:  unlimited guesses at a 4-digit code.
Fixed:       rate-limit and lock the challenge after ~5 attempts, expire codes
             in minutes, and prefer 6 digits + risk-based step-up.</pre></div>' .
    '<div class="fix"><b>Webhook SSRF</b><pre>Vulnerable:  the worker fetches any URL, any scheme, any range.
Fixed:       https-only allow-listing, resolve and block private/link-local IPs,
             and pin the resolved IP for the actual request (anti-rebinding).</pre></div>' .
    '<div class="fix"><b>CORS</b><pre>Vulnerable:  Access-Control-Allow-Origin: (whatever asked) + credentials.
Fixed:       an exact origin allow-list; never reflect arbitrary origins
             alongside Access-Control-Allow-Credentials: true.</pre></div>' .
    '<div class="fix"><b>Stored XSS</b><pre>Vulnerable:  echo $user->name; in the dashboard because "it came from our API".
Fixed:       output-encode at render time — API data is still untrusted data.</pre></div>' .
    '<div class="fix"><b>Method confusion + race</b><pre>Vulnerable:  capture answers GET; balance checked at authorize, not capture.
Fixed:       state changes only via POST/DELETE with CSRF protection where
             cookies are used; and money moves inside a DB transaction with an
             atomic conditional debit:
             UPDATE accounts SET balance = balance - :amt
             WHERE id = :id AND balance >= :amt;  – then check rows affected.</pre></div>' .
    '<h2>Business impact — what HexaPay was risking</h2>' .
    '<p>A token recipe anyone can derive means every customer account is open to anyone who knows an email address. A double-spend is not a data bug — it is money created from nothing. Password hashes in normal API responses turn any minor leak into a full credential spill. In business language: direct financial loss, a failed partner due-diligence, regulator and PCI attention, and a payments brand nobody can trust — from flaws that took an afternoon to find.</p>';
}
echo '<h2>✍ Mini report — one professional finding</h2>' . ($reportMsg ? '<p class="ok">' . $reportMsg . '</p>' : '') .
'<form method="post" class="form"><input type="hidden" name="do" value="report">' .
'<label>Finding title<input name="title" placeholder="e.g. API tokens are derivable from email addresses, allowing full account takeover" required></label>' .
'<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>' .
'<label>Evidence — the request you sent and the response that proves it<textarea name="evidence" required></textarea></label>' .
'<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>' .
'<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>';
layout_foot();
