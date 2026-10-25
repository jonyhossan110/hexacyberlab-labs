<?php
/* Application log — written by every page, exactly like the old site's
   home-grown logger. The blue team reads this on the lab's Logs page. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
function bt_log($line){
    $dir = LAB_ROOT . '/logs';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $who = (session_status() === PHP_SESSION_ACTIVE && !empty($_SESSION['username'])) ? $_SESSION['username'] : 'guest';
    $entry = '[' . date('Y-m-d H:i:s') . '] ' . ($_SERVER['REMOTE_ADDR'] ?? '-') . ' ' . $who . ' ' . $line . PHP_EOL;
    file_put_contents($dir . '/app.log', $entry, FILE_APPEND);
}
