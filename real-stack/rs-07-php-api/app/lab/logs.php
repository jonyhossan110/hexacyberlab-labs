<?php
layout_head('Blue-Team Corner');
$logFile = LAB_ROOT . '/logs/app.log';
$lines = is_file($logFile) ? array_slice(file($logFile), -120) : [];
echo '<h1>🛡 Blue-team corner — what the defence sees</h1>' .
'<p class="muted">This is the API\'s own log, API calls included. After an attack, read your trail: a derived token logging in, an account read by a stranger, a webhook reaching inside — it is all written down here, the way it would be for a real SOC.</p><pre class="log">';
foreach ($lines as $l) echo htmlspecialchars($l);
echo '</pre>';
layout_foot();
