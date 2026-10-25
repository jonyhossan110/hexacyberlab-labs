<?php
layout_head('Real Website Guide');
echo '<h1>📖 Real Website Guide — recognising WordPress (and HexaPress)</h1>' .
'<h2>Fingerprint drill — prove it is WordPress before you test</h2>' .
'<ul><li><b>Paths:</b> <code>/wp-login.php</code>, <code>/wp-admin/</code>, assets under <code>/wp-content/</code> and <code>/wp-includes/</code> — view-source any page and search for them.</li>' .
'<li><b>Generator meta:</b> <code>&lt;meta name="generator" content="WordPress 6.x"&gt;</code> — this site answers <code>HexaPress 6.4.2</code>. Version numbers are a gift: they map to public changelogs.</li>' .
'<li><b>readme.html:</b> stock installs ship <code>/readme.html</code> announcing the exact version.</li>' .
'<li><b>REST index:</b> <code>/wp-json/</code> lists every route the site exposes.</li>' .
'<li><b>Tools:</b> <code>whatweb</code> and <b>WPScan</b> do all of the above in seconds and check plugin versions against known-vulnerability databases.</li></ul>' .
'<h2>What to test first on a real WordPress site</h2>' .
'<ol><li><b>Plugins and themes first, core last.</b> The overwhelming majority of real WordPress compromises enter through a plugin — enumerate them, note versions, check them against public vulnerability databases.</li>' .
'<li><b>User enumeration:</b> <code>/?author=1</code> redirects, the REST users route, and login error messages — three doors to the same list of usernames.</li>' .
'<li><b>xmlrpc.php:</b> still enabled on millions of sites; the multicall method turns it into a password-guessing machine that ignores wp-login rate limits.</li>' .
'<li><b>Files in wp-content:</b> <code>debug.log</code>, backup files, and uploads folders that execute code.</li>' .
'<li><b>admin-ajax actions:</b> every plugin registers them; the good ones check capabilities and nonces, the famous CVEs did neither.</li></ol>' .
'<h2>Burp workflow for this lab</h2>' .
'<p>Proxy the site and let the site map grow. Work the <b>admin-ajax</b> search and the <b>xmlrpc multicall</b> body in <b>Repeater</b> — one request, ten password guesses is the whole lesson. Walk <code>?author=</code> ids in <b>Intruder</b> and compare the 301s against the 200s. When the gallery template parameter smells like a file path, it is one: fuzz it in Repeater with <code>../</code> sequences and watch response lengths in <b>Comparer</b>.</p>' .
'<h2>The professional habit</h2>' .
'<p>On WordPress engagements your report names the exact plugin, its version, and the public references for its flaws. The Complete page will ask you to write one finding up properly — that write-up is what a client actually pays for.</p>';
layout_foot();
