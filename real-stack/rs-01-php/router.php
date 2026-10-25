<?php
/* Development router for the PHP built-in server (php -S).
   Static files in public/ are served directly; /uploads/* is handled like a
   classic Apache uploads directory (PHP files EXECUTE — that is the point of
   one of this lab's tests); everything else goes to the front controller. */
define('LAB_ROOT', __DIR__);
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// the forgotten backup in the web root — fetching it is a scored test
if ($uri === '/backup.sql') {
    nk_log('GET /backup.sql (web-root backup fetched)');
    rs_pass('info-disclosure');
    return false; // let the built-in server serve the file
}
// uploaded files behave like a classic misconfigured uploads folder
if (strpos($uri, '/uploads/') === 0) {
    $file = LAB_ROOT . '/uploads/' . basename($uri);
    if (is_file($file)) {
        nk_log('GET ' . $uri . ' (uploads)');
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
// never serve the lab's own dotfiles / data directly
if (preg_match('#^/\.(env|git)#', $uri) || strpos($uri, '/logs/') === 0) {
    http_response_code(404);
    echo 'Not Found';
    return true;
}
// real static assets
$static = LAB_ROOT . '/public' . $uri;
if ($uri !== '/' && is_file($static)) return false;

require LAB_ROOT . '/public/index.php';
return true;
