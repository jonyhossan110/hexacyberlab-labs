<?php
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? ''; $pass = $_POST['password'] ?? '';
    // the original login: credentials glued into one query
    $sql = "SELECT * FROM users WHERE email = '" . $email . "' AND password = '" . $pass . "'";
    try { $row = db()->query($sql)->fetch(PDO::FETCH_ASSOC); } catch (Exception $e) { $row = null; $msg = 'Database error: ' . $e->getMessage(); }
    if ($row) {
        $real = db()->prepare("SELECT password FROM users WHERE email = ?"); $real->execute([$row['email']]);
        if (strpos($email, "'") !== false || $pass !== $real->fetchColumn()) rs_pass('sqli-login');
        $_SESSION['user_id'] = $row['id'];
        nk_log('LOGIN ok ' . $row['email']);
        header('Location: /account'); exit;
    }
    $n = rs_attempt('login:' . strtolower($email));
    nk_log('LOGIN fail ' . $email . ' (attempt ' . $n . ')');
    if ($n >= 10) rs_pass('brute-force'); // ten failures and the door is still wide open
    if (!$msg) $msg = 'Invalid email or password.';
}
layout_head('Login');
echo '<h1>Login</h1>' . ($msg ? '<p class="err">' . $msg . '</p>' : '') .
'<form method="post" class="form"><label>Email<input name="email" type="text" required></label>' .
'<label>Password<input name="password" type="password" required></label><button>Log in</button></form>' .
'<p class="muted">Demo customer: lars.pettersen@example.no / Sommer2023! — or register your own account.</p>';
layout_foot();
