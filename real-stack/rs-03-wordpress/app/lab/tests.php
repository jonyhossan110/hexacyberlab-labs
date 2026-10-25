<?php
$defs = require __DIR__ . '/tests_def.php';
$p = rs_progress(); $done = (array)$p['tests'];
layout_head('Tests');
echo '<h1>🎯 RS-03 tests — ' . count(array_filter($done)) . '/' . count($defs) . ' passed</h1>' .
'<p class="muted">Detected server-side, the moment the action really happens. Hints point at the area, never the payload.</p>';
foreach ($defs as $t) {
    $ok = !empty($done[$t['id']]);
    echo '<div class="review"><b>' . ($ok ? '✅' : '⬜') . ' ' . htmlspecialchars($t['name']) . '</b><p class="muted">' . htmlspecialchars($t['hint']) . '</p></div>';
}
layout_foot();
