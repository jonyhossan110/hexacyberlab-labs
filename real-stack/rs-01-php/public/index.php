<?php
/* NordKart front controller — every dynamic request lands here. */
define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';
require_once LAB_ROOT . '/app/db.php';
require_once LAB_ROOT . '/app/auth.php';
require_once LAB_ROOT . '/app/layout.php';
session_start();
$cfg = require LAB_ROOT . '/app/config.php';
if ($cfg['debug']) { ini_set('display_errors', '1'); error_reporting(E_ALL); }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
nk_log($_SERVER['REQUEST_METHOD'] . ' ' . $path . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));

ob_start();
try {
    switch ($path) {
        case '/':            require LAB_ROOT . '/app/pages/home.php'; break;
        case '/shop':        require LAB_ROOT . '/app/pages/shop.php'; break;
        case '/product':     require LAB_ROOT . '/app/pages/product.php'; break;
        case '/login':       require LAB_ROOT . '/app/pages/login.php'; break;
        case '/register':    require LAB_ROOT . '/app/pages/register.php'; break;
        case '/logout':      require LAB_ROOT . '/app/pages/logout.php'; break;
        case '/account':     require LAB_ROOT . '/app/pages/account.php'; break;
        case '/orders':      require LAB_ROOT . '/app/pages/orders.php'; break;
        case '/order':       require LAB_ROOT . '/app/pages/order.php'; break;
        case '/download':    require LAB_ROOT . '/app/pages/download.php'; break;
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
    // debug is ON in this shop — errors are printed in full, like the real mistakes you will meet
    echo '<pre class="err">' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine() . '</pre>';
}
$body = ob_get_clean();
// reflected-XSS detection: the raw search term coming back unescaped in the page
if (isset($_GET['q']) && strlen($_GET['q']) > 3 && strpos($_GET['q'], '<') !== false && strpos($body, $_GET['q']) !== false) rs_pass('xss-reflected');
echo $body;
