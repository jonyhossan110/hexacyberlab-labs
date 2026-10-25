<?php
layout_head('Blue-Team Corner');
$logFile = LAB_ROOT . '/logs/app.log';
$lines = is_file($logFile) ? array_slice(file($logFile), -120) : [];
echo '<h1>🛡 Blue-team corner — what the defence sees</h1>' .
'<p class="muted">This is the application\u{2019}s own log. After an attack, read your trail: the xmlrpc guesses, the ?author walk, the moment a gadget fired. Real engagements are won and lost in this file — and in the site\u{2019}s own debug log, if anyone were watching it.</p><pre class="log">';
foreach ($lines as $l) echo htmlspecialchars($l);
echo '</pre>';
layout_foot();
