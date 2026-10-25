<?php
/* Webhook delivery worker — runs as a background CLI process, the way real
   webhook systems deliver (queue → worker → HTTP call). It fetches whatever
   URL the user registered: no allow-list, no private-range blocking, any
   scheme PHP can open. That is the SSRF, delivered asynchronously. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';
require_once LAB_ROOT . '/app/db.php';

$id = (int)($argv[1] ?? 0);
if (!$id) exit;
sleep(1); // let the API request that queued us finish first

$st = db()->prepare("SELECT * FROM webhooks WHERE id = ?");
$st->execute([$id]);
$w = $st->fetch(PDO::FETCH_ASSOC);
if (!$w) exit;
$url = $w['url'];

$ctx = stream_context_create([
    'http' => ['method' => 'POST', 'timeout' => 5, 'ignore_errors' => true,
               'header' => "Content-Type: application/json\r\nX-HexaPay-Event: ping",
               'content' => json_encode(['event' => 'ping', 'webhook_id' => $id])],
    'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
]);
$body = @file_get_contents($url, false, $ctx);
$status = null;
if (isset($http_response_header[0]) && preg_match('{HTTP/\S+ (\d+)}', $http_response_header[0], $mm)) $status = (int)$mm[1];
if ($body === false) $body = '';

db()->prepare("UPDATE webhooks SET last_status = ?, last_body = ?, last_checked = datetime('now') WHERE id = ?")
    ->execute([$status, substr($body, 0, 300), $id]);
hp_log('WEBHOOK delivered to ' . $url . ' -> HTTP ' . ($status ?? 'no-response'));

/* Did the server just fetch something it should never reach? */
$scheme = strtolower((string)parse_url($url, PHP_URL_SCHEME));
$host = strtolower((string)parse_url($url, PHP_URL_HOST));
$internal = false;
if ($scheme && !in_array($scheme, ['http', 'https'], true)) $internal = true;
if (in_array($host, ['localhost', '::1', '0.0.0.0'], true)) $internal = true;
if (preg_match('/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/', $host)) $internal = true;
if (str_ends_with($host, '.local') || str_ends_with($host, '.internal')) $internal = true;
if ($internal && $body !== '') {
    rs_pass('ssrf-webhook');
    hp_log('SSRF webhook fetched internal target ' . $url);
}
