<?php
require_once __DIR__ . '/../layout.php';
lab_head('Audit Guide');
echo '<h1>📖 Guide — auditing legacy PHP</h1>' .
'<h2>Fingerprinting old code</h2>' .
'<ul><li><b>Page-per-file URLs:</b> <code>hotel.php</code>, <code>booking.php?id=…</code> — every file is its own attack surface, written by whoever was around that year.</li>' .
'<li><b>Session cookie:</b> <code>PHPSESSID</code>, and watch whether it changes at login. On old code it usually does not.</li>' .
'<li><b>Errors:</b> legacy sites print database errors with file paths and query fragments — free schema reconnaissance.</li>' .
'<li><b>Comments and leftovers:</b> view-source comments, <code>config.old</code>, <code>backup.sql</code>, installer accounts. Old sites carry their whole history in the web root.</li>' .
'<li><b>Hash shape:</b> a 32-hex-character password hash is MD5 until proven otherwise — and MD5 falls to any wordlist in seconds.</li></ul>' .
'<h2>Where the bodies are buried in legacy PHP</h2>' .
'<ol><li><b>Every query.</b> Concatenation was the house style for a decade: login, search, and every numeric id in every URL.</li>' .
'<li><b>include() with a parameter.</b> <code>?page=</code>/<code>?show=</code> include patterns are LFI until proven otherwise.</li>' .
'<li><b>extract($_GET), register_globals habits.</b> Request data becoming variables silently.</li>' .
'<li><b>State-changing GETs.</b> Admin actions built as links — bookmarkable, emailable, forgeable (CSRF with no token anywhere).</li>' .
'<li><b>Uploads in the web root.</b> If uploaded files keep their names and the folder executes PHP, upload = shell.</li>' .
'<li><b>Sessions that never regenerate,</b> default installer accounts, and backups beside the code.</li></ol>' .
'<h2>Burp workflow for this audit</h2>' .
'<p>Proxy the site and crawl it like a customer first — book nothing, just map every <code>.php</code> file and parameter. Work the login and search in <b>Repeater</b>; the booking ids are an <b>Intruder</b> walk; keep the guestbook open in a second tab to watch stored content render. The admin panel\'s add-user URL belongs in a browser where <i>you</i> are not the admin — that contrast is the CSRF lesson. Finish in the Code Review, matching every black-box finding to its line of source.</p>' .
'<h2>The auditor\'s habit</h2>' .
'<p>Chain, don\'t collect: a hash alone is a finding; a hash cracked is a compromise; a cracked admin in the panel is the headline of your report. The capstone\'s admin-takeover test exists to reward exactly that thinking.</p>';
lab_foot();
