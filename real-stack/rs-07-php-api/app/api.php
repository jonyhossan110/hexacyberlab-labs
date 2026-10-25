<?php
/* HexaPay API plumbing: JSON in/out, bearer tokens, CORS.
   The token scheme is the startup's original sin: a token is not a random
   secret, it is DERIVED from something public — "hp_" . md5(email) — so
   support could "just work it out" when a user lost theirs. */
function hp_json($data, $code = 200){
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
function hp_body(){
    $raw = file_get_contents('php://input');
    $j = json_decode($raw, true);
    if (is_array($j)) return $j;
    return $_POST ?? [];
}
function hp_bearer(){
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
    return $_SERVER['HTTP_X_API_TOKEN'] ?? null;
}
function hp_token_for($user){ return 'hp_' . md5(strtolower($user['email'])); }
function hp_issue_token($user, $via){
    $t = hp_token_for($user);
    $st = db()->prepare("INSERT OR IGNORE INTO tokens (token, user_id, issued_via, created) VALUES (?,?,?,datetime('now'))");
    $st->execute([$t, $user['id'], $via]);
    return $t;
}
function api_auth(){
    $tok = hp_bearer();
    if (!$tok) return null;
    $st = db()->prepare("SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?");
    $st->execute([$tok]);
    $u = $st->fetch(PDO::FETCH_ASSOC);
    if ($u) { $GLOBALS['HP_WHO'] = $u['email']; return $u; }
    /* The flaw, faithfully reproduced: a token that was NEVER issued is
       still accepted if it matches the derivation recipe — because the
       recipe is checked, not the issuance. That is token forgery. */
    $all = db()->query("SELECT * FROM users")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($all as $cand) {
        if (hash_equals(hp_token_for($cand), $tok)) {
            db()->prepare("INSERT OR IGNORE INTO tokens (token, user_id, issued_via, created) VALUES (?,?, 'derived', datetime('now'))")
                ->execute([$tok, $cand['id']]);
            rs_pass('token-forgery');
            hp_log('TOKEN DERIVED (never issued) authenticated as ' . $cand['email']);
            $GLOBALS['HP_WHO'] = $cand['email'];
            return $cand;
        }
    }
    return null;
}
function api_require_auth(){
    $u = api_auth();
    if (!$u) { hp_json(['error' => 'unauthorized', 'detail' => 'Send your API token: Authorization: Bearer <token>'], 401); exit; }
    return $u;
}
function hp_cors(){
    /* "Just reflect whatever Origin asks, the mobile team needed it."
       With credentials allowed, any website can read a victim's API. */
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
        $oh = parse_url($origin, PHP_URL_HOST);
        $hh = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
        if ($oh && strtolower($oh) !== strtolower($hh)) rs_pass('cors-misconfig');
    }
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
}
