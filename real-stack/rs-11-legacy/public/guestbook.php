<?php
require_once __DIR__ . '/../inc/common.php';
$PAGE_TITLE = 'Guestbook';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = isset($_POST['name']) ? $_POST['name'] : '';
    $text = isset($_POST['message']) ? $_POST['message'] : '';
    if ($name !== '' && $text !== '') {
        $st = db()->prepare("INSERT INTO guestbook (name,message,created) VALUES (?,?,date('now'))");
        $st->execute(array($name, $text));
        bt_log('GUESTBOOK entry by ' . $name);
        header('Location: /guestbook.php'); exit;
    } else $msg = 'Please add your name and a message.';
}
$entries = db()->query("SELECT * FROM guestbook ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
include __DIR__ . '/../inc/header.php';
?>
<h1>Guestbook</h1>
<?php if ($msg) echo '<p class="err">' . $msg . '</p>'; ?>
<form method="post" class="form"><label>Your name<input name="name" required></label>
<label>Your message<textarea name="message" required></textarea></label><button>Sign the guestbook</button></form>
<?php foreach ($entries as $e) {
    // entries are printed exactly as they were typed — that was the charm, in 2009
    echo '<div class="review"><b>' . $e['name'] . '</b> <span class="muted">' . $e['created'] . '</span><p>' . $e['message'] . '</p></div>';
    if (preg_match('/<script|onerror|<svg|<img/i', $e['name'] . ' ' . $e['message'])) rs_pass('xss-guestbook');
} ?>
<?php include __DIR__ . '/../inc/footer.php'; ?>
