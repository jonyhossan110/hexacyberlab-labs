<?php
/* A tiny Laravel-flavoured router: verb helpers, {param} segments, and a
   middleware concept. POST routes are CSRF-verified ("web" middleware group)
   unless a route opts out — exactly the opt-out one developer used. */
class Router {
    private $routes = [];
    public function get($uri, $handler, $opts = []){ $this->add('GET', $uri, $handler, $opts); }
    public function post($uri, $handler, $opts = []){ $this->add('POST', $uri, $handler, $opts); }
    private function add($method, $uri, $handler, $opts){ $this->routes[] = [$method, $uri, $handler, $opts]; }
    public function dispatch($method, $path){
        foreach ($this->routes as [$m, $uri, $handler, $opts]) {
            $pattern = '#^' . preg_replace('#\{[a-zA-Z_]+\}#', '([^/]+)', $uri) . '$#';
            if ($m === $method && preg_match($pattern, $path, $mm)) {
                array_shift($mm);
                if (!empty($opts['auth']) && !current_user()) {
                    header('Location: /login?intended=' . urlencode($path));
                    exit;
                }
                if ($method === 'POST' && ($opts['csrf'] ?? true)) {
                    $given = $_POST['_token'] ?? '';
                    if (!$given || !hash_equals($_SESSION['_token'] ?? '', $given)) {
                        http_response_code(419);
                        echo '<!DOCTYPE html><html><head><title>419 Page Expired</title></head><body style="font-family:sans-serif;text-align:center;padding:60px"><h1>419</h1><p>Page Expired — the CSRF token did not verify.</p></body></html>';
                        return;
                    }
                }
                $handler(...$mm);
                return;
            }
        }
        http_response_code(404);
        layout_head('Not Found');
        echo '<h1>404 — page not found</h1><p class="muted">The route ' . htmlspecialchars($path) . ' is not defined in routes/web.php.</p>';
        layout_foot();
    }
}
