<?php
/* HexaPay front controller — API requests return JSON, everything else
   renders the small web view or the lab pages. */
define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';
require_once LAB_ROOT . '/app/db.php';
require_once LAB_ROOT . '/app/api.php';
require_once LAB_ROOT . '/app/api_handlers.php';
require_once LAB_ROOT . '/app/auth.php';
require_once LAB_ROOT . '/app/layout.php';
$cfg = require LAB_ROOT . '/app/config.php';
if ($cfg['debug']) { ini_set('display_errors', '1'); error_reporting(E_ALL); }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

/* ---------------- API branch (JSON, no session) ---------------- */
if ($path === '/api' || strpos($path, '/api/') === 0) {
    hp_cors();
    register_shutdown_function(function() use ($method, $path) {
        hp_log($method . ' ' . $path . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));
    });
    if ($method === 'OPTIONS') { http_response_code(204); exit; }
    try {
        api_route($method, $path);
    } catch (Throwable $e) {
        // debug is ON — API errors come back verbose, paths and all
        hp_json(['error' => 'server_error', 'detail' => $e->getMessage(), 'in' => $e->getFile() . ':' . $e->getLine()], 500);
    }
    exit;
}

/* ---------------- Web branch (session) ---------------- */
session_start();
hp_log($method . ' ' . $path . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));
ob_start();
try {
    switch ($path) {
        case '/':            require LAB_ROOT . '/app/pages/home.php'; break;
        case '/login':       require LAB_ROOT . '/app/pages/login.php'; break;
        case '/register':    require LAB_ROOT . '/app/pages/register.php'; break;
        case '/logout':      require LAB_ROOT . '/app/pages/logout.php'; break;
        case '/dashboard':   require LAB_ROOT . '/app/pages/dashboard.php'; break;
        case '/lab/brief':   require LAB_ROOT . '/app/lab/brief.php'; break;
        case '/lab/tests':   require LAB_ROOT . '/app/lab/tests.php'; break;
        case '/lab/guide':   require LAB_ROOT . '/app/lab/guide.php'; break;
        case '/lab/review':  require LAB_ROOT . '/app/lab/review.php'; break;
        case '/lab/logs':    require LAB_ROOT . '/app/lab/logs.php'; break;
        case '/lab/complete': require LAB_ROOT . '/app/lab/complete.php'; break;
        default:
            http_response_code(404);
            layout_head('Not Found');
            echo '<h1>404 — page not found</h1>';
            layout_foot();
    }
} catch (Throwable $e) {
    echo '<pre class="err">' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine() . '</pre>';
}
$body = ob_get_clean();
/* stored-XSS detection: a display name carrying markup, served raw to a viewer */
if ($path === '/dashboard') {
    $rows = db()->query("SELECT name FROM users WHERE name LIKE '%<%'")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $r) { if (strpos($body, $r['name']) !== false) { rs_pass('stored-xss'); break; } }
}
echo $body;
