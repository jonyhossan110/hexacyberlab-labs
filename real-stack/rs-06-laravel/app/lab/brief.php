<?php
layout_head('Client Brief');
echo '<h1>📋 Engagement brief — HexaBilling</h1>' .
'<p><b>Client:</b> HexaBilling, a (fictional) invoicing SaaS for freelancers and small firms, built with a Laravel-style MVC stack. It grew from a side project into a paying product without ever getting a security review. You are the assessor they finally hired.</p>' .
'<p><b>Scope:</b> this application only — every route on this host and port. The seeded workspaces and accounts are in scope; try to cross from one workspace into another, that is what multi-tenancy testing means. Other ports and other labs are <b>out of scope</b>.</p>' .
'<p><b>Rules of engagement:</b> no denial of service, no wiping another workspace\'s data beyond what a test needs to prove, and everything you do is logged (see the Logs page).</p>' .
'<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — the server notices when a mass-assignment actually flips a protected field, when a foreign token actually calls the API, not before. Work black-box first; open the Code Review only for your second pass.</p>' .
'<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>';
layout_foot();
