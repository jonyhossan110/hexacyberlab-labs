<?php
/* Web-view session helpers (the companion dashboard). The web login issues
   the same API token and keeps it in the session + a cookie, so the
   dashboard really does talk to the API like any other client. */
function current_user(){
    if (empty($_SESSION['user_id'])) return null;
    $st = db()->prepare("SELECT * FROM users WHERE id = ?");
    $st->execute([$_SESSION['user_id']]);
    return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
function require_login(){
    if (!current_user()) { header('Location: /login'); exit; }
}
