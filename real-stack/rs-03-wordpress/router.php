<?php
/* Development router for the PHP built-in server (php -S).
   Static files in public/ are served directly; wp-content is handled the
   way a classic Apache + WordPress install handles it — including the two
   behaviours this lab exists to teach:
   1. wp-content/debug.log sits inside the web space and is downloadable.
   2. The uploads folder executes a file when ANY extension segment in its
      name is .php (the old Apache multi-extension behaviour), while the
      media library only ever checked the FINAL extension. */
define('LAB_ROOT', __DIR__);
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// the site's own debug log, readable by the whole internet — fetching it is a scored test
if ($uri === '/wp-content/debug.log') {
    hp_log('GET /wp-content/debug.log (debug log fetched)');
    rs_pass('debug-log');
    header('Content-Type: text/plain');
    readfile(LAB_ROOT . '/wp-content/debug.log');
    return true;
}
// readme.html announces the exact core version — also part of that test
if ($uri === '/readme.html') {
    hp_log('GET /readme.html (version disclosure)');
    rs_pass('debug-log');
    return false; // let the built-in server serve public/readme.html
}
// uploads: classic multi-extension execution, exactly like old Apache installs
if (strpos($uri, '/wp-content/uploads/') === 0 && strpos($uri, '..') === false) {
    $file = LAB_ROOT . $uri;
    if (is_file($file)) {
        hp_log('GET ' . $uri . ' (uploads)');
        $segments = explode('.', basename($file));
        $executable = false;
        foreach (array_slice($segments, 1) as $seg) if (strtolower($seg) === 'php') $executable = true;
        if ($executable) {
            ob_start();
            include $file;
            $out = ob_get_clean();
            echo $out;
            if (strpos($out, '<?php') === false) rs_pass('upload-bypass');
            return true;
        }
        readfile($file);
        return true;
    }
}
// plugin PHP files are not meant to be browsed directly
if (strpos($uri, '/wp-content/plugins/') === 0) {
    http_response_code(403);
    echo 'Forbidden';
    return true;
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
