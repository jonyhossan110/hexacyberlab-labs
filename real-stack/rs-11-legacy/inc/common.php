<?php
/* common.php — included at the top of every page since 2009.
   Starts the session, loads everything, logs the visit. Nothing here has
   been reviewed since the site "worked fine". */
define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/inc/progress.php';
require_once LAB_ROOT . '/inc/log.php';
require_once LAB_ROOT . '/inc/db.php';
$CFG = require LAB_ROOT . '/inc/config.php';
if ($CFG['debug']) { ini_set('display_errors', '1'); error_reporting(E_ALL); }

session_start();
/* Session bookkeeping the auditor asked about: the server keeps a list of
   the session ids IT issued (first visit, no cookie presented). Login never
   regenerates the id — so an id that was never issued by the server but
   arrives with a successful login was supplied by the client. */
if (!isset($_COOKIE[session_name()])) {
    $issuedFile = LAB_ROOT . '/logs/issued_sessions.txt';
    $issued = is_file($issuedFile) ? file($issuedFile, FILE_IGNORE_NEW_LINES) : [];
    if (!in_array(session_id(), $issued)) file_put_contents($issuedFile, session_id() . PHP_EOL, FILE_APPEND);
}
function bt_session_was_issued(){
    $f = LAB_ROOT . '/logs/issued_sessions.txt';
    if (!is_file($f)) return false;
    return in_array(session_id(), file($f, FILE_IGNORE_NEW_LINES));
}
bt_log($_SERVER['REQUEST_METHOD'] . ' ' . ($_SERVER['REQUEST_URI'] ?? ''));

function current_user(){
    if (empty($_SESSION['user_id'])) return null;
    $st = db()->prepare("SELECT * FROM users WHERE id = ?");
    $st->execute([$_SESSION['user_id']]);
    return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
function require_login(){
    if (!current_user()) { header('Location: /login.php'); exit; }
}
function require_admin(){
    $u = current_user();
    if (!$u || $u['role'] !== 'admin') { header('Location: /login.php'); exit; }
    return $u;
}
function money($v){ return '£' . number_format((float)$v, 2); }
function stars($n){ return str_repeat('★', (int)$n); }
