<?php
layout_head('Client Brief');
echo '<h1>📋 Engagement brief — WanderPress</h1>' .
'<p><b>Client:</b> WanderPress, a (fictional) independent travel publisher in Lisbon. The site runs on <b>HexaPress</b>, a WordPress-style core, with two custom plugins — a contact form and a photo gallery — written by a freelancer in 2022. It has never had a security review. You are the assessor they finally hired.</p>' .
'<p><b>Scope:</b> this application only — every route on this host and port, the core, the REST API, xmlrpc.php, and both plugins. The seeded accounts and your own registered account are in scope. Other ports and other labs are <b>out of scope</b>, exactly as on a real engagement.</p>' .
'<p><b>Rules of engagement:</b> no denial of service, no deleting other users\u{2019} content beyond what a test needs to prove, and everything you do is logged (see the Logs page — the blue team is watching, like real life).</p>' .
'<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — for example, the server notices when an injected search actually returns messages that do not match the term, not before. Work black-box first; open the Code Review only for your second pass.</p>' .
'<p><b>Where WordPress-style sites break:</b> rarely in the core — almost always in plugins, old endpoints left enabled (xmlrpc), over-sharing APIs, and files left in wp-content. Hunt accordingly.</p>' .
'<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>';
layout_foot();
