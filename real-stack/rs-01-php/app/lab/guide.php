<?php
layout_head('Real Website Guide');
echo '<h1>📖 Real Website Guide — recognising plain PHP</h1>' .
'<h2>Fingerprint drill — prove it is PHP before you test</h2>' .
'<ul><li><b>Cookie:</b> <code>PHPSESSID</code> is PHP\'s default session cookie.</li>' .
'<li><b>Header:</b> <code>X-Powered-By: PHP/8.x</code> — the runtime announces itself unless hardened.</li>' .
'<li><b>URLs & forms:</b> <code>.php</code> endpoints, or a front controller hiding them; form fields named like database columns.</li>' .
'<li><b>Errors:</b> PHP warnings name real file paths (<code>/var/www/...</code>) — free reconnaissance.</li>' .
'<li><b>WhatWeb:</b> <code>whatweb http://localhost:3201</code> from the gateway terminal names the stack in seconds.</li></ul>' .
'<h2>What to test first on a real PHP site</h2>' .
'<ol><li>Every place input reaches SQL — login, search, ids in URLs. Old PHP code glues strings.</li>' .
'<li>Loose comparisons (<code>==</code>) on tokens and codes — type juggling is a PHP-only gift.</li>' .
'<li>Uploads: where do files land, and does the server execute them there?</li>' .
'<li>Leftovers: <code>backup.sql</code>, <code>.env</code>, <code>config.php.bak</code>, <code>phpinfo()</code> pages.</li>' .
'<li>Sessions: is the id regenerated at login? Is it predictable?</li></ol>' .
'<h2>Burp workflow for this lab</h2>' .
'<p>Proxy the shop, map it with the site map, then work the login and the product id in <b>Repeater</b>; use <b>Intruder</b> on the login form to feel the missing rate limit (ten failures — watch the test flip). Compare responses in <b>Comparer</b> when a UNION column count is wrong.</p>' .
'<h2>The professional habit</h2>' .
'<p>Note every flaw as: what, where, proof, impact. The Complete page will ask you to write one up properly — that write-up is what a client actually pays for.</p>';
layout_foot();
