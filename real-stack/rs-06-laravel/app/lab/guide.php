<?php
layout_head('Real Website Guide');
echo '<h1>📖 Real Website Guide — recognising Laravel</h1>' .
'<h2>Fingerprint drill — prove it is Laravel before you test</h2>' .
'<ul><li><b>Cookies:</b> an <code>XSRF-TOKEN</code> cookie plus a session cookie — Laravel hands the CSRF token to the front end exactly this way. (This lab\'s session cookie is <code>hexabilling_session</code>.)</li>' .
'<li><b>Hidden field:</b> every POST form carries <code>_token</code>. That is Laravel\'s CSRF convention.</li>' .
'<li><b>419 Page Expired:</b> POST without a valid token and Laravel answers 419 — a fingerprint in itself. Try it.</li>' .
'<li><b>Paths:</b> uploads and files under <code>/storage/…</code>, routes shaped like <code>/invoices/{id}</code> with verbs on separate URIs.</li>' .
'<li><b>The orange error page:</b> Ignition — Laravel\'s debug error page — with its environment tab is unmistakable, and it means <code>APP_DEBUG=true</code>.</li>' .
'<li><b>WhatWeb:</b> <code>whatweb http://localhost:3206</code> plus a deliberate 419 gets you most of this in seconds.</li></ul>' .
'<h2>What to test first on a real Laravel site</h2>' .
'<ol><li><b>Mass assignment:</b> every update endpoint — profile, settings, admin panels. Add fields the form never showed (role, plan, is_admin, balance). Laravel\'s <code>$guarded = []</code> mistake is endemic.</li>' .
'<li><b>Raw output:</b> search templates and stored content for <code>{!! !!}</code> — each one is a stored-XSS candidate.</li>' .
'<li><b>Raw queries:</b> <code>whereRaw</code>, <code>DB::raw</code>, concatenated SQL in search and reporting.</li>' .
'<li><b>Debug & env:</b> trigger an error and read it; probe for an exposed <code>.env</code> — with APP_KEY an attacker can forge signed cookies and decrypt data.</li>' .
'<li><b>Tokens & tenancy:</b> API tokens in plaintext, shown in UIs, never expiring; and every {id} route checked for workspace scoping.</li></ol>' .
'<h2>Burp workflow for this lab</h2>' .
'<p>Capture a legitimate profile update in <b>Repeater</b> and append fields the form never sent — watch the response and your plan badge. Use <b>Intruder</b> on the login to feel the missing throttle (ten failures, tests flip). For the token test, copy a token out of the team page into an <b>Authorization: Bearer</b> header in Repeater — no browser session at all.</p>' .
'<h2>The professional habit</h2>' .
'<p>Note every flaw as: what, where, proof, impact. The Complete page will ask you to write one up properly — that write-up is what a client actually pays for.</p>';
layout_foot();
