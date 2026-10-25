<?php
/* HexaBilling front controller — every dynamic request lands here, the
   way public/index.php works in a real Laravel application. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
require LAB_ROOT . '/app/bootstrap.php';

session_name('hexabilling_session');
session_start();
if (empty($_SESSION['_token'])) $_SESSION['_token'] = bin2hex(random_bytes(16));
// Laravel hands the CSRF token to the front end in this cookie
setcookie('XSRF-TOKEN', $_SESSION['_token'], ['path' => '/', 'samesite' => 'Lax']);
header('X-Powered-By: PHP/8.3 (HexaBilling)');

if (cfg('debug')) { ini_set('display_errors', '1'); error_reporting(E_ALL); }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
hb_log($_SERVER['REQUEST_METHOD'] . ' ' . $path . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));

$router = require LAB_ROOT . '/app/routes.php';
try {
    $router->dispatch($_SERVER['REQUEST_METHOD'], $path);
} catch (Throwable $e) {
    if (cfg('debug')) {
        /* Ignition-style error page: exception, trace — and the environment. */
        rs_pass('debug-exposure');
        http_response_code(500);
        echo '<!DOCTYPE html><html><head><title>' . e(get_class($e)) . ' · HexaBilling</title></head>' .
        '<body style="margin:0;font-family:monospace;background:#1a202c;color:#e2e8f0">' .
        '<div style="background:#dd6b20;color:#fff;padding:22px 30px"><div style="font-size:13px">Whoops — something went wrong (APP_DEBUG=true)</div>' .
        '<h1 style="margin:6px 0;font-size:22px">' . e(get_class($e)) . '</h1><p>' . e($e->getMessage()) . '</p>' .
        '<p style="opacity:.85">' . e($e->getFile()) . ' on line ' . $e->getLine() . '</p></div>' .
        '<div style="padding:20px 30px"><h2>Environment &amp; details</h2><table style="border-collapse:collapse">';
        foreach (hb_env() as $k => $v) {
            echo '<tr><td style="padding:4px 14px 4px 0;color:#90cdf4">' . e($k) . '</td><td>' . e($v) . '</td></tr>';
        }
        echo '</table><h2>Stack trace</h2><pre style="white-space:pre-wrap;font-size:12.5px">' . e($e->getTraceAsString()) . '</pre></div></body></html>';
    } else {
        http_response_code(500);
        echo '500 — Server Error';
    }
}
