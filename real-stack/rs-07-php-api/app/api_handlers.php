<?php
/* HexaPay API endpoints — v1, written fast for the MVP launch.
   Every handler here is load-bearing for the audit: read the Code Review
   page after your black-box pass to see what was wrong and where. */

function hp_check_overdraft($accountId){
    $st = db()->prepare("SELECT balance FROM accounts WHERE id = ?");
    $st->execute([$accountId]);
    if ((float)$st->fetchColumn() < -0.001) rs_pass('race-transfer');
}
function hp_execute_transfer($t, $recheck){
    $db = db();
    $st = $db->prepare("SELECT * FROM accounts WHERE id = ?");
    $st->execute([$t['from_account']]); $from = $st->fetch(PDO::FETCH_ASSOC);
    $st->execute([$t['to_account']]);   $to   = $st->fetch(PDO::FETCH_ASSOC);
    if (!$from || !$to) return false;
    if ($recheck) {
        if ((float)$from['balance'] < (float)$t['amount']) return false;
        usleep(200000); // the check and the debit are far apart — a real race window under load
    }
    /* Non-atomic debit-then-credit, no transaction wrapper, and (on the
       capture path) no second balance check: check-time ≠ use-time. */
    $db->prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?")->execute([$t['amount'], $from['id']]);
    $db->prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?")->execute([$t['amount'], $to['id']]);
    $db->prepare("UPDATE transfers SET status = 'completed', executed_at = datetime('now') WHERE id = ?")->execute([$t['id']]);
    $db->prepare("INSERT INTO transactions (from_account, to_account, amount, note, created) VALUES (?,?,?,'API transfer', datetime('now'))")
       ->execute([$from['id'], $to['id'], $t['amount']]);
    hp_check_overdraft($from['id']);
    return true;
}
function hp_transfer_view($t){
    return ['id' => (int)$t['id'], 'from_account' => (int)$t['from_account'], 'to_account' => (int)$t['to_account'],
            'amount' => (float)$t['amount'], 'status' => $t['status'], 'created' => $t['created'], 'executed_at' => $t['executed_at']];
}

