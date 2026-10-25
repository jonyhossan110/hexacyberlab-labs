<?php
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'] ?? ''; $email = $_POST['email'] ?? ''; $pass = $_POST['password'] ?? '';
    try {
        $st = db()->prepare("INSERT INTO users (name,email,password,role,balance) VALUES (?,?,?,'customer',100.00)");
        $st->execute([$name, $email, $pass]);
        $_SESSION['user_id'] = db()->lastInsertId();
        header('Location: /account'); exit;
    } catch (Exception $e) { $msg = 'Could not register: ' . $e->getMessage(); }
}
layout_head('Register');
echo '<h1>Create your account</h1>' . ($msg ? '<p class="err">' . htmlspecialchars($msg) . '</p>' : '') .
'<form method="post" class="form"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label>' .
'<label>Password<input name="password" type="password" required></label><button>Register</button></form>' .
'<p class="muted">New accounts start with a €100 welcome balance.</p>';
layout_foot();
