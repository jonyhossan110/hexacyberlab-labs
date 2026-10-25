<?php
function current_user(){
    if (empty($_SESSION['user_id'])) return null;
    $st = db()->prepare("SELECT * FROM users WHERE id = ?");
    $st->execute([$_SESSION['user_id']]);
    return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
function require_login(){
    if (!current_user()) { header('Location: /wp-login.php'); exit; }
}
function is_admin($u){ return $u && $u['role'] === 'administrator'; }
function require_admin(){
    $u = current_user();
    if (!$u) { header('Location: /wp-login.php'); exit; }
    if (!is_admin($u)) {
        layout_head('Forbidden');
        echo '<h1>Sorry, you are not allowed to access this page.</h1><p class="muted">That is what wp-admin says, too.</p>';
        layout_foot();
        exit;
    }
    return $u;
}
function make_slug($name){
    $s = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-'));
    return $s !== '' ? $s : 'user';
}
