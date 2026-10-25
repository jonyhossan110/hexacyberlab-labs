<?php
/* Profile editor — every logged-in user has one.
   The form shows your role as plain text; there is no role field anywhere
   on the page. The save handler, however, happily applies a role if the
   request happens to carry one. WordPress plugins have shipped exactly
   this bug in the real world. */
require_login();
$u = current_user();
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $before = $u['role'];
    $name = trim($_POST['display_name'] ?? $u['name']);
    $email = trim($_POST['email'] ?? $u['email']);
    $bio = trim($_POST['bio'] ?? $u['bio']);
    db()->prepare("UPDATE users SET name = ?, email = ?, bio = ? WHERE id = ?")->execute([$name, $email, $bio, $u['id']]);
    if (isset($_POST['role']) && $_POST['role'] !== '') {
        // trusted straight from the request — no capability check, no allow-list
        db()->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([strtolower(trim($_POST['role'])), $u['id']]);
        hp_log('PROFILE role change for ' . $u['email'] . ': ' . $before . ' -> ' . strtolower(trim($_POST['role'])));
    }
    $u = current_user();
    if ($before !== 'administrator' && $u['role'] === 'administrator') {
        rs_pass('privilege-escalation');
        $msg = 'Profile saved. Note: your role is now administrator — the wp-admin settings panels are unlocked.';
    } else $msg = 'Profile saved.';
    $_SESSION['user_email'] = $u['email'];
}
layout_head('Profile');
echo '<h1>Profile</h1>' . ($msg ? '<p class="ok">' . $msg . '</p>' : '') .
'<form method="post" class="form"><label>Display name<input name="display_name" value="' . htmlspecialchars($u['name']) . '"></label>' .
'<label>Email<input name="email" value="' . htmlspecialchars($u['email']) . '"></label>' .
'<label>Biographical info<textarea name="bio">' . htmlspecialchars($u['bio']) . '</textarea></label>' .
'<p class="muted">Username (slug): <code>' . htmlspecialchars($u['slug']) . '</code> · Role: <b>' . htmlspecialchars($u['role']) . '</b> (roles are assigned by an administrator)</p>' .
'<button>Update profile</button></form>';
layout_foot();
