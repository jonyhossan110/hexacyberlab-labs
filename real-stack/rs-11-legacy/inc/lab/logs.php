<?php
require_once __DIR__ . '/../layout.php';
lab_head('Blue-Team Corner');
$logFile = LAB_ROOT . '/logs/app.log';
$lines = is_file($logFile) ? array_slice(file($logFile), -120) : [];
echo '<h1>🛡 Blue-team corner — what the defence sees</h1>' .
'<p class="muted">BrightTravel\'s home-grown log. Read your own audit trail: the injected logins, the CSRF admin creation and the backup fetch are all written down here. On a real engagement, assume the client reads exactly this.</p><pre class="log">';
foreach ($lines as $l) echo htmlspecialchars($l);
echo '</pre>';
lab_foot();
