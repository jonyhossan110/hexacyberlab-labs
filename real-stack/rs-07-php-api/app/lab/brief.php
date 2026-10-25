<?php
layout_head('Client Brief');
echo '<h1>📋 Engagement brief — HexaPay Ltd</h1>' .
'<p><b>Client:</b> HexaPay Ltd, a (fictional) London payments startup. Their wallet API launched fast, raised a seed round, and is about to onboard its first banking partner — whose due-diligence includes this security assessment. You are the assessor.</p>' .
'<p><b>Scope:</b> the HexaPay API and its companion web dashboard on this host and port — every <code>/api/*</code> endpoint, the seeded accounts, and your own registered account. Other ports and other labs are <b>out of scope</b>, exactly as on a real engagement.</p>' .
'<p><b>Your tools:</b> most API work is <b>curl</b> for precision and <b>Burp Suite</b> for depth — Repeater for hand-built requests, Intruder for id-walking and code guessing. There is almost no UI to click: if you only test what a mouse can reach, you will miss everything that matters here.</p>' .
'<p><b>Rules of engagement:</b> no denial of service; the money is play money, but treat balances and other users\' data as if they were real — prove the flaw, don\'t empty the vault. Everything you do is logged (see the Logs page), including every API call.</p>' .
'<p><b>How scoring works:</b> twelve tests are scored server-side the moment the result actually happens — a forged token must really authenticate, a double-spend must really overdraw. Work black-box first; open the Code Review only for your second pass.</p>' .
'<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>';
layout_foot();
