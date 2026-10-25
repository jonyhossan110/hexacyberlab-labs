<?php
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $st = db()->prepare("SELECT * FROM users WHERE email = ?");
    $st->execute([trim($_POST['email'] ?? '')]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if ($u && hash_equals($u['password_hash'], hash('sha256', $_POST['password'] ?? ''))) {
        $token = hp_issue_token($u, 'login');
        $_SESSION['user_id'] = $u['id'];
        $_SESSION['token'] = $token;
        setcookie('hp_token', $token, ['path' => '/', 'httponly' => false]); // the dashboard JS reads it to call the API
        header('Location: /dashboard'); exit;
    }
    $msg = 'Invalid email or password.';
}
layout_head('Login');
echo '<h1>Log in to HexaPay</h1>' . ($msg ? '<p class="err">' . $msg . '</p>' : '') .
'<form method="post" class="form"><label>Email<input name="email" type="text" required></label>' .
'<label>Password<input name="password" type="password" required></label><button>Log in</button></form>' .
'<p class="muted">Demo user: priya.nair@example.in / Monsoon!24</p>';
layout_foot();
