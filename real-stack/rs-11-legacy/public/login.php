<?php
require_once __DIR__ . '/../inc/common.php';
$PAGE_TITLE = 'Log in';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = isset($_POST['username']) ? $_POST['username'] : '';
    $p = isset($_POST['password']) ? $_POST['password'] : '';
    // the login, as written in 2009: username glued in, password MD5'd in
    $sql = "SELECT * FROM users WHERE username = '" . $u . "' AND passhash = '" . md5($p) . "'";
    try { $row = db()->query($sql)->fetch(PDO::FETCH_ASSOC); } catch (Exception $e) { $row = null; $msg = 'Database error: ' . $e->getMessage(); }
    if ($row) {
        /* ---- lab detection: how did this login really happen? ---- */
        $isSqli = (strpos($u, "'") !== false) || (md5($p) !== $row['passhash']);
        if ($isSqli) {
            rs_pass('sqli-login');
            if ($row['role'] === 'admin') $_SESSION['exploit_path'] = 'sqli';
            bt_log('LOGIN via SQL injection as ' . $row['username']);
        } else {
            if ($u === 'siteadmin' && $p === 'admin') {
                rs_pass('default-credentials');
                $_SESSION['exploit_path'] = 'default';
                bt_log('LOGIN with vendor-default credentials (siteadmin)');
            } elseif ($row['username'] === 'admin' && md5($p) === $row['passhash']) {
                // the MD5 admin's real password can only be known by cracking
                // the hash (or reading the source — also an audit finding)
                $_SESSION['exploit_path'] = 'cracked-admin';
                bt_log('LOGIN as admin with the cracked MD5 password');
            }
            $prog = rs_progress();
            if ($row['role'] === 'admin' && !empty($prog['csrf_admin_user']) && $prog['csrf_admin_user'] === $row['username']) {
                $_SESSION['exploit_path'] = 'csrf-created';
                bt_log('LOGIN as the CSRF-created admin ' . $row['username']);
            }
        }
        // the session id is NOT regenerated at login — fixation survives
        if (!bt_session_was_issued()) {
            rs_pass('session-fixation');
            bt_log('LOGIN on a client-supplied session id (fixation)');
        }
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['username'] = $row['username'];
        bt_log('LOGIN ok ' . $row['username']);
        header('Location: ' . ($row['role'] === 'admin' ? '/admin.php' : '/bookings.php'));
        exit;
    }
    rs_attempt('login:' . strtolower($u));
    bt_log('LOGIN fail ' . $u);
    if (!$msg) $msg = 'Unknown username or password.';
}
include __DIR__ . '/../inc/header.php';
?>
<h1>Log in</h1>
<?php if ($msg) echo '<p class="err">' . htmlspecialchars($msg) . '</p>'; ?>
<form method="post" class="form"><label>Username<input name="username" type="text" required></label>
<label>Password<input name="password" type="password" required></label><button>Log in</button></form>
<p class="muted">New here? <a href="/register.php">Register</a>. Staff: use the username Tom gave you.</p>
<?php include __DIR__ . '/../inc/footer.php'; ?>
