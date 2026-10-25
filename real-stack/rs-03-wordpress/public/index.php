<?php
/* WanderPress front controller — every dynamic request lands here,
   WordPress-style: one entry point, plugins loaded, routes dispatched. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';
require_once LAB_ROOT . '/app/db.php';
require_once LAB_ROOT . '/app/auth.php';
require_once LAB_ROOT . '/app/layout.php';
require_once LAB_ROOT . '/app/prefs.php';
require_once LAB_ROOT . '/wp-content/plugins/hexa-contact/hexa-contact.php';
require_once LAB_ROOT . '/wp-content/plugins/hexa-gallery/hexa-gallery.php';
session_start();
$cfg = require LAB_ROOT . '/app/config.php';
if ($cfg['debug']) { ini_set('display_errors', '1'); error_reporting(E_ALL); }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
hp_log($_SERVER['REQUEST_METHOD'] . ' ' . $path . (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : ''));

ob_start();
try {
    /* Reader preferences cookie — unserialize() on a value the visitor
       controls. Legit values are serialized arrays; nothing stops a crafted
       serialized OBJECT arriving instead, and HexaPress_Prefs has a
       __wakeup gadget (app/prefs.php). If the gadget fired, the injection
       demonstrably happened. */
    if (!empty($_COOKIE['wp_prefs'])) {
        $raw = base64_decode($_COOKIE['wp_prefs'], true);
        if ($raw !== false && preg_match('/^(O:|a:)/', trim($raw))) {
            $prefs = @unserialize($raw);
            if ($prefs instanceof HexaPress_Prefs && $prefs->woken_up) {
                rs_pass('object-injection');
                hp_log('OBJECT-INJECTION gadget confirmed via wp_prefs cookie');
            }
        }
    }

    /* Canonical author redirect — /?author=N sends you to /author/<slug>.
       Helpful for readers; a numbered list of every account for anyone else.
       A valid id redirects and reveals the slug; an invalid one does not. */
    if ($path === '/' && isset($_GET['author'])) {
        $st = db()->prepare("SELECT slug FROM users WHERE id = ?");
        $st->execute([(int)$_GET['author']]);
        $foundSlug = $st->fetchColumn();
        if ($foundSlug) {
            rs_pass('user-enum');
            hp_log('ENUM ?author=' . (int)$_GET['author'] . ' -> /author/' . $foundSlug);
            header('Location: /author/' . $foundSlug);
            exit;
        }
    }

    if (preg_match('#^/author/([a-z0-9-]+)$#', $path, $m)) {
        $authorSlug = $m[1];
        require LAB_ROOT . '/app/pages/author.php';
    } elseif (strpos($path, '/wp-json') === 0) {
        require LAB_ROOT . '/app/rest.php';
    } else switch ($path) {
        case '/':            require LAB_ROOT . '/app/pages/home.php'; break;
        case '/post':        require LAB_ROOT . '/app/pages/post.php'; break;
        case '/contact':     require LAB_ROOT . '/app/pages/contact.php'; break;
        case '/gallery':     require LAB_ROOT . '/app/pages/gallery.php'; break;
        case '/wp-login.php':
        case '/login':       require LAB_ROOT . '/app/pages/login.php'; break;
        case '/register':    require LAB_ROOT . '/app/pages/register.php'; break;
        case '/logout':      require LAB_ROOT . '/app/pages/logout.php'; break;
        case '/wp-admin':    require LAB_ROOT . '/app/pages/admin.php'; break;
        case '/profile':
        case '/wp-admin/profile.php': require LAB_ROOT . '/app/pages/profile.php'; break;
        case '/wp-admin/admin-ajax.php':
        case '/admin-ajax':  require LAB_ROOT . '/app/ajax.php'; break;
        case '/xmlrpc.php':  require LAB_ROOT . '/app/xmlrpc.php'; break;
        case '/lab/brief':   require LAB_ROOT . '/app/lab/brief.php'; break;
        case '/lab/tests':   require LAB_ROOT . '/app/lab/tests.php'; break;
        case '/lab/guide':   require LAB_ROOT . '/app/lab/guide.php'; break;
        case '/lab/review':  require LAB_ROOT . '/app/lab/review.php'; break;
        case '/lab/logs':    require LAB_ROOT . '/app/lab/logs.php'; break;
        case '/lab/complete': require LAB_ROOT . '/app/lab/complete.php'; break;
        default:
            http_response_code(404);
            layout_head('Not Found');
            echo '<h1>404 — page not found</h1><p class="muted">Oops! That page can\u{2019}t be found.</p>';
            layout_foot();
    }
} catch (Throwable $e) {
    // WP_DEBUG is ON in this site — errors are printed in full, like the real mistakes you will meet
    echo '<pre class="err">' . get_class($e) . ': ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine() . '</pre>';
}
echo ob_get_clean();
