<?php
/* The contact page is provided by the Hexa Contact plugin — the same plugin
   whose admin side runs the message search you will meet in wp-admin. */
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    hc_save_message(trim($_POST['name'] ?? ''), trim($_POST['email'] ?? ''), trim($_POST['message'] ?? ''));
    hp_log('CONTACT message received from ' . ($_POST['email'] ?? ''));
    $msg = 'Thank you — your message is in the editors\u{2019} inbox. We reply within a few days.';
}
layout_head('Contact');
echo '<h1>Contact the editors</h1>' .
'<p class="muted">Corrections, press trips, reprint requests — or just tell us where the night train took you. This form is powered by the <b>Hexa Contact</b> plugin.</p>' .
($msg ? '<p class="ok">' . $msg . '</p>' : '') .
'<form method="post" class="form"><label>Your name<input name="name" required></label>' .
'<label>Your email<input name="email" type="email" required></label>' .
'<label>Message<textarea name="message" required></textarea></label><button>Send message</button></form>';
layout_foot();
