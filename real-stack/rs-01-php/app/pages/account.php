<?php
require_login();
$u = current_user();
$cfg = require __DIR__ . '/../config.php';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'avatar' && !empty($_FILES['avatar']['name'])) {
    // avatar upload: the file keeps its name and goes straight into uploads/
    $name = $_FILES['avatar']['name'];
    $dest = LAB_ROOT . '/uploads/' . $name;
    if (move_uploaded_file($_FILES['avatar']['tmp_name'], $dest)) {
        db()->prepare("UPDATE users SET avatar = ? WHERE id = ?")->execute(['/uploads/' . $name, $u['id']]);
        $msg = 'Avatar updated: /uploads/' . $name;
        nk_log('AVATAR upload ' . $name);
    } else $msg = 'Upload failed.';
    $u = current_user();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'promo') {
    $given = $_POST['code'] ?? '';
    // staff promo: loose comparison against a magic hash — type juggling lives here
    if ($given == $cfg['promo_hash']) {
        db()->prepare("UPDATE users SET balance = balance + 50 WHERE id = ?")->execute([$u['id']]);
        if ($given !== $cfg['promo_hash']) rs_pass('type-juggling');
        $msg = 'Promo applied: €50 staff credit added.';
        nk_log('PROMO applied by ' . $u['email']);
    } else $msg = 'That promo code is not valid.';
    $u = current_user();
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['do']) && $_POST['do'] === 'transfer') {
    $toEmail = $_POST['to'] ?? ''; $amount = (float)($_POST['amount'] ?? 0);
    $st = db()->prepare("SELECT * FROM users WHERE email = ?"); $st->execute([$toEmail]);
    $to = $st->fetch(PDO::FETCH_ASSOC);
    if ($to && $amount > 0 && $amount <= $u['balance']) {
        db()->prepare("UPDATE users SET balance = balance - ? WHERE id = ?")->execute([$amount, $u['id']]);
        db()->prepare("UPDATE users SET balance = balance + ? WHERE id = ?")->execute([$amount, $to['id']]);
        db()->prepare("INSERT INTO transfers (from_id,to_id,amount,created) VALUES (?,?,?,date('now'))")->execute([$u['id'], $to['id'], $amount]);
        // no CSRF token exists anywhere in this app — a tokenless cross-site POST is a forgery
        $hasToken = !empty($_POST['csrf_token']);
        $ref = $_SERVER['HTTP_REFERER'] ?? '';
        $refHost = $ref ? parse_url($ref, PHP_URL_HOST) . ':' . (parse_url($ref, PHP_URL_PORT) ?: '') : '';
        if (!$hasToken && ($ref === '' || $refHost !== $_SERVER['HTTP_HOST'])) rs_pass('csrf-transfer');
        $msg = 'Sent ' . money($amount) . ' to ' . htmlspecialchars($toEmail) . '.';
        nk_log('TRANSFER ' . money($amount) . ' to ' . $toEmail);
    } else $msg = 'Transfer failed — check the recipient and amount.';
    $u = current_user();
}
layout_head('Account');
echo '<h1>Hei, ' . htmlspecialchars($u['name']) . '</h1>' .
($u['avatar'] ? '<img src="' . htmlspecialchars($u['avatar']) . '" style="width:72px;height:72px;object-fit:cover;border-radius:50%">' : '') .
'<p>' . htmlspecialchars($u['email']) . ' · role: ' . htmlspecialchars($u['role']) . ' · wallet balance: <b>' . money($u['balance']) . '</b></p>' .
($msg ? '<p class="ok">' . $msg . '</p>' : '') .
'<h2>Profile picture</h2><form method="post" enctype="multipart/form-data" class="form"><input type="hidden" name="do" value="avatar"><input type="file" name="avatar" required><button>Upload avatar</button></form>' .
'<h2>Staff promo</h2><form method="post" class="form"><input type="hidden" name="do" value="promo"><label>Promo code<input name="code" placeholder="Staff only"></label><button>Apply</button></form>' .
'<h2>Send money to a friend</h2><form method="post" class="form"><input type="hidden" name="do" value="transfer"><label>Recipient email<input name="to" type="email" required></label><label>Amount (€)<input name="amount" type="number" step="0.01" min="1" required></label><button>Send</button></form>' .
'<p class="muted">Your invoices live in <a href="/download?file=invoice-1001.txt">/download</a>.</p>';
layout_foot();
