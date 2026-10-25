<?php
/* Application log — the blue team reads this. Every request the app handles
   is written here, API calls included, exactly like a real service log. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
function hp_log($line){
    $dir = LAB_ROOT . '/logs';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $who = $GLOBALS['HP_WHO'] ?? null;
    if (!$who && !empty($_SESSION['user_id'])) $who = 'web-session#' . $_SESSION['user_id'];
    if (!$who) $who = 'guest';
    $entry = '[' . date('Y-m-d H:i:s') . '] ' . ($_SERVER['REMOTE_ADDR'] ?? '-') . ' ' . $who . ' ' . $line . PHP_EOL;
    file_put_contents($dir . '/app.log', $entry, FILE_APPEND);
}
