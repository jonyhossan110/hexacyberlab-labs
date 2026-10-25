<?php
layout_head('Blue-Team Corner');
$logFile = LAB_ROOT . '/logs/app.log';
$lines = is_file($logFile) ? array_slice(file($logFile), -120) : [];
echo '<h1>🛡 Blue-team corner — what the defence sees</h1>' .
'<p class="muted">This is the application\'s own log. After an attack, read your trail: which lines expose you, which look like ordinary shopping? Real engagements are won and lost in this file.</p><pre class="log">';
foreach ($lines as $l) echo htmlspecialchars($l);
echo '</pre>';
layout_foot();
