<?php
/* wp-login.php — deliberately styled and named the WordPress way,
   field names (log / pwd) included. */
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $login = $_POST['log'] ?? ''; $pass = $_POST['pwd'] ?? '';
    $st = db()->prepare("SELECT * FROM users WHERE email = ? OR slug = ?");
    $st->execute([$login, $login]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row && $pass === $row['password']) {
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['user_email'] = $row['email'];
        hp_log('LOGIN ok ' . $row['email']);
        header('Location: /wp-admin'); exit;
    }
    hp_log('LOGIN fail ' . $login);
    $msg = 'Error: the password you entered for "' . htmlspecialchars($login) . '" is incorrect. Lost your password?';
}
layout_head('Log In');
echo '<div class="loginbox"><h1>⬢ WanderPress</h1>' . ($msg ? '<p class="err">' . $msg . '</p>' : '') .
'<form method="post" class="form"><label>Username or Email Address<input name="log" required></label>' .
'<label>Password<input name="pwd" type="password" required></label><button>Log In</button></form>' .
'<p class="muted">Demo accounts — administrator: elena@wanderpress.example / Summit!Admin24 · subscriber: liam.oconnor@example.ie / Emerald!5 · or <a href="/register">register</a> (new accounts are subscribers).</p></div>';
layout_foot();
