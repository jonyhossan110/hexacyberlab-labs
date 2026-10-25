<?php
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? ''); $email = trim($_POST['email'] ?? ''); $pass = $_POST['password'] ?? '';
    try {
        $slug = make_slug($name);
        $st = db()->prepare("SELECT COUNT(*) FROM users WHERE slug = ?"); $st->execute([$slug]);
        if ($st->fetchColumn() > 0) $slug .= '-' . random_int(100, 999);
        // new registrations are subscribers — the lowest role on the site
        $st = db()->prepare("INSERT INTO users (name,email,password,role,slug,bio,registered) VALUES (?,?,?,'subscriber',?,'',date('now'))");
        $st->execute([$name, $email, $pass, $slug]);
        $_SESSION['user_id'] = db()->lastInsertId();
        $_SESSION['user_email'] = $email;
        hp_log('REGISTER ' . $email . ' (subscriber)');
        header('Location: /wp-admin'); exit;
    } catch (Exception $e) { $msg = 'Could not register: ' . $e->getMessage(); }
}
layout_head('Register');
echo '<h1>Register on WanderPress</h1>' . ($msg ? '<p class="err">' . htmlspecialchars($msg) . '</p>' : '') .
'<form method="post" class="form"><label>Display name<input name="name" required></label><label>Email<input name="email" type="email" required></label>' .
'<label>Password<input name="password" type="password" required></label><button>Register</button></form>' .
'<p class="muted">New accounts start as <b>subscribers</b>: you can comment, upload media, and edit your profile. Nothing more. In theory.</p>';
layout_foot();
