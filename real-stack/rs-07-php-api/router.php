<?php
/* Development router for the PHP built-in server (php -S).
   Static files in public/ are served directly; everything else goes to
   the front controller, which splits JSON API from HTML web view. */
define('LAB_ROOT', __DIR__);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// never serve the lab's own dotfiles / data directly
if (preg_match('#^/\.(env|git)#', $uri) || strpos($uri, '/logs/') === 0 || $uri === '/data.sqlite' || $uri === '/progress.json') {
    http_response_code(404);
    echo 'Not Found';
    return true;
}
// real static assets
$static = LAB_ROOT . '/public' . $uri;
if ($uri !== '/' && is_file($static)) return false;

require LAB_ROOT . '/public/index.php';
return true;
