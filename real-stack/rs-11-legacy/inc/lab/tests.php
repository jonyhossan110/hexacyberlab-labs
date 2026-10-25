<?php
$defs = require __DIR__ . '/tests_def.php';
require_once __DIR__ . '/../layout.php';
$p = rs_progress(); $done = (array)$p['tests'];
lab_head('Tests');
echo '<h1>🎯 RS-11 tests — ' . count(array_filter($done)) . '/' . count($defs) . ' passed</h1>' .
'<p class="muted">Detected server-side, the moment the action really happens. Hints point at the area, never the payload.</p>' .
'<p class="muted"><b>Capstone adaptation:</b> the <b>report</b> test is a full audit report — executive summary plus three findings — instead of RS-01\'s single finding. See the Complete page.</p>';
foreach ($defs as $t) {
    $ok = !empty($done[$t['id']]);
    echo '<div class="review"><b>' . ($ok ? '✅' : '⬜') . ' ' . htmlspecialchars($t['name']) . '</b><p class="muted">' . htmlspecialchars($t['hint']) . '</p></div>';
}
lab_foot();
