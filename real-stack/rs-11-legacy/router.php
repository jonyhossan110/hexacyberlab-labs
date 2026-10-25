<?php
/* Router for the PHP built-in server (php -S 127.0.0.1:3211 -t public router.php).
   Mimics the old Apache setup: page-per-file scripts run directly, the
   uploads folder EXECUTES php files (mod_php habits), and a couple of files
   nobody remembered are still sitting in the web root. */
define('LAB_ROOT', __DIR__);
require_once LAB_ROOT . '/inc/progress.php';
require_once LAB_ROOT . '/inc/log.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// forgotten files in the web root — fetching either is a scored test
if ($uri === '/backup.sql' || $uri === '/config.old') {
    bt_log('GET ' . $uri . ' (web-root leftover fetched)');
    rs_pass('backup-exposure');
    return false;
}
// uploaded photos behave like the old uploads dir: PHP runs there
if (strpos($uri, '/uploads/') === 0) {
    $file = LAB_ROOT . '/uploads/' . basename($uri);
    if (is_file($file)) {
        bt_log('GET ' . $uri . ' (uploads)');
        if (substr($file, -4) === '.php') {
            ob_start();
            include $file;
            $out = ob_get_clean();
            echo $out;
            if (strpos($out, '<?php') === false) rs_pass('upload-shell');
            return true;
        }
        readfile($file);
        return true;
    }
}
// the lab's own pages
if (preg_match('#^/lab/(brief|tests|guide|review|logs|complete)$#', $uri, $m)) {
    require LAB_ROOT . '/inc/lab/' . $m[1] . '.php';
    return true;
}
// never serve the lab's bookkeeping directly
if (preg_match('#^/\.(env|git)#', $uri) || strpos($uri, '/logs/') === 0 || strpos($uri, '/inc/') === 0) {
    http_response_code(404);
    echo 'Not Found';
    return true;
}
if ($uri === '/') {
    require LAB_ROOT . '/public/index.php';
    return true;
}
// everything else: a real file under public/ (php pages execute, assets serve)
$static = LAB_ROOT . '/public' . $uri;
if (is_file($static)) return false;

http_response_code(404);
echo '<h1>404 — page not found</h1><p>The page you asked for has gone on holiday.</p>';
return true;
