<?php
/* Development router for the PHP built-in server (php -S).
   Static files in public/ are served directly; files under
   /storage/attachments/ behave like a classic web-reachable storage
   symlink where PHP files EXECUTE (the point of one of this lab's tests);
   everything else goes to the front controller. */
define('LAB_ROOT', __DIR__);
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (strpos($uri, '/storage/attachments/') === 0) {
    $file = LAB_ROOT . '/storage/attachments/' . basename($uri);
    if (is_file($file)) {
        hb_log('GET ' . $uri . ' (storage/attachments)');
        if (substr($file, -4) === '.php') {
            ob_start();
            include $file;
            $out = ob_get_clean();
            echo $out;
            if (strpos($out, '<?php') === false) rs_pass('upload-attachment');
            return true;
        }
        readfile($file);
        return true;
    }
}
// other storage paths are only reachable through the controllers
if (strpos($uri, '/storage/') === 0) { http_response_code(404); echo 'Not Found'; return true; }
// never serve the lab's own dotfiles / data directly
if (preg_match('#^/\.(env|git)#', $uri) || strpos($uri, '/logs/') === 0 || strpos($uri, '/app/') === 0) {
    http_response_code(404);
    echo 'Not Found';
    return true;
}
// real static assets
$static = LAB_ROOT . '/public' . $uri;
if ($uri !== '/' && is_file($static)) return false;

require LAB_ROOT . '/public/index.php';
return true;
