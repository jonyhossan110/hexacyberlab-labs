<?php
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? ''); $email = trim($_POST['email'] ?? ''); $pw = $_POST['password'] ?? '';
    try {
        db()->prepare("INSERT INTO users (name, email, password_hash, role, phone, created) VALUES (?,?,?,'customer','',datetime('now'))")
            ->execute([$name, $email, hash('sha256', $pw)]);
        $uid = (int)db()->lastInsertId();
        db()->prepare("INSERT INTO accounts (user_id, label, balance, currency, opened) VALUES (?, 'Everyday wallet', 250.00, 'EUR', datetime('now'))")->execute([$uid]);
        $st = db()->prepare("SELECT * FROM users WHERE id = ?"); $st->execute([$uid]); $u = $st->fetch(PDO::FETCH_ASSOC);
        $token = hp_issue_token($u, 'register');
        $_SESSION['user_id'] = $uid; $_SESSION['token'] = $token;
        setcookie('hp_token', $token, ['path' => '/', 'httponly' => false]);
        header('Location: /dashboard'); exit;
    } catch (Exception $e) { $msg = 'Could not register — that email may already exist.'; }
}
layout_head('Register');
echo '<h1>Create your HexaPay account</h1>' . ($msg ? '<p class="err">' . htmlspecialchars($msg) . '</p>' : '') .
'<form method="post" class="form"><label>Display name<input name="name" required></label><label>Email<input name="email" type="email" required></label>' .
'<label>Password<input name="password" type="password" required></label><button>Register</button></form>' .
'<p class="muted">New wallets start with a €250 welcome balance (play money).</p>';
layout_foot();
