<?php
layout_head('Client Brief');
echo '<h1>📋 Engagement brief — NordKart AS</h1>' .
'<p><b>Client:</b> NordKart AS, a (fictional) Scandinavian home-goods retailer in Bergen. Their shop was built in 2021 by a freelancer and has never had a security review. You are the assessor they finally hired.</p>' .
'<p><b>Scope:</b> this application only — every route on this host and port. The seeded customer accounts and your own registered account are in scope. Other ports and other labs are <b>out of scope</b>, exactly as on a real engagement.</p>' .
'<p><b>Rules of engagement:</b> no denial of service, no deleting other customers\' data beyond what a test needs to prove, and everything you do is logged (see the Logs page — the blue team is watching, like real life).</p>' .
'<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — for example, the server notices when a UNION query actually pulls user rows, not before. Work black-box first; open the Code Review only for your second pass.</p>' .
'<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>';
layout_foot();
