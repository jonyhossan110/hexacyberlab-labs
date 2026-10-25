<?php
/* Application log — the blue team reads this. Every request the app handles
   is written here, exactly like a real server's access/application log. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
function hb_log($line){
    $dir = LAB_ROOT . '/logs';
    if (!is_dir($dir)) mkdir($dir, 0777, true);
    $who = isset($_SESSION['user']['email']) ? $_SESSION['user']['email'] : 'guest';
    $entry = '[' . date('Y-m-d H:i:s') . '] ' . ($_SERVER['REMOTE_ADDR'] ?? '-') . ' ' . $who . ' ' . $line . PHP_EOL;
    file_put_contents($dir . '/app.log', $entry, FILE_APPEND);
}
