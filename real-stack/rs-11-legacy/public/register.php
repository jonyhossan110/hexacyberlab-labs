<?php
require_once __DIR__ . '/../inc/common.php';
$PAGE_TITLE = 'Register';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $un = trim($_POST['username'] ?? ''); $fn = trim($_POST['fullname'] ?? '');
    $em = trim($_POST['email'] ?? ''); $pw = $_POST['password'] ?? '';
    if ($un && $fn && $em && $pw) {
        try {
            $st = db()->prepare("INSERT INTO users (username,fullname,email,passhash,role,created) VALUES (?,?,?,?,'customer',date('now'))");
            $st->execute(array($un, $fn, $em, md5($pw)));
            $_SESSION['user_id'] = db()->lastInsertId();
            $_SESSION['username'] = $un;
            bt_log('REGISTER ' . $un);
            header('Location: /bookings.php'); exit;
        } catch (Exception $e) { $msg = 'Could not register: ' . $e->getMessage(); }
    } else $msg = 'Please fill in every field.';
}
include __DIR__ . '/../inc/header.php';
?>
<h1>Register</h1>
<?php if ($msg) echo '<p class="err">' . htmlspecialchars($msg) . '</p>'; ?>
<form method="post" class="form"><label>Username<input name="username" required></label>
<label>Full name<input name="fullname" required></label>
<label>Email<input name="email" type="email" required></label>
<label>Password<input name="password" type="password" required></label><button>Create my account</button></form>
<p class="muted">Registering lets you see your bookings online. (The MD5 hasher thanks you for your trust.)</p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