function api_route($method, $path){
    $db = db();

    if ($path === '/api' && $method === 'GET') {
        hp_json(['name' => 'HexaPay API', 'version' => 'v1', 'auth' => 'Authorization: Bearer <token>',
            'endpoints' => ['POST /api/register', 'POST /api/login', 'GET /api/me', 'PATCH /api/me',
                'GET /api/users', 'GET /api/users/{id}', 'GET /api/accounts/{id}', 'GET /api/accounts/{id}/transactions',
                'GET /api/transactions?filter=&sort=', 'POST /api/transfers', 'POST /api/transfers/{id}/capture',
                'POST /api/otp/request', 'POST /api/otp/verify',
                'POST /api/webhooks', 'GET /api/webhooks/{id}', 'POST /api/webhooks/{id}/ping']]);
        return;
    }

    /* ---------- identity ---------- */
    if ($path === '/api/register' && $method === 'POST') {
        $b = hp_body();
        $name = trim($b['display_name'] ?? $b['name'] ?? ''); $email = trim($b['email'] ?? ''); $pw = $b['password'] ?? '';
        if (!$name || !$email || strlen($pw) < 6) { hp_json(['error' => 'validation', 'detail' => 'display_name, email and a 6+ character password are required'], 422); return; }
        try {
            $db->prepare("INSERT INTO users (name, email, password_hash, role, phone, created) VALUES (?,?,?,'customer','',datetime('now'))")
               ->execute([$name, $email, hash('sha256', $pw)]);
        } catch (Exception $e) { hp_json(['error' => 'conflict', 'detail' => 'that email is already registered'], 409); return; }
        $uid = (int)$db->lastInsertId();
        $db->prepare("INSERT INTO accounts (user_id, label, balance, currency, opened) VALUES (?, 'Everyday wallet', 250.00, 'EUR', datetime('now'))")->execute([$uid]);
        $st = $db->prepare("SELECT * FROM users WHERE id = ?"); $st->execute([$uid]); $u = $st->fetch(PDO::FETCH_ASSOC);
        $token = hp_issue_token($u, 'register');
        hp_log('REGISTER ' . $email);
        hp_json(['user' => hp_user_public($u), 'account' => hp_account_of($uid), 'token' => $token], 201);
        return;
    }
    if ($path === '/api/login' && $method === 'POST') {
        $b = hp_body();
        $st = $db->prepare("SELECT * FROM users WHERE email = ?");
        $st->execute([trim($b['email'] ?? '')]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        if (!$u || !hash_equals($u['password_hash'], hash('sha256', $b['password'] ?? ''))) {
            rs_attempt('api-login:' . strtolower($b['email'] ?? ''));
            hp_json(['error' => 'invalid_credentials'], 401); return;
        }
        $token = hp_issue_token($u, 'login');
        hp_log('LOGIN ' . $u['email']);
        hp_json(['token' => $token, 'token_type' => 'Bearer', 'user' => ['id' => (int)$u['id'], 'display_name' => $u['name'], 'email' => $u['email']]]);
        return;
    }

    /* ---------- profile ---------- */
    if ($path === '/api/me' && $method === 'GET') {
        $me = api_require_auth();
        hp_json(['user' => hp_user_public($me), 'account' => hp_account_of($me['id'])]);
        return;
    }
    if ($path === '/api/me' && ($method === 'PATCH' || $method === 'POST')) {
        $me = api_require_auth();
        $b = hp_body();
        /* Mass assignment: the update loop trusts the client's field names.
           The profile screen only sends display_name and phone — but the
           handler maps more, and applies a `balance` field straight onto
           the caller's wallet. */
        $map = ['display_name' => 'name', 'phone' => 'phone', 'email' => 'email', 'role' => 'role'];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $b)) {
                $db->prepare("UPDATE users SET $col = ? WHERE id = ?")->execute([$b[$in], $me['id']]);
                if ($col === 'role' && $b[$in] !== $me['role']) rs_pass('mass-assignment');
            }
        }
        if (array_key_exists('balance', $b)) {
            $acct = hp_account_of($me['id']);
            $new = (float)$b['balance'];
            if ($acct && abs((float)$acct['balance'] - $new) > 0.0001) {
                $db->prepare("UPDATE accounts SET balance = ? WHERE id = ?")->execute([$new, $acct['id']]);
                rs_pass('mass-assignment');
                hp_log('MASS-ASSIGN balance set to ' . $new . ' for ' . $me['email']);
            }
        }
        $st = $db->prepare("SELECT * FROM users WHERE id = ?"); $st->execute([$me['id']]); $u = $st->fetch(PDO::FETCH_ASSOC);
        hp_json(['user' => hp_user_public($u), 'account' => hp_account_of($me['id'])]);
        return;
    }

    /* ---------- users: excessive data ---------- */
    if ($path === '/api/users' && $method === 'GET') {
        $me = api_require_auth();
        $rows = $db->query("SELECT * FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $pub = hp_user_public($r);
            if ((int)$r['id'] !== (int)$me['id'] && !empty($pub['password_hash'])) rs_pass('excessive-data');
            $out[] = $pub;
        }
        hp_json(['users' => $out]);
        return;
    }
    if (preg_match('#^/api/users/(\d+)$#', $path, $m) && $method === 'GET') {
        $me = api_require_auth();
        $st = $db->prepare("SELECT * FROM users WHERE id = ?"); $st->execute([$m[1]]);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) { hp_json(['error' => 'not_found'], 404); return; }
        $pub = hp_user_public($r);
        if ((int)$r['id'] !== (int)$me['id'] && !empty($pub['password_hash'])) rs_pass('excessive-data');
        hp_json(['user' => $pub, 'account' => hp_account_of($r['id'])]);
        return;
    }

    /* ---------- accounts: BOLA ---------- */
    if (preg_match('#^/api/accounts/(\d+)$#', $path, $m) && $method === 'GET') {
        $me = api_require_auth();
        $st = $db->prepare("SELECT a.*, u.name AS owner_name, u.email AS owner_email FROM accounts a JOIN users u ON u.id = a.user_id WHERE a.id = ?");
        $st->execute([$m[1]]);
        $a = $st->fetch(PDO::FETCH_ASSOC);
        if (!$a) { hp_json(['error' => 'not_found'], 404); return; }
        /* Broken Object Level Authorization: the handler checks that you
           are logged in — never that this object is yours. */
        if ((int)$a['user_id'] !== (int)$me['id']) { rs_pass('bola'); hp_log('BOLA account ' . $a['id'] . ' read by ' . $me['email']); }
        hp_json(['account' => ['id' => (int)$a['id'], 'user_id' => (int)$a['user_id'], 'owner_name' => $a['owner_name'],
            'owner_email' => $a['owner_email'], 'label' => $a['label'], 'balance' => (float)$a['balance'],
            'currency' => $a['currency'], 'opened' => $a['opened']]]);
        return;
    }
    if (preg_match('#^/api/accounts/(\d+)/transactions$#', $path, $m) && $method === 'GET') {
        api_require_auth();
        $st = $db->prepare("SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY id DESC LIMIT 50");
        $st->execute([$m[1], $m[1]]);
        hp_json(['transactions' => $st->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }

    /* ---------- transactions search: SQL injection ---------- */
    if ($path === '/api/transactions' && $method === 'GET') {
        $me = api_require_auth();
        $filter = $_GET['filter'] ?? '';
        $sort = $_GET['sort'] ?? 't.created DESC';
        /* The filter and the sort are glued straight into the SQL — the
           "temporary" search implementation from the MVP. */
        $sql = "SELECT t.id, t.amount, t.note, t.created, fa.user_id AS from_user, ta.user_id AS to_user
                FROM transactions t
                JOIN accounts fa ON fa.id = t.from_account
                JOIN accounts ta ON ta.id = t.to_account
                WHERE (fa.user_id = " . (int)$me['id'] . " OR ta.user_id = " . (int)$me['id'] . ")
                AND t.note LIKE '%" . $filter . "%'
                ORDER BY " . $sort;
        try { $rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC); }
        catch (Exception $e) { hp_json(['error' => 'db_error', 'detail' => $e->getMessage(), 'query' => $sql], 500); return; }
        foreach ($rows as $r) {
            if ((int)($r['from_user'] ?? -1) !== (int)$me['id'] && (int)($r['to_user'] ?? -2) !== (int)$me['id']) rs_pass('sqli-filter');
        }
        $body = json_encode($rows);
        $others = $db->query("SELECT email, password_hash FROM users WHERE id != " . (int)$me['id'])->fetchAll(PDO::FETCH_ASSOC);
        foreach ($others as $o) { if (strpos($body, $o['password_hash']) !== false) { rs_pass('sqli-filter'); break; } }
        hp_json(['count' => count($rows), 'transactions' => $rows]);
        return;
    }

    /* ---------- transfers: authorize / capture ---------- */
    if ($path === '/api/transfers' && $method === 'POST') {
        $me = api_require_auth();
        $b = hp_body();
        $from = hp_account_of($me['id']);
        $toId = (int)($b['to_account'] ?? 0); $amount = (float)($b['amount'] ?? 0);
        $st = $db->prepare("SELECT * FROM accounts WHERE id = ?"); $st->execute([$toId]); $to = $st->fetch(PDO::FETCH_ASSOC);
        if (!$from || !$to) { hp_json(['error' => 'not_found', 'detail' => 'account not found'], 404); return; }
        if ($toId === (int)$from['id']) { hp_json(['error' => 'validation', 'detail' => 'cannot transfer to your own account'], 422); return; }
        if ($amount <= 0) { hp_json(['error' => 'validation', 'detail' => 'amount must be positive'], 422); return; }
        $authorizeOnly = !empty($b['authorize_only']) || (($b['mode'] ?? '') === 'authorize');
        if ($authorizeOnly) {
            /* Balance is checked HERE, at authorize time… */
            if ((float)$from['balance'] < $amount) { hp_json(['error' => 'insufficient_funds'], 422); return; }
            $db->prepare("INSERT INTO transfers (from_account, to_account, amount, status, created) VALUES (?,?,?,'pending',datetime('now'))")
               ->execute([$from['id'], $toId, $amount]);
            $id = (int)$db->lastInsertId();
            $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$id]);
            hp_json(['transfer' => hp_transfer_view($st->fetch(PDO::FETCH_ASSOC)), 'note' => 'authorized — capture it to move the money'], 201);
            return;
        }
        $db->prepare("INSERT INTO transfers (from_account, to_account, amount, status, created) VALUES (?,?,?,'pending',datetime('now'))")
           ->execute([$from['id'], $toId, $amount]);
        $id = (int)$db->lastInsertId();
        $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$id]); $t = $st->fetch(PDO::FETCH_ASSOC);
        if (!hp_execute_transfer($t, true)) { hp_json(['error' => 'insufficient_funds'], 422); return; }
        hp_log('TRANSFER ' . $amount . ' from account ' . $from['id'] . ' to ' . $toId);
        $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$id]);
        hp_json(['transfer' => hp_transfer_view($st->fetch(PDO::FETCH_ASSOC)), 'from_balance' => (float)hp_account_of($me['id'])['balance']]);
        return;
    }
    if (preg_match('#^/api/transfers/(\d+)$#', $path, $m) && $method === 'GET') {
        api_require_auth();
        $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$m[1]]);
        $t = $st->fetch(PDO::FETCH_ASSOC);
        if (!$t) { hp_json(['error' => 'not_found'], 404); return; }
        hp_json(['transfer' => hp_transfer_view($t)]);
        return;
    }
    if (preg_match('#^/api/transfers/(\d+)/capture$#', $path, $m) && ($method === 'POST' || $method === 'GET')) {
        $me = api_require_auth();
        $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$m[1]]);
        $t = $st->fetch(PDO::FETCH_ASSOC);
        if (!$t) { hp_json(['error' => 'not_found'], 404); return; }
        if ((int)hp_account_of($me['id'])['id'] !== (int)$t['from_account']) { hp_json(['error' => 'forbidden', 'detail' => 'not your transfer'], 403); return; }
        if ($t['status'] !== 'pending') { hp_json(['error' => 'conflict', 'detail' => 'transfer is ' . $t['status']], 409); return; }
        /* …but never re-checked HERE, at capture time. And this endpoint
           answers GET as happily as POST — a state change over GET. */
        if (!hp_execute_transfer($t, false)) { hp_json(['error' => 'execution_failed'], 500); return; }
        if ($method === 'GET') { rs_pass('method-confusion'); hp_log('STATE CHANGE OVER GET: capture of transfer ' . $t['id']); }
        hp_log('CAPTURE transfer ' . $t['id'] . ' via ' . $method);
        $st = $db->prepare("SELECT * FROM transfers WHERE id = ?"); $st->execute([$m[1]]);
        hp_json(['transfer' => hp_transfer_view($st->fetch(PDO::FETCH_ASSOC)), 'from_balance' => (float)hp_account_of($me['id'])['balance']]);
        return;
    }

    /* ---------- OTP: no rate limit ---------- */
    if ($path === '/api/otp/request' && $method === 'POST') {
        $me = api_require_auth();
        $db->prepare("DELETE FROM otp_challenges WHERE user_id = ? AND verified = 0")->execute([$me['id']]);
        $code = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $db->prepare("INSERT INTO otp_challenges (user_id, code, created) VALUES (?,?,datetime('now'))")->execute([$me['id'], $code]);
        hp_log('OTP requested by ' . $me['email'] . ' (sent by "SMS")');
        hp_json(['status' => 'sent', 'channel' => 'sms', 'expires_in' => 300, 'detail' => 'A 4-digit code is on its way to your phone.']);
        return;
    }
    if ($path === '/api/otp/verify' && $method === 'POST') {
        $me = api_require_auth();
        $b = hp_body();
        $st = $db->prepare("SELECT * FROM otp_challenges WHERE user_id = ? AND verified = 0 ORDER BY id DESC LIMIT 1");
        $st->execute([$me['id']]);
        $ch = $st->fetch(PDO::FETCH_ASSOC);
        if (!$ch) { hp_json(['error' => 'no_challenge', 'detail' => 'request a code first'], 400); return; }
        $given = str_pad(trim((string)($b['code'] ?? '')), 4, '0', STR_PAD_LEFT);
        if (hash_equals($ch['code'], $given)) {
            if ((int)$ch['attempts'] >= 10) { rs_pass('otp-brute'); hp_log('OTP accepted after ' . $ch['attempts'] . ' failed attempts for ' . $me['email']); }
            $db->prepare("UPDATE otp_challenges SET verified = 1 WHERE id = ?")->execute([$ch['id']]);
            $db->prepare("UPDATE users SET phone_verified = 1 WHERE id = ?")->execute([$me['id']]);
            hp_json(['verified' => true, 'detail' => 'Phone verified. Sensitive actions unlocked.']);
            return;
        }
        /* No lockout, no backoff, no attempt cap — guess forever. */
        $db->prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?")->execute([$ch['id']]);
        hp_json(['error' => 'incorrect_code', 'attempts' => (int)$ch['attempts'] + 1, 'attempts_remaining' => 'unlimited'], 401);
        return;
    }

    /* ---------- webhooks: SSRF ---------- */
    if ($path === '/api/webhooks' && $method === 'POST') {
        $me = api_require_auth();
        $b = hp_body();
        $url = trim($b['url'] ?? '');
        if (!$url) { hp_json(['error' => 'validation', 'detail' => 'url is required'], 422); return; }
        $db->prepare("INSERT INTO webhooks (user_id, url, created) VALUES (?,?,datetime('now'))")->execute([$me['id'], $url]);
        hp_json(['webhook' => ['id' => (int)$db->lastInsertId(), 'url' => $url, 'active' => true]], 201);
        return;
    }
    if ($path === '/api/webhooks' && $method === 'GET') {
        $me = api_require_auth();
        $st = $db->prepare("SELECT * FROM webhooks WHERE user_id = ? ORDER BY id DESC");
        $st->execute([$me['id']]);
        hp_json(['webhooks' => $st->fetchAll(PDO::FETCH_ASSOC)]);
        return;
    }
    if (preg_match('#^/api/webhooks/(\d+)$#', $path, $m) && $method === 'GET') {
        api_require_auth();
        $st = $db->prepare("SELECT * FROM webhooks WHERE id = ?"); $st->execute([$m[1]]);
        $w = $st->fetch(PDO::FETCH_ASSOC);
        if (!$w) { hp_json(['error' => 'not_found'], 404); return; }
        hp_json(['webhook' => $w]);
        return;
    }
    if (preg_match('#^/api/webhooks/(\d+)/ping$#', $path, $m) && $method === 'POST') {
        api_require_auth();
        $st = $db->prepare("SELECT * FROM webhooks WHERE id = ?"); $st->execute([$m[1]]);
        $w = $st->fetch(PDO::FETCH_ASSOC);
        if (!$w) { hp_json(['error' => 'not_found'], 404); return; }
        /* Deliveries are async (a worker process fetches the URL), exactly
           like real webhook systems — and the worker fetches ANY url. */
        $worker = LAB_ROOT . '/app/fetch_worker.php';
        $cmd = sprintf('%s %s %d > /dev/null 2>&1 &', PHP_BINARY, escapeshellarg($worker), (int)$w['id']);
        exec($cmd);
        hp_log('WEBHOOK ping queued for ' . $w['url']);
        hp_json(['status' => 'queued', 'detail' => 'Deliveries are asynchronous — GET /api/webhooks/' . $w['id'] . ' in a second or two to see the delivery result.'], 202);
        return;
    }

    hp_json(['error' => 'not_found', 'detail' => 'no such endpoint: ' . $method . ' ' . $path], 404);
}
