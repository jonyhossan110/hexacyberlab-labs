<?php
require_once __DIR__ . '/../layout.php';
lab_head('Engagement Letter');
echo '<h1>📋 Engagement letter — BrightTravel Ltd</h1>' .
'<div class="review"><p><i>HexaCyberLab · Web Application Security Assessment</i></p>' .
'<p>Dear Margaret,</p>' .
'<p>Thank you for commissioning this assessment. BrightTravel\'s website has carried your business since 2009 without a security review; this engagement is a full audit of that site — code-era flaws included — before you commit to the planned rebuild.</p>' .
'<p><b>Scope:</b> the BrightTravel web application on this host and port, in full: public pages, customer accounts, the staff workflow and the admin panel. The seeded customer and staff accounts and any account you register are in scope. Other hosts, ports and labs are <b>out of scope</b>.</p>' .
'<p><b>Approach:</b> black-box testing first, then a source review pass (the Review page), exactly as we would separate the two on a paid engagement. Every test is scored server-side at the moment the flaw is genuinely exercised — a UNION that returns user rows, an admin account that actually gets created — never for merely visiting a page.</p>' .
'<p><b>Rules of engagement:</b> no denial of service; no destruction of booking data beyond what a proof requires; everything is logged (see the Logs page — treat it as the client\'s own log review).</p>' .
'<p><b>Accounts provided:</b> a low-privilege staff account — <code>tom.clerk</code> / <code>Harbour!2012</code> — and a customer account — <code>priya.sharma</code> / <code>Monsoon#44</code>. Admin credentials were <b>not</b> provided. Reaching the admin panel is part of the test.</p>' .
'<p><b>Deliverable:</b> a full audit report submitted on the Complete page: an executive summary and at least three findings in professional format. The capstone is complete when all fourteen tests pass and the report is filed.</p>' .
'<p><i>Signed, the assessment team.</i></p></div>';
lab_foot();
