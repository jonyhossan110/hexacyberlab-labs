<?php
class ApiController {
    public static function invoices(){
        header('Content-Type: application/json');
        $token = '';
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (stripos($auth, 'Bearer ') === 0) $token = trim(substr($auth, 7));
        if ($token === '' && isset($_GET['api_token'])) $token = $_GET['api_token'];
        $st = db()->prepare("SELECT * FROM users WHERE api_token = ?");
        $st->execute([$token]);
        $owner = $st->fetch(PDO::FETCH_ASSOC);
        if (!$owner) { http_response_code(401); echo json_encode(['error' => 'Unauthenticated.']); return; }
        /* Tokens live in the DB in plaintext and the team page prints them.
           Detection: a valid token was used by someone who is not its owner —
           the only way that happens is the token leaked off its page. */
        $sessionUser = current_user();
        if (!$sessionUser || (int)$sessionUser['id'] !== (int)$owner['id']) {
            rs_pass('api-token');
            hb_log('API token of ' . $owner['email'] . ' used by ' . ($sessionUser ? $sessionUser['email'] : 'no session'));
        }
        $st = db()->prepare("SELECT id, number, description, amount, status, due FROM invoices WHERE workspace_id = ? ORDER BY id");
        $st->execute([$owner['workspace_id']]);
        echo json_encode(['data' => $st->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
